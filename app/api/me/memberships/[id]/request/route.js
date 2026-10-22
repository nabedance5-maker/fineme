// POST /api/me/memberships/[id]/request → お客様がマイページから休会・再開・プラン変更・退会を申請する
// （でお要望 2026-10-19：hacomono差分 #4）。契約はまだ変えず、店舗が承認した時に変わる。
// action:'withdraw' で自分の申請を取り下げる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { CHANGE_LABEL } from '@/lib/membership-changes';
import { sendMembershipRequestEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { providerRecipients } from '@/lib/provider-recipients';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const ymd = d => (d ? d.replace(/-/g, '/') : '');

export async function POST(request, { params }) {
  const { id } = await params;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).maybeSingle();
  if (!m || m.user_id !== user.id) return Response.json({ error: '見つかりません' }, { status: 404 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'withdraw') {
    const { data: r } = await supabase.from('provider_membership_changes').update({ status: 'withdrawn', decided_at: new Date().toISOString() })
      .eq('id', body.request_id).eq('membership_id', m.id).eq('status', 'requested').select('id').maybeSingle();
    if (!r) return Response.json({ error: 'この申請はすでに対応済みです' }, { status: 409 });
    return Response.json({ ok: true });
  }

  if (m.status !== 'active') return Response.json({ error: '入会中の会員プランではありません' }, { status: 409 });
  const { data: settings } = await supabase.from('provider_membership_settings').select('allow_online_requests').eq('provider_id', m.provider_id).maybeSingle();
  if (settings && settings.allow_online_requests === false) return Response.json({ error: 'この店舗では、休会・退会などのお手続きを店頭で受け付けています。店舗にお問い合わせください' }, { status: 403 });
  const { data: pending } = await supabase.from('provider_membership_changes').select('id').eq('membership_id', m.id).eq('status', 'requested').limit(1).maybeSingle();
  if (pending) return Response.json({ error: '店舗が確認中の申請があります。取り下げてから申請し直してください' }, { status: 409 });

  const kind = body.kind;
  const row = { provider_id: m.provider_id, membership_id: m.id, kind, status: 'requested', requested_by: 'customer', from_plan_id: m.plan_id, reason: String(body.reason || '').slice(0, 500) || null };
  if (kind === 'pause') {
    if (m.paused_at) return Response.json({ error: 'すでに休会中です' }, { status: 409 });
    if (body.pause_until && body.pause_until <= today()) return Response.json({ error: '再開日は明日以降を選んでください' }, { status: 400 });
    row.pause_until = body.pause_until || null;
  } else if (kind === 'resume') {
    if (!m.paused_at) return Response.json({ error: '休会中ではありません' }, { status: 409 });
  } else if (kind === 'plan_change') {
    const { data: to } = await supabase.from('provider_membership_plans').select('id').eq('id', body.to_plan_id).eq('provider_id', m.provider_id).eq('active', true).maybeSingle();
    if (!to || to.id === m.plan_id) return Response.json({ error: '変更先のプランを選んでください' }, { status: 400 });
    row.to_plan_id = to.id;
    row.timing = 'period_end';
  } else if (kind === 'cancel') {
    if (m.cancel_at) return Response.json({ error: 'すでに退会のご予定があります' }, { status: 409 });
    if (body.effective_date) {
      if (body.effective_date <= today()) return Response.json({ error: '退会日は明日以降を選んでください' }, { status: 400 });
      row.timing = 'date'; row.effective_date = body.effective_date;
    } else row.timing = 'period_end';
  } else {
    return Response.json({ error: '申請の種類が正しくありません' }, { status: 400 });
  }

  const { data: created, error } = await supabase.from('provider_membership_changes').insert(row).select('id').single();
  if (error) return Response.json({ error: '申請を送れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });

  // 店舗に知らせる（メール＋店舗オーナーのLINE）
  try {
    const [{ data: prov }, { data: plans }] = await Promise.all([
      supabase.from('providers').select('name, email, notify_emails, line_user_id').eq('id', m.provider_id).single(),
      supabase.from('provider_membership_plans').select('id, name').in('id', [m.plan_id, row.to_plan_id].filter(Boolean)),
    ]);
    const pn = Object.fromEntries((plans || []).map(p => [p.id, p.name]));
    const customerName = `${m.last_name || ''} ${m.first_name || ''}`.trim() || 'お客様';
    const lines = [
      `今のプラン：${pn[m.plan_id] || '—'}`,
      kind === 'plan_change' && `変更先：${pn[row.to_plan_id]}（次回の引き落としから）`,
      kind === 'pause' && `再開の希望日：${row.pause_until ? ymd(row.pause_until) : '未定'}`,
      kind === 'cancel' && `退会の希望：${row.effective_date ? `${ymd(row.effective_date)}で退会` : '今の支払い期間の終わりで退会'}`,
      row.reason && `理由：${row.reason}`,
    ].filter(Boolean);
    const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me'}/provider/dashboard?tab=memberships`;
    if (providerRecipients(prov).length) await sendMembershipRequestEmail({ to: providerRecipients(prov), providerName: prov.name, customerName, kindLabel: CHANGE_LABEL[kind], lines, dashboardUrl });
    if (prov?.line_user_id) await sendLinePush(prov.line_user_id, `【Fineme】${customerName}様から会員プランの${CHANGE_LABEL[kind]}の申請がありました。\n${lines.join('\n')}\n管理画面の「入会手続き」で承認してください。\n${dashboardUrl}`);
  } catch (e) { console.error('[membership request notify]', e?.message); }

  return Response.json({ ok: true, id: created.id });
}
