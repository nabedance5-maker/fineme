// POST /api/me/cases/[id]/approve → 施術事例の公開を本人が承認する
// DELETE /api/me/cases/[id]/approve → 承認を取り消す（非公開に戻す）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_cases')
    .update({ approved_by_user: true, published_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id) // 本人の事例のみ承認可能
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_cases')
    .update({ approved_by_user: false, published_at: null })
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
