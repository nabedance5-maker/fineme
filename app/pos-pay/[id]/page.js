'use client';

// お客様がPOSオンライン決済後に戻ってくる確認ページ（でお要望2026-09-27・
// 決済機能Phase6②）。決済の確定自体はStripe Webhookが行うため、このページは
// その状況をポーリングで見て表示を切り替えるだけ（お客様側での操作は無い）。
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function PosPayStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id;
  const cancelled = searchParams.get('paid') === '0';
  const [status, setStatus] = useState(cancelled ? 'cancelled' : 'checking');
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    if (!id || cancelled) return;
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/pos-pay/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (stopped) return;
        setAmount(data.total_amount);
        if (data.status === 'paid') { setStatus('paid'); return; }
        if (data.status === 'failed') { setStatus('failed'); return; }
        setTimeout(poll, 2000);
      } catch {
        if (!stopped) setTimeout(poll, 2000);
      }
    }
    poll();
    return () => { stopped = true; };
  }, [id, cancelled]);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '360px', textAlign: 'center' }}>
        {status === 'checking' && (
          <>
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px' }}>お支払いを確認しています…</p>
            <p style={{ fontSize: '13px', color: '#666' }}>このまま少々お待ちください。</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <p style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 8px' }}>お支払いが完了しました</p>
            {amount != null && <p style={{ fontSize: '16px', color: '#444' }}>¥{Number(amount).toLocaleString()}</p>}
            <p style={{ fontSize: '13px', color: '#999', marginTop: '20px' }}>この画面はスタッフにお見せいただく必要はありません。</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px', color: '#ef4444' }}>お支払いの確認でエラーが発生しました</p>
            <p style={{ fontSize: '13px', color: '#666' }}>お手数ですがスタッフにお声がけください。</p>
          </>
        )}
        {status === 'cancelled' && (
          <>
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px' }}>お支払いがキャンセルされました</p>
            <p style={{ fontSize: '13px', color: '#666' }}>お手数ですがスタッフにお声がけください。</p>
          </>
        )}
      </div>
    </div>
  );
}
