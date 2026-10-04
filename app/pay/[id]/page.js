'use client';

// お客様が店舗からの請求（お支払いのお願い）を確認してカード決済するページ。
// 請求IDは推測不能なUUIDで、ログイン不要。入金の確定はStripe Webhookが行い、
// 決済後に戻ってきたときはポーリングで反映を待つ。
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function InvoicePayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const justPaid = searchParams.get('paid') === '1';
  const [inv, setInv] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    async function load() {
      try {
        const res = await fetch(`/api/pay/${id}`);
        if (res.status === 404) { if (!stopped) setNotFound(true); return; }
        if (!res.ok) return;
        const data = await res.json();
        if (stopped) return;
        setInv(data);
        if (justPaid && data.status === 'unpaid') setTimeout(load, 2000);
      } catch {
        if (!stopped && justPaid) setTimeout(load, 2000);
      }
    }
    load();
    return () => { stopped = true; };
  }, [id, justPaid]);

  async function pay() {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/pay/${id}/checkout`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setError(data.error || 'お支払いの開始に失敗しました');
    } catch {
      setError('通信に失敗しました。時間をおいてもう一度お試しください');
    }
    setBusy(false);
  }

  const wrap = { minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };
  const box = { width: '100%', maxWidth: '400px', textAlign: 'center' };

  if (notFound) {
    return <div style={wrap}><div style={box}><p style={{ fontSize: '16px', fontWeight: 700 }}>この請求は見つかりませんでした</p><p style={{ fontSize: '13px', color: '#666' }}>リンクをご確認のうえ、店舗にお問い合わせください。</p></div></div>;
  }
  if (!inv) {
    return <div style={wrap}><p style={{ fontSize: '14px', color: '#666' }}>読み込み中…</p></div>;
  }

  const yen = '¥' + Number(inv.amount).toLocaleString();
  return (
    <div style={wrap}>
      <div style={box}>
        <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px' }}>{inv.provider_name} からのご請求</p>
        <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>{inv.title}</p>
        <p style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 8px' }}>{yen}</p>
        {inv.note && <p style={{ fontSize: '13px', color: '#444', margin: '0 0 6px' }}>{inv.note}</p>}
        {inv.due_date && <p style={{ fontSize: '12px', color: '#888', margin: '0 0 16px' }}>お支払い期限：{inv.due_date}</p>}

        {inv.status === 'paid' && (
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#059669', margin: '20px 0 0' }}>お支払いが完了しています</p>
        )}
        {inv.status === 'canceled' && (
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#6b7280', margin: '20px 0 0' }}>この請求は取り消されました</p>
        )}
        {inv.status === 'unpaid' && justPaid && (
          <p style={{ fontSize: '14px', color: '#666', margin: '20px 0 0' }}>お支払いを確認しています。このまま少々お待ちください…</p>
        )}
        {inv.status === 'unpaid' && !justPaid && (
          <>
            <button
              type="button"
              onClick={pay}
              disabled={busy}
              style={{ marginTop: '12px', width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800, color: '#fff', background: '#111827', border: 'none', borderRadius: '10px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? '移動中…' : 'カードでお支払いへ進む'}
            </button>
            {error && <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '12px' }}>{error}</p>}
            <p style={{ fontSize: '11px', color: '#999', marginTop: '14px', lineHeight: 1.6 }}>お支払いはStripeの決済画面で行われます。カード情報が店舗やFinemeに渡ることはありません。</p>
          </>
        )}
      </div>
    </div>
  );
}
