// PATCH /api/provider/lockers/[id]/contracts/[contractId] → 解約（status:'cancelled'）
// 自動課金中（stripe_subscription_item_id有り）の契約を解約する時は、Stripe側の
// サブスク項目も削除する。ここを忘れると解約後も課金され続ける実害になるため必須。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { contractId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.status !== 'cancelled') return Response.json({ error: '不正な操作です' }, { status: 400 });

  const { data: existing } = await supabase
    .from('provider_locker_contracts')
    .select('id, stripe_subscription_item_id')
    .eq('id', contractId)
    .eq('provider_id', provider.id)
    .single();
  if (!existing) return Response.json({ error: '見つかりません' }, { status: 404 });

  if (existing.stripe_subscription_item_id) {
    const stripe = getStripe();
    if (stripe) {
      try {
        await stripe.subscriptionItems.del(existing.stripe_subscription_item_id);
      } catch (e) {
        console.error('[locker contract cancel billing]', e);
        return Response.json({ error: '課金の停止に失敗しました。Stripe側の状態を確認してください: ' + e.message }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase
    .from('provider_locker_contracts')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('provider_id', provider.id)
    .select()
    .single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}
