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
  // link_user_id があると /api/auth/line-callback が「連携モード」で処理する
  const state = Buffer.from(JSON.stringify({
    link_user_id: userId,
    user_id: userId, // 旧 /api/me/line-callback との互換のため残す
    ts: Date.now(),
  })).toString('base64url');

  // LINE Developers に登録済みの Callback URL を使う。
  // 専用URL（/api/me/line-callback）は未登録で Invalid redirect_uri になっていた。
  const callbackUrl = 'https://fineme.me/api/auth/line-callback';

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', channelId);
  lineAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile');
  // 同意画面で公式アカウントの友だち追加も促す。
  // Messaging API の push は「友だちになっているユーザー」にしか送れないため、
  // LINE Login で連携しただけでは通知が届かない（403 になる）。
  // ※ LINE Developers で Login チャネルに公式アカウントがリンクされている必要がある
  lineAuthUrl.searchParams.set('bot_prompt', 'aggressive');

  return Response.redirect(lineAuthUrl.toString());
}
