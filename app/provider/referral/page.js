export default function ProviderReferralPage() {
  return (
    <main>
      <style>{`
        .referral-section { padding: 40px 0; }
        .referral-hero { padding: 64px 0; background: linear-gradient(120deg, rgba(14,165,233,.15), rgba(99,102,241,.15)); }
        .referral-card { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; box-shadow: 0 8px 24px rgba(17,24,39,.08); }
        .referral-grid-2 { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
        .referral-grid-3 { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }
        .referral-muted { color: #6b7280; }
        .referral-badge { display: inline-block; padding: 4px 8px; font-size: 12px; border-radius: 999px; background: #111; color: #fff; }
        @media (max-width: 960px) { .referral-grid-2 { grid-template-columns: 1fr; } .referral-grid-3 { grid-template-columns: 1fr; } }
      `}</style>

      <section className="referral-hero">
        <div className="container stack">
          <h1 className="section-title">紹介制度の詳細</h1>
          <p className="referral-muted">Finemeに共感する事業者同士が、お互いの「合う可能性」をユーザーに橋渡しする仕組みです。</p>
        </div>
      </section>

      <section className="referral-section">
        <div className="container stack">
          <h2 className="section-title">仕組み</h2>
          <div className="referral-grid-3">
            <div className="referral-card"><span className="referral-badge">相互紹介</span><p className="referral-muted">あなたのユーザーに対して「この分野ならこの人が良い」と紹介できる掲載者を選び、紹介リンクを発行します。</p></div>
            <div className="referral-card"><span className="referral-badge">紹介トラッキング</span><p className="referral-muted">紹介リンク経由の閲覧・予約はトラッキングされ、紹介ポイントが加算されます。</p></div>
            <div className="referral-card"><span className="referral-badge">ポイント精算</span><p className="referral-muted">月次で紹介ポイントを精算。掲載料から差し引く（実質無料）またはプラス分をキャッシュバックします。</p></div>
          </div>
        </div>
      </section>

      <section className="referral-section">
        <div className="container stack">
          <h2 className="section-title">条件</h2>
          <div className="referral-grid-2">
            <div className="referral-card">
              <h3>参加要件</h3>
              <ul className="referral-muted">
                <li>Finemeの理念に共感していること</li>
                <li>プロフィールが丁寧に言語化されていること</li>
                <li>紹介先の品質に責任を持つ意思があること</li>
              </ul>
            </div>
            <div className="referral-card">
              <h3>NG事項</h3>
              <ul className="referral-muted">
                <li>数集め目的の乱暴な紹介</li>
                <li>価格勝負を助長する紹介</li>
                <li>虚偽・誇大な表現</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="referral-section">
        <div className="container stack">
          <h2 className="section-title">事例（シミュレーション）</h2>
          <div className="referral-grid-2">
            <div className="referral-card"><h3>掲載料が実質無料に</h3><p className="referral-muted">あなたの紹介から月5件の予約が成立。紹介ポイントが月額7,000円を上回り、掲載料が実質無料に。</p></div>
            <div className="referral-card"><h3>プラスのキャッシュバック</h3><p className="referral-muted">紹介ポイントが掲載料を超過した場合、翌月に差額分をキャッシュバックします。</p></div>
          </div>
        </div>
      </section>

      <section className="referral-section">
        <div className="container stack">
          <h2 className="section-title">参加の流れ</h2>
          <ol className="referral-muted" style={{paddingLeft:'18px'}}>
            <li>制度説明を受ける（オンライン）</li>
            <li>紹介パートナーを選定する</li>
            <li>紹介リンクの発行・掲出</li>
            <li>月次精算（掲載料充当またはキャッシュバック）</li>
          </ol>
          <div className="cluster">
            <a className="btn" href="/provider/join">資料請求・相談</a>
            <a className="btn btn-ghost" href="/provider/join">募集LPへ戻る</a>
          </div>
        </div>
      </section>
    </main>
  );
}
