// @ts-nocheck
export const HISTORY_KEY = 'glowup:viewHistory';
const MAX_ITEMS = 200; // 上限（必要なら調整）

export function canonicalDetailHref(href){
  try{ const u = new URL(href, location.href); return u.pathname + u.search; }catch{ return String(href||''); }
}

export function loadHistory(){
  try{ const raw = localStorage.getItem(HISTORY_KEY); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; }
}
export function saveHistory(list){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }catch{} }

// snapshot: { href, name, region, category, priceFrom, image, providerName, providerId, viewedAt? }
export function addHistory(snapshot){
  if(!snapshot) return false;
  const href = canonicalDetailHref(snapshot.href || location.pathname + location.search);
  if(!href) return false;
  const list = loadHistory();
  // 直近に同じhrefがあれば先頭に移動（重複排除）
  const rest = list.filter(it => canonicalDetailHref(it.href) !== href);
  const item = {
    href,
    name: snapshot.name || '',
    region: snapshot.region || '',
    category: snapshot.category || '',
    priceFrom: snapshot.priceFrom != null ? Number(snapshot.priceFrom) : undefined,
    image: snapshot.image || '',
    providerName: snapshot.providerName || '',
    providerId: snapshot.providerId || '',
    viewedAt: snapshot.viewedAt || new Date().toISOString()
  };
  const next = [item, ...rest].slice(0, MAX_ITEMS);
  saveHistory(next);
  return true;
}

export function removeHistory(href){
  const list = loadHistory();
  const canon = canonicalDetailHref(href);
  const next = list.filter(it => canonicalDetailHref(it.href) !== canon);
  if(next.length !== list.length){ saveHistory(next); return true; }
  return false;
}

export function clearHistory(){ saveHistory([]); }