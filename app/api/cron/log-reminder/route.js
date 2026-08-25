// GET /api/cron/log-reminder
// Vercel Cron: 毎日 0:00 UTC（JST 9:00）。New Me Log の「そろそろの時期」をLINEで知らせる。
//
// 追い立てない（vision.md §8-4「始点を絶対に嘲笑わない」）。事実を並べるだけにする。
// 1ユーザー1通にまとめ、同じ next_visit サイクルでは二度送らない。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { sendWebPush } from '@/lib/web-push';
import { resolveAxis, effectiveFreq, formatFreq, idealNextDate } from '@/lib/log-axes';
import { buildLogMessage, getNotifyLevel } from '@/lib/log-voice';

// 店舗の公式LINEチャネルから送る分は、Fineme独自の航海クルー口調ではなく
// 店舗からの通知として自然な、簡潔な文面にする（フェーズ2・店舗別LINE連携）。
function buildStoreLogMessage(booking, reminder, resolveAxisFn) {
  const lines = [];
  booking.forEach(b => {
    const def = resolveAxisFn(b.axis, b.custom_icon);
    lines.push(
      b.overdueDays > 0
        ? `${def.icon} ${b.name}：前回から${b.weeksSince ?? '?'}週が経ちました。そろそろのお時間です。`
        : `${def.icon} ${b.name}：前回のペース（${b.freq || '未設定'}）から、そろそろのお時間が近づいています。`
    );
  });
  reminder.forEach(r => {
    const def = resolveAxisFn(r.axis, r.custom_icon);
    const d = new Date(r.next_visit).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
    lines.push(`${def.icon} ${r.name}：次回のご予約は${d}です。`);
  });
  return ['New Me Logからのお知らせです', '', ...lines].join('\n');
}

export const dynamic = 'force-dynamic';

