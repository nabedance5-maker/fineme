// POST /api/provider/memberships/[id]/approve → 入会申込を承認し、実際の課金を開始する
// 店舗が申込内容（個人情報・本人確認書類・緊急連絡先）を確認した上で押す、入会手続き
// フローの最終ステップ（でお要望2026-09-15：「店舗側で承認・完了処理を行う」）。
//
// 日割り設定（店舗ごとにON/OFF）はStripeのbilling_cycle_anchorで実現する：
// ・ONの場合：billing_cycle_anchorを入会希望日に設定（proration_behaviorは既定の
//   create_prorations）→ Stripeが「今日から入会希望日の前日まで」を自動で日割り課金し、
//   以降は入会希望日を基準に毎月満額課金される（Stripe公式ドキュメントで確認済みの挙動）。
// ・OFFの場合：billing_cycle_anchorを指定せず、承認した今日から満額で課金開始する
//   （日割りせず「初回決済日＝会員開始日」とするシンプルな運用）。
//
// 資金は店舗のStripe Connectアカウントへtransfer_data.destinationで送金する
// （紹介報酬送金と同じConnect基盤を流用。Financeの取り分は設定していない＝全額店舗）。
//
// ロッカーを選んだお客様（でお要望2026-09-18：「ロッカー代を自動で一緒に課金したい」）は、
// 同じサブスクリプションにロッカー代を2つ目の明細として追加する。ロッカーの金額は店舗が
// いつでも変更できるため、Priceは都度price_dataでその場生成し古いPriceを参照しない
// （Productだけprovider_lockers.stripe_product_idに使い回す）。
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
  const { data } = await supabase.from('providers').select('id, stripe_connect_id, stripe_connect_status').eq('email', user.email).single();
  return data || null;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: '入金先のStripe Connect設定が完了していません。「課金・プラン」タブから設定してください' }, { status: 409 });
  }

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (m.status !== 'pending_approval') return Response.json({ error: 'この申込は承認できる状態ではありません' }, { status: 409 });
  if (!m.stripe_customer_id || !m.stripe_payment_method_id) return Response.json({ error: 'お客様の支払い方法が未登録です' }, { status: 409 });

  const { data: plan } = await supabase.from('provider_membership_plans').select('stripe_price_id').eq('id', m.plan_id).single();
  if (!plan?.stripe_price_id) return Response.json({ error: 'プラン情報が見つかりません' }, { status: 409 });

  let locker = null;
  if (m.locker_id) {
    const { data: lockerRow } = await supabase.from('provider_lockers').select('id, name, monthly_fee, stripe_product_id').eq('id', m.locker_id).eq('provider_id', provider.id).single();
    if (!lockerRow) return Response.json({ error: '選択されたロッカーが見つかりません' }, { status: 409 });
    if (!lockerRow.monthly_fee) return Response.json({ error: '選択されたロッカーに金額が設定されていません。ロッカー管理タブで金額を設定してください' }, { status: 409 });
    locker = lockerRow;
  }

  const { data: settings } = await supabase.from('provider_membership_settings').select('prorate_first_month').eq('provider_id', provider.id).maybeSingle();
  const prorateOn = settings?.prorate_first_month ?? true;

  try {
    // 保存済みのカードを今後の請求の既定支払い方法にする
    await stripe.customers.update(m.stripe_customer_id, { invoice_settings: { default_payment_method: m.stripe_payment_method_id } });

    const items = [{ price: plan.stripe_price_id }];
    if (locker) {
      let productId = locker.stripe_product_id;
      if (!productId) {
        const product = await stripe.products.create({ name: `ロッカー：${locker.name}` });
        productId = product.id;
        await supabase.from('provider_lockers').update({ stripe_product_id: productId }).eq('id', locker.id);
      }
      items.push({
        price_data: { currency: 'jpy', product: productId, unit_amount: locker.monthly_fee, recurring: { interval: 'month' } },
      });
    }

    const subParams = {
      customer: m.stripe_customer_id,
      items,
      default_payment_method: m.stripe_payment_method_id,
      transfer_data: { destination: provider.stripe_connect_id },
      metadata: { fineme_membership_id: m.id, fineme_provider_id: provider.id, fineme_locker_id: locker?.id || '' },
    };
    if (prorateOn && m.enrollment_date) {
      const enrollTs = Math.floor(new Date(`${m.enrollment_date}T00:00:00+09:00`).getTime() / 1000);
      const minTs = Math.floor(Date.now() / 1000) + 60; // 過去日は切り上げ、Stripe側の「未来日必須」制約を満たす
      subParams.billing_cycle_anchor = Math.max(enrollTs, minTs);
    }

    const subscription = await stripe.subscriptions.create(subParams);

    const { data: updated, error } = await supabase
      .from('provider_memberships')
      .update({ status: 'active', stripe_subscription_id: subscription.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json(updated);
  } catch (e) {
    console.error('[memberships approve]', e);
    return Response.json({ error: 'Stripeでの課金開始に失敗しました: ' + e.message }, { status: 500 });
  }
}
