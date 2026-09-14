// PATCH  /api/provider/classes/[id]/enrollments/[enrollmentId] → ステータス変更・退会等
// DELETE /api/provider/classes/[id]/enrollments/[enrollmentId] → 削除
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
  const { enrollmentId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('status' in body && ['active', 'waitlisted', 'withdrawn'].includes(body.status)) update.status = body.status;
  if ('student_name' in body) update.student_name = body.student_name;
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_class_enrollments')
    .update(update)
    .eq('id', enrollmentId)
    .eq('provider_id', provider.id)
    .select()
    .single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { enrollmentId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('provider_class_enrollments').delete().eq('id', enrollmentId).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
