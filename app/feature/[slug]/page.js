import { notFound } from 'next/navigation';
import { getAllArticles, getArticle } from '@/lib/articles';
import { ArticleBlocks } from '@/app/_components/ArticleBlocks';
import { ParallaxImg } from '@/app/_components/ParallaxImg';
import { PersonalizedServices } from '@/app/_components/PersonalizedServices';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 3600;

// カテゴリ → 関連サービスカテゴリ（広めに取得してクライアントでパーソナライズ）
const ARTICLE_TO_SERVICE_CAT = {
  '清潔感':    ['hair', 'esthetic', 'eyebrow', 'whitening', 'makeup'],
  '写真撮影':  ['photo', 'consulting', 'makeup'],
  '変容の思想': ['consulting', 'diagnosis', 'gym', 'fashion'],
};

// 記事カテゴリ → 商品軸（affiliate_productsのaxis）
const CATEGORY_TO_AXES = {
  '清潔感':     ['skin', 'hair', 'eyebrow'],
  '垢抜け':     ['eyebrow', 'hair', 'fashion'],
  '体型・筋トレ': ['body'],
  '歯・口元':   ['teeth'],
  '爪・ネイル': ['nail'],
  'メイク':     ['skin', 'eyebrow'],
  '日常習慣':   ['skin', 'hair'],
  '写真撮影':   ['fashion', 'skin', 'hair'],
  '変容の思想': ['body', 'skin', 'hair'],
};

async function getRelatedProducts(category) {
  const axes = CATEGORY_TO_AXES[category] || [];
  if (!axes.length) return [];
  try {
    const { data } = await getSupabase()
      .from('affiliate_products')
      .select('id, name, affiliate_url, description, axis, price_range')
      .eq('is_active', true)
      .in('axis', axes)
      .limit(6);
    return (data || []).filter(p => p.affiliate_url);
  } catch { return []; }
}

async function getRelatedProviders(category) {
  const cats = ARTICLE_TO_SERVICE_CAT[category] || [];
  if (!cats.length) return [];
  try {
    const { data } = await getSupabase()
      .from('providers')
      .select('id, slug, name, main_category, thumbnail, tagline, entity_type')
      .eq('status', 'published')
      .or('admin_hidden.eq.false,admin_hidden.is.null')
      .in('main_category', cats)
      .limit(10);
    return data || [];
  } catch { return []; }
}

