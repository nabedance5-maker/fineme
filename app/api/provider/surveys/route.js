// GET/POST /api/provider/surveys → アンケートの一覧・作成（でお要望 2026-10-19：hacomono差分 #9）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { normalizeQuestions, newToken } from '@/lib/surveys';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows } = await supabase.from('provider_surveys').select('id, title, status, token, created_at, questions').eq('provider_id', a.provider.id).order('created_at', { ascending: false });
  const ids = (rows || []).map(r => r.id);
  const cnt = {};
  if (ids.length) {
    const { data: res } = await supabase.from('provider_survey_responses').select('survey_id').in('survey_id', ids).limit(50000);
    (res || []).forEach(r => { cnt[r.survey_id] = (cnt[r.survey_id] || 0) + 1; });
  }
  return Response.json((rows || []).map(({ questions, ...r }) => ({ ...r, question_count: questions?.length || 0, responses: cnt[r.id] || 0 })));
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const title = String(b.title || '').trim().slice(0, 100);
  if (!title) return Response.json({ error: 'タイトルを入れてください' }, { status: 400 });
  const q = normalizeQuestions(b.questions || []);
  if (q.error) return Response.json({ error: q.error }, { status: 400 });
  if (!q.questions.length) return Response.json({ error: '質問を1つ以上作ってください' }, { status: 400 });
  const { data, error } = await supabase.from('provider_surveys').insert({
    provider_id: a.provider.id, title, description: String(b.description || '').slice(0, 1000) || null,
    questions: q.questions, allow_guest: b.allow_guest !== false, token: newToken(),
  }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
