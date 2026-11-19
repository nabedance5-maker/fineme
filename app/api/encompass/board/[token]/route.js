// GET /api/encompass/board/:token … ジムに置いたタブレット（ログインなし）。
// お店の「タブレットに出す」メニューだけを返す。お客様用のメニュー・お客様の名前・記録は返さない。
export const dynamic = 'force-dynamic';
import { db, fail, hashToken, isBoardToken, okJson } from '@/lib/encompass/server';

export async function GET(_request, { params }) {
  const { token } = await params;
  if (!isBoardToken(token)) return fail('このリンクは使えません', 404);
  const sb = db();
  const { data: board, error } = await sb.from('encompass_boards').select('provider_id').eq('token_hash', hashToken(token)).maybeSingle();
  if (error) return fail('ただいまつながりにくくなっています', 503);
  if (!board) return fail('このリンクは使えません。お店の方に新しいリンクを作ってもらってください', 404);
  const [{ data: contract }, { data: provider }] = await Promise.all([
    sb.from('encompass_stores').select('status').eq('provider_id', board.provider_id).maybeSingle(),
    sb.from('providers').select('name').eq('id', board.provider_id).maybeSingle(),
  ]);
  if (!contract || contract.status === 'paused') return fail('このリンクは使えません', 404);
  const { data: menus, error: e } = await sb.from('encompass_menus')
    .select('id, title, items')
    .eq('provider_id', board.provider_id).eq('on_board', true).is('customer_ref', null)
    .order('updated_at', { ascending: false }).limit(100);
  if (e) return fail('ただいまつながりにくくなっています', 503);
  return okJson({ store: { name: provider?.name || '' }, menus: menus || [] });
}
