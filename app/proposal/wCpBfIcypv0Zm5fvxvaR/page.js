// 店舗オーナー向けの提案資料（2026-11-21・渡邉依頼）。営業メールのリンクからだけ開く前提のページ。
// - URL は推測できない文字列（このフォルダ名）。サイト内のどこからもリンクしない・sitemap に入れない
// - noindex, nofollow（metadata ＋ next.config.mjs の X-Robots-Tag）。共通のナビ・フッターは出さない（Navbar.js / Footer.js）
// - ?s=xxxxx（店舗ごとの計測用）が付いても普通に表示する。GA4 は app/layout.js の共通タグ＋ProposalFx のイベント
// 2026-11-21 改訂：Museの初稿をベースに、構成をセールスレター12ステップに組み直し、実際の機能・プラン区分・料金と照らして直した。
//   - 機能のプラン区分は lib/feature-flags.js と /provider/join の FEATURE_GROUPS に合わせる（休眠の個別声かけ＝B、カルテAI＝C 等）
//   - 「登録は無料で画面を触ってから」は事実と違う（月額は申込日から）。画面を見るのはオンライン相談・デモ・無料モニターで案内する
//   - リマインドは前日18時のLINE（app/api/cron/line-reminder）。料金は税込（lib/provider-plans.js）
// PDF は、このページを印刷用の見た目（proposal.css の @media print）で書き出したもの。文面を変えたら PDF も作り直す。
import './proposal.css';
import { PROVIDER_PLANS } from '@/lib/provider-plans';
import { MONITOR_CAMPAIGN, isMonitorOpen, monitorDeadlineLabel } from '@/lib/monitor-campaign';
import ProposalFx from './ProposalFx';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Fineme（ファインミ）ご提案資料' },
  description: '外見磨きの専門店のリピーターづくりを仕組み化する運営システム',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
  referrer: 'no-referrer',
};

const JOIN_URL = 'https://www.fineme.me/provider/join';
// PDF にしたときもリンクが本番を指すよう、絶対URLで書く
const SITE = 'https://www.fineme.me';
const INQUIRY_URL = `${SITE}/provider/inquiry`;
const CONTACT_EMAIL = 'h_watanabe@fineme.me';
// デモ店舗に入る招待コード（運営管理画面のデモで「提案資料」用に発行したもの）。空のあいだはデモの案内を出さない
const DEMO_CODE = '';
const PDF_NAME = 'Fineme提案資料_店舗向け_2026-11-21.pdf';
const PDF_HREF = `/proposal/wCpBfIcypv0Zm5fvxvaR/${encodeURIComponent(PDF_NAME)}`;

const PLAN_TAG = { A: '全プラン', B: 'スタンダード〜', C: 'プレミアム' };
function Tag({ p }) {
  return <span className={`pp-tag pp-tag-${p}`}>{PLAN_TAG[p]}</span>;
}

