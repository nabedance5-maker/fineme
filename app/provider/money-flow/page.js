// 契約者向け「お金の流れ」（2026-11-06 渡邉要望：契約者さんに聞かれた時に図で見せられるページ）。
// Finemeを通じた決済で、お金がいつ・誰に入るかを4つの場面（お客様の決済・返金・月会費の引き落とし失敗・Finemeの月額）で見せる。
// 仕組みの実体：Stripe Connect の destination charge（lib/payment-fee.js の4.5%を application fee で差し引き）、
// 返金は reverse_transfer + refund_application_fee（2026-11-06〜手数料も返還）、Finemeの月額は providers の Stripe サブスク。
import Link from 'next/link';
import { PAYMENT_FEE_PERCENT } from '@/lib/payment-fee';
import { PROVIDER_PLANS } from '@/lib/provider-plans';

export const metadata = {
  title: 'お金の流れ｜Fineme 契約者のみなさまへ',
  description: 'Finemeを通じたお客様の決済で、代金がいつ・どこへ入るか。返金・月会費の引き落とし失敗・Finemeの月額のお支払いまで、図でご説明します。',
  robots: { index: false, follow: true },
};

const yen = n => `¥${Number(n).toLocaleString()}`;
const EX = 10000;
const FEE = Math.round(EX * PAYMENT_FEE_PERCENT / 100);

const CSS = `
.mf { --ink:#16202f; --sub:#566173; --line:#dfe3ea; --paper:#ffffff; --ground:#f5f6f9; --navy:#1f3a6b; --gold:#b8933a; --gold-soft:#f6efdd; --green:#1d7a52; --green-soft:#e6f4ec; --red:#a8322b; --red-soft:#fbeceb;
  background: var(--ground); color: var(--ink); font-family: 'Noto Sans JP', system-ui, sans-serif; padding: 40px 16px 80px; }
.mf-wrap { max-width: 880px; margin: 0 auto; display: grid; gap: 28px; }
.mf-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .16em; color: var(--gold); margin: 0; }
.mf h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(24px, 4.4vw, 34px); line-height: 1.4; margin: 6px 0 10px; text-wrap: balance; }
.mf-lead { font-size: 15px; line-height: 1.9; color: var(--sub); margin: 0; max-width: 40em; }
.mf-keys { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.mf-key { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
.mf-key b { display: block; font-size: 15px; margin-bottom: 4px; }
.mf-key span { font-size: 13px; color: var(--sub); line-height: 1.7; }
.mf-toc { display: flex; flex-wrap: wrap; gap: 8px; }
.mf-toc a { font-size: 13px; font-weight: 700; color: var(--navy); background: var(--paper); border: 1px solid var(--line); border-radius: 99px; padding: 8px 14px; text-decoration: none; }
.mf-toc a:hover, .mf-toc a:focus-visible { border-color: var(--navy); outline: none; }
.mf-sec { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 28px 28px 26px; display: grid; gap: 18px; scroll-margin-top: 80px; }
@media (max-width: 600px) { .mf-sec { padding: 22px 16px; } }
.mf-sec h2 { font-size: 20px; margin: 0; display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.mf-tag { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: var(--gold); border: 1px solid var(--gold); border-radius: 6px; padding: 2px 7px; }
.mf-sec > p { margin: 0; font-size: 14px; line-height: 1.9; color: var(--sub); }

/* 流れの図：横並び（スマホは縦並び）の箱と矢印 */
.mf-flow { display: flex; align-items: stretch; gap: 0; overflow-x: auto; padding: 4px 0; }
.mf-node { flex: 1 1 0; min-width: 0; background: var(--ground); border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 12px; text-align: center; display: grid; align-content: center; gap: 4px; }
.mf-node .who { font-size: 12px; font-weight: 700; color: var(--sub); }
.mf-node .what { font-size: 15px; font-weight: 800; }
.mf-node .amt { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
.mf-node.you { border-color: var(--green); background: var(--green-soft); }
.mf-node.you .amt { color: var(--green); }
.mf-node.fineme { border-color: var(--gold); background: var(--gold-soft); }
.mf-node.bad { border-color: var(--red); background: var(--red-soft); }
.mf-arrow { flex: 0 0 56px; display: grid; place-items: center; text-align: center; font-size: 11px; color: var(--sub); line-height: 1.4; position: relative; }
.mf-arrow::before { content: ''; position: absolute; left: 6px; right: 10px; top: 50%; border-top: 2px solid #9aa4b4; }
.mf-arrow::after { content: ''; position: absolute; right: 4px; top: calc(50% - 5px); border-left: 8px solid #9aa4b4; border-top: 5px solid transparent; border-bottom: 5px solid transparent; }
.mf-arrow span { position: relative; background: var(--paper); padding: 2px 3px; top: -14px; }
.mf-split { flex: 1.2 1 0; display: grid; gap: 10px; min-width: 0; }
@media (max-width: 680px) {
  .mf-flow { flex-direction: column; overflow: visible; }
  .mf-arrow { flex-basis: 44px; }
  .mf-arrow::before { left: 50%; right: auto; top: 4px; bottom: 10px; border-top: 0; border-left: 2px solid #9aa4b4; }
  .mf-arrow::after { left: calc(50% - 4px); right: auto; top: auto; bottom: 2px; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 8px solid #9aa4b4; border-bottom: 0; }
  .mf-arrow span { top: 0; left: 46px; position: absolute; text-align: left; white-space: nowrap; }
}

.mf-steps { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; counter-reset: s; }
.mf-steps li { counter-increment: s; display: grid; grid-template-columns: 30px 1fr; gap: 10px; font-size: 14px; line-height: 1.8; }
.mf-steps li::before { content: counter(s); width: 26px; height: 26px; border-radius: 50%; background: var(--navy); color: #fff; font-size: 13px; font-weight: 800; display: grid; place-items: center; margin-top: 1px; }
.mf-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
.mf-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.mf-table th, .mf-table td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; line-height: 1.7; }
.mf-table th { background: var(--ground); font-size: 12px; color: var(--sub); white-space: nowrap; }
.mf-table tr:last-child td { border-bottom: 0; }
.mf-note { background: var(--ground); border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.85; color: var(--sub); margin: 0; }
.mf-note b { color: var(--ink); }
.mf-faq { display: grid; gap: 8px; }
.mf-faq details { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px; }
.mf-faq summary { font-weight: 700; font-size: 14.5px; cursor: pointer; }
.mf-faq p { margin: 10px 0 0; font-size: 13.5px; line-height: 1.85; color: var(--sub); }
.mf-cta { display: flex; flex-wrap: wrap; gap: 10px; }
.mf-btn { display: inline-flex; align-items: center; min-height: 46px; padding: 0 20px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; background: var(--navy); color: #fff; }
.mf-btn.ghost { background: var(--paper); color: var(--navy); border: 1.5px solid var(--navy); }
.mf-btn:focus-visible, .mf-faq summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
`;

