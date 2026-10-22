// GET/POST /api/provider/tickets → チケットの種類（でお要望 2026-10-22：チケットを消費して予約する）
// 例：「ストレッチチケット」。メニューごとに使えるチケットを決め、回数券・月額プラン・お店からの付与でお客様に付く。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { setTicketMenus } from '@/lib/tickets';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const [{ data: rows }, { data: svcs }, { data: pkgs }, { data: plans }] = await Promise.all([
    supabase.from('provider_tickets').select('id, name, description, active, sort_order').eq('provider_id', pid).order('sort_order').order('created_at'),
    supabase.from('provider_services').select('id, name, ticket_ids, ticket_cost').eq('provider_id', pid),
    supabase.from('service_packages').select('id, name, ticket_id, total_sessions, package_type, price').eq('provider_id', pid),
    supabase.from('provider_membership_plans').select('id, name, ticket_grants').eq('provider_id', pid),
  ]);
  // どのメニューで使えて、どの回数券・プランで付くか（チケットの画面で一目で分かるように）
  return Response.json((rows || []).map(t => ({
    ...t,
    menus: (svcs || []).filter(s => (s.ticket_ids || []).includes(t.id)).map(s => ({ id: s.id, name: s.name, cost: s.ticket_cost || 1 })),
    packages: (pkgs || []).filter(p => p.ticket_id === t.id).map(p => ({ id: p.id, name: p.name, sessions: p.total_sessions, package_type: p.package_type, price: p.price })),
    plans: (plans || []).filter(p => (p.ticket_grants || []).some(g => g.ticket_id === t.id)).map(p => ({ id: p.id, name: p.name, grants: (p.ticket_grants || []).filter(g => g.ticket_id === t.id) })),
  })));
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 60);
  if (!name) return Response.json({ error: 'チケットの名前を入れてください' }, { status: 400 });
  const { count } = await supabase.from('provider_tickets').select('id', { count: 'exact', head: true }).eq('provider_id', a.provider.id);
  const { data, error } = await supabase.from('provider_tickets').insert({ provider_id: a.provider.id, name, description: String(b.description || '').slice(0, 200) || null, sort_order: count || 0 }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  // 使えるメニューも一緒に決める
  if (Array.isArray(b.menu_ids) && b.menu_ids.length) await setTicketMenus(a.provider.id, data.id, b.menu_ids, b.costs || {});
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
