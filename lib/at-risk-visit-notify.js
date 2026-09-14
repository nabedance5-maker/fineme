// 来店確定の瞬間、その会員が店舗の休眠しきい値を超えて久しぶりに来店した場合、
// 店舗の公式LINEへリアルタイムで通知する（でお要望2026-09-14：hacomonoのAI Manager
// 「入会初期や低利用の会員の来店をタブレットに通知し、スタッフへ接客を促す」相当機能）。
// 判定はシンプルに「店舗が設定した休眠しきい値（provider_dormant_settings.no_visit_days、
// 既定90日）を前回来店から超えていたか」のみ。lib/sync-visit.js のsyncVisitToLogで
// last_visitが更新される前に呼ぶ必要がある（更新後だと「久しぶり」判定ができなくなる）。
import { sendLinePush } from './line-push';

export async function notifyStoreIfAtRiskVisit(db, { userId, providerId, providerSlug, memberName }) {
  if (!userId || !providerId || !providerSlug) return;
  try {
    const { data: logs } = await db
      .from('user_service_logs')
      .select('last_visit, created_at')
      .eq('user_id', userId)
      .eq('provider_slug', providerSlug)
      .eq('active', true)
      .limit(1);
    const log = logs?.[0];
    if (!log) return;
    const base = log.last_visit || log.created_at;
    if (!base) return;
    const daysSince = Math.floor((Date.now() - new Date(base).getTime()) / 86400000);

    const { data: settings } = await db.from('provider_dormant_settings').select('no_visit_days').eq('provider_id', providerId).maybeSingle();
    const threshold = settings?.no_visit_days ?? 90;
    if (daysSince < threshold) return; // 通常の来店ペース内なら通知しない

    const { data: provider } = await db.from('providers').select('line_user_id').eq('id', providerId).single();
    if (!provider?.line_user_id) return;

    const msg = `【Fineme】久しぶりのご来店です\n${memberName || 'お客様'}様が来店されました（前回のご来店から約${daysSince}日ぶり）。\n声かけのチャンスです。`;
    await sendLinePush(provider.line_user_id, msg);
  } catch (e) {
    console.error('[notifyStoreIfAtRiskVisit]', e);
  }
}
