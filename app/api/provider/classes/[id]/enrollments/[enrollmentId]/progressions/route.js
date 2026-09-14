// GET  /api/provider/classes/[id]/enrollments/[enrollmentId]/progressions → 進級履歴
// POST /api/provider/classes/[id]/enrollments/[enrollmentId]/progressions → 進級を記録
// （でお要望2026-09-14：「進級結果の管理」相当機能）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function getOwnEnrollment(providerId, enrollmentId) {
  const { data } = await supabase.from('provider_class_enrollments').select('*').eq('id', enrollmentId).eq('provider_id', providerId).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { enrollmentId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await getOwnEnrollment(provider.id, enrollmentId))) return Response.json({ error: '見つかりません' }, { status: 404 });

  const { data, error } = await supabase.from('provider_class_progressions').select('*').eq('enrollment_id', enrollmentId).order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request, { params }) {
  const { enrollmentId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const enrollment = await getOwnEnrollment(provider.id, enrollmentId);
  if (!enrollment) return Response.json({ error: '見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { to_level, note } = body;
  if (!to_level?.trim()) return Response.json({ error: '新しい段階は必須です' }, { status: 400 });

  const { error: logError } = await supabase.from('provider_class_progressions').insert({
    enrollment_id: enrollmentId,
    from_level: enrollment.current_level,
    to_level: to_level.trim(),
    note: note || null,
  });
  if (logError) return Response.json({ error: logError.message }, { status: 500 });

  const { data, error } = await supabase.from('provider_class_enrollments').update({ current_level: to_level.trim() }).eq('id', enrollmentId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
