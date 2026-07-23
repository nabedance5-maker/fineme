// POST /api/me/navi-steps/mirror-sync
// Mirror再撮影時、既存の navi_steps.steps を作り直さずに（ロードマップ＝stepDoneの紐付けを
// 温存したまま）、eval_typeがmirror/bothのステップについてMirror変化を突き合わせ、
// navi_steps.step_outcomes を更新する。
//
// mirror_baseline_session_id が無い場合（初回Mirror）は差分比較不能なので何もしない。
// 呼び出し側（navi/page.js）は navi-steps/generate(mirror_only:true) のフル生成にフォールバックする。
//
// 完了判定・「霧の向こう」の境界は stepDone のみで決まり、ここでは一切変更しない。
// ここで更新される step_outcomes は「✓ 変化を確認できました」という実績バッジの表示にのみ使われる。
import { getSupabase } from '@/lib/supabase';
import { buildAxisLevelMap, isImproved } from '@/lib/mirror-axis-diff';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { mirror_session_id } = await request.json().catch(() => ({}));
  if (!mirror_session_id) {
    return Response.json({ error: 'mirror_session_id が必要です' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('navi_steps, step_done')
    .eq('id', user.id)
    .single();

  const naviSteps = profile?.navi_steps;
  if (!naviSteps?.steps?.length) {
    return Response.json({ ok: false, skipped: true, reason: 'no_navi_steps' }, { status: 404 });
  }
  if (!naviSteps.mirror_baseline_session_id) {
    return Response.json({ ok: false, skipped: true, reason: 'no_baseline' }, { status: 404 });
  }

  // 新しい Mirror セッション（所有権確認）
  const { data: newMirror, error: mirrorError } = await supabase
    .from('mirror_sessions')
    .select('id, analysis')
    .eq('id', mirror_session_id)
    .eq('user_id', user.id)
    .single();
  if (mirrorError || !newMirror?.analysis?.axes?.length) {
    return Response.json({ error: 'Mirror セッションが見つかりません' }, { status: 404 });
  }

  // ベースライン Mirror セッション
  const { data: baseMirror } = await supabase
    .from('mirror_sessions')
    .select('analysis')
    .eq('id', naviSteps.mirror_baseline_session_id)
    .single();

  const baseMap = buildAxisLevelMap(baseMirror?.analysis);
  const newMap  = buildAxisLevelMap(newMirror.analysis);
  const stepDone = profile?.step_done || {};

  const outcomes = naviSteps.steps
    .filter(s => s.eval_type === 'mirror' || s.eval_type === 'both')
    .map(step => ({
      step_id: step.id,
      axis: step.axis,
      done: !!stepDone[step.id],
      mirror_change: isImproved(baseMap[step.axis], newMap[step.axis]),
    }));

  const updatedNaviSteps = {
    ...naviSteps,
    step_outcomes: outcomes,
    mirror_baseline_session_id: newMirror.id,
  };

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ navi_steps: updatedNaviSteps })
    .eq('id', user.id);

  if (saveError) return Response.json({ error: saveError.message }, { status: 500 });

  return Response.json({ ok: true, navi_steps: updatedNaviSteps });
}
