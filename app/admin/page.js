'use client';
import { useEffect, useRef } from 'react';

export default function AdminDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
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

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) {
        sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
        // business/ 資料へのアクセスを許可するクッキーをセット（24h）
        document.cookie = 'fineme_admin=1; path=/; max-age=86400; SameSite=Lax';
      }
    } else {
      // セッションキーがある = 認証済み。クッキーを維持（なければ再発行）
      if (!document.cookie.split(';').some(c => c.trim().startsWith('fineme_admin='))) {
        document.cookie = 'fineme_admin=1; path=/; max-age=86400; SameSite=Lax';
      }
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

      (async () => {
        try {
          const res = await fetch('/api/admin/inquiries', { headers: { 'x-admin-key': ADMIN_KEY } });
          if (res.ok) {
            const arr = await res.json();
            const pending = arr.filter(it => (it?.status || 'new') !== 'done').length;
            set('kpi-inquiries-pending', String(pending));
          }
        } catch { set('kpi-inquiries-pending', '—'); }
      })();

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

      // Me Scan サマリー（新フォーマット: transform_vectors / compass_first）
      (function () {
        const AXIS_LABELS = { body:'体型', eyebrow:'眉毛', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
        const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
        const PATH_LABELS = { virgin:'初挑戦', quit:'リスタート', blind:'客観化', lapsed:'再開' };

        function getLatest() { try { const raw = localStorage.getItem('fineme:diagnosis:latest'); return raw ? JSON.parse(raw) : null; } catch { return null; } }
        const latest = getLatest();
        const vectors = Array.isArray(latest?.transform_vectors) ? latest.transform_vectors : [];
        const compass = latest?.compass_first || null;
        const scanDate = latest?.at ? new Date(latest.at).toLocaleDateString('ja-JP', { month:'long', day:'numeric' }) : null;

        set('kpi-diag-week', vectors.length > 0 ? '✓' : '—');
        set('kpi-diag-total', scanDate || '未スキャン');

        const distMount = document.getElementById('diag-type-dist');
        if (distMount) {
          distMount.textContent = '';
          if (!vectors.length) {
            const div = document.createElement('div'); div.className = 'muted'; div.textContent = 'Me Scanデータがありません（まだ診断未実施）'; distMount.appendChild(div);
          } else {
            // コンパス表示
            if (compass) {
              const compassEl = document.createElement('div');
              compassEl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:#eff6ff;border-radius:10px;margin-bottom:10px;border:1px solid #bfdbfe';
              compassEl.innerHTML = `<span style="font-size:18px">🧭</span><div><div style="font-size:11px;font-weight:700;color:#2563eb;margin-bottom:2px">Fineme Compass（最初の一手）</div><div style="font-size:14px;font-weight:800;color:#111">${AXIS_ICONS[compass] || ''} ${AXIS_LABELS[compass] || compass}</div></div>`;
              distMount.appendChild(compassEl);
            }
            // ゴール
            if (latest.goal_change) {
              const goalEl = document.createElement('div');
              goalEl.style.cssText = 'font-size:12px;color:#374151;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:10px;border-left:3px solid #d1d5db';
              goalEl.innerHTML = `<span style="font-size:10px;font-weight:700;color:#9ca3af;display:block;margin-bottom:3px">ゴール</span>${String(latest.goal_change).slice(0, 80)}${String(latest.goal_change).length > 80 ? '…' : ''}`;
              distMount.appendChild(goalEl);
            }
            // 7軸ギャップ分布
            const gapAxes = vectors.filter(v => v.gap > 0).sort((a, b) => { if (a.tier !== b.tier) return a.tier - b.tier; return b.gap - a.gap; });
            if (gapAxes.length) {
              const header = document.createElement('div'); header.style.cssText = 'font-size:11px;font-weight:700;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em'; header.textContent = '変容ベクトル分布（ギャップあり軸）'; distMount.appendChild(header);
              const maxGap = Math.max(...gapAxes.map(v => v.gap), 1);
              gapAxes.forEach(v => {
                const line = document.createElement('div'); line.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
                const lbl = document.createElement('div'); lbl.style.cssText = 'width:80px;font-size:12px;color:#374151;white-space:nowrap;flex-shrink:0'; lbl.textContent = `${AXIS_ICONS[v.id] || ''} ${AXIS_LABELS[v.id] || v.id}`;
                const barWrap = document.createElement('div'); barWrap.style.cssText = 'flex:1;height:8px;background:#f3f4f6;border-radius:9999px;overflow:hidden';
                const bar = document.createElement('div'); bar.style.cssText = `height:100%;width:${Math.round((v.gap / maxGap) * 100)}%;background:${v.id === compass ? '#2563eb' : '#9ca3af'};border-radius:9999px`;
                barWrap.appendChild(bar);
                const meta = document.createElement('div'); meta.style.cssText = 'font-size:11px;color:#6b7280;white-space:nowrap'; meta.textContent = `+${v.gap} ${v.path_type ? '/ ' + (PATH_LABELS[v.path_type] || v.path_type) : ''}`;
                line.appendChild(lbl); line.appendChild(barWrap); line.appendChild(meta);
                distMount.appendChild(line);
              });
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

      // Compass × 来た道（新フォーマット）
      (function () {
        const mount = document.getElementById('dash-type-pref'); if (!mount) return;
        mount.textContent = '';
        const AXIS_LABELS = { body:'体型', eyebrow:'眉毛', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
        const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
        const PATH_LABELS = { virgin:'初挑戦タイプ', quit:'リスタートタイプ', blind:'客観化タイプ', lapsed:'再開タイプ' };
        const PATH_COLORS = { virgin:'#10b981', quit:'#f59e0b', blind:'#6366f1', lapsed:'#3b82f6' };
        let latest = null;
        try { const raw = localStorage.getItem('fineme:diagnosis:latest'); latest = raw ? JSON.parse(raw) : null; } catch {}
        const compass = latest?.compass_first || null;
        const vectors = Array.isArray(latest?.transform_vectors) ? latest.transform_vectors : [];
        const compassVec = vectors.find(v => v.id === compass);

        const badge = (text, color) => { const b = document.createElement('span'); b.textContent = text; b.style.cssText = `display:inline-block;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${color};color:#fff`; return b; };
        const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px';
        if (compass) {
          row.appendChild(badge(`${AXIS_ICONS[compass] || ''} ${AXIS_LABELS[compass] || compass}`, '#111'));
          if (compassVec?.path_type) row.appendChild(badge(PATH_LABELS[compassVec.path_type] || compassVec.path_type, PATH_COLORS[compassVec.path_type] || '#64748b'));
          if (latest?.goal_scene) { const g = document.createElement('span'); g.style.cssText = 'font-size:12px;color:#6b7280'; g.textContent = `場面: ${String(latest.goal_scene).slice(0, 30)}`; row.appendChild(g); }
        } else {
          const m = document.createElement('span'); m.className = 'muted'; m.textContent = 'Me Scan未実施（診断データなし）'; row.appendChild(m);
        }
        mount.appendChild(row);
        if (latest?.at) {
          const meta = document.createElement('div'); meta.style.cssText = 'font-size:12px;color:#9ca3af';
          meta.textContent = `スキャン日: ${new Date(latest.at).toLocaleDateString('ja-JP')} ／ ギャップ軸: ${vectors.filter(v=>v.gap>0).length}軸`;
          mount.appendChild(meta);
        }
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
      <div>
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
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>Compass × 来た道</h2>
              <span className="muted" style={{fontSize:'12px'}}>直近のMe Scanデータから</span>
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
              <h2 className="section-title" style={{fontSize:'18px',margin:'0'}}>Me Scanサマリー</h2>
              <span className="muted" style={{fontSize:'12px'}}>直近のスキャンデータ</span>
            </div>
            <div className="kpi-grid" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))',marginTop:'8px'}}>
              <div className="kpi-card"><div className="kpi-label">スキャン済み</div><div id="kpi-diag-week" className="kpi-value">—</div></div>
              <div className="kpi-card"><div className="kpi-label">最終スキャン日</div><div id="kpi-diag-total" className="kpi-value">—</div></div>
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
