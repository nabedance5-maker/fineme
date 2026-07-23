/**
 * Belle 記事バッチ生成スクリプト
 *
 * 使い方: node --env-file=.env.local scripts/seed-belle-articles.mjs
 *
 * 30記事を Claude API で生成して data/belle-articles.json に追加する。
 * 既存スラッグと重複しない。
 */
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../data/belle-articles.json');

const BELLE_PHOTOS = {
  eyebrow:     ['1531746790-e6cce05ef1a3','1494790108377-be9c29b29330','1503951914875-452162b0f3f1','1525584399338-54440d7e3ab8'],
  skincare:    ['1598300042247-d088f8ab3a91','1556228578-8c89e6adf883','1508341591423-4347099e1f19','1566734153985-59bbb4f4d65d'],
  hair:        ['1438761681033-6461ffad8d80','1522337360788-8b13dee7a37e','1611532736597-de2d4265fba3','1560707489-10c6c1167bc1'],
  fashion:     ['1515886657613-9f3515b0c78f','1558618666-fcd25c85cd64','1487222477941-e84b1c0e9e4f','1524504388-8bd11166bb35'],
  nail:        ['1604654894610-df63bc536371','1526481280693-3bfa7568e0f3','1519014816548-bf5fe059798b'],
  hairremoval: ['1598300042247-d088f8ab3a91','1521119989659-a83eee488004','1505944270485-f35f6d130535'],
  teeth:       ['1531746790-e6cce05ef1a3','1438761681033-6461ffad8d80','1581591524425-c7e0978865fc'],
  body:        ['1571019613454-1cb2f99b2d8b','1487222477941-e84b1c0e9e4f','1484480974693-6ca0a78fb36b','1518310383802-640c2de311b2'],
  philosophy:  ['1494790108377-be9c29b29330','1605296867304-46d5465a13f1','1599566150163-29194dcaad36'],
  guide:       ['1611532736597-de2d4265fba3','1531746790-e6cce05ef1a3','1494790108377-be9c29b29330'],
};
const DEFAULT_PHOTOS = ['1531746790-e6cce05ef1a3','1494790108377-be9c29b29330','1438761681033-6461ffad8d80','1526481280693-3bfa7568e0f3'];

function imgSrc(id) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
}

