// @ts-nocheck
// Lightweight local metrics store for Fineme (client-only)
export const METRICS_KEY = 'glowup:metrics';

function load(){
  try{ const raw = localStorage.getItem(METRICS_KEY); const obj = raw? JSON.parse(raw):{}; return (obj && typeof obj==='object')? obj: {}; }catch{ return {}; }
}
function save(obj){ try{ localStorage.setItem(METRICS_KEY, JSON.stringify(obj)); }catch{} }

function dayStr(d){ const dt = (d instanceof Date)? d: new Date(d); return dt.toISOString().slice(0,10); }

export function recordEvent(type, payload={}){
  try{
    const now = new Date();
    const store = load();
    // raw events (optional, can grow): cap to last 5k events
    store.events = Array.isArray(store.events)? store.events: [];
    store.events.push({ t: now.toISOString(), type, ...payload });
    if(store.events.length > 5000) store.events.splice(0, store.events.length - 5000);
    // daily counters per type
    store.daily = store.daily || {};
    const ds = dayStr(now);
    store.daily[ds] = store.daily[ds] || {};
    store.daily[ds][type] = (store.daily[ds][type]||0) + 1;
    // specialized aggregations
    if(type === 'search' && payload.query){
      store.queries = store.queries || {};
      const q = String(payload.query||'').toLowerCase().trim();
      if(q){ store.queries[q] = (store.queries[q]||0) + 1; }
    }
    if(type === 'search_noresult' && payload.query){
      store.noresult = store.noresult || {};
      const q = String(payload.query||'').toLowerCase().trim();
      if(q){ store.noresult[q] = (store.noresult[q]||0) + 1; }
    }
    if(type === 'feature_view' && payload.featureId){
      store.featureViews = store.featureViews || {};
      const id = String(payload.featureId);
      store.featureViews[id] = (store.featureViews[id]||0) + 1;
    }
    save(store);
  }catch{}
}

export function getSummary({ days=7 }={}){
  const store = load();
  // KPI totals in last N days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (days-1));
  const totals = { searches:0, featureViews:0, adoptions:0, revisits:0 };
  const daily = [];
  for(let i=0;i<days;i++){
    const d = new Date(cutoff); d.setDate(cutoff.getDate()+i);
    const key = dayStr(d); const row = store.daily?.[key] || {};
    const s = row['search']||0, fv = row['feature_view']||0, ad = row['adoption']||0, rv = row['revisit']||0;
    totals.searches += s; totals.featureViews += fv; totals.adoptions += ad; totals.revisits += rv;
    daily.push({ day:key, search:s, featureView:fv, adoption:ad, revisit:rv });
  }
  // Top queries
  const topQueries = Object.entries(store.queries||{})
    .sort((a,b)=> b[1]-a[1]).slice(0,10).map(([k,v])=>({ query:k, count:v }));
  const topNoResult = Object.entries(store.noresult||{})
    .sort((a,b)=> b[1]-a[1]).slice(0,10).map(([k,v])=>({ query:k, count:v }));
  // Top features by views
  const topFeatures = Object.entries(store.featureViews||{})
    .sort((a,b)=> b[1]-a[1]).slice(0,10).map(([id,count])=>({ id, count }));
  // Ratios (naive placeholder)
  const adoptionRate = totals.searches? Math.round((totals.adoptions/Math.max(1,totals.searches))*100): 0;
  const revisitRate = Math.round((totals.revisits/Math.max(1, totals.featureViews))*100);
  // Return maps for detail rendering (e.g., low-performing features)
  const featureViewsMap = store.featureViews || {};
  return { totals, daily, topQueries, topNoResult, topFeatures, adoptionRate, revisitRate, featureViewsMap };
}

export function seedDemo(){
  // add pseudo data for last 10 days
  const store = load();
  const today = new Date();
  const featureIds = Object.keys(store.featureViews||{}); // existing
  const demoFeatures = featureIds.length? featureIds: ['demo-1','demo-2','demo-3'];
  const sampleQueries = ['前髪','小顔','就活','面接','婚活','垢抜け','透明感','眉','カット','メイク'];
  for(let i=0;i<10;i++){
    const d = new Date(today); d.setDate(today.getDate()-i);
    const ds = dayStr(d);
    store.daily = store.daily || {}; store.daily[ds] = store.daily[ds] || {};
    const searches = Math.floor(Math.random()*20)+5;
    const views = Math.floor(Math.random()*30)+10;
    const ad = Math.floor(searches*0.2);
    const rv = Math.floor(views*0.1);
    const nores = Math.floor(searches*0.15);
    store.daily[ds]['search'] = (store.daily[ds]['search']||0) + searches;
    store.daily[ds]['feature_view'] = (store.daily[ds]['feature_view']||0) + views;
    store.daily[ds]['adoption'] = (store.daily[ds]['adoption']||0) + ad;
    store.daily[ds]['revisit'] = (store.daily[ds]['revisit']||0) + rv;
    store.daily[ds]['search_noresult'] = (store.daily[ds]['search_noresult']||0) + nores;
    // queries
    store.queries = store.queries || {};
    store.noresult = store.noresult || {};
    // ensure events array
    store.events = Array.isArray(store.events)? store.events: [];
    for(let j=0;j<searches;j++){
      const q = sampleQueries[Math.floor(Math.random()*sampleQueries.length)];
      store.queries[q] = (store.queries[q]||0) + 1;
      // push a search event with query
      store.events.push({ t: new Date(d.getTime()+j*1000).toISOString(), type:'search', query:q });
    }
    for(let j=0;j<nores;j++){
      const q = sampleQueries[Math.floor(Math.random()*sampleQueries.length)];
      store.noresult[q] = (store.noresult[q]||0) + 1;
      store.events.push({ t: new Date(d.getTime()+j*1500).toISOString(), type:'search_noresult', query:q });
    }
    // feature views
    store.featureViews = store.featureViews || {};
    for(let k=0;k<views;k++){
      const fid = demoFeatures[Math.floor(Math.random()*demoFeatures.length)];
      store.featureViews[fid] = (store.featureViews[fid]||0) + 1;
      store.events.push({ t: new Date(d.getTime()+k*1200).toISOString(), type:'feature_view', featureId: fid });
    }
    for(let j=0;j<ad;j++){ store.events.push({ t: new Date(d.getTime()+j*800).toISOString(), type:'adoption' }); }
    for(let j=0;j<rv;j++){ store.events.push({ t: new Date(d.getTime()+j*600).toISOString(), type:'revisit' }); }
  }
  save(store);
}