// notify カラム未適用（42703 / PGRST204）でも落とさない
function isMissingColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /notify_enabled|notify_days_before|last_notified_at|entry_type/i.test(error.message || '');
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
  const COLS_V2 = 'id, user_id, axis, custom_icon, name, last_visit, next_visit, frequency_weeks, notify_enabled, notify_days_before, last_notified_at, entry_type, provider_slug';
  const COLS_LEGACY = 'id, user_id, axis, name, last_visit, next_visit, frequency_weeks, provider_slug';

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

  // ブラウザ通知（Web Push）の購読。LINE未連携でもここに購読があれば届けられる
  // （LINE友だち追加の壁を迂回する独立チャネル・2026-08-07追加）。
  const pushSubsByUser = {};
  try {
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);
    (subs || []).forEach(s => { (pushSubsByUser[s.user_id] = pushSubsByUser[s.user_id] || []).push(s); });
  } catch {}

  // 月1回だけ添える一文の材料：Me Scan / Mirror をやっているか
  const doneDiagnosis = new Set();
  const doneMirror = new Set();
  try {
    const d = await db.from('diagnosis_results').select('user_id').in('user_id', userIds);
    (d.data || []).forEach(r => r.user_id && doneDiagnosis.add(r.user_id));
  } catch {}
  try {
    const m = await db.from('mirror_sessions').select('user_id').in('user_id', userIds);
    (m.data || []).forEach(r => r.user_id && doneMirror.add(r.user_id));
  } catch {}

  // その月に一度も通知していなければ「今月初回」。
  // ログ単位の last_notified_at の最大値で判定するのでカラム追加が要らない。
  function monthlyNudgeFor(userId, userLogs) {
    const times = userLogs
      .map(l => (l.last_notified_at ? new Date(l.last_notified_at).getTime() : 0))
      .filter(Boolean);
    if (times.length) {
      const last = new Date(Math.max(...times));
      const lastJst = new Date(last.getTime() + 9 * 60 * 60 * 1000);
      const sameMonth = lastJst.getUTCFullYear() === today.getUTCFullYear()
        && lastJst.getUTCMonth() === today.getUTCMonth();
      if (sameMonth) return null; // 今月はもう送っている
    }
    if (!doneDiagnosis.has(userId)) return 'diagnosis';
    if (!doneMirror.has(userId)) return 'mirror';
    return null; // 両方済み＝添えるものが無い月は静かにする
  }

  // 通知すべきものを2種類に分けて拾う
  //   A: 予約日が近い（リマインド）
  //   B: 予約はまだだが、前回＋頻度の目安が近い／過ぎている（予約を促す）
  const byUser = {};
  for (const userId of userIds) {
    const profile = profileMap[userId];
    if (!profile?.line_user_id && !pushSubsByUser[userId]?.length) continue;

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

  // ── 店舗別LINE連携（フェーズ2）の解決に必要な材料をまとめて取る ──
  // 対象：due な行のうち provider_slug を持つもの。
  // 「連携済み」＝provider_line_channels に verified_at があり、かつその顧客との
  // provider_customer_line_links が存在する場合のみ。どちらか欠けたらFineme公式へフォールバック。
  const dueSlugs = [...new Set(
    dueUserIds.flatMap(uid => byUser[uid].map(l => l.provider_slug).filter(Boolean))
  )];
  let providerBySlug = {};   // slug -> { id, channelToken }
  let linksByProviderUser = {}; // `${providerId}:${userId}` -> store_line_user_id
  if (dueSlugs.length) {
    const { data: providersRows } = await db.from('providers').select('id, slug').in('slug', dueSlugs);
    const providerIds = (providersRows || []).map(p => p.id);
    let channelsById = {};
    if (providerIds.length) {
      const { data: channels } = await db
        .from('provider_line_channels')
        .select('provider_id, channel_access_token, verified_at')
        .in('provider_id', providerIds);
      (channels || []).forEach(c => {
        if (c.channel_access_token && c.verified_at) channelsById[c.provider_id] = c.channel_access_token;
      });
    }
    (providersRows || []).forEach(p => {
      if (channelsById[p.id]) providerBySlug[p.slug] = { id: p.id, channelToken: channelsById[p.id] };
    });
    const connectedProviderIds = Object.values(providerBySlug).map(p => p.id);
    if (connectedProviderIds.length) {
      const { data: links } = await db
        .from('provider_customer_line_links')
        .select('provider_id, user_id, store_line_user_id')
        .in('provider_id', connectedProviderIds)
        .in('user_id', dueUserIds);
      (links || []).forEach(l => { linksByProviderUser[`${l.provider_id}:${l.user_id}`] = l.store_line_user_id; });
    }
  }

  function storeTargetFor(userId, log) {
    const p = log.provider_slug && providerBySlug[log.provider_slug];
    if (!p) return null;
    const storeLineUserId = linksByProviderUser[`${p.id}:${userId}`];
    if (!storeLineUserId) return null;
    return { token: p.channelToken, lineUserId: storeLineUserId };
  }

  let sent = 0;
  const notifiedIds = [];

  for (const userId of dueUserIds) {
    const profile = profileMap[userId];
    const mine = byUser[userId];

    // 店舗別LINE連携済みの行と、Fineme公式フォールバックの行に分ける
    const byStore = new Map(); // key -> { target, logs: [] }
    const fallbackLogs = [];
    for (const l of mine) {
      const target = storeTargetFor(userId, l);
      if (target) {
        const key = target.lineUserId;
        if (!byStore.has(key)) byStore.set(key, { target, logs: [] });
        byStore.get(key).logs.push(l);
      } else {
        fallbackLogs.push(l);
      }
    }

    function toBookingReminder(logs) {
      const booking = logs.filter(l => l.kind === 'booking').map(l => ({
        axis: l.axis, custom_icon: l.custom_icon, name: l.name, entry_type: l.entry_type,
        weeksSince: weeksSince(l.last_visit), freq: formatFreq(effectiveFreq(l)),
        overdueDays: l.diff < 0 ? -l.diff : 0,
      }));
      const reminder = logs.filter(l => l.kind === 'reminder').map(l => ({
        axis: l.axis, custom_icon: l.custom_icon, name: l.name, next_visit: l.next_visit, diff: l.diff,
      }));
      return { booking, reminder };
    }

    // 店舗別LINEチャネルへの送信（店舗からの通知として自然な、簡潔な文面）
    for (const { target, logs } of byStore.values()) {
      const { booking, reminder } = toBookingReminder(logs);
      const text = buildStoreLogMessage(booking, reminder, resolveAxis);
      const res = await sendLinePush(target.lineUserId, text, target.token);
      if (res.ok) { sent++; notifiedIds.push(...logs.map(l => l.id)); }
    }

    // Fineme公式LINEへの送信（既存の航海クルー口調・従来通り1通にまとめる）
    if (fallbackLogs.length && profile?.line_user_id) {
      const { booking, reminder } = toBookingReminder(fallbackLogs);
      const text = buildLogMessage(booking, reminder, resolveAxis, {
        voiceId: profile.log_voice,
        trackId: profile.track,
        monthlyNudge: monthlyNudgeFor(userId, logsByUser[userId]),
      });
      // アプリを開かなくてもLINEから「行った」を記録できるクイックリプライ
      // （でお要望 2026-08-05）。予約前日リマインドのノーショー対策と同じ仕組み
      // （lib/line-push.js の quickReplyItems・app/api/line/webhook）を使う。
      const quickReplyItems = fallbackLogs.slice(0, 13).map(l => ({
        label: `${(l.name || '').slice(0, 10)} 行った`.slice(0, 20), // LINEのlabelは20文字上限
        data: `action=log_visit&lid=${l.id}`,
        displayText: `${l.name} に行ったことを記録`,
      }));
      const res = await sendLinePush(profile.line_user_id, text, undefined, quickReplyItems);
      if (res.ok) { sent++; notifiedIds.push(...fallbackLogs.map(l => l.id)); }
    }

    // ブラウザ通知（Web Push）— LINE未連携ユーザーにも届く独立チャネル。
    // LINE連携済みでも購読していれば両方に送る（本人がブラウザ通知を選んだ結果のため）。
    if (fallbackLogs.length && pushSubsByUser[userId]?.length) {
      const first = fallbackLogs[0];
      const body = fallbackLogs.length === 1
        ? `${first.name}：そろそろのお時間です`
        : `${fallbackLogs.length}件のケアがそろそろのお時間です`;
      for (const sub of pushSubsByUser[userId]) {
        const res = await sendWebPush(sub, { title: 'New Me Log', body, url: '/mypage/log' });
        if (res.ok) { sent++; notifiedIds.push(...fallbackLogs.map(l => l.id)); }
        else if (res.expired) {
          await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
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
