// POST /api/stripe/connect/onboard
// 掲載者のStripe Connectアカウントを作成し、オンボーディングURLを返す
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return Response.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: '認証エラー' }, { status: 401 });

  const { data: provider, error: provErr } = await supabase
    .from('providers')
    .select('id, email, name, stripe_connect_id')
    .eq('user_id', user.id)
    .single();

  if (provErr || !provider) return Response.json({ error: '掲載者情報が見つかりません' }, { status: 404 });

  try {
    let connectId = provider.stripe_connect_id;

    // Connectアカウントが未作成なら新規作成
    if (!connectId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'JP',
        email: provider.email,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        metadata: { fineme_provider_id: String(provider.id) },
      });
      connectId = account.id;

      // Supabaseに保存
      await supabase
        .from('providers')
        .update({ stripe_connect_id: connectId, stripe_connect_status: 'pending' })
        .eq('id', provider.id);
    }

    // オンボーディングリンクを生成
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me'}/provider/billing?connect=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me'}/provider/billing?connect=success`,
      type: 'account_onboarding',
    });

    return Response.json({ url: accountLink.url });
  } catch (err) {
    console.error('[connect/onboard]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
