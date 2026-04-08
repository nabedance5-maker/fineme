// GET /api/cron/story-reminder
// Vercel Cron: 毎日 12:00 UTC（21:00 JST）
// 来店確認（visited）から3〜7日以内で体験談未投稿のユーザーにリマインドを送る
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  // visited_at が 3〜7日前の予約（story_reminder_sent = false）を取得
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7日前
  const to   = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3日前

  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, user_id, user_name, provider_id, service_name')
    .eq('status', 'visited')
    .eq('story_reminder_sent', false)
    .gte('visited_at', from)
    .lte('visited_at', to);

  if (error) {
    console.error('[cron/story-reminder] fetch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!reservations?.length) {
    return Response.json({ sent: 0 });
  }

  // 既に体験談を投稿済みの reservation_id を取得して除外
  const reservationIds = reservations.map(r => r.id);
  const { data: existingStories } = await db
    .from('stories')
    .select('reservation_id')
    .in('reservation_id', reservationIds);
  const submittedSet = new Set((existingStories || []).map(s => s.reservation_id));

  // ユーザーのLINE IDを一括取得
  const userIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, line_user_id, nickname').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  // 掲載者名を一括取得
  const providerIds = [...new Set(reservations.map(r => r.provider_id))];
  const { data: providers } = await db
    .from('providers')
    .select('id, name')
    .in('id', providerIds);
  const providerMap = Object.fromEntries((providers || []).map(p => [p.id, p]));

  let sent = 0;
  const results = [];

  for (const r of reservations) {
    // 既に体験談投稿済みならスキップ
    if (submittedSet.has(r.id)) {
      await db.from('reservations').update({ story_reminder_sent: true }).eq('id', r.id);
      continue;
    }

    const profile = r.user_id ? profileMap[r.user_id] : null;
    const provider = providerMap[r.provider_id];
    const name = profile?.nickname || r.user_name || 'あなた';
    const providerName = provider?.name || 'サービス';

    if (profile?.line_user_id) {
      const msg = [
        '【Fineme】体験談を聞かせてください',
        `${name} さん、${providerName}はいかがでしたか？`,
        '',
        '体験談を投稿いただくと、同じ悩みを持つ男性の参考になります。',
        '5分程度で書けます👇',
        'https://www.fineme.me/story-submit',
      ].join('\n');

      const result = await sendLinePush(profile.line_user_id, msg);
      if (result.ok) sent++;
      results.push({ reservation_id: r.id, ok: result.ok });
    }

    await db
      .from('reservations')
      .update({ story_reminder_sent: true })
      .eq('id', r.id);
  }

  console.log(`[cron/story-reminder] checked=${reservations.length} sent=${sent}`);
  return Response.json({ sent, checked: reservations.length, results });
}
