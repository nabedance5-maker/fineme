import Link from 'next/link';

export const metadata = {
  title: '恋愛に悩む男性の外見を変える診断 | Fineme',
  description: '体型・眉・ヘア・肌・服・脱毛・歯・爪。8軸の診断で、今のあなたに最も効く「最初の一手」がわかります。無料・約3分・登録不要。',
  robots: { index: false, follow: false }, // 広告LP はインデックス除外
};

export default function LpPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); } 50% { box-shadow: 0 0 0 12px rgba(201,168,76,0); } }
        .lp-cta-btn { animation: pulse 2.4s ease-in-out infinite; }
        .lp-fade { animation: fadeUp 0.6s ease both; }
        .lp-fade-d1 { animation-delay: 0.1s; }
        .lp-fade-d2 { animation-delay: 0.25s; }
        .lp-fade-d3 { animation-delay: 0.4s; }
        .lp-fade-d4 { animation-delay: 0.55s; }
        .step-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid rgba(201,168,76,0.1); }
        .step-item:last-child { border-bottom: none; }
        .step-num { width: 28px; height: 28px; border-radius: 50%; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #c9a84c; flex-shrink: 0; margin-top: 2px; }
        .voice-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(201,168,76,0.15); border-radius: 14px; padding: 18px; }
        .voice-text { font-size: 14px; color: rgba(240,236,228,0.85); line-height: 1.9; }
        .voice-meta { font-size: 11px; color: rgba(240,236,228,0.4); margin-top: 8px; }
        .axis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
        .axis-item { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2); border-radius: 10px; padding: 12px 8px; text-align: center; }
        .axis-icon { font-size: 22px; margin-bottom: 6px; }
        .axis-label { font-size: 11px; font-weight: 700; color: rgba(240,236,228,0.75); }
        .faq-item { border-bottom: 1px solid rgba(201,168,76,0.1); padding: 16px 0; }
        .faq-q { font-size: 14px; font-weight: 700; color: rgba(240,236,228,0.88); margin-bottom: 8px; }
        .faq-a { font-size: 13px; color: rgba(240,236,228,0.55); line-height: 1.8; }
      ` }} />

      <main style={{ background: '#080d1a', minHeight: '100vh', color: 'rgba(240,236,228,0.88)', fontFamily: '-apple-system, sans-serif' }}>

        {/* ── ヒーロー ── */}
        <section style={{ background: 'linear-gradient(160deg, #080d1a 0%, #0d1528 60%, #080d1a 100%)', padding: 'clamp(48px,10vw,80px) 20px clamp(40px,8vw,64px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
            <div className="lp-fade" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.16em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>
              Fineme — 外見変容診断
            </div>
            <h1 className="lp-fade lp-fade-d1" style={{ fontSize: 'clamp(24px,6vw,42px)', fontWeight: 800, fontFamily: 'Georgia, serif', lineHeight: 1.35, color: '#fff', marginBottom: '20px' }}>
              「何から変えればいい？」<br />
              <span style={{ color: '#c9a84c' }}>8軸で分析</span>して、<br />
              最初の一手を教えます。
            </h1>
            <p className="lp-fade lp-fade-d2" style={{ fontSize: 'clamp(14px,2.5vw,16px)', color: 'rgba(240,236,228,0.65)', lineHeight: 1.9, marginBottom: '32px' }}>
              体型・眉・ヘア・肌・服・歯・爪。<br />
              今のあなたに最も効く変容ルートを、3分の診断で見つけます。
            </p>
            <div className="lp-fade lp-fade-d3">
              <Link href="/diagnosis" className="lp-cta-btn" style={{
                display: 'inline-block', padding: 'clamp(14px,3vw,18px) clamp(32px,6vw,52px)',
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                borderRadius: '10px', color: '#0a0f1e', fontWeight: 800,
                fontSize: 'clamp(15px,2.5vw,18px)', textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
              }}>
                無料で診断する（3分）→
              </Link>
              <p style={{ fontSize: '12px', color: 'rgba(240,236,228,0.35)', marginTop: '12px' }}>
                登録不要・無料・すぐに結果が出ます
              </p>
            </div>
          </div>
        </section>

        {/* ── 共感セクション ── */}
        <section style={{ padding: 'clamp(40px,8vw,64px) 20px', maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>こんな悩みはありませんか？</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              '「外見を変えたい」と思っているけど、何から始めるか分からない',
              'マッチングアプリで全然マッチしない。自分の外見に自信がない',
              'ジム・眉毛サロン・美容院…どれが今の自分に必要なのか判断できない',
              '「清潔感を上げろ」と言われるが、具体的に何をすればいいかわからない',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>😔</span>
                <span style={{ fontSize: '14px', color: 'rgba(240,236,228,0.75)', lineHeight: 1.7 }}>{t}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 解決策 ── */}
        <section style={{ padding: 'clamp(40px,8vw,64px) 20px', background: 'rgba(10,15,30,0.6)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>解決策</p>
            <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '16px', lineHeight: 1.4 }}>
              「最初の一手」を間違えなければ、<br />外見は必ず変わる。
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(240,236,228,0.65)', lineHeight: 1.9, marginBottom: '32px' }}>
              外見改善に失敗する男性の多くは、「順番」を間違えています。<br />
              Fineme の診断は、8軸の分析で「今の自分に最も効く一手」を特定します。
            </p>
            <div className="axis-grid">
              {[['💪','体型'],['✂️','眉毛'],['💈','ヘア'],['🌿','肌'],['👔','服'],['🪒','脱毛'],['🦷','歯'],['💅','爪']].map(([icon, label]) => (
                <div className="axis-item" key={label}>
                  <div className="axis-icon">{icon}</div>
                  <div className="axis-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 使い方ステップ ── */}
        <section style={{ padding: 'clamp(40px,8vw,64px) 20px', maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center' }}>3ステップで始まる変容の旅</p>
          {[
            ['🔍', 'Me Scan を受ける（3分）', '8軸の設問に答えると、今の自分の「変容地図」が生成されます。無料・登録不要。'],
            ['🧭', 'Compass（最初の一手）を確認する', '今向くべき軸と、最初に取り組むべきサービスが提示されます。'],
            ['🏆', '専門家に繋がる', '診断結果と相性の高いパーソナルジム・眉毛サロン・美容院などが表示されます。'],
          ].map(([icon, title, desc], i) => (
            <div className="step-item" key={i}>
              <div className="step-num">{i + 1}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{icon} {title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(240,236,228,0.55)', lineHeight: 1.7 }}>{desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── 体験談 ── */}
        <section style={{ padding: 'clamp(40px,8vw,64px) 20px', background: 'rgba(10,15,30,0.5)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center' }}>変容の声</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {[
                ['「眉毛から始めるべきと診断されて、半信半疑でサロンへ。1ヶ月で「清潔感が増した」と言われるようになりました。」', '20代 会社員'],
                ['「何から変えていいか全くわからなかったけど、診断で優先順位が明確になった。ようやく動き出せた。」', '30代 フリーランス'],
                ['「アプリの写真を撮り直す前に、まず外見を整えるべきだと気づかせてくれた。診断は必須です。」', '20代 大学院生'],
              ].map(([text, meta], i) => (
                <div className="voice-card" key={i}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>⭐⭐⭐⭐⭐</div>
                  <div className="voice-text">「{text}」</div>
                  <div className="voice-meta">— {meta}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: 'clamp(40px,8vw,64px) 20px', maxWidth: '680px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '20px', textAlign: 'center' }}>よくある質問</p>
          {[
            ['本当に無料ですか？', '診断・地図生成・ロードマップ表示はすべて無料です。専門家への予約時のみ料金が発生します。'],
            ['登録は必要ですか？', '診断は登録不要で受けられます。結果を保存・同期したい場合は無料アカウントの作成をおすすめします。'],
            ['どんな専門家が掲載されていますか？', 'パーソナルジム・眉毛サロン・美容院・骨格診断士・プロ写真撮影など、男性の外見変容に特化した専門家が掲載されています。'],
            ['診断結果は正確ですか？', '設問への回答と、診断後にお知らせいただく情報に基づいてパーソナライズされます。あなたの状況に合わせて定期的に更新できます。'],
          ].map(([q, a], i) => (
            <div className="faq-item" key={i}>
              <div className="faq-q">Q. {q}</div>
              <div className="faq-a">A. {a}</div>
            </div>
          ))}
        </section>

        {/* ── 最終CTA ── */}
        <section style={{ padding: 'clamp(48px,10vw,80px) 20px', textAlign: 'center', background: 'linear-gradient(160deg, #0a0f1e 0%, #060c1a 100%)' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ fontSize: '32px', marginBottom: '14px' }}>🧭</div>
            <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 800, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '14px', lineHeight: 1.4 }}>
              変わりたいと思った今が、<br />最高のスタートです。
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: 1.8 }}>
              3分の診断で、今の自分に最も効く変容ルートを見つけてください。
            </p>
            <Link href="/diagnosis" className="lp-cta-btn" style={{
              display: 'inline-block', padding: '16px 48px',
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              borderRadius: '10px', color: '#0a0f1e', fontWeight: 800,
              fontSize: '16px', textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
            }}>
              無料で診断する（3分）→
            </Link>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '12px' }}>
              登録不要・無料・すぐに結果が出ます
            </p>
          </div>
        </section>

        {/* ── フッター（最小限） ── */}
        <footer style={{ padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(201,168,76,0.1)', background: 'rgba(10,15,30,0.9)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Link href="/privacy" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.35)', textDecoration: 'none' }}>プライバシーポリシー</Link>
            <Link href="/terms" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.35)', textDecoration: 'none' }}>利用規約</Link>
            <Link href="/tokusho" style={{ fontSize: '12px', color: 'rgba(240,236,228,0.35)', textDecoration: 'none' }}>特定商取引法</Link>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(240,236,228,0.2)' }}>© 2024 Fineme All rights reserved.</p>
        </footer>

      </main>
    </>
  );
}
