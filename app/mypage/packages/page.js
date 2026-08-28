'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';

export default function MypagePackagesPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!sbKey) { window.location.href = '/login'; return; }
    let accessToken = null;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      accessToken = obj?.access_token || null;
      if (!obj?.user?.id) { window.location.href = '/login'; return; }
    } catch { window.location.href = '/login'; return; }

    fetch('/api/me/packages', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setPackages)
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="stack mypage-content">
          <h1 className="section-title">あなたのパッケージ・回数券</h1>
          <p className="muted" style={{ fontSize: '13px', marginTop: '-8px' }}>
            決済はFinemeを経由せず、店舗が直接記録したものです。残り回数はここで確認できます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#dc2626' }}>{error}</p>
          ) : packages.length === 0 ? (
            <p className="muted">まだ記録がありません。店舗で回数券・パッケージを購入すると、ここに表示されます。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {packages.map(p => (
                <div
                  key={p.id}
                  style={{
                    border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px 20px',
                    background: 'rgba(10,15,30,0.65)', opacity: p.expired ? 0.55 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'rgba(232,228,220,0.5)' }}>{p.provider_name}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>🎫 {p.package_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: p.expired ? '#9ca3af' : '#c9a84c' }}>
                        {p.remaining_sessions} <span style={{ fontSize: '12px', fontWeight: 700 }}>/ {p.total_sessions}回</span>
                      </p>
                      {p.expired && <p style={{ margin: 0, fontSize: '11px', color: '#dc2626' }}>期限切れ</p>}
                    </div>
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.5)' }}>
                    購入日：{new Date(p.purchased_at).toLocaleDateString('ja-JP')}
                    {p.expires_at && ` ／ 有効期限：${new Date(p.expires_at).toLocaleDateString('ja-JP')}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav, .mypage-content { min-width: 0; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
