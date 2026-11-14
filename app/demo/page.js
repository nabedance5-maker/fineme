'use client';
// 営業用のデモの入口（2026-11-14）。招待コードを入れると、架空のデータの入ったデモ店舗の管理画面に入れる。
// ?code=XXXX を付けたURLを渡せば、ボタンを押すだけで入れる。
import { useEffect, useState } from 'react';
import { setBrowserSession } from '@/lib/browser-auth';
import { DEMO_ONBOARDING_FLAG, DEMO_ACTIVE_KEY, DEMO_CODE_KEY, safeDemoRedirect } from '@/lib/demo';

export default function DemoPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 店舗名（任意・2026-11-15）：営業メールのコードはみんな同じなので、誰が入ったか分かるように書いてもらう
  const [storeName, setStoreName] = useState('');
  const [expired, setExpired] = useState(false);

  // again=1：デモの途中でログインが切れて戻ってきた時。このタブで使った招待コードがあれば、そのまま入り直す（2026-11-15）
  const [again, setAgain] = useState(false);
  useEffect(() => {
    let c = '', isAgain = false;
    try {
      const q = new URLSearchParams(location.search);
      isAgain = q.get('again') === '1';
      c = (q.get('code') || (isAgain ? sessionStorage.getItem(DEMO_CODE_KEY) : '') || '').toUpperCase();
    } catch {}
    let sn = '';
    try { sn = sessionStorage.getItem('fineme:demo:store') || ''; } catch {}
    setAgain(isAgain);
    if (sn) setStoreName(sn);
    if (c) setCode(c);
    if (isAgain && c) start(null, c, true, sn);
  }, []);

  async function start(e, codeArg, isAgain = again, storeArg) {
    e?.preventDefault();
    const useCode = codeArg || code;
    if (busy && !codeArg) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: useCode, store_name: storeArg ?? storeName }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 410 && j.code === 'expired') { setExpired(true); setBusy(false); return; }
      if (!res.ok) throw new Error(j.error || 'デモに入れませんでした');
      await setBrowserSession(j);
      try {
        sessionStorage.setItem(DEMO_ACTIVE_KEY, '1');
        sessionStorage.setItem(DEMO_CODE_KEY, useCode);
        sessionStorage.setItem('fineme:demo:store', String(storeArg ?? storeName).slice(0, 60));
        if (!isAgain) sessionStorage.setItem(DEMO_ONBOARDING_FLAG, '1');
      } catch {}
      let to = '/provider/dashboard';
      try { to = isAgain ? safeDemoRedirect(new URLSearchParams(location.search).get('redirect')) : to; } catch {}
      location.href = to;
    } catch (err) {
      setError(err.message || 'デモに入れませんでした');
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: 'var(--color-bg, #fafaf7)' }}>
        <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid var(--color-border, #e5e5e0)', borderRadius: 14, padding: '28px 24px', display: 'grid', gap: 14 }}>
          <h1 style={{ fontSize: 20, margin: 0, color: 'var(--color-fg, #1a1a1a)' }}>このデモの期限が切れています</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-muted, #5c5c58)' }}>
            ご覧いただきありがとうございます。続けて触ってみたい方、実際の店舗での使い方を聞きたい方は、下のフォームからお気軽にご連絡ください。新しいデモのご案内や、オンラインでのご説明をいたします。
          </p>
          <a href="/provider/inquiry" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, fontSize: 15, fontWeight: 600, borderRadius: 10, background: '#1f2a44', color: '#fff', textDecoration: 'none' }}>説明を聞く・続けて使いたい</a>
          <a href="/business/providers" style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-muted, #5c5c58)' }}>店舗管理の機能を見る</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: 'var(--color-bg, #fafaf7)' }}>
      <form onSubmit={start} style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid var(--color-border, #e5e5e0)', borderRadius: 14, padding: '28px 24px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 style={{ fontSize: 22, margin: 0, color: 'var(--color-fg, #1a1a1a)' }}>{again ? 'デモに入り直す' : 'Fineme のデモを体験する'}</h1>
          {again && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-fg, #1a1a1a)' }}>デモのログインが切れました（毎晩の作り直しや、時間がたった時に切れます）。招待コードで入り直すと、さっきの画面に戻ります。</p>}
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-muted, #5c5c58)' }}>
            架空のパーソナルジムの管理画面に入れます。予約・来店確認・シフト・POS・顧客管理・カルテ・AI専属コンサルなど、実際の機能をそのまま使えます。
          </p>
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-fg, #1a1a1a)' }}>
          招待コード
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} placeholder="例：DEMO-XXXX-XXXX"
            style={{ fontSize: 16, padding: '12px 14px', border: '1px solid var(--color-border, #d6d6d0)', borderRadius: 10, letterSpacing: '0.04em' }} />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-fg, #1a1a1a)' }}>
          <span>店舗名<span style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-muted, #5c5c58)' }}>任意</span></span>
          <input value={storeName} onChange={e => setStoreName(e.target.value.slice(0, 60))} maxLength={60} autoComplete="organization" placeholder="例：〇〇ジム 渋谷店"
            style={{ fontSize: 16, padding: '12px 14px', border: '1px solid var(--color-border, #d6d6d0)', borderRadius: 10 }} />
          <span style={{ fontSize: 12, color: 'var(--color-muted, #5c5c58)', lineHeight: 1.6 }}>書いていただくと、ご説明の時にお話がしやすくなります。空欄でも入れます。</span>
        </label>
        {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: '#b42318' }}>{error}</p>}
        <button type="submit" disabled={busy || !code.trim()}
          style={{ minHeight: 48, fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 10, background: '#1f2a44', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: busy || !code.trim() ? 0.5 : 1 }}>
          {busy ? '準備しています…' : 'デモを始める'}
        </button>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.8, color: 'var(--color-muted, #5c5c58)' }}>
          <li>お客様・予約・売上はすべて架空のデータです。毎晩、元の状態に戻ります。</li>
          <li>デモを使う方は全員同じ店舗に入ります。入力した内容は他の方にも見えるため、実在の方の情報は入れないでください。</li>
          <li>メール・LINEの送信、決済、アカウントの変更は行われません。</li>
          <li>このブラウザで別の店舗にログインしている場合は、デモの店舗に切り替わります。</li>
        </ul>
      </form>
    </main>
  );
}
