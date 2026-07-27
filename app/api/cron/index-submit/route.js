// GET /api/cron/index-submit
// Supabaseから新着プロバイダー・アフィリエイト・記事URLをIndexNow APIに送信する
// Schedule: "0 2 * * *"（毎日2時UTC = 11時JST）
import { getSupabase } from '@/lib/supabase';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';
const CRON_SECRET = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
const BASE_URL = 'https://www.fineme.me';
const HOST = 'www.fineme.me';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  // 過去48時間以内に追加されたコンテンツを取得
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const urls = [];

  // プロバイダー
  const { data: providers } = await db
    .from('providers')
    .select('slug, entity_type')
    .gte('created_at', since)
    .eq('admin_hidden', false);

  if (providers) {
    for (const p of providers) {
      const path = p.entity_type === 'affiliate' ? `/affiliate/${p.slug}` : `/provider/${p.slug}`;
      urls.push(`${BASE_URL}${path}`);
    }
  }

  // 特集記事（track=belle は /belle/journal 配下のURL）
  const { data: features } = await db
    .from('features')
    .select('slug, track')
    .gte('created_at', since)
    .eq('published', true);

  if (features) {
    for (const f of features) {
      const path = f.track === 'belle' ? `/belle/journal/${f.slug}` : `/feature/${f.slug}`;
      urls.push(`${BASE_URL}${path}`);
    }
  }

  // 常時送信する主要ページ（サイトマップ）
  const staticUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/search`,
    `${BASE_URL}/diagnosis`,
    `${BASE_URL}/sitemap.xml`,
  ];

  const allUrls = [...new Set([...urls, ...staticUrls])];

  if (allUrls.length === 0) {
    return Response.json({ submitted: 0, message: 'No new URLs' });
  }

  // IndexNow API に送信
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
    urlList: allUrls,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  console.log(`[index-submit] IndexNow status: ${res.status}, urls: ${allUrls.length}`);

  return Response.json({
    submitted: allUrls.length,
    status: res.status,
    urls: allUrls,
  });
}
