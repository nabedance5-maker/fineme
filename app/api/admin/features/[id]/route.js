// GET    /api/admin/features/[id]  - 1件取得
// PUT    /api/admin/features/[id]  - 更新
// DELETE /api/admin/features/[id]  - 削除
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return key && key === process.env.ADMIN_API_KEY;
}

export async function GET(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db()
    .from('features')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}

export async function PUT(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, slug, summary, description, category, thumbnail, reading_time, body: htmlBody, blocks, status } = body;

  // 現在のレコードを取得して published_at を決定
  const { data: existing } = await db()
    .from('features')
    .select('status, published_at')
    .eq('id', params.id)
    .single();

  const now = new Date().toISOString();
  const wasPublished = existing?.status === 'published';
  const willPublish = status === 'published';
  const published_at = willPublish
    ? (existing?.published_at || now)  // 初公開なら now、再公開なら元の日時を維持
    : existing?.published_at;

  const updates = { updated_at: now };
  if (title !== undefined)        updates.title = title;
  if (slug !== undefined)         updates.slug = slug;
  if (summary !== undefined)      updates.summary = summary;
  if (description !== undefined)  updates.description = description;
  if (category !== undefined)     updates.category = category;
  if (thumbnail !== undefined)    updates.thumbnail = thumbnail;
  if (reading_time !== undefined) updates.reading_time = reading_time;
  if (htmlBody !== undefined)     updates.body = htmlBody;
  if (blocks !== undefined)       updates.blocks = blocks;
  if (status !== undefined)       updates.status = status;
  updates.published_at = published_at;

  const { data, error } = await db()
    .from('features')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  revalidatePath('/feature');
  if (data?.slug) revalidatePath(`/feature/${data.slug}`);
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await db()
    .from('features')
    .delete()
    .eq('id', params.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
