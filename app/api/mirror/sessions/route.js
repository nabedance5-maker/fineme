// GET /api/mirror/sessions?user_id=X  または  ?ids=id1,id2,id3
// ユーザーの過去Mirror分析一覧を返す
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const ids = searchParams.get('ids'); // カンマ区切りのsession_id群（未ログイン用）

  function buildQuery(selectCols) {
    let q = supabase
      .from('mirror_sessions')
      .select(selectCols)
      .order('created_at', { ascending: false })
      .limit(10);
    if (userId) return q.eq('user_id', userId);
    if (ids) {
      const idList = ids.split(',').filter(Boolean).slice(0, 10);
      return q.in('id', idList);
    }
    return null;
  }

  if (!userId && !ids) {
    return Response.json({ sessions: [] });
  }

  let { data, error } = await buildQuery('id, created_at, paid, analysis, report_status');
  // 後方互換: 本番に report_status 未適用でも一覧取得を失敗させない
  if (error?.code === 'PGRST204' || /report_status/.test(error?.message || '')) {
    ({ data, error } = await buildQuery('id, created_at, paid, analysis'));
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const includeAxes = searchParams.get('include_axes') === '1';
  const sessions = (data || []).map(s => ({
    id: s.id,
    created_at: s.created_at,
    paid: s.paid,
    first_impression: s.analysis?.first_impression || '',
    axes_count: s.analysis?.axes?.length || 0,
    report_status: s.report_status || 'none',
    ...(includeAxes ? { axes: s.analysis?.axes || [] } : {}),
  }));

  return Response.json({ sessions });
}
