// POST /api/reservations  - 予約リクエスト作成
// GET  /api/reservations  - 一覧取得（providerId or userId で絞り込み）
import { getSupabase } from '@/lib/supabase';
import { sendReservationCreatedEmails } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { notifyCustomerLine, attributeReferral } from '@/lib/reservation-notify';
import { hasFeature } from '@/lib/feature-flags';
import { getShiftScheduleForRange, isOutsideShift } from '@/lib/shift-availability';
import { isPastBookingCutoff, cutoffDescription } from '@/lib/booking-cutoff';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// スパム対策: 同一IPから1分間に5件まで
const _postRateMap = new Map();
function checkPostRateLimit(ip) {
  const now = Date.now();
  const entry = _postRateMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  _postRateMap.set(ip, entry);
  return entry.count <= 5;
}

async function verifyAuth(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');
  const userId = searchParams.get('userId');

  if (!providerId && !userId) {
    return Response.json({ error: 'providerId または userId が必要です' }, { status: 400 });
  }

  const user = await verifyAuth(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // userIdクエリ: 本人確認
  if (userId && user.id !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // providerIdクエリ: 掲載者本人確認
  if (providerId) {
    const { data: prov } = await getSupabase()
      .from('providers').select('id').eq('email', user.email).single();
    if (!prov || prov.id !== providerId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let query = supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (providerId) query = query.eq('provider_id', providerId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

// この枠を実質的に占有している予約ステータス（キャンセル・お断りは除く）
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkPostRateLimit(ip)) {
    return Response.json({ error: 'しばらく時間をおいてから再送信してください' }, { status: 429 });
  }
  const body = await request.json();
  // preferred_date/preferred_time/message はフロントからの名前。DB上は reserved_date/start_time/note
  const { provider_id, user_name, user_contact, preferred_date, preferred_time, message, user_id } = body;
  // スタッフ指名予約・即時予約モード（hacomono/STORES網羅計画 Phase 1）。
  // staff_idは申請制・即時予約どちらでも受け付ける（指名だけして日程は店舗と相談、も可）。
  // booking_mode省略時は完全に従来通りの申請制コードパス（既存挙動の回帰防止）。
  const { staff_id, booking_mode, slot_id, referral_code, service_id } = body;
  const isInstant = booking_mode === 'instant';

  if (!provider_id || !user_name || !user_contact) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  if (isInstant && !slot_id) {
    return Response.json({ error: '空き枠を選んでください' }, { status: 400 });
  }
  if (!isInstant && (!preferred_date || !preferred_time)) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  // enabled_features（申請制ON/OFF判定用）とmax_active_reservations（同時保持できる
  // 予約数の上限、店舗ごとに変更可）・予約締切設定をまとめて取得。
  const { data: providerFeatureRow } = await supabase.from('providers').select('enabled_features, max_active_reservations, booking_cutoff_mode, booking_cutoff_hours, booking_cutoff_time').eq('id', provider_id).single();

  // 申請制（第1〜3希望→店舗が承認）は店舗ごとにON/OFFできる（でお要望2026-09-14：
  // 「即時予約と同じように、予約リクエストも受け付けるかどうか設定できるように」）。
  // 即時予約リクエストはこのフラグと無関係にそのまま処理する。
  if (!isInstant && !hasFeature(providerFeatureRow, 'booking_request')) {
    return Response.json({ error: 'この店舗は現在、予約リクエストの受付を停止しています' }, { status: 403 });
  }

  // 1人のお客様が同時に保持できる「来店前の予約」の数には上限がある（でお要望2026-09-14。
  // 既定は1件＝来店するまで次の予約を取れない。店舗ごとにmax_active_reservationsで
  // 上限数を変更できる）。ゲスト予約（user_id無し）は本人特定ができないため対象外。
  if (user_id) {
    const maxActive = providerFeatureRow?.max_active_reservations ?? 1;
    const { count } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', provider_id)
      .eq('user_id', user_id)
      .in('status', ['pending', 'approved', 'counter_proposed']);
    if ((count || 0) >= maxActive) {
      return Response.json({ error: `この店舗への予約は同時に${maxActive}件までです。ご来店・キャンセル後に新しい予約リクエストを送ってください。` }, { status: 409 });
    }
  }

  // 指名料のスナップショット（後から店舗が料金を変えても過去の予約には影響しない）
  let designationFee = 0;
  if (staff_id) {
    const { data: staffRow } = await supabase.from('provider_staff').select('booking_fee').eq('id', staff_id).eq('provider_id', provider_id).single();
    designationFee = staffRow?.booking_fee || 0;
  }

  const insertPayload = {
    provider_id,
    user_id: user_id || null,
    user_name,
    user_contact,
    note: message || '',
    status: 'pending',
    staff_id: staff_id || null,
    service_id: service_id || null,
    designation_fee: designationFee,
    booking_mode: isInstant ? 'instant' : 'request',
  };

  let slot = null;
  if (isInstant) {
    // 枠の空き再検証（アプリ側の再カウント方式。Financeの想定同時予約数は少ないため
    // DBレベルの排他制御までは今回不要と判断——決定済みの設計判断、要再確認せず進める）。
    const { data: slotRow } = await supabase.from('provider_slots').select('*').eq('id', slot_id).eq('provider_id', provider_id).single();
    if (!slotRow || !slotRow.is_open) {
      return Response.json({ error: 'この枠は既に締め切られています' }, { status: 409 });
    }
    // 予約可能時間の締切（でお確認2026-09-18：「予約可能時間の設定どこ」）。
    // 公開一覧側でも除外しているが、表示を開いたままにしていた間に締切時刻を過ぎた
    // ケースに備えて予約作成時にも最終確認する。
    if (isPastBookingCutoff(providerFeatureRow, slotRow.date, slotRow.start_time)) {
      return Response.json({ error: `この枠は予約受付を締め切りました（${cutoffDescription(providerFeatureRow)}）。別の枠をお選びください` }, { status: 409 });
    }
    // 臨時休業日（でお要望2026-09-18）の最終確認。
    const { data: closedRow } = await supabase.from('provider_closed_dates').select('date').eq('provider_id', provider_id).eq('date', slotRow.date).maybeSingle();
    if (closedRow) {
      return Response.json({ error: 'この日は臨時休業のため予約できません' }, { status: 409 });
    }
    const { data: bookedRows } = await supabase.from('reservations').select('id').eq('slot_id', slot_id).in('status', OCCUPYING_STATUSES);
    if ((bookedRows?.length || 0) >= slotRow.capacity) {
      return Response.json({ error: 'この枠は満席になりました。別の枠をお選びください' }, { status: 409 });
    }
    // スタッフの休憩・外出ブロック（でお要望2026-09-14）と重なっていないか最終確認
    // （公開一覧側でも除外しているが、枠取得後にブロックが追加されるタイミングもあり得るため）。
    if (slotRow.staff_id) {
      const { data: blocking } = await supabase
        .from('provider_staff_blocks')
        .select('id')
        .eq('provider_id', provider_id)
        .eq('staff_id', slotRow.staff_id)
        .eq('date', slotRow.date)
        .lt('start_time', slotRow.end_time)
        .gt('end_time', slotRow.start_time)
        .limit(1);
      if (blocking?.length) {
        return Response.json({ error: 'この枠は現在対応できません。別の枠をお選びください' }, { status: 409 });
      }
      // シフト外（確定シフトはあるがこのスタッフの勤務予定が無い／時間外）の枠も
      // 予約させない（でお報告2026-09-16：従来はカレンダーの見た目だけで、実際の
      // 予約作成時には一切チェックされていなかった）。
      if (hasFeature(providerFeatureRow, 'shift_management')) {
        const schedule = await getShiftScheduleForRange(supabase, provider_id, slotRow.date, slotRow.date);
        if (isOutsideShift(schedule, slotRow.staff_id, slotRow.date, slotRow.start_time, slotRow.end_time)) {
          return Response.json({ error: 'この枠は現在対応できません。別の枠をお選びください' }, { status: 409 });
        }
      }
    }
    slot = slotRow;
    insertPayload.slot_id = slot_id;
    insertPayload.resource_id = slot.resource_id || null;
    insertPayload.class_id = slot.class_id || null;
    insertPayload.reserved_date = slot.date;
    insertPayload.start_time = slot.start_time;
    insertPayload.confirmed_date = slot.date;
    insertPayload.confirmed_time = slot.start_time;
    insertPayload.status = 'approved'; // 即時確定——hacomono/STORESと同じ「空き枠を選んだらその場で確定」
    if (!insertPayload.staff_id && slot.staff_id) insertPayload.staff_id = slot.staff_id; // 枠にスタッフが紐づいていれば継承
    if (!insertPayload.service_id && slot.service_id) insertPayload.service_id = slot.service_id; // 枠にメニューが紐づいていれば継承
  } else {
    insertPayload.reserved_date = preferred_date;
    insertPayload.start_time = preferred_time;
  }

  // 予約をSupabaseに保存（v2スキーマのカラム名に合わせる）
  const { data, error } = await supabase
    .from('reservations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 友達紹介プログラム（でお要望2026-09-14）：紹介コード付きの予約なら記録・通知
  if (referral_code) {
    await attributeReferral(supabase, { providerId: provider_id, referralCode: referral_code, referredUserId: user_id, referredName: user_name, reservationId: data.id });
  }

  // 掲載者情報を取得（通知用）
  const { data: provider } = await supabase
    .from('providers')
    .select('name, email, line_user_id, billing_started, id')
    .eq('id', provider_id)
    .single();

  const whenText = isInstant ? `${slot.date} ${slot.start_time}` : `${preferred_date} ${preferred_time}`;
  let className = null;
  if (slot?.class_id) {
    const { data: clsRow } = await supabase.from('provider_classes').select('name').eq('id', slot.class_id).single();
    className = clsRow?.name || null;
  }

  // 通知（失敗しても予約は成功扱い）
  try {
    await sendReservationCreatedEmails({
      reservation: { ...data, preferred_date: data.reserved_date, preferred_time: data.start_time, message },
      providerEmail: provider?.email,
      providerName: provider?.name,
    });
  } catch (e) { console.error('[reservation email]', e); }

  // LINE通知（掲載者にline_user_idがある場合）
  if (provider?.line_user_id) {
    const lineMsg = [
      isInstant ? (className ? `【Fineme】クラス予約（${className}）` : '【Fineme】新規予約（即時確定）') : '【Fineme】新規予約リクエスト',
      `お客様: ${user_name}`,
      `${isInstant ? '確定日時' : '希望日'}: ${whenText}`,
      `連絡先: ${user_contact}`,
      message ? `メッセージ: ${message}` : '',
      isInstant ? '' : '管理画面から対応してください。',
    ].filter(Boolean).join('\n');

    try { await sendLinePush(provider.line_user_id, lineMsg); }
    catch (e) { console.error('[reservation line]', e); }
  }

  // お客様にも受付確認をLINEで送る（メールはuser_contactがメール形式の時だけだが、
  // LINEなら電話番号で予約した人にも届く。でお指摘2026-09-09）
  await notifyCustomerLine(getSupabase(), {
    userId: user_id,
    providerId: provider_id,
    message: isInstant
      ? (className
        ? `【${provider?.name || '店舗'}】「${className}」の予約が確定しました✓\n日時: ${whenText}\n当日お待ちしております。`
        : `【${provider?.name || '店舗'}】予約が確定しました✓\n日時: ${whenText}\n当日お待ちしております。`)
      : `【${provider?.name || '店舗'}】予約リクエストを受け付けました。\n希望日時: ${whenText}\n店舗からの返答をお待ちください。`,
  });

  // 課金開始は「初回来店時」に行う（PATCH /api/reservations/[id] の visited 処理で実施）
  // 予約作成時点では billing_started を変更しない

  return Response.json(data, { status: 201 });
}
