// GET /api/providers/[slug]/classes → 公開。予約可能な開催回付きのクラス一覧
// （でお指摘2026-09-16：クラス管理は名簿管理のみで、お客様が予約できる導線が
// 店舗ページに無かった。この一覧をもとに店舗ページの「クラス」タブで予約を受け付ける）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withScopeLabels } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();
  if (!provider) return Response.json({ classes: [], rooms: [], sessions: [] });

  const { data: classes } = await supabase
    .from('provider_classes')
    .select('id, name, description, capacity, price, instructor_staff_id, place, ticket_ids, ticket_cost')
    .eq('provider_id', provider.id)
    .eq('active', true)
    .order('sort_order');
  if (!classes?.length) return Response.json({ classes: [], rooms: [], sessions: [] });

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const classIds = classes.map(c => c.id);
  const { data: sessions } = await supabase
    .from('provider_slots')
    .select('id, class_id, date, start_time, end_time, capacity, staff_id, resource_id')
    .eq('provider_id', provider.id)
    .in('class_id', classIds)
    .eq('is_open', true)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(2000);

  const staffIds = [...new Set([...(sessions || []).map(s => s.staff_id), ...classes.map(c => c.instructor_staff_id)].filter(Boolean))];
  const resourceIds = [...new Set((sessions || []).map(s => s.resource_id).filter(Boolean))];
  const [bookedRes, staffRes, resRes] = await Promise.all([
    sessions?.length ? supabase.from('reservations').select('slot_id').in('slot_id', sessions.map(s => s.id)).in('status', OCCUPYING_STATUSES) : { data: [] },
    staffIds.length ? supabase.from('provider_staff').select('id, name, photo_url, is_public').in('id', staffIds) : { data: [] },
    resourceIds.length ? supabase.from('provider_resources').select('id, name, sort_order').in('id', resourceIds) : { data: [] },
  ]);
  const bookedCount = {};
  (bookedRes.data || []).forEach(r => { if (r.slot_id) bookedCount[r.slot_id] = (bookedCount[r.slot_id] || 0) + 1; });
  // 非公開のスタッフは名前・写真を出さない
  const staffOf = Object.fromEntries((staffRes.data || []).filter(s => s.is_public !== false).map(s => [s.id, { name: s.name, photo_url: s.photo_url || null }]));
  const classOf = Object.fromEntries(classes.map(c => [c.id, c]));
  const resNameOf = Object.fromEntries((resRes.data || []).map(r => [r.id, r.name]));

  // でお要望（2026-10-16）：hacomonoのように、日付ごとに部屋の列で開催回をカードで並べて見せる。
  // 満席の回も「満席」として返す（並びが崩れないように）。
  const flat = (sessions || []).map(s => ({
    id: s.id, class_id: s.class_id, class_name: classOf[s.class_id]?.name || '', date: s.date,
    start_time: s.start_time, end_time: s.end_time, capacity: s.capacity,
    remaining: Math.max(0, s.capacity - (bookedCount[s.id] || 0)),
    resource_id: s.resource_id || null,
    // 列に使う部屋・場所：開催回の部屋（部屋・設備）→ レッスンに設定した部屋・場所
    place: resNameOf[s.resource_id] || classOf[s.class_id]?.place || null,
    staff: staffOf[s.staff_id || classOf[s.class_id]?.instructor_staff_id] || null,
  }));
  const rooms = [...new Set(flat.map(x => x.place).filter(Boolean))].map(n => ({ id: n, name: n }));

  // チケットが要るレッスンには「ストレッチチケット（1回1枚）をお持ちの方」の説明を付ける（でお要望 2026-10-22）
  const labeled = await withScopeLabels(supabase, provider.id, classes);
  return Response.json({
    classes: labeled.map(c => ({ id: c.id, name: c.name, description: c.description, capacity: c.capacity, price: c.price ?? null, ticket_cost: c.ticket_cost || 1, needs_ticket: (c.ticket_ids || []).length > 0, ticket_ids: c.ticket_ids || [], scope_label: c.scope_label || '' })),
    rooms,
    sessions: flat,
  });
}
