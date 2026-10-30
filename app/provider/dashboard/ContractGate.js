'use client';

// Fineme の利用契約の画面（2026-10-30）。まだ月額プランを申し込んでいないお店には、管理画面の代わりにこれを出す。
// プランを選ぶ → 利用規約に同意する → Stripe でカードを登録して申し込む、を1画面で終える。
// 申し込み（払い終わり）は webhook が記録するので、戻ってきた時はそれを待ってから管理画面に入れる。
// 引き落としに失敗している（past_due）お店には、管理画面はそのまま使わせて、上に支払い方法の更新を出す。
// サーバー側でも、未契約のお店の /api/provider/* は middleware が止めている（lib/provider-contract.js）。
import { useEffect, useState } from 'react';
import { freshAccessToken } from '@/lib/browser-auth';
import { contractActive } from '@/lib/provider-contract';
import { PROVIDER_PLANS } from '@/lib/provider-plans';

const CSS = `
.pcg-overlay { position: fixed; inset: 0; z-index: 99995; background: #f4f1ea; overflow-y: auto; padding: max(24px, env(safe-area-inset-top)) 16px 40px; color: #1a1410; }
.pcg-wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 18px; }
.pcg-head h1 { margin: 6px 0 6px; font-size: 24px; line-height: 1.4; text-wrap: balance; }
.pcg-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #8a6a17; }
.pcg-lead { margin: 0; font-size: 14px; line-height: 1.8; color: rgba(26,20,16,.7); }
.pcg-plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.pcg-plan { text-align: left; background: #fff; border: 2px solid rgba(26,20,16,.1); border-radius: 16px; padding: 18px; cursor: pointer; display: grid; gap: 8px; align-content: start; color: #1a1410; font: inherit; }
.pcg-plan:hover { border-color: rgba(201,168,76,.6); }
.pcg-plan[aria-checked="true"] { border-color: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,.18); }
.pcg-plan-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.pcg-plan-name { font-weight: 800; font-size: 15px; }
.pcg-plan-name span { font-weight: 700; font-size: 12px; color: rgba(26,20,16,.55); margin-left: 6px; }
.pcg-badge { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 99px; background: #1a1410; color: #e8cf7e; white-space: nowrap; }
.pcg-price { font-size: 26px; font-weight: 900; font-variant-numeric: tabular-nums; }
.pcg-price small { font-size: 12px; font-weight: 600; color: rgba(26,20,16,.55); margin-left: 4px; }
.pcg-fit { margin: 0; font-size: 12.5px; line-height: 1.6; color: rgba(26,20,16,.65); }
.pcg-plan ul { margin: 4px 0 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; }
.pcg-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(26,20,16,.25); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.pcg-plan[aria-checked="true"] .pcg-radio { border-color: #b08f33; }
.pcg-plan[aria-checked="true"] .pcg-radio::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: #c9a84c; }
.pcg-box { background: #fff; border-radius: 16px; padding: 18px; display: grid; gap: 12px; border: 1px solid rgba(26,20,16,.08); }
.pcg-facts { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8; }
.pcg-agree { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.7; cursor: pointer; }
.pcg-agree input { width: 20px; height: 20px; margin-top: 3px; flex-shrink: 0; accent-color: #b08f33; }
.pcg-agree a, .pcg-box a { color: #2f4f8f; font-weight: 700; }
.pcg-btn { border: 0; border-radius: 999px; min-height: 52px; padding: 12px 28px; font-weight: 800; font-size: 15.5px; cursor: pointer; color: #1a1410; background: linear-gradient(180deg, #e8cf7e, #c9a84c); width: 100%; }
.pcg-btn:disabled { opacity: .45; cursor: not-allowed; }
.pcg-ghost { border: 0; background: none; color: rgba(26,20,16,.55); font-size: 13px; cursor: pointer; padding: 8px 4px; justify-self: center; }
.pcg-err { color: #c2410c; font-size: 13.5px; font-weight: 700; margin: 0; }
.pcg-small { font-size: 12px; color: rgba(26,20,16,.6); line-height: 1.7; margin: 0; }
.pcg-plan:focus-visible, .pcg-btn:focus-visible, .pcg-ghost:focus-visible, .pcg-agree input:focus-visible { outline: 2px solid #2f4f8f; outline-offset: 2px; }
.pcg-due { position: sticky; top: 0; z-index: 9000; background: #fff7ed; border-bottom: 1px solid #fdba74; color: #7c2d12; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; font-size: 13.5px; font-weight: 700; }
.pcg-due button { border: 1px solid #7c2d12; background: #fff; color: #7c2d12; border-radius: 99px; padding: 6px 14px; font-weight: 800; font-size: 13px; cursor: pointer; }
@media (max-width: 480px) { .pcg-head h1 { font-size: 20px; } }
`;

const MAX_WAIT_TRIES = 20; // 払い終わって戻ってきた時、webhook の記録を3秒おきに最大1分待つ

