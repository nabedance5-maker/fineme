// AI専属コンサルが管理画面の作業を代わりにやる（2026-11-12 渡邉要望：「ただの相談役なのがもったいない。
// 『1月のシフト作って』『最近来てない人を探して』『今日の来店確認をしてない人を来店済みに』『一斉メールを送って』」）。
// ・見るだけの作業（お客様を探す）はその場で結果を出す。
// ・何かを変える・送る作業（シフト作成・来店済み・配信）は、AIが中身を用意し、お店が画面の「実行」を押した時だけ動く。
//   実行の時は、対象をサーバーでもう一度計算し直す（AIや画面から届いた一覧は信用しない）。
// ・お客様の名前はAIに渡さない（画面にだけ出す）。
import { runShiftGenerate } from '@/lib/shift-generate-run';
import { afterVisited } from '@/lib/reservation-visited';
import { planAllows } from '@/lib/feature-flags';
import { jstNow } from '@/lib/consultant-insight';

const DAY = 86400000;
const ymd = d => d.toISOString().slice(0, 10);
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export function todayJst() {
  return ymd(jstNow());
}

// ── シフトの自動作成 ──
export function shiftDates(from, to) {
  if (!isDate(from) || !isDate(to) || from > to) return null;
  const out = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length <= 62) { out.push(ymd(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out.length > 62 ? null : out;
}

export async function runShiftAction(db, provider, { from, to }) {
  if (!planAllows(provider, 'shift_management')) return { error: 'シフト管理は、今のプランでは使えません' };
  const dates = shiftDates(from, to);
  if (!dates) return { error: '期間が正しくありません（最大62日）' };
  if (dates[dates.length - 1] < todayJst()) return { error: '過ぎた日のシフトは作れません' };
  const r = await runShiftGenerate(db, provider.id, dates);
  if (r.error) return { error: r.error };
  return {
    ok: true,
    message: `${from}〜${to}のシフトを${r.createdCount}コマ作りました${r.skippedConfirmed ? `（確定済みの${r.skippedConfirmed}日はそのまま）` : ''}。シフトの画面で確認して、よければ確定してください。`,
    warnings: [...(r.warnings || []), ...(r.skipped || [])].slice(0, 8).map(w => (typeof w === 'string' ? w : w?.message || w?.reason || JSON.stringify(w)).slice(0, 160)),
  };
}

// ── 来店済みにする（その日の、確定済みで時間が始まった予約） ──
const toMin = t => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };

export async function visitCandidates(db, provider, date) {
  const day = isDate(date) ? date : todayJst();
  if (day > todayJst()) return [];
  const { data } = await db.from('reservations')
    .select('id, user_name, reserved_date, confirmed_date, start_time, confirmed_time, class_id, status')
    .eq('provider_id', provider.id).eq('status', 'approved')
    .or(`confirmed_date.eq.${day},and(confirmed_date.is.null,reserved_date.eq.${day})`)
    .limit(300);
  const now = jstNow();
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (data || [])
    .filter(r => !r.class_id)
    .filter(r => {
      if (day < todayJst()) return true;
      const s = toMin(r.confirmed_time || r.start_time);
      return s != null && s <= nowMin;
    })
    .map(r => ({ id: r.id, name: r.user_name || 'お客様', time: String(r.confirmed_time || r.start_time || '').slice(0, 5) }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function runVisitAction(db, provider, { date }) {
  const list = await visitCandidates(db, provider, date);
  if (!list.length) return { error: '来店済みにできる予約はありません（時間が来ていない予約・確定していない予約は対象外です）' };
  let done = 0;
  for (const r of list) {
    const { data: updated } = await db.from('reservations')
      .update({ status: 'visited', visited_at: new Date().toISOString() })
      .eq('id', r.id).eq('provider_id', provider.id).eq('status', 'approved')
      .select().maybeSingle();
    if (!updated) continue;
    try { await afterVisited(db, updated, { previousStatus: 'approved', providerName: provider.name }); } catch (e) { console.error('[consultant visit]', r.id, e?.message); }
    done++;
  }
  return { ok: true, message: `${done}件を来店済みにしました。お礼の連絡やチケットの消化は、いつもの来店確認と同じように行われます。売上の記録は売上管理で確認してください。` };
}

// ── お客様を探す（見るだけ） ──
export const FIND_SEGMENTS = {
  lapsed: { label: '最近来ていない方', stages: ['first_lapsing', 'regular_overdue', 'dormant', 'first_lost'] },
  first_lapsing: { label: '2回目を逃しかけている方', stages: ['first_lapsing'] },
  regular_overdue: { label: '通う間隔を過ぎている常連の方', stages: ['regular_overdue'] },
  regular_due: { label: 'そろそろ来る頃の常連の方', stages: ['regular_due'] },
  dormant: { label: '休眠の方', stages: ['dormant', 'first_lost'] },
  first_waiting: { label: '2回目を待っている新規の方', stages: ['first_waiting'] },
};

export async function findCustomers(db, provider, insight, segment, limit = 30) {
  const seg = FIND_SEGMENTS[segment] || FIND_SEGMENTS.lapsed;
  const ids = [...new Set(seg.stages.flatMap(k => insight.stages.find(s => s.key === k)?.ids || []))];
  const shown = ids.slice(0, Math.min(Math.max(limit, 1), 50));
  const names = {};
  if (shown.length) {
    const [{ data: pr }, { data: cp }] = await Promise.all([
      db.from('profiles').select('id, display_name, last_name, first_name').in('id', shown),
      db.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', provider.id).in('user_id', shown),
    ]);
    (pr || []).forEach(p => { names[p.id] = [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || ''; });
    (cp || []).forEach(p => { const n = [p.last_name, p.first_name].filter(Boolean).join(' '); if (n) names[p.user_id] = n; });
  }
  return { label: seg.label, total: ids.length, people: shown.map(id => ({ user_id: id, name: names[id] || 'お名前未登録' })) };
}

// ── 名前から探す（AIが言ったお客様・メニュー・スタッフ・回数券を、このお店の中から探す） ──
const norm = s => String(s || '').replace(/[\s　]/g, '').replace(/(さま|様|さん|ちゃん|くん)$/, '').toLowerCase();
const like = s => `%${String(s || '').replace(/[%_,()]/g, '').trim()}%`;

export async function resolveCustomers(db, provider, query) {
  const q = norm(query);
  if (!q) return [];
  const out = new Map();
  const add = (key, v) => { if (!out.has(key)) out.set(key, v); };
  const [{ data: cps }, { data: res }, { data: mcs }] = await Promise.all([
    db.from('provider_customer_profiles').select('user_id, manual_customer_id, last_name, first_name, last_name_kana, first_name_kana, phone').eq('provider_id', provider.id).limit(3000),
    db.from('reservations').select('user_id, user_name').eq('provider_id', provider.id).not('user_id', 'is', null).ilike('user_name', like(query)).limit(50),
    db.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('provider_id', provider.id).limit(3000),
  ]);
  (cps || []).forEach(p => {
    const name = [p.last_name, p.first_name].filter(Boolean).join(' ');
    const hay = norm(`${p.last_name || ''}${p.first_name || ''}`) + '|' + norm(`${p.last_name_kana || ''}${p.first_name_kana || ''}`) + '|' + norm(p.last_name) + '|' + norm(p.phone);
    if (!name || !hay.includes(q)) return;
    if (p.user_id) add(`u:${p.user_id}`, { user_id: p.user_id, name });
    else if (p.manual_customer_id) add(`m:${p.manual_customer_id}`, { manual_id: p.manual_customer_id, name });
  });
  (res || []).forEach(r => { if (norm(r.user_name).includes(q)) add(`u:${r.user_id}`, { user_id: r.user_id, name: r.user_name }); });
  (mcs || []).forEach(m => {
    if (!norm(m.display_name).includes(q)) return;
    if (m.linked_user_id) add(`u:${m.linked_user_id}`, { user_id: m.linked_user_id, name: m.display_name });
    else add(`m:${m.id}`, { manual_id: m.id, name: m.display_name });
  });
  return [...out.values()].slice(0, 5);
}

async function byName(db, table, provider, query, cols, extra = q => q) {
  if (!String(query || '').trim()) return null;
  const { data } = await extra(db.from(table).select(cols).eq('provider_id', provider.id)).limit(500);
  const q = norm(query);
  const list = data || [];
  return list.find(x => norm(x.name) === q) || list.find(x => norm(x.name).includes(q)) || list.find(x => q.includes(norm(x.name)) && norm(x.name)) || null;
}
export const resolveService = (db, provider, q) => byName(db, 'provider_services', provider, q, 'id, name, duration_minutes, price');
export const resolveStaff = (db, provider, q) => byName(db, 'provider_staff', provider, q, 'id, name');
export const resolvePackage = (db, provider, q) => byName(db, 'service_packages', provider, q, 'id, name, price, package_type, total_sessions, active', x => x.eq('active', true));

// そのお客様のこれからの確定済みの予約（日時の変更の対象を探す）
export async function upcomingReservations(db, provider, userId, date) {
  const today = todayJst();
  let q = db.from('reservations').select('id, user_name, status, reserved_date, confirmed_date, start_time, confirmed_time, class_id')
    .eq('provider_id', provider.id).eq('user_id', userId).eq('status', 'approved');
  const { data } = await q.limit(50);
  return (data || [])
    .map(r => ({ id: r.id, date: r.confirmed_date || r.reserved_date, time: String(r.confirmed_time || r.start_time || '').slice(0, 5), class_id: r.class_id }))
    .filter(r => !r.class_id && r.date >= today && (!date || r.date === date))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ── 数字（売上・予約）。お客様の名前は含めない。AIへの材料として会話のたびに渡す ──
export async function numbersForPrompt(db, provider) {
  const now = jstNow();
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); return ymd(d).slice(0, 7); }).reverse();
  const from = `${months[0]}-01`;
  const [{ data: sales }, { data: res }] = await Promise.all([
    db.from('provider_sales_entries').select('entry_date, amount, menu_name').eq('provider_id', provider.id).gte('entry_date', from).limit(20000),
    db.from('reservations').select('status, reserved_date, confirmed_date').eq('provider_id', provider.id).gte('reserved_date', from).limit(20000),
  ]);
  const byMonth = Object.fromEntries(months.map(m => [m, { total: 0, count: 0, menus: {}, res: 0, visited: 0, cancelled: 0, noShow: 0 }]));
  (sales || []).forEach(s => { const m = byMonth[String(s.entry_date).slice(0, 7)]; if (!m) return; m.total += s.amount || 0; m.count++; if (s.menu_name) m.menus[s.menu_name] = (m.menus[s.menu_name] || 0) + (s.amount || 0); });
  (res || []).forEach(r => {
    const m = byMonth[String(r.confirmed_date || r.reserved_date).slice(0, 7)]; if (!m) return;
    if (['approved', 'visited', 'no_show'].includes(r.status)) m.res++;
    if (r.status === 'visited') m.visited++;
    if (['cancelled', 'rejected'].includes(r.status)) m.cancelled++;
    if (r.status === 'no_show') m.noShow++;
  });
  const lines = months.map(m => {
    const v = byMonth[m];
    const top = Object.entries(v.menus).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, a]) => `${n} ${a.toLocaleString()}円`).join('、');
    return `- ${m}${m === months[months.length - 1] ? '（今月・途中）' : ''}：売上 ${v.total.toLocaleString()}円（${v.count}件）／予約 ${v.res}件（来店 ${v.visited}・キャンセル ${v.cancelled}・無断キャンセル ${v.noShow}）${top ? `／売上の多いメニュー：${top}` : ''}`;
  });
  return `【数字（売上管理の記録と予約。直近6か月）】\n${lines.join('\n')}\n数字を聞かれたら、この記録だけを使って答える（記録に無い数字は作らない。売上管理に入っていない売上は含まれない）。`;
}
