import styles from './business.module.css';

export const metadata = {
  title: 'Fineme 事業説明資料',
  description: 'Fineme の事業内容・サービス概要・協力のお願いをまとめた資料。',
  robots: { index: false, follow: false },
};

export default function BusinessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <div className={styles.inner}>

          {/* HERO */}
          <div className={styles.hero}>
            <div className={styles.mark}>Fineme Business Brief</div>
            <h1 className={`${styles.h1} ${styles.serif}`}>Fineme</h1>
            <div className={styles.yomi}>フ ァ イ ン ミ</div>
            <p className={styles.tagline}>そのまま進むのが怖くなった夜に。<br />自信を再設計する、地図と羅針盤。</p>
            <div className={styles.doctype}>事業説明資料 ／ 協力のお願い</div>
          </div>

          {/* 01. 事業の全体像 */}
          <section className={styles.section}>
            <div className={styles.kicker}>What We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}><span className={styles.no}>01</span>事業の全体像</h2>

            <p className={styles.lead}>Fineme は「外見を起点に、自信を再設計するための<strong>地図と羅針盤</strong>」を提供する Web サービス。恋愛や人間関係でつまずいて自信を失った人が、外見という<strong>自分でコントロールできる最初の一歩</strong>から、もう一度自分を肯定できるようにするプラットフォーム。</p>

            <div className={styles.quote}>Fineme ＝ <em>Find New Me</em>。<br />「外見を整える」とは、新しい自分を見つけること。</div>

            <h3 className={`${styles.h3} ${styles.serif}`}>なぜ外見からなのか</h3>
            <p>内面や環境を変えるのは時間がかかるし、他人や過去は自分の意志だけではどうにもならない。でも外見は、今日から自分の手で変えられる数少ないもの。「変わった」という手応えを一番早く得られる入口だから、Fineme はここを起点にしている。</p>

            <h3 className={`${styles.h3} ${styles.serif}`}>誰に向けたサービスか</h3>
            <p>ターゲットは「今日、恋愛や人間関係でつまずいて自信を失っている人」。変わりたい気持ちはあるが、何から始めればいいか分からない人。鏡を見るのが怖い夜、自撮りにゾッとする夜——そういう<strong>夜に隣で寄り添う存在</strong>でありたい、というのがコンセプト。</p>

            <div className={styles.grid2}>
              <div className={styles.card}><h4><span className={styles.ic}>♂</span>Fineme（男性トラック）</h4><p>20〜30代男性向け。診断・Mirror・マイページなど中核機能を提供。</p></div>
              <div className={styles.card}><h4><span className={styles.ic}>♀</span>Fineme Belle（女性トラック）</h4><p>女性向け。同じ思想・機能を、タイプ名やビジュアルは女性向けに再設計して提供。</p></div>
            </div>
            <p className={styles.note}>※ 入口（ブランド名・見た目）は分けているが、根っこの思想と機能は共通。男女どちらか専用のサービスではなく、二つの入口を持つ一つの事業。</p>
          </section>

          {/* 02. サービス・プロダクト構成 */}
          <section className={styles.section}>
            <div className={styles.kicker}>What We Offer</div>
            <h2 className={`${styles.h2} ${styles.serif}`}><span className={styles.no}>02</span>サービス・プロダクト構成</h2>
            <p className={styles.lead}>「何から始めればいいか分からない」を解消し、変化を継続させるための3ステップ設計。</p>

            <table className={styles.table}>
              <thead><tr><th>プロダクト</th><th>内容</th><th>役割</th><th>価格</th></tr></thead>
              <tbody>
                <tr><td><strong>①Me Scan</strong></td><td>7軸の問診に答えるだけの無料診断</td><td>今やるべき「最初の一手」を一点に絞り込む</td><td>無料</td></tr>
                <tr><td><strong>②Mirror</strong></td><td>写真1枚をAIが分析（眉・肌・ヘア・表情・姿勢・体型・服装）。写真は保存しない</td><td>「変われる余白」を可視化し、変化への距離を地図で示す</td><td><span className={styles.yen}>¥500</span>単発／<span className={styles.yen}>¥780</span>月額</td></tr>
                <tr><td><strong>③New Me Map</strong></td><td>診断結果をもとに、今週やることを具体化。7軸の現在地を毎月更新</td><td>診断から実行への橋渡し。継続の核</td><td>サブスクに内包</td></tr>
              </tbody>
            </table>

            <h3 className={`${styles.h3} ${styles.serif}`}>店舗・サービス掲載事業</h3>
            <p>個人向けの診断・分析に加えて、美容室・パーソナルジム・メイクサロンなど「外見を整える店舗・サービス」の<strong>検索・予約導線</strong>もサイト内に持っている。ユーザーは診断結果から実際の店舗にたどり着ける。店舗側には掲載管理用の<strong>SaaS機能</strong>（プラン管理・問い合わせ対応など）を新たに実装し、今まさに展開を始めている段階。</p>

            <div className={styles.callout}>
              <div className={styles.kicker}>今、一番大事にしていること</div>
              <p className={styles.big}>New Me Map の質＝サブスク継続率の生命線</p>
              <p>新規獲得より先に、すでに使ってくれている人が「続ける理由」を持てるかを優先している。穴の空いたバケツに水を注がない、という考え方。</p>
            </div>
          </section>

          {/* 03. 現在地 */}
          <section className={styles.section}>
            <div className={styles.kicker}>Where We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}><span className={styles.no}>03</span>現在地・目指す先</h2>
            <p>正直なところ、まだ立ち上げ期。プロダクトと販売の仕組みは整ったが、集客・売上はこれから本格的に伸ばしていくフェーズ。</p>

            <div className={styles.statgrid}>
              <div className={styles.stat}><b>251本+</b><span>Fineme特集記事（男性向けSEO資産）</span></div>
              <div className={styles.stat}><b>39本</b><span>Belle Journal記事（女性向けSEO資産）</span></div>
              <div className={styles.stat}><b>2026.07</b><span>Belle（女性トラック）ローンチ月</span></div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.card}><h4>🎯 6ヶ月目標</h4><p>月商50万円。Mirrorの月額サブスクを軸に、継続課金の土台をつくる。</p></div>
              <div className={styles.card}><h4>🏔 3年目標</h4><p>年商10億円。個人の外見改善の入口から、外見・恋愛・自信領域のプラットフォームへ育てる。</p></div>
            </div>

            <h3 className={`${styles.h3} ${styles.serif}`}>体制</h3>
            <p>でお一人のソロ起業に、AIエージェント組織を組み合わせて運営。コードの実装・記事生成・SNS運用の下書きなど、多くの実務をAIが自走し、意思決定と承認をでおが担う体制で進めている。</p>
          </section>

          {/* 04. お願いしたい業務 */}
          <section className={styles.section}>
            <div className={styles.kicker}>The Ask</div>
            <h2 className={`${styles.h2} ${styles.serif}`}><span className={styles.no}>04</span>お願いしたい業務（想定）</h2>
            <p className={styles.note}>最初から全部ではなく、まず隙間時間でできる範囲から。慣れてきたら一緒に広げていくイメージ。</p>

            <div className={styles.tasklist}>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagPri}`}>最優先</span>
                <div className={styles.taskTxt}>
                  <h4>SNS運用・更新（X / Instagram）</h4>
                  <p>Xは現在ノーコードツールで自動生成しているが、内容が「男性向け・モテ」寄りに偏り、サイトの思想（男女両方に向けた自信の再設計）とズレてきている。男女どちらにも向く、Finemeらしい発信に改善したい（アカウントを分けるか出し分けるかは検討中）。Instagramはほぼ未稼働なので、少しずつ立ち上げていきたい。</p>
                </div>
              </div>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagPri}`}>優先</span>
                <div className={styles.taskTxt}>
                  <h4>記事の精査・クオリティチェック</h4>
                  <p>執筆自体ではなく、AIが生成・更新した記事の確認とクオリティチェック。おかしな内容や表現になっていないかの目視レビュー。</p>
                </div>
              </div>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagPri}`}>優先</span>
                <div className={styles.taskTxt}>
                  <h4>店舗向けSaaSの営業サポート</h4>
                  <p>新しく実装した店舗向け掲載機能の展開に向け、知り合いのパーソナルトレーナーへのヒアリングから開始。改善点の洗い出し、紹介の獲得、掲載候補へのDM送付などの実務サポート。</p>
                </div>
              </div>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagSub}`}>サブ</span>
                <div className={styles.taskTxt}>
                  <h4>ショートドラマの進行管理</h4>
                  <p>制作自体は別チームが担当。スケジュールや進行の管理を一部手伝ってもらう可能性あり。</p>
                </div>
              </div>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagSub}`}>単発</span>
                <div className={styles.taskTxt}>
                  <h4>デザイン・イラスト制作</h4>
                  <p>得意分野なので、必要なタイミングで単発で依頼したい。</p>
                </div>
              </div>
              <div className={styles.task}>
                <span className={`${styles.tag} ${styles.tagSub}`}>将来</span>
                <div className={styles.taskTxt}>
                  <h4>データ分析と改善提案</h4>
                  <p>Google Search Console・Google Analytics の数値を見ながら、サイトの改善提案をしてもらえると嬉しい。</p>
                </div>
              </div>
            </div>
          </section>

          {/* 05. 進め方 */}
          <section className={styles.section}>
            <div className={styles.kicker}>How We'll Work</div>
            <h2 className={`${styles.h2} ${styles.serif}`}><span className={styles.no}>05</span>進め方について</h2>
            <div className={styles.principle}><div className={styles.num}>1</div><div className={styles.body}><b>まず負担のない範囲から。</b>いきなり全業務ではなく、隙間時間でできる1〜2個から始める。</div></div>
            <div className={styles.principle}><div className={styles.num}>2</div><div className={styles.body}><b>副業ベース。</b>本業やプライベートを圧迫しない前提で、ペースは相談しながら決める。</div></div>
            <div className={styles.principle}><div className={styles.num}>3</div><div className={styles.body}><b>大枠はこちらが作る。</b>AIも活用して方向性や下書きは用意するので、そこから具体の作業に落とし込む形で手伝ってほしい。</div></div>
            <div className={styles.principle}><div className={styles.num}>4</div><div className={styles.body}><b>報酬・条件は話しながら決める。</b>まずは試しながら、お互いに無理のない形をすり合わせたい。</div></div>
          </section>

          <div className={styles.foot}>
            <span>Fineme ／ 事業説明資料</span>
            <span className={styles.note}>fineme.me/business</span>
            <span className={styles.compass}>🧭</span>
          </div>

        </div>
      </div>
    </div>
  );
}
