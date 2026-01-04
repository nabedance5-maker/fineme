// @ts-nocheck
import { getSummary, seedDemo } from './metrics.js';

function $(s, root=document){ return root.querySelector(s); }
function loadFeatures(){ try{ const raw = localStorage.getItem('glowup:features'); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }

function sparklineSVG(seriesList, { width=600, height=80, colors=['#2563eb','#10b981','#f59e0b'] }={}){
  const n = seriesList[0]?.length || 0; if(n===0) return '';
  const flat = seriesList.flat();
  const rawMax = flat.length? Math.max(...flat) : 0;
  // When all values are zero, show a muted baseline instead of empty graph
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
  const { totals, daily, topQueries, topNoResult, topFeatures, adoptionRate, revisitRate, featureViewsMap } = getSummary({ days: 7 });
  // KPI
  const set = (id, v)=>{ const el = document.getElementById(id); if(el) el.textContent = v; };
  set('kpi-searches', String(totals.searches||0));
  set('kpi-feature-views', String(totals.featureViews||0));
  set('kpi-adoption', `${adoptionRate||0}%`);
  set('kpi-revisit', `${revisitRate||0}%`);
  // Top features table (map id -> title from features storage)
  const features = loadFeatures();
  const map = new Map(features.map(f=> [f.id, f.title||'(無題)']));
  const tf = document.getElementById('dash-top-features');
  if(tf){
    tf.textContent='';
    if(!topFeatures.length){ const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tf.appendChild(tr); }
    else{
      topFeatures.forEach(item=>{
        const tr = document.createElement('tr');
        const nm = map.get(item.id) || item.id;
        tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${nm}</td>`+
                       `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${item.count}</td>`;
        tf.appendChild(tr);
      });
    }
  }
  // Top queries
  const tq = document.getElementById('dash-top-queries');
  if(tq){
    tq.textContent='';
    if(!topQueries.length){ const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tq.appendChild(tr); }
    else{
      topQueries.forEach(q=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${q.query}</td>`+
                       `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`;
        tq.appendChild(tr);
      });
    }
  }
  // No-result queries
  const tnr = document.getElementById('dash-noresult-queries');
  if(tnr){
    tnr.textContent='';
    if(!topNoResult?.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tnr.appendChild(tr); }
    else{
      topNoResult.forEach(q=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${q.query}</td>`+
                       `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${q.count}</td>`;
        tnr.appendChild(tr);
      });
    }
  }
  // Low-performing features (published, few views)
  const lowT = document.getElementById('dash-low-features');
  if(lowT){
    lowT.textContent='';
    const features = loadFeatures();
    const pubs = features.filter(f=> f.status==='published');
    const arr = pubs.map(f=> ({ id:f.id, title:f.title||'(無題)', count: Number(featureViewsMap?.[f.id]||0) }))
                    .sort((a,b)=> a.count - b.count)
                    .slice(0, Math.min(10, pubs.length));
    if(!arr.length){ const tr=document.createElement('tr'); tr.innerHTML='<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; lowT.appendChild(tr); }
    else{
      arr.forEach(it=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style=\"padding:8px; border-bottom:1px solid var(--color-border)\">${it.title}</td>`+
                       `<td style=\"padding:8px; border-bottom:1px solid var(--color-border); text-align:right\">${it.count}</td>`;
        lowT.appendChild(tr);
      });
    }
  }
  // Trend sparkline (search/adoption/revisit over last 7 days)
  const mount = document.getElementById('dash-spark');
  if(mount){
    const s = daily.map(d=> d.search||0);
    const a = daily.map(d=> d.adoption||0);
    const r = daily.map(d=> d.revisit||0);
    mount.innerHTML = sparklineSVG([s,a,r], { width:600, height:80, colors:['#2563eb','#10b981','#f59e0b'] });
  }
  // Tasks: drafts count
  const drafts = features.filter(f=> f.status==='draft').length;
  const tasks = document.getElementById('dash-tasks');
  if(tasks){
    tasks.textContent='';
    const li1 = document.createElement('li');
    li1.innerHTML = `<a class="svc-link" href="/pages/admin/features.html">下書き ${drafts} 件を確認する</a>`;
    tasks.appendChild(li1);
  }
}

function wire(){
  const btnSeed = document.getElementById('dash-seed-demo');
  if(btnSeed){ btnSeed.addEventListener('click', ()=>{ seedDemo(); render(); }); }
  const btnNew = document.getElementById('dash-new-feature');
  if(btnNew){ btnNew.addEventListener('click', ()=>{ location.href = '/pages/admin/features.html?id=new'; }); }
  const btnF = document.getElementById('dash-open-features');
  if(btnF){ btnF.addEventListener('click', ()=>{ location.href = '/pages/admin/features.html'; }); }
  const btnA = document.getElementById('dash-open-analytics');
  if(btnA){ btnA.addEventListener('click', ()=>{ location.href = '/pages/admin/analytics.html'; }); }
}

document.addEventListener('DOMContentLoaded', ()=>{ wire(); render(); });
