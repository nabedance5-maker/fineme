// GET   /api/provider/booking-limits → 自店舗の予約ルール（同時保持数上限・予約締切）を取得
// PATCH /api/provider/booking-limits → 保存
// でお要望2026-09-14：「来店するまで次の予約を取れない」ルールの上限数（既定1件）を
// 店舗ごとに変更できるようにする。
// でお確認2026-09-18：「予約可能時間の設定どこ（前日21時まで予約可能等）」を受けて
// booking_cutoff_hours（予約開始の何時間前まで受け付けるか）も同じエンドポイントで扱う。
// でお要望2026-09-18：「前日の何時までというのと、何時間前までを選べるように」を
// 受けてbooking_cutoff_mode（hours/day_before_time）・booking_cutoff_timeも追加。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('providers').select('max_active_reservations, booking_cutoff_mode, booking_cutoff_hours, booking_cutoff_time').eq('id', provider.id).single();
  return Response.json({
    max_active_reservations: data?.max_active_reservations ?? 1,
    booking_cutoff_mode: data?.booking_cutoff_mode || 'hours',
    booking_cutoff_hours: data?.booking_cutoff_hours ?? 0,
    booking_cutoff_time: data?.booking_cutoff_time || '',
  });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('max_active_reservations' in body) {
    const n = Number(body.max_active_reservations);
    if (!Number.isInteger(n) || n < 1) return Response.json({ error: '1以上の整数で指定してください' }, { status: 400 });
    update.max_active_reservations = n;
  }
  if ('booking_cutoff_hours' in body) {
    const h = Number(body.booking_cutoff_hours);
    if (!Number.isInteger(h) || h < 0) return Response.json({ error: '0以上の整数で指定してください' }, { status: 400 });
    update.booking_cutoff_hours = h;
  }
  if ('booking_cutoff_mode' in body) {
    if (!['hours', 'day_before_time'].includes(body.booking_cutoff_mode)) return Response.json({ error: '締切方式が不正です' }, { status: 400 });
    update.booking_cutoff_mode = body.booking_cutoff_mode;
  }
  if ('booking_cutoff_time' in body) {
    if (body.booking_cutoff_time && !/^\d{2}:\d{2}$/.test(body.booking_cutoff_time)) return Response.json({ error: '時刻の形式が不正です' }, { status: 400 });
    update.booking_cutoff_time = body.booking_cutoff_time || null;
  }
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { error } = await supabase.from('providers').update(update).eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