function Sec({ id, no, kicker, title, points, children, tone }) {
  return (
    <section className={`pp-sec${tone ? ` pp-sec-${tone}` : ''}`} id={id} data-track-section={id}>
      <div className="pp-kicker"><span className="pp-no">{no}</span>{kicker}</div>
      <h2 className="pp-h">{title}</h2>
      {points && (
        <ul className="pp-points">
          {points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      )}
      {children}
    </section>
  );
}

// 気づく → 声をかける → 次回につなげる の輪
function LoopDiagram() {
  const steps = [
    { n: '1', t: '気づく', d: '来店の目安を過ぎた方が一覧に' },
    { n: '2', t: '声をかける', d: '予約ボタン付きのLINE・メール' },
    { n: '3', t: '次回につなげる', d: '会計時の一言と次回予約' },
  ];
  return (
    <div className="pp-loop" role="img" aria-label="気づく、声をかける、次回につなげる、の3つを繰り返す流れ">
      {steps.map(s => (
        <div className="pp-loop-step" key={s.n}>
          <div className="pp-loop-num">{s.n}</div>
          <div>
            <div className="pp-loop-t">{s.t}</div>
            <div className="pp-loop-d">{s.d}</div>
          </div>
        </div>
      ))}
      <div className="pp-loop-back">記録がカルテに残り、次の「気づく」がもっと正確になる</div>
    </div>
  );
}

const BEFORE_AFTER = [
  ['来ていないお客様を、記憶で思い出す', '来店の目安を過ぎた方が、条件ひとつで一覧に出る'],
  ['声かけの文面を、毎回ゼロから考える', 'AIが文案をつくり、確認して送るだけ'],
  ['前日に一人ずつ、確認の連絡', '前日18時にLINEで自動リマインド、返信で来店確認'],
  ['回数券の残りを紙やメモで管理', '予約のたびに自動で消化、残りはお客様にも見える'],
  ['売上を手で転記・集計', '予約・決済から自動で集計、CSVでも出せる'],
];

const FAQ = [
  ['小さな店（ひとりサロン）でも使えますか？', 'はい。Finemeは個人〜小規模の専門店を想定して作っています。お客様が少ないうちからカルテを貯めておくほど、リピートの仕組みが効いてきます。'],
  ['今の予約サイトと併用できますか？', 'できます。乗り換えは前提ではありません。他の予約サイトから入った予約は、お店の予約入力からFinemeのカレンダーに登録できるので、予約とお客様の記録を1か所にまとめられます。'],
  ['今のお客様の情報は移せますか？', '顧客・予約や来店の履歴・回数券の残り・会員プランを、CSVで取り込めます。列の割り振りはAIが下書きし、お店が確認してから取り込みます。'],
  ['料金は月額以外にかかりますか？', '初期費用・登録料はかかりません（登録料は当面の間無料）。お客様がFineme経由でオンライン決済したときだけ、決済額の4.5%（カード会社の手数料込み）が入金額から差し引かれます。予約そのものの手数料はありません。'],
  ['月額料金はいつから発生しますか？', 'プランをお申し込みいただいた日からです。お申し込みの前に画面を見たい場合は、オンライン相談で実際の画面をお見せします。'],
  ['プランの変更や解約はできますか？', 'プランはいつでも切り替えられます。解約は月末までにお手続きいただくと、翌月から課金が止まります（当月分の返金はありません）。'],
  ['電話予約には対応していますか？', '電話を受ける機能はありません。電話で受けた予約は、お店の予約入力からカレンダーに登録できます。お客様からのご予約は、予約カレンダー・予約リクエスト・LINEの3つから選べます。'],
  ['お店の公式LINEを持っていなくても使えますか？', '使えます。ライト・スタンダードでは、予約やリマインドがFinemeの公式LINEから届きます。プレミアムでは、お店独自の公式LINEから送れます。メールでの配信は全プランで使えます。'],
  ['機能が多くて、難しくなりませんか？', '最初の質問に答えると、お店に合う機能だけがオンの状態で始まります。使わない機能はいつでもオフにでき、必要になったら後から足せます。'],
];

const cleanS = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : '');

