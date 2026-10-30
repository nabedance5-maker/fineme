import './join.css';
import { axisGlyph } from '@/lib/axis-glyph';
import { PROVIDER_PLANS as PLANS } from '@/lib/provider-plans';
import { RevealScope, HeroDemo, CountUp, RoiCalculator, StickyCta, IndustryTabs } from './JoinFx';

export const metadata = {
  title: 'いま通っているお客様を、離さない：Fineme 店舗向けのご案内',
  description: '予約・チケットと会員プラン・決済・顧客カルテ・LINEとメールの配信・スタッフと勤怠まで、お客様のリピートを作ることに特化した店舗運営SaaS。AI専属コンサルが次の一手を提案します。月額¥5,000から、予約の手数料なし。パーソナルジム・眉毛サロン・美容師・外見コンサルなど個人〜小規模店舗向け。',
  keywords: ['店舗 顧客管理 SaaS', 'パーソナルジム 予約 会員管理', '眉毛サロン 予約 リピート', '回数券 チケット 管理', '月会費 管理 ジム', 'AI 店舗コンサル', '休眠顧客 掘り起こし', 'シフト 勤怠 小規模店舗', '予約ウィジェット 自社サイト'],
  openGraph: {
    title: 'いま通っているお客様を、離さない | Fineme 店舗向けのご案内',
    description: '予約・チケット・会員プラン・決済・カルテ・配信・スタッフ管理をひとつに。AI専属コンサル付き、月額¥5,000から使えるリピート特化の店舗運営SaaSです。',
  },
};

const photo = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

const MARQUEE = ['AI専属コンサル', 'LINEで完結する予約', 'チケット・回数券', '会員プラン・月会費', 'オンライン決済', '顧客カルテ', 'LINE・メール配信', '休眠の掘り起こし', '体験→入会の追跡', 'アンケート', '予約ウィジェット', 'POS・レジ締め', 'スタッフ権限', 'シフト・勤怠', '月次レポート'];

// ② 悩み
const PROBLEMS = [
  { g: '去', h: '気づいたら、来なくなっている', p: '2回目の予約が入らないまま、半年たっていたお客様。離れたことにすら気づけないまま、毎月少しずつ常連が減っていきます。' },
  { g: '人', h: 'お客様のことが、自分の頭の中にしかない', p: '前回のメニュー、好み、気をつけること、回数券の残り。スタッフが増えるほど共有できず、担当が変わると関係も途切れます。' },
  { g: '時', h: '予約・連絡・お金の管理に追われる', p: '日程の往復、前日の確認、月会費の未払いの確認、売上の転記、シフトの取りまとめ。営業後の事務で一日が終わります。' },
  { g: '散', h: 'ツールがばらばらで、つながらない', p: '予約はこれ、決済はあれ、顧客はスプレッドシート、連絡は個人のLINE。数字を見ようとしても、どこにも全体が載っていません。' },
];

// ③ 痛みの増幅
const PAINS = [
  { n: '01', h: '新規を増やしても、穴から漏れていく', p: '新しいお客様を呼ぶ広告や値引きを続けても、2回目につながらなければ毎月ゼロからのやり直しです。' },
  { n: '02', h: '忙しいほど、常連への一言が後回しになる', p: '「そろそろ声をかけよう」と思ったまま、営業と事務で手が埋まる。いちばん戻りやすい時期は、そのあいだに過ぎていきます。' },
  { n: '03', h: '店主がいないと、回らない店になる', p: '顧客情報もシフトもお金の管理も一人に集まるほど、休めず、任せられず、店を大きくする余裕がなくなります。' },
];

// ⑥ お客様1人の流れ
const JOURNEY = [
  { t: '予約', d: 'お店のページ・自社サイト・LINEから。スタッフと部屋の空きから予約できる時間を自動で出します' },
  { t: '前日', d: '18時にリマインド。お客様は「行きます」「予定が変わりそう」を返信' },
  { t: '来店', d: '来店前に接客メモ、会計時に「次回の一言」。記録はカルテへ' },
  { t: '会計', d: 'チケットの消化、回数券・物販のお会計、月会費まで、売上は自動で集計' },
  { t: '間隔があく', d: '来店の目安を過ぎたお客様に、予約ボタン付きの声かけ' },
  { t: '続ける', d: '月会費・チケットの毎月付与、休会や変更の申請もお客様のマイページで' },
];

