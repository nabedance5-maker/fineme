import Link from 'next/link';

export const metadata = {
  title: 'Finemeとは？ | 変容の旅のインフラ',
  description: '外見を起点に自信を再設計するためのプラットフォーム。Me Scan（8軸診断・無料・コア約3分）で地図を描き、Mirror（写真1枚のAI分析）で現在地を測る。男性向けFinemeと女性向けBelleの二つのトラックで展開しています。',
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://www.fineme.me/about#deo',
  name: '渡邉英雄（でお）',
  alternateName: 'でお',
  jobTitle: '外見改善アドバイザー / Fineme代表',
  description: '元・非モテから現役モデルへ。外見改善プラットフォームFineme（男性向けFineme・女性向けBelle）代表。外見を起点に自信を再設計する方法を発信している。',
  url: 'https://www.fineme.me/about',
  worksFor: {
    '@type': 'Organization',
    '@id': 'https://www.fineme.me/#organization',
    name: 'Fineme',
  },
  sameAs: [
    'https://twitter.com/deo_fineme',
  ],
};

const AXES = [
  { icon: '💪', label: '体型・ボディ',       tier: 1, desc: '姿勢・体型・ボディメイク。第一印象の土台。' },
  { icon: '✂️', label: '眉毛',               tier: 1, desc: '顔の輪郭を決める最も即効性の高いパーツ。' },
  { icon: '👔', label: '服・コーデ',         tier: 1, desc: 'シルエットと色で全体の印象を設計する。' },
  { icon: '💇', label: '髪・ヘア',           tier: 1, desc: '毎日目に入る。変化の実感が最も得やすい軸。' },
  { icon: '✨', label: '肌・ニキビ・エステ', tier: 2, desc: '清潔感の底上げ。継続で確実に変わる。' },
  { icon: '🪒', label: '脱毛・ムダ毛',       tier: 2, desc: 'ひげ・体毛の処理。整えるだけで印象が静かに変わる。' },
  { icon: '🦷', label: '歯・口元',           tier: 3, desc: '笑顔の自信は人間関係の質を変える。' },
  { icon: '💅', label: '爪',                 tier: 4, desc: '細部への気遣いが「丁寧な人」の印象をつくる。' },
];

