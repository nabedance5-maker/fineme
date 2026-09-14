// GET  /api/provider/classes/[id]/enrollments → 在籍者一覧
// POST /api/provider/classes/[id]/enrollments → 生徒を追加（定員超過なら自動的に待機扱い）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function getOwnClass(providerId, classId) {
  const { data } = await supabase.from('provider_classes').select('*').eq('id', classId).eq('provider_id', providerId).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await getOwnClass(provider.id, id))) return Response.json({ error: 'クラスが見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_class_enrollments')
    .select('*')
    .eq('class_id', id)
    .order('enrolled_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const cls = await getOwnClass(provider.id, id);
  if (!cls) return Response.json({ error: 'クラスが見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { student_name, user_id, current_level } = body;
  if (!student_name?.trim()) return Response.json({ error: '生徒名は必須です' }, { status: 400 });

  // 定員が設定されていて、在籍中(active)の人数が既に定員に達していれば自動的に待機（waitlisted）にする
  // （でお要望2026-09-14：「定員制クラスの管理」）。
  let status = 'active';
  if (cls.capacity) {
    const { count } = await supabase.from('provider_class_enrollments').select('id', { count: 'exact', head: true }).eq('class_id', id).eq('status', 'active');
    if ((count || 0) >= cls.capacity) status = 'waitlisted';
  }

  const { data, error } = await supabase
    .from('provider_class_enrollments')
    .insert({
      class_id: id,
      provider_id: provider.id,
      user_id: user_id || null,
      student_name: student_name.trim(),
      current_level: current_level || (cls.level_labels?.[0] || null),
      status,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
