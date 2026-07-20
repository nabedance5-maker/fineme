'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const BELLE_FAQ = [
  {
    q: 'Belle Me Scanとは何ですか？',
    a: '女性の外見を7軸で自己診断する無料ツールです。メイク・肌・髪・眉・ファッション・爪・体型の現在地を把握し、あなたが最初に変えるべき場所（外見コンパス）を示します。約10分、登録不要で受けられます。',
  },
  {
    q: 'Belle Mirrorとは？',
    a: '写真を1枚アップロードするだけで、AIが外見の変容余地を分析します。「他の人の目に自分がどう見えているか」を可視化し、最も変わりやすい場所を正確に教えます。月額¥780のサブスクリプションです。',
  },
  {
    q: 'New Me Mapとは？',
    a: 'Me ScanとMirrorの両方のデータから生成される、あなただけの変容ロードマップです。「今日から一人でできること」から積み上げる25〜35ステップが届きます。サービス任せではなく、自走できる習慣を設計します。',
  },
  {
    q: '何から始めればいいですか？',
    a: 'Me Scan（無料・約10分）から始めることをおすすめします。診断後、あなたの「最初の一手」が明確になります。Mirrorはその後、他者目線での確認として受けると効果的です。',
  },
  {
    q: '写真は保存されますか？',
    a: 'Mirror分析に使用した写真は暗号化して保存されます。月次変化レポートで過去のMirrorと比較するために使用しますが、第三者に共有されることはありません。',
  },
];

const STEPS = [
  {
    num: '01',
    name: 'Me Scan',
    badge: '無料・約10分',
    desc: '7軸の質問に答えるだけで、外見の現在地と「最初に変えるべき場所」がわかる。今どこにいるかが見えなければ、どこへも進めない。',
    href: '/belle/diagnosis',
    cta: 'Me Scanを始める',
  },
  {
    num: '02',
    name: 'Mirror',
    badge: '¥780 / 月',
    desc: '写真を1枚送る。AIが他者目線で外見を分析し、変容余地の大きい場所を可視化する。自分では気づけない伸びしろが、数値と言葉で届く。',
    href: '/belle/mirror',
    cta: 'Mirrorで分析する',
  },
  {
    num: '03',
    name: 'New Me Map',
    badge: 'Me Scan + Mirror完了後',
    desc: '2つのデータから、あなただけの変容ロードマップが生成される。「今日から一人でできること」から積み上げる行動設計図。誰かに頼らず、自分で動き始められる。',
    href: '/belle/diagnosis',
    cta: 'まずMe Scanから始める',
  },
];

