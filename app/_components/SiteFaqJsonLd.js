'use client';
import { usePathname } from 'next/navigation';

// サイト全体のFAQ（お客様向け：Me Scan・Mirror・外見改善）の構造化データ。
// 店舗向け・営業パートナー向けのページは自前のFAQPageを持つので出さない
// （1ページにFAQPageが2つ並ぶと、検索エンジン・AIにどちらが本題か伝わらない・2026-11-02）。
const BUSINESS_PREFIXES = ['/provider', '/shop-guide', '/sales-partner', '/join', '/partner', '/business'];

export default function SiteFaqJsonLd() {
  const pathname = usePathname() || '';
  if (BUSINESS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Finemeとは何ですか？', acceptedAnswer: { '@type': 'Answer', text: 'Finemeは外見を起点に自信を再設計するプラットフォームです。男性向けのFinemeと女性向けのBelleの2トラックで構成され、診断・AI分析・ガイドマッチングを提供しています。' } },
          { '@type': 'Question', name: 'Fineme Belleとは何ですか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Belleは女性向けの外見診断・変容ロードマップサービスです。眉・ヘア・ファッション・スキンなど8軸のMe Scanから、あなただけのBelleコンパス（最初の一手）を生成します。/belleからアクセスできます。' } },
          { '@type': 'Question', name: 'Me Scanとは何ですか？料金はかかりますか？', acceptedAnswer: { '@type': 'Answer', text: 'Me Scanは無料の8軸外見診断です。体型・眉毛・服・髪・肌・脱毛・歯・爪の8軸を問診形式でスキャンし、あなたの「最優先の一手（Fineme Compass）」と136タイプの中のあなたを特定します。コア約3分で完了し、そのあとは1軸ずつ描き込んで地図を育てられます。無料でご利用いただけます。' } },
          { '@type': 'Question', name: 'Fineme Mirrorとは何ですか？どんな分析ができますか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Mirrorは写真1枚でAIが外見を最大7軸で分析するサービスです。眉・目元／肌・清潔感／ヘアスタイル／表情・雰囲気／姿勢／体型・シルエット／服装・フィット感の観点で改善点を具体的にフィードバックします（分析する軸は顔写真か全身写真かで変わります）。写真はサーバーに保存されず、残るのは分析結果のテキストのみです。' } },
          { '@type': 'Question', name: 'AIで外見を分析するにはどうすればいいですか？', acceptedAnswer: { '@type': 'Answer', text: 'Fineme Mirrorをご利用ください。写真を1枚アップロードするだけで、AIが外見を最大7軸（眉・目元／肌／ヘア／表情／姿勢／体型／服装）で分析し、改善点を具体的に提案します。' } },
          { '@type': 'Question', name: 'Fineme Mirrorの料金は？', acceptedAnswer: { '@type': 'Answer', text: '¥500（単発）または¥780/月（月額）でご利用いただけます。' } },
          { '@type': 'Question', name: '外見を改善するには何から始めればいいですか？', acceptedAnswer: { '@type': 'Answer', text: 'まずはMe Scan（無料診断）で自分の「コンパス（最優先の一手）」を把握することをおすすめします。一般的には眉毛の整えが最もコストパフォーマンスが高く、最初の一手に最適です。' } },
          { '@type': 'Question', name: '外見改善の正しい順番はありますか？', acceptedAnswer: { '@type': 'Answer', text: 'Finemeでは8軸をTier分類しています。Tier1（即効性高）：体型・眉毛・服・髪 → Tier2：肌・脱毛 → Tier3：歯・口元 → Tier4：爪。眉毛がコスト・時間・効果のコスパで最優先です。' } },
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
  );
}
