// GET /api/provider/reports?months=12 → 月ごとのレポート（でお要望 2026-10-19：hacomono差分 #11）
// 会員（入会・退会・月末の会員数）、予約（予約・来店・キャンセル・新しいお客様）、売上、チェックイン、回数券の販売。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const jstMonth = ts => new Date(new Date(ts).getTime() + 9 * 3600000).toISOString().slice(0, 7);

async function all(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await q().range(from, from + 999);
    out.push(...(data || []));
    if (!data || data.length < 1000 || out.length >= 50000) return out;
  }
}

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const n = Math.min(24, Math.max(3, Number(new URL(request.url).searchParams.get('months')) || 12));
  const now = new Date(Date.now() + 9 * 3600000);
  const months = [];
  for (let i = n - 1; i >= 0; i--) months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const startIso = new Date(`${months[0]}-01T00:00:00+09:00`).toISOString();

  const [mems, resv, sales, checks, pkgs] = await Promise.all([
    all(() => supabase.from('provider_memberships').select('approved_at, cancelled_at, status').eq('provider_id', pid).in('status', ['active', 'cancelled']).order('id')),
    all(() => supabase.from('reservations').select('user_id, status, reserved_date, confirmed_date, created_at').eq('provider_id', pid).order('id')),
    all(() => supabase.from('provider_sales_entries').select('entry_date, amount').eq('provider_id', pid).gte('entry_date', `${months[0]}-01`).order('id')),
    all(() => supabase.from('provider_checkins').select('created_at').eq('provider_id', pid).gte('created_at', startIso).order('id')),
    all(() => supabase.from('customer_packages').select('created_at').eq('provider_id', pid).gte('created_at', startIso).order('id')),
  ]);

  const row = Object.fromEntries(months.map(m => [m, { month: m, joined: 0, left: 0, members_end: 0, reservations: 0, visits: 0, cancels: 0, new_customers: 0, sales: 0, checkins: 0, packages: 0 }]));
  const inc = (m, k, v = 1) => { if (row[m]) row[m][k] += v; };
  for (const x of mems) {
    if (x.approved_at) inc(jstMonth(x.approved_at), 'joined');
    if (x.cancelled_at) inc(jstMonth(x.cancelled_at), 'left');
  }
  for (const m of months) {
    const end = new Date(`${m}-01T00:00:00+09:00`); end.setUTCMonth(end.getUTCMonth() + 1);
    row[m].members_end = mems.filter(x => x.approved_at && new Date(x.approved_at) < end && (!x.cancelled_at || new Date(x.cancelled_at) >= end)).length;
  }
  const firstVisit = {};
  for (const r of resv) {
    const d = (r.confirmed_date || r.reserved_date || jstMonth(r.created_at) + '-01').slice(0, 7);
    inc(d, 'reservations');
    if (r.status === 'visited') {
      inc(d, 'visits');
      if (r.user_id && (!firstVisit[r.user_id] || d < firstVisit[r.user_id])) firstVisit[r.user_id] = d;
    }
    if (['cancelled', 'rejected', 'expired'].includes(r.status)) inc(d, 'cancels');
  }
  Object.values(firstVisit).forEach(m => inc(m, 'new_customers'));
  for (const s of sales) inc(String(s.entry_date).slice(0, 7), 'sales', Number(s.amount) || 0);
  for (const c of checks) inc(jstMonth(c.created_at), 'checkins');
  for (const p of pkgs) inc(jstMonth(p.created_at), 'packages');
  return Response.json({ months: months.map(m => row[m]) });
}
