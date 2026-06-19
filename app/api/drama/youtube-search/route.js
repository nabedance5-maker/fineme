import { NextResponse } from 'next/server';

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY;
}

export async function GET(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY が設定されていません。Vercelの環境変数に追加してください。' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || 'ショートドラマ 恋愛';
  const maxResults = Math.min(Number(searchParams.get('maxResults') || 10), 20);

  // Step 1: search.list — 再生数順でショート動画を検索
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('videoDuration', 'short');
  searchUrl.searchParams.set('order', 'viewCount');
  searchUrl.searchParams.set('q', q);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('regionCode', 'JP');
  searchUrl.searchParams.set('relevanceLanguage', 'ja');
  searchUrl.searchParams.set('key', apiKey);

  const searchRes = await fetch(searchUrl.toString());
  const searchData = await searchRes.json();

  if (!searchRes.ok) {
    return NextResponse.json(
      { error: searchData.error?.message || 'YouTube API エラー' },
      { status: 500 }
    );
  }

  const items = searchData.items || [];
  if (items.length === 0) return NextResponse.json([]);

  const videoIds = items.map(i => i.id?.videoId).filter(Boolean);
  if (videoIds.length === 0) return NextResponse.json([]);

  // Step 2: videos.list — statistics（再生数・高評価数）を取得
  const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  statsUrl.searchParams.set('part', 'statistics,snippet');
  statsUrl.searchParams.set('id', videoIds.join(','));
  statsUrl.searchParams.set('key', apiKey);

  const statsRes = await fetch(statsUrl.toString());
  const statsData = await statsRes.json();

  const statsMap = {};
  for (const v of (statsData.items || [])) {
    statsMap[v.id] = v.statistics;
  }

  const results = items
    .map(item => {
      const videoId = item.id?.videoId;
      if (!videoId) return null;
      const stats = statsMap[videoId] || {};
      return {
        videoId,
        title: item.snippet.title,
        description: (item.snippet.description || '').slice(0, 300),
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        viewCount: Number(stats.viewCount || 0),
        likeCount: Number(stats.likeCount || 0),
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter(Boolean);

  return NextResponse.json(results);
}
