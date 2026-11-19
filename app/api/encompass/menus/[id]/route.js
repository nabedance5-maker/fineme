// GET    /api/encompass/menus/:id … 1件
// PATCH  /api/encompass/menus/:id … 直す（送った項目だけ）
// DELETE /api/encompass/menus/:id … 消す
// どれも、ログイン中のお店のメニューだけ（provider_id で必ず絞る）
export const dynamic = 'force-dynamic';
import { db, encompassAuth, fail, isUuid, okJson } from '@/lib/encompass/server';
import { menuRowFrom } from '@/lib/encompass/menu-input';

const COLS = 'id, title, items, on_board, customer_ref, updated_at';

async function load(a, id) {
  if (!isUuid(id)) return { res: fail('メニューが見つかりません', 404) };
  const { data, error } = await db().from('encompass_menus').select(COLS).eq('id', id).eq('provider_id', a.store.id).maybeSingle();
  if (error) return { res: fail('メニューを読み込めませんでした', 503) };
  if (!data || (data.customer_ref && !a.can.customers)) return { res: fail('メニューが見つかりません', 404) };
  return { menu: data };
}

export async function GET(request, { params }) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const { id } = await params;
  const r = await load(a, id);
  return r.res || okJson({ menu: r.menu });
}

export async function PATCH(request, { params }) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const { id } = await params;
  const r = await load(a, id);
  if (r.res) return r.res;
  const body = await request.json().catch(() => null);
  const { row, error, status } = await menuRowFrom(body, a, { partial: true });
  if (error) return fail(error, status || 400);
  if (r.menu.customer_ref && !('customer_ref' in row)) row.on_board = false;
  const { data, error: e } = await db().from('encompass_menus')
    .update({ ...row, updated_by: a.user.id, updated_at: new Date().toISOString() })
    .eq('id', id).eq('provider_id', a.store.id).select(COLS).single();
  if (e) return fail('保存できませんでした', 503);
  return okJson({ menu: data });
}

export async function DELETE(request, { params }) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const { id } = await params;
  const r = await load(a, id);
  if (r.res) return r.res;
  const { error } = await db().from('encompass_menus').delete().eq('id', id).eq('provider_id', a.store.id);
  if (error) return fail('消せませんでした', 503);
  return okJson({ ok: true });
}
