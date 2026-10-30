// POST /api/provider/import/commit { type, mapping, rows: string[][] }
// お店が確認した割り振り（mapping：Finemeの項目→列番号）で、CSVの行を取り込む（2026-10-30）。
// 画面から300行ずつ送られる。AIはここでは使わない（割り振りどおりに機械的に入れる）。
// 同じCSVを2回取り込んでも増えないよう、顧客は電話・メール・氏名、予約は日時と名前、シフト・打刻は同じ時刻で重複を飛ばす。
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';
import { planAllows } from '@/lib/feature-flags';
import { ensureManualLinked } from '@/lib/customer-accounts';
import { IMPORT_TYPES, IMPORT_CHUNK, missingRequired, pick, normDate, normTime, normDateTime, normPhone, normEmail, normInt, normGender, splitName, normStatus } from '@/lib/import-schema';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BY = 'CSVの取り込み';
const PLAN_KEY = { tickets: 'customer_packages', shifts: 'shift_management', attendance: 'attendance' };
const jstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const squash = s => String(s || '').replace(/[\s　]+/g, '');

// このお店のお客様（基本情報・お店で登録したお客様）を、電話・メール・氏名で探せるようにする
async function customerIndex(pid) {
  const [{ data: profs }, { data: manual }] = await Promise.all([
    supabase.from('provider_customer_profiles').select('user_id, manual_customer_id, last_name, first_name, phone, email').eq('provider_id', pid).limit(50000),
    supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('provider_id', pid).limit(50000),
  ]);
  const byPhone = new Map(), byEmail = new Map(), byName = new Map();
  const add = (map, k, v) => { if (!k) return; map.set(k, map.has(k) && map.get(k).key !== v.key ? { ambiguous: true } : v); };
  (profs || []).forEach(p => {
    const ref = p.manual_customer_id ? { manual_id: p.manual_customer_id, key: `m:${p.manual_customer_id}` } : { user_id: p.user_id, key: `u:${p.user_id}` };
    add(byPhone, normPhone(p.phone), ref); add(byEmail, normEmail(p.email), ref); add(byName, squash(`${p.last_name || ''}${p.first_name || ''}`), ref);
  });
  (manual || []).forEach(m => add(byName, squash(m.display_name), m.linked_user_id ? { manual_id: m.id, user_id: m.linked_user_id, key: `m:${m.id}` } : { manual_id: m.id, key: `m:${m.id}` }));
  const find = ({ phone, email, name }) => {
    for (const [map, k] of [[byEmail, normEmail(email)], [byPhone, normPhone(phone)], [byName, squash(name)]]) {
      const hit = k && map.get(k);
      if (hit && !hit.ambiguous) return hit;
    }
    return null;
  };
  const remember = (ref, { phone, email, name }) => { add(byPhone, normPhone(phone), ref); add(byEmail, normEmail(email), ref); add(byName, squash(name), ref); };
  return { find, remember };
}

async function createCustomer(pid, idx, c) {
  const name = c.name || [c.last_name, c.first_name].filter(Boolean).join(' ');
  const { data: mc, error } = await supabase.from('provider_manual_customers').insert({ provider_id: pid, display_name: name.slice(0, 60), memo: c.memo || null }).select('id').single();
  if (error) throw new Error(error.message);
  const [ln, fn] = c.last_name || c.first_name ? [c.last_name, c.first_name] : splitName(name);
  const prof = Object.fromEntries(Object.entries({
    last_name: ln, first_name: fn, last_name_kana: c.last_name_kana, first_name_kana: c.first_name_kana,
    phone: normPhone(c.phone), email: normEmail(c.email), gender: c.gender ? normGender(c.gender) : null, birthday: c.birthday ? normDate(c.birthday) : null,
    postal_code: c.postal_code, prefecture: c.prefecture, city: c.city, address1: c.address1, address2: c.address2,
    emergency_name: c.emergency_name, emergency_phone: c.emergency_phone,
  }).filter(([, v]) => v));
  if (Object.keys(prof).length) await supabase.from('provider_customer_profiles').insert({ provider_id: pid, manual_customer_id: mc.id, ...prof, updated_by: BY });
  const ref = { manual_id: mc.id, key: `m:${mc.id}` };
  idx.remember(ref, { phone: c.phone, email: c.email, name });
  return ref;
}

async function resolveCustomer(pid, idx, c, counts) {
  const hit = idx.find(c);
  if (hit) return hit;
  counts.customers_created = (counts.customers_created || 0) + 1;
  return createCustomer(pid, idx, c);
}

