import Link from 'next/link';

export const metadata = {
  title: '写真1枚で「変われる余白」がわかる | Fineme Mirror',
  description: '写真をアップロードするだけ。AIが眉・肌・ヘア・姿勢・体型・服・爪の7軸を分析し、今のあなたが最も変わりやすい場所を可視化します。¥500。写真は保存されません。',
  robots: { index: false, follow: false },
};

export default function MirrorLpPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); } 50% { box-shadow: 0 0 0 14px rgba(201,168,76,0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes orb-breathe { 0%,100% { transform: translateX(-50%) scale(1); opacity: 1; } 50% { transform: translateX(-50%) scale(1.22); opacity: 1; } }
        @keyframes orb-drift-l { 0%,100% { transform: translate(0,0); } 45% { transform: translate(30px,-35px); } }
        @keyframes orb-drift-r { 0%,100% { transform: translate(0,0); } 40% { transform: translate(-25px,30px); } }
        @keyframes particle-rise { 0% { transform: translateY(0) scale(1); opacity: 0.9; } 70% { opacity: 0.4; } 100% { transform: translateY(-110px) scale(0.2); opacity: 0; } }
        @keyframes beam-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes hero-sweep { 0% { left: -50%; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } 100% { left: 160%; opacity: 0; } }
        @keyframes ring-spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        .m-orb-main { animation: orb-breathe 5.5s ease-in-out infinite; }
        .m-orb-l { animation: orb-drift-l 9s ease-in-out infinite; }
        .m-orb-r { animation: orb-drift-r 10s ease-in-out infinite 1.2s; }
        .m-particle { animation: particle-rise linear infinite; }
        .m-beam { animation: beam-pulse 4s ease-in-out infinite; }
        .m-sweep { animation: hero-sweep 8s ease-in-out infinite 0.8s; }
        .m-fade { animation: fadeUp 0.7s ease both; }
        .m-fade-d1 { animation-delay: 0.12s; }
        .m-fade-d2 { animation-delay: 0.28s; }
        .m-fade-d3 { animation-delay: 0.44s; }
        .m-fade-d4 { animation-delay: 0.6s; }
        .m-cta-btn {
          animation: pulse 2.4s ease-in-out infinite;
          background: linear-gradient(135deg, #c9a84c 0%, #e8c97a 50%, #c9a84c 100%);
          background-size: 200% auto;
          transition: background-position 0.4s ease;
        }
        .m-cta-btn:hover { background-position: right center; }
        .m-pain-item { display: flex; gap: 14px; align-items: flex-start; padding: 15px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(201,168,76,0.12); border-radius: 12px; }
        .m-axis-card { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2); border-radius: 12px; padding: 16px 12px; text-align: center; }
        .m-plan-card { border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 24px 20px; flex: 1; min-width: 0; }
        .m-plan-card.featured { border-color: rgba(201,168,76,0.6); background: rgba(201,168,76,0.06); }
        .m-faq-item { border-bottom: 1px solid rgba(201,168,76,0.1); padding: 18px 0; }
        .m-faq-q { font-size: 14px; font-weight: 800; color: rgba(240,236,228,0.9); margin-bottom: 8px; }
        .m-faq-a { font-size: 13px; color: rgba(240,236,228,0.55); line-height: 1.85; }
        .m-compare-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(201,168,76,0.08); font-size: 14px; }
        .m-compare-row:last-child { border-bottom: none; }
        .m-tag { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #c9a84c; border: 1px solid rgba(201,168,76,0.35); border-radius: 20px; padding: 3px 10px; margin-bottom: 14px; }
        @keyframes mirror-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .m-hero-mirror-ring { animation: mirror-ring-spin 28s linear infinite; }
        .m-hero-inner { display: flex; flex-direction: row; align-items: center; gap: clamp(24px,5vw,80px); flex-wrap: wrap; justify-content: center; max-width: 1100px; margin: 0 auto; width: 100%; position: relative; z-index: 2; }
        .m-hero-text { flex: 1 1 280px; max-width: 560px; }
        .m-hero-img-col { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 760px) { .m-hero-inner { flex-direction: column; } .m-hero-img-col { order: -1; } .m-hero-text { text-align: center !important; } }
      ` }} />

      <main style={{ background: '#080d1a', minHeight: '100vh', color: 'rgba(240,236,228,0.88)', fontFamily: '-apple-system, sans-serif' }}>

        {/* ── ヒーロー ── */}
        <section style={{ background: 'linear-gradient(180deg, #04081a 0%, #070e1e 35%, #0a1228 65%, #060c1a 100%)', padding: 'clamp(72px,12vw,110px) 20px clamp(56px,10vw,88px)', position: 'relative', overflow: 'hidden', minHeight: 'min(88vh,700px)', display: 'flex', alignItems: 'center' }}>

          {/* ドットグリッド背景 */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)', backgroundSize: '44px 44px', opacity: 0.35, pointerEvents: 'none' }} />

          {/* メイン中央ゴールドオーブ */}
          <div className="m-orb-main" style={{ position: 'absolute', bottom: '-20%', left: '50%', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.13) 0%, rgba(201,168,76,0.04) 45%, transparent 68%)', pointerEvents: 'none' }} />

          {/* 左上オーブ（ブルー系） */}
          <div className="m-orb-l" style={{ position: 'absolute', top: '-5%', left: '-8%', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,100,220,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />

          {/* 右下オーブ（ブルー系） */}
          <div className="m-orb-r" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,140,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

          {/* 縦ビーム */}
          <div className="m-beam" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1px', height: '100%', background: 'linear-gradient(to bottom, transparent 0%, rgba(201,168,76,0.25) 25%, rgba(201,168,76,0.12) 60%, transparent 100%)', pointerEvents: 'none' }} />

          {/* コンパスリング */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '540px', height: '540px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '820px', height: '820px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.03)', pointerEvents: 'none' }} />

          {/* スイープシマー */}
          <div className="m-sweep" style={{ position: 'absolute', top: 0, width: '25%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />

          {/* パーティクル */}
          {[
            [7,18,0,3.8],[14,52,1.0,4.3],[21,78,2.1,3.2],[33,28,0.4,4.8],
            [44,68,1.5,3.6],[53,85,0.1,4.1],[61,42,2.6,3.5],[70,22,0.7,4.5],
            [78,60,1.9,3.9],[86,38,0.3,4.2],[93,72,2.3,3.3],[4,90,1.3,4.7],
            [50,12,0.9,3.7],[30,92,2.8,4.0],[64,88,0.5,3.4],
          ].map(([left, bottom, delay, dur], i) => (
            <div key={i} className="m-particle" style={{
              position: 'absolute', left: `${left}%`, bottom: `${bottom}%`,
              width: i % 3 === 0 ? '4px' : '2px', height: i % 3 === 0 ? '4px' : '2px',
              borderRadius: '50%',
              background: i % 4 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(201,168,76,0.65)',
              animationDelay: `${delay}s`, animationDuration: `${dur}s`,
              pointerEvents: 'none',
            }} />
          ))}

          <div className="m-hero-inner">

            {/* テキスト（左） */}
            <div className="m-hero-text">
              <div className="m-fade" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px' }}>
                🪞 Fineme Mirror
              </div>
              <h1 className="m-fade m-fade-d1" style={{ fontSize: 'clamp(26px,6.5vw,48px)', fontWeight: 900, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3, color: '#fff', marginBottom: '22px' }}>
                非モテから憧れの男へ。<br />
                写真1枚で、あなたの<br />
                <span style={{ color: '#c9a84c' }}>「未開発の魅力」</span><br />
                が地図になる。
              </h1>
              <p className="m-fade m-fade-d2" style={{ fontSize: 'clamp(13px,2.5vw,16px)', color: 'rgba(240,236,228,0.55)', lineHeight: 1.85, marginBottom: '10px' }}>
                鏡は嘘をつく。でも、AIは本当の可能性を見せる。
              </p>
              <p className="m-fade m-fade-d2" style={{ fontSize: 'clamp(14px,2.8vw,17px)', color: 'rgba(240,236,228,0.65)', lineHeight: 2.0, marginBottom: '36px' }}>
                AIが7軸で分析。眉・肌・ヘア・姿勢・体型・服・爪。<br />
                今のあなたが「最も変わりやすい場所」を地図にします。<br />
                <span style={{ color: 'rgba(201,168,76,0.7)', fontWeight: 700 }}>¥500。写真はサーバーに保存されません。</span>
              </p>
              <div className="m-fade m-fade-d3">
                <Link href="/mirror" className="m-cta-btn" style={{
                  display: 'inline-block', padding: 'clamp(15px,3vw,20px) clamp(36px,7vw,60px)',
                  borderRadius: '12px', color: '#0a0f1e', fontWeight: 900,
                  fontSize: 'clamp(16px,2.8vw,20px)', textDecoration: 'none',
                  boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
                }}>
                  Mirrorを使う — ¥500 →
                </Link>
                <p className="m-fade m-fade-d4" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', marginTop: '14px' }}>
                  Stripe決済（クレジットカード）・写真はAI分析後に削除
                </p>
              </div>
            </div>

            {/* 鏡画像（右） */}
            <div className="m-hero-img-col">
              <div style={{ position: 'relative', width: 'clamp(220px,28vw,340px)', height: 'clamp(220px,28vw,340px)' }}>
                <div className="m-hero-mirror-ring" style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', border: '1px dashed rgba(201,168,76,0.45)' }} />
                <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.18)' }} />
                <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 900, color: '#c9a84c', letterSpacing: '0.15em' }}>N</div>
                <div style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 900, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em' }}>S</div>
                <div style={{ position: 'absolute', right: '-26px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 900, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em' }}>E</div>
                <div style={{ position: 'absolute', left: '-26px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 900, color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em' }}>W</div>
                <img
                  src="https://images.unsplash.com/photo-Y6L_zTbSmbs?auto=format&fit=crop&w=600&q=85"
                  alt="外見変容余地マップ — 航海の鏡"
                  style={{
                    width: '100%', height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    border: '2px solid rgba(201,168,76,0.65)',
                    boxShadow: '0 0 0 6px rgba(201,168,76,0.1), 0 0 40px rgba(201,168,76,0.5), 0 0 80px rgba(201,168,76,0.2)',
                    display: 'block',
                  }}
                />
              </div>
            </div>

          </div>
        </section>

        {/* ── 問題提起 ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div className="m-tag">こんな経験はありませんか？</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['🤔', '外見を変えたいけど、何から始めればいいか分からない。'],
              ['📸', '写真に映った自分を見て、「何かが違う」と感じるが原因が分からない。'],
              ['💸', 'ジム・眉毛サロン・美容院…全部にお金と時間をかける余裕はない。'],
              ['😐', '清潔感を上げたいのに、具体的に「どこ」を直せばいいのか判断できない。'],
            ].map(([icon, text], i) => (
              <div key={i} className="m-pain-item">
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.75)', lineHeight: 1.75 }}>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mirrorが見せるもの ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div className="m-tag">Mirrorが見せるもの</div>
            <h2 style={{ fontSize: 'clamp(20px,4.5vw,32px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '14px', lineHeight: 1.4 }}>
              スコアじゃない。<br />
              <span style={{ color: '#c9a84c' }}>可能性の見取り図</span>。
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.55)', lineHeight: 1.9, marginBottom: '36px' }}>
              Fineme Mirrorは「外見の点数」を出しません。<br />
              「今、変えるとどれだけ変わるか」という<em style={{ color: 'rgba(240,236,228,0.75)', fontStyle: 'normal' }}>変容余地（伸びしろ）</em>を7軸で可視化します。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '12px', marginBottom: '32px' }}>
              {[
                ['✂️', '眉毛', '印象の8割'],
                ['🌿', '肌', '清潔感の土台'],
                ['💈', 'ヘア', '第一印象'],
                ['🧍', '姿勢', '見た目の若さ'],
                ['💪', '体型', '全体シルエット'],
                ['👔', '服装', 'センスの可視化'],
                ['💅', '爪', '細部の誠実さ'],
              ].map(([icon, label, sub]) => (
                <div key={label} className="m-axis-card">
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(240,236,228,0.85)', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(240,236,228,0.35)', lineHeight: 1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.45)', lineHeight: 1.8 }}>
              各軸に「変容余地 高 / 中 / 低」が表示されます。<br />
              高い軸 = 今最も効率よく変われる場所。最初の一手はそこです。
            </p>
          </div>
        </section>

        {/* ── 無料 vs 有料 ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="m-tag">無料と有料の違い</div>
            <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
              ¥500で手に入るのは、<br />「最初の一手」まで。
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* 無料 */}
            <div className="m-plan-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>無料で確認できること</p>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'rgba(240,236,228,0.7)', marginBottom: '18px' }}>¥0</div>
              {['ファーストインプレッション（AIの第一印象コメント）', '7軸それぞれの概要サマリー（1〜2行）', '変容余地の判定（高・中・低）'].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '13px', color: 'rgba(240,236,228,0.6)', lineHeight: 1.6 }}>
                  <span style={{ color: 'rgba(240,236,228,0.3)', flexShrink: 0 }}>○</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {/* 有料 */}
            <div className="m-plan-card featured">
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '10px' }}>¥500で追加されるもの</p>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#c9a84c', marginBottom: '18px' }}>¥500</div>
              {[
                '各軸の詳細分析（なぜその評価なのか根拠まで）',
                '具体的な改善ヒント（今すぐできるアクション）',
                'Compass Action（7軸の中で「最初に変えるべき一手」）',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '13px', color: 'rgba(240,236,228,0.8)', lineHeight: 1.6 }}>
                  <span style={{ color: '#c9a84c', flexShrink: 0, fontWeight: 800 }}>✦</span>
                  <span>{item}</span>
                </div>
              ))}
              <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', fontSize: '12px', color: 'rgba(240,236,228,0.6)', lineHeight: 1.7 }}>
                <strong style={{ color: '#c9a84c' }}>Compass Action</strong> とは、あなたの7軸分析から導き出した「今最も変容効率が高い一手」。何から始めるかで、外見改善の速さが変わります。
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/mirror" className="m-cta-btn" style={{
              display: 'inline-block', padding: '16px 52px',
              borderRadius: '12px', color: '#0a0f1e', fontWeight: 900,
              fontSize: '17px', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
            }}>
              Mirrorを使う — ¥500 →
            </Link>
          </div>
        </section>

        {/* ── 価格の比較 ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '620px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="m-tag">¥500でできること</div>
              <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
                最初の一手を間違えない<br />ための、¥500の投資。
              </h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '16px', padding: '8px 24px' }}>
              {[
                ['スタイリスト個人相談', '¥5,000〜¥30,000'],
                ['骨格診断（プロ）', '¥10,000〜¥30,000'],
                ['パーソナルカラー診断', '¥8,000〜¥20,000'],
                ['Fineme Mirror', '¥500', true],
              ].map(([label, price, featured]) => (
                <div key={label} className="m-compare-row" style={featured ? { color: '#c9a84c' } : {}}>
                  <span style={{ fontWeight: featured ? 800 : 400, color: featured ? '#c9a84c' : 'rgba(240,236,228,0.55)' }}>
                    {featured ? '🪞 ' : ''}{label}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: featured ? '18px' : '14px' }}>{price}</span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(240,236,228,0.4)', marginTop: '16px', lineHeight: 1.8 }}>
              外見投資を始める前に、まず「どこから変えるか」を知る。<br />¥500はその地図代です。
            </p>
          </div>
        </section>

        {/* ── プライバシー ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="m-tag">プライバシーについて</div>
            <h2 style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
              写真はサーバーに<br />保存されません。
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              ['📤', 'アップロードした写真はHTTPS通信でAIに送信されます', 'ブラウザとAIサーバー間の通信は暗号化されています。'],
              ['🔍', 'AI（Claude Vision）が写真を分析します', '写真データはAnthropicのAPIを経由して分析されます。'],
              ['💾', '分析結果テキストのみが保存されます', '写真そのものはFinemeのデータベースには一切保存されません。'],
              ['🗑️', '写真データは分析完了後に削除されます', '分析が終わった瞬間から、写真データへのアクセスはなくなります。'],
            ].map(([icon, title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px' }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(240,236,228,0.85)', marginBottom: '4px' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.4)', lineHeight: 1.7 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div className="m-tag">よくある質問</div>
            </div>
            {[
              ['どんな写真を使えばいいですか？', '顔写真または全身写真を推奨します。自撮りでも構いません。明るい場所で撮影した正面・斜め45度の写真が最も精度が高くなります。'],
              ['決済はどうなりますか？', 'Stripe（クレジットカード）での一回払いです。定期課金や自動更新はありません。決済後、即座に詳細分析結果が表示されます。'],
              ['スマートフォンでも使えますか？', 'はい。PCでもスマートフォンでもご利用いただけます。写真はカメラロールから選択またはカメラで撮影して直接アップロードできます。'],
              ['分析にどのくらい時間がかかりますか？', '通常、写真のアップロードから分析結果表示まで20〜40秒程度です。通信環境によって多少前後します。'],
              ['過去の分析結果は保存されますか？', 'ログイン済みの場合、過去の分析セッションを復元できます。未ログインの場合はブラウザのローカルに1件のみ保存されます。'],
            ].map(([q, a], i) => (
              <div key={i} className="m-faq-item">
                <div className="m-faq-q">Q. {q}</div>
                <div className="m-faq-a">A. {a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── でおのストーリー ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="m-tag">このツールを作った人</div>
              <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
                元非モテ芋男から、<br />
                <span style={{ color: '#c9a84c' }}>現役モデルへ。</span>
              </h2>
            </div>
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', maxWidth: '580px', width: '100%' }}>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 20px' }}>
                「かつて自分は、マッチングアプリで全くマッチしなかった。清潔感がないと言われても、具体的に何を直せばいいかわからなかった。」
              </p>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 20px' }}>
                「眉毛を整えるところから始めた。それだけで周囲の反応が変わった。次は肌。次はヘア。順番があったんだ、と気づいた。」
              </p>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 24px' }}>
                「変わりたいのに何から始めればいいかわからない男性のために、Fineme Mirrorを作った。1枚の写真が、あなたの最初の一手を教えてくれる。」
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '20px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(201,168,76,0.3),rgba(201,168,76,0.1))', border: '1px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🧭</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(240,236,228,0.9)' }}>でお（渡邉 英雄）</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.4)', marginTop: '2px' }}>Fineme 代表 ／ 元非モテ芋男 → 現役モデル</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 最終CTA ── */}
        <section style={{ padding: 'clamp(56px,12vw,96px) 20px', textAlign: 'center', background: 'linear-gradient(160deg, #0a0f1e 0%, #070c1a 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '18px' }}>🪞</div>
            <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '16px', lineHeight: 1.35 }}>
              変われないと思っている<br />
              <span style={{ color: '#c9a84c' }}>あなたへ。</span>
            </h2>
            <p style={{ fontSize: 'clamp(13px,2.5vw,16px)', color: 'rgba(240,236,228,0.5)', marginBottom: '36px', lineHeight: 1.9 }}>
              「未開発の魅力」は、必ずある。<br />
              写真1枚が、その地図の始まりです。
            </p>
            <Link href="/mirror" className="m-cta-btn" style={{
              display: 'inline-block', padding: 'clamp(16px,3.5vw,22px) clamp(44px,8vw,72px)',
              borderRadius: '14px', color: '#0a0f1e', fontWeight: 900,
              fontSize: 'clamp(17px,3vw,22px)', textDecoration: 'none',
              boxShadow: '0 10px 40px rgba(201,168,76,0.45)',
            }}>
              Mirrorを使う — ¥500 →
            </Link>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '16px' }}>
              Stripe決済 ・ 写真は分析後削除 ・ いつでもキャンセル不要
            </p>
          </div>
        </section>

        {/* ── フッター ── */}
        <footer style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.08)', background: 'rgba(8,13,26,0.95)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Link href="/privacy" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', textDecoration: 'none' }}>プライバシーポリシー</Link>
            <Link href="/terms" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', textDecoration: 'none' }}>利用規約</Link>
            <Link href="/tokusho" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', textDecoration: 'none' }}>特定商取引法</Link>
            <Link href="/mirror" style={{ fontSize: '12px', color: 'rgba(201,168,76,0.4)', textDecoration: 'none' }}>Mirrorを使う →</Link>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(240,236,228,0.15)' }}>© 2024 Fineme All rights reserved.</p>
        </footer>

      </main>
    </>
  );
}
