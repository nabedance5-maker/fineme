export const metadata = {
  title: 'プライバシーポリシー | Fineme',
  robots: 'index,follow',
};

export default function PrivacyPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860 }}>
        <h1 className="section-title">プライバシーポリシー</h1>
        <p className="muted">Fineme（以下「当サービス」）は、外見を起点に自信を再設計したいと思うユーザーと、その支援を担う掲載者の信頼を守るために、個人情報を誠実に取り扱います。本ポリシーはその方針を定めるものです。</p>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>1. 利用者の種類と取得する情報</h2>
          <p>当サービスには2種類の利用者がいます。それぞれ以下の情報を取得します。</p>

          <p style={{ fontWeight: 700, margin: '4px 0 2px' }}>● 一般ユーザー（サービスを探す・予約する方）</p>
          <ul className="stack" style={{ gap: 4, margin: 0 }}>
            <li>アカウント登録情報（メールアドレス、パスワードハッシュ）</li>
            <li>外見診断の回答・結果データ（悩みの種類、変わりたい方向性、現状スコア等）</li>
            <li>予約・問い合わせに関する情報（氏名、希望日時、メモ等）</li>
            <li>サービス利用履歴（閲覧したサービス、診断回数等）</li>
            <li>技術情報（ブラウザ、端末、IPアドレス、Cookie等）</li>
          </ul>

          <p style={{ fontWeight: 700, margin: '8px 0 2px' }}>● 掲載者（サービスを提供する事業者）</p>
          <ul className="stack" style={{ gap: 4, margin: 0 }}>
            <li>事業者登録情報（屋号・事業者名、サービス内容、料金、連絡先等）</li>
            <li>決済に関する情報（課金状況・請求履歴。カード番号等はStripeが管理）</li>
            <li>掲載ページへのアクセス統計</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>2. 診断データの取り扱い（重要）</h2>
          <p>診断データ（外見の悩み・変わりたい方向性・現状スコア等）は、利用者の内面に関わるセンシティブな情報です。当サービスは以下の方針で取り扱います。</p>
          <ul className="stack" style={{ gap: 6 }}>
            <li>✅ <strong>Fineme内でのパーソナライズに使用します。</strong>診断結果をもとに、あなたに合うサービスの優先表示・変容ロードマップの生成を行います。これが診断の存在意義です。</li>
            <li>✅ <strong>匿名集計データを掲載者向けダッシュボードで提供します。</strong>「今月の訪問者のうちXX%が清潔感タイプでした」等、個人を特定できない形での集計データを掲載者に提供することがあります。</li>
            <li>❌ <strong>外部広告配信には使用しません。</strong>Facebook・Google等への診断データの提供・連携は行いません。</li>
            <li>❌ <strong>第三者への個人データの販売・提供は行いません。</strong></li>
            <li>❌ <strong>同意なくプロモーションメールを送ることはありません。</strong>サービス改善情報等のメールは、明示的に同意いただいた方にのみ送付します。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>3. 利用目的</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>アカウントの作成・認証・本人確認のため</li>
            <li>予約・問い合わせの管理、日程調整、連絡のため</li>
            <li>診断結果に基づくサービスのパーソナライズ・ロードマップ生成のため</li>
            <li>掲載プランの課金管理・請求・決済処理のため</li>
            <li>掲載者向けアクセス統計レポートの提供のため</li>
            <li>サービスの改善・新機能開発のため</li>
            <li>不正利用の防止・セキュリティ確保のため</li>
            <li>法令に基づく対応のため</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>4. 利用する第三者サービス</h2>
          <p>当サービスは以下の第三者サービスを利用しており、各サービスのプライバシーポリシーが適用されます。</p>
          <ul className="stack" style={{ gap: 8 }}>
            <li><strong>Supabase（Supabase Inc.）</strong>：ユーザー認証・データベース管理<br /><a href="https://supabase.com/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://supabase.com/privacy</a></li>
            <li><strong>Stripe（Stripe, Inc.）</strong>：決済処理・課金管理<br /><a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://stripe.com/jp/privacy</a></li>
            <li><strong>Vercel（Vercel Inc.）</strong>：ホスティング・インフラ<br /><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://vercel.com/legal/privacy-policy</a></li>
            <li><strong>Cloudflare（Cloudflare, Inc.）</strong>：DNS・CDN・メール転送<br /><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://www.cloudflare.com/privacypolicy/</a></li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>5. 予約成立時の情報提供</h2>
          <p>予約が成立した場合、予約対応に必要な範囲（氏名・連絡先・希望日時等）を該当掲載者に提供します。掲載者はこの情報を予約対応以外の目的に使用することはできません。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>6. Cookie・ローカルストレージの利用</h2>
          <p>ログイン状態の維持・診断結果の保持・利便性向上のため、Cookie およびブラウザのローカルストレージを利用します。ブラウザ設定で無効化できますが、一部機能に影響することがあります。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>7. 情報の保管とセキュリティ</h2>
          <p>取得した個人情報はSupabaseのデータベースに保存し、適切なアクセス制御（Row Level Security）を適用して保護します。不正アクセス・漏洩・滅失の防止に努めますが、完全な安全性を保証するものではありません。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>8. 開示・訂正・削除等の請求</h2>
          <p>ご自身の情報の開示・訂正・利用停止・削除等を希望される場合は、<a href="mailto:contact@fineme.me">contact@fineme.me</a> よりご連絡ください。本人確認の上、合理的な期間内に対応いたします。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>9. 未成年者の利用</h2>
          <p>18歳未満の方が当サービスをご利用になる場合は、保護者の同意を得たうえでご利用ください。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>10. 本ポリシーの変更</h2>
          <p>本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。重要な変更がある場合は、当サービス上で事前に告知します。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>11. お問い合わせ</h2>
          <p>本ポリシーに関するお問い合わせ：<a href="mailto:contact@fineme.me">contact@fineme.me</a></p>
        </section>

        <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>制定日: 2026-03-09</p>
      </div>
    </main>
  );
}
