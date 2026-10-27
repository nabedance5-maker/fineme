// GET    /api/provider/memberships/[id] → 申込詳細（本人確認書類は署名付きURLを都度発行）。同じ人かもしれない非会員・メンバーの候補も返す
// PATCH  /api/provider/memberships/[id] → 入会情報の編集（お名前・連絡先など。確定前はプラン・入会日・ロッカー・オプションも）
// DELETE /api/provider/memberships/[id] → 店頭で始めた、カード登録待ちの入会手続きを取りやめる
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { planLockedResponse } from '@/lib/plan-features';
import { periodEndOf, discountText, findCoupon } from '@/lib/membership-changes';
import { membershipAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';
import { planOptionIds, planAllowsDiscount } from '@/lib/membership-plan';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });

  const [{ data: profile }, { data: plan }, { data: locker }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', m.user_id).single(),
    m.plan_id ? supabase.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).single() : Promise.resolve({ data: null }),
    m.locker_id ? supabase.from('provider_lockers').select('name').eq('id', m.locker_id).single() : Promise.resolve({ data: null }),
  ]);

  // 休会・プラン変更・退会の履歴と申請、変更先に選べるプラン、次回の引き落とし日（でお要望 2026-10-19）
  const [{ data: changes }, { data: plans }, { data: optionItems }, { data: options }, { data: discounts }] = await Promise.all([
    supabase.from('provider_membership_changes').select('*').eq('membership_id', m.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('provider_membership_plans').select('id, name, monthly_price, active').eq('provider_id', provider.id).order('sort_order'),
    supabase.from('provider_membership_option_items').select('id, option_id, name, monthly_price, started_at').eq('membership_id', m.id).eq('status', 'active').order('started_at'),
    supabase.from('provider_membership_options').select('id, name, monthly_price').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_discounts').select('id, name, kind, value, duration, months, code, active').eq('provider_id', provider.id).order('created_at', { ascending: false }),
  ]);
  const discountOf = Object.fromEntries((discounts || []).map(d => [d.id, d]));
  const pendingOptions = m.status === 'pending_approval' && m.option_ids?.length
    ? (await supabase.from('provider_membership_options').select('id, name, monthly_price').in('id', m.option_ids)).data || []
    : [];
  const planName = Object.fromEntries((plans || []).map(p => [p.id, p.name]));
  let next_charge_date = null;
  if (m.status === 'active' && m.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const sub = await new Stripe(process.env.STRIPE_SECRET_KEY).subscriptions.retrieve(m.stripe_subscription_id);
      const end = periodEndOf(sub);
      if (end && !sub.pause_collection) next_charge_date = new Date(end * 1000 + 9 * 3600000).toISOString().slice(0, 10);
    } catch { /* Stripeに繋がらない時は省く */ }
  }

  // 同じ人かもしれないお客様（でお指摘 2026-10-27：メンバーを追加してその人の入会を進めると、メンバーが2人になる）。
  // 自動では統合せず、店舗が確かめて選ぶ。①まだ会員に紐づいていない非会員（同じ名前か電話番号）→「同じ方です」で紐づけられる
  // ②この店舗の別のメンバー（同じ名前か電話番号）→ 見つけたことだけ知らせる
  const norm = v => String(v || '').replace(/[\s\u3000]/g, '');
  const digits = v => String(v || '').replace(/\D/g, '');
  const myName = norm(`${m.last_name || ''}${m.first_name || ''}`);
  const myPhone = digits(m.phone);
  let manual_candidates = [];
  let same_person_members = [];
  if (m.user_id && (myName || myPhone.length >= 10)) {
    const [{ data: manuals }, { data: profs }] = await Promise.all([
      supabase.from('provider_manual_customers').select('id, display_name').eq('provider_id', provider.id).is('linked_user_id', null),
      supabase.from('provider_customer_profiles').select('user_id, manual_customer_id, last_name, first_name, phone').eq('provider_id', provider.id),
    ]);
    const phoneOfManual = Object.fromEntries((profs || []).filter(x => x.manual_customer_id).map(x => [x.manual_customer_id, x.phone]));
    manual_candidates = (manuals || []).filter(x => (myName && norm(x.display_name) === myName) || (myPhone.length >= 10 && digits(phoneOfManual[x.id]) === myPhone))
      .slice(0, 5).map(x => ({ id: x.id, name: x.display_name }));
    same_person_members = (profs || []).filter(x => x.user_id && x.user_id !== m.user_id && ((myName && norm(`${x.last_name || ''}${x.first_name || ''}`) === myName) || (myPhone.length >= 10 && digits(x.phone) === myPhone)))
      .slice(0, 5).map(x => ({ user_id: x.user_id, name: `${x.last_name || ''} ${x.first_name || ''}`.trim() || '（名前なし）' }));
  }

  let id_document_url = null;
  if (m.id_document_path) {
    const { data: signed } = await supabase.storage.from('id-documents').createSignedUrl(m.id_document_path, 300);
    id_document_url = signed?.signedUrl || null;
  }

  return Response.json({
    ...m,
    customer_name: profile?.display_name || null,
    id_document_url,
    plan_name: plan?.name || null,
    plan_price: plan?.monthly_price ?? null,
    locker_name: locker?.name || null,
    next_charge_date,
    manual_candidates,
    same_person_members,
    plans: (plans || []).filter(p => p.active || p.id === m.plan_id),
    option_items: optionItems || [],
    pending_options: pendingOptions,
    options: options || [],
    discount: m.discount_id && discountOf[m.discount_id] ? { ...discountOf[m.discount_id], text: discountText(discountOf[m.discount_id]) } : null,
    discounts: (discounts || []).filter(d => d.active).map(d => ({ id: d.id, name: d.name, text: discountText(d) })),
    changes: (changes || []).map(c => ({ ...c, from_plan_name: planName[c.from_plan_id] || null, to_plan_name: planName[c.to_plan_id] || null })),
  });
}

