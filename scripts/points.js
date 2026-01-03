// Fineme Points & Reservations MVP (localStorage-based)
// Storage keys
const STORE_KEYS = {
  points: 'fineme:points:state',              // { points:number, reservations:number }
  reservations: 'fineme:reservations:list'    // Array<Reservation>
};

/**
 * @typedef {Object} Reservation
 * @property {string} id
 * @property {string} userId
 * @property {string} storeId
 * @property {string} title
 * @property {number} price
 * @property {number} commissionRate // 6|7|8 (%), copied from store plan at booking time
 * @property {string} visitDate      // ISO date string
 * @property {('reserved'|'canceled'|'no_show'|'visit_pending'|'visited')} status
 * @property {('affinity'|'category'|'direct'|'external'|'detail'|'home'|'search')} origin
 * @property {number} createdAt
 * @property {number} updatedAt
 */

function loadReservations(){
  try{ const raw = localStorage.getItem(STORE_KEYS.reservations); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; }
}
function saveReservations(arr){ try{ localStorage.setItem(STORE_KEYS.reservations, JSON.stringify(arr||[])); }catch{} }
function genId(){ return 'r_' + Math.random().toString(36).slice(2,10); }

// Rate ladder from total visits
function rateForVisits(visits){ return (visits>=11)?5:(visits>=4?4:3); }

function loadPoints(){ try{ const raw=localStorage.getItem(STORE_KEYS.points); return raw? JSON.parse(raw): { points:0, reservations:0, visits:0 }; }catch{ return { points:0, reservations:0, visits:0 }; } }
function savePoints(obj){ try{ localStorage.setItem(STORE_KEYS.points, JSON.stringify(obj||{ points:0, reservations:0, visits:0 })); }catch{} }

/** Create a reservation (MVP booking) */
export function createReservation({ userId, storeId, title, price, commissionRate, visitDate, origin }){
  const now = Date.now();
  let detectedOrigin = 'direct';
  try{
    const u = new URL(location.href);
    const q = (u.searchParams.get('origin')||'').trim();
    if(q) detectedOrigin = q;
    const last = sessionStorage.getItem('fineme:last-origin');
    if(last) detectedOrigin = last;
  }catch{}
  const r = { id: genId(), userId, storeId, title: title||'予約', price: Number(price||0), commissionRate: Number(commissionRate||6), visitDate: String(visitDate||new Date().toISOString()), status: 'reserved', origin: String(origin||detectedOrigin||'direct'), createdAt: now, updatedAt: now };
  const arr = loadReservations(); arr.push(r); saveReservations(arr);
  const pts = loadPoints(); pts.reservations = Number(pts.reservations||0) + 1; savePoints(pts);
  return r;
}

/** Mark reservation as visit_pending (e.g., day reached) */
export function markVisitPending(id){ const arr=loadReservations(); const r=arr.find(x=>x.id===id); if(!r) return false; r.status='visit_pending'; r.updatedAt=Date.now(); saveReservations(arr); return true; }

/** Provider confirms visit; grant points then */
export function confirmVisited(id){
  const arr = loadReservations(); const r = arr.find(x=> x.id===id);
  if(!r) return { ok:false, error:'not-found' };
  r.status='visited'; r.updatedAt=Date.now(); saveReservations(arr);
  // grant points based on current visits count
  const pts = loadPoints(); const visits = Number(pts.visits||0) + 1; const rate = rateForVisits(visits);
  const commissionValue = Math.round((r.price * (r.commissionRate/100)));
  const grant = commissionValue; // 100% of commission as points (can adjust later)
  const add = Math.round(grant); // points in whole units
  pts.points = Number(pts.points||0) + add;
  pts.visits = visits;
  savePoints(pts);
  return { ok:true, granted: add, rate, totalPoints: pts.points };
}

/** Simple badge updater */
export function updateHeaderPointsBadge(){
  try{
    const badge = document.getElementById('header-points-badge'); if(!badge) return;
    const pts = loadPoints(); const rate = rateForVisits(Number(pts.visits||0));
    badge.textContent = `${Number(pts.points||0)}pt / ${rate}%`;
    badge.title = `現在の還元率: ${rate}%`;
  }catch{}
}

export function listReservations(){ return loadReservations(); }

// Expose for quick testing
try{ const w = /** @type {any} */(window); w.FinemePoints = { createReservation, markVisitPending, confirmVisited, updateHeaderPointsBadge, listReservations }; }catch{}
