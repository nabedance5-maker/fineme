// お客様の非表示（2026-11-12 渡邉要望）。メンバー一覧の表示からだけ外す（記録・配信・予約・POS・チケットは何も変えない）
// GET    /api/provider/customers/hidden → 非表示にしたお客様（お名前・日時・した人だけ）
// POST   /api/provider/customers/hidden { user_id | manual_id } → 非表示にする
// DELETE /api/provider/customers/hidden { user_id | manual_id } → 表示に戻す
// お店のオーナーのみ。user_id はこのお店のお客様か、manual_id はこのお店の非会員かを確かめる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { isStoreCustomer } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownerProvider(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

async function target(provider, b) {
  if (b.user_id && UUID.test(b.user_id)) {
    // 一覧には New Me Log をお店につないだだけの方もいるので、それも「このお店のお客様」に含める
    const ok = await isStoreCustomer(provider.id, b.user_id)
      || (provider.slug && ((await supabase.from('user_service_logs').select('id').eq('provider_slug', provider.slug).eq('user_id', b.user_id).limit(1)).data || []).length > 0);
    return ok ? { col: 'user_id', id: b.user_id } : null;
  }
  if (b.manual_id && UUID.test(b.manual_id)) {
    const { data } = await supabase.from('provider_manual_customers').select('id').eq('id', b.manual_id).eq('provider_id', provider.id).maybeSingle();
    return data ? { col: 'manual_customer_id', id: data.id } : null;
  }
  return null;
}

export async function GET(request) {
  const provider = await ownerProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows } = await supabase.from('provider_hidden_customers').select('user_id, manual_customer_id, hidden_at, hidden_by').eq('provider_id', provider.id).order('hidden_at', { ascending: false }).limit(500);
  const list = rows || [];
  const uids = list.filter(r => r.user_id).map(r => r.user_id);
  const mids = list.filter(r => r.manual_customer_id).map(r => r.manual_customer_id);
  const names = {};
  const [pr, cp, mc] = await Promise.all([
    uids.length ? supabase.from('profiles').select('id, display_name, last_name, first_name').in('id', uids) : { data: [] },
    uids.length ? supabase.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', provider.id).in('user_id', uids) : { data: [] },
    mids.length ? supabase.from('provider_manual_customers').select('id, display_name').eq('provider_id', provider.id).in('id', mids) : { data: [] },
  ]);
  (pr.data || []).forEach(p => { names[p.id] = [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || ''; });
  (cp.data || []).forEach(p => { const n = [p.last_name, p.first_name].filter(Boolean).join(' '); if (n) names[p.user_id] = n; });
  (mc.data || []).forEach(m => { names[m.id] = m.display_name; });
  return Response.json(list.map(r => ({
    user_id: r.user_id || null, manual_id: r.manual_customer_id || null, manual: !!r.manual_customer_id,
    name: names[r.user_id || r.manual_customer_id] || 'お名前未登録', hidden_at: r.hidden_at, hidden_by: r.hidden_by,
  })));
}

function operator(request) {
  try { return decodeURIComponent(request.headers.get('x-fineme-operator') || '').trim().slice(0, 40) || '店舗アカウント'; } catch { return '店舗アカウント'; }
}

async function __POST(request) {
  const provider = await ownerProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const t = await target(provider, await request.json().catch(() => ({})));
  if (!t) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
  const { data: ex } = await supabase.from('provider_hidden_customers').select('id').eq('provider_id', provider.id).eq(t.col, t.id).maybeSingle();
  if (!ex) {
    const { error } = await supabase.from('provider_hidden_customers').insert({ provider_id: provider.id, [t.col]: t.id, hidden_by: operator(request) });
    if (error) return Response.json({ error: '非表示にできませんでした' }, { status: 500 });
  }
  return Response.json({ ok: true });
}

async function __DELETE(request) {
  const provider = await ownerProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const col = b.user_id && UUID.test(b.user_id) ? 'user_id' : b.manual_id && UUID.test(b.manual_id) ? 'manual_customer_id' : null;
  if (!col) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
  await supabase.from('provider_hidden_customers').delete().eq('provider_id', provider.id).eq(col, b.user_id || b.manual_id);
  return Response.json({ ok: true });
}

export const POST = withAudit(__POST);
export const DELETE = withAudit(__DELETE);
