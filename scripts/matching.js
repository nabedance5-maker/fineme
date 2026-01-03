// Matching engine using WHY/HOW and WHAT intent
export async function computeMatchForProvider(providerId){
  const diag = loadDiagnosis();
  if(!diag || !providerId) return null;
  const { templates } = await loadTemplates();
  const provider = loadProviderById(providerId);
  if(!provider) return null;
  // Build dynamic provider model from onboarding profile/diag; fallback to static JSONs if missing
  const dyn = buildDynamicModel(provider);
  let t = dyn.types; let s = dyn.styles;
  if(!(t && s)){
    const [{types}, {styles}] = await Promise.all([loadProviderTypes(), loadProviderStyles()]);
    t = types.find(x=> x.providerId===providerId) || { what: {} };
    s = styles.find(x=> x.providerId===providerId) || { how:{}, why:{} };
  }
  const whatTop = (diag.intent && Array.isArray(diag.intent.scores)) ? (diag.intent.scores.slice().sort((a,b)=> b.score-a.score)[0]||null) : null;
  const whatTopId = diag.intent?.type_id || whatTop?.id || null;
  const whatTopName = diag.intent?.type_name || (whatTop?.name || '');
  const whatTopScore01 = whatTop ? (Number(whatTop.score||0)-1)/4 : 0; // 0..1
  const whatWeight = (whatTopId && t.what[whatTopId]!=null) ? Number(t.what[whatTopId]) : 0;
  const whatAlign = clamp01(whatWeight) * clamp01(whatTopScore01);
  // WHY alignment
  const whyUser = normalizeLikertArray(diag.why?.scores||[], 5);
  const whyProv = [ s.why?.focus_issue||0, s.why?.express_issue||0, s.why?.miss_chance||0, s.why?.want_change||0, s.why?.believe_change||0 ];
  const whyAlign = dot(whyUser, whyProv);
  // HOW alignment
  const howUser = normalizeLikertArray(diag.how?.scores||[], 4);
  const howProv = [ s.how?.need_reason||0, s.how?.prefer_consult||0, s.how?.try_first||0, s.how?.need_companion||0 ];
  const howAlign = dot(howUser, howProv);
  const score = Math.round(clamp01(whatAlign)*50 + clamp01(whyAlign)*25 + clamp01(howAlign)*25);
  const reasons = [];
  if(whatTopId && clamp01(whatWeight) >= 0.7){
    const tpl = templates.what?.template || "この店舗は『{typeName}』に強みがあります。";
    reasons.push(tpl.replace('{typeName}', String(whatTopName||'')));
  }
  try{
    const WHY_TEXTS = [
      '人前に出るとき、外見が気になって集中できないことがある',
      '自分の魅力をうまく伝えられていないと感じる',
      '外見のせいでチャンスを逃している気がする',
      '今の自分から一歩変わりたいと思っている',
      '外見が変われば、行動や人生も変わると思う'
    ];
    const whyKeys = ['focus_issue','express_issue','miss_chance','want_change','believe_change'];
    const pairs = whyUser.map((u,i)=> ({ idx:i, user:u, prov: clamp01(whyProv[i]||0) }));
    pairs.sort((a,b)=> (b.user*b.prov) - (a.user*a.prov));
    for(const p of pairs.slice(0,2)){
      if(p.user>=0.75 && p.prov>=0.6){
        const key = whyKeys[p.idx];
        const phrase = templates.why?.[key];
        reasons.push(phrase || `『${WHY_TEXTS[p.idx]}』の課題に沿った提案が得意です。`);
      }
    }
  }catch{}
  try{
    const HOW_TEXTS = [ '理由が分からないと納得できない','一人で決めるより相談したい','まずやってみたいタイプだ','伴走してくれる人がいると安心する' ];
    const howKeys = ['need_reason','prefer_consult','try_first','need_companion'];
    const pairs = howUser.map((u,i)=> ({ idx:i, user:u, prov: clamp01(howProv[i]||0) }));
    pairs.sort((a,b)=> (b.user*b.prov) - (a.user*a.prov));
    const top = pairs[0];
    if(top && top.user>=0.75 && top.prov>=0.6){
      const key = howKeys[top.idx];
      const phrase = templates.how?.[key];
      reasons.push(phrase || `あなたの進め方『${HOW_TEXTS[top.idx]}』に合わせた支援が可能です。`);
    }
  }catch{}
  return { providerId, score, reasons, breakdown: { what: Math.round(clamp01(whatAlign)*50), why: Math.round(clamp01(whyAlign)*25), how: Math.round(clamp01(howAlign)*25) } };
}

