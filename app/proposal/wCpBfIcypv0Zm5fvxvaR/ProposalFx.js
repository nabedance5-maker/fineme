'use client';
// 提案資料ページの計測（2026-11-21）。GA4（app/_components/GoogleAnalytics.js が読み込む gtag）に、
// どのボタンを押したか（proposal_cta）と、どこまで読んだか（proposal_section）を、資料番号 s 付きで送る。
// 送るのは資料番号（営業メールごとに付ける英数字）とボタン・セクションの名前だけ。個人情報は送らない。
import { useEffect } from 'react';

export default function ProposalFx({ s }) {
  useEffect(() => {
    const send = (name, params) => {
      try { if (typeof window.gtag === 'function') window.gtag('event', name, { proposal_s: s || '(none)', ...params }); } catch {}
    };
    const onClick = (e) => {
      const el = e.target?.closest?.('[data-cta]');
      if (el) send('proposal_cta', { cta: el.dataset.cta });
    };
    document.addEventListener('click', onClick);

    const seen = new Set();
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const id = en.target.dataset.trackSection;
          if (en.isIntersecting && id && !seen.has(id)) {
            seen.add(id);
            send('proposal_section', { section: id });
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.35 });
      document.querySelectorAll('[data-track-section]').forEach(el => io.observe(el));
    }
    return () => { document.removeEventListener('click', onClick); io?.disconnect(); };
  }, [s]);
  return null;
}
