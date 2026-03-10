// GET /api/provider/line-callback
// LINE LoginのOAuthコールバック → user_id取得 → providersテーブルに保存
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // LINEがエラーを返した場合（ユーザーがキャンセルなど）
  if (errorParam) {
    return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_error=cancelled`);
  }

  if (!code || !state) {
    return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_error=invalid`);
  }

  // stateからprovider_idを取得
  let providerId;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    providerId = decoded.provider_id;
    // 10分以上前のstateは無効
    if (!providerId || Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new Error('expired');
    }
  } catch {
    return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_error=invalid_state`);
  }

  // LINE APIでアクセストークンを取得
  const callbackUrl = `${SITE_URL}/api/provider/line-callback`;
  let lineUserId;
  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: process.env.LINE_LOGIN_CHANNEL_ID || '',
        client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET || '',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('no access token');

    // プロフィールからuser_idを取得
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    lineUserId = profile.userId;
    if (!lineUserId) throw new Error('no userId');
  } catch (e) {
    console.error('[line-callback]', e);
    return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_error=api_failed`);
  }

  // Supabaseのproviderレコードを更新
  const { error } = await supabase
    .from('providers')
    .update({ line_user_id: lineUserId })
    .eq('id', providerId);

  if (error) {
    console.error('[line-callback] supabase error', error);
    return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_error=db_failed`);
  }

  // 成功 → ダッシュボードに戻る
  return Response.redirect(`${SITE_URL}/pages/provider/index.html?line_connected=1`);
}
