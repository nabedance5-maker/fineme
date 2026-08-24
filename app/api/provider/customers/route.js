// GET /api/provider/customers → New Me Logを自店舗に紐づけている顧客の一覧（認証済み）
// ユーザー自身の想定タイミング超過／店舗推奨周期超過のセグメント判定、店舗専用メモ・
// 担当スタッフ割当・来店回数・Mirror/Me Scanの実施状況・休眠ステータスも合わせて返す
// （店舗SaaS実装仕様書 SAAS-001〜SAAS-004, SAAS-008, SAAS-012）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { idealNextDate, daysUntilIdeal } from '@/lib/log-axes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

// 店舗が設定した推奨周期に基づく「目安日」を、ユーザー自身の頻度は無視して計算する
// （lib/log-axes.js の idealNextDate はログ自身の frequency_weeks/months を見るため、
//  店舗推奨だけを見せるログを一時的に組み立てて同じロジックに通す）
function storeIdealNextDate(log, recommended) {
  const rec = recommended[log.axis];
  if (!rec || !log.last_visit) return null;
  return idealNextDate({ ...log, frequency_weeks: rec.frequency_weeks, frequency_months: rec.frequency_months });
}
function storeDaysUntilIdeal(log, recommended) {
  const ideal = storeIdealNextDate(log, recommended);
  if (!ideal) return null;
  return Math.round((new Date(ideal) - new Date()) / 86400000);
}

// 絶対的な未来店日数から active/dormant を判定する（店舗ごとのしきい値・SAAS-012）。
// ユーザー想定/店舗推奨の「そろそろ」判定（相対的）とは別の軸。
// 来店記録が一度も無いログは、登録からの経過日数で判定する。
function computeStatus(log, noVisitDays) {
  const base = log.last_visit || log.created_at;
  if (!base) return 'active';
  const daysSince = Math.floor((Date.now() - new Date(base).getTime()) / 86400000);
  if (daysSince >= noVisitDays * 2) return 'churned';
  if (daysSince >= noVisitDays) return 'dormant';
  return 'active';
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: logs, error } = await supabase
    .from('user_service_logs')
    .select('id, user_id, axis, name, last_visit, next_visit, frequency_weeks, frequency_months, cost, created_at')
    .eq('provider_slug', provider.slug)
    .eq('active', true)
    .order('next_visit', { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!logs?.length) return Response.json([]);

  const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
  const logIds = logs.map(l => l.id);

  const [
    { data: profiles },
    { data: recFreqRows },
    { data: notes },
    { data: dormantSettings },
    { data: staffRows },
    { data: visitRows },
    { data: diagnosisRows },
    { data: mirrorRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('provider_recommended_frequencies').select('axis, frequency_weeks, frequency_months').eq('provider_id', provider.id),
    supabase.from('provider_customer_notes').select('user_id, note, assigned_staff_id').eq('provider_id', provider.id).in('user_id', userIds),
    supabase.from('provider_dormant_settings').select('no_visit_days').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id),
    supabase.from('user_service_log_visits').select('log_id').in('log_id', logIds),
    supabase.from('diagnosis_results').select('user_id').in('user_id', userIds),
    supabase.from('mirror_sessions')
      .select('user_id, report_content, created_at')
      .in('user_id', userIds)
      .eq('paid', true)
      .not('report_content', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  const recommended = {};
  (recFreqRows || []).forEach(r => { recommended[r.axis] = r; });
  const noteMap = {};
  const assignedStaffMap = {};
  (notes || []).forEach(n => { noteMap[n.user_id] = n.note; assignedStaffMap[n.user_id] = n.assigned_staff_id || null; });
  const staffNameMap = {};
  (staffRows || []).forEach(s => { staffNameMap[s.id] = s.name; });
  const noVisitDays = dormantSettings?.no_visit_days || 90;

  const visitCountByLog = {};
  (visitRows || []).forEach(v => { visitCountByLog[v.log_id] = (visitCountByLog[v.log_id] || 0) + 1; });

  const meScanDoneSet = new Set((diagnosisRows || []).map(d => d.user_id));

  // ユーザーごとの最新Mirror結果（created_at降順で取得済みなので最初の1件を採用）
  const mirrorByUser = {};
  (mirrorRows || []).forEach(m => {
    if (mirrorByUser[m.user_id]) return;
    mirrorByUser[m.user_id] = {
      visualScore: m.report_content?.visual_score ?? null,
      visualTier: m.report_content?.visual_tier || null,
    };
  });

  const result = logs.map(l => {
    const assignedStaffId = assignedStaffMap[l.user_id] || null;
    return {
      ...l,
      customer_name: nameMap[l.user_id] || '(名前未設定)',
      userOverdueDays: daysUntilIdeal(l),
      storeOverdueDays: storeDaysUntilIdeal(l, recommended),
      hasStoreNote: !!noteMap[l.user_id],
      visitCount: visitCountByLog[l.id] || 0,
      status: computeStatus(l, noVisitDays),
      meScanDone: meScanDoneSet.has(l.user_id),
      mirror: mirrorByUser[l.user_id] || null,
      assignedStaffId,
      assignedStaffName: assignedStaffId ? (staffNameMap[assignedStaffId] || null) : null,
    };
  });

  return Response.json(result);
}