function clamp01(n){ n = Number(n)||0; if(n<0) return 0; if(n>1) return 1; return n; }
function normalizeLikertArray(arr, expected){
  const a = Array.isArray(arr)? arr.slice(0, expected): [];
  const out = [];
  for(let i=0;i<expected;i++){
    const v = Number(a[i]||0);
    out.push(clamp01((v-1)/4));
  }
  return out;
}
function dot(a,b){ const len = Math.min(a.length, b.length); let s=0; for(let i=0;i<len;i++){ s += (Number(a[i])||0) * (Number(b[i])||0); } return s; }

function loadDiagnosis(){
  try{ const raw = localStorage.getItem('fineme:diagnosis:latest'); return raw? JSON.parse(raw): null; }catch{ return null; }
}

async function loadProviderTypes(){
  const rel = `${resolvePrefix()}/scripts/data/provider_types.json`;
  const data = await fetchJsonWithFallback(rel, '/scripts/data/provider_types.json');
  return { types: Array.isArray(data)? data: [] };
}
async function loadProviderStyles(){
  const rel = `${resolvePrefix()}/scripts/data/provider_styles.json`;
  const data = await fetchJsonWithFallback(rel, '/scripts/data/provider_styles.json');
  return { styles: Array.isArray(data)? data: [] };
}
async function loadTemplates(){
  const rel = `${resolvePrefix()}/scripts/data/matches.json`;
  const data = await fetchJsonWithFallback(rel, '/scripts/data/matches.json');
  return { templates: (data||{}) };
}

function resolvePrefix(){ try{ return location.pathname.includes('/pages/') ? '..' : '.'; }catch{ return '.'; } }
async function fetchJsonWithFallback(rel, abs){
  try{ const r = await fetch(rel, { cache:'no-store' }); if(!r.ok) throw new Error(String(r.status)); return await r.json(); }catch(e){ try{ const r2 = await fetch(abs, { cache:'no-store' }); if(!r2.ok) throw new Error(String(r2.status)); return await r2.json(); }catch(e2){ return null; } }
}

// --- Dynamic provider model builders ---
function loadProviderById(id){
  try{ const raw = localStorage.getItem('glowup:providers'); const arr = raw? JSON.parse(raw):[]; if(Array.isArray(arr)) return arr.find(p=> p.id===id) || null; }catch{} return null;
}
function buildDynamicModel(provider){
  if(!provider || !provider.onboarding) return { types:null, styles:null };
  const prof = provider.onboarding.profile || {};
  const diag = provider.onboarding.diag || {};
  // WHAT weights from selected whatTypes
  const whatIds = ['w01','w02','w03','w04','w05','w06','w07','w08'];
  const selected = new Set(Array.isArray(prof.whatTypes)? prof.whatTypes: []);
  const what = {}; for(const id of whatIds){ what[id] = selected.has(id) ? 0.9 : 0.5; }
  // HOW from provider's own HOW scores if present
  const howScores = Array.isArray(diag.how_scores) ? diag.how_scores : [];
  const how = {
    need_reason: clamp01((Number(howScores[0]||0)-1)/4),
    prefer_consult: clamp01((Number(howScores[1]||0)-1)/4),
    try_first: clamp01((Number(howScores[2]||0)-1)/4),
    need_companion: clamp01((Number(howScores[3]||0)-1)/4)
  };
  // WHY inferred from problems text keywords
  const txt = ((prof.problems||'') + ' ' + (prof.values||'') + ' ' + (prof.first||'')).toLowerCase();
  const why = inferWhyFromText(txt);
  return { types: { providerId: provider.id, what }, styles: { providerId: provider.id, how, why } };
}
function inferWhyFromText(text){
  const has = (ws)=> ws.some(w=> text.includes(w));
  const score = (ok)=> ok? 0.8: 0.5;
  return {
    focus_issue: score(has(['人前','緊張','集中','視線','気になる'])),
    express_issue: score(has(['魅力','伝え','表現','伝達','プレゼン'])),
    miss_chance: score(has(['機会','チャンス','第一印象','損失','逃す'])),
    want_change: score(has(['一歩','変わり','挑戦','アップデート','垢抜け'])),
    believe_change: score(has(['人生','行動','変化','自信','成長']))
  };
}

