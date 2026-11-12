// PATCH /api/reservations/[id] - 掲載者が承認/拒否/代替提案
// GET  /api/reservations/[id] - 予約詳細取得
import { getSupabase } from '@/lib/supabase';
import { sendReservationStatusEmail, sendCancelledByUserEmail, sendReservationRescheduledEmail, sendReservationCancelledEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { notifyCustomerLine } from '@/lib/reservation-notify';
import { afterVisited } from '@/lib/reservation-visited';
import { refundDepositIfPaid } from '@/lib/reservation-deposit';
import { withAudit, logCustomerActivity } from '@/lib/activity-log';
import { providerRecipients } from '@/lib/provider-recipients';
import { checkStoreBooking, addMinutes } from '@/lib/booking-check';
import { reservationMinutes } from '@/lib/availability-engine';

export async function GET(request, context) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getSupabase();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const id = (await context.params).id;
    const { data, error } = await db.from('reservations').select('*').eq('id', id).single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // 予約の連絡先・氏名まで含む生データを返すため、この予約の店舗本人か
    // 予約者本人（ゲスト予約=user_id無しは対象外）以外には見せない
    // （でお報告2026-09-12関連の実装中に発見・修正：認証さえあれば誰でも
    // IDだけで他人の予約を閲覧できてしまっていた）。
    const { data: providerRow } = await db.from('providers').select('id').eq('email', user.email).single();
    const isOwnerProvider = providerRow && providerRow.id === data.provider_id;
    const isOwnerCustomer = data.user_id && data.user_id === user.id;
    if (!isOwnerProvider && !isOwnerCustomer) return Response.json({ error: 'Forbidden' }, { status: 403 });

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

async function __PATCH(request, context) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getSupabase();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const id = context.params.id;
    const { data: existing, error: existingError } = await db.from('reservations').select('provider_id, user_id, status, reserved_date, start_time, confirmed_date, confirmed_time').eq('id', id).single();
    if (existingError || !existing) return Response.json({ error: '予約が見つかりません' }, { status: 404 });

    const body = await request.json();
    const { status, action, counter_proposal, counter_date, counter_time, confirmed_date, confirmed_time } = body;

    // 予約の日時変更（2026-11-10 渡邉要望：予約の詳細から「予約変更」）。店舗本人が、確定した予約の日時を変える。
    // ステータスはそのまま（チケットの扱いも変わらない）。notify ならお客様にメール・LINEでお知らせする
    if (action === 'reschedule') {
      const { data: me } = await db.from('providers').select('id, name, booking_unit, business_hours, booking_interval_minutes, store_capacity, enabled_features, plan').eq('email', user.email).single();
      if (!me || me.id !== existing.provider_id) return Response.json({ error: 'この予約を操作する権限がありません' }, { status: 403 });
      if (existing.status !== 'approved') return Response.json({ error: '確定した予約だけ日時を変えられます（リクエスト中の予約は「代わりの日時を提案」から）' }, { status: 400 });
      const nd = String(body.date || ''), nt = String(body.time || '').slice(0, 5);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nd) || !/^\d{2}:\d{2}$/.test(nt)) return Response.json({ error: '日付と時刻を選んでください' }, { status: 400 });
      const before = { date: existing.confirmed_date || existing.reserved_date, time: String(existing.confirmed_time || existing.start_time || '').slice(0, 5) };
      // 新しい時間に、担当・部屋・お客様が空いているか（同じ長さで動かす。2026-11-10）
      const { data: full } = await db.from('reservations').select('id, user_id, user_name, user_contact, staff_id, resource_id, service_id, slot_id, start_time, confirmed_time, end_time, class_id').eq('id', id).single();
      let slotDur = {}, svcs = {};
      if (full.slot_id) { const { data: sl } = await db.from('provider_slots').select('start_time, end_time').eq('id', full.slot_id).maybeSingle(); if (sl) { const m = t => { const [h, mm] = String(t).split(':').map(Number); return h * 60 + (mm || 0); }; slotDur = { [full.slot_id]: m(sl.end_time) - m(sl.start_time) }; } }
      if (full.service_id) { const { data: sv } = await db.from('provider_services').select('id, duration_minutes').eq('id', full.service_id).maybeSingle(); if (sv) svcs = { [sv.id]: sv }; }
      const newEnd = addMinutes(nt, reservationMinutes(full, slotDur, svcs));
      const chk = await checkStoreBooking(db, me, { date: nd, startTime: nt, endTime: newEnd, staffId: full.staff_id, resourceId: full.resource_id, serviceId: full.service_id, userId: full.user_id, userName: full.user_name, userContact: full.user_contact, excludeId: id });
      if (!chk.ok) return Response.json({ error: chk.error }, { status: 409 });
      // 予約日（カレンダーの読み込み範囲の基準）も揃える。即時予約の枠は元の時間のままになるため外して空ける（所要時間はメニューから）
      const { data, error } = await db.from('reservations').update({ confirmed_date: nd, confirmed_time: nt, reserved_date: nd, start_time: nt, end_time: newEnd, slot_id: null, staff_id: chk.staffId || full.staff_id, resource_id: chk.resourceId || full.resource_id }).eq('id', id).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      if (body.notify) {
        try { await sendReservationRescheduledEmail({ reservation: data, before, providerName: me.name }); } catch (e) { console.error('[reschedule email]', e); }
        await notifyCustomerLine(db, { userId: data.user_id, providerId: data.provider_id, message: `【${me.name || '店舗'}】ご予約の日時を変更しました。\n変更前: ${before.date} ${before.time}\n変更後: ${nd} ${nt}\nご都合が合わない場合は店舗へご連絡ください。` });
      }
      return Response.json(data);
    }

    const newStatus = status || (
      action === 'approve' ? 'approved' :
      action === 'cancel_provider' ? 'rejected' :
      action === 'visited' ? 'visited' : null
    );
    if (!newStatus) return Response.json({ error: '無効なステータスです' }, { status: 400 });

    // 権限チェック：この予約の店舗本人（承認・お断り・代替提案・来店確認）か、
    // この予約の本人（代替提案の承諾・キャンセルのみ、ゲスト予約は対象外）に限る
    // （でお報告2026-09-12関連の実装中に発見・修正：認証さえあれば誰でもIDだけで
    // 他人の予約のステータスを書き換えられてしまっていた）。
    const { data: providerRow } = await db.from('providers').select('id').eq('email', user.email).single();
    const isOwnerProvider = providerRow && providerRow.id === existing.provider_id;
    const isOwnerCustomer = existing.user_id && existing.user_id === user.id;
    if (isOwnerProvider) {
      // cancelled：お客様から連絡があってお店がキャンセルを記録する（2026-11-10）。チケットは戻り、お客様へのお知らせは送らない
      if (!['approved', 'rejected', 'counter_proposed', 'visited', 'no_show', 'cancelled'].includes(newStatus)) {
        return Response.json({ error: '無効な操作です' }, { status: 400 });
      }
      // 無断キャンセル（2026-11-09 渡邉要望）：確定した予約（自動で来店済みになったものも）を、予約の時間が来てから。チケットは戻さない
      if (newStatus === 'no_show') {
        if (!['approved', 'visited'].includes(existing.status)) return Response.json({ error: '確定した予約だけ無断キャンセルにできます' }, { status: 400 });
        const d = existing.confirmed_date || existing.reserved_date, t = (existing.confirmed_time || existing.start_time || '00:00').slice(0, 5);
        if (d && new Date(`${d}T${t}:00+09:00`).getTime() > Date.now()) return Response.json({ error: '予約の時間が来てから無断キャンセルにできます（来られないと連絡があった時は、キャンセルにしてください）' }, { status: 400 });
      }
    } else if (isOwnerCustomer) {
      if (!['approved', 'cancelled'].includes(newStatus)) {
        return Response.json({ error: '無効な操作です' }, { status: 400 });
      }
      context.auditSkip = true; // お客様の操作は店舗の操作として記録せず、下で「お客様の操作」として残す
    } else {
      return Response.json({ error: 'この予約を操作する権限がありません' }, { status: 403 });
    }

    const updates = { status: newStatus };
    if (counter_proposal) updates.provider_comment = counter_proposal;
    if (counter_date)     updates.counter_date = counter_date;
    if (counter_time)     updates.counter_time = counter_time;
    if (confirmed_date)   updates.confirmed_date = confirmed_date;
    if (confirmed_time)   updates.confirmed_time = confirmed_time;
    // visited_at はstory-reminder/review-requestクロンが起点にしているが、
    // これまでどこでも書き込まれておらず両クロンが実質発火しない状態だった
    // （でお指摘2026-09-09の調査で発覚）。来店確認のタイミングで記録する。
    if (newStatus === 'visited') updates.visited_at = new Date().toISOString();
    if (newStatus === 'no_show') updates.no_show_at = new Date().toISOString();
    if (newStatus === 'visited' && existing.status === 'no_show') updates.no_show_at = null; // 無断キャンセルにした後、来ていたと分かって直した
    // 代替提案時：24時間の回答期限を設定
    if (newStatus === 'counter_proposed') {
      updates.counter_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    // 承認・キャンセル時：期限をクリア
    if (['approved', 'rejected', 'cancelled'].includes(newStatus)) {
      updates.counter_expires_at = null;
    }

    const { data, error } = await db
      .from('reservations').update(updates).eq('id', id).select().single();

    if (error) return Response.json({ error: error.message, hint: error.hint }, { status: 500 });

    if (!isOwnerProvider && isOwnerCustomer) {
      await logCustomerActivity({
        providerId: data.provider_id, userId: data.user_id, name: data.user_name,
        label: newStatus === 'cancelled' ? 'お客様が予約をキャンセル' : 'お客様が代替日時を承認',
        targetId: id,
        detail: newStatus === 'cancelled'
          ? { reserved_date: data.confirmed_date || data.reserved_date, start_time: data.confirmed_time || data.start_time, previous_status: existing.status }
          : { counter_date: data.counter_date, counter_time: data.counter_time },
      });
    }

    const { data: provider } = await db
      .from('providers').select('name, email, notify_emails, line_user_id').eq('id', data.provider_id).single();

    const notifyStatuses = ['approved', 'rejected', 'counter_proposed'];
    if (notifyStatuses.includes(newStatus)) {
      try {
        await sendReservationStatusEmail({
          reservation: data, status: newStatus,
          counterProposal: counter_proposal || data.provider_comment,
          counterDate: counter_date || data.counter_date,
          counterTime: counter_time || data.counter_time,
          confirmedDate: confirmed_date || data.confirmed_date,
          confirmedTime: confirmed_time || data.confirmed_time,
          providerName: provider?.name,
          wasApproved: existing.status === 'approved',
        });
      } catch (e) { console.error('[status email]', e); }
    }

    // 承認・お断り・代替提案・来店確認は、メールに加えてお客様にもLINEで通知する
    // （でお指摘2026-09-09：「予約や来店に関してメールで通知してるやつ全部店舗の
    // 公式LINEからも流した方がいい」）。店舗の公式LINEに連携済みならそちらから、
    // 未連携ならFineme公式からのフォールバック（lib/reservation-notify.js）。
    // これまでメールのみ（かつuser_contactがメール形式の時だけ）で、LINE経由
    // （origin: line_log）で来たリクエストだと返事が何も届いていなかった。
    if (notifyStatuses.includes(newStatus)) {
      const pname = provider?.name || '店舗';
      const cd = confirmed_date || data.confirmed_date;
      const ct = confirmed_time || data.confirmed_time;
      const kd = counter_date || data.counter_date;
      const kt = counter_time || data.counter_time;
      const comment = counter_proposal || data.provider_comment;
      const lineMsgs = {
        approved: `【${pname}】予約が承認されました✓\n確定日時: ${cd || data.reserved_date || 'ご確認ください'} ${ct || data.start_time || ''}\n直接店舗へご連絡のうえご来店ください。`,
        rejected: existing.status === 'approved'
          ? `【${pname}】お店の都合により、${cd || data.reserved_date || ''} ${String(ct || data.start_time || '').slice(0, 5)}のご予約がキャンセルになりました。チケット・回数券を使っていた場合はお戻ししています。${comment ? `\nメッセージ: ${comment}` : ''}`
          : `【${pname}】予約リクエストについてご連絡です。\nご希望の日時での対応が難しいとのことです。${comment ? `\nメッセージ: ${comment}` : ''}`,
        counter_proposed: `【${pname}】代替日時の提案が届きました。\n提案日時: ${kd || ''} ${kt || ''}\n下のボタンから直接お答えいただけます。`,
      };
      // 代替提案は文字だけだと何も操作できず、マイページに移動しないと返答できなかった
      // （でお報告2026-09-09）。LINEから直接「承認する」「キャンセルする」を選べる
      // ボタンを付ける（app/api/line/webhook/[providerId]/route.js の
      // acceptCounterProposal / cancelReservationFromLine で処理する）。
      const quickReplyItems = newStatus === 'counter_proposed' ? [
        { label: 'この日時で承認する', data: `action=accept_counter&rid=${id}`, displayText: 'この日時で承認します' },
        { label: 'キャンセルする', data: `action=cancel_reservation&rid=${id}`, displayText: '予約をキャンセルします' },
      ] : undefined;
      await notifyCustomerLine(db, { userId: data.user_id, providerId: data.provider_id, message: lineMsgs[newStatus], quickReplyItems });
    }

    // 来店確認の後の処理（お礼の連絡・紹介の確定・New Me Log・チケット）。自動の来店確認（cron/auto-visited）と共通。lib/reservation-visited.js
    let autoConsumedPackage = null;
    if (newStatus === 'visited') {
      autoConsumedPackage = await afterVisited(db, data, { previousStatus: existing.status, providerName: provider?.name });
    }

    // 予約デポジットの返金（決済機能Phase6③・でお要望2026-09-27）。
    // キャンセル・お断りいずれも、支払い済みデポジットがあれば自動返金する。
    if (['cancelled', 'rejected'].includes(newStatus)) {
      await refundDepositIfPaid(db, data);
    }

    // キャンセル：お客様にはキャンセルの確認を、お客様がキャンセルした時はお店にも知らせる
    // （2026-11-12 渡邉報告：キャンセルのメールが届かないことがある。お客様側には確認が一通も送られていなかった）
    if (newStatus === 'cancelled') {
      try {
        await sendReservationCancelledEmail({ reservation: data, providerName: provider?.name, reason: isOwnerProvider ? 'store_recorded' : 'customer' });
      } catch (e) { console.error('[cancel email customer]', e); }
      const when = `${data.confirmed_date || data.counter_date || data.reserved_date || ''} ${String(data.confirmed_time || data.counter_time || data.start_time || '').slice(0, 5)}`.trim();
      await notifyCustomerLine(db, { userId: data.user_id, providerId: data.provider_id, message: `【${provider?.name || '店舗'}】ご予約${when ? `（${when}）` : ''}をキャンセルしました。チケット・回数券を使っていた場合はお戻ししています。` }).catch(e => console.error('[cancel line customer]', e));
    }
    // お店が管理画面からキャンセルした時も、お店に控えを送る（2026-11-12 渡邉報告：お店側にメールが来ていなかった。
    // 複数の人で運営していると、誰がいつキャンセルしたか分からなくなるため）
    if (isOwnerProvider && (newStatus === 'cancelled' || (newStatus === 'rejected' && existing.status === 'approved'))) {
      try {
        await sendCancelledByUserEmail({ reservation: data, providerEmail: providerRecipients(provider), providerName: provider?.name, byStore: newStatus === 'rejected' ? 'store_reason' : 'recorded' });
      } catch (e) { console.error('[cancel email store copy]', e); }
    }
    if (newStatus === 'cancelled' && !isOwnerProvider) {
      try {
        await sendCancelledByUserEmail({ reservation: data, providerEmail: providerRecipients(provider), providerName: provider?.name });
      } catch (e) { console.error('[cancel email]', e); }
      if (provider?.line_user_id) {
        try {
          const lineMsg = `【Fineme】${data.user_name}様が予約をキャンセルしました。\n日時: ${data.confirmed_date || data.reserved_date} ${String(data.confirmed_time || data.start_time || '').slice(0, 5)}`;
          await sendLinePush(provider.line_user_id, lineMsg);
        } catch (e) { console.error('[cancel line]', e); }
      }
    }

    if (provider?.line_user_id) {
      try {
        let lineMsg = '';
        if (newStatus === 'approved') {
          lineMsg = `【Fineme】${data.user_name}様の予約を承認しました。\n確定日時: ${confirmed_date || data.reserved_date} ${confirmed_time || data.start_time}`;
        } else if (newStatus === 'counter_proposed') {
          lineMsg = `【Fineme】${data.user_name}様へ代替提案を送りました。\n提案日時: ${counter_date} ${counter_time}`;
        }
        if (lineMsg) await sendLinePush(provider.line_user_id, lineMsg);
      } catch (e) { console.error('[status line]', e); }
    }

    return Response.json({ ...data, auto_consumed_package: autoConsumedPackage });
  } catch (e) {
    console.error('[PATCH /api/reservations]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export const PATCH = withAudit(__PATCH);
