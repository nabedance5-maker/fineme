// 店舗オーナー向けの提案資料（2026-11-21・渡邉依頼）。営業メールのリンクからだけ開く前提のページ。
// - URL は推測できない文字列（このフォルダ名）。サイト内のどこからもリンクしない・sitemap に入れない
// - noindex, nofollow（metadata ＋ next.config.mjs の X-Robots-Tag）。共通のナビ・フッターは出さない（Navbar.js / Footer.js）
// - URL は全員共通（店舗ごとの番号は付けない・2026-11-21 渡邉判断：手で番号を振る運用は使いづらい）。GA4 は app/layout.js の共通タグ＋ProposalFx のイベント
// 2026-11-21 改訂：Museの初稿をベースに、構成をセールスレター12ステップに組み直し、実際の機能・プラン区分・料金と照らして直した。
//   - 機能のプラン区分は lib/feature-flags.js と /provider/join の FEATURE_GROUPS に合わせる（休眠の個別声かけ＝B、カルテAI＝C 等）
//   - 「登録は無料で画面を触ってから」は事実と違う（月額は申込日から）。画面を見るのはオンライン相談・デモ・無料モニターで案内する
//   - リマインドは前日18時のLINE（app/api/cron/line-reminder）。料金は税込（lib/provider-plans.js）
// 2026-11-21 再改訂（渡邉指摘「LPと色が違う・文字だらけ」）：/provider/join と同じ墨色・真鍮色・明朝・紙面の世界観に揃え、
//   文章を削って図・動く画面イメージ・試算を中心にした。
// PDF は、このページを ?print=1（動きを止め、よくある質問を開き、期限つきのモニター募集を外した状態）で書き出したもの。文面を変えたら PDF も作り直す。
import './proposal.css';
import { PROVIDER_PLANS } from '@/lib/provider-plans';
import { MONITOR_CAMPAIGN, isMonitorOpen, monitorDeadlineLabel } from '@/lib/monitor-campaign';
import ProposalFx, { NoticeDemo, ReachDemo, AiDemo, RoiCalc } from './ProposalFx';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Fineme（ファインミ）ご提案資料' },
  description: '外見磨きの専門店のリピーターづくりを仕組み化する運営システム',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
  openGraph: null,
  referrer: 'no-referrer',
};

// PDF にしたときもリンクが本番を指すよう、絶対URLで書く
const SITE = 'https://www.fineme.me';
const JOIN_URL = `${SITE}/provider/join`;
const INQUIRY_URL = `${SITE}/provider/inquiry`;
const CONTACT_EMAIL = 'h_watanabe@fineme.me';
// デモ店舗に入る招待コード（運営管理画面のデモで「提案資料」用に発行したもの）。空のあいだはデモの案内を出さない
const DEMO_CODE = '';
const PDF_NAME = 'Fineme提案資料_店舗向け_2026-11-21.pdf';
const PDF_HREF = `/proposal/wCpBfIcypv0Zm5fvxvaR/${encodeURIComponent(PDF_NAME)}`;

// サイトのナビと同じ公式ロゴ（透過PNG・真鍮色。暗い面の上に置く）
const LOGO = '/assets/images/fineme-logo-final.png';

const PLAN_TAG = { A: '全プラン', B: 'スタンダード〜', C: 'プレミアム' };
const Tag = ({ p }) => <span className={`pp-tag pp-tag-${p}`}>{PLAN_TAG[p]}</span>;

function Head({ no, kicker, title, lead, center }) {
  return (
    <div className={`pp-head${center ? ' pp-center' : ''}`} data-reveal>
      <div className="pp-eyebrow"><span>{no}</span>{kicker}</div>
      <h2 className="pp-h2">{title}</h2>
      {lead && <p className="pp-lead">{lead}</p>}
    </div>
  );
}

