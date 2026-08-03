import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Pinterest推奨比率2:3の縦長画像。source別に背景トーンとバッジを変える。
const SOURCE_STYLE = {
  types:   { badge: '136タイプ診断', color: '#c9a84c', bg: '#0a0f1e' },
  log:     { badge: 'New Me Log',   color: '#50c88c', bg: '#0a1f18' },
  mirror:  { badge: 'Mirror',       color: '#7aa6e8', bg: '#0a0f1e' },
};

const FALLBACK_TEXTS = {
  types:  '136タイプ診断で、\n自分の"今"が分かる。',
  log:    '美容代、\n月いくらか知ってる？',
  mirror: '写真1枚で、\n変われる余白が見える。',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'types';
  const hook = searchParams.get('hook') || '';
  const style = SOURCE_STYLE[source] || SOURCE_STYLE.types;
  const displayText = hook.trim() || FALLBACK_TEXTS[source] || FALLBACK_TEXTS.types;

  return new ImageResponse(
    (
      <div style={{
        width: '1000px', height: '1500px',
        background: style.bg,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '90px 64px',
        fontFamily: 'sans-serif',
      }}>
        <div style={{
          display: 'flex',
          padding: '10px 22px',
          background: style.color + '22',
          border: `1px solid ${style.color}66`,
          borderRadius: '999px',
          fontSize: '22px', fontWeight: 800, color: style.color,
          letterSpacing: '0.06em',
          alignSelf: 'flex-start',
        }}>
          {style.badge}
        </div>

        <div style={{
          display: 'flex',
          fontSize: '68px', fontWeight: 900, color: '#f8f6f0',
          lineHeight: 1.4, whiteSpace: 'pre-line',
          letterSpacing: '-0.01em',
        }}>
          {displayText}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px',
          borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '32px',
        }}>
          <span style={{ fontSize: '30px', fontWeight: 800, color: '#f8f6f0' }}>Fineme</span>
          <span style={{ fontSize: '22px', color: 'rgba(248,246,240,0.55)' }}>
            外見を起点に、自信を再設計する。fineme.me
          </span>
        </div>
      </div>
    ),
    { width: 1000, height: 1500 }
  );
}
