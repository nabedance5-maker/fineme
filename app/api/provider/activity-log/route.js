// GET /api/provider/activity-log?actor=&category=&operator=&from=&to=&before= → 店舗の操作ログ（認証済み・自店舗分のみ）
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../consultant/_lib';

const PAGE = 50;

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const actor = sp.get('actor');
  const category = sp.get('category');
  const operator = sp.get('operator');
  const from = sp.get('from');
  const to = sp.get('to');
  const before = sp.get('before');
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

  let q = supabase.from('provider_activity_logs')
    .select('id, occurred_at, operator_name, method, category, action_label, summary, detail, actor, customer_name')
    .eq('provider_id', provider.id).order('occurred_at', { ascending: false }).limit(PAGE + 1);
  if (actor === 'store' || actor === 'customer') q = q.eq('actor', actor);
  if (category) q = q.eq('category', category);
  if (operator) q = q.eq('actor', 'store');
  if (operator === '__none__') q = q.is('operator_name', null);
  else if (operator) q = q.eq('operator_name', operator);
  if (isDate(from)) q = q.gte('occurred_at', `${from}T00:00:00+09:00`);
  if (isDate(to)) q = q.lt('occurred_at', new Date(new Date(`${to}T00:00:00+09:00`).getTime() + 86400000).toISOString());
  if (before) q = q.lt('occurred_at', before);

  const { data, error } = await q;
  if (error) return Response.json({ error: '取得に失敗しました' }, { status: 500 });
  const rows = data || [];
  const hasMore = rows.length > PAGE;

  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: meta } = await supabase.from('provider_activity_logs')
    .select('category, operator_name').eq('provider_id', provider.id).gte('occurred_at', since).limit(5000);
  const categories = [...new Set((meta || []).map(m => m.category))].sort();
  const operators = [...new Set((meta || []).map(m => m.operator_name).filter(Boolean))].sort();

  return Response.json({ logs: rows.slice(0, PAGE), hasMore, categories, operators });
}
