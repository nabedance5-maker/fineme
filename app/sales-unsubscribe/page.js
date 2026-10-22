'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribeInner() {
  const token = useSearchParams().get('t') || '';
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  async function onClick() {
    setState('sending');
    try {
      const res = await fetch('/api/sales-unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || '処理できませんでした');
      setState('done');
    } catch (e) {
      setMessage(e.message);
      setState('error');
    }
  }

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '48px 20px', background: '#0b0f17', color: '#f3efe6' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Finemeからのご案内メールの配信停止</h1>
        {state === 'done' ? (
          <p style={{ lineHeight: 1.9 }}>配信を停止しました。今後、このアドレスにご案内をお送りすることはありません。<br />ご迷惑をおかけし、失礼いたしました。</p>
        ) : (
          <>
            <p style={{ lineHeight: 1.9, marginBottom: 24 }}>下のボタンを押すと、店舗運営システムFinemeからのご案内メールが今後届かなくなります。</p>
            <button
              type="button"
              onClick={onClick}
              disabled={!token || state === 'sending'}
              style={{ padding: '14px 32px', borderRadius: 999, border: 0, fontWeight: 700, fontSize: 15, background: '#e8cf7e', color: '#10131a', cursor: 'pointer' }}
            >
              {state === 'sending' ? '処理しています' : '配信を停止する'}
            </button>
            {state === 'error' && <p style={{ marginTop: 16, color: '#ffb4a8' }}>{message}。お手数ですが contact@fineme.me までご連絡ください。</p>}
            {!token && <p style={{ marginTop: 16, color: '#ffb4a8' }}>リンクが正しくありません。お手数ですが contact@fineme.me までご連絡ください。</p>}
          </>
        )}
      </div>
    </main>
  );
}

export default function SalesUnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
