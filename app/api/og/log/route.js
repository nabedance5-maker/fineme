// GET /api/og/log
// /log の OG画像。SNSに貼られた時に「月にいくら使っているか」が最初に目に入るようにする。
//
// 見た目は Log の FVカードと同じ羊皮紙（航海日誌）。
// Fineme 側がシェアする素材なので、既定はサンプル値で描く。
// ?m=23536&y=282400&p=5 で差し替えもできる。
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const INK = '#3a2712';
const INK_SOFT = 'rgba(63,45,24,0.72)';
const INK_FAINT = 'rgba(90,66,34,0.55)';
const LINE = 'rgba(90,66,34,0.45)';

const SAMPLE_ROWS = [
  { icon: '💅', label: '爪・ネイル', v: 8690 },
  { icon: '💇', label: '髪・美容室', v: 7604 },
  { icon: '✂️', label: '眉', v: 7242 },
  { icon: '💪', label: '体型・ジム', v: 4000 },
];

const yen = (n) => `¥${Number(n).toLocaleString('en-US')}`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const monthly = parseInt(searchParams.get('m')) || 23536;
  const yearly = parseInt(searchParams.get('y')) || monthly * 12;
  const ports = parseInt(searchParams.get('p')) || 5;

  const now = new Date();
  const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          display: 'flex', position: 'relative', fontFamily: 'serif',
          padding: '46px 60px', overflow: 'hidden',
          // 中央が明るく、外側が焼けた羊皮紙
          background: 'radial-gradient(70% 62% at 50% 42%, #e2d4b0 0%, #d2bf94 45%, #b99f70 78%, #9c7f52 100%)',
          color: INK,
        }}
      >
        {/* 縁の焼け */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(62% 62% at 50% 44%, rgba(74,44,16,0) 46%, rgba(74,44,16,0.55) 100%)',
        }} />

        {/* 二重の装飾枠 */}
        <div style={{ position: 'absolute', top: 20, left: 24, right: 24, bottom: 20, border: `2px solid ${LINE}`, borderRadius: 4, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 27, left: 31, right: 31, bottom: 27, border: `1px solid rgba(90,66,34,0.3)`, borderRadius: 2, display: 'flex' }} />

        {/* 左：金額 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 24, paddingRight: 34 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.3em', color: INK_FAINT, display: 'flex', marginBottom: 26 }}>
            NEW ME LOG
          </div>
          <div style={{ fontSize: 21, letterSpacing: '0.3em', color: INK_SOFT, display: 'flex', marginBottom: 16 }}>
            自分への投資
          </div>
          <div style={{ fontSize: 112, fontWeight: 700, color: INK, lineHeight: 1, display: 'flex' }}>
            {yen(monthly)}
          </div>
          <div style={{ fontSize: 20, letterSpacing: '0.22em', color: INK_SOFT, display: 'flex', marginTop: 18 }}>
            1ヶ月あたり
          </div>
          <div style={{
            marginTop: 28, paddingTop: 20, borderTop: `1px solid ${LINE}`,
            fontSize: 21, color: INK_SOFT, display: 'flex', width: 340,
          }}>
            このまま1年で {yen(yearly)}
          </div>
        </div>

        {/* 右：投資記録（リーダー線でつなぐ） */}
        <div style={{ flex: '0 0 440px', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 24 }}>
          <div style={{ fontSize: 17, letterSpacing: '0.3em', color: INK_SOFT, display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
            投 資 記 録
          </div>
          {SAMPLE_ROWS.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 22, width: 34, display: 'flex' }}>{r.icon}</div>
              <div style={{ fontSize: 20, color: INK_SOFT, display: 'flex' }}>{r.label}</div>
              <div style={{ flex: 1, height: 1, borderBottom: `1px dotted ${LINE}`, display: 'flex', margin: '0 12px', transform: 'translateY(6px)' }} />
              <div style={{ fontSize: 21, color: INK, display: 'flex' }}>{yen(r.v)}</div>
            </div>
          ))}
          <div style={{
            marginTop: 22, paddingTop: 18, borderTop: `1px solid ${LINE}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 19, color: INK_SOFT, display: 'flex' }}>{ports}つの港を巡っている</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', color: INK_FAINT, display: 'flex' }}>fineme.me</div>
          </div>
        </div>

        {/* 日付 */}
        <div style={{ position: 'absolute', top: 52, right: 66, fontSize: 17, letterSpacing: '0.1em', color: INK_FAINT, display: 'flex' }}>
          {ym}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
