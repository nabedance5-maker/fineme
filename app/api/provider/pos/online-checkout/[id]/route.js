// GET /api/provider/pos/online-checkout/[id] → オンライン決済の確定状況をポーリングで確認
// でお要望2026-09-27。決済確定はStripe Webhookが行うため、レジ画面（店舗スタッフ側）は
// この状態を数秒おきに見に行き、paidになったら会計完了として表示を切り替える。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }

  const { data: pending } = await supabase.from('provider_pos_pending_checkouts').select('id, status, total_amount, transaction_id').eq('id', id).eq('provider_id', provider.id).single();
  if (!pending) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(pending);
}
