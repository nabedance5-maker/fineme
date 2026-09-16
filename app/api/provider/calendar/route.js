// GET /api/provider/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD → カレンダー表示用データ
// 申請制（承認済み）・即時予約（自動確定）はもちろん、返答待ちの申請中リクエスト（pending）も
// 第1希望の日時・スタッフの場所に表示する（でお要望2026-09-12：予約リクエストが届いたら
// カレンダー上でも該当の時間・スタッフのところが分かるようにしたい）。フロント側でpendingは
// 見た目を変える（is-pending）ことで、確定済みと区別できるようにする。
// counter_proposed（店舗が代替日時を提案し、お客様の返答待ち）も同様に対象に含める
// （でお報告2026-09-12：代替提案後カレンダーから消えて見えなくなっていた漏れを修正）。
// この場合の表示日時はお客様の第1希望ではなく、店舗が提案したcounter_date/counter_time。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
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

  // confirmed_date（承認済み予約の確定日）とreserved_date（即時予約はここに確定日が入る。
  // POST /api/reservations の instant分岐でconfirmed_date/reserved_date両方に同じ値を設定済み）
  // の両方にまたがる可能性があるため、範囲を広めに1ヶ月分見てからJS側で絞り込む方が
  // シンプル・確実（OR条件でのANDレンジ絞り込みはSupabaseクエリビルダーで書きにくいため）。
  const { data: allRows, error } = await supabase
    .from('reservations')
    .select('id, user_id, user_name, user_contact, note, status, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, staff_id, staff_manually_assigned, resource_id, booking_mode, slot_id, class_id')
    .eq('provider_id', provider.id)
    .in('status', ['pending', 'approved', 'visited', 'counter_proposed'])
    .gte('reserved_date', from)
    .lte('reserved_date', to);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // グループレッスンの開催回に紐づく予約は、1人ずつのブロックではなく開催回1件＝
  // 「残り枠数」の集約ブロックとして表示する（でお要望2026-09-16）。個別の
  // ブロックとしては表示しない（下でclass_idが付いたものを除外）。
  const rows = (allRows || []).filter(r => !r.class_id);

  // グループレッスンの開催回自体（provider_slots、class_id付き）を範囲内で取得。
  const { data: classSlots } = await supabase
    .from('provider_slots')
    .select('id, date, start_time, end_time, capacity, is_open, class_id, staff_id, resource_id')
    .eq('provider_id', provider.id)
    .not('class_id', 'is', null)
    .gte('date', from)
    .lte('date', to);

  const staffIds = [...new Set([...(rows || []).map(r => r.staff_id), ...(classSlots || []).map(s => s.staff_id)].filter(Boolean))];
  let staffMap = {};
  if (staffIds.length) {
    const { data: staffRows } = await supabase.from('provider_staff').select('id, name').in('id', staffIds);
    (staffRows || []).forEach(s => { staffMap[s.id] = s.name; });
  }

  const resourceIds = [...new Set([...(rows || []).map(r => r.resource_id), ...(classSlots || []).map(s => s.resource_id)].filter(Boolean))];
  let resourceMap = {};
  if (resourceIds.length) {
    const { data: resourceRows } = await supabase.from('provider_resources').select('id, name').in('id', resourceIds);
    (resourceRows || []).forEach(r => { resourceMap[r.id] = r.name; });
  }

  let classSessionItems = [];
  if (classSlots?.length) {
    const classIds = [...new Set(classSlots.map(s => s.class_id))];
    const { data: classRows } = await supabase.from('provider_classes').select('id, name').in('id', classIds);
    const classNameMap = {};
    (classRows || []).forEach(c => { classNameMap[c.id] = c.name; });

    const classSlotIds = classSlots.map(s => s.id);
    const { data: bookedRows } = await supabase.from('reservations').select('slot_id').in('slot_id', classSlotIds).in('status', ['pending', 'approved', 'counter_proposed', 'visited']);
    const bookedCountMap = {};
    (bookedRows || []).forEach(b => { if (b.slot_id) bookedCountMap[b.slot_id] = (bookedCountMap[b.slot_id] || 0) + 1; });

    classSessionItems = classSlots.map(s => {
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
  }

  // 即時予約は紐づくprovider_slotsの実際の開始/終了時刻から所要時間を計算できる
  // （申請制はメニューの所要時間を保持していないため、フロント側で目安値にフォールバックする）
  const slotIds = [...new Set((rows || []).filter(r => r.booking_mode === 'instant' && r.slot_id).map(r => r.slot_id))];
  let slotDurationMap = {};
  if (slotIds.length) {
    const { data: slotRows } = await supabase.from('provider_slots').select('id, start_time, end_time').in('id', slotIds);
    (slotRows || []).forEach(s => {
      if (!s.start_time || !s.end_time) return;
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      slotDurationMap[s.id] = (eh * 60 + em) - (sh * 60 + sm);
    });
  }

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
