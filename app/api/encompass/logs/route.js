// GET  /api/encompass/logs?customer=u:... … そのお客様のやった記録（新しい順・20件）
// POST /api/encompass/logs                … やった記録を残す（お客様を付けるのは「顧客情報」の権限がある人だけ）
export const dynamic = 'force-dynamic';
import { cleanText, customerOfStore, db, encompassAuth, fail, isCustomerRef, isUuid, okJson } from '@/lib/encompass/server';
import { sanitizeMenu } from '@/lib/encompass/menu';

export async function GET(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  if (!a.can.customers) return fail('お客様の情報を見る権限がありません', 403, 'no_perm');
  const customer = new URL(request.url).searchParams.get('customer');
  if (!isCustomerRef(customer)) return fail('お客様を選んでください', 400);
  const { data, error } = await db().from('encompass_logs')
    .select('id, title, items, memo, done_at')
    .eq('provider_id', a.store.id).eq('customer_ref', customer)
    .order('done_at', { ascending: false }).limit(20);
  if (error) return fail('記録を読み込めませんでした', 503);
  return okJson({ logs: data || [] });
}

export async function POST(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return fail('送られた内容を読めませんでした', 400);
  const m = sanitizeMenu({ title: body.title, items: Array.isArray(body.items) ? body.items : [] });
  if (!m.items.length) return fail('記録する種目がありません', 400);
  const ref = body.customer_ref || null;
  if (ref) {
    if (!a.can.customers) return fail('お客様の情報を扱う権限がありません', 403, 'no_perm');
    if (!(await customerOfStore(a.store.id, ref))) return fail('このお店のお客様ではありません', 400);
  }
  let menuId = null;
  if (isUuid(body.menu_id)) {
    const { data } = await db().from('encompass_menus').select('id').eq('id', body.menu_id).eq('provider_id', a.store.id).maybeSingle();
    menuId = data?.id || null;
  }
  const { data, error } = await db().from('encompass_logs').insert({
    provider_id: a.store.id, menu_id: menuId, customer_ref: ref,
    title: cleanText(m.title, 40), items: m.items, memo: cleanText(body.memo, 300) || null, recorded_by: a.user.id,
  }).select('id, done_at').single();
  if (error) return fail('記録できませんでした', 503);
  return okJson({ log: data });
}
