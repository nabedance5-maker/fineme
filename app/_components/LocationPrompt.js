'use client';
import { useState, useEffect } from 'react';
import { JAPAN_CITIES, PREFECTURES, getCityCoords } from '@/app/_data/japan-cities';

// Nominatim（OpenStreetMap）で座標→都道府県＋市区町村に変換
// 座標はOSMに1回送信され、地名のみ保存。座標は即破棄。
async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ja`,
    { headers: { 'User-Agent': 'Fineme/1.0' } }
  );
  if (!res.ok) throw new Error('geocode failed');
  const data = await res.json();
  const addr = data.address || {};
  // 都道府県：state または region
  const prefecture = (addr.state || addr.region || '').replace(/[都道府県]$/, '');
  // 市区町村：city → town → village → county の優先順
  const city = addr.city || addr.town || addr.village || addr.county || addr.suburb || '';
  return { prefecture, city };
}

const LS_PREF = 'fineme:user:area';       // 後方互換のため都道府県はこのキーを維持
const LS_CITY = 'fineme:user:city';
const LS_LAT  = 'fineme:user:lat';
const LS_LON  = 'fineme:user:lon';
const LS_SKIP = 'fineme:user:area:skip';

export function LocationPrompt({ accessToken }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('top');   // top | manual
  const [detecting, setDetecting] = useState(false);
  const [selPref, setSelPref] = useState('');
  const [selCity, setSelCity] = useState('');
  const [done, setDone] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    const existing = localStorage.getItem(LS_PREF);
    const skipped  = localStorage.getItem(LS_SKIP);
    if (!existing && !skipped) setShow(true);
  }, []);

  const cityOptions = selPref ? (JAPAN_CITIES[selPref] || []) : [];

  function saveLocation(prefecture, city, lat, lon) {
    localStorage.setItem(LS_PREF, prefecture);
    localStorage.setItem(LS_CITY, city);
    if (lat != null) localStorage.setItem(LS_LAT, String(lat));
    if (lon != null) localStorage.setItem(LS_LON, String(lon));
    localStorage.removeItem(LS_SKIP);
    if (accessToken) {
      fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: prefecture, city }),
      }).catch(() => {});
    }
    setDone(true);
    setTimeout(() => setShow(false), 2000);
  }

  function handleGeo() {
    if (!navigator.geolocation) { setGeoError('このブラウザは位置情報に対応していません'); return; }
    setDetecting(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { lat, lon: posLon } = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          const { prefecture, city } = await reverseGeocode(lat, posLon);
          if (!prefecture) throw new Error('not found');
          setDetecting(false);
          // 現在地はNominatimから正確な座標を保持
          saveLocation(prefecture, city, lat, posLon);
        } catch {
          setDetecting(false);
          setGeoError('位置情報の取得に失敗しました。手動で選択してください。');
          setStep('manual');
        }
      },
      () => {
        setDetecting(false);
        setGeoError('位置情報の許可が必要です。手動で選択してください。');
        setStep('manual');
      },
      { timeout: 10000 }
    );
  }

  function handleManualSave() {
    if (!selPref) return;
    // 選択した市区町村の重心座標を使用
    const coords = selCity ? getCityCoords(selPref, selCity) : null;
    saveLocation(selPref, selCity, coords?.lat ?? null, coords?.lon ?? null);
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
      ) : step === 'top' ? (
        <>
          <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', color: 'rgba(201,168,76,0.8)', textTransform: 'uppercase' }}>
            📍 エリア設定（任意）
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0a0f1e', lineHeight: 1.6 }}>
            近くのサービスを優先表示しますか？
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.65 }}>
            市区町村レベルで設定すると、通いやすいサービスが上位に表示されます。
            現在地を使う場合、座標はお使いの端末内のみに保存し、外部サービスへの送信はOpenStreetMapへの変換1回のみです。
          </p>
          {geoError && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#dc2626' }}>{geoError}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={handleGeo} disabled={detecting} style={{
              padding: '12px 20px', borderRadius: '10px', border: 'none',
              background: detecting ? '#e5e7eb' : '#c9a84c',
              color: detecting ? '#9ca3af' : '#0a0f1e',
              fontWeight: 800, fontSize: '14px', cursor: detecting ? 'not-allowed' : 'pointer',
            }}>
              {detecting ? '取得中…' : '📍 現在地から自動設定'}
            </button>
            <button onClick={() => setStep('manual')} style={{
              padding: '11px 20px', borderRadius: '10px',
              border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(10,15,30,0.65)',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', color: 'rgba(232,228,220,0.75)',
            }}>
              🗾 都道府県・市区町村を選ぶ
            </button>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: 'rgba(232,228,220,0.40)', fontSize: '12px', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
              あとで設定する →
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0a0f1e' }}>エリアを選択</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={selPref} onChange={e => { setSelPref(e.target.value); setSelCity(''); }} style={{
              padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', background: 'rgba(10,15,30,0.65)',
            }}>
              <option value="">都道府県を選ぶ</option>
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {selPref && (
              <select value={selCity} onChange={e => setSelCity(e.target.value)} style={{
                padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', background: 'rgba(10,15,30,0.65)',
              }}>
                <option value="">市区町村を選ぶ（任意）</option>
                {cityOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleManualSave} disabled={!selPref} style={{
                flex: 1, padding: '11px', borderRadius: '8px', border: 'none',
                background: selPref ? '#c9a84c' : 'rgba(10,15,30,0.45)',
                color: selPref ? '#0a0f1e' : 'rgba(232,228,220,0.40)',
                fontWeight: 700, fontSize: '14px', cursor: selPref ? 'pointer' : 'not-allowed',
              }}>
                設定する
              </button>
              <button onClick={() => setStep('top')} style={{
                padding: '11px 16px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.15)',
                background: 'rgba(10,15,30,0.65)', color: 'rgba(232,228,220,0.55)', fontSize: '14px', cursor: 'pointer',
              }}>
                戻る
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
