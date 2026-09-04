'use client';
// 掲載者ダッシュボードのビジュアルデザイン方向性サンプル。
// 瀧口さん作成のSNS用モックアップ画像（ネイビー×ゴールド、サイドバー型、KPIカード、
// 「そろそろ来店」リスト、LINE案内ボタン）を元に、実際のFineme機能（New Me Log・
// カルテ・LINE連携）の見た目だけをこの方向性に寄せたら、という検証用サンプル。
// 実データ・APIには一切繋がっておらず、全てハードコードのサンプルデータ。
// 本番の /provider/dashboard はまだ一切変更していない。
import { useState } from 'react';

const VISITS_TREND = [42, 48, 45, 52, 58, 55, 62, 68];

const SOON_CUSTOMERS = [
  { name: '山田 花子', days: 3, cycle: 35, visits: 12, lastVisit: '2026-08-01' },
  { name: '佐藤 太郎', days: 5, cycle: 28, visits: 7, lastVisit: '2026-08-03' },
  { name: '鈴木 美咲', days: 7, cycle: 42, visits: 21, lastVisit: '2026-07-27' },
];

const CUSTOMER_LIST = [
  { name: '山田 花子', lastVisit: '2026-08-01', cycle: 35, visits: 12, next: 'そろそろです', axis: '髪・ヘア' },
  { name: '佐藤 太郎', lastVisit: '2026-08-03', cycle: 28, visits: 7, next: 'あと5日', axis: '肌・エステ' },
  { name: '鈴木 美咲', lastVisit: '2026-07-27', cycle: 42, visits: 21, next: 'あと7日', axis: '眉' },
  { name: '田中 健一', lastVisit: '2026-07-10', cycle: 30, visits: 4, next: '休眠気味', axis: '体型・ボディ' },
];

const NAV_ITEMS = [
  { key: 'dashboard', icon: '◧', label: 'ダッシュボード' },
  { key: 'customers', icon: '◎', label: '顧客管理' },
  { key: 'karte', icon: '▤', label: 'カルテ' },
  { key: 'analytics', icon: '◔', label: '分析' },
  { key: 'settings', icon: '⚙', label: '設定' },
];

function sparklinePoints(values, w = 560, h = 140, pad = 16) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16,
      padding: '20px 22px', flex: '1 1 180px', minWidth: 160,
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(232,228,220,0.55)', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: accent ? '#c9a84c' : '#e8e4dc', fontFamily: 'var(--font-serif-ja)' }}>{value}</p>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="dds-fade">
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="今月の来店数" value="128" />
        <StatCard label="今月の来店客数" value="356" />
        <StatCard label="見込み客" value="68%" />
        <StatCard label="売上（今月）" value="¥1,234,567" accent />
      </div>

      <div className="dds-grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16, padding: 22 }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#e8e4dc' }}>来店推移</p>
          <svg viewBox="0 0 560 140" style={{ width: '100%', height: 140, display: 'block' }}>
            <polyline points={sparklinePoints(VISITS_TREND)} fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {VISITS_TREND.map((v, i) => {
              const pts = sparklinePoints(VISITS_TREND).split(' ')[i].split(',');
              return <circle key={i} cx={pts[0]} cy={pts[1]} r="3" fill="#0a0f1e" stroke="#c9a84c" strokeWidth="2" />;
            })}
          </svg>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16, padding: 22 }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#e8e4dc' }}>そろそろ来店の顧客</p>
          <div className="stack" style={{ gap: 10 }}>
            {SOON_CUSTOMERS.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                  {c.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e8e4dc' }}>{c.name} 様</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(201,168,76,0.12)', color: '#c9a84c', whiteSpace: 'nowrap' }}>あと{c.days}日</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersView() {
  return (
    <div className="dds-fade stack" style={{ gap: 12 }}>
      {CUSTOMER_LIST.map(c => (
        <div key={c.name} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16,
          padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
            {c.name[0]}
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#e8e4dc' }}>{c.name} 様</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>
              最終来店 {c.lastVisit}／サイクル{c.cycle}日／来店{c.visits}回
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>{c.axis}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.next === '休眠気味' ? '#f87171' : '#e8e4dc' }}>{c.next}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#06c755', color: '#fff', cursor: 'pointer' }}>LINEでご案内</button>
            <button type="button" style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, border: '1.5px solid rgba(201,168,76,0.4)', background: 'transparent', color: '#c9a84c', cursor: 'pointer' }}>メモを追加</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceholderView({ label }) {
  return (
    <div className="dds-fade" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.25)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,228,220,0.5)' }}>「{label}」画面のデザインサンプルは未作成です（ダッシュボード・顧客管理のみ先行）</p>
    </div>
  );
}

