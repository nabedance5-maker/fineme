// POST /api/provider/pos/checkout → 会計確定（現金・手動記録の支払い方法用）。
// 明細検証・在庫引き当て・売上集計への反映はlib/pos-checkout.jsの共通処理を使う
// （オンライン決済確定=Stripe Webhookからも同じ処理を再利用するため）。
// 2026-10-19：施術メニュー・手入力・割引・お客様・支払方法の設定・お預かりに対応（hacomono差分 #12）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { recordPosTransaction } from '@/lib/pos-checkout';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id, plan').eq('id', a.provider.id).single();
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }

  const { items, staff_id, payment_method, payment_key, memo, discount, customer, cash_received } = await request.json().catch(() => ({}));

  try {
    const result = await recordPosTransaction(supabase, {
      providerId: provider.id,
      items,
      staffId: staff_id,
      paymentMethod: payment_key ? null : payment_method,
      paymentKey: payment_key || null,
      memo,
      discount,
      customer,
      cashReceived: cash_received,
      operator: a.user.fineme_member?.name || 'オーナー',
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export const POST = withAudit(__POST);
