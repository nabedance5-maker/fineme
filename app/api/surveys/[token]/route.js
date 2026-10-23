// GET/POST /api/surveys/[token] → 公開のアンケート回答（でお要望 2026-10-19：hacomono差分 #9）
// ログインしていればお客様に紐づけて保存（1人1回。答え直すと上書き）。ログインしていなければ名前を書いて回答（店舗が許可している場合）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { validateAnswers } from '@/lib/surveys';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function userOf(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } = {} } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
  return user || null;
}
async function surveyOf(params) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(token)) return null;
  const { data } = await supabase.from('provider_surveys').select('id, provider_id, title, description, questions, status, allow_guest').eq('token', token).maybeSingle();
  return data;
}

export async function GET(request, props) {
  const params = await props.params;
  const s = await surveyOf(params);
  if (!s) return Response.json({ error: 'アンケートが見つかりません' }, { status: 404 });
  const [{ data: p }, user] = await Promise.all([supabase.from('providers').select('name').eq('id', s.provider_id).single(), userOf(request)]);
  let answered = null;
  if (user) {
    const { data } = await supabase.from('provider_survey_responses').select('answers').eq('survey_id', s.id).eq('user_id', user.id).maybeSingle();
    answered = data?.answers || null;
  }
  return Response.json({ title: s.title, description: s.description, questions: s.questions, status: s.status, allow_guest: s.allow_guest, provider_name: p?.name || '', logged_in: !!user, answered });
}

export async function POST(request, props) {
  const params = await props.params;
  const s = await surveyOf(params);
  if (!s) return Response.json({ error: 'アンケートが見つかりません' }, { status: 404 });
  if (s.status !== 'open') return Response.json({ error: 'このアンケートは受付を終了しました' }, { status: 409 });
  const user = await userOf(request);
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 60);
  if (!user && !s.allow_guest) return Response.json({ error: 'ログインしてから回答してください' }, { status: 401 });
  if (!user && !name) return Response.json({ error: 'お名前を入れてください' }, { status: 400 });
  const v = validateAnswers(s.questions || [], b.answers || {});
  if (v.error) return Response.json({ error: v.error }, { status: 400 });
  if (user) {
    const { data: cur } = await supabase.from('provider_survey_responses').select('id').eq('survey_id', s.id).eq('user_id', user.id).maybeSingle();
    if (cur) await supabase.from('provider_survey_responses').update({ answers: v.answers, respondent_name: name || null, created_at: new Date().toISOString() }).eq('id', cur.id);
    else await supabase.from('provider_survey_responses').insert({ survey_id: s.id, provider_id: s.provider_id, user_id: user.id, respondent_name: name || null, answers: v.answers });
  } else {
    await supabase.from('provider_survey_responses').insert({ survey_id: s.id, provider_id: s.provider_id, respondent_name: name, answers: v.answers });
  }
  return Response.json({ ok: true });
}
