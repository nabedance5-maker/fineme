import { PROVIDER_TERMS_VERSION } from '@/lib/terms-version';

export const metadata = {
  title: '掲載者向け利用規約 | Fineme',
  robots: 'index,follow',
};

export default function TermsProviderPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860 }}>
        <h1 className="section-title">掲載者向け利用規約</h1>
        <p className="muted">
          本規約は、Fineme（以下「当サービス」）に掲載する事業者（以下「掲載者」）向けの利用条件を定めるものです。掲載登録をもって本規約に同意したものとみなします。<br />
          一般ユーザー向けの規約は <a href="/terms">利用規約</a> をご確認ください。
        </p>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第1条（掲載の目的と性質）</h2>
          <p>当サービスへの掲載は、外見磨きに悩むユーザーと事業者を「相性」でつなぐことを目的とします。価格競争やクーポン集客ではなく、「この事業者に任せたい」と思ってもらえる価値の言語化・可視化を重視します。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第2条（掲載登録と審査）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>掲載登録に登録手数料はかかりません（当面の間、無料）。</li>
            <li>当サービスは登録申請を審査し、掲載の可否を判断する権利を有します。</li>
            <li>審査基準を満たさない場合、登録をお断りすることがあります。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第3条（掲載プランと料金）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>月額掲載料はライト（¥5,000）・スタンダード（¥7,000）・プレミアム（¥10,000）の3プランです（すべて税込）。</li>
            <li>プランにより利用できる機能が異なります。予約の成立に伴う手数料はありません。</li>
            <li>Fineme経由でお客様が行うオンライン決済（請求・回数券・会員プラン・予約デポジット・POS等）には、全プラン共通で決済額の4.5%（カード会社の手数料を含む）の決済手数料がかかります。決済代金から差し引いて、店舗の振込口座へ入金されます。</li>
            <li><strong>課金開始タイミング：</strong>月額掲載料は、プランをお申し込みいただいた日から課金が始まります。月額掲載料は店舗運営ツールの利用料であり、Fineme経由の予約・問い合わせの有無にかかわらず発生します。</li>
            <li>以降は毎月同日に自動更新されます。</li>
            <li>決済はクレジットカードによる自動決済（Stripe）です。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第3条の2（オンライン決済・代理受領・返金・チャージバック）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li><strong>代理受領：</strong>掲載者は当サービスに対し、お客様がFineme経由で行うオンライン決済（請求・回数券・会員プラン・予約デポジット・POS等）の代金を、決済代行会社Stripeを通じて掲載者に代わって受け取る権限を与えます。お客様が当サービスに支払った時点で、お客様の掲載者に対する支払いは完了したものとします。</li>
            <li><strong>入金：</strong>受け取った代金は、決済手数料（4.5%）を差し引いて、Stripeを通じて掲載者が登録した口座へ入金します。入金の時期はStripeの入金スケジュールに従います。</li>
            <li><strong>提供責任：</strong>決済の対象となる商品・サービス（施術・回数券・会員プラン等）は掲載者が提供します。提供の内容・品質・説明・解約や中途解約への対応は掲載者の責任で行ってください。</li>
            <li><strong>返金：</strong>返金するかどうかは掲載者が判断し、その責任を負います。返金は掲載者の依頼を受けて当サービスが行います（予約デポジットの、キャンセル・お断り時の自動返金を除く）。返金した額は掲載者の負担とし、決済手数料は返還しません。</li>
            <li><strong>チャージバック：</strong>お客様のカード会社等から不正利用・不審請求の申し立てを受けた場合、掲載者は当サービスの求めに応じて、取引の証拠（予約・来店の記録、契約書、やり取りの記録等）を速やかに提出してください。最終的に取り消された代金と、申し立てに伴う手数料は掲載者の負担とします。</li>
            <li><strong>差し引き・請求：</strong>掲載者が負担すべき返金額・取り消された代金・手数料は、当サービスが今後の入金から差し引くか、月額掲載料とあわせて請求できるものとします。</li>
            <li><strong>保留・停止：</strong>不正利用の疑いがある場合や、前項の負担が支払われない場合、当サービスは入金を一時的に保留したり、決済機能の利用を止めたりすることがあります。</li>
            <li><strong>Stripeの規約：</strong>掲載者は、Stripeの連結アカウント契約（<a href="https://stripe.com/jp/legal/connect-account" target="_blank" rel="noopener noreferrer">Stripe Connected Account Agreement</a>）に同意し、Stripeが求める本人確認等に協力してください。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第4条（解約）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>解約はマイページより月末までにお手続きいただくと、翌月から課金が停止します。</li>
            <li>当月分の月額掲載料は原則返金いたしません。</li>
            <li>解約後も当月末まで掲載は継続されます。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第5条（紹介報酬制度）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>掲載者は他の事業者をFinemeに紹介することができます（任意）。</li>
            <li>紹介した事業者が有料掲載を継続している期間、紹介者に¥500/月（税込）を翌月末払いで支払います。</li>
            <li>報酬の支払いは、紹介者自身が掲載を継続していることを条件とします。</li>
            <li>本制度は単層型（1段階のみ）であり、無限連鎖講・連鎖販売取引には該当しません。報酬はFineme運営事務局から直接支払われます。紹介先の支払いを分配する構造ではありません。</li>
            <li>紹介活動は任意です。紹介しないことによる不利益はありません。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第6条（掲載情報の管理）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>掲載するサービス内容・料金・画像等は、常に最新かつ正確な状態に保ってください。</li>
            <li>掲載内容はFinemeのサイト上で表示・複製・サイズ調整等される非独占的・無償の利用許諾を付与するものとします。</li>
            <li>掲載内容について適法な利用権限を有することを保証してください（著作権・肖像権等）。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第7条（ユーザー情報の取り扱い）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>当サービスの予約・問い合わせを通じて取得したユーザーの個人情報は、当該予約への対応と、そのユーザーへのサービス提供の目的のみに使用してください。</li>
            <li>取得した個人情報を第三者に提供する場合は、本人の同意または法令上の根拠が必要です。</li>
            <li>個人情報保護法その他関係法令を遵守してください。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第7条の2（店舗運営機能に登録するお客様の情報）</h2>
          <p style={{ margin: 0 }}>掲載者が、予約・顧客管理・カルテ・決済・入会手続き等の店舗運営機能に、自店のお客様の情報（以下「お客様情報」）を登録する場合の取り扱いを定めます。</p>
          <ul className="stack" style={{ gap: 6 }}>
            <li><strong>責任の所在：</strong>お客様情報について、掲載者が個人情報取扱事業者として責任を負います。当サービスは、掲載者から取り扱いの委託を受け、店舗運営機能の提供に必要な範囲でのみ取り扱います。</li>
            <li><strong>当サービスの義務：</strong>当サービスは、お客様情報を当該掲載者へのサービス提供以外の目的に使用せず、他の掲載者に提供しません。非公開の保存とアクセス制御により安全に管理し、漏えい等のおそれを認識した場合は、速やかに掲載者に通知します。</li>
            <li><strong>取得時の手続き：</strong>掲載者は、お客様情報を取得・登録するにあたり、利用目的の通知・公表その他、法令上必要な手続きを行ってください。</li>
            <li><strong>健康に関する情報：</strong>健康診断等の結果、身体の状態その他の健康に関する情報は、法律上の「要配慮個人情報」にあたる場合があります。掲載者は、これらの情報を登録またはAIによる分析にかける前に、必ずお客様ご本人の同意を得てください。同意を得られない場合は登録しないでください。</li>
            <li><strong>AI機能の利用：</strong>姿勢分析・健康に関するアドバイス・声かけ文の作成・AI専属コンサル等のAI機能を使うと、入力した情報が当サービスの委託先（Anthropic PBC）に送信されます。AIによるアドバイスは一般的な観点からの参考情報であり、医学的な診断ではありません。掲載者は、お客様に対して医療行為や診断と誤認させる説明をしないでください。</li>
            <li><strong>本人確認書類：</strong>入会手続きでお預かりする本人確認書類は、本人確認の目的にのみ使用してください。</li>
            <li><strong>お客様からの請求：</strong>お客様から開示・訂正・利用停止・削除等の請求を受けた場合は、掲載者が対応してください。当サービスは、必要に応じて対応に協力します。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第8条（禁止事項）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>法令または公序良俗に反する行為</li>
            <li>虚偽・誇大な表示、不当表示、ステルスマーケティングに該当する表示</li>
            <li>景品表示法・特定商取引法・医療・美容関連法令に違反する表示</li>
            <li>他の掲載者の信用を毀損する表現</li>
            <li>当サービスの許諾なく、他の掲載者・ユーザーへの営業・勧誘を行う行為</li>
            <li>複数アカウントの作成・なりすまし等の不正行為</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第9条（法令遵守）</h2>
          <p>景品表示法・特定商取引法・個人情報保護法・著作権法・各自治体条例その他関係法令を遵守し、事業の運営に必要な許認可・資格を取得・維持してください。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第10条（掲載の停止・強制解約）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>本規約に違反する行為が確認された場合、事前通知なく掲載を停止・強制解約することがあります。</li>
            <li>強制解約の場合、当月分の掲載料の返金は行いません。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第11条（免責事項）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>当サービスは、掲載者とユーザー間のトラブルについて責任を負いません。</li>
            <li>当サービスは、特定の予約件数・売上を保証するものではありません。</li>
            <li>やむを得ない理由によりサービスの全部または一部を変更・中断・終了することがあります。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第12条（本規約の変更）</h2>
          <p>当サービスは、必要に応じて本規約を変更できます。重要な変更は事前にサービス上で告知します。変更後も掲載を継続した場合、変更後の規約に同意したものとみなします。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第13条（準拠法・裁判管轄）</h2>
          <p>本規約は日本法に準拠します。当サービスに関する紛争は、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </section>

        <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>制定日: 2026-03-09　／　改定日: 2026-10-16（第3条の2 オンライン決済・代理受領・返金・チャージバック を追加）　／　版: {PROVIDER_TERMS_VERSION}</p>
      </div>
    </main>
  );
}
