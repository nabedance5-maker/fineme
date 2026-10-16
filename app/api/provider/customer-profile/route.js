// GET /api/provider/customer-profile?user_id=... | ?manual_id=... → 顧客の基本情報（住所・電話・緊急連絡先など）とお支払い方法
// PUT /api/provider/customer-profile { user_id | manual_id, ...項目 } → 保存
//
// でお要望（2026-10-16）：hacomonoのように住所・電話番号なども登録して見られるように。オンライン入会で
// 入力してもらった内容やカード情報も顧客情報に入れておく。
// 保存していない項目は、オンライン入会の申込内容 → Fineme会員の登録情報 の順で補って表示する（出どころ付き）。
// カードはStripeが保持するブランド・下4桁・有効期限だけを表示し、番号はFinemeに保存しない。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { PROFILE_FIELDS, normalizeProfile, profileFromMembership, ageOf } from '@/lib/customer-profile';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MEMBERSHIP_STATUS = { draft: '申込の途中', pending_approval: '承認待ち', active: '入会中', rejected: 'お断り', cancelled: '退会' };

async function getProvider(request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

// この店舗のお客様か（予約・New Me Log・入会・メモ・カルテ・回数券のどれかでつながっている）
async function isOwnMember(provider, userId) {
  const checks = await Promise.all([
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
    provider.slug ? supabase.from('user_service_logs').select('id', { count: 'exact', head: true }).eq('provider_slug', provider.slug).eq('user_id', userId) : { count: 0 },
    supabase.from('provider_memberships').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
    supabase.from('provider_customer_notes').select('user_id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
    supabase.from('provider_karte_entries').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
    supabase.from('customer_packages').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
    supabase.from('provider_customer_profiles').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId),
  ]);
  return checks.some(c => (c.count || 0) > 0);
}

async function resolveTarget(provider, { userId, manualId }) {
  if (userId) return (await isOwnMember(provider, userId)) ? { user_id: userId } : null;
  if (manualId) {
    const { data } = await supabase.from('provider_manual_customers').select('id, linked_user_id').eq('id', manualId).eq('provider_id', provider.id).maybeSingle();
    return data ? { manual_customer_id: data.id } : null;
  }
  return null;
}

async function cardOf(paymentMethodId) {
  if (!paymentMethodId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const pm = await new Stripe(process.env.STRIPE_SECRET_KEY).paymentMethods.retrieve(paymentMethodId);
    return pm?.card ? { brand: pm.card.brand, last4: pm.card.last4, exp_month: pm.card.exp_month, exp_year: pm.card.exp_year } : null;
  } catch { return null; }
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const target = await resolveTarget(provider, { userId: sp.get('user_id'), manualId: sp.get('manual_id') });
  if (!target) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });

  const key = target.user_id ? ['user_id', target.user_id] : ['manual_customer_id', target.manual_customer_id];
  const [{ data: saved }, memRes] = await Promise.all([
    supabase.from('provider_customer_profiles').select('*').eq('provider_id', provider.id).eq(key[0], key[1]).maybeSingle(),
    target.user_id
      ? supabase.from('provider_memberships').select('id, status, plan_id, enrollment_date, last_name, first_name, birthdate, postal_code, address, phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, stripe_payment_method_id, created_at').eq('provider_id', provider.id).eq('user_id', target.user_id).neq('status', 'draft').order('created_at', { ascending: false })
      : { data: [] },
  ]);
  const memberships = memRes.data || [];
  const planIds = [...new Set(memberships.map(m => m.plan_id).filter(Boolean))];
  const { data: plans } = planIds.length ? await supabase.from('provider_membership_plans').select('id, name, monthly_price').in('id', planIds) : { data: [] };
  const planOf = Object.fromEntries((plans || []).map(p => [p.id, p]));

  // 保存されていない項目を補う：オンライン入会の申込 → Fineme会員の登録情報
  const profile = {};
  const sources = {};
  PROFILE_FIELDS.forEach(f => { profile[f] = saved?.[f] ?? (f === 'mail_opt_in' ? false : null); });
  const fill = (vals, label) => Object.entries(vals).forEach(([k, v]) => {
    if ((profile[k] === null || profile[k] === '') && v !== null && v !== undefined && v !== '') { profile[k] = v; sources[k] = label; }
  });
  if (memberships[0]) fill(profileFromMembership(memberships[0]), 'オンライン入会');
  if (target.user_id) {
    const [{ data: pr }, authRes] = await Promise.all([
      supabase.from('profiles').select('last_name, first_name, phone, birthday').eq('id', target.user_id).maybeSingle(),
      supabase.auth.admin.getUserById(target.user_id).catch(() => ({ data: null })),
    ]);
    fill(normalizeProfile({ last_name: pr?.last_name, first_name: pr?.first_name, phone: pr?.phone, birthday: pr?.birthday, email: /@line\.fineme\.me$/i.test(authRes?.data?.user?.email || '') ? null : authRes?.data?.user?.email }), 'Fineme会員情報');
  }

  const payments = await Promise.all(memberships.map(async m => ({
    kind: '会員プラン',
    name: planOf[m.plan_id]?.name || '会員プラン',
    monthly_price: planOf[m.plan_id]?.monthly_price ?? null,
    status: MEMBERSHIP_STATUS[m.status] || m.status,
    since: m.enrollment_date,
    card: await cardOf(m.stripe_payment_method_id),
  })));

  return Response.json({ profile, sources, saved: !!saved, updated_at: saved?.updated_at || null, updated_by: saved?.updated_by || null, age: ageOf(profile.birthday), payments });
}

function operatorOf(request) {
  try { return decodeURIComponent(request.headers.get('x-fineme-operator') || '').trim().slice(0, 40) || '店舗アカウント'; } catch { return '店舗アカウント'; }
}

async function __PUT(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const target = await resolveTarget(provider, { userId: body.user_id, manualId: body.manual_id });
  if (!target) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
  const fields = normalizeProfile(body);
  if (body.email && !fields.email) return Response.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 });
  const row = { provider_id: provider.id, ...target, ...fields, updated_by: operatorOf(request), updated_at: new Date().toISOString() };
  const key = target.user_id ? ['user_id', target.user_id] : ['manual_customer_id', target.manual_customer_id];
  const { data: existing } = await supabase.from('provider_customer_profiles').select('id').eq('provider_id', provider.id).eq(key[0], key[1]).maybeSingle();
  const q = existing
    ? supabase.from('provider_customer_profiles').update(row).eq('id', existing.id)
    : supabase.from('provider_customer_profiles').insert(row);
  const { error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const PUT = withAudit(__PUT);
