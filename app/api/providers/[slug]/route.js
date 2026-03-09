// GET /api/providers/[slug] - 掲載者詳細（公開ページ用）
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { slug } = params;

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}
