import Link from 'next/link';
import { getAllBelleArticles, getAllBelleArticlesFromDB } from '@/lib/belle-articles';

export const revalidate = 3600;

export const metadata = {
  title: 'Belle Journal | Fineme Belle',
  description: '外見を起点に自信を再設計するための女性向けコンテンツ。眉・肌・髪・ファッション・ネイル・脱毛・歯・ボディの8軸で、あなたの「最初の一手」を見つける。',
  keywords: ['外見改善 女性', 'Belle Journal', 'スキンケア', '眉毛 整え方', 'ファッション 初心者'],
  openGraph: {
    title: 'Belle Journal | Fineme Belle',
    description: '外見を起点に自信を再設計するための女性向けコンテンツ。',
    type: 'website',
  },
};

const CATEGORY_EMOJI = {
  eyebrow: '✂️', skincare: '✨', hair: '💇', fashion: '👗',
  nail: '💅', hairremoval: '🌿', teeth: '😁', body: '💪',
  philosophy: '🌸', guide: '🔮',
  '眉毛': '✂️', 'スキンケア': '✨', 'ヘア': '💇', 'ファッション': '👗',
  'ネイル': '💅', '脱毛': '🌿', '歯・笑顔': '😁', '歯': '😁', 'ボディ': '💪',
  '考え方': '🌸', '垢抜け': '💫',
};

function categoryEmoji(cat) {
  return CATEGORY_EMOJI[cat] ?? '🌸';
}

// Supabase記事 → カード表示用に正規化
function normalizeDbArticle(a) {
  return {
    slug: a.slug,
    title: a.title,
    description: a.description || '',
    category: a.category || '',
    readingTime: a.reading_time || 8,
    publishedAt: a.published_at?.slice(0, 10) || '',
    thumbnail: a.thumbnail || null,
    source: 'db',
  };
}

// 静的JSON記事 → カード表示用に正規化
function normalizeStaticArticle(a) {
  return {
    slug: a.slug,
    title: a.title,
    description: a.description || '',
    category: a.category || '',
    readingTime: a.readingTime || 6,
    publishedAt: a.publishedAt || '',
    thumbnail: null,
    source: 'static',
  };
}

export default async function BelleJournalPage() {
  // Supabase + 静的JSONを合算（slug で重複除去）
  const [dbArticles, staticList] = await Promise.all([
    getAllBelleArticlesFromDB(),
    Promise.resolve(getAllBelleArticles()),
  ]);

  const dbNorm = dbArticles.map(normalizeDbArticle);
  const dbSlugs = new Set(dbNorm.map(a => a.slug));
  const staticNorm = staticList.map(normalizeStaticArticle).filter(a => !dbSlugs.has(a.slug));

  const articles = [...dbNorm, ...staticNorm];

  return (
    <main style={{ minHeight: '100vh', padding: '0 0 80px' }}>
      {/* Hero */}
      <section style={{
        padding: 'clamp(48px,8vw,80px) 24px clamp(40px,6vw,64px)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(200,100,140,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(200,140,160,0.12)',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.22em', color: 'rgba(200,100,140,0.7)', textTransform: 'uppercase', margin: '0 0 16px' }}>
          Belle Journal
        </p>
        <h1 style={{
          fontFamily: "'Noto Serif JP', Georgia, serif",
          fontSize: 'clamp(24px,5vw,36px)',
          fontWeight: 700,
          color: 'rgba(240,216,224,0.92)',
          margin: '0 0 16px',
          lineHeight: 1.4,
        }}>
          外見を起点に、自信を再設計する。
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(240,216,224,0.55)', lineHeight: 1.9, maxWidth: 480, margin: '0 auto' }}>
          眉・肌・髪・ファッション・ネイル・脱毛・歯・ボディ。<br />
          8軸それぞれの「最初の一手」を見つけるためのコンテンツ。
        </p>
      </section>

      {/* Articles Grid */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 0' }}>
        <style>{`
          .belle-journal-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          @media (max-width: 640px) {
            .belle-journal-grid { grid-template-columns: 1fr; }
          }
          .belle-article-card {
            background: rgba(20,10,18,0.6);
            border: 1px solid rgba(200,140,160,0.15);
            border-radius: 16px;
            overflow: hidden;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          }
          .belle-article-card:hover {
            border-color: rgba(200,100,140,0.4);
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(200,100,140,0.12);
          }
          .belle-article-card-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
          }
        `}</style>

        {articles.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(240,216,224,0.4)', padding: '48px 0' }}>記事を準備中です。</p>
        ) : (
          <div className="belle-journal-grid">
            {articles.map((article) => (
              <Link key={article.slug} href={`/belle/journal/${article.slug}`} className="belle-article-card">
                {/* サムネイル */}
                {article.thumbnail ? (
                  <div style={{ height: 140, overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    height: 120,
                    background: 'linear-gradient(135deg, rgba(200,100,140,0.25) 0%, rgba(120,60,100,0.35) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 36, opacity: 0.6 }}>{categoryEmoji(article.category)}</span>
                  </div>
                )}

                <div className="belle-article-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(200,100,140,0.12)', border: '1px solid rgba(200,100,140,0.3)',
                      color: '#d498b4',
                    }}>
                      {article.category || 'Belle'}
                    </span>
                    {article.readingTime && (
                      <span style={{ fontSize: 11, color: 'rgba(240,216,224,0.35)' }}>
                        {article.readingTime}分で読める
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontFamily: "'Noto Serif JP', Georgia, serif",
                    fontSize: 'clamp(15px,2.5vw,17px)',
                    fontWeight: 700,
                    color: 'rgba(240,216,224,0.90)',
                    margin: 0,
                    lineHeight: 1.55,
                  }}>
                    {article.title}
                  </h2>

                  <p style={{
                    fontSize: 13,
                    color: 'rgba(240,216,224,0.50)',
                    lineHeight: 1.75,
                    margin: 0,
                  }}>
                    {article.description}
                  </p>

                  <span style={{
                    marginTop: 'auto',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'rgba(200,100,140,0.7)',
                    letterSpacing: '0.05em',
                  }}>
                    読む →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Me Scan CTA */}
      <section style={{
        maxWidth: 560,
        margin: '64px auto 0',
        padding: '0 20px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'rgba(240,216,224,0.45)', lineHeight: 1.8, marginBottom: 20 }}>
          記事を読む前に、まず「何から始めるべきか」を知りたい方へ。
        </p>
        <Link href="/belle/diagnosis" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg,#c8648c,#e8789e)',
          color: '#fff',
          padding: '13px 32px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          letterSpacing: '0.04em',
        }}>
          Belle Me Scan を受ける（無料）
        </Link>
      </section>
    </main>
  );
}
