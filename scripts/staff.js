// @ts-nocheck
export {};
const PROVIDERS_KEY = 'glowup:providers';
const SERVICES_KEY = 'glowup:services';
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }
// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
}

function qs(s, el=document){ return el.querySelector(s); }
function params(){ return Object.fromEntries(new URL(location.href).searchParams.entries()); }

function loadProviders(){
  try{ const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
}
function loadServices(){
  try{ const raw = localStorage.getItem(SERVICES_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
}
async function loadStaticProviders(){
  const rel = `${resolvePrefix()}/scripts/data/providers.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/providers.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){ return []; }
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
function labelRegion(key){
  const map = {
    hokkaido:'北海道', aomori:'青森県', iwate:'岩手県', miyagi:'宮城県', akita:'秋田県', yamagata:'山形県', fukushima:'福島県',
    ibaraki:'茨城県', tochigi:'栃木県', gunma:'群馬県', saitama:'埼玉県', chiba:'千葉県', tokyo:'東京都', kanagawa:'神奈川県',
    niigata:'新潟県', toyama:'富山県', ishikawa:'石川県', fukui:'福井県', yamanashi:'山梨県', nagano:'長野県', gifu:'岐阜県',
    shizuoka:'静岡県', aichi:'愛知県', mie:'三重県', shiga:'滋賀県', kyoto:'京都府', osaka:'大阪府', hyogo:'兵庫県',
    nara:'奈良県', wakayama:'和歌山県', tottori:'鳥取県', shimane:'島根県', okayama:'岡山県', hiroshima:'広島県', yamaguchi:'山口県',
    tokushima:'徳島県', kagawa:'香川県', ehime:'愛媛県', kochi:'高知県', fukuoka:'福岡県', saga:'佐賀県', nagasaki:'長崎県',
    kumamoto:'熊本県', oita:'大分県', miyazaki:'宮崎県', kagoshima:'鹿児島県', okinawa:'沖縄県'
  };
  if(!key) return '全国';
  return map[key] || key;
}

(async function init(){
  const { providerId='', staffId='' } = params();
  const root = qs('#staff-root');
  if(!root){ return; }
  let providers = loadProviders();
  if(!providers.length){ providers = await loadStaticProviders(); }
  const services = loadServices();
  const provider = providers.find(p=> p.id === providerId);
  const prof = provider?.profile || {};
  const staffList = Array.isArray(prof.staffs) ? prof.staffs : [];
  const staff = staffList.find(s=> s.id === staffId);

  if(!provider || !staff){
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'スタッフが見つかりませんでした。'; root.appendChild(p); return;
  }

  const nameText = staff.name || '';
  const roleText = staff.role || '';
  const oneLinerText = (staff.oneLiner || '').toString();
  const introText = (staff.intro || staff.bio || '').toString();
  const historyText = (staff.history || '').toString();
  const photo = staff.photo && staff.photo.trim() ? staff.photo : ((location.pathname.includes('/pages/')) ? '../assets/placeholders/placeholder-default.svg' : './assets/placeholders/placeholder-default.svg');
  const storeName = prof.storeName || provider.name || '';
  const expYears = (staff.experienceYear && Number.isFinite(Number(staff.experienceYear))) ? Math.max(0, new Date().getFullYear() - Number(staff.experienceYear)) : null;

  // Build hero section safely
  const hero = document.createElement('div'); hero.className = 'staff-hero';
  const img = document.createElement('img'); img.className = 'staff-avatar-lg'; try{ img.src = (typeof safeUrl === 'function' ? (safeUrl(photo) || photo) : photo); }catch{ img.src = photo; } img.alt = nameText;
  hero.appendChild(img);
  const right = document.createElement('div');
  const h1 = document.createElement('h1'); h1.className = 'section-title staff-name'; h1.textContent = nameText; right.appendChild(h1);
  if(roleText){ const p = document.createElement('p'); p.className = 'staff-role'; p.textContent = roleText; right.appendChild(p); }
  if(expYears!=null){ const p = document.createElement('p'); p.className = 'card-meta'; p.textContent = `(${expYears}年)`; right.appendChild(p); }
  if(oneLinerText){ const p = document.createElement('p'); p.className = 'muted'; p.style.margin = '6px 0 12px'; oneLinerText.split('\n').forEach((line, idx, arr)=>{ p.appendChild(document.createTextNode(line)); if(idx < arr.length -1) p.appendChild(document.createElement('br')); }); right.appendChild(p); }
  if(introText){ const wrap = document.createElement('div'); wrap.className = 'stack'; wrap.style.marginTop = '8px'; const title = document.createElement('h3'); title.style.margin='0'; title.style.fontSize='16px'; title.textContent = '自己紹介'; const bio = document.createElement('p'); bio.className = 'staff-bio'; bio.style.margin='0'; introText.split('\n').forEach((line, idx, arr)=>{ bio.appendChild(document.createTextNode(line)); if(idx < arr.length -1) bio.appendChild(document.createElement('br')); }); wrap.appendChild(title); wrap.appendChild(bio); right.appendChild(wrap); }
  hero.appendChild(right);
  root.appendChild(hero);

  if(historyText){ const section = document.createElement('section'); section.className = 'section'; section.style.paddingTop = '0'; const h2 = document.createElement('h2'); h2.className = 'section-title'; h2.style.fontSize='22px'; h2.textContent = '略歴'; const card = document.createElement('div'); card.className = 'card'; card.style.padding = '16px'; const p = document.createElement('p'); p.style.margin='0'; historyText.split('\n').forEach((line, idx, arr)=>{ p.appendChild(document.createTextNode(line)); if(idx < arr.length-1) p.appendChild(document.createElement('br')); }); card.appendChild(p); section.appendChild(h2); section.appendChild(card); root.appendChild(section); }

  const servicesSection = document.createElement('section'); servicesSection.className = 'services-section'; const h2s = document.createElement('h2'); h2s.className='section-title'; h2s.style.fontSize='22px'; h2s.textContent='担当サービス'; servicesSection.appendChild(h2s); const servicesGrid = document.createElement('div'); servicesGrid.id = 'staff-services'; servicesGrid.className = 'features-grid'; servicesSection.appendChild(servicesGrid); root.appendChild(servicesSection);

  // 担当サービス: staffIdsに含まれる、かつ公開中
  const related = services.filter(s=> s.published && s.providerId===provider.id && Array.isArray(s.staffIds) && s.staffIds.includes(staff.id));
  const grid = qs('#staff-services');
  if(related.length === 0){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = '担当サービスはまだありません。';
    grid.appendChild(p);
    return;
  }
  for(const s of related){
    const card = document.createElement('a'); card.className = 'card'; card.href = `${storeBase()}?providerId=${encodeURIComponent(provider.id)}${s.storeId? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.id)}`;
    const price = Number((s.price!=null?s.price:s.priceMin)||0);
    const placeholderRoot = (location.pathname.includes('/pages/')) ? '..' : '.';
    const imgPlaceholder = `${placeholderRoot}/assets/placeholders/placeholder-default.svg`;
    const imgSrc = (s.photo && s.photo.trim()) ? s.photo : imgPlaceholder;
    const img = document.createElement('img'); img.className='service-thumb'; try{ img.src = (typeof safeUrl === 'function' ? (safeUrl(imgSrc) || imgPlaceholder) : (imgSrc || imgPlaceholder)); }catch{ img.src = imgSrc || imgPlaceholder; } img.alt = s.name || ''; img.addEventListener('error', ()=>{ try{ img.onerror=null; img.src = imgPlaceholder; }catch{} });
    const body = document.createElement('div'); body.className='card-body'; const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = s.name || ''; const meta = document.createElement('p'); meta.className='card-meta'; meta.textContent = `${labelRegion(s.region)} / ${s.category || ''}`; const priceP = document.createElement('p'); priceP.className='card-meta'; priceP.textContent = `¥${price.toLocaleString()}`; body.appendChild(h3); body.appendChild(meta); body.appendChild(priceP); card.appendChild(img); card.appendChild(body); grid.appendChild(card);
  }
})();
