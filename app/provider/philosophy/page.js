export const metadata = {
  title: 'Finemeの考え方',
  description: 'Finemeは、一度来てくださったお客様に、また来たいと思ってもらうための店舗の道具です。大切にしていることと、毎日の回し方を掲載店舗の皆さまにお伝えします。',
  openGraph: {
    title: 'Finemeの考え方 | Fineme',
    description: '来てくださったお客様を常連に。記録・次回のご案内・ちょうどいい声かけを、AI専属コンサルと一緒に。',
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
        <p className="muted" style={{ marginTop: '-4px' }}>掲載店舗の皆さまへ</p>

        {/* でお指摘（2026-10-16）：旧来の「診断→マッチングで新しい人に出会う」前提の内容を、
            今の店舗SaaS（リピーター作り＋AI専属コンサル）に合わせて書き直した */}
        <div className="phil-hero">
          <p className="phil-quote">
            「外見を整えることで生まれる小さな自信が、<br />
            人に優しくなれる余白をつくり、<br />
            世界は少しずつ<span>愛で満たされていく</span>。」
          </p>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '14px', lineHeight: '1.9', margin: 0 }}>
            その自信は、一度の施術ではなく、<strong style={{ color: '#fff' }}>通い続ける中で少しずつ育つもの</strong>です。<br />
            だからFinemeは、新しいお客様を集める仕組みではなく、<strong style={{ color: '#fff' }}>来てくださったお客様に、また来たいと思ってもらうための道具</strong>として作っています。
          </p>
        </div>

        <div className="card phil-card">
          <h2>Finemeが大切にしていること</h2>
          <div className="phil-item">
            <div className="phil-body">
              <h3>新しいお客様の取り合いより、来てくれたお客様を常連に</h3>
              <p>2回目に来てもらえるか、通う間隔が空いた時に戻ってきてもらえるか。お店の売上を支えるのは、ここです。Finemeの機能は、すべてこの「リピート」に向けて作っています。</p>
            </div>
          </div>
          <div className="phil-item">
            <div className="phil-body">
              <h3>記録が、次の接客を良くする</h3>
              <p>カルテや来店の記録は、残すだけでは意味がありません。来店前に前回の内容と「今日聞くこと」が出て、会計時に次回の目安と一言が出る。記録を、その日の接客に返す形にしています。</p>
            </div>
          </div>
          <div className="phil-item">
            <div className="phil-body">
              <h3>お知らせは、次の行動につながる形で</h3>
              <p>次の来店の目安や、しばらく間が空いたお客様への声かけは、お店のLINEから届き、そのまま予約できるボタンが付きます。お客様にとっても、お店にとっても、手間を一つ減らすことを大切にしています。</p>
            </div>
          </div>
          <div className="phil-item">
            <div className="phil-body">
              <h3>AIは、相談相手であり、手を動かす係</h3>
              <p>AI専属コンサルは、お店の実際の数字と目標から「今日やること」を出し、声かけの文面づくりや送信まで手伝います。助言だけで終わらせず、実行まで一緒に進めます。</p>
            </div>
          </div>
          <div className="phil-item">
            <div className="phil-body">
              <h3>予約の手数料はいただきません</h3>
              <p>Finemeは予約を売る広告ではなく、お店を運営するための道具です。月額のご利用料のほかに、予約1件ごとの手数料はかかりません（オンライン決済をご利用の場合のみ、決済手数料がかかります）。</p>
            </div>
          </div>
        </div>

        <div className="card phil-card">
          <h2>毎日の回し方</h2>
          <div className="phil-flow">
            <div className="phil-flow-step">
              <div className="phil-flow-num">1</div>
              <div className="phil-flow-body"><strong>朝、AI専属コンサルの「今日やること」を見る</strong><br />声をかけるお客様や、回数券の残りが少ないお客様など、今日やると効くことが並びます。</div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">2</div>
              <div className="phil-flow-body"><strong>来店前に「接客の引き出し」を開く</strong><br />前回の記録、間隔、今日聞くことを確認してからお迎えします。</div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">3</div>
              <div className="phil-flow-body"><strong>施術後はカルテを残し、会計時に次回をご案内</strong><br />次回の目安日と一言が出るので、その場で次回の予約を入れられます。</div>
            </div>
            <div className="phil-flow-step">
              <div className="phil-flow-num">4</div>
              <div className="phil-flow-body"><strong>あとは自動で</strong><br />予約の前日のご案内、来店後のクチコミのお願い、来店の目安を過ぎたお客様へのお知らせは、Finemeが自動で送ります。</div>
            </div>
          </div>
          <div className="phil-matching">
            <h3>新しいお客様との出会いについて</h3>
            <p>Finemeには外見診断（Me Scan）を受けた方が、相性の良いお店を見つける仕組みもあります。公開ページのアピールや「AIマッチングプロフィール」を書いておくと、診断結果と照らして合う方に表示されます。ただし、Finemeは新規集客をお約束するものではありません。来てくださったお客様を常連にすることが、いちばん確実な近道です。</p>
          </div>
        </div>

        {/* ビジョン */}
        <div className="phil-dark">
          <p style={{ color: '#c9a84c', fontSize: '13px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vision</p>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.6 }}>
            外見を理由に、人生を諦めなくていい世界をつくる。
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.8', margin: 0 }}>
            あなたのお店に通う時間が、誰かの自信を少しずつ育てていきます。<br />
            Finemeは、その「通い続ける関係」を支える道具でありたいと考えています。
          </p>
        </div>

        <div className="cluster" style={{ gap: '10px', justifyContent: 'center' }}>
          <a className="btn" href="/provider/dashboard">ダッシュボードへ戻る</a>
          <a className="btn btn-ghost" href="/provider/dashboard?tab=scripts">接客の引き出しを開く</a>
        </div>
      </div>
    </main>
  );
}
