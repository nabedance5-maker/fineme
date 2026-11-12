// POST   /api/provider/customers/[user_id]/remove → このお店のメンバー一覧から外す（お店のオーナーのみ）
// DELETE /api/provider/customers/[user_id]/remove → 外したのを取り消す
// お客様のFinemeアカウント・予約・カルテ・売上の記録は消さない（lib/customer-removals.js）。
// 間違えて消すと大問題になる方は外せない（2026-11-12 渡邉指摘）：会員プランに入会中・承認待ち、使えるチケット・回数券が残っている、
// これからの予約がある、ロッカーを契約中。確認して押し切ることもできない。外した方は一覧の「削除したメンバー」から元に戻せる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { isStoreCustomer } from '@/lib/customer-accounts';
import { removalBlockers } from '@/lib/customer-removals';

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

  const reasons = await removalBlockers(supabase, provider.id, userId);
  if (reasons.length) return Response.json({ error: `このお客様は削除できません。\n${reasons.map(r => `・${r}`).join('\n')}`, reasons }, { status: 409 });

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
