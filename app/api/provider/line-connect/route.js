// POST /api/provider/line-connect（Authorization: Bearer）→ { url }：ログイン中の契約者の店舗にLINE通知をつなぐ、LINEログインのURLを返す
// 2026-11-11 セキュリティ点検：以前は GET ?provider_id=xxx で、URLに書いた店舗IDへLINEを結びつけていた。
// 他の店舗のIDを書けば、その店舗の予約通知（お客様の個人情報を含む）を自分のLINEで受け取れたため、
// 店舗はログインの印から決め、state には署名を付ける。
import { authProvider } from '../consultant/_lib';
import { signState, lineAuthorizeUrl } from '@/lib/oauth-state';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'ログインしてください' }, { status: 401 });
  if (!process.env.LINE_LOGIN_CHANNEL_ID) return Response.json({ error: 'LINE連携の設定がありません' }, { status: 500 });
  const state = signState({ provider_id: provider.id });
  return Response.json({ url: lineAuthorizeUrl({ redirectUri: 'https://fineme.me/api/provider/line-callback', state }) });
}

// 古い画面からの GET ?provider_id= はもう受け付けない
export async function GET() {
  return Response.redirect('https://fineme.me/provider/dashboard?line_error=retry');
}
