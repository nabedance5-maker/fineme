'use client';
import { useEffect, useState } from 'react';
import { getTrackId, syncTrackWithServer, TRACKS } from '@/lib/track';

// /mypage/* は男女で共用しているURL。
// Belle のときだけ「ここはあなたの面である」を面内で示す。
// URLが /belle/* なら不要（BelleTrackBadge が出る）、共用URLなら必要、という基準。
export default function TrackBadge() {
  const [trackId, setTrackId] = useState(null);

  useEffect(() => {
    setTrackId(getTrackId());
    syncTrackWithServer().then((t) => { if (t) setTrackId(t); }).catch(() => {});
  }, []);

  if (trackId !== 'belle') return null;
  const t = TRACKS.belle;

  return (
    <div style={{
      background: `linear-gradient(90deg, rgba(${t.accentRgb},0.12), rgba(200,140,160,0.06))`,
      borderBottom: '1px solid rgba(200,140,160,0.22)',
      padding: '7px 16px',
      textAlign: 'center',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
        fontFamily: "'Noto Serif JP', Georgia, serif", letterSpacing: '.04em',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f0d8e0' }}>{t.label}</span>
        <span style={{ fontSize: 11, color: 'rgba(240,216,224,0.6)' }}>・ {t.subLabel}</span>
      </span>
    </div>
  );
}
