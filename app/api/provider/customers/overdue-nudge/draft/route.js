// POST /api/provider/customers/overdue-nudge/draft { user_ids } → まとめて声かけの文案をAIが下書き（2026-11-21）。
// 店舗のオーナーのみ・スタンダード以上（送信と同じ）。AI に渡すのは店舗名・業種・前回のメニュー名と人数だけ（lib/overdue-nudge.js）。
// デモでは AI の回数上限の対象（lib/demo.js AI_PATHS）
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';
import { providerCustomerIds } from '@/lib/broadcast';
import { generateOverdueDraft } from '@/lib/overdue-nudge';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id, name, slug, plan, main_category').eq('email', user.email).single();
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'dormant_outreach'); if (locked) return locked; }

  const b = await request.json().catch(() => ({}));
  const asked = Array.isArray(b.user_ids) ? [...new Set(b.user_ids.filter(x => typeof x === 'string'))].slice(0, 50) : [];
  const customers = await providerCustomerIds(supabase, provider);
  const ids = asked.filter(id => customers.has(id));

  // 前回のメニュー名（来店済み・確定の予約のメニュー名を数える）
  const counts = {};
  if (ids.length) {
    const { data: rs } = await supabase.from('reservations').select('user_id, service_id, reserved_date')
      .eq('provider_id', provider.id).in('user_id', ids).in('status', ['visited', 'approved']).order('reserved_date', { ascending: false }).limit(500);
    const lastSvc = {};
    (rs || []).forEach(r => { if (r.service_id && !lastSvc[r.user_id]) lastSvc[r.user_id] = r.service_id; });
    const svcIds = [...new Set(Object.values(lastSvc))];
    if (svcIds.length) {
      const { data: svcs } = await supabase.from('provider_services').select('id, name').eq('provider_id', provider.id).in('id', svcIds);
      const nameOf = Object.fromEntries((svcs || []).map(s => [s.id, s.name]));
      Object.values(lastSvc).forEach(id => { const n = nameOf[id]; if (n) counts[n] = (counts[n] || 0) + 1; });
    }
  }
  const menus = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => String(n).slice(0, 30));
  const d = await generateOverdueDraft({ storeName: provider.name, category: provider.main_category, menus, count: ids.length || asked.length });
  return Response.json(d);
}