const str = (v, n = 100) => { const t = String(v ?? '').trim().slice(0, n); return t || null; };
function estimateProratedAmount(enrollmentDateStr, monthlyPrice) {
  const d = new Date(`${enrollmentDateStr}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return null;
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.round(((daysInMonth - d.getDate() + 1) / daysInMonth) * monthlyPrice);
}

// 入会情報の編集（でお要望 2026-10-27：編集でいろいろ直せるように）。
// お名前・連絡先などは、確定後も直せる。プラン・入会日・ロッカー・オプション・クーポンは、まだ課金が始まっていない（確定前）の間だけ。
// 確定後（課金が始まった後）のプラン変更・休会・退会・オプションの付け外しは、これまでどおり /change で行う（Stripeの課金に反映するため）。
async function __PATCH(request, { params }) {
  const { id } = await params;
  const auth = await membershipAuth(request);
  if (auth.res) return auth.res;
  const provider = auth.provider;
  const b = await request.json().catch(() => ({}));

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (['rejected', 'cancelled'].includes(m.status)) return Response.json({ error: 'この入会は終了しているため編集できません' }, { status: 409 });

  const patch = {};
  const text = { last_name: 30, first_name: 30, last_name_kana: 40, first_name_kana: 40, postal_code: 10, address: 200, phone: 30, emergency_contact_name: 60, emergency_contact_phone: 30, emergency_contact_relation: 30 };
  for (const [k, n] of Object.entries(text)) if (k in b) patch[k] = str(b[k], n);
  if ('gender' in b) patch.gender = ['female', 'male', 'other'].includes(b.gender) ? b.gender : null;
  if ('birthdate' in b) patch.birthdate = /^\d{4}-\d{2}-\d{2}$/.test(b.birthdate || '') ? b.birthdate : null;
  if (('last_name' in patch && !patch.last_name) || ('first_name' in patch && !patch.first_name) || ('phone' in patch && !patch.phone)) {
    return Response.json({ error: 'お名前（姓・名）と電話番号は空にできません' }, { status: 400 });
  }

  const beforeApproval = ['draft', 'pending_approval'].includes(m.status);
  const touchesContract = ['plan_id', 'enrollment_date', 'locker_id', 'option_ids', 'coupon_code'].some(k => k in b);
  if (touchesContract) {
    if (!beforeApproval) return Response.json({ error: '課金が始まった後のプラン・オプション・割引の変更は、入会手続きの詳細にある「プランを変更する」などから行ってください' }, { status: 409 });
    const planId = b.plan_id || m.plan_id;
    const date = 'enrollment_date' in b ? b.enrollment_date : m.enrollment_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return Response.json({ error: '入会日を選んでください' }, { status: 400 });
    const lockerId = 'locker_id' in b ? (b.locker_id || null) : m.locker_id;
    const [{ data: plan }, { data: settings }, { data: locker }] = await Promise.all([
      supabase.from('provider_membership_plans').select('id, monthly_price, active, included_option_ids, selectable_option_ids, discount_ids').eq('id', planId).eq('provider_id', provider.id).maybeSingle(),
      supabase.from('provider_membership_settings').select('prorate_first_month').eq('provider_id', provider.id).maybeSingle(),
      lockerId ? supabase.from('provider_lockers').select('monthly_fee').eq('id', lockerId).eq('provider_id', provider.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (!plan || (!plan.active && planId !== m.plan_id)) return Response.json({ error: 'プランが見つかりません' }, { status: 404 });
    if (lockerId && !locker) return Response.json({ error: '選んだロッカーが見つかりません' }, { status: 404 });
    const chosen = 'option_ids' in b ? (Array.isArray(b.option_ids) ? b.option_ids.slice(0, 20) : []) : (m.option_ids || []);
    const optIds = planOptionIds(plan, chosen);
    const { data: opts } = optIds.length ? await supabase.from('provider_membership_options').select('id, monthly_price').eq('provider_id', provider.id).eq('active', true).in('id', optIds) : { data: [] };
    let discountId = m.discount_id;
    if ('coupon_code' in b) {
      if (!String(b.coupon_code || '').trim()) discountId = null;
      else {
        const r = await findCoupon(supabase, provider.id, b.coupon_code);
        if (r.error) return Response.json({ error: r.error }, { status: 400 });
        if (!planAllowsDiscount(plan, r.discount.id)) return Response.json({ error: 'このクーポンは選んだプランでは使えません' }, { status: 400 });
        discountId = r.discount.id;
      }
    } else if (discountId && !planAllowsDiscount(plan, discountId)) discountId = null; // プランを変えて使えなくなった割引は外す
    const monthlyTotal = plan.monthly_price + (locker?.monthly_fee || 0) + (opts || []).reduce((t, o) => t + o.monthly_price, 0);
    Object.assign(patch, {
      plan_id: planId, enrollment_date: date, locker_id: lockerId,
      option_ids: (opts || []).length ? opts.map(o => o.id) : null,
      discount_id: discountId,
      prorated_first_amount: (settings?.prorate_first_month ?? true) ? estimateProratedAmount(date, monthlyTotal) : null,
    });
  }
  if (!Object.keys(patch).length) return Response.json({ error: '変更する項目がありません' }, { status: 400 });

  const { data, error } = await supabase.from('provider_memberships').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
export const PATCH = withAudit(__PATCH);

async function __DELETE(request, { params }) {
  const { id } = await params;
  const auth = await membershipAuth(request);
  if (auth.res) return auth.res;
  const { data: m } = await supabase.from('provider_memberships').select('id, status, created_by_store').eq('id', id).eq('provider_id', auth.provider.id).maybeSingle();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (!m.created_by_store || m.status !== 'draft') return Response.json({ error: '取りやめできるのは、店頭で始めて、まだカードを登録していない入会手続きだけです' }, { status: 409 });
  const { error } = await supabase.from('provider_memberships').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const DELETE = withAudit(__DELETE);
