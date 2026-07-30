// scripts/gen-type-images-belle.js
// Belle トラックのタイプカード 136枚を生成する（8軸 × 17タイプ）。
// 実行: node --env-file=.env.local scripts/gen-type-images-belle.js
//
// プロンプト: scripts/type-art-prompts.js
// 生成処理:   scripts/type-art-run.js
// 出力:       public/images/types/belle/TYPE-XXX.webp

const { run } = require('./type-art-run');

run('belle');
