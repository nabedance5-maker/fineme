import styles from '../business.module.css';

export const metadata = {
  title: 'Fineme 掲載者向けご案内',
  description: 'Fineme に店舗として掲載する意義・仕組み・収益モデルをまとめた資料。',
  robots: { index: false, follow: false },
};

export default function ProvidersBriefPage() {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>

        {/* HERO */}
        <header className={styles.hero}>
          <div className={styles.mark}>Fineme for Providers</div>
          <h1 className={`${styles.h1} ${styles.serif}`}>Fineme</h1>
          <div className={styles.yomi}>フ ァ イ ン ミ</div>
          <p className={styles.tagline}>そのまま進むのが怖くなった夜に。<br />自信を再設計する、地図と羅針盤。</p>
          <p className={styles.invite}>店舗の力を、<em>事業を続ける力</em>に。</p>
          <div className={styles.statstrip}>
            <div className={styles.statpill}><b>12機能</b><span>集客〜カルテ分析まで</span></div>
            <div className={styles.statpill}><b>8軸診断</b><span>ユーザーの悩みを構造化</span></div>
            <div className={styles.statpill}><b>SaaS</b><span>掲載後を回す管理基盤</span></div>
          </div>
        </header>

        <main className={styles.body}>

          {/* 01. どんな事業か */}
          <section className={styles.section}>
            <div className={styles.kicker}>What Fineme Is</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>Finemeってどんな事業？</h2>
            <p className={styles.lead}>外見を起点に自信を取り戻したい人と、美容室・パーソナルジム・サロンなど「外見を整える店舗」をつなぐサービス。</p>
            <div className={styles.quote}>平たく言うと、<br /><em>一般ユーザーと店舗運営者をつなぐ</em>ポータルサイト。</div>
            <p className={styles.lead}>サイト内の記事290本以上が検索エンジンからの入口になっていて、広告費をかけなくても人が流れ込む導線をすでに持っている。</p>
          </section>

          {/* 02. ユーザー向け */}
          <section className={styles.section}>
            <div className={styles.kicker}>For Users</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>ユーザーには何を提供しているか</h2>
            <p className={styles.lead}>外見を整えるために何をしたらいいか、一人ひとりに合わせてAIが考えてくれる。8軸の無料診断から「最初の一手」を絞り込み、毎月の変化を地図として可視化しながら、合う店舗まで案内する。</p>
          </section>

          {/* 03. でも本質は */}
          <section className={styles.section}>
            <div className={styles.kicker}>For Providers</div>
            <div className={styles.quote}>でも本質は、<br /><em>店舗運営のインフラシステム</em>。</div>
            <p className={styles.lead}>「載せて終わり」の掲載サイトではない。集客から、来店後のリピート化・顧客理解まで、店舗運営そのものを支える機能を持っている。ここは最近拡張したばかりの部分。</p>

            <div className={styles.featureGroups}>
              <div className={styles.featureGroup}>
                <h4><span className={styles.gic}>🔍</span>集客・予約</h4>
                <ul>
                  <li><b>集客</b>診断・検索からのマッチングで、サイトの流入をそのまま店舗へ</li>
                  <li><b>予約受付窓口</b>サイト経由の予約リクエストを一元管理</li>
                </ul>
              </div>
              <div className={styles.featureGroup}>
                <h4><span className={styles.gic}>🔁</span>リピート化</h4>
                <ul>
                  <li><b>再来店促進の自動通知</b>次回目安のタイミングで自動でお知らせ</li>
                  <li><b>自店LINEからの通知配信</b>お客様には貴店の公式LINEとして届く</li>
                  <li><b>QR経由の来店記録連携</b>QRを置くだけで来店記録が自動で紐づく</li>
                </ul>
              </div>
              <div className={styles.featureGroup}>
                <h4><span className={styles.gic}>🕵️</span>掘り起こし・信頼構築</h4>
                <ul>
                  <li><b>休眠顧客の掘り起こし</b>最終来店からの経過日数でフィルタ・ソートし、個別に声かけメッセージを送れる</li>
                  <li><b>クチコミ依頼の自動送信</b></li>
                  <li><b>誕生日メッセージの自動送信</b></li>
                  <li><b>ノーショー対策</b>来店前の確認で無断キャンセルを減らす</li>
                </ul>
              </div>
              <div className={styles.featureGroup}>
                <h4><span className={styles.gic}>📔</span>顧客理解</h4>
                <ul>
                  <li><b>店舗側カスタムカルテ</b>自店に合った項目でお客様ごとに管理できる</li>
                  <li><b>カルテAI分析</b>蓄積したカルテからAIが傾向・次回提案を分析。過去を遡って読み返す手間を省き、最適な提案でお客様に寄り添える</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 04. 収益モデル */}
          <section className={styles.section}>
            <div className={styles.kicker}>Business Model</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>収益モデル（掲載者側）</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>項目</th><th>内容</th><th>価格</th></tr></thead>
                <tbody>
                  <tr><td>登録料</td><td>初回のみ</td><td><span className={styles.yen}>¥1,100</span></td></tr>
                  <tr><td>掲載プラン</td><td>ライト／スタンダード／プレミアム</td><td><span className={styles.yen}>¥5,000〜10,000</span> / 月</td></tr>
                  <tr><td>紹介報酬（初月）</td><td>紹介した掲載店舗の初回課金額の</td><td><span className={styles.yen}>90%</span></td></tr>
                  <tr><td>紹介報酬（継続）</td><td>その店舗が掲載を続ける限り</td><td><span className={styles.yen}>¥500</span> / 月</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 05. 紹介インセンティブ（今回のオファー） */}
          <section className={styles.section}>
            <div className={styles.kicker}>Referral Incentive</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>紹介してくれる人への還元</h2>
            <div className={styles.callout}>
              <div className={styles.kicker}>還元の仕組み</div>
              <p className={styles.big}>紹介した初月：その店舗の初回課金額の90%バック</p>
              <p>＋ その店舗が掲載を続ける限り、毎月¥500</p>
            </div>
            <p className={styles.note}>最初は小さくても、紹介が積み重なるほど積み上がっていく設計。</p>
          </section>

        </main>

        <div className={styles.closing}>
          <div className={styles.compassBig}>🧭</div>
          <p className={styles.big}>店舗の「載せて終わり」を、<br />続けられる仕組みに変えていく。</p>
          <p className={styles.sub}>まずは使ってみた感想を、聞かせてほしい。</p>
          <div className={styles.url}>fineme.me/business/providers</div>
        </div>

      </div>
    </div>
  );
}
