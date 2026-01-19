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

// 動的キュー（ベース質問 + 追質問）
state.queue = QUESTIONS_USED.slice();

const bar = document.getElementById('bar');
const label = document.getElementById('label');
const count = document.getElementById('count');
const qEl = document.getElementById('q');
const host = document.getElementById('controls');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

// Boost mode: follow-ups only (triggered from result page when confidence is low)
const BOOST_MODE = (()=>{ try{ const u=new URL(location.href); return u.searchParams.get('boost')==='1'; }catch{ return false; } })();
// If BOOST_MODE, preload existing axes and build follow-up-only queue
if(BOOST_MODE){
  try{
    const raw = localStorage.getItem(DIAG_STORAGE_KEY);
    const obj = raw? JSON.parse(raw): null;
    const axes = obj?.step2?.scores?.axes || null;
    if(axes && typeof axes==='object'){
      state.scores.axes = { ...state.scores.axes, ...axes };
      // compute followups (boost) as binary micro-adjustments (±1) on ambiguous axes
      const followups = (function(){
        try{
          const A = Number(state.scores.axes.motivation||0);
          const B = Number(state.scores.axes.support||0);
          const C = Number(state.scores.axes.change||0);
          const D = Number(state.scores.axes.control||0);
          const E = String(state.scores.axes.value||'');
          const ideal = {
            t01:{ vec:{A:3,B:3,C:2,D:2}, bonus:['理論・根拠'] },
            t02:{ vec:{A:2,B:4,C:1,D:1}, bonus:['安心感'] },
            t03:{ vec:{A:2,B:1,C:3,D:3}, bonus:['実績'] },
            t04:{ vec:{A:4,B:1,C:4,D:2}, bonus:['センス'] },
            t05:{ vec:{A:2,B:2,C:2,D:2}, bonus:['センス'] },
            t06:{ vec:{A:3,B:2,C:2,D:2}, bonus:['安心感','理論・根拠'] }
          };
          const entries = Object.entries(ideal).map(([id,meta])=>{
            const v = meta.vec;
            let dist = Math.abs(A - v.A) + Math.abs(B - v.B) + Math.abs(C - v.C) + Math.abs(D - v.D);
            if(meta.bonus.includes(E)) dist -= 0.8;
            return { id, dist, vec: v };
          }).sort((a,b)=> a.dist - b.dist);
          const best = entries[0]; const second = entries[1] || entries[0];
          const diffs = [
            { k:'motivation', d: Math.abs((best.vec?.A||0) - (second.vec?.A||0)) },
            { k:'support',    d: Math.abs((best.vec?.B||0) - (second.vec?.B||0)) },
            { k:'change',     d: Math.abs((best.vec?.C||0) - (second.vec?.C||0)) },
            { k:'control',    d: Math.abs((best.vec?.D||0) - (second.vec?.D||0)) }
          ].sort((a,b)=> b.d - a.d).filter(x=> x.d > 0).slice(0,2).map(x=> x.k);
          const BF = {
            motivation: { id:'bf_m', title:'より近いのはどちらですか？（動機）', choices:[
              { id:'bf_m_low',  text:'気分を軽く変えたい（控えめ）', axes:{ motivation: -1 } },
              { id:'bf_m_high', text:'自信をしっかり積み上げたい（強め）', axes:{ motivation: +1 } }
            ]},
            support: { id:'bf_s', title:'より近いのはどちらですか？（相談/伴走）', choices:[
              { id:'bf_s_low',  text:'ほぼ不要（自力で進めたい）', axes:{ support: -1 } },
              { id:'bf_s_high', text:'しっかり欲しい（相談しながら）', axes:{ support: +1 } }
            ]},
            change: { id:'bf_c', title:'より近いのはどちらですか？（変化の強さ）', choices:[
              { id:'bf_c_low',  text:'目立たない範囲で変えたい（控えめ）', axes:{ change: -1 } },
              { id:'bf_c_high', text:'周囲が気づくレベルでも良い（強め）', axes:{ change: +1 } }
            ]},
            control: { id:'bf_d', title:'より近いのはどちらですか？（主導権）', choices:[
              { id:'bf_d_low',  text:'提案に乗って進めたい（任せたい）', axes:{ control: -1 } },
              { id:'bf_d_high', text:'一緒に/自分で決めたい（主体的）', axes:{ control: +1 } }
            ]}
          };
          return diffs.map(k=> BF[k]).filter(Boolean);
        }catch{ return []; }
      })();
      if(followups && followups.length){
        state.queue = followups.slice();
      } else {
        try{ location.href = './result.html'; }catch{}
      }
    }
  }catch{}
}

