// GET /api/pos-pay/[id] → POSオンライン決済の状況（公開・お客様のスマホ用）
// でお要望2026-09-27。決済したお客様自身が結果を確認するための最小限の公開エンドポイント。
// 認証不要（Fineme未登録の来店客も対象のため）。店舗情報・明細等の詳細は返さない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const { data: pending } = await supabase.from('provider_pos_pending_checkouts').select('status, total_amount').eq('id', id).maybeSingle();
  if (!pending) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(pending);
}
