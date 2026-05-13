'use client';
import { useEffect, useRef } from 'react';

const CATEGORY_LABELS = {
  gym: 'パーソナルジム', makeup: 'メイク', hair: 'ヘアサロン',
  diagnosis: '骨格診断', photo: '写真撮影', marriage: '婚活',
  eyebrow: '眉毛サロン', hairremoval: '脱毛', esthetic: 'エステ',
  whitening: 'ホワイトニング', orthodontics: '歯列矯正', nail: 'ネイル',
  aga: 'AGA', fashion: 'ファッション', consulting: 'コンサル',
};

export default function AdminDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .db-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 24px; }
      .db-kpi-card { padding: 18px 20px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; }
      .db-kpi-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
      .db-kpi-main { font-size: 28px; font-weight: 800; color: #111827; line-height: 1; }
      .db-kpi-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
      .db-kpi-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #dcfce7; color: #15803d; margin-left: 6px; }
      .db-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
      .db-section-title { font-size: 15px; font-weight: 800; color: #111827; margin: 0 0 14px; }
      .db-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .db-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; color: inherit; }
      .db-alert-warn { background: #fef9c3; border: 1px solid #fde047; }
      .db-alert-red  { background: #fee2e2; border: 1px solid #fca5a5; }
      .db-alert-ok   { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
      .db-cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .db-cat-label { width: 100px; font-size: 12px; color: #374151; flex-shrink: 0; }
      .db-cat-bar-wrap { flex: 1; height: 8px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
      .db-cat-bar { height: 100%; background: #2563eb; border-radius: 99px; transition: width .4s; }
      .db-cat-count { font-size: 12px; color: #6b7280; width: 24px; text-align: right; flex-shrink: 0; }
      .db-loading { color: #9ca3af; font-size: 14px; }
      .db-funnel { display: flex; flex-direction: column; gap: 6px; }
      .db-funnel-row { display: flex; align-items: center; gap: 10px; }
      .db-funnel-label { width: 140px; font-size: 13px; color: #374151; font-weight: 600; flex-shrink: 0; }
      .db-funnel-bar-wrap { flex: 1; height: 22px; background: #f3f4f6; border-radius: 6px; overflow: hidden; position: relative; }
      .db-funnel-bar { height: 100%; border-radius: 6px; transition: width .5s; }
      .db-funnel-count { font-size: 13px; font-weight: 700; color: #111827; width: 40px; text-align: right; flex-shrink: 0; }
      .db-funnel-rate { font-size: 11px; color: #6b7280; width: 48px; text-align: right; flex-shrink: 0; }
      .db-funnel-arrow { font-size: 12px; color: #d1d5db; text-align: center; padding-left: 150px; }
      @media (max-width: 900px) { .db-kpi-grid { grid-template-columns: repeat(2, 1fr); } .db-two-col { grid-template-columns: 1fr; } .db-funnel-label { width: 100px; } }
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }
    if (!document.cookie.split(';').some(c => c.trim().startsWith('fineme_admin='))) {
      document.cookie = 'fineme_admin=1; path=/; max-age=86400; SameSite=Lax';
    }

    const $ = id => document.getElementById(id);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };

    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats', { headers: { 'x-admin-key': ADMIN_KEY } });
        if (!res.ok) { set('stats-error', 'データ取得に失敗しました（APIキーを確認してください）'); return; }
        const d = await res.json();

        // ── ユーザー
        set('kpi-users-total', d.users.total.toLocaleString());
        set('kpi-users-month', `今月 +${d.users.thisMonth}`);

        // ── Me Scan
        set('kpi-scan-total', d.meScan.total.toLocaleString());
        set('kpi-scan-month', `今月 +${d.meScan.thisMonth}`);
        const scanRate = d.users.total > 0 ? Math.round(d.meScan.total / d.users.total * 100) : 0;
        set('kpi-scan-rate', `受診率 ${scanRate}%`);

        // ── 掲載者
        set('kpi-prov-total', d.providers.total.toLocaleString());
        set('kpi-prov-month', `今月 +${d.providers.thisMonth}`);
        const provDetail = d.providers.queryError
          ? `エラー: ${d.providers.queryError}`
          : `通常 ${d.providers.regular} / アフィリ ${d.providers.affiliate}`;
        set('kpi-prov-detail', provDetail);

        // ── Mirror
        set('kpi-mirror-paid', d.mirror.paid.toLocaleString());
        set('kpi-mirror-revenue', `¥${d.mirror.revenue.toLocaleString()}`);
        set('kpi-mirror-total', `セッション計 ${d.mirror.total}`);

        // ── アラート
        const alertsEl = $('db-alerts');
        if (alertsEl) {
          alertsEl.innerHTML = '';
          const addAlert = (type, icon, text, href) => {
            const el = document.createElement(href ? 'a' : 'div');
            el.className = `db-alert db-alert-${type}`;
            if (href) el.href = href;
            el.innerHTML = `<span>${icon}</span><span>${text}</span>`;
            alertsEl.appendChild(el);
          };
          if (d.inquiriesPending > 0) addAlert('red', '📩', `未対応の問い合わせが ${d.inquiriesPending} 件あります`, '/admin/inquiries');
          if (d.storiesPending > 0) addAlert('warn', '💬', `審査待ちの体験談が ${d.storiesPending} 件あります`, '/admin/stories');
          if (d.inquiriesPending === 0 && d.storiesPending === 0) addAlert('ok', '✅', '対応が必要な項目はありません');
        }

        // ── ユーザーファネル
        const funnelEl = $('db-funnel');
        if (funnelEl) {
          const steps = [
            { label: '👤 会員登録',      count: d.users.total,    color: '#6366f1' },
            { label: '🧭 Me Scan受診',   count: d.meScan.total,   color: '#2563eb' },
            { label: '🗺️ Navi利用',      count: d.navi.users,     color: '#0891b2' },
            { label: '🪞 Mirror利用',    count: d.mirror.total,   color: '#059669' },
            { label: '💳 Mirror有料',    count: d.mirror.paid,    color: '#d97706' },
          ];
          const base = steps[0].count || 1;
          funnelEl.innerHTML = '';
          steps.forEach((step, i) => {
            const pct = Math.round(step.count / base * 100);
            const prevCount = i > 0 ? steps[i - 1].count : null;
            const stepRate = prevCount ? Math.round(step.count / prevCount * 100) : null;
            if (i > 0) {
              const arrow = document.createElement('div');
              arrow.className = 'db-funnel-arrow';
              arrow.textContent = `↓ ${stepRate}%`;
              funnelEl.appendChild(arrow);
            }
            const row = document.createElement('div');
            row.className = 'db-funnel-row';
            row.innerHTML = `
              <span class="db-funnel-label">${step.label}</span>
              <div class="db-funnel-bar-wrap">
                <div class="db-funnel-bar" style="width:${pct}%;background:${step.color}"></div>
              </div>
              <span class="db-funnel-count">${step.count.toLocaleString()}</span>
              <span class="db-funnel-rate">${pct}%</span>`;
            funnelEl.appendChild(row);
          });
          if (d.navi.avgStepsDone > 0) {
            const note = document.createElement('p');
            note.style.cssText = 'font-size:12px;color:#6b7280;margin:10px 0 0;';
            note.textContent = `Navi利用者の平均ステップ完了数: ${d.navi.avgStepsDone} ステップ`;
            funnelEl.appendChild(note);
          }
        }

        // ── カテゴリ別掲載者
        const catEl = $('db-by-category');
        if (catEl && d.providers.byCategory) {
          catEl.innerHTML = '';
          const entries = Object.entries(d.providers.byCategory).sort((a, b) => b[1] - a[1]);
          const max = entries[0]?.[1] || 1;
          entries.forEach(([cat, count]) => {
            const row = document.createElement('div');
            row.className = 'db-cat-row';
            row.innerHTML = `
              <span class="db-cat-label">${CATEGORY_LABELS[cat] || cat}</span>
              <div class="db-cat-bar-wrap"><div class="db-cat-bar" style="width:${Math.round(count/max*100)}%"></div></div>
              <span class="db-cat-count">${count}</span>`;
            catEl.appendChild(row);
          });
          if (!entries.length) catEl.innerHTML = '<p class="db-loading">掲載者がいません</p>';
        }

      } catch (e) {
        set('stats-error', 'ネットワークエラーが発生しました');
      }
    }

    loadStats();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div>
        <section className="stack">
          <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px'}}>
            <h1 className="section-title" style={{margin:0}}>ダッシュボード</h1>
            <span id="stats-error" style={{fontSize:'13px', color:'#ef4444'}}></span>
          </div>

          {/* KPI グリッド */}
          <div className="db-kpi-grid">
            <div className="db-kpi-card">
              <div className="db-kpi-label">👤 会員登録者数</div>
              <div className="db-kpi-main" id="kpi-users-total">—</div>
              <div className="db-kpi-sub" id="kpi-users-month">—</div>
            </div>
            <div className="db-kpi-card">
              <div className="db-kpi-label">🧭 Me Scan受診者数</div>
              <div className="db-kpi-main" id="kpi-scan-total">—</div>
              <div className="db-kpi-sub"><span id="kpi-scan-month">—</span>　<span id="kpi-scan-rate" style={{color:'#2563eb'}}></span></div>
            </div>
            <div className="db-kpi-card">
              <div className="db-kpi-label">🏢 掲載者登録数</div>
              <div className="db-kpi-main" id="kpi-prov-total">—</div>
              <div className="db-kpi-sub"><span id="kpi-prov-month">—</span>　<span id="kpi-prov-detail" style={{color:'#6b7280'}}></span></div>
            </div>
            <div className="db-kpi-card">
              <div className="db-kpi-label">🪞 Mirror有料利用数</div>
              <div className="db-kpi-main" id="kpi-mirror-paid">—</div>
              <div className="db-kpi-sub"><span id="kpi-mirror-revenue" style={{color:'#059669', fontWeight:700}}></span>　<span id="kpi-mirror-total" style={{color:'#9ca3af'}}></span></div>
            </div>
          </div>

          {/* ユーザーファネル */}
          <div className="db-section">
            <p className="db-section-title">📉 ユーザーファネル（累計）</p>
            <div id="db-funnel" className="db-funnel"><p className="db-loading">読み込み中...</p></div>
          </div>

          {/* アラート */}
          <div className="db-section">
            <p className="db-section-title">⚠️ 要対応</p>
            <div id="db-alerts"><p className="db-loading">読み込み中...</p></div>
          </div>

          {/* カテゴリ別 */}
          <div className="db-two-col">
            <div className="db-section">
              <p className="db-section-title">📊 カテゴリ別掲載者数（通常）</p>
              <div id="db-by-category"><p className="db-loading">読み込み中...</p></div>
            </div>
            <div className="db-section">
              <p className="db-section-title">🔗 クイックリンク</p>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {[
                  ['/admin/providers',  '🏢 掲載者管理'],
                  ['/admin/affiliates', '🔗 アフィリエイト管理'],
                  ['/admin/stories',    '💬 体験談管理'],
                  ['/admin/inquiries',  '📩 問い合わせ'],
                  ['/admin/features',   '📝 特集管理'],
                  ['/admin/payments',   '💳 支払い管理'],
                  ['/admin/products',   '🛒 商品管理'],
                  ['/admin/analytics',  '📈 アナリティクス'],
                ].map(([href, label]) => (
                  <a key={href} href={href} style={{display:'block', padding:'10px 14px', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'14px', fontWeight:500, color:'#374151', textDecoration:'none'}}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
