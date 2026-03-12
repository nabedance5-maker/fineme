export const metadata = {
  title: '利用規約（一般ユーザー向け） | Fineme',
  robots: 'index,follow',
};

export default function TermsPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860 }}>
        <h1 className="section-title">利用規約</h1>
        <p className="muted">
          本規約は、Fineme（以下「当サービス」）を利用する一般ユーザー向けの利用条件を定めるものです。サービスを利用することで本規約に同意したものとみなします。<br />
          掲載者（サービスを提供する事業者）の方は、別途 <a href="/terms-provider">掲載者向け利用規約</a> をご確認ください。
        </p>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第1条（サービスの内容）</h2>
          <p>当サービスは、外見磨きに関するサービス（パーソナルジム・眉毛サロン・メイク・ヘア・骨格診断等）を提供する事業者の情報を掲載し、ユーザーがサービスを検索・比較・予約できるプラットフォームです。診断機能を通じて、ユーザーに適したサービスの提案も行います。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第2条（アカウント）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>アカウント登録は任意です。登録なしでも診断・サービス閲覧は利用できます。</li>
            <li>登録する場合は正確な情報をもって作成し、自己の責任で管理してください。</li>
            <li>なりすまし・不正アクセス・第三者への無断貸与・譲渡は禁止します。</li>
            <li>登録情報に変更が生じた場合は、速やかにマイページより更新してください。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第3条（診断機能の利用）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>診断機能は、あなたに合うサービスを見つけやすくするための参考情報を提供するものです。医療診断・専門的なアドバイスの代替にはなりません。</li>
            <li>診断結果はFineme内でのサービス表示のパーソナライズに使用されます。詳細は<a href="/privacy">プライバシーポリシー</a>をご確認ください。</li>
            <li>診断データは第三者への広告配信には使用しません。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第4条（予約・問い合わせ）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>予約・問い合わせは各掲載者との直接のやり取りとなります。当サービスは仲介プラットフォームであり、サービスの内容・品質について保証するものではありません。</li>
            <li>キャンセルポリシーは各掲載者の定める方針に従います。予約前に必ずご確認ください。</li>
            <li>虚偽の情報による予約・無断キャンセルの繰り返しが確認された場合、利用を制限することがあります。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第5条（禁止事項）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>法令または公序良俗に反する行為</li>
            <li>掲載者または他のユーザーへの迷惑行為・嫌がらせ</li>
            <li>不正アクセス・システムへの過度な負荷・スパム行為</li>
            <li>虚偽情報の登録・当サービスの運営を妨げる行為</li>
            <li>当サービスを通じた営業・勧誘・宣伝目的での利用</li>
            <li>当サービスの許諾なく、掲載情報を複製・転用・二次利用する行為</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第6条（知的財産権）</h2>
          <p>当サービスに関する著作権・商標権その他一切の知的財産権は、当サービスまたは正当な権利者に帰属します。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第7条（免責事項）</h2>
          <ul className="stack" style={{ gap: 6 }}>
            <li>当サービスは、掲載内容の正確性・有用性・最新性について保証しません。</li>
            <li>ユーザーと掲載者間のトラブルについて、当サービスは責任を負いません。</li>
            <li>掲載者のサービス品質・施術結果について、当サービスは保証・責任を負いません。</li>
            <li>やむを得ない理由によりサービスの全部または一部を変更・中断・終了することがあります。</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第8条（本規約の変更）</h2>
          <p>当サービスは、必要に応じて本規約を変更できます。重要な変更は事前にサービス上で告知します。変更後にサービスを継続して利用した場合、変更後の規約に同意したものとみなします。</p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>第9条（準拠法・裁判管轄）</h2>
          <p>本規約は日本法に準拠します。当サービスに関する紛争は、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </section>

        <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>制定日: 2026-03-09</p>
      </div>
    </main>
  );
}