// ---- New: A-D + E axes compatibility (user ↔ provider) ----
// Extract user axes from diagnosis object (STEP2)
export function getUserAxesFromDiagnosis(diag){
  try{
    const ax = (diag && diag.step2 && diag.step2.scores && diag.step2.scores.axes) ? diag.step2.scores.axes : {};
    return {
      A: Number(ax.motivation||0),
      B: Number(ax.support||0),
      C: Number(ax.change||0),
      D: Number(ax.control||0),
      E: String(ax.value||'')
    };
  }catch{ return { A:0, B:0, C:0, D:0, E:'' }; }
}

// Extract provider scores from provider object or infer neutral defaults
export function getShopScoresFromProvider(provider){
  try{
    const sc = provider && provider.onboarding && provider.onboarding.scores ? provider.onboarding.scores : null;
    if(sc){
      const E_tags = Array.isArray(sc.E_tags) ? sc.E_tags : (Array.isArray(sc.E) ? sc.E : []);
      return {
        A: clampLikert(sc.A, 1, 4, 2),
        B: clampLikert(sc.B, 1, 4, 2),
        C: clampLikert(sc.C, 1, 4, 2),
        D: clampLikert(sc.D, 1, 3, 2),
        E_tags
      };
    }
    // Fallback: infer neutral values; optionally nudge from dynamic model
    const dyn = buildDynamicModel(provider);
    let A=2, B=2, C=2, D=2; const E_tags=[];
    try{
      // If provider selected strong change types (e.g., w07), nudge C up
      const sel = provider && provider.onboarding && provider.onboarding.profile && Array.isArray(provider.onboarding.profile.whatTypes) ? provider.onboarding.profile.whatTypes : [];
      if(sel.includes('w07')) C = 3; if(sel.includes('w01')) B = 3; if(sel.includes('w05')) A = 3;
    }catch{}
    return { A, B, C, D, E_tags };
  }catch{ return { A:2, B:2, C:2, D:2, E_tags:[] }; }
}

function clampLikert(v, min, max, def){ v = Number(v); if(Number.isFinite(v)){ if(v<min) return min; if(v>max) return max; return v; } return def; }

// Compute L1 distance with value bonus (lower adjusted is better)
export function computeCompatibilityAxes(user, shop, valueBonus=0.8){
  const du = (n)=> Number(n)||0; const ds = (n)=> Number(n)||0;
  const dA = Math.abs(du(user.A) - ds(shop.A));
  const dB = Math.abs(du(user.B) - ds(shop.B));
  const dC = Math.abs(du(user.C) - ds(shop.C));
  const dD = Math.abs(du(user.D) - ds(shop.D));
  const base = dA + dB + dC + dD;
  const match = (typeof user.E === 'string' && Array.isArray(shop.E_tags)) ? shop.E_tags.includes(user.E) : false;
  const adjusted = base - (match ? valueBonus : 0);
  return { base, adjusted, valueMatch: !!match, diffs: { dA, dB, dC, dD } };
}

