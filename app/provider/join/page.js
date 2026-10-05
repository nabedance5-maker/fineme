import './join.css';
import { axisGlyph } from '@/lib/axis-glyph';
import { RevealScope, HeroDemo, CountUp, RoiCalculator, StickyCta } from './JoinFx';

export const metadata = {
  title: 'いま抱えているお客様を、逃さない：Fineme 店舗向け掲載のご案内',
  description: 'AI専属コンサル・LINEで完結する予約・オンライン決済・回数券と会員プラン・顧客カルテ・休眠顧客の掘り起こしまで、お客様のリピートを作る店舗運営SaaS。月額¥5,000から、予約の手数料なし。パーソナルジム・眉毛サロン・美容師・外見コンサルなど、個人・フリーランス向け。',
  keywords: ['店舗 顧客管理 SaaS', '予約 決済 一体 サロン', 'AI 店舗コンサル', 'リピート対策 サロン', '休眠顧客 掘り起こし', 'パーソナルジム 顧客管理', '美容室 予約リマインド 自動化', '個人事業主 集客', '店舗公式LINE 予約管理'],
  openGraph: {
    title: 'いま抱えているお客様を、逃さない | Fineme 店舗向け掲載のご案内',
    description: 'AI専属コンサル・LINE予約・オンライン決済・顧客カルテ・休眠顧客の掘り起こし。月額¥5,000から使えるリピート特化の店舗運営SaaSです。',
  },
};

const photo = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

const MARQUEE = ['AI専属コンサル', 'LINE予約', '即時予約', 'オンライン決済', '請求書', '顧客カルテ', '回数券', '会員プラン', 'クラス予約', 'QRチェックイン', '休眠掘り起こし', 'クチコミ依頼', 'スタッフ指名', 'シフト管理', '売上管理', 'POS・在庫', '誕生日メッセージ', '操作ログ'];

const PROBLEMS = [
  { g: '人', h: '顧客管理が属人的', p: '常連の来店タイミング・好み・注意点が、スタッフの頭の中にしかありません。' },
  { g: '去', h: '気づいたら来なくなっている', p: '休眠したお客様を追いきれず、離れたことにすら気づけないまま時間が過ぎます。' },
  { g: '時', h: '予約・連絡・請求に追われて、手が回らない', p: '日程調整、前日の確認連絡、請求と入金確認、売上の転記。事務に時間を取られて、お客様と向き合う時間とリピートのための施策に手が回りません。' },
  { g: '割', h: 'クーポン目当てのお客様ばかり', p: '値引き前提の比較は価値を削り、本来の魅力を伝え切れません。' },
];

const BEFORE_AFTER = [
  ['電話・DMで日程を往復調整', 'LINEのボタンで承認・日時の提案'],
  ['前日に一人ずつ確認の連絡', 'リマインドを自動配信、返信で来店確認'],
  ['請求書の作成と入金の確認', 'リンクを送れば、入金も自動で記録'],
  ['売上の手入力・転記・集計', '予約・決済から自動で集計、CSV出力'],
  ['シフトの取りまとめと二重予約の確認', 'スタッフが提出、空き枠に自動で反映'],
  ['「あのお客様、前回いつ来たっけ」', '来店履歴がカルテに自動で残る'],
];

const JOURNEY = [
  { t: '予約', d: 'LINEで届いたリクエストを、ボタンひとつで承認' },
  { t: '前日', d: 'リマインドを自動配信。お客様は返信で来店を確認' },
  { t: '来店', d: 'カルテに記録が残り、売上も自動で集計' },
  { t: '来店後', d: 'クチコミのお願いを自動でお送り（Plan B〜）' },
  { t: '間隔があく', d: '来店の目安を過ぎたお客様をお知らせ、声かけへ（Plan B〜）' },
  { t: '誕生日', d: 'お祝いのメッセージを自動でお届け' },
];

