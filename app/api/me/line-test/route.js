// POST /api/me/line-test
// 自分のLINEにテスト通知を送る。連携できているかを本人がその場で確認するためのもの。
//
// LINE Login の連携（profiles.line_user_id）だけでは push は届かない。
// Messaging API は「公式アカウントを友だち追加しているユーザー」にしか送れないため。
// このエンドポイントはその切り分けを画面上で返す。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export const dynamic = 'force-dynamic';

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.line_user_id) {
    return Response.json({
      ok: false,
      reason: 'not-linked',
      message: 'まだLINE連携されていません。下の「LINEで連携する」から進めてください。',
    });
  }

  const text = [
    'お頭、通信の試験でさぁ📡',
    '',
    'この文が届いてりゃ、見張り番の準備は万端。',
    'そろそろの時期になったら、こうして報せまさぁ。',
    '',
    '▸ https://www.fineme.me/mypage/log',
  ].join('\n');

  const res = await sendLinePush(profile.line_user_id, text);

  if (res.ok) {
    return Response.json({ ok: true, message: 'LINEに送りました。届いているか確認してください。' });
  }

  if (res.status === 403) {
    return Response.json({
      ok: false,
      reason: 'not-friend',
      message: 'Fineme公式アカウントを友だち追加すると届くようになります。もう一度「LINEで連携する」から進めてください。',
    });
  }

  return Response.json({
    ok: false,
    reason: res.reason || 'unknown',
    message: '送信できませんでした。時間をおいて試してください。',
  });
}
