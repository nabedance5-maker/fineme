'use client';
import { useEffect, useState } from 'react';

const PROVIDER_KEY = 'fineme:provider:current';
const BASE_URL = 'https://www.fineme.me';

export default function ProviderLogToolkitPage() {
  const [slug, setSlug] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    let s = null;
    try {
      const raw = localStorage.getItem(PROVIDER_KEY);
      if (raw) s = JSON.parse(raw)?.slug || null;
    } catch {}
    setSlug(s);
  }, []);

  useEffect(() => {
    const link = `${BASE_URL}/log?src=partner_${slug || 'unknown'}`;
    let cancelled = false;
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#0a0f1e', light: '#ffffff' } })
        .then(url => { if (!cancelled) setQrDataUrl(url); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [slug]);

  const trackingLink = `${BASE_URL}/log?src=partner_${slug || 'unknown'}`;

  return (
    <main>
      <style>{`
        .toolkit-hero { padding: 48px 0 24px; }
        .toolkit-section { padding: 24px 0; }
        .toolkit-card { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(17,24,39,.06); }
        .toolkit-muted { color: #6b7280; }
        .flyer-print-area { background: #faf8f3; border: 2px solid #c9a84c; border-radius: 16px; padding: 40px; max-width: 480px; margin: 0 auto; text-align: center; }
        .flyer-title { font-size: 24px; font-weight: 900; color: #0a0f1e; margin: 0 0 12px; }
        .flyer-sub { font-size: 14px; color: #444; margin: 0 0 24px; line-height: 1.7; }
        .flyer-qr { width: 220px; height: 220px; margin: 0 auto 16px; }
        .flyer-brand { font-size: 12px; color: #999; margin-top: 16px; }
        .no-print-note { font-size: 13px; color: #6b7280; text-align: center; margin-top: 16px; }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .flyer-print-area, .flyer-print-area * { visibility: visible; }
          .flyer-print-area { position: absolute; left: 0; top: 0; margin: 0; border: none; width: 100%; }
        }
      `}</style>

      <section className="toolkit-hero">
        <div className="container stack">
          <h1 className="section-title">New Me Log を、お客様に紹介する</h1>
          <p className="toolkit-muted">
            お客様の来店サイクル・美容代を、無料で覚えておいてくれるツールです。<br />
            「そろそろ次の予約を」を、Finemeが代わりにお知らせします——次回来店を思い出してもらう、無料の道具として自由にお使いください。
          </p>
        </div>
      </section>

      <section className="toolkit-section">
        <div className="container">
          <div className="flyer-print-area">
            <p className="flyer-title">来店サイクル、覚えてます。</p>
            <p className="flyer-sub">
              美容室・ネイル・ジムなど、通っているものを登録するだけ。<br />
              前回の来店日から、次のタイミングをお知らせします。<br />
              登録は無料・アカウント登録も不要です。
            </p>
            {qrDataUrl && <img src={qrDataUrl} alt="New Me Log QRコード" className="flyer-qr" />}
            <p className="flyer-brand">New Me Log by Fineme — fineme.me/log</p>
          </div>

          <div className="no-print">
            <p className="no-print-note">
              印刷してお店に置いていただくか、QRコードをそのままご利用ください。<br />
              このQRコード経由の利用は店舗ごとに計測されます（リンク：<code>{trackingLink}</code>）。
            </p>
            <div className="cluster" style={{ justifyContent: 'center', marginTop: '16px' }}>
              <button className="btn" onClick={() => window.print()}>印刷する</button>
            </div>
          </div>
        </div>
      </section>

      <section className="toolkit-section no-print">
        <div className="container stack">
          <div className="toolkit-card">
            <h3>なぜお店にメリットがあるか</h3>
            <p className="toolkit-muted">
              お客様自身が来店サイクルを覚えていてくれるので、「そろそろ美容室行かなきゃ」と思い出すきっかけになります。
              Fineme側の宣伝ではなく、店舗が無料でお客様に提供できる利便性としてご活用ください。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
