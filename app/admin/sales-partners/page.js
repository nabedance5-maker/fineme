'use client';
import { useEffect, useRef } from 'react';

// 営業パートナー管理（admin専用）。でお方針（2026-10-02）：
// 「掲載者だから営業パートナーになれる」ではなく「掲載者も希望すれば別途登録できる」
// 「掲載していない人でも営業パートナーになれる」。provider_idを指定しない新規作成が、
// 掲載していない人を営業パートナーとして登録する唯一の経路（掲載者本人のopt-inは
// 各掲載者のダッシュボード「紹介報酬」タブから行う）。
export default function AdminSalesPartnersPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .sp-wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px; color: #111; }
      .sp-row { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; background: #fff; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
      .sp-name { font-weight: 700; font-size: 15px; }
      .sp-code { font-family: monospace; font-size: 13px; background: #f3f4f6; padding: 2px 8px; border-radius: 6px; }
      .sp-meta { font-size: 12px; color: #111; }
      .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
      .badge-green { background: #d1fae5; color: #065f46; }
      .badge-gray { background: #f3f4f6; color: #111; }
      .sp-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
      .sp-form input, .sp-form select { padding: 8px 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
      .sp-form button { padding: 8px 16px; border-radius: 8px; border: none; background: #111; color: #fff; font-weight: 700; cursor: pointer; }
      .sp-btn-ghost { padding: 6px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; color: #111; font-size: 12px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }
    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }

    const root = document.getElementById('sp-root');
    root.innerHTML = `
      <div class="sp-wrap">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:4px;">営業パートナー管理</h1>
        <p style="font-size:13px;color:#111;margin-bottom:20px;">
          契約者とは別の役割です。Finemeに掲載していない人も、ここから「契約者を紐付けない」状態で登録できます。
          契約者本人が希望して登録する場合は、本人のダッシュボード「紹介報酬」タブから行います。
        </p>
        <div class="sp-form">
          <input id="sp-new-name" placeholder="氏名・屋号" style="flex:1;min-width:140px;" />
          <input id="sp-new-email" placeholder="メール（任意）" style="flex:1;min-width:140px;" />
          <input id="sp-new-provider" placeholder="契約者ID（任意・空欄なら未掲載の営業パートナー）" style="flex:1;min-width:220px;" />
          <button id="sp-new-submit">新規登録</button>
        </div>
        <div id="sp-issued"></div>
        <div class="sp-row" style="display:block;">
          <div class="sp-name" style="margin-bottom:4px;">報酬の自動送金</div>
          <p class="sp-meta" style="margin:0 0 8px;">毎月25日に、前月までの未払いの報酬を各パートナーの受け取り口座へ自動で送金します（結果は運営にメールで届きます）。口座が未登録の人の分は保留され、登録後の送金日にまとめて送られます。自動送金が失敗した時だけ、下のボタンで送り直してください。</p>
          <button class="sp-btn-ghost" id="sp-payout-now">前月までの未払いを今すぐ送金</button>
        </div>
        <div id="sp-list"><p style="color:#111;">読み込み中…</p></div>
      </div>
    `;

    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    async function load() {
      const listEl = document.getElementById('sp-list');
      try {
        const res = await fetch('/api/admin/sales-partners', { headers: h() });
        if (!res.ok) { listEl.innerHTML = `<p style="color:#b91c1c;">読み込み失敗（${res.status}）。管理APIキーを確認してください。</p>`; return; }
        const data = await res.json();
        // 報酬の受け取り口座・未払い額（毎月25日に自動送金。2026-11-06）
        const pay = await fetch('/api/admin/partner-payouts', { headers: h() }).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
        if (!Array.isArray(data) || data.length === 0) { listEl.innerHTML = '<p style="color:#111;">まだ営業パートナーが登録されていません。</p>'; return; }

        listEl.innerHTML = data.map(p => {
          const providerLabel = p.provider_id
            ? `<span class="sp-meta">契約者：${esc(p.providers?.name || p.provider_id)}</span>`
            : `<span class="sp-meta">未掲載の営業パートナー</span>`;
          const collabBadge = p.is_collaborator ? ' <span class="badge" style="background:#e0e7ff;color:#3730a3;">協業者</span>' : '';
          const badge = p.status === 'active'
            ? '<span class="badge badge-green">有効</span>'
            : '<span class="badge badge-gray">停止中</span>';
          const ps = pay[p.id] || {};
          const ACCOUNT = { partner: '受け取り口座：登録済み', store: '受け取り口座：お店の口座へ送金', pending: '受け取り口座：登録の途中', none: '受け取り口座：未登録' };
          const payLine = `<span class="sp-meta">${ACCOUNT[ps.account] || ACCOUNT.none}${ps.pending ? `・未払い ¥${ps.pending.toLocaleString()}` : ''}${ps.last ? `・直近の送金 ${esc(ps.last.payout_month)} ¥${ps.last.amount.toLocaleString()}${ps.last.status === 'failed' ? `（失敗：${esc(ps.last.error || '')}）` : ''}` : ''}</span>`;
          const portalUrl = `${location.origin}/partner/${p.access_token}`;
          const joinUrl = `${location.origin}/join/${encodeURIComponent(p.referral_code)}`;
          return `
            <div class="sp-row" data-id="${p.id}">
              <div style="flex:1;min-width:160px;">
                <div class="sp-name">${esc(p.name)} <span class="sp-code">${esc(p.referral_code)}</span>${collabBadge}</div>
                <div style="margin-top:2px;">${providerLabel}${p.email ? ` <span class="sp-meta">・${esc(p.email)}</span>` : ''}</div>
                <div style="margin-top:2px;">${payLine}</div>
              </div>
              ${badge}
              <button class="sp-btn-ghost" data-copy-portal="${portalUrl}">管理画面URLをコピー</button>
              <button class="sp-btn-ghost" data-copy-portal="${joinUrl}">申込ページURLをコピー</button>
              <button class="sp-btn-ghost" data-collab="${p.id}" data-on="${p.is_collaborator ? '1' : '0'}">${p.is_collaborator ? '協業者（解除する）' : '協業者にする'}</button>
              <button class="sp-btn-ghost" data-toggle="${p.id}" data-status="${p.status}">${p.status === 'active' ? '停止する' : '再開する'}</button>
            </div>
          `;
        }).join('');

        listEl.querySelectorAll('[data-copy-portal]').forEach(btn => {
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.copyPortal).then(() => {
              const orig = btn.textContent;
              btn.textContent = 'コピーしました';
              setTimeout(() => { btn.textContent = orig; }, 1500);
            }).catch(() => {});
          });
        });

        listEl.querySelectorAll('[data-collab]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const on = btn.dataset.on !== '1';
            if (!confirm(on ? '協業者にします。掲載2ヶ月目以降の全契約者の受領額(税抜)の10%が、毎月この人の報酬として記録されます。よろしいですか？' : '協業者を解除します。以降の受領分から10%の記録は止まります（記録済みの分は残ります）。')) return;
            await fetch('/api/admin/sales-partners', { method: 'PATCH', headers: h(), body: JSON.stringify({ id: btn.dataset.collab, is_collaborator: on }) });
            load();
          });
        });

        listEl.querySelectorAll('[data-toggle]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.toggle;
            const next = btn.dataset.status === 'active' ? 'inactive' : 'active';
            await fetch('/api/admin/sales-partners', { method: 'PATCH', headers: h(), body: JSON.stringify({ id, status: next }) });
            load();
          });
        });
      } catch (e) {
        listEl.innerHTML = `<p style="color:#b91c1c;">読み込みエラー：${esc(e.message)}</p>`;
      }
    }

    document.getElementById('sp-payout-now').addEventListener('click', async e => {
      if (!confirm('前月までの未払いの報酬を、受け取り口座が登録済みのパートナーへ今すぐ送金します。よろしいですか？')) return;
      e.target.disabled = true;
      const r = await fetch('/api/admin/partner-payouts', { method: 'POST', headers: h() }).then(x => x.json()).catch(() => null);
      e.target.disabled = false;
      if (!r || r.error) { alert('送金できませんでした：' + (r?.error || '通信エラー')); return; }
      const yen = n => `¥${n.toLocaleString()}`;
      alert([`送金済み ${r.paid.length}件${r.paid.length ? '：' + r.paid.map(x => `${x.name} ${yen(x.amount)}`).join('、') : ''}`, `保留（口座未登録） ${r.held.length}件${r.held.length ? '：' + r.held.map(x => `${x.name} ${yen(x.amount)}`).join('、') : ''}`, `失敗 ${r.failed.length}件${r.failed.length ? '：' + r.failed.map(x => `${x.name}（${x.error}）`).join('、') : ''}`].join('\n'));
      load();
    });

    document.getElementById('sp-new-submit').addEventListener('click', async () => {
      const name = document.getElementById('sp-new-name').value.trim();
      const email = document.getElementById('sp-new-email').value.trim();
      const provider_id = document.getElementById('sp-new-provider').value.trim();
      if (!name) { alert('氏名・屋号を入力してください'); return; }
      const res = await fetch('/api/admin/sales-partners', {
        method: 'POST', headers: h(),
        body: JSON.stringify({ name, email: email || null, provider_id: provider_id || null }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert('登録失敗：' + (e.error || res.status)); return; }
      // 管理画面と専用申込ページは、登録と同時に発行される。本人へ送る案内文をそのまま出す。
      const created = await res.json().catch(() => null);
      if (created?.access_token) {
        const portal = `${location.origin}/partner/${created.access_token}`;
        const join = `${location.origin}/join/${encodeURIComponent(created.referral_code)}`;
        const text = [
          `${created.name} 様`,
          '',
          'Fineme営業パートナーのご登録が完了しました。',
          '',
          `紹介コード：${created.referral_code}`,
          '',
          '■ あなた専用の申込ページ（お店にはこちらをご案内ください）',
          join,
          'このページからご相談・ご登録いただいたお店が、あなたの紹介として記録されます。',
          '',
          '■ あなた専用の管理画面（紹介の状況・報酬はこちらで確認できます）',
          portal,
          '管理画面のURLは、ご本人以外には共有しないでください。',
        ].join('\n');
        document.getElementById('sp-issued').innerHTML = `
          <div class="sp-row" style="display:block;border-color:#111;">
            <div class="sp-name" style="margin-bottom:6px;">${esc(created.name)} さんの管理画面と申込ページを発行しました</div>
            <p class="sp-meta" style="margin:0 0 8px;">下の案内文をコピーして、本人にメールで送ってください。</p>
            <textarea id="sp-issued-text" readonly style="width:100%;min-height:220px;font-size:13px;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;">${esc(text)}</textarea>
            <button class="sp-btn-ghost" id="sp-issued-copy" style="margin-top:8px;">案内文をコピー</button>
          </div>`;
        document.getElementById('sp-issued-copy').addEventListener('click', e => {
          navigator.clipboard.writeText(text).then(() => { e.target.textContent = 'コピーしました'; }).catch(() => {});
        });
      }
      document.getElementById('sp-new-name').value = '';
      document.getElementById('sp-new-email').value = '';
      document.getElementById('sp-new-provider').value = '';
      load();
    });

    load();
  }, []);

  return <div id="sp-root" />;
}