function Feats({ items }) {
  return (
    <ul className="pp-feats" data-reveal>
      {items.map(([t, p]) => <li key={t}><span>{t}</span><Tag p={p} /></li>)}
    </ul>
  );
}

// 表紙の図：来店 → 間があく → 声かけ → また来店
function RhythmArt() {
  return (
    <svg className="pp-rhythm" viewBox="0 0 340 120" role="img" aria-label="来店が続いたあと間があき、声かけでまた来店する流れ">
      <line x1="16" y1="56" x2="168" y2="56" className="pp-r-line" />
      <line x1="168" y1="56" x2="276" y2="56" className="pp-r-gap" />
      <line x1="276" y1="56" x2="326" y2="56" className="pp-r-line" />
      {[30, 80, 130].map((x, i) => <circle key={x} cx={x} cy="56" r="7" className="pp-r-dot" style={{ '--i': i }} />)}
      <circle cx="226" cy="56" r="9" className="pp-r-ping" />
      <circle cx="226" cy="56" r="5" className="pp-r-bell" />
      <circle cx="300" cy="56" r="8" className="pp-r-back" />
      <text x="80" y="92" className="pp-r-t">来店</text>
      <text x="190" y="92" className="pp-r-t pp-r-t-dim">間があく</text>
      <text x="226" y="30" className="pp-r-t pp-r-t-gold">声かけ</text>
      <text x="300" y="92" className="pp-r-t pp-r-t-gold">また来店</text>
    </svg>
  );
}

// 漏れるバケツ：新規を入れても、2回目がないと出ていく
function BucketArt() {
  return (
    <svg className="pp-bucket" viewBox="0 0 300 244" role="img" aria-label="新しいお客様を入れても、2回目につながらず底から抜けていくバケツの図">
      <text x="150" y="16" className="pp-b-t">新しいお客様</text>
      {[120, 150, 180].map((x, i) => <circle key={x} cx={x} cy="34" r="6" className="pp-b-in" style={{ '--i': i }} />)}
      <path d="M70 78 L230 78 L208 196 L92 196 Z" className="pp-b-body" />
      <ellipse cx="150" cy="78" rx="80" ry="10" className="pp-b-rim" />
      <path d="M86 168 Q150 154 214 168 L208 196 L92 196 Z" className="pp-b-water" />
      {[118, 150, 182].map((x, i) => <circle key={x} cx={x} cy="200" r="5" className="pp-b-out" style={{ '--i': i }} />)}
      <text x="150" y="240" className="pp-b-t pp-b-t-warn">2回目につながらず、抜けていく</text>
    </svg>
  );
}

// リピートの輪：気づく → 声をかける → 次回につなげる
function LoopArt() {
  const nodes = [
    { x: 150, y: 46, g: '気', t: '気づく' },
    { x: 240, y: 202, g: '声', t: '声をかける' },
    { x: 60, y: 202, g: '次', t: '次回につなげる' },
  ];
  return (
    <svg className="pp-loopart" viewBox="0 0 300 290" role="img" aria-label="気づく、声をかける、次回につなげる、を繰り返す輪">
      <circle cx="150" cy="150" r="104" className="pp-l-ring" />
      <g className="pp-l-orbit"><circle cx="150" cy="46" r="6" className="pp-l-runner" /></g>
      <text x="150" y="140" className="pp-l-c">人の記憶だけだと</text>
      <text x="150" y="162" className="pp-l-c pp-l-c-warn">最初の「気づく」で</text>
      <text x="150" y="182" className="pp-l-c pp-l-c-warn">漏れる</text>
      {nodes.map((n, i) => (
        <g key={n.t} className="pp-l-node" style={{ '--i': i }}>
          <circle cx={n.x} cy={n.y} r="28" />
          <text x={n.x} y={n.y + 8} className="pp-l-g">{n.g}</text>
          <text x={n.x} y={n.y + 50} className="pp-l-t">{n.t}</text>
        </g>
      ))}
    </svg>
  );
}