function setProgress(){
  const total = state.queue.length;
  const current = Math.max(0, state.idx+1);
  const pct = Math.round((current / total) * 100);
  bar.style.width = pct + '%';
  count.textContent = `${current} / ${total}`;
}

function renderIntro(){
  label.textContent = '準備';
  host.innerHTML = '';
  if(BOOST_MODE){
    qEl.textContent = '追加の確認質問に答えると、見立ての確度が上がります。1〜2問のみです。';
    const tip = document.createElement('p'); tip.className='muted'; tip.textContent = '今の回答に基づいて、曖昧な軸をピンポイントで確認します。'; host.appendChild(tip);
    next.textContent = 'はじめる（約30秒）';
  } else {
    qEl.textContent = 'ここからは、外見磨きで「つまずきやすいポイント」を一緒に見つけるための質問です。終わりが見えるので、安心して進んでください。';
    const tip = document.createElement('p'); tip.className='muted'; tip.textContent = 'このまま進むと、避けるべきポイントや、合う人の傾向が分かります。'; host.appendChild(tip);
    next.textContent = '精度を上げる（約60秒）';
  }
  if(prev instanceof HTMLButtonElement){ prev.disabled = true; }
  setProgress();
}

function renderQuestion(){
  const q = state.queue[state.idx];
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
      if(ch.axes){
        Object.entries(ch.axes).forEach(([k,v])=>{
          const cur = Number(state.scores.axes[k]||0) || 0;
          const next = cur + Number(v||0);
          // clamp ranges
          if(k==='control'){
            state.scores.axes[k] = Math.max(1, Math.min(3, next));
          } else if(k==='motivation' || k==='support' || k==='change'){
            state.scores.axes[k] = Math.max(1, Math.min(4, next));
          } else {
            state.scores.axes[k] = next;
          }
        });
      }
      // UI: select and proceed
  Array.from(vlist.children).forEach(c=> c.setAttribute('aria-checked','false'));
      card.setAttribute('aria-checked','true');
      setTimeout(()=>{ next.click(); }, 140);
    });
    vlist.appendChild(card);
  });
  host.appendChild(vlist);
  if(prev instanceof HTMLButtonElement){ prev.disabled = (state.idx<=0); }
  next.textContent = (state.idx >= state.queue.length-1) ? '結果へ' : '次へ';
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
  // go to result (relative to diagnosis folder for GH Pages)
  location.href = './result.html';
}

prev.addEventListener('click', ()=>{ if(state.idx>0){ state.idx--; renderQuestion(); } else { state.idx=-1; renderIntro(); } });
next.addEventListener('click', ()=>{
  if(state.idx < 0){ state.idx = 0; renderQuestion(); }
  else if(state.idx < state.queue.length-1){ state.idx++; renderQuestion(); }
  else {
    // ベース質問終了時、必要に応じて追質問を挿入
    if(BOOST_MODE){
      complete();
    } else {
      if(maybeEnqueueFollowUps()){
        state.idx++; renderQuestion();
      } else {
        complete();
      }
    }
  }
});

// init
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

