// GET /api/cron/grant-subscription-tickets
// 月額会員への自動チケット付与（でお要望2026-09-14：「店舗によっては月額を契約する
// ことで毎月チケットが付与される仕組みのところもある」）。毎日実行し、
// next_grant_at が今日以前かつ契約継続中(subscription_status='active')のパッケージに、
// service_packages.recurring_sessions分をtotal_sessionsへ加算し、次回付与日を1ヶ月進める。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const todayStr = new Date().toISOString().slice(0, 10);

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

  return Response.json({ ok: true, checked: due?.length || 0, granted, results });
}
