export default function ProviderPhilosophyPage() {
  return (
    <main className="section">
      <style>{`
        .philosophy-section { padding: 24px; margin-bottom: 16px; }
        .philosophy-quote {
          font-size: 17px; font-weight: 700; line-height: 1.8; color: #111;
          border-left: 4px solid #2563eb; padding-left: 16px; margin: 0 0 16px;
        }
        .philosophy-item { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
        .philosophy-item:last-child { border-bottom: none; }
        .philosophy-item-icon { font-size: 24px; flex-shrink: 0; }
        .philosophy-item-body h3 { font-size: 15px; font-weight: 800; margin: 0 0 4px; }
        .philosophy-item-body p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6; }
      `}</style>
      <div className="container stack" style={{maxWidth: '780px'}}>
        <h1 className="section-title">Finemeの考え方</h1>

        <div className="card philosophy-section">
          <p className="philosophy-quote">
            「外見を整えることで生まれる小さな自信が、<br/>
            人に優しくなれる余白をつくり、<br/>
            世界は少しずつ愛で満たされていく。」
          </p>
          <p style={{fontSize:'14px', color:'#374151', lineHeight:'1.8'}}>
            Finemeは、外見磨きのサービスを「予約できる場所」として提供しているのではありません。<br/>
            <strong>変わりたいと思っている人が、最初の一歩を踏み出せる場所</strong>として設計されています。
          </p>
        </div>

        <div className="card philosophy-section">
          <h2 style={{margin:'0 0 16px', fontSize:'17px', fontWeight:'800'}}>あなたの掲載がFinemeに何をもたらすか</h2>
          <div className="philosophy-item">
            <span className="philosophy-item-icon">🎯</span>
            <div className="philosophy-item-body">
              <h3>「合う人」と出会える仕組み</h3>
              <p>Finemeのユーザーは診断を受けてからサービスを探します。「なぜ変わりたいか」「どんなサポートが合うか」を整理した状態で来るため、ミスマッチが少なく、成約率と継続率が上がります。</p>
            </div>
          </div>
          <div className="philosophy-item">
            <span className="philosophy-item-icon">🔍</span>
            <div className="philosophy-item-body">
              <h3>価格ではなく「相性」で選ばれる</h3>
              <p>他のポータルサイトは人気順・価格順で並びます。Finemeは診断データとの一致度で並びます。あなたの得意なお客様に、あなたのサービスが届きます。</p>
            </div>
          </div>
          <div className="philosophy-item">
            <span className="philosophy-item-icon">📝</span>
            <div className="philosophy-item-body">
              <h3>プロフィールを丁寧に書くほど、合う人が来る</h3>
              <p>「こんな人に向いています」「大切にしていること」を書くほど、診断との一致度が上がります。量より質。あなたの言葉がそのまま集客になります。</p>
            </div>
          </div>
          <div className="philosophy-item">
            <span className="philosophy-item-icon">🔄</span>
            <div className="philosophy-item-body">
              <h3>掲載者が掲載者を紹介する仕組み</h3>
              <p>あなたの紹介コード（FN番号）を他の事業者に共有すると、その方の掲載が続く限り毎月¥500の報酬が発生します。掲載料を紹介報酬で相殺・プラスにすることも可能です。</p>
            </div>
          </div>
        </div>

        <div className="card philosophy-section" style={{background:'linear-gradient(135deg,#0f172a,#1e1b4b)'}}>
          <p style={{color:'#fff', fontSize:'16px', fontWeight:'800', margin:'0 0 8px'}}>Finemeが目指す世界</p>
          <p style={{color:'rgba(255,255,255,0.8)', fontSize:'14px', lineHeight:'1.8', margin:'0'}}>
            外見を理由に、人生を諦めなくていい世界をつくる。<br/>
            あなたのサービスが、誰かの「新しい自分」への入口になります。
          </p>
        </div>

        <div className="cluster" style={{gap:'10px', justifyContent:'center'}}>
          <a className="btn" href="/provider/dashboard">ダッシュボードへ戻る</a>
          <a className="btn btn-ghost" href="/provider/dashboard">プロフィールを充実させる</a>
        </div>
      </div>
    </main>
  );
}
