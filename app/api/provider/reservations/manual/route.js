// POST /api/provider/reservations/manual → カレンダーの空き枠タップからの手動予約作成
// 電話予約等、お客様がFinemeを経由せずに直接連絡してきた予約を店舗側で直接カレンダーに
// 入れるための専用エンドポイント（でお要望2026-09-14：「予約が入ってない枠をタップしたら
// 手動で予約を入れられるようにして。電話来た時とかに入れる時あるから」）。
// 公開側 POST /api/reservations とは別に用意し、ステータスはいきなり'approved'で確定させる
// （申請〜承認のフローを踏む必要が無いため）。
// user_idは任意：登録時点で「この電話番号のお客様は実はFineme会員だった」と分かった
// 場合、/api/provider/customers/search-memberで検索して紐付けられる（でお要望2026-09-14。
// 後から紐付ける場合は/api/provider/reservations/[id]/assignのuser_idを使う）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { date, time, user_name, user_contact, staff_id, resource_id, note, user_id } = body;

  if (!date || !time || !user_name) {
    return Response.json({ error: '日時とお客様名は必須です' }, { status: 400 });
  }

  // スタッフの休憩・外出ブロック（でお要望2026-09-14）中は手動予約も作らせない
  // （誤って休憩中に予約を入れてしまう事故防止。ブロックを外せば入れられる）。
  if (staff_id) {
    const { data: blocking } = await supabase
      .from('provider_staff_blocks')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('staff_id', staff_id)
      .eq('date', date)
      .lte('start_time', time)
      .gt('end_time', time)
      .limit(1);
    if (blocking?.length) {
      return Response.json({ error: 'このスタッフはこの時間、休憩・外出でブロックされています' }, { status: 409 });
    }
  }

  const insertPayload = {
    provider_id: provider.id,
    user_id: user_id || null, // 検索で見つけたFineme会員と紐付ける場合のみ設定
    user_name,
    user_contact: user_contact || '',
    note: note || '',
    status: 'approved',
    staff_id: staff_id || null,
    staff_manually_assigned: !!staff_id,
    resource_id: resource_id || null,
    booking_mode: 'manual',
    reserved_date: date,
    start_time: time,
    confirmed_date: date,
    confirmed_time: time,
  };

  const { data, error } = await supabase
    .from('reservations')
    .insert(insertPayload)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
