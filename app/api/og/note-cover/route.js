import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { slugHash, unsplashUrl } from '@/lib/thumbnail-photos';
import { pickCuratedPhotoId } from '@/lib/curated-photos';

// でお指摘2026-08-06：自動生成画像（note/X/Pinterest）の質が低く一枚も採用されていなかった。
// 平坦なグラデーション背景をやめ、目視確認済みの写真を全面に敷いた編集誌クオリティの構図に変更。
// next/ogのレンダラー(Satori)がリモートJPEGを不安定にしか扱えないため、sharpで事前にdata URI化する。
export const dynamic = 'force-dynamic';

async function toPngDataUri(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).resize(1280, 670, { fit: 'cover' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '外見磨きの、正しい順番がある。';
  const seed = slugHash(title);
  const id = pickCuratedPhotoId(seed % 2 === 1 ? 'belle' : 'fineme', seed);
  const photoUrl = unsplashUrl(id, '&w=1280&h=670&q=80');

  let imageDataUri;
  try {
    imageDataUri = await toPngDataUri(photoUrl);
  } catch (e) {
    console.error('[og/note-cover] image fetch/convert error:', e.message);
  }

  return new ImageResponse(
    (
      <div style={{
        width: '1280px', height: '670px',
        position: 'relative',
        display: 'flex',
        background: '#0a0f1e',
        fontFamily: 'sans-serif',
      }}>
        {imageDataUri && (
          <img
            src={imageDataUri}
            width={1280}
            height={670}
            style={{ position: 'absolute', top: 0, left: 0, width: '1280px', height: '670px', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, #c9a84c, #e8c878, #c9a84c)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, top: '38%',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '0 96px 44px',
          background: 'linear-gradient(to top, rgba(10,15,30,0.95) 25%, rgba(10,15,30,0.55) 65%, rgba(10,15,30,0) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#1e293b', border: '2px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: '#94a3b8',
            }}>D</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>でお</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>抜けアドバイザー</span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center',
            fontSize: title.length > 28 ? '38px' : '46px',
            fontWeight: 800, color: '#f8fafc', lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}>
            {title}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '18px', marginTop: '22px',
          }}>
            <span style={{ fontSize: '14px', color: 'rgba(232,228,220,0.6)', letterSpacing: '0.06em' }}>
              Fineme — 外見を起点に、自信を再設計する。
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#c9a84c', letterSpacing: '0.06em' }}>note</span>
          </div>
        </div>
      </div>
    ),
    { width: 1280, height: 670 }
  );
}
