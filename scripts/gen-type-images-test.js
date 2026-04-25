// scripts/gen-type-images-test.js
// 実行: node --env-file=.env.local scripts/gen-type-images-test.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN が設定されていません。');
  process.exit(1);
}

// ── スタイル固定プレフィックス（全119枚共通） ──────────────────────────
const STYLE =
  'collectible card illustration on deep navy blue background, ' +
  'vertical tarot card format with ornate gold decorative border frame, ' +
  'super deformed chibi 1.5-head-body-ratio Japanese mythological creature, ' +
  'extremely large expressive sparkling eyes, maximum simplification, ' +
  'round puffy body, tiny stubby limbs, adorable exaggerated proportions, ' +
  'bold clean gold linework with vivid accent color highlights, ' +
  'no text no letters no words, ' +
  'single chibi creature centered within card frame, ' +
  'luxury dark collectible card art, kawaii RPG mascot style, ' +
  'highly detailed ornate gold border, glowing accent color aura';

// ── 軸ごとのアクセントカラー ──────────────────────────────────────────
const AXIS_COLOR = {
  B: 'vivid crimson red accent color',
  E: 'rich violet purple accent color',
  F: 'emerald green accent color',
  H: 'deep cobalt blue accent color',
  S: 'warm amber peach accent color',
  T: 'bright golden yellow accent color',
  W: 'jade teal accent color',
};

// ── 軸ごとのモチーフ ─────────────────────────────────────────────────
const AXIS_MOTIF = {
  B: 'the creature body IS composed of layered human muscle anatomy — scales are cross-sections of muscle fibers and tendons, anatomical muscular structure forms the entire creature, muscle is the dominant visual texture',
  E: 'the creature prominent horns curl into unmistakable perfect eyebrow arch shapes, dramatically sculpted brow ridges dominate its face, the eyebrow arch form is the visual centerpiece of the composition',
  F: 'the creature body is entirely draped in flowing kimono silk and woven brocade — fabric folds and textile patterns replace scales, elaborate layered Japanese garments wrap the creature, clothing IS its skin',
  H: 'the creature mane and tail ARE composed entirely of long cascading human black hair strands, flowing silk-like hair dominates the image, hair is unmistakably the creature defining body feature',
  S: 'the creature entire surface IS smooth luminous translucent human skin, glowing skin membrane envelops the body, the texture is unmistakably skin — not scales, not fur, skin with subtle light refraction',
  T: 'the creature face shows a prominent open radiant smile, beautiful gleaming white teeth fully visible, the joyful laughing expression dominates the face and is the unmistakable focal point',
  W: 'the creature claws transform into elegant slender human hands with long fingers, adorned with jade rings and delicate bracelets, the beautiful refined hands are the clear and dominant visual focal point',
};

const AXIS_LABEL = {
  B:'体', E:'眉', F:'服道', H:'髪', S:'肌', T:'笑顔', W:'手元',
};

// ── クリーチャー描写 ─────────────────────────────────────────────────
const CREATURE_DESC = {
  '伏竜': 'a great coiled dragon hidden in deep shadow, concealed brilliance emanating quietly, the hidden genius of three kingdoms legend, Zhuge Liang, latent power',
  '蟠龍': 'a powerful dragon tightly coiled and tensed, gathered energy ready to spring at any moment, immense potential about to release',
  '飛龍': 'a magnificent dragon in absolute mastery of full flight, soaring at the pinnacle, commanding the heavens with supreme power',
};

// ── テスト対象 ────────────────────────────────────────────────────────
const TEST_TYPES = [
  { code: 'HND', axis: 'H', creature: '伏竜' },
  { code: 'ECA', axis: 'E', creature: '蟠龍' },
  { code: 'FPK', axis: 'F', creature: '飛龍' },
];

function buildPrompt(axis, creature) {
  return `${STYLE}. ${AXIS_COLOR[axis]}. ${CREATURE_DESC[creature]}. ${AXIS_MOTIF[axis]}.`;
}

// ── Replicate FLUX 1.1 Pro で生成 ────────────────────────────────────
async function generateImage(prompt) {
  // Prefer: wait で同期的に完了を待つ（最大60秒）
  const res = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify({
        input: {
          prompt,
          width: 768,
          height: 1024,
          output_format: 'png',
          output_quality: 95,
        },
      }),
    }
  );

  const data = await res.json();

  // Prefer:wait で完了しなかった場合はポーリング
  if (data.status === 'starting' || data.status === 'processing') {
    return await pollPrediction(data.urls.get);
  }

  if (data.status === 'succeeded') {
    const output = Array.isArray(data.output) ? data.output[0] : data.output;
    if (output) return output;
  }

  throw new Error(`生成失敗: ${JSON.stringify(data.error || data.status)}`);
}

async function pollPrediction(pollUrl) {
  const MAX = 20;
  for (let i = 0; i < MAX; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` },
    });
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

// ── URL → ローカル保存 ────────────────────────────────────────────────
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
async function main() {
  const outDir = path.join(__dirname, '../tmp/type-images');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('🎨 タイプイラスト テスト生成（3枚・FLUX 1.1 Pro）');
  console.log('推定コスト: $0.12〜0.18 （約20円）\n');

  for (let i = 0; i < TEST_TYPES.length; i++) {
    const t = TEST_TYPES[i];
    // 既に生成済みならスキップ
    const filepath = path.join(outDir, `TYPE-${t.code}.png`);
    if (fs.existsSync(filepath)) {
      console.log(`⏭ TYPE-${t.code} はスキップ（既存ファイルあり）`);
      continue;
    }
    if (i > 0) {
      process.stdout.write('  (レートリミット回避のため10秒待機...)');
      await new Promise(r => setTimeout(r, 10000));
      process.stdout.write(' OK\n');
    }
    const label = `${AXIS_LABEL[t.axis]}の${t.creature}`;
    process.stdout.write(`▶ TYPE-${t.code}「${label}」 生成中...`);
    try {
      const prompt = buildPrompt(t.axis, t.creature);
      const url = await generateImage(prompt);
      await downloadFile(url, filepath);
      console.log(` ✅`);
      console.log(`  保存先: tmp/type-images/TYPE-${t.code}.png\n`);
    } catch (e) {
      console.log(` ❌`);
      console.error(`  エラー: ${e.message}\n`);
    }
  }

  console.log('完了。tmp\\type-images\\ フォルダを確認してください。');
}

main();
