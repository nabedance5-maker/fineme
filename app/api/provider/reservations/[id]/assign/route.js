// PATCH /api/provider/reservations/[id]/assign → 予約カレンダーからの担当スタッフ・部屋の割り当て変更
// 承認/お断り等のステータス遷移を扱う既存の PATCH /api/reservations/[id] とは別に、
// 「指名なし」の予約に後から担当を割り振る・部屋を割り当てるためだけの軽量エンドポイント
// （でお要望2026-09-12）。ステータスは変更しない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('staff_id' in body) update.staff_id = body.staff_id || null;
  if ('resource_id' in body) update.resource_id = body.resource_id || null;
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('reservations')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select('id, staff_id, resource_id')
    .single();

  if (error) return Response.json({ error: '予約が見つかりません' }, { status: 404 });
  return Response.json(data);
}
