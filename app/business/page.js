import styles from './business.module.css';

export const metadata = {
  title: 'Fineme 事業説明資料',
  description: 'Fineme の事業内容・サービス概要・協力のお願いをまとめた資料。',
  robots: { index: false, follow: false },
};

export default function BusinessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>

        {/* HERO */}
        <header className={styles.hero}>
          <div className={styles.mark}>Fineme Business Brief</div>
          <h1 className={`${styles.h1} ${styles.serif}`}>Fineme</h1>
          <div className={styles.yomi}>フ ァ イ ン ミ</div>
          <p className={styles.tagline}>そのまま進むのが怖くなった夜に。<br />自信を再設計する、地図と羅針盤。</p>
          <p className={styles.invite}>一人でここまで来た。<br /><em>ここから先は、一緒に創る人</em>が要る。</p>
          <div className={styles.statstrip}>
            <div className={styles.statpill}><b>290本+</b><span>記事資産（男性251＋Belle39）</span></div>
            <div className={styles.statpill}><b>2トラック</b><span>男女それぞれに展開</span></div>
            <div className={styles.statpill}><b>AI×ソロ</b><span>身軽に動ける体制</span></div>
          </div>
        </header>

        <main className={styles.body}>

          {/* 01. 何をしているか */}
          <section className={styles.section}>
            <div className={styles.kicker}>What We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>自信を、外見から立て直す</h2>
            <p className={styles.lead}>恋愛や人間関係でつまずいて自信を失った人が、もう一度自分を肯定して一歩を踏み出すための Web サービス。</p>

            <div className={styles.quote}>Fineme＝<em>Find New Me</em>。<br />「外見を整える」とは、新しい自分を見つけること。</div>

            <div className={styles.iconRow}>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🪞</span>
                <h4>なぜ外見からか</h4>
                <p>内面や環境より先に、今日から自分の手で変えられる。一番早く手応えを得られる入口だから。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🌙</span>
                <h4>誰のためか</h4>
                <p>鏡を見るのが怖い夜、自撮りにゾッとする夜。そんな夜に隣で寄り添う存在でありたい。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🧭</span>
                <h4>二トラック</h4>
                <p>男性向け Fineme・女性向け Fineme Belle。入口は分けて、思想はひとつ。</p>
              </div>
            </div>
            <p className={styles.note}>男女どちらか専用のサービスではなく、二つの入口を持つひとつの事業。</p>
          </section>

          {/* 02. プロダクト */}
          <section className={styles.section}>
            <div className={styles.kicker}>What We Offer</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>4つの入口、ひとつの地図</h2>
            <p className={styles.lead}>「何から始めればいいか分からない」をなくし、変化を続けさせるための設計。</p>

            <div className={styles.productGrid}>
              <div className={styles.productCard}>
                <span className={styles.pic}>🧭</span>
                <h4>Me Scan</h4>
                <p>7軸に答えるだけの無料診断。今やるべき「最初の一手」を一点に絞り込む。</p>
                <span className={`${styles.priceTag} ${styles.free}`}>無料</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>🪞</span>
                <h4>Mirror</h4>
                <p>写真1枚をAIが分析。「変われる余白」を地図で示す。写真は保存しない。</p>
                <span className={styles.priceTag}>¥500〜</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>📓</span>
                <h4>New Me Log</h4>
                <p>通っている美容室・ジムを登録すると、頻度と費用を自動計算。「変わりたい」と認めなくても使える入口。</p>
                <span className={`${styles.priceTag} ${styles.free}`}>無料</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>🗺️</span>
                <h4>New Me Map</h4>
                <p>今週やることを毎月更新。診断から実行への橋渡し役、継続の核。</p>
                <span className={styles.priceTag}>サブスク内</span>
              </div>
            </div>

            <div className={styles.wideCard}>
              <h4>店舗・サービス掲載事業</h4>
              <p>美容室・パーソナルジム・メイクサロンなど「外見を整える店舗」の検索・予約導線もサイト内に持つ。店舗向けの掲載管理SaaSを新たに実装し、今まさに展開を始めている段階。</p>
            </div>

            <div className={styles.callout}>
              <div className={styles.kicker}>今、一番大事にしていること</div>
              <p className={styles.big}>New Me Map の質＝継続率の生命線</p>
              <p>新規獲得より先に、すでに使ってくれている人が「続ける理由」を持てるかを優先している。</p>
            </div>
          </section>

          {/* 03. 現在地 */}
          <section className={styles.section}>
            <div className={styles.kicker}>Where We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>正直な現在地</h2>
            <p className={styles.lead}>プロダクトと販売の仕組みは整った。今は集客と売上をこれから伸ばすフェーズ。</p>

            <div className={styles.statgrid}>
              <div className={styles.stat}><b>290本+</b><span>記事資産（男性251＋Belle39）</span></div>
              <div className={styles.stat}><b>2026.07</b><span>Belle（女性トラック）ローンチ</span></div>
              <div className={styles.stat}><b>1人＋AI</b><span>今の体制</span></div>
            </div>

            <div className={styles.goalRow}>
              <div className={styles.goalCard}><h4>🎯 6ヶ月目標</h4><p>月商50万円。Mirrorの月額サブスクを軸に。</p></div>
              <div className={styles.goalCard}><h4>🏔 3年目標</h4><p>年商10億円。外見・恋愛・自信領域のプラットフォームへ。</p></div>
            </div>
          </section>

          {/* 04. なぜ今声をかけたか */}
          <section className={styles.section}>
            <div className={styles.kicker}>Why You</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>なぜ、今声をかけたか</h2>
            <div className={styles.askBox}>
              <p>一人で作れるところまでは作った。プロダクトも、記事の土台も、集客の仕組みも動き始めている。</p>
              <p>ここから先に要るのは、コードやAIだけでは埋まらない部分——<strong>言葉と絵のセンス、人に会って話す力</strong>。</p>
              <p>一番信頼していて、一番得意なことを持っている人に、まず声をかけたい。</p>
            </div>
          </section>

          {/* 05. お願いしたい業務（ロードマップ） */}
          <section className={styles.section}>
            <div className={styles.kicker}>The Ask</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>一緒にやってほしいこと</h2>
            <p className={styles.lead}>最初から全部じゃなくていい。隙間時間でできることから、少しずつ広げていく。</p>

            <div className={styles.phases}>
              <div className={styles.phase}>
                <div className={styles.phaseLabel}>
                  <div className={styles.step}>Step 0</div>
                  <div className={styles.when}>今すぐ</div>
                </div>
                <div className={styles.phaseCards}>
                  <div className={styles.phaseCard}>
                    <h4>SNS運用・更新（X / Instagram）</h4>
                    <p>Xは現在ノーコードで自動生成しているが「男性向け・モテ」寄りに偏り、サイトの思想とズレてきている。男女どちらにも向く発信へ改善したい。Instagramはほぼ未稼働、少しずつ立ち上げ。</p>
                  </div>
                  <div className={styles.phaseCard}>
                    <h4>掲載者集めのDM送付</h4>
                    <p>美容室・ジムなど掲載候補への打診DM送付。掲載者を増やす、優先度の高い実務。</p>
                  </div>
                  <div className={styles.phaseCard}>
                    <h4>記事のクオリティチェック</h4>
                    <p>執筆自体ではなく、AIが生成した記事の確認・レビュー。</p>
                  </div>
                  <div className={styles.phaseCard}>
                    <h4>デザイン・イラスト（単発）</h4>
                    <p>得意分野なので、必要なタイミングで単発で依頼したい。</p>
                  </div>
                </div>
              </div>

              <div className={styles.phase}>
                <div className={styles.phaseLabel}>
                  <div className={styles.step}>Step 1</div>
                  <div className={styles.when}>慣れてきたら</div>
                </div>
                <div className={styles.phaseCards}>
                  <div className={styles.phaseCard}>
                    <h4>店舗向けSaaSの営業サポート</h4>
                    <p>知り合いのパーソナルトレーナーへのヒアリングから開始。改善点の洗い出し、紹介獲得の実務サポート。</p>
                  </div>
                  <div className={styles.phaseCard}>
                    <h4>ショートドラマの進行管理</h4>
                    <p>制作自体は別チームが担当。スケジュールや進行管理を一部サポート。</p>
                  </div>
                </div>
              </div>

              <div className={styles.phase}>
                <div className={styles.phaseLabel}>
                  <div className={styles.step}>Step 2</div>
                  <div className={styles.when}>ゆくゆくは</div>
                </div>
                <div className={styles.phaseCards}>
                  <div className={styles.phaseCard}>
                    <h4>データ分析と改善提案</h4>
                    <p>Google Search Console・Google Analytics の数値を見ながらの改善提案。</p>
                  </div>
                  <div className={styles.phaseCard}>
                    <h4>事業への関わり方そのもの</h4>
                    <p>ここまで一緒に進めてきた先で、どう関わっていくかも一緒に考えたい。</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 06. 進め方 */}
          <section className={styles.section}>
            <div className={styles.kicker}>How We'll Work</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>進め方について</h2>
            <div className={styles.principleGrid}>
              <div className={styles.principle}><div className={styles.num}>1</div><div className={styles.body}><b>負担のない範囲から</b>隙間時間でできる1〜2個から始める。</div></div>
              <div className={styles.principle}><div className={styles.num}>2</div><div className={styles.body}><b>副業ベース</b>本業やプライベートを圧迫しない前提で。</div></div>
              <div className={styles.principle}><div className={styles.num}>3</div><div className={styles.body}><b>大枠はこちらが作る</b>用意した方向性を、具体の作業に落とし込んでほしい。</div></div>
              <div className={styles.principle}><div className={styles.num}>4</div><div className={styles.body}><b>条件は話しながら決める</b>まずは試しながらすり合わせる。</div></div>
            </div>
          </section>

        </main>

        <div className={styles.closing}>
          <div className={styles.compassBig}>🧭</div>
          <p className={styles.big}>外見が、誰かを萎縮させる理由ではなく、<br />自分を好きになる入口になっている世界へ。</p>
          <p className={styles.sub}>その最初の一滴を、一緒に増やしてほしい。</p>
          <div className={styles.url}>fineme.me/business</div>
        </div>

      </div>
    </div>
  );
}
