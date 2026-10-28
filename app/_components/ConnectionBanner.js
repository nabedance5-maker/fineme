'use client';
// つながらない時に、画面が「読み込み中」のまま黙って止まらないようにする（2026-10-28 Supabase の入口が約80分応答せず、
// 掲載者管理画面・マイページへのログインや Me Scan の結果が読み込み中のまま止まった件）。
// 通信に失敗した（fetch の TypeError：Safari は "Load failed"、Chrome は "Failed to fetch"）ら、上に案内を出す。
import { useEffect, useState } from 'react';

const NETWORK_ERROR = /load failed|failed to fetch|networkerror|network request failed|fetch failed|aborted|timed? ?out/i;

export default function ConnectionBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let hits = 0;
    const onFail = reason => {
      const msg = String(reason?.message || reason || '');
      if (!(reason instanceof TypeError || reason?.name === 'AbortError' || reason?.name === 'TimeoutError') || !NETWORK_ERROR.test(msg + ' ' + (reason?.name || ''))) return;
      // 1回だけの取りこぼしでは出さない（2回以上続いたら出す）
      hits += 1;
      if (hits >= 2 || !navigator.onLine) setShow(true);
    };
    const onRejection = e => onFail(e.reason);
    const onOffline = () => setShow(true);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('unhandledrejection', onRejection); window.removeEventListener('offline', onOffline); };
  }, []);
  if (!show) return null;
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <div role="alert" style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, width: 'min(560px, calc(100% - 24px))', background: '#1a1410', color: '#fff', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 6px 24px rgba(0,0,0,.25)', fontSize: '13px', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: '1 1 220px' }}>
        {offline
          ? 'インターネットにつながっていません。電波のよい場所で、もう一度お試しください。'
          : 'ただいまサーバーにつながりにくくなっています。少し時間をおいて、ページを読み込み直してください。入力した内容は保存されていない場合があります。'}
      </span>
      <button type="button" onClick={() => location.reload()} style={{ background: '#c9a84c', color: '#1a1410', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>読み込み直す</button>
      <button type="button" onClick={() => setShow(false)} aria-label="閉じる" style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', cursor: 'pointer' }}>閉じる</button>
    </div>
  );
}
