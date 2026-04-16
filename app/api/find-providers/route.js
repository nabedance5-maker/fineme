// POST /api/find-providers
// action: 'search' | 'details' | 'score'
import Anthropic from '@anthropic-ai/sdk';

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function POST(request) {
  const { action, ...params } = await request.json();

  if (action === 'search') {
    // Google Places Text Search
    const { keyword, area } = params;
    if (!GOOGLE_KEY) return Response.json({ error: 'GOOGLE_PLACES_API_KEY未設定' }, { status: 500 });
    const query = encodeURIComponent(`${keyword} ${area}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=ja&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return Response.json({ results: data.results || [], status: data.status });
  }

  if (action === 'details') {
    // Place Details + Instagram抽出
    const { place_id } = params;
    if (!GOOGLE_KEY) return Response.json({ error: 'GOOGLE_PLACES_API_KEY未設定' }, { status: 500 });
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=website,formatted_phone_number,url&language=ja&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const result = data.result || {};

    let instagram = '';
    if (result.website) {
      try {
        const r = await fetch(result.website, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        });
        const html = await r.text();
        const m = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?)(?:\/|\?|"|'|\s)/);
        if (m && !['p','explore','reel','stories','accounts'].includes(m[1])) {
          instagram = `https://instagram.com/${m[1]}`;
        }
      } catch {}
    }

    return Response.json({
      website: result.website || '',
      phone: result.formatted_phone_number || '',
      mapsUrl: result.url || '',
      instagram,
    });
  }

  if (action === 'score') {
    // Claude Haiku でスコアリング
    const { businesses } = params;
    if (!businesses?.length) return Response.json({ scores: [] });

    const list = businesses.map((b, i) =>
      `${i}|${b.name}|レビュー${b.reviewCount}件(${b.rating}★)|${b.category}|Web:${b.website ? 'あり' : 'なし'}|IG:${b.instagram ? 'あり' : 'なし'}`
    ).join('\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Fineme（外見磨きサービス検索サイト）への掲載候補を評価してください。

判定基準:
- 個人運営・フリーランス = 高優先（レビュー50件以下、チェーン店でない名称）
- 法人チェーン・大手 = 低優先
- Instagram/Webあり = 加点
- メンズ外見改善系 = 加点

JSON配列のみ出力（コードブロックなし）:
[{"i":0,"t":"個人" or "法人","s":1-5,"m":"DM時メモ15字以内"}]

候補:
${list}`,
      }],
    });

    const raw = msg.content[0]?.text || '[]';
    const match = raw.match(/\[[\s\S]*?\]/);
    const scores = JSON.parse(match ? match[0] : '[]');
    return Response.json({ scores });
  }

  return Response.json({ error: '不明なaction' }, { status: 400 });
}
