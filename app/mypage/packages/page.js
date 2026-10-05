'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';
import '@/app/provider/dashboard/fx.css';

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
            店舗が記録した回数券と、Fineme上でご購入いただいた回数券の残り回数をここで確認できます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#dc2626' }}>{error}</p>
          ) : packages.length === 0 ? (
            <p className="muted">まだ記録がありません。店舗で回数券・パッケージを購入すると、ここに表示されます。</p>
          ) : (
            <div style={{ '--fx-ticket-hole': '#0d1117' }}>
              {packages.map(p => {
                const isUnlimited = p.package_type === 'unlimited';
                const isSub = p.package_type === 'subscription';
                const total = Number(p.total_sessions) || 0;
                const used = Number(p.used_sessions) || 0;
                const usedUp = !isUnlimited && !p.expired && (p.remaining_sessions ?? 0) <= 0;
                const kind = isUnlimited ? '通い放題' : p.package_type === 'combo' ? '通い放題＋チケット' : isSub ? '月額会員' : '回数券';
                const sub = [
                  `購入 ${new Date(p.purchased_at).toLocaleDateString('ja-JP')}`,
                  p.expires_at ? `有効期限 ${new Date(p.expires_at).toLocaleDateString('ja-JP')}` : '',
                  isSub ? (p.subscription_status === 'cancelled' ? '月額会員：解約済み' : `次回 ${p.next_grant_at ? new Date(p.next_grant_at).toLocaleDateString('ja-JP') : '未定'} に自動付与`) : '',
                  p.expired ? '期限切れ' : usedUp ? '使用済み' : '',
                ].filter(Boolean).join('｜');
                return (
                  <div key={p.id} className={`fx-ticket${p.expired || usedUp ? ' is-done' : ''}`}>
                    <div className="fx-ticket-main">
                      <span className="fx-ticket-kicker">{kind}<span className="fx-ticket-who">{p.provider_name}</span></span>
                      <span className="fx-ticket-name">{p.package_name}</span>
                      {!isUnlimited && total > 0 && total <= 20 && (
                        <div className="fx-punches" aria-label={`${total}回中${used}回利用`}>
                          {Array.from({ length: total }, (_, i) => <span key={i} className={i < used ? 'used' : ''} />)}
                        </div>
                      )}
                      {!isUnlimited && total > 20 && <div className="fx-punches-more">{used}回利用 / 全{total}回</div>}
                      <span className="fx-ticket-sub">{sub}</span>
                    </div>
                    <div className="fx-ticket-stub">
                      {isUnlimited
                        ? <><span>ご利用</span><b className="fx-ticket-word">通い放題</b></>
                        : <><span>残り</span><b>{Math.max(0, p.remaining_sessions ?? 0)}</b><span>回</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav, .mypage-content { min-width: 0; }
        .mypage-sidenav { background: #151b24; backdrop-filter: blur(8px); border: 1px solid rgba(236,232,223,0.154); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(200,164,90,0.1); color: #0d1117; }
        .sidenav-link--active { background: rgba(200,164,90,0.14); font-weight: 700; color: #0d1117; border-left: 3px solid #c8a45a; padding-left: 9px; }
      `}</style>
    </main>
  );
}
