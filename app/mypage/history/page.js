'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const REGION_MAP = {
  hokkaido: '北海道', aomori: '青森県', iwate: '岩手県', miyagi: '宮城県', akita: '秋田県',
  yamagata: '山形県', fukushima: '福島県', ibaraki: '茨城県', tochigi: '栃木県', gunma: '群馬県',
  saitama: '埼玉県', chiba: '千葉県', tokyo: '東京都', kanagawa: '神奈川県', niigata: '新潟県',
  toyama: '富山県', ishikawa: '石川県', fukui: '福井県', yamanashi: '山梨県', nagano: '長野県',
  gifu: '岐阜県', shizuoka: '静岡県', aichi: '愛知県', mie: '三重県', shiga: '滋賀県',
  kyoto: '京都府', osaka: '大阪府', hyogo: '兵庫県', nara: '奈良県', wakayama: '和歌山県',
  tottori: '鳥取県', shimane: '島根県', okayama: '岡山県', hiroshima: '広島県', yamaguchi: '山口県',
  tokushima: '徳島県', kagawa: '香川県', ehime: '愛媛県', kochi: '高知県', fukuoka: '福岡県',
  saga: '佐賀県', nagasaki: '長崎県', kumamoto: '熊本県', oita: '大分県', miyazaki: '宮崎県',
  kagoshima: '鹿児島県', okinawa: '沖縄県',
};
const CATEGORY_MAP = {
  consulting: '外見トータルサポート', gym: 'パーソナルジム', makeup: 'メイクアップ', hair: 'ヘア',
  diagnosis: 'カラー/骨格診断', fashion: 'コーディネート', photo: '写真撮影（アプリ等）', marriage: '結婚関連サービス',
  eyebrow: '眉毛', hairremoval: '脱毛', esthetic: 'エステ', cosmetic: '美容外科・美容クリニック',
  whitening: 'ホワイトニング', orthodontics: '歯科矯正', nail: 'ネイル', aga: 'AGA',
};

function labelRegion(key) { return key ? (REGION_MAP[key] || key) : '全国'; }
function labelCategory(key) { return CATEGORY_MAP[key] || key; }

function loadHistory() {
  try {
    const raw = localStorage.getItem('fineme:history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function removeHistoryItem(href) {
  try {
    const arr = loadHistory().filter(f => f.href !== href);
    localStorage.setItem('fineme:history', JSON.stringify(arr));
  } catch {}
}
function clearHistoryAll() {
  try { localStorage.removeItem('fineme:history'); } catch {}
}

export default function MypageHistoryPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.user?.id) {
          setSession(obj);
          setLoading(false);
          const arr = loadHistory().sort((a, b) => new Date(b.viewedAt || 0).getTime() - new Date(a.viewedAt || 0).getTime());
          setHistoryItems(arr);
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  function handleRemove(href) {
    removeHistoryItem(href);
    setHistoryItems(prev => prev.filter(f => f.href !== href));
  }

  function handleClearAll() {
    if (!confirm('閲覧履歴をすべて削除しますか？')) return;
    clearHistoryAll();
    setHistoryItems([]);
    setStatusMsg('閲覧履歴を削除しました。');
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  return (
    <main className="section">
      <div className="container mypage-layout">
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link">ホーム</Link>
            <Link href="/diagnosis/result" className="sidenav-link">New Me Navi</Link>
            <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
            <Link href="/mypage/log" className="sidenav-link">New Me Log</Link>
            <Link href="/mypage/mirror" className="sidenav-link">Mirror履歴</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link sidenav-link--active">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
            <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title">閲覧履歴</h1>

          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <p className="muted" aria-live="polite" style={{ margin: 0 }}>{statusMsg}</p>
            <div className="cluster" style={{ gap: '8px' }}>
              <button className="btn btn-ghost" type="button" onClick={handleClearAll}>全て削除</button>
            </div>
          </div>

          {historyItems.length === 0 ? (
            <p className="muted">まだ閲覧履歴はありません。</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
              {historyItems.map(f => {
                const title = f.providerName || f.name || '';
                const img = f.image?.trim() || null;
                const when = f.viewedAt ? new Date(f.viewedAt).toLocaleString('ja-JP') : '';
                return (
                  <div
                    key={f.href}
                    onClick={() => { window.location.href = f.href; }}
                    style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '16px', overflow: 'hidden', background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'box-shadow .15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ height: '200px', overflow: 'hidden', background: 'rgba(10,15,30,0.45)', flexShrink: 0 }}>
                      {img && <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, lineHeight: '1.3' }}>{title}</h3>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleRemove(f.href); }}
                          style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}
                        >✕</button>
                      </div>
                      {f.category && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: '#111', color: '#fff', borderRadius: '99px', alignSelf: 'flex-start' }}>{labelCategory(f.category)}</span>}
                      {f.region && <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: 0 }}>📍 {labelRegion(f.region)}</p>}
                      {when && <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.40)', margin: 0, marginTop: 'auto' }}>閲覧: {when}</p>}
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
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
