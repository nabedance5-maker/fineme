// ガイド記事の読み出し：固定の12本（lib/biz-guide.js）＋ 週1でAIが足した分（biz_guides テーブル）。
// サーバー専用。テーブルが読めない時は固定分だけで表示する。
import { getSupabase } from '@/lib/supabase';
import { SHOP_GUIDES, PARTNER_GUIDES } from '@/lib/biz-guide';

const STATIC = { shop: SHOP_GUIDES, partner: PARTNER_GUIDES };

function fromRow(r) {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    lead: r.lead,
    sections: Array.isArray(r.sections) ? r.sections : [],
    fineme: r.fineme,
    faq: Array.isArray(r.faq) ? r.faq : [],
    related: Array.isArray(r.related) ? r.related : [],
    cover: r.cover || '',
    updated: String(r.updated_at || r.created_at || '').slice(0, 10),
  };
}

export async function getGuides(audience) {
  const base = STATIC[audience] || [];
  try {
    const { data } = await getSupabase()
      .from('biz_guides')
      .select('slug, title, description, lead, sections, fineme, faq, related, cover, created_at, updated_at')
      .eq('audience', audience)
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    // 運営管理画面で編集した固定記事は DB の行が優先（並び順は固定記事の位置のまま）。
    // 非公開にした固定記事は消す。
    const rows = (data || []).map(fromRow);
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const { data: hidden } = await getSupabase().from('biz_guides').select('slug').eq('audience', audience).neq('status', 'published');
    const hiddenSet = new Set((hidden || []).map((r) => r.slug));
    const taken = new Set(base.map((a) => a.slug));
    return [
      ...base.filter((a) => !hiddenSet.has(a.slug)).map((a) => bySlug.get(a.slug) || a),
      ...rows.filter((r) => !taken.has(r.slug)),
    ];
  } catch {
    return base;
  }
}
