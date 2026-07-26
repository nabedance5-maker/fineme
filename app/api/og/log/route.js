// GET /api/og/log
// /log の OG画像。SNSに貼られた時に「月にいくら使っているか」が最初に目に入るようにする。
//
// Fineme 側がシェアする素材なので、既定はサンプル値で描く。
// ?m=23536&y=282400 のようにクエリで差し替えもできる。
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const GOLD = '#c9a84c';
const GOLD_BRIGHT = '#e8c86a';
const INK = '#0a0f1e';

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
  const max = SAMPLE_ROWS[0].v;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px', background: INK,
          display: 'flex', position: 'relative', fontFamily: 'sans-serif',
          padding: '48px 56px', overflow: 'hidden',
        }}
      >
        {/* 海図の地色 */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(120% 80% at 22% 18%, rgba(30,48,84,0.55) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'radial-gradient(90% 70% at 82% 88%, rgba(24,38,68,0.5) 0%, transparent 62%)',
        }} />

        {/* 四隅の枠 */}
        <div style={{ position: 'absolute', top: 26, left: 26, width: 40, height: 40, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: 0.5, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 26, right: 26, width: 40, height: 40, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: 0.5, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 26, left: 26, width: 40, height: 40, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: 0.5, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 26, right: 26, width: 40, height: 40, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: 0.5, display: 'flex' }} />

        {/* 左：金額 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '40px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.72)', display: 'flex', marginBottom: 26 }}>
            NEW ME LOG
          </div>
          <div style={{ fontSize: 21, letterSpacing: '0.24em', color: 'rgba(232,228,220,0.5)', display: 'flex', marginBottom: 14 }}>
            自分への投資
          </div>
          <div style={{ fontSize: 108, fontWeight: 700, color: GOLD_BRIGHT, lineHeight: 1, display: 'flex' }}>
            {yen(monthly)}
          </div>
          <div style={{ fontSize: 20, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', display: 'flex', marginTop: 16 }}>
            1ヶ月あたり
          </div>
          <div style={{
            marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(201,168,76,0.2)',
            fontSize: 21, color: 'rgba(232,228,220,0.5)', display: 'flex', width: 330,
          }}>
            このまま1年で {yen(yearly)}
          </div>
        </div>

        {/* 右：内訳 */}
        <div style={{ flex: '0 0 430px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 15, letterSpacing: '0.22em', color: 'rgba(201,168,76,0.5)', display: 'flex', marginBottom: 20 }}>
            内訳
          </div>
          {SAMPLE_ROWS.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 22, width: 34, display: 'flex' }}>{r.icon}</div>
              <div style={{ fontSize: 19, color: 'rgba(232,228,220,0.66)', width: 132, display: 'flex' }}>{r.label}</div>
              <div style={{ flex: 1, height: 5, background: 'rgba(232,228,220,0.08)', borderRadius: 99, display: 'flex', marginRight: 14 }}>
                <div style={{ width: `${Math.max(8, Math.round((r.v / max) * 100))}%`, height: '100%', background: GOLD, borderRadius: 99, display: 'flex' }} />
              </div>
              <div style={{ fontSize: 18, color: 'rgba(232,228,220,0.55)', width: 82, display: 'flex', justifyContent: 'flex-end' }}>
                {yen(r.v)}
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(201,168,76,0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 19, color: 'rgba(232,228,220,0.55)', display: 'flex' }}>{ports}つの港を巡っている</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', display: 'flex' }}>fineme.me</div>
          </div>
        </div>

        {/* 日付 */}
        <div style={{ position: 'absolute', top: 52, right: 60, fontSize: 16, letterSpacing: '0.1em', color: 'rgba(232,228,220,0.3)', display: 'flex' }}>
          {ym}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
