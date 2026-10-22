// GET /api/providers/[slug]/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&service_id=&staff_id=
// 公開。即時予約で選べる時間の一覧。
// 2026-10-21：店舗が作った「空き枠」ではなく、営業時間・シフト・休憩・部屋・メニューの長さ・入っている予約・
// グループレッスンから毎回計算する（lib/availability-engine.js）。グループレッスンの開催回は /classes で別に返す。
// 返す行は「日付・開始時刻・スタッフ」ごと（スタッフで受ける店では、空いているスタッフの数だけ行が出る）。
// staff_id が空の行は「担当を決めずに受ける」行（部屋・人数で受ける店）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { loadContext, availableStarts } from '@/lib/availability-engine';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const jst = (n = 0) => new Date(Date.now() + 9 * 3600000 + n * 86400000).toISOString().slice(0, 10);

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('from') || '') ? searchParams.get('from') : jst();
  let to = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('to') || '') ? searchParams.get('to') : null;
  // 一度に計算するのは最大31日分
  const maxTo = new Date(`${from}T00:00:00Z`); maxTo.setUTCDate(maxTo.getUTCDate() + 30);
  if (!to || to > maxTo.toISOString().slice(0, 10)) to = (() => { const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 13); return d.toISOString().slice(0, 10); })();
  const serviceId = searchParams.get('service_id');
  const staffId = searchParams.get('staff_id');

  const { data: provider } = await supabase
    .from('providers')
    .select('id, plan, enabled_features, business_hours, booking_unit, booking_interval_minutes, store_capacity, booking_cutoff_hours, booking_cutoff_mode, booking_cutoff_time')
    .eq('slug', slug).eq('published', true).eq('admin_hidden', false)
    .single();
  if (!provider) return Response.json([]);

  const ctx = await loadContext(supabase, provider, from, to);
  const service = serviceId ? ctx.services[serviceId] : null;
  if (serviceId && !service) return Response.json([]);
  const starts = availableStarts(ctx, { service, from, to, staffId: staffId || null });
  const staffName = Object.fromEntries(ctx.staff.map(s => [s.id, s.name]));
  // チケット専用のメニューの枠（チケットが使えても単発で予約できるメニューは誰にでも出す。2026-10-22）
  const limited = (service?.ticket_ids || []).length > 0 && !!service?.ticket_only;
  const rows = [];
  for (const x of starts) {
    const base = { date: x.date, start_time: x.start_time, end_time: x.end_time, service_id: serviceId || null, remaining: 1, limited };
    if (x.staff_ids.length) x.staff_ids.forEach(sid => rows.push({ ...base, id: `${x.date}|${x.start_time}|${sid}`, staff_id: sid, staff_name: staffName[sid] || null }));
    else rows.push({ ...base, id: `${x.date}|${x.start_time}|`, staff_id: null, staff_name: null });
  }
  return Response.json(rows);
}
