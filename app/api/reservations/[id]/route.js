// PATCH /api/reservations/[id] - 掲載者が承認/拒否/代替提案
// GET  /api/reservations/[id] - 予約詳細取得
import { getSupabase } from '@/lib/supabase';
import { sendReservationStatusEmail, sendVisitConfirmedEmail, sendCancelledByUserEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';
import { notifyCustomerLine } from '@/lib/reservation-notify';

export async function GET(request, context) {
  try {
    const id = context.params.id;
    const db = getSupabase();
    const { data, error } = await db.from('reservations').select('*').eq('id', id).single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getSupabase();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const id = context.params.id;
    const body = await request.json();
    const { status, action, counter_proposal, counter_date, counter_time, confirmed_date, confirmed_time } = body;

    const newStatus = status || (
      action === 'approve' ? 'approved' :
      action === 'cancel_provider' ? 'rejected' :
      action === 'visited' ? 'visited' : null
    );
    if (!newStatus) return Response.json({ error: '無効なステータスです' }, { status: 400 });

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

    const { data: provider } = await db
      .from('providers').select('name, email, line_user_id').eq('id', data.provider_id).single();

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
        rejected: `【${pname}】予約リクエストについてご連絡です。\nご希望の日時での対応が難しいとのことです。${comment ? `\nメッセージ: ${comment}` : ''}`,
        counter_proposed: `【${pname}】代替日時の提案が届きました。\n提案日時: ${kd || ''} ${kt || ''}\nマイページ（予約一覧）からご確認ください。`,
      };
      await notifyCustomerLine(db, { userId: data.user_id, providerId: data.provider_id, message: lineMsgs[newStatus] });
    }

    if (newStatus === 'visited' && data.user_contact?.includes('@')) {
      try {
        await sendVisitConfirmedEmail({ reservation: data, userEmail: data.user_contact, userName: data.user_name, providerName: provider?.name });
      } catch (e) { console.error('[visit email]', e); }
    }
    if (newStatus === 'visited') {
      const pname = provider?.name || '店舗';
      await notifyCustomerLine(db, {
        userId: data.user_id, providerId: data.provider_id,
        message: `【${pname}】ご来店ありがとうございました✓\nまたのお越しをお待ちしております。`,
      });
    }

    // 来店確認：紐づくNew Me Logがあれば来店日を反映し、次回目安を再計算させる。
    // これまでreservationsの来店確認とuser_service_logsが完全に無関係で、
    // 予約通りに来店してもLogの次回予定が古いまま延々通知され続けていた
    // （でお報告2026-09-09：9/2の予定が9/9になっても「次回は9/2」のまま届いた）。
    if (newStatus === 'visited' && data.user_id) {
      try {
        const { data: providerRow } = await db.from('providers').select('slug').eq('id', data.provider_id).single();
        if (providerRow?.slug) {
          const visitDate = data.confirmed_date || data.reserved_date || new Date().toISOString().slice(0, 10);
          const { data: logs } = await db
            .from('user_service_logs')
            .select('id')
            .eq('user_id', data.user_id)
            .eq('provider_slug', providerRow.slug)
            .eq('active', true)
            .limit(1);
          const log = logs?.[0];
          if (log) {
            await db
              .from('user_service_logs')
              .update({ last_visit: visitDate, next_visit: null, updated_at: new Date().toISOString() })
              .eq('id', log.id);
            await db
              .from('user_service_log_visits')
              .insert({ log_id: log.id, user_id: data.user_id, visited_at: visitDate, cost: data.price || null });
          }
        }
      } catch (e) { console.error('[reservation visited] log sync', e); }
    }

    // ユーザーがキャンセルした場合：掲載者に通知
    if (newStatus === 'cancelled') {
      if (provider?.email) {
        try {
          await sendCancelledByUserEmail({ reservation: data, providerEmail: provider.email, providerName: provider.name });
        } catch (e) { console.error('[cancel email]', e); }
      }
      if (provider?.line_user_id) {
        try {
          const lineMsg = `【Fineme】${data.user_name}様が予約をキャンセルしました。\n元の希望日: ${data.reserved_date} ${data.start_time || ''}`;
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

    return Response.json(data);
  } catch (e) {
    console.error('[PATCH /api/reservations]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
