// GET /api/b/o/[rid] → 配信メールの開封記録（1x1の透明画像）。でお要望 2026-10-19：hacomono差分 #6
// メールソフトが画像を読み込まない設定だと記録されないため、開封数は「少なくともこれだけ開いた」目安。
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request, { params }) {
  const { rid } = await params;
  if (UUID.test(rid)) {
    try { await getSupabase().from('provider_broadcast_recipients').update({ opened_at: new Date().toISOString() }).eq('id', rid).is('opened_at', null); } catch {}
  }
  return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, max-age=0' } });
}
