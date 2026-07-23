import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllBelleArticles, getBelleArticle, getBelleArticleFromDB, getAllBelleArticlesFromDB } from '@/lib/belle-articles';
import { ArticleBlocks } from '@/app/_components/ArticleBlocks';

export const revalidate = 3600;

const CATEGORY_LABELS = {
  eyebrow: '眉', skincare: 'スキンケア', hair: 'ヘアスタイル', fashion: 'ファッション',
  nail: 'ネイル', hairremoval: '脱毛', teeth: '歯・笑顔', body: 'ボディ',
  philosophy: '考え方', guide: 'ガイド',
  '眉毛': '眉', 'スキンケア': 'スキンケア', 'ヘア': 'ヘアスタイル', 'ファッション': 'ファッション',
  'ネイル': 'ネイル', '脱毛': '脱毛', '歯・笑顔': '歯・笑顔', '歯': '歯・笑顔',
  'ボディ': 'ボディ', '考え方': '考え方', '垢抜け': '垢抜け',
};

export async function generateStaticParams() {
  const staticList = getAllBelleArticles();
  const dbList = await getAllBelleArticlesFromDB().catch(() => []);
  const slugs = [...new Set([...staticList.map(a => a.slug), ...dbList.map(a => a.slug)])];
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }) {
  // Supabase優先 → 静的fallback
  const dbArticle = await getBelleArticleFromDB(params.slug);
  const article = dbArticle || getBelleArticle(params.slug);
  if (!article) return {};
  return {
    title: `${article.title} | Belle Journal | Fineme Belle`,
    description: article.description,
    keywords: article.keywords,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: dbArticle ? dbArticle.published_at : article.publishedAt,
      images: dbArticle?.thumbnail ? [{ url: dbArticle.thumbnail, width: 1200, height: 630 }] : [],
    },
  };
}

