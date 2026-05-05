// scripts/gen-type-images.js
// 実行: node --env-file=.env.local scripts/gen-type-images.js
// 全119枚のタイプイラストを生成する（7軸 × 17クリーチャー）

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN が設定されていません。');
  process.exit(1);
}

// ── スタイル固定（全119枚共通） ───────────────────────────────────────
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
  R: 'bright cyan aqua accent color',
  T: 'bright golden yellow accent color',
  W: 'jade teal accent color',
};

// ── 軸ごとのモチーフ（生き物の体の一部が軸そのもの） ──────────────────
const AXIS_MOTIF = {
  B: 'the creature body IS composed of layered human muscle anatomy — scales are cross-sections of muscle fibers and tendons, anatomical muscular structure forms the entire creature, muscle is the dominant visual texture',
  E: 'the creature prominent horns curl into unmistakable perfect eyebrow arch shapes, dramatically sculpted brow ridges dominate its face, the eyebrow arch form is the visual centerpiece of the composition',
  F: 'the creature body is entirely draped in flowing kimono silk and woven brocade — fabric folds and textile patterns replace scales, elaborate layered Japanese garments wrap the creature, clothing IS its skin',
  H: 'the creature mane and tail ARE composed entirely of long cascading human black hair strands, flowing silk-like hair dominates the image, hair is unmistakably the creature defining body feature',
  S: 'the creature entire surface IS smooth luminous translucent human skin, glowing skin membrane envelops the body, the texture is unmistakably skin — not scales, not fur, skin with subtle light refraction',
  R: 'the creature body is covered in impossibly smooth hairless porcelain skin without a single follicle or hair strand, silky bare hide gleams like polished satin, perfectly clean smooth surface catches cyan light like a mirror, no fur no scales no hair — pure hairless smoothness is the defining visual texture',
  T: 'the creature face shows a prominent open radiant smile, beautiful gleaming white teeth fully visible, the joyful laughing expression dominates the face and is the unmistakable focal point',
  W: 'the creature claws transform into elegant slender human hands with long fingers, adorned with jade rings and delicate bracelets, the beautiful refined hands are the clear and dominant visual focal point',
};

// ── クリーチャー描写（17体） ──────────────────────────────────────────
const CREATURE_DESC = {
  'フェンリル':    'Fenrir the massive wolf god bound in magical chains, nordic mythological beast of world-ending power, enormous fanged wolf with restrained destructive force, latent apocalyptic energy',
  'レヴィアタン':  'Leviathan the ancient sea monster from the abyss, biblical primordial chaos serpent, enormous scaled creature churning the deep unconsciously, overwhelming size and power',
  '伏竜':          'a great coiled dragon hidden in deep shadow, concealed brilliance emanating quietly, the hidden genius of three kingdoms legend Zhuge Liang, latent power waiting to emerge',
  '蟠龍':          'a powerful dragon tightly coiled and tensed, gathered energy ready to spring at any moment, immense potential on the verge of release',
  '鵺':            'the Japanese chimera nue — monkey head, tanuki body, snake tail, tiger paws, a creature of eerie unsettling hybrid identity, mysterious dark aura',
  'マンティコア':  'the manticore — lion body, fearsome human face with rows of teeth, scorpion tail, rampaging with wild untamed ferocity, ancient Persian predator of chaotic power',
  'ヒュドラ':      'the Hydra multi-headed serpent beast, each severed head regrowing stronger, dormant in the swamp with vast coiled regenerative potential, ancient Greek monster',
  '鳳凰':          'the phoenix fenghuang divine bird of transformation and rebirth, rising in brilliant flame and glory, feathers ablaze with renewal energy, magnificent and unstoppable',
  'グリフィン':    'the griffin — proud eagle head and wings atop a powerful lion body, noble untested guardian of ancient treasure, regal bearing and fierce loyalty',
  '玄武':          'Genbu the black tortoise of the north, ancient cosmic guardian withdrawn into its massive shell, immovable and patient, deep wisdom in dignified retreat',
  'ガルーダ':      'Garuda the divine eagle king of Hindu mythology, magnificent wings stirring cosmic winds, sovereign of the sky moving on primal instinct and raw divine power',
  '天馬':          'the celestial divine horse Tianma, great wings folded in temporary rest, divine speed and boundless freedom momentarily grounded, awaiting the moment to soar',
  '朱雀':          'Suzaku the vermilion bird of the south, blazing in mastered crimson fire, soaring with perfect control and grace, the perfected guardian of flame and summer',
  '白虎':          'Byakko the white tiger of the west, fierce master guardian withdrawn from the hunt in dignified stillness, coiled power of a seasoned warrior temporarily at rest',
  '飛龍':          'a magnificent dragon in absolute mastery of full flight, soaring at the pinnacle of power, commanding the heavens with supreme authority and total freedom',
  'スフィンクス':  'the Sphinx ancient enigmatic guardian of desert secrets, crouching in monumental stillness, keeper of profound riddles, timeless wisdom and power temporarily dormant',
  '麒麟':          'the kirin qilin most sacred divine beast, appearing only to the virtuous ruler at the height of benevolent power, embodiment of perfect harmony between strength and grace',
};

