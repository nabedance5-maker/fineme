// @ts-nocheck
// Enhance "選び方の軸" section: highlight user's top axes and reorder cards
function $(s, root=document){ return root.querySelector(s); }
function loadDiagnosis(){
  try{
    const raw=localStorage.getItem('fineme:diagnosis:latest');
    return raw? JSON.parse(raw): null;
  }catch{
    return null;
  }
}
function isLoggedIn(){
  try{
    if(typeof window.getUserSession === 'function'){
      const s = window.getUserSession();
      return !!(s && (s.id || s.userId || s.email));
    }
    const raw = sessionStorage.getItem('glowup:userSession');
    if(!raw) return false;
    const s = JSON.parse(raw);
    return !!(s && (s.id || s.userId || s.email));
  }catch{ return false; }
}
function hasAxes(diag){
  try{
    return !!(diag && diag.step2 && diag.step2.scores && diag.step2.scores.axes);
  }catch{ return false; }
}
function emptyScores(){ return { A:0, B:0, C:0, D:0, V:'' }; }
// 支持するキーの両対応: {A,B,C,D} or {motivation,support,change,control,value}
function getAxesScores(diag){
  const ax = (diag?.step2?.scores?.axes)||{};
  const hasLetters = ['A','B','C','D'].some(k=> ax[k]!==undefined);
  const mapNum = (v)=> {
    const n = Number(v);
    return isFinite(n)? n: 0;
  };
  return hasLetters ? {
    A: mapNum(ax.A),
    B: mapNum(ax.B),
    C: mapNum(ax.C),
    D: mapNum(ax.D),
    V: String(ax.V||ax.value||'')
  } : {
    A: mapNum(ax.motivation), // 納得
    B: mapNum(ax.support),    // 寄り添い
    C: mapNum(ax.change),     // 最短
    D: mapNum(ax.control),    // 進め方
    V: String(ax.value||'')   // 世界観（文字）
  };
}
function sortByScores(cards, scores){ const order = ['A','B','C','D']; return cards.sort((ca, cb)=> (scores[cb.dataset.axis]||0) - (scores[ca.dataset.axis]||0)); }
function initChips(scores, enable){ const chips = Array.from(document.querySelectorAll('.axes-chip')); chips.forEach(ch=>{ const key = ch.dataset.axis; const v = key==='V'? (scores.V? 1:0) : Number(scores[key]||0); ch.setAttribute('aria-pressed', (enable && v>0)? 'true':'false'); }); }
function reorderGrid(scores, enable){ const grid = $('#axes-grid'); if(!grid || !enable) return; const cards = Array.from(grid.querySelectorAll('.axes-card')); const ordered = sortByScores(cards, scores); const frag = document.createDocumentFragment(); ordered.forEach(c=> frag.appendChild(c)); grid.textContent=''; grid.appendChild(frag); }
function wireInfo(){ document.querySelectorAll('.axes-card .btn-info').forEach(btn=>{ btn.addEventListener('click', ()=>{ try{ const card = btn.closest('.axes-card'); const axis = card?.dataset?.axis || ''; const detail = {
  A: '「納得」は、理由の理解を重視。説明→提案→確認を反復し、分かった上で進めます。',
  B: '「寄り添い」は、不安のヒアリングと合意形成。押し売りせず、安心感を重視します。',
  C: '「最短」は、ゴール設計と無理の回避。段階的に成果へ近づきます。',
  D: '「進め方」は、段取りの見える化。見通しと調整の余地を確保します。',
  V: '「世界観」は価値観の合致。安心/理論/センス/実績など相性を重視します。'
}[axis] || '外見磨きの進め方を支える考え方です。';
  alert(detail);
} catch{} }); }); }
function updateLabels(personalize){
  const p = document.querySelector('.axes-personal-label');
  const n = document.querySelector('.axes-neutral-label');
  if(p) p.style.display = personalize? '' : 'none';
  if(n) n.style.display = personalize? 'none' : '';
}
function updateChipsVisibility(personalize){
  const chips = document.getElementById('axes-chips');
  if(chips){ chips.style.display = personalize? '' : 'none'; }
}
function updateGridVisibility(personalize){
  const grid = document.getElementById('axes-grid');
  if(grid){ grid.style.display = personalize? '' : 'none'; }
}
function updateNeutralInfoVisibility(personalize){
  const neutral = document.getElementById('axes-neutral-info');
  if(neutral){ neutral.style.display = personalize? 'none' : ''; }
}
function updateMiniPreviewVisibility(personalize){
  const preview = document.getElementById('axes-mini-preview');
  if(preview){ preview.style.display = personalize? 'none' : ''; }
}
function init(){
  const loggedIn = isLoggedIn();
  const diag = loggedIn ? loadDiagnosis() : null;
  const personalize = loggedIn && hasAxes(diag);
  const scores = personalize ? getAxesScores(diag) : emptyScores();
  initChips(scores, personalize);
  reorderGrid(scores, personalize);
  updateLabels(personalize);
  updateChipsVisibility(personalize);
  updateGridVisibility(personalize);
  updateNeutralInfoVisibility(personalize);
  updateMiniPreviewVisibility(personalize);
  wireInfo();
}
function wireMiniPreview(){
  const root = document.getElementById('axes-mini-preview');
  if(!root) return;
  const cta = document.getElementById('axes-mini-cta');
  const status = document.getElementById('axes-mini-status');
  const dot1 = document.getElementById('axes-dot-1');
  const dot2 = document.getElementById('axes-dot-2');
  const dot3 = document.getElementById('axes-dot-3');
  const state = { q1: null, q2: null };
  const AX_LABEL = { A:'納得', B:'寄り添い', C:'最短', D:'進め方' };
  const setChipVisual = (btn, on)=>{
    try{
      btn.setAttribute('aria-pressed', on? 'true':'false');
      btn.style.background = on? '#eef2ff' : '';
      btn.style.border = on? '1px solid #a5b4fc' : '';
      btn.style.boxShadow = on? '0 0 0 2px rgba(165,180,252,0.4)' : '';
    }catch{}
  };
  const render = ()=>{
    // update status text
    try{
      if(status){
        if(state.q1 && state.q2){ status.textContent = `選択済み: ${AX_LABEL[state.q1]||state.q1} + ${AX_LABEL[state.q2]||state.q2}`; }
        else if(state.q1 || state.q2){ status.textContent = `選択中: ${(AX_LABEL[state.q1]||state.q1||AX_LABEL[state.q2]||state.q2)||''}`; }
        else { status.textContent = '2つ選ぶと診断にヒントを渡します'; }
      }
    }catch{}
    // progress dots
    try{
      const on = '#2563eb', off = '#cbd5e1';
      if(dot1) dot1.style.background = state.q1? on : off;
      if(dot2) dot2.style.background = state.q2? on : off;
      if(dot3) dot3.style.background = (state.q1 && state.q2)? on : off;
    }catch{}
    // CTA label
    try{
      if(cta){ cta.textContent = (state.q1 && state.q2) ? 'この選択で診断する' : '無料で診断する（3分）'; }
    }catch{}
  };
  const setSel = (q, axis) => {
    const btns = root.querySelectorAll(`button.axes-chip[data-q='${q}']`);
    btns.forEach(b=>{ const on = (b.dataset.axis===axis); setChipVisual(b, on); });
    state[q===1||q==='1'? 'q1':'q2'] = axis;
    try{
      const hint = [state.q1, state.q2].filter(Boolean).join(',');
      if(cta){ const base = '/diagnosis/index.html?from=axes'; cta.href = hint? `${base}&hint=${encodeURIComponent(hint)}` : base; }
    }catch{}
    render();
  };
  root.querySelectorAll('button.axes-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const q = btn.dataset.q; const axis = btn.dataset.axis; setSel(q, axis);
    });
  });
  if(cta){
    cta.addEventListener('click', ()=>{
      try{ const key='fineme:analytics'; const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; arr.push({ type:'cta_axes_diagnosis_click', ts:new Date().toISOString(), hint: [state.q1, state.q2].filter(Boolean).join(','), origin:'axes' }); localStorage.setItem(key, JSON.stringify(arr)); }catch{}
    });
  }
  render();
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}
// wire mini preview after DOM ready
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', wireMiniPreview);
}else{
  wireMiniPreview();
}
