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
    const { status } = await request.json();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return Response.json({ error: '不正なステータスです' }, { status: 400 });
    }

    const updates = { status };
    if (status === 'approved') updates.published_at = new Date().toISOString();

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