// ---- 追質問ロジック ----
function maybeEnqueueFollowUps(){
  try{
    // 既に追質問が挿入済みならスキップ
    if(state.queue.length > QUESTIONS_USED.length) return false;
    // 現在の軸で候補タイプ距離を計算
    const A = Number(state.scores.axes.motivation||0);
    const B = Number(state.scores.axes.support||0);
    const C = Number(state.scores.axes.change||0);
    const D = Number(state.scores.axes.control||0);
    const E = String(state.scores.axes.value||'');
    const ideal = {
      t01:{ vec:{A:3,B:3,C:2,D:2}, bonus:['理論・根拠'] },
      t02:{ vec:{A:2,B:4,C:1,D:1}, bonus:['安心感'] },
      t03:{ vec:{A:2,B:1,C:3,D:3}, bonus:['実績'] },
      t04:{ vec:{A:4,B:1,C:4,D:2}, bonus:['センス'] },
      t05:{ vec:{A:2,B:2,C:2,D:2}, bonus:['センス'] },
      t06:{ vec:{A:3,B:2,C:2,D:2}, bonus:['安心感','理論・根拠'] }
    };
    const entries = Object.entries(ideal).map(([id,meta])=>{
      const v = meta.vec;
      let dist = Math.abs(A - v.A) + Math.abs(B - v.B) + Math.abs(C - v.C) + Math.abs(D - v.D);
      if(meta.bonus.includes(E)) dist -= 0.8;
      return { id, dist, vec: v };
    }).sort((a,b)=> a.dist - b.dist);
    const best = entries[0]; const second = entries[1] || entries[0];
    const lowConfidence = (best?.dist || 0) >= 4 || Math.abs((best?.dist||0) - (second?.dist||0)) <= 1;
    if(!lowConfidence) return false;
    // 軸の差が大きいものから最大2件選んで追質問を用意
    const diffs = [
      { k:'motivation', d: Math.abs((best.vec?.A||0) - (second.vec?.A||0)) },
      { k:'support',    d: Math.abs((best.vec?.B||0) - (second.vec?.B||0)) },
      { k:'change',     d: Math.abs((best.vec?.C||0) - (second.vec?.C||0)) },
      { k:'control',    d: Math.abs((best.vec?.D||0) - (second.vec?.D||0)) }
    ].sort((a,b)=> b.d - a.d).filter(x=> x.d > 0).slice(0,2).map(x=> x.k);
    const FU = {
      motivation: { id:'fq_m', title:'今回の動機の強さ（近いもの）', choices:[
        { id:'fq_m1', text:'軽く気分を変えたい', axes:{ motivation: 1 } },
        { id:'fq_m2', text:'悩み/外圧を減らしたい', axes:{ motivation: 2 } },
        { id:'fq_m3', text:'自信を積み上げたい', axes:{ motivation: 3 } },
        { id:'fq_m4', text:'節目に合わせて変えたい', axes:{ motivation: 4 } }
      ]},
      support: { id:'fq_s', title:'伴走や相談の必要度（近いもの）', choices:[
        { id:'fq_s1', text:'ほぼ不要', axes:{ support: 1 } },
        { id:'fq_s2', text:'あった方が良い', axes:{ support: 2 } },
        { id:'fq_s3', text:'しっかり欲しい', axes:{ support: 3 } },
        { id:'fq_s4', text:'とても必要', axes:{ support: 4 } }
      ]},
      change: { id:'fq_c', title:'今回の変化の強さ（近いもの）', choices:[
        { id:'fq_c1', text:'少し整える', axes:{ change: 1 } },
        { id:'fq_c2', text:'印象を変える', axes:{ change: 2 } },
        { id:'fq_c3', text:'気づかれるレベル', axes:{ change: 3 } },
        { id:'fq_c4', text:'別人級に変える', axes:{ change: 4 } }
      ]},
      control: { id:'fq_d', title:'主導権の持ち方（近いもの）', choices:[
        { id:'fq_d1', text:'提案してほしい', axes:{ control: 1 } },
        { id:'fq_d2', text:'一緒に決めたい', axes:{ control: 2 } },
        { id:'fq_d3', text:'自分で決めたい', axes:{ control: 3 } }
      ]}
    };
    const followups = diffs.map(k=> FU[k]).filter(Boolean);
    if(!followups.length) return false;
    state.queue = state.queue.concat(followups);
    // 進捗更新用に総数を増やす
    setProgress();
    return true;
  }catch{ return false; }
}
