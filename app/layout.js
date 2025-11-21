export const metadata = {
  title: {
  default: 'Fineme | 恋愛を変える、外見磨きの入口',
  template: '%s | Fineme'
  },
  description: '恋愛に悩む男性向けの外見磨きポータル。ジム/メイク/ヘア/診断/撮影などを検索・比較・予約。',
  metadataBase: new URL('https://example.com')
};

import './globals.css';
import '../styles/style.css';
import Navbar from './_components/Navbar';
import Footer from './_components/Footer';

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
