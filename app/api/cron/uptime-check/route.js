// GET /api/cron/uptime-check
// 10分ごとに、ログインとデータの入口（Supabase）と、ログイン・管理画面・マイページのページが応答するかを確かめ、
// 止まっていたら でお のLINEとメールにすぐ知らせる（2026-10-28：Supabase の入口が約80分応答せず、
// 掲載者管理画面・マイページへのログインと Me Scan の結果が止まったのに、Sentry で気づくまで分からなかった件）。
// 止まっている間は10分ごとに知らせ続ける。
export const dynamic = 'force-dynamic';
import { sendLinePush } from '@/lib/line-push';
import { getSupabase } from '@/lib/supabase';

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

// Anthropic のクレジット残高が尽きていないか（2026-11-22：残高不足で Mirror の写真分析が全員失敗していたのに、
// 渡邉が自分で試すまで分からなかった）。1トークンだけの最小の呼び出しで確かめる（10分ごとで月に数円）。
// 残高不足の時だけ「止まっている」とし、混雑・一時的な失敗では知らせない。
async function checkAnthropicCredit() {
  const name = 'AIの残高（Anthropic・Mirror の写真分析ほか）';
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name, ok: true, status: 'skip', ms: 0 };
  const t0 = Date.now();
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: '.' }] }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) return { name, ok: true, status: r.status, ms: Date.now() - t0 };
    const body = await r.text().catch(() => '');
    const credit = /credit balance is too low/i.test(body) || (r.status === 400 && /billing/i.test(body));
    return { name, ok: !credit, status: credit ? '残高不足' : r.status, ms: Date.now() - t0 };
  } catch {
    return { name, ok: true, status: 'unreachable', ms: Date.now() - t0 };
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
    check('管理画面', `${SITE}/provider/dashboard`),
    check('マイページ', `${SITE}/mypage`),
    checkAnthropicCredit(),
  ]);
  // 1回のつまずきでは知らせない。失敗があれば20秒おいて確かめ直し、2回とも止まっていた所だけ知らせる（2026-10-29）
  let results = await run();
  if (results.some(r => !r.ok)) {
    await new Promise(r => setTimeout(r, 20000));
    const again = await run();
    results = results.map((r, i) => (r.ok ? r : again[i]));
  }
  const down = results.filter(r => !r.ok);
  // 止まりを記録する（週次レポートが障害の期間を需要の低下と取り違えないため。手元の確認用 ?notify=0 は記録しない）
  if (down.length && new URL(request.url).searchParams.get('notify') !== '0') {
    try {
      await getSupabase().from('service_incidents').insert(down.map(r => ({ name: r.name, status: String(r.status) })));
    } catch (e) { console.error('[uptime-check] incident record', e.message); }
  }
  // ?notify=0 は手元の自動調査（~/fineme/incident-watch.sh）からの確認用。でおへの通知は出さない
  const notify = new URL(request.url).searchParams.get('notify') !== '0';
  if (down.length && notify) {
    const jst = new Date(Date.now() + 9 * 3600000).toISOString().slice(5, 16).replace('T', ' ');
    const text = [
      `【Fineme 障害の検知】${jst}`,
      ...down.map(r => `・${r.name}：応答なし（${r.status}・${r.ms}ms）`),
      '',
      down.some(r => r.name.startsWith('AIの残高'))
        ? 'Anthropic のクレジット残高が不足しています。Mirror の写真分析・レポートが全員失敗します（他のAI機能は無料・別のAIに切り替えて動いています）。https://console.anthropic.com/settings/billing でクレジットを追加してください。'
        : down.some(r => r.name.includes('Supabase'))
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
