'use client';
// Mirrorスコアに基づく店舗マッチング結果（店舗SaaS実装仕様書 SAAS-026）
import { useEffect, useState } from 'react';

const AXIS_LABEL = { eyebrow: '眉', skin: '肌', hair: 'ヘア', expression: '表情', posture: '姿勢', body: '体型', fashion: 'ファッション' };

export default function MirrorMatchPage() {
  const [status, setStatus] = useState('loading'); // loading | ready | error | no-mirror
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) { window.location.href = '/login'; return; }
    let token;
    try {
      token = JSON.parse(localStorage.getItem(sbKey))?.access_token;
    } catch {}
    if (!token) { window.location.href = '/login'; return; }

    function run(location) {
      fetch('/api/mirror/match-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ location, radiusKm: 20, limit: 10 }),
      })
        .then(r => r.json().then(d => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) { setStatus('error'); setErrorMsg(d.error || '取得に失敗しました'); return; }
          setResults((d.providers || []).map(r => ({ ...r, axisScore: r.bestAxis ? d.axisScores?.[r.bestAxis] : null })));
          setStatus('ready');
        })
        .catch(() => { setStatus('error'); setErrorMsg('通信エラーが発生しました'); });

      if (typeof window.gtag === 'function') window.gtag('event', 'mirror_match_view');
    }

    // 位置情報は任意（無ければ距離補正なしで実行）
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => run({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => run(null),
        { timeout: 3000 }
      );
    } else {
      run(null);
    }
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 className="section-title">あなたに合うメニュー</h1>
        <p className="muted" style={{ fontSize: 13 }}>Mirrorの分析結果から、改善余地の大きい部分に強い店舗を自動で探しています。</p>

        {status === 'loading' && <p className="muted">読み込み中…</p>}
        {status === 'error' && <p style={{ color: '#ef4444' }}>{errorMsg}</p>}
        {status === 'ready' && results.length === 0 && (
          <p className="muted">現在、条件に合う店舗が見つかりませんでした。掲載店舗が増え次第、表示されるようになります。</p>
        )}

        {results.map(r => (
          <a
            key={r.providerId}
            href={r.bestAxis ? `/provider/${r.slug}/for/${r.bestAxis}${Number.isFinite(r.axisScore) ? `?score=${Math.round(r.axisScore)}` : ''}` : `/provider/${r.slug}`}
            className="card"
            style={{ display: 'flex', gap: 14, padding: 16, textDecoration: 'none', color: 'inherit', alignItems: 'center' }}
            onClick={() => { if (typeof window.gtag === 'function') window.gtag('event', 'mirror_match_click', { provider_slug: r.slug, match_score: r.matchScore }); }}
          >
            {r.photoUrl
              ? <img src={r.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(232,228,220,0.08)', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              {r.catchphrase && <div className="muted" style={{ fontSize: 13 }}>{r.catchphrase}</div>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {r.matchedAxes.map(a => (
                  <span key={a} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(201,168,76,.12)', color: '#c9a84c' }}>
                    {AXIS_LABEL[a] || a}
                  </span>
                ))}
              </div>
              {r.recommendedMenu && (
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {r.recommendedMenu.name}（¥{Number(r.recommendedMenu.price).toLocaleString()}）
                  {r.recommendedMenu.evidence && <span> — {r.recommendedMenu.evidence}</span>}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
