// POST /api/provider/reservations/view-bulk { ids: string[], unread?: boolean }
// → 選んだ予約リクエストをまとめて既読にする（unread:true なら未読に戻す）。
// でお要望（2026-10-19）：予約リクエストが溜まった時に、選択して既読にできるように。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter(x => typeof x === 'string').slice(0, 1000) : [];
  if (!ids.length) return Response.json({ error: '予約リクエストを選んでください' }, { status: 400 });
  const viewed_at = body.unread ? null : new Date().toISOString();
  let q = supabase.from('reservations').update({ viewed_at }).eq('provider_id', provider.id).in('id', ids);
  if (!body.unread) q = q.is('viewed_at', null); // 既に既読のものは最初に開いた日時を残す
  const { data, error } = await q.select('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, updated: (data || []).length, viewed_at });
}