// 30テーマ：軸 × 切り口多様化
const BATCH_THEMES = [
  // 眉毛 (3本)
  { axis: '眉毛', category: 'eyebrow', slug: 'eyebrow-shapes-guide', prompt: '顔型別（丸顔・面長・逆三角形・四角顔）に最も似合う眉の形を解説。自分の顔型の判断方法から適した眉のアーチ・幅・角度まで実践的に。' },
  { axis: '眉毛', category: 'eyebrow', slug: 'eyebrow-pencil-beginner', prompt: '眉ペンシルとパウダーの使い分け・描き方の手順（毛並みに沿って→アーチ→下ラインの順序）・自然な仕上がりのコツ。初心者向け。' },
  { axis: '眉毛', category: 'eyebrow', slug: 'eyebrow-maintenance-tips', prompt: '眉毛の自己メンテナンス完全ガイド。抜く・剃る・カットそれぞれの正しい使い方と頻度。サロン後に長持ちさせるホームケアの具体的な手順。' },
  // スキンケア (3本)
  { axis: 'スキンケア', category: 'skincare', slug: 'morning-skincare-routine', prompt: '朝の5分スキンケアルーティン。洗顔→化粧水→乳液→日焼け止めの正しい手順と量。時短で「肌荒れしない肌」を作る方法。' },
  { axis: 'スキンケア', category: 'skincare', slug: 'sunscreen-daily-habit', prompt: '日焼け止めを毎日塗る習慣の作り方。なぜ20代から必須なのか・SPFとPAの意味・塗り直しのタイミング・おすすめの使い方。' },
  { axis: 'スキンケア', category: 'skincare', slug: 'pore-care-basics', prompt: '毛穴の種類（黒ずみ・開き毛穴・たるみ毛穴）と原因別ケア方法。市販品だけで改善できるセルフケアの限界と、効果的なアプローチの優先順位。' },
  // ヘア (3本)
  { axis: 'ヘア', category: 'hair', slug: 'self-styling-morning', prompt: '朝5分のセルフスタイリング。ドライヤーの正しい当て方・ストレートアイロンとコテの使い分け・崩れにくいキープ方法。' },
  { axis: 'ヘア', category: 'hair', slug: 'hair-color-beginner', prompt: 'ヘアカラーを初めて変える人のガイド。明るさ（レベル）の選び方・ダメージを最小限にする方法・自分に似合う色の見つけ方の基本。' },
  { axis: 'ヘア', category: 'hair', slug: 'hair-care-damage-repair', prompt: '傷んだ髪を回復させるホームケア。トリートメントの正しい使い方・ドライヤーの熱ダメージを防ぐ方法・美容師が教える本当に効くケアの優先順位。' },
  // ファッション (3本)
  { axis: 'ファッション', category: 'fashion', slug: 'capsule-wardrobe-basics', prompt: '「着る服がない」を解決するカプセルクローゼットの作り方。最初に揃えるべき10着と選び方の基準。色・素材・シルエットの3原則。' },
  { axis: 'ファッション', category: 'fashion', slug: 'skeleton-type-fashion', prompt: '骨格診断3タイプ（ストレート・ウェーブ・ナチュラル）の見分け方と、自分のタイプに合った服の選び方。首元・袖・素材の変化で印象は大きく変わる。' },
  { axis: 'ファッション', category: 'fashion', slug: 'color-coordination-guide', prompt: '服の色合わせが苦手な人のための配色基本。ベーシックカラー＋差し色の組み合わせ・同系色でまとめる方法・「無難すぎ」を脱する小物使い。' },
  // ネイル (2本)
  { axis: 'ネイル', category: 'nail', slug: 'nail-shape-guide', prompt: '自分に似合うネイルの形の選び方（スクエア・オーバル・アーモンド・ラウンド）。指の形・長さ別のおすすめと、清潔感が増す爪の長さの基準。' },
  { axis: 'ネイル', category: 'nail', slug: 'gel-nail-beginner', prompt: 'ジェルネイル初体験ガイド。ネイルサロンの選び方・初回に選ぶべきデザイン・持ちを良くするための事前ケア・オフのタイミング。' },
  // 脱毛 (2本)
  { axis: '脱毛', category: 'hairremoval', slug: 'hair-removal-comparison', prompt: '医療脱毛と光脱毛（エステ脱毛）の違いを正直に比較。永久脱毛効果・痛み・費用・回数・サロン選びの基準を初心者向けに整理。' },
  { axis: '脱毛', category: 'hairremoval', slug: 'vio-hair-removal-guide', prompt: 'VIO脱毛を始める前に知っておくこと。Vライン・Iライン・Oラインのケア方法・医療脱毛との違い・初めての人が感じる不安を全部解消。' },
  // 歯・笑顔 (2本)
  { axis: '歯・笑顔', category: 'teeth', slug: 'whitening-toothpaste-guide', prompt: 'ホワイトニング歯磨き粉の正しい選び方と使い方。市販品で本当に白くなるか・歯科ホワイトニングとの使い分け・効果を最大にする習慣。' },
  { axis: '歯・笑顔', category: 'teeth', slug: 'smile-training-tips', prompt: '「笑顔が引きつる」を直す方法。表情筋トレーニング・歯を見せる笑顔を自然に作るコツ・写真映えする口角の上げ方の練習法。' },
  // ボディ (2本)
  { axis: 'ボディ', category: 'body', slug: 'posture-improvement-daily', prompt: '姿勢を改善するだけで見た目が変わる理由と、日常で続けられる姿勢チェックの習慣。座り方・立ち方・スマホ首の直し方の具体的な手順。' },
  { axis: 'ボディ', category: 'body', slug: 'body-proportion-tips', prompt: '体重ではなく「体型の見え方」を変えるコツ。スタイル良く見せる服の選び方・下半身を細く見せる着こなし・姿勢と歩き方の印象への影響。' },
  // 考え方/哲学 (2本)
  { axis: '考え方', category: 'philosophy', slug: 'self-image-reset', prompt: '「どうせ変わらない」という思い込みをリセットするための考え方。外見改善を「他人への努力」から「自分への投資」に切り替えるための最初の一歩。' },
  { axis: '考え方', category: 'philosophy', slug: 'consistency-beauty-habit', prompt: '外見改善を続けられる人と途中でやめてしまう人の決定的な違い。モチベーション依存を卒業して「仕組み化」で美容習慣を作る方法。' },
  // 垢抜け (3本)
  { axis: '垢抜け', category: 'guide', slug: 'akanu-priority-order', prompt: '最短で垢抜けるための優先順位。眉→肌→髪→服の順番に根拠がある理由と、同じ時間・お金でも最大効果を出す外見改善の正しい順序。' },
  { axis: '垢抜け', category: 'guide', slug: 'akanu-common-mistakes', prompt: '垢抜けようとして逆効果になりがちな失敗7パターン。やりすぎメイク・流行丸パクリ・サイズ感ミス・眉の崩し方など具体的なNG例と正解。' },
  { axis: '垢抜け', category: 'guide', slug: 'akanu-budget-3months', prompt: '月3,000円でできる垢抜け計画3ヶ月版。1ヶ月目は眉・2ヶ月目はスキンケア・3ヶ月目はヘアの順番で進める具体的なステップと費用配分。' },
  // 骨格診断 (1本)
  { axis: '骨格診断', category: 'fashion', slug: 'skeleton-type-self-check', prompt: '骨格診断の自己チェック方法。手首・鎖骨・背中の厚みなどセルフで確認できるポイント。「なんか服が決まらない」の原因が骨格にある理由と解決法。' },
  // パーソナルカラー (1本)
  { axis: 'パーソナルカラー', category: 'fashion', slug: 'personal-color-basics', prompt: 'パーソナルカラー4シーズン（スプリング・サマー・オータム・ウィンター）の特徴と診断方法。自分に似合う色を知ることでメイク・服選びが劇的に楽になる理由。' },
  // Belle Mirror活用 (2本)
  { axis: 'Belle Mirror活用', category: 'guide', slug: 'belle-mirror-how-to', prompt: 'Belle Mirror（AI写真分析）の正しい活用方法。写真の撮り方・光の当て方・何回撮ると良いか。出てくる結果の読み解き方と次のアクションへの繋げ方。' },
  { axis: 'Belle Mirror活用', category: 'guide', slug: 'belle-mirror-monthly-check', prompt: 'Belle Mirrorを月1回定期的に使う「月次外見チェック」の仕組み。変化を可視化することで継続意欲が上がる理由と、効果的な比較記録の残し方。' },
];