// ⑥ 場面別にできること（plan: その機能が使える最低プラン）
const FEATURE_GROUPS = [
  {
    g: '予', title: '予約', items: [
      ['LINEで完結する予約（承認・日時の提案・来店確認）', 'A'],
      ['空いている時間から即確定／希望日時を受けて承認を、お店ごとに選択', 'A'],
      ['自社サイトに置ける予約ウィジェット・店頭予約ボード', 'A'],
      ['前日18時のリマインドと、返信での来店確認', 'A'],
      ['スタッフ指名・部屋や設備の空き管理、指名なしは自動で割り当て', 'B'],
      ['定員制のグループレッスン', 'B'],
    ],
  },
  {
    g: '券', title: 'チケット・会員プラン', items: [
      ['チケット・回数券のオンライン販売と残数管理。使い切ったら同じ回数券の購入ページへ', 'B'],
      ['会員プラン（入会金・オプション・割引・クーポン、毎月のチケット自動付与）', 'B'],
      ['休会・プラン変更・退会をお客様がマイページから申請し、お店が承認', 'B'],
      ['月会費の支払い状況（支払いエラー・再請求・カード更新のお願い）', 'B'],
      ['QRチェックイン・出欠確認', 'B'],
      ['ロッカーの月極管理', 'C'],
    ],
  },
  {
    g: '決', title: '決済・会計', items: [
      ['オンライン決済・請求書・予約デポジット（手数料は決済額の4.5%のみ）', 'A'],
      ['売上管理・月ごとのレポート・顧客/予約/売上のCSV出力', 'A'],
      ['POS（施術・物販・割引、レジ締め、返品、レシート・領収書、仕入・棚卸し）', 'C'],
    ],
  },
  {
    g: '客', title: 'お客様との関係', items: [
      ['顧客カルテ（自由な項目・来店前の接客メモ・会計時の次回の一言）', 'A'],
      ['タグ・会員種別・よく使う絞り込みの保存', 'A'],
      ['LINE・メールの一斉配信（予約配信・開封とクリックの計測・配信停止）', 'A'],
      ['体験→入会の追跡、アンケート、お知らせ掲示、誕生日メッセージ', 'A'],
      ['休眠のお客様の掘り起こし・来店後のクチコミ依頼', 'B'],
      ['お店独自の公式LINEから送信・カルテのAI分析', 'C'],
    ],
  },
  {
    g: '働', title: 'スタッフ・運営', items: [
      ['スタッフごとのログインと、役割ごとの権限', 'A'],
      ['シフト（希望の提出と締切・自動作成・労働時間のチェック）', 'B'],
      ['勤怠（店頭タブレットで打刻・有給の申請と承認）', 'B'],
      ['操作ログ', 'C'],
    ],
  },
  {
    g: '談', title: 'AI専属コンサル', items: [
      ['最初の質問に答えるだけで、使う機能と初期設定を自動で準備', 'A'],
      ['予約・売上・来店間隔から「いま誰に何をするか」を提案し、文案づくりまで', 'A'],
      ['相談したいことをそのままチャットで', 'A'],
    ],
  },
];

const BEFORE_AFTER = [
  ['電話・DMで日程を往復調整', 'LINEのボタンで承認・日時の提案'],
  ['前日に一人ずつ確認の連絡', '18時に自動でリマインド、返信で来店確認'],
  ['回数券の残りを紙やメモで管理', 'チケットが予約時に自動で消化、残りはお客様にも見える'],
  ['月会費の未払いを通帳で確認', '支払いエラーを自動で検知し、再請求まで'],
  ['売上の手入力・転記・集計', '予約・決済・POSから自動で集計、CSV出力'],
  ['シフトの取りまとめとタイムカード', '希望の提出から自動作成、タブレットで打刻'],
];

const CATEGORIES = [
  ['gym', 'パーソナルジム', 'フリーランスPT・個人ジム'],
  ['eyebrow', '眉毛サロン', 'アイブロウスタイリスト'],
  ['hair', '美容室・美容師', 'フリーランス・個人サロン'],
  ['consulting', '外見コンサル', '外見・印象改善コンサル'],
  ['fashion', 'ファッション', 'パーソナルスタイリスト'],
  ['hairremoval', '脱毛サロン', 'メンズ脱毛'],
  ['aga', '薄毛ケア', '薄毛・頭皮ケア'],
  ['photo', '写真撮影・その他', 'プロフィール写真'],
];

