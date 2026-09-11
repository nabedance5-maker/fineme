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
        const dataUrl = await QRCode.toDataURL(code, { width: 240, margin: 1, color: { dark: '#0a0f1e', light: '#ffffff' } });
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
          <p className="muted" style={{ fontSize: '13px', marginTop: '-8px' }}>
            来店時に、店舗のスタッフへこのQRコードを提示してください。カメラで読み取るとチェックインが記録されます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#dc2626' }}>{error}</p>
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
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav, .mypage-content { min-width: 0; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
