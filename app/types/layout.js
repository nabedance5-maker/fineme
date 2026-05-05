export const metadata = {
  title: '全136タイプ一覧 — New Me Type Map | Fineme',
  description: 'Finemeの外見変容診断が出力する全136タイプを一覧表示。体型・眉・ヘア・肌・脱毛・服・歯・爪の8軸ごとにタイプコードの意味を解説。自分のタイプを他のタイプと比較して、変容の旅の地図を俯瞰できます。',
  alternates: { canonical: 'https://www.fineme.me/types' },
  openGraph: {
    title: '全136タイプ一覧 — New Me Type Map | Fineme',
    description: '自分のタイプは136通りのどこにいるのか。MBTIのように、自分を客観視できる外見変容タイプ一覧。',
    url: 'https://www.fineme.me/types',
    images: [{ url: 'https://www.fineme.me/assets/images/og-image.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
    siteName: 'Fineme',
  },
  twitter: {
    card: 'summary_large_image',
    title: '全136タイプ一覧 — New Me Type Map | Fineme',
    description: '自分のタイプは136通りのどこにいるのか。MBTIのように、自分を客観視できる外見変容タイプ一覧。',
    images: ['https://www.fineme.me/assets/images/og-image.png'],
  },
};

export default function TypesLayout({ children }) {
  return children;
}
