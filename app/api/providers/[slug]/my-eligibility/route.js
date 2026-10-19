// GET /api/providers/[slug]/my-eligibility → ログイン中のお客様が、この店舗のどのメニューを予約できるか（でお要望 2026-10-20）
// 回数券・会員プランの方だけが予約できるメニューの出し分けと、回数券で予約する時の候補に使う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { customerEntitlements, checkService } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } = {} } = token ? await supabase.auth.getUser(token).catch(() => ({ data: {} })) : { data: {} };
  const ent = user ? await customerEntitlements(supabase, provider.id, user.id) : { tickets: [], planIds: [] };
  const { data: svcs } = await supabase.from('provider_services').select('id, booking_scope, allow_ticket, eligible_package_ids, allow_membership, eligible_plan_ids').eq('provider_id', provider.id).eq('booking_scope', 'limited');
  const services = Object.fromEntries((svcs || []).map(s => { const c = checkService(s, ent); return [s.id, { ok: c.ok, via: c.via, ticket_ids: c.tickets.map(t => t.id) }]; }));
  return Response.json({ logged_in: !!user, tickets: ent.tickets, member: ent.planIds.length > 0, services });
}
