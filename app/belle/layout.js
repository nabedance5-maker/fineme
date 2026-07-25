import BelleTrackBadge from './_components/BelleTrackBadge';

export const metadata = {
  title: {
    default: 'Fineme Belle | 外見を起点に、自信を再設計する。',
    template: '%s | Fineme Belle',
  },
  description: '外見を起点に自信を再設計する、女性のためのプラットフォーム。Me Scan診断・Mirror写真AI分析で、あなただけの変容ロードマップを。',
  metadataBase: new URL('https://www.fineme.me'),
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'Fineme Belle',
    title: 'Fineme Belle | 外見を起点に、自信を再設計する。',
    description: '外見を起点に自信を再設計する、女性のためのプラットフォーム。',
  },
};

export default function BelleLayout({ children }) {
  return (
    <>
      <BelleTrackBadge />
      {children}
    </>
  );
}
