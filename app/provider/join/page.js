export default function ProviderJoinPage() {
  return (
    <main>
      <style>{`
        :root { --lp-accent: #111; --lp-grad-a:#0ea5e9; --lp-grad-b:#6366f1; --lp-grad-c:#111827; }
        .join-hero { position:relative; padding:80px 0; color:#fff; }
        .join-hero::before { content:""; position:absolute; inset:0; background:radial-gradient(1200px 600px at 10% 10%, rgba(14,165,233,.25), transparent 55%), radial-gradient(1000px 500px at 90% 30%, rgba(99,102,241,.25), transparent 55%), linear-gradient(120deg, var(--lp-grad-a), var(--lp-grad-b)); filter:saturate(110%); }
        .join-hero .container { position:relative; z-index:1; }
        .join-hero h1 { font-size:42px; line-height:1.15; text-shadow:0 1px 2px rgba(0,0,0,.45), 0 12px 24px rgba(0,0,0,.25); }
        .join-hero .lead { font-size:18px; opacity:.95; }
        .chip { display:inline-block; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700; background:rgba(255,255,255,.15); color:#fff; border:1px solid rgba(255,255,255,.25); backdrop-filter:saturate(140%) blur(2px); }
        .join-cta { display:flex; gap:12px; flex-wrap:wrap; margin-top:18px; }
        .join-cta .btn-primary { background:linear-gradient(90deg,#16a34a,#0f766e); color:#fff; border:none; }
        .join-section { padding:40px 0; }
        .lp-title { font-size:28px; margin-bottom:6px; }
        .lp-lead { color:#6b7280; }
        .join-grid-3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
        .join-grid-2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .join-card { background:#fff; border:1px solid var(--color-border); border-radius:14px; padding:16px; box-shadow:0 8px 24px rgba(17,24,39,.12); }
        .lp-icon { font-size:22px; }
        .lp-bar { height:6px; border-radius:999px; background:linear-gradient(90deg,#111,#111827); opacity:.18; margin:8px 0 0; }
        .lp-badge { display:inline-block; padding:4px 8px; font-size:12px; border-radius:999px; background:#111; color:#fff; }
        .lp-center { text-align:center; }
        .lp-muted { color:#6b7280; }
        @media (max-width: 960px){ .join-hero{ padding:56px 0; } .join-hero h1{ font-size:34px; } .join-grid-3{ grid-template-columns:1fr; } .join-grid-2{ grid-template-columns:1fr; } }
      `}</style>

      {/* ① ファーストビュー */}
      <section className="join-hero">
        <div className="container stack">
          <div className="cluster" style={{gap:'12px', alignItems:'center', flexWrap:'wrap'}}>
            <span className="chip">価格勝負の時代は終わり</span>
            <span className="chip">相性で選ぶ予約</span>
            <span className="chip">Find New Me</span>
          </div>
          <h1>
            価格で選ばれる時代は、もう終わり。<br/>
            「<span style={{textDecoration:'underline', textDecorationThickness:'4px', textDecorationColor:'#ffffff80'}}>相性</span>」で選ばれる場所へ。
          </h1>
          <p className="lead">外見を起点に、自信を再設計したい人と、本気で向き合う事業者のための予約プラットフォーム。<br/><small>※ クーポン集客・価格勝負をしたい方には向いていません。</small></p>
          <div className="join-cta">
            <a className="btn" href="/about-fineme">Finemeについて知る</a>
            <a className="btn btn-primary" href="/provider/inquiry">掲載について相談する</a>
          </div>
        </div>
      </section>

      {/* ② 問題提起 */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">今の集客に、違和感はありませんか？</h2>
          <p className="lp-lead">「合う人」に届く仕組みが無いと、価格と数のゲームに巻き込まれます。</p>
          <div className="join-grid-3">
            <div className="join-card"><div className="lp-icon">🏷️</div><h3>クーポン目当てのお客様ばかり</h3><p className="lp-muted">値引き前提の比較は、価値を削り、本来の魅力を伝え切れません。</p><div className="lp-bar"></div></div>
            <div className="join-card"><div className="lp-icon">🤔</div><h3>なぜ選ばれたのか分からない</h3><p className="lp-muted">「選ばれる理由」が言語化されていないと、再現性のある集客は育ちません。</p><div className="lp-bar"></div></div>
            <div className="join-card"><div className="lp-icon">⚖️</div><h3>価格で比較され、疲弊する</h3><p className="lp-muted">価格以外の比較軸を提示できなければ、消耗戦に陥ります。</p><div className="lp-bar"></div></div>
          </div>
          <div className="join-grid-2" style={{marginTop:'12px'}}>
            <div className="join-card"><div className="lp-icon">🧭</div><h3>本当は"合う人"に来てほしい</h3><p className="lp-muted">サービスの価値は、お客様との相性で開きます。合う人と出会える場が必要です。</p></div>
            <div className="join-card" style={{background:'#111', color:'#fff'}}><h3>それ、あなたのサービスの問題ではありません。仕組みの問題です。</h3><p style={{opacity:.9}}>Finemeは、その仕組みを作り替えます。</p></div>
          </div>
        </div>
      </section>

      {/* ③ Finemeとは */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">Finemeとは何か</h2>
          <p className="lp-lead">Fineme（ファインミ）は、Find New Me——見た目も恋もアプデする、垢抜けサービス予約サイト。<br/>「価格ではなく相性で選ぶ」外見磨き特化型の予約プラットフォームです。私たちが扱うのは、単なる「予約」ではなく、<strong>人が変わろうとする"覚悟の瞬間"</strong>です。</p>
          <div className="join-grid-3">
            <div className="join-card"><span className="lp-badge">理念</span><h3>価格主導から、相性主導へ</h3><p className="lp-muted">診断とプロフィールを通じて「合う可能性」を可視化。出会いの質を上げます。</p></div>
            <div className="join-card"><span className="lp-badge">体験</span><h3>外見を起点に"自信を再設計"</h3><p className="lp-muted">見た目のアップデートが、恋・仕事・人生の自信へ波及する設計を支援します。</p></div>
            <div className="join-card"><span className="lp-badge">誠実</span><h3>押し売りゼロ・相互尊重</h3><p className="lp-muted">無理な勧誘はしません。合わない場合は正直にお伝えします。</p></div>
          </div>
        </div>
      </section>

      {/* ④ なぜ合う人が来るのか */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">なぜ、合う人が来るのか</h2>
          <div className="join-grid-3">
            <div className="join-card"><h3>① ユーザーは、まず診断を受ける</h3><p className="lp-muted">なぜ変わりたいか／どれくらい変わりたいか／どんなサポートが合うか——を整理してから来店します。</p></div>
            <div className="join-card"><h3>② 表示順は「相性順」</h3><p className="lp-muted">人気順でも価格順でもありません。診断 × サービス内容の相性スコアで並びます。</p></div>
            <div className="join-card"><h3>③ プロフィールが"資産"になる</h3><p className="lp-muted">適当に書かれたページは選ばれません。丁寧な言語化ほど、合う人を連れてきます。</p></div>
          </div>
        </div>
      </section>

      {/* ⑤ 掲載プラン */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">掲載プランについて</h2>
          <p className="lp-lead">広告費を積み上げるモデルではなく、「合う人に届く仕組み」への投資です。</p>
          <div className="join-grid-3">
            <div className="join-card lp-center"><h3>月額 5,000円</h3><p className="lp-muted">予約手数料 8%</p></div>
            <div className="join-card lp-center"><h3>月額 7,000円</h3><p className="lp-muted">予約手数料 7%</p></div>
            <div className="join-card lp-center"><h3>月額 10,000円</h3><p className="lp-muted">予約手数料 6%</p></div>
          </div>
        </div>
      </section>

      {/* ⑥ 副収益制度 */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">Finemeで副収益を作れる制度</h2>
          <div className="join-grid-2">
            <div className="join-card">
              <h3 style={{margin:'0 0 6px'}}>ここが他ポータルとの決定的な違い</h3>
              <p className="lp-muted">一般的なポータルは、<strong>掲載料を支払い</strong>→<strong>集客</strong>→<strong>売上で掲載料を払い続ける</strong>という循環です。Finemeはそれに加えて、<strong>毎月の副収益</strong>を作れる仕組みを用意しています。</p>
              <ul className="stack" style={{gap:'6px', marginTop:'8px'}}>
                <li>✅ 合う事業者を紹介・育てることで、<strong>紹介報酬</strong>が発生</li>
                <li>✅ うまく運用すると、<strong>掲載料相当を相殺</strong>、場合によっては<strong>プラス</strong>へ</li>
                <li>✅ 単なる数集めではなく、<strong>相性主導</strong>の健全なエコシステム</li>
              </ul>
            </div>
            <div className="join-card">
              <h3 style={{margin:'0 0 6px'}}>誠実運用のガイドライン</h3>
              <p className="lp-muted">強引な勧誘やミスマッチな紹介は推奨しません。Finemeの思想に共感し、<strong>「この人ならユーザーに紹介できる」</strong>と思える事業者のみ、丁寧につないでください。</p>
              <p className="lp-muted" style={{marginTop:'6px'}}>報酬条件や上限、開始手順などの詳細は、資料請求・個別相談でご説明します。</p>
            </div>
          </div>
          <div className="join-cta">
            <a className="btn" href="/provider/inquiry">資料請求・相談</a>
            <a className="btn btn-ghost" href="/provider/referral">制度の詳細を見る</a>
          </div>
        </div>
      </section>

      {/* ⑦ 向いている人 / 向いていない人 */}
      <section className="join-section">
        <div className="container stack">
          <h2 className="lp-title">向いている人 / 向いていない人</h2>
          <div className="join-grid-2">
            <div className="join-card">
              <h3>向いている人</h3>
              <ul className="stack" style={{gap:'6px'}}>
                <li>✅ 自分の仕事に誇りがある</li>
                <li>✅ 合う人と、長く関係を築きたい</li>
                <li>✅ 選ばれる理由を言語化したい</li>
              </ul>
            </div>
            <div className="join-card">
              <h3>向いていない人</h3>
              <ul className="stack" style={{gap:'6px'}}>
                <li>❌ 値引き集客がしたい</li>
                <li>❌ 数だけを追いたい</li>
                <li>❌ 仕組みを理解せずに使いたい</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ⑧ 最後のメッセージ */}
      <section className="join-section">
        <div className="container stack lp-center">
          <h2 className="lp-title">最後に</h2>
          <p className="lp-lead">Finemeは、「載せれば集客できる場所」ではありません。<br/>選ばれる理由を、一緒につくる場所です。<br/>もしこの考え方に少しでも共感したなら——あなたは、Finemeに向いています。</p>
        </div>
      </section>

      {/* ⑨ CTA */}
      <section className="join-section">
        <div className="container lp-center">
          <div className="join-cta" style={{justifyContent:'center'}}>
            <a className="btn" href="/provider/inquiry">まずは話を聞いてみる</a>
          </div>
          <p className="lp-muted" style={{marginTop:'8px'}}>※ 無理な勧誘は一切ありません ※ 合わない場合は、正直にお伝えします</p>
        </div>
      </section>
    </main>
  );
}
