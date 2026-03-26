import { notFound } from 'next/navigation';
import { getAllArticles, getArticle } from '@/lib/articles';
import { ArticleBlocks } from '@/app/_components/ArticleBlocks';
import Link from 'next/link';

export const revalidate = 3600;

export async function generateStaticParams() {
  // ビルド時にDBが使えない場合は空配列を返す（ISRで初回アクセス時に生成される）
  try {
    const articles = await getAllArticles();
    return articles.filter(a => a.slug).map(a => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return {
    title: `${article.title} | Fineme`,
    description: article.description || article.summary || '',
    openGraph: {
      title: article.title,
      description: article.description || article.summary || '',
      images: article.thumbnail ? [{ url: article.thumbnail, width: 1400, height: 788 }] : [],
      type: 'article',
      publishedTime: article.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description || article.summary || '',
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const hasBlocks = Array.isArray(article.blocks) && article.blocks.length > 0;
  const hasBody = typeof article.body === 'string' && article.body.trim().length > 0;

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // JSON-LD 構造化データ
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description || article.summary || '',
    image: article.thumbnail || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: { '@type': 'Organization', name: 'Fineme' },
    publisher: {
      '@type': 'Organization',
      name: 'Fineme',
      url: 'https://www.fineme.me',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        {/* ヒーロー画像 */}
        {article.thumbnail && (
          <div style={{
            height: 'clamp(240px, 40vw, 480px)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <img
              src={article.thumbnail}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 45%, rgba(10,15,30,0.65))',
            }} />
          </div>
        )}

        {/* 記事ヘッダー */}
        <div style={{
          maxWidth: '740px',
          margin: '0 auto',
          padding: 'clamp(28px, 5vw, 48px) 20px 0',
        }}>
          <Link href="/feature" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--color-muted)',
            textDecoration: 'none',
            marginBottom: '20px',
            fontFamily: 'var(--font-sans)',
          }}>
            ← 特集一覧へ戻る
          </Link>

          {article.category && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(201,168,76,0.12)',
              color: 'var(--color-gold)',
              fontSize: '10px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '99px',
              letterSpacing: '0.12em',
              marginBottom: '16px',
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
            }}>
              {article.category}
            </div>
          )}

          <h1 style={{
            fontSize: 'clamp(22px, 4.5vw, 34px)',
            fontWeight: 800,
            fontFamily: 'var(--font-serif)',
            lineHeight: 1.45,
            color: 'var(--color-fg)',
            marginBottom: '16px',
          }}>
            {article.title}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-sans)',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(201,168,76,0.15)',
          }}>
            <span>{article.reading_time || 5}分で読める</span>
            {publishedDate && <><span>·</span><span>{publishedDate}</span></>}
          </div>
        </div>

        {/* 記事本文 */}
        <div style={{
          maxWidth: '740px',
          margin: '0 auto',
          padding: 'clamp(28px, 5vw, 40px) 20px clamp(60px, 10vw, 100px)',
        }}>
          {hasBlocks && <ArticleBlocks blocks={article.blocks} />}
          {!hasBlocks && hasBody && (
            <>
              <style>{`
                .article-html-body .fb-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
                .article-html-body .fb-item{grid-column:var(--x,auto)/span var(--w,12)}
                .article-html-body .fb-card{background:rgba(255,255,255,.6);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:16px}
                .article-html-body .fb-block{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:12px;padding:16px}
                .article-html-body .fb-image{display:block;max-width:100%;height:auto;border-radius:12px}
                .article-html-body .fb-heading{font-weight:800;font-size:clamp(18px,3vw,24px);font-family:var(--font-serif)}
                .article-html-body .fb-text{font-size:15px;color:#2a2420;line-height:1.9}
                .article-html-body .fb-slider{position:relative}
                .article-html-body .fb-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}
                .article-html-body .fb-slide{flex:0 0 auto;width:min(260px,80vw);scroll-snap-align:start}
                .article-html-body h2{font-size:clamp(18px,3.5vw,22px);font-weight:800;font-family:var(--font-serif);padding-left:14px;border-left:4px solid var(--color-gold);margin:48px 0 16px;line-height:1.55}
                .article-html-body h3{font-size:17px;font-weight:700;margin:32px 0 10px}
                .article-html-body p{font-size:16px;line-height:2;margin-bottom:20px;color:#2a2420}
                .article-html-body blockquote{background:rgba(201,168,76,.06);border-left:4px solid var(--color-gold);border-radius:0 12px 12px 0;padding:16px 22px;margin:28px 0}
                .article-html-body img{max-width:100%;border-radius:12px}
                .article-html-body ul,.article-html-body ol{padding-left:24px;margin-bottom:20px}
                .article-html-body li{font-size:15px;line-height:1.85;color:#2a2420;margin-bottom:6px}
                .article-html-body a{color:var(--color-gold);text-decoration:underline}
              `}</style>
              <div
                className="article-html-body"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </>
          )}
          {!hasBlocks && !hasBody && (
            <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '40px 0' }}>
              コンテンツを準備中です。
            </p>
          )}
        </div>

        {/* 記事フッター：一覧へ戻るCTA */}
        <div style={{
          background: 'rgba(10,15,30,0.04)',
          borderTop: '1px solid rgba(201,168,76,0.12)',
          padding: 'clamp(32px, 6vw, 56px) 20px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '16px' }}>
            他の特集記事も読んでみませんか？
          </p>
          <Link href="/feature" style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.5)',
            borderRadius: '8px',
            color: 'var(--color-gold)',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
          }}>
            特集一覧へ
          </Link>
        </div>
      </main>
    </>
  );
}
