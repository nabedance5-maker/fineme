export const metadata = {
  title: {
    default: 'Fineme | 恋愛を変える、外見磨きの入口',
    template: '%s | Fineme',
  },
  description: '恋愛に悩む男性向けの外見磨きポータル。ジム/メイク/ヘア/診断/撮影などを検索・比較・予約。',
  metadataBase: new URL('https://example.com'),
  manifest: '/manifest.json',
  themeColor: '#111111',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fineme',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Fineme',
    title: 'Fineme | 外見を起点に、自信を再設計する',
    description: '変わりたい男性のための外見磨きサービス検索ポータル。',
  },
};

import './globals.css';
import '../styles/style.css';
import Navbar from './_components/Navbar';
import Footer from './_components/Footer';
import ServiceWorkerRegister from './_components/ServiceWorkerRegister';

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Navbar />
        {children}
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
