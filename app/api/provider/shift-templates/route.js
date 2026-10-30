// GET /api/provider/shift-templates → いつものシフト（スタッフ×曜日の決まった勤務時間）
// PUT /api/provider/shift-templates { templates: [{ staff_id, weekday, start_time, end_time }] } → まるごと置き換える
// シフトの「かんたん作成」用（2026-10-30）。入れる処理は /api/provider/shift-range の action='apply_template'。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { spanOf } from '@/lib/time-span';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const { data, error } = await supabase.from('provider_shift_templates').select('staff_id, weekday, start_time, end_time').eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

async function __PUT(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const { templates } = await request.json().catch(() => ({}));
  if (!Array.isArray(templates)) return Response.json({ error: '内容が正しくありません' }, { status: 400 });
  const { data: staff } = await supabase.from('provider_staff').select('id').eq('provider_id', provider.id);
  const own = new Set((staff || []).map(s => s.id));
  const rows = [];
  for (const t of templates) {
    if (!own.has(t.staff_id) || !Number.isInteger(t.weekday) || t.weekday < 0 || t.weekday > 6) continue;
    if (!TIME.test(t.start_time || '') || !TIME.test(t.end_time || '')) continue;
    if (!spanOf(t.start_time, t.end_time)) return Response.json({ error: '開始と終了の時刻を確かめてください' }, { status: 400 });
    rows.push({ provider_id: provider.id, staff_id: t.staff_id, weekday: t.weekday, start_time: t.start_time, end_time: t.end_time, updated_at: new Date().toISOString() });
  }
  const { error: delError } = await supabase.from('provider_shift_templates').delete().eq('provider_id', provider.id);
  if (delError) return Response.json({ error: delError.message }, { status: 500 });
  if (rows.length) {
    const { error } = await supabase.from('provider_shift_templates').insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, count: rows.length });
}

export const PUT = withAudit(__PUT);
