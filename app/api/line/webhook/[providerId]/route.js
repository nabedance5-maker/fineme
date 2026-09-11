// POST /api/line/webhook/[providerId] → LINEからのWebhook受信（予約確認クイックリプライ用・フェーズ3-E）
// providerId は 'fineme'（Fineme公式チャネル）または providers.id（店舗別チャネル）。
// URLに含めることで、どのチャネルシークレットで署名検証すべきかをURLから即断できるようにしている
// （1エンドポイントで複数チャネルを受けるとdestinationだけでは検証前にチャネルを特定できないため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendLineReply, sendLinePush } from '@/lib/line-push';
import { verifyLineSignature } from '@/lib/line-channel';
import { idealNextDate } from '@/lib/log-axes';
import { sendLineBookingRequestEmail, sendCancelledByUserEmail } from '@/lib/email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function resolveChannel(providerId) {
  if (providerId === 'fineme') {
    return { secret: process.env.LINE_CHANNEL_SECRET, token: process.env.LINE_CHANNEL_ACCESS_TOKEN };
  }
  const { data } = await supabase
    .from('provider_line_channels')
    .select('channel_secret, channel_access_token')
    .eq('provider_id', providerId)
    .single();
  return { secret: data?.channel_secret, token: data?.channel_access_token };
}

function isMissingVisitsTable(error) {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === 'PGRST200' || error.code === '42P01';
}

