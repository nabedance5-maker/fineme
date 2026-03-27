'use client';
import { useState, useEffect } from 'react';

// 都道府県リスト
const PREFS = ['北海道','青森','岩手','宮城','秋田','山形','福島','茨城','栃木','群馬',
  '埼玉','千葉','東京','神奈川','新潟','富山','石川','福井','山梨','長野',
  '岐阜','静岡','愛知','三重','滋賀','京都','大阪','兵庫','奈良','和歌山',
  '鳥取','島根','岡山','広島','山口','徳島','香川','愛媛','高知','福岡',
  '佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄'];

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
const LS_SKIP = 'fineme:user:area:skip';

export function LocationPrompt({ accessToken }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState('top');   // top | manual
  const [detecting, setDetecting] = useState(false);
  const [selPref, setSelPref] = useState('');
  const [cityText, setCityText] = useState('');
  const [done, setDone] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    const existing = localStorage.getItem(LS_PREF);
    const skipped  = localStorage.getItem(LS_SKIP);
    if (!existing && !skipped) setShow(true);
  }, []);

  function saveLocation(prefecture, city) {
    localStorage.setItem(LS_PREF, prefecture);
    localStorage.setItem(LS_CITY, city);
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
          const { prefecture, city } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (!prefecture) throw new Error('not found');
          setDetecting(false);
          saveLocation(prefecture, city);
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
    saveLocation(selPref, cityText.trim());
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
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280', lineHeight: 1.65 }}>
            市区町村レベルで設定すると、通いやすいサービスが上位に表示されます。
            現在地を使う場合、座標はOpenStreetMapで市区町村名に変換後に即破棄します。
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
              border: '1.5px solid #e5e7eb', background: '#fff',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', color: '#374151',
            }}>
              🗾 都道府県・市区町村を選ぶ
            </button>
            <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
              あとで設定する →
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0a0f1e' }}>エリアを選択</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={selPref} onChange={e => setSelPref(e.target.value)} style={{
              padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', background: '#fff',
            }}>
              <option value="">都道府県を選ぶ</option>
              {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="text"
              placeholder="市区町村を入力（例: 青梅市、世田谷区）"
              value={cityText}
              onChange={e => setCityText(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleManualSave} disabled={!selPref} style={{
                flex: 1, padding: '11px', borderRadius: '8px', border: 'none',
                background: selPref ? '#c9a84c' : '#f3f4f6',
                color: selPref ? '#0a0f1e' : '#9ca3af',
                fontWeight: 700, fontSize: '14px', cursor: selPref ? 'pointer' : 'not-allowed',
              }}>
                設定する
              </button>
              <button onClick={() => setStep('top')} style={{
                padding: '11px 16px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                background: '#fff', color: '#6b7280', fontSize: '14px', cursor: 'pointer',
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
