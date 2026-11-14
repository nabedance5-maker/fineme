'use client';
// 営業用のデモの入口（2026-11-14）。招待コードを入れると、架空のデータの入ったデモ店舗の管理画面に入れる。
// ?code=XXXX を付けたURLを渡せば、ボタンを押すだけで入れる。
import { useEffect, useState } from 'react';
import { setBrowserSession } from '@/lib/browser-auth';

export default function DemoPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try { const c = new URLSearchParams(location.search).get('code'); if (c) setCode(c.toUpperCase()); } catch {}
  }, []);

  async function start(e) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/demo/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'デモに入れませんでした');
      await setBrowserSession(j);
      location.href = '/provider/dashboard';
    } catch (err) {
      setError(err.message || 'デモに入れませんでした');
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: 'var(--color-bg, #fafaf7)' }}>
      <form onSubmit={start} style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid var(--color-border, #e5e5e0)', borderRadius: 14, padding: '28px 24px', display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 style={{ fontSize: 22, margin: 0, color: 'var(--color-fg, #1a1a1a)' }}>Fineme のデモを体験する</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: 'var(--color-muted, #5c5c58)' }}>
            架空のパーソナルジムの管理画面に入れます。予約・来店確認・シフト・POS・顧客管理・カルテ・AI専属コンサルなど、実際の機能をそのまま使えます。
          </p>
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, color: 'var(--color-fg, #1a1a1a)' }}>
          招待コード
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} placeholder="例：DEMO-XXXX-XXXX"
            style={{ fontSize: 16, padding: '12px 14px', border: '1px solid var(--color-border, #d6d6d0)', borderRadius: 10, letterSpacing: '0.04em' }} />
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
