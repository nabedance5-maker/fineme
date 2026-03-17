'use client';
import { useEffect, useRef } from 'react';

export default function BillingPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .provider-grid{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:start}
      .kpi-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .kpi-card{padding:20px;border:1px solid var(--color-border);border-radius:14px;background:#fff}
      .kpi-label{color:#6b7280;font-size:12px;margin-bottom:4px}
      .kpi-value{font-weight:800;font-size:26px}
      .kpi-sub{font-size:11px;color:#9ca3af;margin-top:2px}
      .status-hero{padding:24px;border-radius:14px;display:flex;align-items:center;gap:20px}
      .status-hero.active{background:linear-gradient(120deg,#d1fae5,#a7f3d0)}
      .status-hero.trialing{background:linear-gradient(120deg,#dbeafe,#bfdbfe)}
      .status-hero.pending{background:linear-gradient(120deg,#fef3c7,#fde68a)}
      .status-icon{font-size:40px;flex-shrink:0}
      .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}
      .badge-active{background:#065f46;color:#fff}
      .badge-trialing{background:#1e40af;color:#fff}
      .badge-pending{background:#92400e;color:#fff}
      .badge-paid{background:#d1fae5;color:#065f46}
      .badge-referral{background:#ede9fe;color:#5b21b6}
      .referral-list{display:flex;flex-direction:column;gap:8px}
      .referral-item{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--color-border);border-radius:10px;background:#fff}
      .referral-item-name{font-weight:600;font-size:14px}
      .referral-item-status{font-size:12px;color:#6b7280}
      .timeline{display:flex;flex-direction:column;gap:0}
      .timeline-item{display:flex;gap:16px;padding-bottom:20px;position:relative}
      .timeline-item:not(:last-child)::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:2px;background:#e5e7eb}
      .timeline-dot{width:24px;height:24px;border-radius:50%;background:#e5e7eb;border:3px solid #fff;box-shadow:0 0 0 2px #e5e7eb;flex-shrink:0;margin-top:2px}
      .timeline-dot.done{background:#111}
      .timeline-dot.current{background:var(--color-primary,#111);animation:pulse 2s infinite}
      @keyframes pulse{0%,100%{box-shadow:0 0 0 2px rgba(17,24,39,.3)}50%{box-shadow:0 0 0 6px rgba(17,24,39,.1)}}
      .copy-btn{font-size:11px;padding:4px 10px;border:1px solid var(--color-border);border-radius:6px;background:#f9fafb;cursor:pointer;transition:background .15s}
      .copy-btn:hover{background:#e5e7eb}
      @media(max-width:960px){.provider-grid{grid-template-columns:1fr}.kpi-row{grid-template-columns:1fr 1fr}}
      @media(max-width:540px){.kpi-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const API = '/api/billing';

    // ---- Supabase token ----
    function getSupabaseToken() {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!key) return null;
        const obj = JSON.parse(localStorage.getItem(key) || 'null');
        return obj?.access_token || null;
      } catch { return null; }
    }

    // ---- Auth guard ----
    const sbToken = getSupabaseToken();
    if (!sbToken) { location.href = '/login?next=/provider/billing'; return; }

    // ---- Escape helper ----
    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---- Toast ----
    function showToast(msg) {
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style, { position: 'fixed', bottom: '24px', right: '24px', background: '#111', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', zIndex: 9999, opacity: '0', transition: 'opacity .2s', pointerEvents: 'none' });
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; });
      setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2500);
    }

    // ---- Status ----
    function renderStatus(status) {
      const hero = document.getElementById('status-hero');
      const icon = document.getElementById('status-icon');
      const badge = document.getElementById('status-badge');
      const title = document.getElementById('status-title');
      const desc = document.getElementById('status-desc');
      const step2 = document.getElementById('step2-dot');
      if (!hero) return;
      hero.className = `status-hero ${status || 'trialing'}`;
      const map = {
        active: { icon: '✅', badgeCls: 'badge-active', badgeLabel: '課金中', title: '掲載料が発生中です', desc: '毎月自動引き落とし。紹介報酬は自動的に差し引かれます。', step2Done: true },
        trialing: { icon: '⏳', badgeCls: 'badge-trialing', badgeLabel: '初回予約待ち', title: '初回予約が入ったら課金開始', desc: 'Fineme経由で最初の予約が入った月から月額¥3,000の課金が始まります。', step2Done: false },
        pending: { icon: '📋', badgeCls: 'badge-pending', badgeLabel: '設定未完了', title: 'Stripe連携が未完了です', desc: '管理者にお問い合わせください。', step2Done: false },
      };
      const cfg = map[status] || map.trialing;
      if (icon) icon.textContent = cfg.icon;
      if (badge) { badge.className = `badge ${cfg.badgeCls}`; badge.textContent = cfg.badgeLabel; }
      if (title) title.textContent = cfg.title;
      if (desc) desc.textContent = cfg.desc;
      if (cfg.step2Done && step2) step2.className = 'timeline-dot done';
    }

    // ---- KPI ----
    function renderKPI(monthly, reward) {
      const kpiMonthly = document.getElementById('kpi-monthly');
      const kpiReward = document.getElementById('kpi-reward');
      const kpiNet = document.getElementById('kpi-net');
      const kpiMonthlySub = document.getElementById('kpi-monthly-sub');
      if (kpiMonthly) kpiMonthly.textContent = `¥${monthly.toLocaleString()}`;
      if (kpiReward) kpiReward.textContent = `¥${reward.toLocaleString()}`;
      if (kpiNet) kpiNet.textContent = `¥${Math.max(0, monthly - reward).toLocaleString()}`;
      if (monthly === 0 && kpiMonthlySub) kpiMonthlySub.textContent = '初回予約後に課金開始';
    }

    // ---- Payments ----
    function renderPayments(payments) {
      if (!payments || payments.length === 0) return;
      const emptyEl = document.getElementById('payments-empty');
      const tableEl = document.getElementById('payments-table');
      if (emptyEl) emptyEl.style.display = 'none';
      if (tableEl) tableEl.style.display = '';
      const tbody = document.getElementById('payments-tbody');
      if (!tbody) return;
      tbody.innerHTML = payments.map(p => `
        <tr style="border-bottom:1px solid var(--color-border)">
          <td style="padding:10px 8px">${p.paidAt ? p.paidAt.slice(0, 7) : '-'}</td>
          <td style="padding:10px 8px">¥${(p.amount || 0).toLocaleString()}</td>
          <td style="padding:10px 8px"><span class="badge badge-paid">成功</span></td>
          <td style="padding:10px 8px;color:#6b7280;font-size:12px">${p.paidAt ? p.paidAt.slice(0, 10) : '-'}</td>
        </tr>
      `).join('');
    }

    // ---- Referrals ----
    function renderReferred(referrals) {
      const el = document.getElementById('referred-list');
      if (!referrals || !referrals.length || !el) return;
      const total = referrals.reduce((s, r) => s + (r.rewardAmount || 0), 0);
      el.innerHTML = referrals.map(r => `
        <div class="referral-item">
          <div>
            <div class="referral-item-name">${esc(r.referredName || '-')}</div>
            <div class="referral-item-status">${r.periodYearMonth || ''}</div>
          </div>
          <span class="badge badge-referral">¥${(r.rewardAmount || 0).toLocaleString()}/月</span>
        </div>
      `).join('');
      const totalEl = document.getElementById('referred-total');
      if (totalEl) totalEl.textContent = `累計報酬: ¥${total.toLocaleString()}`;
    }

    // ---- Referral link ----
    function initReferralLink(sess) {
      const code = sess?.id || sess?.loginId || 'unknown';
      const url = `${location.origin}/pages/provider/join.html?ref=${encodeURIComponent(code)}`;
      const el = document.getElementById('referral-link');
      if (el) el.value = url;
    }

    // ---- Copy / Share (exposed to DOM via window for onclick attrs) ----
    window.__billingCopyReferralLink = function () {
      const el = document.getElementById('referral-link');
      if (!el) return;
      navigator.clipboard.writeText(el.value).then(() => showToast('紹介リンクをコピーしました'));
    };
    window.__billingShareReferralLink = function () {
      const el = document.getElementById('referral-link');
      if (!el) return;
      if (navigator.share) { navigator.share({ title: 'Fineme 掲載者になりませんか', url: el.value }); }
      else window.__billingCopyReferralLink();
    };
    window.__billingOpenBillingPortal = async function () {
      const token = getSupabaseToken();
      if (!token) { alert('ログインが必要です'); return; }
      try {
        const res = await fetch(`${API}/portal-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else alert('ポータルの取得に失敗しました: ' + (data.error || '不明なエラー'));
      } catch { alert('サーバーに接続できません。管理者にお問い合わせください。'); }
    };

    // Attach button event listeners (avoids global onclick)
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', window.__billingCopyReferralLink);
    const shareBtn = document.getElementById('share-referral-btn');
    if (shareBtn) shareBtn.addEventListener('click', window.__billingShareReferralLink);
    const portalBtn = document.getElementById('billing-portal-btn');
    if (portalBtn) portalBtn.addEventListener('click', window.__billingOpenBillingPortal);

    // ---- Init ----
    initReferralLink(session);

    (async () => {
      try {
        const [provRes, payRes, refRes] = await Promise.all([
          fetch(`${API}/providers`),
          fetch(`${API}/payments`),
          fetch(`${API}/referrals`),
        ]);
        const providers = await provRes.json();
        const payments = await payRes.json();
        const referrals = await refRes.json();

        const me = providers.find(p => p.loginId === session.loginId || p.id === session.id);
        if (me) {
          renderStatus(me.subscriptionStatus);
          const isActive = me.subscriptionStatus === 'active';
          renderKPI(isActive ? (me.planAmount || 3000) : 0, 0);
        }

        const myPayments = payments.filter(p => p.providerEmail === session.email || p.providerId === session.id);
        renderPayments(myPayments);

        const myReferrals = referrals.filter(r => r.referrerId === session.id || r.referrerEmail === session.email);
        const thisMonth = new Date().toISOString().slice(0, 7);
        const monthReward = myReferrals.filter(r => r.periodYearMonth === thisMonth).reduce((s, r) => s + (r.rewardAmount || 0), 0);
        if (me) {
          const isActive = me.subscriptionStatus === 'active';
          renderKPI(isActive ? (me.planAmount || 3000) : 0, monthReward);
        }
        renderReferred(myReferrals);
      } catch {
        console.warn('server offline, showing demo view');
        renderStatus('trialing');
        renderKPI(0, 0);
      }
    })();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="section-title">課金・報酬</h1>

        {/* デモバナー */}
        <div style={{ padding: '14px 18px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🚧</span>
          <div>
            <strong style={{ fontSize: '14px' }}>現在デモ表示中 — 課金・決済機能は未実装です</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#713f12' }}>このページの金額・ステータスはサンプル表示です。Stripe連携・自動課金は今後実装予定。</p>
          </div>
        </div>

        {/* 課金ステータスヒーロー */}
        <div id="status-hero" className="status-hero trialing">
          <div className="status-icon" id="status-icon">⏳</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span id="status-badge" className="badge badge-trialing">初回予約待ち</span>
            </div>
            <div id="status-title" style={{ fontWeight: 700, fontSize: '18px' }}>初回予約が入ったら課金開始</div>
            <div id="status-desc" className="muted" style={{ fontSize: '14px', marginTop: '4px' }}>
              Fineme経由で最初の予約が入った月から月額¥3,000の課金が始まります。
            </div>
          </div>
        </div>

        {/* KPI行 */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">今月の掲載料</div>
            <div id="kpi-monthly" className="kpi-value">¥0</div>
            <div id="kpi-monthly-sub" className="kpi-sub">課金開始後 ¥3,000/月</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">紹介報酬（今月）</div>
            <div id="kpi-reward" className="kpi-value">¥0</div>
            <div className="kpi-sub">紹介した掲載者の課金×¥500</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">実質負担額</div>
            <div id="kpi-net" className="kpi-value">¥0</div>
            <div className="kpi-sub">掲載料 − 紹介報酬</div>
          </div>
        </div>

        {/* 課金ステップ */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px' }}>課金の流れ</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot done"></div>
              <div>
                <div style={{ fontWeight: 600 }}>Finemeに掲載登録</div>
                <div className="muted" style={{ fontSize: '13px' }}>プロフィール・サービスを公開済み</div>
              </div>
            </div>
            <div className="timeline-item">
              <div id="step2-dot" className="timeline-dot current"></div>
              <div>
                <div style={{ fontWeight: 600 }}>Fineme経由で初回予約が入る</div>
                <div className="muted" style={{ fontSize: '13px' }}>この瞬間から課金カウントが開始。その月から月額¥3,000が発生します。</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div>
                <div style={{ fontWeight: 600 }}>毎月自動請求</div>
                <div className="muted" style={{ fontSize: '13px' }}>登録のカードへ毎月自動引き落とし。領収書はメールで届きます。</div>
              </div>
            </div>
            <div className="timeline-item" style={{ paddingBottom: 0 }}>
              <div className="timeline-dot"></div>
              <div>
                <div style={{ fontWeight: 600 }}>紹介報酬が積み上がる</div>
                <div className="muted" style={{ fontSize: '13px' }}>あなたが紹介した掲載者の課金が続くかぎり ¥500/月が毎月報酬として積み上がります。</div>
              </div>
            </div>
          </div>
        </div>

        {/* 決済履歴 */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px' }}>決済履歴</h2>
          <div id="payments-empty" className="muted" style={{ padding: '24px', textAlign: 'center' }}>
            まだ決済履歴がありません。初回予約が入ると課金が始まります。
          </div>
          <div id="payments-table" style={{ display: 'none' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>月</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>金額</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>ステータス</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>決済日</th>
                  </tr>
                </thead>
                <tbody id="payments-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 紹介コード */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 8px' }}>紹介コード</h2>
          <p className="muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            このリンクから掲載申込みしてもらうと、その掲載者が課金を開始するたびに<strong>¥500/月</strong>があなたの報酬として積み上がります。
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input id="referral-link" type="text" readOnly
              style={{ flex: 1, minWidth: '240px', background: '#f9fafb', color: '#374151' }}
              defaultValue="読み込み中..." />
            <button className="copy-btn">コピー</button>
            <button id="share-referral-btn" className="btn btn-ghost">シェア</button>
          </div>
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>紹介した掲載者</h3>
            <div id="referred-list" className="referral-list">
              <div className="muted" style={{ fontSize: '13px', textAlign: 'center', padding: '16px' }}>まだ紹介実績がありません</div>
            </div>
            <div id="referred-total" className="muted" style={{ fontSize: '12px', textAlign: 'right', marginTop: '8px' }}></div>
          </div>
        </div>

        {/* 支払い方法 */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 4px' }}>支払い方法</h2>
          <p className="muted" style={{ fontSize: '14px', marginBottom: '12px' }}>クレジットカード（Stripe）で管理しています。</p>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              try {
                const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                const token = key ? JSON.parse(localStorage.getItem(key) || 'null')?.access_token : null;
                if (!token) { alert('ログインが必要です'); return; }
                const res = await fetch('/api/billing/portal-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (data.url) { window.location.href = data.url; }
                else { alert('エラー: ' + (data.error || '不明なエラー')); }
              } catch (e) { alert('通信エラー: ' + e.message); }
            }}
          >カード情報を変更・確認する</button>
          <p className="muted" style={{ fontSize: '12px', marginTop: '8px' }}>Stripeのセキュアな決済ページへ遷移します。</p>
        </div>
      </div>
    </main>
  );
}
