// POST /api/me/memberships/[id]/upload-id → 本人確認書類（免許証・保険証・パスポート）を
// 非公開バケットにアップロード（でお要望2026-09-15〜16：マイナンバーは対象外）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: m } = await supabase.from('provider_memberships').select('id, user_id, status').eq('id', id).single();
  if (!m || m.user_id !== user.id) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (m.status !== 'draft') return Response.json({ error: 'この申込は編集できません' }, { status: 409 });

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file) return Response.json({ error: 'ファイルがありません' }, { status: 400 });

  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return Response.json({ error: '対応形式: jpg, png, webp' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: '8MB以下のファイルを使用してください' }, { status: 400 });

  const path = `${user.id}/${id}.${ext}`;
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('id-documents').upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  await supabase.from('provider_memberships').update({ id_document_path: path, updated_at: new Date().toISOString() }).eq('id', id);
  return Response.json({ ok: true });
}
