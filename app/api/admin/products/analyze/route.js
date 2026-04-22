import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const AXIS_CONCERNS = {
  skin: ['乾燥肌','脂性肌（オイリー）','混合肌','普通肌','敏感肌','肌タイプがわからない','毛穴','ニキビ・吹き出物','くすみ','赤み','乾燥・カサつき','テカリ','シミ・そばかす','ハリ・弾力不足','色ムラ','ひげが薄い（青みがほとんど残らない）','ひげが濃い（翌日に青みが残る）','肌をプロに診断してもらったことがない'],
  eyebrow: ['丸顔','面長','卵型','逆三角形','四角（ベース型）','顔の輪郭がわからない','チャーミングソフト','チャーミングハード','フレッシュソフト','フレッシュハード','エレガントソフト','エレガントハード','クールソフト','クールハード','顔タイプ診断したことがない','一重','奥二重','二重','眉が薄い','眉が濃い・太い','左右非対称','眉の形がわからない'],
  hair: ['硬い','柔らかい','くせ毛','直毛','細い','太い','髪質がわからない','薄毛・抜け毛が気になる','ボリュームが出ない','頭皮がべたつく','フケが気になる','セットが決まらない','すぐにペタンとなる','まとまらない','丸顔','面長','卵型','逆三角形','四角（ベース型）','チャーミングソフト','チャーミングハード','フレッシュソフト','フレッシュハード','エレガントソフト','エレガントハード','クールソフト','クールハード','髪質・頭皮を美容師に相談したことがない'],
  body: ['腹まわり','胸（上半身）','背中','脚（太もも・ふくらはぎ）','全体的に気になる','猫背が気になる','O脚・X脚が気になる','肩が丸まっている','筋肉をつけたい','体重を落としたい','引き締めたい'],
  teeth: ['着色（コーヒー・お茶・タバコ）','加齢による黄ばみ','元々の歯の色が薄い','歯並びが気になる','すきっ歯が気になる','口臭が気になる','歯茎の色が気になる','よくわからない'],
  nail: ['爪が割れやすい','爪が薄い','二枚爪になりやすい','縦線が目立つ','凸凹がある','爪が黄ばんでいる','甘皮が気になる','噛み癖がある','爪の形を整えたい','長さが揃わない','手の乾燥が気になる','ハンドケアもしたい'],
  fashion: ['キレイめ','カジュアル','キレイめカジュアル','ストリート','モード・個性派','まずは清潔感から','ストレート骨格','ウェーブ骨格','ナチュラル骨格','骨格診断したことがない','チャーミングソフト','チャーミングハード','フレッシュソフト','フレッシュハード','エレガントソフト','エレガントハード','クールソフト','クールハード','顔タイプ診断したことがない','腹まわり','胸（上半身）','脚（太もも・ふくらはぎ）','体型カバーしたい','丸顔','面長','卵型','逆三角形','四角（ベース型）','何を買えばいいかわからない','清潔感が出ない'],
};
const CONCERN_VOCABULARY = Object.values(AXIS_CONCERNS).flat();

const AXIS_LABELS = { skin:'肌ケア', eyebrow:'眉', hair:'髪', body:'体型', teeth:'歯', nail:'爪', fashion:'ファッション' };

export async function POST(req) {
  const sentKey = req.headers.get('x-admin-key') || '';
  const validKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || '';
  if (!validKey || sentKey !== validKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { product_name, axis } = await req.json();
  if (!product_name) return NextResponse.json({ error: 'product_name required' }, { status: 400 });

  // Brave Search で商品情報収集
  let searchSnippets = '';
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const q = encodeURIComponent(`${product_name} 効果 特徴 対象`);
      const bRes = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${q}&count=5&country=jp&search_lang=ja`, {
        headers: { 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY, Accept: 'application/json' },
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        const snippets = (bData.web?.results || []).map(r => r.description || '').filter(Boolean).join('\n');
        searchSnippets = snippets.slice(0, 1200);
      }
    } catch {}
  }

  const axisLabel = AXIS_LABELS[axis] || axis;
  const axisVocab = AXIS_CONCERNS[axis] ? AXIS_CONCERNS[axis].join('、') : CONCERN_VOCABULARY.join('、');

  const prompt = `あなたは男性向け外見改善サービスFinemeのコピーライターです。
商品名：${product_name}
カテゴリ：${axisLabel}
${searchSnippets ? `\n参考情報:\n${searchSnippets}\n` : ''}

以下3項目をJSON形式で出力してください（他のテキスト不要）:
{
  "description": "商品説明（50文字以内、変容・効果を中心に）",
  "target_user": "対象ユーザー（30文字以内、例：脂性肌で毛穴が気になる男性）",
  "target_concerns": ["concern1","concern2"]
}

target_concernsは以下の語彙リストから最大5個選んでください（リスト外の文字列は使わない）:
${axisVocab}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: 'AI response parse failed', raw: text }, { status: 500 });

  let parsed;
  try { parsed = JSON.parse(match[0]); } catch {
    return NextResponse.json({ error: 'JSON parse failed', raw: text }, { status: 500 });
  }

  const validConcerns = (parsed.target_concerns || []).filter(c => CONCERN_VOCABULARY.includes(c));

  return NextResponse.json({
    description: parsed.description || '',
    target_user: parsed.target_user || '',
    target_concerns: validConcerns,
  });
}
