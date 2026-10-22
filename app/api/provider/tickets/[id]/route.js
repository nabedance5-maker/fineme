// PATCH/DELETE /api/provider/tickets/[id] → チケットの名前・説明・使えるメニューの変更、削除（でお要望 2026-10-22）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { setTicketMenus } from '@/lib/tickets';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __PATCH(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const update = {};
  if ('name' in b) { const n = String(b.name || '').trim().slice(0, 60); if (!n) return Response.json({ error: 'チケットの名前を入れてください' }, { status: 400 }); update.name = n; }
  if ('description' in b) update.description = String(b.description || '').slice(0, 200) || null;
  if ('active' in b) update.active = !!b.active;
  const { data, error } = await supabase.from('provider_tickets').update(update).eq('id', id).eq('provider_id', a.provider.id).select().single();
  if (error || !data) return Response.json({ error: 'チケットが見つかりません' }, { status: 404 });
  if (Array.isArray(b.menu_ids)) await setTicketMenus(a.provider.id, id, b.menu_ids, b.costs || {});
  if (Array.isArray(b.lesson_ids)) await setTicketMenus(a.provider.id, id, b.lesson_ids, b.lesson_costs || {}, 'provider_classes');
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // お客様が持っているチケットがあるうちは消さない（持っている分の扱いが分からなくなるため）
  const { count } = await supabase.from('customer_packages').select('id', { count: 'exact', head: true }).eq('ticket_id', id).eq('provider_id', a.provider.id);
  if (count) return Response.json({ error: 'このチケットを持っているお客様がいるため削除できません。「使わない」にしてください' }, { status: 409 });
  await setTicketMenus(a.provider.id, id, []);
  await setTicketMenus(a.provider.id, id, [], {}, 'provider_classes');
  await supabase.from('provider_tickets').delete().eq('id', id).eq('provider_id', a.provider.id);
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
