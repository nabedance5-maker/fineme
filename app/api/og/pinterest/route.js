import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { TYPE_CODES } from '@/lib/type-codes';
import { unsplashUrl } from '@/lib/thumbnail-photos';
import { pickCuratedPhotoId } from '@/lib/curated-photos';

// next/ogのレンダラー(Satori)はWebPを直接デコードできないため、Node runtimeで
// sharpにより事前にPNGへ変換しdata URIとして埋め込む（edge runtimeでは使えない）。
export const dynamic = 'force-dynamic';

// Pinterestは「文字カード」ではなく画像そのものが主役（Instagram的アプローチ）。
// でおフィードバック2026-08-06：「クオリティがゴミ」「画像9割のインスタ的アプローチが必要」
// を受けて、Canvaで方向性を確認した構図（実イラスト/写真を全面に敷き、下部に薄い帯で
// 最小限のキャプションのみ）を再現する。大きな見出しテキストは置かない。

const SOURCE_LABEL = {
  types: '136タイプ診断',
  log:   'New Me Log',
  mirror: 'Mirror',
};

function pickImageSourceUrl(source, seed) {
  const isBelle = seed % 2 === 1;
  if (source === 'types') {
    const code = TYPE_CODES[seed % TYPE_CODES.length];
    const path = isBelle ? `/images/types/belle/TYPE-${code}.webp` : `/images/types/TYPE-${code}.webp`;
    return `https://www.fineme.me${path}`;
  }
  const id = pickCuratedPhotoId(isBelle ? 'belle' : 'fineme', seed);
  return unsplashUrl(id, '&w=1000&h=1500&q=80');
}

async function toPngDataUri(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).resize(1000, 1500, { fit: 'cover' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'types';
  const seed = parseInt(searchParams.get('seed') || '0', 10) || 0;
  const caption = searchParams.get('caption') || SOURCE_LABEL[source] || 'Fineme';
  const sourceUrl = pickImageSourceUrl(source, seed);

  let imageDataUri;
  try {
    imageDataUri = await toPngDataUri(sourceUrl);
  } catch (e) {
    console.error('[og/pinterest] image fetch/convert error:', e.message);
  }

  return new ImageResponse(
    (
      <div style={{
        width: '1000px', height: '1500px',
        position: 'relative',
        display: 'flex',
        background: '#0a0f1e',
      }}>
        {imageDataUri && (
          <img
            src={imageDataUri}
            width={1000}
            height={1500}
            style={{ position: 'absolute', top: 0, left: 0, width: '1000px', height: '1500px', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column',
          padding: '28px 40px 34px',
          background: 'linear-gradient(to top, rgba(10,15,30,0.92) 10%, rgba(10,15,30,0.55) 55%, rgba(10,15,30,0) 100%)',
        }}>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#f8f6f0', letterSpacing: '0.01em' }}>
            {caption}
          </span>
          <span style={{ fontSize: '18px', color: '#c9a84c', fontWeight: 700, marginTop: '6px', letterSpacing: '0.08em' }}>
            Fineme
          </span>
        </div>
      </div>
    ),
    { width: 1000, height: 1500 }
  );
}
