// GET  /api/provider/store-members → お店の会員の一覧（?user_id= で1人分の持っているチケット。顧客管理・予約カレンダーから使う）
// POST /api/provider/store-members → 管理画面から会員を登録する（でお要望 2026-10-22）
//   メールアドレスのFinemeアカウントが無ければ作る。既にFinemeを使っている方のアドレスなら、そのアカウントに紐づける。
//   （お客様が自分で会員登録する仕組みは2026-10-22に廃止。会員登録はお店だけが行う）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { profileFields, upsertProfile, findOrCreateUser } from '@/lib/store-members';
import { customerEntitlements } from '@/lib/booking-eligibility';
import { isStoreCustomer } from '@/lib/store-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const q = new URL(request.url).searchParams;
  const [{ data: rows }, { data: profiles }, { data: mems }, { data: plans }] = await Promise.all([
    supabase.from('provider_store_members').select('id, user_id, status, registered_by, joined_at').eq('provider_id', pid).order('joined_at', { ascending: false }).limit(2000),
    supabase.from('provider_customer_profiles').select('user_id, last_name, first_name, last_name_kana, first_name_kana, phone, email').eq('provider_id', pid),
    supabase.from('provider_memberships').select('user_id, plan_id, status, paused_at').eq('provider_id', pid).in('status', ['active', 'pending_approval']),
    supabase.from('provider_membership_plans').select('id, name').eq('provider_id', pid),
  ]);
  const prof = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  const planName = Object.fromEntries((plans || []).map(p => [p.id, p.name]));
  let list = (rows || []).map(m => {
    const p = prof[m.user_id] || {};
    const ms = (mems || []).find(x => x.user_id === m.user_id);
    return {
      ...m,
      name: [p.last_name, p.first_name].filter(Boolean).join(' ') || '（お名前未登録）',
      kana: [p.last_name_kana, p.first_name_kana].filter(Boolean).join(' '),
      phone: p.phone || '', email: p.email || '',
      plan: ms ? `${planName[ms.plan_id] || 'プラン'}${ms.status === 'pending_approval' ? '（承認待ち）' : ms.paused_at ? '（休会中）' : ''}` : '',
    };
  });
  const kw = (q.get('q') || '').trim();
  if (kw) list = list.filter(m => [m.name, m.kana, m.phone, m.email].some(v => (v || '').includes(kw)));
  // 1人だけ詳しく（持っているチケット）。会員登録していなくても、このお店のお客様なら返す
  if (q.get('user_id')) {
    const uid = q.get('user_id');
    const m = list.find(x => x.user_id === uid);
    if (!m && !(await isStoreCustomer(pid, uid))) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
    const ent = await customerEntitlements(supabase, pid, uid);
    return Response.json({ ...(m || { user_id: uid, status: null }), tickets: ent.tickets });
  }
  return Response.json(list);
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const b = await request.json().catch(() => ({}));
  const f = profileFields(b);
  if (!f.last_name && !f.first_name) return Response.json({ error: 'お名前を入れてください' }, { status: 400 });
  const noEmail = !!b.no_email;
  const email = String(b.email || '').trim().toLowerCase();
  if (!noEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスを入れてください（お持ちでない方は「メールアドレスなし」）' }, { status: 400 });
  let found;
  try {
    // メールアドレスをお持ちでない方（店頭のみのご利用）は、届かない形のアドレスでアカウントだけ作る
    found = await findOrCreateUser(noEmail ? `member-${crypto.randomUUID()}@noemail.fineme.invalid` : email);
  } catch (e) {
    console.error('[provider/members POST]', e);
    return Response.json({ error: '会員を作れませんでした' }, { status: 500 });
  }
  const userId = found.user.id;
  const { data: exists } = await supabase.from('provider_store_members').select('id, status').eq('provider_id', pid).eq('user_id', userId).maybeSingle();
  if (exists && exists.status !== 'withdrawn') return Response.json({ error: 'このメールアドレスの方は既に会員です' }, { status: 409 });
  const status = 'active';
  const row = { provider_id: pid, user_id: userId, status, registered_by: 'store', joined_at: new Date().toISOString(), withdrawn_at: null };
  const { data, error } = exists
    ? await supabase.from('provider_store_members').update(row).eq('id', exists.id).select().single()
    : await supabase.from('provider_store_members').insert(row).select().single();
  if (error) return Response.json({ error: '会員を登録できませんでした' }, { status: 500 });
  await upsertProfile(pid, userId, { ...f, email: noEmail ? null : email }, 'お店で会員登録');
  return Response.json({ ...data, existed: found.existed }, { status: 201 });
}
export const POST = withAudit(__POST);
