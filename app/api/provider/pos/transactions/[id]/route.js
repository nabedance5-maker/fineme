// POST /api/provider/pos/transactions/[id] {action: 'refund', reason} → 返品・会計の取り消し（でお要望 2026-10-19：hacomono差分 #12）
// 在庫を戻し、売上にマイナスの行を入れる。オンライン決済（カード）で払われた会計のお金はStripe側で返金が必要。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { refundPosTransaction } from '@/lib/pos-checkout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (b.action !== 'refund') return Response.json({ error: '操作の種類が正しくありません' }, { status: 400 });
  try {
    return Response.json(await refundPosTransaction(supabase, { providerId: a.provider.id, transactionId: id, reason: b.reason, operator: a.user.fineme_member?.name || 'オーナー' }));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
export const POST = withAudit(__POST);
