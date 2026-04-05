import Link from 'next/link';
import { getAllArticles } from '@/lib/articles';

export const metadata = {
  title: '特集記事 | Fineme',
  description: '外見磨きの方法、変容のヒント、Finemeの思想を伝える特集記事。清潔感・写真撮影・変容の思想など、恋愛に悩む男性のための実践コンテンツ。',
  alternates: { canonical: 'https://www.fineme.me/feature' },
  openGraph: {
    title: '特集記事 | Fineme',
    description: '清潔感・写真撮影・変容の思想。恋愛に悩む男性の外見変容を後押しするコンテンツ集。',
    url: 'https://www.fineme.me/feature',
    images: [{ url: 'https://www.fineme.me/assets/images/og-image.png', width: 1200, height: 630 }],
    locale: 'ja_JP',
    siteName: 'Fineme',
  },
  twitter: {
    card: 'summary_large_image',
    title: '特集記事 | Fineme',
    description: '清潔感・写真撮影・変容の思想。恋愛に悩む男性の外見変容を後押しするコンテンツ集。',
    images: ['https://www.fineme.me/assets/images/og-image.png'],
  },
};

export const revalidate = 3600; // 1時間キャッシュ

export default async function FeatureListPage({ searchParams }) {
  const q = (searchParams?.q || '').toLowerCase();
  const articles = (await getAllArticles()).filter(a =>
    !q || a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)
  );

  return (
    <main className="section">
      <div className="container stack">

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', paddingBottom: '12px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: 'var(--color-gold)',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontFamily: 'var(--font-sans)',
          }}>
            Fineme Journal
          </p>
          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 38px)',
            fontWeight: 800,
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-fg)',
            marginBottom: '12px',
          }}>
            特集記事
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-muted)', lineHeight: 1.8 }}>
            外見を変えることで、世界との関わり方が変わる。<br />
            変容の旅を歩む人たちへ、地図と羅針盤を届ける。
          </p>
        </div>

        {/* 検索フォーム */}
        <form method="get" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <input
            name="q"
            defaultValue={searchParams?.q || ''}
            placeholder="キーワードで検索..."
            style={{ maxWidth: '400px', width: '100%' }}
          />
        </form>

        <style dangerouslySetInnerHTML={{ __html: `.feature-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-gold) !important; }` }} />

        {/* 記事グリッド */}
        {articles.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '48px 0' }}>
            {q ? `「${q}」に一致する記事が見つかりませんでした。` : '公開中の記事はまだありません。'}
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '28px',
            marginTop: '8px',
          }}>
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* ── 診断誘導CTAバナー ── */}
        <div style={{
          marginTop: '64px',
          padding: 'clamp(32px, 6vw, 52px) clamp(20px, 5vw, 48px)',
          background: 'linear-gradient(135deg, rgba(10,15,30,0.9) 0%, rgba(6,12,26,0.95) 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '20px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>🧭</div>
            <h2 style={{ fontSize: 'clamp(17px, 2.8vw, 22px)', fontWeight: 800, color: '#f0ece4', marginBottom: '10px', lineHeight: 1.4, fontFamily: 'var(--font-serif)' }}>
              記事を読んだら、次は診断で「最初の一手」を見つけよう
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '20px', lineHeight: 1.8, fontFamily: 'var(--font-sans)' }}>
              体型・眉・ヘア・肌・服・歯・爪。7軸で分析して、今の自分に最も効く変容ルートを教えます。
            </p>
            <Link href="/diagnosis" style={{
              display: 'inline-block', padding: '13px 32px',
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              borderRadius: '8px', color: '#0a0f1e', fontWeight: 800,
              fontSize: '15px', textDecoration: 'none', fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 18px rgba(201,168,76,0.3)',
            }}>
              無料で診断する（3分）→
            </Link>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '10px', fontFamily: 'var(--font-sans)' }}>
              登録不要・無料・すぐに結果が出ます
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}

function ArticleCard({ article }) {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Link href={`/feature/${article.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="feature-card" style={{
        background: 'rgba(255,255,255,0.52)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        height: '100%',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {article.thumbnail && (
          <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
            <img
              src={article.thumbnail}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
            />
          </div>
        )}
        <div style={{ padding: '20px' }}>
          {article.category && (
            <span style={{
              display: 'inline-block',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-sans)',
              marginBottom: '10px',
            }}>
              {article.category}
            </span>
          )}
          <h2 style={{
            fontSize: '17px',
            fontWeight: 800,
            lineHeight: 1.55,
            color: 'var(--color-fg)',
            margin: '0 0 10px',
            fontFamily: 'var(--font-serif)',
          }}>
            {article.title}
          </h2>
          {(article.description || article.summary) && (
            <p style={{
              fontSize: '13px',
              color: 'var(--color-muted)',
              lineHeight: 1.75,
              margin: '0 0 14px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {article.description || article.summary}
            </p>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-muted)',
          }}>
            <span>{article.reading_time || 5}分で読める</span>
            {date && <><span>·</span><span>{date}</span></>}
          </div>
        </div>
      </article>
    </Link>
  );
}
