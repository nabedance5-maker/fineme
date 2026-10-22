// POST /api/reservations  - 予約リクエスト作成
// GET  /api/reservations  - 一覧取得（providerId or userId で絞り込み）
import { getSupabase } from '@/lib/supabase';
import { sendReservationCreatedEmails } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { notifyCustomerLine, attributeReferral } from '@/lib/reservation-notify';
import { hasFeature } from '@/lib/feature-flags';
import { getShiftScheduleForRange, isOutsideShift } from '@/lib/shift-availability';
import { isPastBookingCutoff, cutoffDescription } from '@/lib/booking-cutoff';
import { createDepositCheckout } from '@/lib/reservation-deposit';
import { isClosedWeekday } from '@/lib/closed-weekday';
import { logCustomerActivity } from '@/lib/activity-log';
import { customerEntitlements, checkService, scopeLabel } from '@/lib/booking-eligibility';
import { planBookingsLeft } from '@/lib/membership-plan';
import { checkAndAssign } from '@/lib/availability-engine';

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
  const { staff_id, booking_mode, slot_id, referral_code, service_id, package_id } = body;
  const isInstant = booking_mode === 'instant';

  if (!provider_id || !user_name || !user_contact) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  // 即時予約は「グループレッスンの開催回（slot_id）」か「メニュー×日時（date・start_time）」のどちらか（2026-10-21）
  const { date: instantDate, start_time: instantStart } = body;
  const engineInstant = isInstant && !slot_id && /^\d{4}-\d{2}-\d{2}$/.test(instantDate || '') && /^\d{1,2}:\d{2}/.test(instantStart || '');
  if (isInstant && !slot_id && !engineInstant) {
    return Response.json({ error: '予約する時間を選んでください' }, { status: 400 });
  }

  // 予約時に選んだ使用チケット（でお要望2026-09-27）。本人（user_id）が実際に持っている
  // このお店のチケットかを確認してからでないと信用しない（他人のpackage_idを勝手に
  // 指定されるのを防ぐ）。無効なら黙ってnull扱いにする（必須項目ではないため）。
  // 予約するお客様の本人確認はログインのトークンで行う（でお要望 2026-10-21）。
  // 本文の user_id はトークンの本人と一致する時だけ受け付ける（他人のアカウントに予約を付けられないように）。
  // ログインしていないお客様は、これまで通りアカウントに紐付けないゲスト予約になる。
  const authUser = await verifyAuth(request);
  if (user_id && (!authUser || authUser.id !== user_id)) {
    return Response.json({ error: 'ログインの確認ができませんでした。ページを開き直すか、ログインし直してから予約してください', code: 'auth_mismatch' }, { status: 401 });
  }
  let bookingUserId = authUser?.id || null;

  let verifiedPackageId = null;
  let membershipPlanId = null; // 会員プランで予約した時のプラン（月の予約回数の数え方に使う）
  if (package_id && bookingUserId) {
    const { data: pkg } = await supabase.from('customer_packages').select('id').eq('id', package_id).eq('user_id', bookingUserId).eq('provider_id', provider_id).maybeSingle();
    if (pkg) verifiedPackageId = pkg.id;
  }
  if (!isInstant && (!preferred_date || !preferred_time)) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  // 回数券・会員プランの方だけが予約できるメニュー（でお要望 2026-10-20）。
  // 回数券で予約する時は、使う回数券を必ず決める。
  // 即時予約では、メニューを選ばずに枠だけ選んでも、枠に決まっているメニューで判定する（枠のメニューは後で予約に引き継がれるため）
  let effectiveServiceId = service_id || null;
  if (!effectiveServiceId && isInstant && slot_id) {
    const { data: sl } = await supabase.from('provider_slots').select('service_id').eq('id', slot_id).eq('provider_id', provider_id).maybeSingle();
    effectiveServiceId = sl?.service_id || null;
  }
  if (effectiveServiceId) {
    const { data: svc } = await supabase.from('provider_services').select('id, booking_scope, allow_ticket, eligible_package_ids, allow_membership, eligible_plan_ids').eq('id', effectiveServiceId).eq('provider_id', provider_id).maybeSingle();
    if (svc?.booking_scope === 'limited') {
      const [{ data: pk }, { data: pl }] = await Promise.all([
        supabase.from('service_packages').select('id, name').in('id', svc.eligible_package_ids?.length ? svc.eligible_package_ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('provider_membership_plans').select('id, name').in('id', svc.eligible_plan_ids?.length ? svc.eligible_plan_ids : ['00000000-0000-0000-0000-000000000000']),
      ]);
      const label = scopeLabel(svc, Object.fromEntries((pk || []).map(x => [x.id, x.name])), Object.fromEntries((pl || []).map(x => [x.id, x.name])));
      if (!authUser) return Response.json({ error: `このメニューは${label}だけが予約できます。Finemeにログインしてから予約してください`, code: 'login_required' }, { status: 401 });
      const chk = checkService(svc, await customerEntitlements(supabase, provider_id, authUser.id));
      if (!chk.ok) return Response.json({ error: `このメニューは${label}だけが予約できます`, code: 'not_eligible' }, { status: 403 });
      if (chk.via === 'membership' && !verifiedPackageId) {
        // 会員プランの「月に何回まで」（でお要望 2026-10-22）。上限に達したら、回数券があればそちらで予約する
        const ent = await customerEntitlements(supabase, provider_id, authUser.id);
        const ids = ent.planIds.filter(id => !(svc.eligible_plan_ids || []).length || svc.eligible_plan_ids.includes(id));
        const { data: plansRows } = await supabase.from('provider_membership_plans').select('id, name, monthly_booking_limit').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
        const monthOf = [instantDate, preferred_date].find(d => /^\d{4}-\d{2}/.test(d || '')) || null;
        let usable = null;
        for (const pl of plansRows || []) {
          const left = await planBookingsLeft(supabase, pl, authUser.id, provider_id, monthOf);
          if (left === null || left > 0) { usable = pl; break; }
        }
        if (usable) membershipPlanId = usable.id;
        else if (chk.tickets.length) verifiedPackageId = chk.tickets[0].id;
        else return Response.json({ error: `今月の予約回数の上限（${plansRows?.[0]?.name || '会員プラン'}：月${plansRows?.[0]?.monthly_booking_limit}回）に達しています`, code: 'plan_limit' }, { status: 409 });
      }
      if (chk.via === 'ticket' && !chk.tickets.some(t => t.id === verifiedPackageId)) verifiedPackageId = chk.tickets[0].id;
    }
  }

  // enabled_features（申請制ON/OFF判定用）とmax_active_reservations（同時保持できる
  // 予約数の上限、店舗ごとに変更可）・予約締切設定をまとめて取得。
  const { data: providerFeatureRow } = await supabase.from('providers').select('plan, enabled_features, max_active_reservations, booking_cutoff_mode, booking_cutoff_hours, booking_cutoff_time, deposit_amount, stripe_connect_id, stripe_connect_status, business_hours').eq('id', provider_id).single();

  // 申請制（第1〜3希望→店舗が承認）は店舗ごとにON/OFFできる（でお要望2026-09-14：
  // 「即時予約と同じように、予約リクエストも受け付けるかどうか設定できるように」）。
  // 即時予約リクエストはこのフラグと無関係にそのまま処理する。
  if (!isInstant && !hasFeature(providerFeatureRow, 'booking_request')) {
    return Response.json({ error: 'この店舗は現在、予約リクエストの受付を停止しています' }, { status: 403 });
  }

  // 1人のお客様が同時に保持できる「来店前の予約」の数には上限がある（でお要望2026-09-14。
  // 既定は1件＝来店するまで次の予約を取れない。店舗ごとにmax_active_reservationsで
  // 上限数を変更できる）。ゲスト予約（user_id無し）は本人特定ができないため対象外。
  if (bookingUserId) {
    const maxActive = providerFeatureRow?.max_active_reservations ?? 1;
    const { count } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', provider_id)
      .eq('user_id', bookingUserId)
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
    user_id: bookingUserId,
    user_name,
    user_contact,
    note: message || '',
    status: 'pending',
    staff_id: staff_id || null,
    service_id: service_id || null,
    package_id: verifiedPackageId,
    membership_plan_id: membershipPlanId,
    designation_fee: designationFee,
    booking_mode: isInstant ? 'instant' : 'request',
  };

  let slot = null;
  if (engineInstant) {
    // その場の計算で受けられるか確かめ、担当スタッフ・部屋を割り当てる（指名が無ければ空いているスタッフを自動で）
    const { data: provFull } = await supabase.from('providers').select('id, plan, enabled_features, business_hours, booking_unit, booking_interval_minutes, store_capacity, booking_cutoff_hours, booking_cutoff_mode, booking_cutoff_time').eq('id', provider_id).single();
    const chk = await checkAndAssign(supabase, provFull, { serviceId: service_id || null, date: instantDate, startTime: instantStart.slice(0, 5), staffId: staff_id || null });
    if (!chk.ok) return Response.json({ error: chk.error }, { status: 409 });
    Object.assign(insertPayload, {
      reserved_date: instantDate, start_time: instantStart.slice(0, 5), confirmed_date: instantDate, confirmed_time: instantStart.slice(0, 5),
      status: 'approved', staff_id: chk.staffId, resource_id: chk.resourceId,
      // お客様が指名していない担当は、店舗側の割り当てと同じ扱い（カレンダーで「指名なし」と分かるように）
      staff_manually_assigned: chk.autoAssigned,
    });
    if (chk.autoAssigned) insertPayload.designation_fee = 0;
  } else if (isInstant) {
    // グループレッスンの開催回の空き再検証（アプリ側の再カウント方式。想定同時予約数は少ないため
    // DBレベルの排他制御までは不要と判断）。2026-10-21 以降、slot_id で予約できるのは開催回だけ。
    const { data: slotRow } = await supabase.from('provider_slots').select('*').eq('id', slot_id).eq('provider_id', provider_id).not('class_id', 'is', null).maybeSingle();
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
    // 定休日（でお確認2026-09-28）の最終確認。
    if (isClosedWeekday(providerFeatureRow.business_hours, slotRow.date)) {
      return Response.json({ error: 'この日は定休日のため予約できません' }, { status: 409 });
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

  let usedPackageName = null;
  if (verifiedPackageId) {
    const { data: usedPkg } = await supabase.from('customer_packages').select('package_name').eq('id', verifiedPackageId).maybeSingle();
    usedPackageName = usedPkg?.package_name || null;
  }
  await logCustomerActivity({
    providerId: provider_id, userId: bookingUserId, name: user_name,
    label: isInstant ? 'お客様が即時予約で予約を確定' : 'お客様が予約をリクエスト',
    targetId: data.id,
    detail: { reserved_date: data.reserved_date, start_time: data.start_time, package_name: usedPackageName },
  });

  // 予約デポジット（決済機能Phase6③・でお要望2026-09-27）。即時予約で確定した予約のみ対象
  // （申請制は店舗の承認前に課金するのは順序として不自然なため対象外）。
  // 失敗しても予約自体は成立させる（決済リンクが無い＝店舗が直接デポジットを案内する運用に倒れるだけ）。
  let depositCheckoutUrl = null;
  if (isInstant && hasFeature(providerFeatureRow, 'payment_mediation') && providerFeatureRow?.deposit_amount > 0) {
    try {
      depositCheckoutUrl = await createDepositCheckout(supabase, {
        provider: { ...providerFeatureRow, id: provider_id },
        reservation: data,
      });
    } catch (e) { console.error('[reservation deposit checkout]', e); }
  }

  // 友達紹介プログラム（でお要望2026-09-14）：紹介コード付きの予約なら記録・通知
  if (referral_code) {
    await attributeReferral(supabase, { providerId: provider_id, referralCode: referral_code, referredUserId: bookingUserId, referredName: user_name, reservationId: data.id });
  }

  // 掲載者情報を取得（通知用）
  const { data: provider } = await supabase
    .from('providers')
    .select('name, email, line_user_id, billing_started, id')
    .eq('id', provider_id)
    .single();

  const whenText = isInstant ? `${insertPayload.confirmed_date} ${String(insertPayload.confirmed_time || '').slice(0, 5)}` : `${preferred_date} ${preferred_time}`;
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
    userId: bookingUserId,
    providerId: provider_id,
    message: isInstant
      ? (className
        ? `【${provider?.name || '店舗'}】「${className}」の予約が確定しました✓\n日時: ${whenText}\n当日お待ちしております。`
        : `【${provider?.name || '店舗'}】予約が確定しました✓\n日時: ${whenText}\n当日お待ちしております。`)
      : `【${provider?.name || '店舗'}】予約リクエストを受け付けました。\n希望日時: ${whenText}\n店舗からの返答をお待ちください。`,
  });

  return Response.json({ ...data, deposit_checkout_url: depositCheckoutUrl }, { status: 201 });
}
