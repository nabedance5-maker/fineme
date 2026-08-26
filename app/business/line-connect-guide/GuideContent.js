'use client';

// 店舗の公式LINE連携ガイド（掲載者向け）。
// ブラウザでそのまま読めて、「PDFを保存」ボタンで印刷ダイアログ（PDF保存）にもできる。
// app/provider/log-toolkit/page.js と同じ window.print() パターンを使う。

export default function LineConnectGuideContent() {
  return (
    <main className="section">
      <style>{`
        @media print {
          .navbar, .footer, .no-print { display: none !important; }
          main.section { padding: 0 !important; }
        }
        .lcg-step {
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .lcg-step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px; height: 28px;
          border-radius: 999px;
          background: #111;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          margin-right: 8px;
        }
        .lcg-faq dt { font-weight: 700; margin-top: 12px; }
        .lcg-faq dd { margin: 4px 0 0; color: var(--color-muted); }
        .lcg-code { background: #f3f4f6; color: #111827; padding: 2px 6px; border-radius: 4px; }
      `}</style>

      <div className="container stack" style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>店舗の公式LINE連携ガイド</h1>
          <button className="btn" onClick={() => window.print()}>PDFを保存 / 印刷する</button>
        </div>
        <p className="muted">対象：Fineme掲載者様（プレミアムプランでご利用いただけます）</p>

        <section className="card stack" style={{ padding: 20, gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>この機能でできること</h2>
          <p>
            「New Me Log」は、お客様がご自身の来店サイクル（前回来店日・次回の目安）を無料で記録できるツールです。次回のタイミングが近づくと、Finemeが自動でLINE通知をお届けします。
          </p>
          <p>
            この連携設定を行うと、その通知が<strong>Fineme公式LINEではなく、貴店の公式LINEアカウントから</strong>届くようになります。すでに貴店の公式LINEを友だち追加しているお客様には、より気づいてもらいやすくなります。
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            未設定のままでも New Me Log 自体はご利用いただけます（その場合はFineme公式LINEから通知が届きます）。この連携は「開封率をさらに上げたい」場合の追加設定です。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>設定前に準備するもの</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>貴店のLINE公式アカウント（無料プランでも設定可能です）</li>
            <li>LINE公式アカウントの管理者としてログインできること</li>
            <li>（任意）お客様向けの連携ページを作る場合はLINE Developersアカウント。この部分は難しく感じる場合、Finemeサポートが代行設定いたします</li>
          </ul>
        </section>

        <section className="stack" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>設定手順</h2>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">1</span><strong>LINE公式アカウントでMessaging APIを有効にする</strong></p>
            <ol className="stack" style={{ gap: 6, marginLeft: 18 }}>
              <li><a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer">LINE Official Account Manager</a> に貴店のLINE公式アカウントでログインします。</li>
              <li>右上の「設定」を開き、左メニューの「Messaging API」を選びます。</li>
              <li>「Messaging APIを利用する」を押して有効化します。</li>
            </ol>
          </div>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">2</span><strong>チャネルアクセストークンを発行する</strong></p>
            <ol className="stack" style={{ gap: 6, marginLeft: 18 }}>
              <li><a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">LINE Developersコンソール</a> に同じアカウントでログインし、対象のチャネル（貴店のアカウント）を選びます。</li>
              <li>「Messaging API設定」タブを開き、下にスクロールして「チャネルアクセストークン（長期）」の「発行」を押します。</li>
              <li>表示された文字列をコピーします。<strong>この文字列は貴店のLINEアカウントを操作できる重要な情報です。Fineme以外には渡さないでください。</strong></li>
            </ol>
          </div>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">3</span><strong>Finemeの掲載者ダッシュボードに登録する</strong></p>
            <ol className="stack" style={{ gap: 6, marginLeft: 18 }}>
              <li><a href="/provider/dashboard?tab=line-channel">掲載者ダッシュボード</a> にログインし、「💬 LINE連携」タブを開きます。</li>
              <li>コピーしたチャネルアクセストークンを貼り付け、「保存して確認する」を押します。</li>
              <li>「✅ 連携済み」と表示されれば設定は完了です。</li>
            </ol>
          </div>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">4</span><strong>お客様の連携ページ（LIFF）を作る</strong></p>
            <p style={{ marginLeft: 18 }}>
              LINEのアカウント識別ID（userId）は、公式LINEアカウントごとに別の値になる仕組みです。そのため「お客様が貴店の公式LINEでも通知を受け取れる」ようにするには、お客様お一人おひとりに、貴店の公式LINE上でのIDをFinemeに一度だけ登録していただく専用ページ（LIFF＝LINE公式アカウント内で開けるWebページ）が必要です。
            </p>
            <p style={{ marginLeft: 18, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13.5 }}>
              ⚠️ 2019年のLINE仕様変更により、<strong>Messaging APIチャネル（ステップ2で開いたチャネル）には直接LIFFアプリを追加できません</strong>。同じ「プロバイダー」の中に、もう1つ「LINEログインチャネル」を新規作成し、そちらにLIFFアプリを追加します（下記手順）。
            </p>
            <ol className="stack" style={{ gap: 6, marginLeft: 18 }}>
              <li><a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">LINE Developersコンソール</a> を開き、ステップ2で使ったチャネルが属する「プロバイダー」（会社名・店舗名の見出し）をクリックします（個別のチャネルではなく、その上の一覧画面です）。</li>
              <li>「新規チャネル作成」を押し、チャネルの種類で「<strong>LINEログイン</strong>」を選びます。チャネル名・メールアドレス等、必須項目を入力して作成します。</li>
              <li>作成した「LINEログイン」チャネルを開き、「LIFF」タブを選びます。</li>
              <li>「追加」（LIFFアプリを追加）を押し、以下の通り入力します。
                <ul style={{ marginTop: 4 }}>
                  <li><strong>LIFFアプリ名：</strong>任意（例：Fineme連携）</li>
                  <li><strong>サイズ：</strong>Full</li>
                  <li>
                    <strong>エンドポイントURL：</strong>
                    <code className="lcg-code">https://www.fineme.me/l/【貴店のスラッグ】</code>
                    <br />
                    <span className="muted" style={{ fontSize: 13 }}>「貴店のスラッグ」は、掲載者ダッシュボードに表示されている「fineme.me/provider/◯◯◯」の◯◯◯部分です。</span>
                  </li>
                  <li><strong>Scope：</strong>「profile」にチェック（chat_message.write・openidも合わせてチェックして問題ありません）</li>
                  <li><strong>友だち追加オプション：</strong>「On（Normal）」を選択</li>
                </ul>
              </li>
              <li>「追加」を押すと、「liff-」で始まるLIFF IDが発行されます。これをコピーします。</li>
              <li>
                （推奨）作成した「LINEログイン」チャネルの設定画面で「リンクされたLINE公式アカウント」に、ステップ2のMessaging APIチャネル（貴店の公式アカウント）を指定します。これを設定しておくと、お客様がこのページを開いた時に「友だち追加」も一緒に案内されるため、通知が届きやすくなります。
              </li>
              <li>Finemeダッシュボードの「LINE連携」タブに戻り、「LIFF ID」欄に貼り付けて「保存して確認する」を押します。</li>
            </ol>
            <p className="muted" style={{ fontSize: 13, marginLeft: 18 }}>
              同じ「プロバイダー」内であれば、LINEログインチャネルとMessaging APIチャネルのユーザーIDは自動的に同じものになるため、この連携ページ経由の通知はそのままステップ2〜3で設定した貴店の公式LINEから届きます。ここまでの設定でつまずいた場合は、無理をせずメール（<a href="mailto:contact@fineme.me">contact@fineme.me</a>）にご連絡ください。Finemeサポートが代わりに設定いたします。
            </p>
          </div>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">5</span><strong>店頭にQRコードを設置する</strong></p>
            <ol className="stack" style={{ gap: 6, marginLeft: 18 }}>
              <li><a href="/provider/log-toolkit">New Me Log 紹介ツール</a> のページから、QRコード付きの案内カードを印刷できます。</li>
              <li>レジ横や会計時に、お客様へこのQRコードをご案内ください。</li>
            </ol>
          </div>

          <div className="lcg-step">
            <p style={{ marginTop: 0 }}><span className="lcg-step-num">6</span><strong>（任意）予約前日の来店確認（ノーショー対策）を有効にする</strong></p>
            <p style={{ marginLeft: 18 }}>
              有効にすると、予約前日リマインドに「行きます」「予定が変わりそう」のボタンが付き、お客様がその場で回答できるようになります。設定はステップ3完了後、掲載者ダッシュボードの「LINE連携」タブに表示される専用のURLをコピーし、LINE Official Account Managerの「応答設定」の中にあるWebhook欄に貼り付けて有効化するだけです。
            </p>
          </div>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 4 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>よくある質問</h2>
          <dl className="lcg-faq">
            <dt>「保存して確認する」を押すとエラーになります</dt>
            <dd>チャネルアクセストークンのコピーミス（前後に余分な空白が入っている等）が多い原因です。もう一度コピーし直してお試しください。改善しない場合はお問い合わせください。</dd>

            <dt>LIFFのページに「LINEログインチャネルを使用してください」と出てLIFFを作成できません</dt>
            <dd>正常です。2019年の仕様変更でMessaging APIチャネルには直接LIFFを追加できなくなりました。ステップ4の手順通り、同じプロバイダー内に新しく「LINEログイン」チャネルを作成し、そちらでLIFFアプリを作成してください。</dd>

            <dt>無料のLINE公式アカウントでも使えますか？</dt>
            <dd>使えます。プランに関わらずMessaging APIの有効化だけ行っていただければ設定可能です。</dd>

            <dt>設定が難しくて自分ではできません</dt>
            <dd>Finemeサポートが代わりに設定いたします。チャネルアクセストークンの発行までお手伝いできますので、お気軽にご連絡ください。</dd>

            <dt>連携をやめたい・別のLINEアカウントに変更したいです</dt>
            <dd>メール（<a href="mailto:contact@fineme.me">contact@fineme.me</a>）よりご連絡ください。</dd>
          </dl>
        </section>

        <section className="stack" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>お問い合わせ</h2>
          <p>設定代行も承っております。お気軽にご連絡ください。</p>
          <p>
            メール：<a href="mailto:contact@fineme.me">contact@fineme.me</a>
          </p>
        </section>
      </div>
    </main>
  );
}
