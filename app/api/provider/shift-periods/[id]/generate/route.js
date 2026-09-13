// POST /api/provider/shift-periods/[id]/generate → 自動作成ボタン。
// 既存の自動生成分(source='auto')を作り直し、手動追加分(source='manual')はそのまま残す。
// ステータスをdraftに進め、未充足の枠があればwarningsとして返す（保存はしない・
// レスポンスのみ。店舗側はここを見ながら手動で調整する）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { generateShift } from '@/lib/shift-generator';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: period } = await supabase.from('provider_shift_periods').select('*').eq('id', params.id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const [{ data: settings }, { data: requests }, { data: priorities }, { data: dayPatternRows }, { data: patternRows }] = await Promise.all([
    supabase.from('provider_shift_settings').select('rule_type').eq('provider_id', provider.id).single(),
    supabase.from('provider_shift_requests').select('staff_id, date, type, start_time, end_time').eq('period_id', period.id),
    supabase.from('provider_shift_priorities').select('staff_id, priority_score').eq('provider_id', provider.id),
    supabase.from('provider_shift_period_day_patterns').select('date, pattern_id').eq('period_id', period.id),
    supabase.from('provider_shift_patterns').select('id, slots').eq('provider_id', provider.id),
  ]);

  const dayPatterns = {};
  (dayPatternRows || []).forEach(r => { dayPatterns[r.date] = r.pattern_id; });
  const patternsById = {};
  (patternRows || []).forEach(p => { patternsById[p.id] = p; });

  const { entries, warnings } = generateShift({
    period,
    requests: requests || [],
    ruleType: settings?.rule_type || 'as_requested',
    dayPatterns,
    patternsById,
    priorities: priorities || [],
  });

  // 既存の自動生成分だけ作り直す（手動で個別追加・調整したコマ(source='manual')は残す）
  const { error: delError } = await supabase.from('provider_shift_entries').delete().eq('period_id', period.id).eq('source', 'auto');
  if (delError) return Response.json({ error: delError.message }, { status: 500 });

  if (entries.length) {
    const rows = entries.map(e => ({ ...e, period_id: period.id, source: 'auto' }));
    const { error: insError } = await supabase.from('provider_shift_entries').insert(rows);
    if (insError) return Response.json({ error: insError.message }, { status: 500 });
  }

  await supabase.from('provider_shift_periods').update({ status: 'draft' }).eq('id', period.id);

  return Response.json({ ok: true, createdCount: entries.length, warnings });
}
