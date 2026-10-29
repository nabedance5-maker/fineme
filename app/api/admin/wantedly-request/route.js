// POST /api/admin/wantedly-request → Wantedlyストーリーの投稿依頼メールを送る（admin専用）
//   body: { title: string, body: string, images?: string, publish?: boolean }
//
// でお方針（2026-10-30）：WSLのClaude CodeからはChromeを操作できないため、ストーリーの本文を
// contact@fineme.me から でお本人のGmail宛てに送り、でおが使うメール監視AI（Meta「Muse」）に
// Wantedlyへ投稿させる。外部への公開につながるメールなので、宛先は固定（でお本人のみ）にし、
// 任意の宛先へは送れないようにする。件名の目印【Wantedly投稿依頼】で Muse 側が反応する。
export const dynamic = 'force-dynamic';
import { Resend } from 'resend';
import { SENDER } from '@/lib/sales-outreach';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const RECIPIENT = 'nabedance5@gmail.com';
const SUBJECT_TAG = '【Wantedly投稿依頼】';
const NEW_STORY_URL = 'https://www.wantedly.com/manage_posts/articles/new';
const MY_PAGE_URL = 'https://www.wantedly.com/id/hideo_watanabe_ao';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return Boolean(key && ADMIN_KEY && key === ADMIN_KEY);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY未設定' }, { status: 500 });

  const { title, body, images, publish } = await request.json().catch(() => ({}));
  if (!title || !body) return Response.json({ error: 'title・bodyは必須です' }, { status: 400 });

  const instruction = [
    'Museへの指示：',
    '下記の「タイトル」と「本文」で、Wantedlyのストーリーを作成してください。',
    `Wantedlyのストーリー投稿画面：${NEW_STORY_URL}`,
    `アカウント（マイページ）：${MY_PAGE_URL}`,
    publish
      ? '内容を入力したら、そのまま公開してください。'
      : '公開はせず、下書き保存までにしてください（確認後に公開します）。',
  ].join('\n');

  const text = [
    instruction,
    '',
    '――――――――――',
    '',
    'タイトル：',
    title,
    '',
    '本文：',
    body,
    ...(images ? ['', '――――――――――', '', '画像の案：', images] : []),
  ].join('\n');

  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: SENDER.from,
    to: RECIPIENT,
    replyTo: SENDER.email,
    subject: `${SUBJECT_TAG}${title}`,
    text,
  });
  if (error) return Response.json({ error: error.message || JSON.stringify(error) }, { status: 502 });
  return Response.json({ ok: true, id: data?.id || null, to: RECIPIENT });
}