async function authHeaders() {
  const t = await freshAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchMe() {
  const res = await fetch('/api/provider/me', { headers: await authHeaders() });
  return res.ok ? res.json() : null;
}

export default function ContractGate() {
  const [me, setMe] = useState(null);
  const [plan, setPlan] = useState('B');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [waitGaveUp, setWaitGaveUp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(location.search);
      let data = await fetchMe().catch(() => null);
      if (cancelled || !data) return;
      // Stripe から戻ってきた直後は、webhook が契約を記録するまで少し待つ
      if (params.get('subscribed') === '1' && !contractActive(data)) {
        setWaiting(true);
        for (let i = 0; i < MAX_WAIT_TRIES && !cancelled; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const next = await fetchMe().catch(() => null);
          if (next) data = next;
          if (contractActive(data)) break;
        }
        if (cancelled) return;
        if (contractActive(data)) { location.replace('/provider/dashboard'); return; }
        setWaitGaveUp(true);
      }
      const wanted = params.get('plan');
      setPlan(['A', 'B', 'C'].includes(wanted) ? wanted : ['A', 'B', 'C'].includes(data.plan) ? data.plan : 'B');
      setMe(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const blocked = !!me && !contractActive(me);

  useEffect(() => {
    if (!blocked && !waiting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [blocked, waiting]);

  async function subscribe() {
    if (!agree) { setError('利用規約をご確認のうえ、「同意する」にチェックを入れてください'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/stripe/provider-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ plan, agree_terms: true, return_to: 'dashboard' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { location.href = data.url; return; }
      setError(data.error || 'お申し込みの準備に失敗しました。時間をおいてもう一度お試しください');
    } catch {
      setError('通信に失敗しました。電波のよい場所でもう一度お試しください');
    }
    setBusy(false);
  }

  async function openPortal() {
    try {
      const res = await fetch('/api/billing/portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: '{}' });
      const data = await res.json().catch(() => ({}));
      if (data.url) location.href = data.url;
      else alert(data.error || '支払い方法の画面を開けませんでした');
    } catch { alert('通信に失敗しました'); }
  }

  const logout = () => document.getElementById('pd-logout-btn')?.click();

  if (waiting && !waitGaveUp) {
    return (
      <div className="pcg-overlay" role="dialog" aria-modal="true" aria-label="お申し込みの確認">
        <style>{CSS}</style>
        <div className="pcg-wrap"><div className="pcg-box" role="status"><p className="pcg-lead">お支払いを確認しています。そのままお待ちください…</p></div></div>
      </div>
    );
  }

  if (!me) return null;

  if (!blocked) {
    if (me.billing_status !== 'past_due' || me._member) return null;
    return (
      <div className="pcg-due" role="alert">
        <style>{CSS}</style>
        <span>Finemeの月額の引き落としに失敗しています。カードを確認・更新してください。</span>
        <button type="button" onClick={openPortal}>支払い方法を更新する</button>
      </div>
    );
  }

  return (
    <div className="pcg-overlay" role="dialog" aria-modal="true" aria-labelledby="pcg-title">
      <style>{CSS}</style>
      <div className="pcg-wrap">
        <div className="pcg-head">
          <div className="pcg-eyebrow">Fineme 利用のお申し込み</div>
          <h1 id="pcg-title">{me.name ? `${me.name} 様、` : ''}プランを選んで、お申し込みください</h1>
          <p className="pcg-lead">お申し込みの日から、管理画面の機能（予約・顧客管理・決済・配信など）が使えるようになります。プランはあとからいつでも変えられます。</p>
        </div>

        {waitGaveUp && (
          <div className="pcg-box" role="status">
            <p className="pcg-err">お支払いの確認に時間がかかっています。少し待ってから、ページを読み込み直してください。</p>
            <button type="button" className="pcg-ghost" onClick={() => location.replace('/provider/dashboard?subscribed=1')}>読み込み直す</button>
          </div>
        )}

        {me._member ? (
          <div className="pcg-box">
            <p className="pcg-lead">お店のオーナーがプランを申し込むと、このアカウントでも管理画面が使えるようになります。オーナーの方にご確認ください。</p>
            <button type="button" className="pcg-ghost" onClick={logout}>ログアウト</button>
          </div>
        ) : (
          <>
            <div className="pcg-plans" role="radiogroup" aria-label="プラン">
              {PROVIDER_PLANS.map(p => (
                <button key={p.key} type="button" role="radio" aria-checked={plan === p.key} className="pcg-plan" onClick={() => setPlan(p.key)}>
                  <div className="pcg-plan-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pcg-radio" aria-hidden="true" />
                      <div className="pcg-plan-name">{p.name}<span>{p.label}</span></div>
                    </div>
                    {p.badge && <span className="pcg-badge">{p.badge}</span>}
                  </div>
                  <div className="pcg-price">¥{p.price}<small>/ 月（税込）</small></div>
                  <p className="pcg-fit">{p.fit}</p>
                  <ul>{p.items.map(it => <li key={it}>{it}</li>)}</ul>
                </button>
              ))}
            </div>

            <div className="pcg-box">
              <ul className="pcg-facts">
                <li>月額は、お申し込みの日から毎月かかります。登録料は0円です。</li>
                <li>予約の手数料はかかりません。お客様がオンラインで払った時だけ、決済額の4.5%（カード会社の手数料込み）が入金から差し引かれます。</li>
                <li>次の画面（Stripe）でカードを登録すると、お申し込みが完了します。</li>
              </ul>
              <label className="pcg-agree">
                <input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); setError(''); }} />
                <span><a href="/terms-provider" target="_blank" rel="noopener noreferrer">掲載者利用規約</a>を読み、同意します（<a href="/tokusho" target="_blank" rel="noopener noreferrer">特定商取引法に基づく表記</a>）</span>
              </label>
              {error && <p className="pcg-err" role="alert">{error}</p>}
              <button type="button" className="pcg-btn" onClick={subscribe} disabled={busy || !agree}>
                {busy ? '準備しています…' : `${PROVIDER_PLANS.find(p => p.key === plan)?.name || ''}（¥${PROVIDER_PLANS.find(p => p.key === plan)?.price || ''}/月）で申し込む`}
              </button>
              <p className="pcg-small">ご不明な点は、ご案内メールにご返信ください。</p>
            </div>
            <button type="button" className="pcg-ghost" onClick={logout}>ログアウト</button>
          </>
        )}
      </div>
    </div>
  );
}
