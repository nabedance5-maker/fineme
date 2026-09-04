// GET  /api/provider/sales-entries?from=YYYY-MM-DD&to=YYYY-MM-DD → 売上記録一覧+内訳集計（認証済み）
// POST /api/provider/sales-entries → 売上記録を追加（1件、または{items:[...]}で複数件まとめて）
//
// 確定額は必ず店舗自身が確認した数値のみ記録する（予約価格・New Me Logの自己申告costを
// 自動合算しない）。予約が来店済みになった時にメニュー・金額を確認して確定する導線
// （app/provider/dashboard/page.jsのmarkVisited）と、非会員・Fineme経由でない売上を
// 直接記録する導線の両方からこのAPIを叩く。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
  const fmt = d => d.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period'); // 'thisMonth' | 'lastMonth' | undefined(カスタム)
  let from = searchParams.get('from');
  let to = searchParams.get('to');
  if (period === 'lastMonth') ({ from, to } = monthRange(-1));
  else if (!from || !to) ({ from, to } = monthRange(0));

  const [{ data: entries, error }, { data: staffRows }] = await Promise.all([
    supabase
      .from('provider_sales_entries')
      .select('id, reservation_id, entry_date, amount, menu_name, staff_id, payment_method, memo, source, created_at')
      .eq('provider_id', provider.id)
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: false }),
    supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const staffNameMap = {};
  (staffRows || []).forEach(s => { staffNameMap[s.id] = s.name; });

  const items = entries || [];
  const total = items.reduce((sum, e) => sum + e.amount, 0);
  const financeTotal = items.filter(e => e.source === 'reservation').reduce((sum, e) => sum + e.amount, 0);
  const manualTotal = total - financeTotal;

  function groupSum(keyFn) {
    const map = {};
    items.forEach(e => { const k = keyFn(e) || '未分類'; map[k] = (map[k] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }));
  }

  return Response.json({
    from, to,
    entries: items,
    total, financeTotal, manualTotal,
    byMenu: groupSum(e => e.menu_name),
    byStaff: groupSum(e => staffNameMap[e.staff_id]),
    byPayment: groupSum(e => e.payment_method),
  });
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const rawItems = Array.isArray(body?.items) ? body.items : [body];

  const rows = [];
  for (const it of rawItems) {
    const amount = Number(it.amount);
    if (!amount || amount <= 0) return Response.json({ error: '金額は1円以上で入力してください' }, { status: 400 });
    rows.push({
      provider_id: provider.id,
      reservation_id: it.reservation_id || null,
      entry_date: it.entry_date || new Date().toISOString().split('T')[0],
      amount,
      menu_name: it.menu_name?.trim() || null,
      staff_id: it.staff_id || null,
      payment_method: it.payment_method || null,
      memo: it.memo?.trim() || null,
      source: it.reservation_id ? 'reservation' : 'manual',
    });
  }
  if (!rows.length) return Response.json({ error: '記録する項目がありません' }, { status: 400 });

  const { data, error } = await supabase.from('provider_sales_entries').insert(rows).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data });
}
