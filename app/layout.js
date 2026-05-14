export const metadata = {
  title: {
    default: 'Fineme | そのまま進むのが怖くなった夜に。',
    template: '%s | Fineme',
  },
  description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。恋愛に悩む男性の外見・自信を診断から変える。',
  metadataBase: new URL('https://www.fineme.me'),
  alternates: {
    canonical: 'https://www.fineme.me',
  },
  verification: {
    google: 'rV01Z0WUK3HqetQjrbWjrhACNGPAvOY2sWIolOtdfIc',
  },
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
    title: 'Fineme | そのまま進むのが怖くなった夜に。',
    description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。',
    images: [
      {
        url: '/assets/images/og-image.png',
        alt: 'Fineme — 自信を再設計する、地図と羅針盤。',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fineme | そのまま進むのが怖くなった夜に。',
    description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。',
    images: ['/assets/images/og-image.png'],
  },
};

import './globals.css';
import '../styles/style.css';
import Navbar from './_components/Navbar';
import Footer from './_components/Footer';
import ServiceWorkerRegister from './_components/ServiceWorkerRegister';
import GoogleAnalytics from './_components/GoogleAnalytics';

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': 'https://www.fineme.me/#website',
                url: 'https://www.fineme.me',
                name: 'Fineme',
                description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。恋愛に悩む男性が外見を起点に自信を取り戻すための診断・マッチングプラットフォーム。',
                inLanguage: 'ja-JP',
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://www.fineme.me/search?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'Organization',
                '@id': 'https://www.fineme.me/#organization',
                name: 'Fineme',
                url: 'https://www.fineme.me',
                description: '恋愛に悩む男性が外見を起点に自信を取り戻すための診断・マッチングプラットフォーム',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.fineme.me/assets/images/fineme-logo.png',
                },
              },
            ],
          })}}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <Navbar />
        {children}
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