// Assign zones by percentage: 10% -> A, next 20% -> B, next 30% -> C, rest -> D
export function assignZonesByPercent(sorted){
  const n = Array.isArray(sorted) ? sorted.length : 0; if(n<=0) return [];
  const cutA = Math.ceil(n * 0.10);
  const cutB = cutA + Math.ceil(n * 0.20);
  const cutC = cutB + Math.ceil(n * 0.30);
  return sorted.map((_, idx) => idx < cutA ? 'A' : (idx < cutB ? 'B' : (idx < cutC ? 'C' : 'D')));
}

// One-line reason text based on closest axis or value match
export function computeReasonLine(user, shop, comp){
  try{
    if(comp && comp.valueMatch){ return `価値観が合いそう（${String(user.E)}）`; }
    const entries = [ ['A', comp.diffs.dA], ['B', comp.diffs.dB], ['C', comp.diffs.dC], ['D', comp.diffs.dD] ];
    entries.sort((a,b)=> a[1]-b[1]);
    const key = entries[0][0];
    const map = {
      A:'動機の理解が近い', B:'寄り添い度が近い', C:'求める変化に近い', D:'進め方が近い'
    };
    return map[key] || '';
  }catch{ return ''; }
}

// ---- Specificity & Trust scoring (non-AI, structure-based) ----
function textSpecificityScore(text){
  try{
    const t = String(text||''); if(!t) return 0;
    const len = t.length;
    const hasNum = (t.match(/[0-9０-９]{1,}/g)||[]).length; // numbers like 15分/3回
    const verbs = (t.match(/(説明|提案|確認|記録|伴走|設計|検討|共有|調整|練習)/g)||[]).length;
    const targets = (t.match(/(初めての方|初心者|\d+代|男性|不安|目的|印象)/g)||[]).length;
    // base from length tiers
    let s = 0;
    if(len>=300) s += 0.5; else if(len>=150) s += 0.35; else if(len>=60) s += 0.2; else s += 0.05;
    // signals
    s += Math.min(0.2, hasNum*0.05);
    s += Math.min(0.2, verbs*0.04);
    s += Math.min(0.15, targets*0.05);
    return clamp01(s);
  }catch{ return 0; }
}

// Service specificity: where to write concrete things (初回の流れ/リスク方針/Q&A/description)
export function scoreServiceSpecificity(svc){
  try{
    if(!svc) return 0;
    let s = 0;
    s += textSpecificityScore(svc.firstSessionPlan||'');
    s += textSpecificityScore(svc.riskPolicy||'');
    // Q&A list items
    try{
      const qas = Array.isArray(svc.qaList)? svc.qaList: []; const count = qas.filter(it=> (it&&it.q&&it.a)).length; if(count>=2) s += 0.25; else if(count>=1) s += 0.12;
    }catch{}
    // description fallback contributes lightly
    s += Math.min(0.2, textSpecificityScore(svc.description||''));
    return clamp01(s);
  }catch{ return 0; }
}

// Provider profile trust:思想/向き合い方の充実度（店舗プロフィール側）
export function scoreProfileTrust(provider){
  try{
    const p = provider && provider.onboarding && provider.onboarding.profile ? provider.onboarding.profile : null;
    if(!p) return 0;
    let s = 0;
    s += textSpecificityScore(p.problems||'');
    s += textSpecificityScore(p.first||'');
    s += textSpecificityScore(p.values||'');
    s += Math.min(0.2, textSpecificityScore(p.beyond||''));
    const wt = Array.isArray(p.whatTypes) ? p.whatTypes.length : 0; if(wt>=2) s += 0.2; else if(wt>=1) s += 0.1;
    return clamp01(s);
  }catch{ return 0; }
}
