#!/usr/bin/env node
// Biople / コスメキッチン から商品をスクレイプして Fineme アフィリエイト商品として一括登録するスクリプト
// Next.js サーバー不要。Supabase + Claude API に直接接続。
//
// 使い方:
//   node --env-file=.env.local scripts/import-biople-products.mjs --dry-run
//   node --env-file=.env.local scripts/import-biople-products.mjs --limit=50
//   node --env-file=.env.local scripts/import-biople-products.mjs

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// ─── 設定 ────────────────────────────────────────────────────────────────────

const BASE_SITE = 'https://www.cosmekitchen-webstore.jp/Form/Product/ProductList.aspx';
const AMAZON_TAG = 'whero523-22';

const CATEGORIES = [
  { cat: 'CAT101103', axis: 'skin',  label: '化粧水' },
  { cat: 'CAT101102', axis: 'skin',  label: 'クレンジング' },
  { cat: 'CAT101105', axis: 'skin',  label: '美容液/オイル' },
  { cat: 'CAT103101', axis: 'hair',  label: 'シャンプー' },
  { cat: 'CAT103102', axis: 'hair',  label: 'コンディショナー' },
  { cat: 'CAT103103', axis: 'hair',  label: 'トリートメント' },
  { cat: 'CAT104101', axis: 'body',  label: 'ボディウォッシュ' },
  { cat: 'CAT104102', axis: 'body',  label: 'ボディモイスチャライザー' },
];

// analyze API と同じ concern 語彙リスト（重複使用を避けるため同じ定義をここに持つ）
const AXIS_CONCERNS = {
  skin: ['乾燥肌','脂性肌（オイリー）','混合肌','普通肌','敏感肌','肌タイプがわからない','毛穴','ニキビ・吹き出物','くすみ','赤み','乾燥・カサつき','テカリ','シミ・そばかす','ハリ・弾力不足','色ムラ','ひげが薄い（青みがほとんど残らない）','ひげが濃い（翌日に青みが残る）','肌をプロに診断してもらったことがない'],
  eyebrow: ['丸顔','面長','卵型','逆三角形','四角（ベース型）','顔の輪郭がわからない'],
  hair: ['硬い','柔らかい','くせ毛','直毛','細い','太い','髪質がわからない','薄毛・抜け毛が気になる','ボリュームが出ない','頭皮がべたつく','フケが気になる','セットが決まらない','すぐにペタンとなる','まとまらない'],
  body: ['腹まわり','胸（上半身）','背中','脚（太もも・ふくらはぎ）','全体的に気になる','筋肉をつけたい','体重を落としたい','引き締めたい'],
  teeth: ['着色（コーヒー・お茶・タバコ）','加齢による黄ばみ','元々の歯の色が薄い','歯並びが気になる','口臭が気になる'],
  nail: ['爪が割れやすい','爪が薄い','二枚爪になりやすい','縦線が目立つ','爪が黄ばんでいる','甘皮が気になる','爪の形を整えたい','手の乾燥が気になる'],
  fashion: ['キレイめ','カジュアル','キレイめカジュアル','ストリート','まずは清潔感から'],
};
const AXIS_LABELS = { skin:'肌ケア', eyebrow:'眉', hair:'髪', body:'体型', teeth:'歯', nail:'爪', fashion:'ファッション' };
const CONCERN_VOCABULARY = Object.values(AXIS_CONCERNS).flat();

// ─── 引数解析 ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;

// ─── 環境変数チェック ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です。');
  console.error('  node --env-file=.env.local scripts/import-biople-products.mjs');
  process.exit(1);
}
if (!ANTHROPIC_KEY && !DRY_RUN) {
  console.error('ERROR: ANTHROPIC_API_KEY が未設定です（AI enrichment に必要）。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parsePriceRange(price) {
  if (price < 3000) return 'low';
  if (price < 6000) return 'mid';
  return 'high';
}

function parseLevel(price) {
  if (price < 3000) return 'beginner';
  if (price < 6000) return 'intermediate';
  return 'advanced';
}

function cleanName(raw) {
  // 【ブランド名】商品名 → ブランド名 商品名（Amazon検索に使いやすい形）
  return raw.replace(/^【([^】]+)】\s*/, '$1 ').trim();
}

// ─── スクレイプ ───────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 3, delayMs = 5000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
    'Cache-Control': 'no-cache',
  };
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res;
    const retryAfter = res.headers.get('retry-after');
    const wait = retryAfter ? parseInt(retryAfter) * 1000 : delayMs * (i + 1);
    if (i < retries - 1) {
      console.log(`    503 → ${wait / 1000}秒後にリトライ...`);
      await sleep(wait);
    } else {
      throw new Error(`HTTP ${res.status} (${retries}回試みた後)`);
    }
  }
}

