// GET  /api/stories/[id] → 単体取得
import { getSupabase } from '@/lib/supabase';
// PATCH /api/stories/[id] → ステータス更新（管理者用: approve/reject）

const supabaseAdmin = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from('stories').select('*').eq('id', id).single();
  if (error || !data) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, axis_id, path_type, milestone_reached } = body;

    const updates = {};

    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return Response.json({ error: '不正なステータスです' }, { status: 400 });
      }
      updates.status = status;
      if (status === 'approved') updates.published_at = new Date().toISOString();
    }

    const VALID_AXES = ['body', 'eyebrow', 'fashion', 'hair', 'skin', 'teeth', 'nail'];
    const VALID_PATHS = ['virgin', 'quit', 'blind', 'lapsed'];
    if (axis_id !== undefined) updates.axis_id = VALID_AXES.includes(axis_id) ? axis_id : null;
    if (path_type !== undefined) updates.path_type = VALID_PATHS.includes(path_type) ? path_type : null;
    if (milestone_reached !== undefined) updates.milestone_reached = milestone_reached ? String(milestone_reached).slice(0, 200) : null;

    if (!Object.keys(updates).length) {
      return Response.json({ error: '更新するフィールドがありません' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return Response.json({ error: '該当する体験談が見つかりません' }, { status: 404 });
    return Response.json({ ok: true, id, status });
  } catch (err) {
    console.error('[stories PATCH]', err);
    return Response.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}
