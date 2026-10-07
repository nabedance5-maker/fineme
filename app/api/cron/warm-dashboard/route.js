// GET /api/cron/warm-dashboard
// 5分おきに、掲載者管理画面が起動時に呼ぶAPIへ認証なしのリクエストを送り、サーバー関数を起動状態に保つ。
// しばらく誰も使っていないと、管理画面を開いた最初の1回だけ全APIが起動待ちで8〜10秒止まっていたため
// （2026-10-07実測）。認証なしなので各APIは即401を返し、データには一切触れない。
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

const PATHS = [
  '/api/provider/me',
  '/api/provider/features',
  '/api/provider/dashboard-prefs',
  '/api/provider/page-theme',
  '/api/provider/business-hours',
  '/api/provider/staff',
  '/api/provider/classes',
  '/api/provider/resources',
  '/api/provider/closed-dates',
  '/api/provider/calendar',
  '/api/provider/staff-blocks',
  '/api/provider/shift-entries/for-range',
  '/api/provider/today-blocks',
  '/api/provider/activity-log',
  '/api/provider/customer-packages',
  '/api/provider/customers',
  '/api/provider/sales-entries',
  '/api/provider/consultant',
  '/api/reservations',
];

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const results = await Promise.all(PATHS.map(async (path) => {
    const t = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      return { path, status: res.status, ms: Date.now() - t };
    } catch (e) {
      return { path, error: e.name, ms: Date.now() - t };
    }
  }));
  return Response.json({ ms: Date.now() - started, results });
}
