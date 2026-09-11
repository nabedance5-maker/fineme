// POST /api/reservations  - 予約リクエスト作成
// GET  /api/reservations  - 一覧取得（providerId or userId で絞り込み）
import { getSupabase } from '@/lib/supabase';
import { sendReservationCreatedEmails } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { notifyCustomerLine } from '@/lib/reservation-notify';

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
  const { staff_id, booking_mode, slot_id } = body;
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
    const { data: bookedRows } = await supabase.from('reservations').select('id').eq('slot_id', slot_id).in('status', OCCUPYING_STATUSES);
    if ((bookedRows?.length || 0) >= slotRow.capacity) {
      return Response.json({ error: 'この枠は満席になりました。別の枠をお選びください' }, { status: 409 });
    }
    slot = slotRow;
    insertPayload.slot_id = slot_id;
    insertPayload.resource_id = slot.resource_id || null;
    insertPayload.reserved_date = slot.date;
    insertPayload.start_time = slot.start_time;
    insertPayload.confirmed_date = slot.date;
    insertPayload.confirmed_time = slot.start_time;
    insertPayload.status = 'approved'; // 即時確定——hacomono/STORESと同じ「空き枠を選んだらその場で確定」
    if (!insertPayload.staff_id && slot.staff_id) insertPayload.staff_id = slot.staff_id; // 枠にスタッフが紐づいていれば継承
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

  // 掲載者情報を取得（通知用）
  const { data: provider } = await supabase
    .from('providers')
    .select('name, email, line_user_id, billing_started, id')
    .eq('id', provider_id)
    .single();

  const whenText = isInstant ? `${slot.date} ${slot.start_time}` : `${preferred_date} ${preferred_time}`;

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
      isInstant ? '【Fineme】新規予約（即時確定）' : '【Fineme】新規予約リクエスト',
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
      ? `【${provider?.name || '店舗'}】予約が確定しました✓\n日時: ${whenText}\n当日お待ちしております。`
      : `【${provider?.name || '店舗'}】予約リクエストを受け付けました。\n希望日時: ${whenText}\n店舗からの返答をお待ちください。`,
  });

  // 課金開始は「初回来店時」に行う（PATCH /api/reservations/[id] の visited 処理で実施）
  // 予約作成時点では billing_started を変更しない

  return Response.json(data, { status: 201 });
}
