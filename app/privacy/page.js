export const metadata = {
  title: 'プライバシーポリシー | Fineme',
  robots: 'index,follow',
};

const sec = { padding: 20, gap: 12 };
const h2 = { margin: 0, fontSize: 18 };
const sub = { fontWeight: 700, margin: '8px 0 2px' };
const list = { gap: 4, margin: 0 };

export default function PrivacyPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860 }}>
        <h1 className="section-title">プライバシーポリシー</h1>
        <p className="muted">Fineme（以下「当サービス」）は、外見を起点に自信を再設計したいと思うユーザー、店舗運営のために当サービスを使う掲載者（店舗）とそのお客様、当サービスを紹介する営業パートナーの信頼を守るために、個人情報を誠実に取り扱います。本ポリシーはその方針を定めるものです。</p>

        <section className="card stack" style={sec}>
          <h2 style={h2}>1. 利用者の種類と取得する情報</h2>
          <p>当サービスでは、利用のしかたに応じて以下の情報を取得します。</p>

          <p style={{ ...sub, marginTop: 4 }}>● 一般ユーザー（診断・Mirror・記録・予約などを使う方）</p>
          <ul className="stack" style={list}>
            <li>アカウント登録情報（メールアドレス、パスワードハッシュ）</li>
            <li>LINEで連携・ログインした場合のLINEのユーザー識別子と表示名</li>
            <li>外見診断（Me Scan）の回答・結果データ（悩みの種類、変わりたい方向性、現状スコア等）</li>
            <li>Fineme Mirror（AI写真診断）にアップロードした写真と分析結果、選択した性別（詳細は2-2）</li>
            <li>New Me Log に記録した内容（通っている店舗の種類、来店日、頻度、費用等）</li>
            <li>予約・問い合わせに関する情報（氏名、連絡先、希望日時、メモ等）</li>
            <li>サービス利用履歴（閲覧したページ、診断回数等）</li>
            <li>技術情報（ブラウザ、端末、IPアドレス、Cookie等）</li>
          </ul>

          <p style={sub}>● 掲載者（店舗）と、店舗のスタッフ</p>
          <ul className="stack" style={list}>
            <li>事業者登録情報（屋号・事業者名、サービス内容、料金、連絡先等）</li>
            <li>決済に関する情報（課金状況・請求履歴・売上の入金先。カード番号・口座の詳細はStripeが管理）</li>
            <li>店舗運営の記録（予約、売上、メニュー、AI専属コンサルとのやり取り、操作の記録等）</li>
            <li>スタッフの氏名、シフトの希望・勤務予定等</li>
            <li>掲載ページへのアクセス統計</li>
          </ul>

          <p style={sub}>● 店舗のお客様（店舗が当サービスに登録する方）</p>
          <p style={{ margin: 0 }}>店舗が当サービスに登録・記録する情報です。詳細は下記「2-3」をご覧ください。</p>

          <p style={sub}>● 営業パートナー</p>
          <ul className="stack" style={list}>
            <li>氏名・屋号、メールアドレス、紹介コード</li>
            <li>紹介の実績と報酬の計算・支払いに必要な情報（報酬の振込先を含みます）</li>
          </ul>

          <p style={sub}>● お問い合わせ・応募をされた方</p>
          <ul className="stack" style={list}>
            <li>フォームにご入力いただいた内容（氏名・屋号、連絡先、カテゴリ、ご相談内容等）</li>
          </ul>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>2. 診断データの取り扱い（重要）</h2>
          <p>診断データ（外見の悩み・変わりたい方向性・現状スコア等）は、利用者の内面に関わるセンシティブな情報です。当サービスは以下の方針で取り扱います。</p>
          <ul className="stack" style={{ gap: 6 }}>
            <li><strong>Fineme内でのパーソナライズに使用します。</strong>診断結果をもとに、あなたに合うサービスの優先表示・変容ロードマップの生成を行います。これが診断の存在意義です。</li>
            <li><strong>匿名集計データを掲載者向けダッシュボードで提供します。</strong>「今月の訪問者のうちXX%が清潔感タイプでした」等、個人を特定できない形での集計データを掲載者に提供することがあります。</li>
            <li><strong>外部広告配信には使用しません。</strong>Facebook・Google等への診断データの提供・連携は行いません（ページの閲覧や購入の計測については下記6をご覧ください）。</li>
            <li><strong>第三者への個人データの販売・提供は行いません。</strong></li>
            <li><strong>同意なくプロモーションメールを送ることはありません。</strong>サービス改善情報等のメールは、明示的に同意いただいた方にのみ送付します。</li>
          </ul>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>2-2. Fineme Mirror（AI写真診断）の写真の取り扱い</h2>
          <p>Fineme Mirrorは、アップロードされた写真をAI（Anthropic社のClaude）で解析し、ビジュアルレポートを生成する機能です。写真の取り扱いは以下の方針とします。</p>
          <ul className="stack" style={{ gap: 6 }}>
            <li><strong>無料プレビュー段階の写真は、購入されない限り7日を目安に自動削除します。</strong>アクセス制御された非公開のストレージに一時保存し、期限を過ぎると写真データのみを削除します（分析結果テキストは残ります）。</li>
            <li><strong>購入済み（有料）の分析については、レポートの再表示のため写真を保存します。</strong>非公開のストレージに保存し、閲覧の都度、本人確認のうえ期限付きの署名付きURLでのみ表示します。</li>
            <li><strong>サブスクリプション解約後90日が経過したアカウントの写真・分析データは自動削除します。</strong></li>
            <li><strong>写真を当サービスがAIモデルの学習データとして提供することはありません。</strong>診断・レポート生成の目的にのみ使用します。</li>
            <li><strong>第三者への写真データの販売・提供・広告配信への利用は行いません。</strong></li>
          </ul>
          <p>写真の削除をご希望の場合は、下記「8. 開示・訂正・削除等の請求」の連絡先までご連絡ください。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>2-3. 店舗が登録する「店舗のお客様」の情報（店舗運営機能）</h2>
          <p>掲載者（店舗）は、予約・顧客管理・カルテ・決済などの店舗運営機能で、店舗のお客様の情報を当サービスに登録できます。これらの情報について、当サービスは店舗から取り扱いを任された立場（委託先）として、以下の方針で取り扱います。</p>
          <p style={sub}>取り扱う情報の例</p>
          <ul className="stack" style={list}>
            <li>氏名、連絡先、誕生日、LINEのユーザー識別子</li>
            <li>予約・来店の履歴、カルテの記録（店舗が設定した項目とメモ）、回数券・会員プランの利用状況、決済の記録</li>
            <li>姿勢分析の写真と分析結果、健康診断等の結果の写真と生活習慣のアドバイス</li>
            <li>入会手続きでお預かりする本人確認書類の画像</li>
          </ul>
          <ul className="stack" style={{ gap: 6, marginTop: 6 }}>
            <li><strong>その店舗のサービス提供のためにのみ使用します。</strong>登録した店舗以外には表示せず、当サービスが独自の目的（広告・他店舗への紹介等）に使用することはありません。</li>
            <li><strong>健康診断等の結果は、特に慎重に扱います。</strong>健康に関する情報は法律上「要配慮個人情報」にあたる場合があります。店舗は、これらの情報を記録する前に、お客様ご本人から同意を得るものとします。写真は非公開のストレージに保存し、表示の都度、期限付きの署名付きURLでのみ表示します。AIによるアドバイスは一般的な生活習慣の観点からの参考情報であり、医学的な診断ではありません。</li>
            <li><strong>本人確認書類の画像</strong>は非公開のストレージに保存し、その店舗のみが確認できます。</li>
            <li><strong>お客様ご本人が当サービスの会員の場合</strong>、店舗が記録した姿勢分析・健康に関するアドバイスの一部を、ご自身の記録画面で確認できます。</li>
            <li>店舗のお客様の情報の開示・訂正・削除等は、まず該当の店舗にご相談ください。当サービス（下記8の連絡先）にご連絡いただいた場合も、店舗と連携して対応します。</li>
          </ul>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>2-4. AIの利用</h2>
          <p>当サービスは、以下の機能でAI（Anthropic社のClaude）を利用しています。各機能に必要な範囲の情報のみをAIに送信します。</p>
          <ul className="stack" style={{ gap: 6 }}>
            <li>Fineme Mirrorの写真の分析と、レポートの生成</li>
            <li>診断結果にもとづく変容ロードマップの生成</li>
            <li>店舗の姿勢分析・健康に関するアドバイス（写真と、スタッフが補足入力した内容）</li>
            <li>店舗のカルテ記録をもとにした、お客様への声かけ文の作成</li>
            <li>AI専属コンサル（店舗の予約・売上・業務の記録をもとにした、店舗運営の提案）</li>
          </ul>
          <p>Anthropic社は、API経由で送信されたデータを、同社の商用規約に基づきAIモデルの学習に使用しない方針としています。当サービスも、送信した情報をAIモデルの学習データとして提供することはありません。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>3. 利用目的</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>アカウントの作成・認証・本人確認のため</li>
            <li>予約・問い合わせの管理、日程調整、連絡（LINE・メールでの通知を含みます）のため</li>
            <li>診断結果に基づくサービスのパーソナライズ・ロードマップ生成のため</li>
            <li>掲載者（店舗）が店舗運営機能（顧客管理・カルテ・決済・シフト管理・AI専属コンサル等）を使うため</li>
            <li>掲載プランの課金管理・請求・決済処理、店舗のお客様の決済処理のため</li>
            <li>営業パートナーの紹介実績の記録、報酬の計算・支払いのため</li>
            <li>掲載者向けアクセス統計レポートの提供のため</li>
            <li>サービスの改善・新機能開発、利用状況の分析のため</li>
            <li>不正利用の防止・セキュリティ確保のため</li>
            <li>法令に基づく対応のため</li>
          </ul>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>4. 利用する第三者サービス</h2>
          <p>当サービスは以下の第三者サービスを利用しており、各サービスのプライバシーポリシーが適用されます。</p>
          <ul className="stack" style={{ gap: 8 }}>
            <li><strong>Supabase（Supabase Inc.）</strong>：ユーザー認証・データベース管理・写真等のストレージ<br /><a href="https://supabase.com/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://supabase.com/privacy</a></li>
            <li><strong>Anthropic（Anthropic PBC）</strong>：AIによる写真の分析・文章の生成（上記2-4）<br /><a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://www.anthropic.com/legal/privacy</a></li>
            <li><strong>Stripe（Stripe, Inc.）</strong>：決済処理・課金管理、店舗のお客様の決済と店舗への入金<br /><a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://stripe.com/jp/privacy</a></li>
            <li><strong>LINE（LINEヤフー株式会社）</strong>：LINEログイン・LINEでの予約と通知<br /><a href="https://www.lycorp.co.jp/ja/company/privacypolicy/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://www.lycorp.co.jp/ja/company/privacypolicy/</a></li>
            <li><strong>Resend</strong>：メールの送信<br /><a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://resend.com/legal/privacy-policy</a></li>
            <li><strong>Google Analytics（Google LLC）</strong>：サイトの利用状況の分析<br /><a href="https://policies.google.com/privacy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://policies.google.com/privacy</a></li>
            <li><strong>Meta ピクセル（Meta Platforms, Inc.）</strong>：サイトの閲覧・購入の計測と広告効果の測定<br /><a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://www.facebook.com/privacy/policy/</a></li>
            <li><strong>Sentry</strong>：エラーの検知・不具合の調査<br /><a href="https://sentry.io/privacy/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://sentry.io/privacy/</a></li>
            <li><strong>Vercel（Vercel Inc.）</strong>：ホスティング・インフラ<br /><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://vercel.com/legal/privacy-policy</a></li>
            <li><strong>Cloudflare（Cloudflare, Inc.）</strong>：DNS・CDN・メール転送<br /><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>https://www.cloudflare.com/privacypolicy/</a></li>
          </ul>
          <p>これらのサービスの一部は日本国外のサーバーで情報を取り扱います。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>5. 情報の提供</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li><strong>予約が成立した場合</strong>、予約対応に必要な範囲（氏名・連絡先・希望日時等）を該当の掲載者（店舗）に提供します。掲載者はこの情報を予約対応と、そのお客様へのサービス提供以外の目的に使用することはできません。</li>
            <li><strong>営業パートナーには</strong>、本人が紹介した掲載者（店舗）の名称と課金の状況を、本人専用のページで表示します。</li>
            <li>上記と法令に基づく場合を除き、ご本人の同意なく第三者に個人情報を提供することはありません。</li>
          </ul>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>6. Cookie・ローカルストレージ・計測ツールの利用</h2>
          <p>ログイン状態の維持・診断結果の保持・利便性向上のため、Cookie およびブラウザのローカルストレージを利用します。ブラウザ設定で無効化できますが、一部機能に影響することがあります。</p>
          <p>また、サイトの利用状況を把握するために Google Analytics を、サイトの閲覧（ページビュー）と Fineme Mirror の紹介ページの閲覧・購入完了の計測に Meta ピクセルを利用しています。これらのツールは Cookie 等を使って、閲覧したページや購入の有無などの情報を収集します。診断の回答・結果や写真の内容は送信しません。Google Analytics の収集は<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">オプトアウトアドオン</a>で、Meta の広告表示は Meta の<a href="https://www.facebook.com/adpreferences/" target="_blank" rel="noopener">広告設定</a>で、それぞれ停止・変更できます。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>7. 情報の保管とセキュリティ</h2>
          <p>取得した個人情報はSupabaseのデータベースに保存し、適切なアクセス制御（Row Level Security）を適用して保護します。写真・本人確認書類など特に慎重に扱う情報は非公開のストレージに保存し、表示の都度、期限付きの署名付きURLでのみ表示します。店舗運営機能では、店舗内での操作の記録を残します。不正アクセス・漏洩・滅失の防止に努めますが、完全な安全性を保証するものではありません。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>8. 開示・訂正・削除等の請求</h2>
          <p>ご自身の情報の開示・訂正・利用停止・削除等を希望される場合は、<a href="mailto:contact@fineme.me">contact@fineme.me</a> よりご連絡ください。本人確認の上、合理的な期間内に対応いたします。店舗が登録した情報については、上記2-3のとおり店舗と連携して対応します。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>9. 未成年者の利用</h2>
          <p>18歳未満の方が当サービスをご利用になる場合は、保護者の同意を得たうえでご利用ください。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>10. 本ポリシーの変更</h2>
          <p>本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。重要な変更がある場合は、当サービス上で事前に告知します。</p>
        </section>

        <section className="card stack" style={sec}>
          <h2 style={h2}>11. お問い合わせ</h2>
          <p>本ポリシーに関するお問い合わせ：<a href="mailto:contact@fineme.me">contact@fineme.me</a></p>
        </section>

        <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>制定日: 2026-03-09 / 改定日: 2026-08-12（Mirror写真保存に関する条項を追加） / 改定日: 2026-10-10（店舗運営機能・AIの利用・営業パートナー・計測ツールに関する条項を追加）</p>
      </div>
    </main>
  );
}
