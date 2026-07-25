export const metadata = {
  title: '外見磨きのプロを探す | Fineme',
  description: '体型・眉・ヘア・肌・服・脱毛・歯・爪。8軸の外見診断をもとに、あなたにぴったりの専門家を検索・比較できます。恋愛に悩む男性の外見変容をサポートするプロが集まるポータル。',
  alternates: { canonical: 'https://www.fineme.me/search' },
  openGraph: {
    title: '外見磨きのプロを探す | Fineme',
    description: '8軸の外見診断をもとに、あなたにぴったりの専門家を探せます。',
    url: 'https://www.fineme.me/search',
    images: [{ url: 'https://www.fineme.me/assets/images/og-image.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
    siteName: 'Fineme',
  },
  twitter: {
    card: 'summary_large_image',
    title: '外見磨きのプロを探す | Fineme',
    description: '8軸の外見診断をもとに、あなたにぴったりの専門家を探せます。',
    images: ['https://www.fineme.me/assets/images/og-image.png'],
  },
};

export default function SearchLayout({ children }) {
  return children;
}