const SYSTEM_PROMPT = `あなたはFineme Belle（外見を起点に自信を再設計する女性向けプラットフォーム）のコンテンツライター。
20〜30代女性に向けた、実用的で共感しやすいSEO記事をJSONブロック形式で書く。

【ブランド思想】
「誰かに選ばれるために磨くんじゃない。自分が自分を幸せにすると決めた日から、外見は変わる。」

【必ず守る出力形式】
以下のJSON配列だけを出力すること（マークダウンのコードブロックも不要）：
{
  "title": "日本語タイトル（25〜38字、インパクトのある表現）",
  "description": "SEO用説明文（90〜115字、検索意図に答える内容）",
  "blocks": [ ...ブロック配列... ]
}

【使えるブロックタイプ】
- {"type":"lead","text":"..."} — 書き出し（1段落、150〜200字）
- {"type":"h2","text":"..."} — H2見出し（H2は3〜5個）
- {"type":"h3","text":"..."} — H3見出し
- {"type":"text","text":"..."} — 本文段落（1段落150〜250字）
- {"type":"tip","label":"POINT","text":"..."} — ヒント（labelはPOINT/CHECK/NOTE/FACTのどれか）
- {"type":"quote","text":"..."} — 引用・名言風（短い1文）
- {"type":"checklist","items":["...","..."]} — チェックリスト
- {"type":"steps","items":[{"title":"...","text":"..."}]} — ステップ（3〜5個）
- {"type":"cta","label":"Belle Me Scan","href":"/belle/diagnosis","text":"...（60字以内の誘導文）"} — CTA（記事に1回）

【記事の構成】
1. lead（つかみ・共感）
2. H2 × 3〜5個 = 本文
3. 途中1か所にcta（Belle Me Scanへ）
4. 最後のH2後はまとめ段落

【量と質】
- 全体で1800〜2500字相当（30〜45ブロック程度）
- tip/checklist/stepsを各1〜2個は入れる
- quote を1〜2個入れる
- 数字・具体的な固有名詞・比較を積極使用
- 「〜してみましょう」「〜しましょう」禁止。「〜すると変わる人が多い」「〜が効く理由がある」など事実ベースで。
`;

