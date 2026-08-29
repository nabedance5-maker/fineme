'use client';
import { useEffect, useRef } from 'react';

export default function AdminStoriesPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
      .badge-pending{background:#fef3c7;color:#92400e}
      .badge-approved{background:#d1fae5;color:#065f46}
      .badge-rejected{background:#fee2e2;color:#991b1b}
      .tab-nav{display:flex;gap:0;border-bottom:2px solid #e5e7eb;margin-bottom:20px}
      .tab-btn{padding:10px 20px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;transition:color .15s}
      .tab-btn.active{color:#111;border-bottom-color:#111}
      .story-grid{display:flex;flex-direction:column;gap:12px}
      .story-card{border:1px solid var(--color-border);border-radius:12px;overflow:hidden;background:#fff}
      .story-card-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f9fafb;border-bottom:1px solid var(--color-border);flex-wrap:wrap;gap:6px}
      .story-card-body{padding:16px;display:flex;flex-direction:column;gap:10px}
      .story-q{font-size:11px;font-weight:600;color:#6b7280;margin-bottom:2px;text-transform:uppercase;letter-spacing:.04em}
      .story-a{font-size:14px;line-height:1.7;color:#111;white-space:pre-wrap}
      .story-tags{display:flex;gap:6px;flex-wrap:wrap}
      .story-tag{padding:2px 8px;border-radius:99px;font-size:11px;background:#ede9fe;color:#5b21b6}
      .story-actions{display:flex;gap:8px;align-items:center;padding:12px 16px;border-top:1px solid var(--color-border);background:#f9fafb;flex-wrap:wrap}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
      .kpi-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-align:center}
      .kpi-value{font-size:28px;font-weight:800;color:#111}
      .kpi-label{font-size:12px;color:#6b7280;margin-top:2px}
      .axis-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;background:#dbeafe;color:#1e40af}
      .path-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;background:#f0fdf4;color:#166534}
      .milestone-text{font-size:12px;color:#6366f1;font-weight:600;padding:4px 10px;background:#eef2ff;border-radius:8px;display:inline-block}
      .meta-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px}
      .meta-edit-panel{display:none;padding:14px 16px;border-top:1px dashed #e5e7eb;background:#fafafa}
      .meta-edit-panel.open{display:block}
      .meta-edit-row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:0}
      .meta-select{border:1.5px solid #e5e7eb;border-radius:8px;padding:6px 10px;font-size:13px;background:#fff;cursor:pointer}
      .meta-input{border:1.5px solid #e5e7eb;border-radius:8px;padding:6px 10px;font-size:13px;flex:1;min-width:160px}
      .meta-label{font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:3px}
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

    const LABELS = ['変容前の悩み', 'どんな変化があったか', '恋愛・人間関係への影響', 'おすすめしたい人'];

    const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', hairremoval:'脱毛・ムダ毛', teeth:'歯・口元', nail:'爪' };
    const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', hairremoval:'🪒', teeth:'🦷', nail:'💅' };
    const PATH_LABELS = { virgin:'🌱 初挑戦', quit:'🔄 リスタート', blind:'🤔 客観化', lapsed:'😴 再開' };

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
        const sid = esc(String(s.id));

        // 変容軸メタデータ
        const axisBadge = s.axis_id && AXIS_LABELS[s.axis_id]
          ? `<span class="axis-badge">${AXIS_ICONS[s.axis_id]} ${AXIS_LABELS[s.axis_id]}</span>` : '';
        const pathBadge = s.path_type && PATH_LABELS[s.path_type]
          ? `<span class="path-badge">${PATH_LABELS[s.path_type]}</span>` : '';
        const milestone = s.milestone_reached
          ? `<span class="milestone-text">🏆 ${esc(s.milestone_reached)}</span>` : '';

        // 軸選択オプション
        const axisOpts = `<option value="">-- 軸を選択 --</option>` +
          Object.entries(AXIS_LABELS).map(([v, l]) =>
            `<option value="${v}"${s.axis_id === v ? ' selected' : ''}>${AXIS_ICONS[v]} ${l}</option>`
          ).join('');
        const pathOpts = `<option value="">-- 来た道を選択 --</option>` +
          Object.entries(PATH_LABELS).map(([v, l]) =>
            `<option value="${v}"${s.path_type === v ? ' selected' : ''}>${l}</option>`
          ).join('');

        return `
          <div class="story-card" id="story-${sid}">
            <div class="story-card-header">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                ${statusBadge}
                ${axisBadge}
                ${pathBadge}
                <span class="muted" style="font-size:12px">${esc(dateStr)}</span>
                ${s.service_name ? `<span class="muted" style="font-size:11px">「${esc(s.service_name)}」</span>` : ''}
              </div>
              <span class="muted" style="font-size:11px">#${esc(String(s.id).slice(0, 8))}</span>
            </div>
            <div class="story-card-body">
              ${answers.map((a, i) => a ? `<div><div class="story-q">${LABELS[i]}</div><div class="story-a">${esc(a)}</div></div>` : '').join('')}
              ${milestone ? `<div class="meta-row">${milestone}</div>` : ''}
              ${tags.length ? `<div class="story-tags">${tags.map(t => `<span class="story-tag">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
            <div class="meta-edit-panel" id="meta-panel-${sid}">
              <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:10px">変容の証言メタデータ（New Me Navi 連動）</div>
              <div class="meta-edit-row">
                <div>
                  <label class="meta-label">変容軸</label>
                  <select class="meta-select" id="meta-axis-${sid}">${axisOpts}</select>
                </div>
                <div>
                  <label class="meta-label">来た道タイプ</label>
                  <select class="meta-select" id="meta-path-${sid}">${pathOpts}</select>
                </div>
                <div style="flex:1">
                  <label class="meta-label">マイルストーン（任意）</label>
                  <input class="meta-input" id="meta-milestone-${sid}" value="${esc(s.milestone_reached || '')}" placeholder="例）3ヶ月で-5kg、初めて鏡が好きになった" maxlength="200">
                </div>
                <button class="btn" style="font-size:12px;white-space:nowrap" data-save-meta="${sid}">保存</button>
              </div>
            </div>
            <div class="story-actions">
              ${s.status !== 'approved' ? `<button class="btn" style="font-size:13px" data-id="${sid}" data-action="approved">承認・公開する</button>` : ''}
              ${s.status !== 'rejected' ? `<button class="btn btn-ghost" style="font-size:13px;color:#ef4444" data-id="${sid}" data-action="rejected">却下する</button>` : ''}
              ${s.status !== 'pending' ? `<button class="btn btn-ghost" style="font-size:13px" data-id="${sid}" data-action="pending">審査待ちに戻す</button>` : ''}
              <button class="btn btn-ghost" style="font-size:12px;margin-left:auto" data-toggle-meta="${sid}">🏷 変容軸を設定</button>
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.action));
      });

      grid.querySelectorAll('[data-toggle-meta]').forEach(btn => {
        btn.addEventListener('click', () => {
          const panel = document.getElementById('meta-panel-' + btn.dataset.toggleMeta);
          if (panel) panel.classList.toggle('open');
        });
      });

      grid.querySelectorAll('[data-save-meta]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const sid = btn.dataset.saveMeta;
          const axisEl = document.getElementById('meta-axis-' + sid);
          const pathEl = document.getElementById('meta-path-' + sid);
          const milestoneEl = document.getElementById('meta-milestone-' + sid);
          await saveMetadata(sid,
            axisEl ? axisEl.value : '',
            pathEl ? pathEl.value : '',
            milestoneEl ? milestoneEl.value : ''
          );
        });
      });
    }

    async function saveMetadata(id, axisId, pathType, milestone) {
      try {
        const res = await fetch(`/api/stories/${id}`, {
          method: 'PATCH',
          headers: h(),
          body: JSON.stringify({ axis_id: axisId || null, path_type: pathType || null, milestone_reached: milestone || null }),
        });
        if (res.ok) {
          const panel = document.getElementById('meta-panel-' + id);
          if (panel) { panel.classList.remove('open'); }
          await loadStories();
        } else {
          const err = await res.json().catch(() => ({}));
          alert('保存に失敗しました: ' + (err.error || res.status));
        }
      } catch (e) { alert('API接続失敗: ' + e.message); }
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
    <main className="section" style={{textShadow:'none',color:'#e8e4dc'}}>
      <div>
        <section className="stack">
          <h1 className="section-title">変容の証言 管理</h1>
          <p className="muted">投稿された変容ストーリーの審査・承認/却下、変容軸メタデータの設定を行います。</p>

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