function fmtJa(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// タップした本人確認：LINEのuserIdはチャネルごとに別の値になるため
// （lib/line-channel.js冒頭コメント参照）、どのチャネルから届いたイベントかで
// 突き合わせ先を変える。Fineme公式チャネルなら profiles.line_user_id、
// 店舗別チャネルなら provider_customer_line_links.store_line_user_id と照合する
// （2026-09-09・店舗チャネルへのボタン追加に合わせて channel-aware 化）。
async function verifyLineIdentity(channelProviderId, userId, lineUserId) {
  if (!lineUserId || !userId) return false;
  if (channelProviderId === 'fineme') {
    const { data: profile } = await supabase.from('profiles').select('line_user_id').eq('id', userId).single();
    return !!profile?.line_user_id && profile.line_user_id === lineUserId;
  }
  const { data: link } = await supabase
    .from('provider_customer_line_links')
    .select('store_line_user_id')
    .eq('provider_id', channelProviderId)
    .eq('user_id', userId)
    .single();
  return !!link?.store_line_user_id && link.store_line_user_id === lineUserId;
}

// New Me Log のリマインドに付けたクイックリプライ「〇〇 行った」から呼ばれる。
// LINEのWebhookにはSupabaseのJWTが無いため、タップした本人（event.source.userId）を
// verifyLineIdentity で突き合わせて本人確認する（予約確認Webhookのconfirm/rescheduleは
// UUIDの推測不可能性だけに頼っているが、こちらは書き込み系のうえ安価に照合できるので
// 一段強くしてある）。
// visitedDateStr: datetimepicker（「日付を選ぶ」）から来た YYYY-MM-DD。
// 省略時・不正値・未来日は今日にフォールバックする（アプリ側の
// /api/me/service-logs/[id]/visits と同じ「未来日は記録しない」方針に揃える）。
async function recordLineVisit(logId, channelProviderId, lineUserId, visitedDateStr) {
  if (!lineUserId) return '本人確認ができませんでした。';

  const { data: log, error: findError } = await supabase
    .from('user_service_logs')
    .select('id, user_id, name, axis, custom_icon, frequency_weeks, frequency_months, last_visit')
    .eq('id', logId)
    .single();
  if (findError || !log) return 'この記録が見つかりませんでした。';

  if (!(await verifyLineIdentity(channelProviderId, log.user_id, lineUserId))) {
    console.warn('[line/webhook] log_visit: identity mismatch', { logId, channelProviderId });
    return '本人確認ができませんでした。';
  }

  const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const visitDate = (visitedDateStr && /^\d{4}-\d{2}-\d{2}$/.test(visitedDateStr) && visitedDateStr <= todayStr)
    ? visitedDateStr
    : todayStr;

  const { error: insertError } = await supabase
    .from('user_service_log_visits')
    .insert({ log_id: logId, user_id: log.user_id, visited_at: visitDate, cost: null });
  if (insertError && !isMissingVisitsTable(insertError)) {
    console.error('[line/webhook] log_visit insert error', insertError);
  }

  const { error: updateError } = await supabase
    .from('user_service_logs')
    .update({ last_visit: visitDate, next_visit: null, updated_at: new Date().toISOString() })
    .eq('id', logId)
    .eq('user_id', log.user_id);
  if (updateError) {
    console.error('[line/webhook] log_visit update error', updateError);
    return '記録に失敗しました。New Me Logから直接登録してください。';
  }

  const next = idealNextDate({ ...log, last_visit: visitDate });
  return `✓ ${fmtJa(visitDate)}の記録をつけました${next ? ` — 次の目安は ${fmtJa(next)}` : ''}`;
}

// New Me Log のリマインドに付けた「予約をリクエスト」から呼ばれる（でお要望2026-09-09）。
// 初版はpostbackボタン1つで日時を聞かずに送る設計だったが、でお指摘「日時をその場で
// 希望を送れないと使えない」を受け、datetimepicker（mode:'datetime'）に変更して
// 希望日時を一緒に取れるようにした。preferredDateTime は "YYYY-MM-DDTHH:mm" 形式
// （LINEの仕様）。取れなかった場合のみ、従来通り日時未定として送る。
async function createLineBookingRequest(logId, channelProviderId, lineUserId, preferredDateTime) {
  if (!lineUserId) return '本人確認ができませんでした。';

  const { data: log, error: findError } = await supabase
    .from('user_service_logs')
    .select('id, user_id, name, provider_slug')
    .eq('id', logId)
    .single();
  if (findError || !log) return 'この記録が見つかりませんでした。';
  if (!log.provider_slug) return 'この記録には連携店舗がありません。';

  if (!(await verifyLineIdentity(channelProviderId, log.user_id, lineUserId))) {
    console.warn('[line/webhook] book_request: identity mismatch', { logId, channelProviderId });
    return '本人確認ができませんでした。';
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, name, email, line_user_id')
    .eq('slug', log.provider_slug)
    .single();
  if (!provider) return '店舗情報が見つかりませんでした。';

  // 同じ記録から24時間以内に既にリクエスト済み（かつ未返答）なら二重送信しない。
  // status: 'pending' に限定——返答待ちの連打だけ防ぎたく、承認・来店確認まで
  // 済んだ古いリクエストが半永久的にブロックし続けるのは意図しない挙動だった
  // （でお報告2026-09-09）。
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', log.user_id)
    .eq('provider_id', provider.id)
    .eq('origin', 'line_log')
    .eq('status', 'pending')
    .gte('created_at', since)
    .limit(1);
  if (recent?.length) return `${provider.name}への予約リクエストが返答待ちです。店舗からのご連絡をお待ちください。`;

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', log.user_id).single();
  const userName = profile?.display_name || 'Fineme会員（LINEより）';

  const m = preferredDateTime && /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(preferredDateTime);
  const preferredDate = m ? m[1] : null;
  const preferredTime = m ? m[2] : null;
  const whenText = preferredDate ? `${preferredDate} ${preferredTime}（確定ではありません）` : 'LINEでご相談ください';
  const note = `New Me LogのLINEから予約をリクエストしました（${log.name}）。希望日時: ${whenText}`;

  const { error: insertError } = await supabase
    .from('reservations')
    .insert({
      provider_id: provider.id,
      user_id: log.user_id,
      user_name: userName,
      user_contact: 'LINEからの予約リクエスト（トーク画面でご連絡ください）',
      note,
      status: 'pending',
      origin: 'line_log',
      reserved_date: preferredDate,
      start_time: preferredTime,
    });
  if (insertError) {
    console.error('[line/webhook] book_request insert error', insertError);
    return 'リクエストの送信に失敗しました。New Me Logから直接お問い合わせください。';
  }

  try {
    await sendLineBookingRequestEmail({
      providerEmail: provider.email, providerName: provider.name, userName, note,
      preferredDate, preferredTime,
    });
  } catch (e) { console.error('[line/webhook] book_request email', e); }

  if (provider.line_user_id) {
    try {
      await sendLinePush(provider.line_user_id, `【Fineme】New Me Logから予約リクエストが届きました\nお客様: ${userName}\n${log.name}\n希望日時: ${whenText}\n管理画面からもご確認いただけます。`);
    } catch (e) { console.error('[line/webhook] book_request provider push', e); }
  }

  return `✓ ${provider.name}へ予約をリクエストしました（希望日時: ${whenText}）。店舗からのご連絡をお待ちください。`;
}

// 代替日時の提案（counter_proposed）の通知に付けた「この日時で承認する」から呼ばれる
// （でお報告2026-09-09：代替案の通知が文字だけで、そこからの操作ができなかった）。
// app/my-reservations/page.js の「この日時で承認する」ボタンと同じ効果
// （status→'approved'、confirmed_date/timeにcounter_date/timeを反映）を、
// Supabaseの認証トークンを持たないLINEのトーク画面から起こすため、
// ここではservice-role権限で直接更新する（本人確認はverifyLineIdentityで行う）。
async function acceptCounterProposal(rid, channelProviderId, lineUserId) {
  if (!lineUserId) return '本人確認ができませんでした。';
  const { data: r, error } = await supabase.from('reservations').select('*').eq('id', rid).single();
  if (error || !r) return 'この予約が見つかりませんでした。';
  if (r.status !== 'counter_proposed') return 'この提案は既に対応済みです。';

  if (!(await verifyLineIdentity(channelProviderId, r.user_id, lineUserId))) {
    console.warn('[line/webhook] accept_counter: identity mismatch', { rid, channelProviderId });
    return '本人確認ができませんでした。';
  }

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ status: 'approved', confirmed_date: r.counter_date, confirmed_time: r.counter_time, counter_expires_at: null })
    .eq('id', rid);
  if (updateError) {
    console.error('[line/webhook] accept_counter update error', updateError);
    return '承認に失敗しました。マイページから直接お試しください。';
  }
  return `✓ ${fmtJa(r.counter_date)} ${r.counter_time || ''}で承認しました。当日お待ちしております。`;
}

