// @ts-nocheck
import { getSummary, seedDemo } from './metrics.js';
// GitHub Pages project base prefix
const PROJECT_BASE = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
// Prefer relative navigation when already under /pages/admin/
const ADMIN_BASE = (location.pathname && location.pathname.includes('/pages/admin/')) ? '.' : ((PROJECT_BASE || '') + '/pages/admin');

function $(s, root=document){ return root.querySelector(s); }
function loadFeatures(){ try{ const raw = localStorage.getItem('glowup:features'); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }

function sparklineSVG(seriesList, { width=600, height=80, colors=['#2563eb','#10b981','#f59e0b'], labels=[], seriesNames=[] }={}){
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
  const segW = width / Math.max(1,n);
  const overlays = Array.from({length:n}).map((_,i)=>{
    const parts = seriesList.map((arr, j)=> `${seriesNames[j]||`S${j+1}`}: ${arr[i]||0}`).join(' / ');
    const title = `${labels[i]||''} ${parts}`.trim();
    return `<rect x="${i*segW}" y="0" width="${segW}" height="${height}" fill="transparent"><title>${title}</title></rect>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}<g>${overlays}</g></svg>`;
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
    const labels = daily.map(d=> d.day||'');
    mount.innerHTML = sparklineSVG([s,a,r], { width:600, height:80, colors:['#2563eb','#10b981','#f59e0b'], labels, seriesNames:['検索','採用','再訪'] });
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

  // Type × Preference (fast/habit) mini card
  (function(){
    const mount = document.getElementById('dash-type-pref'); if(!mount) return;
    mount.textContent = '';
    // read latest diagnosis
    let typeId = ''; let typeName = '';
    try{ const raw = localStorage.getItem('fineme:diagnosis:latest'); const obj = raw? JSON.parse(raw):{}; typeId = obj?.step2?.classification?.type_id || obj?.intent?.type_id || ''; typeName = obj?.step2?.classification?.type_name || obj?.intent?.type_name || ''; }catch{}
    // infer preference from events
    function inferPref(){
      try{
        const raw = localStorage.getItem('glowup:metrics'); const store = raw? JSON.parse(raw):{}; const events = Array.isArray(store?.events)? store.events: [];
        const recent = events.slice(-500);
        const searches = recent.filter(e=> e.type==='search');
        const adoptions = recent.filter(e=> e.type==='adoption');
        if(!searches.length || !adoptions.length) return { fast:false, habit:false, medianMs:null, s:0, a:0 };
        const adTimes = adoptions.map(e=> new Date(e.t).getTime()).sort((a,b)=> a-b);
        const deltas = []; for(const s of searches){ const st=new Date(s.t).getTime(); const a=adTimes.find(t=> t>=st); if(a){ deltas.push(a-st); } }
        if(!deltas.length) return { fast:false, habit:false, medianMs:null, s:searches.length, a:adoptions.length };
        const median = deltas.sort((a,b)=> a-b)[Math.floor(deltas.length/2)];
        const oneDay = 24*60*60*1000;
        const fastPref = median <= oneDay;
        const qTokens = searches.map(s=> String(s.query||'').toLowerCase());
        const fastWords = qTokens.filter(q=> /短期|即|早|最短|プラン/.test(q)).length;
        const habitWords = qTokens.filter(q=> /習慣|続け|ルーティン|週次|継続/.test(q)).length;
        const habitPref = (!fastPref && habitWords>fastWords) || (median>oneDay);
        return { fast: fastPref, habit: habitPref, medianMs: median, s: searches.length, a: adoptions.length };
      }catch{ return { fast:false, habit:false, medianMs:null, s:0, a:0 }; }
    }
    const pref = inferPref();
    const badge = (text, color)=>{ const b=document.createElement('span'); b.textContent=text; b.style.display='inline-block'; b.style.padding='6px 10px'; b.style.borderRadius='999px'; b.style.fontSize='12px'; b.style.fontWeight='600'; b.style.background=color; b.style.color='#fff'; return b; };
    const row = document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.alignItems='center';
    if(typeName){ row.appendChild(badge(typeName, '#111')); } else { const m=document.createElement('span'); m.className='muted'; m.textContent='タイプ未設定（診断未保存）'; row.appendChild(m); }
    let prefLabel = 'バランス型'; let prefColor = '#64748b';
    if(pref.fast && !pref.habit){ prefLabel='即効性寄り'; prefColor='#10b981'; }
    else if(pref.habit && !pref.fast){ prefLabel='習慣化寄り'; prefColor='#2563eb'; }
    row.appendChild(badge(prefLabel, prefColor));
    mount.appendChild(row);
    const stats = document.createElement('div'); stats.className='muted'; stats.style.fontSize='12px';
    const medianText = (pref.medianMs!=null)? (()=>{ const d = Math.round(pref.medianMs/86400000); const h = Math.round(pref.medianMs/3600000); return d>0? `${d}日以内の採用中央値` : `${h}時間以内の採用中央値`; })() : '学習中（十分なイベントがありません）';
    stats.textContent = `${medianText}／検索 ${pref.s} ／ 採用 ${pref.a}`;
    mount.appendChild(stats);
  })();
}

function wire(){
  const btnSeed = document.getElementById('dash-seed-demo');
  if(btnSeed){ btnSeed.addEventListener('click', ()=>{ seedDemo(); render(); }); }
  const btnNew = document.getElementById('dash-new-feature');
  if(btnNew){ btnNew.addEventListener('click', ()=>{ location.href = ADMIN_BASE + '/features.html?id=new'; }); }
  const btnF = document.getElementById('dash-open-features');
  if(btnF){ btnF.addEventListener('click', ()=>{ location.href = ADMIN_BASE + '/features.html'; }); }
  const btnA = document.getElementById('dash-open-analytics');
  if(btnA){ btnA.addEventListener('click', ()=>{ location.href = ADMIN_BASE + '/analytics.html'; }); }
}

document.addEventListener('DOMContentLoaded', ()=>{ wire(); render(); });
