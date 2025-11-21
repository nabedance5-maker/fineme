// Top page feature filtering by search keyword
function qs(s, el=document){ return el.querySelector(s); }
function qsa(s, el=document){ return Array.from(el.querySelectorAll(s)); }

function getKeyword(){
  const u = new URL(location.href);
  return u.searchParams.get('q') || '';
}

function setKeywordToForm(val){
  const input = qs('.hero .searchbar input[name="q"]');
  if(input) input.value = val;
}

function normalize(s){ return (s||'').toString().toLowerCase(); }

function textOfCard(card){
  const title = card.querySelector('.feature-title')?.textContent || '';
  const meta  = card.querySelector('.feature-meta')?.textContent || '';
  const alt   = card.querySelector('img')?.alt || '';
  return `${title} ${meta} ${alt}`;
}

function filterFeatures(keyword){
  const cards = qsa('.features-grid .feature-card');
  const key = normalize(keyword);
  let visibleCount = 0;
  cards.forEach(card => {
    if(!key){
      card.style.display = '';
      visibleCount++;
      return;
    }
    const text = normalize(textOfCard(card));
    const hit = text.includes(key);
    card.style.display = hit ? '' : 'none';
    if(hit) visibleCount++;
  });
  const grid = qs('.features-grid');
  if(grid){ grid.dataset.count = String(visibleCount); }
}

function onSubmitIntercept(e){
  // Keep normal action for non-top pages; here we intercept and stay on page
  e.preventDefault();
  const form = e.currentTarget;
  const q = form.q?.value?.trim() || '';
  const url = new URL(location.href);
  if(q){ url.searchParams.set('q', q); } else { url.searchParams.delete('q'); }
  history.replaceState({}, '', url.toString());
  filterFeatures(q);
}

(function init(){
  const initial = getKeyword();
  setKeywordToForm(initial);
  filterFeatures(initial);
  const form = qs('.hero .searchbar');
  if(form){ form.addEventListener('submit', onSubmitIntercept); }
})();
