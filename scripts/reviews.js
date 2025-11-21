// @ts-nocheck
export const REVIEWS_KEY = 'glowup:reviews';

export function loadReviews(){
  try{ const raw = localStorage.getItem(REVIEWS_KEY); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; }
}
export function saveReviews(list){ try{ localStorage.setItem(REVIEWS_KEY, JSON.stringify(list)); }catch{} }

// serviceKey: string (e.g., localId or 'slug:xxx')
export function getReviewsFor(serviceKey, { includeFlagged = false, includeHidden = false } = {}){
  const list = loadReviews();
  return list.filter(r => r && r.serviceKey === serviceKey && (includeFlagged || !r.flagged) && (includeHidden || r.visible !== false));
}

export function addReview({ serviceKey, rating, comment, user }){
  if(!serviceKey) throw new Error('serviceKey required');
  const list = loadReviews();
  const now = new Date().toISOString();
  const item = {
    id: cryptoRandomId(),
    serviceKey,
    rating: clampRating(rating),
    comment: String(comment||'').slice(0, 1000),
    userId: user?.id || null,
    userName: user?.name || 'ユーザー',
    createdAt: now,
    flagged: false,
    visible: true,
    flaggedAt: null,
    flagReason: null
  };
  list.push(item); saveReviews(list); return item;
}

export function flagReview(id, reason = ''){
  const list = loadReviews();
  const i = list.findIndex(r=> r && r.id === id);
  if(i === -1) return false;
  list[i].flagged = true; list[i].flaggedAt = new Date().toISOString(); list[i].flagReason = String(reason||'');
  saveReviews(list); return true;
}

export function ratingSummary(serviceKey){
  const arr = getReviewsFor(serviceKey, { includeFlagged:false, includeHidden:false });
  if(!arr.length) return { count:0, avg:0 };
  const sum = arr.reduce((a,b)=> a + (Number(b.rating)||0), 0);
  return { count: arr.length, avg: Math.round((sum/arr.length)*10)/10 };
}

function clampRating(v){ const n = Number(v); if(!Number.isFinite(n)) return 0; return Math.max(1, Math.min(5, Math.round(n))); }
function cryptoRandomId(){ try{ return [...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join(''); }catch{ return 'rvw-'+Math.random().toString(36).slice(2); } }