const OPS_FEATURES = [
  { g: '予', h: '予約のやり取りがLINEで完結', p: 'お客様は普段のLINEトークから予約。店舗は承認・代替日時の提案・来店確認まで、その場のボタン操作で返せます。空き枠から即確定する方式と、希望日時を受けて承認する方式を店舗ごとに選べます。' },
  { g: '決', h: 'オンライン決済・請求', p: '予約デポジット、請求書のカード決済までFinemeの中で完結。代金は店舗の口座へ直接入金され、集計は売上管理に自動で反映されます。決済手数料は一律4.5%で、予約そのものの手数料はありません。' },
  { g: '指', h: 'スタッフ指名・シフト管理', p: '指名予約と指名料、シフト表の作成と提出、部屋・設備の空き管理に対応。担当したお客様のリピート率・指名率も自動で見える化されます（Plan B以上）。' },
  { g: '売', h: '売上管理・POS・在庫', p: 'メニュー別・スタッフ別・支払い方法別の自動集計とCSV出力、LTV・CAC概算を全プランで。物販のレジ会計と在庫管理、操作ログはPlan Cで使えます。' },
];

const SCAN_STEPS = [
  { g: '診', label: 'STEP 1 — Me Scan', title: 'ユーザーは外見診断を受ける', desc: '体型・眉・服・髪・肌・脱毛・歯・爪の8軸で現在地とゴールを測定。恋愛・対人・就活・自己投資など、動機も記録します。' },
  { g: '図', label: 'STEP 2 — New Me Navi', title: '変容プロファイルが生成される', desc: '8軸レーダーチャートと変容ベクトルが可視化された「自分だけの地図」。これがマッチングの起点です。' },
  { g: '針', label: 'STEP 3 — Fineme Compass', title: '「最初の一手」が決まる', desc: '8軸の優先順位から「今のあなたに最も効く軸」が導き出され、その軸のガイドを探します。' },
  { g: '合', label: 'STEP 4 — 総合マッチング', title: 'あなたのページ全体と照合される', desc: 'きっかけ・失敗パターン・変容軸・ビフォーアフター・写真・哲学。丁寧に書かれたページが、合う人に届きます。' },
];

const SCORE_ROWS = [
  ['きっかけ一致（来店動機の共鳴）', 8, '+8'],
  ['失敗パターン一致（過去の挫折への向き合い）', 8, '+8'],
  ['Compassの軸 × サービスカテゴリー一致', 12, '+12'],
  ['ユーザーの優先変容軸 × サービス対象軸', 15, '最大+15'],
];

const CATEGORIES = [
  ['gym', 'パーソナルジム', 'フリーランスPT・個人ジム'],
  ['eyebrow', '眉毛サロン', 'アイブロウスタイリスト'],
  ['hair', '美容室・美容師', 'フリーランス・個人サロン'],
  ['consulting', '外見コンサル', '外見・印象改善コンサル'],
  ['fashion', 'ファッション', 'パーソナルスタイリスト'],
  ['hairremoval', '脱毛サロン', 'メンズ脱毛・医療脱毛'],
  ['aga', 'AGAクリニック', '薄毛・AGA治療院'],
  ['photo', '写真撮影・その他', '婚活・マッチングアプリ写真'],
];

const PLANS = [
  { name: 'PLAN A', label: 'ライト', price: '5,000', items: ['公開プロフィールページ', '予約受付（LINE完結・即時予約・店頭予約ボード）', 'オンライン決済・請求書・予約デポジット', '基本カルテ・売上管理・LTV/CAC概算', 'AI専属コンサル', 'リマインド・誕生日メッセージ（Fineme公式LINEから）', 'お客様の登録は30人まで'] },
  { name: 'PLAN B', label: 'スタンダード', price: '7,000', badge: 'お客様の登録 無制限', items: ['Plan Aの内容すべて', 'お客様の登録が無制限', '休眠顧客の掘り起こし・クチコミ依頼の自動化', 'スタッフ指名・シフト管理・部屋と設備の管理', '回数券・会員プラン・入会手続き・クラス管理', 'QRチェックイン・出欠確認・友達紹介'] },
  { name: 'PLAN C', label: 'プレミアム', price: '10,000', badge: 'すべての機能', highlight: true, items: ['Plan Bの内容すべて', '予約・リマインドが店舗独自の公式LINEから届く', 'カルテAI分析・姿勢分析・健診アドバイス', 'POS・物販・在庫管理', 'ロッカー月極管理', '操作ログ'] },
];