// 同じ通知の「キャンセルする」から呼ばれる。掲載者への通知（メール・LINE）は
// PATCH /api/reservations/[id] のcancelled分岐と同じ内容をここでも行う
// （LINE発の操作はそちらを経由しないため、通知が漏れないよう複製している）。
async function cancelReservationFromLine(rid, channelProviderId, lineUserId) {
  if (!lineUserId) return '本人確認ができませんでした。';
  const { data: r, error } = await supabase.from('reservations').select('*').eq('id', rid).single();
  if (error || !r) return 'この予約が見つかりませんでした。';
  if (['cancelled', 'visited', 'rejected'].includes(r.status)) return 'この予約は既に対応済みです。';

  if (!(await verifyLineIdentity(channelProviderId, r.user_id, lineUserId))) {
    console.warn('[line/webhook] cancel_reservation: identity mismatch', { rid, channelProviderId });
    return '本人確認ができませんでした。';
  }

  const { error: updateError } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', rid);
  if (updateError) {
    console.error('[line/webhook] cancel_reservation update error', updateError);
    return 'キャンセルに失敗しました。マイページから直接お試しください。';
  }

  const { data: provider } = await supabase.from('providers').select('name, email, line_user_id').eq('id', r.provider_id).single();
  try {
    await sendCancelledByUserEmail({ reservation: r, providerEmail: provider?.email, providerName: provider?.name });
  } catch (e) { console.error('[line/webhook] cancel_reservation email', e); }
  if (provider?.line_user_id) {
    try {
      await sendLinePush(provider.line_user_id, `【Fineme】${r.user_name}様が予約をキャンセルしました。\n元の希望日: ${r.reserved_date || ''} ${r.start_time || ''}`);
    } catch (e) { console.error('[line/webhook] cancel_reservation provider push', e); }
  }
  return '予約をキャンセルしました。';
}

