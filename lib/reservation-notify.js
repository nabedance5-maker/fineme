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

// 友達紹介プログラム（でお要望2026-09-14）：予約時に紹介コードが付いていれば、
// 実際にその店舗の紹介コードかどうかを検証し、provider_referralsにpendingで記録した上で
// 紹介者本人にLINEで「紹介経由の予約が入った」ことを知らせる。自分自身のコードでの
// 自己紹介は無視する。既存の予約作成フロー（POST /api/reservations）から呼ぶ。
export async function attributeReferral(db, { providerId, referralCode, referredUserId, referredName, reservationId }) {
  if (!providerId || !referralCode) return;
  try {
    const { data: codeRow } = await db.from('provider_referral_codes').select('user_id').eq('provider_id', providerId).eq('code', referralCode).maybeSingle();
    if (!codeRow || codeRow.user_id === referredUserId) return; // コードが無い／自己紹介は無視
    await db.from('provider_referrals').insert({
      provider_id: providerId,
      referrer_user_id: codeRow.user_id,
      referred_user_id: referredUserId || null,
      referred_name: referredName || null,
      reservation_id: reservationId || null,
      status: 'pending',
    });
    await notifyCustomerLine(db, {
      userId: codeRow.user_id,
      providerId,
      message: `【Fineme】あなたの紹介リンクから予約が入りました！\nご来店が確定すると、お店の特典が受けられます（特典内容はお店にご確認ください）。`,
    });
  } catch (e) { console.error('[attributeReferral]', e); }
}
