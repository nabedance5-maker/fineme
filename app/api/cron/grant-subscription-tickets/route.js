// GET /api/cron/grant-subscription-tickets
// 月額会員への自動チケット付与（でお要望2026-09-14：「店舗によっては月額を契約する
// ことで毎月チケットが付与される仕組みのところもある」）。毎日実行し、
// next_grant_at が今日以前かつ契約継続中(subscription_status='active')のパッケージに、
// service_packages.recurring_sessions分をtotal_sessionsへ加算し、次回付与日を1ヶ月進める。
// あわせて、会員プランの退会日（cancel_at）が来た会員を退会済みにする。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { grantPlanTickets } from '@/lib/membership-plan';
import { endLockerContracts } from '@/lib/membership-changes';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const todayStr = new Date().toISOString().slice(0, 10);

  // 会員プランの退会日が来た会員を退会済みにする（前払いの店では、請求は先に終わり、退会日まで会員のまま。でお要望 2026-10-27）
  const jstToday = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const { data: ending } = await db.from('provider_memberships').select('id').eq('status', 'active').not('cancel_at', 'is', null).lte('cancel_at', jstToday);
  for (const m of ending || []) {
    await db.from('provider_memberships').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), paused_at: null, pause_until: null, updated_at: new Date().toISOString() }).eq('id', m.id);
    await endLockerContracts(db, m.id);
  }

  const { data: due, error } = await db
    .from('customer_packages')
    .select('id, total_sessions, next_grant_at, package_id, service_packages(recurring_sessions)')
    .eq('package_type', 'subscription')
    .eq('subscription_status', 'active')
    .lte('next_grant_at', todayStr);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let granted = 0;
  const results = [];
  for (const row of due || []) {
    const sessionsToAdd = row.service_packages?.recurring_sessions;
    if (!sessionsToAdd) { results.push({ id: row.id, skipped: 'recurring_sessions未設定' }); continue; }
    try {
      const nextDate = new Date(row.next_grant_at + 'T00:00:00Z');
      nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
      const { error: updateError } = await db
        .from('customer_packages')
        .update({ total_sessions: (row.total_sessions || 0) + sessionsToAdd, next_grant_at: nextDate.toISOString().slice(0, 10) })
        .eq('id', row.id);
      if (updateError) throw updateError;
      await db.from('customer_package_grants').insert({ customer_package_id: row.id, sessions_added: sessionsToAdd });
      granted++;
      results.push({ id: row.id, granted: sessionsToAdd });
    } catch (e) {
      console.error('[cron/grant-subscription-tickets]', row.id, e);
      results.push({ id: row.id, error: e.message });
    }
  }

  // 会員プランで毎月配る回数券（でお要望 2026-10-22）。毎日動くが、同じ月には1回だけ配る（その月の初回の実行で配る）
  let planGranted = 0;
  const { data: plans } = await db.from('provider_membership_plans').select('*');
  const monthlyPlans = (plans || []).filter(p => (p.ticket_grants || []).some(g => g.timing === 'monthly'));
  if (monthlyPlans.length) {
    const { data: members } = await db.from('provider_memberships').select('id, provider_id, user_id, plan_id, paused_at')
      .eq('status', 'active').is('paused_at', null).in('plan_id', monthlyPlans.map(p => p.id));
    for (const m of members || []) {
      try { planGranted += await grantPlanTickets(db, m, monthlyPlans.find(p => p.id === m.plan_id), 'monthly'); }
      catch (e) { console.error('[cron/grant-subscription-tickets] plan', m.id, e); }
    }
  }

  return Response.json({ ok: true, checked: due?.length || 0, granted, planGranted, results });
}
