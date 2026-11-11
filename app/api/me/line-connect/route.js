// POST /api/me/line-connect（Authorization: Bearer）→ { url }：ログイン中の本人のLINE連携用の、LINEログインのURLを返す
// 2026-11-11 セキュリティ点検：以前は GET ?user_id=xxx で、URLに書いたユーザーIDへLINEを結びつけていた。
// 他人のIDを書けば他人のアカウントに自分のLINEを結びつけられたため、本人はログインの印から決め、state には署名を付ける。
import { getSupabase } from '@/lib/supabase';
import { signState, lineAuthorizeUrl } from '@/lib/oauth-state';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const bearer = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!bearer) return Response.json({ error: 'ログインしてください' }, { status: 401 });
  const { data: { user } = {} } = await getSupabase().auth.getUser(bearer);
  if (!user) return Response.json({ error: 'ログインしてください' }, { status: 401 });
  if (!process.env.LINE_LOGIN_CHANNEL_ID) return Response.json({ error: 'LINE連携の設定がありません' }, { status: 500 });

  // link_user_id があると /api/auth/line-callback が「連携モード」で処理する（登録済みのCallback URLに相乗り）
  const state = signState({ link_user_id: user.id });
  // bot_prompt：push は公式アカウントの友だちにしか届かないため、同意画面で友だち追加も促す
  return Response.json({ url: lineAuthorizeUrl({ redirectUri: 'https://fineme.me/api/auth/line-callback', state, botPrompt: true }) });
}

// 古い画面・ブックマークからの GET ?user_id= はもう受け付けない（マイページから押し直してもらう）
export async function GET() {
  return Response.redirect('https://fineme.me/mypage/profile?line_error=retry');
}
