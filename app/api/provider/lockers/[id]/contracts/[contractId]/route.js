// PATCH /api/provider/lockers/[id]/contracts/[contractId] → 解約（status:'cancelled'）
// 自動課金中（stripe_subscription_item_id有り）の契約を解約する時は、Stripe側の
// サブスク項目も削除する。支払いリンクから始まった月額（stripe_subscription_id）は月額ごと止める。
// ここを忘れると解約後も課金され続ける実害になるため必須。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { contractId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'locker_rental'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  if (body.status !== 'cancelled') return Response.json({ error: '不正な操作です' }, { status: 400 });

  const { data: existing } = await supabase
    .from('provider_locker_contracts')
    .select('id, stripe_subscription_item_id, stripe_subscription_id, stripe_checkout_session_id')
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

  // 支払いリンクから始まったロッカー代だけの月額は、月額そのものを止める。開いたままの決済ページも閉じる（2026-10-29）
  if (existing.stripe_subscription_id || existing.stripe_checkout_session_id) {
    const stripe = getStripe();
    if (stripe) {
      try {
        if (existing.stripe_subscription_id) {
          const sub = await stripe.subscriptions.retrieve(existing.stripe_subscription_id);
          if (sub.status !== 'canceled') await stripe.subscriptions.cancel(sub.id);
        }
        if (existing.stripe_checkout_session_id) {
          const cs = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
          if (cs.status === 'open') await stripe.checkout.sessions.expire(cs.id);
        }
      } catch (e) {
        console.error('[locker contract cancel subscription]', e);
        return Response.json({ error: '引き落としの停止に失敗しました。もう一度お試しください: ' + e.message }, { status: 500 });
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

export const PATCH = withAudit(__PATCH);
