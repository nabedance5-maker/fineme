export const metadata = {
  title: 'Finemeの掲載理念',
  description: 'Finemeはなぜ「診断→マッチング→変容」という設計なのか。掲載者（ガイド）の役割と、HOT PEPPERとの本質的な違いを解説します。',
  openGraph: {
    title: 'Finemeの掲載理念 | Fineme',
    description: '掲載者（ガイド）の役割と、診断→マッチング→変容という設計の理由。',
  },
};

export default function ProviderPhilosophyPage() {
  return (
    <main className="section">
      <style>{`
        .phil-hero {
          background: linear-gradient(135deg, #0a0f1e 0%, #1a1f3e 100%);
          border-radius: 18px;
          padding: 40px 32px;
          margin-bottom: 20px;
        }
        .phil-quote {
          font-size: 18px; font-weight: 800; line-height: 1.9; color: #fff;
          border-left: 4px solid #c9a84c; padding-left: 20px; margin: 0 0 20px;
        }
        .phil-quote span { color: #c9a84c; }
        .phil-card { padding: 28px; margin-bottom: 16px; }
        .phil-card h2 { font-size: 17px; font-weight: 800; color: #0a0f1e; margin: 0 0 18px; }
        .phil-item { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
        .phil-item:last-child { border-bottom: none; }
        .phil-icon { font-size: 26px; flex-shrink: 0; width: 36px; text-align: center; }
        .phil-body h3 { font-size: 15px; font-weight: 800; margin: 0 0 6px; color: #0a0f1e; }
        .phil-body p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.7; }
        .phil-matching {
          background: rgba(201,168,76,0.06);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 12px;
          padding: 20px;
          margin: 16px 0 0;
        }
        .phil-matching h3 { font-size: 14px; font-weight: 800; color: #92721c; margin: 0 0 10px; }
        .phil-matching p { font-size: 13px; color: #374151; margin: 0; line-height: 1.7; }
        .phil-chip {
          display: inline-block;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.4);
          color: #92721c;
          font-size: 12px; font-weight: 700;
          padding: 4px 12px; border-radius: 99px; margin: 4px 4px 0 0;
        }
        .phil-flow {
          display: flex; flex-direction: column; gap: 0;
        }
        .phil-flow-step {
          display: flex; align-items: flex-start; gap: 14px; padding: 14px 0;
          border-bottom: 1px dashed #e5e7eb;
        }
        .phil-flow-step:last-child { border-bottom: none; }
        .phil-flow-num {
          width: 28px; height: 28px; border-radius: 50%;
          background: #0a0f1e; color: #c9a84c;
          font-size: 13px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }
        .phil-flow-body { font-size: 13px; color: #374151; line-height: 1.7; }
        .phil-flow-body strong { color: #0a0f1e; font-weight: 800; }
        .phil-dark {
          background: linear-gradient(135deg, #0a0f1e, #1a1f3e);
          border-radius: 16px; padding: 28px 32px; margin-bottom: 16px;
        }
        @media (max-width: 640px) {
          .phil-hero { padding: 28px 20px; }
          .phil-card { padding: 20px; }
          .phil-dark { padding: 24px 20px; }
        }
      `}</style>
      <div className="container stack" style={{ maxWidth: '780px' }}>
        <h1 className="section-title">Finemeの考え方</h1>
        <p className="muted" style={{ marginTop: '-4px' }}>掲載者（ガイド）の皆さんへ</p>

        {/* フィロソフィーヒーロー */}
        <div className="phil-hero">
          <p className="phil-quote">
            「外見を整えることで生まれる小さな自信が、<br />
            人に優しくなれる余白をつくり、<br />
            世界は少しずつ<span>愛で満たされていく</span>。」
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: '1.8', margin: 0 }}>
            Finemeは、外見磨きのサービスを「予約できる場所」として作っていません。<br />
            変わりたいと思っている人が<strong style={{ color: '#fff' }}>「地図」と「羅針盤」を手に入れ、変容の旅を始める入口</strong>として設計されています。
          </p>
        </div>

        {/* ユーザーがFinemeに来るまでの流れ */}
        <div className="card phil-card">
          <h2>ユーザーがあなたに出会うまでの流れ</h2>
          <div className="phil-flow">
            <div className="phil-flow-step">
              <div className="phil-flow-num">1</div>
              <div className="phil-flow-body">
                <strong>Me Scan（外見診断）</strong> を受ける<br />
                体型・眉・服・髪・肌・歯・爪の7軸で現在地を可視化。変わりたい理由・シーン・ビジョンも入力する。
              </div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">2</div>
              <div className="phil-flow-body">
                <strong>New Me Map（変容マップ）</strong> を受け取る<br />
                7軸レーダーチャートで「現在地×理想」を可視化。ユーザーが「自分のどこから手をつけるべきか」を自覚する。
              </div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">3</div>
              <div className="phil-flow-body">
                <strong>Fineme Compass（最初の一手）</strong> が提示される<br />
                「あなたの変容の起点はここだ」という1軸が、診断結果から自動選定される。
              </div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">4</div>
              <div className="phil-flow-body">
                <strong>あなたのページに辿り着く</strong><br />
                Compassが示した軸に沿って、診断結果との相性スコアが高いガイドが表示される。ここで初めてあなたに出会う。
              </div>
            </div>
          </div>

          <div className="phil-matching">
            <h3>マッチングスコアの仕組み</h3>
            <p>Finemeは人気順でも価格順でもなく、<strong>「ユーザーとの相性スコア」</strong>で表示順が変わります。<br />スコアに影響するのは以下の2項目（ダッシュボード「公開設定」タブで設定）：</p>
            <div style={{ marginTop: '10px' }}>
              <span className="phil-chip">きっかけ（suitable_triggers）</span>
              <span className="phil-chip">失敗パターン（handles_failure_patterns）</span>
            </div>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
              ユーザーの診断結果に記録された「変わりたいきっかけ」と「過去の失敗パターン」が、あなたの設定と一致するほどスコアが上がります。この2項目を丁寧に設定することが、「合う人に届く」ための実質的な行動です。
            </p>
          </div>
        </div>

        {/* ガイドとしてのあなたへ */}
        <div className="card phil-card">
          <h2>あなたは「出品者」ではなく「ガイド」です</h2>
          <div className="phil-item">
            <span className="phil-icon">🧭</span>
            <div className="phil-body">
              <h3>ユーザーは答えを探しているのではない</h3>
              <p>診断を受けたユーザーはすでに「変わりたい理由」を言語化しています。あなたの役割はサービスを売ることではなく、その人の変容の旅に寄り添う「ガイド」として機能することです。</p>
            </div>
          </div>
          <div className="phil-item">
            <span className="phil-icon">🗺️</span>
            <div className="phil-body">
              <h3>体験談は「レビュー」ではなく「変容の記録」</h3>
              <p>Finemeの体験談機能は、ユーザーが「変わった証拠」を残す場所です。星評価より「あなたのどこがどう変わったか」という言葉が、次のユーザーの背中を押します。</p>
            </div>
          </div>
          <div className="phil-item">
            <span className="phil-icon">🔄</span>
            <div className="phil-body">
              <h3>紹介した仲間の掲載が続く限り報酬が発生する</h3>
              <p>あなたのFN番号を他の事業者に共有し、その方がFinemeに掲載し続ける間、毎月¥500の紹介報酬が発生します。掲載料を紹介報酬で相殺・プラスにすることも可能です。</p>
            </div>
          </div>
        </div>

        {/* ビジョン */}
        <div className="phil-dark">
          <p style={{ color: '#c9a84c', fontSize: '13px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vision</p>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.6 }}>
            外見を理由に、人生を諦めなくていい世界をつくる。
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.8', margin: 0 }}>
            あなたが持つ技術・経験・視点は、誰かの「新しい自分」への入口になります。<br />
            Finemeは、その出会いを「相性」で設計するプラットフォームです。
          </p>
        </div>

        <div className="cluster" style={{ gap: '10px', justifyContent: 'center' }}>
          <a className="btn" href="/provider/dashboard">ダッシュボードへ戻る</a>
          <a className="btn btn-ghost" href="/provider/dashboard">公開設定を見直す</a>
        </div>
      </div>
    </main>
  );
}
