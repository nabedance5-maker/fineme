'use client';
import { useEffect, useRef } from 'react';

export default function AdminPaymentsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
      .kpi-card{padding:16px;border:1px solid var(--color-border);border-radius:12px;background:#fff}
      .kpi-label{color:#6b7280;font-size:12px;margin-bottom:4px}
      .kpi-value{font-weight:800;font-size:24px}
      .kpi-sub{font-size:11px;color:#9ca3af;margin-top:2px}
      .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
      .badge-active{background:#d1fae5;color:#065f46}
      .badge-trialing{background:#dbeafe;color:#1e40af}
      .badge-pending{background:#fef3c7;color:#92400e}
      .badge-past_due{background:#fee2e2;color:#991b1b}
      .badge-cancelled{background:#f3f4f6;color:#6b7280}
      .badge-paid{background:#d1fae5;color:#065f46}
      .badge-failed{background:#fee2e2;color:#991b1b}
      .badge-referral{background:#ede9fe;color:#5b21b6}
      .tab-bar{display:flex;gap:0;border-bottom:2px solid var(--color-border);margin-bottom:16px}
      .tab-btn{padding:10px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s}
      .tab-btn.active{color:var(--color-primary,#111);border-bottom-color:var(--color-primary,#111);font-weight:600}
      .tab-panel{display:none}
      .tab-panel.active{display:block}
      .table-responsive{overflow-x:auto}
      .table{width:100%;border-collapse:collapse;font-size:13px}
      .table th,.table td{padding:10px 8px;text-align:left;border-bottom:1px solid var(--color-border)}
      .table th{font-weight:600;color:#374151;background:#f9fafb}
      .table tbody tr:hover{background:#f9fafb}
      .referral-chain{font-size:12px;color:#6b7280}
      @media(max-width:960px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);

    const API = '/api/billing';

    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function copyStripeId(id) { if (!id) return alert('Stripe IDがありません（未連携）'); navigator.clipboard.writeText(id).then(() => alert(`コピーしました: ${id}`)); }
    window._copyStripeId = copyStripeId;

    async function loadKPI() {
      try {
        const data = await fetch(`${API}/summary`).then(r => r.json());
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('kpi-mrr', `¥${(data.mrr || 0).toLocaleString()}`);
        set('kpi-active', data.activeSubscriptions || 0);
        set('kpi-trialing', data.trialingProviders || 0);
        set('kpi-total', data.totalProviders || 0);
        set('kpi-referral-pending', `¥${(data.pendingReferralRewards || 0).toLocaleString()}`);
      } catch (e) { console.warn('KPI load failed:', e.message); }
    }

    let subsData = [];
    async function loadSubscriptions() {
      try {
        subsData = await fetch(`${API}/providers`).then(r => r.json());
        renderSubscriptions();
      } catch {
        const empty = document.getElementById('sub-empty'); if (empty) empty.style.display = '';
        const tbody = document.getElementById('subscriptions-tbody'); if (tbody) tbody.innerHTML = '';
      }
    }

    function statusBadge(status) {
      const map = { active: ['badge-active', '課金中'], trialing: ['badge-trialing', '予約待ち'], pending: ['badge-pending', '未設定'], past_due: ['badge-past_due', '支払い遅延'], cancelled: ['badge-cancelled', '解約済み'] };
      const [cls, label] = map[status] || ['badge-pending', status || '不明'];
      return `<span class="badge ${cls}">${label}</span>`;
    }

    function renderSubscriptions() {
      const search = (document.getElementById('sub-search')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('sub-status-filter')?.value || '';
      const filtered = subsData.filter(p => {
        const matchSearch = !search || (p.displayName || '').toLowerCase().includes(search) || (p.email || '').toLowerCase().includes(search);
        const matchStatus = !statusFilter || p.subscriptionStatus === statusFilter;
        return matchSearch && matchStatus;
      });
      const tbody = document.getElementById('subscriptions-tbody');
      if (!tbody) return;
      if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:24px">該当する掲載者がいません</td></tr>'; return; }
      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><div style="font-weight:600">${esc(p.displayName || '-')}</div><div style="font-size:11px;color:#6b7280">${esc(p.email || '')}</div></td>
          <td>${esc(p.category || '-')}</td>
          <td>${statusBadge(p.subscriptionStatus)}</td>
          <td>¥${(p.planAmount || 0).toLocaleString()}/月</td>
          <td>${p.billingStartDate ? p.billingStartDate.slice(0, 10) : '-'}</td>
          <td class="referral-chain">${esc(p.referrerName || '-')}</td>
          <td>${p.createdAt ? p.createdAt.slice(0, 10) : '-'}</td>
          <td><button class="btn btn-ghost" style="font-size:11px;padding:4px 8px" onclick="window._copyStripeId('${esc(p.stripeCustomerId || '')}')">Stripe</button></td>
        </tr>
      `).join('');
    }

    let paymentsData = [];
    async function loadPayments() {
      if (paymentsData.length > 0) return;
      try {
        paymentsData = await fetch(`${API}/payments`).then(r => r.json());
        renderPayments();
      } catch {
        const tbody = document.getElementById('payments-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">読み込み失敗（server offline?）</td></tr>';
      }
    }

    function renderPayments() {
      const search = (document.getElementById('pay-search')?.value || '').toLowerCase();
      const filtered = paymentsData.filter(p => !search || (p.providerName || '').toLowerCase().includes(search) || (p.stripeInvoiceId || '').toLowerCase().includes(search));
      const tbody = document.getElementById('payments-tbody');
      if (!tbody) return;
      if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">該当データなし</td></tr>'; return; }
      const payBadge = s => s === 'paid' ? '<span class="badge badge-paid">成功</span>' : '<span class="badge badge-failed">失敗</span>';
      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><div style="font-weight:600">${esc(p.providerName || '-')}</div><div style="font-size:11px;color:#6b7280">${esc(p.providerEmail || '')}</div></td>
          <td>¥${(p.amount || 0).toLocaleString()}</td>
          <td>${payBadge(p.status)}</td>
          <td style="font-size:11px;color:#6b7280;max-width:160px;overflow:hidden;text-overflow:ellipsis">${esc(p.stripeInvoiceId || '-')}</td>
          <td>${p.paidAt ? p.paidAt.slice(0, 10) : '-'}</td>
          <td>${p.createdAt ? p.createdAt.slice(0, 10) : '-'}</td>
        </tr>
      `).join('');
    }

    let referralsData = [];
    async function loadReferrals() {
      if (referralsData.length > 0) return;
      try {
        referralsData = await fetch(`${API}/referrals`).then(r => r.json());
        renderReferrals();
      } catch {
        const tbody = document.getElementById('referrals-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">読み込み失敗（server offline?）</td></tr>';
      }
    }

    function renderReferrals() {
      const search = (document.getElementById('ref-search')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('ref-status-filter')?.value || '';
      const filtered = referralsData.filter(r => {
        const matchSearch = !search || (r.referrerName || '').toLowerCase().includes(search) || (r.referredName || '').toLowerCase().includes(search);
        const matchStatus = !statusFilter || r.status === statusFilter;
        return matchSearch && matchStatus;
      });
      const tbody = document.getElementById('referrals-tbody');
      if (!tbody) return;
      if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">該当データなし</td></tr>'; const refTotal = document.getElementById('ref-total'); if (refTotal) refTotal.textContent = ''; return; }
      const total = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + (r.rewardAmount || 0), 0);
      const refTotal = document.getElementById('ref-total'); if (refTotal) refTotal.textContent = `未払い合計: ¥${total.toLocaleString()}`;
      tbody.innerHTML = filtered.map(r => `
        <tr>
          <td><input type="checkbox" class="ref-check" data-id="${r.id}" ${r.status === 'paid' ? 'disabled' : ''} /></td>
          <td><div style="font-weight:600">${esc(r.referrerName || '-')}</div><div style="font-size:11px;color:#6b7280">${esc(r.referrerEmail || '')}</div></td>
          <td><div>${esc(r.referredName || '-')}</div><div style="font-size:11px;color:#6b7280">${esc(r.referredEmail || '')}</div></td>
          <td><span class="badge badge-referral">¥${(r.rewardAmount || 0).toLocaleString()}</span></td>
          <td>${r.periodYearMonth || '-'}</td>
          <td>${r.status === 'paid' ? '<span class="badge badge-active">支払い済み</span>' : '<span class="badge badge-pending">未払い</span>'}</td>
          <td>${r.paidAt ? r.paidAt.slice(0, 10) : '-'}</td>
        </tr>
      `).join('');
    }

    // Wire controls
    const subSearch = document.getElementById('sub-search'); if (subSearch) subSearch.addEventListener('input', renderSubscriptions);
    const subStatusFilter = document.getElementById('sub-status-filter'); if (subStatusFilter) subStatusFilter.addEventListener('change', renderSubscriptions);
    const subRefresh = document.getElementById('sub-refresh'); if (subRefresh) subRefresh.addEventListener('click', () => { loadKPI(); loadSubscriptions(); });
    const paySearch = document.getElementById('pay-search'); if (paySearch) paySearch.addEventListener('input', renderPayments);
    const refSearch = document.getElementById('ref-search'); if (refSearch) refSearch.addEventListener('input', renderReferrals);
    const refStatusFilter = document.getElementById('ref-status-filter'); if (refStatusFilter) refStatusFilter.addEventListener('change', renderReferrals);
    const refSelectAll = document.getElementById('ref-select-all');
    if (refSelectAll) { refSelectAll.addEventListener('change', function () { document.querySelectorAll('.ref-check:not(:disabled)').forEach(c => c.checked = this.checked); }); }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById(`tab-${btn.dataset.tab}`); if (panel) panel.classList.add('active');
        if (btn.dataset.tab === 'payments') loadPayments();
        if (btn.dataset.tab === 'referrals') loadReferrals();
      });
    });

    loadKPI();
    loadSubscriptions();

    return () => {
      try { document.head.removeChild(style); } catch {}
      delete window._copyStripeId;
    };
  }, []);

  return (
    <main className="section">
      <div>
        <section className="stack">
          <h1 className="section-title">課金・サブスク管理</h1>
          <p className="muted">掲載者の課金状況・決済履歴・紹介報酬を管理します。</p>

          <div className="kpi-grid">
            <div className="kpi-card"><div className="kpi-label">MRR（月次収益）</div><div id="kpi-mrr" className="kpi-value">¥0</div><div className="kpi-sub">アクティブ掲載者合計</div></div>
            <div className="kpi-card"><div className="kpi-label">アクティブ掲載者</div><div id="kpi-active" className="kpi-value">0</div><div className="kpi-sub">課金中</div></div>
            <div className="kpi-card"><div className="kpi-label">初回予約待ち</div><div id="kpi-trialing" className="kpi-value">0</div><div className="kpi-sub">登録済・未課金</div></div>
            <div className="kpi-card"><div className="kpi-label">掲載者合計</div><div id="kpi-total" className="kpi-value">0</div><div className="kpi-sub">全ステータス</div></div>
            <div className="kpi-card"><div className="kpi-label">未払い紹介報酬</div><div id="kpi-referral-pending" className="kpi-value">¥0</div><div className="kpi-sub">当月以前の未払い分</div></div>
          </div>

          <div className="card" style={{padding:'16px'}}>
            <div className="tab-bar">
              <button className="tab-btn active" data-tab="subscriptions">サブスク一覧</button>
              <button className="tab-btn" data-tab="payments">決済履歴</button>
              <button className="tab-btn" data-tab="referrals">紹介報酬</button>
            </div>

            <div id="tab-subscriptions" className="tab-panel active">
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px',flexWrap:'wrap'}}>
                <input id="sub-search" type="text" placeholder="掲載者名・メールで検索" style={{flex:'1',minWidth:'200px'}} />
                <select id="sub-status-filter">
                  <option value="">全ステータス</option>
                  <option value="active">アクティブ（課金中）</option>
                  <option value="trialing">初回予約待ち</option>
                  <option value="pending">未登録</option>
                  <option value="past_due">支払い遅延</option>
                  <option value="cancelled">解約済み</option>
                </select>
                <button className="btn btn-ghost" id="sub-refresh">更新</button>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>掲載者名</th><th>カテゴリ</th><th>ステータス</th><th>月額</th><th>課金開始</th><th>紹介者</th><th>登録日</th><th>操作</th></tr></thead>
                  <tbody id="subscriptions-tbody"><tr><td colSpan={8} className="muted" style={{textAlign:'center',padding:'32px'}}>読み込み中...</td></tr></tbody>
                </table>
              </div>
              <div id="sub-empty" className="muted" style={{textAlign:'center',padding:'32px',display:'none'}}>
                掲載者データがありません。Express server（:3001）が起動しているか確認してください。
              </div>
            </div>

            <div id="tab-payments" className="tab-panel">
              <div style={{marginBottom:'12px'}}>
                <input id="pay-search" type="text" placeholder="掲載者名・Invoice IDで検索" style={{minWidth:'260px'}} />
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>掲載者名</th><th>金額</th><th>ステータス</th><th>Invoice ID</th><th>決済日</th><th>登録日</th></tr></thead>
                  <tbody id="payments-tbody"><tr><td colSpan={6} className="muted" style={{textAlign:'center',padding:'32px'}}>タブをクリックして読み込む</td></tr></tbody>
                </table>
              </div>
            </div>

            <div id="tab-referrals" className="tab-panel">
              <div style={{marginBottom:'12px',display:'flex',gap:'12px',flexWrap:'wrap'}}>
                <input id="ref-search" type="text" placeholder="紹介者・被紹介者名で検索" style={{flex:'1',minWidth:'200px'}} />
                <select id="ref-status-filter">
                  <option value="">全ステータス</option>
                  <option value="pending">未払い</option>
                  <option value="paid">支払い済み</option>
                </select>
                <button className="btn btn-ghost" id="ref-mark-paid">選択済みを支払い済みにする</button>
              </div>
              <p className="muted" style={{fontSize:'12px',marginBottom:'8px'}}>
                紹介者がFinemeに掲載者を紹介し、被紹介者の課金が発生した月に¥500/月が積み上がります。
              </p>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr>
                    <th><input type="checkbox" id="ref-select-all" /></th>
                    <th>紹介者</th><th>被紹介者</th><th>報酬額</th><th>対象月</th><th>ステータス</th><th>支払日</th>
                  </tr></thead>
                  <tbody id="referrals-tbody"><tr><td colSpan={7} className="muted" style={{textAlign:'center',padding:'32px'}}>タブをクリックして読み込む</td></tr></tbody>
                </table>
              </div>
              <div id="ref-total" className="muted" style={{textAlign:'right',fontSize:'13px',marginTop:'8px'}}></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
