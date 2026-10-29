// GET    /api/me/saved-cards → お店のレジで使えるよう保存したカードの一覧（お店ごと）
// DELETE /api/me/saved-cards { provider_id } → そのお店に保存したカードを外す（2026-10-29）
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { findSavedCard, cardLabel, detachUnlessMembership } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function me(request) {
  const h = request.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const { data: { user } = {}, error } = await supabase.auth.getUser(h.replace('Bearer ', ''));
  return error ? null : user || null;
}

export async function GET(request) {
  const user = await me(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows } = await supabase.from('provider_customer_cards').select('provider_id, providers(name)').eq('user_id', user.id).order('updated_at', { ascending: false });
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  const cards = [];
  for (const r of rows || []) {
    const c = await findSavedCard(supabase, stripe, r.provider_id, user.id);
    if (c) cards.push({ provider_id: r.provider_id, store_name: r.providers?.name || 'お店', label: cardLabel(c), exp: `${c.expMonth}/${String(c.expYear).slice(-2)}` });
  }
  return Response.json({ cards });
}

export async function DELETE(request) {
  const user = await me(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { provider_id } = await request.json().catch(() => ({}));
  if (!provider_id) return Response.json({ error: 'お店を指定してください' }, { status: 400 });
  const { data: row } = await supabase.from('provider_customer_cards').delete().eq('user_id', user.id).eq('provider_id', provider_id).select('stripe_payment_method_id').maybeSingle();
  if (row && process.env.STRIPE_SECRET_KEY) await detachUnlessMembership(supabase, new Stripe(process.env.STRIPE_SECRET_KEY), row.stripe_payment_method_id);
  return Response.json({ ok: true });
}
