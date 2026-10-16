// POST /api/stripe/connect/dashboard
// 掲載者がStripeのExpressダッシュボード（残高・入金予定・振込先口座・個人情報の確認と変更）を開くための
// ワンタイムURLを返す。Stripeでの登録（details_submitted）が終わっている店舗のみ。
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'カード決済は現在利用できません' }, { status: 503 });

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: '認証エラー' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('stripe_connect_id')
    .eq('email', user.email)
    .single();
  if (!provider?.stripe_connect_id) {
    return Response.json({ error: 'カード決済の受け取り設定がまだです。先に設定を済ませてください。' }, { status: 400 });
  }

  try {
    const link = await stripe.accounts.createLoginLink(provider.stripe_connect_id);
    return Response.json({ url: link.url });
  } catch (err) {
    console.error('[connect/dashboard]', err);
    return Response.json({ error: 'Stripeでの登録が終わってから開けます。「Stripeで設定を再開する」から登録を完了してください。' }, { status: 400 });
  }
}
