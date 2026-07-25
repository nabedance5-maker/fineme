import { getSupabase } from './supabase';

// track を必ず指定する。省略時は男性トラック。
// 指定しないと Belle 記事（track='belle'）が男性ユーザーの New Me Map に混ざる。
export async function getAllArticles(track = 'fineme') {
  try {
    const { data, error } = await getSupabase()
      .from('features')
      .select('id, slug, title, description, summary, category, thumbnail, reading_time, status, published_at, updated_at')
      .eq('status', 'published')
      .eq('track', track)
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
