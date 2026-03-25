'use client';
import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

const CAT_OPTIONS = [
  { value: 'gym',          label: 'パーソナルジム' },
  { value: 'eyebrow',      label: '眉毛サロン' },
  { value: 'hair',         label: 'ヘア・美容院' },
  { value: 'skin',         label: '肌・エステ' },
  { value: 'fashion',      label: 'ファッション' },
  { value: 'photo',        label: '写真撮影' },
  { value: 'consulting',   label: '外見トータルサポート' },
  { value: 'makeup',       label: 'メイク' },
  { value: 'nail',         label: 'ネイル' },
  { value: 'hairremoval',  label: '脱毛' },
  { value: 'whitening',    label: 'ホワイトニング' },
  { value: 'orthodontics', label: '歯科矯正' },
  { value: 'marriage',     label: '結婚相談所' },
  { value: 'diagnosis',    label: '骨格診断' },
  { value: 'aga',          label: 'AGA・薄毛治療' },
];

export default function AdminAffiliateEditPage() {
  const { id } = useParams();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .tab-nav { display: flex; gap: 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; overflow-x: auto; }
      .tab-btn { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
      .tab-btn.active { color: #111; border-bottom-color: #111; }
      .tab-pane { display: none; }
      .tab-pane.active { display: block; }
      .form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
      .form-field label { font-size: 12px; font-weight: 700; color: #374151; }
      .form-field input, .form-field textarea, .form-field select { padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; width: 100%; box-sizing: border-box; }
      .form-field textarea { min-height: 100px; resize: vertical; }
      .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
      .checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 14px; }
      .toggle-switch { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 26px; cursor: pointer; transition: background .2s; }
      .toggle-slider:before { content:''; position: absolute; width: 18px; height: 18px; left: 4px; bottom: 4px; background: #fff; border-radius: 50%; transition: transform .2s; }
      .toggle-switch input:checked + .toggle-slider { background: #111; }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }
      .service-row { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 8px; background: #fff; }
      .service-edit-form { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 12px; display: none; }
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }

    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function showToast(msg) {
      const t = document.createElement('div');
      t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:999';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2500);
    }

    // ── タブ切り替え ─────────────────────────────────────────────
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const pane = document.getElementById('tab-' + tabId);
      if (btn) btn.classList.add('active');
      if (pane) pane.classList.add('active');
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ── AI再生成（編集画面から） ─────────────────────────────
    document.getElementById('btn-regenerate').addEventListener('click', async () => {
      const serviceName = document.getElementById('regen-service-name').value.trim();
      const serviceUrl = document.getElementById('regen-service-url').value.trim();
      if (!serviceName) { alert('サービス名を入力してください'); return; }

      const btn = document.getElementById('btn-regenerate');
      const status = document.getElementById('regen-status');
      btn.disabled = true; btn.textContent = '調査中…';
      status.style.display = 'block'; status.style.color = '#6b7280';
      status.textContent = 'AIがサービス情報を調査しています…';

      try {
        const res = await fetch('/api/admin/affiliates/auto-fill', {
          method: 'POST', headers: h(),
          body: JSON.stringify({ service_name: serviceName, service_url: serviceUrl || undefined }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'AI生成失敗'); }
        const aiData = await res.json();

        // フォームに反映
        const pf = document.getElementById('profile-form');
        const sf = document.getElementById('service-form');
        const fields = {
          name: aiData.name || serviceName,
          catchphrase: aiData.catchphrase || '',
          target_desc: aiData.target_desc || '',
          philosophy: aiData.philosophy || '',
          guide_message: aiData.guide_message || '',
          unique_strengths: aiData.unique_strengths || '',
        };
        Object.entries(fields).forEach(([k, v]) => {
          const el = pf?.elements[k]; if (el) el.value = v;
        });
        if (pf?.elements['main_category'] && aiData.main_category) pf.elements['main_category'].value = aiData.main_category;

        const sfFields = {
          description: aiData.description || '',
          provider_style: aiData.provider_style || '',
          ideal_client_desc: aiData.ideal_client_desc || '',
          client_before_state: aiData.client_before_state || '',
          transformation_pattern: aiData.transformation_pattern || '',
          best_fit_desc: aiData.best_fit_desc || '',
          price_from: aiData.price_from !== null && aiData.price_from !== undefined ? String(aiData.price_from) : '',
        };
        Object.entries(sfFields).forEach(([k, v]) => {
          const el = sf?.elements[k]; if (el) el.value = v;
        });
        document.querySelectorAll('[name=suitable_triggers]').forEach(cb => {
          cb.checked = (aiData.suitable_triggers || []).includes(cb.value);
        });
        document.querySelectorAll('[name=handles_failure_patterns]').forEach(cb => {
          cb.checked = (aiData.handles_failure_patterns || []).includes(cb.value);
        });

        status.style.color = '#059669';
        status.textContent = '✅ フィールドを自動入力しました。内容を確認して各タブで「保存する」を押してください。';
        document.getElementById('regen-section').style.background = '#f0fdf4';
      } catch (err) {
        status.style.color = '#ef4444';
        status.textContent = `エラー: ${err.message}`;
      } finally {
        btn.disabled = false; btn.textContent = '✨ AI自動入力';
      }
    });

    // ── アフィリエイトデータ取得 ──────────────────────────────
    let affiliate = null;

    async function load() {
      const res = await fetch(`/api/admin/affiliates/${id}`, { headers: h() });
      if (!res.ok) { document.getElementById('aff-name-header').textContent = '読み込みエラー'; return; }
      affiliate = await res.json();
      renderData();
      loadServices();
    }

    function renderData() {
      if (!affiliate) return;
      document.getElementById('aff-name-header').textContent = affiliate.name || 'アフィリエイト編集';
      if (affiliate.slug) {
        const link = document.getElementById('aff-page-link');
        if (link) { link.textContent = `fineme.me/affiliate/${affiliate.slug}`; link.href = `/affiliate/${affiliate.slug}`; }
      }

      // プロフィールタブ
      const profileForm = document.getElementById('profile-form');
      if (profileForm) {
        ['name','catchphrase','target_desc','philosophy','guide_message','unique_strengths','photo_url','cover_image_url'].forEach(k => {
          const el = profileForm.elements[k];
          if (el) el.value = affiliate[k] || '';
        });
        const catEl = profileForm.elements['main_category'];
        if (catEl) catEl.value = affiliate.main_category || '';
      }

      // サービス設定タブ
      const serviceForm = document.getElementById('service-form');
      if (serviceForm) {
        ['description','provider_style','price_from'].forEach(k => {
          const el = serviceForm.elements[k];
          if (el) el.value = affiliate[k] !== undefined && affiliate[k] !== null ? String(affiliate[k]) : '';
        });
        ['ideal_client_desc','client_before_state','transformation_pattern','best_fit_desc'].forEach(k => {
          const el = serviceForm.elements[k];
          if (el) el.value = affiliate[k] || '';
        });
        document.querySelectorAll('[name=suitable_triggers]').forEach(cb => {
          cb.checked = (affiliate.suitable_triggers || []).includes(cb.value);
        });
        document.querySelectorAll('[name=handles_failure_patterns]').forEach(cb => {
          cb.checked = (affiliate.handles_failure_patterns || []).includes(cb.value);
        });
      }

      // AI分析ステータス
      const aiStatus = document.getElementById('ai-match-status');
      if (affiliate.ai_match_profile) {
        const d = affiliate.ai_match_profile;
        const date = d.analyzed_at ? new Date(d.analyzed_at).toLocaleDateString('ja-JP') : '';
        if (aiStatus) aiStatus.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析済み（${date}）</span><br><span style="font-size:12px;color:#6b7280">${d.summary || ''}</span>`;
        setAnalyzeBtnState(true);
      } else {
        if (aiStatus) aiStatus.textContent = '未分析 — プロフィール入力後「AIで分析する」を押してください';
        setAnalyzeBtnState(false);
      }

      // 公開設定タブ
      const pubToggle = document.getElementById('publish-toggle-input');
      if (pubToggle) pubToggle.checked = !!affiliate.published;
      const pubLabel = document.getElementById('publish-label');
      if (pubLabel) pubLabel.textContent = affiliate.published ? '公開中' : '非公開';
      const affUrlEl = document.getElementById('affiliate-url-input');
      if (affUrlEl) affUrlEl.value = affiliate.affiliate_url || '';
    }

    // ── 保存 ─────────────────────────────────────────────────────
    async function save(updates) {
      const res = await fetch(`/api/admin/affiliates/${id}`, { method: 'PATCH', headers: h(), body: JSON.stringify(updates) });
      if (res.ok) {
        affiliate = await res.json();
        showToast('保存しました');
        return true;
      } else {
        const err = await res.json();
        showToast('エラー: ' + (err.error || '不明'));
        return false;
      }
    }

    // ── プロフィールフォーム ──────────────────────────────────
    document.getElementById('profile-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.ai_match_profile = null; // プロフィール変更時はAI分析リセット
      const ok = await save(data);
      if (ok) setAnalyzeBtnState(false);
    });

    // ── サービス設定フォーム ──────────────────────────────────
    document.getElementById('service-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.suitable_triggers = [...e.target.querySelectorAll('[name=suitable_triggers]:checked')].map(el => el.value);
      data.handles_failure_patterns = [...e.target.querySelectorAll('[name=handles_failure_patterns]:checked')].map(el => el.value);
      data.price_from = data.price_from ? Number(data.price_from) : null;
      data.ai_match_profile = null;
      const ok = await save(data);
      if (ok) setAnalyzeBtnState(false);
    });

    // ── AI分析 ───────────────────────────────────────────────
    function setAnalyzeBtnState(analyzed) {
      const btn = document.getElementById('ai-analyze-btn');
      if (!btn) return;
      btn.disabled = analyzed;
      btn.style.opacity = analyzed ? '0.4' : '1';
      btn.title = analyzed ? 'プロフィールを変更して保存すると再分析できます' : '';
      if (!analyzed) btn.textContent = 'AIで分析する';
    }

    document.getElementById('ai-analyze-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('ai-analyze-btn');
      const status = document.getElementById('ai-match-status');
      btn.disabled = true; btn.textContent = '分析中…';
      if (status) status.textContent = 'Claudeがプロフィールを読み取っています…';
      try {
        const res = await fetch(`/api/admin/affiliates/${id}/analyze`, { method: 'POST', headers: h() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '分析に失敗しました');
        affiliate.ai_match_profile = json.profile;
        if (status) {
          status.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析完了</span><br><span style="font-size:12px;color:#6b7280">${json.profile.summary || ''}</span>`;
        }
        showToast('✅ AI分析が完了しました');
        setAnalyzeBtnState(true);
      } catch (err) {
        if (status) status.textContent = `エラー: ${err.message}`;
        showToast(`分析失敗: ${err.message}`);
        setAnalyzeBtnState(false);
      }
    });

    // ── 公開設定 ─────────────────────────────────────────────
    document.getElementById('publish-toggle-input').addEventListener('change', async function () {
      document.getElementById('publish-label').textContent = this.checked ? '公開中' : '非公開';
      await save({ published: this.checked });
    });

    document.getElementById('save-affiliate-url').addEventListener('click', async () => {
      const url = document.getElementById('affiliate-url-input').value.trim();
      await save({ affiliate_url: url || null });
    });

    // ── サービス/メニュー管理 ─────────────────────────────────
    const AXIS_OPTIONS = [
      { value: 'body', label: '💪 体型・ボディ' },
      { value: 'eyebrow', label: '✏️ 眉毛' },
      { value: 'fashion', label: '👔 服・コーデ' },
      { value: 'hair', label: '💇 髪・ヘア' },
      { value: 'skin', label: '✨ 肌' },
      { value: 'teeth', label: '😁 歯' },
      { value: 'nail', label: '💅 ネイル' },
    ];

    async function loadServices() {
      const listEl = document.getElementById('services-list');
      if (!listEl) return;
      const res = await fetch(`/api/providers/${affiliate?.slug}/services`);
      if (!res.ok) { listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
      const items = await res.json();
      if (!items.length) { listEl.innerHTML = '<p class="muted">まだサービスはありません。</p>'; return; }
      listEl.innerHTML = '';
      items.forEach(svc => {
        const row = document.createElement('div');
        row.className = 'service-row';
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <strong style="font-size:14px">${esc(svc.name)}</strong>
              ${svc.price ? `<span style="font-size:13px;color:#6b7280;margin-left:8px">¥${Number(svc.price).toLocaleString()}</span>` : ''}
              ${svc.target_axis ? `<span style="font-size:11px;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;margin-left:6px">${AXIS_OPTIONS.find(a=>a.value===svc.target_axis)?.label||svc.target_axis}</span>` : ''}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-svc-edit="${svc.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-svc-delete="${svc.id}" data-svc-name="${esc(svc.name)}">削除</button>
            </div>
          </div>
        `;
        listEl.appendChild(row);
      });

      listEl.querySelectorAll('[data-svc-edit]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const svc = items.find(s => s.id === btn.dataset.svcEdit);
          if (svc) openServiceForm(svc);
        });
      });
      listEl.querySelectorAll('[data-svc-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`「${btn.dataset.svcName}」を削除しますか？`)) return;
          const r = await fetch(`/api/provider/services/${btn.dataset.svcDelete}`, { method: 'DELETE', headers: h() });
          if (r.ok) { loadServices(); showToast('削除しました'); }
          else showToast('削除エラー');
        });
      });
    }

    function openServiceForm(svc) {
      const form = document.getElementById('service-edit-form');
      if (!form) return;
      form.style.display = 'block';
      form.querySelector('[name=_svc_id]').value = svc?.id || '';
      form.querySelector('[name=name]').value = svc?.name || '';
      form.querySelector('[name=price]').value = svc?.price || '';
      form.querySelector('[name=duration]').value = svc?.duration || '';
      form.querySelector('[name=target_axis]').value = svc?.target_axis || '';
      form.querySelector('[name=transformation_promise]').value = svc?.transformation_promise || '';
      form.scrollIntoView({ behavior: 'smooth' });
    }

    document.getElementById('btn-add-service').addEventListener('click', () => openServiceForm(null));
    document.getElementById('svc-cancel-btn').addEventListener('click', () => {
      document.getElementById('service-edit-form').style.display = 'none';
      document.getElementById('service-edit-form').reset();
    });

    document.getElementById('service-edit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const svcId = fd.get('_svc_id');
      const body = {
        provider_id: id,
        name: fd.get('name'),
        price: fd.get('price') ? Number(fd.get('price')) : null,
        duration: fd.get('duration') || null,
        target_axis: fd.get('target_axis') || null,
        transformation_promise: fd.get('transformation_promise') || null,
      };
      const url = svcId ? `/api/provider/services/${svcId}` : '/api/provider/services';
      const method = svcId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: h(), body: JSON.stringify(body) });
      if (res.ok) {
        document.getElementById('service-edit-form').style.display = 'none';
        document.getElementById('service-edit-form').reset();
        loadServices();
        showToast('保存しました');
      } else {
        const err = await res.json();
        showToast('エラー: ' + (err.error || '不明'));
      }
    });

    load();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, [id]);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: '800px' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <a href="/admin/affiliates" style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none' }}>← アフィリエイト管理</a>
            <h1 className="section-title" style={{ margin: '4px 0 4px' }} id="aff-name-header">読み込み中…</h1>
            <a id="aff-page-link" href="#" target="_blank" style={{ fontSize: '12px', color: '#6366f1' }}></a>
          </div>
          <a id="view-page-btn" href="#" target="_blank" className="btn btn-ghost" style={{ fontSize: '13px' }}
            onClick={e => { const slug = document.getElementById('aff-page-link')?.href?.split('/affiliate/')?.[1]; if (slug) e.currentTarget.href = `/affiliate/${slug}`; }}>
            公開ページを見る ↗
          </a>
        </div>

        {/* AI自動入力カード */}
        <div id="regen-section" style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1px solid #c7d2fe', borderRadius: '16px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#6366f1', marginBottom: '8px' }}>✨ AI自動入力</div>
          <p style={{ fontSize: '12px', color: '#374151', margin: '0 0 12px', lineHeight: '1.6' }}>
            サービス名を入力してAIに調査させると、全フィールドが自動入力されます。既存の内容は上書きされます。
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <input id="regen-service-name" type="text" placeholder="サービス名（例: ローランドビューティーラウンジ）"
              style={{ flex: '1 1 200px', padding: '8px 12px', border: '1.5px solid #c7d2fe', borderRadius: '8px', fontSize: '13px' }} />
            <input id="regen-service-url" type="url" placeholder="公式サイトURL（任意・精度向上）"
              style={{ flex: '1 1 180px', padding: '8px 12px', border: '1.5px solid #c7d2fe', borderRadius: '8px', fontSize: '13px' }} />
            <button type="button" id="btn-regenerate" className="btn" style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
              ✨ AI自動入力
            </button>
          </div>
          <div id="regen-status" style={{ display: 'none', fontSize: '12px', marginTop: '4px' }}></div>
        </div>

        {/* タブナビ */}
        <div className="tab-nav">
          <button className="tab-btn active" data-tab="profile">プロフィール</button>
          <button className="tab-btn" data-tab="service">サービス設定</button>
          <button className="tab-btn" data-tab="publish">公開設定</button>
        </div>

        {/* タブ①：プロフィール */}
        <div className="tab-pane active" id="tab-profile">
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>基本情報</h2>
            <form id="profile-form">
              <div className="form-field">
                <label>掲載名 *</label>
                <input name="name" required />
              </div>
              <div className="form-field">
                <label>メインカテゴリ *</label>
                <select name="main_category" required>
                  <option value="">選択</option>
                  {CAT_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>キャッチコピー</label>
                <input name="catchphrase" placeholder="例: 自宅で本格AGA診断。初回無料で専門医に相談できる。" />
              </div>
              <div className="form-field">
                <label>こんな方に向いています（1行ずつ書くと番号リストで表示）</label>
                <textarea name="target_desc" style={{ minHeight: '100px' }} placeholder={'薄毛が気になり始めた方\nまず相談だけしたい方'}></textarea>
              </div>
              <div className="form-field">
                <label>大切にしていること（哲学）</label>
                <textarea name="philosophy" placeholder="サービスの考え方・信念・強みを自分の言葉で。"></textarea>
              </div>
              <div className="form-field" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px' }}>
                <label>🧭 変容の旅を始めようとしている方への言葉</label>
                <textarea name="guide_message" style={{ minHeight: '90px' }} placeholder="ここから変わろうとしているあなたへ、ガイドとして一言あれば。"></textarea>
              </div>
              <div className="form-field">
                <label>他サービスとの違い・このガイドだけの強み</label>
                <textarea name="unique_strengths" placeholder="例: 全国どこからでもオンラインで専門医に相談できる唯一のサービス。"></textarea>
              </div>
              <div className="form-field">
                <label>プロフィール写真URL</label>
                <input name="photo_url" type="url" placeholder="https://..." />
                <small className="muted">外部ホスティングのURL（S3 / CDN等）を貼り付けてください</small>
              </div>
              <div className="form-field">
                <label>ヒーロー画像URL（ページ上部の背景バナー）</label>
                <input name="cover_image_url" type="url" placeholder="https://..." />
              </div>
              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ②：サービス設定 */}
        <div className="tab-pane" id="tab-service">
          {/* AIマッチングセクション */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>マッチング設定</h2>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: '12px' }}>New Me Naviでユーザーにマッチングされるための設定です。</p>
            <form id="service-form">
              <div className="form-field">
                <label>サービス説明文</label>
                <textarea name="description" placeholder="サービスの詳細・料金・メニューなど"></textarea>
              </div>
              <div className="form-field">
                <label>最低価格の目安（円）</label>
                <input name="price_from" type="number" placeholder="10000" />
              </div>
              <div className="form-field">
                <label>提供スタイル</label>
                <select name="provider_style">
                  <option value="">未設定</option>
                  <option value="explanation">納得してから動く人向け（理由を丁寧に説明）</option>
                  <option value="consultation">相談しながら進めたい人向け</option>
                  <option value="delegate">任せて結果を出してほしい人向け</option>
                  <option value="cautious">小さく試したい人向け</option>
                </select>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>AIマッチング用テキスト</h3>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 14px' }}>入力後「AIで分析する」を実行するとマッチング精度が向上します。</p>
              <div className="form-field">
                <label>よく来るお客様の状況・背景</label>
                <textarea name="ideal_client_desc" placeholder="例: マッチングアプリを使い始めたが写真に自信がない30代男性。外見を気にしつつも何から始めるかわからない状態。"></textarea>
              </div>
              <div className="form-field">
                <label>来る前の典型的な状態</label>
                <textarea name="client_before_state" placeholder="例: 薄毛が気になり始めているが、病院に行くほどでもないと思って放置している。"></textarea>
              </div>
              <div className="form-field">
                <label>よく起きる変化のパターン</label>
                <textarea name="transformation_pattern" placeholder="例: 自宅で診断→オンライン診察→薬の処方という流れで、来院せずに治療を開始できる。"></textarea>
              </div>
              <div className="form-field">
                <label>特に向いている人・状況</label>
                <textarea name="best_fit_desc" placeholder="例: 忙しくて病院に行けない人、まず相談だけしたい人、費用を抑えて治療したい人。"></textarea>
              </div>

              {/* AI分析ステータス */}
              <div style={{ padding: '14px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '14px' }}>
                <div id="ai-match-status" style={{ fontSize: '13px', color: '#6b7280' }}>未分析</div>
              </div>
              <button type="button" id="ai-analyze-btn" className="btn" style={{ marginBottom: '20px' }}>AIで分析する</button>

              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 10px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>得意なきっかけ</h3>
              <div className="checkbox-group" style={{ marginBottom: '16px' }}>
                <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="matching_app" />マッチングアプリ</label>
                <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="love" />恋愛・告白前</label>
                <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="career" />就職・転職前</label>
                <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="word" />一言が刺さった</label>
                <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="vague" />ずっと気になっていた</label>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 10px' }}>得意な「来た道」の類型</h3>
              <div className="checkbox-group" style={{ marginBottom: '16px' }}>
                <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="lost_direction" />再開タイプ</label>
                <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_continuation" />継続タイプ</label>
                <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_result" />非客観視タイプ</label>
                <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="cost" />コスト断念</label>
                <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="awkward" />関係性の問題</label>
              </div>

              <button type="submit" className="btn">保存する</button>
            </form>
          </div>

          {/* サービス・メニュー */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>サービス・メニュー</h2>
              <button type="button" className="btn" id="btn-add-service" style={{ fontSize: '13px', padding: '7px 14px' }}>＋ 追加</button>
            </div>
            <div id="services-list"><p className="muted">読み込み中…</p></div>

            <div id="service-edit-form" className="service-edit-form">
              <h3 style={{ margin: '0 0 14px', fontSize: '14px' }}>サービスを追加・編集</h3>
              <form>
                <div className="form-field"><label>サービス名 *</label><input name="name" required placeholder="例: 初回オンライン診察コース" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-field"><label>価格（円）</label><input name="price" type="number" placeholder="5000" /></div>
                  <div className="form-field"><label>所要時間</label><input name="duration" placeholder="例: 30分" /></div>
                </div>
                <div className="form-field">
                  <label>対応軸（Me Scan 7軸）</label>
                  <select name="target_axis">
                    <option value="">選択しない</option>
                    <option value="body">💪 体型・ボディ</option>
                    <option value="eyebrow">✏️ 眉毛</option>
                    <option value="fashion">👔 服・コーデ</option>
                    <option value="hair">💇 髪・ヘア</option>
                    <option value="skin">✨ 肌</option>
                    <option value="teeth">😁 歯</option>
                    <option value="nail">💅 ネイル</option>
                  </select>
                </div>
                <div className="form-field"><label>変容の約束（このサービスで何が変わるか）</label><textarea name="transformation_promise" placeholder="例: 初回診察から最短2週間で発毛治療を開始できます。"></textarea></div>
                <input type="hidden" name="_svc_id" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn">保存</button>
                  <button type="button" className="btn btn-ghost" id="svc-cancel-btn">キャンセル</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* タブ③：公開設定 */}
        <div className="tab-pane" id="tab-publish">
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>公開状態</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <label className="toggle-switch">
                <input type="checkbox" id="publish-toggle-input" />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ fontWeight: '700' }} id="publish-label">非公開</span>
            </div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>アフィリエイトURL（PR先）</h2>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: '12px' }}>公開ページの「詳しく見る」ボタンが遷移する先のURLです。</p>
            <div className="form-field">
              <label>URL</label>
              <input type="url" id="affiliate-url-input" placeholder="https://..." />
            </div>
            <button type="button" className="btn" id="save-affiliate-url">保存する</button>
          </div>
        </div>

      </div>
    </main>
  );
}
