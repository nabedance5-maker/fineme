// GET /api/provider/customers → New Me Logを自店舗に紐づけている顧客の一覧（認証済み）
// ユーザー自身の想定タイミング超過／店舗推奨周期超過のセグメント判定、店舗専用メモも合わせて返す。
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
  const [{ data: profiles }, { data: recFreqRows }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('provider_recommended_frequencies').select('axis, frequency_weeks, frequency_months').eq('provider_id', provider.id),
    supabase.from('provider_customer_notes').select('user_id, note').eq('provider_id', provider.id).in('user_id', userIds),
  ]);

  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  const recommended = {};
  (recFreqRows || []).forEach(r => { recommended[r.axis] = r; });
  const noteMap = {};
  (notes || []).forEach(n => { noteMap[n.user_id] = n.note; });

  const result = logs.map(l => ({
    ...l,
    customer_name: nameMap[l.user_id] || '(名前未設定)',
    userOverdueDays: daysUntilIdeal(l),
    storeOverdueDays: storeDaysUntilIdeal(l, recommended),
    hasStoreNote: !!noteMap[l.user_id],
  }));

  return Response.json(result);
}
