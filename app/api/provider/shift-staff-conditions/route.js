// GET  /api/provider/shift-staff-conditions → 自店舗スタッフの労働条件一覧
// POST /api/provider/shift-staff-conditions → まとめて保存（[{staff_id, employment_type, max_hours_per_day, ...}]）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { EMPLOYMENT_TYPES } from '@/lib/shift-labor';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const optNum = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const optInt = v => { const n = optNum(v); return n === null ? null : Math.round(n); };

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('provider_shift_staff_conditions').select('*').eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items.filter(it => it.staff_id) : [];
  if (!items.length) return Response.json({ error: '保存する項目がありません' }, { status: 400 });

  const { data: ownStaff } = await supabase.from('provider_staff').select('id').eq('provider_id', provider.id).in('id', items.map(it => it.staff_id));
  const ownIds = new Set((ownStaff || []).map(s => s.id));

  const rows = items.filter(it => ownIds.has(it.staff_id)).map(it => ({
    provider_id: provider.id,
    staff_id: it.staff_id,
    employment_type: EMPLOYMENT_TYPES[it.employment_type] ? it.employment_type : 'fulltime',
    max_hours_per_day: optNum(it.max_hours_per_day),
    max_hours_per_week: optNum(it.max_hours_per_week),
    max_hours_per_month: optNum(it.max_hours_per_month),
    max_days_per_week: optInt(it.max_days_per_week),
    max_days_per_month: optInt(it.max_days_per_month),
    min_days_off_per_week: optInt(it.min_days_off_per_week),
    max_consecutive_days: optInt(it.max_consecutive_days),
    note: it.note ? String(it.note).slice(0, 200) : null,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return Response.json({ error: '対象のスタッフが見つかりません' }, { status: 400 });

  const { error } = await supabase.from('provider_shift_staff_conditions').upsert(rows, { onConflict: 'provider_id,staff_id' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