export default async function ProposalPage(props) {
  const sp = (await props.searchParams) || {};
  const s = cleanS(Array.isArray(sp.s) ? sp.s[0] : sp.s);
  const monitorOpen = isMonitorOpen();
  const monitorPlan = PROVIDER_PLANS.find(p => p.label === MONITOR_CAMPAIGN.planLabel);
  const mailSubject = encodeURIComponent('Fineme提案資料を読みました');
  const mailBody = encodeURIComponent(`Fineme 渡邉様\n\n提案資料を拝見しました。\n\n店舗名：\nお名前：\nご相談したいこと：\n\n${s ? `（資料番号：${s}）\n` : ''}`);
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
  const demoHref = DEMO_CODE ? `${SITE}/demo?code=${encodeURIComponent(DEMO_CODE)}` : '';

  return (
    <main className="pp">
      <ProposalFx s={s} />

      {/* 表紙 */}
      <header className="pp-cover" data-track-section="cover">
        <div className="pp-brand">Fineme<span>ご提案資料</span></div>
        <h1 className="pp-title">いま通ってくれているお客様を、<br className="pp-br" />離さない仕組み。</h1>
        <p className="pp-sub">外見磨きの専門店のリピーターづくりを仕組み化する運営システム</p>
        <p className="pp-cover-body">
          美容室・パーソナルジム・眉毛／まつげサロン・エステ・ネイルなど、外見磨きの専門店のオーナー様に向けた資料です。オンラインでお話ししなくても、読むだけでFinemeの全体像と「自分の店でどう使えるか」が分かるようにまとめました。
        </p>
        <ul className="pp-facts">
          <li><b>¥5,000〜</b><span>月額・税込</span></li>
          <li><b>0円</b><span>初期費用</span></li>
          <li><b>併用OK</b><span>今の予約サイト</span></li>
        </ul>
        <div className="pp-cover-meta">
          <span>読む時間 約6分</span>
          <a className="pp-pdf-link" href={PDF_HREF} download={PDF_NAME} data-cta="pdf_top">PDFで保存する</a>
        </div>
      </header>

      {/* この資料で分かること */}
      <nav className="pp-toc" aria-label="この資料で分かること">
        <div className="pp-toc-h">この資料で分かること</div>
        <ol>
          <li><a href="#cause">リピートが安定しない、本当の理由</a></li>
          <li><a href="#notice">Finemeで「来なくなる前」に手を打つ方法</a></li>
          <li><a href="#price">費用と、元が取れる目安</a></li>
          <li><a href="#start">始め方と、よくあるご不安</a></li>
        </ol>
      </nav>

      <Sec id="worry" no="01" kicker="よくあるお悩み" title="「一度来てくれたお客様が、気づいたら来なくなっていた」"
        points={[
          '新規のお客様を迎える努力はしているのに、2回目・3回目の来店は「偶然」頼みになりがち',
          '誰が・いつから来ていないのか、一覧で把握できていない',
          '声をかけたい気持ちはあるが、日々の営業の中で手が回らない',
          '回数券の残りや誕生日など、声かけのきっかけになる情報がバラバラ',
        ]}>
        <p className="pp-body">技術や接客に問題があるわけではありません。お客様が離れたのではなく、「思い出してもらう接点」がなかっただけ、というケースがほとんどです。</p>
      </Sec>

      <Sec id="pain" no="02" kicker="そのままにすると" title="新規を増やしても、2回目がなければ毎月ゼロから">
        <div className="pp-pains">
          <div className="pp-pain"><b>穴の空いたバケツ</b><span>広告や値引きで新しいお客様を呼んでも、2回目につながらなければ、毎月やり直しになります。</span></div>
          <div className="pp-pain"><b>忙しいほど後回し</b><span>「そろそろ声をかけよう」と思ったまま、いちばん戻りやすい時期が過ぎていきます。</span></div>
          <div className="pp-pain"><b>店主の頭の中だけ</b><span>お客様の情報が一人に集まるほど、休めず、任せられない店になります。</span></div>
        </div>
      </Sec>

      <Sec id="cause" no="03" kicker="本当の理由" title="リピートが安定しないのは、努力不足ではなく「仕組み」がないから"
        points={[
          '来店の間隔はお客様ごとに違うのに、一律の感覚で見てしまう',
          '「来ていないお客様」を探す作業そのものが大変で、後回しになる',
          '声かけの文面を毎回考えるのが負担',
          '予約・顧客情報・回数券が別々で、お客様の全体像が見えない',
        ]}>
        <p className="pp-body">リピートづくりは本来、次の3つを繰り返すだけです。ただ、最初の「気づく」が人の目と記憶に頼っていると、忙しい日々の中でどうしても漏れます。ここを仕組みに任せるのが、Finemeの考え方です。</p>
        <LoopDiagram />
      </Sec>

      <Sec id="solution" no="04" kicker="Finemeとは" title="「来なくなるお客様」を防ぐための、お店の運営システムです" tone="navy"
        points={[
          '予約・顧客カルテ・回数券や月会費・LINEとメールの声かけを、1か所にまとめます',
          'AIが「いま声をかけるべきお客様」と、その文案を出します。お店は確認して送るだけ',
          '新しいお客様を連れてくる広告ではなく、今のお客様に通い続けてもらうための仕組みです',
        ]}>
        <div className="pp-ba">
          <div className="pp-ba-head"><span>これまで</span><span>Finemeなら</span></div>
          {BEFORE_AFTER.map(([b, a]) => (
            <div className="pp-ba-row" key={b}><span className="pp-ba-b">{b}</span><span className="pp-ba-a">{a}</span></div>
          ))}
        </div>
      </Sec>

      <Sec id="notice" no="05" kicker="仕組み 1　気づく" title="「来ていないお客様」が、一覧で見えるようになります">
        <ul className="pp-feats">
          <li>お客様を「来店の目安を過ぎた」「休眠」「今月が誕生月」「有効な回数券あり」などで絞り込み <Tag p="A" /></li>
          <li>カルテに来店履歴・施術の記録・会話のメモを残せる。項目はお店で自由に決められます <Tag p="A" /></li>
          <li>休眠のお客様を一覧にし、休眠とみなす日数をお店ごとに設定（はじめは90日） <Tag p="B" /></li>
          <li>カルテの記録から、AIがお客様ごとの傾向と次回への提案をまとめる <Tag p="C" /></li>
        </ul>
        <p className="pp-body">まず「誰が来ていないのか」が見えることが第一歩です。前回の施術や会話のメモが残るので、久しぶりのお客様にも前回の続きから話しかけられます。</p>
      </Sec>

      <Sec id="reach" no="06" kicker="仕組み 2　声をかける" title="声かけは、一斉にも、お一人ずつにも">
        <ul className="pp-feats">
          <li>LINE・メールの一斉配信。今すぐ／日時を指定して送れて、開封やクリックも分かります <Tag p="A" /></li>
          <li>宛先は「休眠」「来店の目安を過ぎた」「今月が誕生月」などの条件で選べます <Tag p="A" /></li>
          <li>休眠のお客様お一人ずつに、予約ボタン付きの声かけ。文案はAIが下書きします <Tag p="B" /></li>
          <li>来店後に、クチコミのお願いを自動で送る <Tag p="B" /></li>
        </ul>
        <p className="pp-body">声をかける相手が見えたら、あとは送るだけです。メッセージから予約まで1タップでつながるので、「思い出したけど予約は面倒」を減らせます。</p>
      </Sec>

      <Sec id="rebook" no="07" kicker="仕組み 3　次回につなげる" title="接客の場面でも、次回予約への一押しを忘れない">
        <ul className="pp-feats">
          <li>来店前に、そのお客様の「前回の記録」と「今日聞くこと」を表示 <Tag p="A" /></li>
          <li>会計のときに「次回予約の一言」をお客様ごとに表示 <Tag p="A" /></li>
          <li>次回予約率・2回目来店率を、スタッフ別に自動で集計 <Tag p="A" /></li>
          <li>前日18時にLINEで自動リマインド。お客様は返信で来店を確認 <Tag p="A" /></li>
        </ul>
        <p className="pp-body">いちばん次の予約が入りやすいのは、会計の瞬間です。忙しい営業の中でも、その一言を言いそびれないようにします。数字で見えるので、スタッフごとの得意・不得意も分かります。</p>
      </Sec>

      <Sec id="ops" no="08" kicker="日々の運営" title="予約から回数券、売上まで、ひとつに">
        <ul className="pp-feats">
          <li>予約の受け方はお店ごとに選択：空き時間から即確定／希望日時を受けて承認／LINEから <Tag p="A" /></li>
          <li>自社サイトに置ける予約ウィジェットと、お店の公開ページ <Tag p="A" /></li>
          <li>オンライン決済・請求書・予約デポジット、売上管理と月ごとのレポート <Tag p="A" /></li>
          <li>回数券・会員プラン（月会費の自動課金・オンライン入会）、シフトと勤怠 <Tag p="B" /></li>
          <li>POS・物販・在庫、お店独自の公式LINEからの配信 <Tag p="C" /></li>
        </ul>
        <p className="pp-body">リピートづくりが中心ですが、土台になる予約・回数券・お金の管理もまとめて担えます。「回数券の残りがどこにあるか分からない」「月末の集計がつらい」をなくせます。</p>
      </Sec>

      <Sec id="ai" no="09" kicker="AI専属コンサル" title="数字の見張り役は、AIが担います" tone="teal"
        points={[
          'お店のゴールから、いちばん効く指標を1つ決め、今の値・目標・期限を数字で置きます',
          '今週・今月・3か月の節目と、毎日・毎週・毎月のタスクを出します',
          '提案はそのまま実行へ。声かけの文案づくりからLINEの送信まで進められます',
          '気になることは、管理画面のどこからでもチャットで相談できます',
        ]}>
        <p className="pp-body">「仕組みを入れても、結局自分が見張らないと続かない」。その心配に応えるのがAI専属コンサルです。全プランで使えます。オーナー様は接客と経営判断に集中し、見張り役はAIに任せる、という分担です。</p>
      </Sec>

      <Sec id="coexist" no="10" kicker="乗り換え不要" title="今の予約サイトは、そのまま使い続けられます"
        points={[
          '予約の窓口は今のまま。顧客管理とリピートづくりだけFinemeに置けます',
          '他の予約サイトから入った予約も、Finemeのカレンダーに入れて記録を1か所に',
          '今の顧客・来店履歴・回数券の残り・会員プランは、CSVで取り込めます',
        ]}>
        <p className="pp-body">「今の予約サイトをやめるのは不安」というお声はよく分かります。無理のない範囲から始めて、必要を感じた部分だけ広げていただけます。</p>
      </Sec>

      <section className="pp-sec" id="price" data-track-section="price">
        <div className="pp-kicker"><span className="pp-no">11</span>費用</div>
        <h2 className="pp-h">月額のみ。初期費用はかかりません</h2>
        <div className="pp-roi">
          <div className="pp-roi-h">元が取れる目安（計算例）</div>
          <p>客単価8,000円のお店なら、来なくなりかけたお客様が<b>月にお一人</b>戻ってくれるだけで、スタンダード（月7,000円）の費用を上回ります。</p>
        </div>
        <div className="pp-plans">
          {PROVIDER_PLANS.map(pl => (
            <div className={`pp-plan${pl.highlight ? ' pp-plan-hi' : ''}`} key={pl.key}>
              {pl.badge && <div className="pp-plan-badge">{pl.badge}</div>}
              <div className="pp-plan-name">{pl.label}<small>{pl.name}</small></div>
              <div className="pp-plan-price">¥{pl.price}<small>／月（税込）</small></div>
              <div className="pp-plan-fit">{pl.fit}</div>
              <ul>{pl.items.map(it => <li key={it}>{it}</li>)}</ul>
            </div>
          ))}
        </div>
        <ul className="pp-notes">
          <li>初期費用・登録料なし（登録料は当面の間無料）。月額はお申し込みの日からです</li>
          <li>お客様がFineme経由でオンライン決済したときだけ、決済額の4.5%（カード会社の手数料込み）。予約の手数料はありません</li>
          <li>迷ったら：リピートの仕組みを一通り使うならスタンダード。まず予約と顧客管理をまとめたいならライト</li>
        </ul>
      </section>

      <Sec id="start" no="12" kicker="始め方" title="始め方は3ステップ">
        <ol className="pp-steps">
          <li><b>お申し込み</b><span>詳細ページから登録し、プランを選びます。迷う場合は、先にオンライン相談で画面をご覧いただけます</span></li>
          <li><b>最初の質問に答える</b><span>業種やお店の課題に答えると、お店に合う機能と初期設定をAIが準備します。今のお客様の情報はCSVで取り込めます</span></li>
          <li><b>運用スタート</b><span>まずは「来店の目安を過ぎたお客様」の確認から。いきなり全部を変える必要はありません</span></li>
        </ol>
      </Sec>

      <section className="pp-sec" id="faq" data-track-section="faq">
        <div className="pp-kicker"><span className="pp-no">13</span>よくあるご不安</div>
        <h2 className="pp-h">始める前に、不安はすべて解消しておきましょう</h2>
        <div className="pp-faq">
          {FAQ.map(([q, a]) => (
            <details key={q} open>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <p className="pp-body pp-faq-foot">ここにない疑問も、このメールへのご返信でお気軽にお尋ねください。分かる範囲で、正直にお答えします。</p>
      </section>

      {monitorOpen && monitorPlan && (
        <section className="pp-offer" id="monitor" data-track-section="monitor">
          <div className="pp-offer-label">{MONITOR_CAMPAIGN.slots}店舗限定・{monitorDeadlineLabel()}まで</div>
          <h2 className="pp-offer-h">無料モニター店舗を募集しています</h2>
          <ul className="pp-offer-points">
            <li>{monitorPlan.label}プラン（通常 月¥{monitorPlan.price}）を<b>{MONITOR_CAMPAIGN.months}か月無料</b>でお使いいただけます</li>
            <li>初期設定をお手伝いします</li>
            <li>期間が終わっても<b>自動で課金されることはありません</b>。続ける場合だけお申し込みください</li>
          </ul>
          <p className="pp-offer-note">導入事例づくりにご協力いただける店舗様を募集しています。応募後、30分のオンラインヒアリングの日程をご連絡します。</p>
          <a className="pp-btn pp-btn-light" href={`${SITE}${MONITOR_CAMPAIGN.applyPath}`} data-cta="monitor_apply">無料モニターに応募する</a>
        </section>
      )}

      <section className="pp-cta" id="contact" data-track-section="contact">
        <h2 className="pp-cta-h">まずは、30分だけお話ししませんか</h2>
        <p className="pp-cta-body">最後までお読みいただき、ありがとうございます。Finemeは、新しいお客様を追い続けるのではなく、一度来てくださったお客様との関係を大切にするお店のための仕組みです。オンラインで実際の画面をお見せしながら、貴店の場合の使い方をご説明します。日時はご都合に合わせます。</p>
        <div className="pp-cta-btns">
          <a className="pp-btn pp-btn-primary" href={INQUIRY_URL} data-cta="inquiry">オンライン相談を申し込む（無料）</a>
          <a className="pp-btn pp-btn-ghost" href={mailHref} data-cta="mail">メールで質問する</a>
          {demoHref && <a className="pp-btn pp-btn-ghost" href={demoHref} data-cta="demo">デモの管理画面を触ってみる</a>}
          <a className="pp-btn pp-btn-text" href={JOIN_URL} data-cta="join">料金・機能の詳細ページを見る</a>
        </div>
        <div className="pp-sign">
          <div className="pp-sign-name">Fineme 代表　渡邉英雄</div>
          <a href={`mailto:${CONTACT_EMAIL}`} data-cta="mail_sign">{CONTACT_EMAIL}</a>
          <div className="pp-sign-note">このメールへのご返信でも、お気軽にどうぞ</div>
        </div>
        <a className="pp-pdf-link pp-pdf-bottom" href={PDF_HREF} download={PDF_NAME} data-cta="pdf_bottom">この資料をPDFで保存する</a>
      </section>

      <footer className="pp-foot">Fineme</footer>

      <div className="pp-sticky">
        <a href={INQUIRY_URL} data-cta="sticky_inquiry">30分のオンライン相談（無料）</a>
      </div>
    </main>
  );
}
