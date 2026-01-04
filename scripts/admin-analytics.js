// @ts-nocheck
import { getSummary, seedDemo, METRICS_KEY } from './metrics.js';

function $(s, root=document){ return root.querySelector(s); }
function loadFeatures(){ try{ const raw = localStorage.getItem('glowup:features'); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }
function loadMetrics(){ try{ const raw = localStorage.getItem(METRICS_KEY); return raw? JSON.parse(raw): {}; }catch{ return {}; } }

function sparklineSVG(seriesList, { width=800, height=120, colors=['#2563eb','#10b981','#f59e0b'] }={}){
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
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}</svg>`;
}

function render(){
  const days = Number($('#ana-range')?.value || 7);
  const { totals, daily, topQueries, topNoResult, topFeatures, adoptionRate, revisitRate, featureViewsMap } = getSummary({ days });
  // KPIs
  const set = (id, v)=>{ const el = document.getElementById(id); if(el) el.textContent = v; };
  set('ana-kpi-searches', String(totals.searches||0));
  set('ana-kpi-fv', String(totals.featureViews||0));
  set('ana-kpi-adoption', `${adoptionRate||0}%`);
  set('ana-kpi-revisit', `${revisitRate||0}%`);
  // Trend
  const mount = document.getElementById('ana-trend');
  if(mount){
    const s = daily.map(d=> d.search||0);
    const a = daily.map(d=> d.adoption||0);
    const r = daily.map(d=> d.revisit||0);
    mount.innerHTML = sparklineSVG([s,a,r], { width:800, height:120 });
  }
  // Top queries
  const tq = document.getElementById('ana-top-queries');
  if(tq){ tq.textContent=''; const rows = topQueries?.length? topQueries: []; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tq.appendChild(tr); } else {
    rows.forEach(q=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${q.query}</td>`+
      `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`; tq.appendChild(tr); }); }
  }
  // No-result queries
  const tnr = document.getElementById('ana-noresult-queries');
  if(tnr){ tnr.textContent=''; const rows = topNoResult?.length? topNoResult: []; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tnr.appendChild(tr); } else {
    rows.forEach(q=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${q.query}</td>`+
      `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`; tnr.appendChild(tr); }); }
  }
  // Features
  const feats = loadFeatures(); const mapTitle = new Map(feats.map(f=> [f.id, f.title||'(無題)']));
  const tf = document.getElementById('ana-top-features');
  if(tf){ tf.textContent=''; const rows = topFeatures?.length? topFeatures: []; if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tf.appendChild(tr); } else {
    rows.forEach(item=>{ const tr=document.createElement('tr'); const nm = mapTitle.get(item.id) || item.id; tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${nm}</td>`+
      `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${item.count}</td>`; tf.appendChild(tr); }); }
  }
  const low = document.getElementById('ana-low-features');
  if(low){ low.textContent=''; const pubs = feats.filter(f=> f.status==='published'); const rows = pubs.map(f=> ({ id:f.id, title:f.title||'(無題)', count:Number(featureViewsMap?.[f.id]||0) }))
    .sort((a,b)=> a.count-b.count).slice(0, Math.min(10, pubs.length)); if(!rows.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; low.appendChild(tr);} else {
      rows.forEach(it=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${it.title}</td>`+
        `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${it.count}</td>`; low.appendChild(tr); }); }
  }
  // Recent events (raw)
  const store = loadMetrics(); const evs = Array.isArray(store.events)? store.events: []; const recent = evs.slice(-100).reverse();
  const list = document.getElementById('ana-events'); if(list){ list.textContent=''; if(!recent.length){ const p=document.createElement('p'); p.className='muted'; p.textContent='イベントがありません'; list.appendChild(p);} else {
    recent.forEach(e=>{ const p=document.createElement('p'); p.className='muted'; p.textContent = `${e.t||''} | ${e.type||''}` + (e.query? ` | q=${e.query}`:'') + (e.featureId? ` | feature=${e.featureId}`:''); list.appendChild(p); }); }
  }
}

function wire(){
  const range = $('#ana-range'); if(range){ range.addEventListener('change', render); }
  const seed = $('#ana-seed'); if(seed){ seed.addEventListener('click', ()=>{ seedDemo(); render(); }); }
}

document.addEventListener('DOMContentLoaded', ()=>{ wire(); render(); });
