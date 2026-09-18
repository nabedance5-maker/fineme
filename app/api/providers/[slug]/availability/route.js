// GET /api/providers/[slug]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&service_id=
// 公開。即時予約モード（hacomono/STORES網羅計画 Phase 1）用の空き枠取得。
// enabled_features.instant_bookingがオフの店舗でも枠自体は返す（表示側でフラグを見て
// 出し分ける方針。このAPI自体はデータ取得に徹する）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';
import { getShiftScheduleForRange, isOutsideShift } from '@/lib/shift-availability';
import { isPastBookingCutoff } from '@/lib/booking-cutoff';

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
    .select('id, enabled_features, booking_cutoff_hours, booking_cutoff_mode, booking_cutoff_time')
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
  let filtered = serviceId ? slots.filter(s => !s.service_id || s.service_id === serviceId) : slots;
  if (!filtered.length) return Response.json([]);

  // dates（対象日付一覧）は以降の複数のチェック（締切・臨時休業・休憩ブロック・シフト）で
  // 使うため、最初に1回だけ計算する（レビューで発覚：以前はこの下のスタッフ休憩ブロックの
  // 箇所で初めて宣言していたため、それより前にある臨時休業日チェックが「宣言前のdatesを
  // 参照」してReferenceErrorになり、即時予約の空き枠取得が丸ごと500エラーで落ちていた）。
  const dates = [...new Set(filtered.map(s => s.date))];

  // 予約可能時間の締切（でお確認2026-09-18：「予約可能時間の設定どこ（前日21時まで
  // 予約可能等）」）。開始時刻から起算した「◯時間前まで」、または「前日◯時まで」。
  filtered = filtered.filter(s => !isPastBookingCutoff(provider, s.date, s.start_time));
  if (!filtered.length) return Response.json([]);

  // 臨時休業日（でお要望2026-09-18）。枠自体は自動生成時に既に除外されているはずだが、
  // 手動で作った枠や、枠を作った後に臨時休業に設定した場合に備えて念のため確認する。
  const { data: closedDates } = await supabase
    .from('provider_closed_dates')
    .select('date')
    .eq('provider_id', provider.id)
    .in('date', dates);
  if (closedDates?.length) {
    const closedSet = new Set(closedDates.map(c => c.date));
    filtered = filtered.filter(s => !closedSet.has(s.date));
    if (!filtered.length) return Response.json([]);
  }

  // スタッフの休憩・外出ブロック（でお要望2026-09-14）と重なる枠は、お客様には見せない。
  // 枠自体はauto-generate時点で除外済みのことが多いが、枠を生成した後にブロックが
  // 追加された場合に備えて、公開一覧の取得時にも都度除外する（二重の安全策）。
  const { data: blocks } = await supabase
    .from('provider_staff_blocks')
    .select('staff_id, date, start_time, end_time')
    .eq('provider_id', provider.id)
    .in('date', dates);
  if (blocks?.length) {
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    filtered = filtered.filter(s => {
      if (!s.staff_id) return true;
      return !blocks.some(b => b.staff_id === s.staff_id && b.date === s.date && toMin(s.start_time) < toMin(b.end_time) && toMin(s.end_time) > toMin(b.start_time));
    });
  }
  if (!filtered.length) return Response.json([]);

  // スタッフのシフト外（確定シフトはあるが、このスタッフの勤務予定が無い／時間外）の
  // 枠も予約させない（でお報告2026-09-16：従来はカレンダーのグレー表示だけで、公開
  // 予約枠には一切反映されていなかった）。shift_management機能を使っている店舗のみ。
  if (hasFeature(provider, 'shift_management')) {
    const schedule = await getShiftScheduleForRange(supabase, provider.id, dates[0], dates[dates.length - 1]);
    filtered = filtered.filter(s => !isOutsideShift(schedule, s.staff_id, s.date, s.start_time, s.end_time));
    if (!filtered.length) return Response.json([]);
  }

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
