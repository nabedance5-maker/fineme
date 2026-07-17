// scripts/gen-type-images-belle.js
// 実行: node --env-file=.env.local scripts/gen-type-images-belle.js
// Belle版 136枚のタイプイラストを生成する（8軸 × 17花タイプ）

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN が設定されていません。');
  process.exit(1);
}

// ── スタイル固定（全136枚共通） ───────────────────────────────────────
const STYLE =
  'collectible card illustration on deep midnight navy background, ' +
  'vertical tarot card format with ornate delicate silver decorative border frame, ' +
  'beautiful detailed Japanese botanical flower art, painterly watercolor ink wash style, ' +
  'single luminous flower bloom centered within card frame, ' +
  'soft ethereal feminine aesthetic, no text no letters no words, ' +
  'dark luxury collectible card art with glowing soft ambient light, ' +
  'silver ornate detailed border with floral motifs, ' +
  'deep jewel tone background with accent color radiance';

// ── 軸ごとのアクセントカラー ──────────────────────────────────────────
const AXIS_COLOR = {
  B: 'vivid crimson rose accent glow',
  E: 'rich violet purple accent glow',
  F: 'emerald green accent glow',
  H: 'deep cobalt blue accent glow',
  S: 'warm amber golden accent glow',
  R: 'bright cyan aqua accent glow',
  T: 'bright golden yellow accent glow',
  W: 'jade teal accent glow',
};

// ── 軸ごとのモチーフ（花が軸のテーマを体現する） ──────────────────────
const AXIS_MOTIF = {
  B: 'the flower conveys graceful feminine body silhouette and posture, elegant curves and organic flowing form are the visual centerpiece, the bloom suggests beautiful bodily proportion and strength',
  E: 'prominently arched petal curves echo perfectly shaped feminine eyebrows, the flower form suggests beautifully groomed expressive brows framing an invisible face above',
  F: 'the flower is elegantly draped and entwined with flowing silk fabric and textile ribbons, fashion fabric and clothing drape are the dominant complementary visual element',
  H: 'cascading silky hair-like tendrils and strands flow through and around the flower, luminous hair-textured filaments are the defining surrounding visual feature',
  S: 'the petals have translucent luminous glowing skin-like porcelain texture, soft radiant warm light permeates every petal surface, luminous complexion quality defines the bloom',
  R: 'every petal and surface is impossibly smooth, silky bare hairless porcelain smoothness, surfaces catch cyan light like a mirror, pure silk-smooth flawless texture defines the visual',
  T: 'the open flower petals form a gentle radiant smile shape, the bloom suggests a beautiful joyful laughing expression, open luminous white petals evoke gleaming happy teeth',
  W: 'delicate elegant hands with perfectly manicured long nails are woven gently into the flower composition, refined fingertips and beautiful nail art are the complementary focal point',
};

// ── 花の描写（17タイプ） ──────────────────────────────────────────────
const FLOWER_DESC = {
  '薔薇':   'a single deep crimson rose in deep slumber, velvety petals tightly spiraled and still sealed, guarded by gleaming thorns, hidden inner beauty glowing softly, dew drops on the furled petals, latent perfection awaiting its moment',
  '芙蓉':   'a pale blush hibiscus bloom gazing away from its own dark mirror reflection, soft unfocused beauty unaware of its own extraordinary grace, gentle petals facing the wrong direction, beauty blind to itself',
  '野菫':   'tiny delicate wild violet growing undisturbed and persistent between dark mossy stones, small purple petals in quiet continuous bloom, understated enduring natural elegance requiring no audience',
  '蕾':     'a slender flower bud encased in crystalline frost and ice, vivid pink-green petals sealed completely shut by frozen crystal, intense contained beauty in perfect suspended anticipation, a frozen moment of becoming',
  '紫陽花': 'hydrangea blooms at the peak of scattering, blue-violet individual petals falling like soft slow rain, bittersweet scattered beauty frozen in the poignant moment of impermanence and loss',
  '夾竹桃': 'oleander flowers, rose-pink blossoms with deep glossy dark leaves, alluring dual nature of exquisite beauty and hidden depth, both luminous and mysterious in a single breath',
  '牡丹':   'a grand peony sealed in the deep sleep of winter, massive layered bud wrapped in dried outer petals, magnificent queenly potential in profound dormancy, a sleeping empress of flowers waiting for spring',
  '椿':     'a perfect camellia in full confident scarlet bloom, pristine symmetric petals opened fully and completely, bold unwavering beauty at absolute peak expression, not a single petal fallen',
  '新芽':   'tender fresh green spring shoots just emerging from dark rich soil, pale new growth trembling as it reaches toward unseen light, vulnerable brave first emergence, quivering with nascent possibility',
  '勿忘草': 'tiny forget-me-not flowers in softly fading blue, delicate scattered blooms drifting on dark still water, forgotten beauty searching the surface for a place to belong',
  '月見草': 'evening primrose blooming alone in silver moonlight, self-opening luminous pale yellow petals in serene solitude, independent luminous beauty that waits for no one and needs no witness',
  '山茶花': 'sasanqua camellia in a quiet pause between seasons, petals resting in gentle stillness, soft pink blooms in a contemplative interlude, still and serenely beautiful in its moment of rest',
  '白梅':   'white plum blossoms at full peak on dark ink-wash wet branch, brilliantly pure white flowers radiating soft light against deep darkness, refined luminous mature beauty in its finest hour',
  '落梅':   'scattered fallen plum petals arranged on wet dark stone in an interrupted moment, expert scattered grace still forming a beautiful unintended pattern mid-fall, beauty caught between action and rest',
  '百合':   'pristine white lily fully open, golden stamens surrendered to pollen and trusting the air completely, pure serene bloom in perfect open trust, graceful beauty fully given over to its supporting world',
  '蓮':     'a perfect lotus bud sealed and resting on glassy dark still water, ancient layered green bud containing infinite sacred potential in silence, profound dormant knowing that needs no display',
  '桜':     'cherry blossom at absolute peak in first rose dawn light, soft pink petals glowing in the very moment of perfect fullness, sublime fleeting masterpiece of awakened beauty at the apex of its brief glory',
};