export default async function BelleArticlePage({ params }) {
  // Supabase優先（cronが生成したHTML記事）→ 静的JSON fallback（既存blocksベース記事）
  const dbArticle = await getBelleArticleFromDB(params.slug);
  const staticArticle = dbArticle ? null : getBelleArticle(params.slug);

  if (!dbArticle && !staticArticle) notFound();

  // 関連記事（同一トラック）
  const allDb = dbArticle ? await getAllBelleArticlesFromDB().catch(() => []) : [];
  const allStatic = getAllBelleArticles();
  const relatedDb = allDb.filter(a => a.slug !== params.slug).slice(0, 3);
  const relatedStatic = allStatic.filter(a => a.slug !== params.slug).slice(0, Math.max(0, 3 - relatedDb.length));
  const related = [
    ...relatedDb.map(a => ({ slug: a.slug, title: a.title, category: a.category, readingTime: a.reading_time, source: 'db' })),
    ...relatedStatic.map(a => ({ slug: a.slug, title: a.title, category: a.category, readingTime: a.readingTime, source: 'static' })),
  ];

  const title = dbArticle?.title ?? staticArticle.title;
  const description = dbArticle?.description ?? staticArticle.description;
  const category = dbArticle?.category ?? staticArticle.category;
  const publishedAt = dbArticle?.published_at?.slice(0, 10) ?? staticArticle.publishedAt;
  const readingTime = dbArticle?.reading_time ?? staticArticle.readingTime;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    author: { '@type': 'Organization', name: 'Fineme Belle' },
    publisher: { '@type': 'Organization', name: 'Fineme Belle', url: 'https://www.fineme.me/belle' },
    keywords: staticArticle?.keywords?.join(', '),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main style={{ minHeight: '100vh', paddingBottom: 80 }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #c8648c 0%, #7a3060 60%, #3a1030 100%)',
          padding: 'clamp(40px,8vw,80px) 24px clamp(36px,6vw,60px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,200,220,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: 150, height: 150, background: 'radial-gradient(circle, rgba(255,180,200,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Link href="/belle/journal" style={{ fontSize: 12, color: 'rgba(255,220,230,0.6)', textDecoration: 'none' }}>
                Belle Journal
              </Link>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.3)' }}>›</span>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.6)' }}>
                {CATEGORY_LABELS[category] ?? category}
              </span>
            </div>

            <h1 style={{
              fontFamily: "'Noto Serif JP', Georgia, serif",
              fontSize: 'clamp(22px,4.5vw,36px)',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 20px',
              lineHeight: 1.45,
              maxWidth: 640,
              marginLeft: 'auto',
              marginRight: 'auto',
              textShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}>
              {title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {publishedAt && (
                <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.65)' }}>{publishedAt}</span>
              )}
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.4)' }}>·</span>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.65)' }}>約{readingTime}分</span>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px 0' }}>
          {dbArticle ? (
            // Supabase記事: HTML レンダリング
            <div
              className="belle-article-html"
              dangerouslySetInnerHTML={{ __html: dbArticle.body }}
            />
          ) : (
            // 静的JSON記事: ArticleBlocks レンダリング
            <ArticleBlocks blocks={staticArticle.blocks} />
          )}
        </div>

        {/* HTML記事用スタイル */}
        {dbArticle && (
          <style>{`
            .belle-article-html { color: rgba(240,216,224,0.85); font-size: 16px; line-height: 2; }
            .belle-article-html h1 { font-family: 'Noto Serif JP',Georgia,serif; font-size: clamp(22px,4vw,28px); font-weight: 700; color: rgba(240,216,224,0.95); margin: 56px 0 20px; border-left: 4px solid #c8648c; padding-left: 16px; }
            .belle-article-html h2 { font-family: 'Noto Serif JP',Georgia,serif; font-size: clamp(18px,3.5vw,22px); font-weight: 700; color: rgba(240,216,224,0.95); margin: 52px 0 16px; border-left: 4px solid #c8648c; padding-left: 14px; }
            .belle-article-html h3 { font-size: 16px; font-weight: 700; color: rgba(240,216,224,0.88); margin: 32px 0 12px; display: flex; align-items: center; gap: 8px; }
            .belle-article-html h3::before { content: '▸'; color: rgba(200,100,140,0.6); font-size: 13px; flex-shrink: 0; }
            .belle-article-html p { margin: 0 0 20px; }
            .belle-article-html ul { padding-left: 20px; margin: 16px 0; }
            .belle-article-html li { margin: 6px 0; }
            .belle-article-html strong { color: rgba(240,216,224,0.96); font-weight: 700; }
            .belle-article-html figure { margin: 28px 0; }
            .belle-article-html figure img { width: 100%; border-radius: 12px; display: block; box-shadow: 0 8px 32px rgba(60,0,30,0.2); }
            .belle-article-html div[style*="border-left"] { border-left-color: #c8648c !important; background: rgba(200,100,140,0.06) !important; }
          `}</style>
        )}

        {/* Bottom Rose CTA */}
        <div style={{ maxWidth: 720, margin: '16px auto 0', padding: '0 20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(200,100,140,0.12) 0%, rgba(120,40,80,0.18) 100%)',
            border: '1px solid rgba(200,100,140,0.3)',
            borderRadius: 20,
            padding: 'clamp(28px,5vw,44px) clamp(24px,4vw,40px)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(200,100,140,0.7)', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Belle Me Scan
            </p>
            <p style={{
              fontFamily: "'Noto Serif JP', Georgia, serif",
              fontSize: 'clamp(16px,2.5vw,20px)',
              fontWeight: 700,
              color: 'rgba(240,216,224,0.90)',
              margin: '0 0 12px',
              lineHeight: 1.5,
            }}>
              あなたのコンパスを確認する。
            </p>
            <p style={{ fontSize: 14, color: 'rgba(240,216,224,0.50)', lineHeight: 1.8, margin: '0 0 24px' }}>
              8軸の現在地と「最初の一手」を、今すぐ診断します。
            </p>
            <Link href="/belle/diagnosis" style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg,#c8648c,#e8789e)',
              color: '#fff',
              padding: '13px 36px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 20px rgba(200,100,140,0.35)',
            }}>
              Me Scan を受ける（無料）→
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <section style={{ maxWidth: 720, margin: '56px auto 0', padding: '0 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(200,100,140,0.6)', textTransform: 'uppercase', margin: '0 0 20px' }}>
              Related Articles
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {related.map(rel => (
                <Link key={rel.slug} href={`/belle/journal/${rel.slug}`} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px',
                  background: 'rgba(20,10,18,0.5)',
                  border: '1px solid rgba(200,140,160,0.12)',
                  borderRadius: 12,
                  textDecoration: 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Noto Serif JP', Georgia, serif",
                      fontSize: 14, fontWeight: 700,
                      color: 'rgba(240,216,224,0.85)',
                      margin: '0 0 2px', lineHeight: 1.4,
                    }}>
                      {rel.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(240,216,224,0.40)', margin: 0 }}>
                      {CATEGORY_LABELS[rel.category] ?? rel.category} · {rel.readingTime}分
                    </p>
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(200,100,140,0.6)', flexShrink: 0 }}>›</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
