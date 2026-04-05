export const metadata = {
  title: 'Me Scan — 外見変容診断 | Fineme',
  description: '恋愛に悩む男性が、自分の外見の課題と変容ルートを発見するための診断。体型・眉・ヘア・肌・服・歯・爪の7軸を分析し、あなただけの変容ロードマップを生成します。',
  alternates: { canonical: 'https://www.fineme.me/diagnosis' },
  openGraph: {
    title: 'Me Scan — 外見変容診断 | Fineme',
    description: '7軸の外見診断で、あなただけの変容ロードマップを生成します。無料・3分で完了。',
    url: 'https://www.fineme.me/diagnosis',
    images: [{ url: 'https://www.fineme.me/assets/images/og-image.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
    siteName: 'Fineme',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Me Scan — 外見変容診断 | Fineme',
    description: '7軸の外見診断で、あなただけの変容ロードマップを生成します。無料・3分で完了。',
    images: ['https://www.fineme.me/assets/images/og-image.png'],
  },
};

export default function DiagnosisLayout({ children }) {
  return children;
}
