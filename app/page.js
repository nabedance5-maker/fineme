import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <main>

        {/* ===== HERO ===== */}
        <section className="hp-hero">
          <div className="container hp-hero__inner">
            <span className="hp-hero__kicker">for men · 無料診断</span>
            <h1 className="hp-hero__title">
              変わりたいなら、<br />まず診断から。
            </h1>
            <p className="hp-hero__sub">
              恋愛がうまくいかない理由は人それぞれ。<br />
              あなたに必要な外見の変化を、3分の診断で明らかにします。
            </p>
            <div className="hp-hero__actions">
              <Link href="/diagnosis" className="hp-btn-primary">
                無料で診断する（約3分）
              </Link>
              <Link href="/search" className="hp-btn-ghost">
                サービスを検索する →
              </Link>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="section hp-steps-section">
          <div className="container">
            <p className="hp-section-label">How it works</p>
            <h2 className="hp-section-title">診断から始まる、変容の旅</h2>
            <div className="hp-steps">
              <div className="hp-step">
                <div className="hp-step__num">01</div>
                <h3 className="hp-step__title">診断</h3>
                <p className="hp-step__desc">チャット形式で約3分。いまの状況と目指したいイメージを整理します。</p>
              </div>
              <div className="hp-step__arrow">→</div>
              <div className="hp-step">
                <div className="hp-step__num">02</div>
                <h3 className="hp-step__title">提案</h3>
                <p className="hp-step__desc">診断結果をもとに、あなたに合うサービスとプロを提示します。</p>
              </div>
              <div className="hp-step__arrow">→</div>
              <div className="hp-step hp-step--accent">
                <div className="hp-step__num">03</div>
                <h3 className="hp-step__title">予約</h3>
                <p className="hp-step__desc">「最安値」ではなく「相性」で選ぶ。ミスマッチのない予約へ。</p>
              </div>
              <div className="hp-step__arrow">→</div>
              <div className="hp-step">
                <div className="hp-step__num">04</div>
                <h3 className="hp-step__title">次の一歩</h3>
                <p className="hp-step__desc">変化が始まったら、周辺の別サービスもご提案。変容が続きます。</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CATEGORIES ===== */}
        <section className="section hp-cat-section">
          <div className="container">
            <p className="hp-section-label">Categories</p>
            <h2 className="hp-section-title">対応ジャンル</h2>
            <div className="hp-cats">
              {[
                { icon: '🏋️', label: 'パーソナルジム', q: 'gym' },
                { icon: '✂️', label: '眉毛サロン',     q: 'eyebrow' },
                { icon: '🪞', label: '外見コンサル',   q: 'consulting' },
                { icon: '💇', label: 'ヘアサロン',     q: 'hair' },
                { icon: '📸', label: 'プロフ写真',     q: 'photo' },
                { icon: '👔', label: 'ファッション',   q: 'fashion' },
              ].map(({ icon, label, q }) => (
                <Link key={q} href={`/search?category=${q}`} className="hp-cat">
                  <span className="hp-cat__icon">{icon}</span>
                  <span className="hp-cat__label">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="section">
          <div className="container stack">
            <div className="cluster" style={{ justifyContent: 'space-between' }}>
              <h2 className="section-title" style={{ margin: 0 }}>特集</h2>
              <Link className="btn btn-ghost" href="/articles">特集一覧</Link>
            </div>
            <div className="features-grid">
              <a className="feature-card" href="/articles">
                <img className="feature-media" src="https://images.unsplash.com/photo-1544717305-996b815c338c?q=80&w=1400&auto=format&fit=crop" alt="モテる外見特集" />
                <div className="feature-body">
                  <h3 className="feature-title">モテる外見特集</h3>
                  <p className="feature-meta">恋愛の"第一印象"に効く、プロ実践メソッドを編集部が厳選。</p>
                </div>
              </a>
              <a className="feature-card" href="/search?category=makeup&region=tokyo">
                <img className="feature-media" src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1400&auto=format&fit=crop" alt="デート前に整える" />
                <div className="feature-body">
                  <h3 className="feature-title">デート前に整える</h3>
                  <p className="feature-meta">肌・髪・眉・写真。前日までにやるべき"4タスク"。</p>
                </div>
              </a>
              <a className="feature-card" href="/search">
                <img className="feature-media" src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop" alt="清潔感アップ" />
                <div className="feature-body">
                  <h3 className="feature-title">清潔感アップ</h3>
                  <p className="feature-meta">スキンケアとヘアの基本を押さえて、"好印象"を最短で。</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ===== BOTTOM CTA ===== */}
        <section className="hp-bottom-cta">
          <div className="container hp-bottom-cta__inner">
            <p className="hp-bottom-cta__sub">まず3分、試してみてください。</p>
            <h2 className="hp-bottom-cta__title">あなたの「最初の一歩」を、一緒に見つけましょう。</h2>
            <Link href="/diagnosis" className="hp-btn-primary hp-btn-primary--lg">
              無料で診断を始める
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}
