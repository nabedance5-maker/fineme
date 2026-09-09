// 予約・来店に関するお客様向け通知を、メールに加えてLINEでも送るための共通ヘルパー。
// 店舗の公式LINEに連携済みならそちらから、未連携ならFineme公式からのフォールバック
// （lib/line-channel.js の resolveLineTarget、フェーズ2で作った優先順位をそのまま使う）。
// でお指示2026-09-09：「予約や来店に関してメールで通知してるやつ全部店舗の公式LINE
// からも流した方がいい」。email側の各通知呼び出しに並べて呼ぶ。
import { resolveLineTarget } from './line-channel';
import { sendLinePush } from './line-push';

/**
 * @param {object} db - getSupabase()のクライアント
 * @param {object} params
 * @param {string} params.userId      - お客様のauth.users.id（無ければ何もしない＝ゲスト予約は対象外）
 * @param {string} params.providerId  - reservations.provider_id（= providers.id）
 * @param {string} params.message     - LINEに送る本文
 * @param {Array}  [params.quickReplyItems] - [{label, data, displayText?}]。押すとpostbackで
 *   app/api/line/webhook/[providerId]/route.js に届く（代替提案の「承認する」ボタン等）。
 */
export async function notifyCustomerLine(db, { userId, providerId, message, quickReplyItems }) {
  if (!userId || !providerId || !message) return;
  try {
    const { data: profile } = await db.from('profiles').select('line_user_id').eq('id', userId).single();
    const target = await resolveLineTarget(db, { providerId, userId, fallbackLineUserId: profile?.line_user_id });
    if (target.lineUserId) await sendLinePush(target.lineUserId, message, target.token, quickReplyItems);
  } catch (e) { console.error('[notifyCustomerLine]', e); }
}
