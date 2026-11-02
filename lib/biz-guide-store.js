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
    updated: String(r.updated_at || r.created_at || '').slice(0, 10),
  };
}

export async function getGuides(audience) {
  const base = STATIC[audience] || [];
  try {
    const { data } = await getSupabase()
      .from('biz_guides')
      .select('slug, title, description, lead, sections, fineme, faq, related, created_at, updated_at')
      .eq('audience', audience)
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    const taken = new Set(base.map((a) => a.slug));
    return [...base, ...(data || []).filter((r) => !taken.has(r.slug)).map(fromRow)];
  } catch {
    return base;
  }
}
