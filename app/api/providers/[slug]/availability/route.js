// GET /api/providers/[slug]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&service_id=
// 公開。即時予約モード（hacomono/STORES網羅計画 Phase 1）用の空き枠取得。
// enabled_features.instant_bookingがオフの店舗でも枠自体は返す（表示側でフラグを見て
// 出し分ける方針。このAPI自体はデータ取得に徹する）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// この枠を実質的に占有している予約ステータス（キャンセル・お断りは除く）
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const serviceId = searchParams.get('service_id');

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();
  if (!provider) return Response.json([]);

  let query = supabase
    .from('provider_slots')
    .select('id, date, start_time, end_time, capacity, service_id, staff_id, resource_id')
    .eq('provider_id', provider.id)
    .eq('is_open', true)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data: slots, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!slots?.length) return Response.json([]);

  // service_id指定時は「そのサービス専用の枠」＋「全サービス共通の枠(service_id=NULL)」を両方残す
  const filtered = serviceId ? slots.filter(s => !s.service_id || s.service_id === serviceId) : slots;
  if (!filtered.length) return Response.json([]);

  const slotIds = filtered.map(s => s.id);
  const { data: booked } = await supabase
    .from('reservations')
    .select('slot_id')
    .in('slot_id', slotIds)
    .in('status', OCCUPYING_STATUSES);
  const bookedCount = {};
  (booked || []).forEach(r => { if (r.slot_id) bookedCount[r.slot_id] = (bookedCount[r.slot_id] || 0) + 1; });

  const staffIds = [...new Set(filtered.map(s => s.staff_id).filter(Boolean))];
  let staffMap = {};
  if (staffIds.length) {
    const { data: staffRows } = await supabase.from('provider_staff').select('id, name').in('id', staffIds);
    (staffRows || []).forEach(s => { staffMap[s.id] = s.name; });
  }

  const open = filtered
    .map(s => ({
      ...s,
      remaining: s.capacity - (bookedCount[s.id] || 0),
      staff_name: s.staff_id ? (staffMap[s.staff_id] || null) : null,
    }))
    .filter(s => s.remaining > 0);

  return Response.json(open);
}
