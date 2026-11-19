// 運営管理画面：店舗運営ガイド・営業パートナーガイドの記事の画像を上げる（2026-11-19 渡邉指示：画像は運営が設定する）。
// POST multipart（file）→ Supabase Storage の公開バケット articles/biz-guides/ に置き、公開URLを返す。
// 管理APIキー（x-admin-key）必須。ファイル名はサーバーで決める（送られた名前は使わない）。
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX = 3 * 1024 * 1024;

export async function POST(request) {
  const key = request.headers.get('x-admin-key');
  if (!key || !process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: '画像が選ばれていません' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: 'JPEG・PNG・WebP の画像だけ使えます' }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: '画像が大きすぎます（3MBまで）' }, { status: 400 });

  const path = `biz-guides/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${ext}`;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await db.storage.from('articles').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: '画像を保存できませんでした' }, { status: 500 });
  const { data } = db.storage.from('articles').getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