export default function DashboardDesignSample() {
  const [active, setActive] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const activeItem = NAV_ITEMS.find(n => n.key === active);

  function selectNav(key) {
    setActive(key);
    setNavOpen(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', color: '#e8e4dc', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        .dds-fade { animation: dds-fade-in .35s ease; }
        @keyframes dds-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .dds-nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 16px; border-radius: 10px; border: none; background: transparent; color: rgba(232,228,220,0.65); font-size: 13px; font-weight: 600; cursor: pointer; text-align: left; transition: background .15s, color .15s; }
        .dds-nav-item:hover { background: rgba(255,255,255,0.05); color: #e8e4dc; }
        .dds-nav-item.active { background: rgba(201,168,76,0.14); color: #c9a84c; }

        .dds-topbar { display: none; }
        .dds-sidebar { width: 220px; flex-shrink: 0; }
        .dds-backdrop { display: none; }

        @media (max-width: 780px) {
          .dds-topbar { display: flex; }
          .dds-sidebar {
            position: fixed; top: 0; bottom: 0; left: 0; z-index: 60; width: 240px;
            transform: translateX(-100%); transition: transform .25s ease;
            background: #0a0f1e; box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }
          .dds-sidebar.dds-open { transform: translateX(0); }
          .dds-backdrop.dds-open {
            display: block; position: fixed; inset: 0; z-index: 55;
            background: rgba(0,0,0,0.5);
          }
          .dds-main { padding: 16px 16px 60px !important; }
          .dds-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* モバイル用トップバー */}
      <div className="dds-topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0a0f1e', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <button type="button" onClick={() => setNavOpen(v => !v)} aria-label="メニューを開く" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#c9a84c', fontSize: 16, cursor: 'pointer' }}>☰</button>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: '#c9a84c' }}>fineme</p>
      </div>

      {/* サイドバー背景（モバイルのみ表示、タップで閉じる） */}
      <div className={`dds-backdrop${navOpen ? ' dds-open' : ''}`} onClick={() => setNavOpen(false)} />

      {/* サイドバー */}
      <aside className={`dds-sidebar${navOpen ? ' dds-open' : ''}`} style={{ borderRight: '1px solid rgba(201,168,76,0.15)', padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ padding: '0 10px', marginBottom: 28 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>fineme</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(232,228,220,0.4)', letterSpacing: 1 }}>顧客管理システム</p>
        </div>
        {NAV_ITEMS.map(item => (
          <button key={item.key} type="button" className={`dds-nav-item${active === item.key ? ' active' : ''}`} onClick={() => selectNav(item.key)}>
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </aside>

      {/* メイン */}
      <main className="dds-main" style={{ flex: 1, minWidth: 0, padding: '24px 32px 60px', paddingTop: 'max(24px, env(safe-area-inset-top))' }}>
        <div className="dds-topbar-spacer" style={{ height: 0 }} />
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#c9a84c', marginBottom: 20 }}>
          🎨 これはビジュアルデザインのサンプルです。実データ・実機能とは連動していません。本番の掲載者ダッシュボードはまだ変更していません。
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 22, margin: '0 0 20px', color: '#e8e4dc' }}>{activeItem?.label}</h1>

        {active === 'dashboard' && <DashboardView />}
        {active === 'customers' && <CustomersView />}
        {(active === 'karte' || active === 'analytics' || active === 'settings') && <PlaceholderView label={activeItem?.label} />}
      </main>

      <style>{`
        @media (max-width: 780px) {
          .dds-main { margin-top: 58px; }
        }
      `}</style>
    </div>
  );
}
