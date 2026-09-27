// GET /api/deposit-pay/[id] → 予約デポジットの支払い状況（公開・お客様のスマホ用）
// でお要望2026-09-27（決済機能Phase6③）。認証不要。予約の詳細は返さず、状況と金額のみ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const { data: reservation } = await supabase.from('reservations').select('deposit_status, deposit_amount').eq('id', id).maybeSingle();
  if (!reservation) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json({ status: reservation.deposit_status, total_amount: reservation.deposit_amount });
}