// 出欠確認の「参加する」「不参加」から呼ばれる（hacomono/STORES網羅計画 Phase 5）。
// accept_counter/cancel_reservationと全く同じパターン：UUIDの推測不可能性＋
// verifyLineIdentityでの本人確認。
async function respondToEvent(attendanceId, status, channelProviderId, lineUserId) {
  if (!lineUserId) return '本人確認ができませんでした。';
  const { data: att, error } = await supabase.from('provider_event_attendances').select('*').eq('id', attendanceId).single();
  if (error || !att) return 'このご案内が見つかりませんでした。';
  if (att.status !== 'invited') return '既にご回答いただいています。';

  if (!(await verifyLineIdentity(channelProviderId, att.user_id, lineUserId))) {
    console.warn('[line/webhook] respond_event: identity mismatch', { attendanceId, channelProviderId });
    return '本人確認ができませんでした。';
  }

  const { error: updateError } = await supabase
    .from('provider_event_attendances')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', attendanceId);
  if (updateError) {
    console.error('[line/webhook] respond_event update error', updateError);
    return '回答の記録に失敗しました。恐れ入りますが店舗まで直接ご連絡ください。';
  }
  return status === 'attending' ? '✓ 参加でご回答いただきました。ありがとうございます！' : '✓ 不参加でご回答いただきました。かしこまりました。';
}

export async function POST(request, { params }) {
  const { providerId } = params;
  const { secret, token } = await resolveChannel(providerId);
  if (!secret || !token) return Response.json({ error: 'channel not configured' }, { status: 404 });

  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');
  if (!verifyLineSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let body;
  try { body = JSON.parse(rawBody); } catch { return Response.json({ ok: true }); }

  for (const event of body.events || []) {
    if (event.type !== 'postback') continue;
    const data = new URLSearchParams(event.postback?.data || '');
    const action = data.get('action');
    if (!action) continue;

    if (action === 'confirm' || action === 'reschedule') {
      const rid = data.get('rid');
      if (!rid) continue;
      if (action === 'confirm') {
        await supabase.from('reservations').update({ confirmed_by_customer: true }).eq('id', rid);
        if (event.replyToken) await sendLineReply(event.replyToken, 'ご確認ありがとうございます。当日お待ちしております。', token);
      } else {
        if (event.replyToken) await sendLineReply(event.replyToken, 'かしこまりました。恐れ入りますが、変更・キャンセルは店舗まで直接ご連絡をお願いいたします。', token);
      }
    } else if (action === 'log_visit') {
      const lid = data.get('lid');
      if (!lid) continue;
      const message = await recordLineVisit(lid, providerId, event.source?.userId);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'log_visit_pick') {
      const lid = data.get('lid');
      if (!lid) continue;
      const pickedDate = event.postback?.params?.date;
      const message = await recordLineVisit(lid, providerId, event.source?.userId, pickedDate);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'book_request') {
      const lid = data.get('lid');
      if (!lid) continue;
      const preferredDateTime = event.postback?.params?.datetime;
      const message = await createLineBookingRequest(lid, providerId, event.source?.userId, preferredDateTime);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'accept_counter') {
      const rid = data.get('rid');
      if (!rid) continue;
      const message = await acceptCounterProposal(rid, providerId, event.source?.userId);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'cancel_reservation') {
      const rid = data.get('rid');
      if (!rid) continue;
      const message = await cancelReservationFromLine(rid, providerId, event.source?.userId);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'attend_event' || action === 'decline_event') {
      const aid = data.get('aid');
      if (!aid) continue;
      const message = await respondToEvent(aid, action === 'attend_event' ? 'attending' : 'declined', providerId, event.source?.userId);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    }
  }

  return Response.json({ ok: true });
}
