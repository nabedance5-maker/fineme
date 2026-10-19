// POST /api/provider/export → CSV（でお要望 2026-10-19：hacomono差分 #11「検索エクスポート」相当）
// type: customers / reservations / sales / memberships / checkins。from・to（YYYY-MM-DD）で期間を絞れる（顧客は全件）。
// 個人情報を含むため POST にして、誰がいつ出力したかを操作ログに残す。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { providerCustomerIds } from '@/lib/broadcast';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const GENDER = { female: '女性', male: '男性', other: 'その他' };
const STATUS = { pending: '承認待ち', approved: '確定', counter_proposed: '日程の再提案中', visited: '来店済み', cancelled: 'キャンセル', rejected: 'お断り', expired: '期限切れ' };
const MSTATUS = { pending_approval: '承認待ち', active: '入会中', cancelled: '退会', rejected: '却下' };
const jst = ts => (ts ? new Date(new Date(ts).getTime() + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 16) : '');
const cell = v => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? `"'${s.replace(/"/g, '""')}"` : `"${s.replace(/"/g, '""')}"`; };
const csv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n');

async function all(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await q().range(from, from + 999);
    out.push(...(data || []));
    if (!data || data.length < 1000 || out.length >= 50000) return out;
  }
}
async function inChunks(ids, fn) {
  const out = [];
  for (let i = 0; i < ids.length; i += 300) out.push(...((await fn(ids.slice(i, i + 300))).data || []));
  return out;
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const b = await request.json().catch(() => ({}));
  const okDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  const from = okDate(b.from) ? b.from : '2000-01-01';
  const to = okDate(b.to) ? b.to : '2999-12-31';
  const fromIso = new Date(`${from}T00:00:00+09:00`).toISOString();
  const toIso = new Date(new Date(`${to}T00:00:00+09:00`).getTime() + 86400000).toISOString();
  const { data: staff } = await supabase.from('provider_staff').select('id, name').eq('provider_id', pid);
  const staffName = Object.fromEntries((staff || []).map(s => [s.id, s.name]));
  let body;

  if (b.type === 'customers') {
    const { data: prov } = await supabase.from('providers').select('id, slug').eq('id', pid).single();
    const ids = [...(await providerCustomerIds(supabase, prov))];
    const [profs, cps, labels, types, tags, resv, mems, manual, links] = await Promise.all([
      inChunks(ids, part => supabase.from('profiles').select('id, display_name, line_user_id').in('id', part)),
      all(() => supabase.from('provider_customer_profiles').select('*').eq('provider_id', pid).order('id')),
      all(() => supabase.from('provider_customer_labels').select('user_id, manual_id, member_type_id, tag_ids').eq('provider_id', pid).order('id')),
      supabase.from('provider_member_types').select('id, name').eq('provider_id', pid).then(r => r.data || []),
      supabase.from('provider_customer_tags').select('id, name').eq('provider_id', pid).then(r => r.data || []),
      all(() => supabase.from('reservations').select('user_id, status, reserved_date, confirmed_date, created_at').eq('provider_id', pid).not('user_id', 'is', null).order('id')),
      all(() => supabase.from('provider_memberships').select('user_id, status, plan_id').eq('provider_id', pid).eq('status', 'active').order('id')),
      all(() => supabase.from('provider_manual_customers').select('id, display_name, memo, created_at, linked_user_id').eq('provider_id', pid).order('id')),
      all(() => supabase.from('provider_customer_line_links').select('user_id').eq('provider_id', pid).order('user_id')),
    ]);
    const { data: plans } = await supabase.from('provider_membership_plans').select('id, name').eq('provider_id', pid);
    const planName = Object.fromEntries((plans || []).map(p => [p.id, p.name]));
    const typeName = Object.fromEntries(types.map(t => [t.id, t.name])); const tagName = Object.fromEntries(tags.map(t => [t.id, t.name]));
    const profOf = Object.fromEntries(profs.map(p => [p.id, p]));
    const cpU = {}, cpM = {}; cps.forEach(c => { if (c.user_id) cpU[c.user_id] = c; if (c.manual_customer_id) cpM[c.manual_customer_id] = c; });
    const lbU = {}, lbM = {}; labels.forEach(l => { if (l.user_id) lbU[l.user_id] = l; if (l.manual_id) lbM[l.manual_id] = l; });
    const lineStore = new Set(links.map(l => l.user_id));
    const memOf = {}; mems.forEach(m => { memOf[m.user_id] = planName[m.plan_id] || '会員プラン'; });
    const st = {}; resv.forEach(r => {
      const s = st[r.user_id] || (st[r.user_id] = { first: r.created_at, visits: 0, last: null });
      if (r.created_at < s.first) s.first = r.created_at;
      if (r.status === 'visited') { s.visits++; const d = r.confirmed_date || r.reserved_date; if (d && (!s.last || d > s.last)) s.last = d; }
    });
    const head = ['種別', 'お名前', 'フリガナ', '電話番号', 'メールアドレス', '性別', '生年月日', '郵便番号', '住所', 'メンバータイプ', 'タグ', '会員プラン', '来店回数', '最終来店日', 'LINE', 'メモ'];
    const line = (c, l, extra) => [
      c ? [c.last_name, c.first_name].filter(Boolean).join(' ') || extra.name : extra.name,
      c ? [c.last_name_kana, c.first_name_kana].filter(Boolean).join(' ') : '',
      c?.phone || '', c?.email || '', GENDER[c?.gender] || '', c?.birthday || '', c?.postal_code || '',
      c ? [c.prefecture, c.city, c.address1, c.address2].filter(Boolean).join('') : '',
      typeName[l?.member_type_id] || '', (l?.tag_ids || []).map(t => tagName[t]).filter(Boolean).join(' / '),
    ];
    const rows = ids.map(uid => {
      const c = cpU[uid]; const s = st[uid] || {};
      return ['会員', ...line(c, lbU[uid], { name: profOf[uid]?.display_name || '' }), memOf[uid] || '', s.visits || 0, s.last || '', lineStore.has(uid) ? 'お店のLINE' : profOf[uid]?.line_user_id ? 'FinemeのLINE' : '', ''];
    }).concat(manual.filter(m => !m.linked_user_id).map(m => ['非会員', ...line(cpM[m.id], lbM[m.id], { name: m.display_name }), '', 0, '', '', m.memo || '']));
    body = csv(head, rows);
  } else if (b.type === 'reservations') {
    const rows = await all(() => supabase.from('reservations').select('reserved_date, confirmed_date, start_time, confirmed_time, user_name, user_contact, service_name, staff_id, status, price, created_at').eq('provider_id', pid)
      .gte('reserved_date', from).lte('reserved_date', to).order('reserved_date'));
    body = csv(['予約日', '時間', 'お名前', '連絡先', 'メニュー', '担当', '状態', '金額', '申込日時'],
      rows.map(r => [r.confirmed_date || r.reserved_date, (r.confirmed_time || r.start_time || '').slice(0, 5), r.user_name, r.user_contact, r.service_name, staffName[r.staff_id] || '', STATUS[r.status] || r.status, r.price ?? '', jst(r.created_at)]));
  } else if (b.type === 'sales') {
    const rows = await all(() => supabase.from('provider_sales_entries').select('entry_date, amount, menu_name, staff_id, payment_method, memo, source, created_at').eq('provider_id', pid).gte('entry_date', from).lte('entry_date', to).order('entry_date'));
    body = csv(['日付', '金額', '内容', '担当', '支払い方法', 'メモ', '記録元'], rows.map(r => [r.entry_date, r.amount, r.menu_name, staffName[r.staff_id] || '', r.payment_method || '', r.memo || '', r.source || '']));
  } else if (b.type === 'memberships') {
    const rows = await all(() => supabase.from('provider_memberships').select('last_name, first_name, phone, plan_id, status, enrollment_date, approved_at, paused_at, pause_until, cancel_at, cancelled_at, cancel_reason, payment_status, created_at').eq('provider_id', pid).neq('status', 'draft').order('created_at'));
    const { data: plans } = await supabase.from('provider_membership_plans').select('id, name, monthly_price').eq('provider_id', pid);
    const planOf = Object.fromEntries((plans || []).map(p => [p.id, p]));
    const PS = { ok: '正常', past_due: '支払いエラー', unpaid: '未払い' };
    body = csv(['お名前', '電話番号', 'プラン', '月額', '状態', '入会希望日', '承認日', '休会', '退会予定日', '退会日', '退会の理由', '支払い', '申込日時'],
      rows.map(m => [[m.last_name, m.first_name].filter(Boolean).join(' '), m.phone || '', planOf[m.plan_id]?.name || '', planOf[m.plan_id]?.monthly_price ?? '', MSTATUS[m.status] || m.status, m.enrollment_date || '', jst(m.approved_at), m.paused_at ? `休会中${m.pause_until ? `（${m.pause_until}再開）` : ''}` : '', m.cancel_at || '', jst(m.cancelled_at), m.cancel_reason || '', PS[m.payment_status] || '', jst(m.created_at)]));
  } else if (b.type === 'checkins') {
    const rows = await all(() => supabase.from('provider_checkins').select('user_id, offline_member_name, method, created_at').eq('provider_id', pid).gte('created_at', fromIso).lt('created_at', toIso).order('created_at'));
    const uids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const [profs, cps] = await Promise.all([
      inChunks(uids, part => supabase.from('profiles').select('id, display_name').in('id', part)),
      inChunks(uids, part => supabase.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', pid).in('user_id', part)),
    ]);
    const name = {}; profs.forEach(p => { name[p.id] = p.display_name; }); cps.forEach(c => { const n = [c.last_name, c.first_name].filter(Boolean).join(' '); if (n) name[c.user_id] = n; });
    body = csv(['日時', 'お名前', '方法'], rows.map(r => [jst(r.created_at), r.user_id ? name[r.user_id] || '' : r.offline_member_name || '', r.method === 'qr' ? 'QR' : '手動']));
  } else {
    return Response.json({ error: '出力する種類を選んでください' }, { status: 400 });
  }
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' } });
}
export const POST = withAudit(__POST);
