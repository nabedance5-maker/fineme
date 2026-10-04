import { axisGlyph } from '@/lib/axis-glyph';

export const metadata = {
  title: 'いま抱えているお客様を、逃さない：Fineme 店舗向け掲載のご案内',
  description: 'AI専属コンサル・LINEで完結する予約・オンライン決済・回数券と会員プラン・顧客カルテ・休眠顧客の掘り起こしまで、お客様のリピートを作る店舗運営SaaS。月額¥5,000から、予約の手数料なし。パーソナルジム・眉毛サロン・美容師・外見コンサルなど、個人・フリーランス向け。',
  keywords: ['店舗 顧客管理 SaaS', '予約 決済 一体 サロン', 'AI 店舗コンサル', 'リピート対策 サロン', '休眠顧客 掘り起こし', 'パーソナルジム 顧客管理', '美容室 予約リマインド 自動化', '個人事業主 集客', '店舗公式LINE 予約管理'],
  openGraph: {
    title: 'いま抱えているお客様を、逃さない | Fineme 店舗向け掲載のご案内',
    description: 'AI専属コンサル・LINE予約・オンライン決済・顧客カルテ・休眠顧客の掘り起こし。月額¥5,000から使えるリピート特化の店舗運営SaaSです。',
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
          display: inline-block; padding: 5px 13px; border-radius: 999px; font-size: 12px;
          font-weight: 700; background: rgba(201,168,76,.12); color: #e8cf7e;
          border: 1px solid rgba(201,168,76,.3); letter-spacing: .05em;
          font-family: 'Noto Sans JP', sans-serif;
        }
        .join-hero h1 {
          font-size: clamp(26px, 5vw, 40px); line-height: 1.35; font-weight: 700;
          color: #fff; margin: 0 0 18px; letter-spacing: -.01em;
        }
        .join-hero h1 em { font-style: normal; color: #c9a84c; }
        .join-hero-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 40px; align-items: center; }
        .consult-mock {
          background: rgba(13,17,23,.78); border: 1px solid rgba(201,168,76,.35); border-radius: 18px;
          padding: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.45); font-family: 'Noto Sans JP', sans-serif;
        }
        .consult-mock-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .consult-mock-head .glyph { width: 32px; height: 32px; font-size: 15px; border-radius: 50%; }
        .consult-mock-title { font-size: 13px; font-weight: 800; color: #f3efe6; }
        .consult-mock-tag { margin-left: auto; font-size: 10px; color: rgba(255,255,255,.7); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 2px 8px; }
        .bubble { font-size: 13px; line-height: 1.75; color: #f3efe6; background: rgba(255,255,255,.08); border-radius: 4px 14px 14px 14px; padding: 12px 14px; margin: 0 0 8px; }
        .bubble strong { color: #e8cf7e; }
        .bubble-me { background: rgba(201,168,76,.2); border-radius: 14px 4px 14px 14px; margin-left: 36px; }
        .mock-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .mock-action { font-size: 12px; font-weight: 700; color: #0a0f1e; background: #e0c46a; border-radius: 999px; padding: 6px 13px; }
        .mock-action-ghost { background: transparent; color: #e8cf7e; border: 1px solid rgba(224,196,106,.55); }
        .stat-strip { background: rgba(10,15,30,.85); border-top: 1px solid rgba(201,168,76,.25); border-bottom: 1px solid rgba(201,168,76,.25); padding: 26px 0; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }
        .stat-num { font-size: clamp(24px, 4.2vw, 34px); font-weight: 700; color: #e8cf7e; line-height: 1.1; font-family: 'Noto Serif JP', Georgia, serif; }
        .stat-num small { font-size: .5em; font-weight: 700; }
        .stat-label { font-size: 12px; color: rgba(255,255,255,.82); margin-top: 6px; font-family: 'Noto Sans JP', sans-serif; line-height: 1.5; }
        @media (max-width: 820px) {
          .join-hero-grid { grid-template-columns: 1fr; gap: 32px; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); row-gap: 22px; }
        }
        .join-hero-lead {
          font-size: 15px; color: rgba(255,255,255,.8); line-height: 1.9;
          margin: 0 0 26px; max-width: 560px; font-family: 'Noto Sans JP', sans-serif;
        }
        .join-hero-note { font-size: 13px; color: rgba(255,255,255,.72); margin: 0 0 28px; font-family: 'Noto Sans JP', sans-serif; }
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
          font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
          color: #e0c46a; margin: 0 0 12px; display: flex; align-items: center; gap: 10px;
          font-family: 'Noto Sans JP', sans-serif;
        }
        .sec-eyebrow::before { content: ''; width: 20px; height: 1.5px; background: #c9a84c; border-radius: 1px; }
        .sec-h2 { font-size: clamp(20px, 4vw, 28px); font-weight: 700; margin: 0 0 10px; line-height: 1.4; }
        .sec-h2-dark { color: #fff; }
        .sec-h2-light { color: #f3efe6; }
        .sec-lead { font-size: 14px; line-height: 1.9; margin: 0 0 32px; font-family: 'Noto Sans JP', sans-serif; }
        .sec-lead-dark { color: rgba(255,255,255,.84); }
        .sec-lead-light { color: rgba(255,255,255,.84); }

        /* ─── Categories ─── */
        .categories-section { padding: 48px 0 40px; border-bottom: 1px solid rgba(232,228,220,0.1); }
        .cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .cat-item {
          background: rgba(10,15,30,0.65); backdrop-filter: blur(8px);
          border: 1px solid rgba(232,228,220,0.12); border-radius: 12px;
          padding: 16px 12px; text-align: center;
        }
                .cat-item-name { font-size: 13px; font-weight: 800; color: #f3efe6; margin: 0 0 4px; }
        .cat-item-desc { font-size: 12px; color: rgba(255,255,255,0.74); font-family: 'Noto Sans JP', sans-serif; margin: 0; }
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
        .glyph {
          width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
          background: rgba(201,168,76,.14); border: 1px solid rgba(201,168,76,.38);
          color: #e8cf7e; font-family: 'Noto Serif JP', Georgia, serif; font-weight: 700;
          display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1;
        }
        .problem-card-icon { margin-bottom: 12px; }
        .cat-item-icon { display: flex; justify-content: center; margin-bottom: 10px; }
        .problem-card h3 { font-size: 15px; font-weight: 800; color: #f3efe6; margin: 0 0 8px; }
        .problem-card p { font-size: 13px; color: rgba(255,255,255,.82); line-height: 1.7; margin: 0; font-family: 'Noto Sans JP', sans-serif; }
        .problem-card-bar { height: 2px; border-radius: 999px; background: #c9a84c; opacity: .3; margin-top: 14px; }

        /* ─── Scan flow ─── */
        .scan-flow { display: flex; flex-direction: column; gap: 0; }
        .scan-step {
          display: flex; align-items: flex-start; gap: 18px;
          padding: 20px 0; border-bottom: 1px solid rgba(201,168,76,.12);
        }
        .scan-step:last-child { border-bottom: none; }
        .scan-step-icon {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .scan-step-label { font-size: 11px; font-weight: 800; color: #e0c46a; letter-spacing: .1em; margin: 0 0 4px; font-family: 'Noto Sans JP', sans-serif; }
        .scan-step-title { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 6px; }
        .scan-step-desc { font-size: 13px; color: rgba(255,255,255,.85); line-height: 1.8; margin: 0; font-family: 'Noto Sans JP', sans-serif; }
        .scan-step-desc strong { color: #fff; font-weight: 700; }

        /* ─── Matching score breakdown ─── */
        .score-grid { display: flex; flex-direction: column; gap: 10px; }
        .score-block { border-radius: 12px; padding: 18px 20px; }
        .score-block-gold { background: rgba(201,168,76,.06); border: 1.5px solid rgba(201,168,76,.3); }
        .score-block-dim { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.1); }
        .score-block-label { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 10px; font-family: 'Noto Sans JP', sans-serif; }
        .score-block-label-gold { color: #e0c46a; }
        .score-block-label-dim { color: rgba(255,255,255,.85); }
        .score-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
        .score-row:last-child { border-bottom: none; }
        .score-row-name { font-size: 13px; color: #e8e2d4; font-family: 'Noto Sans JP', sans-serif; }
        .score-row-pts { font-size: 13px; font-weight: 800; color: #e0c46a; font-family: 'Noto Sans JP', sans-serif; }
        .score-note { font-size: 13px; color: rgba(255,255,255,.88); line-height: 1.7; margin: 8px 0 0; font-family: 'Noto Sans JP', sans-serif; }
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
        .fit-card-yes h3 { color: #f3efe6; }
        .fit-card-no h3 { color: rgba(255,255,255,.88); }
        .fit-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
        .fit-list li { font-size: 13px; line-height: 1.6; font-family: 'Noto Sans JP', sans-serif; display: flex; gap: 8px; align-items: flex-start; }
        .fit-card-yes .fit-list li { color: rgba(243,239,230,.92); }
        .fit-card-no .fit-list li { color: rgba(255,255,255,.85); }
        .fit-icon-yes { color: #c9a84c; flex-shrink: 0; font-weight: 900; }
        .fit-icon-no { color: rgba(255,255,255,.7); flex-shrink: 0; }

        /* ─── CTA section ─── */
        .join-cta-section {
          padding: 72px 0;
          background: linear-gradient(rgba(6,12,26,0.96), rgba(6,12,26,0.96)),
                      url('/assets/images/bg-parchment.webp') center / cover;
          text-align: center;
        }
        .join-cta-section h2 { font-size: clamp(20px, 4vw, 28px); color: #fff; margin: 0 0 14px; }
        .join-cta-section p { font-size: 14px; color: rgba(255,255,255,.9); margin: 0 0 28px; font-family: 'Noto Sans JP', sans-serif; line-height: 1.8; }
        .join-cta-note { font-size: 12px; color: rgba(255,255,255,.78); margin-top: 14px; font-family: 'Noto Sans JP', sans-serif; }

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
            <div className="join-hero-grid">
              <div>
              <div className="join-hero-chips">
                <span className="join-chip">顧客管理・リピートSaaS</span>
                <span className="join-chip">AI専属コンサル付き</span>
                <span className="join-chip">予約の手数料なし・月額¥5,000から</span>
              </div>
              <h1>
                新規集客の前に、<br/>
                <em>今のお客様を、離さない。</em>
              </h1>
              <p className="join-hero-lead">
                予約の取りこぼし、いつの間にか来なくなった常連、スタッフの頭の中にしかない顧客情報——<br/>
                Finemeは、お客様のリピートを作ることに特化した店舗運営SaaSです。<br/>
                AI専属コンサルが店舗の数字を見て次の一手を提案。予約・決済・カルテ・リマインドまで、ひとつの管理画面で完結します。
              </p>
              <p className="join-hero-note">掲載すれば、診断を経て「本気で変わりたい」お客様との新しい出会いも、伸びしろとして加わります。</p>
              <div className="join-cta-row">
                <a className="btn-gold" href={inquiryHref}>掲載について相談する</a>
                <a className="btn-ghost-white" href="#tools">できることを見る</a>
              </div>
              </div>
              <div className="consult-mock" aria-label="AI専属コンサルの画面イメージ">
                <div className="consult-mock-head">
                  <div className="glyph">談</div>
                  <div className="consult-mock-title">AI専属コンサル</div>
                  <div className="consult-mock-tag">画面イメージ</div>
                </div>
                <p className="bubble">今週の見立てです。<strong>来店から8週間あいているお客様が3名</strong>います。前回のメニューへの一言を添えた声かけが、いちばん戻りやすい時期です。</p>
                <p className="bubble">3名とも、前回は同じスタッフが担当しています。文案を作りましょうか？</p>
                <p className="bubble bubble-me">お願いします。LINEで送りたいです。</p>
                <div className="mock-actions">
                  <span className="mock-action">声かけ文案を見る</span>
                  <span className="mock-action mock-action-ghost">3名をカルテで確認</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stat-strip">
          <div className="join-container">
            <div className="stat-grid">
              <div><div className="stat-num">¥5,000<small>〜/月</small></div><div className="stat-label">月額プランはA・B・Cの3段階</div></div>
              <div><div className="stat-num">0<small>円</small></div><div className="stat-label">予約そのものの手数料</div></div>
              <div><div className="stat-num">4.5<small>%</small></div><div className="stat-label">オンライン決済の手数料のみ<br/>（カード会社手数料込み）</div></div>
              <div><div className="stat-num">ON/OFF</div><div className="stat-label">使う機能だけを画面に並べられる</div></div>
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
                <div className="problem-card-icon"><div className="glyph">人</div></div>
                <h3>顧客管理が属人的</h3>
                <p>常連の来店タイミング・好み・注意点が、スタッフの頭の中にしかありません。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">去</div></div>
                <h3>気づいたら来なくなっている</h3>
                <p>休眠したお客様を追いきれず、離れたことにすら気づけないまま時間が過ぎます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">割</div></div>
                <h3>クーポン目当てのお客様ばかり</h3>
                <p>値引き前提の比較は価値を削り、本来の魅力を伝え切れません。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
            <div style={{marginTop:'16px', padding:'18px 22px', background:'#0a0f1e', borderRadius:'14px', border:'1px solid rgba(201,168,76,.2)'}}>
              <p style={{margin:0, fontSize:'15px', fontWeight:'700', color:'#fff', lineHeight:'1.7', fontFamily:"'Noto Sans JP', sans-serif"}}>
                それは接客の問題ではありません。
                <span style={{color:'#c9a84c'}}> 仕組みの問題です。</span><br/>
                <span style={{fontSize:'13px', fontWeight:'400', color:'rgba(255,255,255,.8)'}}>Finemeは「今いるお客様との関係」から仕組み化します。</span>
              </p>
            </div>
          </div>
        </section>

        {/* ③.5 掲載後すぐ使える店舗運営ツール */}
        <section className="join-section-dark" id="tools">
          <div className="join-container">
            <div className="sec-eyebrow">Store Management Tools</div>
            <h2 className="sec-h2 sec-h2-dark">予約から決済、リピートまで。ひとつの画面で</h2>
            <p className="sec-lead sec-lead-dark">新しいお客様がいなくても、いま抱えているお客様との関係を強くする機能が、契約したその日から使えます。使わない機能は店舗ごとにON/OFFでき、必要なものだけが画面に並びます。</p>
            <div className="problem-grid tools-grid">
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">談</div></div>
                <h3>AI専属コンサル</h3>
                <p>予約・売上・来店間隔などの店舗データをAIが読み、「いま誰に声をかけるべきか」「どのメニューが伸びているか」を吹き出し形式で提案。相談したいことは、そのままチャットで聞けます。全プランで使えます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">予</div></div>
                <h3>予約のやり取りがLINEで完結</h3>
                <p>お客様は普段のLINEトークから予約。店舗は承認・代替日時の提案・来店確認まで、その場のボタン操作で返せます。空き枠から即確定する方式と、希望日時を受けて承認する方式を店舗ごとに選べます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">決</div></div>
                <h3>オンライン決済・請求</h3>
                <p>予約デポジット、請求書のカード決済までFinemeの中で完結。代金は店舗の口座へ直接入金され、集計は売上管理に自動で反映されます。決済手数料は一律4.5%で、予約そのものの手数料はありません。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">記</div></div>
                <h3>顧客カルテ</h3>
                <p>来店履歴・担当スタッフ・Me Scan受診有無を自動で一覧化。店舗ごとに自由な項目（自由記述・選択式・5段階評価）を足せます。Plan Cでは蓄積した記録からAIが傾向・注意点を提案します。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">再</div></div>
                <h3>リマインド・休眠掘り起こし</h3>
                <p>予約前日の確認・誕生日メッセージは全プランで自動配信。Plan B以上では、来店間隔が空いたお客様の一覧化と声かけ、来店後のクチコミ依頼まで仕組みで回せます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">会</div></div>
                <h3>回数券・会員プラン・クラス</h3>
                <p>回数券、月額会員プラン、通い放題の組み合わせをオンラインで販売。クラス予約、QRチェックイン、出欠確認、友達紹介プログラムまで、通い続けてもらう仕組みが揃います（Plan B以上）。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">指</div></div>
                <h3>スタッフ指名・シフト管理</h3>
                <p>指名予約と指名料、シフト表の作成と提出、部屋・設備の空き管理に対応。担当したお客様のリピート率・指名率も自動で見える化されます（Plan B以上）。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">売</div></div>
                <h3>売上管理・POS・在庫</h3>
                <p>メニュー別・スタッフ別・支払い方法別の自動集計とCSV出力、LTV・CAC概算を全プランで。物販のレジ会計と在庫管理、操作ログはPlan Cで使えます。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
            <div style={{marginTop:'16px', padding:'18px 22px', background:'rgba(201,168,76,.08)', borderRadius:'14px', border:'1px solid rgba(201,168,76,.3)'}}>
              <p style={{margin:0, fontSize:'14px', color:'#e8e2d4', lineHeight:'1.8', fontFamily:"'Noto Sans JP', sans-serif"}}>
                <strong style={{color:'#fff'}}>休眠客1人の呼び戻しで、月額¥5,000は元が取れます。</strong><br/>
                客単価¥10,000〜¥30,000なら、リマインド経由の再来店が月1件あるだけで回収完了です。
              </p>
            </div>
            <p style={{marginTop:'14px', fontSize:'13px', color:'rgba(255,255,255,.78)', lineHeight:'1.7', fontFamily:"'Noto Sans JP', sans-serif"}}>
              エリア需要の可視化なども開発中です。画面イメージ・導入フローなど詳しい機能一覧は<a href="/business/store-saas-pitch-deck.html" style={{color:'#e0c46a', textDecoration:'underline'}}>店舗SaaS営業資料</a>をご覧ください。
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
                <div className="scan-step-icon"><div className="glyph">診</div></div>
                <div>
                  <div className="scan-step-label">STEP 1 — Me Scan</div>
                  <div className="scan-step-title">ユーザーは外見診断を受ける</div>
                  <p className="scan-step-desc">体型・眉・服・髪・肌・脱毛・歯・爪の8軸で現在地とゴールを測定。なぜ変わりたいか・どこから変えるかを言語化します。<strong>恋愛・対人・就活・自己投資など、動機も全部記録します。</strong></p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon"><div className="glyph">図</div></div>
                <div>
                  <div className="scan-step-label">STEP 2 — New Me Navi</div>
                  <div className="scan-step-title">変容プロファイルが生成される</div>
                  <p className="scan-step-desc">8軸レーダーチャートと変容ベクトルが可視化された「自分だけの地図」が生成されます。これが<strong>マッチングの起点</strong>です。</p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon"><div className="glyph">針</div></div>
                <div>
                  <div className="scan-step-label">STEP 3 — Fineme Compass</div>
                  <div className="scan-step-title">「最初の一手」が決まる</div>
                  <p className="scan-step-desc">8軸の優先順位から「今のあなたに最も効く軸」が導き出されます。ユーザーはその軸のガイドを探し、相談します。</p>
                </div>
              </div>
              <div className="scan-step">
                <div className="scan-step-icon"><div className="glyph">合</div></div>
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
                  <span className="score-row-name">きっかけ一致（来店動機の共鳴）</span>
                  <span className="score-row-pts">+8</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">失敗パターン一致（過去の挫折への向き合い）</span>
                  <span className="score-row-pts">+8</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">Compassの軸 × サービスカテゴリー一致</span>
                  <span className="score-row-pts">+12</span>
                </div>
                <div className="score-row">
                  <span className="score-row-name">ユーザーの優先変容軸 × サービス対象軸</span>
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

            <p style={{marginTop:'24px', fontSize:'11px', fontWeight:'800', letterSpacing:'.1em', color:'#e0c46a', textTransform:'uppercase'}}>ユーザーが増えるほど効いてくる機能</p>
            <div className="tools-grid" style={{marginTop:'10px'}}>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">診</div></div>
                <h3>診断起点LP自動生成</h3>
                <p>Me Scanでタイプが判定されたお客様専用のランディングページを自動生成。体験メニュー・症例（Before/After）を登録するだけで、デザイン不要の専用入口ができます。</p>
                <div className="problem-card-bar"></div>
              </div>
              <div className="problem-card">
                <div className="problem-card-icon"><div className="glyph">鏡</div></div>
                <h3>Mirrorマッチング</h3>
                <p>写真分析（Mirror）で「改善余地が大きい軸」を特定し、その軸を得意とする店舗・メニューを自動提示。ミスマッチの少ない出会いを設計します。</p>
                <div className="problem-card-bar"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ④.5 対象業種 */}
        <section className="categories-section">
          <div className="join-container">
            <div className="sec-eyebrow">対象業種</div>
            <h2 className="sec-h2 sec-h2-light" style={{marginBottom:'8px'}}>こんな業種の方が参加しています</h2>
            <p className="sec-lead sec-lead-light" style={{marginBottom:'24px'}}>個人経営・フリーランス・小規模サロン、すべて歓迎です。</p>
            <div className="cat-grid">
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('gym')}</div></div>
                <div className="cat-item-name">パーソナルジム</div>
                <p className="cat-item-desc">フリーランスPT・個人ジム</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('eyebrow')}</div></div>
                <div className="cat-item-name">眉毛サロン</div>
                <p className="cat-item-desc">アイブロウスタイリスト</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('hair')}</div></div>
                <div className="cat-item-name">美容室・美容師</div>
                <p className="cat-item-desc">フリーランス・個人サロン</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('consulting')}</div></div>
                <div className="cat-item-name">外見コンサル</div>
                <p className="cat-item-desc">外見・印象改善コンサル</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('fashion')}</div></div>
                <div className="cat-item-name">ファッション</div>
                <p className="cat-item-desc">パーソナルスタイリスト</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('hairremoval')}</div></div>
                <div className="cat-item-name">脱毛サロン</div>
                <p className="cat-item-desc">メンズ脱毛・医療脱毛</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('aga')}</div></div>
                <div className="cat-item-name">AGAクリニック</div>
                <p className="cat-item-desc">薄毛・AGA治療院</p>
              </div>
              <div className="cat-item">
                <div className="cat-item-icon"><div className="glyph">{axisGlyph('photo')}</div></div>
                <div className="cat-item-name">写真撮影・その他</div>
                <p className="cat-item-desc">婚活・マッチングアプリ写真</p>
              </div>
            </div>
          </div>
        </section>

        {/* ⑤ 掲載プラン */}
        <section className="join-section-tinted">
          <div className="join-container" style={{textAlign:'center'}}>
            <div className="sec-eyebrow" style={{justifyContent:'center'}}>Plan</div>
            <h2 className="sec-h2 sec-h2-light">掲載プラン</h2>
            <p className="sec-lead sec-lead-light">登録料 ¥1,100（初回のみ）＋ 月額プラン3段階。予約の手数料はありません。プランの違いは使える機能だけです。必要な機能に合わせて、いつでも切り替えられます。</p>

            <div className="plan-grid" style={{maxWidth:'960px', margin:'0 auto'}}>
              <div className="plan-card">
                <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif", color:'#e0c46a'}}>PLAN A</div>
                <div className="plan-price">¥5,000<small> / 月</small></div>
                <ul className="plan-list">
                  <li>公開プロフィールページ</li>
                  <li>予約受付（LINE完結・即時予約・店頭予約ボード）</li>
                  <li>オンライン決済・請求書・予約デポジット</li>
                  <li>基本カルテ・売上管理・LTV/CAC概算</li>
                  <li>AI専属コンサル</li>
                  <li>リマインド・誕生日メッセージ（Fineme公式LINEから）</li>
                  <li>お客様の登録は30人まで</li>
                </ul>
              </div>
              <div className="plan-card">
                <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif", color:'#e0c46a'}}>PLAN B</div>
                <div className="plan-price">¥7,000<small> / 月</small></div>
                <ul className="plan-list">
                  <li>Plan Aの内容すべて</li>
                  <li>お客様の登録が無制限</li>
                  <li>休眠顧客の掘り起こし・クチコミ依頼の自動化</li>
                  <li>スタッフ指名・シフト管理・部屋と設備の管理</li>
                  <li>回数券・会員プラン・入会手続き・クラス管理</li>
                  <li>QRチェックイン・出欠確認・友達紹介</li>
                </ul>
              </div>
              <div className="plan-card highlight">
                <div style={{fontSize:'12px', fontWeight:'800', letterSpacing:'.12em', marginBottom:'10px', fontFamily:"'Noto Sans JP', sans-serif", color:'#e0c46a'}}>PLAN C</div>
                <div className="plan-price">¥10,000<small> / 月</small></div>
                <ul className="plan-list">
                  <li>Plan Bの内容すべて</li>
                  <li>予約・リマインドが店舗独自の公式LINEから届く</li>
                  <li>カルテAI分析・姿勢分析・健診アドバイス</li>
                  <li>POS・物販・在庫管理</li>
                  <li>ロッカー月極管理</li>
                  <li>操作ログ</li>
                </ul>
              </div>
            </div>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,.86)', marginTop:'16px', fontFamily:"'Noto Sans JP', sans-serif"}}>Fineme経由のオンライン決済には、全プラン共通で決済手数料4.5%（カード会社の手数料込み）がかかります。入金額から差し引かれ、別途のご負担はありません。（例：¥10,000の決済で手数料¥450、店舗への入金は¥9,550）<br/>月額料金は、Fineme経由で初めて予約・問い合わせが発生した月から。それまでは無料で掲載・管理画面をお使いいただけます。</p>
            <p style={{fontSize:'13px', color:'#e0c46a', marginTop:'20px', fontFamily:"'Noto Sans JP', sans-serif"}}>今後の価格変更は事前に告知します。管理機能の詳しい画面イメージは<a href="/business/store-saas-pitch-deck.html" style={{color:'#e0c46a', textDecoration:'underline'}}>店舗SaaS営業資料</a>をご覧ください。</p>
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
                <h3 style={{fontSize:'14px', fontWeight:'800', color:'#f3efe6', margin:'0 0 10px'}}>仕組み</h3>
                <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'8px'}}>
                  <li style={{fontSize:'13px', color:'rgba(243,239,230,.92)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>あなたが紹介した事業者が有料掲載を開始→<strong>紹介報酬が発生</strong></li>
                  <li style={{fontSize:'13px', color:'rgba(243,239,230,.92)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>うまく運用すると<strong>掲載料相当を相殺</strong>、場合によっては<strong>プラス</strong>へ</li>
                  <li style={{fontSize:'13px', color:'rgba(243,239,230,.92)', fontFamily:"'Noto Sans JP', sans-serif", display:'flex', gap:'8px'}}><span style={{color:'#c9a84c', fontWeight:'900', flexShrink:0}}>✓</span>単なる数集めではなく<strong>相性主導</strong>の健全なエコシステム</li>
                </ul>
              </div>
              <div style={{background:'#111827', border:'1px solid rgba(201,168,76,.15)', borderRadius:'14px', padding:'20px'}}>
                <h3 style={{fontSize:'14px', fontWeight:'800', color:'rgba(255,255,255,.85)', margin:'0 0 10px'}}>誠実運用のガイドライン</h3>
                <p style={{fontSize:'13px', color:'#d5dbe4', lineHeight:'1.8', margin:0, fontFamily:"'Noto Sans JP', sans-serif"}}>強引な勧誘やミスマッチな紹介は推奨しません。「この人ならユーザーに紹介できる」と思える事業者のみ、丁寧につないでください。報酬条件の詳細は個別相談でご説明します。</p>
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
                  <li><span className="fit-icon-no">✕</span>新規のお客様の送客だけを期待している</li>
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
              リピートを仕組みにしたいなら——あなたは、Finemeに向いています。
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
