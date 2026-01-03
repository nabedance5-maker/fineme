// @ts-nocheck
// Simple localStorage-based CVR dashboard
function $(s,root=document){ return root.querySelector(s); }
function loadEvents(){ try{ const raw=localStorage.getItem('fineme:analytics'); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }
function groupByOrigin(events){ const map={}; for(const e of events){ const o = e.origin || 'unknown'; if(!map[o]) map[o] = { click_card:0, view_schedule:0, submit_request:0 }; const t = e.type; if(map[o][t]!==undefined) map[o][t]++; } return map; }
function renderFunnel(map){ const host = $('#funnel-host'); if(!host) return; const origins = Object.keys(map).sort(); if(origins.length===0){ host.innerHTML = '<p class="muted">イベントがありません。</p>'; return; }
  let html = '<table><thead><tr><th>起点</th><th>カードクリック</th><th>予約ページ閲覧</th><th>予約送信</th><th>CVR (閲覧→送信)</th></tr></thead><tbody>';
  for(const o of origins){ const m = map[o]; const c = m.click_card||0; const v = m.view_schedule||0; const s = m.submit_request||0; const cvr = v>0 ? Math.round((s/v)*100) : 0; html += `<tr><td>${o}</td><td>${c}</td><td>${v}</td><td>${s}</td><td>${cvr}%</td></tr>`; }
  html += '</tbody></table>';
  host.innerHTML = html;
}
function renderEvents(events){ const host = $('#events-host'); if(!host) return; const recent = events.slice(-50).reverse(); if(recent.length===0){ host.innerHTML = '<p class="muted">イベントがありません。</p>'; return; }
  const list = document.createElement('div'); list.className = 'stack'; list.style.gap = '6px';
  for(const e of recent){ const p=document.createElement('p'); p.className='muted'; p.textContent = `${e.ts||''} | ${e.type||''} | origin=${e.origin||''} | serviceId=${e.serviceId||''}`; list.appendChild(p); }
  host.innerHTML=''; host.appendChild(list);
}
(function init(){ const evts = loadEvents(); const map = groupByOrigin(evts); renderFunnel(map); renderEvents(evts); })();
