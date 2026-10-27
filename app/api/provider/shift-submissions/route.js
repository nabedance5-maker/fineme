// GET /api/provider/shift-submissions?from=&to= → 店舗側が見る、その日付範囲に重なる区切りで
//     「提出を完了」したスタッフ一覧（区切りは店舗の提出ルールで決まる。でお指摘 2026-10-16）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';
import { loadSubmittedInRange } from '@/lib/shift-windows';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return Response.json({ error: 'from・to を指定してください' }, { status: 400 });

  const map = await loadSubmittedInRange(supabase, provider.id, from, to);
  return Response.json(Object.entries(map).map(([staff_id, submitted_at]) => ({ staff_id, submitted_at })));
}
