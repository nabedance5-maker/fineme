import Link from 'next/link';
import dynamic from 'next/dynamic';

const SearchBar = dynamic(() => import('./_components/SearchBar'), { ssr: false });

export default function HomePage() {
  return (
    <>
      <main>
        <section className="hero hero--visual">
          <div className="container stack">
            <span className="hero-kicker">for men</span>
            <h1 className="hero-title">恋愛を変える、外見磨きの入口。</h1>
            <p className="hero-sub">清潔感・肌・髪・服装・写真。いま必要な一歩を、最適なプロと一緒に。東京/大阪を中心に、外見磨きのサービスを検索・比較・予約。</p>
            <SearchBar />
          </div>
        </section>

        <section className="section">
          <div className="container stack">
            <div className="cluster" style={{justifyContent:'space-between'}}>
              <h2 className="section-title" style={{margin:0}}>特集</h2>
              <Link className="btn btn-ghost" href="/articles">特集一覧</Link>
            </div>

            <div className="features-grid">
              <a className="feature-card" href="/articles">
                <img className="feature-media" src="https://images.unsplash.com/photo-1544717305-996b815c338c?q=80&w=1400&auto=format&fit=crop" alt="モテる外見特集" />
                <div className="feature-body">
                  <h3 className="feature-title">モテる外見特集</h3>
                  <p className="feature-meta">恋愛の“第一印象”に効く、プロ実践メソッドを編集部が厳選。</p>
                </div>
              </a>
              <a className="feature-card" href="/search?q=%E3%83%A1%E3%83%B3%E3%82%BA%E3%83%A1%E3%82%A4%E3%82%AF&category=makeup&region=tokyo">
                <img className="feature-media" src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1400&auto=format&fit=crop" alt="デート前に整える" />
                <div className="feature-body">
                  <h3 className="feature-title">デート前に整える</h3>
                  <p className="feature-meta">肌・髪・眉・写真。前日までにやるべき“4タスク”。</p>
                </div>
              </a>
              <a className="feature-card" href="/search?q=%E6%B8%85%E6%BD%94%E6%84%9F">
                <img className="feature-media" src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop" alt="清潔感アップ" />
                <div className="feature-body">
                  <h3 className="feature-title">清潔感アップ</h3>
                  <p className="feature-meta">スキンケアとヘアの基本を押さえて、“好印象”を最短で。</p>
                </div>
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
