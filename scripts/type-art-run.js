// scripts/type-art-run.js
// タイプカード画像の生成ランナー（男性 / Belle 共通）。
// プロンプトは type-art-prompts.js、実行の入口は gen-type-images*.js。
//
// 流れ: Replicate(FLUX 1.1 Pro) → PNG を tmp/type-images-raw/ に保存 → sharp で WebP に変換して配置
//
// PNG を捨てずに残すのは、WebP の画質を後から調整し直したくなったときに
// 1枚あたり数円かけて生成し直さずに済ませるため。tmp/ は .gitignore 済み。

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

const { TRACKS, buildPrompt, allTypes } = require('./type-art-prompts');

const ROOT = path.join(__dirname, '..');
const WEBP_QUALITY = 82;
const RATE_LIMIT_MS = 12000; // Replicate の 429 回避

// ── Replicate ────────────────────────────────────────────────────────

async function generateImage(prompt, apiToken) {
  const res = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        input: { prompt, width: 768, height: 1024, output_format: 'png', output_quality: 95 },
      }),
    }
  );
  const data = await res.json();
  if (data.status === 'starting' || data.status === 'processing') {
    return await pollPrediction(data.urls.get, apiToken);
  }
  if (data.status === 'succeeded') {
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    if (output) return output;
  }
  throw new Error(`生成失敗: ${JSON.stringify(data.error || data.status)}`);
}

async function pollPrediction(pollUrl, apiToken) {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(pollUrl, { headers: { 'Authorization': `Bearer ${apiToken}` } });
    const data = await res.json();
    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      if (output) return output;
    }
    if (data.status === 'failed') throw new Error(data.error || '生成失敗');
    process.stdout.write('.');
  }
  throw new Error('タイムアウト');
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, filepath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

// ── メイン ───────────────────────────────────────────────────────────

/**
 * @param {string} trackId          'fineme' | 'belle'
 * @param {object} [opts]
 * @param {string[]} [opts.only]    生成するタイプコードを絞る（テスト用）
 * @param {string} [opts.outDir]    出力先の上書き（ROOT からの相対）
 */
async function run(trackId, opts = {}) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    console.error('❌ REPLICATE_API_TOKEN が設定されていません。');
    console.error('   実行: node --env-file=.env.local scripts/gen-type-images.js');
    process.exit(1);
  }

  const track = TRACKS[trackId];
  const outDir = path.join(ROOT, opts.outDir || track.outDir);
  const rawDir = path.join(ROOT, 'tmp/type-images-raw', trackId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });

  let types = allTypes(trackId);
  if (opts.only) {
    const want = new Set(opts.only);
    types = types.filter(t => want.has(t.code));
  }

  const total = types.length;
  let done = 0, skipped = 0, failed = 0;

  console.log(`🎨 ${track.label}トラック タイプカード生成（${total}枚・FLUX 1.1 Pro）`);
  console.log(`   出力: ${path.relative(ROOT, outDir)}/`);
  console.log(`   推定コスト: $${(total * 0.04).toFixed(2)}〜$${(total * 0.08).toFixed(2)}`);
  console.log(`   推定時間: 約${Math.round(total * 20 / 60)}分`);
  console.log('   既存ファイルはスキップします。途中で止まっても再開できます。\n');

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const webpPath = path.join(outDir, `TYPE-${t.code}.webp`);
    const pngPath = path.join(rawDir, `TYPE-${t.code}.png`);

    if (fs.existsSync(webpPath)) {
      skipped++;
      process.stdout.write('⏭ ');
      continue;
    }

    process.stdout.write(`[${i + 1}/${total}] TYPE-${t.code}（${t.subject}） ... `);
    try {
      // PNG が残っていれば生成をやり直さず、変換だけする（再開・画質調整用）
      if (!fs.existsSync(pngPath)) {
        if (done > 0) await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        const url = await generateImage(buildPrompt(trackId, t.axis, t.care, t.path), apiToken);
        await downloadFile(url, pngPath);
      }
      await sharp(pngPath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      const kb = Math.round(fs.statSync(webpPath).size / 1024);
      console.log(`✅ ${kb}KB`);
      done++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
      if (String(e.message).includes('429')) await new Promise(r => setTimeout(r, 30000));
    }

    if ((i + 1) % 10 === 0) {
      const remaining = total - i - 1;
      console.log(`\n  📊 ${done}✅ ${skipped}⏭ ${failed}❌ / 残り${remaining}枚（約${Math.round(remaining * 20 / 60)}分）\n`);
    }
  }

  console.log(`\n完了：✅${done} ⏭${skipped} ❌${failed}`);
  if (failed > 0) console.log('失敗分は再実行すると自動でリトライされます。');
  return { done, skipped, failed };
}

module.exports = { run };
