// GET/PATCH/DELETE /api/provider/surveys/[id] → アンケートの結果（集計と回答一覧）・編集・削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { normalizeQuestions, summarize } from '@/lib/surveys';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function load(request, params) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return { res: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: s } = await supabase.from('provider_surveys').select('*').eq('id', id).eq('provider_id', a.provider.id).maybeSingle();
  if (!s) return { res: Response.json({ error: '見つかりません' }, { status: 404 }) };
  return { a, s };
}

export async function GET(request, { params }) {
  const { res, a, s } = await load(request, params); if (res) return res;
  const { data: rows } = await supabase.from('provider_survey_responses').select('id, user_id, respondent_name, answers, created_at').eq('survey_id', s.id).order('created_at', { ascending: false }).limit(5000);
  const uids = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))];
  const names = {};
  for (let i = 0; i < uids.length; i += 300) {
    const part = uids.slice(i, i + 300);
    const [{ data: prof }, { data: cp }] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', part),
      supabase.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', a.provider.id).in('user_id', part),
    ]);
    (prof || []).forEach(p => { names[p.id] = p.display_name; });
    (cp || []).forEach(p => { const n = [p.last_name, p.first_name].filter(Boolean).join(' '); if (n) names[p.user_id] = n; });
  }
  const responses = (rows || []).map(r => ({ ...r, name: (r.user_id && names[r.user_id]) || r.respondent_name || '（お名前なし）' }));
  return Response.json({ survey: s, summary: summarize(s.questions || [], responses), responses });
}

async function __PATCH(request, { params }) {
  const { res, s } = await load(request, params); if (res) return res;
  const b = await request.json().catch(() => ({}));
  const up = { updated_at: new Date().toISOString() };
  if ('title' in b) { up.title = String(b.title || '').trim().slice(0, 100); if (!up.title) return Response.json({ error: 'タイトルを入れてください' }, { status: 400 }); }
  if ('description' in b) up.description = String(b.description || '').slice(0, 1000) || null;
  if ('status' in b) up.status = b.status === 'closed' ? 'closed' : 'open';
  if ('allow_guest' in b) up.allow_guest = !!b.allow_guest;
  if ('questions' in b) {
    const q = normalizeQuestions(b.questions);
    if (q.error) return Response.json({ error: q.error }, { status: 400 });
    if (!q.questions.length) return Response.json({ error: '質問を1つ以上作ってください' }, { status: 400 });
    up.questions = q.questions;
  }
  const { data } = await supabase.from('provider_surveys').update(up).eq('id', s.id).select().single();
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { res, s } = await load(request, params); if (res) return res;
  await supabase.from('provider_surveys').delete().eq('id', s.id);
  return Response.json({ ok: true });
}
export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