const FAQ = [
  ['初期費用はかかりますか？', 'かかりません。登録料は当面の間無料で、お支払いは月額プランの料金だけです。'],
  ['月額料金はいつから発生しますか？', 'プランをお申し込みいただいた日からです。Finemeは新規のお客様を取ってくる広告ではなく、予約・決済・顧客管理・リピートのための店舗運営ツールなので、お使いいただく期間に応じて月額をいただいています。'],
  ['決済手数料はどんなときにかかりますか？', 'お客様がFineme経由でオンライン決済したときだけ、決済額の4.5%（カード会社の手数料込み）がかかり、入金額から差し引かれます。予約そのものの手数料はありません。'],
  ['いま使っている予約サイトと併用できますか？', '併用できます。他の予約サイトから入った予約は、お店の予約入力からFinemeのカレンダーに登録できるので、予約とお客様の記録を1か所にまとめられます。2回目以降のご予約は、お店のページやLINEから直接受けられます。'],
  ['会員さんは今まで通り予約できますか？', 'できます。お店のページの「会員」タブから、お持ちのチケットを選ぶとそのチケットで予約できるメニューと空き時間が出て、そのまま予約まで完了します。単発で予約するか、チケットを使うかもお客様が選べます。'],
  ['スタッフごとに見られる範囲を分けられますか？', 'できます。スタッフごとにログインを発行し、役割ごとに使える画面や操作を決められます。'],
  ['店舗の公式LINEを持っていなくても使えますか？', '使えます。Plan A・Bでは予約やリマインドがFineme公式LINEから届きます。Plan Cではお店独自の公式LINEから送れます。メールでの配信は全プランで使えます。'],
  ['機能が多くて、画面が複雑になりませんか？', '最初の質問に答えると、お店に合う機能だけがONの状態で始まります。使わない機能はいつでもOFFにでき、必要になったらあとから足せます。'],
  ['プランの変更や解約はできますか？', 'プランはいつでも切り替えられます。解約は月末までにお手続きいただくと、翌月から課金が停止します（当月分の返金はありません）。'],
];

function Seal({ children, size }) {
  return <span className={`fm-seal pj-seal ${size === 'lg' ? 'pj-seal-lg' : ''}`}>{children}</span>;
}

function MockTag() {
  return <span className="pj-mock-tag">画面イメージ</span>;
}

function PlanBadge({ plan }) {
  return <span className={`pj-plan-chip pj-plan-chip-${plan.toLowerCase()}`}>{plan === 'A' ? '全プラン' : `${plan}〜`}</span>;
}

