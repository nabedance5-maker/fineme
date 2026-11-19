// 店舗運営ガイド・営業パートナーガイドの記事の画像（cover）を Supabase Storage の公開バケット articles/biz-guides/ に置く。
// 外部の画像URL（Muse が作った画像のURLなど・時間がたつと消えるものがある）は、保存時にこちらへ取り込んでから使う。
// サーバー専用。
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
export const IMAGE_MAX = 5 * 1024 * 1024;
const BUCKET = 'articles';

function storage() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).storage.from(BUCKET);
}

export async function storeImage(buffer, type) {
  const ext = IMAGE_TYPES[type];
  if (!ext) throw new Error('JPEG・PNG・WebP の画像だけ使えます');
  if (buffer.length > IMAGE_MAX) throw new Error('画像が大きすぎます（5MBまで）');
  const path = `biz-guides/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${ext}`;
  const { error } = await storage().upload(path, buffer, { contentType: type, upsert: false });
  if (error) throw new Error('画像を保存できませんでした');
  return storage().getPublicUrl(path).data.publicUrl;
}

// 取り込まずにそのまま使ってよいURL（自分のストレージと、元から使っている Unsplash）
function isOurs(u) {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return u.startsWith(base) || u.startsWith('https://images.unsplash.com/');
}

// 社内のアドレスや IP 直書きには取りに行かない（サーバーから任意の場所を読ませない）
function allowedRemote(u) {
  let url;
  try { url = new URL(u); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
  const h = url.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return false;
  if (/^\d+(\.\d+){3}$/.test(h) || h.includes(':') || h.startsWith('[')) return false;
  return true;
}

// cover として保存する URL を決める。空なら空、自分の所の画像ならそのまま、外部なら取り込んだ先の URL。
export async function settleCover(u) {
  if (!u) return '';
  if (isOurs(u)) return u;
  if (!allowedRemote(u)) throw new Error('この画像のURLは使えません（https の画像URLを入れてください）');
  const res = await fetch(u, { redirect: 'error', signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!res || !res.ok) throw new Error('画像のURLから画像を読めませんでした');
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!IMAGE_TYPES[type]) throw new Error('画像のURLが JPEG・PNG・WebP の画像ではありません');
  if (Number(res.headers.get('content-length') || 0) > IMAGE_MAX) throw new Error('画像が大きすぎます（5MBまで）');
  const buf = Buffer.from(await res.arrayBuffer());
  return storeImage(buf, type);
}
