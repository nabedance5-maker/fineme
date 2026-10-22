// でお要望2026-09-27：「来店確認したら自動でチケット消費されるようにできる？」。
// 対象顧客が有効なパッケージを複数持っている場合、どれを消化すべきかコード側では
// 判断できないため自動化の対象外とし、従来通り手動（🎫ボタン）で選んでもらう。
// 誤操作の取り消しは既存の回数券タブ「取り消す」から可能（package_usages.undone_at
// によるソフト取消。自動消化・手動消化どちらも同じ仕組みで戻せる）。

/**
 * @param {object} db - getSupabase()のクライアント（service role）
 * @param {object} params
 * @param {string} params.providerId
 * @param {string|null} params.userId
 * @param {string} params.reservationId
 * @param {string|null} [params.preferredPackageId] - 予約時にお客様が選んだチケット
 *   （reservations.package_id）。指定があれば自動判定せずこれを優先消化する
 *   （でお要望2026-09-27：「予約時にどのチケットで行くか選択できれば」）。
 * @param {number} [params.ticketCost] - 1回の予約で使うチケットの枚数（メニューごと。2026-10-22）
 * @returns {Promise<{packageId: string, packageName: string, usageId: string} | null>}
 */
export async function autoConsumePackageForVisit(db, { providerId, userId, reservationId, preferredPackageId, ticketCost = 1 }) {
  if (!userId) return null;
  // チケットを紐づけた予約は、予約した時点で使ったことになっている（2026-10-22・DBのトリガー）。二重に使わない
  if (reservationId) {
    const { count } = await db.from('package_usages').select('id', { count: 'exact', head: true }).eq('reservation_id', reservationId).is('undone_at', null);
    if (count) return null;
  }

  const { data: packages } = await db
    .from('customer_packages')
    .select('id, package_name, package_type, total_sessions, expires_at')
    .eq('provider_id', providerId)
    .eq('user_id', userId);
  if (!packages?.length) return null;

  const ids = packages.map(p => p.id);
  const { data: usages } = await db
    .from('package_usages')
    .select('customer_package_id')
    .in('customer_package_id', ids)
    .is('undone_at', null);
  const usedCount = {};
  (usages || []).forEach(u => { usedCount[u.customer_package_id] = (usedCount[u.customer_package_id] || 0) + 1; });

  const now = new Date();
  const isEligible = p => {
    const expired = p.expires_at ? new Date(p.expires_at) < now : false;
    if (expired) return false;
    if (p.package_type === 'unlimited') return true;
    return (usedCount[p.id] || 0) + ticketCost <= p.total_sessions;
  };

  let target = null;
  if (preferredPackageId) {
    // 予約時に選んだチケットが対象。期限切れ・使い切り等で今は使えなくなっていたら
    // 静かに諦める（自動判定にはフォールバックしない——お客様が選んだのと違うチケットが
    // 勝手に消化されるのを避ける。店舗側が来店確認時に気づいて手動対応できる）。
    const preferred = packages.find(p => p.id === preferredPackageId);
    if (preferred && isEligible(preferred)) target = preferred;
    else return null;
  } else {
    const eligible = packages.filter(isEligible);
    // 0件（消化対象なし）・複数件（どれか自動判断できない）は何もしない
    if (eligible.length !== 1) return null;
    target = eligible[0];
  }

  // 使う枚数ぶん記録する（1枚＝1行。取り消しは同じ予約の行をまとめて戻す）
  const { data, error } = await db
    .from('package_usages')
    .insert(Array.from({ length: Math.max(1, ticketCost) }, () => ({ customer_package_id: target.id, reservation_id: reservationId || null })))
    .select();
  if (error) { console.error('[autoConsumePackageForVisit]', error); return null; }
  return { packageId: target.id, packageName: target.package_name, usageId: data[0]?.id };
}
