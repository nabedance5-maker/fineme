// @ts-nocheck
export {};

const PHRASES_URL_REL = './scripts/data/compat-phrases.json';
const PHRASES_URL_ABS = '/scripts/data/compat-phrases.json';

async function loadPhrases(){
  const rel = (location.pathname && location.pathname.includes('/pages/')) ? PHRASES_URL_REL : PHRASES_URL_ABS;
  try{
    const res = await fetch(rel, { cache: 'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    return await res.json();
  }catch(e){
    try{
      const res2 = await fetch(PHRASES_URL_ABS, { cache: 'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      return await res2.json();
    }catch(e2){ return {}; }
  }
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function getType(diag){
  try{
    const intent = diag && diag.intent ? diag.intent : {};
    return { id: intent.type_id || intent.type || intent.code || '', name: intent.type_name || intent.name || '' };
  }catch(e){ return { id:'', name:'' }; }
}

function supportsType(provider, typeId){
  try{
    const wt = provider && provider.onboarding && provider.onboarding.profile && provider.onboarding.profile.whatTypes ? provider.onboarding.profile.whatTypes : [];
    if(!typeId) return false;
    // whatTypes may contain ids like 'w01' or names; support both
    return (Array.isArray(wt) && wt.some(x => String(x).toLowerCase() === String(typeId).toLowerCase()));
  }catch(e){ return false; }
}

export async function generateCompatibility(diag, provider){
  const phrases = await loadPhrases();
  const type = getType(diag);
  const prof = (provider && provider.onboarding && provider.onboarding.profile) ? provider.onboarding.profile : {};
  // 必須: タイプ一致
  if(!supportsType(provider, type.id)) return null;
  const pset = phrases[type.id] || {};
  const pit1 = (Array.isArray(pset.pitfalls) && pset.pitfalls[0]) ? pset.pitfalls[0] : '';
  const fut1 = (Array.isArray(pset.future) && pset.future[0]) ? pset.future[0] : '';

  const storeName = (provider && (provider.profile?.storeName || provider.name)) ? (provider.profile?.storeName || provider.name) : '';
  const catchline = [
    storeName ? `${storeName}は` : 'この店舗は',
    type.name ? `「${type.name}」に` : 'あなたのタイプに',
    prof.values ? `まっすぐ応えます。${prof.values}` : '自然体で応えます。'
  ].join('').trim();

  const empathy = [
    pit1 ? `「${pit1}」と感じやすいタイプに、` : '',
    prof.problems ? String(prof.problems) : '日常で起きやすいつまずきに',
    'まず寄り添います。'
  ].join('');

  const connect = [
    prof.first ? `最初は${String(prof.first)}。` : '最初は無理のない一歩から。',
    prof.values ? `ずっと大切にするのは「${String(prof.values)}」。` : ''
  ].join('');

  const future = [
    prof.beyond ? String(prof.beyond) : (fut1 || '続く仕組みで、自然体のまま印象が良くなる'),
  ].join('');

  return {
    catchline: escapeHtml(catchline),
    blocks: [
      { title: '共感', text: escapeHtml(empathy) },
      { title: '接続', text: escapeHtml(connect) },
      { title: '未来', text: escapeHtml(future) }
    ]
  };
}

export function renderCompatibilityCard(hostEl, comp){
  if(!hostEl || !comp) return;
  const card = document.createElement('div'); card.className='card'; card.style.padding='12px'; card.style.marginTop='10px';
  const title = document.createElement('div'); title.className='stack';
  const strong = document.createElement('strong'); strong.textContent = 'あなたとの相性説明'; title.appendChild(strong);
  if(comp.catchline){ const p = document.createElement('p'); p.style.fontWeight='600'; p.textContent = comp.catchline; title.appendChild(p); }
  card.appendChild(title);
  if(Array.isArray(comp.blocks)){
    const list = document.createElement('div'); list.className='stack'; list.style.marginTop='8px';
    for(const b of comp.blocks){ const sec = document.createElement('section'); const h = document.createElement('h4'); h.style.margin='0 0 4px'; h.textContent = b.title; const p = document.createElement('p'); p.style.margin='0'; p.textContent = b.text; sec.appendChild(h); sec.appendChild(p); list.appendChild(sec); }
    card.appendChild(list);
  }
  hostEl.appendChild(card);
}
