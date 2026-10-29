'use client';
// お店のレジの「お客様のスマホで払う（QR）」を読み取った時の確認ページ（2026-10-29）。
// お店が会員証などでお客様を選んでいた時だけここに来る。金額を確かめて、
// 「次回からこのカードで払えるようにする」を選べる（選ぶと、次からはお店が会員証を読み取るだけでカードで払える）。
// ログインは要らない（誰のお会計かはお店のレジ側で決まっている）。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const WRAP = { maxWidth: '420px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' };
const CARD = { background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '24px' };
const BTN = { width: '100%', minHeight: '52px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer' };
const yen = n => `¥${Number(n || 0).toLocaleString()}`;

export default function PosPayStartPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/pos-pay/${id}/start`).then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setD(j) : setError(j.error || 'お支払いが見つかりません')))
      .catch(() => setError('読み込めませんでした。電波のよい場所でもう一度お試しください'));
  }, [id]);

  async function go() {
    setBusy(true); setError('');
    const r = await fetch(`/api/pos-pay/${id}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ save_card: save }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) { window.location.href = j.url; return; }
    setBusy(false);
    setError(j.error || 'お支払いの準備に失敗しました');
  }

  if (error && !d) return <div style={WRAP}><p style={{ lineHeight: 1.8 }}>{error}</p></div>;
  if (!d) return <div style={{ ...WRAP, color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>;

  if (d.status !== 'pending') {
    const msg = d.status === 'paid' ? 'このお会計は、お支払い済みです。' : d.status === 'expired' ? '時間が経ったため、このQRコードは使えません。お店のスタッフにお声がけください。' : 'このお会計は取り消されています。お店のスタッフにお声がけください。';
    return <div style={WRAP}><div style={CARD}><p style={{ margin: 0, lineHeight: 1.8 }}>{msg}</p></div></div>;
  }

  return (
    <div style={WRAP}>
      <div style={CARD}>
        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>{d.store_name}</p>
        <h1 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800 }}>お会計</h1>
        {d.customer_name && <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>{d.customer_name} 様</p>}
        <p style={{ margin: '0 0 20px', fontSize: '30px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{yen(d.total_amount)}</p>

        {d.saved_card ? (
          <p style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'rgba(232,228,220,0.8)', margin: '0 0 18px' }}>
            このお店には、カード（{d.saved_card}）が保存されています。次回からは、お店で会員証を見せるだけで払えます。
          </p>
        ) : (
          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13.5px', lineHeight: 1.7, margin: '0 0 18px', cursor: 'pointer' }}>
            <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} style={{ marginTop: '4px', width: '20px', height: '20px', flexShrink: 0 }} />
            <span>
              次回から、このカードで払えるようにする
              <span style={{ display: 'block', fontSize: '12px', color: 'rgba(232,228,220,0.7)' }}>
                {d.store_name}で、お店が会員証を読み取った時だけ使います。保存したカードは、Finemeのマイページ「会員証」からいつでも外せます。
              </span>
            </span>
          </label>
        )}

        {error && <p role="alert" style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.7 }}>{error}</p>}
        <button type="button" onClick={go} disabled={busy} style={{ ...BTN, opacity: busy ? 0.6 : 1 }}>{busy ? '準備しています…' : 'カードで支払う'}</button>
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'rgba(232,228,220,0.6)', lineHeight: 1.6 }}>次の画面（Stripe）でカード番号を入れてお支払いください。お金はお店に直接支払われます。</p>
      </div>
    </div>
  );
}
