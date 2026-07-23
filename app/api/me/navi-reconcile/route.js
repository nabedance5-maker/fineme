// POST /api/me/navi-reconcile
// Mirror分析完了直後にフロントエンドから呼ぶ。
// 前月スナップショットのステップに対して done / mirror_change を突き合わせ、
// navi_snapshots.step_outcomes に書き込む。
// Stage 2-3 の歴史注入の燃料となる。
import { getSupabase } from '@/lib/supabase';
import { AXIS_LABELS_JA, buildAxisLevelMap, isImproved } from '@/lib/mirror-axis-diff';

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { mirror_session_id } = await request.json().catch(() => ({}));
  if (!mirror_session_id) {
    return Response.json({ error: 'mirror_session_id が必要です' }, { status: 400 });
  }

  // 新しい Mirror セッションを取得（所有権確認）
  const { data: newMirror, error: mirrorError } = await getSupabase()
    .from('mirror_sessions')
    .select('id, analysis, created_at')
    .eq('id', mirror_session_id)
    .eq('user_id', user.id)
    .single();

  if (mirrorError || !newMirror) {
    return Response.json({ error: 'Mirror セッションが見つかりません' }, { status: 404 });
  }
  if (!newMirror.analysis?.axes?.length) {
    return Response.json({ error: 'Mirror 分析データが不正です' }, { status: 400 });
  }

  // 新 Mirror の軸マップ（axisId → potential_level）
  const newMirrorAxesMap = buildAxisLevelMap(newMirror.analysis);

  // 今月より前の最新スナップショットを取得（＝先月の Map）
  const mirrorMonth = newMirror.created_at.slice(0, 7); // 'YYYY-MM'
  const { data: snapshot } = await getSupabase()
    .from('navi_snapshots')
    .select('year_month, navi_steps, mirror_session_id, step_outcomes')
    .eq('user_id', user.id)
    .lt('year_month', mirrorMonth)
    .not('navi_steps', 'is', null)
    .order('year_month', { ascending: false })
    .limit(1)
    .single();

  if (!snapshot?.navi_steps?.steps?.length) {
    return Response.json({ ok: true, skipped: true, reason: 'no_snapshot' });
  }

  // 前月の Mirror セッションを取得（比較ベースライン）
  let prevMirrorAxesMap = null;
  if (snapshot.mirror_session_id) {
    try {
      const { data: prevMirror } = await getSupabase()
        .from('mirror_sessions')
        .select('analysis')
        .eq('id', snapshot.mirror_session_id)
        .single();
      if (prevMirror?.analysis?.axes) {
        prevMirrorAxesMap = buildAxisLevelMap(prevMirror.analysis);
      }
    } catch {}
  }

  // profiles.step_done を取得
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('step_done')
    .eq('id', user.id)
    .single();
  const stepDone = profile?.step_done || {};

  // 各ステップを突き合わせ
  const outcomes = snapshot.navi_steps.steps.map(step => {
    const done = !!stepDone[step.id];
    const evalType = step.eval_type || 'both';

    let mirror_change = null;
    let note = '';

    if (evalType !== 'action' && prevMirrorAxesMap) {
      const prevLevel = prevMirrorAxesMap[step.axis] ?? null;
      const newLevel  = newMirrorAxesMap[step.axis]  ?? null;
      const improved = isImproved(prevLevel, newLevel);
      mirror_change = improved;
      if (improved) {
        const axisName = AXIS_LABELS_JA[step.axis] || step.axis;
        note = `改善傾向が見られた（${axisName}: ${prevLevel}→${newLevel}）`;
      }
      // prevLevel or newLevel が null（Mirror対象外の軸）: mirror_change = null のまま
    }

    const entry = { step_id: step.id, axis: step.axis, done, mirror_change };
    if (note) entry.note = note;
    return entry;
  });

  // スナップショットに書き込み
  const { error: writeError } = await getSupabase()
    .from('navi_snapshots')
    .update({
      step_outcomes: outcomes,
      mirror_session_id: newMirror.id,
      mirror_analysis: newMirror.analysis,
    })
    .eq('user_id', user.id)
    .eq('year_month', snapshot.year_month);

  if (writeError) {
    return Response.json({ error: writeError.message }, { status: 500 });
  }

  return Response.json({ ok: true, year_month: snapshot.year_month, outcomes_count: outcomes.length });
}
