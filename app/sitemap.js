export const revalidate = 86400;

import { getSupabase } from '@/lib/supabase';

const BASE_URL = 'https://www.fineme.me';

const STATIC_PAGES = [
  { url: '/', priority: 1.0, changeFrequency: 'daily' },
  { url: '/search', priority: 0.9, changeFrequency: 'daily' },
  { url: '/diagnosis', priority: 0.9, changeFrequency: 'weekly' },
  { url: '/lp/mirror', priority: 0.9, changeFrequency: 'weekly' },
  { url: '/mirror', priority: 0.8, changeFrequency: 'weekly' },
  { url: '/diagnosis/result', priority: 0.7, changeFrequency: 'weekly' },
  { url: '/feature', priority: 0.8, changeFrequency: 'daily' },
  { url: '/provider/join', priority: 0.8, changeFrequency: 'monthly' },
  { url: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { url: '/terms', priority: 0.4, changeFrequency: 'monthly' },
  { url: '/privacy', priority: 0.4, changeFrequency: 'monthly' },
  { url: '/tokusho', priority: 0.4, changeFrequency: 'monthly' },
  // Belle（女性向けトラック）。旧サイトマップに1件も含まれていなかった（2026-10-01発見・修正）
  { url: '/belle', priority: 1.0, changeFrequency: 'daily' },
  { url: '/belle/diagnosis', priority: 0.9, changeFrequency: 'weekly' },
  { url: '/belle/lp/mirror', priority: 0.9, changeFrequency: 'weekly' },
  { url: '/belle/journal', priority: 0.8, changeFrequency: 'daily' },
];

export default async function sitemap() {
  const supabase = getSupabase();

  const [providersRes, affiliatesRes, featuresRes] = await Promise.all([
    supabase.from('providers').select('slug, updated_at').eq('status', 'active'),
    supabase.from('affiliates').select('slug, updated_at').eq('is_active', true),
    // track を含めて取得する（含めないと女性向けBelle記事が/feature/配下の
    // 誤ったURLでサイトマップに登録されてしまう・2026-10-01発見・修正）
    supabase.from('features').select('slug, updated_at, track').eq('status', 'published'),
  ]);

  const providerUrls = (providersRes.data || []).map(p => ({
    url: `${BASE_URL}/provider/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    priority: 0.8,
    changeFrequency: 'weekly',
  }));

  const affiliateUrls = (affiliatesRes.data || []).map(a => ({
    url: `${BASE_URL}/affiliate/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    priority: 0.7,
    changeFrequency: 'weekly',
  }));

  const featureUrls = (featuresRes.data || []).map(f => ({
    url: f.track === 'belle' ? `${BASE_URL}/belle/journal/${f.slug}` : `${BASE_URL}/feature/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
    priority: 0.75,
    changeFrequency: 'monthly',
  }));

  const staticUrls = STATIC_PAGES.map(p => ({
    url: `${BASE_URL}${p.url}`,
    lastModified: new Date(),
    priority: p.priority,
    changeFrequency: p.changeFrequency,
  }));

  return [...staticUrls, ...providerUrls, ...affiliateUrls, ...featureUrls];
}
