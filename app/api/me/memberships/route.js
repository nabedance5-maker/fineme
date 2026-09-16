// GET  /api/me/memberships → ログイン中ユーザーの入会申込・会員状況一覧（店舗横断）
// POST /api/me/memberships → 入会申込の下書きを作成（本人確認書類・決済登録はこの後の
//      別ステップ。ここでは個人情報・プラン・入会日・緊急連絡先・規約同意までを保存する）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  return error ? null : user;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('provider_memberships')
    .select('id, provider_id, plan_id, status, enrollment_date, prorated_first_amount, created_at, approved_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const providerIds = [...new Set(rows.map(r => r.provider_id))];
  const planIds = [...new Set(rows.map(r => r.plan_id).filter(Boolean))];
  const [{ data: providers }, { data: plans }] = await Promise.all([
    supabase.from('providers').select('id, name, slug').in('id', providerIds),
    planIds.length ? supabase.from('provider_membership_plans').select('id, name, monthly_price').in('id', planIds) : { data: [] },
  ]);
  const providerMap = {}; (providers || []).forEach(p => { providerMap[p.id] = p; });
  const planMap = {}; (plans || []).forEach(p => { planMap[p.id] = p; });

  return Response.json(rows.map(r => ({
    ...r,
    provider_name: providerMap[r.provider_id]?.name || null,
    provider_slug: providerMap[r.provider_id]?.slug || null,
    plan_name: planMap[r.plan_id]?.name || null,
    plan_price: planMap[r.plan_id]?.monthly_price || null,
  })));
}

// 入会希望日から、その月末までの日割り額を単純日割りで見積もる（表示用の目安。
// 実際の請求額はStripeのbilling_cycle_anchorによる比例配分計算が正となる）。
function estimateProratedAmount(enrollmentDateStr, monthlyPrice) {
  const d = new Date(`${enrollmentDateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return null;
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - d.getDate() + 1;
  return Math.round((remainingDays / daysInMonth) * monthlyPrice);
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const {
    provider_id, plan_id, enrollment_date, locker_id,
    last_name, first_name, birthdate, postal_code, address, phone,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    terms_snapshot,
  } = body;

  if (!provider_id || !plan_id || !enrollment_date || !last_name?.trim() || !first_name?.trim() || !phone?.trim()) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  if (!terms_snapshot?.trim()) {
    return Response.json({ error: '規約への同意が必要です' }, { status: 400 });
  }

  // 既にこの店舗で有効な会員申込（承認待ち・会員）を持っていないか確認
  const { data: existing } = await supabase.from('provider_memberships').select('id').eq('user_id', user.id).eq('provider_id', provider_id).in('status', ['pending_approval', 'active']).limit(1);
  if (existing?.length) return Response.json({ error: 'この店舗への入会申込は既にあります' }, { status: 409 });

  const [{ data: plan }, { data: settings }] = await Promise.all([
    supabase.from('provider_membership_plans').select('monthly_price').eq('id', plan_id).eq('provider_id', provider_id).single(),
    supabase.from('provider_membership_settings').select('prorate_first_month').eq('provider_id', provider_id).maybeSingle(),
  ]);
  if (!plan) return Response.json({ error: 'プランが見つかりません' }, { status: 404 });

  const proratedAmount = (settings?.prorate_first_month ?? true) ? estimateProratedAmount(enrollment_date, plan.monthly_price) : null;

  const { data, error } = await supabase
    .from('provider_memberships')
    .insert({
      provider_id, user_id: user.id, plan_id,
      status: 'draft',
      enrollment_date, prorated_first_amount: proratedAmount,
      locker_id: locker_id || null,
      last_name: last_name.trim(), first_name: first_name.trim(),
      birthdate: birthdate || null, postal_code: postal_code || null, address: address || null, phone: phone.trim(),
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relation: emergency_contact_relation || null,
      terms_snapshot: terms_snapshot.trim(),
      terms_agreed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
