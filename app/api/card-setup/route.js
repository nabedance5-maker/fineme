// GET /api/card-setup?t= → お店が送ったカード登録のURL（公開・お客様のスマホ用。2026-11-12）。
// 署名と期限（7日）を確かめ、その時点でStripeのカード登録ページを作って移動する。誰のどのお店のカードかは署名から決める。
// うまくいかない時は自サイトの案内ページへ（外部へは飛ばさない）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { verifyCardSetupLink, createCardSetupSession } from '@/lib/card-setup-link';
import { isStoreCustomer } from '@/lib/customer-accounts';

const back = (request, status) => Response.redirect(new URL(`/card-registered?status=${status}&kind=store`, request.url), 302);

export async function GET(request) {
  const v = verifyCardSetupLink(new URL(request.url).searchParams.get('t'));
  if (!v) return back(request, 'invalid');
  if (v.expired) return back(request, 'expired');
  if (!process.env.STRIPE_SECRET_KEY) return back(request, 'unavailable');
  const db = getSupabase();
  const { data: provider } = await db.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('id', v.providerId).maybeSingle();
  if (!provider?.stripe_connect_id || provider.stripe_connect_status !== 'active') return back(request, 'unavailable');
  if (!(await isStoreCustomer(provider.id, v.userId))) return back(request, 'invalid');
  try {
    const session = await createCardSetupSession(db, new Stripe(process.env.STRIPE_SECRET_KEY), provider, v.userId);
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error('[card-setup link]', e?.message);
    return back(request, 'unavailable');
  }
}
