export const metadata = {
  title: {
    default: 'Fineme | そのまま進むのが怖くなった夜に。',
    template: '%s | Fineme',
  },
  description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。外見を起点に自信を再設計するプラットフォーム。男性向けFinemeと女性向けFineme Belleの2トラックで、自分だけの変容ロードマップを手に入れる。',
  metadataBase: new URL('https://www.fineme.me'),
  // canonical はここで共通指定しない。共通で入れると、上書きしていない全ページが
  // 「正規URL＝トップ」と宣言してしまう（2026-11-13 修正）。各ページで自分のURLを指定する。
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
import ConnectionBanner from './_components/ConnectionBanner';
import GoogleAnalytics from './_components/GoogleAnalytics';
import PageViewTracker from './_components/PageViewTracker';
import SiteFaqJsonLd from './_components/SiteFaqJsonLd';
import Script from 'next/script';

export default function RootLayout({ children }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet" />
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
                description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。外見を起点に自信を再設計するためのプラットフォーム。男性向けFinemeと女性向けBelleで構成される。',
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
                alternateName: ['ファインミ', 'Fineme Belle'],
                url: 'https://www.fineme.me',
                description: '外見を起点に自信を再設計するためのプラットフォーム。男性向けFinemeと女性向けBelleで構成される。',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.fineme.me/assets/images/fineme-logo.png',
                },
                founder: { '@type': 'Person', '@id': 'https://www.fineme.me/about#deo' },
                brand: [
                  { '@type': 'Brand', name: 'Fineme', description: '男性向けトラック（20〜30代男性）', url: 'https://www.fineme.me' },
                  { '@type': 'Brand', name: 'Fineme Belle', description: '女性向けトラック', url: 'https://www.fineme.me/belle' },
                ],
                sameAs: ['https://twitter.com/deo_fineme'],
              },
              {
                '@type': 'Person',
                '@id': 'https://www.fineme.me/about#deo',
                name: '渡邉英雄（でお）',
                alternateName: 'でお',
                jobTitle: '外見改善アドバイザー / Fineme代表',
                description: '元・非モテから現役モデルへ。外見改善プラットフォームFineme（男性向けFineme・女性向けBelle）代表。外見を起点に自信を再設計する方法を発信している。',
                url: 'https://www.fineme.me/about',
                worksFor: { '@type': 'Organization', '@id': 'https://www.fineme.me/#organization' },
                sameAs: ['https://twitter.com/deo_fineme'],
              },
            ],
          })}}
        />
        <SiteFaqJsonLd />
      </head>
      <body>
        <ConnectionBanner />
        <GoogleAnalytics />
        <PageViewTracker />
        {pixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">{`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
              n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
              s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
              (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${pixelId}');
              fbq('track','PageView');
            `}</Script>
            <noscript>
              <img height="1" width="1" style={{display:'none'}}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
        <Navbar />
        {children}
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
