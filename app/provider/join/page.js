export const metadata = {
  title: 'いま抱えているお客様を、逃さない：Fineme 店舗向け掲載のご案内',
  description: '顧客カルテ・リマインド自動化・休眠顧客の掘り起こしなど、掲載すれば今日から使える店舗運営SaaS。パーソナルジム・眉毛サロン・美容師・外見コンサルなど、個人・フリーランス向け。新規集客の有無に関わらず、いま抱えているお客様との関係を強くします。',
  keywords: ['店舗 顧客管理 SaaS', 'リピート対策 サロン', '休眠顧客 掘り起こし', 'パーソナルジム 顧客管理', '美容室 予約リマインド 自動化', '個人事業主 集客'],
  openGraph: {
    title: 'いま抱えているお客様を、逃さない | Fineme 店舗向け掲載のご案内',
    description: '顧客カルテ・リマインド自動化・休眠顧客の掘り起こし。掲載すれば今日から使える店舗運営SaaSです。',
  },
};

export default function ProviderJoinPage({ searchParams }) {
  const ref = searchParams?.ref;
  const inquiryHref = ref ? `/provider/inquiry?ref=${encodeURIComponent(ref)}` : '/provider/inquiry';
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

        /* ─── Categories ─── */
        .categories-section { padding: 48px 0 40px; border-bottom: 1px solid rgba(232,228,220,0.1); }
        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .cat-item {
          background: rgba(10,15,30,0.65); backdrop-filter: blur(8px);
          border: 1px solid rgba(232,228,220,0.12); border-radius: 12px;
          padding: 16px 12px; text-align: center;
        }
        .cat-item-icon { font-size: 24px; margin-bottom: 8px; }
        .cat-item-name { font-size: 13px; font-weight: 800; color: rgba(232,228,220,0.9); margin: 0 0 4px; }
        .cat-item-desc { font-size: 11px; color: rgba(255,255,255,0.5); font-family: 'Noto Sans JP', sans-serif; margin: 0; }
        @media (max-width: 680px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ─── Problem cards ─── */
        .problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 680px) { .tools-grid { grid-template-columns: 1fr; } }
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
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .plan-card {
          border: 1.5px solid rgba(201,168,76,.25); border-radius: 16px; padding: 24px 22px;
          background: #0a0f1e; text-align: left;
        }
        .plan-card.highlight { border-color: rgba(201,168,76,.7); box-shadow: 0 8px 32px rgba(201,168,76,.15); }
        .plan-price { font-size: 30px; font-weight: 900; color: #c9a84c; line-height: 1; }
        .plan-price small { font-size: 14px; font-weight: 700; color: #c9a84c; }
        .plan-list { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 8px; }
        .plan-list li { font-size: 13px; color: #e8e2d4; line-height: 1.6; font-family: 'Noto Sans JP', sans-serif; display: flex; gap: 8px; }
        .plan-list li::before { content: '✓'; color: #c9a84c; font-weight: 900; flex-shrink: 0; }
        @media (max-width: 820px) { .plan-grid { grid-template-columns: 1fr; } }

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
              <span className="join-chip">顧客管理・リピートSaaS</span>
              <span className="join-chip">既存のお客様に今日から使える</span>
              <span className="join-chip">新規の出会いは伸びしろとして追加</span>
            </div>
            <h1>
              新規集客の前に、<br/>
              <em>今のお客様を、離さない。</em>
            </h1>
            <p className="join-hero-lead">
              予約の取りこぼし、いつの間にか来なくなった常連、スタッフの頭の中にしかない顧客情報——<br/>
              Finemeは、いま抱えているお客様との関係を強くする店舗運営SaaSです。<br/>
              顧客カルテ・リマインド・休眠顧客の掘り起こしは、新しいお客様がまだいなくても今日から動きます。
            </p>
            <p className="join-hero-note">掲載すれば、診断を経て「本気で変わりたい」お客様との新しい出会いも、伸びしろとして加わります。</p>
            <div className="join-cta-row">
              <a className="btn-gold" href={inquiryHref}>掲載について相談する</a>
              <a className="btn-ghost-white" href="#tools">SaaS機能を見る</a>
            </div>
          </div>
        </section>

        {/* ② 対象業種 */}
        <section className="categories-section">
          <div className="join-container">
            <div className="sec-eyebrow">対象業種</div>
            <h2 className="sec-h2 sec-h2-light" style={{marginBottom:'8px'}}>こんな業種の方が参加しています</h2>
            <p className="sec-lead sec-lead-light" style={{marginBottom:'24px'}}>個人経営・フリーランス・小規模サロン、すべて歓迎です。</p>
            <div className="cat-grid">
              <div className="cat-item">
                <div className="cat-item-icon">🏋️</div>
                <div className="cat-item-name">パーソナルジム</div>
                <p className="cat-item-desc">フリーランスPT・個人ジム</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">✂️</div>
                <div className="cat-item-name">眉毛サロン</div>
                <p className="cat-item-desc">アイブロウスタイリスト</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">💈</div>
                <div className="cat-item-name">美容室・美容師</div>
                <p className="cat-item-desc">フリーランス・個人サロン</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">🪞</div>
                <div className="cat-item-name">外見コンサル</div>
                <p className="cat-item-desc">外見・印象改善コンサル</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">👔</div>
                <div className="cat-item-name">ファッション</div>
                <p className="cat-item-desc">パーソナルスタイリスト</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">✨</div>
                <div className="cat-item-name">脱毛サロン</div>
                <p className="cat-item-desc">メンズ脱毛・医療脱毛</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">💊</div>
                <div className="cat-item-name">AGAクリニック</div>
                <p className="cat-item-desc">薄毛・AGA治療院</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon">📸</div>
                <div className="cat-item-name">写真撮影・その他</div>
                <p className="cat-item-desc">婚活・マッチングアプリ写真</p>
              </div>
            </div>
          </div>
        </section>

        {/* ③ 問題提起 */}
        <section className="join-section">
          <div className="join-container">
            <div className="sec-eyebrow">Problem</div>
            <h2 className="sec-h2 sec-h2-light">こんな悩み、抱えていませんか？</h2>
            <p className="sec-lead sec-lead-light">新規集客より先に、今のお客様との関係で困っていることはありませんか。</p>
            <div className="problem-grid">
              <div className="problem-card">
                <div className="problem-card-icon">🗒️</div>
                <h3>顧客管理が属人的</h3>
                <p>常連の来店タイミング・好み・注意点が、スタッフの頭の中にしかありません。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">📉</div>
                <h3>気づいたら来なくなっている</h3>
                <p>休眠したお客様を追いきれず、離れたことにすら気づけないまま時間が過ぎます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">🏷️</div>
                <h3>クーポン目当てのお客様ばかり</h3>
                <p>値引き前提の比較は価値を削り、本来の魅力を伝え切れません。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
            <div style={{marginTop:'16px', padding:'18px 22px', background:'#0a0f1e', borderRadius:'14px', border:'1px solid rgba(201,168,76,.2)'}}>
              <p style={{margin:0, fontSize:'15px', fontWeight:'700', color:'#fff', lineHeight:'1.7', fontFamily:"'Noto Sans JP', sans-serif"}}>
                それは接客の問題ではありません。
                <span style={{color:'#c9a84c'}}> 仕組みの問題です。</span><br/>
                <span style={{fontSize:'13px', fontWeight:'400', color:'rgba(255,255,255,.6)'}}>Finemeは「今いるお客様との関係」から仕組み化します。</span>
              </p>
            </div>
          </div>
        </section>

        {/* ③.5 掲載後すぐ使える店舗運営ツール */}
        <section className="join-section-dark" id="tools">
          <div className="join-container">
            <div className="sec-eyebrow">Store Management Tools</div>
            <h2 className="sec-h2 sec-h2-dark">新しいお客様がいなくても、今日から使えます</h2>
            <p className="sec-lead sec-lead-dark">掲載は「載せて終わり」ではありません。いま抱えているお客様との関係を強くする管理画面が、掲載と同時に使えます。</p>
            <div className="problem-grid tools-grid">
              <div className="problem-card">
                <div className="problem-card-icon">📋</div>
                <h3>顧客カルテ</h3>
                <p>来店履歴・Me Scan受診有無・Mirrorスコア・担当スタッフを自動で一覧化。休眠しそうなお客様も一目で分かります。店舗だけに見える非公開メモも残せます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">🔔</div>
                <h3>リマインド一式</h3>
                <p>予約前日の確認・来店間隔が空いたお客様の自動掘り起こし・誕生日メッセージ・クチコミ依頼まで自動配信。送り忘れを仕組みで防ぎます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">🎯</div>
                <h3>スタッフの接客の引き出し</h3>
                <p>スタッフごとの得意軸・接客スクリプトを登録。担当したお客様のリピート率・指名率も自動で見える化されます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">📊</div>
                <h3>LTV・CAC概算</h3>
                <p>来店データから顧客生涯価値と広告費の回収状況を自動算出。感覚ではなく数字で、今の集客が割に合っているか確認できます。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
            <div style={{marginTop:'16px', padding:'18px 22px', background:'rgba(201,168,76,.08)', borderRadius:'14px', border:'1px solid rgba(201,168,76,.3)'}}>
              <p style={{margin:0, fontSize:'14px', color:'#e8e2d4', lineHeight:'1.8', fontFamily:"'Noto Sans JP', sans-serif"}}>
                <strong style={{color:'#fff'}}>💰 休眠客1人の呼び戻しで、ライトプラン（¥5,000/月）は元が取れます。</strong><br/>
                客単価¥10,000〜¥30,000なら、リマインド経由の再来店が月1件あるだけで回収完了です。
              </p>
            </div>
            <p style={{marginTop:'14px', fontSize:'12.5px', color:'rgba(255,255,255,.55)', lineHeight:'1.7', fontFamily:"'Noto Sans JP', sans-serif"}}>
              エリア需要の可視化なども開発中です。画面イメージ・導入フローなど詳しい機能一覧は<a href="/business/store-saas-pitch-deck.html" style={{color:'#c9a84c'}}>店舗SaaS営業資料</a>をご覧ください。
            </p>
          </div>
        </section>

        {/* ④ なぜ合う人が来るのか（今後の伸びしろ） */}
        <section className="join-section-dark">
          <div className="join-container">
            <div className="sec-eyebrow">Fineme Matching（今後の伸びしろ）</div>
            <h2 className="sec-h2 sec-h2-dark">掲載しておけば、新しい出会いも増えていく</h2>
            <p className="sec-lead sec-lead-dark">
              正直にお伝えすると、Finemeはまだユーザー基盤を育てている段階です。<br/>
              それでも今のうちに掲載しておく理由は、この仕組みが「検索して探す」のではなく「診断を受けてから届く」設計だから——<br/>
              ユーザーが増えるほど、この価値もそのまま伸びていきます。
            </p>

            <div className="scan-flow">
              <div className="scan-step">
                <div className="scan-step-icon">🧬</div>
                <div>
                  <div className="scan-step-label">STEP 1 — Me Scan</div>
                  <div className="scan-step-title">ユーザーは外見診断を受ける</div>
                  <p className="scan-step-desc">体型・眉・服・髪・肌・脱毛・歯・爪の8軸で現在地とゴールを測定。なぜ変わりたいか・どこから変えるかを言語化します。<strong>恋愛・対人・就活・自己投資など、動機も全部記録します。</strong></p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon">🗺️</div>
                <div>
                  <div className="scan-step-label">STEP 2 — New Me Navi</div>
                  <div className="scan-step-title">変容プロファイルが生成される</div>
                  <p className="scan-step-desc">8軸レーダーチャートと変容ベクトルが可視化された「自分だけの地図」が生成されます。これが<strong>マッチングの起点</strong>です。</p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon">🧭</div>
                <div>
                  <div className="scan-step-label">STEP 3 — Fineme Compass</div>
                  <div className="scan-step-title">「最初の一手」が決まる</div>
                  <p className="scan-step-desc">8軸の優先順位から「今のあなたに最も効く軸」が導き出されます。ユーザーはその軸のガイドを探し、相談します。</p>
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

            <p style={{marginTop:'24px', fontSize:'11px', fontWeight:'800', letterSpacing:'.1em', color:'rgba(201,168,76,.6)', textTransform:'uppercase'}}>ユーザーが増えるほど効いてくる機能</p>
            <div className="tools-grid" style={{marginTop:'10px'}}>
              <div className="problem-card">
                <div className="problem-card-icon">🌐</div>
                <h3>診断起点LP自動生成</h3>
                <p>Me Scanでタイプが判定されたお客様専用のランディングページを自動生成。体験メニュー・症例（Before/After）を登録するだけで、デザイン不要の専用入口ができます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon">🪞</div>
                <h3>Mirrorマッチング</h3>
                <p>写真分析（Mirror）で「改善余地が大きい軸」を特定し、その軸を得意とする店舗・メニューを自動提示。ミスマッチの少ない出会いを設計します。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ⑤ 掲載プラン */}
        <section className="join-section-tinted">
          <div className="join-container" style={{textAlign:'center'}}>
            <div className="sec-eyebrow" style={{justifyContent:'center'}}>Plan</div>
            <h2 className="sec-h2 sec-h2-light">掲載プラン</h2>
            <p className="sec-lead sec-lead-light">登録料 ¥1,100（初回のみ）＋ 月額プラン2段階。広告費を積み上げるモデルではなく、「合う人に届く仕組み」への投資です。</p>

            <div className="plan-grid" style={{gridTemplateColumns:'1fr 1fr', maxWidth:'620px', margin:'0 auto'}}>
              <div className="plan-card">
                <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', color:'rgba(201,168,76,.7)', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif"}}>LIGHT</div>
                <div className="plan-price">¥5,000<small> / 月</small></div>
                <ul className="plan-list">
                  <li>プロフィールページ（無制限）</li>
                  <li>サービスメニュー登録（複数対応）</li>
                  <li>スタッフ紹介・Before/After掲載</li>
                  <li>Me Scanマッチング（総合スコア順）</li>
                  <li>顧客カルテ・リマインド一式</li>
                  <li>紹介報酬プログラム参加資格</li>
                </ul>
              </div>
              <div className="plan-card highlight">
                <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', color:'rgba(201,168,76,.9)', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif"}}>PREMIUM</div>
                <div className="plan-price">¥10,000<small> / 月</small></div>
                <ul className="plan-list">
                  <li>ライトの内容すべて</li>
                  <li>予約手数料率の優遇</li>
                  <li>検索結果での優先表示</li>
                  <li>店舗独自の公式LINEからリマインド配信</li>
                </ul>
              </div>
            </div>
            <p style={{fontSize:'12px', color:'rgba(201,168,76,.8)', marginTop:'20px', fontFamily:"'Noto Sans JP', sans-serif"}}>草創期限定プランです。今後の価格変更は事前告知します。管理機能の詳しい画面イメージは<a href="/business/store-saas-pitch-deck.html" style={{color:'#c9a84c'}}>店舗SaaS営業資料</a>をご覧ください。</p>
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
                  <li><span className="fit-icon-yes">✓</span>今のお客様との関係をもっと大事にしたい</li>
                  <li><span className="fit-icon-yes">✓</span>顧客管理・リマインドを楽にしたい</li>
                  <li><span className="fit-icon-yes">✓</span>選ばれる理由を言語化したい</li>
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
              Finemeは、「新規客が来るのを待つ場所」ではありません。<br/>
              今いるお客様との関係を強くしながら、新しい出会いも育てていく場所です。<br/>
              顧客管理・リマインドに悩みがあるなら——あなたは、Finemeに向いています。
            </p>
            <div className="join-cta-row" style={{justifyContent:'center'}}>
              <a className="btn-gold" href={inquiryHref}>まずは話を聞いてみる</a>
            </div>
            <p className="join-cta-note">※ 無理な勧誘は一切ありません　※ 合わない場合は正直にお伝えします</p>
          </div>
        </section>

      </div>
    </main>
  );
}
