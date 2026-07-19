import Link from 'next/link';
import { getAllBelleArticles } from '@/lib/belle-articles';

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

const AXIS_COLORS = {
  E: { bg: 'rgba(180,120,160,0.15)', border: 'rgba(180,120,160,0.4)', text: '#d49ab8', label: '眉軸' },
  S: { bg: 'rgba(120,160,180,0.15)', border: 'rgba(120,160,180,0.4)', text: '#8bbdd4', label: '肌軸' },
  H: { bg: 'rgba(160,140,200,0.15)', border: 'rgba(160,140,200,0.4)', text: '#b8a8e8', label: 'ヘア軸' },
  F: { bg: 'rgba(200,160,100,0.15)', border: 'rgba(200,160,100,0.4)', text: '#d4b870', label: 'ファッション軸' },
  W: { bg: 'rgba(180,100,180,0.15)', border: 'rgba(180,100,180,0.4)', text: '#c87cc8', label: '爪・手元軸' },
  R: { bg: 'rgba(100,160,140,0.15)', border: 'rgba(100,160,140,0.4)', text: '#70b8a4', label: '脱毛軸' },
  T: { bg: 'rgba(220,180,80,0.15)', border: 'rgba(220,180,80,0.4)', text: '#e8c84a', label: '歯・笑顔軸' },
  B: { bg: 'rgba(140,180,120,0.15)', border: 'rgba(140,180,120,0.4)', text: '#8eb87a', label: 'ボディ軸' },
  null: { bg: 'rgba(200,100,140,0.1)', border: 'rgba(200,100,140,0.3)', text: '#c8648c', label: 'Belle' },
};

export default function BelleJournalPage() {
  const articles = getAllBelleArticles();

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
            padding: 24px;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
          }
          .belle-article-card:hover {
            border-color: rgba(200,100,140,0.4);
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(200,100,140,0.12);
          }
        `}</style>
        <div className="belle-journal-grid">
          {articles.map((article) => {
            const axisStyle = AXIS_COLORS[article.axisCode] ?? AXIS_COLORS[null];
            return (
              <Link key={article.slug} href={`/belle/journal/${article.slug}`} className="belle-article-card">
                {/* Gradient placeholder */}
                <div style={{
                  height: 120,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, rgba(200,100,140,0.25) 0%, rgba(120,60,100,0.35) 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <span style={{ fontSize: 36, opacity: 0.6 }}>
                    { article.category === 'eyebrow' ? '✂️'
                    : article.category === 'skincare' ? '✨'
                    : article.category === 'hair' ? '💇'
                    : article.category === 'fashion' ? '👗'
                    : article.category === 'nail' ? '💅'
                    : article.category === 'hairremoval' ? '🌿'
                    : article.category === 'teeth' ? '😁'
                    : article.category === 'body' ? '💪'
                    : article.category === 'philosophy' ? '🌸'
                    : '🔮' }
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {article.axisCode && (
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                      padding: '2px 8px', borderRadius: 99,
                      background: axisStyle.bg, border: `1px solid ${axisStyle.border}`,
                      color: axisStyle.text,
                    }}>
                      {axisStyle.label}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'rgba(240,216,224,0.35)' }}>
                    {article.readingTime}分で読める
                  </span>
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
              </Link>
            );
          })}
        </div>
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
