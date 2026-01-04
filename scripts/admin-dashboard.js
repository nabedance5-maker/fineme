// @ts-nocheck
import { getSummary, seedDemo } from './metrics.js';

function $(s, root=document){ return root.querySelector(s); }
function loadFeatures(){ try{ const raw = localStorage.getItem('glowup:features'); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }

function render(){
  const { totals, topQueries, topFeatures, adoptionRate, revisitRate } = getSummary({ days: 7 });
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
