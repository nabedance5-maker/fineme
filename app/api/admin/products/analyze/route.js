import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const CONCERN_VOCABULARY = [
  '腹まわり','胸（上半身）','背中','脚（太もも・ふくらはぎ）','全体的に気になる',
  '硬い','柔らかい','くせ毛','直毛','細い',
  '乾燥肌','脂性肌（オイリー）','混合肌','普通肌',
  '毛穴','ニキビ・吹き出物','くすみ','赤み','乾燥・カサつき','テカリ',
  '薄い（青みがほとんど残らない）','普通〜濃い（翌日に青みが残る）',
  '着色（コーヒー・お茶・タバコ）','加齢による黄ばみ','元々の歯の色が薄い','よくわからない',
];

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
  const vocabStr = CONCERN_VOCABULARY.join('、');

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
${vocabStr}`;

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
