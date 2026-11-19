// GET  /api/encompass/menus            … お店のメニュー一覧（?customer=u:... でそのお客様のものだけ）
// POST /api/encompass/menus            … メニューを作る
export const dynamic = 'force-dynamic';
import { db, encompassAuth, fail, isCustomerRef, okJson, storeCustomers } from '@/lib/encompass/server';
import { MAX_MENUS_PER_STORE, menuRowFrom } from '@/lib/encompass/menu-input';

const COLS = 'id, title, items, on_board, customer_ref, updated_at';

export async function GET(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const customer = new URL(request.url).searchParams.get('customer');
  let q = db().from('encompass_menus').select(COLS).eq('provider_id', a.store.id).order('updated_at', { ascending: false }).limit(MAX_MENUS_PER_STORE);
  if (customer) {
    if (!a.can.customers) return fail('お客様の情報を見る権限がありません', 403, 'no_perm');
    if (!isCustomerRef(customer)) return fail('お客様の指定が正しくありません', 400);
    q = q.eq('customer_ref', customer);
  } else if (!a.can.customers) {
    q = q.is('customer_ref', null);
  }
  const { data, error } = await q;
  if (error) return fail('メニューを読み込めませんでした', 503);
  let names = {};
  if (a.can.customers && (data || []).some(m => m.customer_ref)) {
    try { names = Object.fromEntries((await storeCustomers(a.store.id)).map(c => [c.ref, c.name])); } catch {}
  }
  return okJson({ menus: (data || []).map(m => ({ ...m, customer_name: m.customer_ref ? names[m.customer_ref] || '（お客様）' : null })) });
}

export async function POST(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const body = await request.json().catch(() => null);
  const { row, error, status } = await menuRowFrom(body, a);
  if (error) return fail(error, status || 400);
  const sb = db();
  const { count } = await sb.from('encompass_menus').select('id', { count: 'exact', head: true }).eq('provider_id', a.store.id);
  if ((count || 0) >= MAX_MENUS_PER_STORE) return fail(`メニューは${MAX_MENUS_PER_STORE}件までです。使わないものを消してください`, 400);
  const { data, error: e } = await sb.from('encompass_menus')
    .insert({ ...row, provider_id: a.store.id, created_by: a.user.id, updated_by: a.user.id })
    .select(COLS).single();
  if (e) return fail('保存できませんでした', 503);
  return okJson({ menu: data });
}
