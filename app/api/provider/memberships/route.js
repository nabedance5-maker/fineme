// GET  /api/provider/memberships → 自店舗への入会申込一覧（仮契約・会員・却下。店頭で始めたカード登録待ちも含む）
// POST /api/provider/memberships → 店頭で入会手続きを始める（メンバーを選び、入会内容を入れる。この後カード登録→確定）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { billingSchedule } from '@/lib/membership-cycle';
import { planLockedResponse } from '@/lib/plan-features';
import { membershipAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';
import { ensureManualLinked, isStoreCustomer } from '@/lib/customer-accounts';
import { findCoupon } from '@/lib/membership-changes';
import { planOptionIds, planAllowsDiscount } from '@/lib/membership-plan';

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

  const { data: rows, error } = await supabase
    .from('provider_memberships')
    .select('id, user_id, plan_id, status, created_by_store, last_name, first_name, enrollment_date, prorated_first_amount, locker_id, created_at, approved_at, paused_at, pause_until, cancel_at, cancelled_at')
    .eq('provider_id', provider.id)
    // お客様が途中でやめた下書き（draft）は出さない。店頭で始めたカード登録待ちだけ出す
    .or('status.in.(pending_approval,active,rejected,cancelled),and(status.eq.draft,created_by_store.eq.true)')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const planIds = [...new Set(rows.map(r => r.plan_id).filter(Boolean))];
  const lockerIds = [...new Set(rows.map(r => r.locker_id).filter(Boolean))];
  const [{ data: plans }, { data: lockers }, { data: reqs }] = await Promise.all([
    planIds.length ? supabase.from('provider_membership_plans').select('id, name, monthly_price').in('id', planIds) : { data: [] },
    lockerIds.length ? supabase.from('provider_lockers').select('id, name').in('id', lockerIds) : { data: [] },
    supabase.from('provider_membership_changes').select('membership_id, kind').eq('provider_id', provider.id).eq('status', 'requested'),
  ]);
  const reqOf = {}; (reqs || []).forEach(r => { reqOf[r.membership_id] = r.kind; });
  const planMap = {}; (plans || []).forEach(p => { planMap[p.id] = p; });
  const lockerMap = {}; (lockers || []).forEach(l => { lockerMap[l.id] = l; });

  return Response.json(rows.map(r => ({
    ...r,
    plan_name: planMap[r.plan_id]?.name || null,
    plan_price: planMap[r.plan_id]?.monthly_price || null,
    locker_name: lockerMap[r.locker_id]?.name || null,
    pending_request: reqOf[r.id] || null,
  })));
}

const str = (v, n = 100) => { const t = String(v ?? '').trim().slice(0, n); return t || null; };

