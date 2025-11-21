// @ts-nocheck
// Favorites storage and helpers
export const FAVORITES_KEY = 'glowup:favorites';

export function loadFavorites(){
  try{ const raw = localStorage.getItem(FAVORITES_KEY); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; }
}
export function saveFavorites(arr){ try{ localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); }catch{} }

export function canonicalDetailHref(href){
  try{ const u = new URL(href, location.href); return u.pathname + u.search; }catch{ return String(href||''); }
}

export function findIndexByHref(href){
  const canon = canonicalDetailHref(href);
  const favs = loadFavorites();
  return favs.findIndex(f => canonicalDetailHref(f.href) === canon);
}

export function isFavorited(href){ return findIndexByHref(href) !== -1; }

// snapshot: { href, name, region, category, priceFrom, image, providerName, providerId }
export function addFavorite(snapshot){
  if(!snapshot || !snapshot.href) return false;
  const favs = loadFavorites();
  const canon = canonicalDetailHref(snapshot.href);
  if(favs.some(f => canonicalDetailHref(f.href) === canon)) return true; // already
  const item = {
    href: canon,
    name: snapshot.name || '',
    region: snapshot.region || '',
    category: snapshot.category || '',
    priceFrom: snapshot.priceFrom != null ? Number(snapshot.priceFrom) : undefined,
    image: snapshot.image || '',
    providerName: snapshot.providerName || '',
    providerId: snapshot.providerId || '',
    addedAt: new Date().toISOString()
  };
  favs.push(item); saveFavorites(favs); return true;
}

export function removeFavorite(href){
  const favs = loadFavorites();
  const canon = canonicalDetailHref(href);
  const next = favs.filter(f => canonicalDetailHref(f.href) !== canon);
  if(next.length !== favs.length){ saveFavorites(next); return true; }
  return false;
}

export function toggleFavorite(snapshot){
  const canon = canonicalDetailHref(snapshot?.href||'');
  if(!canon) return false;
  if(isFavorited(canon)){ removeFavorite(canon); return false; }
  addFavorite({ ...snapshot, href: canon }); return true;
}
