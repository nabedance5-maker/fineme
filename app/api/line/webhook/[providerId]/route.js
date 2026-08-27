// POST /api/line/webhook/[providerId] → LINEからのWebhook受信（予約確認クイックリプライ用・フェーズ3-E）
// providerId は 'fineme'（Fineme公式チャネル）または providers.id（店舗別チャネル）。
// URLに含めることで、どのチャネルシークレットで署名検証すべきかをURLから即断できるようにしている
// （1エンドポイントで複数チャネルを受けるとdestinationだけでは検証前にチャネルを特定できないため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendLineReply } from '@/lib/line-push';
import { verifyLineSignature } from '@/lib/line-channel';
import { idealNextDate } from '@/lib/log-axes';

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

// New Me Log のリマインドに付けたクイックリプライ「〇〇 行った」から呼ばれる。
// LINEのWebhookにはSupabaseのJWTが無いため、profiles.line_user_id と
// タップした本人（event.source.userId）を突き合わせて本人確認する
// （予約確認Webhookのconfirm/rescheduleはUUIDの推測不可能性だけに頼っているが、
// こちらは書き込み系のうえ安価に照合できるので一段強くしてある）。
// visitedDateStr: datetimepicker（「日付を選ぶ」）から来た YYYY-MM-DD。
// 省略時・不正値・未来日は今日にフォールバックする（アプリ側の
// /api/me/service-logs/[id]/visits と同じ「未来日は記録しない」方針に揃える）。
async function recordLineVisit(logId, lineUserId, visitedDateStr) {
  if (!lineUserId) return '本人確認ができませんでした。';

  const { data: log, error: findError } = await supabase
    .from('user_service_logs')
    .select('id, user_id, name, axis, custom_icon, frequency_weeks, frequency_months, last_visit')
    .eq('id', logId)
    .single();
  if (findError || !log) return 'この記録が見つかりませんでした。';

  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', log.user_id)
    .single();
  if (!profile?.line_user_id || profile.line_user_id !== lineUserId) {
    console.warn('[line/webhook] log_visit: line_user_id mismatch', { logId });
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
      const message = await recordLineVisit(lid, event.source?.userId);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    } else if (action === 'log_visit_pick') {
      const lid = data.get('lid');
      if (!lid) continue;
      const pickedDate = event.postback?.params?.date;
      const message = await recordLineVisit(lid, event.source?.userId, pickedDate);
      if (event.replyToken) await sendLineReply(event.replyToken, message, token);
    }
  }

  return Response.json({ ok: true });
}
