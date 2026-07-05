import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title    = searchParams.get('title')    || '外見磨きの、正しい順番がある。';
  const category = searchParams.get('category') || '';

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1a35 60%, #1a1035 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '64px 88px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}>
        {/* ゴールドライン */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, #c9a84c, #e8c878, #c9a84c)',
          display: 'flex',
        }} />

        {/* カテゴリバッジ */}
        {category ? (
          <div style={{
            display: 'flex', alignItems: 'center', marginBottom: '28px',
          }}>
            <div style={{
              border: '1px solid #c9a84c',
              borderRadius: '6px',
              padding: '4px 14px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#c9a84c',
              letterSpacing: '0.06em',
              display: 'flex',
            }}>
              {category}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '28px', display: 'flex' }} />
        )}

        {/* タイトル */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center',
          fontSize: title.length > 22 ? '44px' : '52px',
          fontWeight: 800,
          color: '#f8fafc',
          lineHeight: 1.45,
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
            記事
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
