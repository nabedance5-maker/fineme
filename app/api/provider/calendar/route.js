// GET /api/provider/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD → カレンダー表示用データ
// 申請制（承認済み）・即時予約（自動確定）はもちろん、返答待ちの申請中リクエスト（pending）も
// 第1希望の日時・スタッフの場所に表示する（でお要望2026-09-12：予約リクエストが届いたら
// カレンダー上でも該当の時間・スタッフのところが分かるようにしたい）。フロント側でpendingは
// 見た目を変える（is-pending）ことで、確定済みと区別できるようにする。
// counter_proposed（店舗が代替日時を提案し、お客様の返答待ち）も同様に対象に含める
// （でお報告2026-09-12：代替提案後カレンダーから消えて見えなくなっていた漏れを修正）。
// この場合の表示日時はお客様の第1希望ではなく、店舗が提案したcounter_date/counter_time。
//
// パフォーマンス注意（でお報告2026-09-16：「読み込みがめちゃくちゃ遅い」）：
// グループレッスン対応で増えた付随データ取得（クラス名・部屋名・スタッフ名・予約数）は
// 直列awaitで積み上げると1リクエストで6〜7往復のDB通信になり致命的に遅くなる。
// ①class_management機能を使っていない店舗ではクラス関連クエリを丸ごとスキップする
// ②残りの付随クエリは全てPromise.allで並列実行する、の2点を必ず守ること。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, enabled_features').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return Response.json({ error: 'fromとtoは必須です' }, { status: 400 });

  const classFeatureOn = hasFeature(provider, 'class_management');

  // confirmed_date（承認済み予約の確定日）とreserved_date（即時予約はここに確定日が入る。
  // POST /api/reservations の instant分岐でconfirmed_date/reserved_date両方に同じ値を設定済み）
  // の両方にまたがる可能性があるため、範囲を広めに1ヶ月分見てからJS側で絞り込む方が
  // シンプル・確実（OR条件でのANDレンジ絞り込みはSupabaseクエリビルダーで書きにくいため）。
  const [{ data: allRows, error }, { data: classSlots }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, user_id, user_name, user_contact, note, status, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, staff_id, staff_manually_assigned, resource_id, booking_mode, slot_id, class_id')
      .eq('provider_id', provider.id)
      .in('status', ['pending', 'approved', 'visited', 'counter_proposed'])
      .gte('reserved_date', from)
      .lte('reserved_date', to),
    classFeatureOn
      ? supabase
        .from('provider_slots')
        .select('id, date, start_time, end_time, capacity, is_open, class_id, staff_id, resource_id')
        .eq('provider_id', provider.id)
        .not('class_id', 'is', null)
        .gte('date', from)
        .lte('date', to)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // グループレッスンの開催回に紐づく予約は、1人ずつのブロックではなく開催回1件＝
  // 「残り枠数」の集約ブロックとして表示する（でお要望2026-09-16）。個別の
  // ブロックとしては表示しない（class_idが付いたものを除外）。
  const rows = (allRows || []).filter(r => !r.class_id);

  const staffIds = [...new Set([...(rows || []).map(r => r.staff_id), ...(classSlots || []).map(s => s.staff_id)].filter(Boolean))];
  const resourceIds = [...new Set([...(rows || []).map(r => r.resource_id), ...(classSlots || []).map(s => s.resource_id)].filter(Boolean))];
  const classIds = [...new Set((classSlots || []).map(s => s.class_id).filter(Boolean))];
  const classSlotIds = (classSlots || []).map(s => s.id);
  const instantSlotIds = [...new Set((rows || []).filter(r => r.booking_mode === 'instant' && r.slot_id).map(r => r.slot_id))];

  const [staffRowsRes, resourceRowsRes, classRowsRes, bookedRowsRes, slotRowsRes] = await Promise.all([
    staffIds.length ? supabase.from('provider_staff').select('id, name').in('id', staffIds) : Promise.resolve({ data: [] }),
    resourceIds.length ? supabase.from('provider_resources').select('id, name').in('id', resourceIds) : Promise.resolve({ data: [] }),
    classIds.length ? supabase.from('provider_classes').select('id, name').in('id', classIds) : Promise.resolve({ data: [] }),
    classSlotIds.length ? supabase.from('reservations').select('slot_id').in('slot_id', classSlotIds).in('status', OCCUPYING_STATUSES) : Promise.resolve({ data: [] }),
    instantSlotIds.length ? supabase.from('provider_slots').select('id, start_time, end_time').in('id', instantSlotIds) : Promise.resolve({ data: [] }),
  ]);

  const staffMap = {};
  (staffRowsRes.data || []).forEach(s => { staffMap[s.id] = s.name; });
  const resourceMap = {};
  (resourceRowsRes.data || []).forEach(r => { resourceMap[r.id] = r.name; });
  const classNameMap = {};
  (classRowsRes.data || []).forEach(c => { classNameMap[c.id] = c.name; });
  const bookedCountMap = {};
  (bookedRowsRes.data || []).forEach(b => { if (b.slot_id) bookedCountMap[b.slot_id] = (bookedCountMap[b.slot_id] || 0) + 1; });
  const slotDurationMap = {};
  (slotRowsRes.data || []).forEach(s => {
    if (!s.start_time || !s.end_time) return;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    slotDurationMap[s.id] = (eh * 60 + em) - (sh * 60 + sm);
  });

  const classSessionItems = (classSlots || []).map(s => {
    const [sh, sm] = (s.start_time || '0:0').split(':').map(Number);
    const [eh, em] = (s.end_time || '0:0').split(':').map(Number);
    const booked = bookedCountMap[s.id] || 0;
    return {
      id: `csess:${s.id}`,
      _isClassSession: true,
      slot_id: s.id,
      class_id: s.class_id,
      class_name: classNameMap[s.class_id] || null,
      date: s.date,
      time: s.start_time,
      end_time: s.end_time,
      status: 'approved',
      staff_id: s.staff_id || null,
      staff_name: s.staff_id ? staffMap[s.staff_id] || null : null,
      resource_id: s.resource_id || null,
      resource_name: s.resource_id ? resourceMap[s.resource_id] || null : null,
      capacity: s.capacity,
      booked,
      remaining: Math.max(0, s.capacity - booked),
      is_open: s.is_open,
      duration_minutes: (eh * 60 + em) - (sh * 60 + sm),
    };
  });

  const result = (rows || [])
    .map(r => ({
      id: r.id,
      date: r.confirmed_date || r.counter_date || r.reserved_date,
      time: r.confirmed_time || r.counter_time || r.start_time,
      user_id: r.user_id || null,
      user_name: r.user_name,
      user_contact: r.user_contact || null,
      note: r.note,
      status: r.status,
      booking_mode: r.booking_mode || 'request',
      staff_id: r.staff_id || null,
      staff_name: r.staff_id ? staffMap[r.staff_id] || null : null,
      staff_manually_assigned: !!r.staff_manually_assigned,
      resource_id: r.resource_id || null,
      resource_name: r.resource_id ? resourceMap[r.resource_id] || null : null,
      duration_minutes: r.slot_id ? slotDurationMap[r.slot_id] || null : null,
    }))
    .concat(classSessionItems)
    .filter(r => r.date >= from && r.date <= to)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  return Response.json(result);
}
