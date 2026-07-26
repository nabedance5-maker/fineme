import ServiceLog from '@/app/_components/ServiceLog';
import Link from 'next/link';

export const metadata = {
  title: '通っているものを1枚で管理 | New Me Log — Fineme',
  description:
    '美容室・ネイル・ジム・エステ…。定期的に通っているものを1枚で管理して、次に行くタイミングと、月にかかっている費用が一目で分かります。登録不要ですぐ使えます。',
  alternates: { canonical: 'https://www.fineme.me/log' },
  robots: { index: true, follow: true },
  openGraph: {
    title: '通っているものを1枚で管理 — New Me Log',
    description:
      '次に行くタイミングと、月にかかっている費用が一目で分かる。美容室・ネイル・ジムの記録帳。',
    url: 'https://www.fineme.me/log',
    siteName: 'Fineme',
    locale: 'ja_JP',
    type: 'website',
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
