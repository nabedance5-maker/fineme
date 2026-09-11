// 来店確定を受けて、紐づくNew Me Logの来店日・次回目安を更新する共通ロジック。
// もともと予約の来店確認（app/api/reservations/[id]/route.js）専用だったものを、
// チェックイン機能（hacomono/STORES網羅計画 Phase 4）からも再利用するために切り出した。
// これが無いと、予約経由以外の来店（チェックインQR等）ではLogの次回予定が
// 古いまま延々通知され続けてしまう（でお報告2026-09-09の再発防止）。

/**
 * @param {object} db - getSupabase()のクライアント（service role）
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.providerSlug
 * @param {string} [params.visitDate] - YYYY-MM-DD。省略時は今日
 * @param {number|null} [params.cost]
 */
export async function syncVisitToLog(db, { userId, providerSlug, visitDate, cost = null }) {
  if (!userId || !providerSlug) return;
  const date = visitDate || new Date().toISOString().slice(0, 10);
  try {
    const { data: logs } = await db
      .from('user_service_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('provider_slug', providerSlug)
      .eq('active', true)
      .limit(1);
    const log = logs?.[0];
    if (!log) return;
    await db
      .from('user_service_logs')
      .update({ last_visit: date, next_visit: null, updated_at: new Date().toISOString() })
      .eq('id', log.id);
    await db
      .from('user_service_log_visits')
      .insert({ log_id: log.id, user_id: userId, visited_at: date, cost });
  } catch (e) {
    console.error('[syncVisitToLog]', e);
  }
}
