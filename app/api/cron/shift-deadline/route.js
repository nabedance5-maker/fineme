// GET /api/cron/shift-deadline
// Vercel Cron: 毎日0:00 UTC（9:00 JST）。希望シフトの提出締切に合わせて、店舗へ提出状況を通知する。
// 締切・通知日は店舗の提出ルール（provider_shift_settings.submit_cycle：何ごとに提出するか・締切・
// 締切の何日前に知らせるか。0=締切当日）から決まる（でお指摘 2026-10-16：期間を先に作らせない）。
// 締切後も未提出のスタッフは遅れて提出できる。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { jstToday, daysUntil } from '@/lib/shift-deadline';
import { normalizeCycle, upcomingWindows } from '@/lib/shift-windows';

export const dynamic = 'force-dynamic';

async function submissionStatus(db, providerId, win) {
  const [{ data: staff }, { data: subs }] = await Promise.all([
    db.from('provider_staff').select('id, name').eq('provider_id', providerId).not('shift_access_token', 'is', null),
    db.from('provider_shift_window_submissions').select('staff_id').eq('provider_id', providerId).eq('window_start', win.start),
  ]);
  const done = new Set((subs || []).map(s => s.staff_id));
  const all = staff || [];
  return { total: all.length, submitted: all.filter(s => done.has(s.id)).length, missing: all.filter(s => !done.has(s.id)).map(s => s.name) };
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const today = jstToday();
  const result = { notified: 0 };

  // 提出ルールを決めた店舗だけが対象（シフト管理を使っていない店舗には送らない）
  const { data: settings } = await db.from('provider_shift_settings').select('provider_id, submit_cycle').not('submit_cycle', 'is', null);

  for (const row of settings || []) {
    const cycle = normalizeCycle(row.submit_cycle);
    for (const win of upcomingWindows(cycle, { today, count: 2 })) {
      const diff = daysUntil(win.deadline, today);
      if (diff < 0 || !cycle.notify_days_before.includes(diff)) continue;
      const st = await submissionStatus(db, row.provider_id, win);
      if (!st.total) continue;
      // 締切当日は全員提出済みでも状況を知らせる。それ以外は未提出者がいる時だけ
      if (diff > 0 && !st.missing.length) continue;
      const head = diff === 0 ? '【Fineme】シフト希望の提出締切は本日です' : `【Fineme】シフト希望の提出締切まであと${diff}日です`;
      const text = [
        head,
        `対象：${win.label}（${win.start} 〜 ${win.end}・締切：${win.deadline}）`,
        `提出：${st.submitted}/${st.total}人`,
        ...(st.missing.length ? [`未提出：${st.missing.join('、')}`, '', '声かけをお願いします。'] : ['', '全員提出済みです。ダッシュボードの「新しいシフトを作る」から作成に進めます。']),
        'https://www.fineme.me/provider/dashboard?tab=shift',
      ].join('\n');
      const { data: provider } = await db.from('providers').select('line_user_id').eq('id', row.provider_id).single();
      if (!provider?.line_user_id) continue;
      const r = await sendLinePush(provider.line_user_id, text);
      if (r.ok) result.notified++;
    }
  }

  return Response.json(result);
}
