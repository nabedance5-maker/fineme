// POST /api/subscription/portal
// Stripe Customer Portal のセッションURLを返す（解約・支払い情報変更）
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No subscription found' }, { status: 404 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = request.headers.get('origin') || 'https://www.fineme.me';

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${origin}/mypage/subscription`,
  });

  return Response.json({ url: session.url });
}
