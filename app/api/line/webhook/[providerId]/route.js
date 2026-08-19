// POST /api/line/webhook/[providerId] → LINEからのWebhook受信（予約確認クイックリプライ用・フェーズ3-E）
// providerId は 'fineme'（Fineme公式チャネル）または providers.id（店舗別チャネル）。
// URLに含めることで、どのチャネルシークレットで署名検証すべきかをURLから即断できるようにしている
// （1エンドポイントで複数チャネルを受けるとdestinationだけでは検証前にチャネルを特定できないため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendLineReply } from '@/lib/line-push';
import { verifyLineSignature } from '@/lib/line-channel';

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
    const rid = data.get('rid');
    if (!action || !rid) continue;

    if (action === 'confirm') {
      await supabase.from('reservations').update({ confirmed_by_customer: true }).eq('id', rid);
      if (event.replyToken) await sendLineReply(event.replyToken, 'ご確認ありがとうございます。当日お待ちしております。', token);
    } else if (action === 'reschedule') {
      if (event.replyToken) await sendLineReply(event.replyToken, 'かしこまりました。恐れ入りますが、変更・キャンセルは店舗まで直接ご連絡をお願いいたします。', token);
    }
  }

  return Response.json({ ok: true });
}
