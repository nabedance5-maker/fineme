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

    document.getElementById('btn-new').addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    document.getElementById('modal-close').addEventListener('click', () => { modal.style.display = 'none'; form.reset(); });
    document.getElementById('modal-cancel').addEventListener('click', () => { modal.style.display = 'none'; form.reset(); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);
      data.price_from = data.price_from ? Number(data.price_from) : null;
      const res = await fetch('/api/admin/affiliates', { method: 'POST', headers: h(), body: JSON.stringify(data) });
      if (res.ok) {
        const result = await res.json();
        modal.style.display = 'none';
        form.reset();
        // 作成後は編集画面へ遷移
        window.location.href = `/admin/affiliates/${result.id}`;
      } else {
        const err = await res.json();
        alert('エラー: ' + (err.error || '不明'));
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

      {/* 新規作成モーダル（最小限の項目のみ — 詳細は編集画面で） */}
      <div className="modal-overlay" id="modal" style={{ display: 'none' }}>
        <div className="modal-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', fontSize: '18px' }}>アフィリエイトを追加</h2>
            <button type="button" id="modal-close" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
          </div>
          <p className="muted" style={{ fontSize: '12px', marginBottom: '16px' }}>まず基本情報を入力してください。詳細は次の編集画面で設定できます。</p>
          <form id="aform" className="stack">
            <div className="form-field"><label>掲載名 *</label><input name="name" required placeholder="例: スカルプDオンライン診断" /></div>
            <div className="form-field">
              <label>メインカテゴリ *</label>
              <select name="main_category" required>
                <option value="">選択</option>
                <option value="gym">パーソナルジム</option>
                <option value="eyebrow">眉毛サロン</option>
                <option value="hair">ヘア・美容院</option>
                <option value="skin">肌・エステ</option>
                <option value="fashion">ファッション</option>
                <option value="photo">写真撮影</option>
                <option value="consulting">外見トータルサポート</option>
                <option value="makeup">メイク</option>
                <option value="nail">ネイル</option>
                <option value="hairremoval">脱毛</option>
                <option value="whitening">ホワイトニング</option>
                <option value="orthodontics">歯科矯正</option>
                <option value="marriage">結婚相談所</option>
                <option value="diagnosis">骨格診断</option>
                <option value="aga">AGA・薄毛治療</option>
              </select>
            </div>
            <div className="form-field"><label>アフィリエイトURL（PR先リンク）</label><input name="affiliate_url" type="url" placeholder="https://..." /></div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" id="modal-cancel">キャンセル</button>
              <button type="submit" className="btn">追加して編集する →</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
