// POST /api/admin/curated-posts/analyze
// 投稿URLだけから、サムネイル・キャプション・軸・トピック・対象属性を自動推定する。
//
// でお指摘 2026-08-12：「サムネイル画像URLなんて自分でわからない」「URLだけ入れたら
// 全部自動でやってくれないの？」に対応。
//
// サムネ取得元:
// - TikTok: 公式oEmbed（thumbnail_url健在）
// - Instagram: 2025-11-03以降oEmbedのthumbnail_urlが廃止されたため、投稿ページ自体の
//   og:image / og:description メタタグを読む（Meta公式の代替手段として案内されている方法）
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const AXIS_CONCERNS = {
  skin: ['乾燥肌','脂性肌（オイリー）','混合肌','普通肌','敏感肌','肌タイプがわからない','毛穴','ニキビ・吹き出物','くすみ','赤み','乾燥・カサつき','テカリ','シミ・そばかす','ハリ・弾力不足','色ムラ'],
  eyebrow: ['丸顔','面長','卵型','逆三角形','四角（ベース型）','一重','奥二重','二重','眉が薄い','眉が濃い・太い','左右非対称','眉の形がわからない'],
  hair: ['硬い','柔らかい','くせ毛','直毛','細い','太い','薄毛・抜け毛が気になる','ボリュームが出ない','頭皮がべたつく','フケが気になる','セットが決まらない','すぐにペタンとなる','まとまらない'],
  body: ['腹まわり','胸（上半身）','背中','脚（太もも・ふくらはぎ）','全体的に気になる','猫背が気になる','O脚・X脚が気になる','肩が丸まっている','筋肉をつけたい','体重を落としたい','引き締めたい'],
  teeth: ['着色（コーヒー・お茶・タバコ）','加齢による黄ばみ','元々の歯の色が薄い','歯並びが気になる','すきっ歯が気になる','口臭が気になる','歯茎の色が気になる'],
  nail: ['爪が割れやすい','爪が薄い','二枚爪になりやすい','縦線が目立つ','凸凹がある','爪が黄ばんでいる','甘皮が気になる','噛み癖がある','爪の形を整えたい','長さが揃わない'],
  fashion: ['キレイめ','カジュアル','キレイめカジュアル','ストリート','モード・個性派','まずは清潔感から','ストレート骨格','ウェーブ骨格','ナチュラル骨格','体型カバーしたい','何を買えばいいかわからない','清潔感が出ない'],
  hairremoval: ['自己処理のみ','サロン・クリニックに通っている','ムダ毛が気になる'],
};
const AXES = Object.keys(AXIS_CONCERNS);
const CONCERN_VOCABULARY = Object.values(AXIS_CONCERNS).flat();

function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return null;
}

async function fetchTikTokMeta(url) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return {};
    const data = await res.json();
    return {
      thumbnail_url: data.thumbnail_url || '',
      creator_handle: data.author_name ? `@${data.author_name}` : '',
      rawText: data.title || '',
    };
  } catch { return {}; }
}

async function fetchInstagramMeta(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)' },
    });
    if (!res.ok) return {};
    const html = await res.text();
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] || '';
    const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || '';
    const handleMatch = ogDesc.match(/^([\w.]+)\s+on\s+Instagram/i) || html.match(/"owner":\s*\{\s*"username":\s*"([^"]+)"/);
    return {
      thumbnail_url: ogImage,
      creator_handle: handleMatch ? `@${handleMatch[1]}` : '',
      rawText: ogDesc,
    };
  } catch { return {}; }
}

export async function POST(req) {
  const sentKey = req.headers.get('x-admin-key') || '';
  const validKey = process.env.ADMIN_API_KEY || '';
  if (!validKey || sentKey !== validKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { post_url } = await req.json();
  if (!post_url) return NextResponse.json({ error: 'post_url required' }, { status: 400 });

  const platform = detectPlatform(post_url);
  if (!platform) return NextResponse.json({ error: 'InstagramまたはTikTokのURLではありません' }, { status: 400 });

  const meta = platform === 'tiktok' ? await fetchTikTokMeta(post_url) : await fetchInstagramMeta(post_url);

  // 本文が取れなかった場合はAI分類をスキップし、取れた分だけ返す
  // （サムネ・投稿者名は自動、軸・トピック・対象・キャプションは手入力してもらう）
  if (!meta.rawText) {
    return NextResponse.json({
      platform, thumbnail_url: meta.thumbnail_url || '', creator_handle: meta.creator_handle || '',
      axis: null, topic_tags: [], target_concerns: [], caption: '',
      warning: '投稿本文の自動取得に失敗しました。キャプション・軸などは手入力してください。',
    });
  }

  const prompt = `あなたは外見改善サービスFinemeの編集者です。以下はInstagram/TikTok投稿の本文（キャプション）です。
この投稿がFinemeのどの軸・どんな具体的なトピックに関する内容かを判定してください。

投稿本文:
"""
${meta.rawText.slice(0, 800)}
"""

以下のJSON形式のみで出力してください（他のテキスト不要）:
{
  "axis": "skin/eyebrow/hair/body/teeth/nail/fashion/hairremoval のいずれか1つ",
  "topic_tags": ["投稿の具体的なサブトピック（例:洗顔、美容液、毛穴）を1〜3個"],
  "target_concerns": ["この投稿が対象とする悩み・属性を語彙リストから最大5個"],
  "caption": "投稿内容の要約。40文字以内。Finemeユーザーへの案内文として自然な日本語で"
}

target_concernsは以下の語彙リストから選ぶこと（リスト外の文字列は使わない。無ければ空配列）:
${CONCERN_VOCABULARY.join('、')}`;

  let parsed = {};
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {}

  const axis = AXES.includes(parsed.axis) ? parsed.axis : null;
  const validConcerns = Array.isArray(parsed.target_concerns) ? parsed.target_concerns.filter(c => CONCERN_VOCABULARY.includes(c)) : [];

  return NextResponse.json({
    platform,
    thumbnail_url: meta.thumbnail_url || '',
    creator_handle: meta.creator_handle || '',
    axis,
    topic_tags: Array.isArray(parsed.topic_tags) ? parsed.topic_tags.slice(0, 3) : [],
    target_concerns: validConcerns,
    caption: parsed.caption || '',
  });
}
