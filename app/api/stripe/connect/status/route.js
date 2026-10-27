// GET /api/stripe/connect/status
// 掲載者のStripe Connectアカウントのステータスを返す
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function GET(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return Response.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: '認証エラー' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id, stripe_connect_id, stripe_connect_status')
    .eq('email', user.email)
    .single();

  if (!provider?.stripe_connect_id) {
    return Response.json({ connected: false, status: null, has_account: false });
  }

  try {
    const account = await stripe.accounts.retrieve(provider.stripe_connect_id);
    // カード決済を受けられれば有効にする。入金先口座の確認（payouts_enabled）は後から終わることが多く、
    // それを待つと回数券・入会がいつまでも公開ページに出なかった（今野さんの店舗 2026-10-27）。入金はStripe側で保留される
    const connected = !!(account.details_submitted && account.charges_enabled);
    const status = connected ? 'active' : 'pending';

    // ステータスが変わっていれば更新
    if (status !== provider.stripe_connect_status) {
      await supabase
        .from('providers')
        .update({ stripe_connect_status: status })
        .eq('id', provider.id);
    }

    return Response.json({
      connected,
      status,
      has_account: true,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
    });
  } catch (err) {
    console.error('[connect/status]', err);
    return Response.json({ connected: false, status: 'error', error: err.message });
  }
}
