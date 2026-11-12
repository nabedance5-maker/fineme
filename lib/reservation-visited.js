// 予約が「来店済み」になった後の処理（お店が来店確認を押した時と、時間が来て自動で来店済みにした時の共通。2026-11-12 切り出し）。
// 呼び出し元：app/api/reservations/[id]/route.js（お店の操作）、app/api/cron/auto-visited/route.js（自動）
// data は更新後の予約の行。previousStatus は更新前の状態（チケットの二重消化を防ぐ）。
// auto=true の時は、お客様へのお礼の連絡（メール・LINE）を送らない（実際は来ていなかった予約にお礼が届くのを避ける。
// 体験談・クチコミのお願いは visited_at を起点に後日の自動処理で届く）。
// 返り値：来店確認で自動で使ったチケット（無ければ null）
import { sendVisitConfirmedEmail, contactEmail } from './email.js';
import { sendLinePush } from './line-push.js';
import { notifyCustomerLine } from './reservation-notify.js';
import { syncVisitToLog } from './sync-visit.js';
import { notifyStoreIfAtRiskVisit } from './at-risk-visit-notify.js';
import { autoConsumePackageForVisit } from './consume-package.js';

export async function afterVisited(db, data, { previousStatus, providerName, auto = false } = {}) {
  const id = data.id;
  if (!auto && contactEmail(data.user_contact)) {
    try {
      await sendVisitConfirmedEmail({ reservation: data, userEmail: contactEmail(data.user_contact), userName: data.user_name, providerName });
    } catch (e) { console.error('[visit email]', e); }
  }
  if (!auto) {
    const pname = providerName || '店舗';
    // 体験談への導線ボタンを添える（でお要望2026-09-09）。3〜7日後にも
    // cron/story-reminderで別途リマインドが飛ぶが、来店直後の一番気持ちが
    // 動いているタイミングでも書ける入口を用意しておく。マイページ経由の
    // フォーム（/mypage/story-submit）は自分の予約履歴からメニュー・店舗が
    // 選べるため、店舗紐づけの無い公開フォーム（/story-submit）より適している。
    await notifyCustomerLine(db, {
      userId: data.user_id, providerId: data.provider_id,
      message: `【${pname}】ご来店ありがとうございました✓\nまたのお越しをお待ちしております。`,
      quickReplyItems: [
        { label: '体験談を書く', type: 'uri', uri: 'https://www.fineme.me/mypage/story-submit' },
      ],
    });
  }

  // 友達紹介プログラム（でお要望2026-09-14）：予約時にpendingで記録された紹介実績を、
  // 実際に来店した時点でcompletedに確定し、店舗へ「紹介経由のお客様が来店した」と通知する
  // （特典の実際の付与は店舗の運用に委ねる。来店前に特典だけ確定してしまう事故を防ぐ）。
  const { data: referral } = await db.from('provider_referrals').select('id, referrer_user_id').eq('reservation_id', id).eq('status', 'pending').maybeSingle();
  if (referral) {
    await db.from('provider_referrals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', referral.id);
    const { data: referralProvider } = await db.from('providers').select('line_user_id').eq('id', data.provider_id).single();
    if (referralProvider?.line_user_id) {
      try { await sendLinePush(referralProvider.line_user_id, `【Fineme】友達紹介経由のお客様（${data.user_name}様）が来店しました。特典の付与をお忘れなく。`); }
      catch (e) { console.error('[referral visited notify]', e); }
    }
  }

  // 来店確認：紐づくNew Me Logがあれば来店日を反映し、次回目安を再計算させる。
  // これまでreservationsの来店確認とuser_service_logsが完全に無関係で、
  // 予約通りに来店してもLogの次回予定が古いまま延々通知され続けていた
  // （でお報告2026-09-09：9/2の予定が9/9になっても「次回は9/2」のまま届いた）。
  if (data.user_id) {
    const { data: providerRow } = await db.from('providers').select('slug').eq('id', data.provider_id).single();
    if (providerRow?.slug) {
      // syncVisitToLogがlast_visitを更新する前に「久しぶりの来店か」を判定する必要がある
      await notifyStoreIfAtRiskVisit(db, { userId: data.user_id, providerId: data.provider_id, providerSlug: providerRow.slug, memberName: data.user_name });
      await syncVisitToLog(db, {
        userId: data.user_id,
        providerSlug: providerRow.slug,
        visitDate: data.confirmed_date || data.reserved_date,
        cost: data.price || null,
      });
    }
  }

  // 来店確認と同時にチケットを自動消化（でお要望2026-09-27：「来店確認したら
  // 自動でチケット消費されるようにできる？」）。同じ予約に対してPATCHが
  // 複数回飛んでも二重消化しないよう、visited以外→visitedへの遷移時だけに限る
  // （既にvisited済みの予約への再PATCH＝売上記録の追記等では発火しない）。
  if (previousStatus !== 'visited' && data.user_id) {
    return autoConsumePackageForVisit(db, {
      providerId: data.provider_id,
      userId: data.user_id,
      reservationId: id,
      preferredPackageId: data.package_id || null,
      ticketCost: data.ticket_cost || 1,
    });
  }
  return null;
}
