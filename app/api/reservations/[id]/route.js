// /api/reservations/[id]
// PATCH → ステータス更新（approve/cancel/visited）
import { createClient } from '@supabase/supabase-js';
import { sendReservationApprovedEmail, sendVisitConfirmedEmail } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { action, provider_comment, user_email, user_name, provider_name, service_name } = body;

  // 現在の予約を取得
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !current) return Response.json({ error: '予約が見つかりません' }, { status: 404 });

  let updates = {};
  const now = new Date().toISOString();

  switch (action) {
    case 'approve':
      if (current.status !== 'pending') {
        return Response.json({ error: 'この予約は承認できない状態です' }, { status: 400 });
      }
      updates = { status: 'approved', approved_at: now, provider_comment: provider_comment || '' };
      break;

    case 'cancel_user':
      updates = { status: 'cancelled', user_cancelled_at: now };
      break;

    case 'cancel_provider':
      updates = { status: 'cancelled', provider_cancelled_at: now, provider_comment: provider_comment || '' };
      break;

    case 'visited':
      if (current.status !== 'approved') {
        return Response.json({ error: '承認済みの予約のみ来店確認できます' }, { status: 400 });
      }
      updates = { status: 'visited', visited_at: now };
      break;

    default:
      return Response.json({ error: '不明なアクション' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // メール通知
  try {
    if (action === 'approve' && user_email) {
      await sendReservationApprovedEmail({
        reservation: data,
        userEmail: user_email,
        userName: user_name,
        providerName: provider_name,
        serviceComment: provider_comment,
      });
    }
    if (action === 'visited' && user_email) {
      await sendVisitConfirmedEmail({
        reservation: data,
        userEmail: user_email,
        userName: user_name,
        providerName: provider_name,
        serviceName: service_name,
      });
    }
  } catch (e) {
    console.error('[reservation email]', e);
  }

  return Response.json(data);
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
