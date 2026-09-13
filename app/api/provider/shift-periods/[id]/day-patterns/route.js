// GET  /api/provider/shift-periods/[id]/day-patterns → 期間内の日付→パターン割当一覧
// POST /api/provider/shift-periods/[id]/day-patterns → 複数日付へ一括で1パターンを割り当てる
//      body: { dates: ["2026-09-01", ...], pattern_id }
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: period } = await supabase.from('provider_shift_periods').select('id').eq('id', params.id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_shift_period_day_patterns')
    .select('date, pattern_id')
    .eq('period_id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: period } = await supabase.from('provider_shift_periods').select('id').eq('id', params.id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { dates, pattern_id } = body;
  if (!Array.isArray(dates) || !dates.length || !pattern_id) {
    return Response.json({ error: '日付とパターンは必須です' }, { status: 400 });
  }

  // このパターンが自店舗のものか確認してから、指定した日付全てへ一括でupsertする
  // （でお要望2026-09-14：1日ずつ作るのではなく、まとめて一気に決められるように）
  const { data: pattern } = await supabase.from('provider_shift_patterns').select('id').eq('id', pattern_id).eq('provider_id', provider.id).single();
  if (!pattern) return Response.json({ error: 'パターンが見つかりません' }, { status: 404 });

  const rows = dates.map(date => ({ period_id: params.id, date, pattern_id }));
  const { error } = await supabase
    .from('provider_shift_period_day_patterns')
    .upsert(rows, { onConflict: 'period_id,date' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, updatedCount: rows.length });
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: period } = await supabase.from('provider_shift_periods').select('id').eq('id', params.id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return Response.json({ error: 'dateは必須です' }, { status: 400 });

  const { error } = await supabase.from('provider_shift_period_day_patterns').delete().eq('period_id', params.id).eq('date', date);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
