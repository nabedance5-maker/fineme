import ServiceLog from '@/app/_components/ServiceLog';
import Link from 'next/link';

export const metadata = {
  title: '美容室、前いつ行ったっけ？をなくす | New Me Log — Fineme',
  description:
    '美容室・眉サロン・ネイル・ジム。前回行った日を入れるだけで、次に行く時期を自動計算。そろそろの時期にLINEで知らせます。月にいくら使っているかも分かります。登録不要ですぐ使えます。',
  alternates: { canonical: 'https://www.fineme.me/log' },
  robots: { index: true, follow: true },
  openGraph: {
    title: '「前いつ行ったっけ？」を、なくす — New Me Log',
    description:
      '美容室・眉サロン・ネイル・ジム。そろそろの時期をLINEで知らせて、月にいくら使っているかも分かる記録帳。',
    url: 'https://www.fineme.me/log',
    siteName: 'Fineme',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: 'https://www.fineme.me/api/og/log', width: 1200, height: 630, alt: '自分への投資 — New Me Log' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '「前いつ行ったっけ？」を、なくす — New Me Log',
    description: '美容室・眉サロン・ネイル・ジム。そろそろの時期をLINEで知らせて、月にいくら使っているかも分かる記録帳。',
    images: ['https://www.fineme.me/api/og/log'],
  },
};

export default function LogEntryPage() {
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: '720px' }}>
        <ServiceLog />

        <div style={{ marginTop: '40px', paddingTop: '28px', borderTop: '1px solid rgba(201,168,76,0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.4)', margin: '0 0 12px', lineHeight: 1.8 }}>
            New Me Log は Fineme の機能のひとつです。<br />
            外見を起点に自信を再設計するための、地図と羅針盤を渡しています。
          </p>
          <Link
            href="/about"
            style={{ fontSize: '12px', color: 'rgba(201,168,76,0.75)', textDecoration: 'none', fontWeight: 700 }}
          >
            Fineme について →
          </Link>
        </div>
      </div>
    </main>
  );
}
