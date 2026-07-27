// POST /api/me/line-test
// 自分のLINEに New Me Log の通知を試し送りする。
//
// cron（毎朝9時）を待たずに、実際に届く文面をその場で確認するためのもの。
// 登録済みのログから通知文を組み立てるので、cron と同じ見た目になる。
// 対象が無ければ、直近の1件を使ってプレビューする。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { resolveAxis, effectiveFreq, formatFreq, idealNextDate } from '@/lib/log-axes';
import { buildLogMessage } from '@/lib/log-voice';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export const dynamic = 'force-dynamic';

const BOOKING_LEAD_DAYS = 5;

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

function weeksSince(dateStr) {
  if (!dateStr) return null;
  const w = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000 / 7);
  return w >= 0 ? w : null;
}

function toBooking(l, diff) {
  return {
    axis: l.axis,
    custom_icon: l.custom_icon,
    name: l.name,
    weeksSince: weeksSince(l.last_visit),
    freq: formatFreq(effectiveFreq(l)),
    overdueDays: diff < 0 ? -diff : 0,
  };
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 声・トラックも取る（未適用環境では line_user_id だけに落とす）
  let profile = null;
  const full = await supabase
    .from('profiles')
    .select('line_user_id, log_voice, track')
    .eq('id', user.id)
    .maybeSingle();
  if (!full.error) {
    profile = full.data;
  } else {
    const basic = await supabase.from('profiles').select('line_user_id').eq('id', user.id).maybeSingle();
    profile = basic.data;
  }

  if (!profile?.line_user_id) {
    return Response.json({
      ok: false,
      reason: 'not-linked',
      message: 'まだLINE連携されていません。下の「LINEで連携する」から進めてください。',
    });
  }

  // 自分のログから、cron と同じ判定で対象を組み立てる
  let logs = [];
  const sel = await supabase
    .from('user_service_logs')
    .select('id, axis, custom_icon, name, last_visit, next_visit, frequency_weeks, frequency_months, notify_enabled, last_notified_at')
    .eq('user_id', user.id)
    .eq('active', true);
  if (!sel.error) {
    logs = sel.data || [];
  } else {
    const legacy = await supabase
      .from('user_service_logs')
      .select('id, axis, name, last_visit, next_visit, frequency_weeks, notify_enabled')
      .eq('user_id', user.id)
      .eq('active', true);
    logs = legacy.data || [];
  }

  // 月1回の一文（cron と同じ条件）。試し送りでも実際に届く形を再現する。
  let monthlyNudge = null;
  {
    const times = logs.map(l => (l.last_notified_at ? new Date(l.last_notified_at).getTime() : 0)).filter(Boolean);
    const nowJst = new Date(Date.now() + 9 * 3600000);
    let sameMonth = false;
    if (times.length) {
      const lastJst = new Date(Math.max(...times) + 9 * 3600000);
      sameMonth = lastJst.getUTCFullYear() === nowJst.getUTCFullYear()
        && lastJst.getUTCMonth() === nowJst.getUTCMonth();
    }
    if (!sameMonth) {
      const d = await supabase.from('diagnosis_results').select('id').eq('user_id', user.id).limit(1);
      if (!d.data?.length) monthlyNudge = 'diagnosis';
      else {
        const m = await supabase.from('mirror_sessions').select('id').eq('user_id', user.id).limit(1);
        if (!m.data?.length) monthlyNudge = 'mirror';
      }
    }
  }

  const today = new Date();
  const booking = [];
  const reminder = [];

  for (const l of logs) {
    if (l.notify_enabled === false) continue;
    if (l.next_visit) {
      const diff = Math.round((new Date(l.next_visit) - today) / 86400000);
      if (diff <= 3) reminder.push({ axis: l.axis, custom_icon: l.custom_icon, name: l.name, next_visit: l.next_visit, diff });
      continue;
    }
    const ideal = idealNextDate(l);
    if (!ideal) continue;
    const diff = Math.round((new Date(ideal) - today) / 86400000);
    if (diff <= BOOKING_LEAD_DAYS) booking.push(toBooking(l, diff));
  }

  let note = null;
  // まだ通知対象が無い場合は、直近の1件でプレビューを作る（何も届かないと確認にならない）
  if (!booking.length && !reminder.length) {
    const sample = logs.find(l => l.last_visit) || logs[0];
    if (sample) {
      const ideal = idealNextDate(sample);
      const diff = ideal ? Math.round((new Date(ideal) - today) / 86400000) : 0;
      booking.push(toBooking(sample, diff));
      note = 'いまは通知対象がないため、登録済みの1件でプレビューを送りました。';
    }
  }

  const text = (booking.length || reminder.length)
    ? buildLogMessage(booking, reminder, resolveAxis, { voiceId: profile.log_voice, trackId: profile.track, monthlyNudge })
    : [
        'お頭、通信の試験でさぁ📡',
        '',
        'この文が届いてりゃ、見張り番の準備は万端。',
        'New Me Log に登録しておけば、そろそろの時期にこうして報せまさぁ。',
        '',
        '▸ https://www.fineme.me/mypage/log',
      ].join('\n');

  const res = await sendLinePush(profile.line_user_id, text);

  if (res.ok) {
    return Response.json({
      ok: true,
      message: note ? `LINEに送りました。${note}` : 'LINEに送りました。届いているか確認してください。',
      preview: text,
    });
  }

  if (res.status === 403) {
    return Response.json({
      ok: false,
      reason: 'not-friend',
      message: 'Fineme公式アカウントを友だち追加すると届くようになります。「連携をやり直す」から進めてください。',
    });
  }

  return Response.json({
    ok: false,
    reason: res.reason || 'unknown',
    message: '送信できませんでした。時間をおいて試してください。',
  });
}
