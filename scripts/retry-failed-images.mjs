/**
 * retry-failed-images.mjs
 * NSFWフィルターに引っかかった記事の画像を安全なプロンプトで再生成
 * Usage: node scripts/retry-failed-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    try {
      const content = readFileSync(resolve(rootDir, f), 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
}
loadEnv();

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const ADMIN_API_KEY   = process.env.ADMIN_API_KEY;
const APP_URL         = 'https://fineme.me';
const STORAGE_BUCKET  = 'articles';
const INTERVAL        = 12000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function log(msg) { console.log(`[${new Date().toLocaleTimeString('ja-JP')}] ${msg}`); }

// 安全な手動プロンプト（NSFW回避）
const SAFE_PROMPTS = {
  'strength-training-cleanliness-effect': [
    'A well-dressed Japanese man in casual dark navy outfit standing confidently on a clean modern city street, cinematic lighting, deep blue atmosphere, no faces visible, silhouette style',
    'Neatly organized gym equipment — matte black dumbbells, clean white towel, glass water bottle — arranged on dark textured floor, no people, product photography style, deep blue moody lighting',
    'Clean minimalist Japanese apartment wardrobe with neatly folded dark clothes and white shirts, organized shelves, warm accent light, no people, interior photography',
  ],
  'mens-diet-appearance-correct-approach': [
    'Healthy Japanese meal beautifully arranged on dark wooden table — grilled fish, fresh vegetables, miso soup, rice — overhead food photography, cinematic dark blue tones, no text',
    'Fresh organic vegetables and lean proteins arranged on dark slate surface, overhead view, minimalist food styling, artistic composition, no people, deep blue ambient lighting',
    'Male silhouette in sportswear doing a lunge pose indoors, backlit by soft window light, dark moody background, abstract figure with no face visible, atmospheric cinematic style',
  ],
};

async function generateImageWithReplicate(prompt) {
  const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: { prompt, num_outputs: 1, aspect_ratio: '16:9', output_format: 'webp', output_quality: 80, go_fast: true }
    })
  });

  if (!createRes.ok) throw new Error(`Replicate API エラー: ${createRes.status} ${await createRes.text()}`);
  const prediction = await createRes.json();
  if (prediction.status === 'succeeded') return prediction.output[0];

  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const poll = await (await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })).json();
    if (poll.status === 'succeeded') return poll.output[0];
    if (poll.status === 'failed') throw new Error(`Replicate 生成失敗: ${poll.error}`);
  }
  throw new Error('Replicate タイムアウト');
}

async function uploadToSupabase(imageUrl, storagePath) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`画像ダウンロード失敗: ${res.status}`);
  const uint8 = new Uint8Array(await res.arrayBuffer());

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, uint8, {
    contentType: 'image/webp', upsert: true,
  });
  if (error) throw new Error(`Supabase Storage アップロード失敗: ${error.message}`);

  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function processArticle(slug) {
  const prompts = SAFE_PROMPTS[slug];
  if (!prompts) { log(`❌ プロンプト未定義: ${slug}`); return; }

  const { data: article, error } = await supabase
    .from('features')
    .select('id, slug, title, thumbnail, body_images, body, blocks')
    .eq('slug', slug)
    .single();

  if (error || !article) { log(`❌ 記事取得失敗: ${slug}`); return; }

  log(`📄 「${article.title}」(${slug})`);

  let thumbnailUrl = article.thumbnail || '';
  const bodyImages = [];

  for (let j = 0; j < prompts.length; j++) {
    const isThumb = j === 0;
    const label = isThumb ? 'サムネ' : `本文${j}`;
    log(`  🎨 ${label} 生成中... (${j + 1}/${prompts.length})`);

    const imageUrl = await generateImageWithReplicate(prompts[j]);
    const storagePath = isThumb ? `${slug}/thumbnail.webp` : `${slug}/body-${j}.webp`;
    const publicUrl = await uploadToSupabase(imageUrl, storagePath);

    if (isThumb) {
      thumbnailUrl = publicUrl;
    } else {
      bodyImages.push(publicUrl);
    }
    log(`  ✅ ${label} 完了: ${publicUrl}`);
    if (j < prompts.length - 1) await sleep(INTERVAL);
  }

  // DB更新
  const updates = { thumbnail: thumbnailUrl, body_images: bodyImages };

  if (article.blocks && bodyImages.length > 0) {
    const blocks = [...article.blocks.map(b => ({ ...b }))];
    const imgIndices = blocks.map((b, i) => b.type === 'image' ? i : -1).filter(i => i !== -1);
    bodyImages.forEach((url, i) => {
      if (i < imgIndices.length) blocks[imgIndices[i]].src = url;
    });
    updates.blocks = blocks;
  }

  const { error: updateErr } = await supabase.from('features').update(updates).eq('id', article.id);
  if (updateErr) throw new Error(`DB更新失敗: ${updateErr.message}`);
  log(`  💾 DB更新完了`);

  try {
    const rv = await fetch(`${APP_URL}/api/admin/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_API_KEY },
      body: JSON.stringify({ slug }),
    });
    if (rv.ok) log(`  🔄 キャッシュパージ完了`);
  } catch { log(`  ⚠️  キャッシュパージ失敗`); }
}

async function main() {
  log('🔄 失敗記事 画像再生成スクリプト');
  const slugs = Object.keys(SAFE_PROMPTS);
  log(`📋 対象: ${slugs.length}件`);
  log('');

  let success = 0;
  for (let i = 0; i < slugs.length; i++) {
    try {
      await processArticle(slugs[i]);
      success++;
    } catch (err) {
      log(`  ❌ エラー: ${err.message}`);
    }
    log('');
    if (i < slugs.length - 1) await sleep(INTERVAL);
  }

  log(`✅ 完了: ${success}/${slugs.length}件成功`);
}

main().catch(err => { console.error('予期しないエラー:', err); process.exit(1); });
