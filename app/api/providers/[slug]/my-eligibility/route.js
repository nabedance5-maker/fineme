// GET /api/providers/[slug]/my-eligibility → ログイン中のお客様が、この店舗のどのメニューを予約できるか
// チケットが要るメニューの出し分けと、予約に使うチケットの候補、会員には表示しないメニュー（でお要望 2026-10-22）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { customerEntitlements, checkService, hiddenForMember, needsTicket } from '@/lib/booking-eligibility';
import { isStoreCustomer } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase.from('providers').select('id, require_member_registration').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } = {} } = token ? await supabase.auth.getUser(token).catch(() => ({ data: {} })) : { data: {} };
  const ent = user ? await customerEntitlements(supabase, provider.id, user.id) : { tickets: [], planIds: [], isMember: false };
  const { data: svcs } = await supabase.from('provider_services').select('id, ticket_ids, ticket_cost, ticket_only, hide_for_members').eq('provider_id', provider.id);
  const services = Object.fromEntries((svcs || []).filter(needsTicket).map(s => { const c = checkService(s, ent); return [s.id, { ok: c.ok, via: c.via, ticket_only: c.ticketOnly, ticket_ids: c.tickets.map(t => t.id) }]; }));
  const hidden = (svcs || []).filter(s => hiddenForMember(s, ent)).map(s => s.id);
  // グループレッスン（でお要望 2026-10-22：開催回の予約もチケットを使う）
  const { data: cls } = await supabase.from('provider_classes').select('id, ticket_ids, ticket_cost, ticket_only').eq('provider_id', provider.id);
  const classes = Object.fromEntries((cls || []).filter(needsTicket).map(c => { const r = checkService(c, ent); return [c.id, { ok: r.ok, ticket_only: r.ticketOnly, ticket_ids: r.tickets.map(t => t.id) }]; }));
  // 会員登録してから予約・入会のお店か、このお客様は登録済みか（2026-10-28）
  const memberRequired = !!provider.require_member_registration;
  const memberRegistered = memberRequired && user ? await isStoreCustomer(provider.id, user.id) : !memberRequired;
  return Response.json({ logged_in: !!user, member_required: memberRequired, member_registered: memberRegistered, tickets: ent.tickets, member: ent.isMember, services, classes, hidden_for_member: hidden });
}