export async function generateStaticParams() {
  try {
    const articles = await getAllArticles();
    return articles
      .filter(a => a.slug)
      .slice(0, 50)
      .map(a => ({ slug: a.slug }));
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


function ArticleProductBlock({ products }) {
  return (
    <div style={{
      margin: '40px 0',
      padding: '22px 24px',
      background: 'rgba(201,168,76,0.04)',
      border: '1px solid rgba(201,168,76,0.18)',
      borderRadius: '14px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', margin: '0 0 6px' }}>
        🛒 関連商品
      </p>
      <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.45)', margin: '0 0 14px', lineHeight: 1.6 }}>
        変容の旅に役立つグッズ。気になるものを試してみてください。
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {products.map((prod) => (
          <a
            key={prod.id}
            href={prod.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '12px', padding: '7px 14px',
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: '8px',
              color: 'rgba(240,228,180,0.85)',
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {prod.name} →
          </a>
        ))}
      </div>
    </div>
  );
}

async function getRelatedArticles(relatedSlugs) {
  if (!relatedSlugs?.length) return [];
  try {
    const { data } = await getSupabase()
      .from('features')
      .select('slug, title, description, thumbnail, category, reading_time')
      .in('slug', relatedSlugs)
      .eq('status', 'published')
      .limit(4);
    return data || [];
  } catch { return []; }
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const [relatedProviders, relatedArticles, relatedProducts] = await Promise.all([
    getRelatedProviders(article.category),
    getRelatedArticles(article.related_slugs),
    getRelatedProducts(article.category),
  ]);

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
        <style dangerouslySetInnerHTML={{ __html: `@keyframes compassSpin { to { transform: rotate(360deg); } }` }} />
        <div style={{ position: 'relative', height: 'clamp(360px, 52vw, 520px)', overflow: 'hidden', background: '#0a0f1e' }}>
          {article.thumbnail && <ParallaxImg src={article.thumbnail} alt={article.title} />}
          {/* グラデーション：上薄く→下濃く */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,15,30,0.05) 0%, rgba(10,15,30,0.35) 40%, rgba(10,15,30,0.88) 78%, rgba(10,15,30,0.97) 100%)',
          }} />
          {/* コンパスローズ装飾 */}
          <div style={{ position: 'absolute', right: '28px', bottom: '96px', opacity: 0.14, pointerEvents: 'none', zIndex: 2 }}>
            <svg width="84" height="84" viewBox="0 0 88 88" style={{ animation: 'compassSpin 48s linear infinite' }}>
              <polygon points="44,4 49,40 44,44 39,40" fill="#c9a84c"/>
              <polygon points="44,84 49,48 44,44 39,48" fill="rgba(201,168,76,0.55)"/>
              <polygon points="84,44 48,39 44,44 48,49" fill="rgba(201,168,76,0.55)"/>
              <polygon points="4,44 40,39 44,44 40,49" fill="rgba(201,168,76,0.55)"/>
              <circle cx="44" cy="44" r="5" fill="#c9a84c" opacity="0.85"/>
              <circle cx="44" cy="44" r="18" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
              <circle cx="44" cy="44" r="32" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="1"/>
              {[0,45,90,135,180,225,270,315].map(deg => {
                const r = deg * Math.PI / 180;
                return <line key={deg} x1={44 + 28*Math.sin(r)} y1={44 - 28*Math.cos(r)} x2={44 + 34*Math.sin(r)} y2={44 - 34*Math.cos(r)} stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>;
              })}
            </svg>
          </div>

          {/* タイトルオーバーレイ（ヒーロー下部） */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px clamp(40px, 6vw, 56px)' }}>
            <div style={{ maxWidth: '740px', margin: '0 auto' }}>
              <Link href="/feature" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                marginBottom: '14px', fontFamily: 'var(--font-sans)',
                transition: 'color 0.15s',
              }}>
                ← Fineme Journal へ戻る
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

        {/* ── 半透明ネイビーカード：地図が透けて見える本文エリア ── */}
        <div style={{
          background: 'rgba(10,15,30,0.78)',
          borderRadius: '24px 24px 0 0',
          marginTop: '-24px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 -4px 32px rgba(10,15,30,0.3)',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            maxWidth: '740px',
            margin: '0 auto',
            padding: 'clamp(32px, 5vw, 52px) clamp(20px, 5vw, 48px) clamp(48px, 8vw, 80px)',
          }}>

            {/* 記事本文（blocksの場合は60%地点に商品ブロックを挿入） */}
            {hasBlocks && (() => {
              const splitAt = Math.ceil(article.blocks.length * 0.6);
              return (
                <>
                  <ArticleBlocks blocks={article.blocks.slice(0, splitAt)} />
                  {relatedProducts.length > 0 && <ArticleProductBlock products={relatedProducts} />}
                  <ArticleBlocks blocks={article.blocks.slice(splitAt)} />
                </>
              );
            })()}
            {!hasBlocks && hasBody && (
              <>
                <style>{`
                  .article-html-body h2{font-size:clamp(18px,3.5vw,22px);font-weight:800;font-family:var(--font-serif);padding-left:14px;border-left:4px solid #c9a84c;margin:52px 0 16px;line-height:1.55;color:#fff}
                  .article-html-body h3{font-size:17px;font-weight:700;margin:32px 0 10px;color:rgba(255,255,255,0.9)}
                  .article-html-body p{font-size:16px;line-height:2;margin-bottom:20px;color:rgba(240,236,228,0.85)}
                  .article-html-body blockquote{background:rgba(201,168,76,0.07);border-left:4px solid #c9a84c;border-radius:0 12px 12px 0;padding:16px 22px;margin:28px 0;color:rgba(240,236,228,0.88)}
                  .article-html-body img{max-width:100%;border-radius:12px;display:block;margin:24px auto}
                  .article-html-body ul,.article-html-body ol{padding-left:24px;margin-bottom:20px}
                  .article-html-body li{font-size:15px;line-height:1.85;color:rgba(240,236,228,0.82);margin-bottom:6px}
                  .article-html-body a{color:#c9a84c;text-decoration:underline}
                  .article-html-body strong{color:#fff;font-weight:800}
                  .article-html-body .fb-block{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:16px;color:rgba(240,236,228,0.88)}
                  .article-html-body .fb-card{background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.22);border-radius:14px;padding:18px 16px;color:rgba(240,236,228,0.88)}
                  .article-html-body .fb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:28px 0}
                  .article-html-body .fb-slider{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;margin:28px 0;scrollbar-width:thin}
                  .article-html-body .fb-slide{flex-shrink:0;width:240px;background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:16px}
                  .article-html-body .fb-text{font-size:15px;color:rgba(240,236,228,0.85);line-height:1.9}
                  .article-html-body .fb-heading{font-weight:800;font-size:clamp(16px,2.5vw,20px);font-family:var(--font-serif);color:#fff;margin:0 0 8px}
                `}</style>
                <div className="article-html-body" dangerouslySetInnerHTML={{ __html: article.body }} />
                {relatedProducts.length > 0 && (
                  <ArticleProductBlock products={relatedProducts} />
                )}
              </>
            )}
            {!hasBlocks && !hasBody && (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '40px 0' }}>コンテンツを準備中です。</p>
            )}

            {/* ── 関連サービス（パーソナライズ） ── */}
            {relatedProviders.length > 0 && (
              <PersonalizedServices
                providers={relatedProviders}
                firstCat={ARTICLE_TO_SERVICE_CAT[article.category]?.[0] || ''}
              />
            )}
          </div>

          {/* ── 診断誘導CTA ── */}
          <div style={{
            margin: '0 0 0',
            padding: 'clamp(36px, 7vw, 64px) 20px',
            background: 'linear-gradient(135deg, rgba(10,15,30,0.9) 0%, rgba(6,12,26,0.95) 100%)',
            borderTop: '1px solid rgba(201,168,76,0.15)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 背景装飾 */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧭</div>
              <h3 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: 800, color: '#f0ece4', marginBottom: '12px', lineHeight: 1.4, fontFamily: 'var(--font-serif)' }}>
                あなたに合う変容ルートを<br />診断で見つけてみませんか？
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '24px', lineHeight: 1.8, fontFamily: 'var(--font-sans)' }}>
                体型・眉・ヘア・肌・服・歯・爪。7軸の診断で、<br />今のあなたに最も効く「最初の一手」がわかります。
              </p>
              <Link href="/diagnosis" style={{
                display: 'inline-block', padding: '14px 36px',
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                borderRadius: '8px', color: '#0a0f1e', fontWeight: 800,
                fontSize: '15px', textDecoration: 'none', fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
              }}>
                無料で診断する（3分）→
              </Link>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '12px', fontFamily: 'var(--font-sans)' }}>
                登録不要・無料・すぐに結果が出ます
              </p>
            </div>
          </div>

          {/* ── 関連記事 ── */}
          {relatedArticles.length > 0 && (
            <div style={{
              borderTop: '1px solid rgba(201,168,76,0.12)',
              padding: 'clamp(28px, 5vw, 48px) 20px',
              background: 'rgba(10,15,30,0.3)',
            }}>
              <div style={{ maxWidth: '740px', margin: '0 auto' }}>
                <p style={{
                  fontSize: '10px', fontWeight: 800, letterSpacing: '.16em',
                  textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)',
                  margin: '0 0 18px', fontFamily: 'var(--font-sans)',
                }}>
                  関連記事
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '14px',
                }}>
                  {relatedArticles.map(a => (
                    <Link key={a.slug} href={`/feature/${a.slug}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        background: 'rgba(10,15,30,0.6)',
                        border: '1px solid rgba(201,168,76,0.14)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'border-color .2s',
                      }}>
                        {a.thumbnail && (
                          <div style={{
                            height: '110px', overflow: 'hidden',
                            background: '#0a0f1e',
                          }}>
                            <img
                              src={a.thumbnail}
                              alt={a.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                            />
                          </div>
                        )}
                        <div style={{ padding: '12px 14px' }}>
                          {a.category && (
                            <span style={{
                              fontSize: '9px', fontWeight: 800, letterSpacing: '.1em',
                              textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)',
                              fontFamily: 'var(--font-sans)',
                            }}>
                              {a.category}
                            </span>
                          )}
                          <p style={{
                            fontSize: '13px', fontWeight: 700, color: 'rgba(240,236,228,0.88)',
                            margin: '4px 0 0', lineHeight: 1.55,
                            fontFamily: 'var(--font-serif)',
                            display: '-webkit-box', WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {a.title}
                          </p>
                          <p style={{
                            fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                            margin: '6px 0 0', fontFamily: 'var(--font-sans)',
                          }}>
                            📖 {a.reading_time || 5}分
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── 記事フッター ── */}
          <div style={{
            borderTop: '1px solid rgba(201,168,76,0.12)',
            padding: 'clamp(24px, 4vw, 40px) 20px',
            textAlign: 'center',
            background: 'rgba(10,15,30,0.4)',
          }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              Fineme Journal の他の記事も読んでみませんか？
            </p>
            <Link href="/feature" style={{
              display: 'inline-block', padding: '10px 28px',
              background: 'transparent', border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: '8px', color: '#c9a84c', fontWeight: 700,
              fontSize: '14px', textDecoration: 'none', fontFamily: 'var(--font-sans)',
            }}>
              Fineme Journal を見る
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
