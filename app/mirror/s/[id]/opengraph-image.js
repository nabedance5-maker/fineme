import { ImageResponse } from 'next/og';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LEVEL_COLOR = { '高': '#c9a84c', '中': '#7aadff', '低': '#50c88c' };

export default async function Image({ params }) {
  let analysis = null;
  try {
    const { data } = await getSupabase()
      .from('mirror_sessions')
      .select('analysis')
      .eq('id', params.id)
      .single();
    analysis = data?.analysis || null;
  } catch {}

  const fi = analysis?.first_impression
    ? String(analysis.first_impression).slice(0, 80)
    : '写真1枚で、AIが「変われる余白」を地図にする。';
  const axes = (analysis?.axes || []).filter(a => a.id !== 'overall').slice(0, 7);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: 'linear-gradient(135deg, #080d1a 0%, #0d1528 60%, #060c1a 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
          padding: '60px',
        }}
      >
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />

        <div style={{
          fontSize: '18px', fontWeight: 800, color: '#c9a84c',
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px',
          display: 'flex',
        }}>
          🪞 FINEME MIRROR — 変容余地マップ
        </div>

        <div style={{
          fontSize: '30px', fontWeight: 800, color: 'rgba(240,236,228,0.92)',
          textAlign: 'center', lineHeight: 1.5, marginBottom: '36px',
          maxWidth: '900px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          「{fi}」
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', marginBottom: '40px' }}>
          {axes.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '30px',
              background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${LEVEL_COLOR[a.potential_level] || '#7aadff'}`,
            }}>
              <span style={{ fontSize: '22px' }}>{a.icon || '•'}</span>
              <span style={{ fontSize: '20px', color: '#fff', fontWeight: 700 }}>{a.name}</span>
              <span style={{ fontSize: '18px', color: LEVEL_COLOR[a.potential_level] || '#7aadff', fontWeight: 800 }}>
                {a.potential_level || ''}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          padding: '14px 36px',
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          borderRadius: '8px', color: '#0a0f1e', fontWeight: 800, fontSize: '18px',
          display: 'flex',
        }}>
          あなたも無料で試す → fineme.me/mirror
        </div>

        <div style={{
          position: 'absolute', bottom: '28px',
          fontSize: '12px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
          display: 'flex',
        }}>
          fineme.me — 外見を起点に、自信を再設計する。
        </div>
      </div>
    ),
    { ...size }
  );
}
