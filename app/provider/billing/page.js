'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { contractActive } from '@/lib/provider-contract';
import { MONITOR_CAMPAIGN } from '@/lib/monitor-campaign';
import { FEATURE_DEFS, planRank } from '@/lib/feature-flags';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const PLANS = {
  A: {
    name: 'ライト', amount: 5000, color: '#3b82f6',
    summary: 'はじめの一歩に必要な機能',
    features: ['予約・オンライン決済', '基本カルテ・売上管理・請求', 'AI専属コンサル', 'Fineme公式LINEでリマインド', '顧客の登録は30人まで'],
  },
  B: {
    name: 'スタンダード', amount: 7000, color: '#8b5cf6',
    summary: 'ライトの全機能に加えて',
    features: ['顧客数 無制限', '休眠顧客の掘り起こし', 'クチコミ依頼の自動化', 'スタッフ指名・シフト管理', 'クラス・回数券・会員プラン'],
  },
  C: {
    name: 'プレミアム', amount: 10000, color: '#f59e0b',
    summary: 'スタンダードの全機能に加えて',
    features: ['AIカルテ（AI姿勢分析・AI健診アドバイス）', '店舗の公式LINEから送信', 'カルテAI分析', 'POS・在庫管理', '操作ログ'],
  },
};
const PAYMENT_FEE_PERCENT = 4.5;

// プランごとの主な違い（2026-11-24 §8）。○/— は lib/feature-flags.js の最低プラン（minPlan）から出すので、制限と表がずれない
const COMPARE_ROWS = [
  ['AIカルテ（AI姿勢分析・AI健診アドバイス）', 'posture_analysis'],
  ['カルテAI分析', 'karte_ai'],
  ['店舗の公式LINEから送信', 'line_channel'],
  ['POS・物販・在庫管理', 'pos'],
  ['チケット・回数券', 'customer_packages'],
  ['会員プラン・月会費のオンライン入会', 'membership_enrollment'],
  ['休眠顧客の掘り起こし', 'dormant_outreach'],
  ['クチコミ依頼の自動化', 'review_request'],
  ['シフト・勤怠管理', 'shift_management'],
  ['AI専属コンサル', 'ai_consultant'],
  ['予約（即時予約・予約リクエスト）', 'instant_booking'],
];
const planHas = (plan, key) => planRank(plan) >= planRank(FEATURE_DEFS[key]?.minPlan || 'A');

