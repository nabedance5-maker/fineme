import '../provider/join/join.css';
import './sp.css';
import { RevealScope, StickyCta, CountUp } from '../provider/join/JoinFx';
import { PartnerPageMock, StackCompare, RewardSimulator, ApplyForm } from './SalesPartnerFx';
import { PLANS, FIRST_RATE, STOCK_PER_STORE } from './reward';

// 営業パートナー募集LP。店舗向けLP（/provider/join）と同じ「夜の編集誌」のデザイン体系を使う。
// 売る商品は店舗SaaS（リピーター作り特化・AI専属コンサル）。お客様向けの外見磨きの顔とは分けて書く。
// 構成はセールスレター12ステップ（各ブロックに番号を付記）。実績が無い段階なので数字や声は捏造しない。

export const metadata = {
  title: '営業パートナー募集（完全歩合・完全リモート）｜店舗向けリピート支援SaaS Fineme',
  description: '紹介した店舗が使い続ける限り、毎月の報酬が積み上がる。来店したお客様を常連に変える店舗向けSaaS「Fineme」の営業パートナーを募集しています。初月は月額利用料の90%、その後は1店舗につき毎月500円。',
  alternates: { canonical: 'https://www.fineme.me/sales-partner' },
  robots: { index: true, follow: true },
  openGraph: {
    title: '売るたびにゼロから、を終わらせる。| Fineme 営業パートナー募集',
    description: '紹介した店舗が使い続ける限り、毎月の報酬が積み上がる。完全歩合・完全リモート・副業可。',
    url: 'https://www.fineme.me/sales-partner',
    siteName: 'Fineme',
    locale: 'ja_JP',
    type: 'website',
  },
};

const yen = (n) => `¥${Math.round(n).toLocaleString()}`;

const PROBLEMS = [
  { g: '零', h: '毎月、ゼロからのスタート', p: '単発の紹介報酬は、成約した月で終わり。翌月はまた一から探し直しです。' },
  { g: '押', h: '相手に必要とされない商材', p: '先方の困りごとに合わない商品は、紹介するほど人間関係を削っていきます。' },
  { g: '縛', h: '時間と場所に縛られる', p: '決まった時間の稼働、出社、ノルマ。本業や家庭と並べると、続けられません。' },
  { g: '残', h: '続けても、何も残らない', p: '手を止めた瞬間、それまでの努力は収入として何も残りません。' },
];

const SELL_POINTS = [
  { g: '戻', h: 'どの店舗にもある悩みに刺さる', p: '「一度来たお客様が戻ってこない」は、美容室・エステ・ネイル・ジムのほぼすべてが抱える悩みです。Finemeは新規集客で他社と競わず、来店したお客様を常連に変えることに特化しています。' },
  { g: '談', h: 'AI専属コンサルという分かりやすい違い', p: '管理画面のどこにいても、AIが店舗の数字を見て次の一手を提案します。提案は助言で終わらず、お客様へのLINE送信までワンタップで実行できます。' },
  { g: '軽', h: '店舗が始めやすい料金', p: '登録料は当面無料、月額¥5,000から。予約そのものの手数料はありません。機能は店舗ごとにON/OFFでき、使うものだけが画面に並びます。' },
];

const STEPS = [
  { n: '1', t: '応募・オンライン面談', d: 'このページから応募。面談で商品と報酬条件をご説明し、条件は書面（メール）でお渡しします。' },
  { n: '2', t: '専用ページを受け取る', d: 'あなた専用の管理画面のURLをお送りします。紹介コードと紹介URLはそこに入っています。' },
  { n: '3', t: '店舗に紹介する', d: '紹介URLから店舗が申し込むと、あなたの紹介として自動で記録されます。' },
  { n: '4', t: '報酬が積み上がる', d: '店舗の初月の支払いで初月報酬、その後は契約が続く限り毎月の継続報酬が発生します。' },
];

