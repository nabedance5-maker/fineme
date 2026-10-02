// GET /api/admin/customers?provider_id=&q= → 全店舗（または1店舗）の顧客一覧（運営用）
// 会員（New Me Log連携）と非会員（店舗が手入力）を同じ形で返す。会員番号は店舗内連番で、
// 未採番の顧客はこの取得時に採番する（店舗側の一覧と同じ採番ロジック・lib/customer-numbers.js）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { ensureCustomerNumbers } from '@/lib/customer-numbers';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const MAX_ROWS = 1000;

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

function matches(kw, name, no, providerName) {
  if (!kw) return true;
  if ((name || '').toLowerCase().includes(kw) || (providerName || '').toLowerCase().includes(kw)) return true;
  if (no == null) return false;
  const digits = kw.replace(/^(no\.?|#|会員番号)\s*/i, '').replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  return /^\d+$/.test(digits) && String(no).includes(digits.replace(/^0+(?=\d)/, ''));
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id') || '';
  const kw = (searchParams.get('q') || '').trim().toLowerCase();

  let provQuery = supabase.from('providers').select('id, slug, name').order('name');
  if (providerId) provQuery = provQuery.eq('id', providerId);
  const { data: providers, error: provErr } = await provQuery;
  if (provErr) return Response.json({ error: provErr.message }, { status: 500 });
  if (!providers?.length) return Response.json({ providers: [], customers: [], truncated: false });

  const slugs = providers.map(p => p.slug).filter(Boolean);
  const ids = providers.map(p => p.id);

  const [{ data: logs, error: logErr }, { data: manuals, error: manErr }] = await Promise.all([
    supabase.from('user_service_logs')
      .select('user_id, provider_slug, last_visit, created_at')
      .in('provider_slug', slugs)
      .eq('active', true)
      .limit(20000),
    supabase.from('provider_manual_customers')
      .select('id, provider_id, display_name, memo, linked_user_id, created_at')
      .in('provider_id', ids)
      .order('created_at', { ascending: true })
      .limit(20000),
  ]);
  if (logErr) return Response.json({ error: logErr.message }, { status: 500 });
  if (manErr) return Response.json({ error: manErr.message }, { status: 500 });

  // 店舗×会員ごとに集約（同じ会員が複数ログを持ちうる）
  const memberByProvider = {};
  (logs || []).forEach(l => {
    if (!l.user_id) return;
    const prov = (memberByProvider[l.provider_slug] = memberByProvider[l.provider_slug] || {});
    const t = new Date(l.created_at).getTime();
    const cur = prov[l.user_id] || { firstSeen: t, lastVisit: null };
    if (t < cur.firstSeen) cur.firstSeen = t;
    if (l.last_visit && (!cur.lastVisit || l.last_visit > cur.lastVisit)) cur.lastVisit = l.last_visit;
    prov[l.user_id] = cur;
  });

  const allUserIds = [...new Set(Object.values(memberByProvider).flatMap(m => Object.keys(m)))];
  const nameMap = {};
  for (let i = 0; i < allUserIds.length; i += 500) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', allUserIds.slice(i, i + 500));
    (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  }

  const manualByProvider = {};
  (manuals || []).forEach(m => { (manualByProvider[m.provider_id] = manualByProvider[m.provider_id] || []).push(m); });

  const customers = [];
  for (const p of providers) {
    const members = memberByProvider[p.slug] || {};
    const userIds = Object.keys(members).sort((a, b) => members[a].firstSeen - members[b].firstSeen);
    const manualList = manualByProvider[p.id] || [];
    const manualIds = manualList.filter(m => !m.linked_user_id).map(m => m.id);
    let numbers = { user: {}, manual: {} };
    try { numbers = await ensureCustomerNumbers(supabase, p.id, { userIds, manualIds }); } catch { /* 番号が振れなくても一覧は返す */ }

    userIds.forEach(uid => {
      customers.push({
        kind: 'member', key: `m:${p.id}:${uid}`,
        provider_id: p.id, provider_name: p.name,
        user_id: uid, name: nameMap[uid] || '(名前未設定)',
        member_number: numbers.user[uid] ?? null,
        last_visit: members[uid].lastVisit,
      });
    });
    manualList.forEach(m => {
      customers.push({
        kind: 'manual', key: `n:${m.id}`,
        provider_id: p.id, provider_name: p.name,
        manual_id: m.id, name: m.display_name,
        member_number: m.linked_user_id ? null : (numbers.manual[m.id] ?? null),
        linked_user_id: m.linked_user_id || null,
        memo: m.memo || null,
      });
    });
  }

  const filtered = customers.filter(c => matches(kw, c.name, c.member_number, c.provider_name));
  return Response.json({
    providers: providers.map(p => ({ id: p.id, name: p.name })),
    customers: filtered.slice(0, MAX_ROWS),
    total: filtered.length,
    truncated: filtered.length > MAX_ROWS,
  });
}
