// STEP2 納得診断：5問・1問1画面・4択・即遷移・進捗表示
// STEP2結果の保存に使うキー（STEP1と同じキーに追記）
const DIAG_STORAGE_KEY = 'fineme:diagnosis:latest';

// 5問：動機（深さ）/ 不安（サポート）/ 変化強度 / 主導権 / 価値観
const QUESTIONS = [
  {
    id:'q1',
    title:'見た目を変えたいと思った一番の理由はどれに近いですか？',
    choices:[
      { id:'q1a', text:'周りの目が気になる', axes:{ motivation: 1 } },
      { id:'q1b', text:'特定の目的（恋愛・仕事など）', axes:{ motivation: 2 } },
      { id:'q1c', text:'自信を持ちたい', axes:{ motivation: 3 } },
      { id:'q1d', text:'人生の区切りを作りたい', axes:{ motivation: 4 } }
    ]
  },
  {
    id:'q2',
    title:'正直に言うと、外見を変えることにどんな不安がありますか？',
    choices:[
      { id:'q2a', text:'勧められるままになりそう', axes:{ support: 4 } },
      { id:'q2b', text:'何が正解かわからない', axes:{ support: 3 } },
      { id:'q2c', text:'失敗したくない', axes:{ support: 2 } },
      { id:'q2d', text:'特に不安はない', axes:{ support: 1 } }
    ]
  },
  {
    id:'q3',
    title:'今回の変化はどれくらいを求めていますか？',
    choices:[
      { id:'q3a', text:'少し整えたい', axes:{ change: 1 } },
      { id:'q3b', text:'印象が変わるくらい', axes:{ change: 2 } },
      { id:'q3c', text:'周りに気づかれるレベル', axes:{ change: 3 } },
      { id:'q3d', text:'別人と言われたい', axes:{ change: 4 } }
    ]
  },
  {
    id:'q4',
    title:'サービスを受けるなら、どれが一番近いですか？',
    choices:[
      { id:'q4a', text:'提案してほしい', axes:{ control: 1 } },
      { id:'q4b', text:'一緒に決めたい', axes:{ control: 2 } },
      { id:'q4c', text:'自分で決めたい', axes:{ control: 3 } }
    ]
  },
  {
    id:'q5',
    title:'直感で選んでください（今の自分に近いのは？）',
    choices:[
      { id:'q5a', text:'安心感', axes:{ value: '安心感' } },
      { id:'q5b', text:'理論・根拠', axes:{ value: '理論・根拠' } },
      { id:'q5c', text:'センス', axes:{ value: 'センス' } },
      { id:'q5d', text:'実績', axes:{ value: '実績' } }
    ]
  }
];

const state = {
  idx: -1,
  answers: {},
  scores: { axes:{} }
};

// STEP1の結果がある場合は「動機（WHY）」を引継ぎ、STEP2ではQ1をスキップ
const DIAG_STEP1 = (()=>{ try{ const raw=localStorage.getItem(DIAG_STORAGE_KEY); return raw? JSON.parse(raw): null; }catch{ return null; } })();
function mapReasonToMotivation(reasonId){
  // STEP1 Q1 の選択肢ID（index.html の Q1 定義）を、動機の深さ 1..4 に対応付け
  // r02:周りの見られ方(外圧)→1 / r03,r04:軽〜中程度→2 / r01:自信→3 / r05:節目・特別→4
  const map = { r02:1, r03:2, r04:2, r01:3, r05:4 };
  return map[String(reasonId)||''] || 2;
}
const SKIP_Q1 = !!(DIAG_STEP1 && DIAG_STEP1.why && DIAG_STEP1.why.reason_id);
const QUESTIONS_USED = SKIP_Q1 ? QUESTIONS.slice(1) : QUESTIONS;
if(SKIP_Q1){ state.scores.axes.motivation = mapReasonToMotivation(DIAG_STEP1.why.reason_id); }

const bar = document.getElementById('bar');
const label = document.getElementById('label');
const count = document.getElementById('count');
const qEl = document.getElementById('q');
const host = document.getElementById('controls');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

function setProgress(){
  const total = QUESTIONS_USED.length;
  const current = Math.max(0, state.idx+1);
  const pct = Math.round((current / total) * 100);
  bar.style.width = pct + '%';
  count.textContent = `${current} / ${total}`;
}

