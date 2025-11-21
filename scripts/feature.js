// @ts-nocheck
// Public Features: list and article render from localStorage managed by admin-features.js
// Data key: 'glowup:features' with items: { id, title, summary, body, status, createdAt, updatedAt }

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

function sanitizeHtml(html){
  // Keep in sync with admin-features sanitizer
  const allowedTags = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','U','A','BLOCKQUOTE','IMG','BR','DIV']);
  const allowedAttrs = {
    'A': ['href','target','rel'], 'IMG': ['src','alt','data-size'],
    'P': ['data-align'], 'H2': ['data-align'], 'H3': ['data-align'], 'H4': ['data-align'],
    'LI': ['data-align'], 'UL': ['data-align'], 'OL': ['data-align'], 'BLOCKQUOTE': ['data-align']
  };
  allowedAttrs['DIV'] = ['data-align'];
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  while(walker.nextNode()){
    const el = walker.currentNode;
    if(!allowedTags.has(el.tagName)){
      toRemove.push(el);
      continue;
    }
    for(const attr of Array.from(el.attributes)){
      const ok = allowedAttrs[el.tagName] && allowedAttrs[el.tagName].includes(attr.name.toLowerCase());
      if(!ok){ el.removeAttribute(attr.name); }
    }
    if(el.tagName === 'A'){
      const href = el.getAttribute('href')||'';
      if(href && !/^https?:\/\//i.test(href) && !href.startsWith('#')){ el.removeAttribute('href'); }
      el.setAttribute('rel','noopener');
      el.setAttribute('target','_blank');
    }
  }
  for(const el of toRemove){
    const parent = el.parentNode;
    while(el.firstChild){ parent.insertBefore(el.firstChild, el); }
    parent.removeChild(el);
  }
  return tmp.innerHTML;
}

function firstImageSrcFromHtml(html){
  try{
    if(!html) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const img = tmp.querySelector('img[src]');
    const src = img?.getAttribute('src') || null;
    return src || null;
  }catch{ return null; }
}

function renderList(items){
  const grid = document.getElementById('feature-list');
  const empty = document.getElementById('feature-empty');
  if(!grid || !empty) return;
  grid.textContent = '';
  if(!items.length){ empty.hidden = false; return; }
  empty.hidden = true;
  for(const f of items){
    const isLocal = typeof f.status !== 'undefined';
    const tag = isLocal ? 'a' : 'div';
    const card = document.createElement(tag);
    card.className = 'card';
    card.style.display = 'block';
    card.style.padding = '12px';
    if(isLocal){ card.href = `?id=${encodeURIComponent(f.id)}`; }
    // decide image
    let imgSrc = null;
    if(isLocal){
      const isValidThumb = f.thumbnail && (/^https?:\/\//i.test(f.thumbnail) || /^data:image\//i.test(f.thumbnail));
      imgSrc = isValidThumb ? f.thumbnail : firstImageSrcFromHtml(f.body);
    }else{
      imgSrc = f.image || null;
    }
    if(!imgSrc){ imgSrc = '/feature/images/feature-1.webp'; }
    if(imgSrc){
      try{ const im = document.createElement('img'); im.src = imgSrc; im.alt = String(f.title || '特集画像'); card.appendChild(im); }catch(e){}
    }
    const inner = document.createElement('div'); inner.style.padding = '12px 12px 14px';
    const h = document.createElement('h3'); h.style.margin = '0'; h.style.fontSize = '16px'; h.textContent = String(f.title || '(無題)');
    inner.appendChild(h); card.appendChild(inner);
    grid.appendChild(card);
  }
}

function renderArticle(item){
  const art = document.getElementById('feature-article');
  const t = document.getElementById('article-title');
  const s = document.getElementById('article-summary');
  const b = document.getElementById('article-body');
  if(!art || !t || !s || !b) return;
  if(!item){
    art.hidden = false;
    t.textContent = '記事が見つかりません';
    s.textContent = '';
    b.innerHTML = '';
    return;
  }
  t.textContent = item.title || '';
  s.textContent = item.summary || '';
  b.innerHTML = sanitizeHtml(item.body||'');
  art.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getParam(name){ try{ return new URL(location.href).searchParams.get(name); }catch{ return null; } }

function setParam(name, value){
  try{
    const url = new URL(location.href);
    if(value){ url.searchParams.set(name, value); }
    else{ url.searchParams.delete(name); }
    history.replaceState({}, '', url);
  }catch{}
}

function normalize(str){
  return String(str||'').toLowerCase();
}

function matchItem(item, q){
  if(!q) return true;
  const n = normalize(q);
  const title = normalize(item.title);
  const summary = normalize(item.summary);
  // body はタグを剥いでから評価（簡易）
  let bodyText = '';
  try{
    const tmp = document.createElement('div');
    tmp.innerHTML = item.body || '';
    bodyText = normalize(tmp.textContent || tmp.innerText || '');
  }catch{}
  return title.includes(n) || summary.includes(n) || bodyText.includes(n);
}

function sortItems(items, mode){
  const arr = items.slice();
  const ja = new Intl.Collator('ja', { sensitivity: 'base', numeric: false });
  switch(mode){
    case 'old':
      return arr.sort((a,b)=> new Date(a.updatedAt||a.createdAt||0).getTime() - new Date(b.updatedAt||b.createdAt||0).getTime());
    case 'az': // あ→ん（日本語50音順）
      return arr.sort((a,b)=> ja.compare(a.title||'', b.title||''));
    case 'za': // ん→あ（逆順）
      return arr.sort((a,b)=> ja.compare(b.title||'', a.title||''));
    case 'new':
    default:
      return arr.sort((a,b)=> new Date(b.updatedAt||b.createdAt||0).getTime() - new Date(a.updatedAt||a.createdAt||0).getTime());
  }
}

(function init(){
  let list = loadFeatures().filter(f=> (f.status||'draft') === 'published');
  // If id param, show article, else show list
  const id = getParam('id');
  if(id){
    const item = loadFeatures().find(f=> f.id === id);
    // id指定があればステータスに関わらずプレビュー表示（非公開/下書きは注意喚起）
    if(item){
      renderArticle(item);
      // 非公開や下書きの場合の注意文をsummaryに付加（上書きしない）
      if(item.status !== 'published'){
        const s = document.getElementById('article-summary');
        if(s){
          const note = item.status === 'draft' ? '（下書きのプレビュー）' : '（非公開のプレビュー）';
          s.textContent = (s.textContent || '') + note;
        }
      }
    }else{
      renderArticle(null);
    }
  }
  const qInput = document.getElementById('feature-search');
  const countEl = document.getElementById('feature-count');
  const sortSel = document.getElementById('feature-sort');
  const apply = (q, sortMode)=>{
    if(qInput && qInput.value !== (q||'')) qInput.value = q||'';
    const filtered = (list.length? list: []).filter(it => matchItem(it, q));
    const sorted = sortItems(filtered, sortMode||getParam('sort')||'new');
    renderList(sorted);
    if(countEl){
      const total = list.length;
      const hit = filtered.length;
      countEl.textContent = q ? `${hit} / ${total} 件` : `${total} 件`;
    }
  };
  const seedAndApply = (q, sortMode)=>{
    if(list.length){ apply(q, sortMode); return; }
    // Fallback: static list（タイトル・概要のみ検索対象）
    fetch(`/feature/feature-list.json`).then(r=>{
      if(!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(arr =>{
      const mapped = Array.isArray(arr) ? arr.map((x,i)=>({ title: x.title, summary: x.excerpt || '', image: (x.image||'').replace(/^\.\//,'/feature/') })) : [];
      // 簡易検索は title/summary のみ
      const filtered = mapped.filter(it => matchItem({ ...it, body: '' }, q));
      const sorted = (sortMode||getParam('sort')||'new') === 'new' || (sortMode||getParam('sort')||'new') === 'old'
        ? filtered // フォールバックは日時がないため new/old は元順のまま
        : sortItems(filtered, sortMode||getParam('sort')||'new');
      renderList(sorted);
      if(countEl){
        const total = mapped.length;
        const hit = filtered.length;
        countEl.textContent = q ? `${hit} / ${total} 件` : `${total} 件`;
      }
    }).catch(()=>{
      renderList([]);
      if(countEl){ countEl.textContent = '0 件'; }
    });
  };

  // URL ?q と連動
  const q0 = getParam('q') || '';
  const s0 = getParam('sort') || 'new';
  seedAndApply(q0, s0);
  if(qInput){
    qInput.value = q0;
    qInput.addEventListener('input', ()=>{
      const v = qInput.value.trim();
      setParam('q', v);
      seedAndApply(v, sortSel ? sortSel.value : (getParam('sort')||'new'));
    });
  }
  if(sortSel){
    sortSel.value = s0;
    sortSel.addEventListener('change', ()=>{
      const mode = sortSel.value;
      setParam('sort', mode);
      seedAndApply(qInput ? qInput.value.trim() : (getParam('q')||''), mode);
    });
  }
})();
