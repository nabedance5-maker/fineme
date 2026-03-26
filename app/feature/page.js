import Link from 'next/link';
import { getAllArticles } from '@/lib/articles';

export const metadata = {
  title: '特集記事 | Fineme',
  description: '外見磨きの方法、変容のヒント、Finemeの思想を伝える特集記事。',
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