function renderIntro(){
  label.textContent = '準備';
  qEl.textContent = 'ここからは、外見磨きで「つまずきやすいポイント」を一緒に見つけるための質問です。終わりが見えるので、安心して進んでください。';
  host.innerHTML = '';
  const tip = document.createElement('p'); tip.className='muted'; tip.textContent = 'このまま進むと、避けるべきポイントや、合う人の傾向が分かります。'; host.appendChild(tip);
  if(prev instanceof HTMLButtonElement){ prev.disabled = true; }
  next.textContent = '精度を上げる（約60秒）';
  setProgress();
}

function renderQuestion(){
  const q = QUESTIONS_USED[state.idx];
  label.textContent = `Q${state.idx+1}`;
  qEl.textContent = q.title;
  host.innerHTML = '';
  const vlist = document.createElement('div'); vlist.className='vlist';
  q.choices.forEach(ch => {
    const card = document.createElement('button'); card.type='button'; card.className='option-card'; card.setAttribute('aria-checked', state.answers[q.id]===ch.id?'true':'false');
    card.innerHTML = `<div style="font-weight:700">${ch.text}</div>`;
    card.addEventListener('click', ()=>{
      state.answers[q.id] = ch.id;
      // axes
      if(ch.axes){ Object.entries(ch.axes).forEach(([k,v])=>{ state.scores.axes[k] = (state.scores.axes[k]||0) + v; }); }
      // UI: select and proceed
  Array.from(vlist.children).forEach(c=> c.setAttribute('aria-checked','false'));
      card.setAttribute('aria-checked','true');
      setTimeout(()=>{ next.click(); }, 140);
    });
    vlist.appendChild(card);
  });
  host.appendChild(vlist);
  if(prev instanceof HTMLButtonElement){ prev.disabled = (state.idx<=0); }
  next.textContent = (state.idx >= QUESTIONS_USED.length-1) ? '結果へ' : '次へ';
  setProgress();
}

function complete(){
  // merge into latest diagnosis storage (append step2 scores)
  try{
  const raw = localStorage.getItem(DIAG_STORAGE_KEY);
    const obj = raw? JSON.parse(raw): null;
    if(obj){
      const cls = classify(state.scores.axes);
      obj.step2 = {
        answers: state.answers,
        scores: state.scores,
        classification: cls
      };
  localStorage.setItem(DIAG_STORAGE_KEY, JSON.stringify(obj));
    }
  }catch{}
  // go to result
  location.href = '/diagnosis/result.html';
}

prev.addEventListener('click', ()=>{ if(state.idx>0){ state.idx--; renderQuestion(); } else { state.idx=-1; renderIntro(); } });
next.addEventListener('click', ()=>{ if(state.idx < 0){ state.idx = 0; renderQuestion(); } else if(state.idx < QUESTIONS_USED.length-1){ state.idx++; renderQuestion(); } else { complete(); } });

// init
renderIntro();

// ---- タイプ判定（6タイプ）：距離 + 価値観補正 ----
function classify(axes){
  const A = Number(axes.motivation||0); // 1..4
  const B = Number(axes.support||0);    // 1..4（高い=サポート必要）
  const C = Number(axes.change||0);     // 1..4
  const D = Number(axes.control||0);    // 1..3（低=任せたい）
  const E = String(axes.value||'');     // 価値観（補正）
  const ideal = {
    t01:{ name:'慎重・納得重視タイプ', vec:{A:3,B:3,C:2,D:2}, bonus:['理論・根拠'] },
    t02:{ name:'安心・寄り添い重視タイプ', vec:{A:2,B:4,C:1,D:1}, bonus:['安心感'] },
    t03:{ name:'効率・最短重視タイプ', vec:{A:2,B:1,C:3,D:3}, bonus:['実績'] },
    t04:{ name:'変化・アップデート重視タイプ', vec:{A:4,B:1,C:4,D:2}, bonus:['センス'] },
    t05:{ name:'直感・フィーリング重視タイプ', vec:{A:2,B:2,C:2,D:2}, bonus:['センス'] },
    t06:{ name:'伴走・共同決定重視タイプ', vec:{A:3,B:2,C:2,D:2}, bonus:['安心感','理論・根拠'] }
  };
  const entries = Object.entries(ideal).map(([id,meta])=>{
    const v = meta.vec;
    let dist = Math.abs(A - v.A) + Math.abs(B - v.B) + Math.abs(C - v.C) + Math.abs(D - v.D);
    if(meta.bonus.includes(E)) dist -= 0.8; // 価値観一致でボーナス
    return { id, name: meta.name, dist };
  });
  entries.sort((a,b)=> a.dist - b.dist);
  const pick = entries[0] || { id:'t01', name:'慎重・納得重視タイプ', dist:0 };
  return { type_id: pick.id, type_name: pick.name, dist: pick.dist, axes:{ A,B,B_support:B, C, D, E_value:E } };
}
