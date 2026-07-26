// GET /api/cron/log-reminder
// Vercel Cron: 毎日 0:00 UTC（JST 9:00）。New Me Log の「そろそろの時期」をLINEで知らせる。
//
// 追い立てない（vision.md §8-4「始点を絶対に嘲笑わない」）。事実を並べるだけにする。
// 1ユーザー1通にまとめ、同じ next_visit サイクルでは二度送らない。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { resolveAxis } from '@/lib/log-axes';

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

  // 通知対象の上限日（notify_days_before の最大を見込んで広めに取り、後で個別判定する）
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);
  const horizonStr = horizon.toISOString().slice(0, 10);

  let { data: logs, error } = await db
    .from('user_service_logs')
    .select('id, user_id, axis, custom_icon, name, last_visit, next_visit, frequency_weeks, notify_enabled, notify_days_before, last_notified_at')
    .eq('active', true)
    .not('next_visit', 'is', null)
    .lte('next_visit', horizonStr);

  if (error && isMissingColumn(error)) {
    // マイグレーション未適用：通知設定カラム無しで取得し、既定値で扱う
    const legacy = await db
      .from('user_service_logs')
      .select('id, user_id, axis, name, last_visit, next_visit, frequency_weeks')
      .eq('active', true)
      .not('next_visit', 'is', null)
      .lte('next_visit', horizonStr);
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

  // 個別に「通知すべきか」を判定する
  const due = logs.filter(l => {
    if (l.notify_enabled === false) return false;
    const daysBefore = Number.isInteger(l.notify_days_before) ? l.notify_days_before : 3;
    const diff = Math.round((new Date(l.next_visit) - today) / 86400000);
    if (diff > daysBefore) return false;
    // 同じサイクルで送信済みならスキップ（毎日ナグらない）
    if (l.last_notified_at && new Date(l.last_notified_at) >= new Date(l.next_visit).getTime() - daysBefore * 86400000) {
      return false;
    }
    return true;
  });

  if (!due.length) return Response.json({ sent: 0, date: todayStr });

  // ユーザーごとにまとめる（複数の軸が重なっても1通）
  const byUser = {};
  for (const l of due) {
    if (!l.user_id) continue;
    (byUser[l.user_id] = byUser[l.user_id] || []).push(l);
  }

  const userIds = Object.keys(byUser);
  const { data: profiles } = await db
    .from('profiles')
    .select('id, line_user_id')
    .in('id', userIds);
  const lineMap = Object.fromEntries((profiles || []).map(p => [p.id, p.line_user_id]));

  let sent = 0;
  const notifiedIds = [];

  for (const userId of userIds) {
    const lineUserId = lineMap[userId];
    if (!lineUserId) continue;

    const items = byUser[userId].map(l => {
      const def = resolveAxis(l.axis, l.custom_icon);
      const w = weeksSince(l.last_visit);
      const since = w !== null ? ` — 前回から${w}週間` : '';
      return `${def.icon} ${def.label}（${l.name}）${since}`;
    });

    const text = [
      'おはようございます。',
      '',
      ...items,
      '',
      'そろそろのタイミングです。',
      '▸ https://www.fineme.me/mypage/log',
    ].join('\n');

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

  return Response.json({ sent, candidates: due.length, date: todayStr });
}