async function staffIndex(pid, counts) {
  const { data } = await supabase.from('provider_staff').select('id, name').eq('provider_id', pid);
  const map = new Map((data || []).map(s => [squash(s.name), s.id]));
  return async name => {
    const k = squash(name);
    if (!k) return null;
    if (map.has(k)) return map.get(k);
    // 前のサービスにだけいたスタッフは、非公開・指名なしで作っておく（シフトと打刻を失わないように）
    const { data: st } = await supabase.from('provider_staff').insert({ provider_id: pid, name: String(name).trim().slice(0, 40), is_public: false, bookable: false }).select('id').single();
    if (st) { map.set(k, st.id); counts.staff_created = (counts.staff_created || 0) + 1; }
    return st?.id || null;
  };
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (a.user.fineme_member?.role === 'staff') return Response.json({ error: 'データの取り込みは、オーナーか店長のログインで行ってください' }, { status: 403 });
  const pid = a.provider.id;
  const body = await request.json().catch(() => ({}));
  const type = body.type;
  if (!IMPORT_TYPES[type]) return Response.json({ error: '取り込む種類を選んでください' }, { status: 400 });
  const missing = missingRequired(type, body.mapping);
  if (missing.length) return Response.json({ error: `次の項目の列を選んでください：${missing.join('、')}` }, { status: 400 });
  if (PLAN_KEY[type]) {
    const { data: prov } = await supabase.from('providers').select('plan').eq('id', pid).single();
    if (!planAllows(prov, PLAN_KEY[type])) return Response.json({ error: `${IMPORT_TYPES[type].label}は、いまのプランでは使えない機能のため取り込めません` }, { status: 403 });
  }
  const rows = (Array.isArray(body.rows) ? body.rows : []).slice(0, IMPORT_CHUNK);
  const counts = { created: 0, updated: 0, skipped: 0 };
  const errors = [];
  const today = jstToday();
  const offset = Number(body.offset) || 0;
  const fail = (i, msg) => { counts.skipped++; if (errors.length < 50) errors.push(`${offset + i + 2}行目：${msg}`); };

  const idx = ['customers', 'reservations', 'tickets', 'memberships'].includes(type) ? await customerIndex(pid) : null;
  const staffOf = ['reservations', 'shifts', 'attendance'].includes(type) ? await staffIndex(pid, counts) : null;

  if (type === 'customers') {
    for (const [i, row] of rows.entries()) {
      const c = pick(row, body.mapping);
      if (c.kana && !c.last_name_kana) [c.last_name_kana, c.first_name_kana] = splitName(c.kana);
      if (!c.name && !c.last_name) { fail(i, '名前がありません'); continue; }
      c.memo = [c.memo, c.member_number && `前のサービスの会員番号：${c.member_number}`, c.registered_at && `前のサービスでの登録日：${normDate(c.registered_at) || c.registered_at}`].filter(Boolean).join('\n');
      const name = c.name || [c.last_name, c.first_name].filter(Boolean).join(' ');
      const hit = idx.find({ phone: c.phone, email: c.email, name });
      try {
        if (!hit) { await createCustomer(pid, idx, c); counts.created++; continue; }
        // 既にいるお客様は、空いている項目だけ埋める（Finemeで入れた情報は上書きしない）
        const col = hit.manual_id && !hit.user_id ? 'manual_customer_id' : 'user_id';
        const id = col === 'manual_customer_id' ? hit.manual_id : hit.user_id;
        const { data: cur } = await supabase.from('provider_customer_profiles').select('*').eq('provider_id', pid).eq(col, id).maybeSingle();
        const [ln, fn] = c.last_name || c.first_name ? [c.last_name, c.first_name] : splitName(name);
        const next = Object.fromEntries(Object.entries({ last_name: ln, first_name: fn, last_name_kana: c.last_name_kana, first_name_kana: c.first_name_kana, phone: normPhone(c.phone), email: normEmail(c.email), gender: c.gender ? normGender(c.gender) : null, birthday: c.birthday ? normDate(c.birthday) : null, postal_code: c.postal_code, prefecture: c.prefecture, city: c.city, address1: c.address1, address2: c.address2, emergency_name: c.emergency_name, emergency_phone: c.emergency_phone }).filter(([k, v]) => v && !cur?.[k]));
        if (cur && Object.keys(next).length) await supabase.from('provider_customer_profiles').update({ ...next, updated_by: BY, updated_at: new Date().toISOString() }).eq('id', cur.id);
        else if (!cur) await supabase.from('provider_customer_profiles').insert({ provider_id: pid, [col]: id, ...next, updated_by: BY });
        if (c.memo && hit.manual_id) {
          const { data: m } = await supabase.from('provider_manual_customers').select('memo').eq('id', hit.manual_id).single();
          if (!String(m?.memo || '').includes(c.memo)) await supabase.from('provider_manual_customers').update({ memo: [m?.memo, c.memo].filter(Boolean).join('\n') }).eq('id', hit.manual_id);
        }
        counts.updated++;
      } catch (e) { fail(i, e.message); }
    }
  }

  if (type === 'reservations') {
    const { data: services } = await supabase.from('provider_services').select('id, name').eq('provider_id', pid);
    const svcOf = new Map((services || []).map(s => [squash(s.name), s]));
    for (const [i, row] of rows.entries()) {
      const r = pick(row, body.mapping);
      let date = r.date ? normDate(r.date) : null, time = r.start_time ? normTime(r.start_time) : null;
      if (r.datetime) { const dt = normDateTime(r.datetime); date = date || dt.date; time = time || dt.time; }
      if (!date) { fail(i, '日付が読めません'); continue; }
      const st = normStatus(r.status);
      if (st === 'cancelled') { counts.skipped++; continue; } // キャンセルは取り込まない
      const name = r.customer_name || r.customer_phone || r.customer_email;
      try {
        const cust = await resolveCustomer(pid, idx, { name: r.customer_name || '名前なし', phone: r.customer_phone, email: r.customer_email }, counts);
        let q = supabase.from('reservations').select('id').eq('provider_id', pid).eq('reserved_date', date).eq('user_name', String(name).slice(0, 60)).limit(1);
        q = time ? q.eq('start_time', time) : q.is('start_time', null);
        const { data: dup } = await q;
        if (dup?.length) { counts.skipped++; continue; }
        const visited = date < today || st === 'visited';
        const svc = svcOf.get(squash(r.menu_name));
        const { error } = await supabase.from('reservations').insert({
          provider_id: pid, user_id: cust.user_id || null, user_name: String(name).slice(0, 60),
          user_contact: normPhone(r.customer_phone) || normEmail(r.customer_email) || '',
          note: [r.memo, r.menu_name && !svc && `メニュー：${r.menu_name}`, '前のサービスから取り込み'].filter(Boolean).join('\n'),
          status: visited ? 'visited' : 'approved', visited_at: visited ? `${date}T${time || '12:00'}:00+09:00` : null,
          booking_mode: 'manual', origin: 'import',
          reserved_date: date, start_time: time, end_time: r.end_time ? normTime(r.end_time) : null, confirmed_date: date, confirmed_time: time,
          service_id: svc?.id || null, service_name: svc?.name || r.menu_name || null,
          staff_id: r.staff_name ? await staffOf(r.staff_name) : null, staff_manually_assigned: !!r.staff_name,
          price: r.price ? normInt(r.price) : null,
        });
        if (error) { fail(i, error.message); continue; }
        counts.created++;
      } catch (e) { fail(i, e.message); }
    }
  }

  if (type === 'tickets') {
    const { data: pkgs } = await supabase.from('service_packages').select('id, name, ticket_id').eq('provider_id', pid);
    const pkgOf = new Map((pkgs || []).map(p => [squash(p.name), p]));
    for (const [i, row] of rows.entries()) {
      const t = pick(row, body.mapping);
      const total = normInt(t.total), used = normInt(t.used);
      const remaining = normInt(t.remaining) ?? (total != null ? total - (used || 0) : null);
      if (!remaining || remaining <= 0) { counts.skipped++; continue; } // 残りが無いものは取り込まない
      try {
        const cust = await resolveCustomer(pid, idx, { name: t.customer_name || '名前なし', phone: t.customer_phone, email: t.customer_email }, counts);
        let userId = cust.user_id;
        if (!userId) { const linked = await ensureManualLinked(pid, cust.manual_id, normEmail(t.customer_email)); userId = linked.userId; if (!userId) { fail(i, linked.error || 'お客様を準備できませんでした'); continue; } cust.user_id = userId; }
        const name = (t.ticket_name || '前のサービスの回数券').slice(0, 60);
        const expires = t.expires_at ? normDate(t.expires_at) : null;
        const { data: dup } = await supabase.from('customer_packages').select('id').eq('provider_id', pid).eq('user_id', userId).eq('package_name', name).eq('source', 'import').limit(1);
        if (dup?.length) { counts.skipped++; continue; }
        const pkg = pkgOf.get(squash(t.ticket_name));
        const { error } = await supabase.from('customer_packages').insert({
          provider_id: pid, user_id: userId, package_name: name, total_sessions: remaining, package_type: 'fixed_count',
          package_id: pkg?.id || null, ticket_id: pkg?.ticket_id || null, source: 'import',
          purchased_at: t.purchased_at && normDate(t.purchased_at) ? `${normDate(t.purchased_at)}T00:00:00+09:00` : new Date().toISOString(),
          expires_at: expires ? `${expires}T23:59:59+09:00` : null,
        });
        if (error) { fail(i, error.message); continue; }
        counts.created++;
      } catch (e) { fail(i, e.message); }
    }
  }

  if (type === 'memberships') {
    // 月額の引き落としは引き継げないため、お客様のメモに残す。Finemeでの入会は、お客様に入会のご案内を送って始めてもらう
    for (const [i, row] of rows.entries()) {
      const m = pick(row, body.mapping);
      if (/退会|解約|cancel/i.test(m.status || '')) { counts.skipped++; continue; }
      try {
        const cust = await resolveCustomer(pid, idx, { name: m.customer_name || '名前なし', phone: m.customer_phone, email: m.customer_email }, counts);
        const line = `前のサービスの会員プラン：${m.plan_name}${m.monthly_fee ? `（月額¥${(normInt(m.monthly_fee) || 0).toLocaleString()}）` : ''}${m.started_at ? `・開始 ${normDate(m.started_at) || m.started_at}` : ''}${m.status ? `・${m.status}` : ''}${m.memo ? `・${m.memo}` : ''}`;
        if (cust.manual_id) {
          const { data: cur } = await supabase.from('provider_manual_customers').select('memo').eq('id', cust.manual_id).single();
          if (String(cur?.memo || '').includes(line)) { counts.skipped++; continue; }
          await supabase.from('provider_manual_customers').update({ memo: [cur?.memo, line].filter(Boolean).join('\n') }).eq('id', cust.manual_id);
        } else {
          const { data: cur } = await supabase.from('provider_customer_notes').select('note').eq('provider_id', pid).eq('user_id', cust.user_id).maybeSingle();
          if (String(cur?.note || '').includes(line)) { counts.skipped++; continue; }
          await supabase.from('provider_customer_notes').upsert({ provider_id: pid, user_id: cust.user_id, note: [cur?.note, line].filter(Boolean).join('\n'), updated_at: new Date().toISOString() }, { onConflict: 'provider_id,user_id' });
        }
        counts.created++;
      } catch (e) { fail(i, e.message); }
    }
  }

  if (type === 'shifts') {
    for (const [i, row] of rows.entries()) {
      const s = pick(row, body.mapping);
      const date = normDate(s.date), st = normTime(s.start_time), en = normTime(s.end_time);
      if (!date || !st || !en) { fail(i, '日付か時刻が読めません'); continue; }
      const staffId = await staffOf(s.staff_name);
      if (!staffId) { fail(i, 'スタッフ名がありません'); continue; }
      const { data: dup } = await supabase.from('provider_shift_entries').select('id').eq('provider_id', pid).eq('staff_id', staffId).eq('date', date).eq('start_time', st).limit(1);
      if (dup?.length) { counts.skipped++; continue; }
      const { error } = await supabase.from('provider_shift_entries').insert({ provider_id: pid, staff_id: staffId, date, start_time: st, end_time: en, source: 'manual' });
      if (error) fail(i, error.message); else counts.created++;
    }
  }

  if (type === 'attendance') {
    for (const [i, row] of rows.entries()) {
      const r = pick(row, body.mapping);
      const date = normDate(r.date);
      if (!date) { fail(i, '日付が読めません'); continue; }
      const staffId = await staffOf(r.staff_name);
      if (!staffId) { fail(i, 'スタッフ名がありません'); continue; }
      const inT = normTime(r.clock_in);
      const at = t => {
        // 出勤より前の時刻は、日をまたいだ翌日として扱う
        const next = inT && t < inT ? new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10) : date;
        return `${next}T${t}:00+09:00`;
      };
      const punches = [['in', r.clock_in], ['break_start', r.break_start], ['break_end', r.break_end], ['out', r.clock_out]]
        .map(([kind, v]) => [kind, normTime(v)]).filter(([, t]) => t).map(([kind, t]) => ({ provider_id: pid, staff_id: staffId, kind, punched_at: at(t), source: 'manual', created_by: BY, note: '前のサービスから取り込み' }));
      if (!punches.length) { fail(i, '時刻が読めません'); continue; }
      const { data: dup } = await supabase.from('provider_attendance_punches').select('id').eq('provider_id', pid).eq('staff_id', staffId).eq('kind', 'in').eq('punched_at', punches[0].punched_at).is('voided_at', null).limit(1);
      if (dup?.length) { counts.skipped++; continue; }
      const { error } = await supabase.from('provider_attendance_punches').insert(punches);
      if (error) fail(i, error.message); else counts.created++;
    }
  }

  return Response.json({ ok: true, ...counts, errors });
}

export const POST = withAudit(__POST);