const JOURNEY = [
  {
    step: '01', label: 'Me Scan', sublabel: '地図を描く・無料', icon: '🧬',
    desc: 'あなたの現在地・理想・来た道を8つの軸でスキャン。コア約3分で地図の骨格ができ、136タイプの中のあなたと「最初の一手」が確定する。そのあとは1軸ずつ描き込んで、地図を育てていける。',
  },
  {
    step: '02', label: 'Mirror', sublabel: '現在地を測る', icon: '📸',
    desc: '写真を1枚送ると、AIが「他人の目に自分がどう見えているか」を分析し、今いちばん変わりやすい場所を教える。写真は保存しない。無料プレビューあり、詳細分析は¥500。',
  },
  {
    step: '03', label: 'New Me Navi', sublabel: '変容ナビ', icon: '🧭',
    desc: 'ギャップを可視化したレーダーチャートと、あなた専用の「Fineme Compass（最優先の一手）」が生成される。迷いを一点に絞るための羅針盤。',
  },
  {
    step: '04', label: 'New Me Map', sublabel: '変容マップ', icon: '🗺️',
    desc: '8軸それぞれのロードマップ。どの順で、どんな中継地点を経て変わっていくかを可視化した航海図。描き込むほど、測るほど精度が上がる。',
  },
  {
    step: '05', label: 'ガイドと出会う', sublabel: 'マッチング', icon: '🤝',
    desc: 'あなたの変容ベクトルと「来た道」に合ったガイドを一致度で表示。偶然ではなく、必然の出会いへ。',
  },
];

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <style>{`
        /* ── Nautical Hero ── */
        .af-hero {
          position: relative;
          padding: 100px 24px 88px;
          background:
            linear-gradient(rgba(10,15,30,0.72), rgba(10,15,30,0.82)),
            url('/assets/images/hero-bg.webp') center / cover no-repeat;
          text-align: center;
          overflow: hidden;
        }
        .af-hero-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: .18em;
          color: rgba(201,168,76,0.55); text-transform: uppercase;
          margin: 0 0 20px; position: relative; z-index: 1;
        }
        .af-hero h1 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(26px, 5.5vw, 44px); font-weight: 700;
          color: #fff; margin: 0 0 20px; line-height: 1.5; letter-spacing: -.01em;
          position: relative; z-index: 1;
        }
        .af-hero h1 em {
          font-style: normal; color: #c9a84c;
        }
        .af-hero-sub {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(14px, 2.2vw, 17px); color: rgba(255,255,255,.65);
          line-height: 2; max-width: 520px; margin: 0 auto 36px;
          position: relative; z-index: 1;
        }
        .af-hero-sub strong { color: rgba(255,255,255,.88); font-weight: 500; }
        .af-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; border: 1.5px solid #c9a84c; color: #c9a84c;
          background: transparent; border-radius: 3px; font-size: 15px; font-weight: 700;
          text-decoration: none; letter-spacing: .06em;
          transition: background .2s, color .2s, box-shadow .2s;
          position: relative; z-index: 1;
        }
        .af-cta-btn:hover { background: #c9a84c; color: #0a0f1e; box-shadow: 0 0 28px rgba(201,168,76,.35); }

        /* ── Wrap & Sections ── */
        .af-wrap { max-width: 860px; margin: 0 auto; padding: 0 20px 80px; }
        .af-sec { margin: 64px 0 0; }
        .af-sec-label {
          font-size: 11px; font-weight: 800; letter-spacing: .14em;
          text-transform: uppercase; color: var(--color-gold, #c9a84c); margin: 0 0 12px;
        }
        .af-sec h2 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(22px, 4vw, 30px); font-weight: 700;
          color: rgba(232,228,220,0.90); margin: 0 0 10px;
        }
        .af-sec-lead { font-size: 16px; color: rgba(232,228,220,0.55); line-height: 1.9; margin: 0 0 28px; }

        /* ── Journey steps ── */
        .af-journey { display: flex; flex-direction: column; gap: 14px; }
        .af-journey-step {
          display: grid; grid-template-columns: 64px 1fr;
          gap: 0; align-items: stretch;
          border-radius: 10px;
          border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28));
          overflow: hidden; background: rgba(10,15,30,0.65); backdrop-filter: blur(8px);
          box-shadow: var(--shadow-sm); transition: transform .15s, box-shadow .15s;
        }
        .af-journey-step:hover { transform: translateX(4px); box-shadow: var(--shadow-gold); }
        .af-step-left {
          background: var(--color-bg-dark, #0a0f1e);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 16px 8px; gap: 6px;
        }
        .af-step-num {
          font-size: 10px; font-weight: 800; letter-spacing: .1em; color: rgba(201,168,76,0.5);
        }
        .af-step-icon { font-size: 26px; line-height: 1; }
        .af-step-right { padding: 18px 20px; }
        .af-step-label { font-size: 17px; font-weight: 800; color: rgba(232,228,220,0.90); margin: 0 0 2px; }
        .af-step-sublabel { font-size: 11px; color: var(--color-gold, #c9a84c); font-weight: 700; margin: 0 0 8px; letter-spacing: .06em; }
        .af-step-desc { font-size: 14px; color: rgba(232,228,220,0.55); line-height: 1.7; margin: 0; }

        /* ── 7 axis grid ── */
        .af-axis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 12px;
        }
        .af-axis-card {
          background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28));
          border-radius: 12px; padding: 16px 18px;
          display: flex; gap: 12px; align-items: flex-start;
          box-shadow: var(--shadow-sm);
          transition: box-shadow .15s, transform .12s;
        }
        .af-axis-card:hover { box-shadow: var(--shadow-gold); transform: translateY(-2px); }
        .af-axis-icon { font-size: 24px; flex-shrink: 0; }
        .af-axis-name { font-size: 14px; font-weight: 800; color: rgba(232,228,220,0.90); margin: 0 0 4px; }
        .af-axis-tier {
          font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 99px; display: inline-block; margin: 0 0 6px;
        }
        .tier-1 { background: rgba(201,168,76,0.15); color: var(--color-gold, #c9a84c); border: 1px solid rgba(201,168,76,.3); }
        .tier-2 { background: #d1fae5; color: #065f46; }
        .tier-3 { background: #fef3c7; color: #92400e; }
        .tier-4 { background: #f3f4f6; color: #374151; }
        .af-axis-desc { font-size: 12px; color: rgba(232,228,220,0.55); line-height: 1.6; margin: 0; }

        /* ── Philosophy ── */
        .af-philosophy {
          background: var(--color-bg-dark, #0a0f1e);
          border-radius: 12px; padding: 44px 36px;
          border: 1px solid rgba(201,168,76,0.2);
        }
        .af-philosophy-poem { margin: 0; }
        .af-philosophy-poem p {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(16px, 3vw, 20px); color: rgba(255,255,255,.88);
          line-height: 2.2; margin: 0 0 14px;
        }
        .af-philosophy-poem p:last-child { margin: 0; }
        .af-philosophy-poem em {
          font-style: normal; color: #c9a84c; font-weight: 700;
        }
        .af-mvcard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .af-mvcard {
          padding: 20px; border-radius: 10px;
          border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28));
          background: rgba(10,15,30,0.65); backdrop-filter: blur(8px);
        }
        .af-mvcard-label { font-size: 10px; font-weight: 800; color: var(--color-gold, #c9a84c); margin: 0 0 8px; letter-spacing: .12em; }
        .af-mvcard p { font-size: 15px; font-weight: 700; color: rgba(232,228,220,0.90); margin: 0; line-height: 1.6; }

        /* ── Difference ── */
        .af-diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .af-diff-card { border-radius: 12px; padding: 22px 20px; border: 1.5px solid; }
        .af-diff-label { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 8px; }
        .af-diff-title { font-size: 16px; font-weight: 800; margin: 0 0 12px; }
        .af-diff-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
        .af-diff-list li { font-size: 13px; line-height: 1.65; padding-left: 20px; position: relative; }
        .af-diff-list li::before { content: attr(data-icon); position: absolute; left: 0; }

        /* ── Bottom CTA ── */
        .af-bottom-cta {
          text-align: center; padding: 52px 28px;
          background: var(--color-bg-dark, #0a0f1e);
          border-radius: 12px; border: 1px solid rgba(201,168,76,0.2); margin-top: 64px;
        }
        .af-bottom-cta-eyebrow { font-size: 11px; font-weight: 800; color: rgba(201,168,76,0.5); letter-spacing: .14em; text-transform: uppercase; margin: 0 0 14px; }
        .af-bottom-cta h2 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(20px, 4vw, 28px); font-weight: 700; color: #fff; margin: 0 0 12px;
        }
        .af-bottom-cta p { font-size: 15px; color: rgba(255,255,255,.6); margin: 0 0 28px; line-height: 1.8; }
        .af-bottom-note { font-size: 12px; color: rgba(255,255,255,.3); margin-top: 14px; }

        @media (max-width: 600px) {
          .af-diff-grid { grid-template-columns: 1fr; }
          .af-philosophy { padding: 28px 20px; }
          .af-mvcard-grid { grid-template-columns: 1fr; }
          .af-journey-step { grid-template-columns: 52px 1fr; }
        }
      `}</style>

      {/* Hero */}
      <section className="af-hero">
        <p className="af-hero-eyebrow">About Fineme</p>
        <h1>
          外見を変えたいあなたに、<br />
          <em>地図と羅針盤</em>を渡す場所。
        </h1>
        <p className="af-hero-sub">
          Finemeは、ただの検索サイトではありません。<br />
          <strong>「変わりたい」という意志を、現実の変化に変えるためのインフラ</strong>です。
        </p>
        <Link href="/diagnosis" className="af-cta-btn">
          🧬 Me Scanを受ける（無料）
        </Link>
      </section>

      <main className="af-wrap">

        {/* 変容の旅 */}
        <section className="af-sec">
          <p className="af-sec-label">How it works</p>
          <h2>Finemeでの変容の旅</h2>
          <p className="af-sec-lead">
            診断を受けて終わり、ではありません。<br />
            あなたの現在地から理想への道のりを可視化し、<br />
            旅のパートナーとなるガイドと繋ぐ——変容のためのインフラです。
          </p>
          <div style={{
            border: '1px solid rgba(201,168,76,0.28)', borderRadius: 10,
            background: 'rgba(10,15,30,0.55)', padding: '18px 20px', margin: '0 0 20px',
          }}>
            <p style={{ fontSize: 13, color: 'rgba(232,228,220,0.75)', lineHeight: 1.9, margin: 0 }}>
              <strong style={{ color: '#c9a84c' }}>Me Scan と Mirror に順番はありません。</strong><br />
              地図を描くのが Me Scan、今の現在地を測るのが Mirror。<br />
              描いて、測って、また描き足す——この循環が New Me Map を育てていきます。
            </p>
          </div>
          <div className="af-journey">
            {JOURNEY.map(j => (
              <div key={j.step} className="af-journey-step">
                <div className="af-step-left">
                  <div className="af-step-num">STEP {j.step}</div>
                  <div className="af-step-icon">{j.icon}</div>
                </div>
                <div className="af-step-right">
                  <div className="af-step-label">{j.label}</div>
                  <div className="af-step-sublabel">{j.sublabel}</div>
                  <p className="af-step-desc">{j.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8軸システム */}
        <section className="af-sec">
          <p className="af-sec-label">The 8-Axis System</p>
          <h2>外見を8つの軸で見る</h2>
          <p className="af-sec-lead">
            Me Scanは、外見を8つの軸でスキャンします。<br />
            Tier（優先順位）は「即効性・コスト・継続難易度」から算出。<br />
            あなたのギャップが最も大きいTier 1の軸が、Fineme Compassの最初の一手になります。
          </p>
          <div className="af-axis-grid">
            {AXES.map(ax => (
              <div key={ax.label} className="af-axis-card">
                <div className="af-axis-icon">{ax.icon}</div>
                <div>
                  <div className="af-axis-name">{ax.label}</div>
                  <span className={`af-axis-tier tier-${ax.tier}`}>Tier {ax.tier}</span>
                  <p className="af-axis-desc">{ax.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 差別化 */}
        <section className="af-sec">
          <p className="af-sec-label">What makes Fineme different</p>
          <h2>なぜ「ただの検索」ではないのか</h2>
          <p className="af-sec-lead">
            一般の美容・健康サービス検索と、Finemeが根本的に異なる点があります。
          </p>
          <div className="af-diff-grid">
            <div className="af-diff-card" style={{ background: 'rgba(10,15,30,0.40)', borderColor: 'rgba(232,228,220,0.15)' }}>
              <div className="af-diff-label" style={{ color: 'rgba(232,228,220,0.40)' }}>一般の検索サイト</div>
              <div className="af-diff-title" style={{ color: 'rgba(232,228,220,0.70)' }}>「どこがいいか」を探す</div>
              <ul className="af-diff-list" style={{ color: 'rgba(232,228,220,0.60)' }}>
                <li data-icon="❌">ユーザーの現在地・ゴールを知らない</li>
                <li data-icon="❌">「来た道」（なぜ続かなかったか）を問わない</li>
                <li data-icon="❌">予約して終わり。変容の旅は始まらない</li>
                <li data-icon="❌">再来店の動機が「割引」だけ</li>
              </ul>
            </div>
            <div className="af-diff-card" style={{ background: 'var(--color-bg-dark, #0a0f1e)', borderColor: 'rgba(201,168,76,0.35)' }}>
              <div className="af-diff-label" style={{ color: 'rgba(201,168,76,0.6)' }}>Fineme</div>
              <div className="af-diff-title" style={{ color: '#fff' }}>「今の自分に合う一手」を知る</div>
              <ul className="af-diff-list" style={{ color: 'rgba(255,255,255,.75)' }}>
                <li data-icon="✅">8軸で現在地・理想・ギャップを可視化</li>
                <li data-icon="✅">「来た道」を元に最適なガイドをマッチング</li>
                <li data-icon="✅">変容ロードマップで旅を継続させる</li>
                <li data-icon="✅">再来店の動機が「続きの旅」</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 二トラック */}
        <section className="af-sec">
          <p className="af-sec-label">Two tracks</p>
          <h2>Fineme と Fineme Belle</h2>
          <p className="af-sec-lead">
            外見の悩みは、男女で言葉も選択肢も変わります。<br />
            だからFinemeは、内容を薄く共通化するのではなく、<br />
            <strong style={{ color: 'rgba(232,228,220,0.8)', fontWeight: 500 }}>2つのトラック</strong>に分けて設計しています。
          </p>
          <div className="af-diff-grid">
            <div className="af-diff-card" style={{ background: 'var(--color-bg-dark, #0a0f1e)', borderColor: 'rgba(201,168,76,0.35)' }}>
              <div className="af-diff-label" style={{ color: 'rgba(201,168,76,0.6)' }}>男性向け</div>
              <div className="af-diff-title" style={{ color: '#fff' }}>Fineme</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.8, margin: '0 0 14px' }}>
                8軸・136タイプ・Compass・New Me Map。<br />タイプは136種の「生き物」で表されます。
              </p>
              <Link href="/diagnosis" style={{ fontSize: 13, color: '#c9a84c', textDecoration: 'none', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Me Scanを受ける（無料）→
              </Link>
              <Link href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', textDecoration: 'none' }}>
                Finemeのトップを見る →
              </Link>
            </div>
            <div className="af-diff-card" style={{ background: 'rgba(30,10,22,0.55)', borderColor: 'rgba(200,120,155,0.35)' }}>
              <div className="af-diff-label" style={{ color: 'rgba(220,140,175,0.75)' }}>女性向け</div>
              <div className="af-diff-title" style={{ color: '#f5e0ea' }}>Fineme Belle</div>
              <p style={{ fontSize: 13, color: 'rgba(245,224,234,.7)', lineHeight: 1.8, margin: '0 0 14px' }}>
                8軸・136タイプ・Compass・New Me Map。<br />タイプは136種の「花」で表されます。
              </p>
              <Link href="/belle/diagnosis" style={{ fontSize: 13, color: 'rgba(220,140,175,0.95)', textDecoration: 'none', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                Me Scanを受ける（無料）→
              </Link>
              <Link href="/belle" style={{ fontSize: 12, color: 'rgba(245,224,234,.45)', textDecoration: 'none' }}>
                Belleのトップを見る →
              </Link>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(232,228,220,0.45)', lineHeight: 1.9, margin: '18px 0 0' }}>
            分けているのは届け方であって、思想ではありません。<br />
            外見を起点に自信を再設計できることに、性別は関係ない——というのがFinemeの前提です。
          </p>
        </section>

        {/* Philosophy */}
        <section className="af-sec">
          <p className="af-sec-label">Philosophy</p>
          <h2>Finemeの根本思想</h2>
          <div className="af-philosophy">
            <blockquote className="af-philosophy-poem">
              <p>外見を整えることで生まれる<em>小さな自信</em>が、<br />
              人に優しくなれる余白をつくり、<br />
              その優しさが連鎖することで、<br />
              世界は少しずつ<em>愛で満たされていく</em>。</p>
              <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '15px', marginTop: '20px', fontFamily: "'Noto Serif JP', Georgia, serif", lineHeight: '2' }}>
                見た目を整えることは、誰かに勝つためでも取り繕うためでもない。<br />
                鏡の前で、自分を嫌いにならずに済むこと。ほんの少し背筋が伸びること。<br />
                その小さな変化が、心に余裕を生み、人との関係や選択を、静かに変えていく。
              </p>
              <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '14px', marginTop: '18px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                外見は目的ではなく、きっかけ。
              </p>
            </blockquote>
          </div>
          <div className="af-mvcard-grid">
            <div className="af-mvcard">
              <div className="af-mvcard-label">MISSION</div>
              <p>外見を起点に、自信を再設計する人を増やす。</p>
            </div>
            <div className="af-mvcard">
              <div className="af-mvcard-label">VISION</div>
              <p>外見を理由に、人生を諦めなくていい世界をつくる。</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="af-bottom-cta">
          <p className="af-bottom-cta-eyebrow">START HERE</p>
          <h2>まず、あなたの現在地を知ることから。</h2>
          <p>
            Me Scanは無料で受けられます。<br />
            コア約3分で、8軸の地図の骨格と136タイプのあなたが確定します。
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/diagnosis" className="af-cta-btn" style={{ fontSize: '16px', padding: '16px 36px' }}>
              🧬 Me Scanを受ける（無料）
            </Link>
            <Link href="/lp/mirror" className="af-cta-btn" style={{ fontSize: '16px', padding: '16px 36px' }}>
              📸 Mirrorで現在地を測る
            </Link>
          </div>
          <p className="af-bottom-note">
            診断後、New Me Navi（変容ナビ）と New Me Map（変容マップ）が即座に生成されます<br />
            女性の方は <Link href="/belle" style={{ color: 'rgba(220,140,175,0.85)' }}>Fineme Belle</Link> へ
          </p>
        </div>

      </main>
    </>
  );
}
