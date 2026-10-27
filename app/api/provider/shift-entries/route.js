// GET  /api/provider/shift-entries?from=&to= → その範囲のシフト（確定した日のものは period_status='confirmed'）
// POST /api/provider/shift-entries → 1コマ追加（希望が出ていなくても・確定した日でも、お店が自由に入れられる）
// 2026-10-27：「期間」をやめ、お店＋日付で持つ（確定は日付ごと：provider_shift_confirmed_days）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { confirmedDaysIn, entriesIn } from '@/lib/shift-store';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isTime = s => /^\d{1,2}:\d{2}/.test(String(s || ''));

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const sp = new URL(request.url).searchParams;
  const from = sp.get('from'), to = sp.get('to');
  if (!isDate(from) || !isDate(to)) return Response.json({ error: 'from・to を指定してください' }, { status: 400 });
  const [days, entries] = await Promise.all([confirmedDaysIn(supabase, provider.id, from, to), entriesIn(supabase, provider.id, from, to)]);
  return Response.json(entries.map(e => ({ ...e, period_status: days.has(e.date) ? 'confirmed' : 'draft' })));
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const { staff_id, date, start_time, end_time } = await request.json().catch(() => ({}));
  if (!staff_id || !isDate(date) || !isTime(start_time) || !isTime(end_time)) return Response.json({ error: 'スタッフ・日付・開始・終了を入れてください' }, { status: 400 });
  const { data: staff } = await supabase.from('provider_staff').select('id').eq('id', staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  const { data, error } = await supabase.from('provider_shift_entries')
    .insert({ provider_id: provider.id, staff_id, date, start_time, end_time, source: 'manual' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export const POST = withAudit(__POST);
