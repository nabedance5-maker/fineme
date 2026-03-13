'use client';
import { useEffect, useRef } from 'react';

export default function AdminDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .admin-grid{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start}
      .kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
      .kpi-card{padding:16px;border:1px solid var(--color-border);border-radius:12px;background:#fff}
      .kpi-label{color:#6b7280;font-size:12px}
      .kpi-value{font-weight:800;font-size:24px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      @media (max-width: 960px){ .kpi-grid{grid-template-columns:repeat(2,1fr)} .two-col{grid-template-columns:1fr} }
    `;
    document.head.appendChild(style);

    // ─── Metrics helpers (inline version of metrics.js getSummary/seedDemo) ───
    const METRICS_KEY = 'glowup:metrics';

    function loadMetricsStore() {
      try { const raw = localStorage.getItem(METRICS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }

    function getSummary({ days = 7 } = {}) {
      const store = loadMetricsStore();
      const events = Array.isArray(store.events) ? store.events : [];
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      const period = events.filter(e => e.t && new Date(e.t).getTime() >= cutoff);
      const totals = { searches: 0, featureViews: 0, adoptions: 0, revisits: 0 };
      const qMap = new Map(); const nrMap = new Map(); const fMap = new Map();
      const dayMap = new Map();
      for (const e of period) {
        if (e.type === 'search') { totals.searches++; if (e.query) { const k = String(e.query).toLowerCase(); qMap.set(k, (qMap.get(k) || 0) + 1); } }
        if (e.type === 'feature_view') { totals.featureViews++; if (e.featureId) { const fid = String(e.featureId); fMap.set(fid, (fMap.get(fid) || 0) + 1); } }
        if (e.type === 'adoption') totals.adoptions++;
        if (e.type === 'revisit') totals.revisits++;
        if (e.type === 'search_noresult' && e.query) { const k = String(e.query).toLowerCase(); nrMap.set(k, (nrMap.get(k) || 0) + 1); }
        const dayKey = new Date(e.t).toISOString().slice(0, 10);
        const row = dayMap.get(dayKey) || { search: 0, adoption: 0, revisit: 0 };
        if (e.type === 'search') row.search++;
        if (e.type === 'adoption') row.adoption++;
        if (e.type === 'revisit') row.revisit++;
        dayMap.set(dayKey, row);
      }
      const dayKeys = [];
      for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); dayKeys.push(d.toISOString().slice(0, 10)); }
      const daily = dayKeys.map(day => { const r = dayMap.get(day) || {}; return { day, search: r.search || 0, adoption: r.adoption || 0, revisit: r.revisit || 0 }; });
      const adoptionRate = totals.searches > 0 ? Math.round((totals.adoptions / totals.searches) * 100) : 0;
      const revisitRate = totals.featureViews > 0 ? Math.round((totals.revisits / totals.featureViews) * 100) : 0;
      const topQueries = Array.from(qMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));
      const topNoResult = Array.from(nrMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([query, count]) => ({ query, count }));
      const topFeatures = Array.from(fMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ id, count }));
      const featureViewsMap = Object.fromEntries(fMap);
      return { totals, daily, topQueries, topNoResult, topFeatures, adoptionRate, revisitRate, featureViewsMap };
    }

    function seedDemo() {
      const store = loadMetricsStore();
      const events = Array.isArray(store.events) ? store.events : [];
      const queries = ['パーソナルジム', '眉毛サロン', 'ヘアサロン 渋谷', '骨格診断', '写真撮影 マッチング'];
      const features = ['feat-001', 'feat-002', 'feat-003'];
      const now = Date.now();
      const newEvents = [];
      for (let i = 0; i < 50; i++) {
        const t = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
        const type = ['search', 'feature_view', 'adoption', 'revisit', 'search_noresult'][Math.floor(Math.random() * 5)];
        const ev = { t, type };
        if (type === 'search' || type === 'search_noresult') ev.query = queries[Math.floor(Math.random() * queries.length)];
        if (type === 'feature_view') ev.featureId = features[Math.floor(Math.random() * features.length)];
        newEvents.push(ev);
      }
      store.events = [...events, ...newEvents];
      try { localStorage.setItem(METRICS_KEY, JSON.stringify(store)); } catch {}
    }

    function loadFeatures() {
      try { const raw = localStorage.getItem('glowup:features'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }

    function sparklineSVG(seriesList, { width = 600, height = 80, colors = ['#2563eb', '#10b981', '#f59e0b'], labels = [], seriesNames = [] } = {}) {
      const n = seriesList[0]?.length || 0; if (n === 0) return '';
      const flat = seriesList.flat();
      const rawMax = flat.length ? Math.max(...flat) : 0;
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
      const segW = width / Math.max(1, n);
      const overlays = Array.from({ length: n }).map((_, i) => {
        const parts = seriesList.map((arr, j) => `${seriesNames[j] || `S${j + 1}`}: ${arr[i] || 0}`).join(' / ');
        const title = `${labels[i] || ''} ${parts}`.trim();
        return `<rect x="${i * segW}" y="0" width="${segW}" height="${height}" fill="transparent"><title>${title}</title></rect>`;
      }).join('');
      return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${paths}<g>${overlays}</g></svg>`;
    }

    function render() {
      const { totals, daily, topQueries, topNoResult, topFeatures, adoptionRate, revisitRate, featureViewsMap } = getSummary({ days: 7 });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('kpi-searches', String(totals.searches || 0));
      set('kpi-feature-views', String(totals.featureViews || 0));
      set('kpi-adoption', `${adoptionRate || 0}%`);
      set('kpi-revisit', `${revisitRate || 0}%`);

      try {
        const raw = localStorage.getItem('fineme:provider:inquiries');
        const arr = raw ? JSON.parse(raw) : [];
        const pending = Array.isArray(arr) ? arr.filter(it => (it?.status || 'new') !== 'done').length : 0;
        set('kpi-inquiries-pending', String(pending));
      } catch { set('kpi-inquiries-pending', '0'); }

      const features = loadFeatures();
      const map = new Map(features.map(f => [f.id, f.title || '(無題)']));
      const tf = document.getElementById('dash-top-features');
      if (tf) {
        tf.textContent = '';
        if (!topFeatures.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tf.appendChild(tr); }
        else {
          topFeatures.forEach(item => {
            const tr = document.createElement('tr');
            const nm = map.get(item.id) || item.id;
            tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${nm}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${item.count}</td>`;
            tf.appendChild(tr);
          });
        }
      }

      const tq = document.getElementById('dash-top-queries');
      if (tq) {
        tq.textContent = '';
        if (!topQueries.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tq.appendChild(tr); }
        else {
          topQueries.forEach(q => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${q.query}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${q.count}</td>`;
            tq.appendChild(tr);
          });
        }
      }

      const tnr = document.getElementById('dash-noresult-queries');
      if (tnr) {
        tnr.textContent = '';
        if (!topNoResult?.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; tnr.appendChild(tr); }
        else {
          topNoResult.forEach(q => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${q.query}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${q.count}</td>`;
            tnr.appendChild(tr);
          });
        }
      }

      const lowT = document.getElementById('dash-low-features');
      if (lowT) {
        lowT.textContent = '';
        const pubs = features.filter(f => f.status === 'published');
        const arr = pubs.map(f => ({ id: f.id, title: f.title || '(無題)', count: Number(featureViewsMap?.[f.id] || 0) }))
          .sort((a, b) => a.count - b.count).slice(0, Math.min(10, pubs.length));
        if (!arr.length) { const tr = document.createElement('tr'); tr.innerHTML = '<td style="padding:8px" colspan="2" class="muted">データがありません</td>'; lowT.appendChild(tr); }
        else {
          arr.forEach(it => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:8px; border-bottom:1px solid var(--color-border)">${it.title}</td><td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right">${it.count}</td>`;
            lowT.appendChild(tr);
          });
        }
      }

      const mount = document.getElementById('dash-spark');
      if (mount) {
        const s = daily.map(d => d.search || 0);
        const a = daily.map(d => d.adoption || 0);
        const r = daily.map(d => d.revisit || 0);
        const labels = daily.map(d => d.day || '');
        mount.innerHTML = sparklineSVG([s, a, r], { width: 600, height: 80, colors: ['#2563eb', '#10b981', '#f59e0b'], labels, seriesNames: ['検索', '採用', '再訪'] });
      }

      // Diagnosis summary
      (function () {
        function loadSaved() { try { const raw = localStorage.getItem('fineme:saved:diagnoses'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
        function getLatest() { try { const raw = localStorage.getItem('fineme:diagnosis:latest'); return raw ? JSON.parse(raw) : null; } catch { return null; } }
        const saved = loadSaved();
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
        const weekCount = saved.filter(x => { const t = new Date(x.savedAt || 0).getTime(); return t && t >= start.getTime(); }).length;
        const total = saved.length;
        let distMap = new Map();
        if (total > 0) {
          for (const x of saved) { const id = String(x.typeId || ''); if (!id) continue; const prev = distMap.get(id) || { id, name: String(x.typeName || id), count: 0 }; prev.count++; distMap.set(id, prev); }
        } else {
          const latest = getLatest();
          const id = String(latest?.step2?.classification?.type_id || latest?.intent?.type_id || '');
          const name = String(latest?.step2?.classification?.type_name || latest?.intent?.type_name || id);
          if (id) { distMap.set(id, { id, name, count: 1 }); }
        }
        const dist = Array.from(distMap.values()).sort((a, b) => b.count - a.count);
        set('kpi-diag-week', String(weekCount));
        set('kpi-diag-total', String(total));
        const distMount = document.getElementById('diag-type-dist');
        if (distMount) {
          distMount.textContent = '';
          if (!dist.length) { const div = document.createElement('div'); div.className = 'muted'; div.textContent = 'データがありません'; distMount.appendChild(div); }
          else {
            const max = Math.max(...dist.map(d => d.count), 1);
            for (const row of dist) {
              const line = document.createElement('div'); line.style.display = 'flex'; line.style.alignItems = 'center'; line.style.gap = '8px';
              const label = document.createElement('div'); label.className = 'muted'; label.style.width = '140px'; label.style.whiteSpace = 'nowrap'; label.textContent = row.name;
              const barWrap = document.createElement('div'); barWrap.style.flex = '1'; barWrap.style.height = '8px'; barWrap.style.background = '#f3f4f6'; barWrap.style.borderRadius = '9999px'; barWrap.style.overflow = 'hidden';
              const bar = document.createElement('div'); bar.style.height = '100%'; bar.style.width = `${Math.round((row.count / max) * 100)}%`; bar.style.background = '#111';
              barWrap.appendChild(bar);
              const cnt = document.createElement('div'); cnt.style.width = '40px'; cnt.style.textAlign = 'right'; cnt.textContent = String(row.count);
              line.appendChild(label); line.appendChild(barWrap); line.appendChild(cnt);
              distMount.appendChild(line);
            }
          }
        }
      })();

      // Tasks
      const drafts = features.filter(f => f.status === 'draft').length;
      const tasks = document.getElementById('dash-tasks');
      if (tasks) {
        tasks.textContent = '';
        const li1 = document.createElement('li');
        li1.innerHTML = `<a class="svc-link" href="/admin/features">下書き ${drafts} 件を確認する</a>`;
        tasks.appendChild(li1);
      }

      // Type × Preference
      (function () {
        const mount = document.getElementById('dash-type-pref'); if (!mount) return;
        mount.textContent = '';
        let typeId = ''; let typeName = '';
        try { const raw = localStorage.getItem('fineme:diagnosis:latest'); const obj = raw ? JSON.parse(raw) : {}; typeId = obj?.step2?.classification?.type_id || obj?.intent?.type_id || ''; typeName = obj?.step2?.classification?.type_name || obj?.intent?.type_name || ''; } catch {}
        function inferPref() {
          try {
            const raw = localStorage.getItem(METRICS_KEY); const store = raw ? JSON.parse(raw) : {}; const events = Array.isArray(store?.events) ? store.events : [];
            const recent = events.slice(-500);
            const searches = recent.filter(e => e.type === 'search');
            const adoptions = recent.filter(e => e.type === 'adoption');
            if (!searches.length || !adoptions.length) return { fast: false, habit: false, medianMs: null, s: 0, a: 0 };
            const adTimes = adoptions.map(e => new Date(e.t).getTime()).sort((a, b) => a - b);
            const deltas = []; for (const s of searches) { const st = new Date(s.t).getTime(); const a = adTimes.find(t => t >= st); if (a) { deltas.push(a - st); } }
            if (!deltas.length) return { fast: false, habit: false, medianMs: null, s: searches.length, a: adoptions.length };
            const median = deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)];
            const oneDay = 24 * 60 * 60 * 1000;
            const fastPref = median <= oneDay;
            const qTokens = searches.map(s => String(s.query || '').toLowerCase());
            const fastWords = qTokens.filter(q => /短期|即|早|最短|プラン/.test(q)).length;
            const habitWords = qTokens.filter(q => /習慣|続け|ルーティン|週次|継続/.test(q)).length;
            const habitPref = (!fastPref && habitWords > fastWords) || (median > oneDay);
            return { fast: fastPref, habit: habitPref, medianMs: median, s: searches.length, a: adoptions.length };
          } catch { return { fast: false, habit: false, medianMs: null, s: 0, a: 0 }; }
        }
        const pref = inferPref();
        const badge = (text, color) => { const b = document.createElement('span'); b.textContent = text; b.style.display = 'inline-block'; b.style.padding = '6px 10px'; b.style.borderRadius = '999px'; b.style.fontSize = '12px'; b.style.fontWeight = '600'; b.style.background = color; b.style.color = '#fff'; return b; };
        const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '8px'; row.style.alignItems = 'center';
        if (typeName) { row.appendChild(badge(typeName, '#111')); } else { const m = document.createElement('span'); m.className = 'muted'; m.textContent = 'タイプ未設定（診断未保存）'; row.appendChild(m); }
        let prefLabel = 'バランス型'; let prefColor = '#64748b';
        if (pref.fast && !pref.habit) { prefLabel = '即効性寄り'; prefColor = '#10b981'; }
        else if (pref.habit && !pref.fast) { prefLabel = '習慣化寄り'; prefColor = '#2563eb'; }
        row.appendChild(badge(prefLabel, prefColor));
        mount.appendChild(row);
        const stats = document.createElement('div'); stats.className = 'muted'; stats.style.fontSize = '12px';
        const medianText = (pref.medianMs != null) ? (() => { const d = Math.round(pref.medianMs / 86400000); const h = Math.round(pref.medianMs / 3600000); return d > 0 ? `${d}日以内の採用中央値` : `${h}時間以内の採用中央値`; })() : '学習中（十分なイベントがありません）';
        stats.textContent = `${medianText}／検索 ${pref.s} ／ 採用 ${pref.a}`;
        mount.appendChild(stats);
      })();
    }

    function wire() {
      const btnSeed = document.getElementById('dash-seed-demo');
      if (btnSeed) { btnSeed.addEventListener('click', () => { seedDemo(); render(); }); }
      const btnNew = document.getElementById('dash-new-feature');
      if (btnNew) { btnNew.addEventListener('click', () => { location.href = '/admin/features?id=new'; }); }
      const btnF = document.getElementById('dash-open-features');
      if (btnF) { btnF.addEventListener('click', () => { location.href = '/admin/features'; }); }
      const btnA = document.getElementById('dash-open-analytics');
      if (btnA) { btnA.addEventListener('click', () => { location.href = '/admin/analytics'; }); }
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
          <h1 className="section-title">ダッシュボード</h1>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">今週の相談（検索）</div><div id="kpi-searches" className="kpi-value">0</div></div>
            <div className="kpi-card"><div className="kpi-label">未対応問い合わせ</div><div id="kpi-inquiries-pending" className="kpi-value">0</div></div>
            <div className="kpi-card"><div className="kpi-label">提案採用率</div><div id="kpi-adoption" className="kpi-value">0%</div></div>
            <div className="kpi-card"><div className="kpi-label">再指名率</div><div id="kpi-revisit" className="kpi-value">0%</div></div>
            <div className="kpi-card"><div className="kpi-label">今週の特集閲覧</div><div id="kpi-feature-views" className="kpi-value">0</div></div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>タイプ × 嗜好（即効/習慣）</h2>
              <span className="muted" style={{fontSize:'12px'}}>ローカルイベントから推定</span>
            </div>
            <div id="dash-type-pref" className="stack" style={{marginTop:'8px',gap:'8px'}}></div>
          </div>
          <div className="two-col">
            <div className="card" style={{padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center'}}>
                <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>コンテンツ性能（上位）</h2>
                <button type="button" className="btn btn-ghost" id="dash-open-features" style={{marginLeft:'auto'}}>特集を管理</button>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',marginTop:'8px'}}>
                <thead><tr>
                  <th style={{textAlign:'left',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>特集</th>
                  <th style={{textAlign:'right',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>閲覧</th>
                </tr></thead>
                <tbody id="dash-top-features"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
              <h3 className="section-title" style={{fontSize:'16px',margin:'12px 0 4px'}}>要改善（閲覧が少ない）</h3>
              <table style={{width:'100%',borderCollapse:'collapse',marginTop:'4px'}}>
                <thead><tr>
                  <th style={{textAlign:'left',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>特集</th>
                  <th style={{textAlign:'right',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>閲覧</th>
                </tr></thead>
                <tbody id="dash-low-features"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
            </div>
            <div className="card" style={{padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center'}}>
                <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>検索インサイト</h2>
                <button type="button" className="btn btn-ghost" id="dash-open-analytics" style={{marginLeft:'auto'}}>分析へ</button>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',marginTop:'8px'}}>
                <thead><tr>
                  <th style={{textAlign:'left',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>キーワード</th>
                  <th style={{textAlign:'right',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>回数</th>
                </tr></thead>
                <tbody id="dash-top-queries"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
              <h3 className="section-title" style={{fontSize:'16px',margin:'12px 0 4px'}}>無結果ワード</h3>
              <table style={{width:'100%',borderCollapse:'collapse',marginTop:'4px'}}>
                <thead><tr>
                  <th style={{textAlign:'left',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>キーワード</th>
                  <th style={{textAlign:'right',padding:'8px',borderBottom:'1px solid var(--color-border)'}}>回数</th>
                </tr></thead>
                <tbody id="dash-noresult-queries"><tr><td style={{padding:'8px'}} colSpan={2} className="muted">データがありません</td></tr></tbody>
              </table>
            </div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>7日トレンド</h2>
              <div className="muted" style={{display:'flex',gap:'12px',alignItems:'center',fontSize:'12px'}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#2563eb',display:'inline-block'}}></span>検索</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#10b981',display:'inline-block'}}></span>採用</span>
                <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><span style={{width:'8px',height:'8px',borderRadius:'9999px',background:'#f59e0b',display:'inline-block'}}></span>再訪</span>
              </div>
            </div>
            <div id="dash-spark" style={{marginTop:'8px',width:'100%',overflow:'hidden'}}></div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>診断サマリー</h2>
              <span className="muted" style={{fontSize:'12px'}}>ローカル保存ベース</span>
            </div>
            <div className="kpi-grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))',marginTop:'8px'}}>
              <div className="kpi-card"><div className="kpi-label">今週の診断保存</div><div id="kpi-diag-week" className="kpi-value">0</div></div>
              <div className="kpi-card"><div className="kpi-label">累計診断保存</div><div id="kpi-diag-total" className="kpi-value">0</div></div>
            </div>
            <div className="stack" style={{gap:'6px',marginTop:'12px'}}>
              <div className="muted" style={{fontSize:'12px'}}>タイプ分布</div>
              <div id="diag-type-dist" className="stack" style={{gap:'8px'}}></div>
            </div>
          </div>
          <div className="card" style={{padding:'12px'}}>
            <div style={{display:'flex',alignItems:'center'}}>
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>運用タスク</h2>
              <div className="cluster" style={{marginLeft:'auto'}}>
                <button type="button" className="btn btn-ghost" id="dash-new-feature">特集を作成</button>
                <button type="button" className="btn btn-ghost" id="dash-seed-demo">デモデータ投入</button>
              </div>
            </div>
            <ul className="stack" id="dash-tasks" style={{marginTop:'8px'}}></ul>
          </div>
        </section>
      </div>
    </main>
  );
}
