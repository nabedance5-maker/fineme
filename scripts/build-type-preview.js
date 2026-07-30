// scripts/build-type-preview.js
// 生成済みのタイプカードを一覧で見るための確認用ページを吐く（作業用・コミット対象外）。
// 実行: node scripts/build-type-preview.js
// 閲覧: npm run dev → http://localhost:3000/type-preview.html
//
// 生成の途中でも、その時点でできているぶんだけ並ぶ。ページは30秒ごとに自動更新する。

const fs = require('fs');
const path = require('path');
const { allTypes } = require('./type-art-prompts');

const ROOT = path.join(__dirname, '..');

// タイプ名の式は app/**/diagnosis/result/page.js と同じ（AXIS_WORD + MODIFIER + 生き物/花）
const NAMES = {
  fineme: {
    axis: { B:'鋼の', E:'眉弧の', F:'纏いの', H:'黒髪の', S:'光肌の', R:'素肌の', T:'白砂の', W:'翡翠の' },
    mod:  { NV:'眠れる', NK:'知らぬ', ND:'臥す', CV:'潜む', CQ:'折れた', CK:'暴れる', CL:'眠れる', CD:'蘇る',
            AV:'構えの', AQ:'迷い', AK:'本能の', AL:'羽休めの', AD:'燃える', PQ:'引きの', PK:'無自覚の', PL:'休みの', PD:'聖なる' },
    dir: 'public/images/types', url: '/images/types', label: '男性（Fineme）',
  },
  belle: {
    axis: { B:'しなやかな', E:'眉の', F:'纏いの', H:'光髪の', S:'麗肌の', R:'素肌の', T:'白磁の', W:'花爪の' },
    mod:  { NV:'眠れる', NK:'鏡なき', ND:'咲き続ける', CV:'凍れる', CQ:'散り際の', CK:'迷える', CL:'眠れる', CD:'紅の',
            AV:'揺れる', AQ:'忘れゆく', AK:'独り咲く', AL:'休める', AD:'白き', PQ:'散りかけの', PK:'委ねた', PL:'封じた', PD:'黎明の' },
    dir: 'public/images/types/belle', url: '/images/types/belle', label: 'Belle（女性）',
  },
};

const AXIS_LABEL = { B:'体型', E:'眉', F:'服', H:'髪', S:'肌', R:'脱毛', T:'歯', W:'手・爪' };

function section(trackId) {
  const cfg = NAMES[trackId];
  const types = allTypes(trackId);
  const done = types.filter(t => fs.existsSync(path.join(ROOT, cfg.dir, `TYPE-${t.code}.webp`)));

  // 軸ごとにまとめる。同じ軸が揃って同じ部位を主役にできているかを見るため。
  const byAxis = {};
  for (const t of done) (byAxis[t.axis] ||= []).push(t);

  const blocks = Object.keys(AXIS_LABEL).filter(a => byAxis[a]).map(a => {
    const cards = byAxis[a].map(t => {
      const name = `${cfg.axis[t.axis]}${cfg.mod[t.care + t.path]}${t.subject}`;
      return `<figure><img loading="lazy" src="${cfg.url}/TYPE-${t.code}.webp" alt="${name}">
        <figcaption><b>${name}</b><span>TYPE-${t.code}</span></figcaption></figure>`;
    }).join('');
    return `<h3>${a}軸：${AXIS_LABEL[a]}<em>${byAxis[a].length}枚</em></h3><div class="grid">${cards}</div>`;
  }).join('');

  return `<section><h2>${cfg.label}<em>${done.length} / ${types.length}</em></h2>${blocks || '<p class="empty">まだ生成されていません</p>'}</section>`;
}

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>タイプカード確認</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d1017;color:#e8e4dc;font-family:'Noto Sans JP',-apple-system,'Hiragino Sans',sans-serif;padding:28px 20px 80px}
h1{font-size:17px;margin-bottom:6px}
.note{font-size:12px;color:#8a857c;margin-bottom:28px;line-height:1.8}
section{margin-bottom:44px}
h2{font-size:15px;border-bottom:1px solid rgba(201,168,76,.3);padding-bottom:8px;margin-bottom:20px;color:#c9a84c}
h3{font-size:12.5px;color:#8a857c;margin:24px 0 10px;font-weight:700}
h2 em,h3 em{font-style:normal;font-size:11px;color:#8a857c;margin-left:10px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
figure{background:#151a24;border-radius:10px;overflow:hidden}
img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}
figcaption{padding:8px 10px;font-size:11px;line-height:1.5}
figcaption b{display:block;color:#e8e4dc;font-weight:600}
figcaption span{color:#6f6a62;font-size:9.5px;letter-spacing:.06em}
.empty{font-size:12px;color:#6f6a62}
</style></head><body>
<h1>Me Scan タイプカード（擬人化版）確認用</h1>
<p class="note">30秒ごとに自動更新します。生成が進むと枚数が増えます。<br>
軸ごとに並べているので、同じ軸のカードが揃って同じ部位（髪・眉・肌…）を主役にできているか見てください。</p>
${section('fineme')}
${section('belle')}
</body></html>`;

fs.writeFileSync(path.join(ROOT, 'public/type-preview.html'), html);
const n = (t) => allTypes(t).filter(x => fs.existsSync(path.join(ROOT, NAMES[t].dir, `TYPE-${x.code}.webp`))).length;
console.log(`public/type-preview.html を更新（男性 ${n('fineme')}枚 / Belle ${n('belle')}枚）`);
