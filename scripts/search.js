/*
  Deprecated file: scripts/search.js
  This legacy script was replaced by scripts/search.new.js.
  We keep this stub to avoid broken references. No logic here.
*/
(function(){ /* no-op */ })();
/*
const SERVICES_KEY = 'glowup:services';
const PROVIDERS_KEY = 'glowup:providers';

function qs(sel, el=document){ return el.querySelector(sel);} 

// --- Text utilities for safe rendering and highlighting ---
function escapeHTML(str){
  return String(str||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function escapeRegex(str){
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Build HTML with only <mark> tags injected; other content is escaped.
function highlightSafe(text, query){
  // (legacy block commented out)
    const q = String(query||'').trim();
    if(!q) return escapeHTML(t);
    try{
      const re = new RegExp(escapeRegex(q), 'ig');
      let lastIndex = 0; let out = '';
      let m;
      while((m = re.exec(t))){
        out += escapeHTML(t.slice(lastIndex, m.index));
        out += '<mark>' + escapeHTML(m[0]) + '</mark>';
        lastIndex = m.index + m[0].length;
        if(m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loops
      }
      out += escapeHTML(t.slice(lastIndex));
      return out;
    }catch{
      return escapeHTML(t);
    }
  }
  a.innerHTML = `
  <img class="service-thumb" src="${imgSrc}" alt="${name}" onerror="this.onerror=null;this.src='${placeholder}';">
    <div class="card-body">
      <h3 class="card-title">${title}</h3>
      ${serviceLine}
      <p class="card-meta">${address || labelRegion(region)}</p>
      <p class="card-meta">${labelCategory(category)}</p>
      <p class="card-meta">¥${priceFrom.toLocaleString()}〜</p>
      ${providerId ? `<p class="card-meta"><a href="./store.html?providerId=${encodeURIComponent(providerId)}">店舗詳細</a></p>`:''}
    </div>`;
  return a;
}

function labelRegion(key){
  const map = {
    hokkaido:'北海道', aomori:'青森県', iwate:'岩手県', miyagi:'宮城県', akita:'秋田県', yamagata:'山形県', fukushima:'福島県',
    ibaraki:'茨城県', tochigi:'栃木県', gunma:'群馬県', saitama:'埼玉県', chiba:'千葉県', tokyo:'東京都', kanagawa:'神奈川県',
    niigata:'新潟県', toyama:'富山県', ishikawa:'石川県', fukui:'福井県', yamanashi:'山梨県', nagano:'長野県', gifu:'岐阜県',
    shizuoka:'静岡県', aichi:'愛知県', mie:'三重県', shiga:'滋賀県', kyoto:'京都府', osaka:'大阪府', hyogo:'兵庫県',
    nara:'奈良県', wakayama:'和歌山県', tottori:'鳥取県', shimane:'島根県', okayama:'岡山県', hiroshima:'広島県', yamaguchi:'山口県',
  tokushima:'徳島県', kagawa:'香川県', ehime:'愛媛県', kochi:'高知県', fukuoka:'福岡県', saga:'佐賀県', nagasaki:'長崎県',
  if(!key) return '全国';
  return map[key] || key;
}
function labelCategory(key){
  const map={consulting:'外見トータルサポート',gym:'パーソナルジム',makeup:'メイクアップ',hair:'ヘア',diagnosis:'カラー/骨格診断',fashion:'コーデ提案',photo:'写真撮影（アプリ等）',marriage:'結婚相談所'};
  const u=new URL(location.href);
  const ent = Object.fromEntries(u.searchParams.entries());
  // accept both q and keyword
  if(!ent.q && ent.keyword) ent.q = ent.keyword;
  return ent;
}

function resolvePrefix(){
  const p = location.pathname;
  return p.includes('/pages/') ? '..' : '.';
}

async function loadStaticServices(){
  const rel = `${resolvePrefix()}/scripts/data/services.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/services.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){
      console.warn('Failed to load static services.json', e2);
      return [];
    }
  }
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

function loadLocalServices(){
  try{
    const raw = localStorage.getItem(SERVICES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(arr)) return [];
    // provider maps (local only; static fallback handled later)
  const provRaw = localStorage.getItem(PROVIDERS_KEY);
  let provNameMap = {}, provAddrMap = {};
      const provArr = provRaw? JSON.parse(provRaw):[];
      if(Array.isArray(provArr)){
        for(const p of provArr){ if(p && p.id){ provNameMap[p.id]=p.name; provAddrMap[p.id]= (p.profile && p.profile.address) || ''; } }
      }
    }catch{}
    // published only, map to card/search model
    return arr.filter(s=> s && s.published).map(s => ({
      name: s.name,
      region: s.region,
      category: s.category,
      priceFrom: Number((s.price!=null?s.price:s.priceMin)||0),
      image: s.photo || '',
      href: `./detail.html?localId=${encodeURIComponent(s.id)}`,
      providerName: provNameMap[s.providerId] || '',
      address: provAddrMap[s.providerId] || '',
      providerId: s.providerId,
      _searchText: [s.name||'', s.catchcopy||'', s.description||'', provNameMap[s.providerId]||'', provAddrMap[s.providerId]||''].join(' ').toLowerCase()
    }));
  }catch{ return []; }
}

function updateCount(n){
  const el = qs('#results-count');
  if(el){
    el.textContent = `${n}件見つかりました`;
  }
}

function getSortKey(){
  const { sort='' } = parseParams();
  return sort;
}

function sortItems(items, sort){
  const safeNum = v => (typeof v === 'number' && !Number.isNaN(v)) ? v : Number.POSITIVE_INFINITY;
  // 未定義価格は常に末尾へ（昇順は +∞、降順は - で比較）
  const safeStr = v => (v||'').toString();
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  const arr = [...items];
  switch(sort){
    case 'price_asc':
      return arr.sort((a,b)=> safeNum(a.priceFrom) - safeNum(b.priceFrom));
    case 'price_desc':
      return arr.sort((a,b)=> safeNum(b.priceFrom) - safeNum(a.priceFrom));
    case 'name_desc':
      return arr.sort((a,b)=> collator.compare(safeStr(b.providerName||b.name), safeStr(a.providerName||a.name)));
    case 'name_asc':
      return arr.sort((a,b)=> collator.compare(safeStr(a.providerName||a.name), safeStr(b.providerName||b.name)));
    default:
      return arr; // おすすめ順（現状はそのまま）
  }
}

(async function init(){
  const { q='', region='', category='' } = parseParams();
  const list = qs('#results');
  const qLower = (q||'').toLowerCase();

  const staticData = await loadStaticServices();
  const staticItems = staticData.map(s => ({
    name: s.name,
    region: s.region,
    category: s.category,
    priceFrom: Number(s.priceFrom||0),
    image: s.image || '',
    href: `./detail.html?slug=${encodeURIComponent(s.slug)}`
  }));

  let localItems = loadLocalServices();
  // If local providers are missing (after cache clear), enrich localItems with static providers map
  if(localItems.some(it=> !it.providerName || !it.address)){
    const provs = await loadStaticProviders();
    if(Array.isArray(provs) && provs.length){
      const nameMap = Object.fromEntries(provs.map(p=> [p.id, p.name]));
      const addrMap = Object.fromEntries(provs.map(p=> [p.id, (p.profile && p.profile.address)||'']));
      localItems = localItems.map(it=> ({
        ...it,
        providerName: it.providerName || nameMap[it.providerId] || '',
        address: it.address || addrMap[it.providerId] || ''
      }));
    }
  }
  const all = [...staticItems, ...localItems];

  const filtered = all.filter(s=>{
    const mq = qLower ? (
      (s.name||'').toLowerCase().includes(qLower) || (s._searchText||'').includes(qLower)
    ) : true;
    const mr = region ? s.region===region : true;
    const mc = category ? s.category===category : true;
    return mq && mr && mc;
  });
  const sorted = sortItems(filtered, getSortKey());

  if(sorted.length===0){
    const p = document.createElement('p');
    p.className='muted';
    p.textContent='該当するサービスが見つかりませんでした。';
    list.appendChild(p);
    updateCount(0);
    console.info('[search] static:', staticItems.length, 'local:', localItems.length, 'filters:', {q,region,category});
    return;
  }
  updateCount(sorted.length);
  sorted.forEach(s=> list.appendChild(card(s)) );
})();
*/
// legacy stub end
void 0;
