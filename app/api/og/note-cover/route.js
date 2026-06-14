import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '外見磨きの、正しい順番がある。';

  return new ImageResponse(
    (
      <div style={{
        width: '1280px', height: '670px',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1a35 60%, #1a1035 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '72px 96px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}>
        {/* 装飾ライン */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, #c9a84c, #e8c878, #c9a84c)',
          display: 'flex',
        }} />

        {/* プロフィール行 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '52px',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#1e293b',
            border: '2px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 800, color: '#94a3b8',
          }}>D</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>でお</span>
            <span style={{ fontSize: '14px', color: '#64748b' }}>抜けアドバイザー</span>
          </div>
        </div>

        {/* タイトル */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          fontSize: title.length > 28 ? '42px' : '52px',
          fontWeight: 800,
          color: '#f8fafc',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
        }}>
          {title}
        </div>

        {/* 下部バー */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #1e293b', paddingTop: '24px',
        }}>
          <span style={{ fontSize: '15px', color: '#475569', letterSpacing: '0.08em' }}>
            Fineme — 外見を起点に、自信を再設計する。
          </span>
          <span style={{
            fontSize: '14px', fontWeight: 700, color: '#c9a84c',
            letterSpacing: '0.06em',
            display: 'flex',
          }}>
            note
          </span>
        </div>
      </div>
    ),
    { width: 1280, height: 670 }
  );
}
