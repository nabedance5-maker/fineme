export const metadata = {
  title: {
    default: 'Fineme | そのまま進むのが怖くなった夜に。',
    template: '%s | Fineme',
  },
  description: 'そのまま進むのが怖くなった夜に。自信を再設計する、地図と羅針盤。外見を起点に自信を再設計するプラットフォーム。自分だけの変容ロードマップを手に入れる。',
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
import SmartNavbar from './_components/SmartNavbar';
import Footer from './_components/Footer';
import ServiceWorkerRegister from './_components/ServiceWorkerRegister';
import GoogleAnalytics from './_components/GoogleAnalytics';
import Script from 'next/script';

export default function RootLayout({ children }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
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
                url: 'https://www.fineme.me',
                description: '外見を起点に自信を再設計するためのプラットフォーム。男性向けFinemeと女性向けBelleで構成される。',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.fineme.me/assets/images/fineme-logo.png',
                },
                founder: { '@type': 'Person', '@id': 'https://www.fineme.me/about#deo' },
              },
              {
                '@type': 'Person',
                '@id': 'https://www.fineme.me/about#deo',
                name: '渡邉英雄（でお）',
                alternateName: 'でお',
                jobTitle: '外見改善アドバイザー / Fineme代表',
                description: '元・非モテから現役モデルへ。男性向け外見改善プラットフォームFineme代表。外見を起点に自信を再設計する方法を発信している。',
                url: 'https://www.fineme.me/about',
                worksFor: { '@type': 'Organization', '@id': 'https://www.fineme.me/#organization' },
                sameAs: ['https://twitter.com/deo_fineme'],
              },
            ],
          })}}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'Finemeとは何ですか？', acceptedAnswer: { '@type': 'Answer', text: 'Finemeは外見を起点に自信を再設計するプラットフォームです。男性向けのFinemeと女性向けのBelleの2トラックで構成され、診断・AI分析・ガイドマッチングを提供しています。' } },
              { '@type': 'Question', name: 'Fineme Belleとは何ですか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Belleは女性向けの外見診断・変容ロードマップサービスです。眉・ヘア・ファッション・スキンなど8軸のMe Scanから、あなただけのBelleコンパス（最初の一手）を生成します。/belleからアクセスできます。' } },
              { '@type': 'Question', name: 'Me Scanとは何ですか？料金はかかりますか？', acceptedAnswer: { '@type': 'Answer', text: 'Me Scanは無料の7軸外見診断です。眉毛・髪・体型・服・肌・歯・爪の7軸を問診形式でスキャンし、あなたの「最優先の一手（Finemeコンパス）」を特定します。所要時間は12〜18分で、無料でご利用いただけます。' } },
              { '@type': 'Question', name: 'Fineme Mirrorとは何ですか？どんな分析ができますか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Mirrorは写真1枚でAIが外見を7軸で分析するサービスです。表情・雰囲気・清潔感・服装などの改善点を具体的にフィードバックします。写真は分析後に保存されません。' } },
              { '@type': 'Question', name: 'AIで外見を分析するにはどうすればいいですか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Mirrorをご利用ください。写真を1枚アップロードするだけで、AIが外見を7軸（眉毛・髪・体型・服・肌・歯・爪）で分析し、改善点を具体的に提案します。' } },
              { '@type': 'Question', name: 'Fineme Mirrorの料金は？', acceptedAnswer: { '@type': 'Answer', text: '¥500（単発）または¥780/月（月額）でご利用いただけます。' } },
              { '@type': 'Question', name: '外見を改善するには何から始めればいいですか？', acceptedAnswer: { '@type': 'Answer', text: 'まずはMe Scan（無料診断）で自分の「コンパス（最優先の一手）」を把握することをおすすめします。一般的には眉毛の整えが最もコストパフォーマンスが高く、最初の一手に最適です。' } },
              { '@type': 'Question', name: '外見改善の正しい順番はありますか？', acceptedAnswer: { '@type': 'Answer', text: 'Finemeでは7軸をTier分類しています。Tier1（即効性高）：眉毛・髪・体型・服 → Tier2：肌 → Tier3：歯・口元 → Tier4：爪。眉毛がコスト・時間・効果のコスパで最優先です。' } },
              { '@type': 'Question', name: '清潔感を出すにはどうすればいいですか？', acceptedAnswer: { '@type': 'Answer', text: '清潔感の土台は眉毛・髪・肌の3つです。特に眉毛は最も即効性が高く、1〜2回のサロン施術で劇的に印象が変わります。次に髪型を整え、肌のスキンケアを日課にすることをおすすめします。' } },
              { '@type': 'Question', name: '垢抜けるとはどういうことですか？', acceptedAnswer: { '@type': 'Answer', text: '垢抜けとは「清潔感のある外見 + 自分の体型・顔に合ったスタイルの確立」です。特定のトレンドを追うのではなく、自分に似合う形・色を把握することが重要です。' } },
              { '@type': 'Question', name: '外見改善にかかる費用はどのくらいですか？', acceptedAnswer: { '@type': 'Answer', text: '眉サロン（初回¥3,000〜）から始めれば最低限の費用で大きな変化が得られます。全体的には月¥10,000〜¥30,000程度の継続投資でかなりの変化が期待できます。' } },
              { '@type': 'Question', name: '外見改善で最も効果が高いのは何ですか？', acceptedAnswer: { '@type': 'Answer', text: '眉毛の整えが最も高いコストパフォーマンスを発揮します。1〜2回のサロン施術で顔の印象が大きく変わり、効果が長続きするためです。次に髪型、体型の順です。' } },
              { '@type': 'Question', name: '眉毛を整えるにはどうすればいいですか？', acceptedAnswer: { '@type': 'Answer', text: '初回は眉サロンに行くことを強くおすすめします。自己流では左右差や形の失敗リスクが高いためです。サロンで形を作ってもらった後、自宅でのメンテナンスに移行するのが最短で綺麗な眉を手に入れる方法です。' } },
              { '@type': 'Question', name: '髪型はどう選べばいいですか？', acceptedAnswer: { '@type': 'Answer', text: '顔型（丸・面長・卵型など）と輪郭に合わせた髪型を選ぶことが基本です。美容師に「顔型に合わせてください」と伝えるだけで大きく変わります。月1回のカットを習慣化することも重要です。' } },
              { '@type': 'Question', name: 'ファッションで最初に抑えるべきことは？', acceptedAnswer: { '@type': 'Answer', text: 'まずシルエット（サイズ感）です。どんなブランドでも、体に合ったサイズ感で着るだけで清潔感が上がります。次にベーシックなカラー（白・グレー・紺・黒）の服を揃えることをおすすめします。' } },
              { '@type': 'Question', name: '肌荒れを改善するには何から始めればいいですか？', acceptedAnswer: { '@type': 'Answer', text: '洗顔・保湿・日焼け止めの3ステップを毎日続けることが基本です。洗顔のしすぎは乾燥を招くため、朝は水洗いだけでもOKです。改善しない場合は皮膚科の受診をおすすめします。' } },
              { '@type': 'Question', name: 'マッチングアプリでマッチしない原因は何ですか？', acceptedAnswer: { '@type': 'Answer', text: '最大の原因はプロフィール写真です。特に「清潔感が伝わるか」「表情が親しみやすいか」「背景が散らかっていないか」の3点が重要です。' } },
              { '@type': 'Question', name: 'マッチングアプリの写真を改善する方法は？', acceptedAnswer: { '@type': 'Answer', text: '自然光の下で、清潔感のある服装で、笑顔の写真を撮ることが基本です。Fineme Mirrorを使えばAIが写真の改善点を具体的にフィードバックします。' } },
              { '@type': 'Question', name: 'ジムに行く前にやるべきことは？', acceptedAnswer: { '@type': 'Answer', text: '眉毛・髪・服の整え（Tier1）を先に行うことをおすすめします。体型改善は効果が出るまで数ヶ月かかりますが、眉毛や髪型は数週間で大きく変わります。投資対効果の高い順に取り組むことが合理的です。' } },
              { '@type': 'Question', name: '外見と自己肯定感の関係は？', acceptedAnswer: { '@type': 'Answer', text: '外見改善は自己肯定感を高める有効な手段の一つです。鏡を見るたびに「なんか違う」という感覚が消えることで、行動の自信につながります。見た目を変えることは「自分が変われる」という体験を積むことでもあります。' } },
              { '@type': 'Question', name: '外見改善で恋愛は変わりますか？', acceptedAnswer: { '@type': 'Answer', text: 'はい、大きく変わります。特にマッチングアプリでは写真の印象が全てと言っても過言ではありません。外見改善によって「自分から動ける自信」が生まれることも恋愛への大きな影響です。' } },
            ],
          })}}
        />
      </head>
      <body>
        <GoogleAnalytics />
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
        <SmartNavbar />
        {children}
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