export default function BellePage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fineme:diagnosis:belle');
      if (raw) setDiagnosis(JSON.parse(raw));
    } catch {}
  }, []);

  const rose = 'rgba(200,100,140,1)';
  const roseFaint = 'rgba(200,100,140,0.15)';
  const roseBorder = 'rgba(200,100,140,0.25)';
  const ink = 'rgba(240,216,224,0.88)';
  const inkMuted = 'rgba(240,216,224,0.55)';

  return (
    <main style={{ background: '#0c0810', minHeight: '100vh', color: ink, fontFamily: '-apple-system, sans-serif' }}>
      <style>{`
        @keyframes belle-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes belle-orb { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }
        .b-fade { animation: belle-fade-up 0.7s ease both; }
        .b-fade-d1 { animation-delay: 0.1s; }
        .b-fade-d2 { animation-delay: 0.25s; }
        .b-fade-d3 { animation-delay: 0.4s; }
        .b-orb { animation: belle-orb 7s ease-in-out infinite; }
        .b-btn-primary {
          display: inline-block;
          background: linear-gradient(135deg, rgba(200,100,140,0.95), rgba(160,70,110,0.95));
          color: #fff;
          padding: 15px 32px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          border: 1px solid rgba(220,120,160,0.4);
          transition: opacity .2s;
        }
        .b-btn-primary:hover { opacity: .88; }
        .b-btn-ghost {
          display: inline-block;
          background: rgba(200,100,140,0.07);
          color: rgba(240,216,224,0.85);
          padding: 15px 32px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          border: 1px solid rgba(200,100,140,0.28);
          transition: opacity .2s;
        }
        .b-btn-ghost:hover { opacity: .8; }
        .b-step-card {
          background: rgba(200,100,140,0.04);
          border: 1px solid rgba(200,100,140,0.18);
          border-radius: 16px;
          padding: clamp(20px,4vw,28px);
          flex: 1;
          min-width: 0;
        }
        .b-empathy-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px 16px;
          background: rgba(200,100,140,0.04);
          border: 1px solid rgba(200,100,140,0.12);
          border-radius: 10px;
        }
        .b-faq-item { border-bottom: 1px solid rgba(200,100,140,0.15); }
        .b-faq-q {
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
        .b-faq-a {
          font-size: 13px;
          line-height: 1.85;
          color: rgba(240,216,224,0.6);
          padding: 0 4px 18px;
        }
        @media (max-width: 640px) {
          .b-steps-grid { flex-direction: column !important; }
        }
      `}</style>

      {/* ── ① ヒーロー ── */}
      <section style={{
        minHeight: 'min(90vh, 720px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 'clamp(80px,14vw,120px) 20px clamp(60px,10vw,90px)',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(rgba(10,6,16,0.68) 0%, rgba(12,8,16,0.82) 100%), url(/assets/images/belle-lp-hero-bg.jpg) center/cover no-repeat',
      }}>
        <div className="b-orb" style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: 'clamp(500px, 80vw, 900px)', height: 'clamp(500px, 80vw, 900px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,100,140,0.10) 0%, rgba(160,60,100,0.04) 45%, transparent 68%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, width: '100%' }}>
          <p className="b-fade" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(210,140,170,0.8)', textTransform: 'uppercase', margin: '0 0 24px' }}>
            Fineme Belle
          </p>
          <h1 className="b-fade b-fade-d1" style={{
            fontFamily: '"Noto Serif JP", Georgia, serif',
            fontSize: 'clamp(26px, 6vw, 50px)',
            fontWeight: 700, lineHeight: 1.45, color: '#f5e0ea', margin: '0 0 28px',
          }}>
            誰かに選ばれるために、<br />
            磨くんじゃない。<br />
            <span style={{ color: 'rgba(220,140,175,0.95)' }}>
              自分が自分を幸せにすると<br />決めた日から、外見は変わる。
            </span>
          </h1>
          <p className="b-fade b-fade-d2" style={{ fontSize: 'clamp(14px,2.5vw,17px)', color: inkMuted, lineHeight: 1.9, margin: '0 0 40px' }}>
            でも、何から始めればいいかわからなかった。<br />
            Belleは、その「どこから」を一緒に見つける。
          </p>

          {diagnosis ? (
            <div className="b-fade b-fade-d3" style={{
              background: roseFaint, border: `1px solid ${roseBorder}`,
              borderRadius: 14, padding: '24px 20px', maxWidth: 460, margin: '0 auto',
            }}>
              <p style={{ fontSize: 13, color: inkMuted, margin: '0 0 10px' }}>診断済み — 変容の地図があります</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f5e0ea', margin: '0 0 18px' }}>続きから始める</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/belle/diagnosis/result" className="b-btn-primary">New Me Naviを見る</Link>
                <Link href="/belle/mirror" className="b-btn-ghost">📸 Mirrorで写真分析</Link>
              </div>
            </div>
          ) : (
            <div className="b-fade b-fade-d3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/belle/diagnosis" className="b-btn-primary">🧬 Me Scanを始める（無料）</Link>
              <Link href="/belle/mirror" className="b-btn-ghost">📸 Mirrorで写真分析</Link>
            </div>
          )}

          <p className="b-fade b-fade-d3" style={{ fontSize: 12, color: 'rgba(240,216,224,0.3)', margin: '16px 0 0' }}>
            Me Scan：約10分 · 無料 · 登録不要
          </p>
        </div>
      </section>

      {/* ── ② 共感 ── */}
      <section style={{ padding: 'clamp(56px,8vw,80px) 20px', background: 'rgba(15,8,14,0.8)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(210,140,170,0.7)', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
            こんな気持ち、ありませんか
          </p>
          <h2 style={{ fontFamily: '"Noto Serif JP", Georgia, serif', fontSize: 'clamp(19px,3.5vw,26px)', fontWeight: 700, color: '#f5e0ea', textAlign: 'center', margin: '0 0 36px', lineHeight: 1.5 }}>
            外見を変えたいと、ずっと思っていた。<br />でも、手が出なかった。
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '何から始めればいいかわからないまま、時間だけが過ぎた',
              'サロンに行っても、自分に何が合っているかわからなかった',
              '「変わりたい」気持ちだけが空回りして、結局何も変わらなかった',
            ].map((text, i) => (
              <div key={i} className="b-empathy-item">
                <span style={{ color: 'rgba(200,100,140,0.7)', fontSize: 18, flexShrink: 0, marginTop: 1 }}>—</span>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: inkMuted, margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f5e0ea', textAlign: 'center', margin: '36px 0 0', lineHeight: 1.7, fontFamily: '"Noto Serif JP", Georgia, serif' }}>
            「どこから」がわかれば、今日から動ける。<br />
            <span style={{ color: 'rgba(220,140,175,0.9)' }}>Belleはその「どこから」を、正確に見つける。</span>
          </p>
        </div>
      </section>

      {/* ── ③ 3ステップ ── */}
      <section style={{ padding: 'clamp(56px,8vw,80px) 20px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(210,140,170,0.7)', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>
            How it works
          </p>
          <h2 style={{ fontFamily: '"Noto Serif JP", Georgia, serif', fontSize: 'clamp(19px,3.5vw,26px)', fontWeight: 700, color: '#f5e0ea', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.5 }}>
            3つのステップで、変容の地図が手に入る。
          </h2>
          <div className="b-steps-grid" style={{ display: 'flex', gap: 16 }}>
            {STEPS.map((s) => (
              <div key={s.num} className="b-step-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(200,100,140,0.6)' }}>STEP {s.num}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(200,100,140,0.7)', border: '1px solid rgba(200,100,140,0.3)', borderRadius: 20, padding: '2px 9px' }}>{s.badge}</span>
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#f5e0ea', margin: '0 0 12px', fontFamily: '"Noto Serif JP", Georgia, serif' }}>{s.name}</p>
                <p style={{ fontSize: 13, color: inkMuted, lineHeight: 1.75, margin: '0 0 20px' }}>{s.desc}</p>
                <Link href={s.href} style={{ fontSize: 13, color: 'rgba(220,140,175,0.85)', textDecoration: 'none', fontWeight: 700 }}>
                  {s.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ④ Mirror詳細 ── */}
      <section style={{ padding: 'clamp(56px,8vw,80px) 20px', background: 'rgba(15,8,14,0.8)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(210,140,170,0.7)', textTransform: 'uppercase', margin: '0 0 12px' }}>Mirror</p>
          <h2 style={{ fontFamily: '"Noto Serif JP", Georgia, serif', fontSize: 'clamp(19px,3.5vw,26px)', fontWeight: 700, color: '#f5e0ea', margin: '0 0 16px', lineHeight: 1.5 }}>
            「他人の目に自分がどう見えているか」を<br />初めて正確に知る。
          </h2>
          <p style={{ fontSize: 14, color: inkMuted, lineHeight: 1.85, margin: '0 0 36px' }}>
            自分の外見は、自分では正確に見えない。<br />
            Mirrorは写真1枚から、メイク・肌・髪・眉・ファッション・表情の6軸で分析し、<br />
            「今のあなたが最も変わりやすい場所」を数値と言葉で届ける。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 36, textAlign: 'left' }}>
            {[
              { axis: 'メイク', desc: '印象を操作できているか' },
              { axis: '肌感', desc: '清潔感・ツヤ・透明度' },
              { axis: 'ヘア', desc: 'スタイリングと似合う形' },
              { axis: '眉', desc: '顔の印象を決める軸' },
              { axis: 'ファッション', desc: '自分らしさと清潔感' },
              { axis: '表情', desc: '第一印象の温度感' },
            ].map((item) => (
              <div key={item.axis} style={{ background: roseFaint, border: `1px solid ${roseBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#f5e0ea', margin: '0 0 4px' }}>{item.axis}</p>
                <p style={{ fontSize: 11, color: inkMuted, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/belle/mirror" className="b-btn-primary">📸 Mirrorで写真分析する（¥780/月）</Link>
          <p style={{ fontSize: 12, color: 'rgba(240,216,224,0.3)', margin: '12px 0 0' }}>いつでもキャンセル可 · 写真は暗号化保存</p>
        </div>
      </section>

      {/* ── ⑤ 最終CTA ── */}
      <section style={{ padding: 'clamp(64px,10vw,96px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Noto Serif JP", Georgia, serif', fontSize: 'clamp(20px,4vw,30px)', fontWeight: 700, color: '#f5e0ea', margin: '0 0 16px', lineHeight: 1.5 }}>
            自分のために磨くと決めた日が、<br />
            <span style={{ color: 'rgba(220,140,175,0.95)' }}>変わり始める最初の日になる。</span>
          </h2>
          <p style={{ fontSize: 14, color: inkMuted, lineHeight: 1.85, margin: '0 0 36px' }}>
            まず、外見の現在地を知ることから始める。<br />10分の診断が、最初の一手を教えてくれる。
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/belle/diagnosis" className="b-btn-primary">🧬 Me Scanを始める（無料）</Link>
            <Link href="/belle/mirror" className="b-btn-ghost">📸 Mirrorで写真分析</Link>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(240,216,224,0.28)', margin: '16px 0 0' }}>
            Me Scan：約10分 · 無料 · 登録不要
          </p>
        </div>
      </section>

      {/* ── ⑥ FAQ ── */}
      <section style={{ padding: 'clamp(48px,7vw,72px) 20px 80px', background: 'rgba(15,8,14,0.6)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(210,140,170,0.7)', textTransform: 'uppercase', margin: '0 0 8px', textAlign: 'center' }}>FAQ</p>
          <h2 style={{ fontFamily: '"Noto Serif JP", Georgia, serif', fontSize: 'clamp(17px,2.5vw,21px)', fontWeight: 700, color: '#f5e0ea', textAlign: 'center', margin: '0 0 32px' }}>よくある質問</h2>
          {BELLE_FAQ.map((item, i) => (
            <div key={i} className="b-faq-item">
              <button className="b-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>Q. {item.q}</span>
                <span style={{ fontSize: 18, color: 'rgba(210,140,170,0.6)', flexShrink: 0 }}>
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && <p className="b-faq-a">A. {item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── フッターリンク ── */}
      <section style={{ padding: '24px 20px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,216,224,0.28)', marginBottom: 8 }}>
          男性向け外見診断・分析をお探しの方
        </p>
        <Link href="/" style={{ fontSize: 13, color: 'rgba(210,140,170,0.5)', textDecoration: 'underline' }}>
          Finemeトップページへ →
        </Link>
      </section>
    </main>
  );
}