function Arrow({ label }) {
  return <div className="mf-arrow" aria-hidden="true">{label ? <span>{label}</span> : null}</div>;
}

export default function MoneyFlowPage() {
  return (
    <div className="mf">
      <style>{CSS}</style>
      <div className="mf-wrap">
        <header>
          <p className="mf-eyebrow">FOR CONTRACTED STORES</p>
          <h1>お金の流れ</h1>
          <p className="mf-lead">Finemeを通じてお客様が支払った代金は、Finemeの口座に貯まることはありません。決済したその場で、決済手数料を差し引いた残りが、貴店の受け取り口座へ自動で送られます。このページでは、よくある4つの場面を図でご説明します。</p>
        </header>

        <div className="mf-keys">
          <div className="mf-key"><b>Finemeが受け取るのは手数料だけ</b><span>決済額の{PAYMENT_FEE_PERCENT}%（カード会社・Stripeの手数料込み）。それ以外に差し引くものはありません。</span></div>
          <div className="mf-key"><b>振り込みの手続きは不要</b><span>貴店の受け取り口座へは自動で送られ、銀行口座へもStripeが自動で入金します。</span></div>
          <div className="mf-key"><b>返金した取引は手数料なし</b><span>返金すると、Finemeの手数料も貴店に戻ります。</span></div>
        </div>

        <nav className="mf-toc" aria-label="このページの内容">
          <a href="#pay">1. お客様が支払う</a>
          <a href="#refund">2. 返金する</a>
          <a href="#failed">3. 月会費の引き落としができなかった</a>
          <a href="#plan">4. Finemeの月額のお支払い</a>
          <a href="#faq">よくある質問</a>
        </nav>

        <section className="mf-sec" id="pay" aria-labelledby="pay-h">
          <h2 id="pay-h"><span className="mf-tag">場面1</span>お客様が支払う</h2>
          <p>月会費・入会金・回数券・POSのカード会計・予約のデポジット・ロッカー代・お支払いリンクは、すべて同じ流れです。例として、お客様が{yen(EX)}を支払った場合：</p>
          <div className="mf-flow" role="img" aria-label={`お客様が${yen(EX)}を支払うと、手数料${yen(FEE)}がFinemeに、${yen(EX - FEE)}が貴店の受け取り口座に入り、その後Stripeが貴店の銀行口座へ入金します`}>
            <div className="mf-node"><div className="who">お客様</div><div className="what">カードで支払う</div><div className="amt">{yen(EX)}</div></div>
            <Arrow label="その場で" />
            <div className="mf-split">
              <div className="mf-node you"><div className="who">貴店の受け取り口座（Stripe）</div><div className="amt">{yen(EX - FEE)}</div></div>
              <div className="mf-node fineme"><div className="who">Finemeの決済手数料（{PAYMENT_FEE_PERCENT}%）</div><div className="amt">{yen(FEE)}</div></div>
            </div>
            <Arrow label="自動で" />
            <div className="mf-node you"><div className="who">貴店の銀行口座</div><div className="what">入金</div><div className="amt">{yen(EX - FEE)}</div></div>
          </div>
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead><tr><th>支払いの種類</th><th>お客様のカードから引き落とされる時</th></tr></thead>
              <tbody>
                <tr><td>月会費</td><td>入会を承認した時（最初の分）と、毎月の支払い日。前払いです。初月を日割りにする設定なら、最初の分は日割りの金額になります</td></tr>
                <tr><td>入会金</td><td>貴店の設定どおり、入会の承認時か、最初の月会費と一緒に</td></tr>
                <tr><td>回数券・POSのカード会計・お支払いリンク・ロッカー代</td><td>お客様が支払ったその場で</td></tr>
                <tr><td>予約のデポジット</td><td>お客様が予約した時</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mf-note"><b>銀行口座へ入る日</b>は、貴店の受け取り口座（Stripe）の入金予定で決まります。管理画面の「Fineme利用契約」タブにある「入金・口座を確認する（Stripe）」から、入金予定と過去の入金をいつでも確認できます。現金など、Finemeを通さない支払いはその場で貴店に入り、Finemeは売上の記録だけを行います（手数料はかかりません）。</p>
        </section>

        <section className="mf-sec" id="refund" aria-labelledby="refund-h">
          <h2 id="refund-h"><span className="mf-tag">場面2</span>返金する</h2>
          <p>お客様には、支払った全額が戻ります。貴店に送られていた分は受け取り口座から戻され、Finemeの手数料も貴店に返します。返金した取引には、手数料がかかりません。</p>
          <div className="mf-flow" role="img" aria-label={`返金すると、貴店の受け取り口座から${yen(EX - FEE)}、Finemeから手数料${yen(FEE)}が戻され、お客様に${yen(EX)}が返ります`}>
            <div className="mf-split">
              <div className="mf-node you"><div className="who">貴店の受け取り口座から戻す</div><div className="amt">{yen(EX - FEE)}</div></div>
              <div className="mf-node fineme"><div className="who">Finemeが手数料を返す</div><div className="amt">{yen(FEE)}</div></div>
            </div>
            <Arrow label="返金" />
            <div className="mf-node"><div className="who">お客様のカードへ</div><div className="what">全額が戻る</div><div className="amt">{yen(EX)}</div></div>
          </div>
          <ul className="mf-steps">
            <li>POSのカード会計は、管理画面のPOSの会計の履歴で「取り消す」を押すと、お客様のカードへ返金されます。</li>
            <li>予約のデポジットは、予約のキャンセル・お断りの時に自動で返金されます。</li>
            <li>月会費・回数券などの返金は、Finemeにご連絡ください。貴店のご依頼を受けて、Finemeが返金の手続きを行います。</li>
          </ul>
          <p className="mf-note">返金するかどうかは、貴店がお決めください。受け取り口座の残高が返金額より少ない時は、Stripeがその後の売上から差し引くか、登録された銀行口座から引き落とします。</p>
        </section>

        <section className="mf-sec" id="failed" aria-labelledby="failed-h">
          <h2 id="failed-h"><span className="mf-tag">場面3</span>月会費の引き落としができなかった</h2>
          <p>カードの有効期限切れや残高不足で、月会費を引き落とせないことがあります。払われるまで、その月の月会費は貴店に入りません。</p>
          <div className="mf-flow" role="img" aria-label="引き落としに失敗すると、Stripeが自動で何回か試し直し、管理画面に失敗と表示されます。貴店からお客様にカード更新のリンクを送ると、払われた時点で通常どおり貴店に入ります">
            <div className="mf-node bad"><div className="who">お客様のカード</div><div className="what">引き落とせない</div></div>
            <Arrow label="自動で" />
            <div className="mf-node"><div className="who">Stripe</div><div className="what">何回か試し直す</div></div>
            <Arrow label="お知らせ" />
            <div className="mf-node"><div className="who">管理画面</div><div className="what">「失敗」と表示</div></div>
            <Arrow label="払われたら" />
            <div className="mf-node you"><div className="who">貴店の受け取り口座</div><div className="what">場面1と同じ流れで入る</div></div>
          </div>
          <ul className="mf-steps">
            <li>管理画面の「月会費の支払い状況」で、引き落とせなかったお客様と理由を確認します。</li>
            <li>カードを新しくしてもらう時は「カードの更新を依頼」を押します。お客様にLINEでリンクが届きます。</li>
            <li>カードを直してもらったら「もう一度引き落とす」で、その場で引き落とせます。</li>
          </ul>
        </section>

        <section className="mf-sec" id="plan" aria-labelledby="plan-h">
          <h2 id="plan-h"><span className="mf-tag">場面4</span>Finemeの月額のお支払い</h2>
          <p>貴店からFinemeへの、管理画面の利用料です。お客様からの売上とは別の流れで、売上から差し引くことはありません。</p>
          <div className="mf-flow" role="img" aria-label="貴店が登録したカードから、Finemeへ毎月の利用料をお支払いいただきます">
            <div className="mf-node you"><div className="who">貴店が登録したカード</div><div className="what">毎月の利用料</div></div>
            <Arrow label="毎月同じ日" />
            <div className="mf-node fineme"><div className="who">Fineme</div><div className="what">管理画面の利用料</div></div>
          </div>
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead><tr><th>プラン</th><th>月額（税込）</th></tr></thead>
              <tbody>
                {PROVIDER_PLANS.map(p => <tr key={p.key}><td>{p.name} {p.label}</td><td>¥{p.price}</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="mf-note">管理画面でプランをお申し込みいただいた日から始まり、毎月同じ日にお支払いいただきます。カードでのお支払いができなかった時は、管理画面にお知らせが出ます。お支払いが済まないままだと、お店のページが非公開になります。</p>
        </section>

        <section className="mf-faq" id="faq" aria-labelledby="faq-h">
          <h2 id="faq-h" style={{ fontSize: '20px', margin: '4px 0 6px' }}>よくある質問</h2>
          <details><summary>受け取り口座の登録をしないとどうなりますか？</summary><p>お客様のカード決済（回数券・月会費・POSのカード会計など）が使えません。登録していないのに代金がFinemeに貯まることもありません。登録は管理画面の「Fineme利用契約」タブから、Stripeの画面で本人確認と銀行口座を入れるだけです。</p></details>
          <details><summary>手数料{PAYMENT_FEE_PERCENT}%のほかに、かかるお金はありますか？</summary><p>Finemeに対しては、月額の利用料と決済手数料{PAYMENT_FEE_PERCENT}%だけです。カード会社・Stripeの手数料は{PAYMENT_FEE_PERCENT}%に含まれています。</p></details>
          <details><summary>銀行口座にはいつ入りますか？</summary><p>貴店の受け取り口座（Stripe）の入金予定どおりに、自動で入金されます。予定の日付は「入金・口座を確認する（Stripe）」から確認できます。</p></details>
          <details><summary>お客様が払ったかどうかは、どこで分かりますか？</summary><p>Finemeを通じたお支払いは、管理画面の売上に自動で記録されます。月会費は「月会費の支払い状況」で、お客様ごとに確認できます。</p></details>
        </section>

        <div className="mf-cta">
          <Link className="mf-btn" href="/provider/dashboard?tab=billing">受け取り口座を確認する</Link>
          <Link className="mf-btn ghost" href="/terms-provider">契約者利用規約を読む</Link>
        </div>
      </div>
    </div>
  );
}
