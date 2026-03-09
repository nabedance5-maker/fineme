// /api/reservations
// GET  ?userId=xxx  → ユーザーの予約一覧
// GET  ?providerId=xxx → 掲載者宛の予約一覧（service_role必要）
// POST → 予約作成（ユーザー認証済み or ゲスト）
import { createClient } from '@supabase/supabase-js';
import { sendReservationCreatedEmails } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const providerId = searchParams.get('providerId');

  if (!userId && !providerId) {
    return Response.json({ error: 'userId or providerId required' }, { status: 400 });
  }

  let query = supabaseAdmin.from('reservations').select('*').order('created_at', { ascending: false });

  if (userId)     query = query.eq('user_id', userId);
  if (providerId) query = query.eq('provider_id', providerId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const {
    user_id, user_name, user_contact, note,
    provider_id, service_id, service_name, price, commission_rate,
    reserved_date, start_time, end_time, origin,
    // 掲載者のメールアドレス（通知用・Supabaseには保存しない）
    provider_email, provider_name,
  } = body;

  if (!user_name || !user_contact || !provider_id || !reserved_date || !start_time) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      user_id: user_id || null,
      user_name,
      user_contact,
      note: note || '',
      provider_id,
      service_id: service_id || null,
      service_name: service_name || null,
      price: price || 0,
      commission_rate: commission_rate || 0.08,
      reserved_date,
      start_time,
      end_time: end_time || '',
      origin: origin || 'direct',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // メール通知（失敗しても予約自体は成功扱い）
  try {
    await sendReservationCreatedEmails({
      reservation: data,
      providerEmail: provider_email,
      providerName: provider_name,
    });
  } catch (e) {
    console.error('[reservation email]', e);
  }

  return Response.json(data, { status: 201 });
}
