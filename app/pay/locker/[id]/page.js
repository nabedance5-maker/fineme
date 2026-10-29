'use client';
// ロッカー代の支払いページ（お店から届いたリンク・マイページから開く。ログイン不要。2026-10-29）。
// カードを登録すると、毎月自動でロッカー代が引き落とされる。登録の確定は Stripe の webhook が行う。
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const WRAP = { maxWidth: '420px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' };
const CARD = { background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '24px' };
const BTN = { width: '100%', minHeight: '52px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer' };
const yen = n => `¥${Number(n || 0).toLocaleString()}`;

export default function LockerPayPage() {
  const { id } = useParams();
  const justPaid = useSearchParams().get('paid') === '1';
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let stopped = false, tries = 0;
    async function load() {
      try {
        const r = await fetch(`/api/pay/locker/${id}`);
        const j = await r.json().catch(() => ({}));
        if (stopped) return;
        if (!r.ok) { setError(j.error || 'お支払いが見つかりません'); return; }
        setD(j);
        // 払った直後は、反映されるまで少し待つ
        if (justPaid && j.status === 'unpaid' && tries++ < 15) setTimeout(load, 2000);
      } catch { if (!stopped) setError('読み込めませんでした。電波のよい場所でもう一度お試しください'); }
    }
    load();
    return () => { stopped = true; };
  }, [id, justPaid]);

  async function go() {
    setBusy(true); setError('');
    const r = await fetch(`/api/pay/locker/${id}`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) { window.location.href = j.url; return; }
    setBusy(false); setError(j.error || 'お支払いの準備に失敗しました');
  }

  if (error && !d) return <div style={WRAP}><p style={{ lineHeight: 1.8 }}>{error}</p></div>;
  if (!d) return <div style={{ ...WRAP, color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>;

  return (
    <div style={WRAP}>
      <div style={CARD}>
        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>{d.store_name}</p>
        <h1 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>ロッカーのお支払い</h1>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>{d.contractor_name} 様・{d.locker_name}</p>
        <p style={{ margin: '0 0 20px', fontSize: '28px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{yen(d.monthly_fee)}<span style={{ fontSize: '14px', fontWeight: 700 }}> / 月</span></p>
        {d.status === 'paid' ? (
          <p style={{ margin: 0, lineHeight: 1.8, fontWeight: 700 }}>お支払いの登録が済んでいます。毎月自動でお支払いになります。</p>
        ) : d.status === 'cancelled' ? (
          <p style={{ margin: 0, lineHeight: 1.8 }}>このロッカーの契約は終了しています。お店にお問い合わせください。</p>
        ) : justPaid ? (
          <p style={{ margin: 0, lineHeight: 1.8 }}>お支払いを確認しています…（反映まで少しかかることがあります）</p>
        ) : (
          <>
            {error && <p role="alert" style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.7 }}>{error}</p>}
            <button type="button" onClick={go} disabled={busy} style={{ ...BTN, opacity: busy ? 0.6 : 1 }}>{busy ? '準備しています…' : 'カードを登録して支払う'}</button>
            <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'rgba(232,228,220,0.6)', lineHeight: 1.6 }}>次の画面（Stripe）でカードを登録すると、今日1か月分をお支払いいただき、その後は毎月同じ日に自動でお支払いになります。お金はお店に直接支払われます。解約はお店にお申し出ください。</p>
          </>
        )}
      </div>
    </div>
  );
}
