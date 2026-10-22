// GET /api/providers/[slug]/my-eligibility → ログイン中のお客様が、この店舗のどのメニューを予約できるか
// チケットが要るメニューの出し分けと、予約に使うチケットの候補、会員には表示しないメニュー（でお要望 2026-10-22）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { customerEntitlements, checkService, hiddenForMember, needsTicket } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } = {} } = token ? await supabase.auth.getUser(token).catch(() => ({ data: {} })) : { data: {} };
  const ent = user ? await customerEntitlements(supabase, provider.id, user.id) : { tickets: [], planIds: [], isMember: false };
  const { data: svcs } = await supabase.from('provider_services').select('id, ticket_ids, ticket_cost, hide_for_members').eq('provider_id', provider.id);
  const services = Object.fromEntries((svcs || []).filter(needsTicket).map(s => { const c = checkService(s, ent); return [s.id, { ok: c.ok, via: c.via, ticket_ids: c.tickets.map(t => t.id) }]; }));
  const hidden = (svcs || []).filter(s => hiddenForMember(s, ent)).map(s => s.id);
  return Response.json({ logged_in: !!user, tickets: ent.tickets, member: ent.isMember, services, hidden_for_member: hidden });
}