export default function BillingPage() {
  const initialized = useRef(false);
  const [currentPlan, setCurrentPlan] = useState('A');
  const [billingStatus, setBillingStatus] = useState('free');
  const [monitorUntil, setMonitorUntil] = useState(null);
  const [billingStarted, setBillingStarted] = useState(null);
  const [monitorPlan, setMonitorPlan] = useState(MONITOR_CAMPAIGN.planKey); // モニター後に続けるプランの初期値＝モニター中のプラン
  const [monitorAgree, setMonitorAgree] = useState(false);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [monitorErr, setMonitorErr] = useState('');
  const [connectStatus, setConnectStatus] = useState(null);
  const [referralYen, setReferralYen] = useState(0); // 今月の紹介報酬（初月90%＋継続¥500の合計）
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .plan-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .plan-card{padding:20px;border:2px solid rgba(232,228,220,0.15);border-radius:14px;background:rgba(10,15,30,0.65);backdrop-filter:blur(8px);cursor:pointer;transition:border-color .2s,transform .15s;position:relative}
      .plan-card:hover{transform:translateY(-2px)}
      .plan-card.current{border-color:var(--plan-color)}
      .plan-card.recommended::after{content:'おすすめ';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#8b5cf6;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px}
      .plan-name{font-weight:700;font-size:16px;margin-bottom:4px}
      .plan-amount{font-size:24px;font-weight:800}
      .plan-summary{font-size:12px;color:#9ca3af;margin-top:4px}
      .plan-feature-list{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:6px;font-size:12px;color:#d1d5db}
      .plan-savings{font-size:12px;color:#10b981;font-weight:600;margin-top:6px;min-height:18px}
      .plan-btn{width:100%;padding:8px;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;margin-top:12px;transition:opacity .15s}
      .plan-btn.current-btn{background:rgba(232,228,220,0.1);color:#9ca3af;cursor:default}
      .plan-btn.subscribe-btn{color:#fff}
      .plan-btn.upgrade-btn{color:#fff}
      .kpi-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .kpi-card{padding:20px;border:1px solid rgba(232,228,220,0.15);border-radius:14px;background:rgba(10,15,30,0.65);backdrop-filter:blur(8px)}
      .kpi-label{color:#6b7280;font-size:12px;margin-bottom:4px}
      .kpi-value{font-weight:800;font-size:26px}
      .kpi-sub{font-size:11px;color:#9ca3af;margin-top:2px}
      .connect-card{padding:20px;border:1px solid rgba(232,228,220,0.15);border-radius:14px;background:rgba(10,15,30,0.65)}
      .connect-active{border-color:#10b981}
      .status-hero{padding:20px;border-radius:14px;display:flex;align-items:center;gap:16px}
      .status-hero.active{background:linear-gradient(120deg,rgba(16,185,129,.15),rgba(16,185,129,.05));border:1px solid rgba(16,185,129,.3)}
      .status-hero.free{background:linear-gradient(120deg,rgba(99,102,241,.12),rgba(99,102,241,.04));border:1px solid rgba(99,102,241,.3)}
      .status-hero.past_due{background:linear-gradient(120deg,rgba(245,158,11,.15),rgba(245,158,11,.05));border:1px solid rgba(245,158,11,.3)}
      .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}
      .badge-active{background:#065f46;color:#fff}
      .badge-free{background:#312e81;color:#a5b4fc}
      .badge-past_due{background:#7f1d1d;color:#fff}
      .badge-paid{background:rgba(16,185,129,.2);color:#10b981}
      .badge-referral{background:rgba(139,92,246,.2);color:#8b5cf6}
      .copy-btn{font-size:11px;padding:4px 10px;border:1px solid rgba(232,228,220,0.15);border-radius:6px;background:rgba(10,15,30,0.45);color:#e8e4dc;cursor:pointer}
      .referral-list{display:flex;flex-direction:column;gap:8px}
      .referral-item{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid rgba(232,228,220,0.15);border-radius:10px;background:rgba(10,15,30,0.5)}
      .timeline{display:flex;flex-direction:column;gap:0}
      .timeline-item{display:flex;gap:16px;padding-bottom:20px;position:relative}
      .timeline-item:not(:last-child)::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:2px;background:rgba(232,228,220,0.15)}
      .timeline-dot{width:24px;height:24px;border-radius:50%;background:rgba(232,228,220,0.1);border:2px solid rgba(232,228,220,0.2);flex-shrink:0;margin-top:2px}
      .timeline-dot.done{background:#10b981;border-color:#10b981}
      .timeline-dot.current{background:var(--color-primary,#e8e4dc);border-color:var(--color-primary,#e8e4dc);animation:pulse 2s infinite}
      @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,228,220,.3)}50%{box-shadow:0 0 0 6px rgba(232,228,220,0)}}
      .navi-lock-banner{background:rgba(201,168,76,0.07);border:1.5px solid rgba(201,168,76,0.25);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px}
      .navi-lock-icon{font-size:28px;flex-shrink:0}
      @media(max-width:720px){.plan-cards{grid-template-columns:1fr}.kpi-row{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.kpi-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    // URLパラメータ確認（Checkout成功/キャンセル）
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === '1') showToast('お申し込みを受け付けました');
    if (params.get('canceled') === '1') showToast('プランの選択をキャンセルしました');

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await _sb.auth.getSession();
      if (!session) { location.href = '/login?type=provider&next=/provider/billing'; return; }

      const token = session.access_token;
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        // 自分の掲載者情報は /api/provider/me から取る（/api/billing/providers は管理者キーが要る旧API）
        const [provRes, connectRes] = await Promise.all([
          fetch('/api/provider/me', { headers }),
          fetch('/api/stripe/connect/status', { headers }),
        ]);

        if (provRes.ok) {
          const me = await provRes.json();
          if (me?.id) {
            setCurrentPlan(me.plan || 'A');
            setBillingStatus(me.billing_status || 'free');
            setMonitorUntil(me.monitor_until || null);
            setBillingStarted(me.billing_started || null);
            if (['A', 'B', 'C'].includes(me.plan)) setMonitorPlan(me.plan);
            try {
              const rr = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(me.id)}`, { headers });
              if (rr.ok) {
                const rj = await rr.json();
                setReferralYen(rj.summary?.pending_this_month || 0);
              }
            } catch {}
          }
        }

        if (connectRes.ok) {
          const cs = await connectRes.json();
          setConnectStatus(cs);
        }
      } catch {}
    })();
  }, []);

  // 無料→有料：Stripe Checkoutにリダイレクト


  // 無料モニター中の申し込み（2026-11-16）：課金はモニター期間が終わった次の日から（provider-subscribe が Stripe の無料期間を付ける）
  async function handleMonitorSubscribe() {
    if (!monitorAgree) { setMonitorErr('利用規約をご確認のうえ、「同意する」にチェックを入れてください'); return; }
    setMonitorBusy(true); setMonitorErr('');
    try {
      const { data: { session } } = await _sb.auth.getSession();
      const res = await fetch('/api/stripe/provider-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ plan: monitorPlan, agree_terms: true, return_to: 'billing' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { location.href = data.url; return; }
      setMonitorErr(data.error || 'お申し込みの準備に失敗しました。時間をおいてもう一度お試しください');
    } catch {
      setMonitorErr('通信に失敗しました。電波のよい場所でもう一度お試しください');
    }
    setMonitorBusy(false);
  }

  // 有料→別プランへ変更（既存サブスク更新）
  async function handleUpgrade(newPlan) {
    if (upgrading || newPlan === currentPlan) return;
    if (!confirm(`プランを${PLANS[newPlan].name}（¥${PLANS[newPlan].amount.toLocaleString()}/月）に変更しますか？`)) return;
    setUpgrading(true);
    try {
      const { data: { session } } = await _sb.auth.getSession();
      const res = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(newPlan);
        showToast(`プランを${PLANS[newPlan].name}に変更しました`);
      } else {
        alert('プラン変更に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (e) {
      alert('通信エラー: ' + e.message);
    } finally {
      setUpgrading(false);
    }
  }

  async function handleConnectOnboard() {
    try {
      const { data: { session } } = await _sb.auth.getSession();
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else alert(data.error || '設定を開始できませんでした。もう一度お試しください');
    } catch (e) {
      alert('通信エラー: ' + e.message);
    }
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, { position: 'fixed', bottom: '24px', right: '24px', background: '#111', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', zIndex: 9999, opacity: '0', transition: 'opacity .2s' });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 2500);
  }

  // 契約中＝払っている（引き落とし失敗でやり直し中も含む）か特例無料。それ以外は未契約（lib/provider-contract.js）
  const isActive = contractActive({ plan: currentPlan, billing_status: billingStatus, monitor_until: monitorUntil });
  // 無料モニター中（2026-11-16）：Stripe の契約は無いので、プラン変更・支払い方法の画面は出さない
  const isMonitor = isActive && billingStatus === 'monitor';
  // モニター中に申し込み済み（課金はモニター終了の次の日から・まだ1度も払っていない）
  const monitorScheduled = isActive && !isMonitor && !billingStarted && !!monitorUntil && new Date(monitorUntil).getTime() > Date.now() && ['active', 'trialing'].includes(billingStatus);
  const monitorUntilLabel = monitorUntil ? new Date(monitorUntil).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const isFree   = !isActive;
  const plan     = PLANS[currentPlan] || PLANS.A;

  const statusMap = {
    active:   { icon: '', cls: 'badge-active', label: 'New Me Map 掲載中', heroClass: 'active',   title: 'ユーザーのロードマップに表示されています', desc: '毎月自動引き落とし。紹介報酬は自動的に差し引かれます。' },
    free:     { icon: '', cls: 'badge-free',   label: '未契約',       heroClass: 'free',     title: 'まだプランのお申し込みがありません', desc: 'プランをお申し込みいただくと、その日から管理画面の機能が使えるようになります。' },
    past_due: { icon: '', cls: 'badge-past_due', label: '支払い遅延',     heroClass: 'past_due', title: '支払いに問題が発生しています', desc: 'カード情報を更新してください。' },
    monitor:  { icon: '', cls: 'badge-active', label: '無料モニター',   heroClass: 'active',   title: `${monitorUntilLabel}まで、無料でお使いいただけます`, desc: 'お申し込みがないまま期間が終わると、管理画面の機能は止まります。自動で課金されることはありません。続けてお使いになる場合は、下から今のうちにお申し込みいただけます（課金は期間が終わった次の日から）。' },
    scheduled: { icon: '', cls: 'badge-active', label: 'お申し込み済み', heroClass: 'active',  title: `${monitorUntilLabel}までは無料、その次の日から月額が始まります`, desc: '無料モニター期間中にお申し込みいただきました。期間が終わっても、そのまま続けてお使いいただけます。' },
  };
  const st = isActive ? (monitorScheduled ? statusMap.scheduled : statusMap[billingStatus] || statusMap.active) : statusMap.free;

  return (
    <main className="section">
      <div className="container stack">
        <div style={{ background: '#2f4f8f', color: '#fff', borderRadius: 12, padding: '14px 18px' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Finemeとのご契約</p>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.7, opacity: 0.92 }}>このページは、貴店とFinemeの間のご契約とお支払い（Finemeへのお支払い）です。お客様から貴店へのお支払い（回数券・会員プラン等）とは別のものです。</p>
        </div>
        <h1 className="section-title">Fineme利用契約・プラン</h1>

        {/* ステータス */}
        <div className={`status-hero ${st.heroClass}`}>
          <div style={{ fontSize: '36px', flexShrink: 0 }}>{st.icon}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge ${st.cls}`}>{st.label}</span>
              {isActive && (
                <span className="muted" style={{ fontSize: '13px' }}>Finemeのご利用プラン: <strong style={{ color: plan.color }}>{plan.name} {isMonitor ? '（無料モニター）' : `¥${plan.amount.toLocaleString()}/月`}</strong></span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: '17px' }}>{st.title}</div>
            <div className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>{st.desc}</div>
          </div>
        </div>

        {/* New Me Map 掲載バナー（無料ティアのみ表示） */}
        {isFree && (
          <div className="navi-lock-banner">
            <div className="navi-lock-icon"></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>New Me Map への掲載で、ユーザーから選ばれる</div>
              <div className="muted" style={{ fontSize: '13px' }}>診断を受けたユーザーが「次に行くべきサービス」として選ぶのが New Me Map です。<br />有料プランに移行すると、あなたのサービスがユーザーのロードマップに表示されます。</div>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">今月の掲載料</div>
            <div className="kpi-value">¥{isActive && !isMonitor && !monitorScheduled ? plan.amount.toLocaleString() : '0'}</div>
            <div className="kpi-sub">{isMonitor || monitorScheduled ? '無料モニター期間中' : isFree ? '無料掲載中' : `¥${plan.amount.toLocaleString()}/月`}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">決済手数料率</div>
            <div className="kpi-value">{PAYMENT_FEE_PERCENT}%</div>
            <div className="kpi-sub">Fineme経由のオンライン決済のみ・全プラン共通</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">紹介報酬（今月）</div>
            <div id="kpi-reward" className="kpi-value">¥{referralYen.toLocaleString()}</div>
            <div className="kpi-sub">初月は初回課金額の90%、翌月以降は紹介した契約者1社につき¥500</div>
          </div>
        </div>

        {/* プラン選択（無料ティア：全プランで「掲載を始める」ボタン / 有料ティア：変更ボタン） */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 6px' }}>{isFree ? 'New Me Map 掲載プランを選ぶ' : '掲載プラン'}</h2>
          <p className="muted" style={{ fontSize: '13px', marginBottom: '16px' }}>
            {isFree
              ? '予約の手数料はありません。プランの違いは使える機能です。プランはいつでも変更できます。'
              : '予約の手数料はありません。プランの違いは使える機能です。上位プランへはいつでも変更できます。'}
          </p>
          <div className="plan-cards">
            {Object.entries(PLANS).map(([key, p]) => {
              const isCurrent = isActive && key === currentPlan;
              const isUpgrade  = isActive && key > currentPlan;
              return (
                <div
                  key={key}
                  className={`plan-card${isCurrent ? ' current' : ''}${key === 'B' ? ' recommended' : ''}`}
                  style={{ '--plan-color': p.color }}
                >
                  <div className="plan-name" style={{ color: isCurrent ? p.color : '#e8e4dc' }}>{p.name}</div>
                  <div className="plan-amount">¥{p.amount.toLocaleString()}<span style={{ fontSize: '13px', fontWeight: 400, color: '#9ca3af' }}>/月</span></div>
                  <div className="plan-summary">{p.summary}</div>
                  <ul className="plan-feature-list">
                    {p.features.map(f => <li key={f}>{f}</li>)}
                  </ul>

                  {/* 未契約：申し込み（プラン・利用規約・支払い）は管理画面の契約画面にまとめている */}
                  {isFree && (
                    <a
                      className="plan-btn subscribe-btn"
                      style={{ background: p.color, display: 'block', textAlign: 'center', textDecoration: 'none' }}
                      href={`/provider/dashboard?plan=${key}`}
                    >
                      このプランで申し込む
                    </a>
                  )}

                  {/* 有料ティア：現在プランは表示のみ、上位プランは変更ボタン */}
                  {isActive && !isMonitor && (
                    <button
                      className={`plan-btn ${isCurrent ? 'current-btn' : 'upgrade-btn'}`}
                      style={isCurrent ? {} : { background: p.color }}
                      disabled={isCurrent || upgrading || !isUpgrade}
                      onClick={() => handleUpgrade(key)}
                    >
                      {isCurrent ? '現在のプラン' : isUpgrade ? (upgrading ? '変更中...' : `${p.name}にアップグレード`) : ''}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ overflowX: 'auto', marginTop: '18px' }}>
            <table style={{ width: '100%', minWidth: '420px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <caption style={{ textAlign: 'left', fontSize: '13px', fontWeight: 700, padding: '0 0 8px', color: '#e8e4dc' }}>プランごとの主な違い</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid rgba(232,228,220,0.18)', color: '#9ca3af', fontWeight: 600 }}>機能</th>
                  {Object.entries(PLANS).map(([key, p]) => <th key={key} scope="col" style={{ padding: '8px 6px', borderBottom: '1px solid rgba(232,228,220,0.18)', color: p.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([label, key]) => (
                  <tr key={key}>
                    <th scope="row" style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid rgba(232,228,220,0.08)', fontWeight: key === 'posture_analysis' ? 700 : 400, color: '#e8e4dc' }}>{label}</th>
                    {Object.keys(PLANS).map(pk => (
                      <td key={pk} style={{ textAlign: 'center', padding: '8px 6px', borderBottom: '1px solid rgba(232,228,220,0.08)', color: planHas(pk, key) ? '#e8e4dc' : '#6b7280' }}>
                        {planHas(pk, key) ? '○' : '—'}<span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{planHas(pk, key) ? '使える' : '使えない'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 無料モニター中のお申し込み（2026-11-16） */}
        {isMonitor && (
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px' }}>モニター期間のあとも続ける</h2>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '14px', lineHeight: 1.8 }}>
              今お申し込みいただいても、{monitorUntilLabel}までは無料のままです。月額はその次の日から毎月かかります。期間が終わる前に解約すれば、課金はされません。
            </p>
            <div role="radiogroup" aria-label="続けるプラン" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {Object.entries(PLANS).map(([key, p]) => (
                <button key={key} type="button" role="radio" aria-checked={monitorPlan === key} onClick={() => setMonitorPlan(key)}
                  className="btn btn-ghost" style={{ minHeight: 44, borderColor: monitorPlan === key ? p.color : undefined, boxShadow: monitorPlan === key ? `0 0 0 2px ${p.color}` : 'none' }}>
                  {p.name} ¥{p.amount.toLocaleString()}/月
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.7, marginBottom: '12px' }}>
              <input type="checkbox" checked={monitorAgree} onChange={e => { setMonitorAgree(e.target.checked); setMonitorErr(''); }} style={{ marginTop: 4 }} />
              <span><a href="/terms-provider" target="_blank" rel="noopener noreferrer">契約者利用規約</a>を読み、同意します（<a href="/tokusho" target="_blank" rel="noopener noreferrer">特定商取引法に基づく表記</a>）</span>
            </label>
            {monitorErr && <p role="alert" style={{ color: '#b42318', fontSize: '13px', margin: '0 0 10px' }}>{monitorErr}</p>}
            <button type="button" className="btn btn-primary" disabled={monitorBusy} onClick={handleMonitorSubscribe} style={{ minHeight: 44 }}>
              {monitorBusy ? '準備しています…' : `${PLANS[monitorPlan]?.name || ''}で続ける（カードを登録する）`}
            </button>
          </div>
        )}

        {/* 決済手数料の説明 */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 6px' }}>決済手数料について</h2>
          <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.8 }}>
            Fineme経由でお客様がオンライン決済（請求・回数券・会員プラン・予約デポジット・POS）した金額から、決済手数料{PAYMENT_FEE_PERCENT}%を差し引いた額が振込口座へ入金されます。
            カード会社の手数料も{PAYMENT_FEE_PERCENT}%に含まれており、別途のご負担はありません。例：¥10,000のお支払いなら¥9,550が入金されます。
            全プラン共通です。現金など、Fineme経由でないお支払いには手数料はかかりません。
          </p>
        </div>

        {/* Stripe Connect（振込設定） */}
        <div className={`connect-card${connectStatus?.connected ? ' connect-active' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px' }}>カード決済の受け取り設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0 }}>お客様のカード決済の売上（決済手数料を差し引いた額）を受け取るために必要です。Stripeの画面で本人確認と振込先口座を登録します。</p>
            </div>
            {connectStatus?.connected
              ? <span className="badge badge-active">✓ 振込設定済み</span>
              : <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, background: '#92400e', color: '#fde68a' }}>未設定</span>
            }
          </div>
          {!connectStatus?.connected && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleConnectOnboard}>
              カード決済の受け取りを設定する（Stripe）
            </button>
          )}
          {connectStatus?.connected && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#10b981' }}>✓ 口座設定が完了しています。オンライン決済の売上は決済手数料を差し引いて自動で入金されます。</p>
          )}
        </div>

        {/* 課金の流れ */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px' }}>掲載の流れ</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot done"></div>
              <div>
                <div style={{ fontWeight: 600 }}>Finemeに無料掲載登録</div>
                <div className="muted" style={{ fontSize: '13px' }}>プロフィール・サービスを公開。検索から見つけてもらえます。</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className={`timeline-dot ${isActive ? 'done' : 'current'}`}></div>
              <div>
                <div style={{ fontWeight: 600 }}>有料プランに移行（月額先払い）</div>
                <div className="muted" style={{ fontSize: '13px' }}>上のプランカードから選ぶとStripe決済画面に進みます。決済完了後すぐに有効になります。</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className={`timeline-dot ${isActive ? 'current' : ''}`}></div>
              <div>
                <div style={{ fontWeight: 600 }}>ユーザーの New Me Map に表示される</div>
                <div className="muted" style={{ fontSize: '13px' }}>診断を受けたユーザーの行動ロードマップに、あなたのサービスが「次のステップ」として表示されます。</div>
              </div>
            </div>
            <div className="timeline-item" style={{ paddingBottom: 0 }}>
              <div className="timeline-dot"></div>
              <div>
                <div style={{ fontWeight: 600 }}>紹介報酬が積み上がる</div>
                <div className="muted" style={{ fontSize: '13px' }}>あなたが紹介した契約者が課金を始めた月は初回課金額の90%、その後は課金が続くかぎり ¥500/月が報酬として積み上がります。</div>
              </div>
            </div>
          </div>
        </div>

        {/* 支払い方法（有料ティアのみ） */}
        {isActive && !isMonitor && (
          <div className="card" style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 4px' }}>支払い方法</h2>
            <p className="muted" style={{ fontSize: '14px', marginBottom: '12px' }}>クレジットカード（Stripe）で管理しています。</p>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  const { data: { session } } = await _sb.auth.getSession();
                  const token = session?.access_token;
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
            >カード情報を変更・確認する（解約もこちら）</button>
          </div>
        )}

        {/* 紹介コード */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 8px' }}>紹介コード</h2>
          <p className="muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
            このリンクから掲載申込みしてもらうと、その契約者が課金を始めた月は<strong>初回課金額の90%</strong>、その後は課金が続くかぎり毎月<strong>¥500</strong>があなたの報酬として積み上がります。
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input id="referral-link" type="text" readOnly
              style={{ flex: 1, minWidth: '240px', background: 'rgba(10,15,30,0.50)', color: '#e8e4dc', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', padding: '8px 12px' }}
              defaultValue="読み込み中..." />
            <button className="copy-btn" onClick={() => {
              const el = document.getElementById('referral-link');
              if (el) navigator.clipboard.writeText(el.value).then(() => showToast('コピーしました'));
            }}>コピー</button>
          </div>
          <div id="referred-list" className="referral-list" style={{ marginTop: '16px' }}>
            <div className="muted" style={{ fontSize: '13px', textAlign: 'center', padding: '16px' }}>まだ紹介実績がありません</div>
          </div>
        </div>
      </div>
    </main>
  );
}
