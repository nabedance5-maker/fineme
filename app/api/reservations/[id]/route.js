// PATCH /api/reservations/[id] - 掲載者が承認/拒否/代替提案
// GET  /api/reservations/[id] - 予約詳細取得
import { createClient } from '@supabase/supabase-js';
import { sendReservationStatusEmail, sendVisitConfirmedEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { status, counter_proposal, action } = body;

  // 旧action形式との後方互換
  const newStatus = status || (action === 'approve' ? 'approved' : action === 'cancel_provider' ? 'rejected' : action === 'visited' ? 'visited' : null);
  if (!newStatus) return Response.json({ error: '無効なステータスです' }, { status: 400 });

  const updates = { status: newStatus };
  if (counter_proposal) updates.counter_proposal = counter_proposal;

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 掲載者情報取得（通知用）
  const { data: provider } = await supabase
    .from('providers')
    .select('name, line_user_id')
    .eq('id', data.provider_id)
    .single();

  // ユーザーへのメール通知
  const notifyStatuses = ['approved', 'rejected', 'counter_proposed'];
  if (notifyStatuses.includes(newStatus)) {
    try {
      await sendReservationStatusEmail({
        reservation: data,
        status: newStatus,
        counterProposal: counter_proposal || body.provider_comment,
        providerName: provider?.name || body.provider_name,
      });
    } catch (e) { console.error('[status email]', e); }
  }

  // 来店確認時の体験談メール
  if (newStatus === 'visited' && data.user_contact?.includes('@')) {
    try {
      await sendVisitConfirmedEmail({
        reservation: data,
        userEmail: data.user_contact,
        userName: data.user_name,
        providerName: provider?.name,
      });
    } catch (e) { console.error('[visit email]', e); }
  }

  // 掲載者へのLINE確認通知
  if (provider?.line_user_id && newStatus === 'approved') {
    try {
      await sendLinePush(
        provider.line_user_id,
        `【Fineme】${data.user_name}様の予約を承認しました。\n日時: ${data.preferred_date} ${data.preferred_time}`
      );
    } catch (e) { console.error('[status line]', e); }
  }

  return Response.json(data);
}
