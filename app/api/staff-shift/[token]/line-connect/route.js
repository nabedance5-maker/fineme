// GET /api/staff-shift/[token]/line-connect → スタッフ本人のLINEをFineme公式LINEにつなぐ（LINEログインへ移動）
// シフト希望の提出通知などを店長・シフト作成者のLINEで受け取るため（でお要望2026-10-07）。
// state にはスタッフ専用リンクのトークン（推測不可能）を入れ、/api/auth/line-callback で保存する。
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { token } = await params;
  const { data: staff } = await getSupabase().from('provider_staff').select('id').eq('shift_access_token', token).maybeSingle();
  if (!staff) return Response.redirect(`https://fineme.me/staff-shift/${encodeURIComponent(token)}?line_error=invalid`);
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) return Response.json({ error: 'LINE_LOGIN_CHANNEL_ID が未設定です' }, { status: 500 });

  const state = Buffer.from(JSON.stringify({ link_staff_token: token, ts: Date.now() })).toString('base64url');
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', channelId);
  url.searchParams.set('redirect_uri', 'https://fineme.me/api/auth/line-callback');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile');
  // 通知（push）は公式アカウントの友だちにしか届かないため、友だち追加も促す
  url.searchParams.set('bot_prompt', 'aggressive');
  return Response.redirect(url.toString());
}
