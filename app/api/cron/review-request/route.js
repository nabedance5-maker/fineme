// GET /api/cron/review-request
// Vercel Cron: 毎日実行。来店確定(visited)から1〜2日後の予約に、Googleクチコミ依頼を送る
// （予約・再来店リマインドSaaS フェーズ3-A）。google_review_urlを設定している店舗のみ対象。
// story-reminder（3〜7日後・Fineme上の体験談依頼）とタイミングをずらし、通知の重複を避ける。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { resolveLineTarget } from '@/lib/line-channel';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2日前
  const to   = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1日前

  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, user_id, user_name, user_contact, provider_id, service_name')
    .eq('status', 'visited')
    .eq('google_review_reminder_sent', false)
    .gte('visited_at', from)
    .lte('visited_at', to);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!reservations?.length) return Response.json({ sent: 0 });

  const providerIds = [...new Set(reservations.map(r => r.provider_id).filter(Boolean))];
  const { data: providers } = await db.from('providers').select('id, name, google_review_url').in('id', providerIds);
  const providerMap = {};
  (providers || []).forEach(p => { providerMap[p.id] = p; });

  const userIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, line_user_id').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  let sent = 0;
  const doneIds = [];

  for (const r of reservations) {
    const provider = providerMap[r.provider_id];
    if (!provider?.google_review_url) continue; // 未設定店舗はスキップ（URLを設定すれば翌日以降の対象で拾われる）
    if (!r.user_id) continue;

    const profile = profileMap[r.user_id];
    const target = await resolveLineTarget(db, {
      providerId: r.provider_id,
      userId: r.user_id,
      fallbackLineUserId: profile?.line_user_id,
    });
    if (!target.lineUserId) continue;

    const text = [
      `${provider.name}のご利用ありがとうございました。`,
      'よろしければ、クチコミへのご協力をお願いできますでしょうか。',
      provider.google_review_url,
    ].join('\n');

    const res = await sendLinePush(target.lineUserId, text, target.token);
    if (res.ok) { sent++; doneIds.push(r.id); }
  }

  if (doneIds.length) {
    await db.from('reservations').update({ google_review_reminder_sent: true }).in('id', doneIds);
  }

  return Response.json({ sent, candidates: reservations.length });
}
