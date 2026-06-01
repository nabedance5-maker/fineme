import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const PROMO = {
  mirror: {
    badge: '🪞 FINEME MIRROR',
    title: '写真1枚で、\n「変われる余白」を地図にする。',
    cta: '無料で試す → fineme.me/mirror',
  },
  diagnosis: {
    badge: '🧭 FINEME — Me Scan',
    title: '何から始めるかを、\n3分の無料診断で。',
    cta: 'あなたも診断する → fineme.me/diagnosis',
  },
  philosophy: {
    badge: 'FINEME',
    title: '外見を起点に、\n自信を再設計する。',
    cta: 'fineme.me',
  },
  article: {
    badge: 'FINEME',
    title: '変わりたい男性のための、\n外見磨きの地図。',
    cta: 'fineme.me',
  },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'mirror';
  const p = PROMO[type] || PROMO.mirror;

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #04081a 0%, #0d1528 60%, #060c1a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden', padding: '70px',
      }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
        <div style={{
          fontSize: '22px', fontWeight: 800, color: '#c9a84c',
          letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '36px', display: 'flex',
        }}>
          {p.badge}
        </div>
        <div style={{
          fontSize: '58px', fontWeight: 900, color: '#fff',
          textAlign: 'center', lineHeight: 1.4, marginBottom: '44px',
          whiteSpace: 'pre-line', display: 'flex', flexDirection: 'column',
          fontFamily: 'Georgia, serif',
        }}>
          {p.title}
        </div>
        <div style={{
          padding: '16px 40px',
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          borderRadius: '10px', color: '#0a0f1e', fontWeight: 800, fontSize: '22px', display: 'flex',
        }}>
          {p.cta}
        </div>
        <div style={{
          position: 'absolute', bottom: '32px',
          fontSize: '14px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', display: 'flex',
        }}>
          fineme.me — 外見を起点に、自信を再設計する。
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
