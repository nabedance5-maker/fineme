'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// 診断軸名 → サービスのmain_category
const AXIS_TO_CAT = {
  hair:        'hair',
  skin:        'esthetic',
  esthetic:    'esthetic',
  eyebrow:     'eyebrow',
  fashion:     'fashion',
  photo:       'photo',
  gym:         'gym',
  consulting:  'consulting',
  diagnosis:   'diagnosis',
  makeup:      'makeup',
  whitening:   'whitening',
  orthodontics:'orthodontics',
  nail:        'nail',
  hairremoval: 'hairremoval',
  aga:         'aga',
};

const CAT_LABEL = {
  hair: 'ヘア', esthetic: '肌・エステ', eyebrow: '眉毛サロン',
  photo: '写真撮影', consulting: 'トータルサポート', diagnosis: '骨格診断',
  gym: 'ジム', fashion: 'ファッション', makeup: 'メイク',
  whitening: 'ホワイトニング', nail: 'ネイル', hairremoval: '脱毛', aga: 'AGA',
};

export function PersonalizedServices({ providers, firstCat }) {
  const [sorted, setSorted] = useState(providers);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (!raw) return;
      const diag = JSON.parse(raw);
      const axes = diag.priority_order || [];
      if (!axes.length) return;

      // 軸の優先順位でスコアリング（高い軸ほど高スコア）
      const scored = providers.map(p => {
        const idx = axes.findIndex(ax => AXIS_TO_CAT[ax] === p.main_category);
        return { ...p, _score: idx >= 0 ? axes.length - idx : -1 };
      });
      scored.sort((a, b) => b._score - a._score);

      setSorted(scored.slice(0, 5));
      setPersonalized(true);
    } catch {
      setSorted(providers.slice(0, 5));
    }
  }, [providers]);

  if (!sorted.length) return null;

  return (
    <div style={{ marginTop: '60px', paddingTop: '48px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
      {/* sec-label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: '24px', height: '1.5px', background: '#c9a84c', borderRadius: '1px', flexShrink: 0 }} />
        <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', margin: 0 }}>
          この記事に関連するサービス
        </p>
        <div style={{ flex: 1, height: '1px', background: 'repeating-linear-gradient(90deg,rgba(201,168,76,0.3) 0,rgba(201,168,76,0.3) 4px,transparent 4px,transparent 9px)' }} />
      </div>

      {/* パーソナライズ表示バッジ */}
      {personalized ? (
        <p style={{ fontSize: '12px', color: 'rgba(201,168,76,0.75)', margin: '0 0 20px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px' }}>✦</span>
          あなたのNew Me Naviに合わせて表示しています
        </p>
      ) : (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>
          読んだ内容を実践できるプロが見つかります。
        </p>
      )}

      {/* 横スクロールカード */}
      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', marginLeft: '-4px', paddingLeft: '4px' }}>
        {sorted.map(p => (
          <Link
            key={p.id}
            href={p.entity_type === 'affiliate' ? `/affiliate/${p.slug}` : `/provider/${p.slug}`}
            style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0, width: 'clamp(200px, 42vw, 240px)', scrollSnapAlign: 'start' }}
          >
            <div style={{ border: '1px solid rgba(201,168,76,0.2)', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)', transition: 'border-color 0.2s' }}>
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: '130px', background: 'linear-gradient(135deg, #0a0f1e, #1e2b54)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '28px' }}>✨</span>
                </div>
              )}
              <div style={{ padding: '12px' }}>
                <p style={{ fontSize: '10px', color: '#c9a84c', fontWeight: 800, letterSpacing: '0.08em', margin: '0 0 5px', textTransform: 'uppercase' }}>
                  {CAT_LABEL[p.main_category] || p.main_category}
                </p>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 5px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.name}
                </p>
                {p.tagline && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.tagline}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ textAlign: 'right', marginTop: '10px' }}>
        <Link href={`/search?category=${firstCat || ''}`}
          style={{ fontSize: '12px', color: '#c9a84c', fontWeight: 700, textDecoration: 'none' }}>
          関連サービスをもっと見る →
        </Link>
      </div>
    </div>
  );
}
