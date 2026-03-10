// GET /api/provider/line-connect?provider_id=xxx
// LINE LoginのOAuth認可URLにリダイレクトする
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');

  if (!providerId) {
    return Response.redirect('/pages/provider/index.html?error=no_provider_id');
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return Response.json({ error: 'LINE_LOGIN_CHANNEL_ID が未設定です' }, { status: 500 });
  }

  const state = Buffer.from(JSON.stringify({ provider_id: providerId, ts: Date.now() })).toString('base64url');
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me'}/api/provider/line-callback`;

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', channelId);
  lineAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile');

  return Response.redirect(lineAuthUrl.toString());
}
