// GET /api/encompass/me … ログイン中のお店（ENCOMPASS の契約があるか・何ができるか）
export const dynamic = 'force-dynamic';
import { encompassAuth, okJson } from '@/lib/encompass/server';

export async function GET(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  return okJson({ store: { name: a.store.name, status: a.store.status }, role: a.role, staffName: a.user.name, can: a.can });
}
