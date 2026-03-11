// PATCH /api/reservations/[id] - 掲載者が承認/拒否/代替提案
// GET  /api/reservations/[id] - 予約詳細取得
import { getSupabase } from '@/lib/supabase';
import { sendReservationStatusEmail, sendVisitConfirmedEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';

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

    const db = getSupabase();
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

    if (newStatus === 'visited' && data.user_contact?.includes('@')) {
      try {
        await sendVisitConfirmedEmail({ reservation: data, userEmail: data.user_contact, userName: data.user_name, providerName: provider?.name });
      } catch (e) { console.error('[visit email]', e); }
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
