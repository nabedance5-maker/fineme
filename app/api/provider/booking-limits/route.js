// GET   /api/provider/booking-limits → 自店舗の同時予約保持数の上限を取得
// PATCH /api/provider/booking-limits → 保存
// でお要望2026-09-14：「来店するまで次の予約を取れない」ルールの上限数（既定1件）を
// 店舗ごとに変更できるようにする。
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

  const { data } = await supabase.from('providers').select('max_active_reservations').eq('id', provider.id).single();
  return Response.json({ max_active_reservations: data?.max_active_reservations ?? 1 });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { max_active_reservations } = await request.json().catch(() => ({}));
  const n = Number(max_active_reservations);
  if (!Number.isInteger(n) || n < 1) return Response.json({ error: '1以上の整数で指定してください' }, { status: 400 });

  const { error } = await supabase.from('providers').update({ max_active_reservations: n }).eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
