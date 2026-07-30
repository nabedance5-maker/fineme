// scripts/gen-type-images-test.js
// 全量（272枚）を回す前に、両トラック6枚ずつだけ生成して絵柄を確認する。
// 実行: node --env-file=.env.local scripts/gen-type-images-test.js
//
// 出力: tmp/type-images/fineme/ と tmp/type-images/belle/（public/ には触れない）
//
// 軸と状態が散るようにコードを選んでいる。同じ6コードを両トラックで使うので、
// 男女の描き分けが効いているかも同時に見える。
//   HND 髪軸・臥す      ECQ 眉軸・折れた（品位が保てているか）
//   WPD 手爪軸・聖なる   BNV 体型軸・眠れる
//   SAD 肌軸・燃える     TCK 歯軸・暴れる（笑顔が solemn を上書きできるか）

const { run } = require('./type-art-run');

const TEST_CODES = ['HND', 'ECQ', 'WPD', 'BNV', 'SAD', 'TCK'];

(async () => {
  for (const trackId of ['fineme', 'belle']) {
    await run(trackId, { only: TEST_CODES, outDir: `tmp/type-images/${trackId}` });
  }
  console.log('\n👀 tmp/type-images/ を目視確認してから全量生成へ進むこと。');
})();
