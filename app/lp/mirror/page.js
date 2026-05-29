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
        .m-hero-mirror-ring { animation: mirror-ring-spin 40s linear infinite; }
        .m-sample-card { background: rgba(10,15,30,0.6); border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden; }
        .m-sample-badge { font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; letter-spacing: .06em; white-space: nowrap; display: inline-block; margin-bottom: 10px; }
      ` }} />

      <main style={{ background: '#080d1a', minHeight: '100vh', color: 'rgba(240,236,228,0.88)', fontFamily: '-apple-system, sans-serif' }}>

        {/* ── ① ヒーロー ── */}
        <section style={{ background: 'linear-gradient(180deg, #04081a 0%, #070e1e 35%, #0a1228 65%, #060c1a 100%)', padding: 'clamp(72px,12vw,110px) 20px clamp(56px,10vw,88px)', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: 'min(88vh,700px)', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.1) 1px, transparent 1px)', backgroundSize: '44px 44px', opacity: 0.35, pointerEvents: 'none' }} />
          <div className="m-orb-main" style={{ position: 'absolute', bottom: '-20%', left: '50%', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.13) 0%, rgba(201,168,76,0.04) 45%, transparent 68%)', pointerEvents: 'none' }} />
          <div className="m-orb-l" style={{ position: 'absolute', top: '-5%', left: '-8%', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,100,220,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div className="m-orb-r" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,140,255,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div className="m-beam" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '1px', height: '100%', background: 'linear-gradient(to bottom, transparent 0%, rgba(201,168,76,0.25) 25%, rgba(201,168,76,0.12) 60%, transparent 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '540px', height: '540px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '820px', height: '820px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.03)', pointerEvents: 'none' }} />
          <div className="m-sweep" style={{ position: 'absolute', top: 0, width: '25%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 50%, transparent 100%)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />
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
          <div className="m-hero-mirror-ring" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(320px,55vw,560px)', height: 'clamp(320px,55vw,560px)', borderRadius: '50%', border: '1px dashed rgba(201,168,76,0.2)', pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'clamp(280px,48vw,480px)', height: 'clamp(280px,48vw,480px)', borderRadius: '50%', overflow: 'hidden', opacity: 0.18, pointerEvents: 'none', zIndex: 1 }}>
            <img src="https://images.unsplash.com/photo-Y6L_zTbSmbs?auto=format&fit=crop&w=700&q=80" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </div>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '660px', margin: '0 auto', width: '100%' }}>
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
              <span style={{ color: 'rgba(201,168,76,0.7)', fontWeight: 700 }}>写真はサーバーに保存されません。</span>
            </p>
            <div className="m-fade m-fade-d3">
              <Link href="/mirror" className="m-cta-btn" style={{
                display: 'inline-block', padding: 'clamp(15px,3vw,20px) clamp(36px,7vw,60px)',
                borderRadius: '12px', color: '#0a0f1e', fontWeight: 900,
                fontSize: 'clamp(16px,2.8vw,20px)', textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
              }}>
                Mirrorを試す →
              </Link>
              <p className="m-fade m-fade-d4" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', marginTop: '10px' }}>
                分析後、プレビューを確認してから購入できます
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(240,236,228,0.2)', marginTop: '4px' }}>
                Stripe決済（クレジットカード）・写真はAI分析後に削除
              </p>
            </div>
          </div>
        </section>

        {/* ── ② 問題提起（感情エスカレーション）── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div className="m-tag">こんな経験はありませんか？</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="m-pain-item">
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>🤔</span>
              <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.75)', lineHeight: 1.75 }}>
                外見を変えたいと思っている。でも何から始めればいいかわからない。
              </span>
            </div>
            <div className="m-pain-item" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>📸</span>
              <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.80)', lineHeight: 1.75 }}>
                写真に映る自分と、鏡の中の自分が別人に見える。でも<strong style={{ color: 'rgba(240,236,228,0.9)' }}>「どこが」問題なのか言語化できない。</strong>
              </span>
            </div>
            <div className="m-pain-item" style={{ borderColor: 'rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.04)' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>💸</span>
              <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.85)', lineHeight: 1.75 }}>
                ジム、眉毛サロン、美容院——全部試した。<strong style={{ color: 'rgba(240,236,228,0.95)' }}>変わった気がするけど、本当に効果があったのか確信が持てない。</strong>
              </span>
            </div>
            <div className="m-pain-item" style={{ borderColor: 'rgba(180,60,60,0.35)', background: 'rgba(180,60,60,0.04)' }}>
              <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>📅</span>
              <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.85)', lineHeight: 1.75 }}>
                「来年こそ本気で外見を変える」——そう思い続けて、<strong style={{ color: 'rgba(240,236,228,0.95)' }}>もう何年も経っている。</strong>
              </span>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '14px 18px', borderLeft: '3px solid rgba(201,168,76,0.5)', background: 'rgba(201,168,76,0.04)', borderRadius: '0 8px 8px 0' }}>
            <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.6)', lineHeight: 1.8, margin: 0 }}>
              このまま放置すると、外見の悩みは来年も再来年も残る。<br />
              <strong style={{ color: 'rgba(240,236,228,0.85)' }}>問題は「やる気」ではなく「順番」だ。</strong>
            </p>
          </div>
        </section>

        {/* ── 損失の可視化 ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(6,4,12,0.9)', borderTop: '1px solid rgba(232,228,220,0.06)', borderBottom: '1px solid rgba(232,228,220,0.06)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, fontFamily: 'Georgia, "Times New Roman", serif', color: '#fff', lineHeight: 1.5, marginBottom: '36px', textAlign: 'center' }}>
              今日も、チャンスが<br /><span style={{ color: 'rgba(240,236,228,0.3)' }}>通り過ぎている。</span>
            </p>
            {[
              ['📱', 'マッチングアプリで「なぜかマッチしない」と感じているとき、その原因は写真のどこかにある。どこかわからないまま毎月課金を続けることのコスト。'],
              ['👤', '初対面の3秒で、人はあなたへの印象を決めている。その3秒をコントロールする方法を知らないまま、今日も誰かと会っている。'],
              ['⏳', '「変わろう」と思った日から何年経ちましたか。情報はある。時間もある。なのに動けないのは、最初の一手が見えていないから。'],
            ].map(([emoji, text], i, arr) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '20px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(232,228,220,0.06)' : 'none' }}>
                <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px', opacity: 0.5 }}>{emoji}</span>
                <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.9, margin: 0 }}>{text}</p>
              </div>
            ))}
            <div style={{ marginTop: '36px', padding: 'clamp(20px,4vw,32px)', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(16px,3.5vw,21px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: 'rgba(240,236,228,0.88)', lineHeight: 1.75, margin: 0 }}>
                問題は「やる気」でも「お金」でもない。<br />
                <span style={{ color: '#c9a84c' }}>「どこを、どの順番で」</span>を<br />
                誰も教えてくれなかっただけだ。
              </p>
            </div>
          </div>
        </section>

        {/* ── ③ でおのストーリー（信頼先出し）── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="m-tag">このツールを作った人</div>
              <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
                元非モテ芋男から、<br />
                <span style={{ color: '#c9a84c' }}>現役モデルへ。</span>
              </h2>
            </div>

            {/* Before / After 写真 */}
            <div style={{ display: 'flex', gap: 'clamp(12px,3vw,24px)', width: '100%', maxWidth: '560px', marginBottom: '28px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', color: 'rgba(240,236,228,0.35)', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase' }}>Before</div>
                <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(232,228,220,0.12)', aspectRatio: '3/4', position: 'relative' }}>
                  <img
                    src="/images/deo/before.jpg"
                    alt="でお 変容前"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingTop: '22px' }}>
                <span style={{ fontSize: 'clamp(18px,4vw,28px)', color: '#c9a84c' }}>→</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', color: '#c9a84c', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase' }}>After</div>
                <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.35)', aspectRatio: '3/4', position: 'relative', boxShadow: '0 0 24px rgba(201,168,76,0.15)' }}>
                  <img
                    src="/images/deo/after-portrait.png"
                    alt="でお 変容後"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', maxWidth: '580px', width: '100%' }}>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 20px' }}>
                「かつて自分は、マッチングアプリで全くマッチしなかった。清潔感がないと言われても、具体的に何を直せばいいかわからなかった。」
              </p>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 20px' }}>
                「眉毛を整えるところから始めた。それだけで周囲の反応が変わった。次は肌。次はヘア。<strong style={{ color: 'rgba(240,236,228,0.9)' }}>順番があったんだ、と気づいた。</strong>」
              </p>
              <p style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.75)', lineHeight: 2.0, margin: '0 0 24px' }}>
                「変わりたいのに何から始めればいいかわからない男性のために、Fineme Mirrorを作った。1枚の写真が、あなたの最初の一手を教えてくれる。」
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '20px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.4)', flexShrink: 0 }}>
                  <img src="/images/deo/after-portrait.png" alt="でお" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(240,236,228,0.9)' }}>でお（渡邉 英雄）</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.4)', marginTop: '2px' }}>Fineme 代表 ／ 元非モテ芋男 → 現役モデル</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ④ Mirrorが見せるもの ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
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
        </section>

        {/* ── ⑤ 分析サンプル（社会的証明の代替）── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div className="m-tag">実際に出る分析結果</div>
              <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
                こんな分析が、<br />あなたに届きます。
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.4)', marginTop: '10px' }}>
                7軸すべてに「変容余地」と「具体的な改善ヒント」が出力されます
              </p>
            </div>
            {/* 無料パート */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: 'rgba(240,236,228,0.4)', textTransform: 'uppercase', marginBottom: '14px' }}>無料で届くもの</p>
              <img
                src="/images/lp/mirror-sample-1.png"
                alt="Mirror出力サンプル — First Impression"
                style={{ width: '100%', borderRadius: '14px', display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              />
              <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.55)', lineHeight: 1.8, marginTop: '14px' }}>
                写真をアップロードするとAIの「第一印象コメント」と、7軸それぞれの概要が表示されます。
              </p>
            </div>

            {/* 矢印 */}
            <div style={{ textAlign: 'center', margin: '4px 0', fontSize: '13px', fontWeight: 800, color: '#c9a84c', letterSpacing: '.05em' }}>
              ¥500 で、ここから先が開く
            </div>
            <div style={{ textAlign: 'center', fontSize: '22px', color: 'rgba(201,168,76,0.5)', marginBottom: '4px' }}>↓</div>

            {/* 有料パート */}
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '20px', padding: '20px', boxShadow: '0 0 32px rgba(201,168,76,0.08)' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '14px' }}>¥500 で追加される詳細分析</p>
              <img
                src="/images/lp/mirror-sample-2.png"
                alt="Mirror出力サンプル — 眉毛の詳細分析"
                style={{ width: '100%', borderRadius: '14px', display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginBottom: '16px' }}
              />
              {[
                '「なぜその評価か」根拠まで詳しく説明',
                '今すぐできる改善アクション＋費用感（¥0〜¥3,000など）',
                '7軸の中で「最初に変えるべき一手」がわかる',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: 'rgba(240,236,228,0.75)', lineHeight: 1.7 }}>
                  <span style={{ color: '#c9a84c', fontWeight: 900, flexShrink: 0 }}>→</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(240,236,228,0.2)', lineHeight: 1.7, marginTop: '16px' }}>
              ※ 実際の出力画面。分析内容はあなたの写真から生成されます。
            </p>
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/mirror" className="m-cta-btn" style={{ display: 'inline-block', padding: '15px 44px', borderRadius: '12px', color: '#0a0f1e', fontWeight: 900, fontSize: '16px', textDecoration: 'none', boxShadow: '0 6px 24px rgba(201,168,76,0.35)' }}>
                自分の分析を見る →
              </Link>
            </div>
          </div>
        </section>

        {/* ── ChatGPT との違い ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="m-tag">ChatGPTとはここが違う</div>
            <h2 style={{ fontSize: 'clamp(18px,4vw,28px)', fontWeight: 900, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
              印象コメントで終わるか、<br />
              <span style={{ color: '#c9a84c' }}>地図になるか。</span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* ChatGPT */}
            <div style={{ flex: '1 1 240px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(232,228,220,0.3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>汎用AI（ChatGPT等）</p>
              {[
                '「清潔感がありますね」で終わる',
                '何を、どの順番で変えるかは出ない',
                '7軸の優先度判定はできない',
                '分析は一回完結・その後に続かない',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: 'rgba(232,228,220,0.4)', lineHeight: 1.7 }}>
                  <span style={{ flexShrink: 0, color: 'rgba(200,80,80,0.6)', fontWeight: 800 }}>✗</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            {/* Fineme Mirror */}
            <div style={{ flex: '1 1 240px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '16px', padding: '20px', boxShadow: '0 0 28px rgba(201,168,76,0.07)' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: '#c9a84c', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '16px' }}>🪞 Fineme Mirror</p>
              {[
                '7軸ごとに「変容余地 高/中/低」を判定',
                '根拠＋費用感つきの具体的アクションが出る',
                '最初に変えるべき一手（Compass Action）が明示',
                '分析結果から New Me Map（外見改善ロードマップ）が生成される',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '13px', color: 'rgba(240,236,228,0.8)', lineHeight: 1.7 }}>
                  <span style={{ flexShrink: 0, color: '#c9a84c', fontWeight: 800 }}>✓</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Me Map 説明 */}
          <div style={{ marginTop: '20px', padding: '18px 20px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>🗺️</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 800, color: 'rgba(240,236,228,0.85)', marginBottom: '6px' }}>New Me Map とは？</p>
              <p style={{ fontSize: '13px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.8, margin: 0 }}>
                Mirror分析の結果をもとに、「何を、どの順番で、どこまでやるか」を可視化した外見改善のロードマップ。ChatGPTには生成できない、Fineme独自の仕組みです。
              </p>
            </div>
          </div>
        </section>

        {/* ── ⑥ 無料 vs 有料 ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="m-tag">無料と有料の違い</div>
            <h2 style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
              ¥500で、変容の「順番」と<br />「最初の一手」が手に入る。
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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
            <Link href="/mirror" className="m-cta-btn" style={{ display: 'inline-block', padding: '16px 52px', borderRadius: '12px', color: '#0a0f1e', fontWeight: 900, fontSize: '17px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
              Mirrorを試す →
            </Link>
          </div>
        </section>

        {/* ── ⑦ 価格の比較 ── */}
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
                ['ChatGPT（汎用AI）', '無料だが「順番」は出ない'],
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

        {/* ── ⑧ New Me Map ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="m-tag">Mirror が地図になる</div>
            <h2 style={{ fontSize: 'clamp(20px,4.5vw,30px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
              写真1枚が、あなた専用の<br />
              <span style={{ color: '#c9a84c' }}>「New Me Map」</span>を生成します。
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.9, marginTop: '14px' }}>
              Mirror の7軸分析データは、行動ロードマップ「New Me Map」に直結しています。<br />
              Me Scan（無料診断）を受けていなくても、Mirror だけで Map を生成できます。
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              ['📸', 'Mirrorで写真を分析', '7軸の変容余地が可視化される'],
              ['🗺️', 'New Me Mapが自動生成', '変容余地の高い軸から行動ステップが並ぶ'],
              ['✅', 'ステップを1つずつ完了する', '記録が積み重なり、変容の旅が進む'],
            ].map(([icon, title, desc], i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px 20px', background: i === 1 ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 1 ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`, borderRadius: '12px' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: i === 1 ? '#c9a84c' : 'rgba(240,236,228,0.85)', marginBottom: '2px' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.45)', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '14px 18px', fontSize: '12px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.8, marginBottom: '28px' }}>
            <strong style={{ color: '#c9a84c' }}>Me Scan + Mirror の組み合わせが最高精度。</strong><br />
            Me Scan（無料・3分）を受診済みの場合、診断データと Mirror データを統合して、さらに精度の高い Map が生成されます。
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/mirror" className="m-cta-btn" style={{ display: 'inline-block', padding: '14px 44px', borderRadius: '12px', color: '#0a0f1e', fontWeight: 900, fontSize: '16px', textDecoration: 'none', boxShadow: '0 6px 24px rgba(201,168,76,0.35)' }}>
              Mirrorを試す →
            </Link>
          </div>
        </section>

        {/* ── ⑨ BRIDGE: 変容は「線」で見る ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '660px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div className="m-tag">変容は「1回」では終わらない</div>
              <h2 style={{ fontSize: 'clamp(20px,4.5vw,30px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.4 }}>
                1枚で始まる。<br />
                <span style={{ color: '#c9a84c' }}>3ヶ月で、変わった証拠になる。</span>
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.9, marginTop: '14px' }}>
                毎日見ている自分の顔は、変化に気づけない。<br />
                「変わったよ」と言われても実感できない。記録がないから。
              </p>
            </div>
            <div style={{ position: 'relative', paddingLeft: '32px', marginBottom: '28px' }}>
              <div style={{ position: 'absolute', left: '9px', top: '10px', bottom: '10px', width: '2px', background: 'linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0.1))' }} />
              {[
                { label: '1ヶ月目', color: '#c9a84c', rgb: '201,168,76', title: '「どこから変えるか」がわかる', desc: '変容余地 高の軸が特定される。眉毛から始める決断が生まれる。' },
                { label: '2ヶ月目', color: '#7aadff', rgb: '100,160,255', title: '「変わったのか」がわかる', desc: '再スキャンで変容余地が下がっている。変化がデータになって現れる。' },
                { label: '3ヶ月目', color: '#50c88c', rgb: '80,200,140', title: '「次に何をすべきか」がわかる', desc: '次の高い軸が浮かぶ。変容の旅は続いていく。' },
              ].map((item, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: i < 2 ? '16px' : 0 }}>
                  <div style={{ position: 'absolute', left: '-27px', top: '18px', width: '12px', height: '12px', borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}80` }} />
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(${item.rgb},0.22)`, borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', color: item.color, marginBottom: '5px', textTransform: 'uppercase' }}>📸 {item.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(240,236,228,0.9)', marginBottom: '3px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.45)', lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '18px 22px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(240,236,228,0.8)', lineHeight: 1.8, margin: 0, fontFamily: 'Georgia, serif' }}>
                Mirrorは「今日の自分」を映す鏡。<br />
                <span style={{ color: '#c9a84c' }}>毎月使うと「変わっていく自分」のタイムラプスになる。</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── ⑩ サブスク ── */}
        <section style={{ padding: 'clamp(56px,10vw,80px) 20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="m-tag">毎月3回、変容を追跡する</div>
            <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', lineHeight: 1.35, marginBottom: '12px' }}>
              変わっていく自分を、<br />
              <span style={{ color: '#c9a84c' }}>¥780/月で記録し続ける。</span>
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.5)', lineHeight: 1.9 }}>
              1回¥500 × 3回 = ¥1,500分のMirrorが、月¥780で使える。<br />
              でも本当の価値は「続けること」にある。
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {[
              { icon: '🪞', title: '毎月3回、変わった自分をスキャンできる', sub: '¥500 × 3 = ¥1,500相当が月¥780に', featured: true },
              { icon: '🗺️', title: 'Mirror分析がNew Me Mapに直結する', sub: '変容余地データが行動ロードマップを常に最新化する', featured: false },
              { icon: '📚', title: '全履歴が無期限保存される', sub: '3ヶ月前の自分と今を、いつでも比べられる', featured: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '18px 20px', background: item.featured ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${item.featured ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`, borderRadius: '14px' }}>
                <span style={{ fontSize: '26px', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: item.featured ? '#c9a84c' : 'rgba(240,236,228,0.85)', marginBottom: '3px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.4)', lineHeight: 1.6 }}>{item.sub}</div>
                </div>
                {item.featured && <span style={{ fontSize: '10px', fontWeight: 800, color: '#c9a84c', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', flexShrink: 0, whiteSpace: 'nowrap' }}>主な特典</span>}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '28px 20px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(240,236,228,0.35)', marginBottom: '6px' }}>
              通常 <s>¥1,500</s>相当 →
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#c9a84c', lineHeight: 1.1 }}>¥780</div>
            <div style={{ fontSize: '14px', color: 'rgba(240,236,228,0.35)', marginTop: '4px' }}>/ 月（税込）・いつでも解約可能</div>
            <div style={{ fontSize: '12px', color: 'rgba(240,236,228,0.3)', marginTop: '10px' }}>1日あたり約¥26。スタバのコーヒー1杯以下。</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link href="/mirror" className="m-cta-btn" style={{ display: 'inline-block', padding: '15px 48px', borderRadius: '12px', color: '#0a0f1e', fontWeight: 900, fontSize: '16px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
              まずMirrorを1回試す →
            </Link>
            <p style={{ fontSize: '11px', color: 'rgba(240,236,228,0.25)', marginTop: '12px', lineHeight: 1.8 }}>
              体験してから判断できます。サブスク加入は{' '}
              <Link href="/mypage/subscription" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>マイページ</Link>
              {' '}から。
            </p>
          </div>
        </section>

        {/* ── ⑪ プライバシー ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', background: 'rgba(10,15,30,0.65)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
          </div>
        </section>

        {/* ── ⑫ FAQ ── */}
        <section style={{ padding: 'clamp(44px,8vw,68px) 20px', maxWidth: '700px', margin: '0 auto' }}>
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

        {/* ── ⑬ 最終CTA ── */}
        <section style={{ padding: 'clamp(56px,12vw,96px) 20px', textAlign: 'center', background: 'linear-gradient(160deg, #0a0f1e 0%, #070c1a 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '18px' }}>🪞</div>
            <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '16px', lineHeight: 1.35 }}>
              変われないと思っている<br />
              <span style={{ color: '#c9a84c' }}>あなたへ。</span>
            </h2>
            <p style={{ fontSize: 'clamp(13px,2.5vw,16px)', color: 'rgba(240,236,228,0.5)', marginBottom: '28px', lineHeight: 1.9 }}>
              「未開発の魅力」は、必ずある。<br />
              写真1枚が、その地図の始まりです。
            </p>
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', padding: '16px 20px', marginBottom: '28px', textAlign: 'left' }}>
              <p style={{ fontSize: '14px', color: 'rgba(240,236,228,0.65)', lineHeight: 1.9, margin: 0 }}>
                このページを閉じると、また「いつかやろう」に戻ります。<br />
                写真1枚・20〜40秒。それだけで<strong style={{ color: 'rgba(240,236,228,0.9)' }}>「何から変えればいいか」がわかる</strong>。<br />
                <span style={{ color: 'rgba(201,168,76,0.7)', fontSize: '13px' }}>無料部分だけ見て、続きは自分で判断できます。</span>
              </p>
            </div>
            <Link href="/mirror" className="m-cta-btn" style={{
              display: 'inline-block', padding: 'clamp(16px,3.5vw,22px) clamp(44px,8vw,72px)',
              borderRadius: '14px', color: '#0a0f1e', fontWeight: 900,
              fontSize: 'clamp(17px,3vw,22px)', textDecoration: 'none',
              boxShadow: '0 10px 40px rgba(201,168,76,0.45)',
            }}>
              Mirrorを試す →
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
