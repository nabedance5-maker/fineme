// @ts-nocheck
import { getSummary, seedDemo, METRICS_KEY } from './metrics.js';

function $(s, root=document){ return root.querySelector(s); }
function loadFeatures(){ try{ const raw = localStorage.getItem('glowup:features'); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }
function loadMetrics(){ try{ const raw = localStorage.getItem(METRICS_KEY); return raw? JSON.parse(raw): {}; }catch{ return {}; } }

function sparklineSVG(seriesList, { width=800, height=120, colors=['#2563eb','#10b981','#f59e0b'], labels=[], seriesNames=[] }={}){
  const n = seriesList[0]?.length || 0; if(n===0) return '';
  const flat = seriesList.flat(); const rawMax = flat.length? Math.max(...flat):0;
  if(rawMax === 0){
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      <line x1="0" y1="${height-1}" x2="${width}" y2="${height-1}" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="4 4" />
    </svg>`;
  }
  const max = Math.max(1, rawMax);
  const step = width / Math.max(1, n-1);
  const toY = v => height - (v/max)*height;
  const paths = seriesList.map((arr, idx)=>{
    const d = arr.map((v,i)=> `${i===0?'M':'L'} ${i*step} ${toY(v)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${colors[idx%colors.length]}" stroke-width="2" />`;
  }).join('');
  const segW = width / Math.max(1, (seriesList[0]?.length||0));
  const overlays = Array.from({length:(seriesList[0]?.length||0)}).map((_,i)=>{
    const parts = seriesList.map((arr, j)=> `${seriesNames[j]||`S${j+1}`}: ${arr[i]||0}`).join(' / ');
    const title = `${labels[i]||''} ${parts}`.trim();
    return `<rect x="${i*segW}" y="0" width="${segW}" height="${height}" fill="transparent"><title>${title}</title></rect>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}<g>${overlays}</g></svg>`;
}

function withinDays(tsISO, days){ const t = new Date(tsISO).getTime(); const now = Date.now(); const cutoff = now - days*24*60*60*1000; return t >= cutoff; }
function periodStats(days){
  const store = loadMetrics(); const events = Array.isArray(store.events)? store.events: [];
  const period = events.filter(e=> e.t && withinDays(e.t, days));
  const prev = events.filter(e=> e.t && withinDays(e.t, days*2) && !withinDays(e.t, days));
  const makeAgg = (arr)=>{
    const counts = { search:0, feature_view:0, adoption:0, revisit:0, search_noresult:0 };
    const byDay = new Map();
    const byHour = new Array(24).fill(0);
    const qMap = new Map(); const nrMap = new Map(); const fMap = new Map();
    for(const e of arr){
      const type = e.type; if(counts[type]!==undefined) counts[type]++;
      const d = new Date(e.t); const key = d.toISOString().slice(0,10);
      byDay.set(key, byDay.get(key)||{ search:0, feature_view:0, adoption:0, revisit:0, search_noresult:0 });
      const row = byDay.get(key); if(row[type]!==undefined) row[type]++;
      if(type==='search' && e.query){ const k=String(e.query).toLowerCase(); qMap.set(k, (qMap.get(k)||0)+1); }
      if(type==='search_noresult' && e.query){ const k=String(e.query).toLowerCase(); nrMap.set(k, (nrMap.get(k)||0)+1); }
      if(type==='feature_view' && e.featureId){ const fid=String(e.featureId); fMap.set(fid, (fMap.get(fid)||0)+1); }
      if(type==='search'){ byHour[d.getHours()]++; }
    }
    const daysArr = Array.from(byDay.entries()).sort(([a],[b])=> a.localeCompare(b)).map(([day,v])=> ({ day, ...v }));
    const topQueries = Array.from(qMap.entries()).sort((a,b)=> b[1]-a[1]).slice(0,20).map(([query,count])=>({query,count}));
    const topNoResult = Array.from(nrMap.entries()).sort((a,b)=> b[1]-a[1]).slice(0,20).map(([query,count])=>({query,count}));
    const topFeatures = Array.from(fMap.entries()).sort((a,b)=> b[1]-a[1]).slice(0,20).map(([id,count])=>({id,count}));
    return { counts, daysArr, byHour, topQueries, topNoResult, topFeatures, featureViewsMap: Object.fromEntries(fMap) };
  };
  return { cur: makeAgg(period), prev: makeAgg(prev) };
}

function pctDelta(cur, prev){ if(prev<=0 && cur>0) return 100; if(prev===0 && cur===0) return 0; return Math.round(((cur - prev)/Math.max(1, prev))*100); }
function badge(v){ const sign = v>0? '+':''; const color = v>0? '#16a34a': (v<0? '#dc2626':'#6b7280'); return `<span style="margin-left:6px;color:${color};font-size:12px">${sign}${v}%</span>`; }

function renderHeatmap(arr){ const host = document.getElementById('ana-heatmap'); if(!host) return; host.textContent=''; const max = Math.max(1, ...arr); for(let h=0; h<24; h++){ const v = arr[h]||0; const alpha = Math.min(1, v/max);
  const cell = document.createElement('div'); cell.title = `${h}:00  ${v}`; cell.style.height='28px'; cell.style.borderRadius='6px'; cell.style.backgroundColor = `rgba(37,99,235,${alpha||0.1})`; host.appendChild(cell); }
}

function renderFunnel(counts){ const host = document.getElementById('ana-funnel'); if(!host) return; host.textContent='';
  const s = counts.search||0, nr = counts.search_noresult||0, fv = counts.feature_view||0, ad = counts.adoption||0, rv = counts.revisit||0;
  const coverage = s>0? Math.round(((s - nr)/s)*100): 0;
  const adoptRate = s>0? Math.round((ad/Math.max(1,s))*100): 0;
  const revisitRate = fv>0? Math.round((rv/Math.max(1,fv))*100): 0;
  const rows = [
    { label:'検索', value:s },
    { label:'結果あり', value:(s-nr), note:`カバレッジ ${coverage}%` },
    { label:'特集閲覧', value:fv },
    { label:'提案採用', value:ad, note:`率 ${adoptRate}%` },
    { label:'再訪', value:rv, note:`率 ${revisitRate}%` },
  ];
  rows.forEach(r=>{ const p=document.createElement('div'); p.style.display='flex'; p.style.alignItems='center'; p.style.justifyContent='space-between'; p.innerHTML = `<div>${r.label}</div><div><strong>${r.value}</strong>${r.note? `<span class=\"muted\" style=\"margin-left:8px\">${r.note}</span>`:''}</div>`; host.appendChild(p); });
}

function toCSV(rows, headers){ const esc = s=> '"'+String(s??'').replace(/"/g,'""')+'"'; const head = headers.map(esc).join(','); const body = rows.map(r=> headers.map(h=> esc(r[h])).join(',')).join('\n'); return head+'\n'+body; }
function downloadCSV(filename, csv){ const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

function render(){
  const days = Number($('#ana-range')?.value || 7);
  const { cur, prev } = periodStats(days);
  // KPIs + deltas
  const set = (id, v, deltaId)=>{ const el = document.getElementById(id); if(el){ el.textContent = v; if(deltaId){ const dEl = document.getElementById(deltaId); if(dEl) dEl.innerHTML = ''; } } };
  const s = cur.counts.search||0, fv = cur.counts.feature_view||0, ad = cur.counts.adoption||0, rv = cur.counts.revisit||0, nr = cur.counts.search_noresult||0;
  const sPrev = prev.counts.search||0, fvPrev = prev.counts.feature_view||0, adPrev = prev.counts.adoption||0, rvPrev = prev.counts.revisit||0;
  const adoptionRate = s? Math.round((ad/Math.max(1,s))*100): 0;
  const revisitRate = fv? Math.round((rv/Math.max(1,fv))*100): 0;
  document.getElementById('ana-kpi-searches').innerHTML = `${s}${badge(pctDelta(s, sPrev))}`;
  document.getElementById('ana-kpi-fv').innerHTML = `${fv}${badge(pctDelta(fv, fvPrev))}`;
  document.getElementById('ana-kpi-adoption').innerHTML = `${adoptionRate}%${badge(pctDelta(adoptionRate, (sPrev? Math.round((adPrev/Math.max(1,sPrev))*100): 0)))}`;
  document.getElementById('ana-kpi-revisit').innerHTML = `${revisitRate}%${badge(pctDelta(revisitRate, (fvPrev? Math.round((rvPrev/Math.max(1,fvPrev))*100): 0)))}`;
  // Trend sparkline
  const mount = document.getElementById('ana-trend'); if(mount){
    // Build ordered by last N days
    const dayKeys = []; const now = new Date(); for(let i=days-1;i>=0;i--){ const d = new Date(now); d.setDate(now.getDate()-i); dayKeys.push(d.toISOString().slice(0,10)); }
    const map = new Map(cur.daysArr.map(r=> [r.day, r])); const sArr = [], aArr = [], rArr = [];
    dayKeys.forEach(k=>{ const row = map.get(k)||{search:0,adoption:0,revisit:0}; sArr.push(row.search||0); aArr.push(row.adoption||0); rArr.push(row.revisit||0); });
    mount.innerHTML = sparklineSVG([sArr, aArr, rArr], { width:800, height:120, labels: dayKeys, seriesNames:['検索','採用','再訪'] });
  }
  // Heatmap
  renderHeatmap(cur.byHour);
  // Top queries (period)
  const tq = document.getElementById('ana-top-queries'); if(tq){ tq.textContent=''; const rows = cur.topQueries; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tq.appendChild(tr);} else { rows.forEach(q=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${q.query}</td>`+
    `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`; tq.appendChild(tr); }); } }
  // No-result queries (period)
  const tnr = document.getElementById('ana-noresult-queries'); if(tnr){ tnr.textContent=''; const rows = cur.topNoResult; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tnr.appendChild(tr);} else { rows.forEach(q=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${q.query}</td>`+
    `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`; tnr.appendChild(tr); }); } }
  // Features (period counts from events)
  const feats = loadFeatures(); const mapTitle = new Map(feats.map(f=> [f.id, f.title||'(無題)']));
  const tf = document.getElementById('ana-top-features'); if(tf){ tf.textContent=''; const rows = cur.topFeatures; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tf.appendChild(tr);} else { rows.forEach(item=>{ const tr=document.createElement('tr'); const nm = mapTitle.get(item.id) || item.id; tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${nm}</td>`+
    `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${item.count}</td>`; tf.appendChild(tr); }); } }
  const low = document.getElementById('ana-low-features'); if(low){ low.textContent=''; const pubs = feats.filter(f=> f.status==='published'); const rows = pubs.map(f=> ({ id:f.id, title:f.title||'(無題)', count:Number(cur.featureViewsMap?.[f.id]||0) })).sort((a,b)=> a.count-b.count).slice(0, Math.min(10, pubs.length)); if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; low.appendChild(tr);} else { rows.forEach(it=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${it.title}</td>`+
    `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${it.count}</td>`; low.appendChild(tr); }); } }
  // Funnel
  renderFunnel(cur.counts);
  // Recent events (period)
  const list = document.getElementById('ana-events');
  if(list){
    const store = loadMetrics();
    const evs = Array.isArray(store.events)? store.events: [];
    const recent = evs.filter(e=> e.t && withinDays(e.t, days)).slice(-100).reverse();
    list.textContent='';
    if(!recent.length){
      const p=document.createElement('p'); p.className='muted'; p.textContent='イベントがありません'; list.appendChild(p);
    } else {
      const top = recent.slice(0,10);
      const rest = recent.slice(10);
      const topList = document.createElement('div'); topList.className='stack'; topList.style.gap='6px';
      top.forEach(e=>{ const p=document.createElement('p'); p.className='muted'; p.textContent = `${e.t||''} | ${e.type||''}` + (e.query? ` | q=${e.query}`:'') + (e.featureId? ` | feature=${e.featureId}`:''); topList.appendChild(p); });
      list.appendChild(topList);
      if(rest.length){
        const details = document.createElement('details');
        details.style.marginTop = '6px';
        const summary = document.createElement('summary'); summary.textContent = `さらに表示（${rest.length}件）`;
        details.appendChild(summary);
        const more = document.createElement('div'); more.className='stack'; more.style.gap='6px'; more.style.marginTop='6px';
        rest.forEach(e=>{ const p=document.createElement('p'); p.className='muted'; p.textContent = `${e.t||''} | ${e.type||''}` + (e.query? ` | q=${e.query}`:'') + (e.featureId? ` | feature=${e.featureId}`:''); more.appendChild(p); });
        details.appendChild(more);
        list.appendChild(details);
      }
    }
  }
  // Exports
  const btnQ = document.getElementById('ana-export-queries'); if(btnQ){ btnQ.onclick = ()=>{ const csv = toCSV(cur.topQueries, ['query','count']); downloadCSV(`queries_${days}d.csv`, csv); } };
  const btnN = document.getElementById('ana-export-noresult'); if(btnN){ btnN.onclick = ()=>{ const csv = toCSV(cur.topNoResult, ['query','count']); downloadCSV(`noresult_${days}d.csv`, csv); } };
  const btnF = document.getElementById('ana-export-features'); if(btnF){ btnF.onclick = ()=>{ const rows = cur.topFeatures.map(r=> ({ title: (mapTitle.get(r.id)||r.id), count: r.count })); const csv = toCSV(rows, ['title','count']); downloadCSV(`features_${days}d.csv`, csv); } };
}

function wire(){
  const range = $('#ana-range'); if(range){ range.addEventListener('change', render); }
  const seed = $('#ana-seed'); if(seed){ seed.addEventListener('click', ()=>{ seedDemo(); render(); }); }
}

document.addEventListener('DOMContentLoaded', ()=>{ wire(); render(); });
