import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { slugHash, unsplashUrl } from '@/lib/thumbnail-photos';
import { pickCuratedPhotoId } from '@/lib/curated-photos';

// でお指摘2026-08-06：自動生成画像（X/note/Pinterest）の質が低く一枚も採用されていなかった。
// 平坦な単色背景をやめ、目視確認済みの写真を全面に敷いた編集誌クオリティの構図に変更。
export const dynamic = 'force-dynamic';

const TYPE_LABELS = {
  tips:       { badge: 'TIPS',       color: '#10b981' },
  story:      { badge: 'STORY',      color: '#8b5cf6' },
  philosophy: { badge: 'COLUMN',     color: '#6b7280' },
  experience: { badge: 'REAL VOICE', color: '#c9a84c' },
};

const FALLBACK_TEXTS = {
  tips:       '外見磨きの、\n正しい順番がある。',
  story:      'あの日の帰り道、\n鏡が違って見えた。',
  philosophy: '外見を起点に、\n自信を再設計する。',
  experience: '変えたのは、\n1点だけだった。',
};

async function toPngDataUri(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).resize(1200, 630, { fit: 'cover' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'tips';
  const hook = searchParams.get('hook') || '';

  const label = TYPE_LABELS[type] || TYPE_LABELS.tips;
  const displayText = hook.trim() || FALLBACK_TEXTS[type] || FALLBACK_TEXTS.tips;

  const seed = slugHash(displayText + type);
  const id = pickCuratedPhotoId(seed % 2 === 1 ? 'belle' : 'fineme', seed);
  const photoUrl = unsplashUrl(id, '&w=1200&h=630&q=80');

  let imageDataUri;
  try {
    imageDataUri = await toPngDataUri(photoUrl);
  } catch (e) {
    console.error('[og/x-promo] image fetch/convert error:', e.message);
  }

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        position: 'relative',
        display: 'flex',
        background: '#0f172a',
        fontFamily: 'sans-serif',
      }}>
        {imageDataUri && (
          <img
            src={imageDataUri}
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, top: '30%',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '0 80px 44px',
          background: 'linear-gradient(to top, rgba(15,23,42,0.95) 25%, rgba(15,23,42,0.55) 65%, rgba(15,23,42,0) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#1e293b', border: '2px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: '#94a3b8',
            }}>D</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>でお</span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>@deo_fineme</span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start',
            fontSize: '42px', fontWeight: 800, color: '#f8fafc',
            lineHeight: 1.35, whiteSpace: 'pre-line', letterSpacing: '-0.01em',
            marginBottom: '20px',
          }}>
            {displayText}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '18px',
          }}>
            <span style={{ fontSize: '15px', color: 'rgba(232,228,220,0.55)', letterSpacing: '0.1em' }}>
              Fineme — 外見を起点に、自信を再設計する。
            </span>
            <div style={{
              padding: '6px 16px',
              background: label.color + '22',
              border: `1px solid ${label.color}66`,
              borderRadius: '6px',
              fontSize: '12px', fontWeight: 700, color: label.color,
              letterSpacing: '0.1em',
              display: 'flex',
            }}>
              {label.badge}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
