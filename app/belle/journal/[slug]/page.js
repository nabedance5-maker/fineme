import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllBelleArticles, getBelleArticle } from '@/lib/belle-articles';
import { ArticleBlocks } from '@/app/_components/ArticleBlocks';

export async function generateStaticParams() {
  return getAllBelleArticles().map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const article = getBelleArticle(params.slug);
  if (!article) return {};
  return {
    title: `${article.title} | Belle Journal | Fineme Belle`,
    description: article.description,
    keywords: article.keywords,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedAt,
    },
  };
}

const CATEGORY_LABELS = {
  eyebrow: '眉',
  skincare: 'スキンケア',
  hair: 'ヘアスタイル',
  fashion: 'ファッション',
  nail: 'ネイル',
  hairremoval: '脱毛',
  teeth: '歯・笑顔',
  body: 'ボディ',
  philosophy: '考え方',
  guide: 'ガイド',
};

export default function BelleArticlePage({ params }) {
  const article = getBelleArticle(params.slug);
  if (!article) notFound();

  const allArticles = getAllBelleArticles();
  const related = allArticles
    .filter(a => a.slug !== article.slug)
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Fineme Belle',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fineme Belle',
      url: 'https://fineme.jp/belle',
    },
    keywords: article.keywords?.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main style={{ minHeight: '100vh', paddingBottom: 80 }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #c8648c 0%, #7a3060 60%, #3a1030 100%)',
          padding: 'clamp(40px,8vw,80px) 24px clamp(36px,6vw,60px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* decorative glows */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: 200, height: 200, background: 'radial-gradient(circle, rgba(255,200,220,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: 150, height: 150, background: 'radial-gradient(circle, rgba(255,180,200,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Link href="/belle/journal" style={{ fontSize: 12, color: 'rgba(255,220,230,0.6)', textDecoration: 'none' }}>
                Belle Journal
              </Link>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.3)' }}>›</span>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.6)' }}>
                {CATEGORY_LABELS[article.category] ?? article.category}
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
              {article.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.65)' }}>
                {article.publishedAt}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.4)' }}>·</span>
              <span style={{ fontSize: 12, color: 'rgba(255,220,230,0.65)' }}>
                約{article.readingTime}分
              </span>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,56px) 20px 0' }}>
          <ArticleBlocks blocks={article.blocks} />
        </div>

        {/* Bottom Rose CTA */}
        <div style={{
          maxWidth: 720,
          margin: '16px auto 0',
          padding: '0 20px',
        }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 18px',
                  background: 'rgba(20,10,18,0.5)',
                  border: '1px solid rgba(200,140,160,0.12)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'border-color 0.2s',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>
                    { rel.category === 'eyebrow' ? '✂️'
                    : rel.category === 'skincare' ? '✨'
                    : rel.category === 'hair' ? '💇'
                    : rel.category === 'fashion' ? '👗'
                    : rel.category === 'nail' ? '💅'
                    : rel.category === 'hairremoval' ? '🌿'
                    : rel.category === 'teeth' ? '😁'
                    : rel.category === 'body' ? '💪'
                    : rel.category === 'philosophy' ? '🌸'
                    : '🔮' }
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Noto Serif JP', Georgia, serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'rgba(240,216,224,0.85)',
                      margin: '0 0 2px',
                      lineHeight: 1.4,
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
