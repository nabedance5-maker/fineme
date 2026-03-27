'use client';
import { useState, useEffect } from 'react';

// 都道府県の重心座標（外部API不使用・完全クライアントサイド）
const PREFS = [
  { n: '北海道', lat: 43.06, lon: 141.35 }, { n: '青森', lat: 40.82, lon: 140.74 },
  { n: '岩手', lat: 39.70, lon: 141.15 },   { n: '宮城', lat: 38.27, lon: 140.87 },
  { n: '秋田', lat: 39.72, lon: 140.10 },   { n: '山形', lat: 38.24, lon: 140.36 },
  { n: '福島', lat: 37.75, lon: 140.47 },   { n: '茨城', lat: 36.34, lon: 140.45 },
  { n: '栃木', lat: 36.57, lon: 139.88 },   { n: '群馬', lat: 36.39, lon: 139.06 },
  { n: '埼玉', lat: 35.86, lon: 139.65 },   { n: '千葉', lat: 35.61, lon: 140.12 },
  { n: '東京', lat: 35.69, lon: 139.69 },   { n: '神奈川', lat: 35.45, lon: 139.64 },
  { n: '新潟', lat: 37.90, lon: 139.02 },   { n: '富山', lat: 36.70, lon: 137.21 },
  { n: '石川', lat: 36.59, lon: 136.63 },   { n: '福井', lat: 36.07, lon: 136.22 },
  { n: '山梨', lat: 35.66, lon: 138.57 },   { n: '長野', lat: 36.65, lon: 138.18 },
  { n: '岐阜', lat: 35.39, lon: 136.72 },   { n: '静岡', lat: 34.97, lon: 138.38 },
  { n: '愛知', lat: 35.18, lon: 136.91 },   { n: '三重', lat: 34.73, lon: 136.51 },
  { n: '滋賀', lat: 35.00, lon: 135.87 },   { n: '京都', lat: 35.02, lon: 135.76 },
  { n: '大阪', lat: 34.69, lon: 135.50 },   { n: '兵庫', lat: 34.69, lon: 135.18 },
  { n: '奈良', lat: 34.69, lon: 135.83 },   { n: '和歌山', lat: 34.23, lon: 135.17 },
  { n: '鳥取', lat: 35.50, lon: 134.24 },   { n: '島根', lat: 35.47, lon: 133.05 },
  { n: '岡山', lat: 34.66, lon: 133.93 },   { n: '広島', lat: 34.40, lon: 132.46 },
  { n: '山口', lat: 34.19, lon: 131.47 },   { n: '徳島', lat: 34.07, lon: 134.56 },
  { n: '香川', lat: 34.34, lon: 134.04 },   { n: '愛媛', lat: 33.84, lon: 132.77 },
  { n: '高知', lat: 33.56, lon: 133.53 },   { n: '福岡', lat: 33.61, lon: 130.42 },
  { n: '佐賀', lat: 33.25, lon: 130.30 },   { n: '長崎', lat: 32.74, lon: 129.87 },
  { n: '熊本', lat: 32.79, lon: 130.74 },   { n: '大分', lat: 33.24, lon: 131.61 },
  { n: '宮崎', lat: 31.91, lon: 131.42 },   { n: '鹿児島', lat: 31.56, lon: 130.56 },
  { n: '沖縄', lat: 26.21, lon: 127.68 },
];

function latLonToPref(lat, lon) {
  let min = Infinity, name = '';
  for (const p of PREFS) {
    const d = Math.hypot(lat - p.lat, lon - p.lon);
    if (d < min) { min = d; name = p.n; }
  }
  return name;
}

const LS_KEY = 'fineme:user:area';
const LS_SKIP = 'fineme:user:area:skip';

export function LocationPrompt({ accessToken }) {
  const [show, setShow] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [selected, setSelected] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(LS_KEY);
    const skipped  = localStorage.getItem(LS_SKIP);
    if (!existing && !skipped) setShow(true);
  }, []);

  function saveArea(area) {
    localStorage.setItem(LS_KEY, area);
    // ログイン済みならSupabaseプロフィールにも同期
    if (accessToken) {
      fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ area }),
      }).catch(() => {});
    }
    setDone(true);
    setTimeout(() => setShow(false), 1600);
  }

  function handleGeo() {
    if (!navigator.geolocation) { alert('お使いのブラウザは位置情報に対応していません'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pref = latLonToPref(pos.coords.latitude, pos.coords.longitude);
        setDetecting(false);
        saveArea(pref);
      },
      () => {
        setDetecting(false);
        alert('位置情報の取得に失敗しました。手動でエリアを選択してください。');
      },
      { timeout: 8000 }
    );
  }

  function handleSkip() {
    localStorage.setItem(LS_SKIP, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      margin: '24px 0 8px',
      background: 'rgba(201,168,76,0.06)',
      border: '1.5px solid rgba(201,168,76,0.25)',
      borderRadius: '14px',
      padding: '20px',
    }}>
      {done ? (
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#059669', textAlign: 'center' }}>
          ✅ エリアを設定しました。近くのサービスが優先表示されます。
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', color: 'rgba(201,168,76,0.8)', textTransform: 'uppercase' }}>
            📍 エリア設定（任意）
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#0a0f1e', lineHeight: 1.6 }}>
            近くのサービスを優先表示しますか？
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280', lineHeight: 1.65 }}>
            設定すると、お住まいのエリアのサービスが検索・診断結果の上位に表示されます。
            位置情報は都道府県名に変換して保存し、座標は即破棄します。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleGeo}
              disabled={detecting}
              style={{
                padding: '12px 20px', borderRadius: '10px', border: 'none',
                background: detecting ? '#e5e7eb' : '#c9a84c', color: detecting ? '#9ca3af' : '#0a0f1e',
                fontWeight: 800, fontSize: '14px', cursor: detecting ? 'not-allowed' : 'pointer',
              }}
            >
              {detecting ? '取得中…' : '📍 現在地から自動設定'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', background: '#fff' }}
              >
                <option value="">都道府県を選ぶ</option>
                {PREFS.map(p => <option key={p.n} value={p.n}>{p.n}</option>)}
              </select>
              <button
                onClick={() => { if (selected) saveArea(selected); }}
                disabled={!selected}
                style={{
                  padding: '10px 18px', borderRadius: '8px', border: '1.5px solid #c9a84c',
                  background: selected ? '#c9a84c' : '#f9fafb', color: selected ? '#0a0f1e' : '#9ca3af',
                  fontWeight: 700, fontSize: '14px', cursor: selected ? 'pointer' : 'not-allowed',
                }}
              >
                設定
              </button>
            </div>
            <button
              onClick={handleSkip}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
            >
              あとで設定する →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
