'use client';
import { useEffect, useRef } from 'react';

export default function AdminStoriesPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .admin-grid{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start}
      .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
      .badge-pending{background:#fef3c7;color:#92400e}
      .badge-approved{background:#d1fae5;color:#065f46}
      .badge-rejected{background:#fee2e2;color:#991b1b}
      .tab-nav{display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:20px}
      .tab-btn{padding:10px 20px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;transition:color .15s}
      .tab-btn.active{color:#111;border-bottom-color:#111}
      .story-grid{display:flex;flex-direction:column;gap:12px}
      .story-card{border:1px solid var(--color-border);border-radius:12px;overflow:hidden;background:#fff}
      .story-card-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f9fafb;border-bottom:1px solid var(--color-border)}
      .story-card-body{padding:16px;display:flex;flex-direction:column;gap:10px}
      .story-q{font-size:11px;font-weight:600;color:#6b7280;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
      .story-a{font-size:14px;line-height:1.7;color:#111;white-space:pre-wrap}
      .story-tags{display:flex;gap:6px;flex-wrap:wrap}
      .story-tag{padding:2px 8px;border-radius:99px;font-size:11px;background:#ede9fe;color:#5b21b6}
      .story-actions{display:flex;gap:8px;align-items:center;padding:12px 16px;border-top:1px solid var(--color-border);background:#f9fafb}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
      .kpi-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center}
      .kpi-value{font-size:28px;font-weight:800;color:#111}
      .kpi-label{font-size:12px;color:#6b7280;margin-top:2px}
      @media(max-width:960px){.admin-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }

    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    let allStories = [];
    let currentTab = 'pending';

    const LABELS = ['外見を変える前の悩み', 'どんな変化があったか', '恋愛・人間関係への影響', 'おすすめしたい人'];

    async function loadStories() {
      const loadStatus = document.getElementById('load-status'); if (loadStatus) loadStatus.textContent = '読み込み中...';
      const storyGrid = document.getElementById('story-grid');
      if (storyGrid) storyGrid.innerHTML = '<div class="muted" style="text-align:center;padding:32px">読み込み中...</div>';
      try {
        const res = await fetch(`/api/stories?status=${currentTab}`, { headers: h() });
        if (!res.ok) {
          if (storyGrid) storyGrid.innerHTML = '<div class="muted" style="text-align:center;padding:32px">取得エラー。APIキーを確認してください。</div>';
          if (loadStatus) loadStatus.textContent = 'エラー'; return;
        }
        allStories = await res.json();
        renderStories();
        if (loadStatus) loadStatus.textContent = `${allStories.length}件`;
      } catch {
        if (loadStatus) loadStatus.textContent = 'API接続失敗';
        if (storyGrid) storyGrid.innerHTML = '<div class="muted" style="text-align:center;padding:32px">データを取得できませんでした（Next.js devサーバーが起動しているか確認）</div>';
      }
    }

    async function updateCounts() {
      try {
        const [p, a, r] = await Promise.all([
          fetch('/api/stories?status=pending', { headers: h() }).then(r => r.json()),
          fetch('/api/stories?status=approved', { headers: h() }).then(r => r.json()),
          fetch('/api/stories?status=rejected', { headers: h() }).then(r => r.json()),
        ]);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('cnt-pending', Array.isArray(p) ? p.length : '—');
        set('cnt-approved', Array.isArray(a) ? a.length : '—');
        set('cnt-rejected', Array.isArray(r) ? r.length : '—');
      } catch {}
    }

    function renderStories() {
      const grid = document.getElementById('story-grid');
      if (!grid) return;
      if (!allStories.length) { grid.innerHTML = '<div class="muted" style="text-align:center;padding:32px">該当する体験談がありません</div>'; return; }
      grid.innerHTML = allStories.map(s => {
        const tags = Array.isArray(s.tags) ? s.tags : (s.tags || '').split(',').filter(Boolean);
        const answers = [s.concern_before, s.change_after, s.love_impact, s.recommend_to];
        const statusBadge = { pending: '<span class="badge badge-pending">審査待ち</span>', approved: '<span class="badge badge-approved">公開中</span>', rejected: '<span class="badge badge-rejected">却下</span>' }[s.status] || '';
        const dateStr = (s.created_at || '').slice(0, 10);
        return `
          <div class="story-card" id="story-${esc(String(s.id))}">
            <div class="story-card-header">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                ${statusBadge}
                <span class="muted" style="font-size:12px">${esc(dateStr)}</span>
                ${s.provider_id ? `<span class="muted" style="font-size:11px">掲載者ID: ${esc(s.provider_id)}</span>` : ''}
                ${s.service_name ? `<span class="muted" style="font-size:11px">「${esc(s.service_name)}」</span>` : ''}
              </div>
              <span class="muted" style="font-size:11px">#${esc(String(s.id).slice(0, 8))}</span>
            </div>
            <div class="story-card-body">
              ${answers.map((a, i) => a ? `<div><div class="story-q">${LABELS[i]}</div><div class="story-a">${esc(a)}</div></div>` : '').join('')}
              ${tags.length ? `<div class="story-tags">${tags.map(t => `<span class="story-tag">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
            <div class="story-actions">
              ${s.status !== 'approved' ? `<button class="btn" style="font-size:13px" data-id="${esc(String(s.id))}" data-action="approved">承認・公開する</button>` : ''}
              ${s.status !== 'rejected' ? `<button class="btn btn-ghost" style="font-size:13px;color:#ef4444" data-id="${esc(String(s.id))}" data-action="rejected">却下する</button>` : ''}
              ${s.status !== 'pending' ? `<button class="btn btn-ghost" style="font-size:13px" data-id="${esc(String(s.id))}" data-action="pending">審査待ちに戻す</button>` : ''}
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.action));
      });
    }

    async function updateStatus(id, status) {
      try {
        const res = await fetch(`/api/stories/${id}`, { method: 'PATCH', headers: h(), body: JSON.stringify({ status }) });
        if (res.ok) { await loadStories(); updateCounts(); }
        else { const err = await res.json().catch(() => ({})); alert('更新に失敗しました: ' + (err.error || res.status)); }
      } catch (e) { alert('API接続失敗: ' + e.message); }
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        loadStories();
      });
    });

    document.getElementById('btn-refresh').addEventListener('click', () => { loadStories(); updateCounts(); });

    loadStories();
    updateCounts();

    return () => {
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  return (
    <main className="section">
      <div className="container admin-grid">
        <section className="stack">
          <h1 className="section-title">体験談管理</h1>
          <p className="muted">投稿された体験談の審査・承認/却下を行います。</p>

          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-value" id="cnt-pending">—</div><div className="kpi-label">審査待ち</div></div>
            <div className="kpi-card"><div className="kpi-value" id="cnt-approved">—</div><div className="kpi-label">公開中</div></div>
            <div className="kpi-card"><div className="kpi-value" id="cnt-rejected">—</div><div className="kpi-label">却下済み</div></div>
          </div>

          <div className="tab-nav">
            <button className="tab-btn active" data-tab="pending" id="tab-btn-pending">審査待ち</button>
            <button className="tab-btn" data-tab="approved" id="tab-btn-approved">承認済み</button>
            <button className="tab-btn" data-tab="rejected" id="tab-btn-rejected">却下済み</button>
          </div>

          <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'12px',flexWrap:'wrap'}}>
            <button className="btn btn-ghost" id="btn-refresh">更新</button>
            <span id="load-status" className="muted" style={{fontSize:'12px'}}></span>
          </div>

          <div id="story-grid" className="story-grid">
            <div className="muted" style={{textAlign:'center',padding:'32px'}}>読み込み中...</div>
          </div>
        </section>
      </div>
    </main>
  );
}
