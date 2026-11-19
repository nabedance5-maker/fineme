// 運営管理画面：店舗運営ガイド・営業パートナーガイドの記事の画像を上げる（2026-11-19 渡邉指示：画像は運営・Muse が設定する）。
// POST multipart（file）→ Supabase Storage の公開バケット articles/biz-guides/ に置き、公開URLを返す。
// 管理APIキー、または記事の画像だけを扱うキー（GUIDE_IMAGE_KEY・Muse 用）が必要。ファイル名はサーバーで決める。
import { guideRole } from '@/lib/biz-guide-role';
import { storeImage, IMAGE_TYPES, IMAGE_MAX } from '@/lib/biz-guide-image';

export async function POST(request) {
  if (!guideRole(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: '画像が選ばれていません' }, { status: 400 });
  if (!IMAGE_TYPES[file.type]) return Response.json({ error: 'JPEG・PNG・WebP の画像だけ使えます' }, { status: 400 });
  if (file.size > IMAGE_MAX) return Response.json({ error: '画像が大きすぎます（5MBまで）' }, { status: 400 });
  try {
    return Response.json({ url: await storeImage(Buffer.from(await file.arrayBuffer()), file.type) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
