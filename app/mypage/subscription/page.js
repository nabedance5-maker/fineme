'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MypageSideNav from '../_components/MypageSideNav';

export default function SubscriptionPage() {
  const [token, setToken]         = useState(null);
  const [status, setStatus]       = useState(null); // null | loading | loaded
  const [subData, setSubData]     = useState(null);
  const [subscribing, setSubscribing]   = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError]         = useState('');
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    let tok = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        tok = obj?.access_token || null;
      }
    } catch {}

    if (!tok) { window.location.href = '/login'; return; }
    setToken(tok);

    // サブスク完了リダイレクト判定
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === '1') {
      setJustSubscribed(true);
      window.history.replaceState({}, '', '/mypage/subscription');
    }

    setStatus('loading');
    fetch('/api/subscription/status', { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json())
      .then(d => { setSubData(d); setStatus('loaded'); })
      .catch(() => { setError('読み込みに失敗しました'); setStatus('loaded'); });
  }, []);

  async function handleSubscribe() {
    setSubscribing(true); setError('');
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.error === 'already_subscribed') { setError('すでにサブスク加入済みです。'); return; }
        throw new Error(d.error || 'エラーが発生しました');
      }
      window.location.href = d.url;
    } catch (e) { setError(e.message); }
    finally { setSubscribing(false); }
  }

  async function handlePortal() {
    setPortalLoading(true); setError('');
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'エラーが発生しました');
      window.location.href = d.url;
    } catch (e) { setError(e.message); }
    finally { setPortalLoading(false); }
  }

  const isActive = subData?.isActive;
  const periodEnd = subData?.periodEnd
    ? new Date(subData.periodEnd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const freeRemaining = subData?.mirrorFreeRemaining ?? 0;

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section>
          {/* ヘッダー */}
          <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(10,15,30,0.9))', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '16px', padding: '28px 24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.18em', color: 'rgba(201,168,76,0.6)', margin: '0 0 8px', textTransform: 'uppercase' }}>Fineme Membership</p>
            <h1 style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, color: '#e8e4dc', margin: '0 0 6px' }}>
              変容の旅を、<span style={{ color: '#c9a84c' }}>もっと深く。</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)', margin: 0, lineHeight: 1.7 }}>
              月額780円で、Mirrorの力を最大限に活用できます。
            </p>
          </div>

          {justSubscribed && (
            <div style={{ background: 'rgba(80,200,140,0.1)', border: '1px solid rgba(80,200,140,0.35)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', fontSize: '14px', color: 'rgba(80,200,140,0.9)' }}>
              🎉 サブスクへの加入が完了しました。ありがとうございます！
            </div>
          )}

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          )}

          {/* 特典リスト */}
          <div style={{ background: 'rgba(10,15,30,0.6)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.12em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 16px' }}>月額780円の特典</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: '🪞', title: 'Mirror 月3回無料', desc: '毎月3回まで、写真分析（通常¥500/回）が無料で使えます。' },
                { icon: '📚', title: 'Mirror履歴 無期限保存', desc: '過去の分析結果をいつまでも見返せます。非会員は直近5件のみ。' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#e8e4dc', margin: '0 0 3px' }}>{item.title}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 現在のステータス */}
          {status === 'loading' ? (
            <p style={{ color: 'rgba(232,228,220,0.35)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>読み込み中...</p>
          ) : isActive ? (
            /* アクティブ会員 */
            <div style={{ background: 'rgba(80,200,140,0.07)', border: '1px solid rgba(80,200,140,0.25)', borderRadius: '14px', padding: '20px 24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <p style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(80,200,140,0.9)', margin: 0 }}>サブスク会員（アクティブ）</p>
              </div>
              {periodEnd && (
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.45)', margin: '0 0 12px' }}>
                  次回更新日: {periodEnd}
                </p>
              )}
              <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#c9a84c', margin: '0 0 8px' }}>今月のMirror無料枠</p>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ flex: 1, height: '6px', borderRadius: '99px', background: i < freeRemaining ? '#c9a84c' : 'rgba(201,168,76,0.15)' }} />
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.8)', margin: 0 }}>
                  {freeRemaining > 0
                    ? `✨ あと ${freeRemaining} 回使えます`
                    : '今月分は使い切りました（来月1日に3回分復活）'}
                </p>
              </div>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{ padding: '11px 20px', background: 'transparent', border: '1px solid rgba(232,228,220,0.2)', borderRadius: '10px', color: 'rgba(232,228,220,0.55)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {portalLoading ? '移動中...' : '解約・支払い情報の変更 →'}
              </button>
            </div>
          ) : (
            /* 非会員 */
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)', marginBottom: '8px', lineHeight: 1.7 }}>
                {subData?.status === 'canceled' ? '解約済みです。再加入はいつでもできます。' : '現在サブスクには加入していません。'}
              </p>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#c9a84c', margin: '0 0 4px' }}>¥780 <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(232,228,220,0.4)' }}>/ 月（税込）</span></p>
              <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.3)', marginBottom: '20px' }}>いつでも解約可能</p>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 40px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800, color: '#0a0f1e', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(201,168,76,0.25)' }}
              >
                {subscribing ? '移動中...' : '🪞 今すぐ加入する'}
              </button>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #c9a84c; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
