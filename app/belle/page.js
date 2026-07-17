'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const BELLE_CATEGORIES = [
  { cat: 'makeup',         icon: '💄', label: 'メイクアップ',         sub: '印象を意図的に作る' },
  { cat: 'esthetic',       icon: '💆', label: '肌・エステ',           sub: '素肌から変える' },
  { cat: 'eyebrow',        icon: '✂️', label: '眉毛サロン',           sub: '顔の印象を即日変える' },
  { cat: 'hair',           icon: '💇', label: 'ヘア',                 sub: '毎日のスタイルを変える' },
  { cat: 'nail',           icon: '💅', label: 'ネイル',               sub: '細部まで気を配る人になる' },
  { cat: 'fashion',        icon: '👗', label: 'ファッション',         sub: '自分らしい服で自信をつくる' },
  { cat: 'hairremoval',    icon: '🪒', label: '脱毛',                 sub: 'なめらかさで印象を変える' },
  { cat: 'whitening',      icon: '✨', label: '歯のホワイトニング',   sub: '笑顔への自信をつくる' },
  { cat: 'gym',            icon: '🏋️', label: 'パーソナルジム',       sub: '体型・姿勢を変える' },
  { cat: 'colordiagnosis', icon: '🎨', label: 'パーソナルカラー診断', sub: '似合う色を知る' },
  { cat: 'bonediagnosis',  icon: '🔍', label: '骨格診断',             sub: '自分の基準を知る' },
];

const BELLE_FAQ = [
  {
    q: 'Fineme Belleとは何ですか？',
    a: 'Fineme Belleは、女性の外見を起点に自信を再設計するプラットフォームです。Me Scan診断・Mirror写真AI分析を通じて、あなただけの変容ロードマップを提供します。',
  },
  {
    q: '何から始めればいいですか？',
    a: 'まずはMe Scan（無料診断）で自分の「外見コンパス（最優先の一手）」を把握することをおすすめします。メイク・肌・髪・服装・眉の順で多くの方が変化を感じています。',
  },
  {
    q: 'Fineme Mirrorとは？',
    a: '写真を1枚アップロードするだけで、AIが外見の変容余地を分析します。メイク・肌感・ヘアスタイル・服装など複数の軸で分析し、具体的な改善ヒントを提供します。',
  },
  {
    q: 'Me ScanとMirrorの違いは？',
    a: 'Me Scanは質問に答えて自分の現在地と変容ルートを把握する診断です。Mirrorは実際の写真をAIが分析して外見の変容余地を可視化します。両方受けると変容の地図が完成します。',
  },
];

