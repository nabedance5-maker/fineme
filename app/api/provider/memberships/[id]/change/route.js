// POST /api/provider/memberships/[id]/change → 会員プランの休会・再開・プラン変更・退会・退会の取り消し
// （でお要望 2026-10-19：hacomono差分 #4）。お客様の申請（request_id）を承認する時もここを使う。
// kind:'decline' は申請をお断りするだけ（Stripeは触らない）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { planLockedResponse } from '@/lib/plan-features';
import { applyMembershipChange, changeErrorMessage, CHANGE_LABEL } from '@/lib/membership-changes';
import { resolveLineTarget } from '@/lib/line-channel';
import { sendLinePush } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const stripe = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
const ymd = d => (d ? d.replace(/-/g, '/') : '');

async function __POST(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: prov } = await supabase.from('providers').select('id, name, plan').eq('id', a.provider.id).single();
  { const locked = planLockedResponse(prov, 'membership_enrollment'); if (locked) return locked; }
  const body = await request.json().catch(() => ({}));

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', prov.id).maybeSingle();
  if (!m) return Response.json({ error: '会員が見つかりません' }, { status: 404 });

  let req = null;
  if (body.request_id) {
    const { data } = await supabase.from('provider_membership_changes').select('*').eq('id', body.request_id).eq('membership_id', m.id).maybeSingle();
    if (!data || data.status !== 'requested') return Response.json({ error: 'この申請はすでに対応済みです' }, { status: 409 });
    req = data;
  }
  const operator = a.user.fineme_member?.name || 'オーナー';
  const now = new Date().toISOString();

  if (body.kind === 'decline') {
    if (!req) return Response.json({ error: '申請が見つかりません' }, { status: 404 });
    await supabase.from('provider_membership_changes').update({ status: 'declined', store_note: body.note || null, operator, decided_at: now }).eq('id', req.id);
    await notifyCustomer(m, prov, `${prov.name}より：${CHANGE_LABEL[req.kind]}のお申し込みについて、今回はお受けできませんでした。${body.note ? `\n${body.note}` : ''}\n詳しくは店舗にお問い合わせください。`);
    return Response.json({ ok: true });
  }

  const kind = req ? req.kind : body.kind;
  const opts = {
    kind,
    to_plan_id: body.to_plan_id ?? req?.to_plan_id,
    timing: body.timing ?? req?.timing,
    date: body.date ?? req?.effective_date,
    pause_until: body.pause_until ?? req?.pause_until,
    reason: body.reason ?? req?.reason,
  };
  let result;
  try {
    result = await applyMembershipChange(supabase, stripe(), m, opts);
  } catch (e) {
    return Response.json({ error: changeErrorMessage(e) }, { status: e.status || 500 });
  }

  const rec = {
    status: 'applied', from_plan_id: result.from_plan_id ?? m.plan_id, to_plan_id: result.to_plan_id ?? null,
    timing: opts.timing || null, effective_date: result.effective_date, pause_until: kind === 'pause' ? opts.pause_until || null : null,
    operator, decided_at: now,
  };
  if (req) await supabase.from('provider_membership_changes').update(rec).eq('id', req.id);
  else await supabase.from('provider_membership_changes').insert({ ...rec, provider_id: prov.id, membership_id: m.id, kind, reason: opts.reason || null, requested_by: 'store' });

  // お客様へのお知らせ（申請への返事のときは必ず、店舗の操作のときも休会・退会など契約が変わる操作は伝える）
  const { data: toPlan } = rec.to_plan_id ? await supabase.from('provider_membership_plans').select('name').eq('id', rec.to_plan_id).maybeSingle() : { data: null };
  const msg = {
    pause: `休会を受け付けました。${opts.pause_until ? `${ymd(opts.pause_until)}に再開します。` : '再開のご希望はお店にお伝えください。'}休会中の月会費はかかりません。`,
    resume: '休会から再開しました。次回から月会費の引き落としが再開します。',
    plan_change: `プランを「${toPlan?.name || ''}」に変更しました（${ymd(result.effective_date)}から新しい月額）。`,
    cancel: `退会を受け付けました。${ymd(result.effective_date)}で退会となります。これまでのご利用ありがとうございました。`,
    cancel_undo: '退会のご予定を取り消しました。引き続きご利用いただけます。',
  }[kind];
  if (msg) await notifyCustomer(m, prov, `${prov.name}より：${msg}`);

  return Response.json({ ok: true, ...result });
}

async function notifyCustomer(m, prov, text) {
  try {
    const { data: profile } = await supabase.from('profiles').select('line_user_id').eq('id', m.user_id).maybeSingle();
    const target = await resolveLineTarget(supabase, { providerId: prov.id, userId: m.user_id, fallbackLineUserId: profile?.line_user_id });
    if (target?.lineUserId) await sendLinePush(target.lineUserId, text, target.token);
  } catch (e) { console.error('[membership change notify]', e?.message); }
}

export const POST = withAudit(__POST);
