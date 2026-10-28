'use client';
// マイページのどの画面でも、右下のボタンから会員証QR（チェックイン・お店でのお会計に使う）をすぐ出せるようにする
// （でお要望 2026-10-28：「QRコードの場所がすごいわかりづらい」）。中身は /mypage/checkin と同じ profiles.checkin_code。
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { freshAccessToken } from '@/lib/browser-auth';

function hasSession() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return !!(key && JSON.parse(localStorage.getItem(key))?.user?.id);
  } catch { return false; }
}

function QrIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  );
}

export default function MemberQrButton() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setShow(hasSession()); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    if (!qr) {
      setError('');
      freshAccessToken()
        .then(t => (t ? fetch('/api/me/checkin-code', { headers: { Authorization: `Bearer ${t}` } }) : Promise.reject()))
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(async ({ code }) => {
          const QRCode = (await import('qrcode')).default || (await import('qrcode'));
          setQr(await QRCode.toDataURL(code, { width: 320, margin: 1, color: { dark: '#0d1117', light: '#ffffff' } }));
        })
        .catch(() => setError('QRコードを読み込めませんでした。もう一度お試しください'));
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open, qr]);

  // 専用ページでは同じQRが既に大きく出ているので出さない
  if (!show || pathname === '/mypage/checkin') return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="会員証QRコードを表示する"
        style={{ position: 'fixed', right: '16px', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', zIndex: 900, minWidth: '64px', minHeight: '64px', padding: '8px 10px', borderRadius: '18px', border: 'none', background: '#c9a84c', color: '#0a0f1e', boxShadow: '0 6px 20px rgba(0,0,0,.35)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontWeight: 800, fontSize: '11px' }}>
        <QrIcon />
        会員証
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="会員証QRコード" onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', color: '#111', borderRadius: '18px', padding: '22px 20px 18px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#111' }}>会員証QRコード</h2>
            <p style={{ margin: '0 0 14px', fontSize: '12.5px', lineHeight: 1.7, color: '#333' }}>来店時のチェックインやお会計の時に、お店のスタッフに見せてください。</p>
            <div style={{ width: '240px', height: '240px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qr ? <img src={qr} alt="会員証QRコード" style={{ width: '100%', height: '100%' }} />
                : <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>{error || '読み込み中…'}</p>}
            </div>
            <p style={{ margin: '10px 0 14px', fontSize: '11.5px', color: '#555', lineHeight: 1.6 }}>読み取りにくい時は、画面を明るくしてください。</p>
            <button type="button" autoFocus onClick={() => setOpen(false)}
              style={{ width: '100%', minHeight: '46px', borderRadius: '12px', border: '1.5px solid #111', background: '#fff', color: '#111', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
