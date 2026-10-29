// GET /api/me/pending-payments → お店から届いている、まだ払っていないお支払い（マイページの上に出す。2026-10-29）
// ・ロッカー代（カード未登録で、支払いリンクが発行されたもの）
// ・お店からの請求（provider_invoices の未払い）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { awaitingPayment, lockerPayUrl } from '@/lib/locker-pay';
import { payUrl } from '@/lib/invoices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } = {} } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: lockers }, { data: invoices }] = await Promise.all([
    supabase.from('provider_locker_contracts').select('id, provider_id, locker_id, status, monthly_fee, payment_link_url, stripe_subscription_id, stripe_subscription_item_id').eq('user_id', user.id).eq('status', 'active').not('payment_link_url', 'is', null),
    supabase.from('provider_invoices').select('id, provider_id, title, amount, due_date').eq('user_id', user.id).eq('status', 'unpaid').order('created_at', { ascending: false }).limit(20),
  ]);
  const lk = (lockers || []).filter(awaitingPayment);
  const pids = [...new Set([...lk, ...(invoices || [])].map(r => r.provider_id))];
  if (!pids.length) return Response.json({ items: [] });
  const [{ data: provs }, { data: lockerRows }] = await Promise.all([
    supabase.from('providers').select('id, name').in('id', pids),
    lk.length ? supabase.from('provider_lockers').select('id, name').in('id', lk.map(c => c.locker_id)) : Promise.resolve({ data: [] }),
  ]);
  const pn = Object.fromEntries((provs || []).map(p => [p.id, p.name]));
  const ln = Object.fromEntries((lockerRows || []).map(l => [l.id, l.name]));
  const items = [
    ...lk.map(c => ({ kind: 'locker', id: c.id, store_name: pn[c.provider_id] || '', title: `ロッカー（${ln[c.locker_id] || ''}）の月額`, amount: c.monthly_fee, monthly: true, url: lockerPayUrl(c.id) })),
    ...(invoices || []).map(i => ({ kind: 'invoice', id: i.id, store_name: pn[i.provider_id] || '', title: i.title, amount: i.amount, due_date: i.due_date, url: payUrl(i.id) })),
  ];
  return Response.json({ items });
}
