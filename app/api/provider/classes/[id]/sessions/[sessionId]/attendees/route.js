// GET  /api/provider/classes/[id]/sessions/[sessionId]/attendees → その開催回の予約者一覧
// POST /api/provider/classes/[id]/sessions/[sessionId]/attendees → お店が参加者を追加する（でお要望 2026-10-22：
//   予約スケジュールから会員と紐づけて予約を入れる。チケットが要るレッスンは、その会員のチケットで予約する）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';
import { withAudit } from '@/lib/activity-log';
import { customerEntitlements, checkService, needsTicket, requiresTicket } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'class_management'); if (locked) return locked; }

  const { data: slot } = await supabase.from('provider_slots').select('id').eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id).single();
  if (!slot) return Response.json({ error: '開催回が見つかりません' }, { status: 404 });

  const { data: rows, error } = await supabase
    .from('reservations')
    .select('id, user_id, user_name, user_contact, status, package_id, ticket_cost')
    .eq('slot_id', sessionId)
    .in('status', OCCUPYING_STATUSES)
    .order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(rows || []);
}

async function __POST(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'class_management'); if (locked) return locked; }

  const [{ data: slot }, { data: cls }] = await Promise.all([
    supabase.from('provider_slots').select('id, date, start_time, end_time, capacity, staff_id, resource_id').eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id).maybeSingle(),
    supabase.from('provider_classes').select('id, name, ticket_ids, ticket_cost, ticket_only, instructor_staff_id, resource_id').eq('id', id).eq('provider_id', provider.id).maybeSingle(),
  ]);
  if (!slot || !cls) return Response.json({ error: '開催回が見つかりません' }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const name = String(b.user_name || '').trim().slice(0, 60);
  if (!name) return Response.json({ error: 'お客様のお名前を入れてください' }, { status: 400 });
  const { count } = await supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('slot_id', sessionId).in('status', OCCUPYING_STATUSES);
  if (slot.capacity && (count || 0) >= slot.capacity) return Response.json({ error: 'この回は満席です' }, { status: 409 });
  if (b.user_id) {
    const { data: dup } = await supabase.from('reservations').select('id').eq('slot_id', sessionId).eq('user_id', b.user_id).in('status', OCCUPYING_STATUSES).limit(1);
    if (dup?.length) return Response.json({ error: 'この方はすでにこの回を予約しています' }, { status: 409 });
  }
  let pkg = null;
  // チケット専用のレッスンはチケットが必須。そうでないレッスンは、チケットを選んだ時だけ使う（選ばなければ単発）。2026-10-22
  if (requiresTicket(cls) || (needsTicket(cls) && b.package_id)) {
    if (!b.user_id) return Response.json({ error: 'チケットを使う参加は、会員を選んでください' }, { status: 400 });
    const chk = checkService(cls, await customerEntitlements(supabase, provider.id, b.user_id));
    if (!chk.tickets.length) return Response.json({ error: `この方は「${cls.name}」に使えるチケットを${cls.ticket_cost || 1}枚お持ちではありません`, code: 'no_ticket' }, { status: 409 });
    pkg = chk.tickets.find(t => t.id === b.package_id) || (requiresTicket(cls) ? chk.tickets[0] : null);
    if (!pkg) return Response.json({ error: '選んだチケットはこのレッスンに使えません' }, { status: 400 });
  }
  const t = String(slot.start_time).slice(0, 5);
  const { data, error } = await supabase.from('reservations').insert({
    provider_id: provider.id, user_id: b.user_id || null, user_name: name, user_contact: String(b.user_contact || '').slice(0, 100),
    note: String(b.note || '').slice(0, 500) || `【グループレッスン】${cls.name}`, status: 'approved', booking_mode: 'manual',
    slot_id: slot.id, class_id: cls.id, staff_id: slot.staff_id || cls.instructor_staff_id || null, resource_id: slot.resource_id || cls.resource_id || null,
    reserved_date: slot.date, start_time: t, confirmed_date: slot.date, confirmed_time: t,
    package_id: pkg?.id || null, ticket_cost: pkg ? (cls.ticket_cost || 1) : 1,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
