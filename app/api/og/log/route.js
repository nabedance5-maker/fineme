// GET /api/og/log
// /log の OG画像。SNSに貼られた時に「月にいくら使っているか」が最初に目に入るようにする。
//
// 背景は Log の FVカードと同じ羊皮紙（Canvaで作った案3から文字を削除したもの）。
// 既定はサンプル値。?m= &y= &p= &r= で差し替えできる。
// r = 実際の内訳（[{icon,label,v}]をJSON→encodeURIComponent）。SNSシェア画像生成用（Log FVカード「シェア/保存」ボタン）
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BG = 'https://www.fineme.me/assets/images/log-parchment-v2.webp';
const INK = '#472000';
const INK_SOFT = 'rgba(71,48,32,0.85)';
const INK_FAINT = 'rgba(71,48,32,0.7)';

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

  let rows = SAMPLE_ROWS;
  const rParam = searchParams.get('r');
  if (rParam) {
    try {
      const parsed = JSON.parse(rParam);
      if (Array.isArray(parsed) && parsed.length) {
        rows = parsed.slice(0, 4).map(r => ({
          icon: String(r.icon || '✦').slice(0, 4),
          label: String(r.label || '').slice(0, 20),
          v: Math.max(0, parseInt(r.v) || 0),
        }));
      }
    } catch {}
  }

  const now = new Date();
  const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px', display: 'flex', position: 'relative',
        overflow: 'hidden', fontFamily: 'serif', background: '#c6b083',
      }}>
        {/* 羊皮紙の背景。縦長画像を横長OGに敷くため上下を切って中央を使う */}
        <img src={BG} width={1200} height={1500} style={{ position: 'absolute', top: -430, left: 0 }} />

        {/* 左：金額 */}
        <div style={{ position: 'absolute', top: 0, left: 96, bottom: 0, width: 520,
                      display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 26, letterSpacing: '0.24em', color: INK_SOFT, display: 'flex', marginBottom: 18 }}>
            自分への投資
          </div>
          <div style={{ fontSize: 116, color: INK, lineHeight: 1, display: 'flex' }}>
            {yen(monthly)}
          </div>
          <div style={{ fontSize: 24, letterSpacing: '0.14em', color: INK_SOFT, display: 'flex', marginTop: 20 }}>
            1ヶ月あたり
          </div>
          <div style={{ fontSize: 21, color: INK_FAINT, display: 'flex', marginTop: 26 }}>
            このまま1年で {yen(yearly)}
          </div>
        </div>

        {/* 右：投資記録 */}
        <div style={{ position: 'absolute', top: 0, right: 96, bottom: 0, width: 420,
                      display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, letterSpacing: '0.3em', color: INK_SOFT, display: 'flex',
                        justifyContent: 'center', marginBottom: 24 }}>
            投 資 記 録
          </div>
          {rows.map((r) => (
            <div key={r.label} style={{
              display: 'flex', alignItems: 'baseline', marginBottom: 16,
              borderBottom: '1px solid rgba(71,48,32,0.35)', paddingBottom: 8,
            }}>
              <div style={{ fontSize: 20, width: 32, display: 'flex' }}>{r.icon}</div>
              <div style={{ fontSize: 19, color: INK_SOFT, display: 'flex' }}>{r.label}</div>
              <div style={{ flex: 1, display: 'flex' }} />
              <div style={{ fontSize: 20, color: INK, display: 'flex' }}>{yen(r.v)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
            <div style={{ fontSize: 17, color: INK_SOFT, display: 'flex' }}>{ports}つの港を巡っている</div>
            <div style={{ fontSize: 14, letterSpacing: '0.18em', color: INK_FAINT, display: 'flex' }}>fineme.me</div>
          </div>
        </div>

        {/* 上部：ブランドと日付 */}
        <div style={{ position: 'absolute', top: 46, left: 96, fontSize: 22, letterSpacing: '0.1em', color: INK_SOFT, display: 'flex' }}>
          New Me Log
        </div>
        <div style={{ position: 'absolute', top: 50, right: 96, fontSize: 18, letterSpacing: '0.08em', color: INK_FAINT, display: 'flex' }}>
          {ym}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
