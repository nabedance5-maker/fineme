'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };
const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
const PATH_LABELS = { virgin:'初挑戦タイプ', quit:'リスタートタイプ', blind:'客観化タイプ', lapsed:'再開タイプ' };
const PATH_DESC   = { virgin:'このカテゴリは初めてです', quit:'続けられる仕組みから始めます', blind:'客観的な視点を取り入れます', lapsed:'ハードルを下げて再スタートします' };
const AXIS_TO_CATEGORY = { body:'gym', eyebrow:'eyebrow', fashion:'fashion', hair:'hair', skin:'esthetic', teeth:'whitening', nail:'nail' };
const TIER_LABEL = { 1:'基盤', 2:'深化', 3:'補完', 4:'仕上げ' };

export default function MypagePage() {
  const [loading, setLoading] = useState(true);
  const [resvSummary, setResvSummary] = useState(null);
  const [nextVisit, setNextVisit] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.user?.id) {
          setLoading(false);

          try {
            const raw = localStorage.getItem('fineme:diagnosis:latest');
            if (raw) setDiagnosis(JSON.parse(raw));
          } catch {}

          const email = obj.user.email;
          if (email) {
            supabaseAnon.auth.getSession().then(({ data }) => {
              const userEmail = data?.session?.user?.email || email;
              const token = data?.session?.access_token;
              const headers = token ? { Authorization: `Bearer ${token}` } : {};
              fetch('/api/reservations/by-contact?contact=' + encodeURIComponent(userEmail), { headers })
                .then(r => r.ok ? r.json() : [])
                .then(items => {
                  if (!Array.isArray(items) || !items.length) { setResvSummary({ empty: true }); return; }
                  const pending  = items.filter(r => r.status === 'pending').length;
                  const counter  = items.filter(r => r.status === 'counter_proposed').length;
                  const approved = items.filter(r => r.status === 'approved').length;
                  setResvSummary({ total: items.length, pending, counter, approved });
                  const now = new Date();
                  const upcoming = items
                    .filter(r => r.status === 'approved' && r.reserved_date && new Date(r.reserved_date) >= now)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                  if (upcoming.length > 0) setNextVisit(upcoming[0]);
                })
                .catch(() => setResvSummary({ error: true }));
            });
          }
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  function handleSignOut() {
    supabaseAnon.auth.signOut().then(() => { window.location.href = '/login'; });
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  // transform_vectors はobject形式 {body:{...}, eyebrow:{...}} で保存されるため配列に変換
  const tvRaw = diagnosis?.transform_vectors || {};
  const vectors = Array.isArray(tvRaw)
    ? tvRaw
    : Object.entries(tvRaw).map(([id, v]) => ({ id, ...v }));
  const compass = diagnosis?.compass_first || null;
  const compassVec = vectors.find(v => v.id === compass);

  // ギャップあり軸をティア→ギャップ降順でソート
  const gapAxes = vectors
    .filter(v => v.gap > 0)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return b.gap - a.gap;
    });
  const totalGap = gapAxes.reduce((s, v) => s + v.gap, 0);
  const scanDate = diagnosis?.at
    ? new Date(diagnosis.at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    : null;

  // ナビプレビュー: 上位3軸
  const naviPreviewAxes = gapAxes.slice(0, 3);

  return (
    <main className="section">
      <div className="container mypage-layout">
        {/* サイドナビ */}
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link sidenav-link--active">ホーム</Link>
            <Link href="/diagnosis/result" className="sidenav-link">New Me Navi</Link>
            <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
            <Link href="/mypage/log" className="sidenav-link">New Me Log</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
            <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title" style={{ marginBottom: '4px' }}>変容ダッシュボード</h1>
          {scanDate && <p className="muted" style={{ fontSize: '13px', margin: '0 0 20px' }}>最終スキャン: {scanDate}</p>}

          {/* ── New Me Navi カード ── */}
          {diagnosis ? (
            <div className="map-card">
              <div className="map-card-top">
                <div>
                  <p className="map-eyebrow">🗺 New Me Navi</p>
                  <p className="map-scan-date">スキャン済み {scanDate && `· ${scanDate}`}</p>
                </div>
                <Link href="/diagnosis/result" className="map-cta-btn">マップを見る →</Link>
              </div>

              {/* ゴール表示 */}
              {diagnosis.goal_change && (
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', borderLeft: '3px solid rgba(165,180,252,0.6)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px', letterSpacing: '.06em', textTransform: 'uppercase' }}>あなたのゴール</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.5 }}>
                    {String(diagnosis.goal_change).length > 60
                      ? String(diagnosis.goal_change).slice(0, 60) + '…'
                      : String(diagnosis.goal_change)}
                  </p>
                </div>
              )}

              {/* Fineme Compass — アクション付き */}
              {compass && (
                <div className="compass-row">
                  <span className="compass-icon">🧭</span>
                  <div className="compass-body">
                    <p className="compass-label">Fineme Compass — 最初の一手</p>
                    <p className="compass-axis">
                      {AXIS_ICONS[compass]}&nbsp;{AXIS_LABELS[compass]}
                      {compassVec?.path_type && (
                        <span className="compass-path">{PATH_LABELS[compassVec.path_type]}</span>
                      )}
                    </p>
                    {compassVec?.path_type && (
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>{PATH_DESC[compassVec.path_type]}</p>
                    )}
                  </div>
                  {AXIS_TO_CATEGORY[compass] && (
                    <Link
                      href={`/search?category=${AXIS_TO_CATEGORY[compass]}`}
                      style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, padding: '8px 12px', background: 'rgba(99,102,241,0.4)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.5)', borderRadius: '10px', textDecoration: 'none', whiteSpace: 'nowrap', lineHeight: 1.3, textAlign: 'center' }}
                    >
                      ガイドを<br />探す →
                    </Link>
                  )}
                </div>
              )}

              {/* 変容ベクトルサマリー */}
              {gapAxes.length > 0 && (
                <div className="gap-summary">
                  <p className="gap-summary-label">{gapAxes.length}軸にギャップあり — 変容ポテンシャル +{totalGap}</p>
                  <div className="gap-axes-row">
                    {gapAxes.slice(0, 5).map(v => (
                      <div key={v.id} className={`gap-axis-chip${v.id === compass ? ' gap-axis-chip--compass' : ''}`}>
                        {AXIS_ICONS[v.id]}&nbsp;{AXIS_LABELS[v.id]}
                        <span className="gap-chip-gap">+{v.gap}</span>
                      </div>
                    ))}
                    {gapAxes.length > 5 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>+{gapAxes.length - 5}軸</span>}
                  </div>
                </div>
              )}

              <div className="map-card-footer">
                <Link href="/mypage/navi" className="btn btn-ghost" style={{ fontSize: '13px', padding: '7px 14px' }}>New Me Map でロードマップを見る</Link>
                <Link href="/diagnosis" className="muted" style={{ fontSize: '12px' }}>再スキャン</Link>
              </div>
            </div>
          ) : (
            <div className="map-card map-card--empty">
              <p className="map-eyebrow" style={{ color: '#9ca3af' }}>🗺 New Me Navi</p>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 6px', color: '#111' }}>まだスキャンが<br />完了していません</h2>
              <p className="muted" style={{ fontSize: '14px', margin: '0 0 16px', lineHeight: 1.6 }}>Me Scanを受けると、あなたの変容ナビと<br />最初の一手が生成されます。</p>
              <Link href="/diagnosis" className="btn" style={{ fontSize: '14px', padding: '10px 20px' }}>Me Scanをはじめる →</Link>
            </div>
          )}

          {/* ── New Me Map プレビュー ── */}
          {naviPreviewAxes.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.06em' }}>New Me Map</p>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: '#111', margin: 0 }}>変容トラック</p>
                </div>
                <Link href="/mypage/navi" style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>すべて見る →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {naviPreviewAxes.map((v, i) => {
                  // 現在地はTierで表現: Tier1=25%, Tier2=50%, Tier3=75%, Tier4=100%
                  const progress = Math.max(5, ((4 - (v.tier || 4)) / 4) * 100);
                  const isCompass = v.id === compass;
                  return (
                    <div key={v.id} style={{ padding: '14px 16px', background: isCompass ? 'rgba(37,99,235,0.15)' : 'rgba(10,15,30,0.50)', borderRadius: '14px', border: isCompass ? '1.5px solid rgba(59,130,246,0.40)' : '1px solid rgba(232,228,220,0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{AXIS_ICONS[v.id]}</span>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(232,228,220,0.90)' }}>{AXIS_LABELS[v.id]}</span>
                            {isCompass && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', background: '#2563eb', color: '#fff', borderRadius: '99px' }}>🧭 最優先</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Tier {v.tier || 4} / {TIER_LABEL[v.tier] || '仕上げ'}</span>
                        </div>
                      </div>
                      {/* プログレスバー */}
                      <div style={{ height: '6px', background: 'rgba(232,228,220,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: isCompass ? '#2563eb' : '#6b7280', borderRadius: '99px', transition: 'width .4s' }} />
                      </div>
                      {v.path_type && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0' }}>{PATH_DESC[v.path_type]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Fineme Mirror CTA（Coming soon） ── */}
          <div style={{ position: 'relative', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px' }}>
              <span style={{ fontSize: '32px', flexShrink: 0 }}>🪞</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(201,168,76,0.7)', margin: '0 0 3px', letterSpacing: '.08em', textTransform: 'uppercase' }}>Fineme Mirror — オプション</p>
                <p style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(232,228,220,0.9)', margin: '0 0 4px' }}>写真でも変容余地を確認する</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: 0, lineHeight: 1.5 }}>AIが写真からNew Me Logを生成。Me Scanと照らし合わせて精度UP。</p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(232,228,220,0.6)', background: 'rgba(232,228,220,0.1)', border: '1px solid rgba(232,228,220,0.2)', borderRadius: '20px', padding: '4px 12px', flexShrink: 0, letterSpacing: '.06em' }}>Coming soon</span>
            </div>
          </div>

          {/* ── 次の来店予定 ── */}
          {nextVisit && (
            <div className="card" style={{ padding: '16px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.35)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>次の来店予定</p>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#111', margin: '0 0 2px' }}>
                {new Date(nextVisit.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                {nextVisit.time ? `　${nextVisit.time}` : ''}
              </p>
              {nextVisit.providerName && <p className="muted" style={{ fontSize: '13px', margin: 0 }}>{nextVisit.providerName}</p>}
              <Link href="/my-reservations" className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px', padding: '6px 12px' }}>予約詳細を見る</Link>
            </div>
          )}

          {/* ── 予約状況（コンパクト） ── */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '15px' }}>予約状況</h2>
              <Link href="/my-reservations" className="muted" style={{ fontSize: '12px' }}>履歴を見る →</Link>
            </div>
            {resvSummary === null && <p className="muted" style={{ fontSize: '13px', margin: 0 }}>読み込み中…</p>}
            {resvSummary?.error && <p className="muted" style={{ fontSize: '13px', margin: 0 }}>取得できませんでした</p>}
            {resvSummary?.empty && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>まだ予約はありません</p>
                {compass && AXIS_TO_CATEGORY[compass] && (
                  <Link href={`/search?category=${AXIS_TO_CATEGORY[compass]}`} className="btn" style={{ fontSize: '12px', padding: '6px 14px' }}>
                    {AXIS_ICONS[compass]} {AXIS_LABELS[compass]}のガイドを探す
                  </Link>
                )}
                {!compass && (
                  <Link href="/search" className="btn" style={{ fontSize: '12px', padding: '6px 14px' }}>サービスを探す</Link>
                )}
              </div>
            )}
            {resvSummary?.total > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>合計 <strong>{resvSummary.total}件</strong></span>
                {resvSummary.counter > 0 && <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>代替提案 {resvSummary.counter}件 ⚠</span>}
                {resvSummary.pending > 0 && <span style={{ fontSize: '12px', color: '#f59e0b' }}>返答待ち {resvSummary.pending}件</span>}
                {resvSummary.approved > 0 && <span style={{ fontSize: '12px', color: '#10b981' }}>承認済み {resvSummary.approved}件</span>}
              </div>
            )}
          </div>

          <div>
            <button className="btn btn-ghost" style={{ fontSize: '13px' }} onClick={handleSignOut}>ログアウト</button>
          </div>
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; overflow-y: visible; gap: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }

        /* New Me Navi card */
        .map-card { background: linear-gradient(145deg, #0f172a, #1e1b4b); border-radius: 20px; padding: 22px; color: #fff; }
        .map-card--empty { background: rgba(10,15,30,0.50); border: 1.5px dashed rgba(232,228,220,0.20); }
        .map-card--empty .map-eyebrow { color: #9ca3af !important; }
        .map-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
        .map-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: rgba(255,255,255,.5); margin: 0 0 4px; text-transform: uppercase; }
        .map-scan-date { font-size: 12px; color: rgba(255,255,255,.6); margin: 0; }
        .map-cta-btn { font-size: 12px; font-weight: 700; padding: 7px 14px; background: rgba(255,255,255,.15); color: #fff; border: 1px solid rgba(255,255,255,.25); border-radius: 8px; text-decoration: none; white-space: nowrap; transition: background .15s; flex-shrink: 0; }
        .map-cta-btn:hover { background: rgba(255,255,255,.22); }

        /* Compass row */
        .compass-row { display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,.08); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
        .compass-icon { font-size: 24px; flex-shrink: 0; padding-top: 2px; }
        .compass-body { flex: 1; min-width: 0; }
        .compass-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.45); letter-spacing: .06em; margin: 0 0 3px; text-transform: uppercase; }
        .compass-axis { font-size: 16px; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .compass-path { font-size: 11px; font-weight: 600; color: #a5b4fc; padding: 2px 8px; background: rgba(165,180,252,.15); border-radius: 99px; }

        /* Gap summary */
        .gap-summary { margin-bottom: 16px; }
        .gap-summary-label { font-size: 11px; color: rgba(255,255,255,.5); margin: 0 0 8px; font-weight: 600; }
        .gap-axes-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .gap-axis-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); border: 1px solid rgba(255,255,255,.15); }
        .gap-axis-chip--compass { background: rgba(99,102,241,.35); border-color: #818cf8; color: #e0e7ff; }
        .gap-chip-gap { font-size: 10px; font-weight: 800; color: #a5b4fc; margin-left: 2px; }

        .map-card-footer { display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
        .map-card-footer .muted { color: rgba(255,255,255,.4) !important; }
        .map-card-footer .muted:hover { color: rgba(255,255,255,.7) !important; }
        .map-card-footer .btn-ghost { border-color: rgba(255,255,255,.25) !important; color: #fff !important; }
        .map-card-footer .btn-ghost:hover { background: rgba(255,255,255,.1) !important; }
      `}</style>
    </main>
  );
}
