// GET /api/cron/shift-deadline
// Vercel Cron: 毎日0:00 UTC（9:00 JST）。希望シフトの提出締切に合わせて、店舗へ提出状況を通知する。
// 締切・通知日は店舗の提出ルール（provider_shift_settings.submit_cycle：何ごとに提出するか・締切・
// 締切の何日前に知らせるか。0=締切当日）から決まる（でお指摘 2026-10-16：期間を先に作らせない）。
// 締切後も未提出のスタッフは遅れて提出できる。
// あわせて、未提出のスタッフ本人にもLINEで提出を促す（staff_notify_days_before。LINE連携済みの人だけ。
// でお要望 2026-10-22：締切の催促通知はあった方がいい）。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush, sendLinePushWithAction } from '@/lib/line-push';
import { jstToday, daysUntil } from '@/lib/shift-deadline';
import { normalizeCycle, upcomingWindows } from '@/lib/shift-windows';

export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

async function submissionStatus(db, providerId, win) {
  const [{ data: staff }, { data: subs }] = await Promise.all([
    db.from('provider_staff').select('id, name, line_user_id, shift_access_token').eq('provider_id', providerId).not('shift_access_token', 'is', null),
    db.from('provider_shift_window_submissions').select('staff_id').eq('provider_id', providerId).eq('window_start', win.start),
  ]);
  const done = new Set((subs || []).map(s => s.staff_id));
  const all = staff || [];
  const missingStaff = all.filter(s => !done.has(s.id));
  return { total: all.length, submitted: all.length - missingStaff.length, missing: missingStaff.map(s => s.name), missingStaff };
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const today = jstToday();
  const result = { notified: 0, staff_reminded: 0 };

  // 提出ルールを決めた店舗だけが対象（シフト管理を使っていない店舗には送らない）
  const { data: settings } = await db.from('provider_shift_settings').select('provider_id, submit_cycle').not('submit_cycle', 'is', null);

  for (const row of settings || []) {
    const cycle = normalizeCycle(row.submit_cycle);
    for (const win of upcomingWindows(cycle, { today, count: 2 })) {
      const diff = daysUntil(win.deadline, today);
      if (diff < 0) continue;
      const toStore = cycle.notify_days_before.includes(diff);
      const toStaff = cycle.remind_staff && cycle.staff_notify_days_before.includes(diff);
      if (!toStore && !toStaff) continue;
      const st = await submissionStatus(db, row.provider_id, win);
      if (!st.total) continue;
      const { data: provider } = await db.from('providers').select('name, line_user_id').eq('id', row.provider_id).single();

      // スタッフ本人へ：未提出の人だけ、提出画面を開くボタン付きで
      if (toStaff) {
        for (const s of st.missingStaff) {
          if (!s.line_user_id) continue;
          const when = diff === 0 ? '本日が締切です' : `締切まであと${diff}日です（${md(win.deadline)}まで）`;
          const r = await sendLinePushWithAction(s.line_user_id, `${provider?.name || 'お店'}より：${win.label}（${md(win.start)}〜${md(win.end)}）のシフト希望がまだ提出されていません。${when}`,
            { label: '希望を提出する', caption: '下のボタンから提出できます', uri: `${BASE}/staff-shift/${s.shift_access_token}?period=${win.key}` });
          if (r?.ok !== false) result.staff_reminded++;
        }
      }

      // お店へ：締切当日は全員提出済みでも状況を知らせる。それ以外は未提出者がいる時だけ
      if (!toStore || (diff > 0 && !st.missing.length) || !provider?.line_user_id) continue;
      const head = diff === 0 ? '【Fineme】シフト希望の提出締切は本日です' : `【Fineme】シフト希望の提出締切まであと${diff}日です`;
      const text = [
        head,
        `対象：${win.label}（${win.start} 〜 ${win.end}・締切：${win.deadline}）`,
        `提出：${st.submitted}/${st.total}人`,
        ...(st.missing.length ? [`未提出：${st.missing.join('、')}`, '', cycle.remind_staff ? 'LINE連携済みの未提出の方には、本人にもお知らせしています。' : '声かけをお願いします。'] : ['', '全員提出済みです。ダッシュボードのシフト管理で日付を選び、「自動で作る」から作成に進めます。']),
        'https://www.fineme.me/provider/dashboard?tab=shift',
      ].join('\n');
      const r = await sendLinePush(provider.line_user_id, text);
      if (r.ok) result.notified++;
    }
  }

  return Response.json(result);
}
