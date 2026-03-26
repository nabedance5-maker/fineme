import { getSupabase } from './supabase';

export async function getAllArticles() {
  try {
    const { data, error } = await getSupabase()
      .from('features')
      .select('id, slug, title, description, summary, category, thumbnail, reading_time, status, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function getArticle(slug) {
  try {
    const { data, error } = await getSupabase()
      .from('features')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error) return null;
    return data || null;
  } catch { return null; }
}
