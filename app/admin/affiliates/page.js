'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAffiliatesPage() {
  const initialized = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
      .badge-green { background: #d1fae5; color: #065f46; }
      .badge-gray  { background: #f3f4f6; color: #6b7280; }
      .badge-red   { background: #fee2e2; color: #991b1b; }
      .aff-row { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 10px; background: #fff; }
      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .modal-box { background: #fff; border-radius: 18px; padding: 28px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
      .form-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
      .form-field label { font-size: 12px; font-weight: 700; color: #374151; }
      .form-field input, .form-field select { padding: 8px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; width: 100%; box-sizing: border-box; }
      .kpi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-bottom: 20px; }
      .kpi-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
      .kpi-value { font-size: 28px; font-weight: 800; color: #111; }
      .kpi-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }

    const listEl  = document.getElementById('list');
    const modal   = document.getElementById('modal');
    const form    = document.getElementById('aform');
    let affiliates = [];

    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function catLabel(c) {
      return { gym:'ジム', eyebrow:'眉毛', hair:'ヘア', skin:'肌', fashion:'ファッション',
               photo:'写真', consulting:'コンサル', makeup:'メイク', nail:'ネイル',
               hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'矯正',
               marriage:'婚活', diagnosis:'骨格診断', aga:'AGA' }[c] || c;
    }

    async function load() {
      listEl.innerHTML = '<p class="muted">読み込み中…</p>';
      try {
        const res = await fetch('/api/admin/affiliates', { headers: h() });
        if (!res.ok) { listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラー。APIキーを確認してください。</p>'; return; }
        affiliates = await res.json();
        const kpiTotal = document.getElementById('kpi-total');
        if (kpiTotal) kpiTotal.textContent = affiliates.length;
        const kpiPub = document.getElementById('kpi-pub');
        if (kpiPub) kpiPub.textContent = affiliates.filter(a => a.published && !a.admin_hidden).length;
        if (!affiliates.length) { listEl.innerHTML = '<p class="muted">アフィリエイトがありません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        affiliates.forEach(a => {
          const row = document.createElement('div');
          row.className = 'aff-row';
          const statusLabel = a.admin_hidden ? '強制非公開' : a.published ? '公開中' : '非公開';
          const statusClass = a.admin_hidden ? 'badge-red' : a.published ? 'badge-green' : 'badge-gray';
          const aiLabel = a.ai_match_profile ? '<span class="badge badge-green">AI分析済み</span>' : '';
          row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
              <div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <strong style="font-size:15px">${esc(a.name)}</strong>
                  <span class="badge ${statusClass}">${statusLabel}</span>
                  <span class="badge badge-gray">${catLabel(a.main_category)}</span>
                  ${aiLabel}
                </div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px">
                  ${a.price_from ? `¥${Number(a.price_from).toLocaleString()}〜 ` : ''}
                  <a href="/affiliate/${esc(a.slug)}" target="_blank" style="color:#6366f1">/affiliate/${esc(a.slug)}</a>
                  ${a.affiliate_url ? ` → <a href="${esc(a.affiliate_url)}" target="_blank" style="color:#059669;font-size:11px">PR先リンク ↗</a>` : ''}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-edit="${a.id}">編集</button>
                <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-toggle="${a.id}" data-pub="${a.published}">
                  ${a.published ? '非公開にする' : '公開する'}
                </button>
                <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-delete="${a.id}" data-name="${esc(a.name)}">削除</button>
              </div>
            </div>
          `;
          listEl.appendChild(row);
        });

        listEl.querySelectorAll('[data-edit]').forEach(btn => {
          btn.addEventListener('click', () => {
            window.location.href = `/admin/affiliates/${btn.dataset.edit}`;
          });
        });
        listEl.querySelectorAll('[data-toggle]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.toggle;
            const isPub = btn.dataset.pub === 'true';
            await fetch(`/api/admin/affiliates/${id}`, { method: 'PATCH', headers: h(), body: JSON.stringify({ published: !isPub }) });
            load();
          });
        });
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm(`「${btn.dataset.name}」を削除しますか？`)) return;
            const res = await fetch(`/api/admin/affiliates/${btn.dataset.delete}`, { method: 'DELETE', headers: h() });
            if (res.ok) { load(); } else { const err = await res.json(); alert('削除エラー: ' + (err.error || '不明')); }
          });
        });
      } catch (e) { listEl.innerHTML = `<p class="muted" style="color:#ef4444">接続エラー: ${e.message}</p>`; }
    }

    function closeModal() { modal.style.display = 'none'; form.reset(); resetModalState(); }
    function resetModalState() {
      document.getElementById('ai-status').style.display = 'none';
      document.getElementById('ai-status').textContent = '';
      document.getElementById('btn-ai-fill').disabled = false;
      document.getElementById('btn-ai-fill').textContent = '✨ AI自動入力して登録';
    }

    document.getElementById('btn-new').addEventListener('click', () => { modal.style.display = 'flex'; });
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);

    // AI自動入力して登録
    document.getElementById('btn-ai-fill').addEventListener('click', async () => {
      const serviceName = form.elements['service_name'].value.trim();
      const affiliateUrl = form.elements['affiliate_url'].value.trim();
      const serviceUrl = form.elements['service_url'].value.trim();
      if (!serviceName) { alert('サービス名を入力してください'); return; }

      const btn = document.getElementById('btn-ai-fill');
      const status = document.getElementById('ai-status');
      btn.disabled = true;
      btn.textContent = '調査中…';
      status.style.display = 'block';
      status.style.color = '#6b7280';
      status.textContent = 'AIがサービス情報を調査しています…（10〜20秒かかります）';

      try {
        // Step 1: AI自動入力
        const aiRes = await fetch('/api/admin/affiliates/auto-fill', {
          method: 'POST', headers: h(),
          body: JSON.stringify({ service_name: serviceName, service_url: serviceUrl || undefined }),
        });
        if (!aiRes.ok) { const e = await aiRes.json(); throw new Error(e.error || 'AI生成失敗'); }
        const aiData = await aiRes.json();

        btn.textContent = '登録中…';
        status.textContent = '情報を生成しました。アフィリエイトを登録中…';

        // Step 2: アフィリエイト作成
        const createRes = await fetch('/api/admin/affiliates', {
          method: 'POST', headers: h(),
          body: JSON.stringify({
            name: serviceName,
            affiliate_url: affiliateUrl || null,
            ...aiData,
          }),
        });
        if (!createRes.ok) { const e = await createRes.json(); throw new Error(e.error || '登録失敗'); }
        const result = await createRes.json();

        status.style.color = '#059669';
        status.textContent = '✅ 登録完了！編集画面に移動します…';
        setTimeout(() => { window.location.href = `/admin/affiliates/${result.id}`; }, 800);
      } catch (err) {
        status.style.color = '#ef4444';
        status.textContent = `エラー: ${err.message}`;
        btn.disabled = false;
        btn.textContent = '✨ AI自動入力して登録';
      }
    });

    load();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div>
        <section className="stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h1 className="section-title" style={{ margin: '0' }}>アフィリエイト管理</h1>
            <button className="btn" id="btn-new" type="button">＋ 追加</button>
          </div>
          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-value" id="kpi-total">—</div><div className="kpi-label">登録数</div></div>
            <div className="kpi-card"><div className="kpi-value" id="kpi-pub">—</div><div className="kpi-label">公開中</div></div>
          </div>
          <div id="list"><p className="muted">読み込み中…</p></div>
        </section>
      </div>

      {/* 新規作成モーダル */}
      <div className="modal-overlay" id="modal" style={{ display: 'none' }}>
        <div className="modal-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: '0', fontSize: '18px' }}>アフィリエイトを追加</h2>
            <button type="button" id="modal-close" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
          </div>

          {/* AI自動入力の説明 */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#6366f1', marginBottom: '6px' }}>✨ AI自動入力モード</div>
            <p style={{ fontSize: '12px', color: '#374151', margin: '0', lineHeight: '1.6' }}>
              サービス名を入力してボタンを押すと、AIがサービスを調査してFinemeの全フィールドを自動入力します。
              登録後に編集画面で内容を確認・修正できます。
            </p>
          </div>

          <form id="aform" className="stack">
            <div className="form-field">
              <label>サービス名 *</label>
              <input name="service_name" required placeholder="例: ローランドビューティーラウンジ" />
              <small style={{ fontSize: '11px', color: '#9ca3af' }}>AIがこの名前で情報を調査します</small>
            </div>
            <div className="form-field">
              <label>アフィリエイトURL（PR先リンク）*</label>
              <input name="affiliate_url" required placeholder="https://px.a8.net/..." />
              <small style={{ fontSize: '11px', color: '#9ca3af' }}>A8.netなどのトラッキングURLを貼り付け</small>
            </div>
            <div className="form-field">
              <label>サービスの公式サイトURL（任意・精度向上）</label>
              <input name="service_url" type="url" placeholder="https://..." />
              <small style={{ fontSize: '11px', color: '#9ca3af' }}>入力するとAIがサイトを読んでより正確な情報を生成します</small>
            </div>

            {/* ステータス表示 */}
            <div id="ai-status" style={{ display: 'none', fontSize: '13px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}></div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" id="modal-cancel">キャンセル</button>
              <button type="button" className="btn" id="btn-ai-fill">✨ AI自動入力して登録</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
