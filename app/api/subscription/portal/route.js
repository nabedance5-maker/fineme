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
  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me'; // 戻り先は自サイトに固定（2026-11-16）

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${origin}/mypage/subscription`,
  });

  return Response.json({ url: session.url });
}
