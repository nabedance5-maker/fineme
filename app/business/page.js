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
          <a className={styles.tocLink} href="#org">日々の回し方</a>
          <a className={styles.tocLink} href="#cases">判断の実例</a>
          <a className={styles.tocLink} href="#principles">判断の軸</a>
          <a className={styles.tocLink} href="#map">システム地図</a>
          <a className={styles.tocLink} href="#ask">お願いしたいこと</a>
          <a className={styles.tocLink} href="#reward">協業者への還元</a>
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
            <p className={styles.lead}>ユーザー課金と、掲載店舗からの収益の二本柱。今の主エンジンは<strong>掲載店舗からの収益</strong>（詳しくは次の「現在地」参照）。</p>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>対象</th><th>商品</th><th>価格</th></tr></thead>
                <tbody>
                  <tr><td>掲載者</td><td>登録料</td><td><span className={styles.yen}>¥1,100</span></td></tr>
                  <tr><td>掲載者</td><td>ライト／プレミアム（¥7,000はキャンペーン用特別価格として温存）</td><td><span className={styles.yen}>¥5,000〜10,000</span> / 月</td></tr>
                  <tr><td>掲載者</td><td>紹介報酬（初月）</td><td>紹介した掲載店舗の初回課金額の<span className={styles.yen}>90%</span></td></tr>
                  <tr><td>掲載者</td><td>紹介報酬（継続）</td><td>その店舗が掲載を続ける限り<span className={styles.yen}>¥500</span> / 月</td></tr>
                  <tr><td>ユーザー</td><td>Mirror 単発分析</td><td><span className={styles.yen}>¥500</span></td></tr>
                  <tr><td>ユーザー</td><td>Mirror サブスク（月3回相当）</td><td><span className={styles.yen}>¥780</span> / 月</td></tr>
                </tbody>
              </table>
            </div>
            <p className={styles.note}>横展開（他業界への拡張）は当面しない。自分が実体験を持つ領域でFinemeの成功を証明することが先。</p>
          </section>

          {/* 06. 現在地 */}
          <section className={styles.section} id="now">
            <div className={styles.kicker}>Where We Are</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>正直な現在地</h2>
            <p className={styles.lead}>プロダクトと販売の仕組みは整った。第一フェーズの主エンジンは<strong>店舗SaaSの有料契約を増やす直接営業</strong>に切り替えている（2026-09〜）。</p>

            <div className={styles.statgrid}>
              <div className={styles.stat}><b>21社</b><span>掲載店舗（有料契約はまだ0）</span></div>
              <div className={styles.stat}><b>67店舗</b><span>月商50万円に必要な有料契約数</span></div>
              <div className={styles.stat}><b>290本+</b><span>記事資産（男性251＋Belle39）</span></div>
            </div>
            <p className={styles.note}>店舗SaaS導入店舗が増える→掲載者が増える→ポータルサイトとしてユーザーも集めやすくなる、という二面市場の好循環を狙っている。ユーザーに見せる「顔」（Me Scan・Compass・New Me Map・Mirror）は変えず、販売チャネルだけを直接営業に振り直した形。</p>
          </section>

          {/* 07. 目標・フェーズ戦略 */}
          <section className={styles.section} id="goals">
            <div className={styles.kicker}>Goals &amp; Strategy</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>目標とフェーズ戦略</h2>

            <div className={styles.goalRow}>
              <div className={styles.goalCard}><h4>🎯 6ヶ月目標</h4><p>月商50万円。店舗SaaSの有料契約67店舗が主エンジン（平均単価¥7,500想定）。</p></div>
              <div className={styles.goalCard}><h4>🏔 3年目標</h4><p>年商10億円・ファウンダー個人年収1億円。外見・恋愛・自信領域のプラットフォームへ。</p></div>
            </div>

            <div className={styles.subhead}>進行順序：商品 → 店舗営業 → 二面市場の好循環</div>
            <div className={styles.flow}>
              <div className={styles.flowStep}><b>商品 ✅</b><span>SaaS機能・New Me Mapの継続価値</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>店舗営業 ◉現在地</b><span>既存21社の有料転換＋新規開拓</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>掲載者増加</b><span>選べる店舗が増える</span></div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}><b>ユーザー集客</b><span>ポータルとして集めやすく</span></div>
            </div>
            <p className={styles.note}>でお個人のSNS発信だけでは消費者への直接リーチが構造的に弱いことが分かったため（2026-06〜09、サブスク継続0人のまま停滞）、再現可能な販売チャネルとして店舗への直接営業を主エンジンに選び直した。</p>
          </section>

          {/* 08. 集客戦略 */}
          <section className={styles.section} id="acquisition">
            <div className={styles.kicker}>Acquisition</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>集客戦略——最初の一滴を増やす</h2>
            <p className={styles.lead}>ユーザー向けの集客は、今は主エンジンではなく並行運用。ファウンダー「でお」個人を主軸に発信し、実写ショートドラマ「変わる前夜の話。」を縦型プラットフォームへ展開中。</p>

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

          {/* 09. 日々の回し方 */}
          <section className={styles.section} id="org">
            <div className={styles.kicker}>How It Runs</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>日々の回し方——でおは実際何をしているか</h2>
            <p className={styles.lead}>でお一人のソロ起業に、AIエージェント組織を組み合わせて運営。指揮命令の階層ではなく「権限の種類」で役割を分けている。</p>

            <div className={styles.orgGrid}>
              <div className={styles.orgCard}><div className={styles.role}>Propose</div><b>提案</b><span>案を出す。AI／でお。確定はしない</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Judge</div><b>判断</b><span>案を捌き、可否を下書きする（Hermes等）</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Approve</div><b>承認</b><span>でおただ一人。最終GOを出す</span></div>
              <div className={styles.orgCard}><div className={styles.role}>Execute</div><b>実行</b><span>Claude Code。ファイル反映の唯一の窓口</span></div>
            </div>

            <div className={styles.subhead}>提案から実装までの実際のパイプライン</div>
            <div className={styles.askBox}>
              <p><strong>①発案</strong> — Strategist（自走取締役・cron）が、その時点の実データとゴールから「今一番レバレッジの高い一手」を発案する。</p>
              <p><strong>②審査</strong> — reviewboard（cron）が3つの関門（戦略として妥当か／リスクは現実的か／辛口の反対意見に耐えるか）で審査。粗い案はここで差し戻される。</p>
              <p><strong>③上申</strong> — 通過した案だけをflush-decisionsがSlackにカード形式で1枚流す。</p>
              <p><strong>④裁定</strong> — でおがそのカードに「GO」「no-go」「修正＋一言」のどれかを返す。これがでおの実務の大半。</p>
              <p><strong>⑤記録と振り分け</strong> — inbound-verdicts（LLM不使用の自動処理）がSlackの返信を読み取り、decision-ledgerに記録。文書系の指示はtasks.mdへ、コード変更はclaude-code-inboxへ自動振り分けする。</p>
              <p><strong>⑥実行</strong> — Claude Code（毎時cron）が承認済みタスクを実装し、ファイルに反映する。</p>
              <p><strong>⑦報告</strong> — 翌朝、進捗ダイジェストがSlackに1通届く。進んでいないこと・結果が測れていないことも隠さず書く設計。</p>
            </div>
            <p className={styles.note}>要するに、でおの日々の仕事は「Slackに来るカードにGO／no-go／修正を一言返す」がほとんど。コードを書く・記事を書く・分析するといった実務のほぼ全てはAIが自走している。</p>
          </section>

          {/* 10. 判断の実例 */}
          <section className={styles.section} id="cases">
            <div className={styles.kicker}>Judgment In Practice</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>判断の実例——でおならどう答えるか</h2>
            <p className={styles.lead}>原則は抽象的で分かりにくい。実際にあった裁定を見た方が、判断の勘所は伝わる。</p>

            <div className={styles.iconRow}>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🙅</span>
                <h4>no-go｜自腹購入を実績にしない</h4>
                <p>「累計10人のMirror購入者へメッセージを送ろう」という提案に、でおは差し戻した。理由：「10人の購入は全て私自身が試験的に購入したもの」。実ユーザーの検証になっていないデータを、検証できた前提で次の施策に進めない。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>🙅</span>
                <h4>no-go｜弱さの開示と誠実さを混同しない</h4>
                <p>LPの体験談欄が空だったとき「正直に0件と書こう」という提案が出た。でおの返答：「正直に0だなんて書くな。誰も導いたことのないメンターに誰がお金を払う？」。今を否定せず、静かに自信を保つ——原則4の実践形。</p>
              </div>
              <div className={styles.iconCard}>
                <span className={styles.ic}>✅</span>
                <h4>GO｜悪い数字ほど直視する</h4>
                <p>既存記事が「28日で20インプレッション・0クリック」という厳しい実測が出たとき、でおは施策変更にGOを出した。都合の悪い数字を隠さず、そこから動く。</p>
              </div>
            </div>
            <p className={styles.note}>共通しているのは「自分を騙すデータで安心しない」「弱さを売り文句にはしない」「悪い事実からは逃げない」。この3つの感覚が、原則よりも実際の判断を左右している。</p>
          </section>

          {/* 11. 判断の5原則 */}
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

            <div className={styles.subhead}>迷ったときの優先順位</div>
            <ul className={styles.bullets}>
              <li>すでにGOした承認済みタスク・仕様があるか先に確認する。新しい提案を積み増す前に、決まっていることを終わらせる</li>
              <li>継続価値（New Me Map／Logの質）と新規集客がぶつかったら、継続価値を優先する。穴の空いたバケツに水を注がない</li>
              <li>横展開（他業界・他事業への拡張）はしない。Fineme一本で成功を証明してから</li>
              <li>判断に迷う・実データが読めない・でおの意図が推測できない時は、進めずに止めて確認する</li>
            </ul>
          </section>

          {/* 12. システム地図 */}
          <section className={styles.section} id="map">
            <div className={styles.kicker}>System Map</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>どこに何があるか</h2>
            <p className={styles.lead}>実務を引き継ぐ・手伝う上で知っておくべき、事業を構成するシステムの地図。</p>

            <ul className={styles.bullets}>
              <li><strong>コード本体</strong> — GitHubで管理、Vercelで本番デプロイ（Next.js）</li>
              <li><strong>データベース・認証</strong> — Supabase</li>
              <li><strong>決済</strong> — Stripe（Mirror単発・サブスク課金）</li>
              <li><strong>LINE連携</strong> — LINEログイン・通知用に専用サーバーを別プロセスで運用</li>
              <li><strong>画像アップロード</strong> — AWS S3</li>
              <li><strong>事業のSSoT（唯一の正）</strong> — でおが持つ運営ドキュメント一式。事業の全方針・原則・進行中の判断がここに集約されている</li>
              <li><strong>意思決定ログ</strong> — GO／no-go／修正の全履歴。判断の実例で紹介した2件も、ここから引いている</li>
              <li><strong>AIエージェント組織の定義</strong> — Strategist・reviewboard・Hermes・Claude Codeなど各役割の権限とトリガーを定義したドキュメント</li>
            </ul>
            <p className={styles.note}>実際のアクセス権限や認証情報はこのページには置かない。関わる範囲が具体化した時点で、必要な分だけでおから渡す。</p>
          </section>

          {/* 13. なぜ今声をかけたか */}
          <section className={styles.section} id="why-you">
            <div className={styles.kicker}>Why You</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>なぜ、今声をかけたか</h2>
            <div className={styles.askBox}>
              <p>一人で作れるところまでは作った。プロダクトも、記事の土台も、店舗営業の仕組みも動き始めている。実務の大半はAIが自走している。</p>
              <p>それでも埋まらないのが、<strong>現場の感覚と、人に会って話す力</strong>。ここはAIに任せきれない、人にしか出せない部分。</p>
              <p>一番信頼していて、それぞれの得意なことを持っている人たちに、声をかけている。</p>
            </div>
          </section>

          {/* 12. お願いしたい業務（ロードマップ） */}
          <section className={styles.section} id="ask">
            <div className={styles.kicker}>The Ask</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>一緒にやってほしいこと</h2>
            <p className={styles.lead}>最初から全部じゃなくていい。それぞれの得意分野・本業に合わせて、隙間時間でできることから少しずつ広げていく。全員が全部やる必要はなく、下から選んで分担するイメージ。</p>

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
                    <p>得意な人がいれば、必要なタイミングで単発で依頼したい。</p>
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
                    <p>既存掲載店舗への有料転換提案、新規開拓先へのヒアリング・改善点の洗い出し。現場に近い人ほど強い実務。</p>
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

          {/* 12.5. 協業者への還元 */}
          <section className={styles.section} id="reward">
            <div className={styles.kicker}>For Collaborators</div>
            <h2 className={`${styles.h2} ${styles.serif}`}>協業者への還元</h2>
            <p className={styles.lead}>経営陣格として関わってくれる人には、一般の掲載者・外部紹介者向けの紹介報酬（初月90%＋紹介した店舗ごとに継続¥500/月）とは別枠の還元を用意している。</p>
            <div className={styles.callout}>
              <div className={styles.kicker}>還元の仕組み</div>
              <p className={styles.big}>掲載2ヶ月目以降：掲載者数 × 掲載料の10%を毎月</p>
              <p>自分が紹介したかどうかに関係なく、全体の掲載者数に対して。＋自分が紹介した掲載者が入った場合は、初月分の90%バックも別途受け取れる。</p>
            </div>
            <p className={styles.note}>掲載者が増えるほど積み上がっていく設計。詳細は個別にすり合わせる。</p>
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
