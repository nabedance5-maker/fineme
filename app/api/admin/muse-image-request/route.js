// POST /api/admin/muse-image-request → 店舗向けの記事の画像設定を Muse に頼むメールを送る（admin専用）
//   body: { slugs?: string[] }  省略時は「非公開で、画像が未設定」の記事すべて
//
// 2026-11-19 渡邉指示：Claude Code が書いた店舗向けの記事は非公開で入れ、Muse（Meta AI）が運営管理画面で画像を付けて公開する。
// Muse は渡邉の Gmail を見て動くので、Wantedly の投稿依頼と同じく宛先は渡邉本人に固定し、件名の目印で反応させる。
// メールにキーは書かない（Muse は渡邉から受け取った「画像だけを扱うキー GUIDE_IMAGE_KEY」で管理画面に入る）。
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { SENDER } from '@/lib/sales-outreach';
import { shopIndustryOf } from '@/lib/biz-guide-visual';

const RECIPIENT = 'nabedance5@gmail.com';
const SUBJECT_TAG = '【Fineme画像設定依頼】';
const ADMIN_URL = 'https://www.fineme.me/admin/features?tab=shop';

export async function POST(request) {
  const key = request.headers.get('x-admin-key');
  if (!key || !process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY未設定' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s) => typeof s === 'string' && /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 30) : null;
  let q = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    .from('biz_guides').select('slug, audience, title, description, cover, status').order('created_at', { ascending: true });
  q = slugs?.length ? q.in('slug', slugs) : q.eq('status', 'draft');
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const list = (data || []).filter((a) => slugs?.length || !a.cover);
  if (!list.length) return Response.json({ ok: true, sent: false, count: 0 });

  const items = list.map((a, i) => [
    `${i + 1}. ${a.title}`,
    `   URLの末尾：${a.slug}`,
    `   業種：${a.audience === 'partner' ? '営業パートナー向け' : shopIndustryOf(a.slug).label}`,
    `   内容：${a.description}`,
  ].join('\n')).join('\n\n');

  const text = [
    'Museへの指示：',
    `Fineme の店舗向けの記事 ${list.length}本に画像を付けて、公開してください。`,
    '',
    '手順：',
    `1. 運営管理画面の特集管理「店舗向けの記事」を開く：${ADMIN_URL}`,
    '2. キーを聞かれたら、渡邉さんから受け取った「記事の画像用のキー」を入れる',
    '3. 下の記事を一覧から探し（「タイトルで探す」で探せます）、「直す」を押す',
    '4. 「画像」欄に画像を入れる（「端末から選ぶ」で画像を上げるか、画像のURLを貼る）',
    '5. 「公開」を「公開する」に変えて「保存する」を押す。「保存しました」と出れば完了',
    '',
    '画像の条件：',
    '・横長（16:9）。写真のような見た目',
    '・記事の業種の、施術中・店内・カウンセリング・事務作業などの場面',
    '・人の顔がはっきり分かる写真や、実在の人物・有名人に似せた画像は使わない',
    '・画像の中に文字・ロゴ・お店や会社の名前を入れない',
    '・記事どうしで同じ画像を使わない',
    '・JPEG・PNG・WebP、5MBまで',
    '',
    '本文やタイトルは直さないでください（このキーでは保存されません）。',
    '迷った記事は公開せず、そのままにしておいてください。',
    '',
    '――――――――――',
    '',
    items,
  ].join('\n');

  const { data: sent, error: mailError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: SENDER.from,
    to: RECIPIENT,
    replyTo: SENDER.email,
    subject: `${SUBJECT_TAG}店舗向けの記事 ${list.length}本の画像を付けて公開`,
    text,
  });
  if (mailError) return Response.json({ error: mailError.message || JSON.stringify(mailError) }, { status: 502 });
  return Response.json({ ok: true, sent: true, id: sent?.id || null, count: list.length, to: RECIPIENT });
}
