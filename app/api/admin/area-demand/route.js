// GET /api/admin/area-demand → 全都道府県のエリア需要（運営用・出店誘致営業リスト）
export const dynamic = 'force-dynamic';
import { computeAreaDemand } from '@/lib/area-demand';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await computeAreaDemand();
  return Response.json(result);
}
