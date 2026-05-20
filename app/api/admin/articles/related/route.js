// POST /api/admin/articles/related
// body: { slug: string, related_slugs: string[] }
// AI④ 内部リンク担当：記事の関連記事スラグを保存する
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

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, related_slugs } = await request.json().catch(() => ({}));
  if (!slug || !Array.isArray(related_slugs)) {
    return Response.json({ error: 'slug と related_slugs は必須です' }, { status: 400 });
  }

  const { error } = await db()
    .from('features')
    .update({ related_slugs, updated_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath(`/feature/${slug}`);
  return Response.json({ ok: true, slug, related_slugs });
}

// GET /api/admin/articles/related?slug=xxx → 現在の related_slugs を返す
export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (slug) {
    const { data, error } = await db()
      .from('features')
      .select('slug, title, related_slugs')
      .eq('slug', slug)
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  // slug未指定 → 全記事のslug/title/category/related_slugsを返す（ツール用）
  const { data, error } = await db()
    .from('features')
    .select('slug, title, category, description, related_slugs')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
