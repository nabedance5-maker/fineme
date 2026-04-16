#!/usr/bin/env node
/**
 * Fineme 掲載候補リスト自動生成ツール
 *
 * Usage: npm run find-providers
 * 必要な環境変数（.env.local に追記）:
 *   GOOGLE_PLACES_API_KEY=xxxx
 *
 * 出力: output/provider-candidates.csv（Excelで開けるUTF-8 BOM付き）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── .env.local 読み込み ──────────────────────────────────
try {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const GOOGLE_API_KEY    = process.env.GOOGLE_PLACES_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌  GOOGLE_PLACES_API_KEY が .env.local に設定されていません');
  console.error('    Google Cloud Console → Places API を有効化してキーを取得してください');
  process.exit(1);
}

// ─── ★ 検索設定（ここを編集して使う） ────────────────────
const SEARCHES = [
  // [検索キーワード, エリア]
  ['パーソナルトレーナー',         '東京都渋谷区'],
  ['パーソナルジム',               '東京都渋谷区'],
  ['眉毛サロン メンズ',            '東京都渋谷区'],
  ['骨格診断',                     '東京都渋谷区'],
  ['パーソナルカラー診断',         '東京都渋谷区'],
  ['メンズ脱毛サロン',             '東京都渋谷区'],
  ['パーソナルスタイリスト',       '東京都渋谷区'],
  ['ホワイトニングサロン メンズ',  '東京都渋谷区'],

  // エリアを増やす場合は下のコメントを外す
  // ['パーソナルトレーナー', '東京都新宿区'],
  // ['パーソナルトレーナー', '東京都池袋'],
  // ['パーソナルトレーナー', '大阪市梅田'],
];

const OUTPUT_FILE = path.join(ROOT, 'output', 'provider-candidates.csv');
const DELAY_MS    = 300; // API呼び出し間の待機時間(ms)
// ─────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Google Places Text Search */
async function searchPlaces(keyword, area) {
  const query = encodeURIComponent(`${keyword} ${area}`);
  const url   = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=ja&key=${GOOGLE_API_KEY}`;
  const res   = await fetch(url);
  const data  = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.warn(`  ⚠️  Places API: ${data.status} — ${keyword} ${area}`);
  }
  return data.results || [];
}

/** Place Details でウェブサイト・電話番号・マップURLを取得 */
async function getPlaceDetails(placeId) {
  const fields = 'website,formatted_phone_number,url';
  const url    = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=ja&key=${GOOGLE_API_KEY}`;
  const res    = await fetch(url);
  const data   = await res.json();
  return data.result || {};
}

/** ウェブサイトを取得して Instagram URL を抽出 */
async function extractInstagram(website) {
  if (!website) return '';
  try {
    const res  = await fetch(website, {
      signal:  AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    const html  = await res.text();
    const match = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?)(?:\/|\?|"|'|\s)/);
    if (match && !['p', 'explore', 'reel', 'stories', 'accounts'].includes(match[1])) {
      return `https://instagram.com/${match[1]}`;
    }
  } catch {}
  return '';
}

/** Claude Haiku で個人/法人推定 + DM優先度スコアリング */
async function scoreWithClaude(businesses) {
  if (!ANTHROPIC_API_KEY || !businesses.length) {
    businesses.forEach(b => { b.type = '不明'; b.score = 3; b.memo = ''; });
    return;
  }

  const list = businesses.map((b, i) =>
    `${i}|${b.name}|レビュー${b.reviewCount}件(${b.rating}★)|${b.category}|Web:${b.website ? 'あり' : 'なし'}|IG:${b.instagram ? 'あり' : 'なし'}`
  ).join('\n');

  const prompt = `Fineme（外見磨きサービス検索サイト）への掲載候補を評価してください。

判定基準:
- 個人運営・フリーランス = 高優先（レビュー件数50件以下、チェーン店でない名称）
- 法人チェーン・大手 = 低優先
- Instagram/Webあり = 連絡手段あり = 加点
- メンズ向け・外見改善系サービス = 加点

JSON配列のみ出力（コードブロックなし・余分なテキストなし）:
[{"i":0,"t":"個人" or "法人","s":1-5,"m":"DM時メモ15字以内"}]

候補リスト（インデックス|名称|レビュー|カテゴリ|Web|IG）:
${list}`;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    const data   = await res.json();
    const raw    = data.content?.[0]?.text || '[]';
    const match  = raw.match(/\[[\s\S]*?\]/);
    const scores = JSON.parse(match ? match[0] : '[]');
    for (const s of scores) {
      const b = businesses[s.i];
      if (b) { b.type = s.t || '不明'; b.score = s.s || 3; b.memo = s.m || ''; }
    }
  } catch (e) {
    console.warn('  ⚠️  Claude スコアリングエラー:', e.message);
    businesses.forEach(b => { b.type = '不明'; b.score = 3; b.memo = ''; });
  }
}

/** CSV 書き出し（BOM付きUTF-8 → Excelで文字化けしない） */
function writeCSV(businesses, filePath) {
  const COLS = [
    ['事業者名',         b => b.name],
    ['カテゴリ',         b => b.category],
    ['エリア',           b => b.area],
    ['住所',             b => b.address],
    ['電話番号',         b => b.phone],
    ['ウェブサイト',     b => b.website],
    ['Instagram',        b => b.instagram],
    ['Googleレビュー数', b => b.reviewCount],
    ['Google評価',       b => b.rating],
    ['個人/法人',        b => b.type],
    ['DM優先度(1-5)',    b => b.score],
    ['GoogleマップURL',  b => b.mapsUrl],
    ['DMメモ',           b => b.memo],
  ];
  const q    = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = COLS.map(([h]) => q(h)).join(',');
  const rows   = businesses.map(b => COLS.map(([, fn]) => q(fn(b))).join(','));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '\uFEFF' + [header, ...rows].join('\n'), 'utf8');
}

