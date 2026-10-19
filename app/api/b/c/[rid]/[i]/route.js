// GET /api/b/c/[rid]/[i] → 配信の本文リンクを押した記録をして、本来のURLへ転送する（でお要望 2026-10-19：hacomono差分 #6）
// 転送先は配信の本文にあったURL（provider_broadcasts.links）だけ。任意のURLへは飛ばさない（オープンリダイレクト対策）。
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request, { params }) {
  const { rid, i } = await params;
  const home = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
  if (!UUID.test(rid)) return Response.redirect(home, 302);
  const db = getSupabase();
  const { data: r } = await db.from('provider_broadcast_recipients').select('id, broadcast_id, clicked_at, opened_at').eq('id', rid).maybeSingle();
  if (!r) return Response.redirect(home, 302);
  const { data: b } = await db.from('provider_broadcasts').select('links').eq('id', r.broadcast_id).maybeSingle();
  const url = (b?.links || [])[Number(i)];
  if (!r.clicked_at) {
    const now = new Date().toISOString();
    // リンクを押した＝読んだので、開封も記録する（画像を読み込まないメールソフト・LINE向け）
    await db.from('provider_broadcast_recipients').update({ clicked_at: now, ...(r.opened_at ? {} : { opened_at: now }) }).eq('id', rid);
  }
  return Response.redirect(typeof url === 'string' && /^https?:\/\//.test(url) ? url : home, 302);
}
