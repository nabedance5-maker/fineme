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
    .select('id, name, referral_code, status, provider_id, created_at, is_collaborator, collaborator_rate, excluded_provider_ids')
    .eq('access_token', params.token)
    .maybeSingle();

  if (error || !partner) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  try {
    const { referrals, summary } = await getReferralSummary(supabase, {
      referrerReferralCode: partner.referral_code,
      referrerId: partner.id,
    });
    // 協業者（経営陣格）のみ：報酬の月別内訳と、報酬の対象になっている掲載者の一覧。
    // 掲載者の連絡先・顧客情報は出さない（店名・プラン・何ヶ月目か・受領額・報酬額だけ）。
    let collaborator = null;
    if (partner.is_collaborator) {
      const { data: rewards } = await supabase
        .from('collaborator_rewards')
        .select('id, provider_id, reward_month, kind, basis_amount, rate, amount, status, paid_at, note, providers(name)')
        .eq('partner_id', partner.id)
        .order('reward_month', { ascending: false });

      const { data: payments } = await supabase
        .from('provider_payments')
        .select('provider_id, reward_month, amount_excl_tax, is_first_payment, refunded, providers(name, plan)')
        .eq('refunded', false)
        .order('reward_month', { ascending: true });

      const rewardRows = rewards || [];
      const byMonth = {};
      rewardRows.forEach(r => {
        const m = byMonth[r.reward_month] || (byMonth[r.reward_month] = { month: r.reward_month, override: 0, first_month: 0, total: 0, pending: 0, paid: 0 });
        if (r.status === 'void') return;
        m[r.kind] += r.amount;
        m.total += r.amount;
        m[r.status === 'paid' ? 'paid' : 'pending'] += r.amount;
      });

      const excludedIds = new Set([partner.provider_id, ...(partner.excluded_provider_ids || [])].filter(Boolean));
      const providersMap = {};
      (payments || []).forEach(p => {
        const e = providersMap[p.provider_id] || (providersMap[p.provider_id] = {
          provider_id: p.provider_id, name: p.providers?.name || '', plan: p.providers?.plan || null,
          months_paid: 0, last_month: null, last_amount: 0,
        });
        e.months_paid += 1;
        e.last_month = p.reward_month;
        e.last_amount = p.amount_excl_tax;
      });
      const rewardByProvider = {};
      rewardRows.forEach(r => {
        if (r.status === 'void') return;
        rewardByProvider[r.provider_id] = (rewardByProvider[r.provider_id] || 0) + r.amount;
      });
      const providerList = Object.values(providersMap)
        .filter(p => !excludedIds.has(p.provider_id))
        .map(p => ({ ...p, reward_total: rewardByProvider[p.provider_id] || 0 }));

      const live = rewardRows.filter(r => r.status !== 'void');
      collaborator = {
        rate: Number(partner.collaborator_rate),
        totals: {
          pending: live.filter(r => r.status === 'pending').reduce((a, r) => a + r.amount, 0),
          paid: live.filter(r => r.status === 'paid').reduce((a, r) => a + r.amount, 0),
        },
        months: Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)),
        rewards: rewardRows.map(r => ({ id: r.id, month: r.reward_month, provider_name: r.providers?.name || '', kind: r.kind, basis: r.basis_amount, rate: Number(r.rate), amount: r.amount, status: r.status, paid_at: r.paid_at, note: r.note })),
        providers: providerList,
      };
    }

    const { provider_id: _p, excluded_provider_ids: _e, ...partnerPublic } = partner;
    return Response.json({ partner: partnerPublic, referrals, summary, collaborator });
  } catch (e) {
    return Response.json({ error: e.message || '紹介一覧の取得に失敗しました' }, { status: 500 });
  }
}
