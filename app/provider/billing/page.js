'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
    features: ['店舗の公式LINEから送信', 'カルテAI分析', '姿勢・健康アドバイスAI', 'POS・在庫管理', '操作ログ'],
  },
};
const PAYMENT_FEE_PERCENT = 4.5;

export default function BillingPage() {
  const initialized = useRef(false);
  const [currentPlan, setCurrentPlan] = useState('A');
  const [billingStatus, setBillingStatus] = useState('free');
  const [connectStatus, setConnectStatus] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
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
    if (params.get('subscribed') === '1') showToast('New Me Mapへの掲載を開始しました！');
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
        const [provRes, connectRes] = await Promise.all([
          fetch('/api/billing/providers', { headers }),
          fetch('/api/stripe/connect/status', { headers }),
        ]);

        if (provRes.ok) {
          const providers = await provRes.json();
          const me = providers.find(p => p.email === session.user.email);
          if (me) {
            setCurrentPlan(me.plan || 'A');
            setBillingStatus(me.billing_status || 'free');
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
  async function handleSubscribe(plan) {
    if (subscribing) return;
    setSubscribing(true);
    try {
      const { data: { session } } = await _sb.auth.getSession();
      const res = await fetch('/api/stripe/provider-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('エラー: ' + (data.error || '不明なエラー'));
      }
    } catch (e) {
      alert('通信エラー: ' + e.message);
    } finally {
      setSubscribing(false);
    }
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
      else alert('エラー: ' + (data.error || '不明'));
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

  const isFree   = billingStatus === 'free' || !billingStatus;
  const isActive = billingStatus === 'active';
  const plan     = PLANS[currentPlan] || PLANS.A;

  const statusMap = {
    active:   { icon: '', cls: 'badge-active', label: 'New Me Map 掲載中', heroClass: 'active',   title: 'ユーザーのロードマップに表示されています', desc: '毎月自動引き落とし。紹介報酬は自動的に差し引かれます。' },
    free:     { icon: '️', cls: 'badge-free',   label: '無料掲載中',       heroClass: 'free',     title: '掲載ページ公開中・検索には表示されています', desc: '有料プランに移行するとユーザーの New Me Map（行動ロードマップ）にも表示されます。' },
    past_due: { icon: '', cls: 'badge-past_due', label: '支払い遅延',     heroClass: 'past_due', title: '支払いに問題が発生しています', desc: 'カード情報を更新してください。' },
  };
  const st = statusMap[billingStatus] || statusMap.free;

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
                <span className="muted" style={{ fontSize: '13px' }}>Finemeのご利用プラン: <strong style={{ color: plan.color }}>{plan.name} ¥{plan.amount.toLocaleString()}/月</strong></span>
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
            <div className="kpi-value">¥{isActive ? plan.amount.toLocaleString() : '0'}</div>
            <div className="kpi-sub">{isFree ? '無料掲載中' : `¥${plan.amount.toLocaleString()}/月`}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">決済手数料率</div>
            <div className="kpi-value">{PAYMENT_FEE_PERCENT}%</div>
            <div className="kpi-sub">Fineme経由のオンライン決済のみ・全プラン共通</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">紹介報酬（今月）</div>
            <div id="kpi-reward" className="kpi-value">¥0</div>
            <div className="kpi-sub">紹介した掲載者の課金×¥500</div>
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

                  {/* 無料ティア：全プランに「掲載を始める」ボタン */}
                  {isFree && (
                    <button
                      className="plan-btn subscribe-btn"
                      style={{ background: p.color }}
                      disabled={subscribing}
                      onClick={() => handleSubscribe(key)}
                    >
                      {subscribing ? '処理中...' : 'このプランで掲載を始める'}
                    </button>
                  )}

                  {/* 有料ティア：現在プランは表示のみ、上位プランは変更ボタン */}
                  {isActive && (
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
        </div>

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
              <h2 style={{ margin: '0 0 4px' }}>振込口座の設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0 }}>オンライン決済の売上（決済手数料を差し引いた額）を振り込むために必要です。</p>
            </div>
            {connectStatus?.connected
              ? <span className="badge badge-active">✓ 振込設定済み</span>
              : <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, background: '#92400e', color: '#fde68a' }}>未設定</span>
            }
          </div>
          {!connectStatus?.connected && (
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleConnectOnboard}>
              振込口座を設定する（Stripe）
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
                <div className="muted" style={{ fontSize: '13px' }}>あなたが紹介した掲載者の課金が続くかぎり ¥500/月が報酬として積み上がります。</div>
              </div>
            </div>
          </div>
        </div>

        {/* 支払い方法（有料ティアのみ） */}
        {isActive && (
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
            このリンクから掲載申込みしてもらうと、その掲載者が課金を開始するたびに<strong>¥500/月</strong>があなたの報酬として積み上がります。
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
