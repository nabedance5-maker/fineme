import styles from './business.module.css';

export const metadata = {
  title: 'Fineme 事業説明資料',
  description: 'Fineme の事業内容・思想・プロダクト・戦略・体制をまとめた総合資料。',
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

        {/* JUMP NAV */}
        <nav className={styles.toc}>
          <a className={styles.tocLink} href="#philosophy">思想</a>
          <a className={styles.tocLink} href="#why">なぜやるか</a>
          <a className={styles.tocLink} href="#who">誰のためか</a>
          <a className={styles.tocLink} href="#product">プロダクト</a>
          <a className={styles.tocLink} href="#model">収益モデル</a>
          <a className={styles.tocLink} href="#now">現在地</a>
          <a className={styles.tocLink} href="#goals">目標・戦略</a>
          <a className={styles.tocLink} href="#acquisition">集客</a>
          <a className={styles.tocLink} href="#org">運営体制</a>
          <a className={styles.tocLink} href="#principles">判断の軸</a>
          <a className={styles.tocLink} href="#ask">お願いしたいこと</a>
        </nav>

        <main className={styles.body}>

          {/* 01. 思想 */}
          <section className={styles.section} id="philosophy">
            <div className={styles.kicker}>Philosophy</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>この事業の本質</h2>
            <p className={styles.lead}>Fineme は外見ビジネスではない。自信を失った人が、もう一度自分を肯定して一歩を踏み出すための道具。</p>

            <div className={styles.quote}>Fineme＝<em>Find New Me</em>。<br />「外見を整える」とは、新しい自分を見つけること。</div>

            <div className={styles.askBox}>
              <p>出発点にあるのは<strong>健全な自己愛</strong>。外見はつい「他者から見た自分」を意識させるが、目的地はそこではなく、自分と人間への健全な愛にある。</p>
              <p>一人ひとりの小さな変化（＝最初の一滴）を増やし、その総和で世界を少しだけ優しくする——という思想が中核。売上や継続率は、その水路を太くするための手段にすぎない。</p>
            </div>

            <div className={styles.subhead}>愛の循環</div>
            <div className={styles.flow}>
              <div className={styles.flowStep}><b>外見を整える</b><span>Find New Me</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>自信</b><span>自己肯定</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>心の余裕</b><span>ゆとり</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>人に優しく</b><span>思いやり</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>愛の循環</b><span>周囲へ波及</span></div>
            </div>
            <p className={styles.note}>最終的に向かう先は、売上ではなく「優しさがどれだけ周りへ広がったか」。これが北極星。</p>
          </section>

          {/* 02. 4つのなぜ */}
          <section className={styles.section} id="why">
            <div className={styles.kicker}>Why Fineme</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>4つの「なぜ」</h2>
            <p className={styles.lead}>この事業の正当性は、4つの問いに明確に答えられることにある。</p>

            <div className={styles.iconRow4}>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🎯</span>
                <h4>なぜやるのか</h4>
                <p>自分の見た目を正しく整えられれば、自信と余裕を持つ人が増え、その影響は必ず周囲と社会に広がる。Finemeはその最初の一滴。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🪞</span>
                <h4>なぜ外見からか</h4>
                <p>外見は、他人でも過去でもなく自分でコントロールできる最初の一歩。内面や環境より先に、目に見えて変わり、手応えがある。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>⏳</span>
                <h4>なぜ今なのか</h4>
                <p>恋愛も自己表現も可視化され、写真・第一印象が常に比較される時代。なのに整え方を体系的に学べる場がなく、迷う人が溢れている。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🧭</span>
                <h4>なぜ自分なのか</h4>
                <p>この課題に本気で取り組めるのは、変われなかった時間の影を知っている人間だから。元・非モテ→現役モデルという当事者の軌跡そのもの。</p>
              </div>
            </div>
          </section>

          {/* 03. 誰のためか */}
          <section className={styles.section} id="who">
            <div className={styles.kicker}>Who It's For</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>誰のためのサービスか</h2>
            <div className={styles.quote}>「今日、恋愛や人間関係でつまずき、自信を失っている人」。<br />変わりたい意思はあるが、何から始めればいいか分からない人。</div>
            <p className={styles.lead}>鏡を見るのが怖い夜、自撮りを見てゾッとする夜、「普通だよね」と言われて黙り込む夜——そういう<strong>“夜”に隣で寄り添う地図と羅針盤</strong>でありたい。叱咤せず、煽らず。競合は他社ではなく、一人で自分を責める夜の沈黙そのもの。</p>

            <div className={styles.iconRow}>
              <div className={styles.iconCard}>
                <span className={styles.ic}>♂</span>
                <h4>Fineme（男性トラック）</h4>
                <p>20〜30代男性向け。診断・Mirror・マイページなど中核機能を提供。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>♀</span>
                <h4>Fineme Belle（女性トラック）</h4>
                <p>女性向け。同じ思想・機能を、タイプ名やビジュアルは女性向けに再設計。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🔗</span>
                <h4>共通の根</h4>
                <p>8軸Me Scan・136タイプ・Compass・New Me Map／Log・Mirror。入口は分けて思想はひとつ。</p>
              </div>
            </div>
            <p className={styles.note}>Finemeは男性限定のサービスではない。「誰でも、外見を起点に自信を再設計できる」が本質。その夜は、性別を問わない。</p>
          </section>

          {/* 04. プロダクト */}
          <section className={styles.section} id="product">
            <div className={styles.kicker}>What We Offer</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>4つの入口、ひとつの地図</h2>
            <p className={styles.lead}>「何から始めればいいか分からない」を解消し、変化を継続させるための設計。すべて航海のメタファーで統一されている。</p>

            <div className={styles.productGrid}>
              <div className={styles.productCard}>
                <span className={styles.pic}>🧭</span>
                <h4>Me Scan（羅針盤）</h4>
                <p>8軸・136タイプの無料問診。出力はFineme Compass。「最初の一手」を一点に絞り込み、迷いをなくして行動へつなげる。</p>
                <span className={`${styles.priceTag} ${styles.free}`}>無料</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>🪞</span>
                <h4>Mirror（深海を覗く）</h4>
                <p>写真1枚をAIが分析（眉・肌・ヘア・表情・姿勢・体型・服装）。「変われる余白」を可視化し、今を責めず変化への距離を示す。写真は保存しない。</p>
                <span className={styles.priceTag}>¥500単発／¥780月額</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>📓</span>
                <h4>New Me Log（記録帳）</h4>
                <p>通っている美容室・ジムを登録すると、頻度と費用から次回タイミングと月額換算を自動計算。「変わりたい」と認めなくても、予定管理として使い始められる3つ目の入口。未ログインでも全機能利用可。</p>
                <span className={`${styles.priceTag} ${styles.free}`}>無料</span>
              </div>
              <div className={styles.productCard}>
                <span className={styles.pic}>🗺️</span>
                <h4>New Me Map／Navi（航海図）</h4>
                <p>診断結果をもとに「今週やること」を具体化し、7〜8軸の現在地を毎月更新。診断から実行への橋渡し役であり、サブスク継続価値の核。</p>
                <span className={styles.priceTag}>サブスクに内包</span>
              </div>
            </div>

            <ul className={styles.bullets}>
              <li>診断起点のマッチング——単なる検索ではなく、何から始めるべきかの優先軸を提示する</li>
              <li>Mirror⇄Log⇄Map⇄Naviが軸IDで相互接続し、記録・診断・分析が一つの地図としてつながる</li>
              <li>写真を保存しない設計など、心理的安全を前提にした体験づくり</li>
              <li>でお自身の体験（元・非モテ→現役モデル）を体現したブランドボイス</li>
            </ul>

            <div className={styles.wideCard}>
              <h4>店舗・サービス掲載事業</h4>
              <p>美容室・パーソナルジム・メイクサロンなど「外見を整える店舗」の検索・予約導線もサイト内に持つ。ユーザーは診断結果から実際の店舗にたどり着ける。店舗側には掲載管理用のSaaS機能（プラン管理・問い合わせ対応など）を新たに実装し、今まさに展開を始めている段階。</p>
            </div>

            <div className={styles.callout}>
              <div className={styles.kicker}>今、一番大事にしていること</div>
              <p className={styles.big}>New Me Map の質＝サブスク継続率の生命線</p>
              <p>新規獲得より先に、すでに使ってくれている人が「続ける理由」を持てるかを優先している。穴の空いたバケツに水を注がない、という考え方。</p>
            </div>
          </section>

          {/* 05. ビジネスモデル */}
          <section className={styles.section} id="model">
            <div className={styles.kicker}>Business Model</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>ビジネスモデル・収益源</h2>
            <p className={styles.lead}>ユーザー課金と、掲載店舗からの収益の二本柱。</p>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>対象</th><th>商品</th><th>価格</th></tr></thead>
                <tbody>
                  <tr><td>ユーザー</td><td>Mirror 単発分析</td><td><span className={styles.yen}>¥500</span></td></tr>
                  <tr><td>ユーザー</td><td>Mirror サブスク（月3回相当）</td><td><span className={styles.yen}>¥780</span> / 月</td></tr>
                  <tr><td>掲載者</td><td>登録料</td><td><span className={styles.yen}>¥1,100</span></td></tr>
                  <tr><td>掲載者</td><td>ライト／スタンダード／プレミアム</td><td><span className={styles.yen}>¥5,000〜10,000</span> / 月</td></tr>
                  <tr><td>掲載者</td><td>紹介報酬</td><td><span className={styles.yen}>¥500</span> / 月 × 紹介数</td></tr>
                </tbody>
              </table>
            </div>
            <p className={styles.note}>横展開（他業界への拡張）は当面しない。自分が実体験を持つ領域でFinemeの成功を証明することが先。</p>
          </section>

          {/* 06. 現在地 */}
          <section className={styles.section} id="now">
            <div className={styles.kicker}>Where We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>正直な現在地</h2>
            <p className={styles.lead}>プロダクトと販売の仕組みは整った。今は集客と売上をこれから伸ばすフェーズ。</p>

            <div className={styles.statgrid}>
              <div className={styles.stat}><b>290本+</b><span>記事資産（男性251＋Belle39）</span></div>
              <div className={styles.stat}><b>2026.07</b><span>Belle（女性トラック）ローンチ</span></div>
              <div className={styles.stat}><b>1人＋AI</b><span>今の体制</span></div>
            </div>
          </section>

          {/* 07. 目標・フェーズ戦略 */}
          <section className={styles.section} id="goals">
            <div className={styles.kicker}>Goals &amp; Strategy</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>目標とフェーズ戦略</h2>

            <div className={styles.goalRow}>
              <div className={styles.goalCard}><h4>🎯 6ヶ月目標</h4><p>月商50万円。Mirrorの¥780/月サブスク（約640人継続）が主エンジン。</p></div>
              <div className={styles.goalCard}><h4>🏔 3年目標</h4><p>年商10億円・ファウンダー個人年収1億円。外見・恋愛・自信領域のプラットフォームへ。</p></div>
            </div>

            <div className={styles.subhead}>進行順序：商品 → 販売 → 集客</div>
            <div className={styles.flow}>
              <div className={styles.flowStep}><b>商品 ✅</b><span>New Me Mapの継続価値</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>販売 ✅</b><span>Mirror LP・¥500→¥780</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>集客 ◉現在地</b><span>でお個人発信＋ドラマ</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>次フェーズ</b><span>掲載者募集</span></div>
            </div>
            <p className={styles.note}>商品・販売は整備済み。判断軸は①サブスク継続価値＞②新規獲得を維持したまま、今は集客にフォーカス。</p>
          </section>

          {/* 08. 集客戦略 */}
          <section className={styles.section} id="acquisition">
            <div className={styles.kicker}>Acquisition</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>集客戦略——最初の一滴を増やす</h2>
            <p className={styles.lead}>ファウンダー「でお」個人を主軸に発信。実写ショートドラマ「変わる前夜の話。」を縦型プラットフォームへ展開中。</p>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>チャネル</th><th>役割</th></tr></thead>
                <tbody>
                  <tr><td><strong>ショートドラマ</strong></td><td>「変わる前夜」を描き、最初にFinemeに触れる入口をつくる。説教せず、等身大の“夜”を敬意をもって描く</td></tr>
                  <tr><td><strong>X</strong></td><td>でおの変容哲学・思考を日次発信</td></tr>
                  <tr><td><strong>note</strong></td><td>週次記事。後輩目線で失敗と気づきを共有し、診断・Mirrorへ誘導</td></tr>
                  <tr><td><strong>SEO（サイト内記事）</strong></td><td>290本以上の記事。インデックス整備済み、反映を待つストック資産</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.askBox}>
              <p>すべての生成コンテンツ（X・note・ドラマ・診断/Mirror/Naviの出力）には、創業思想を<strong>標語ではなく温度・眼差し</strong>として通底させる。ポジティブの押し売りをせず、今を肯定したうえで半歩先だけをそっと照らす。モテや他者評価で釣らず、最終的に向く先は本人の自己肯定と人への優しさ。</p>
            </div>
          </section>

          {/* 09. 運営体制 */}
          <section className={styles.section} id="org">
            <div className={styles.kicker}>How It Runs</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>運営体制・意思決定の仕組み</h2>
            <p className={styles.lead}>でお一人のソロ起業に、AIエージェント組織を組み合わせて運営。指揮命令の階層ではなく「権限の種類」で役割を分けている。</p>

            <div className={styles.orgGrid}>
              <div className={styles.orgCard}><div className={styles.role}>Propose</div><b>提案</b><span>案を出す。AI／でお。確定はしない</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Judge</div><b>判断</b><span>案を捌き、可否を下書きする（Hermes等）</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Approve</div><b>承認</b><span>でおただ一人。最終GOを出す</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Execute</div><b>実行</b><span>Claude Code。ファイル反映の唯一の窓口</span></div>
            </div>
            <p className={styles.note}>コードの実装・記事生成・SNS下書きなど実務の大半をAIが自走し、でおは意思決定と承認に集中する体制。可逆な作業はAIが自律実行し、不可逆な判断だけ人に上がる。</p>
          </section>

          {/* 10. 判断の5原則 */}
          <section className={styles.section} id="principles">
            <div className={styles.kicker}>Operating Principles</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>判断の軸——5つの原則</h2>
            <p className={styles.lead}>創業思想から導いた、日々の意思決定のためのフィルター。すべて同格で扱う。</p>

            <div className={styles.principleGrid}>
              <div className={styles.principle}><div className={styles.num}>1</div><div className={styles.body}><b>利己の入口・利他の出口</b>「モテたい」という利己のドアを使って、「愛で溢れる世界」という利他の部屋へ運ぶ。</div></div>
              <div className={styles.principle}><div className={styles.num}>2</div><div className={styles.body}><b>北極星は「波及」</b>継続率やモテ度ではなく、その人を起点に誰かへ優しさがどれだけ広がったかを最終指標にする。</div></div>
              <div className={styles.principle}><div className={styles.num}>3</div><div className={styles.body}><b>競合は“夜の沈黙”</b>本当の相手は他社ではなく、一人で自分を責める夜。一番落ちている深夜に開かれる前提でトーンを設計する。</div></div>
              <div className={styles.principle}><div className={styles.num}>4</div><div className={styles.body}><b>始点を絶対に嘲笑わない</b>今の姿は欠陥ではなく通過点。Before/Afterを「お前はダメだった→こうなれ」に滑らせない。</div></div>
              <div className={styles.principle}><div className={styles.num}>5</div><div className={styles.body}><b>川の終着点</b>一滴が川になるのは滴がつながったとき。いつか「変わった人が、次の夜にいる人へ渡す」構造へ育てる。</div></div>
            </div>
          </section>

          {/* 11. なぜ今声をかけたか */}
          <section className={styles.section} id="why-you">
            <div className={styles.kicker}>Why You</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>なぜ、今声をかけたか</h2>
            <div className={styles.askBox}>
              <p>一人で作れるところまでは作った。プロダクトも、記事の土台も、集客の仕組みも動き始めている。実務の大半はAIが自走している。</p>
              <p>それでも埋まらないのが、<strong>言葉と絵のセンス、人に会って話す力</strong>。ここはAIに任せきれない、人にしか出せない部分。</p>
              <p>一番信頼していて、一番得意なことを持っている人に、まず声をかけたい。</p>
            </div>
          </section>

          {/* 12. お願いしたい業務（ロードマップ） */}
          <section className={styles.section} id="ask">
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

          {/* 13. 進め方 */}
          <section className={styles.section} id="how">
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
