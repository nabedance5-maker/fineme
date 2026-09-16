// GET /api/providers/[slug]/classes → 公開。予約可能な開催回付きのクラス一覧
// （でお指摘2026-09-16：クラス管理は名簿管理のみで、お客様が予約できる導線が
// 店舗ページに無かった。この一覧をもとに店舗ページの「クラス」タブで予約を受け付ける）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

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
  if (!provider) return Response.json([]);

  const { data: classes } = await supabase
    .from('provider_classes')
    .select('id, name, description, capacity')
    .eq('provider_id', provider.id)
    .eq('active', true)
    .order('sort_order');
  if (!classes?.length) return Response.json([]);

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const classIds = classes.map(c => c.id);
  const { data: sessions } = await supabase
    .from('provider_slots')
    .select('id, class_id, date, start_time, end_time, capacity')
    .eq('provider_id', provider.id)
    .in('class_id', classIds)
    .eq('is_open', true)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  let bookedCount = {};
  if (sessions?.length) {
    const { data: booked } = await supabase.from('reservations').select('slot_id').in('slot_id', sessions.map(s => s.id)).in('status', OCCUPYING_STATUSES);
    (booked || []).forEach(r => { if (r.slot_id) bookedCount[r.slot_id] = (bookedCount[r.slot_id] || 0) + 1; });
  }

  const sessionsByClass = {};
  (sessions || []).forEach(s => {
    const remaining = s.capacity - (bookedCount[s.id] || 0);
    if (remaining <= 0) return;
    (sessionsByClass[s.class_id] = sessionsByClass[s.class_id] || []).push({ id: s.id, date: s.date, start_time: s.start_time, end_time: s.end_time, remaining });
  });

  return Response.json(classes.map(c => ({ ...c, sessions: sessionsByClass[c.id] || [] })));
}
