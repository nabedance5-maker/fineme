import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const TYPE_LABELS = {
  tips:      { badge: 'TIPS',   color: '#10b981' },
  story:     { badge: 'STORY',  color: '#8b5cf6' },
  philosophy:{ badge: 'COLUMN', color: '#6b7280' },
};

const FALLBACK_TEXTS = {
  tips:       '外見磨きの、\n正しい順番がある。',
  story:      'あの日の帰り道、\n鏡が違って見えた。',
  philosophy: '外見を起点に、\n自信を再設計する。',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'tips';
  const hook = searchParams.get('hook') || '';

  const label = TYPE_LABELS[type] || TYPE_LABELS.tips;
  const displayText = hook.trim() || FALLBACK_TEXTS[type] || FALLBACK_TEXTS.tips;

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: '#0f172a',
        display: 'flex', flexDirection: 'column',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}>
        {/* プロフィール行 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '56px',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#1e293b',
            border: '2px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 800, color: '#94a3b8',
          }}>
            D
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>でお</span>
            <span style={{ fontSize: '15px', color: '#64748b' }}>@deo_fineme</span>
          </div>
        </div>

        {/* フックテキスト */}
        <div style={{
          flex: 1,
          fontSize: '52px', fontWeight: 800, color: '#f8fafc',
          lineHeight: 1.35, whiteSpace: 'pre-line',
          display: 'flex', alignItems: 'flex-start',
          letterSpacing: '-0.01em',
        }}>
          {displayText}
        </div>

        {/* 下部: 区切り + ブランド + タイプバッジ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #1e293b', paddingTop: '28px',
        }}>
          <span style={{ fontSize: '18px', color: '#475569', letterSpacing: '0.12em' }}>
            Fineme — 外見を起点に、自信を再設計する。
          </span>
          <div style={{
            padding: '8px 20px',
            background: label.color + '22',
            border: `1px solid ${label.color}55`,
            borderRadius: '6px',
            fontSize: '14px', fontWeight: 700, color: label.color,
            letterSpacing: '0.1em',
            display: 'flex',
          }}>
            {label.badge}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
