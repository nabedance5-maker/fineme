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
  diagnosis: 'カラー/骨格診断', fashion: 'コーデ提案', photo: '写真撮影（アプリ等）', marriage: '結婚相談所',
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
            <Link href="/mypage/diagnosis" className="sidenav-link">診断結果</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link sidenav-link--active">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
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
            <div className="features-grid">
              {historyItems.map(f => {
                const title = f.providerName || f.name || '';
                const img = (f.image && f.image.trim()) ? f.image : '/assets/placeholders/placeholder-default.svg';
                const when = f.viewedAt ? new Date(f.viewedAt).toLocaleString() : '';
                return (
                  <div
                    key={f.href}
                    className="card"
                    role="link"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onClick={() => { window.location.href = f.href; }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.href = f.href; } }}
                  >
                    <img className="service-thumb" src={img} alt={title} />
                    <div className="card-body">
                      <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
                        <div className="cluster" style={{ gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            title="この履歴を削除"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); handleRemove(f.href); }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <p className="card-meta">{labelRegion(f.region || '')}</p>
                      <p className="card-meta">{labelCategory(f.category || '')}</p>
                      {f.priceFrom && <p className="card-meta">¥{Number(f.priceFrom).toLocaleString()}</p>}
                      {f.providerId && (
                        <p className="card-meta">
                          <a href={`/store?providerId=${encodeURIComponent(f.providerId)}`} onClick={e => e.stopPropagation()}>店舗詳細</a>
                        </p>
                      )}
                      {when && <p className="muted" style={{ fontSize: '12px' }}>閲覧: {when}</p>}
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
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: #f3f4f6; }
        .sidenav-link--active { background: #f3f4f6; font-weight: 700; color: #111; }
      `}</style>
    </main>
  );
}
