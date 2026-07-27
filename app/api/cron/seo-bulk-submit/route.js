// GET /api/cron/seo-bulk-submit
// AI⑥ 配信担当：全公開記事をIndexNowに一括送信 + Googleサイトマップpingを送る
// 手動実行またはVercel Cron（週1回）で呼び出す
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';
const BASE_URL = 'https://www.fineme.me';
const HOST = 'www.fineme.me';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

function checkAuth(request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
  return secret && authHeader === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!checkAuth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 全公開記事を取得（track=belle は /belle/journal 配下のURL）
  const { data: articles, error } = await db
    .from('features')
    .select('slug, track')
    .eq('status', 'published');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const articleUrls = (articles || []).map(a =>
    `${BASE_URL}${a.track === 'belle' ? '/belle/journal' : '/feature'}/${a.slug}`
  );

  // 静的ページ + プロバイダー
  const { data: providers } = await db
    .from('providers')
    .select('slug, entity_type')
    .eq('status', 'published')
    .or('admin_hidden.eq.false,admin_hidden.is.null');

  const providerUrls = (providers || []).map(p =>
    `${BASE_URL}/${p.entity_type === 'affiliate' ? 'affiliate' : 'provider'}/${p.slug}`
  );

  const staticUrls = [
    BASE_URL + '/',
    BASE_URL + '/search',
    BASE_URL + '/diagnosis',
    BASE_URL + '/feature',
  ];

  const allUrls = [...new Set([...staticUrls, ...articleUrls, ...providerUrls])];

  // IndexNow に一括送信（1回のリクエストで最大10,000件）
  const indexNowRes = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: allUrls,
    }),
  });

  // Google サイトマップ ping
  const googlePingRes = await fetch(
    `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  ).catch(() => ({ status: 0 }));

  // Bing サイトマップ ping
  const bingPingRes = await fetch(
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  ).catch(() => ({ status: 0 }));

  console.log(`[seo-bulk-submit] urls=${allUrls.length} indexnow=${indexNowRes.status} google=${googlePingRes.status} bing=${bingPingRes.status}`);

  return Response.json({
    ok: true,
    submitted: allUrls.length,
    breakdown: {
      articles: articleUrls.length,
      providers: providerUrls.length,
      static: staticUrls.length,
    },
    indexnow: indexNowRes.status,
    google_ping: googlePingRes.status,
    bing_ping: bingPingRes.status,
  });
}