// ── ケア×パス → 花 マッピング ──────────────────────────────────────
const CARE_PATH_FLOWER = {
  NV: '薔薇',
  NK: '芙蓉',
  ND: '野菫',
  CV: '蕾',
  CQ: '紫陽花',
  CK: '夾竹桃',
  CL: '牡丹',
  CD: '椿',
  AV: '新芽',
  AQ: '勿忘草',
  AK: '月見草',
  AL: '山茶花',
  AD: '白梅',
  PQ: '落梅',
  PK: '百合',
  PL: '蓮',
  PD: '桜',
};

const AXES  = ['B', 'E', 'F', 'H', 'S', 'R', 'T', 'W'];
const CARES = ['N', 'C', 'A', 'P'];
const PATHS = ['V', 'Q', 'K', 'L', 'D'];

// 全136エントリーを生成
const ALL_TYPES = [];
for (const axis of AXES) {
  for (const care of CARES) {
    for (const pathCode of PATHS) {
      const key = `${care}${pathCode}`;
      const flower = CARE_PATH_FLOWER[key];
      if (!flower) continue;
      ALL_TYPES.push({ code: `${axis}${care}${pathCode}`, axis, care, path: pathCode, flower });
    }
  }
}

function buildPrompt(axis, flower) {
  return `${STYLE}. ${AXIS_COLOR[axis]}. ${FLOWER_DESC[flower]}. ${AXIS_MOTIF[axis]}.`;
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
  for (let i = 0; i < 30; i++) {
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
  const outDir = path.join(__dirname, '../public/images/types/belle');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const total = ALL_TYPES.length;
  let done = 0, skipped = 0, failed = 0;

  console.log(`🌸 Belle タイプイラスト 全量生成（${total}枚・FLUX 1.1 Pro）`);
  console.log(`推定コスト: $${(total * 0.05).toFixed(2)}〜$${(total * 0.08).toFixed(2)}（約${Math.round(total * 0.065 * 155)}円）`);
  console.log(`推定時間: 約${Math.round(total * 32 / 60)}分`);
  console.log('既存ファイルはスキップします。途中再開もOK。\n');

  for (let i = 0; i < ALL_TYPES.length; i++) {
    const t = ALL_TYPES[i];
    const filepath = path.join(outDir, `TYPE-${t.code}.png`);

    if (fs.existsSync(filepath)) {
      skipped++;
      process.stdout.write(`⏭ `);
      continue;
    }

    if (i > 0 && !ALL_TYPES[i - 1] || !fs.existsSync(path.join(outDir, `TYPE-${ALL_TYPES[i - 1]?.code}.png`))) {
      // レートリミット回避（前の画像が生成済みの場合のみ待機）
    }
    if (done > 0) await new Promise(r => setTimeout(r, 12000));

    process.stdout.write(`[${i + 1}/${total}] TYPE-${t.code}（${t.flower}） ... `);
    try {
      const prompt = buildPrompt(t.axis, t.flower);
      const url = await generateImage(prompt);
      await downloadFile(url, filepath);
      console.log('✅');
      done++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
      if (String(e.message).includes('429')) await new Promise(r => setTimeout(r, 30000));
    }

    if ((i + 1) % 10 === 0) {
      const remaining = total - i - 1;
      const etaMin = Math.round(remaining * 32 / 60);
      console.log(`\n  📊 進捗: ${done}✅ ${skipped}⏭ ${failed}❌ / 残り${remaining}枚（約${etaMin}分）\n`);
    }
  }

  console.log(`\n🌸 完了！`);
  console.log(`  ✅ 生成: ${done}枚`);
  console.log(`  ⏭ スキップ: ${skipped}枚`);
  console.log(`  ❌ 失敗: ${failed}枚`);
  console.log(`\n保存先: public/images/types/belle/`);
  if (failed > 0) console.log('失敗したファイルは再実行すると自動でリトライされます。');
}

main();