async function generateArticle(client, theme, existingTitles) {
  const dupeCheck = existingTitles.length > 0
    ? `\n\n【重複禁止：既存タイトル一覧】\n${existingTitles.slice(-20).map(t => `・${t}`).join('\n')}`
    : '';

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    temperature: 0.85,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `テーマ軸：「${theme.axis}」\n具体的な切り口：${theme.prompt}${dupeCheck}\n\nこの内容でBelle Journal記事を1本書いてください。JSONのみ出力。`,
    }],
  });

  const raw = msg.content?.[0]?.text?.trim() || '';
  // JSON部分を抽出（コードブロック対応）
  const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '');
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON not found in output');
  // 制御文字を除去してからパース
  const cleaned = jsonMatch[0].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 末尾の不正文字を除去して再試行
    const trimmed = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(trimmed);
  }
}

function injectImages(blocks, category) {
  const pool = BELLE_PHOTOS[category] || DEFAULT_PHOTOS;
  const h2Indices = blocks.reduce((acc, b, i) => b.type === 'h2' ? [...acc, i] : acc, []);
  if (h2Indices.length === 0) return blocks;

  const result = [...blocks];
  const img = (idx, poolIdx) => ({
    type: 'image',
    src: imgSrc(pool[poolIdx % pool.length]),
    alt: ''
  });

  // 2番目のH2の後に画像1を挿入
  let offset = 0;
  if (h2Indices.length >= 2) {
    const insertAt = h2Indices[1] + 1 + offset;
    result.splice(insertAt, 0, img(insertAt, 0));
    offset++;
  }
  // 全体の60%あたりのH2の後に画像2を挿入
  const midIdx = Math.floor(h2Indices.length * 0.6);
  if (h2Indices[midIdx] && h2Indices[midIdx] !== (h2Indices[1] || -1)) {
    const insertAt2 = h2Indices[midIdx] + 1 + offset;
    result.splice(insertAt2, 0, img(insertAt2, 1));
  }
  return result;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY が未設定'); process.exit(1); }

  const client = new Anthropic({ apiKey });

  // 既存記事を読み込む
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch { existing = []; }

  const existingSlugs = new Set(existing.map(a => a.slug));
  const existingTitles = existing.map(a => a.title);

  // 生成対象（既存スラッグをスキップ）
  const targets = BATCH_THEMES.filter(t => !existingSlugs.has(t.slug));
  console.log(`生成対象: ${targets.length}記事（既存: ${existing.length}記事）`);

  const generated = [];
  let success = 0;
  let fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const theme = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${theme.axis} / ${theme.slug} ... `);

    try {
      const article = await generateArticle(client, theme, [...existingTitles, ...generated.map(g => g.title)]);

      const blocks = injectImages(article.blocks || [], theme.category);

      const newArticle = {
        slug: theme.slug,
        title: article.title,
        description: article.description,
        category: theme.category,
        keywords: [],
        publishedAt: new Date().toISOString().slice(0, 10),
        readingTime: Math.ceil(blocks.filter(b => b.text || b.items).reduce((n, b) => {
          if (b.text) return n + b.text.length;
          if (Array.isArray(b.items)) return n + b.items.join('').length;
          return n;
        }, 0) / 400),
        blocks,
      };

      generated.push(newArticle);
      success++;
      console.log(`✅ "${article.title}"`);

      // 途中セーブ（5記事ごと）
      if (generated.length % 5 === 0) {
        const all = [...existing, ...generated];
        fs.writeFileSync(DATA_PATH, JSON.stringify(all, null, 2), 'utf8');
        console.log(`  💾 中間保存: ${all.length}記事`);
      }

      // Rate limit 回避
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log(`❌ エラー: ${e.message}`);
      fail++;
    }
  }

  // 最終保存
  const all = [...existing, ...generated];
  fs.writeFileSync(DATA_PATH, JSON.stringify(all, null, 2), 'utf8');
  console.log(`\n完了: ✅${success}件生成 / ❌${fail}件失敗 / 合計${all.length}記事`);
}

main().catch(e => { console.error(e); process.exit(1); });
