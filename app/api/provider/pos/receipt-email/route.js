// GET /api/provider/pos/receipt-email?user_id= | ?manual_id= → POSでお客様を選んだ時の、レシートのメールの宛先の初期値（2026-11-09）。
// お店で登録したメール（顧客の基本情報）を先に、無ければFinemeアカウントのメール。このお店のお客様だけ返す。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { defaultReceiptEmail } from '@/lib/pos-checkout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const userId = sp.get('user_id'), manualId = sp.get('manual_id');
  const customer = manualId ? { manual_id: manualId } : userId ? { user_id: userId } : null;
  if (!customer) return Response.json({ email: null });
  const email = await defaultReceiptEmail(supabase, a.provider.id, customer).catch(() => null);
  return Response.json({ email });
}
