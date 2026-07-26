// GET /api/cron/log-reminder
// Vercel Cron: 毎日 0:00 UTC（JST 9:00）。New Me Log の「そろそろの時期」をLINEで知らせる。
//
// 追い立てない（vision.md §8-4「始点を絶対に嘲笑わない」）。事実を並べるだけにする。
// 1ユーザー1通にまとめ、同じ next_visit サイクルでは二度送らない。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { resolveAxis, effectiveFreqWeeks, idealNextDate } from '@/lib/log-axes';
import { buildLogMessage, getNotifyLevel } from '@/lib/log-voice';

export const dynamic = 'force-dynamic';

// notify カラム未適用（42703 / PGRST204）でも落とさない
function isMissingColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /notify_enabled|notify_days_before|last_notified_at/i.test(error.message || '');
}

function jstToday() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function weeksSince(dateStr) {
  if (!dateStr) return null;
  const w = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000 / 7);
  return w >= 0 ? w : null;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const today = jstToday();
  const todayStr = today.toISOString().slice(0, 10);

  // weekly-nudge も月曜 JST 9:00 に走る。同じ朝に2通は多いので月曜は譲る。
  // notify_days_before の猶予があるため、翌日に届いて実用上の損失はない。
  if (today.getUTCDay() === 1) {
    return Response.json({ sent: 0, skipped: 'weekly-nudge-day', date: todayStr });
  }

  // next_visit がある行（予約済み）と無い行（前回だけ記録）の両方を見るため、
  // active な行をまとめて取り、判定はアプリ側で行う。
  const COLS_V2 = 'id, user_id, axis, custom_icon, name, last_visit, next_visit, frequency_weeks, notify_enabled, notify_days_before, last_notified_at';
  const COLS_LEGACY = 'id, user_id, axis, name, last_visit, next_visit, frequency_weeks';

  let { data: logs, error } = await db
    .from('user_service_logs')
    .select(COLS_V2)
    .eq('active', true);

  if (error && isMissingColumn(error)) {
    // マイグレーション未適用：通知設定カラム無しで取得し、既定値で扱う
    const legacy = await db.from('user_service_logs').select(COLS_LEGACY).eq('active', true);
    if (legacy.error) {
      console.error('[cron/log-reminder] fetch error', legacy.error);
      return Response.json({ error: legacy.error.message }, { status: 500 });
    }
    logs = legacy.data;
    error = null;
  }

  if (error) {
    console.error('[cron/log-reminder] fetch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!logs?.length) return Response.json({ sent: 0, date: todayStr });

  const daysSinceNotified = (l) => l.last_notified_at
    ? (today - new Date(l.last_notified_at)) / 86400000
    : Infinity;

  // まずユーザーごとに束ねる（判定に本人の通知設定が要るため）
  const logsByUser = {};
  for (const l of logs) {
    if (!l.user_id) continue;
    (logsByUser[l.user_id] = logsByUser[l.user_id] || []).push(l);
  }
  const userIds = Object.keys(logsByUser);
  if (!userIds.length) return Response.json({ sent: 0, date: todayStr });

  // 通知設定（声・頻度）と配信先をまとめて取る。
  // supabase-log-prefs.sql / profiles-track 未適用でも動くよう段階的に落とす。
  let profiles = [];
  const full = await db
    .from('profiles')
    .select('id, line_user_id, log_voice, log_notify_level, track')
    .in('id', userIds);
  if (!full.error) {
    profiles = full.data || [];
  } else {
    const basic = await db.from('profiles').select('id, line_user_id').in('id', userIds);
    profiles = basic.data || [];
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  // 通知すべきものを2種類に分けて拾う
  //   A: 予約日が近い（リマインド）
  //   B: 予約はまだだが、前回＋頻度の目安が近い／過ぎている（予約を促す）
  const byUser = {};
  for (const userId of userIds) {
    const profile = profileMap[userId];
    if (!profile?.line_user_id) continue;

    // うるさく感じてブロックされたら元も子もないので、本人の設定を必ず尊重する
    const level = getNotifyLevel(profile.log_notify_level);
    if (level.id === 'off') continue;

    for (const l of logsByUser[userId]) {
      if (l.notify_enabled === false) continue;

      if (l.next_visit) {
        // 予約済み：同じ予約について何度も送らない
        if (daysSinceNotified(l) < level.reminderGuard) continue;
        const daysBefore = Number.isInteger(l.notify_days_before) ? l.notify_days_before : 3;
        const diff = Math.round((new Date(l.next_visit) - today) / 86400000);
        if (diff <= daysBefore) (byUser[userId] = byUser[userId] || []).push({ ...l, kind: 'reminder', diff });
        continue;
      }

      // 予約日が未設定：前回＋頻度の目安から判定する
      const ideal = idealNextDate(l);
      if (!ideal) continue;
      const diff = Math.round((new Date(ideal) - today) / 86400000);
      if (diff > level.leadDays) continue;

      // 目安前は1回だけ、過ぎている間は一定間隔で声をかけ続ける。
      // 放っておくほど遠のく類のものなので、超過中に黙るとツールの意味がなくなる。
      const gap = daysSinceNotified(l);
      const needed = diff < 0 ? level.overdueInterval : level.reminderGuard;
      if (gap < needed) continue;

      (byUser[userId] = byUser[userId] || []).push({ ...l, kind: 'booking', diff });
    }
  }

  const dueUserIds = Object.keys(byUser);
  if (!dueUserIds.length) return Response.json({ sent: 0, date: todayStr });

  let sent = 0;
  const notifiedIds = [];

  for (const userId of dueUserIds) {
    const profile = profileMap[userId];
    const lineUserId = profile?.line_user_id;
    if (!lineUserId) continue;

    const mine = byUser[userId];
    const booking = mine
      .filter(l => l.kind === 'booking')
      .map(l => ({
        axis: l.axis,
        custom_icon: l.custom_icon,
        name: l.name,
        weeksSince: weeksSince(l.last_visit),
        freq: effectiveFreqWeeks(l),
        overdueDays: l.diff < 0 ? -l.diff : 0,
      }));
    const reminder = mine
      .filter(l => l.kind === 'reminder')
      .map(l => ({
        axis: l.axis,
        custom_icon: l.custom_icon,
        name: l.name,
        next_visit: l.next_visit,
        diff: l.diff,
      }));

    // 文面は lib/log-voice.js（航海のクルーの声・日替わりで言い回しが変わる）
    // 声は本人の選択（未設定ならトラックごとの既定）
    const text = buildLogMessage(booking, reminder, resolveAxis, {
      voiceId: profile.log_voice,
      trackId: profile.track,
    });

    const res = await sendLinePush(lineUserId, text);
    if (res.ok) {
      sent++;
      notifiedIds.push(...byUser[userId].map(l => l.id));
    }
  }

  // 送信済みを記録（カラム未適用なら黙って諦める）
  if (notifiedIds.length) {
    const upd = await db
      .from('user_service_logs')
      .update({ last_notified_at: new Date().toISOString() })
      .in('id', notifiedIds);
    if (upd.error && !isMissingColumn(upd.error)) {
      console.error('[cron/log-reminder] mark error', upd.error);
    }
  }

  const candidates = dueUserIds.reduce((n, id) => n + byUser[id].length, 0);
  return Response.json({ sent, candidates, users: dueUserIds.length, date: todayStr });
}
