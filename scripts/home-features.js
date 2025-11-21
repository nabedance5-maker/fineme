// @ts-nocheck
// Home page: render latest published features (thumbnail + title only)
const FEATURES_KEY = 'glowup:features';
function $(s, root=document){ return root.querySelector(s); }
function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
function loadFeatures(){
  try{
    const raw = localStorage.getItem(FEATURES_KEY);
    const arr = raw? JSON.parse(raw):[];
    return Array.isArray(arr)? arr: [];
  }catch{ return []; }
}
function firstImageSrcFromHtml(html){
  try{
    if(!html) return null;
    // parse using DOMParser to avoid assigning untrusted HTML to innerHTML of a live node
    const dp = new DOMParser();
    const doc = dp.parseFromString(html, 'text/html');
    const img = doc.querySelector('img[src]');
    const src = img ? img.getAttribute('src') : null;
    return src || null;
  }catch{ return null; }
}
function pickThumb(f){
  // Local items: prefer thumbnail, then first image in body
  if(typeof f.status !== 'undefined'){
    if(f.thumbnail && (/^https?:\/\//i.test(f.thumbnail) || /^data:image\//i.test(f.thumbnail))) return f.thumbnail;
    const bodyImg = firstImageSrcFromHtml(f.body);
    if(bodyImg) return bodyImg;
  } else {
    // Static fallback items
    if(f.image) return f.image;
  }
  // Fallback placeholder (home page is at project root)
  return './assets/placeholders/placeholder-default.svg';
}
function renderTop(items, limit=6){
  const host = $('#top-features');
  if(!host) return;
  host.innerHTML = '';
  const list = items.slice(0, limit);
  for(const f of list){
    const a = document.createElement('a');
    a.className = 'card';
    a.href = f.id ? `./pages/feature.html?id=${encodeURIComponent(f.id)}` : `./pages/feature.html`;
    a.style.display = 'block';
    a.style.padding = '12px';
    const img = document.createElement('img');
    const src = pickThumb(f);
    try{ img.src = (typeof safeUrl === 'function' ? (safeUrl(src) || './assets/placeholders/placeholder-default.svg') : (src || './assets/placeholders/placeholder-default.svg')); }catch{ img.src = src || './assets/placeholders/placeholder-default.svg'; }
    img.alt = String(f.title || '特集画像');
    img.addEventListener('error', ()=>{ try{ img.onerror=null; img.src = './assets/placeholders/placeholder-default.svg'; }catch{} });
    const wrap = document.createElement('div'); wrap.style.padding = '12px 12px 14px';
    const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.style.fontSize = '16px'; h3.textContent = f.title || '(無題)';
    wrap.appendChild(h3);
    a.appendChild(img); a.appendChild(wrap);
    host.appendChild(a);
  }
  // Dim partially visible cards at both edges
  const updateDim = () => {
    const rect = host.getBoundingClientRect();
    const leftEdge = rect.left + 1;
    const rightEdge = rect.right - 1;
    for(const el of host.querySelectorAll('.card')){
      const r = el.getBoundingClientRect();
      const fullyVisible = r.left >= leftEdge && r.right <= rightEdge;
      el.classList.toggle('is-dimmed', !fullyVisible);
    }
  };
  updateDim();
  host.addEventListener('scroll', ()=> { window.requestAnimationFrame(updateDim); });
  window.addEventListener('resize', updateDim);
}
async function fetchStaticFallback(){
  try{
    const r = await fetch('/feature/feature-list.json');
    if(!r.ok) throw new Error(String(r.status));
    const arr = await r.json();
    return Array.isArray(arr) ? arr.map((x,i)=>({
      // no id -> links to list page
      title: x.title,
      summary: x.excerpt || '',
      image: (x.image||'').replace(/^\.\//,'/feature/')
    })) : [];
  }catch{ return []; }
}

(async function init(){
  // Get published features sorted by updatedAt desc (fallback to createdAt)
  const items = loadFeatures()
    .filter(f => (f.status||'draft') === 'published')
    .sort((a,b)=> new Date(b.updatedAt||b.createdAt).getTime() - new Date(a.updatedAt||a.createdAt).getTime());
  if(items.length){
    renderTop(items);
  }else{
    const fallback = await fetchStaticFallback();
    renderTop(fallback);
  }
})();
