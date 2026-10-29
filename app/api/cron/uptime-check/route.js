// GET /api/cron/uptime-check
// 10分ごとに、ログインとデータの入口（Supabase）と、ログイン・管理画面・マイページのページが応答するかを確かめ、
// 止まっていたら でお のLINEとメールにすぐ知らせる（2026-10-28：Supabase の入口が約80分応答せず、
// 掲載者管理画面・マイページへのログインと Me Scan の結果が止まったのに、Sentry で気づくまで分からなかった件）。
// 止まっている間は10分ごとに知らせ続ける。
export const dynamic = 'force-dynamic';
import { sendLinePush } from '@/lib/line-push';

const SITE = 'https://www.fineme.me';

async function check(name, url, init = {}, ok = r => r.ok) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return { name, ok: ok(r), status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    return { name, ok: false, status: e?.name === 'TimeoutError' ? 'timeout' : (e?.message || 'error'), ms: Date.now() - t0 };
  }
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, Authorization: `Bearer ${key}` };

  const run = () => Promise.all([
    check('ログインの入口（Supabase Auth）', `${base}/auth/v1/health`, { headers: { apikey: key } }),
    check('データの入口（Supabase API）', `${base}/rest/v1/providers?select=id&limit=1`, { headers: h }),
    check('ログイン画面', `${SITE}/login`),
    check('掲載者管理画面', `${SITE}/provider/dashboard`),
    check('マイページ', `${SITE}/mypage`),
  ]);
  // 1回のつまずきでは知らせない。失敗があれば20秒おいて確かめ直し、2回とも止まっていた所だけ知らせる（2026-10-29）
  let results = await run();
  if (results.some(r => !r.ok)) {
    await new Promise(r => setTimeout(r, 20000));
    const again = await run();
    results = results.map((r, i) => (r.ok ? r : again[i]));
  }
  const down = results.filter(r => !r.ok);
  // ?notify=0 は手元の自動調査（~/fineme/incident-watch.sh）からの確認用。でおへの通知は出さない
  const notify = new URL(request.url).searchParams.get('notify') !== '0';
  if (down.length && notify) {
    const jst = new Date(Date.now() + 9 * 3600000).toISOString().slice(5, 16).replace('T', ' ');
    const text = [
      `【Fineme 障害の検知】${jst}`,
      ...down.map(r => `・${r.name}：応答なし（${r.status}・${r.ms}ms）`),
      '',
      down.some(r => r.name.includes('Supabase'))
        ? 'Supabase（ログインとデータの置き場）が応答していません。https://status.supabase.com と https://supabase.com/dashboard/project/qsfpzlvucqzmjldshwwd を確認してください。'
        : 'サイトのページが応答していません。Vercel のデプロイを確認してください。',
      '止まっている間は10分ごとにお知らせします。',
    ].join('\n');
    const jobs = [];
    if (process.env.OWNER_LINE_USER_ID) jobs.push(sendLinePush(process.env.OWNER_LINE_USER_ID, text));
    const to = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL;
    if (to && process.env.RESEND_API_KEY) {
      jobs.push((async () => {
        const { Resend } = await import('resend');
        await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'Fineme 監視 <noreply@fineme.me>', to, subject: `【Fineme】障害を検知しました（${down.map(r => r.name).join('・')}）`, text });
      })());
    }
    await Promise.allSettled(jobs);
    console.error('[uptime-check] down', JSON.stringify(down));
  }
  return Response.json({ ok: !down.length, results });
}
