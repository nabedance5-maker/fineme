// POST   /api/provider/customers/[user_id]/remove { tickets_ok? } → このお店のメンバー一覧から外す（お店のオーナーのみ）
// DELETE /api/provider/customers/[user_id]/remove → 外したのを取り消す
// お客様のFinemeアカウント・予約・カルテ・売上の記録は消さない（lib/customer-removals.js）。
// 会員プランの契約中・これからの予約がある方は外せない（先に解約・キャンセルしてもらう）。使えるチケットが残っている時は確認する。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { isStoreCustomer } from '@/lib/customer-accounts';
import { customerEntitlements } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownerProvider(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const provider = await ownerProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (await params).user_id;
  if (!UUID.test(userId || '') || !(await isStoreCustomer(provider.id, userId))) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const [{ data: mems }, { data: rows }] = await Promise.all([
    supabase.from('provider_memberships').select('id, status').eq('provider_id', provider.id).eq('user_id', userId).in('status', ['active', 'pending_approval']),
    supabase.from('reservations').select('id, status, reserved_date, confirmed_date, counter_date').eq('provider_id', provider.id).eq('user_id', userId).in('status', ['pending', 'approved', 'counter_proposed']),
  ]);
  if ((mems || []).length) return Response.json({ error: '会員プランに入会中（または承認待ち）のため外せません。先に退会の手続きをしてください。', reason: 'membership' }, { status: 409 });
  const upcoming = (rows || []).filter(r => (r.confirmed_date || r.counter_date || r.reserved_date || '') >= today);
  if (upcoming.length) return Response.json({ error: `これからの予約が${upcoming.length}件あるため外せません。先に予約をキャンセルしてください。`, reason: 'reservations' }, { status: 409 });

  const ent = await customerEntitlements(supabase, provider.id, userId);
  if (ent.tickets.length && body.tickets_ok !== true) {
    return Response.json({ error: '使えるチケットが残っています', reason: 'tickets', tickets: ent.tickets.map(t => ({ name: t.name, unlimited: t.unlimited, remaining: t.remaining })) }, { status: 409 });
  }

  const by = (() => { try { return decodeURIComponent(request.headers.get('x-fineme-operator') || '').trim().slice(0, 40) || '店舗アカウント'; } catch { return '店舗アカウント'; } })();
  const { error } = await supabase.from('provider_customer_removals')
    .upsert({ provider_id: provider.id, user_id: userId, removed_at: new Date().toISOString(), removed_by: by }, { onConflict: 'provider_id,user_id' });
  if (error) return Response.json({ error: '外せませんでした' }, { status: 500 });
  return Response.json({ ok: true });
}

async function __DELETE(request, { params }) {
  const provider = await ownerProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (await params).user_id;
  if (!UUID.test(userId || '')) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
  await supabase.from('provider_customer_removals').delete().eq('provider_id', provider.id).eq('user_id', userId);
  return Response.json({ ok: true });
}

export const POST = withAudit(__POST);
export const DELETE = withAudit(__DELETE);
