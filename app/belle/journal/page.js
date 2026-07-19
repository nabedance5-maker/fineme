import Link from 'next/link';

export const metadata = {
  title: 'Belle Journal | Fineme Belle',
  description: 'Fineme Belle の女性向けジャーナル。外見を起点に自信を再設計するためのコンテンツを準備中です。',
};

export default function BelleJournalPage() {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(200,100,140,0.7)', textTransform: 'uppercase', margin: '0 0 16px' }}>
          Belle Journal
        </p>
        <h1 style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 700, color: 'rgba(240,216,224,0.90)', margin: '0 0 20px', lineHeight: 1.4 }}>
          準備中です
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(240,216,224,0.55)', lineHeight: 1.8, margin: '0 0 40px' }}>
          女性向けの外見・自信・生き方に関するコンテンツを<br />
          準備しています。もうしばらくお待ちください。
        </p>
        <Link href="/belle/diagnosis"
          style={{ display: 'inline-block', background: 'linear-gradient(135deg,#c8648c,#e8789e)', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
          Me Scan を受ける →
        </Link>
      </div>
    </main>
  );
}
