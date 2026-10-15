// GET  /api/provider/onboarding → オンボーディングの状態（完了済みか・前回の回答・プランで使えない機能）
// POST /api/provider/onboarding { mode: 'apply', answers, features } → 機能のON/OFF・上部ショートカット・
//      AI専属コンサルの前提（ゴール・事実・時間を取られている作業）をまとめて保存して完了にする
// POST /api/provider/onboarding { mode: 'skip' } → あとで（完了扱い。機能設定タブからやり直せる）
//
// でお承認（2026-10-15）。質問とおすすめ判定は lib/onboarding.js が唯一の定義元。
// おすすめの表示（プレビュー）は画面側が同じ関数で計算し、保存時にここで計算し直す。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { FEATURE_DEFS, resolveFeatures, featureLocks, withPlanPreview } from '@/lib/feature-flags';
import { resolveDashboardPrefs } from '@/lib/dashboard-prefs';
import { isOwnerTestEmail } from '@/lib/is-owner-email';
import { recordGoal } from '@/lib/consultant-memory';
import {
  normalizeAnswers, recommendFeatures, recommendShortcuts, firstSteps, onboardingFacts, goalNote,
} from '@/lib/onboarding';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// オンボーディングが書いた事実は、やり直した時に置き換えられるよう接頭辞で見分ける
const FACT_PREFIXES = ['業態：', 'スタッフ数：', '予約の受け方：', '運営：', '時間を取られている作業：', 'いちばん困っていること：'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan, enabled_features, dashboard_prefs, created_at').eq('email', user.email).single();
  return data ? { ...data, isOwner: isOwnerTestEmail(user.email) } : null;
}

async function auth(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return getProviderByToken(authHeader.replace('Bearer ', ''));
}

function buildPreview(provider, answers, previewHeader) {
  const shown = withPlanPreview(provider, previewHeader);
  const locks = featureLocks(shown);
  const rec = recommendFeatures(answers);
  const recommendations = Object.entries(rec).map(([key, r]) => ({
    key,
    label: FEATURE_DEFS[key].label,
    on: r.on,
    reason: r.reason,
    lockedPlan: locks[key] || null,
  }));
  return { recommendations, shortcuts: recommendShortcuts(answers), steps: firstSteps(answers) };
}

export async function GET(request) {
  const provider = await auth(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('provider_onboarding').select('answers, skipped, completed_at').eq('provider_id', provider.id).maybeSingle();
  return Response.json({
    completed: !!data?.completed_at,
    skipped: !!data?.skipped,
    answers: data?.answers || null,
  });
}

async function __POST(request) {
  const provider = await auth(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  if (body.mode === 'skip') {
    const { error } = await supabase.from('provider_onboarding').upsert(
      { provider_id: provider.id, skipped: true, completed_at: now, updated_at: now }, { onConflict: 'provider_id' });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const answers = normalizeAnswers(body.answers);
  if (!answers.business || !answers.staffSize) {
    return Response.json({ error: '業態とスタッフの人数を選んでください' }, { status: 400 });
  }
  const preview = buildPreview(provider, answers, request.headers.get('x-plan-preview'));
  if (body.mode !== 'apply') return Response.json({ error: 'mode が不正です' }, { status: 400 });

  // 機能のON/OFF：おすすめに出した機能だけを、店舗が最後に選んだ値で上書きする
  const chosen = body.features && typeof body.features === 'object' ? body.features : {};
  const applied = {};
  preview.recommendations.forEach(r => {
    applied[r.key] = typeof chosen[r.key] === 'boolean' ? chosen[r.key] : r.on;
  });
  const enabled = { ...resolveFeatures(provider), ...applied };
  const prefs = { ...resolveDashboardPrefs(provider), header_shortcuts: preview.shortcuts };

  const { error: upErr } = await supabase.from('providers')
    .update({ enabled_features: enabled, dashboard_prefs: prefs })
    .eq('id', provider.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  // AI専属コンサルに、お店の前提・目的・時間を取られている作業を共有する
  const { data: settings } = await supabase.from('provider_consultant_settings').select('facts').eq('provider_id', provider.id).maybeSingle();
  const keptFacts = (settings?.facts || []).filter(f => !FACT_PREFIXES.some(p => String(f).startsWith(p)));
  const facts = [...keptFacts, ...onboardingFacts(answers)].slice(-20);
  const note = goalNote(answers);
  await supabase.from('provider_consultant_settings').upsert({
    provider_id: provider.id,
    facts,
    ...(note ? { goal_note: note, goals_set_at: now } : {}),
    interview_done_at: now,
    updated_at: now,
  }, { onConflict: 'provider_id' });
  if (note) await recordGoal(supabase, provider.id, note, 'user');

  if (answers.burdens.length) {
    const { data: open } = await supabase.from('provider_consultant_bottlenecks').select('category').eq('provider_id', provider.id).eq('status', 'open');
    const have = new Set((open || []).map(b => b.category));
    const BURDEN_LABEL = { reservation: '予約の調整・管理', reply: 'お客様への連絡・返信', shift: 'シフト作成・勤怠の集計', sales: '売上・会計の記録', karte: 'カルテ・お客様情報の記入' };
    const rows = answers.burdens.filter(k => !have.has(k)).map(k => ({ provider_id: provider.id, category: k, label: BURDEN_LABEL[k], source: 'interview' }));
    if (rows.length) await supabase.from('provider_consultant_bottlenecks').insert(rows);
  }

  const { error: obErr } = await supabase.from('provider_onboarding').upsert({
    provider_id: provider.id, answers, applied_features: applied, skipped: false, completed_at: now, updated_at: now,
  }, { onConflict: 'provider_id' });
  if (obErr) return Response.json({ error: obErr.message }, { status: 500 });

  return Response.json({ ok: true, features: enabled, shortcuts: preview.shortcuts, steps: preview.steps });
}

export const POST = withAudit(__POST);
