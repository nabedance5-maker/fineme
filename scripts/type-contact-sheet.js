// scripts/type-contact-sheet.js
// 生成済みのタイプカードをコンタクトシート（格子状の一覧画像）にまとめる。
// 実行: node scripts/type-contact-sheet.js <fineme|belle> [1ページの枚数]
// 出力: tmp/contact/<track>-NN.webp
//
// 用途：画像内に文字が混入していないかを全数チェックする。
// 1枚ずつ開くと272回になるので、格子にして数十枚まとめて見る。
// 下端の題字帯を見落とさないよう、カード全体を切らずに収める（contain）。

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { allTypes } = require('./type-art-prompts');

const ROOT = path.join(__dirname, '..');
const track = process.argv[2] || 'fineme';
const perSheet = parseInt(process.argv[3]) || 20;

const dir = track === 'belle' ? 'public/images/types/belle' : 'public/images/types';
const outDir = path.join(ROOT, 'tmp/contact');
fs.mkdirSync(outDir, { recursive: true });

const done = allTypes(track)
  .map(t => ({ ...t, file: path.join(ROOT, dir, `TYPE-${t.code}.webp`) }))
  .filter(t => fs.existsSync(t.file));

const COLS = 5;
const CELL = 300;

(async () => {
  for (let s = 0; s * perSheet < done.length; s++) {
    const batch = done.slice(s * perSheet, (s + 1) * perSheet);
    const rows = Math.ceil(batch.length / COLS);
    // fit: 'contain' で全体を入れる。題字帯は下端に出るので切ってはいけない
    const tiles = await Promise.all(batch.map(t =>
      sharp(t.file).resize(CELL, CELL, { fit: 'contain', background: '#000' }).toBuffer()
    ));
    const out = path.join(outDir, `${track}-${String(s + 1).padStart(2, '0')}.webp`);
    await sharp({ create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#000' } })
      .composite(tiles.map((input, i) => ({ input, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL })))
      .webp({ quality: 90 })
      .toFile(out);
    console.log(`${path.relative(ROOT, out)}  ${batch.map(t => t.code).join(' ')}`);
  }
  console.log(`\n計 ${done.length}枚 / ${allTypes(track).length}枚`);
})();