export default function BellePage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fineme:diagnosis:belle') || localStorage.getItem('fineme:diagnosis:v3');
      if (raw) setDiagnosis(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <main>
      <style>{`
        .belle-hero {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 20px 60px;
          background: radial-gradient(ellipse 120% 60% at 50% 0%, rgba(180,80,120,0.12) 0%, transparent 70%);
        }
        .belle-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: rgba(210,140,170,0.8);
          text-transform: uppercase;
          margin: 0 0 16px;
        }
        .belle-hero-title {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(24px, 5vw, 42px);
          font-weight: 700;
          color: #f0d8e0;
          line-height: 1.45;
          margin: 0 0 12px;
          max-width: 680px;
        }
        .belle-hero-sub {
          font-size: clamp(14px, 2vw, 17px);
          color: rgba(240,216,224,0.6);
          line-height: 1.8;
          max-width: 520px;
          margin: 0 auto 40px;
        }
        .belle-cta-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .belle-btn-primary {
          display: inline-block;
          background: linear-gradient(135deg, rgba(200,100,140,0.9), rgba(160,80,120,0.9));
          color: #fff;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          border: 1px solid rgba(220,120,160,0.4);
          transition: opacity .2s;
        }
        .belle-btn-primary:hover { opacity: .88; }
        .belle-btn-ghost {
          display: inline-block;
          background: rgba(200,100,140,0.08);
          color: rgba(240,216,224,0.85);
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          border: 1px solid rgba(200,100,140,0.3);
          transition: opacity .2s;
        }
        .belle-btn-ghost:hover { opacity: .8; }
        .belle-cats {
          padding: 64px 20px 48px;
          background: rgba(20,10,18,0.5);
        }
        .belle-cats-inner { max-width: 900px; margin: 0 auto; }
        .belle-cats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
        }
        .belle-cat-card {
          background: rgba(200,100,140,0.07);
          border: 1px solid rgba(200,100,140,0.18);
          border-radius: 10px;
          padding: 14px 10px;
          text-align: center;
          text-decoration: none;
          transition: background .2s, border-color .2s;
          display: block;
        }
        .belle-cat-card:hover {
          background: rgba(200,100,140,0.14);
          border-color: rgba(200,100,140,0.35);
        }
        .belle-cat-icon { font-size: 24px; display: block; margin-bottom: 6px; }
        .belle-cat-label { font-size: 12px; font-weight: 700; color: rgba(240,216,224,0.85); display: block; }
        .belle-cat-sub { font-size: 10px; color: rgba(240,216,224,0.4); display: block; margin-top: 3px; }
        .belle-section-title {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(17px, 2.5vw, 21px);
          font-weight: 700;
          color: rgba(240,216,224,0.9);
          text-align: center;
          margin: 0 0 28px;
        }
        .belle-faq { padding: 64px 20px 80px; }
        .belle-faq-inner { max-width: 680px; margin: 0 auto; }
        .belle-faq-item { border-bottom: 1px solid rgba(200,100,140,0.15); }
        .belle-faq-q {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 4px;
          text-align: left;
          font-size: 15px;
          font-weight: 600;
          color: rgba(240,216,224,0.85);
          gap: 12px;
        }
        .belle-faq-a {
          font-size: 14px;
          line-height: 1.8;
          color: rgba(240,216,224,0.65);
          padding: 0 4px 18px;
        }
        .belle-scan-nudge {
          background: rgba(200,100,140,0.06);
          border: 1px solid rgba(200,100,140,0.2);
          border-radius: 14px;
          padding: 28px 24px;
          text-align: center;
          margin: 0 auto 48px;
          max-width: 480px;
        }
      `}</style>

      {/* ─── ヒーロー ─── */}
      <section className="belle-hero">
        <p className="belle-eyebrow">Fineme Belle</p>
        <h1 className="belle-hero-title">
          そのまま進むのが<br />怖くなった夜に。<br />
          <span style={{ color: 'rgba(210,140,170,0.9)' }}>外見を起点に、自信を再設計する。</span>
        </h1>
        <p className="belle-hero-sub">
          変わりたいと思ったとき、<br />外見は自分でコントロールできる、最初の一歩。
        </p>

        {diagnosis ? (
          <div className="belle-scan-nudge">
            <p style={{ fontSize: 13, color: 'rgba(240,216,224,0.55)', margin: '0 0 12px' }}>診断済み</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f0d8e0', margin: '0 0 16px' }}>
              変容の地図を確認する
            </p>
            <div className="belle-cta-row" style={{ marginBottom: 0 }}>
              <Link href="/belle/diagnosis/result" className="belle-btn-primary">New Me Naviを見る</Link>
              <Link href="/belle/mirror" className="belle-btn-ghost">Mirrorで写真分析</Link>
            </div>
          </div>
        ) : (
          <div className="belle-cta-row">
            <Link href="/belle/diagnosis" className="belle-btn-primary">Me Scanを始める（無料）</Link>
            <Link href="/belle/mirror" className="belle-btn-ghost">📸 Mirrorで写真分析</Link>
          </div>
        )}
      </section>

      {/* ─── サービス説明 ─── */}
      <section style={{ padding: '48px 20px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(210,140,170,0.7)', marginBottom: 12, textTransform: 'uppercase' }}>
          What is Fineme Belle
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.9, color: 'rgba(240,216,224,0.7)' }}>
          Me Scan診断で「今の現在地」と「最初の一手」を把握し、<br />
          Mirror写真AIで「変容余地」を可視化する。<br />
          この2つが、あなただけの変容ロードマップをつくります。
        </p>
      </section>

      {/* ─── カテゴリ ─── */}
      <section className="belle-cats">
        <div className="belle-cats-inner">
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(210,140,170,0.7)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'center' }}>カテゴリ</p>
          <h2 className="belle-section-title">専門家・サービスから次の一手を選ぶ</h2>
          <div className="belle-cats-grid">
            {BELLE_CATEGORIES.map(({ cat, icon, label, sub }) => (
              <Link key={cat} href={`/search?category=${cat}`} className="belle-cat-card">
                <span className="belle-cat-icon">{icon}</span>
                <span className="belle-cat-label">{label}</span>
                <span className="belle-cat-sub">{sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="belle-faq">
        <div className="belle-faq-inner">
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(210,140,170,0.7)', textTransform: 'uppercase', margin: '0 0 8px', textAlign: 'center' }}>FAQ</p>
          <h2 className="belle-section-title" style={{ marginBottom: 32 }}>よくある質問</h2>
          {BELLE_FAQ.map((item, i) => (
            <div key={i} className="belle-faq-item">
              <button className="belle-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>Q. {item.q}</span>
                <span style={{ fontSize: 18, color: 'rgba(210,140,170,0.6)', flexShrink: 0 }}>
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && <p className="belle-faq-a">A. {item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 男性版へのリンク ─── */}
      <section style={{ padding: '32px 20px 64px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(240,216,224,0.35)', marginBottom: 10 }}>
          男性の外見診断・分析をお探しの方は
        </p>
        <Link href="/" style={{ fontSize: 13, color: 'rgba(210,140,170,0.6)', textDecoration: 'underline' }}>
          Fineme（男性版）はこちら →
        </Link>
      </section>
    </main>
  );
}
