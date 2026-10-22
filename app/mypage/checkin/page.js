'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';

// 店頭でこのQRを店舗にカメラで読み取ってもらうと、来店チェックインが記録される
// （hacomono/STORES網羅計画 Phase 4）。QRの中身は固定コード（profiles.checkin_code）のみ。
export default function MypageCheckinPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

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
        </section>
      </div>

      <style>{`
      `}</style>
    </main>
  );
}
