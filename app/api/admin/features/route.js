// GET  /api/admin/features  - 一覧取得
// POST /api/admin/features  - 新規作成
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await db()
    .from('features')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, slug, summary, description, category, thumbnail, reading_time, body: htmlBody, blocks, status } = body;

  if (!title) return Response.json({ error: 'title は必須です' }, { status: 400 });

  // slug 自動生成（未指定時）
  const resolvedSlug = slug || `article-${Date.now().toString(36)}`;

  const now = new Date().toISOString();
  const published_at = status === 'published' ? now : null;

  const { data, error } = await db()
    .from('features')
    .insert({
      slug: resolvedSlug,
      title,
      summary: summary || '',
      description: description || '',
      category: category || '',
      thumbnail: thumbnail || '',
      reading_time: reading_time || 5,
      body: htmlBody || '',
      blocks: blocks || null,
      status: status || 'draft',
      published_at,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
