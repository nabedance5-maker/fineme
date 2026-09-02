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
            <div className={styles.statpill}><b>290本+</b><span>検索流入を生む記事資産</span></div>
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
            <div className={styles.quote}>わかりやすく言うと、<br />美容・フィットネス系の<em>ポータルサイト</em>。</div>
            <p className={styles.lead}>ユーザーはまず無料診断（Me Scan）で自分に必要なケアを知り、そこから合う店舗を検索する。サイト内の記事290本以上が検索エンジンからの入口になっていて、広告費をかけなくても人が流れ込む導線をすでに持っている。</p>
          </section>

          {/* 02. でも本質は */}
          <section className={styles.section}>
            <div className={styles.kicker}>What It Really Is</div>
            <div className={styles.quote}>でも本質は、<br /><em>店舗運営のインフラシステム</em>。</div>
            <p className={styles.lead}>「載せて終わり」の掲載サイトではない。掲載後の実務——プラン管理・問い合わせ対応・紹介の成果管理——までを、掲載者向けのSaaS機能として持っている。ここは最近拡張したばかりの部分。</p>

            <div className={styles.iconRow}>
              <div className={styles.iconCard}>
                <span className={styles.ic}>📋</span>
                <h4>掲載管理</h4>
                <p>プラン変更・写真更新・掲載内容の編集を自分のダッシュボードから完結できる。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>💬</span>
                <h4>問い合わせ対応</h4>
                <p>サイト経由の問い合わせを一元管理。埋もれさせない。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🔗</span>
                <h4>紹介トラッキング</h4>
                <p>紹介した掲載者の成果を自動で記録し、還元計算まで行う。</p>
              </div>
            </div>
          </section>

          {/* 03. 収益モデル */}
          <section className={styles.section}>
            <div className={styles.kicker}>Business Model</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>収益モデル（掲載者側）</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>項目</th><th>内容</th><th>価格</th></tr></thead>
                <tbody>
                  <tr><td>登録料</td><td>初回のみ</td><td><span className={styles.yen}>¥1,100</span></td></tr>
                  <tr><td>掲載プラン</td><td>ライト／スタンダード／プレミアム</td><td><span className={styles.yen}>¥5,000〜10,000</span> / 月</td></tr>
                  <tr><td>紹介報酬</td><td>紹介した有料掲載者の数に応じて</td><td><span className={styles.yen}>¥500</span> / 月 × 紹介数</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 04. 紹介インセンティブ（今回のオファー） */}
          <section className={styles.section}>
            <div className={styles.kicker}>Referral Incentive</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>紹介してくれる人への還元</h2>
            <div className={styles.callout}>
              <div className={styles.kicker}>還元の仕組み</div>
              <p className={styles.big}>紹介した当月：プラン金額の8〜9割バック</p>
              <p>＋ 有料掲載者数 × ¥500 / 毎月（自分の紹介かどうかは関係なく、全体に対して）</p>
            </div>
            <p className={styles.note}>最初は小さくても、掲載者が増えるほど積み上がっていく設計。</p>
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
