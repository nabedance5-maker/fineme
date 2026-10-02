import { getSupabase } from '@/lib/supabase';
import { getReferralSummary } from '@/lib/referral-summary';

/**
 * GET /api/billing/referrals?provider_id=xxx
 *
 * provider_id を指定した場合: その掲載者が「営業パートナーとして」紹介した一覧
 *   （掲載者ダッシュボード用。掲載者自身がsales_partnersに登録済みの場合のみ結果を返す。
 *   未登録の場合は not_registered:true を返すので、呼び出し側は登録導線を出す）
 * provider_id を省略した場合: 全営業パートナーの紹介関係（管理者向け）
 *
 * 紹介者の身元は sales_partners（掲載者から独立した営業パートナーの登録単位）。
 * providers.referred_by（紹介された側に入っている、紹介者のreferral_code）と
 * sales_partners.referral_code を突き合わせて紹介関係を取得する
 * （でお方針2026-10-02：「掲載者＝営業パートナー」の自動一体化を廃止・
 *  掲載者も希望すれば別途sales_partnersへ登録する方式に変更。報酬率・計算ロジックは不変）。
 * 計算ロジック本体は lib/referral-summary.js に集約（/api/partner/[token] と共有）。
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');

  const sb = getSupabase();

  let referrerReferralCode = null;
  let referrerId = null; // sales_partners.id（referral_rewards.referrer_idと対応）

  if (providerId) {
    const { data: partner, error: refErr } = await sb
      .from('sales_partners')
      .select('id, referral_code, status')
      .eq('provider_id', providerId)
      .eq('status', 'active')
      .maybeSingle();

    if (refErr) {
      return Response.json({ error: '紹介情報の取得に失敗しました' }, { status: 500 });
    }
    if (!partner) {
      // この掲載者はまだ営業パートナーとして登録していない
      return Response.json({ not_registered: true, referrals: [], summary: null });
    }
    referrerReferralCode = partner.referral_code;
    referrerId = partner.id;
  }

  try {
    const { referrals, summary } = await getReferralSummary(sb, { referrerReferralCode, referrerId });
    return Response.json({ referrals, summary });
  } catch (e) {
    return Response.json({ error: e.message || '紹介一覧の取得に失敗しました' }, { status: 500 });
  }
}
