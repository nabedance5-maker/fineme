'use client';
// サイトの閲覧を Fineme 自身のデータベースに記録する（運営管理画面のアナリティクス用。渡邉指摘 2026-11-06）。
// ページを開くたび（画面の切り替えも含む）に /api/track へ1件送る。個人を特定する情報は送らない。
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function rid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; }
}
function stored(storage, key) {
  try {
    let v = storage.getItem(key);
    if (!v) { v = rid(); storage.setItem(key, v); }
    return v;
  } catch { return null; }
}

export default function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const body = JSON.stringify({
        path: pathname,
        ref: document.referrer || '',
        vid: stored(localStorage, 'fineme:vid'),
        sid: stored(sessionStorage, 'fineme:sid'),
        utm: { source: sp.get('utm_source'), medium: sp.get('utm_medium'), campaign: sp.get('utm_campaign') },
      });
      const blob = new Blob([body], { type: 'text/plain' });
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', blob))) {
        fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
      }
    } catch { /* 記録できなくても画面には影響させない */ }
  }, [pathname]);
  return null;
}