async function fetchCategoryProducts(cat) {
  const url = `${BASE_SITE}?shop=0&cat=${cat}`;
  const res = await fetchWithRetry(url);
  const html = await res.text();

  const names = [...html.matchAll(/item_name:\s*"([^"]+)"/g)].map(m => m[1]);
  const prices = [...html.matchAll(/price:\s*(\d+)/g)].map(m => parseInt(m[1]));

  return names.map((raw, i) => ({
    rawName: raw,
    name: cleanName(raw),
    price: prices[i] ?? 0,
  }));
}

// ─── AI Enrichment ────────────────────────────────────────────────────────────

async function analyzeProduct(name, axis) {
  if (!anthropic) return null;

  // Brave Search で補足情報を収集（オプション）
  let searchSnippets = '';
  if (BRAVE_KEY) {
    try {
      const q = encodeURIComponent(`${name} 効果 特徴 成分`);
      const bRes = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${q}&count=3&country=jp&search_lang=ja`,
        { headers: { 'X-Subscription-Token': BRAVE_KEY, Accept: 'application/json' } }
      );
      if (bRes.ok) {
        const bData = await bRes.json();
        const snippets = (bData.web?.results || []).map(r => r.description || '').filter(Boolean).join('\n');
        searchSnippets = snippets.slice(0, 800);
      }
    } catch {}
  }

  const axisLabel = AXIS_LABELS[axis] || axis;
  const axisVocab = AXIS_CONCERNS[axis] ? AXIS_CONCERNS[axis].join('、') : CONCERN_VOCABULARY.join('、');

  const prompt = `あなたは男性向け外見改善サービスFinemeのコピーライターです。
商品名：${name}
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

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    const validConcerns = (parsed.target_concerns || []).filter(c => CONCERN_VOCABULARY.includes(c));
    return {
      description: parsed.description || '',
      target_user: parsed.target_user || '',
      target_concerns: validConcerns,
    };
  } catch {
    return null;
  }
}

// ─── メイン ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌿 Biople/コスメキッチン 商品インポート ${DRY_RUN ? '[DRY RUN]' : ''}`);
  console.log(`   上限: ${LIMIT === Infinity ? '無制限' : LIMIT + '件'}\n`);

  // 既存商品を取得（重複チェック用）
  const { data: existing, error: fetchErr } = await supabase
    .from('affiliate_products')
    .select('name');
  if (fetchErr) {
    console.error('ERROR: Supabase から既存商品を取得できませんでした:', fetchErr.message);
    process.exit(1);
  }
  const existingNames = new Set(existing.map(p => p.name.toLowerCase().trim()));
  console.log(`📦 既存商品: ${existing.length}件\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const { cat, axis, label } of CATEGORIES) {
    if (totalImported >= LIMIT) break;

    console.log(`📂 ${label} (${axis})`);

    let products;
    try {
      products = await fetchCategoryProducts(cat);
      await sleep(400);
    } catch (e) {
      console.error(`  ❌ フェッチ失敗: ${e.message}`);
      continue;
    }
    console.log(`   取得: ${products.length}件`);

    for (const p of products) {
      if (totalImported >= LIMIT) break;

      const nameLower = p.name.toLowerCase().trim();
      if (existingNames.has(nameLower)) {
        totalSkipped++;
        continue;
      }

      const amazonUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(p.name)}&tag=${AMAZON_TAG}`;
      const priceRange = parsePriceRange(p.price);
      const level = parseLevel(p.price);

      if (DRY_RUN) {
        console.log(`  📝 ${p.name} | ¥${p.price} | ${priceRange}/${level}`);
        totalImported++;
        existingNames.add(nameLower);
        continue;
      }

      // AI enrichment（Claude Haiku）
      const ai = await analyzeProduct(p.name, axis);
      await sleep(500);

      const record = {
        axis,
        name: p.name,
        url: amazonUrl,
        level,
        price_range: priceRange,
        is_active: true,
        sort_order: 0,
        description: ai?.description ?? '',
        target_user: ai?.target_user ?? '',
        target_concerns: ai?.target_concerns ?? [],
      };

      const { error: insertErr } = await supabase
        .from('affiliate_products')
        .insert(record);

      if (insertErr) {
        console.log(`  ❌ 登録失敗: ${p.name} — ${insertErr.message}`);
        totalErrors++;
      } else {
        console.log(`  ✅ ${p.name} | ¥${p.price} | ${ai?.description ?? '（説明なし）'}`);
        totalImported++;
        existingNames.add(nameLower);
      }

      await sleep(300);
    }

    await sleep(500);
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`登録: ${totalImported}件 / スキップ（重複）: ${totalSkipped}件 / エラー: ${totalErrors}件`);
  if (DRY_RUN) console.log('※ DRY RUN のため実際には登録していません。');
}

main().catch(e => {
  console.error('予期せぬエラー:', e);
  process.exit(1);
});