const FAQ = [
  ['営業の経験がなくても応募できますか？', 'できます。商品の説明は面談で行います。店舗向けの紹介ページと営業資料を、そのまま紹介に使えます。'],
  ['費用はかかりますか？', 'かかりません。登録・専用ページの利用に費用はありません。'],
  ['ノルマはありますか？', 'ありません。紹介する数もペースも、ご自身で決められます。'],
  ['紹介はどうやって記録されますか？', '専用ページにある紹介URL（または紹介コード）から店舗が申し込むと、自動であなたの紹介として記録されます。紹介人数、課金中の店舗、今月の見込み報酬、累計報酬額は専用ページでいつでも確認できます。'],
  ['報酬はいつ支払われますか？', '店舗の支払いを確認した月を月末で締め、翌月末に銀行振込でお支払いします。'],
  ['紹介した店舗が解約したらどうなりますか？', 'その店舗の継続報酬は、契約が続いている月の分だけ発生します。解約した月の後は発生しません。'],
  ['副業でも大丈夫ですか？', '大丈夫です。時間と場所の指定はありません。お勤め先の副業の規定はご自身でご確認ください。'],
  ['確定申告は必要ですか？', '業務委託の報酬になるため、収入の額によってはご自身での申告が必要です。'],
];

export default function SalesPartnerPage() {
  return (
    <main className="pj sp">
      <RevealScope />
      <StickyCta href="#apply" text="完全歩合｜毎月の報酬が積み上がる" label="応募する" />

      {/* ① ヘッドライン */}
      <section className="pj-hero">
        <div className="pj-hero-glow" aria-hidden="true" />
        <div className="pj-container pj-hero-grid">
          <div className="pj-hero-copy">
            <div className="pj-chips pj-rise" style={{ '--d': '0ms' }}>
              <span className="pj-chip">営業パートナー募集</span>
              <span className="pj-chip">完全歩合・業務委託</span>
              <span className="pj-chip">完全リモート・副業可</span>
            </div>
            <h1 className="pj-h1 pj-rise" style={{ '--d': '120ms' }}>
              <span className="pj-nb">売るたびにゼロから、</span><br />
              <em className="pj-gold"><span className="pj-nb">を終わらせる。</span></em>
            </h1>
            <p className="pj-lead pj-rise" style={{ '--d': '240ms' }}>
              紹介した店舗が使い続ける限り、あなたの報酬は毎月積み上がっていきます。
              紹介するのは、来店したお客様を常連に変えるための店舗向けシステム「Fineme」。
              どの店舗も抱える悩みに応える商品だから、押し売りをせずに紹介できます。
            </p>
            <div className="pj-cta-row pj-rise" style={{ '--d': '360ms' }}>
              <a className="pj-btn pj-btn-gold pj-btn-lg" href="#apply">応募する（無料）</a>
              <a className="pj-btn pj-btn-ghost pj-btn-lg" href="#reward">報酬の仕組みを見る</a>
            </div>
            <ul className="pj-trust pj-rise" style={{ '--d': '480ms' }}>
              <li>登録・利用の費用 0円</li>
              <li>ノルマなし</li>
              <li>時間・場所の指定なし</li>
            </ul>
          </div>
          <div className="pj-hero-visual pj-rise" style={{ '--d': '200ms' }}>
            <PartnerPageMock />
          </div>
        </div>
      </section>

      <section className="pj-stats">
        <div className="pj-container pj-stat-grid">
          <div className="pj-stat" data-reveal><div className="pj-stat-num"><CountUp to={90} /><small>%</small></div><div className="pj-stat-label">初月報酬（紹介した店舗の初月の月額利用料に対して）</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '80ms' }}><div className="pj-stat-num"><CountUp to={500} prefix="¥" /><small>/月</small></div><div className="pj-stat-label">継続報酬（契約が続く限り、1店舗ごと）</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '160ms' }}><div className="pj-stat-num">0<small>円</small></div><div className="pj-stat-label">登録・利用にかかる費用</div></div>
          <div className="pj-stat" data-reveal style={{ '--d': '240ms' }}><div className="pj-stat-num pj-stat-word">自由</div><div className="pj-stat-label">稼働の時間と場所</div></div>
        </div>
      </section>

      {/* ② 悩み ③ 痛みの増幅 ④ 原因 */}
      <section className="pj-paper">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Problem</div>
          <h2 className="pj-h2" data-reveal>紹介の仕事で、こんな悩みはありませんか？</h2>
          <p className="pj-sec-lead" data-reveal>副業の営業・紹介を試したことがある人ほど、同じところでつまずいています。</p>
          <div className="pj-problem-grid">
            {PROBLEMS.map((x, i) => (
              <div key={x.h} className="pj-problem" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="pj-problem-glyph" aria-hidden="true">{x.g}</span>
                <h3>{x.h}</h3>
                <p>{x.p}</p>
              </div>
            ))}
          </div>
          <div className="sp-pain" data-reveal>
            <p className="sp-pain-main">このままだと、手を止めた月に、<br className="pj-br-pc" />収入も止まります。</p>
            <p className="sp-pain-sub">1年続けても、来月の見通しは今月と変わりません。本業が忙しい月、体調を崩した月、収入は正直にゼロに戻ります。</p>
          </div>
          <div className="pj-statement" data-reveal>
            <p className="pj-statement-main">それは営業力の問題ではありません。<br /><span className="pj-underline">報酬の形と、商材の問題です。</span></p>
            <p className="pj-statement-sub">売り切りの商品を、一回きりの報酬で紹介している限り、積み上がるものは生まれません。</p>
          </div>
        </div>
      </section>

      {/* ⑤ 希望 */}
      <section className="pj-dark pj-contour">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Hope</div>
          <h2 className="pj-h2" data-reveal>店舗が毎月払い続ける商品を、<br className="pj-br-pc" />毎月受け取れる報酬で紹介する。</h2>
          <p className="pj-sec-lead" data-reveal>それだけで、紹介は一回きりの成果から、積み上がる資産に変わります。同じ「毎月2店舗」の紹介でも、1年後の月間報酬はこれだけ違います。</p>
          <StackCompare />
        </div>
      </section>

      {/* ⑥ 解決策：紹介する商品 */}
      <section className="pj-paper">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>What you introduce</div>
          <h2 className="pj-h2" data-reveal>紹介するのは、<br className="pj-br-pc" />お客様を常連に変える店舗向けシステム</h2>
          <p className="pj-sec-lead" data-reveal>Finemeは、予約・顧客管理・来店記録・決済をひとつにまとめ、AIが「次に何をすればいいか」を店舗ごとに提案する店舗運営SaaSです。紹介しやすい理由は3つあります。</p>
          <div className="sp-sell-grid">
            {SELL_POINTS.map((x, i) => (
              <div key={x.h} className="pj-problem" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="pj-problem-glyph" aria-hidden="true">{x.g}</span>
                <h3>{x.h}</h3>
                <p>{x.p}</p>
              </div>
            ))}
          </div>
          <div className="sp-links" data-reveal>
            <a className="pj-btn pj-btn-ghost sp-btn-paper" href="/provider/join" target="_blank" rel="noopener">店舗向けの紹介ページを見る</a>
            <a className="pj-btn pj-btn-ghost sp-btn-paper" href="/business/store-saas-pitch-deck.html" target="_blank" rel="noopener">店舗向けの営業資料を見る</a>
          </div>
        </div>
      </section>

      {/* ⑦ 得られる未来 */}
      <section className="pj-dark" id="reward">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Simulation</div>
          <h2 className="pj-h2" data-reveal>続けた先の、あなたの毎月</h2>
          <p className="pj-sec-lead" data-reveal>紹介のペースと期間を動かして、毎月の報酬がどう積み上がるかを確かめてください。紹介をやめた後も、紹介した店舗の継続報酬は毎月届きます。</p>
          <RewardSimulator />
        </div>
      </section>

      {/* ⑧ なぜ積み上がるか：仕組み */}
      <section className="pj-paper">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>How it works</div>
          <h2 className="pj-h2" data-reveal>始め方と、報酬が積み上がる仕組み</h2>
          <p className="pj-sec-lead" data-reveal>紹介の記録から報酬の計算まで、すべてシステムが自動で行います。あなたの実績は、専用ページでいつでも確認できます。</p>
          <ol className="sp-steps">
            {STEPS.map((s, i) => (
              <li key={s.n} className="sp-step" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="sp-step-n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ⑨ 実績（捏造しない）＝運営の約束 */}
      <section className="pj-dark">
        <div className="pj-container">
          <div className="pj-eyebrow" data-reveal>Our promise</div>
          <h2 className="pj-h2" data-reveal>始まったばかりの制度だから、<br className="pj-br-pc" />約束を先に書いておきます。</h2>
          <p className="pj-sec-lead" data-reveal>この営業パートナー制度は2026年秋に始まりました。お見せできる実績はまだありません。その代わりに、運営として守ることを明記します。</p>
          <div className="pj-two sp-three">
            <div className="pj-panel" data-reveal>
              <h3>条件を書面で</h3>
              <p>報酬の計算方法、支払いの時期、契約の終え方を、面談のあと書面（メール）でお渡しします。</p>
            </div>
            <div className="pj-panel" data-reveal style={{ '--d': '90ms' }}>
              <h3>実績を隠さない</h3>
              <p>紹介した店舗の課金状況と報酬額は、専用ページでいつでも確認できます。運営の手元だけで計算しません。</p>
            </div>
            <div className="pj-panel" data-reveal style={{ '--d': '180ms' }}>
              <h3>支払いを止めない</h3>
              <p>店舗の支払いを確認した月を月末で締め、翌月末に銀行振込でお支払いします。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ⑪ オファー：報酬体系 */}
      <section className="pj-plans">
        <div className="pj-container">
          <div className="pj-eyebrow pj-center" data-reveal>Reward</div>
          <h2 className="pj-h2 pj-center" data-reveal>報酬の一覧</h2>
          <p className="pj-sec-lead pj-center pj-narrow" data-reveal>完全歩合です。固定報酬と最低保証はありません。紹介が成立したときだけ、次の報酬が発生します。</p>
          <div className="pj-plan-grid">
            {PLANS.map((pl, i) => (
              <div key={pl.key} className={`pj-plan ${pl.key === 'C' ? 'pj-plan-hi' : ''}`} data-reveal style={{ '--d': `${i * 100}ms` }}>
                <div className="pj-plan-name">{`PLAN ${pl.key}`}<span>{pl.name}・月額{yen(pl.price)}の店舗</span></div>
                <div className="pj-plan-price">{yen(pl.price * FIRST_RATE)}<small> 初月報酬</small></div>
                <ul>
                  <li>初月の月額利用料の90%</li>
                  <li>2ヶ月目以降は毎月{yen(STOCK_PER_STORE)}の継続報酬</li>
                  <li>契約が続く限り、継続報酬も続く</li>
                </ul>
              </div>
            ))}
          </div>
          <div className="pj-offer" data-reveal>
            <span className="fm-seal pj-seal">始</span>
            <p><b>応募・登録・専用ページの利用は無料です。</b>ノルマはなく、紹介する数もペースもご自身で決められます。</p>
          </div>
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
          <h2 className="pj-h2" data-reveal>向いている人 / 向いていない人</h2>
          <div className="pj-two">
            <div className="pj-panel pj-panel-yes" data-reveal>
              <h3>向いている</h3>
              <ul className="pj-checks">
                <li>店舗の経営者・スタッフとのつながりがある</li>
                <li>相手の困りごとを聞いてから紹介したい</li>
                <li>短期の大きな報酬より、積み上がる報酬を育てたい</li>
                <li>自分のペースで続けたい</li>
              </ul>
            </div>
            <div className="pj-panel pj-panel-quiet" data-reveal style={{ '--d': '90ms' }}>
              <h3>向いていない</h3>
              <ul className="pj-crosses">
                <li>来月すぐにまとまった収入が必要</li>
                <li>数を取るために強引な勧誘をしたい</li>
                <li>固定の報酬がほしい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ⑫ CTA＋応募フォーム */}
      <section className="pj-final" id="pj-final">
        <div className="pj-final-compass" aria-hidden="true" />
        <div className="pj-container pj-final-inner" data-reveal>
          <div className="pj-eyebrow pj-center">最後に</div>
          <p className="pj-final-body">
            今月紹介した1店舗は、来月も、その次の月も、あなたの報酬になります。<br />
            積み上げは、始めた日からしか始まりません。
          </p>
          <h2 className="pj-final-h">売るたびにゼロから、を終わらせる。</h2>
          <div className="sp-apply" id="apply">
            <ApplyForm />
          </div>
          <p className="pj-final-note">無理な勧誘はしません。合わないと感じたら、面談でも正直にお伝えします。</p>
        </div>
      </section>
    </main>
  );
}
