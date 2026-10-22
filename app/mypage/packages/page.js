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
          <header>
            <h1 className="section-title">回数券・チケット</h1>
            <p className="muted" style={{ fontSize: '13px', lineHeight: 1.7, margin: '8px 0 0' }}>
              お持ちの回数券・チケットの残りです。押すと、そのチケットで予約できるメニューが開きます。
            </p>
          </header>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#fff', fontWeight: 700 }}>{error}</p>
          ) : packages.length === 0 ? (
            <p className="muted" style={{ lineHeight: 1.7 }}>まだありません。お店で回数券を買ったり、月額プランに入ったりすると、ここに出ます。</p>
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
                // まだ使えるチケットは、押すとそのメニューの予約画面へ（でお要望 2026-10-22）
                const usable = !p.expired && !usedUp && p.book_href;
                // 使い切った・期限切れは、同じ回数券をもう一度買えるお店の回数券ページへ（でお要望 2026-10-22）
                const rebuy = (p.expired || usedUp) && p.rebuy_href;
                const href = usable ? p.book_href : rebuy ? p.rebuy_href : null;
                const Wrap = href ? 'a' : 'div';
                return (
                  <Wrap key={p.id} {...(href ? { href, 'aria-label': usable ? `${p.package_name}で予約する` : `${p.package_name}をもう一度購入する` } : {})} className={`fx-ticket${p.expired || usedUp ? ' is-done' : ''}${href ? ' pk-link' : ''}`}>
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
                      {usable && <span className="pk-book">このチケットで予約する →</span>}
                      {rebuy && <span className="pk-book">もう一度購入する →</span>}
                    </div>
                    <div className="fx-ticket-stub">
                      {isUnlimited
                        ? <><span>ご利用</span><b className="fx-ticket-word">通い放題</b></>
                        : <><span>残り</span><b>{Math.max(0, p.remaining_sessions ?? 0)}</b><span>回</span></>}
                    </div>
                  </Wrap>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .pk-link { text-decoration: none; color: #1a1410; cursor: pointer; transition: transform .12s; }
        .pk-link:visited, .pk-link:hover { color: #1a1410; }
        .pk-link:hover { transform: translateY(-1px); }
        .pk-link:focus-visible { outline: 2px solid #c8a45a; outline-offset: 3px; }
        .pk-book { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 800; }
      `}</style>
    </main>
  );
}
