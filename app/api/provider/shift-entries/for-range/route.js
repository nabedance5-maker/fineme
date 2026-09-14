// GET /api/provider/shift-entries/for-range?from=&to= → 確定済みシフトの勤務時間帯一覧
// 予約カレンダーで「出勤していないスタッフの枠を自動でグレー表示する」ために使う
// （でお要望2026-09-14）。既存の /api/provider/shift-entries は periodId 指定が必須
// （シフト管理タブ内で1期間ずつ見る用）だが、カレンダー側は週をまたいで複数期間に
// またがることもあるため、日付範囲＋確定済み(status='confirmed')の期間だけを対象に
// 横断的に取得する専用エンドポイントを新設した。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return Response.json({ error: 'from/toは必須です' }, { status: 400 });

  // この範囲と重なる「確定済み」期間を先に洗い出す。confirmedPeriods自体は、シフト管理を
  // 使っていない店舗・その日をカバーする確定期間が無い日を「対象外（グレー表示しない）」
  // と区別するために呼び出し側へそのまま返す。
  const { data: periods } = await supabase
    .from('provider_shift_periods')
    .select('id, period_start, period_end')
    .eq('provider_id', provider.id)
    .eq('status', 'confirmed')
    .lte('period_start', to)
    .gte('period_end', from);

  const periodIds = (periods || []).map(p => p.id);
  if (!periodIds.length) return Response.json({ entries: [], coveredPeriods: [] });

  const { data: entries, error } = await supabase
    .from('provider_shift_entries')
    .select('staff_id, date, start_time, end_time')
    .in('period_id', periodIds)
    .gte('date', from)
    .lte('date', to);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    entries: entries || [],
    coveredPeriods: (periods || []).map(p => ({ start: p.period_start, end: p.period_end })),
  });
}