// ─── メイン ───────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Fineme 掲載候補リスト自動生成ツール');
  console.log('═══════════════════════════════════════════\n');

  const seen = new Set();
  const all  = [];

  // Step 1: Places 検索
  for (const [keyword, area] of SEARCHES) {
    process.stdout.write(`📍 ${keyword} / ${area} ... `);
    const places = await searchPlaces(keyword, area);
    console.log(`${places.length}件`);

    for (const place of places) {
      if (seen.has(place.place_id)) continue;
      seen.add(place.place_id);

      await sleep(DELAY_MS);
      const details   = await getPlaceDetails(place.place_id);
      await sleep(DELAY_MS);
      const instagram = await extractInstagram(details.website);

      all.push({
        name:        place.name || '',
        category:    keyword,
        area,
        address:     place.formatted_address || '',
        phone:       details.formatted_phone_number || '',
        website:     details.website || '',
        instagram,
        reviewCount: place.user_ratings_total || 0,
        rating:      place.rating || '',
        mapsUrl:     details.url || '',
        type:        '',
        score:       3,
        memo:        '',
      });
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n合計 ${all.length} 件（重複除去済み）\n`);

  // Step 2: Claude スコアリング（30件ずつ）
  if (ANTHROPIC_API_KEY) {
    console.log('🤖 Claude でスコアリング中...');
    const BATCH = 30;
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH);
      await scoreWithClaude(batch);
      console.log(`  ${Math.min(i + BATCH, all.length)} / ${all.length} 件完了`);
      await sleep(600);
    }
  } else {
    console.log('⚠️  ANTHROPIC_API_KEY 未設定 → スコアリングをスキップ');
    all.forEach(b => { b.type = '不明'; b.score = 3; b.memo = ''; });
  }

  // Step 3: DM優先度 → 降順ソート
  all.sort((a, b) => b.score - a.score || b.reviewCount - a.reviewCount);

  // Step 4: CSV 書き出し
  writeCSV(all, OUTPUT_FILE);

  console.log('\n═══════════════════════════════════════════');
  console.log(`✅  完了！ → ${OUTPUT_FILE}`);
  console.log(`   総件数:           ${all.length} 件`);
  console.log(`   優先度 5（最高）: ${all.filter(b => b.score === 5).length} 件`);
  console.log(`   優先度 4:         ${all.filter(b => b.score === 4).length} 件`);
  console.log(`   Instagram 取得:   ${all.filter(b => b.instagram).length} 件`);
  console.log('═══════════════════════════════════════════\n');
}

main().catch(e => { console.error('❌ エラー:', e.message); process.exit(1); });