const FAQ = [
  ['初期費用はかかりますか？', 'かかりません。登録料は当面の間無料で、お支払いは月額プランの料金だけです。'],
  ['月額料金はいつから発生しますか？', 'プランをお申し込みいただいた日からです。Finemeは新規予約を取ってくる広告ではなく、予約・決済・顧客管理・リピートのための店舗運営ツールなので、お使いいただく期間に応じて月額をいただいています。'],
  ['決済手数料はどんなときにかかりますか？', 'お客様がFineme経由でオンライン決済したときだけ、決済額の4.5%（カード会社の手数料込み）がかかり、入金額から差し引かれます。予約そのものの手数料はありません。'],
  ['店舗の公式LINEを持っていなくても使えますか？', '使えます。Plan A・Bでは予約やリマインドがFineme公式LINEから届きます。Plan Cでは店舗独自の公式LINEから送れます。'],
  ['機能が多くて、画面が複雑になりませんか？', '機能は店舗ごとにON/OFFでき、使うものだけが画面に並びます。必要になったら、あとからいつでも足せます。'],
  ['プランの変更や解約はできますか？', 'プランはいつでも切り替えられます。解約は月末までにお手続きいただくと、翌月から課金が停止します（当月分の返金はありません）。'],
];

function Seal({ children, size }) {
  return <span className={`fm-seal pj-seal ${size === 'lg' ? 'pj-seal-lg' : ''}`}>{children}</span>;
}

function MockTag() {
  return <span className="pj-mock-tag">画面イメージ</span>;
}

