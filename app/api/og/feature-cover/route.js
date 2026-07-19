import { ImageResponse } from 'next/og';
import { pickThumbnailPhoto, unsplashUrl } from '@/lib/thumbnail-photos';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title    = searchParams.get('title')    || '外見磨きの、正しい順番がある。';
  const category = searchParams.get('category') || '';

  // 記事本文の挿入画像と同じUnsplashプールから、タイトルをシードに1枚選ぶ（記事ごとに変える＝金太郎飴防止）
  const photoId = pickThumbnailPhoto(category, title);
  const bgImageUrl = unsplashUrl(photoId, '&w=1200&h=630');

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        display: 'flex', flexDirection: 'column',
        padding: '64px 88px',
        fontFamily: 'sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 背景写真（記事本文と同じUnsplashプール） */}
        <img
          src={bgImageUrl}
          width={1200} height={630}
          style={{ position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' }}
        />
        {/* 可読性のためのグラデーションオーバーレイ（ブランドのネイビー基調） */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(10,15,30,0.35) 0%, rgba(10,15,30,0.58) 45%, rgba(10,15,30,0.95) 100%)',
          display: 'flex',
        }} />

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
          borderTop: '1px solid rgba(201,168,76,0.35)', paddingTop: '24px',
        }}>
          <span style={{ fontSize: '15px', color: 'rgba(248,250,252,0.65)', letterSpacing: '0.08em' }}>
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
