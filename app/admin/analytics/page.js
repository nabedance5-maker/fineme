'use client';
import { useEffect, useRef } from 'react';

export default function AdminAnalyticsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .admin-grid{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      .kpi-card{padding:16px;border:1px solid var(--color-border);border-radius:12px;background:#fff}
      .kpi-label{color:#6b7280;font-size:12px}
      .kpi-value{font-weight:800;font-size:24px}
      table{border-collapse:collapse;width:100%}
      th,td{border-bottom:1px solid var(--color-border);padding:8px;text-align:left}
      @media (max-width: 960px){ .kpi-grid{grid-template-columns:repeat(2,1fr)} }
    `;
    document.head.appendChild(style);

    const METRICS_KEY = 'glowup:metrics';
    function loadMetrics() { try { const raw = localStorage.getItem(METRICS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
    function loadFeatures() { try { const raw = localStorage.getItem('glowup:features'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }

    function seedDemo() {
      const store = loadMetrics();
      const events = Array.isArray(store.events) ? store.events : [];
      const queries = ['パーソナルジム', '眉毛サロン', 'ヘアサロン 渋谷', '骨格診断', '写真撮影 マッチング'];
      const features = ['feat-001', 'feat-002', 'feat-003'];
      const now = Date.now();
      const newEvents = [];
      for (let i = 0; i < 50; i++) {
        const t = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        const type = ['search', 'feature_view', 'adoption', 'revisit', 'search_noresult'][Math.floor(Math.random() * 5)];
        const ev = { t, type };
        if (type === 'search' || type === 'search_noresult') ev.query = queries[Math.floor(Math.random() * queries.length)];
        if (type === 'feature_view') ev.featureId = features[Math.floor(Math.random() * features.length)];
        newEvents.push(ev);
      }
      store.events = [...events, ...newEvents];
      try { localStorage.setItem(METRICS_KEY, JSON.stringify(store)); } catch {}
    }

    function sparklineSVG(seriesList, { width = 800, height = 120, colors = ['#2563eb', '#10b981', '#f59e0b'], labels = [], seriesNames = [] } = {}) {
      const n = seriesList[0]?.length || 0; if (n === 0) return '';
      const flat = seriesList.flat(); const rawMax = flat.length ? Math.max(...flat) : 0;
      if (rawMax === 0) {
        return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}"><line x1="0" y1="${height - 1}" x2="${width}" y2="${height - 1}" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="4 4" /></svg>`;
      }
      const max = Math.max(1, rawMax);
      const step = width / Math.max(1, n - 1);
      const toY = v => height - (v / max) * height;
      const paths = seriesList.map((arr, idx) => {
        const d = arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${toY(v)}`).join(' ');
        return `<path d="${d}" fill="none" stroke="${colors[idx % colors.length]}" stroke-width="2" />`;
      }).join('');
      const segW = width / Math.max(1, seriesList[0]?.length || 0);
      const overlays = Array.from({ length: seriesList[0]?.length || 0 }).map((_, i) => {
        const parts = seriesList.map((arr, j) => `${seriesNames[j] || `S${j + 1}`}: ${arr[i] || 0}`).join(' / ');
        const title = `${labels[i] || ''} ${parts}`.trim();
        return `<rect x="${i * segW}" y="0" width="${segW}" height="${height}" fill="transparent"><title>${title}</title></rect>`;
      }).join('');
      return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}<g>${overlays}</g></svg>`;
    }

    function withinDays(tsISO, days) { const t = new Date(tsISO).getTime(); const now = Date.now(); const cutoff = now - days * 24 * 60 * 60 * 1000; return t >= cutoff; }

    function periodStats(days) {
      const store = loadMetrics(); const events = Array.isArray(store.events) ? store.events : [];
      const period = events.filter(e => e.t && withinDays(e.t, days));
      const prev = events.filter(e => e.t && withinDays(e.t, days * 2) && !withinDays(e.t, days));
      const makeAgg = (arr) => {
        const counts = { search: 0, feature_view: 0, adoption: 0, revisit: 0, search_noresult: 0 };
        const byDay = new Map();
        const byHour = new Array(24).fill(0);
        const qMap = new Map(); const nrMap = new Map(); const fMap = new Map();
        for (const e of arr) {
          const type = e.type; if (counts[type] !== undefined) counts[type]++;
          const d = new Date(e.t); const key = d.toISOString().slice(0, 10);
          byDay.set(key, byDay.get(key) || { search: 0, feature_view: 0, adoption: 0, revisit: 0, search_noresult: 0 });
          const row = byDay.get(key); if (row[type] !== undefined) row[type]++;
          if (type === 'search' && e.query) { const k = String(e.query).toLowerCase(); qMap.set(k, (qMap.get(k) || 0) + 1); }
          if (type === 'search_noresult' && e.query) { const k = String(e.query).toLowerCase(); nrMap.set(k, (nrMap.get(k) || 0) + 1); }
          if (type === 'feature_view' && e.featureId) { const fid = String(e.featureId); fMap.set(fid, (fMap.get(fid) || 0) + 1); }
          if (type === 'search') { byHour[d.getHours()]++; }
        }
        const daysArr = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));
        const topQueries = Array.from(qMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([query, count]) => ({ query, count }));
        const topNoResult = Array.from(nrMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([query, count]) => ({ query, count }));
        const topFeatures = Array.from(fMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id, count]) => ({ id, count }));
        return { counts, daysArr, byHour, topQueries, topNoResult, topFeatures, featureViewsMap: Object.fromEntries(fMap) };
      };
      return { cur: makeAgg(period), prev: makeAgg(prev) };
    }

    function pctDelta(cur, prev) { if (prev <= 0 && cur > 0) return 100; if (prev === 0 && cur === 0) return 0; return Math.round(((cur - prev) / Math.max(1, prev)) * 100); }
    function badge(v) { const sign = v > 0 ? '+' : ''; const color = v > 0 ? '#16a34a' : (v < 0 ? '#dc2626' : '#6b7280'); return `<span style="margin-left:6px;color:${color};font-size:12px">${sign}${v}%</span>`; }

    function renderHeatmap(arr) {
      const host = document.getElementById('ana-heatmap'); if (!host) return; host.textContent = '';
      const max = Math.max(1, ...arr);
      for (let h = 0; h < 24; h++) { const v = arr[h] || 0; const alpha = Math.min(1, v / max); const cell = document.createElement('div'); cell.title = `${h}:00  ${v}`; cell.style.height = '28px'; cell.style.borderRadius = '6px'; cell.style.backgroundColor = `rgba(37,99,235,${alpha || 0.1})`; host.appendChild(cell); }
    }

    function renderFunnel(counts) {
      const host = document.getElementById('ana-funnel'); if (!host) return; host.textContent = '';
      const s = counts.search || 0, nr = counts.search_noresult || 0, fv = counts.feature_view || 0, ad = counts.adoption || 0, rv = counts.revisit || 0;
      const coverage = s > 0 ? Math.round(((s - nr) / s) * 100) : 0;
      const adoptRate = s > 0 ? Math.round((ad / Math.max(1, s)) * 100) : 0;
      const revisitRate = fv > 0 ? Math.round((rv / Math.max(1, fv)) * 100) : 0;
      const rows = [
        { label: '検索', value: s },
        { label: '結果あり', value: (s - nr), note: `カバレッジ ${coverage}%` },
        { label: '特集閲覧', value: fv },
        { label: '提案採用', value: ad, note: `率 ${adoptRate}%` },
        { label: '再訪', value: rv, note: `率 ${revisitRate}%` },
      ];
      rows.forEach(r => { const p = document.createElement('div'); p.style.display = 'flex'; p.style.alignItems = 'center'; p.style.justifyContent = 'space-between'; p.innerHTML = `<div>${r.label}</div><div><strong>${r.value}</strong>${r.note ? `<span class="muted" style="margin-left:8px">${r.note}</span>` : ''}</div>`; host.appendChild(p); });
    }

    function toCSV(rows, headers) { const esc = s => '"' + String(s ?? '').replace(/"/g, '""') + '"'; const head = headers.map(esc).join(','); const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n'); return head + '\n' + body; }
    function downloadCSV(filename, csv) { const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function sortRows(rows, type, keyLabel = 'query') { const arr = rows.slice(); if (type === 'count-asc') { arr.sort((a, b) => (a.count || 0) - (b.count || 0)); } else if (type === 'alpha') { arr.sort((a, b) => String(a[keyLabel] || '').localeCompare(String(b[keyLabel] || ''), 'ja')); } else { arr.sort((a, b) => (b.count || 0) - (a.count || 0)); } return arr; }

    function renderTableCollapsed(tbodyId, rows, columns, maxFirst = 10) {
      const host = document.getElementById(tbodyId); if (!host) return; host.textContent = '';
      if (!rows.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; host.appendChild(tr); return; }
      const top = rows.slice(0, maxFirst), rest = rows.slice(maxFirst);
      const renderRow = (r) => { const tr = document.createElement('tr'); tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${r[columns[0]]}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${r[columns[1]]}</td>`; return tr; };
      top.forEach(r => host.appendChild(renderRow(r)));
      if (rest.length) {
        const details = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 2;
        const det = document.createElement('details'); const sum = document.createElement('summary'); sum.textContent = `さらに表示（${rest.length}件）`; det.appendChild(sum);
        const inner = document.createElement('div'); inner.className = 'stack'; inner.style.gap = '4px'; inner.style.marginTop = '6px'; rest.forEach(r => inner.appendChild(renderRow(r))); det.appendChild(inner);
        td.appendChild(det); details.appendChild(td); host.appendChild(details);
      }
    }

    function render() {
      const days = Number(document.getElementById('ana-range')?.value || 7);
      const { cur, prev } = periodStats(days);
      const s = cur.counts.search || 0, fv = cur.counts.feature_view || 0, ad = cur.counts.adoption || 0, rv = cur.counts.revisit || 0;
      const sPrev = prev.counts.search || 0, fvPrev = prev.counts.feature_view || 0, adPrev = prev.counts.adoption || 0, rvPrev = prev.counts.revisit || 0;
      const adoptionRate = s ? Math.round((ad / Math.max(1, s)) * 100) : 0;
      const revisitRate = fv ? Math.round((rv / Math.max(1, fv)) * 100) : 0;
      const kpiSearches = document.getElementById('ana-kpi-searches');
      if (kpiSearches) kpiSearches.innerHTML = `${s}${badge(pctDelta(s, sPrev))}`;
      const kpiFv = document.getElementById('ana-kpi-fv');
      if (kpiFv) kpiFv.innerHTML = `${fv}${badge(pctDelta(fv, fvPrev))}`;
      const kpiAdoption = document.getElementById('ana-kpi-adoption');
      if (kpiAdoption) kpiAdoption.innerHTML = `${adoptionRate}%${badge(pctDelta(adoptionRate, (sPrev ? Math.round((adPrev / Math.max(1, sPrev)) * 100) : 0)))}`;
      const kpiRevisit = document.getElementById('ana-kpi-revisit');
      if (kpiRevisit) kpiRevisit.innerHTML = `${revisitRate}%${badge(pctDelta(revisitRate, (fvPrev ? Math.round((rvPrev / Math.max(1, fvPrev)) * 100) : 0)))}`;

      // Trend sparkline
      const mount = document.getElementById('ana-trend');
      if (mount) {
        const dayKeys = []; const now = new Date();
        for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); dayKeys.push(d.toISOString().slice(0, 10)); }
        const map = new Map(cur.daysArr.map(r => [r.day, r])); const sArr = [], aArr = [], rArr = [];
        dayKeys.forEach(k => { const row = map.get(k) || { search: 0, adoption: 0, revisit: 0 }; sArr.push(row.search || 0); aArr.push(row.adoption || 0); rArr.push(row.revisit || 0); });
        mount.innerHTML = sparklineSVG([sArr, aArr, rArr], { width: 800, height: 120, labels: dayKeys, seriesNames: ['検索', '採用', '再訪'] });
      }

      renderHeatmap(cur.byHour);
      const orderQ = document.getElementById('ana-sort-queries')?.value || 'count-desc';
      renderTableCollapsed('ana-top-queries', sortRows(cur.topQueries, orderQ, 'query'), ['query', 'count']);
      const orderNR = document.getElementById('ana-sort-noresult')?.value || 'count-desc';
      renderTableCollapsed('ana-noresult-queries', sortRows(cur.topNoResult, orderNR, 'query'), ['query', 'count']);

      const feats = loadFeatures(); const mapTitle = new Map(feats.map(f => [f.id, f.title || '(無題)']));
      const orderF = document.getElementById('ana-sort-features')?.value || 'count-desc';
      const rowsF = cur.topFeatures.map(it => ({ title: (mapTitle.get(it.id) || it.id), count: it.count }));
      renderTableCollapsed('ana-top-features', (orderF === 'alpha' ? rowsF.sort((a, b) => String(a.title).localeCompare(String(b.title), 'ja')) : (orderF === 'count-asc' ? rowsF.sort((a, b) => a.count - b.count) : rowsF.sort((a, b) => b.count - a.count))), ['title', 'count']);

      const low = document.getElementById('ana-low-features');
      if (low) {
        low.textContent = '';
        const pubs = feats.filter(f => f.status === 'published');
        const rows = pubs.map(f => ({ id: f.id, title: f.title || '(無題)', count: Number(cur.featureViewsMap?.[f.id] || 0) })).sort((a, b) => a.count - b.count).slice(0, Math.min(10, pubs.length));
        if (!rows.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; low.appendChild(tr); }
        else { rows.forEach(it => { const tr = document.createElement('tr'); tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${it.title}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${it.count}</td>`; low.appendChild(tr); }); }
      }

      renderFunnel(cur.counts);

      const list = document.getElementById('ana-events');
      if (list) {
        const store = loadMetrics();
        const evs = Array.isArray(store.events) ? store.events : [];
        const recent = evs.filter(e => e.t && withinDays(e.t, days)).slice(-100).reverse();
        list.textContent = '';
        if (!recent.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'イベントがありません'; list.appendChild(p); }
        else {
          const top = recent.slice(0, 10); const rest = recent.slice(10);
          const topList = document.createElement('div'); topList.className = 'stack'; topList.style.gap = '6px';
          top.forEach(e => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = `${e.t || ''} | ${e.type || ''}` + (e.query ? ` | q=${e.query}` : '') + (e.featureId ? ` | feature=${e.featureId}` : ''); topList.appendChild(p); });
          list.appendChild(topList);
          if (rest.length) {
            const details = document.createElement('details'); details.style.marginTop = '6px';
            const summary = document.createElement('summary'); summary.textContent = `さらに表示（${rest.length}件）`; details.appendChild(summary);
            const more = document.createElement('div'); more.className = 'stack'; more.style.gap = '6px'; more.style.marginTop = '6px';
            rest.forEach(e => { const p = document.createElement('p'); p.className = 'muted'; p.textContent = `${e.t || ''} | ${e.type || ''}` + (e.query ? ` | q=${e.query}` : '') + (e.featureId ? ` | feature=${e.featureId}` : ''); more.appendChild(p); });
            details.appendChild(more); list.appendChild(details);
          }
        }
      }

      // Exports
      const btnQ = document.getElementById('ana-export-queries'); if (btnQ) { btnQ.onclick = () => { const csv = toCSV(cur.topQueries, ['query', 'count']); downloadCSV(`queries_${days}d.csv`, csv); }; }
      const btnN = document.getElementById('ana-export-noresult'); if (btnN) { btnN.onclick = () => { const csv = toCSV(cur.topNoResult, ['query', 'count']); downloadCSV(`noresult_${days}d.csv`, csv); }; }
      const btnF = document.getElementById('ana-export-features'); if (btnF) { btnF.onclick = () => { const rows = cur.topFeatures.map(r => ({ title: (mapTitle.get(r.id) || r.id), count: r.count })); const csv = toCSV(rows, ['title', 'count']); downloadCSV(`features_${days}d.csv`, csv); }; }
    }

    function wire() {
      const range = document.getElementById('ana-range'); if (range) range.addEventListener('change', render);
      const seed = document.getElementById('ana-seed'); if (seed) seed.addEventListener('click', () => { seedDemo(); render(); });
      const sortQ = document.getElementById('ana-sort-queries'); if (sortQ) sortQ.addEventListener('change', render);
      const sortNR = document.getElementById('ana-sort-noresult'); if (sortNR) sortNR.addEventListener('change', render);
      const sortF = document.getElementById('ana-sort-features'); if (sortF) sortF.addEventListener('change', render);
    }

    wire();
    render();

    return () => {
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  return (
    <main className="section">
      <div className="container admin-grid">
        <section className="stack">
          <h1 className="section-title">分析</h1>
          <div className="card" style={{padding:'12px',display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
            <label className="muted">期間</label>
            <select id="ana-range" className="input" style={{width:'auto'}}>
              <option value="7">直近7日</option>
              <option value="30">直近30日</option>
              <option value="90">直近90日</option>
            </select>
            <div className="spacer"></div>
            <button className="btn btn-ghost" id="ana-seed">デモデータ投入</button>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">相談（検索）</div><div id="ana-kpi-searches" className="kpi-value">0</div></div>
            <div className="kpi-card"><div className="kpi-label">提案採用率</div><div id="ana-kpi-adoption" className="kpi-value">0%</div></div>
            <div className="kpi-card"><div className="kpi-label">再指名率</div><div id="ana-kpi-revisit" className="kpi-value">0%</div></div>
            <div className="kpi-card"><div className="kpi-label">特集閲覧</div><div id="ana-kpi-fv" className="kpi-value">0</div></div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>コンバージョンファネル</h2>
            <div id="ana-funnel" className="stack" style={{gap:'8px',marginTop:'8px'}}></div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>トレンド</h2>
              <div className="muted" style={{display:'flex',gap:'12px',alignItems:'center',fontSize:'12px'}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#2563eb',display:'inline-block'}}></span>検索</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#10b981',display:'inline-block'}}></span>採用</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#f59e0b',display:'inline-block'}}></span>再訪</span>
              </div>
            </div>
            <div id="ana-trend" style={{marginTop:'8px',width:'100%',overflow:'hidden'}}></div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>時間帯ヒートマップ（検索）</h2>
            <div id="ana-heatmap" style={{display:'grid',gridTemplateColumns:'repeat(24,1fr)',gap:'4px',marginTop:'8px'}}></div>
            <div className="muted" style={{fontSize:'12px',marginTop:'6px'}}>0時〜23時の合計件数を色の濃さで表示</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="card" style={{padding:'12px'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>トップ検索</h2>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginTop:'4px'}}>
                <label className="muted">並び替え</label>
                <select id="ana-sort-queries" className="input" style={{width:'auto'}}>
                  <option value="count-desc">件数降順</option>
                  <option value="count-asc">件数昇順</option>
                  <option value="alpha">五十音順</option>
                </select>
                <button className="btn btn-ghost" id="ana-export-queries">CSVエクスポート</button>
              </div>
              <table style={{width:'100%',marginTop:'8px'}}>
                <thead><tr><th>キーワード</th><th style={{textAlign:'right'}}>回数</th></tr></thead>
                <tbody id="ana-top-queries"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
              <h3 className="section-title" style={{fontSize:'16px',margin:'12px 0 4px'}}>無結果ワード</h3>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginTop:'4px'}}>
                <label className="muted">並び替え</label>
                <select id="ana-sort-noresult" className="input" style={{width:'auto'}}>
                  <option value="count-desc">件数降順</option>
                  <option value="count-asc">件数昇順</option>
                  <option value="alpha">五十音順</option>
                </select>
                <button className="btn btn-ghost" id="ana-export-noresult">CSVエクスポート</button>
              </div>
              <table style={{width:'100%',marginTop:'4px'}}>
                <thead><tr><th>キーワード</th><th style={{textAlign:'right'}}>回数</th></tr></thead>
                <tbody id="ana-noresult-queries"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
            </div>
            <div className="card" style={{padding:'12px'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>特集性能</h2>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginTop:'4px'}}>
                <label className="muted">並び替え</label>
                <select id="ana-sort-features" className="input" style={{width:'auto'}}>
                  <option value="count-desc">閲覧降順</option>
                  <option value="count-asc">閲覧昇順</option>
                  <option value="alpha">五十音順</option>
                </select>
                <button className="btn btn-ghost" id="ana-export-features">CSVエクスポート</button>
              </div>
              <table style={{width:'100%',marginTop:'8px'}}>
                <thead><tr><th>特集</th><th style={{textAlign:'right'}}>閲覧</th></tr></thead>
                <tbody id="ana-top-features"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
              <h3 className="section-title" style={{fontSize:'16px',margin:'12px 0 4px'}}>要改善（閲覧が少ない）</h3>
              <table style={{width:'100%',marginTop:'4px'}}>
                <thead><tr><th>特集</th><th style={{textAlign:'right'}}>閲覧</th></tr></thead>
                <tbody id="ana-low-features"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
            </div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>最近のイベント</h2>
            <div id="ana-events" className="stack" style={{gap:'6px',marginTop:'8px'}}></div>
          </div>
        </section>
      </div>
    </main>
  );
}
