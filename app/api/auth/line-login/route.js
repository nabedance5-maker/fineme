// GET /api/auth/line-login?type=login|signup&next=/path
// LINE Login 認可URLへリダイレクト（ユーザー認証用）
// state には署名を付ける（lib/oauth-state.js。2026-11-11 セキュリティ点検）
import { signState, lineAuthorizeUrl } from '@/lib/oauth-state';

// 相対パスのみ許可（オープンリダイレクト防止）
function sanitizeNext(next) {
  if (!next || typeof next !== 'string') return '';
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'login'; // 'login' | 'signup'
  const next = sanitizeNext(searchParams.get('next') || '');

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return Response.json({ error: 'LINE_LOGIN_CHANNEL_ID が未設定です' }, { status: 500 });
  }

  // state に type・next を入れ、署名する（10分間有効）
  const state = signState({ type, next });
  const lineAuthUrl = lineAuthorizeUrl({ redirectUri: 'https://fineme.me/api/auth/line-callback', state });

  return Response.redirect(lineAuthUrl);
}
