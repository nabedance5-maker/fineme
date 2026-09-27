// POST /api/provider/pos/checkout → 会計確定（現金・手動記録の支払い方法用）。
// 明細検証・在庫引き当て・売上集計への反映はlib/pos-checkout.jsの共通処理を使う
// （オンライン決済確定=Stripe Webhookからも同じ処理を再利用するため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { recordPosTransaction } from '@/lib/pos-checkout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { items, staff_id, payment_method, memo } = await request.json().catch(() => ({}));

  try {
    const result = await recordPosTransaction(supabase, {
      providerId: provider.id,
      items,
      staffId: staff_id,
      paymentMethod: payment_method,
      memo,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
