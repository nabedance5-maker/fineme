// GET  /api/provider/classes → 自店舗のクラス一覧（各クラスの在籍人数つき）
// POST /api/provider/classes → クラス新規作成
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

  const { data: classes, error } = await supabase
    .from('provider_classes')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!classes?.length) return Response.json([]);

  const { data: enrollments } = await supabase
    .from('provider_class_enrollments')
    .select('class_id, status')
    .in('class_id', classes.map(c => c.id));
  const counts = {};
  (enrollments || []).forEach(e => {
    counts[e.class_id] = counts[e.class_id] || { active: 0, waitlisted: 0 };
    if (e.status === 'active') counts[e.class_id].active++;
    if (e.status === 'waitlisted') counts[e.class_id].waitlisted++;
  });

  const instructorIds = [...new Set(classes.map(c => c.instructor_staff_id).filter(Boolean))];
  let instructorMap = {};
  if (instructorIds.length) {
    const { data: staffRows } = await supabase.from('provider_staff').select('id, name, photo_url').in('id', instructorIds);
    (staffRows || []).forEach(s => { instructorMap[s.id] = s; });
  }

  return Response.json(classes.map(c => ({
    ...c,
    enrolledCount: counts[c.id]?.active || 0,
    waitlistedCount: counts[c.id]?.waitlisted || 0,
    instructor_name: c.instructor_staff_id ? instructorMap[c.instructor_staff_id]?.name || null : null,
    instructor_photo_url: c.instructor_staff_id ? instructorMap[c.instructor_staff_id]?.photo_url || null : null,
  })));
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, description, capacity, level_labels, instructor_staff_id } = body;
  if (!name?.trim()) return Response.json({ error: 'クラス名は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_classes')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      description: description || null,
      capacity: Number.isFinite(Number(capacity)) && capacity !== '' ? Number(capacity) : null,
      level_labels: Array.isArray(level_labels) ? level_labels : [],
      instructor_staff_id: instructor_staff_id || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
