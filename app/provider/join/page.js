export const metadata = {
  title: '掲載者募集 — 変容の旅を共に',
  description: '外見磨きの専門家・サービス提供者の方へ。Finemeに掲載して、本気で変わりたいユーザーとのマッチングを始めましょう。成果が出るまで費用は発生しません。',
  openGraph: {
    title: '掲載者募集 — 変容の旅を共に | Fineme',
    description: '本気で変わりたいユーザーと出会う。成果が出るまで費用は発生しません。',
  },
};

export default function ProviderJoinPage() {
  return (
    <main>
      <style>{`
        /* ─── Base ─── */
        .join-wrap { font-family: 'Noto Serif JP', Georgia, serif; }
        .join-container { max-width: 860px; margin: 0 auto; padding: 0 20px; }

        /* ─── Hero ─── */
        .join-hero {
          position: relative; padding: 80px 0 72px; overflow: hidden;
          background: linear-gradient(rgba(6,12,26,0.82), rgba(6,12,26,0.88)),
                      url('/assets/images/hero-bg.webp') center / cover no-repeat;
          color: #fff;
        }
        .join-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(800px 400px at 10% 20%, rgba(201,168,76,.1), transparent 60%);
        }
        .join-hero .join-container { position: relative; z-index: 1; }
        .join-hero-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
        .join-chip {
          display: inline-block; padding: 5px 13px; border-radius: 999px; font-size: 11px;
          font-weight: 700; background: rgba(201,168,76,.1); color: #c9a84c;
          border: 1px solid rgba(201,168,76,.3); letter-spacing: .05em;
          font-family: 'Noto Sans JP', sans-serif;
        }
        .join-hero h1 {
          font-size: clamp(26px, 5vw, 40px); line-height: 1.35; font-weight: 700;
          color: #fff; margin: 0 0 18px; letter-spacing: -.01em;
        }
        .join-hero h1 em { font-style: normal; color: #c9a84c; }
        .join-hero-lead {
          font-size: 15px; color: rgba(255,255,255,.8); line-height: 1.9;
          margin: 0 0 26px; max-width: 560px; font-family: 'Noto Sans JP', sans-serif;
        }
        .join-hero-note { font-size: 12px; color: rgba(255,255,255,.45); margin: 0 0 28px; font-family: 'Noto Sans JP', sans-serif; }
        .join-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-gold {
          background: #c9a84c; color: #0a0f1e; border: none; font-weight: 800;
          padding: 14px 30px; border-radius: 8px; text-decoration: none; font-size: 15px;
          font-family: 'Noto Sans JP', sans-serif; display: inline-block;
        }
        .btn-ghost-white {
          background: transparent; color: rgba(255,255,255,.85);
          border: 1.5px solid rgba(255,255,255,.3); padding: 13px 24px; border-radius: 8px;
          text-decoration: none; font-size: 14px; font-family: 'Noto Sans JP', sans-serif;
          display: inline-block;
        }

        /* ─── Section ─── */
        .join-section { padding: 64px 0; }
        .join-section-dark {
          padding: 64px 0;
          background: linear-gradient(rgba(6,12,26,0.93), rgba(6,12,26,0.93)),
                      url('/assets/images/bg-parchment.webp') center / cover;
          color: #fff;
        }
        .join-section-tinted { padding: 64px 0; background: rgba(10,15,30,0.50); border-top: 1px solid rgba(232,228,220,0.12); border-bottom: 1px solid rgba(232,228,220,0.12); }

        .sec-eyebrow {
          font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
          color: rgba(201,168,76,.7); margin: 0 0 12px; display: flex; align-items: center; gap: 10px;
          font-family: 'Noto Sans JP', sans-serif;
        }
        .sec-eyebrow::before { content: ''; width: 20px; height: 1.5px; background: #c9a84c; border-radius: 1px; }
        .sec-h2 { font-size: clamp(20px, 4vw, 28px); font-weight: 700; margin: 0 0 10px; line-height: 1.4; }
        .sec-h2-dark { color: #fff; }
        .sec-h2-light { color: rgba(232,228,220,0.90); }
        .sec-lead { font-size: 14px; line-height: 1.9; margin: 0 0 32px; font-family: 'Noto Sans JP', sans-serif; }
        .sec-lead-dark { color: rgba(255,255,255,.72); }
        .sec-lead-light { color: rgba(255,255,255,.72); }

        /* ─── Problem cards ─── */
        .problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .problem-card {
          background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(232,228,220,0.15); border-radius: 14px; padding: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,.4);
        }
        .problem-card-icon { font-size: 22px; margin-bottom: 10px; }
        .problem-card h3 { font-size: 14px; font-weight: 800; color: rgba(232,228,220,0.90); margin: 0 0 8px; }
        .problem-card p { font-size: 13px; color: #4b5563; line-height: 1.7; margin: 0; font-family: 'Noto Sans JP', sans-serif; }
        .problem-card-bar { height: 2px; border-radius: 999px; background: #c9a84c; opacity: .3; margin-top: 14px; }

        /* ─── Scan flow ─── */
        .scan-flow { display: flex; flex-direction: column; gap: 0; }
        .scan-step {
          display: flex; align-items: flex-start; gap: 18px;
          padding: 20px 0; border-bottom: 1px solid rgba(201,168,76,.12);
        }
        .scan-step:last-child { border-bottom: none; }
        .scan-step-icon {
          width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
          background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.25);
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .scan-step-label { font-size: 10px; font-weight: 800; color: rgba(201,168,76,.7); letter-spacing: .1em; margin: 0 0 4px; font-family: 'Noto Sans JP', sans-serif; }
        .scan-step-title { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 6px; }
        .scan-step-desc { font-size: 13px; color: rgba(255,255,255,.85); line-height: 1.8; margin: 0; font-family: 'Noto Sans JP', sans-serif; }
        .scan-step-desc strong { color: #fff; font-weight: 700; }

        /* ─── Matching score breakdown ─── */
        .score-grid { display: flex; flex-direction: column; gap: 10px; }
        .score-block { border-radius: 12px; padding: 18px 20px; }
        .score-block-gold { background: rgba(201,168,76,.06); border: 1.5px solid rgba(201,168,76,.3); }
        .score-block-dim { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.1); }
        .score-block-label { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 10px; font-family: 'Noto Sans JP', sans-serif; }
        .score-block-label-gold { color: rgba(201,168,76,.8); }
        .score-block-label-dim { color: rgba(255,255,255,.65); }
        .score-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
        .score-row:last-child { border-bottom: none; }
        .score-row-name { font-size: 13px; color: #e8e2d4; font-family: 'Noto Sans JP', sans-serif; }
        .score-row-pts { font-size: 13px; font-weight: 800; color: #c9a84c; font-family: 'Noto Sans JP', sans-serif; }
        .score-note { font-size: 12px; color: rgba(255,255,255,.78); line-height: 1.7; margin: 8px 0 0; font-family: 'Noto Sans JP', sans-serif; }
        .score-note strong { color: #fff; }
        .score-insight {
          border-left: 3px solid #c9a84c; padding: 14px 16px;
          background: rgba(201,168,76,.05); border-radius: 0 10px 10px 0; margin-top: 4px;
        }
        .score-insight p { font-size: 13px; color: #e8e2d4; line-height: 1.85; margin: 0; font-family: 'Noto Sans JP', sans-serif; }
        .score-insight strong { color: #fff; }

        /* ─── Plan card ─── */
        .plan-card {
          border: 1.5px solid rgba(201,168,76,.45); border-radius: 16px; padding: 28px 32px;
          background: #0a0f1e; max-width: 420px; margin: 0 auto;
        }
        .plan-price { font-size: 36px; font-weight: 900; color: #c9a84c; line-height: 1; }
        .plan-price small { font-size: 16px; font-weight: 700; color: #c9a84c; }
        .plan-list { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 8px; }
        .plan-list li { font-size: 14px; color: #e8e2d4; line-height: 1.6; font-family: 'Noto Sans JP', sans-serif; display: flex; gap: 8px; }
        .plan-list li::before { content: '✓'; color: #c9a84c; font-weight: 900; flex-shrink: 0; }

        /* ─── Fit cards ─── */
        .fit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .fit-card { border-radius: 14px; padding: 22px; }
        .fit-card-yes { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(232,228,220,0.15); box-shadow: 0 4px 24px rgba(0,0,0,.4); }
        .fit-card-no { background: #0a0f1e; border: 1px solid rgba(255,255,255,.1); }
        .fit-card h3 { font-size: 15px; font-weight: 800; margin: 0 0 14px; }
        .fit-card-yes h3 { color: rgba(232,228,220,0.90); }
        .fit-card-no h3 { color: rgba(255,255,255,.7); }
        .fit-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
        .fit-list li { font-size: 13px; line-height: 1.6; font-family: 'Noto Sans JP', sans-serif; display: flex; gap: 8px; align-items: flex-start; }
        .fit-card-yes .fit-list li { color: rgba(232,228,220,0.80); }
        .fit-card-no .fit-list li { color: rgba(255,255,255,.75); }
        .fit-icon-yes { color: #c9a84c; flex-shrink: 0; font-weight: 900; }
        .fit-icon-no { color: rgba(255,255,255,.5); flex-shrink: 0; }

        /* ─── CTA section ─── */
        .join-cta-section {
          padding: 72px 0;
          background: linear-gradient(rgba(6,12,26,0.96), rgba(6,12,26,0.96)),
                      url('/assets/images/bg-parchment.webp') center / cover;
          text-align: center;
        }
        .join-cta-section h2 { font-size: clamp(20px, 4vw, 28px); color: #fff; margin: 0 0 14px; }
        .join-cta-section p { font-size: 14px; color: rgba(255,255,255,.82); margin: 0 0 28px; font-family: 'Noto Sans JP', sans-serif; line-height: 1.8; }
        .join-cta-note { font-size: 12px; color: rgba(255,255,255,.55); margin-top: 14px; font-family: 'Noto Sans JP', sans-serif; }

        @media (max-width: 680px) {
          .join-hero { padding: 56px 0 60px; }
          .problem-grid { grid-template-columns: 1fr; }
          .fit-grid { grid-template-columns: 1fr; }
          .plan-card { padding: 22px; }
        }
      `}</style>

      <div className="join-wrap">

        {/* ① Hero */}
        <section className="join-hero">
          <div className="join-container">
            <div className="join-hero-chips">
              <span className="join-chip">変容の旅のインフラ</span>
              <span className="join-chip">診断から始まる出会い</span>
              <span className="join-chip">ガイドとしての参加</span>
            </div>
            <h1>
              「合う人に届く」仕組みが、<br/>
              <em>ここにあります。</em>
            </h1>
            <p className="join-hero-lead">
              Finemeは「価格ではなく相性」で、変わりたい男性と外見のプロをつなぐプラットフォームです。<br/>
              クーポン集客・価格勝負をしたい方には、向いていません。
            </p>
            <div className="join-cta-row">
              <a className="btn-gold" href="/provider/inquiry">掲載について相談する</a>
              <a className="btn-ghost-white" href="/provider/philosophy">Finemeの考え方を読む</a>
            </div>
          </div>
        </section>

        {/* ② 問題提起 */}
        <section className="join-section">
          <div className="join-container">
            <div className="sec-eyebrow">Problem</div>
            <h2 className="sec-h2 sec-h2-light">今の集客に、違和感はありませんか？</h2>
            <p className="sec-lead sec-lead-light">「合う人」に届く仕組みがないと、価格と数のゲームに巻き込まれます。</p>
            <div className="problem-grid">
              <div className="problem-card">
                <div className="problem-card-icon">🏷️</div>
                <h3>クーポン目当てのお客様ばかり</h3>
                <p>値引き前提の比較は価値を削り、本来の魅力を伝え切れません。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">🤔</div>
                <h3>なぜ選ばれたのか分からない</h3>
                <p>「選ばれる理由」が言語化されていないと、再現性のある出会いは育ちません。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">⚖️</div>
                <h3>価格で比較され、疲弊する</h3>
                <p>価格以外の比較軸を提示できなければ、消耗戦に陥ります。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
            <div style={{marginTop:'16px', padding:'18px 22px', background:'#0a0f1e', borderRadius:'14px', border:'1px solid rgba(201,168,76,.2)'}}>
              <p style={{margin:0, fontSize:'15px', fontWeight:'700', color:'#fff', lineHeight:'1.7', fontFamily:"'Noto Sans JP', sans-serif"}}>
                それはあなたのサービスの問題ではありません。
                <span style={{color:'#c9a84c'}}> 仕組みの問題です。</span><br/>
                <span style={{fontSize:'13px', fontWeight:'400', color:'rgba(255,255,255,.6)'}}>Finemeは「どう出会うか」の設計から変えます。</span>
              </p>
            </div>
          </div>
        </section>

        {/* ③ なぜ合う人が来るのか */}
        <section className="join-section-dark">
          <div className="join-container">
            <div className="sec-eyebrow">How It Works</div>
            <h2 className="sec-h2 sec-h2-dark">なぜ、合う人が来るのか</h2>
            <p className="sec-lead sec-lead-dark">
              ユーザーは「検索して探す」のではなく、「診断を受けてから届く」設計になっています。
            </p>

            <div className="scan-flow">
              <div className="scan-step">
                <div className="scan-step-icon">🧬</div>
                <div>
                  <div className="scan-step-label">STEP 1 — Me Scan</div>
                  <div className="scan-step-title">ユーザーは外見診断を受ける</div>
                  <p className="scan-step-desc">体型・眉・服・髪・肌・歯・爪の7軸で現在地とゴールを測定。なぜ変わりたいか・どこから変えるかを言語化します。<strong>恋愛・対人・就活・自己投資など、動機も全部記録します。</strong></p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon">🗺️</div>
                <div>
                  <div className="scan-step-label">STEP 2 — New Me Map</div>
                  <div className="scan-step-title">変容プロファイルが生成される</div>
                  <p className="scan-step-desc">7軸レーダーチャートと変容ベクトルが可視化された「自分だけの地図」が生成されます。これが<strong>マッチングの起点</strong>です。</p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon">🧭</div>
                <div>
                  <div className="scan-step-label">STEP 3 — Fineme Compass</div>
                  <div className="scan-step-title">「最初の一手」が決まる</div>
                  <p className="scan-step-desc">7軸の優先順位から「今のあなたに最も効く軸」が導き出されます。ユーザーはその軸のガイドを探し、相談します。</p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon">🤝</div>
                <div>
                  <div className="scan-step-label">STEP 4 — 総合マッチング</div>
                  <div className="scan-step-title">あなたのページ全体と照合される</div>
                  <p className="scan-step-desc">ユーザーの診断データと、あなたのページに書かれた<strong>すべての情報</strong>を照合して相性スコアを計算します。きっかけ・失敗パターン・変容軸・ビフォーアフター・写真・哲学——<strong>丁寧に書かれたページが、合う人に届く設計</strong>です。</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ④ マッチングスコアの構造 */}
        <section className="join-section-dark" style={{paddingTop:0}}>
          <div className="join-container">
            <div className="sec-eyebrow">Matching Score</div>
            <h2 className="sec-h2 sec-h2-dark" style={{marginBottom:'24px'}}>「それっぽく書いただけ」では上位に出ない設計</h2>

            <div className="score-grid">
              <div className="score-block score-block-gold">
                <div className="score-block-label score-block-label-gold">USER MATCH — ユーザーの診断データとの照合</div>
                <div className="score-row">
                  <span className="score-row-name">⚡ きっかけ一致（来店動機の共鳴）</span>
                  <span className="score-row-pts">+8</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">🔁 失敗パターン一致（過去の挫折への向き合い）</span>
                  <span className="score-row-pts">+8</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">🧭 Compassの軸 × サービスカテゴリー一致</span>
                  <span className="score-row-pts">+12</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">📊 ユーザーの優先変容軸 × サービス対象軸</span>
                  <span className="score-row-pts">最大+15</span>
                </div>
              </div>

              <div className="score-block score-block-dim">
                <div className="score-block-label score-block-label-dim">PROFILE QUALITY — プロフィールの充実度</div>
                <p className="score-note">ガイド哲学・変容ビジョン・強み・ターゲット像・キャッチコピー・カバー写真・施設写真・スタッフ紹介<br/><strong>各項目の記入密度（文字数・写真枚数）でスコアが加算されます。</strong></p>
              </div>

              <div className="score-block score-block-dim">
                <div className="score-block-label score-block-label-dim">SERVICE QUALITY — サービスの中身</div>
                <p className="score-note">変容の約束・Before/Afterテキスト・Before/After画像・特典内容<br/><strong>「変わる前」「変わった後」が具体的なサービスほど、スコアが高くなります。</strong></p>
              </div>
            </div>

            <div className="score-insight" style={{marginTop:'16px'}}>
              <p>「きっかけ」と「失敗パターン」はスコアへの影響が特に大きい項目ですが、<strong>ページ全体の充実度が積み重なってスコアが決まります。</strong> テキトーに2項目入れただけでは上位には出ません——これが、Finemeに「合う人」が集まる理由です。</p>
            </div>
          </div>
        </section>

        {/* ⑤ 掲載プラン */}
        <section className="join-section-tinted">
          <div className="join-container" style={{textAlign:'center'}}>
            <div className="sec-eyebrow" style={{justifyContent:'center'}}>Plan</div>
            <h2 className="sec-h2 sec-h2-light">掲載プラン</h2>
            <p className="sec-lead sec-lead-light">広告費を積み上げるモデルではなく、「合う人に届く仕組み」への投資です。</p>

            <div className="plan-card">
              <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', color:'rgba(201,168,76,.7)', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif"}}>STANDARD PLAN</div>
              <div className="plan-price">¥5,000<small> / 月</small></div>
              <ul className="plan-list">
                <li>プロフィールページ（無制限）</li>
                <li>サービスメニュー登録（複数対応）</li>
                <li>スタッフ紹介・Before/After掲載</li>
                <li>Me Scanマッチング（総合スコア順）</li>
                <li>ダッシュボード（統計・問い合わせ管理）</li>
                <li>紹介報酬プログラム参加資格</li>
              </ul>
              <p style={{fontSize:'12px', color:'rgba(201,168,76,.8)', marginTop:'16px', fontFamily:"'Noto Sans JP', sans-serif"}}>草創期限定プランです。今後の価格変更は事前告知します。</p>
            </div>
          </div>
        </section>

        {/* ⑥ 紹介報酬 */}
        <section className="join-section">
          <div className="join-container">
            <div className="sec-eyebrow">Referral Program</div>
            <h2 className="sec-h2 sec-h2-light">掲載料を相殺できる、紹介報酬制度</h2>
            <p className="sec-lead sec-lead-light">一般的なポータルは「掲載料→集客→掲載料」の循環ですが、Finemeは掲載者自身が副収益を作れる仕組みを持っています。</p>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px'}}>
              <div style={{background:'rgba(10,15,30,0.65)', backdropFilter:'blur(8px)', border:'1px solid rgba(232,228,220,0.15)', borderRadius:'14px', padding:'20px', boxShadow:'0 4px 24px rgba(0,0,0,.4)'}}>
                <h3 style={{fontSize:'14px', fontWeight:'800', color:'rgba(232,228,220,0.90)', margin:'0 0 10px'}}>仕組み</h3>
                <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'8px'}}>
                  <li style={{fontSize:'13px', color:'rgba(232,228,220,0.80)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>あなたが紹介した事業者が有料掲載を開始→<strong>紹介報酬が発生</strong></li>
                  <li style={{fontSize:'13px', color:'rgba(232,228,220,0.80)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>うまく運用すると<strong>掲載料相当を相殺</strong>、場合によっては<strong>プラス</strong>へ</li>
                  <li style={{fontSize:'13px', color:'rgba(232,228,220,0.80)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>単なる数集めではなく<strong>相性主導</strong>の健全なエコシステム</li>
                </ul>
              </div>
              <div style={{background:'#111827', border:'1px solid rgba(201,168,76,.15)', borderRadius:'14px', padding:'20px'}}>
                <h3 style={{fontSize:'14px', fontWeight:'800', color:'rgba(255,255,255,.5)', margin:'0 0 10px'}}>誠実運用のガイドライン</h3>
                <p style={{fontSize:'13px', color:'#b8c0cc', lineHeight:'1.8', margin:0, fontFamily:"'Noto Sans JP', sans-serif"}}>強引な勧誘やミスマッチな紹介は推奨しません。「この人ならユーザーに紹介できる」と思える事業者のみ、丁寧につないでください。報酬条件の詳細は個別相談でご説明します。</p>
              </div>
            </div>
          </div>
        </section>

        {/* ⑦ 向いている人 */}
        <section className="join-section" style={{paddingTop:0}}>
          <div className="join-container">
            <div className="sec-eyebrow">Fit Check</div>
            <h2 className="sec-h2 sec-h2-light">向いている人 / 向いていない人</h2>
            <div className="fit-grid">
              <div className="fit-card fit-card-yes">
                <h3>Finemeに向いている</h3>
                <ul className="fit-list">
                  <li><span className="fit-icon-yes">✓</span>自分の仕事に誇りがある</li>
                  <li><span className="fit-icon-yes">✓</span>合う人と、長く関係を築きたい</li>
                  <li><span className="fit-icon-yes">✓</span>選ばれる理由を言語化したい</li>
                  <li><span className="fit-icon-yes">✓</span>ビフォーアフターが伝えられる</li>
                  <li><span className="fit-icon-yes">✓</span>外見から自信を取り戻す仕事だと思っている</li>
                </ul>
              </div>
              <div className="fit-card fit-card-no">
                <h3>向いていない</h3>
                <ul className="fit-list">
                  <li><span className="fit-icon-no">✕</span>値引き集客がしたい</li>
                  <li><span className="fit-icon-no">✕</span>数だけを追いたい</li>
                  <li><span className="fit-icon-no">✕</span>プロフィールを埋める気がない</li>
                  <li><span className="fit-icon-no">✕</span>仕組みを理解せず使いたい</li>
                  <li><span className="fit-icon-no">✕</span>HOT PEPPERの代替を探している</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ⑧ CTA */}
        <section className="join-cta-section">
          <div className="join-container">
            <h2>最後に</h2>
            <p>
              Finemeは、「載せれば集客できる場所」ではありません。<br/>
              選ばれる理由を、一緒につくる場所です。<br/>
              この考え方に少しでも共感したなら——あなたは、Finemeに向いています。
            </p>
            <div className="join-cta-row" style={{justifyContent:'center'}}>
              <a className="btn-gold" href="/provider/inquiry">まずは話を聞いてみる</a>
            </div>
            <p className="join-cta-note">※ 無理な勧誘は一切ありません　※ 合わない場合は正直にお伝えします</p>
          </div>
        </section>

      </div>
    </main>
  );
}