export default function ProviderJoinPage({ searchParams }) {
  const ref = searchParams?.ref;
  const inquiryHref = ref ? `/provider/inquiry?ref=${encodeURIComponent(ref)}` : '/provider/inquiry';

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
              <span className="pj-chip">顧客管理・リピートSaaS</span>
              <span className="pj-chip">AI専属コンサル付き</span>
              <span className="pj-chip">予約の手数料なし・月額¥5,000から</span>
            </div>
            <h1 className="pj-h1 pj-rise" style={{ '--d': '120ms' }}>
              <span className="pj-nb">新規集客の前に、</span><br />
              <em className="pj-gold"><span className="pj-nb">今のお客様を、</span><span className="pj-nb">離さない。</span></em>
            </h1>
            <p className="pj-lead pj-rise" style={{ '--d': '240ms' }}>
              予約の取りこぼし、いつの間にか来なくなった常連、スタッフの頭の中にしかない顧客情報——
              Finemeは、お客様のリピートを作ることに特化した店舗運営SaaSです。
              AI専属コンサルが店舗の数字を見て次の一手を提案。予約・決済・カルテ・リマインドまで、ひとつの管理画面で完結します。
            </p>
            <div className="pj-cta-row pj-rise" style={{ '--d': '360ms' }}>
              <a className="pj-btn pj-btn-gold pj-btn-lg" href={inquiryHref}>掲載について相談する</a>
              <a className="pj-btn pj-btn-ghost pj-btn-lg" href="#tools">できることを見る</a>
            </div>
            <ul className="pj-trust pj-rise" style={{ '--d': '480ms' }}>
              <li>登録料 0円（当面無料）</li>
              <li>予約の手数料 0円</li>
              <li>プランはいつでも切り替え可</li>
            </ul>
            <p className="pj-hero-note pj-rise" style={{ '--d': '560ms' }}>掲載すれば、診断を経て「本気で変わりたい」お客様との新しい出会いも、伸びしろとして加わります。</p>
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
          <div className="pj-stat" data-reveal style={{ '--d': '160ms' }}><div className="pj-stat-num"><CountUp to={4.5} decimals={1} /><small>%</small></div><div className="pj-stat-label">オンライン決済の手数料のみ（カード会社手数料込み）</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '240ms' }}><div className="pj-stat-num pj-stat-word">ON/OFF</div><div className="pj-stat-label">使う機能だけを画面に並べられる</div></div>
        </div>
      </section>

      {/* ② 悩み ④ 原因 */}
      <section className="pj-paper">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Problem</div>
          <h2 className="pj-h2" data-reveal>こんな悩み、抱えていませんか？</h2>
          <p className="pj-sec-lead" data-reveal>新規集客より先に、今のお客様との関係と、毎日の業務で困っていることはありませんか。</p>
          <div className="pj-problem-grid">
            {PROBLEMS.map((x, i) => (
              <div key={x.h} className="pj-problem" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="pj-problem-glyph" aria-hidden="true">{x.g}</span>
                <h3>{x.h}</h3>
                <p>{x.p}</p>
              </div>
            ))}
          </div>
          <div className="pj-statement" data-reveal>
            <p className="pj-statement-main">それは接客の問題ではありません。<br /><span className="pj-underline">仕組みの問題です。</span></p>
            <p className="pj-statement-sub">Finemeは「日々の業務を自動で回す」ことで時間を生み、その時間とAIの提案を「今いるお客様のリピート」に使える状態をつくります。</p>
          </div>
        </div>
      </section>

      {/* ⑤⑥ 解決策 */}
      <section className="pj-dark pj-contour" id="tools">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Solution</div>
          <h2 className="pj-h2" data-reveal>お客様が戻ってくる仕組みと、<br className="pj-br-pc" />そのための時間を、同時につくる</h2>
          <p className="pj-sec-lead" data-reveal>新しいお客様がいなくても、契約したその日から使えます。使わない機能は店舗ごとにON/OFFでき、必要なものだけが画面に並びます。</p>

          <div className="pj-pillar-head" data-reveal>
            <span className="pj-pillar-num">1</span>
            <div>
              <h3 className="pj-pillar-title">AIと仕組みで、リピーターを定着させる</h3>
              <p className="pj-pillar-lead">「誰に・いつ・何を伝えるか」をAIが店舗の実データから考え、声かけ・記録・継続の仕組みまで用意します。</p>
            </div>
          </div>

          <div className="pj-feature" data-reveal>
            <div className="pj-feature-text">
              <Seal>談</Seal>
              <h4>AI専属コンサル</h4>
              <p>予約・売上・来店間隔などの店舗データをAIが読み、「いま誰に声をかけるべきか」「どのメニューが伸びているか」を吹き出し形式で提案。声かけ文案の作成や、相談したいことのチャットにも対応します。全プランで使えます。</p>
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
              <Seal>再</Seal>
              <h4>リマインド・休眠掘り起こし</h4>
              <p>予約前日の確認・誕生日メッセージは全プランで自動配信。Plan B以上では、来店間隔が空いたお客様の一覧化と声かけ、来店後のクチコミ依頼まで仕組みで回せます。</p>
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
              </div>
            </div>
          </div>

          <div className="pj-feature" data-reveal>
            <div className="pj-feature-text">
              <Seal>記</Seal>
              <h4>顧客カルテ</h4>
              <p>来店履歴・担当スタッフ・Me Scan受診有無を自動で一覧化。店舗ごとに自由な項目（自由記述・選択式・5段階評価）を足せます。Plan Cでは蓄積した記録からAIが傾向・注意点を提案します。</p>
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

          <div className="pj-feature pj-feature-rev" data-reveal>
            <div className="pj-feature-text">
              <Seal>会</Seal>
              <h4>回数券・会員プラン・クラス</h4>
              <p>回数券、月額会員プラン、通い放題の組み合わせをオンラインで販売。クラス予約、QRチェックイン、出欠確認、友達紹介プログラムまで、通い続けてもらう仕組みが揃います（Plan B以上）。</p>
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
                  <span className="pj-ticket-sub">毎月自動でお支払い｜QRでチェックイン</span>
                </div>
                <div className="pj-ticket-stub pj-ticket-stub-alt"><span>月額</span><b className="pj-ticket-yen">¥14,800</b></div>
              </div>
            </div>
          </div>

          <div className="pj-roi-wrap">
            <div className="pj-roi-head" data-reveal>
              <h3>休眠客1人の呼び戻しで、月額は元が取れます。</h3>
              <p>単価と人数を動かして、戻ってくる売上を試算できます。</p>
            </div>
            <RoiCalculator />
          </div>

          <div className="pj-pillar-head pj-pillar-head-2" data-reveal>
            <span className="pj-pillar-num">2</span>
            <div>
              <h3 className="pj-pillar-title">日常業務を自動で回して、時間を取り戻す</h3>
              <p className="pj-pillar-lead">手作業だった連絡・請求・集計を仕組みに任せて、空いた時間を接客とリピート施策に使えます。</p>
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

          <div className="pj-ops-grid">
            {OPS_FEATURES.map((f, i) => (
              <div key={f.h} className="pj-ops" data-reveal style={{ '--d': `${(i % 2) * 90}ms` }}>
                <Seal>{f.g}</Seal>
                <h4>{f.h}</h4>
                <p>{f.p}</p>
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
            <p className="pj-photo-sub">前日の確認連絡、請求、売上の集計といった「毎回やる作業」を任せて、AI専属コンサルが示す「いま声をかけるべき人」への一言に時間を使えます。</p>
          </div>
        </div>
      </section>

      {/* ⑧ 今後の伸びしろ */}
      <section className="pj-dark">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Fineme Matching（今後の伸びしろ）</div>
          <h2 className="pj-h2" data-reveal>掲載しておけば、新しい出会いも増えていく</h2>
          <p className="pj-sec-lead" data-reveal>
            ここまでが、いま抱えているお客様のための機能です。そのうえでFinemeには、もうひとつの伸びしろがあります。
            正直にお伝えすると、Finemeはまだユーザー基盤を育てている段階です。
            それでも今のうちに掲載しておく理由は、この仕組みが「検索して探す」のではなく「診断を受けてから届く」設計だから——ユーザーが増えるほど、この価値もそのまま伸びていきます。
          </p>

          <ol className="pj-stepper">
            {SCAN_STEPS.map((s, i) => (
              <li key={s.label} data-reveal style={{ '--d': `${i * 110}ms` }}>
                <Seal size="lg">{s.g}</Seal>
                <span className="pj-step-label">{s.label}</span>
                <b>{s.title}</b>
                <p>{s.desc}</p>
              </li>
            ))}
          </ol>

          <div className="pj-score" data-reveal>
            <div className="pj-score-main">
              <h3>「それっぽく書いただけ」では上位に出ない設計</h3>
              <div className="pj-score-label">USER MATCH — ユーザーの診断データとの照合</div>
              {SCORE_ROWS.map(([n, v, t], i) => (
                <div key={n} className="pj-score-row" style={{ '--w': `${(v / 15) * 100}%`, '--i': i }}>
                  <span className="pj-score-name">{n}</span>
                  <span className="pj-score-track"><span className="pj-score-fill" /></span>
                  <span className="pj-score-pts">{t}</span>
                </div>
              ))}
            </div>
            <div className="pj-score-side">
              <div className="pj-score-box">
                <div className="pj-score-label">PROFILE QUALITY — プロフィールの充実度</div>
                <p>ガイド哲学・変容ビジョン・強み・ターゲット像・キャッチコピー・カバー写真・施設写真・スタッフ紹介。<b>各項目の記入密度（文字数・写真枚数）でスコアが加算されます。</b></p>
              </div>
              <div className="pj-score-box">
                <div className="pj-score-label">SERVICE QUALITY — サービスの中身</div>
                <p>変容の約束・Before/Afterテキスト・Before/After画像・特典内容。<b>「変わる前」「変わった後」が具体的なサービスほど、スコアが高くなります。</b></p>
              </div>
            </div>
          </div>
          <p className="pj-score-insight" data-reveal>「きっかけ」と「失敗パターン」はスコアへの影響が特に大きい項目ですが、<b>ページ全体の充実度が積み重なってスコアが決まります。</b>テキトーに2項目入れただけでは上位には出ません——これが、Finemeに「合う人」が集まる理由です。</p>

          <div className="pj-upside-grid">
            <div className="pj-ops" data-reveal>
              <Seal>診</Seal>
              <h4>診断起点LP自動生成</h4>
              <p>Me Scanでタイプが判定されたお客様専用のランディングページを自動生成。体験メニュー・症例（Before/After）を登録するだけで、デザイン不要の専用入口ができます。</p>
            </div>
            <div className="pj-ops" data-reveal style={{ '--d': '90ms' }}>
              <Seal>鏡</Seal>
              <h4>Mirrorマッチング</h4>
              <p>写真分析（Mirror）で「改善余地が大きい軸」を特定し、その軸を得意とする店舗・メニューを自動提示。ミスマッチの少ない出会いを設計します。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 対象業種 */}
      <section className="pj-dark pj-cats">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>対象業種</div>
          <h2 className="pj-h2" data-reveal>こんな業種の方が参加しています</h2>
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
      <section className="pj-plans">
        <div className="pj-container">
          <div className="pj-eyebrow pj-center" data-reveal>Plan</div>
          <h2 className="pj-h2 pj-center" data-reveal>掲載プラン</h2>
          <p className="pj-sec-lead pj-center pj-narrow" data-reveal>登録料は当面無料。月額プラン3段階からお選びいただけます。予約の手数料はありません。プランの違いは使える機能だけです。必要な機能に合わせて、いつでも切り替えられます。</p>
          <div className="pj-plan-grid">
            {PLANS.map((pl, i) => (
              <div key={pl.name} className={`pj-plan ${pl.highlight ? 'pj-plan-hi' : ''}`} data-reveal style={{ '--d': `${i * 100}ms` }}>
                {pl.badge && <span className="pj-plan-badge">{pl.badge}</span>}
                <div className="pj-plan-name">{pl.name}<span>{pl.label}</span></div>
                <div className="pj-plan-price">¥{pl.price}<small> / 月（税込）</small></div>
                <ul>
                  {pl.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
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
          <p className="pj-plans-foot" data-reveal>今後の価格変更は事前に告知します。管理機能の詳しい画面イメージは<a href="/business/store-saas-pitch-deck.html">店舗SaaS営業資料</a>をご覧ください。</p>
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

      {/* 紹介報酬・向き不向き */}
      <section className="pj-dark">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Referral Program</div>
          <h2 className="pj-h2" data-reveal>掲載料を相殺できる、紹介報酬制度</h2>
          <p className="pj-sec-lead" data-reveal>一般的なポータルは「掲載料→集客→掲載料」の循環ですが、Finemeは掲載者自身が副収益を作れる仕組みを持っています。</p>
          <div className="pj-two">
            <div className="pj-panel" data-reveal>
              <h3>仕組み</h3>
              <ul className="pj-checks">
                <li>あなたが紹介した事業者が有料掲載を開始すると、<b>紹介報酬が発生</b></li>
                <li>うまく運用すると<b>掲載料相当を相殺</b>、場合によっては<b>プラス</b>へ</li>
                <li>単なる数集めではなく<b>相性主導</b>の健全なエコシステム</li>
              </ul>
            </div>
            <div className="pj-panel pj-panel-quiet" data-reveal style={{ '--d': '90ms' }}>
              <h3>誠実運用のガイドライン</h3>
              <p>強引な勧誘やミスマッチな紹介は推奨しません。「この人ならユーザーに紹介できる」と思える事業者のみ、丁寧につないでください。報酬条件の詳細は個別相談でご説明します。</p>
            </div>
          </div>

          <div className="pj-eyebrow pj-mt" data-reveal>Fit Check</div>
          <h2 className="pj-h2" data-reveal>向いている人 / 向いていない人</h2>
          <div className="pj-two">
            <div className="pj-panel pj-panel-yes" data-reveal>
              <h3>Finemeに向いている</h3>
              <ul className="pj-checks">
                <li>自分の仕事に誇りがある</li>
                <li>今のお客様との関係をもっと大事にしたい</li>
                <li>顧客管理・リマインドを楽にしたい</li>
                <li>選ばれる理由を言語化したい</li>
                <li>外見から自信を取り戻す仕事だと思っている</li>
              </ul>
            </div>
            <div className="pj-panel pj-panel-quiet" data-reveal style={{ '--d': '90ms' }}>
              <h3>向いていない</h3>
              <ul className="pj-crosses">
                <li>値引き集客がしたい</li>
                <li>数だけを追いたい</li>
                <li>プロフィールを埋める気がない</li>
                <li>仕組みを理解せず使いたい</li>
                <li>新規のお客様の送客だけを期待している</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ⑫ CTA */}
      <section className="pj-final" id="pj-final">
        <div className="pj-final-compass" aria-hidden="true" />
        <div className="pj-container pj-final-inner" data-reveal>
          <div className="pj-eyebrow pj-center">最後に</div>
          <p className="pj-final-body">
            Finemeは、「新規客が来るのを待つ場所」ではありません。<br />
            今いるお客様との関係を強くしながら、新しい出会いも育てていく場所です。
          </p>
          <h2 className="pj-final-h">リピートを仕組みにしたいなら——<br />あなたは、Finemeに向いています。</h2>
          <a className="pj-btn pj-btn-gold pj-btn-xl" href={inquiryHref}>まずは話を聞いてみる</a>
          <p className="pj-final-note">無理な勧誘は一切ありません。合わない場合は正直にお伝えします。</p>
        </div>
      </section>
    </main>
  );
}