// ── ケア×パス → クリーチャー マッピング ──────────────────────────────
// 無効: NQ, NL, PV
const CARE_PATH_CREATURE = {
  NV: 'フェンリル',
  NK: 'レヴィアタン',
  ND: '伏竜',
  CV: '蟠龍',
  CQ: '鵺',
  CK: 'マンティコア',
  CL: 'ヒュドラ',
  CD: '鳳凰',
  AV: 'グリフィン',
  AQ: '玄武',
  AK: 'ガルーダ',
  AL: '天馬',
  AD: '朱雀',
  PQ: '白虎',
  PK: '飛龍',
  PL: 'スフィンクス',
  PD: '麒麟',
};

const AXES  = ['B', 'E', 'F', 'H', 'S', 'R', 'T', 'W'];
const CARES = ['N', 'C', 'A', 'P'];
const PATHS = ['V', 'Q', 'K', 'L', 'D'];

// 全119エントリーを生成
const ALL_TYPES = [];
for (const axis of AXES) {
  for (const care of CARES) {
    for (const pathCode of PATHS) {
      const key = `${care}${pathCode}`;
      const creature = CARE_PATH_CREATURE[key];
      if (!creature) continue; // 無効コンボはスキップ
      ALL_TYPES.push({ code: `${axis}${care}${pathCode}`, axis, care, path: pathCode, creature });
    }
  }
}

function buildPrompt(axis, creature) {
  return `${STYLE}. ${AXIS_COLOR[axis]}. ${CREATURE_DESC[creature]}. ${AXIS_MOTIF[axis]}.`;
}

// ── Replicate FLUX 1.1 Pro ────────────────────────────────────────────
async function generateImage(prompt) {
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
        input: { prompt, width: 768, height: 1024, output_format: 'png', output_quality: 95 },
      }),
    }
  );
  const data = await res.json();
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
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(pollUrl, { headers: { 'Authorization': `Bearer ${API_TOKEN}` } });
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
async function main() {
  const outDir = path.join(__dirname, '../public/images/types');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const total = ALL_TYPES.length;
  let done = 0, skipped = 0, failed = 0;

  console.log(`🎨 タイプイラスト 全量生成（${total}枚・FLUX 1.1 Pro）`);
  console.log(`推定コスト: $${(total * 0.05).toFixed(2)}〜$${(total * 0.08).toFixed(2)}（約${Math.round(total * 0.065 * 150)}円）`);
  console.log(`推定時間: 約${Math.round(total * 20 / 60)}分\n`);
  console.log('既存ファイルはスキップします。途中再開もOK。\n');

  for (let i = 0; i < ALL_TYPES.length; i++) {
    const t = ALL_TYPES[i];
    const filepath = path.join(outDir, `TYPE-${t.code}.png`);

    if (fs.existsSync(filepath)) {
      skipped++;
      process.stdout.write(`⏭ `);
      continue;
    }

    // レートリミット回避
    if (i > 0) await new Promise(r => setTimeout(r, 12000));

    process.stdout.write(`[${i + 1}/${total}] TYPE-${t.code}（${t.creature}） ... `);
    try {
      const prompt = buildPrompt(t.axis, t.creature);
      const url = await generateImage(prompt);
      await downloadFile(url, filepath);
      console.log('✅');
      done++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
      // 429の場合は30秒待って次へ
      if (String(e.message).includes('429')) await new Promise(r => setTimeout(r, 30000));
    }

    // 10枚ごとに進捗サマリー
    if ((i + 1) % 10 === 0) {
      const remaining = total - i - 1;
      const etaMin = Math.round(remaining * 12 / 60);
      console.log(`\n  📊 進捗: ${done}✅ ${skipped}⏭ ${failed}❌ / 残り${remaining}枚（約${etaMin}分）\n`);
    }
  }

  console.log(`\n完了！`);
  console.log(`  ✅ 生成: ${done}枚`);
  console.log(`  ⏭ スキップ: ${skipped}枚`);
  console.log(`  ❌ 失敗: ${failed}枚`);
  console.log(`\n保存先: tmp/type-images/`);
  if (failed > 0) console.log('失敗したファイルは再実行すると自動でリトライされます。');
}

main();
