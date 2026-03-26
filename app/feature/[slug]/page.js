import { notFound } from 'next/navigation';
import { getAllArticles, getArticle } from '@/lib/articles';
import { ArticleBlocks } from '@/app/_components/ArticleBlocks';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 3600;

// カテゴリ → 関連サービスカテゴリ
const ARTICLE_TO_SERVICE_CAT = {
  '清潔感':    ['hair', 'esthetic', 'eyebrow'],
  '写真撮影':  ['photo'],
  '変容の思想': ['consulting', 'diagnosis'],
};

async function getRelatedProviders(category) {
  const cats = ARTICLE_TO_SERVICE_CAT[category] || [];
  if (!cats.length) return [];
  try {
    const { data } = await getSupabase()
      .from('providers')
      .select('id, slug, name, main_category, thumbnail, tagline, entity_type')
      .eq('status', 'published')
      .is('admin_hidden', null)
      .in('main_category', cats)
      .limit(5);
    return data || [];
  } catch { return []; }
}

export async function generateStaticParams() {
  try {
    const articles = await getAllArticles();
    return articles.filter(a => a.slug).map(a => ({ slug: a.slug }));
  } catch { return []; }
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

// カテゴリ日本語ラベル
const CAT_LABEL = {
  hair: 'ヘア', esthetic: '肌・エステ', eyebrow: '眉毛サロン',
  photo: '写真撮影', consulting: 'トータルサポート', diagnosis: '骨格診断',
};

export default async function ArticlePage({ params }) {
  const [article, relatedProviders] = await Promise.all([
    getArticle(params.slug),
    (async () => {
      const a = await getArticle(params.slug);
      return a ? getRelatedProviders(a.category) : [];
    })(),
  ]);
  if (!article) notFound();

  const hasBlocks = Array.isArray(article.blocks) && article.blocks.length > 0;
  const hasBody = typeof article.body === 'string' && article.body.trim().length > 0;

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description || article.summary || '',
    image: article.thumbnail || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: { '@type': 'Organization', name: 'Fineme' },
    publisher: { '@type': 'Organization', name: 'Fineme', url: 'https://www.fineme.me' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>

        {/* ── ヒーロー：フルブリード画像 + タイトルオーバーレイ ── */}
        <div style={{ position: 'relative', height: 'clamp(360px, 52vw, 520px)', overflow: 'hidden', background: '#0a0f1e' }}>
          {article.thumbnail && (
            <img
              src={article.thumbnail}
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.88 }}
            />
          )}
          {/* グラデーション：上薄く→下濃く */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,15,30,0.05) 0%, rgba(10,15,30,0.35) 40%, rgba(10,15,30,0.88) 78%, rgba(10,15,30,0.97) 100%)',
          }} />

          {/* タイトルオーバーレイ（ヒーロー下部） */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px clamp(40px, 6vw, 56px)' }}>
            <div style={{ maxWidth: '740px', margin: '0 auto' }}>
              <Link href="/feature" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                marginBottom: '14px', fontFamily: 'var(--font-sans)',
                transition: 'color 0.15s',
              }}>
                ← 特集一覧へ戻る
              </Link>

              {article.category && (
                <div style={{
                  display: 'inline-block', background: '#c9a84c', color: '#0a0f1e',
                  fontSize: '10px', fontWeight: 800, padding: '4px 12px',
                  borderRadius: '99px', letterSpacing: '0.12em', marginBottom: '14px',
                  fontFamily: 'var(--font-sans)', textTransform: 'uppercase',
                }}>
                  {article.category}
                </div>
              )}

              <h1 style={{
                fontSize: 'clamp(20px, 4.5vw, 36px)',
                fontWeight: 800,
                fontFamily: 'var(--font-serif)',
                lineHeight: 1.42,
                color: '#fff',
                marginBottom: '14px',
                textShadow: '0 2px 12px rgba(0,0,0,0.35)',
              }}>
                {article.title}
              </h1>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)',
              }}>
                <span>📖 {article.reading_time || 5}分で読める</span>
                {publishedDate && <><span>·</span><span>{publishedDate}</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* ── ホワイトカード：ヒーローから浮き上がる本文エリア ── */}
        <div style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          marginTop: '-24px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 -4px 32px rgba(10,15,30,0.12)',
        }}>
          <div style={{
            maxWidth: '740px',
            margin: '0 auto',
            padding: 'clamp(32px, 5vw, 52px) clamp(20px, 5vw, 48px) clamp(48px, 8vw, 80px)',
          }}>

            {/* 記事本文 */}
            {hasBlocks && <ArticleBlocks blocks={article.blocks} />}
            {!hasBlocks && hasBody && (
              <>
                <style>{`
                  .article-html-body h2{font-size:clamp(18px,3.5vw,22px);font-weight:800;font-family:var(--font-serif);padding-left:14px;border-left:4px solid #c9a84c;margin:48px 0 16px;line-height:1.55;color:#0a0f1e}
                  .article-html-body h3{font-size:17px;font-weight:700;margin:32px 0 10px;color:#0a0f1e}
                  .article-html-body p{font-size:16px;line-height:2;margin-bottom:20px;color:#1a1410}
                  .article-html-body blockquote{background:rgba(201,168,76,0.07);border-left:4px solid #c9a84c;border-radius:0 12px 12px 0;padding:16px 22px;margin:28px 0;color:#2a2420}
                  .article-html-body img{max-width:100%;border-radius:12px;display:block;margin:24px auto}
                  .article-html-body ul,.article-html-body ol{padding-left:24px;margin-bottom:20px}
                  .article-html-body li{font-size:15px;line-height:1.85;color:#1a1410;margin-bottom:6px}
                  .article-html-body a{color:#c9a84c;text-decoration:underline}
                  .article-html-body strong{color:#0a0f1e;font-weight:800}
                  .article-html-body .fb-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}
                  .article-html-body .fb-item{grid-column:var(--x,auto)/span var(--w,12)}
                  .article-html-body .fb-card{background:#f9f7f3;border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:16px}
                  .article-html-body .fb-block{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:12px;padding:16px}
                  .article-html-body .fb-text{font-size:15px;color:#1a1410;line-height:1.9}
                  .article-html-body .fb-heading{font-weight:800;font-size:clamp(18px,3vw,24px);font-family:var(--font-serif);color:#0a0f1e}
                `}</style>
                <div className="article-html-body" dangerouslySetInnerHTML={{ __html: article.body }} />
              </>
            )}
            {!hasBlocks && !hasBody && (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>コンテンツを準備中です。</p>
            )}

            {/* ── 関連サービス ── */}
            {relatedProviders.length > 0 && (
              <div style={{ marginTop: '60px', paddingTop: '48px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', margin: '0 0 6px' }}>
                  この記事に関連するサービス
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
                  読んだ内容を実践できるプロが見つかります。
                </p>
                {/* 横スクロールカード */}
                <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', marginLeft: '-4px', paddingLeft: '4px' }}>
                  {relatedProviders.map(p => (
                    <Link key={p.id} href={p.entity_type === 'affiliate' ? `/affiliate/${p.slug}` : `/provider/${p.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0, width: 'clamp(200px, 42vw, 240px)', scrollSnapAlign: 'start' }}>
                      <div style={{ border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', overflow: 'hidden', background: '#fafaf8', transition: 'box-shadow 0.15s' }}>
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ height: '130px', background: 'linear-gradient(135deg, #0a0f1e, #1e2b54)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '28px' }}>✨</span>
                          </div>
                        )}
                        <div style={{ padding: '12px' }}>
                          <p style={{ fontSize: '10px', color: '#c9a84c', fontWeight: 800, letterSpacing: '0.08em', margin: '0 0 5px', textTransform: 'uppercase' }}>
                            {CAT_LABEL[p.main_category] || p.main_category}
                          </p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0a0f1e', margin: '0 0 5px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {p.name}
                          </p>
                          {p.tagline && (
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {p.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <Link href={`/search?category=${ARTICLE_TO_SERVICE_CAT[article.category]?.[0] || ''}`}
                    style={{ fontSize: '12px', color: '#c9a84c', fontWeight: 700, textDecoration: 'none' }}>
                    関連サービスをもっと見る →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── 記事フッター ── */}
          <div style={{
            borderTop: '1px solid rgba(201,168,76,0.12)',
            padding: 'clamp(32px, 6vw, 56px) 20px',
            textAlign: 'center',
            background: '#f9f7f3',
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              他の特集記事も読んでみませんか？
            </p>
            <Link href="/feature" style={{
              display: 'inline-block', padding: '10px 28px',
              background: 'transparent', border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: '8px', color: '#c9a84c', fontWeight: 700,
              fontSize: '14px', textDecoration: 'none', fontFamily: 'var(--font-sans)',
            }}>
              特集一覧へ
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
