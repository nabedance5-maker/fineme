// GET /api/cron/shift-deadline
// Vercel Cron: 毎日0:00 UTC（9:00 JST）。希望シフトの提出締切に合わせて、店舗へ提出状況を通知する。
// 通知日は期間ごとの notify_days_before（締切の何日前か。0=締切当日、既定は前日と当日）。
// 締切後も未提出のスタッフは遅れて提出できるため、期間のステータスはここでは変えない
// （店舗が自動作成した時点で下書きになり、受付が終わる）。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { jstToday, daysUntil } from '@/lib/shift-deadline';

export const dynamic = 'force-dynamic';

async function submissionStatus(db, period) {
  const [{ data: staff }, { data: subs }] = await Promise.all([
    db.from('provider_staff').select('id, name').eq('provider_id', period.provider_id).not('shift_access_token', 'is', null),
    db.from('provider_shift_submissions').select('staff_id').eq('period_id', period.id),
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

  const { data: periods } = await db
    .from('provider_shift_periods')
    .select('id, provider_id, period_start, period_end, request_deadline, notify_days_before')
    .eq('status', 'collecting')
    .not('request_deadline', 'is', null)
    .gte('request_deadline', today);

  for (const p of periods || []) {
    const diff = daysUntil(p.request_deadline, today);
    if (!(p.notify_days_before || [1, 0]).includes(diff)) continue;
    const st = await submissionStatus(db, p);
    // 締切当日は全員提出済みでも状況を知らせる。それ以外は未提出者がいる時だけ
    if (diff > 0 && !st.missing.length) continue;
    const head = diff === 0 ? '【Fineme】シフト希望の提出締切は本日です' : `【Fineme】シフト希望の提出締切まであと${diff}日です`;
    const text = [
      head,
      `対象期間：${p.period_start} 〜 ${p.period_end}（締切：${p.request_deadline}）`,
      `提出：${st.submitted}/${st.total}人`,
      ...(st.missing.length ? [`未提出：${st.missing.join('、')}`, '', '声かけをお願いします。'] : ['', '全員提出済みです。ダッシュボードから自動作成に進めます。']),
      'https://www.fineme.me/provider/dashboard',
    ].join('\n');
    const { data: provider } = await db.from('providers').select('line_user_id').eq('id', p.provider_id).single();
    if (!provider?.line_user_id) continue;
    const r = await sendLinePush(provider.line_user_id, text);
    if (r.ok) result.notified++;
  }

  return Response.json(result);
}