export default async function ProviderJoinPage(props) {
  const searchParams = await props.searchParams;
  const ref = searchParams?.ref;
  const inquiryHref = ref ? `/provider/inquiry?ref=${encodeURIComponent(ref)}` : '/provider/inquiry';
  const industry = ['gym', 'brow'].includes(searchParams?.type) ? searchParams.type : null;

  return (
    <main className="pj">
      <RevealScope />
      <StickyCta href={inquiryHref} />

      {/* ① ヘッドライン */}
      <section className="pj-hero">
        <div className="pj-hero-glow" aria-hidden="true" />
        <div className="pj-container pj-hero-grid">
          <div className="pj-hero-copy">
            <div className="pj-chips pj-rise" style={{ '--d': '0ms' }}>
              <span className="pj-chip">リピート特化の店舗運営SaaS</span>
              <span className="pj-chip">AI専属コンサル付き</span>
            </div>
            <h1 className="pj-h1 pj-rise" style={{ '--d': '120ms' }}>
              <span className="pj-nb">新規集客の前に、</span><br />
              <em className="pj-gold"><span className="pj-nb">今のお客様を、</span><span className="pj-nb">離さない。</span></em>
            </h1>
            <p className="pj-lead pj-rise" style={{ '--d': '240ms' }}>
              予約、チケットと会員プラン、お会計、カルテ、声かけ、スタッフの管理まで。
              ばらばらだった道具をひとつにまとめ、AI専属コンサルが「いま誰に、何をするか」を教えてくれる店舗運営SaaSです。
            </p>
            <div className="pj-cta-row pj-rise" style={{ '--d': '360ms' }}>
              <a className="pj-btn pj-btn-gold pj-btn-lg" href={inquiryHref}>話を聞いてみる（無料）</a>
              <a className="pj-btn pj-btn-ghost pj-btn-lg" href="#industry">業種別にできることを見る</a>
            </div>
            <ul className="pj-trust pj-rise" style={{ '--d': '480ms' }}>
              <li>月額¥5,000から</li>
              <li>登録料0円（当面無料）</li>
              <li>予約の手数料0円</li>
            </ul>
          </div>
          <div className="pj-hero-visual pj-rise" style={{ '--d': '200ms' }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      <div className="pj-marquee" aria-hidden="true">
        <div className="pj-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="pj-marquee-item">{m}</span>
          ))}
        </div>
      </div>

      <section className="pj-stats">
        <div className="pj-container pj-stat-grid">
          <div className="pj-stat" data-reveal><div className="pj-stat-num"><CountUp to={5000} prefix="¥" /><small>〜/月</small></div><div className="pj-stat-label">月額プランはA・B・Cの3段階</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '80ms' }}><div className="pj-stat-num">0<small>円</small></div><div className="pj-stat-label">予約そのものの手数料</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '160ms' }}><div className="pj-stat-num"><CountUp to={4.5} decimals={1} /><small>%</small></div><div className="pj-stat-label">オンライン決済の手数料のみ</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '240ms' }}><div className="pj-stat-num"><CountUp to={100} /><small>+</small></div><div className="pj-stat-label">2026年10月に追加・改善した機能</div></div>
        </div>
      </section>

      {/* ② 悩み */}
      <section className="pj-paper">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Problem</div>
          <h2 className="pj-h2" data-reveal>こんなこと、ありませんか？</h2>
          <p className="pj-sec-lead" data-reveal>新しいお客様を呼ぶことより先に、いま通っているお客様と、毎日の業務で困っていることはありませんか。</p>
          <div className="pj-problem-grid">
            {PROBLEMS.map((x, i) => (
              <div key={x.h} className="pj-problem" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="pj-problem-glyph" aria-hidden="true">{x.g}</span>
                <h3>{x.h}</h3>
                <p>{x.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 痛みの増幅 */}
      <section className="pj-pain">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>If nothing changes</div>
          <h2 className="pj-h2" data-reveal>このままだと、何が起きるか</h2>
          <div className="pj-pain-grid">
            {PAINS.map((x, i) => (
              <div key={x.n} className="pj-pain-card" data-reveal style={{ '--d': `${i * 100}ms` }}>
                <span className="pj-pain-num">{x.n}</span>
                <h3>{x.h}</h3>
                <p>{x.p}</p>
              </div>
            ))}
          </div>
          <div className="pj-leak" data-reveal>
            <div className="pj-leak-text">
              <b>例えば、月に2人の常連が静かに離れると。</b>
              <span>客単価¥8,000・月1回来店のお客様なら、1年後には毎月¥192,000分の来店がなくなっている計算です。</span>
            </div>
            <div className="pj-leak-bars" aria-hidden="true">
              {[100, 92, 84, 76, 68, 60].map((h, i) => <span key={i} style={{ '--h': `${h}%`, '--i': i }} />)}
            </div>
          </div>
          <p className="pj-leak-note" data-reveal>※ 2人×12か月×¥8,000で試算。説明のための例です。</p>
        </div>
      </section>

      {/* ④ 原因 ⑤ 希望 */}
      <section className="pj-paper pj-paper-tight">
        <div className="pj-container">
          <div className="pj-statement" data-reveal>
            <p className="pj-statement-main">それは接客の問題ではありません。<br /><span className="pj-underline">仕組みの問題です。</span></p>
            <p className="pj-statement-sub">
              お客様が離れるのは、腕や人柄のせいではなく「声をかける時期」「次の予約」「記録の共有」が人の記憶に頼っているから。
              逆に言えば、仕組みにしてしまえば、戻ってくるお客様は偶然ではなく増やせます。
            </p>
          </div>
        </div>
      </section>

      {/* ⑥ 解決策 */}
      <section className="pj-dark pj-contour" id="tools">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Solution</div>
          <h2 className="pj-h2" data-reveal>お客様が戻ってくる仕組みと、<br className="pj-br-pc" />そのための時間を、同時につくる</h2>
          <p className="pj-sec-lead" data-reveal>新しいお客様がいなくても、申し込んだその日から使えます。最初の質問に答えると、お店に合う機能だけがONの状態で始まります。</p>

          <div className="pj-journey" data-reveal>
            <div className="pj-journey-title">お客様1人に、Finemeが自動でしていること</div>
            <ol className="pj-journey-list">
              {JOURNEY.map((j, i) => (
                <li key={j.t} style={{ '--i': i }}>
                  <span className="pj-journey-dot">{i + 1}</span>
                  <b>{j.t}</b>
                  <span>{j.d}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pj-feature" data-reveal>
            <div className="pj-feature-text">
              <Seal>談</Seal>
              <h4>AI専属コンサル</h4>
              <p>予約・売上・来店間隔などのお店のデータをAIが読み、「いま誰に声をかけるべきか」「どのメニューが伸びているか」を提案します。声かけの文案づくりや、相談したいことのチャットにも対応。全プランで使えます。</p>
            </div>
            <div className="pj-mock pj-mock-ai">
              <MockTag />
              <div className="pj-mock-title">今週の見立て</div>
              <div className="pj-mini-chart" aria-hidden="true">
                {[62, 70, 66, 74, 71, 58, 52, 47].map((h, i) => (
                  <span key={i} style={{ '--h': `${h}%`, '--i': i }} className={i >= 5 ? 'warn' : ''} />
                ))}
              </div>
              <div className="pj-mini-chart-cap"><span>週ごとの来店数</span><span className="warn">直近3週が減少</span></div>
              <div className="pj-ai-bubble">
                <span className="fm-seal pj-seal-sm">談</span>
                <p>2回目の来店がまだのお客様が<b>4名</b>います。初回から3週間以内の一言が、いちばん戻りやすい時期です。</p>
              </div>
              <div className="pj-mock-actions"><span className="pj-pill-gold">声かけ文案を作る</span><span className="pj-pill">4名を見る</span></div>
            </div>
          </div>

          <div className="pj-feature pj-feature-rev" data-reveal>
            <div className="pj-feature-text">
              <Seal>券</Seal>
              <h4>チケット・回数券・会員プラン</h4>
              <p>回数券も月額会員も「チケット」でまとめて管理。予約した時点でチケットを消化し、キャンセルすれば自動で戻ります。会員プランは入会金・オプション・クーポン・毎月のチケット付与まで設定でき、休会や変更の申請もお客様のマイページから届きます（Plan B以上）。</p>
            </div>
            <div className="pj-mock pj-mock-ticket">
              <MockTag />
              <div className="pj-ticket">
                <div className="pj-ticket-main">
                  <span className="pj-ticket-kicker">回数券</span>
                  <b>パーソナル 10回券</b>
                  <div className="pj-punches" aria-label="10回中7回利用">
                    {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < 7 ? 'used' : ''} style={{ '--i': i }} />)}
                  </div>
                  <span className="pj-ticket-sub">有効期限 2027年1月31日</span>
                </div>
                <div className="pj-ticket-stub"><span>残り</span><b>3</b><span>回</span></div>
              </div>
              <div className="pj-ticket pj-ticket-alt">
                <div className="pj-ticket-main">
                  <span className="pj-ticket-kicker">会員プラン</span>
                  <b>通い放題＋チケット4回</b>
                  <span className="pj-ticket-sub">毎月自動でお支払い｜毎月チケットを付与</span>
                </div>
                <div className="pj-ticket-stub pj-ticket-stub-alt"><span>月額</span><b className="pj-ticket-yen">¥14,800</b></div>
              </div>
            </div>
          </div>

          <div className="pj-feature" data-reveal>
            <div className="pj-feature-text">
              <Seal>再</Seal>
              <h4>休眠の掘り起こし・配信</h4>
              <p>来店の目安を過ぎたお客様を一覧にして、予約ボタン付きのメッセージで声かけ。LINEとメールの一斉配信は、日時を決めた予約配信や、開封・クリックの計測にも対応します。リマインドと誕生日メッセージは全プランで自動です。</p>
            </div>
            <div className="pj-mock pj-mock-list">
              <MockTag />
              <div className="pj-mock-title">来店の目安を過ぎたお客様</div>
              {[['佐藤 様', '68日前', '目安を26日超過', 'over'], ['鈴木 様', '54日前', '目安を12日超過', 'over'], ['高橋 様', '39日前', 'あと3日で目安', 'soon']].map(([n, d, s, c], i) => (
                <div key={n} className="pj-cust-row" style={{ '--i': i }}>
                  <span className="pj-cust-avatar">{n[0]}</span>
                  <div className="pj-cust-main"><b>{n}</b><span>最終来店 {d}</span></div>
                  <span className={`pj-chip-state ${c}`}>{s}</span>
                  <span className="pj-pill-gold pj-pill-sm">声かけ</span>
                </div>
              ))}
              <div className="pj-line-preview">
                <div className="pj-line-preview-head">LINEで送る内容</div>
                <p>佐藤様、前回から少し間が空きましたね。肩の調子はいかがですか？来週は火曜と木曜の夜に空きがあります。</p>
                <span className="pj-line-btn">予約する</span>
              </div>
            </div>
          </div>

          <div className="pj-feature pj-feature-rev" data-reveal>
            <div className="pj-feature-text">
              <Seal>記</Seal>
              <h4>顧客カルテ</h4>
              <p>来店履歴・担当・チケットの残り・会員プランを1画面に。お店ごとに自由な項目を足せて、来店前の接客メモと会計時の「次回の一言」で、誰が担当しても同じ接客ができます。Plan Cでは記録からAIが傾向と注意点を提案します。</p>
            </div>
            <div className="pj-mock pj-mock-karte">
              <MockTag />
              <div className="pj-karte-head">
                <span className="pj-cust-avatar pj-avatar-lg">田</span>
                <div><b>田中 様</b><span>来店 12回目｜担当 山本</span></div>
              </div>
              <dl className="pj-karte-fields">
                <div><dt>施術メモ</dt><dd>右肩に違和感あり。ストレッチ多めで。</dd></div>
                <div><dt>好み</dt><dd><span className="pj-opt on">静かめ</span><span className="pj-opt">会話多め</span><span className="pj-opt on">短時間</span></dd></div>
                <div><dt>満足度</dt><dd className="pj-stars" aria-label="5段階中4">★★★★<span>★</span></dd></div>
              </dl>
              <div className="pj-karte-ai">
                <span className="pj-karte-ai-tag">AI分析（Plan C）</span>
                <p>直近3回、肩の違和感の記録が続いています。次回はメニュー前に状態の確認を。</p>
              </div>
            </div>
          </div>

          <div className="pj-roi-wrap">
            <div className="pj-roi-head" data-reveal>
              <h3>休眠のお客様1人の呼び戻しで、月額は元が取れます。</h3>
              <p>単価と人数を動かして、戻ってくる売上を試算できます。</p>
            </div>
            <RoiCalculator />
          </div>

          <div className="pj-pillar-head pj-pillar-head-2" data-reveal>
            <span className="pj-pillar-num">2</span>
            <div>
              <h3 className="pj-pillar-title">毎日の業務を、仕組みに任せる</h3>
              <p className="pj-pillar-lead">手作業だった連絡・お金の管理・集計・シフトを任せて、空いた時間を接客とリピートのための一言に使えます。</p>
            </div>
          </div>

          <div className="pj-ba" data-reveal>
            <div className="pj-ba-head"><span>これまで</span><span>Finemeでは</span></div>
            {BEFORE_AFTER.map(([b, a], i) => (
              <div key={b} className="pj-ba-row" style={{ '--i': i }}>
                <span className="pj-ba-before"><s>{b}</s></span>
                <span className="pj-ba-arrow" aria-hidden="true" />
                <span className="pj-ba-after">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑥ 業種別 */}
      <section className="pj-paper" id="industry">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>By industry</div>
          <h2 className="pj-h2" data-reveal>業種別の使い方</h2>
          <p className="pj-sec-lead" data-reveal>同じ仕組みでも、効くところは業種によって違います。いちばん近いものを選んでください。</p>
          <IndustryTabs initial={industry} />
        </div>
      </section>

      {/* ⑥ できること一覧 */}
      <section className="pj-dark" id="features">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Features</div>
          <h2 className="pj-h2" data-reveal>できること一覧</h2>
          <p className="pj-sec-lead" data-reveal>ラベルは使えるプランです。機能はお店ごとにON/OFFでき、使うものだけが画面に並びます。</p>
          <div className="pj-fgroup-grid">
            {FEATURE_GROUPS.map((grp, gi) => (
              <div key={grp.title} className="pj-fgroup" data-reveal style={{ '--d': `${(gi % 3) * 80}ms` }}>
                <div className="pj-fgroup-head"><Seal>{grp.g}</Seal><h3>{grp.title}</h3></div>
                <ul>
                  {grp.items.map(([t, plan]) => (
                    <li key={t}><span>{t}</span><PlanBadge plan={plan} /></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑦ 得られる未来 */}
      <section className="pj-photo-band">
        <div className="pj-photo-grid" aria-hidden="true">
          <img src={photo('1622286342621-4bd786c2447c', 700)} alt="" loading="lazy" />
          <img src={photo('1517836357463-d25dfeac3438', 700)} alt="" loading="lazy" />
          <img src={photo('1503951914875-452162b0f3f1', 700)} alt="" loading="lazy" />
          <img src={photo('1604654894610-df63bc536371', 700)} alt="" loading="lazy" />
        </div>
        <div className="pj-photo-overlay">
          <div className="pj-container" data-reveal>
            <p className="pj-photo-kicker">空いた時間は</p>
            <h2 className="pj-photo-h">お客様と向き合う時間に。</h2>
            <p className="pj-photo-sub">前日の確認連絡、月会費の確認、売上の集計、シフトの取りまとめ。「毎回やる作業」を任せて、AI専属コンサルが示す「いま声をかけるべき人」への一言に時間を使えます。</p>
          </div>
        </div>
      </section>

      {/* ⑧ なぜできるか */}
      <section className="pj-dark pj-why">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Why it works</div>
          <h2 className="pj-h2" data-reveal>全部がひとつにつながっているから、<br className="pj-br-pc" />AIが「次の一手」を出せる</h2>
          <p className="pj-sec-lead" data-reveal>予約、チケット、お会計、カルテ、配信、スタッフ。別々のツールでは見えなかった「このお客様は、いつ・何を・どれだけ」が1か所に揃うので、声をかけるべき人と時期がはっきりします。</p>
          <div className="pj-hub" data-reveal>
            <div className="pj-hub-core"><span className="fm-seal pj-seal-sm">談</span><b>AI専属コンサル</b><span>いま誰に、何をするか</span></div>
            {[['予', '予約'], ['券', 'チケット・会員'], ['決', 'お会計・売上'], ['記', 'カルテ'], ['信', '配信・声かけ'], ['働', 'スタッフ・シフト']].map(([g, t], i) => (
              <div key={t} className="pj-hub-node" style={{ '--i': i }}><span className="pj-hub-glyph">{g}</span>{t}</div>
            ))}
          </div>

          <div className="pj-proof" data-reveal>
            <div className="pj-proof-num">100<small>+</small></div>
            <div>
              <b>現場の声で、毎週変わっていくシステムです。</b>
              <p>開業準備中のパーソナルジム経営者と毎週打ち合わせを重ね、2026年10月だけで100以上の機能を追加・改善しました。管理画面の「Finemeへのご意見」から届いた要望も、そのまま開発に反映します。</p>
            </div>
          </div>

          <div className="pj-upside">
            <div className="pj-upside-text" data-reveal>
              <div className="pj-eyebrow">Plus</div>
              <h3>掲載しておけば、新しい出会いも増えていく</h3>
              <p>
                Finemeには、外見の診断（Me Scan）を受けた「本気で変わりたい」人と、その分野が得意なお店をつなぐ仕組みもあります。
                正直にお伝えすると、ユーザー基盤はまだ育てている段階です。だからこそ新規のお客様を送ることは約束せず、今のお客様のための機能だけで元が取れる設計にしています。出会いは、その上に乗る伸びしろです。
              </p>
            </div>
            <ol className="pj-stepper pj-stepper-compact">
              {[['診', 'Me Scan', '8つの軸で、外見の現在地とゴールを測る'], ['針', 'Compass', 'いちばん効く「最初の一手」の軸を決める'], ['合', 'マッチング', 'その軸が得意で、ページが充実したお店に届く']].map(([g, l, d], i) => (
                <li key={l} data-reveal style={{ '--d': `${i * 110}ms` }}>
                  <Seal size="lg">{g}</Seal>
                  <span className="pj-step-label">{l}</span>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 対象業種 */}
      <section className="pj-dark pj-cats">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>対象業種</div>
          <h2 className="pj-h2" data-reveal>こんなお店に使われています</h2>
          <p className="pj-sec-lead" data-reveal>個人経営・フリーランス・小規模サロン、すべて歓迎です。</p>
          <div className="pj-cat-grid">
            {CATEGORIES.map(([k, n, d], i) => (
              <div key={k} className="pj-cat" data-reveal style={{ '--d': `${(i % 4) * 70}ms` }}>
                <span className="pj-cat-glyph" aria-hidden="true">{axisGlyph(k)}</span>
                <b>{n}</b>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑪ オファー・価格 */}
      <section className="pj-plans" id="plans">
        <div className="pj-container">
          <div className="pj-eyebrow pj-center" data-reveal>Plan</div>
          <h2 className="pj-h2 pj-center" data-reveal>料金プラン</h2>
          <p className="pj-sec-lead pj-center pj-narrow" data-reveal>登録料は当面無料。予約の手数料はありません。プランの違いは使える機能だけで、いつでも切り替えられます。</p>
          <div className="pj-plan-grid">
            {PLANS.map((pl, i) => (
              <div key={pl.name} className={`pj-plan ${pl.highlight ? 'pj-plan-hi' : ''}`} data-reveal style={{ '--d': `${i * 100}ms` }}>
                {pl.badge && <span className="pj-plan-badge">{pl.badge}</span>}
                <div className="pj-plan-name">{pl.name}<span>{pl.label}</span></div>
                <div className="pj-plan-price">¥{pl.price}<small> / 月（税込）</small></div>
                <p className="pj-plan-fit">{pl.fit}</p>
                <ul>
                  {pl.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
                <a className={`pj-btn ${pl.highlight ? 'pj-btn-gold' : 'pj-btn-ghost'} pj-plan-cta`} href={`${inquiryHref}${inquiryHref.includes('?') ? '&' : '?'}plan=${pl.key}`}>このプランで相談する</a>
              </div>
            ))}
          </div>

          <div className="pj-fee" data-reveal>
            <div className="pj-fee-head">
              <b>決済手数料は、全プラン共通で4.5%</b>
              <span>カード会社の手数料込み。入金額から差し引かれ、別途のご負担はありません。</span>
            </div>
            <div className="pj-fee-bar" aria-label="¥10,000の決済で、店舗への入金¥9,550、手数料¥450">
              <span className="pj-fee-in">店舗への入金 ¥9,550</span>
              <span className="pj-fee-cut">¥450</span>
            </div>
            <div className="pj-fee-cap">例：お客様が¥10,000をオンライン決済した場合</div>
          </div>

          <div className="pj-offer" data-reveal>
            <span className="fm-seal pj-seal">始</span>
            <p><b>お申し込みの日から、プランのすべての機能をすぐにお使いいただけます。</b>使ってみて足りない機能があれば、いつでも上のプランに切り替えられます。</p>
          </div>
          <p className="pj-plans-foot" data-reveal>今後の価格変更は事前に告知します。商談用の資料は<a href="/business/store-saas-pitch-deck.html">店舗SaaSご案内資料</a>をご覧ください。</p>
        </div>
      </section>

      {/* ⑩ よくある不安 */}
      <section className="pj-paper">
        <div className="pj-container pj-faq-wrap">
          <div>
            <div className="pj-eyebrow" data-reveal>FAQ</div>
            <h2 className="pj-h2" data-reveal>よくあるご質問</h2>
          </div>
          <div className="pj-faq">
            {FAQ.map(([q, a]) => (
              <details key={q} data-reveal>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 向き不向き */}
      <section className="pj-dark">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Fit Check</div>
          <h2 className="pj-h2" data-reveal>向いているお店 / 向いていないお店</h2>
          <div className="pj-two">
            <div className="pj-panel pj-panel-yes" data-reveal>
              <h3>Finemeに向いている</h3>
              <ul className="pj-checks">
                <li>今のお客様との関係をもっと大事にしたい</li>
                <li>回数券・会員・次の予約で、通い続けてもらう商売をしている</li>
                <li>予約・お金・顧客・スタッフの管理を1か所にまとめたい</li>
                <li>自分の仕事に誇りがあり、選ばれる理由を言葉にしたい</li>
              </ul>
            </div>
            <div className="pj-panel pj-panel-quiet" data-reveal style={{ '--d': '90ms' }}>
              <h3>向いていない</h3>
              <ul className="pj-crosses">
                <li>値引きでの集客だけをしたい</li>
                <li>新規のお客様の送客だけを期待している</li>
                <li>お店のページやメニューを整える気がない</li>
              </ul>
            </div>
          </div>
          <p className="pj-partner-note" data-reveal>
            Finemeを他のお店に紹介すると報酬が受け取れる制度もあります。<a href="/sales-partner">営業パートナー制度について</a>
          </p>
        </div>
      </section>

      {/* ⑫ CTA */}
      <section className="pj-final" id="pj-final">
        <div className="pj-final-compass" aria-hidden="true" />
        <div className="pj-container pj-final-inner" data-reveal>
          <div className="pj-eyebrow pj-center">最後に</div>
          <p className="pj-final-body">
            いま通ってくれているお客様は、お店がいちばん大事にしてきた財産です。<br className="pj-br-pc" />
            その関係を、記憶と気合いではなく、仕組みで守りませんか。
          </p>
          <h2 className="pj-final-h">まずは、お店の今の困りごとを<br className="pj-br-pc" />聞かせてください。</h2>
          <a className="pj-btn pj-btn-gold pj-btn-xl" href={inquiryHref}>話を聞いてみる（無料）</a>
          <p className="pj-final-note">無理な勧誘は一切ありません。合わない場合は正直にお伝えします。</p>
        </div>
      </section>
    </main>
  );
}
