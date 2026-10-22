// GET  /api/provider/shift-periods → 自店舗のシフト募集期間一覧（新しい順）
// POST /api/provider/shift-periods → 作るシフトの期間を作成（開始日・終了日）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
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

  const { data, error } = await supabase
    .from('provider_shift_periods')
    .select('*')
    .eq('provider_id', provider.id)
    .order('period_start', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const { period_start, period_end } = body;
  if (!period_start || !period_end) {
    return Response.json({ error: '対象期間（開始日・終了日）は必須です' }, { status: 400 });
  }
  if (period_end < period_start) return Response.json({ error: '終了日は開始日より後にしてください' }, { status: 400 });

  // 期間は「作るシフトの範囲」。希望の募集・締切は店舗の提出ルールで決まるため、作った時点から作成中
  // （でお指摘 2026-10-16：最初に期間を作らせない。どの期間を作るかはシフトを作る時に選ぶ）
  const { data, error } = await supabase
    .from('provider_shift_periods')
    .insert({ provider_id: provider.id, period_start, period_end, status: 'draft' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

export const POST = withAudit(__POST);
