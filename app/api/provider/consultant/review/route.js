// GET   /api/provider/consultant/review → 見直しの間隔・次の見直しの日・最新の見直し・期限が来ているか
// POST  /api/provider/consultant/review { force? } → 見直しを作る（期限が来ている時、または force。10分に1回まで）
// PATCH /api/provider/consultant/review { interval_months } → 見直しの間隔を変える（1/3/6/12か月）
// お店のオーナーのみ（2026-11-13 渡邉要望：導入時の設定を、AIが定期的に見直して振り返る。既定3か月）。lib/consultant-review.js
export const dynamic = 'force-dynamic';
export const maxDuration = 150;
import { authProvider, loadState, supabase, consultantEnabled } from '../_lib';
import { withAudit } from '@/lib/activity-log';
import { buildContext } from '@/lib/consultant-prompt';
import { deepStoreAnalysis } from '@/lib/consultant-deep';
import { INTERVALS, DEFAULT_INTERVAL, nextReviewDate, generateReview } from '@/lib/consultant-review';

async function info(provider) {
  const [{ data: st }, { data: last }, { data: onb }, { data: prov }] = await Promise.all([
    supabase.from('provider_consultant_settings').select('review_interval_months, next_review_at').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_consultant_reviews').select('id, created_at, period_from, period_to, content').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('provider_onboarding').select('answers, completed_at').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('providers').select('created_at').eq('id', provider.id).single(),
  ]);
  const interval = st?.review_interval_months || DEFAULT_INTERVAL;
  const next = st?.next_review_at ? new Date(st.next_review_at) : nextReviewDate({ interval, lastReviewAt: last?.created_at, onboardedAt: onb?.completed_at, createdAt: prov?.created_at });
  return { interval, next, last, onb, due: !!next && next.getTime() <= Date.now() };
}

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const x = await info(provider);
  return Response.json({ interval_months: x.interval, intervals: INTERVALS, next_review_at: x.next?.toISOString() || null, due: x.due, review: x.last || null });
}

async function __POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const x = await info(provider);
  if (!x.due && !b.force) return Response.json({ ok: true, skipped: true });
  if (x.last && Date.now() - new Date(x.last.created_at).getTime() < 10 * 60000) return Response.json({ error: '見直しは10分に1回までです' }, { status: 429 });

  const state = await loadState(provider);
  state.deep = await deepStoreAnalysis(supabase, provider).catch(() => '');
  state.lastReview = x.last;
  state.onboarding = x.onb;
  let content;
  try { content = await generateReview(supabase, provider, state, buildContext(state, provider)); } catch (e) {
    console.error('[consultant review]', e?.message);
    return Response.json({ error: 'AIが混み合っていて見直しを作れませんでした。少し時間をおいてもう一度お試しください' }, { status: 502 });
  }
  const now = new Date();
  const from = (x.last?.created_at || x.onb?.completed_at || provider.created_at || now.toISOString()).slice(0, 10);
  const { data: row, error } = await supabase.from('provider_consultant_reviews').insert({ provider_id: provider.id, period_from: from, period_to: now.toISOString().slice(0, 10), content }).select('id, created_at, period_from, period_to, content').single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  const next = nextReviewDate({ interval: x.interval, lastReviewAt: now });
  await supabase.from('provider_consultant_settings').upsert({ provider_id: provider.id, next_review_at: next.toISOString(), updated_at: now.toISOString() }, { onConflict: 'provider_id' });
  return Response.json({ ok: true, review: row, next_review_at: next.toISOString() });
}

async function __PATCH(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const n = parseInt(b.interval_months, 10);
  if (!INTERVALS.includes(n)) return Response.json({ error: '間隔は1・3・6・12か月から選んでください' }, { status: 400 });
  const x = await info(provider);
  const next = nextReviewDate({ interval: n, lastReviewAt: x.last?.created_at, onboardedAt: x.onb?.completed_at, createdAt: provider.created_at || new Date().toISOString() });
  const { error } = await supabase.from('provider_consultant_settings').upsert({ provider_id: provider.id, review_interval_months: n, next_review_at: next?.toISOString() || null, updated_at: new Date().toISOString() }, { onConflict: 'provider_id' });
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json({ ok: true, interval_months: n, next_review_at: next?.toISOString() || null });
}

export const POST = withAudit(__POST);
export const PATCH = withAudit(__PATCH);
