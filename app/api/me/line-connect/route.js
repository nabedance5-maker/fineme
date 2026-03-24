// GET /api/me/line-connect?user_id=xxx
// ユーザーのLINE Login認可URLにリダイレクトする
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return Response.redirect('https://fineme.me/mypage/profile?line_error=no_user_id');
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return Response.json({ error: 'LINE_LOGIN_CHANNEL_ID が未設定です' }, { status: 500 });
  }

  // state に user_id とタイムスタンプを埋め込む（10分間有効）
  const state = Buffer.from(JSON.stringify({ user_id: userId, ts: Date.now() })).toString('base64url');
  const callbackUrl = 'https://fineme.me/api/me/line-callback';

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', channelId);
  lineAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile');

  return Response.redirect(lineAuthUrl.toString());
}
