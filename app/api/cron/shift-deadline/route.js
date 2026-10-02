// GET /api/cron/shift-deadline
// Vercel Cron: 毎日0:00 UTC（9:00 JST）。希望シフトの提出締切まわりを自動で回す。
//  ・締切の翌日（締切超過）になった募集中の期間を「下書き（調整中）」へ移し、店舗へ提出状況を通知する
//  ・締切の前日になった募集中の期間は、未提出のスタッフを店舗へ通知する（声かけ用）
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { jstToday } from '@/lib/shift-deadline';

export const dynamic = 'force-dynamic';

const addDays = (d, n) => new Date(new Date(d + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

async function submissionStatus(db, period) {
  const [{ data: staff }, { data: subs }] = await Promise.all([
    db.from('provider_staff').select('id, name').eq('provider_id', period.provider_id).not('shift_access_token', 'is', null),
    db.from('provider_shift_submissions').select('staff_id').eq('period_id', period.id),
  ]);
  const done = new Set((subs || []).map(s => s.staff_id));
  const all = staff || [];
  return { total: all.length, submitted: all.filter(s => done.has(s.id)).length, missing: all.filter(s => !done.has(s.id)).map(s => s.name) };
}

async function notifyProvider(db, providerId, text) {
  const { data: provider } = await db.from('providers').select('line_user_id').eq('id', providerId).single();
  if (!provider?.line_user_id) return false;
  const r = await sendLinePush(provider.line_user_id, text);
  return !!r.ok;
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const today = jstToday();
  const tomorrow = addDays(today, 1);
  const result = { closed: 0, reminded: 0 };

  const { data: expired } = await db
    .from('provider_shift_periods')
    .select('id, provider_id, period_start, period_end, request_deadline')
    .eq('status', 'collecting')
    .lt('request_deadline', today);
  for (const p of expired || []) {
    const { error } = await db.from('provider_shift_periods').update({ status: 'draft' }).eq('id', p.id).eq('status', 'collecting');
    if (error) { console.error('[cron/shift-deadline] close', error); continue; }
    result.closed++;
    const st = await submissionStatus(db, p);
    const lines = [
      '【Fineme】シフト希望の募集を締め切りました',
      `対象期間：${p.period_start} 〜 ${p.period_end}`,
      `提出：${st.submitted}/${st.total}人`,
      ...(st.missing.length ? [`未提出：${st.missing.join('、')}`] : []),
      '',
      'ダッシュボードのシフト管理から、提出された希望の確認・自動作成・確定を進められます。',
      'https://www.fineme.me/provider/dashboard',
    ];
    await notifyProvider(db, p.provider_id, lines.join('\n'));
  }

  const { data: dueSoon } = await db
    .from('provider_shift_periods')
    .select('id, provider_id, period_start, period_end, request_deadline')
    .eq('status', 'collecting')
    .eq('request_deadline', tomorrow);
  for (const p of dueSoon || []) {
    const st = await submissionStatus(db, p);
    if (!st.missing.length) continue;
    const text = [
      '【Fineme】シフト希望の提出締切は明日です',
      `対象期間：${p.period_start} 〜 ${p.period_end}`,
      `未提出（${st.missing.length}人）：${st.missing.join('、')}`,
      '',
      '声かけをお願いします。',
    ].join('\n');
    if (await notifyProvider(db, p.provider_id, text)) result.reminded++;
  }

  return Response.json(result);
}
