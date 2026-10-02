// GET /api/partner/[token] → 営業パートナー本人向け：自分の紹介実績・報酬サマリー
//
// でお要望（2026-10-02）：営業パートナー一人ひとりに発行する専用の管理画面
// （紹介リンク・紹介コード・これまでの実績・報酬額が見える）。
//
// 営業パートナーはFinemeの認証アカウントを持たない場合が多い（掲載していない
// 人も登録できる設計のため）。provider_staff.shift_access_token と同じ方針で、
// sales_partners.access_token（推測不可能なUUID）を本人確認の代わりに使う
// 認証不要の公開エンドポイントとする。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { getReferralSummary } from '@/lib/referral-summary';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { data: partner, error } = await supabase
    .from('sales_partners')
    .select('id, name, referral_code, status, provider_id, created_at')
    .eq('access_token', params.token)
    .maybeSingle();

  if (error || !partner) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  try {
    const { referrals, summary } = await getReferralSummary(supabase, {
      referrerReferralCode: partner.referral_code,
      referrerId: partner.id,
    });
    return Response.json({ partner, referrals, summary });
  } catch (e) {
    return Response.json({ error: e.message || '紹介一覧の取得に失敗しました' }, { status: 500 });
  }
}
