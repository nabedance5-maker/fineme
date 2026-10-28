// GET   /api/provider/membership-settings → 自店舗の入会手続き設定を取得
// PATCH /api/provider/membership-settings → 保存
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { normalizeTermsFiles } from '@/lib/membership-terms';
import { normalizeCycle, cycleError } from '@/lib/membership-cycle';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { normalizeFormFields } from '@/lib/membership-form';
import { normalizeQuestions } from '@/lib/surveys';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  const { data } = await supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle();
  return Response.json({
    prorate_first_month: data?.prorate_first_month ?? true,
    ...normalizeCycle(data), // 請求日・初月の扱い・退会の締め日（でお指摘 2026-10-27）
    initial_fee_timing: data?.initial_fee_timing === 'first_dues' ? 'first_dues' : 'approval', // 入会金をいつ請求するか（2026-10-27）
    require_id_document: data?.require_id_document ?? true,
    allow_online_requests: data?.allow_online_requests ?? true,
    form_fields: normalizeFormFields(data?.form_fields),
    custom_fields: data?.custom_fields || [],
    terms_text: data?.terms_text || '',
    terms_files: normalizeTermsFiles(data?.terms_files),
  });
}

async function __PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const update = { provider_id: provider.id, updated_at: new Date().toISOString() };
  if ('prorate_first_month' in body) update.prorate_first_month = !!body.prorate_first_month;
  // 請求日・初月の扱い・退会の締め日。変えても、すでに入会中の会員の請求日は変わらない（新しく承認する会員から）
  if (['billing_mode', 'billing_day', 'billing_month_offset', 'first_month', 'cancel_cutoff_day', 'cancel_cutoff_days_before'].some(k => k in body)) {
    const { data: cur } = await supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle();
    const c = normalizeCycle({ ...(cur || {}), ...body });
    const bad = cycleError(c);
    if (bad) return Response.json({ error: bad }, { status: 400 });
    Object.assign(update, c);
    update.prorate_first_month = c.first_month === 'prorate';
  }
  if ('initial_fee_timing' in body) update.initial_fee_timing = body.initial_fee_timing === 'first_dues' ? 'first_dues' : 'approval';
  if ('require_id_document' in body) update.require_id_document = !!body.require_id_document;
  if ('allow_online_requests' in body) update.allow_online_requests = !!body.allow_online_requests;
  if ('terms_text' in body) update.terms_text = body.terms_text || null;
  // 入会フォームの項目（でお要望 2026-10-19：hacomono差分 #10）
  if ('form_fields' in body) update.form_fields = normalizeFormFields(body.form_fields);
  if ('custom_fields' in body) {
    const q = normalizeQuestions((body.custom_fields || []).filter(x => x?.type !== 'rating'));
    if (q.error) return Response.json({ error: q.error }, { status: 400 });
    if (q.questions.length > 10) return Response.json({ error: '追加の質問は10個までです' }, { status: 400 });
    update.custom_fields = q.questions;
  }

  const { error } = await supabase.from('provider_membership_settings').upsert(update);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
