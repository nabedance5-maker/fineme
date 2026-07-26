// GET /api/me/line-callback?code=xxx&state=xxx
//
// ⚠️ 2026-07-26 以降、通常フローではここに来ない。
// このURLは LINE Developers の Callback URL に登録されておらず、
// マイページの「LINEで連携する」が Invalid redirect_uri で弾かれていた。
// 連携は登録済みの /api/auth/line-callback に合流させている（state.link_user_id で分岐）。
// このルートは、Callback URL に本URLを登録している環境のための後方互換として残す。
// LINE Login OAuth2.0 コールバック（ユーザー側 LINE アカウント連携）
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    return Response.redirect(`https://fineme.me/mypage/profile?line_error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !stateParam) {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=missing_params');
  }

  // state をデコードして user_id とタイムスタンプを検証（10分間有効）
  let userId;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    userId = decoded.user_id;
    const ts = decoded.ts;
    if (!userId || !ts) throw new Error('invalid state');
    if (Date.now() - ts > 10 * 60 * 1000) {
      return Response.redirect('https://fineme.me/mypage/profile?line_error=state_expired');
    }
  } catch {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=invalid_state');
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=server_config');
  }

  // code を LINE access token に交換
  let lineAccessToken;
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://fineme.me/api/me/line-callback',
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    if (!tokenRes.ok) throw new Error('token_error');
    const tokenData = await tokenRes.json();
    lineAccessToken = tokenData.access_token;
    if (!lineAccessToken) throw new Error('no_access_token');
  } catch {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=token_exchange_failed');
  }

  // LINE プロフィールから userId を取得
  let lineUserId;
  try {
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${lineAccessToken}` },
    });
    if (!profileRes.ok) throw new Error('profile_error');
    const profileData = await profileRes.json();
    lineUserId = profileData.userId;
    if (!lineUserId) throw new Error('no_line_user_id');
  } catch {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=profile_fetch_failed');
  }

  // Supabase profiles に line_user_id を保存
  const { error: upsertError } = await supabase
    .from('profiles')
    .update({ line_user_id: lineUserId })
    .eq('id', userId);

  if (upsertError) {
    console.error('[line-callback] supabase update error:', upsertError);
    return Response.redirect('https://fineme.me/mypage/profile?line_error=db_update_failed');
  }

  return Response.redirect('https://fineme.me/mypage/profile?line_connected=1');
}
