'use client';

// 掲載者ダッシュボード 使い方説明書。
// 画面内の初回チュートリアル（lib/dashboard-tutorial.js）とは別に、いつでも読める
// マニュアルとして用意。app/business/line-connect-guide/GuideContent.js と同じ
// window.print()パターン（ブラウザ閲覧＋「PDFを保存」で印刷ダイアログからPDF化）。

const SECTIONS = [
  {
    heading: '① 店舗の中身を作る',
    lead: 'まずはここから。お客様に見せる情報を整えます。',
    items: [
      { tab: 'プロフィール', body: '店舗名・写真・キャッチコピー・こだわり・対応可能なオンライン相談の有無など、公開ページの基本情報を編集します。ここを埋めておくと、他のタブの説明文（LP設定等）が作りやすくなります。' },
      { tab: 'サービス設定', body: '「カット」「カラー」のような施術メニュー（名前・価格・所要時間・写真）を登録します。ここで登録したメニューは、LP設定タブの「サービス設定から選ぶ」で呼び出して使い回せます。' },
      { tab: '回数券', body: 'お客様がまとめ買いできる回数券・パッケージを作成します。価格・回数・有効期限を設定して公開できます。' },
      { tab: 'スタッフ', body: '在籍スタッフのプロフィール（名前・写真・得意分野・自己紹介）を登録します。公開ページ・診断起点LPの両方に表示され、来店前の安心材料になります。' },
      { tab: '体験談', body: 'お客様から届いた体験談を確認・承認します。承認したものだけが公開ページ・LPに掲載されます（本人の許可なく公開されることはありません）。' },
      { tab: 'LP設定', body: 'お客様の診断結果（悩みの軸：体型・眉・服・髪・肌・脱毛・歯・爪など）に合わせて自動で出しわけられる専用ページ用の、メニュー・施術事例を登録します。「見本を見る」から実際のページを確認できます。' },
      { tab: '紹介QR', body: '店頭に置くと、お客様がその場でスマホからFinemeに登録できる紹介QRコードを発行できます。' },
      { tab: '公開設定', body: '店舗ページを公開/非公開に切り替えます。準備が整うまでは非公開のまま、他のタブを埋めていって問題ありません。' },
    ],
  },
  {
    heading: '② 毎日触るタブ（アクション系）',
    lead: '運用が始まったら、日々ここをチェックしてください。',
    items: [
      { tab: '概況', body: 'ページの閲覧数・お気に入り登録数など、店舗の状況をひと目で確認できるダッシュボード的なタブです。' },
      { tab: '予約リクエスト', body: 'お客様から届いた相談・予約のリクエスト一覧です。24時間以内の返信をおすすめします。長時間放置しているとFinemeからLINEでお知らせが届く仕組みがあります（見逃し防止）。' },
      { tab: 'New Me Log', body: 'お客様が記録した来店サイクル（前回来店・次回の目安）を確認できます。再来店のタイミングが近いお客様が一目でわかります。' },
      { tab: 'クチコミ', body: 'お客様から届いたクチコミを確認できます。' },
    ],
  },
  {
    heading: '③ 伸ばすためのタブ（分析・戦略）',
    lead: '慣れてきたら、集客・改善のヒントとして活用してください。',
    items: [
      { tab: 'エリア需要', body: '周辺エリアでどんな悩み・軸の需要が多いかを確認できます。新しいメニューを考える時の参考になります。' },
      { tab: '接客の引き出し', body: 'お客様の悩みのタイプ別に、接客・カウンセリングで使える切り口のヒントをまとめています。' },
      { tab: 'LTV/CAC', body: 'お客様1人あたりの生涯価値(LTV)と獲得コスト(CAC)の目安を確認できます。' },
      { tab: '紹介報酬', body: '他の店舗をFinemeに紹介した際の報酬状況を確認できます。' },
    ],
  },
  {
    heading: '④ アカウント周り',
    lead: '',
    items: [
      { tab: 'LINE連携', body: '店舗の公式LINEを連携すると、お客様への通知がFineme公式ではなく貴店のLINEから届くようになります。設定手順は「連携のやり方を見る」ボタンから詳しいガイド（LINE連携ガイド）をご覧ください。' },
      { tab: '課金・プラン', body: '現在のプラン・お支払い状況を確認・変更できます。' },
    ],
  },
];

export default function ProviderGuideContent() {
  return (
    <main className="section">
      <style>{`
        @media print {
          .navbar, .footer, .no-print { display: none !important; }
          main.section { padding: 0 !important; }
        }
        .pg-item { border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; }
        .pg-item h3 { margin: 0 0 6px; font-size: 15px; }
        .pg-item p { margin: 0; color: var(--color-muted); font-size: 13.5px; line-height: 1.7; }
      `}</style>

      <div className="container stack" style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>掲載者ダッシュボード 使い方説明書</h1>
          <button className="btn" onClick={() => window.print()}>PDFを保存 / 印刷する</button>
        </div>
        <p className="muted">対象：Fineme掲載者様</p>
        <p>
          ダッシュボード（<a href="/provider/dashboard">/provider/dashboard</a>）には18個のタブがあります。
          この説明書では、それぞれのタブで何ができるかをまとめています。画面内でも、各タブを初めて開いた時に
          同じ内容の要点が短く表示されます（一度読むと表示されなくなります。「使い方を見る」ボタンでいつでも
          再表示できます）。
        </p>

        {SECTIONS.map((section, si) => (
          <section key={si} className="stack" style={{ gap: 4, marginTop: 8 }}>
            <h2 style={{ fontSize: 18, margin: '16px 0 4px' }}>{section.heading}</h2>
            {section.lead && <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{section.lead}</p>}
            {section.items.map((item, i) => (
              <div key={i} className="pg-item">
                <h3>{item.tab}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </section>
        ))}

        <section className="stack" style={{ gap: 4, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>お問い合わせ</h2>
          <p>使い方で分からないことがあれば、お気軽にご連絡ください。</p>
          <p>メール：<a href="mailto:contact@fineme.me">contact@fineme.me</a></p>
        </section>
      </div>
    </main>
  );
}
