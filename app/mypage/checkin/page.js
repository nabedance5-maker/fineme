'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';
import { freshAccessToken } from '@/lib/browser-auth';

// 店頭でこのQRを店舗にカメラで読み取ってもらうと、来店チェックインが記録される
// （hacomono/STORES網羅計画 Phase 4）。QRの中身は固定コード（profiles.checkin_code）のみ。
export default function MypageCheckinPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [cards, setCards] = useState(null);

  // お店のレジで使えるよう保存したカード（スマホで払う時に「次回からこのカードで払えるようにする」を選んだもの。2026-10-29）
  async function loadCards() {
    const t = await freshAccessToken();
    if (!t) return;
    const r = await fetch('/api/me/saved-cards', { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) setCards((await r.json()).cards || []);
  }
  async function removeCard(c) {
    if (!confirm(`${c.store_name}に保存したカード（${c.label}）を外しますか？\n外すと、このお店で会員証を見せてもカードでは払えなくなります（スマホで払うことはできます）。`)) return;
    const t = await freshAccessToken();
    await fetch('/api/me/saved-cards', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ provider_id: c.provider_id }) });
    loadCards();
  }

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!sbKey) { window.location.href = '/login'; return; }
    let accessToken = null;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      accessToken = obj?.access_token || null;
      if (!obj?.user?.id) { window.location.href = '/login'; return; }
    } catch { window.location.href = '/login'; return; }

    fetch('/api/me/checkin-code', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async ({ code }) => {
        const QRCode = (await import('qrcode')).default || (await import('qrcode'));
        const dataUrl = await QRCode.toDataURL(code, { width: 240, margin: 1, color: { dark: '#0d1117', light: '#ffffff' } });
        setQrDataUrl(dataUrl);
      })
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false));
    loadCards();
  }, []);

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="stack mypage-content">
          <h1 className="section-title">チェックインQR</h1>
          <p className="muted" style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.7 }}>
            来店時に、店舗のスタッフへこのQRコードを提示してください。カメラで読み取るとチェックインが記録されます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#fff', fontWeight: 700 }}>{error}</p>
          ) : (
            <div
              style={{
                border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '28px',
                background: '#ffffff', maxWidth: '280px', textAlign: 'center',
              }}
            >
              {qrDataUrl && <img src={qrDataUrl} alt="チェックインQRコード" style={{ width: '100%', height: 'auto' }} />}
            </div>
          )}

          {cards?.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px' }}>お店に保存したカード</h2>
              <p className="muted" style={{ fontSize: '12.5px', margin: '0 0 10px', lineHeight: 1.7 }}>このお店では、会員証を見せるとこのカードでお会計できます。</p>
              <div style={{ display: 'grid', gap: '8px', maxWidth: '480px' }}>
                {cards.map(c => (
                  <div key={c.provider_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: '14px' }}>{c.store_name}</b>
                      <span style={{ fontSize: '12.5px', color: 'rgba(232,228,220,0.75)' }}>{c.label}（有効期限 {c.exp}）</span>
                    </div>
                    <button type="button" onClick={() => removeCard(c)} style={{ minHeight: '40px', padding: '0 14px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.3)', background: 'transparent', color: '#e8e4dc', fontWeight: 700, cursor: 'pointer' }}>外す</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
      `}</style>
    </main>
  );
}
