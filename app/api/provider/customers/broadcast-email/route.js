// POST /api/provider/customers/broadcast-email → 絞り込んだ会員へのセグメント一斉メール配信
// hacomonoの「メンバータイプ毎の一斉メール配信」相当機能（でお要望2026-09-14）。
// 店舗ダッシュボードの顧客管理タブで絞り込んだ結果の user_id 一覧をそのまま受け取り、
// 実際に自店舗（provider_slug一致）に連携している会員だけに絞ってから送信する
// （店舗が任意のuser_idを渡して無関係なFineme会員にメールできないようにする安全策）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendProviderBroadcastEmail } from '@/lib/email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, slug').eq('email', user.email).single();
  return data || null;
}

// 一度に送りすぎて事故らないための上限（Fineme店舗規模を踏まえた保守的な値）
const MAX_RECIPIENTS = 500;

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { user_ids, subject, body_text } = body;
  if (!Array.isArray(user_ids) || !user_ids.length || !subject?.trim() || !body_text?.trim()) {
    return Response.json({ error: '宛先・件名・本文は必須です' }, { status: 400 });
  }
  if (user_ids.length > MAX_RECIPIENTS) {
    return Response.json({ error: `一度に送信できるのは${MAX_RECIPIENTS}件までです` }, { status: 400 });
  }

  // 渡されたuser_idのうち、実際にこの店舗にNew Me Logを連携している会員だけに絞る
  const { data: logs } = await supabase
    .from('user_service_logs')
    .select('user_id')
    .eq('provider_slug', provider.slug)
    .eq('active', true)
    .in('user_id', user_ids);
  const validUserIds = [...new Set((logs || []).map(l => l.user_id))];

  let sent = 0;
  let skipped = 0;
  for (const uid of validUserIds) {
    try {
      const { data: { user } = {} } = await supabase.auth.admin.getUserById(uid);
      const email = user?.email;
      // @line.fineme.me はLINEログインのみのアカウントに割り当てる内部用メールアドレスで、
      // 実在の受信先ではないため送信対象から除外する（既存の同種フィルタと同じ方針）。
      if (!email || email.endsWith('@line.fineme.me')) { skipped++; continue; }
      await sendProviderBroadcastEmail({ to: email, subject: subject.trim(), bodyText: body_text.trim(), providerName: provider.name });
      sent++;
    } catch (e) {
      console.error('[broadcast-email]', uid, e);
      skipped++;
    }
  }

  await supabase.from('provider_email_broadcasts').insert({
    provider_id: provider.id,
    subject: subject.trim(),
    body_text: body_text.trim(),
    recipient_count: sent,
    skipped_count: skipped,
  });

  return Response.json({ ok: true, sent, skipped, requested: user_ids.length });
}
