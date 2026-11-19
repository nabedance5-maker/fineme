// GET /api/encompass/customers … このお店のお客様（名前だけ）。SaaS の「顧客情報」の権限がある人だけ
export const dynamic = 'force-dynamic';
import { encompassAuth, fail, okJson, storeCustomers } from '@/lib/encompass/server';

export async function GET(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  if (!a.can.customers) return fail('お客様の情報を見る権限がありません', 403, 'no_perm');
  try {
    return okJson({ customers: await storeCustomers(a.store.id) });
  } catch {
    return fail('お客様を読み込めませんでした', 503);
  }
}
