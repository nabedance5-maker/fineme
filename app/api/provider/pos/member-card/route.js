// GET /api/provider/pos/member-card?code=（会員証のQRの中身）| ?user_id= → POSでお客様を呼び出す。
// このお店に登録済みのカードがあれば、カードの種類と下4桁（会計の画面に出す）も返す。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { isStoreCustomer } from '@/lib/customer-accounts';
import { findMemberCard, cardLabel } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const providerId = a.provider.id;
  const sp = new URL(request.url).searchParams;
  const code = (sp.get('code') || '').trim();
  let userId = sp.get('user_id') || null;
  if (code) {
    const { data: p } = await supabase.from('profiles').select('id').eq('checkin_code', code).maybeSingle();
    if (!p) return Response.json({ error: 'この会員証のお客様が見つかりません' }, { status: 404 });
    userId = p.id;
  }
  if (!userId) return Response.json({ error: 'お客様を指定してください' }, { status: 400 });
  // 他のお店のお客様を、会員証だけで勝手に呼び出せないように
  if (!(await isStoreCustomer(providerId, userId))) return Response.json({ error: 'このお店のお客様ではありません（会員登録・ご予約・入会のどれかが必要です）' }, { status: 404 });

  const [{ data: cp }, { data: prof }] = await Promise.all([
    supabase.from('provider_customer_profiles').select('last_name, first_name').eq('provider_id', providerId).eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('display_name, last_name, first_name').eq('id', userId).maybeSingle(),
  ]);
  const name = [cp?.last_name, cp?.first_name].filter(Boolean).join(' ') || [prof?.last_name, prof?.first_name].filter(Boolean).join(' ') || prof?.display_name || 'お客様';
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  const card = await findMemberCard(supabase, stripe, providerId, userId);
  return Response.json({ user_id: userId, name, card: card ? { label: cardLabel(card), exp: `${card.expMonth}/${String(card.expYear).slice(-2)}` } : null });
}
