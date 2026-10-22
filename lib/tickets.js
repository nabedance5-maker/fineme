// チケット（でお要望 2026-10-22）の共通処理
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// このチケットを使えるメニューを決める（メニューの ticket_ids に足す・外す）
export async function setTicketMenus(providerId, ticketId, menuIds, costs = {}) {
  const want = new Set(menuIds || []);
  const { data: svcs } = await supabase.from('provider_services').select('id, ticket_ids, ticket_cost').eq('provider_id', providerId);
  for (const s of svcs || []) {
    const cur = s.ticket_ids || [];
    const has = cur.includes(ticketId);
    const cost = costs[s.id] ? Math.max(1, Math.min(20, parseInt(costs[s.id], 10) || 1)) : null;
    if (has === want.has(s.id) && (!cost || cost === s.ticket_cost)) continue;
    const next = want.has(s.id) ? [...new Set([...cur, ticketId])] : cur.filter(id => id !== ticketId);
    await supabase.from('provider_services').update({ ticket_ids: next, ...(cost && want.has(s.id) ? { ticket_cost: cost } : {}) }).eq('id', s.id).eq('provider_id', providerId);
  }
}