// Finemeの中身：ばらばらだったものを1か所に
function HubArt() {
  const nodes = [
    { g: '予', t: '予約' }, { g: '客', t: 'カルテ' }, { g: '券', t: '回数券・会員' },
    { g: '信', t: 'LINE・メール' }, { g: '決', t: '決済・売上' }, { g: '談', t: 'AIコンサル' },
  ];
  const cx = 170, cy = 155, rx = 124, ry = 100;
  return (
    <svg className="pp-hub" viewBox="0 0 340 310" role="img" aria-label="予約・カルテ・回数券と会員・LINEとメール・決済と売上・AIコンサルが、Finemeの1か所につながる図">
      {nodes.map((n, i) => {
        const a = (-90 + i * 60) * Math.PI / 180;
        const x = Math.round(cx + rx * Math.cos(a)), y = Math.round(cy + ry * Math.sin(a));
        return (
          <g key={n.t} className="pp-hub-node" style={{ '--i': i }}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="pp-hub-line" pathLength="100" />
            <circle cx={x} cy={y} r="24" />
            <text x={x} y={y + 7} className="pp-hub-g">{n.g}</text>
            <text x={x} y={y + (y > cy ? 42 : -32)} className="pp-hub-t">{n.t}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="42" className="pp-hub-core" />
      <text x={cx} y={cy + 6} className="pp-hub-core-t">Fineme</text>
    </svg>
  );
}

// 今の予約サイトとCSVから、Finemeへ集まる
function CoexistArt() {
  return (
    <div className="pp-flow" data-reveal role="img" aria-label="今の予約サイトの予約と、今の顧客データのCSVが、Finemeのカレンダーとカルテに集まる図">
      <div className="pp-flow-src">
        <div className="pp-flow-box"><span className="fm-seal pp-seal-sm">予</span><div>今の予約サイト<small>窓口はそのまま</small></div></div>
        <div className="pp-flow-box"><span className="fm-seal pp-seal-sm">表</span><div>今の顧客データ<small>CSVで取り込み</small></div></div>
      </div>
      <div className="pp-flow-pipe" aria-hidden="true"><i /></div>
      <div className="pp-flow-dst">
        <div className="pp-flow-brand">Fineme</div>
        <ul><li>カレンダー</li><li>カルテ</li><li>回数券の残り</li><li>会員プラン</li></ul>
        <small>リピートづくりは、ここで</small>
      </div>
    </div>
  );
}

const BEFORE_AFTER = [
  ['記憶で思い出す', '条件ひとつで一覧に'],
  ['文面を毎回ゼロから', 'AIの下書きを確認して送る'],
  ['前日に一人ずつ連絡', '前日18時にLINEで自動'],
  ['回数券は紙やメモ', '予約のたびに自動で消化'],
  ['売上は手で集計', '予約・決済から自動で集計'],
];

const WORRIES = [
  { g: '去', h: '気づいたら、来なくなっていた' },
  { g: '探', h: '誰が・いつから来ていないか分からない' },
  { g: '忙', h: '声をかけたいが、手が回らない' },
  { g: '散', h: '回数券・誕生日・予約がバラバラ' },
];

const VISIT_FLOW = [
  { k: '来店前', h: '前回の記録と「今日聞くこと」', p: 'A' },
  { k: '会計', h: 'お客様ごとの「次回予約の一言」', p: 'A' },
  { k: '前日18時', h: 'LINEで自動リマインド・返信で来店確認', p: 'A' },
  { k: '毎月', h: '次回予約率・2回目来店率をスタッフ別に', p: 'A' },
];

const OPS = [
  { g: '予', h: '予約の受け方を選べる', d: '即確定／リクエスト承認／LINE', p: 'A' },
  { g: '頁', h: '予約ウィジェット・公開ページ', d: '自社サイトにそのまま置ける', p: 'A' },
  { g: '決', h: 'オンライン決済・売上', d: '請求書・デポジット・月次レポート', p: 'A' },
  { g: '券', h: '回数券・会員プラン', d: '月会費の自動課金・オンライン入会', p: 'B' },
  { g: '勤', h: 'シフト・勤怠', d: '希望の提出から打刻まで', p: 'B' },
  { g: '物', h: 'POS・物販・在庫', d: 'レジ締め・仕入・棚卸し', p: 'C' },
];

const STEPS = [
  { h: 'お申し込み', d: 'プランを選ぶ。迷ったら先にオンライン相談で画面を' },
  { h: '最初の質問に答える', d: 'お店に合う機能と初期設定をAIが準備。今のお客様はCSVで' },
  { h: '運用スタート', d: 'まず「来店の目安を過ぎたお客様」の確認から' },
];

const FAQ = [
  ['小さな店（ひとりサロン）でも使えますか？', 'はい。Finemeは個人〜小規模の専門店を想定して作っています。お客様が少ないうちからカルテを貯めておくほど、リピートの仕組みが効いてきます。'],
  ['今の予約サイトと併用できますか？', 'できます。乗り換えは前提ではありません。他の予約サイトから入った予約は、お店の予約入力からFinemeのカレンダーに登録できるので、予約とお客様の記録を1か所にまとめられます。'],
  ['今のお客様の情報は移せますか？', '顧客・予約や来店の履歴・回数券の残り・会員プランを、CSVで取り込めます。列の割り振りはAIが下書きし、お店が確認してから取り込みます。'],
  ['料金は月額以外にかかりますか？', '初期費用・登録料はかかりません（登録料は当面の間無料）。お客様がFineme経由でオンライン決済したときだけ、決済額の4.5%（カード会社の手数料込み）が入金額から差し引かれます。予約そのものの手数料はありません。'],
  ['月額料金はいつから発生しますか？', 'プランをお申し込みいただいた日からです。お申し込みの前に画面を見たい場合は、オンライン相談で実際の画面をお見せします。'],
  ['プランの変更や解約はできますか？', 'プランはいつでも切り替えられます。解約は月末までにお手続きいただくと、翌月から課金が止まります（当月分の返金はありません）。'],
  ['電話予約には対応していますか？', '電話を受ける機能はありません。電話で受けた予約は、お店の予約入力からカレンダーに登録できます。'],
  ['お店の公式LINEを持っていなくても使えますか？', '使えます。ライト・スタンダードでは、予約やリマインドがFinemeの公式LINEから届きます。プレミアムでは、お店独自の公式LINEから送れます。メールでの配信は全プランで使えます。'],
  ['機能が多くて、難しくなりませんか？', '最初の質問に答えると、お店に合う機能だけがオンの状態で始まります。使わない機能はいつでもオフにでき、必要になったら後から足せます。'],
];

export default async function ProposalPage(props) {
  const sp = (await props.searchParams) || {};
  const print = sp.print === '1';
  const monitorOpen = isMonitorOpen() && !print;
  const monitorPlan = PROVIDER_PLANS.find(p => p.label === MONITOR_CAMPAIGN.planLabel);
  const stdPlan = PROVIDER_PLANS.find(p => p.key === 'B');
  const mailSubject = encodeURIComponent('Fineme提案資料を読みました');
  const mailBody = encodeURIComponent(`Fineme 渡邉様\n\n提案資料を拝見しました。\n\n店舗名：\nお名前：\nご相談したいこと：\n`);
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
  const demoHref = DEMO_CODE ? `${SITE}/demo?code=${encodeURIComponent(DEMO_CODE)}` : '';

  return (
    <main className={`pp${print ? ' pp-print' : ''}`}>
      <ProposalFx />

      {/* 表紙 */}
      <header className="pp-cover" data-track-section="cover">
        <div className="pp-wrap pp-cover-grid">
          <div>
            <div className="pp-brand pp-rise"><img src={LOGO} alt="Fineme" width="1408" height="768" className="pp-logo" /><span>ご提案資料</span></div>
            <h1 className="pp-h1 pp-rise" style={{ '--d': '120ms' }}>いま通ってくれているお客様を、<br className="pp-br" /><em>離さない</em>仕組み。</h1>
            <p className="pp-cover-sub pp-rise" style={{ '--d': '240ms' }}>外見磨きの専門店のための、リピーターづくりの運営システム</p>
            <ul className="pp-facts pp-rise" style={{ '--d': '360ms' }}>
              <li><b>¥5,000〜</b><span>月額・税込</span></li>
              <li><b>0円</b><span>初期費用</span></li>
              <li><b>併用OK</b><span>今の予約サイト</span></li>
            </ul>
          </div>
          <div className="pp-cover-art pp-rise" style={{ '--d': '480ms' }}>
            <RhythmArt />
            <p>来なくなる前に気づいて、声をかける。<br />それを、仕組みに任せます。</p>
          </div>
        </div>
        <div className="pp-wrap pp-cover-meta">
          <span>読む時間 約4分</span>
          <a className="pp-pdf-link" href={PDF_HREF} download={PDF_NAME} data-cta="pdf_top">PDFで保存する</a>
        </div>
      </header>

      {/* 01 悩み */}
      <section className="pp-sec pp-paper" id="worry" data-track-section="worry">
        <div className="pp-wrap">
          <Head no="01" kicker="よくあるお悩み" title="こんなこと、ありませんか" />
          <div className="pp-worries">
            {WORRIES.map((w, i) => (
              <div className="pp-worry" key={w.g} data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="pp-worry-g" aria-hidden="true">{w.g}</span>
                <h3>{w.h}</h3>
              </div>
            ))}
          </div>
          <p className="pp-note-line" data-reveal>技術や接客の問題ではありません。「思い出してもらう接点」がなかっただけ、がほとんどです。</p>
        </div>
      </section>

      {/* 02 痛み */}
      <section className="pp-sec" id="pain" data-track-section="pain">
        <div className="pp-wrap pp-split">
          <Head no="02" kicker="そのままにすると" title="新規を増やしても、2回目がなければ毎月ゼロから"
            lead="広告や値引きでお客様を呼んでも、底が抜けていれば溜まりません。" />
          <div data-reveal><BucketArt /></div>
        </div>
        <div className="pp-wrap pp-pain-chips" data-reveal>
          <span><b>忙しいほど後回し</b>いちばん戻りやすい時期が過ぎる</span>
          <span><b>店主の頭の中だけ</b>休めない・任せられない</span>
        </div>
      </section>

      {/* 03 本当の理由 */}
      <section className="pp-sec pp-paper" id="cause" data-track-section="cause">
        <div className="pp-wrap pp-split pp-split-rev">
          <Head no="03" kicker="本当の理由" title="努力不足ではなく、「仕組み」がないだけ"
            lead="リピートづくりは、この3つの繰り返しです。最初の「気づく」を人の記憶に頼るから、漏れます。" />
          <div data-reveal><LoopArt /></div>
        </div>
      </section>

      {/* 04 Finemeとは */}
      <section className="pp-sec pp-ink-2" id="solution" data-track-section="solution">
        <div className="pp-wrap">
          <Head no="04" kicker="Finemeとは" center title="「来なくなるお客様」を防ぐ、お店の運営システム"
            lead="ばらばらだったものを1か所に。いま声をかけるべきお客様と、その文案はAIが出します。" />
          <div className="pp-hub-wrap" data-reveal><HubArt /></div>
          <div className="pp-ba" data-reveal>
            <div className="pp-ba-head"><span>これまで</span><span>Finemeなら</span></div>
            {BEFORE_AFTER.map(([b, a], i) => (
              <div className="pp-ba-row" key={b} style={{ '--d': `${i * 120}ms` }}>
                <span className="pp-ba-b">{b}</span><i aria-hidden="true" /><span className="pp-ba-a">{a}</span>
              </div>
            ))}
          </div>
          <p className="pp-note-line pp-note-dark" data-reveal>新しいお客様を連れてくる広告ではなく、今のお客様に通い続けてもらうための仕組みです。</p>
        </div>
      </section>

      {/* 05 気づく */}
      <section className="pp-sec pp-paper" id="notice" data-track-section="notice">
        <div className="pp-wrap pp-trio">
            <Head no="05" kicker="仕組み1　気づく" title="「来ていないお客様」が、一覧で見える"
              lead="条件を押すだけ。前回の施術や会話のメモも残るので、久しぶりの方にも前回の続きから話せます。" />
            <div className="pp-trio-vis" data-reveal><NoticeDemo /></div>
            <Feats items={[
              ['来店の目安を過ぎた・休眠・誕生月・回数券ありで絞り込み', 'A'],
              ['カルテに来店履歴・施術・会話のメモ（項目は自由）', 'A'],
              ['休眠とみなす日数をお店ごとに設定（はじめは90日）', 'B'],
              ['カルテから、AIがお客様ごとの傾向と次回の提案', 'C'],
            ]} />

        </div>
      </section>

      {/* 06 声をかける */}
      <section className="pp-sec" id="reach" data-track-section="reach">
        <div className="pp-wrap pp-trio pp-trio-rev">
            <Head no="06" kicker="仕組み2　声をかける" title="届いたメッセージから、そのまま予約"
              lead="「思い出したけど、予約は面倒」をなくします。予約までは1タップです。" />
            <div className="pp-trio-vis" data-reveal><ReachDemo /></div>
            <Feats items={[
              ['LINE・メールの一斉配信（日時指定・開封とクリックも分かる）', 'A'],
              ['宛先を「休眠」「目安を過ぎた」「誕生月」などで選ぶ', 'A'],
              ['休眠のお客様お一人ずつに、予約ボタン付きの声かけ', 'B'],
              ['来店後のクチコミのお願いを自動で', 'B'],
            ]} />

        </div>
      </section>

      {/* 07 次回につなげる */}
      <section className="pp-sec pp-paper" id="rebook" data-track-section="rebook">
        <div className="pp-wrap">
          <Head no="07" kicker="仕組み3　次回につなげる" center title="次の予約がいちばん入るのは、会計の瞬間"
            lead="その一言を、忙しい日でも言いそびれないように。" />
          <ol className="pp-visit">
            {VISIT_FLOW.map((v, i) => (
              <li key={v.k} data-reveal style={{ '--d': `${i * 140}ms` }}>
                <span className="pp-visit-dot">{i + 1}</span>
                <span className="pp-visit-top"><span className="pp-visit-k">{v.k}</span><Tag p={v.p} /></span>
                <b>{v.h}</b>
              </li>
            ))}
          </ol>
          <div className="pp-gauges" data-reveal>
            {[['次回予約率', 64], ['2回目来店率', 52]].map(([t, v]) => (
              <div className="pp-gauge" key={t} style={{ '--v': v }}>
                <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" className="bg" /><circle cx="60" cy="60" r="50" className="fg" pathLength="100" /></svg>
                <div><b>{v}%</b><span>{t}</span></div>
              </div>
            ))}
            <p className="pp-gauge-note">スタッフ別に自動で集計（画面イメージ・数値は例）</p>
          </div>
        </div>
      </section>

      {/* 08 日々の運営 */}
      <section className="pp-sec" id="ops" data-track-section="ops">
        <div className="pp-wrap">
          <Head no="08" kicker="日々の運営" center title="予約から回数券、売上まで、ひとつに"
            lead="「回数券の残りはどこ？」「月末の集計がつらい」をなくします。" />
          <div className="pp-ops">
            {OPS.map((o, i) => (
              <div className="pp-op" key={o.h} data-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
                <span className="fm-seal pp-seal">{o.g}</span>
                <b>{o.h}</b>
                <small>{o.d}</small>
                <Tag p={o.p} />
              </div>
            ))}
          </div>
          <p className="pp-note-line pp-note-dark" data-reveal>お店独自の公式LINEからの配信は <Tag p="C" /> 。それ以外のプランでは、Finemeの公式LINEから届きます。</p>
        </div>
      </section>

      {/* 09 AI専属コンサル */}
      <section className="pp-sec pp-ai-sec" id="ai" data-track-section="ai">
        <div className="pp-wrap pp-trio">
            <Head no="09" kicker="AI専属コンサル・全プラン" title="数字の見張り役は、AIに"
              lead="仕組みを入れても、見張る人がいないと続きません。そこをAIが担います。" />
            <div className="pp-trio-vis" data-reveal><AiDemo /></div>
            <ul className="pp-ai-points" data-reveal>
              <li><b>指標をひとつ</b>今の値・目標・期限を数字で</li>
              <li><b>やることを分解</b>今週・今月・3か月の節目と毎日のタスク</li>
              <li><b>そのまま実行</b>声かけの文案づくりからLINEの送信まで</li>
              <li><b>どこからでも相談</b>管理画面のチャットで</li>
            </ul>

        </div>
      </section>

      {/* 10 乗り換え不要 */}
      <section className="pp-sec pp-paper" id="coexist" data-track-section="coexist">
        <div className="pp-wrap">
          <Head no="10" kicker="乗り換え不要" center title="今の予約サイトは、そのままで"
            lead="窓口は今のまま。顧客管理とリピートづくりだけ、Finemeに置けます。" />
          <CoexistArt />
        </div>
      </section>

      {/* 11 費用 */}
      <section className="pp-sec" id="price" data-track-section="price">
        <div className="pp-wrap">
          <Head no="11" kicker="費用" center title="お一人戻れば、元が取れる"
            lead={`客単価8,000円のお店なら、月にお一人戻るだけで${stdPlan.label}（月${stdPlan.price}円）を上回ります。`} />
          <div data-reveal><RoiCalc planPrice={Number(stdPlan.price.replace(/,/g, ''))} planLabel={stdPlan.label} /></div>
          <div className="pp-plans">
            {PROVIDER_PLANS.map((pl, i) => (
              <div className={`pp-plan${pl.highlight ? ' pp-plan-hi' : ''}`} key={pl.key} data-reveal style={{ '--d': `${i * 100}ms` }}>
                {pl.badge && <div className="pp-plan-badge">{pl.badge}</div>}
                <div className="pp-plan-name">{pl.label}</div>
                <div className="pp-plan-price">¥{pl.price}<small>／月・税込</small></div>
                <div className="pp-plan-fit">{pl.fit}</div>
                <ul>{pl.items.map(it => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
          <ul className="pp-fees" data-reveal>
            <li><b>0円</b>初期費用・登録料（当面の間無料）</li>
            <li><b>4.5%</b>Fineme経由のオンライン決済のときだけ（カード手数料込み）</li>
            <li><b>0円</b>予約の手数料</li>
          </ul>
          <p className="pp-fine" data-reveal>月額はお申し込みの日から。解約は月末までのお手続きで翌月から止まります（当月分の返金はありません）。</p>
        </div>
      </section>

      {/* 12 始め方 */}
      <section className="pp-sec pp-paper" id="start" data-track-section="start">
        <div className="pp-wrap">
          <Head no="12" kicker="始め方" center title="始め方は、3ステップ" lead="いきなり全部を変える必要はありません。" />
          <ol className="pp-steps">
            {STEPS.map((st, i) => (
              <li key={st.h} data-reveal style={{ '--d': `${i * 160}ms` }}>
                <span className="pp-step-n">{i + 1}</span>
                <b>{st.h}</b>
                <span>{st.d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 13 よくあるご不安 */}
      <section className="pp-sec pp-paper pp-faq-sec" id="faq" data-track-section="faq">
        <div className="pp-wrap pp-narrow">
          <Head no="13" kicker="よくあるご不安" center title="始める前の、気になること" />
          <div className="pp-faq" data-reveal>
            {FAQ.map(([q, a]) => (
              <details key={q} open={print}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <p className="pp-fine pp-center">ここにない疑問も、このメールへのご返信でお気軽にどうぞ。</p>
        </div>
      </section>

      {monitorOpen && monitorPlan && (
        <section className="pp-sec pp-offer-sec" id="monitor" data-track-section="monitor">
          <div className="pp-wrap pp-narrow">
            <div className="pp-offer" data-reveal>
              <div className="pp-offer-label">{MONITOR_CAMPAIGN.slots}店舗限定・{monitorDeadlineLabel()}まで</div>
              <h2 className="pp-offer-h">無料モニター店舗を募集しています</h2>
              <div className="pp-offer-big"><span>{monitorPlan.label}プラン</span><b>{MONITOR_CAMPAIGN.months}か月 無料</b><small>通常 月¥{monitorPlan.price}</small></div>
              <ul className="pp-offer-points">
                <li>初期設定をお手伝いします</li>
                <li>期間後に自動で課金されることはありません</li>
              </ul>
              <a className="pp-btn pp-btn-gold" href={`${SITE}${MONITOR_CAMPAIGN.applyPath}`} data-cta="monitor_apply">無料モニターに応募する</a>
              <p className="pp-offer-note">導入事例づくりにご協力いただける店舗様を募集しています。応募後、30分のオンラインヒアリングの日程をご連絡します。</p>
            </div>
          </div>
        </section>
      )}

      {/* ご相談 */}
      <section className="pp-cta" id="contact" data-track-section="contact">
        <div className="pp-wrap pp-narrow pp-center">
          <img src={LOGO} alt="Fineme" width="1408" height="768" className="pp-logo-cta" data-reveal />
          <h2 className="pp-cta-h" data-reveal>まずは、30分だけ<br className="pp-br" />お話ししませんか</h2>
          <p className="pp-cta-body" data-reveal>実際の画面をお見せしながら、貴店の場合の使い方をご説明します。日時はご都合に合わせます。</p>
          <div className="pp-cta-btns" data-reveal>
            <a className="pp-btn pp-btn-gold pp-btn-xl" href={INQUIRY_URL} data-cta="inquiry">オンライン相談を申し込む（無料）</a>
            <a className="pp-btn pp-btn-ghost" href={mailHref} data-cta="mail">メールで質問する</a>
            {demoHref && <a className="pp-btn pp-btn-ghost" href={demoHref} data-cta="demo">デモの管理画面を触ってみる</a>}
            <a className="pp-btn-text" href={JOIN_URL} data-cta="join">料金・機能の詳細ページを見る</a>
          </div>
          <div className="pp-sign" data-reveal>
            <div className="pp-sign-name">Fineme 代表　渡邉英雄</div>
            <a href={`mailto:${CONTACT_EMAIL}`} data-cta="mail_sign">{CONTACT_EMAIL}</a>
            <div className="pp-sign-note">このメールへのご返信でも、お気軽にどうぞ</div>
          </div>
          <a className="pp-pdf-link pp-pdf-bottom" href={PDF_HREF} download={PDF_NAME} data-cta="pdf_bottom">この資料をPDFで保存する</a>
        </div>
      </section>

      <footer className="pp-foot"><img src={LOGO} alt="Fineme" width="1408" height="768" className="pp-logo-foot" /></footer>

      <div className="pp-sticky">
        <a className="pp-btn pp-btn-gold" href={INQUIRY_URL} data-cta="sticky_inquiry">30分のオンライン相談（無料）</a>
      </div>
    </main>
  );
}
