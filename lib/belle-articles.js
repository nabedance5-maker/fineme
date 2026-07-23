import { getSupabase } from './supabase';
import staticArticles from '@/data/belle-articles.json';

// 静的JSONの記事（既存の eyebrow-first-step など）
export function getAllBelleArticles() {
  return staticArticles;
}

export function getBelleArticle(slug) {
  return staticArticles.find(a => a.slug === slug) ?? null;
}

// Supabaseから Belle 記事一覧を取得（track='belle'）
export async function getAllBelleArticlesFromDB() {
  try {
    const { data, error } = await getSupabase()
      .from('features')
      .select('id, slug, title, description, category, thumbnail, reading_time, published_at')
      .eq('status', 'published')
      .eq('track', 'belle')
      .order('published_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

// Supabaseから Belle 記事1件を取得
export async function getBelleArticleFromDB(slug) {
  try {
    const { data, error } = await getSupabase()
      .from('features')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('track', 'belle')
      .single();
    if (error) return null;
    return data || null;
  } catch { return null; }
}