// 店頭での入会手続き（でお要望 2026-10-27：管理画面から入会手続きができるように）。
// お客様が自分で申し込む時と違い、店舗が「すでにいるメンバー」を選んで入会内容を入れる。
// 新しい人（アカウント）は作らない：メンバーのアカウントにそのまま入会を付けるので、メンバー一覧に同じ人が2人できない。
// 非会員のお客様（manual_id）を選んだ時は、裏でアカウントを用意して紐づけ、そのアカウントに入会を付ける。
// ここでは仮の申込（draft）を作るだけで課金はしない。次にカードを登録し、店舗が確定すると課金が始まる。
async function __POST(request) {
  const auth = await membershipAuth(request);
  if (auth.res) return auth.res;
  const provider = auth.provider;
  const b = await request.json().catch(() => ({}));

  const { plan_id, enrollment_date, locker_id, option_ids, coupon_code } = b;
  if (!plan_id || !/^\d{4}-\d{2}-\d{2}$/.test(enrollment_date || '')) return Response.json({ error: 'プランと入会日を選んでください' }, { status: 400 });
  if (!str(b.last_name) || !str(b.first_name) || !str(b.phone, 30)) return Response.json({ error: 'お名前（姓・名）と電話番号は必須です' }, { status: 400 });
  if (!b.terms_confirmed) return Response.json({ error: '規約・重要事項をお客様に説明し、同意を得たことの確認が必要です' }, { status: 400 });

  // メンバー（アカウント）を決める
  let userId = b.user_id || null;
  if (!userId && b.manual_id) {
    const r = await ensureManualLinked(provider.id, b.manual_id, '');
    if (r.error) return Response.json({ error: r.error }, { status: 404 });
    userId = r.userId;
  }
  if (!userId) return Response.json({ error: '入会するメンバーを選んでください' }, { status: 400 });
  if (!(await isStoreCustomer(provider.id, userId))) return Response.json({ error: '選んだお客様がこの店舗のメンバーとして見つかりません' }, { status: 404 });

  // すでに入会中・承認待ち・カード登録待ちがあれば、重ねて作らない（続きから進められるようにIDを返す）
  const { data: existing } = await supabase.from('provider_memberships').select('id, status').eq('user_id', userId).eq('provider_id', provider.id).in('status', ['draft', 'pending_approval', 'active']).order('created_at', { ascending: false });
  const busy = (existing || []).find(e => e.status !== 'draft') || (existing || [])[0];
  if (busy) {
    const msg = busy.status === 'active' ? 'このお客様はすでに入会中です。プランの変更や休会・退会は「入会手続き」の詳細から行えます' : busy.status === 'pending_approval' ? 'このお客様の入会はカード登録が済み、確定待ちです。入会手続きの一覧から確定してください' : 'このお客様の入会手続きがカード登録待ちで残っています。入会手続きの一覧から続けてください';
    return Response.json({ error: msg, existing_id: busy.id, existing_status: busy.status }, { status: 409 });
  }

  const [{ data: plan }, { data: settings }, { data: locker }] = await Promise.all([
    supabase.from('provider_membership_plans').select('id, name, monthly_price, active, included_option_ids, selectable_option_ids, discount_ids').eq('id', plan_id).eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle(),
    locker_id ? supabase.from('provider_lockers').select('monthly_fee').eq('id', locker_id).eq('provider_id', provider.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!plan || !plan.active) return Response.json({ error: 'プランが見つかりません（非公開のプランは選べません）' }, { status: 404 });
  if (locker_id && !locker) return Response.json({ error: '選んだロッカーが見つかりません' }, { status: 404 });
  if ((settings?.require_id_document ?? true) && !b.id_checked) return Response.json({ error: '本人確認書類を店頭で確認したことのチェックが必要です' }, { status: 400 });

  const optIds = planOptionIds(plan, Array.isArray(option_ids) ? option_ids.slice(0, 20) : []);
  const { data: opts } = optIds.length ? await supabase.from('provider_membership_options').select('id, monthly_price').eq('provider_id', provider.id).eq('active', true).in('id', optIds) : { data: [] };
  let discountId = null;
  if (coupon_code) {
    const r = await findCoupon(supabase, provider.id, coupon_code);
    if (r.error) return Response.json({ error: r.error }, { status: 400 });
    if (!planAllowsDiscount(plan, r.discount.id)) return Response.json({ error: 'このクーポンは選んだプランでは使えません' }, { status: 400 });
    discountId = r.discount.id;
  }

  const monthlyTotal = plan.monthly_price + (locker?.monthly_fee || 0) + (opts || []).reduce((t, o) => t + o.monthly_price, 0);
  const prorated = billingSchedule(settings, { startDate: enrollment_date, monthlyTotal }).partial?.amount ?? null;
  const gender = ['female', 'male', 'other'].includes(b.gender) ? b.gender : null;

  const { data, error } = await supabase.from('provider_memberships').insert({
    provider_id: provider.id, user_id: userId, plan_id,
    status: 'draft', created_by_store: true,
    enrollment_date, prorated_first_amount: prorated,
    locker_id: locker_id || null,
    option_ids: (opts || []).length ? opts.map(o => o.id) : null,
    discount_id: discountId,
    last_name: str(b.last_name, 30), first_name: str(b.first_name, 30),
    last_name_kana: str(b.last_name_kana, 40), first_name_kana: str(b.first_name_kana, 40),
    gender, birthdate: /^\d{4}-\d{2}-\d{2}$/.test(b.birthdate || '') ? b.birthdate : null,
    postal_code: str(b.postal_code, 10), address: str(b.address, 200), phone: str(b.phone, 30),
    emergency_contact_name: str(b.emergency_contact_name, 60), emergency_contact_phone: str(b.emergency_contact_phone, 30), emergency_contact_relation: str(b.emergency_contact_relation, 30),
    terms_snapshot: settings?.terms_text?.trim() || '（店頭でのお申し込み）お客様に規約・重要事項を説明し、同意を得ました。',
    terms_agreed_at: new Date().toISOString(),
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
