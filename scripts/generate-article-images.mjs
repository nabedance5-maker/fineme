/**
 * generate-article-images.mjs
 *
 * 特集記事（featuresテーブル）に画像を自動生成して設定するスクリプト
 *
 * 使い方:
 *   node scripts/generate-article-images.mjs
 *   node scripts/generate-article-images.mjs --limit 10        # 最大10件だけ処理
 *   node scripts/generate-article-images.mjs --slug my-article  # 特定記事1件だけ処理
 *   node scripts/generate-article-images.mjs --dry-run          # DB更新せずログだけ確認
 *
 * 事前準備:
 *   1. .env.local に以下を追加:
 *      REPLICATE_API_TOKEN=r8_xxxxxxxxxxxx
 *   2. Supabaseダッシュボード > Storage > 「articles」バケットを作成（Public）
 *   3. featuresテーブルに body_images カラムを追加（下記SQL）:
 *      ALTER TABLE features ADD COLUMN IF NOT EXISTS body_images JSONB DEFAULT '[]';
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── 環境変数読み込み ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// .env.local を手動で読む（dotenvなしで動作）
function loadEnv() {
  const files = ['.env.local', '.env'];
  for (const f of files) {
    try {
      const content = readFileSync(resolve(rootDir, f), 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch {}
  }
}
loadEnv();

// ── 設定 ────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_TOKEN   = process.env.REPLICATE_API_TOKEN;
const ANTHROPIC_KEY     = process.env.ANTHROPIC_API_KEY;
const STORAGE_BUCKET    = 'articles';        // Supabase Storageのバケット名
const APP_URL           = 'https://fineme.me';
const ADMIN_API_KEY     = process.env.ADMIN_API_KEY;
const BODY_IMAGES_COUNT = 2;                 // 本文内に生成する画像枚数
const REQUEST_INTERVAL  = 12000;            // API呼び出し間隔（ms）※レート制限対応
const REPLICATE_MODEL   = 'black-forest-labs/flux-schnell';

// コマンドライン引数
const args = process.argv.slice(2);
const LIMIT   = args.includes('--limit')   ? parseInt(args[args.indexOf('--limit') + 1])   : null;
const SLUG    = args.includes('--slug')    ? args[args.indexOf('--slug') + 1]               : null;
const DRY_RUN = args.includes('--dry-run');

// ── バリデーション ────────────────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に未設定');
  process.exit(1);
}
if (!REPLICATE_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN が .env.local に未設定');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY が .env.local に未設定');
  process.exit(1);
}

// ── クライアント初期化 ────────────────────────────────────────────────────
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── ユーティリティ ────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('ja-JP')}] ${msg}`);
}

// ── Step 1: Claude で画像プロンプトを生成 ────────────────────────────────
async function generateImagePrompts(article) {
  const systemPrompt = `You are an expert at writing image generation prompts for blog articles.
Generate prompts in English for Flux image generation model.
Each prompt should be:
- Photorealistic, high quality
- NOT include any text, letters, or words in the image
- NOT include people's faces (abstract figures or silhouettes are OK)
- Relevant to the article topic which is about men's appearance improvement (hair, fashion, gym, skin care, etc.)
- Cinematic, moody lighting, dark blue/navy background preferred (to match the site's deep sea theme)
- 20-50 words per prompt`;

  const userPrompt = `Article title: ${article.title}
Description: ${article.description || article.summary || ''}
Category: ${article.category || ''}

Generate ${1 + BODY_IMAGES_COUNT} image prompts as a JSON array:
- Index 0: thumbnail/hero image (wide, establishing shot)
- Index 1-${BODY_IMAGES_COUNT}: body images (detail shots, process shots, or mood images)

Return ONLY a JSON array of strings, no other text.
Example: ["prompt1", "prompt2", "prompt3"]`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      { role: 'user', content: [
        { type: 'text', text: systemPrompt + '\n\n' + userPrompt }
      ]}
    ]
  });

  const text = msg.content[0].text.trim();
  // JSONを抽出
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Claude からJSONを取得できませんでした: ${text}`);
  return JSON.parse(match[0]);
}

// ── Step 2: Replicate で画像生成 ────────────────────────────────────────
async function generateImageWithReplicate(prompt) {
  // 予測を開始
  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 80,
        go_fast: true,
      }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API エラー: ${createRes.status} ${err}`);
  }

  const prediction = await createRes.json();

  // Prefer: wait を使っているので通常は即完了しているが、念のためポーリング
  if (prediction.status === 'succeeded') {
    return prediction.output[0];
  }

  // まだ処理中の場合はポーリング
  const predId = prediction.id;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    });
    const poll = await pollRes.json();
    if (poll.status === 'succeeded') return poll.output[0];
    if (poll.status === 'failed') throw new Error(`Replicate 生成失敗: ${poll.error}`);
    log(`  ⏳ 生成中... (${poll.status})`);
  }
  throw new Error('Replicate タイムアウト');
}

// ── Step 3: 画像URLをダウンロードしてSupabase Storageにアップロード ──────
async function uploadToSupabase(imageUrl, storagePath) {
  // 画像データをダウンロード
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`画像ダウンロード失敗: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, uint8, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) throw new Error(`Supabase Storage アップロード失敗: ${error.message}`);

  // 公開URLを取得
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

// ── Step 4: blocksのsrc空imageブロックにURLを埋める、なければ挿入 ──────────
function insertImagesIntoBlocks(blocks, imageUrls) {
  if (!blocks || !imageUrls.length) return blocks;
  const result = [...blocks.map(b => ({ ...b }))];

  // src が空の image ブロックを探す
  const emptyImgIndices = [];
  result.forEach((b, i) => { if (b.type === 'image' && !b.src) emptyImgIndices.push(i); });

  // 空imageブロックにURLを順番に埋める
  imageUrls.forEach((url, i) => {
    if (i < emptyImgIndices.length) {
      result[emptyImgIndices[i]].src = url;
    } else {
      // 空ブロックが足りない場合はh2の直後に新規挿入
      const h2Indices = result.map((b, idx) => b.type === 'h2' ? idx : -1).filter(idx => idx !== -1);
      const insertAfter = h2Indices[Math.floor(h2Indices.length / 2)] ?? result.length - 2;
      result.splice(insertAfter + 1 + (i - emptyImgIndices.length), 0, {
        type: 'image',
        src: url,
        alt: `記事内画像${i + 1}`,
        caption: '',
      });
    }
  });

  return result;
}

// ── Step 5: DBを更新 ──────────────────────────────────────────────────────
async function updateArticle(id, thumbnail, bodyImages, currentBody, currentBlocks) {
  const updates = { thumbnail, body_images: bodyImages };

  // blocksがある場合はblocks内の画像を更新
  if (currentBlocks && bodyImages.length > 0) {
    updates.blocks = insertImagesIntoBlocks(currentBlocks, bodyImages);
  } else if (currentBody && bodyImages.length > 0) {
    // HTMLボディの場合はimg タグを挿入
    const imgTags = bodyImages.map((url, i) =>
      `<img src="${url}" alt="記事内画像${i+1}" style="width:100%;border-radius:12px;display:block;margin:32px auto;" loading="lazy" />`
    ).join('');
    const midPoint = currentBody.indexOf('</p>', Math.floor(currentBody.length / 2));
    updates.body = midPoint !== -1
      ? currentBody.slice(0, midPoint + 4) + imgTags + currentBody.slice(midPoint + 4)
      : currentBody + imgTags;
  }

  const { error } = await supabase
    .from('features')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`DB更新失敗: ${error.message}`);

}

// ── メイン処理 ────────────────────────────────────────────────────────────
async function main() {
  log('🚀 記事画像自動生成スクリプト 開始');
  if (DRY_RUN) log('⚠️  DRY RUN モード（DBは更新しません）');

  // 対象記事を取得
  let query = supabase
    .from('features')
    .select('id, slug, title, description, summary, category, thumbnail, body_images, body, blocks');

  if (SLUG) {
    query = query.eq('slug', SLUG);
  } else {
    // thumbnailが空の記事のみ
    query = query.or('thumbnail.is.null,thumbnail.eq.""');
  }

  query = query.order('published_at', { ascending: false });
  if (LIMIT) query = query.limit(LIMIT);

  const { data: articles, error } = await query;
  if (error) { log(`❌ 記事取得失敗: ${error.message}`); process.exit(1); }
  if (!articles?.length) { log('✅ 処理対象の記事がありません（全記事に画像設定済み）'); return; }

  log(`📋 処理対象: ${articles.length}件`);
  log('');

  let success = 0, failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    log(`[${i + 1}/${articles.length}] 「${article.title}」(${article.slug})`);

    try {
      // Step 1: プロンプト生成
      log('  📝 Claude でプロンプト生成中...');
      const prompts = await generateImagePrompts(article);
      log(`  ✅ プロンプト生成完了 (${prompts.length}枚分)`);

      if (DRY_RUN) {
        log(`  [DRY RUN] サムネプロンプト: ${prompts[0]?.slice(0, 80)}...`);
        log('');
        continue;
      }

      // Step 2 & 3: 各画像を生成してアップロード
      const slug = article.slug;
      let thumbnailUrl = '';
      const bodyImages = [];

      for (let j = 0; j < prompts.length; j++) {
        const isThumb = j === 0;
        const label = isThumb ? 'サムネ' : `本文${j}`;
        log(`  🎨 ${label} 生成中... (${j + 1}/${prompts.length})`);

        const imageUrl = await generateImageWithReplicate(prompts[j]);
        const storagePath = isThumb
          ? `${slug}/thumbnail.webp`
          : `${slug}/body-${j}.webp`;

        const publicUrl = await uploadToSupabase(imageUrl, storagePath);

        if (isThumb) {
          thumbnailUrl = publicUrl;
        } else {
          bodyImages.push(publicUrl);
        }
        log(`  ✅ ${label} 完了: ${publicUrl}`);

        // API間隔
        if (j < prompts.length - 1) await sleep(REQUEST_INTERVAL);
      }

      // Step 4: DB更新（blocks/body への画像挿入含む）
      await updateArticle(article.id, thumbnailUrl, bodyImages, article.body, article.blocks);
      log(`  💾 DB更新完了`);

      // Step 5: Vercel ISRキャッシュをパージ
      try {
        const rv = await fetch(`${APP_URL}/api/admin/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
          body: JSON.stringify({ slug: article.slug }),
        });
        if (rv.ok) log(`  🔄 キャッシュパージ完了`);
      } catch { log(`  ⚠️  キャッシュパージ失敗（手動リロードが必要）`); }
      success++;

    } catch (err) {
      log(`  ❌ エラー: ${err.message}`);
      failed++;
    }

    log('');
    // 記事間のインターバル
    if (i < articles.length - 1) await sleep(REQUEST_INTERVAL);
  }

  log('─'.repeat(50));
  log(`✅ 完了: 成功 ${success}件 / 失敗 ${failed}件 / 合計 ${articles.length}件`);
  if (failed > 0) log('失敗した記事は再実行すると続きから処理されます');
}

main().catch(err => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
