// GET /api/cron/line-reminder
// Vercel Cron: 毎日15:00 UTC（深夜0時 JST）に翌日の予約をリマインド
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

  // JST で「明日」の日付を計算
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(jstNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

  const db = getSupabase();

  // 翌日の承認済み予約を取得（reminder_sent = false のもの）
  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, user_id, user_name, provider_id, reserved_date, start_time')
    .eq('status', 'approved')
    .eq('reserved_date', tomorrowStr)
    .eq('reminder_sent', false);

  if (error) {
    console.error('[cron/line-reminder] fetch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!reservations?.length) {
    return Response.json({ sent: 0, date: tomorrowStr });
  }

  // 掲載者情報を一括取得
  const providerIds = [...new Set(reservations.map(r => r.provider_id))];
  const { data: providers } = await db
    .from('providers')
    .select('id, name, line_user_id')
    .in('id', providerIds);
  const providerMap = Object.fromEntries((providers || []).map(p => [p.id, p]));

  // ユーザーのLINE IDを一括取得
  const userIds = reservations.map(r => r.user_id).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, line_user_id').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  let sent = 0;
  const results = [];

  for (const r of reservations) {
    const provider = providerMap[r.provider_id];
    const profile = r.user_id ? profileMap[r.user_id] : null;
    const timeStr = r.start_time || '';

    // ユーザーへの通知（店舗別LINE連携済みならそちらから・ノーショー対策のクイックリプライ付き）
    const target = await resolveLineTarget(db, {
      providerId: r.provider_id,
      userId: r.user_id,
      fallbackLineUserId: profile?.line_user_id,
    });
    if (target.lineUserId) {
      const msg = [
        '【Fineme】明日の予約リマインダー',
        `明日（${tomorrowStr}${timeStr ? ' ' + timeStr : ''}）のご予約があります。`,
        provider ? `ガイド: ${provider.name}` : '',
      ].filter(Boolean).join('\n');
      const quickReplyItems = [
        { label: '行きます', data: `action=confirm&rid=${r.id}` },
        { label: '予定が変わりそう', data: `action=reschedule&rid=${r.id}` },
      ];
      const result = await sendLinePush(target.lineUserId, msg, target.token, quickReplyItems);
      if (result.ok) sent++;
      results.push({ type: 'user', reservationId: r.id, ok: result.ok });
    }

    // 掲載者への通知
    if (provider?.line_user_id) {
      const msg = [
        '【Fineme】明日の予約リマインダー',
        `明日（${tomorrowStr}${timeStr ? ' ' + timeStr : ''}）の予約があります。`,
        `お客様: ${r.user_name}`,
      ].filter(Boolean).join('\n');
      const result = await sendLinePush(provider.line_user_id, msg);
      if (result.ok) sent++;
      results.push({ type: 'provider', reservationId: r.id, ok: result.ok });
    }

    // reminder_sent を true に更新（送信の成否に関わらず重複防止）
    await db.from('reservations').update({ reminder_sent: true }).eq('id', r.id);
  }

  console.log(`[cron/line-reminder] date=${tomorrowStr} reservations=${reservations.length} sent=${sent}`);

  // --- New Me Log リマインダー ---
  const { data: serviceLogs, error: logErr } = await db
    .from('user_service_logs')
    .select('id, user_id, axis, name, next_visit, memo')
    .eq('next_visit', tomorrowStr)
    .eq('active', true);

  if (!logErr && serviceLogs?.length) {
    const logUserIds = [...new Set(serviceLogs.map(l => l.user_id).filter(Boolean))];
    const { data: logProfiles } = logUserIds.length
      ? await db.from('profiles').select('id, line_user_id').in('id', logUserIds)
      : { data: [] };
    const logProfileMap = Object.fromEntries((logProfiles || []).map(p => [p.id, p]));

    const AXIS_LABEL = {
      body: 'ボディ', hair: 'ヘア', eyebrow: '眉毛',
      skin: 'スキンケア', hairremoval: '脱毛', teeth: '歯', nail: 'ネイル',
    };

    for (const log of serviceLogs) {
      const prof = logProfileMap[log.user_id];
      if (!prof?.line_user_id) continue;
      const axisLabel = AXIS_LABEL[log.axis] || log.axis;
      const msg = [
        `【Fineme】明日の${axisLabel}予約リマインダー`,
        `明日（${tomorrowStr}）は「${log.name}」の予約日です。`,
        log.memo ? `メモ: ${log.memo}` : '',
        '変容の旅、一歩一歩進めていきましょう。',
        `https://fineme.me/mypage/log`,
      ].filter(Boolean).join('\n');
      const result = await sendLinePush(prof.line_user_id, msg);
      if (result.ok) sent++;
      results.push({ type: 'service-log', logId: log.id, ok: result.ok });
    }
    console.log(`[cron/line-reminder] service-logs=${serviceLogs.length}`);
  }

  return Response.json({ sent, date: tomorrowStr, results });
}
