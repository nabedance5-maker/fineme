'use client';
// 運営管理画面の外枠。掲載者ダッシュボード（app/provider/dashboard/page.js の DASHBOARD_CSS）と
// 同じ構成・配色に揃えた（でお要望2026-10-10：運営管理画面も掲載者管理画面と同じ作り・デザインに）。
// 左に完全固定のネイビー2ペイン（細いカテゴリー列＋選択カテゴリーの一覧）、右が白背景のメイン。
// スマホ（900px以下）はサイドバーを画面外に隠し、左上のハンバーガーで開くドロワーにする。
// 各ページの中身は既存のまま。外枠だけを差し替えている（中身は順次寄せる）。
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const CATEGORIES = [
  { key: 'home', label: 'ホーム', items: [
    { href: '/admin', label: 'ダッシュボード' },
  ] },
  { key: 'people', label: '掲載者\n・顧客', items: [
    { href: '/admin/providers', label: '掲載者管理' },
    { href: '/admin/customers', label: '顧客管理' },
    { href: '/admin/inquiries', label: 'お問い合わせ' },
    { href: '/admin/feedback', label: 'フィードバック' },
  ] },
  { key: 'money', label: '収益', items: [
    { href: '/admin/payments', label: '支払い管理' },
    { href: '/admin/affiliates', label: 'アフィリエイト管理' },
    { href: '/admin/products', label: '商品アフィリエイト' },
    { href: '/admin/sales-partners', label: '営業パートナー' },
    { href: '/admin/collaborator-rewards', label: '協業者の報酬' },
  ] },
  { key: 'content', label: '記事', items: [
    { href: '/admin/features', label: '特集管理' },
    { href: '/admin/stories', label: '体験談管理' },
    { href: '/admin/curated-posts', label: '投稿キュレーション' },
  ] },
  { key: 'analytics', label: '分析\n・集客', items: [
    { href: '/admin/analytics', label: 'アナリティクス' },
    { href: '/admin/mirror', label: 'Mirror計測' },
    { href: '/admin/acquisition', label: '集客施策' },
  ] },
];

function isActiveHref(pathname, href) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function categoryOf(pathname) {
  return CATEGORIES.find(c => c.items.some(i => isActiveHref(pathname, i.href)))?.key || 'home';
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [category, setCategory] = useState(() => categoryOf(pathname));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setCategory(categoryOf(pathname));
    setNavOpen(false);
  }, [pathname]);

  const current = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];

  return (
    <>
      <style>{`
        .ad-root { background: var(--color-bg); min-height: 100vh; color: #1a1410; }
        .ad-topbar { display: none; }
        .ad-backdrop { display: none; }
        .ad-sidebar { width: 244px; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 30; background: #0a0f1e; padding: 20px 0 0; overflow-y: auto; }
        .ad-brand { padding: 0 16px 16px; }
        .ad-brand p { margin: 0; }
        .ad-brand .ad-brand-name { font-family: var(--font-serif); font-size: 20px; font-weight: 700; color: #c9a84c; letter-spacing: 1px; }
        .ad-brand .ad-brand-sub { font-size: 10px; color: rgba(232,228,220,0.4); letter-spacing: 1px; margin-top: 2px; }
        .ad-rail-wrap { display: flex; flex: 1; min-height: 0; }
        .ad-rail { width: 64px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; border-right: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
        .ad-rail-btn { display: flex; align-items: center; justify-content: center; text-align: center; white-space: pre-line; width: 100%; padding: 14px 4px; border: none; background: none; cursor: pointer; font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.55); line-height: 1.35; }
        .ad-rail-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
        .ad-rail-btn.active { background: rgba(201,168,76,0.16); color: #c9a84c; border-right: 2px solid #c9a84c; margin-right: -1px; }
        .ad-panel { flex: 1; min-width: 0; padding: 4px 8px 12px; display: flex; flex-direction: column; gap: 2px; }
        .ad-panel a { display: block; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); text-decoration: none; }
        .ad-panel a:hover { background: rgba(255,255,255,0.05); color: #e8e4dc; }
        .ad-panel a.active { background: rgba(201,168,76,0.14); color: #c9a84c; }
        /* 1frは minmax(auto,1fr) 扱いで中の表・nowrap要素の最小幅に引き伸ばされるため、
           mainは min-width:0 で必ず親の幅に収め、はみ出す要素は各自の枠内でスクロールさせる
           （でお報告2026-10-10：スマホで右にはみ出す不具合の真因）。 */
        .ad-main { margin-left: 244px; min-width: 0; max-width: 100%; padding: 28px 32px 80px; }
        .ad-main img, .ad-main video { max-width: 100%; height: auto; }
        /* 各ページが持つ<main className="section"><div className="container">の上下余白・中央寄せ幅は
           外枠側で管理するため打ち消す。 */
        .ad-main .section { padding: 0; }
        .ad-main .container { max-width: none; padding-left: 0; padding-right: 0; }
        .ad-main .card { background: #ffffff; border-color: rgba(26,20,16,0.08); box-shadow: 0 1px 3px rgba(10,15,30,0.05); }
        @media (max-width: 900px) {
          .ad-topbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0a0f1e; border-bottom: 1px solid rgba(201,168,76,0.15); position: fixed; top: 0; left: 0; right: 0; z-index: 40; }
          .ad-sidebar { width: 264px; transform: translateX(-100%); transition: transform .25s ease; box-shadow: 4px 0 24px rgba(0,0,0,0.4); z-index: 60; }
          .ad-sidebar.open { transform: translateX(0); }
          .ad-backdrop.open { display: block; position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,0.5); }
          .ad-main { margin-left: 0; padding: 70px 12px 80px; }
        }
      `}</style>
      <div className="ad-root">
        <div className="ad-topbar">
          <button type="button" aria-label="メニューを開く" onClick={() => setNavOpen(true)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#c9a84c', fontSize: 16, cursor: 'pointer' }}>☰</button>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: '#c9a84c' }}>fineme 運営</p>
        </div>
        <div className={`ad-backdrop${navOpen ? ' open' : ''}`} onClick={() => setNavOpen(false)} />
        <nav className={`ad-sidebar${navOpen ? ' open' : ''}`}>
          <div className="ad-brand">
            <p className="ad-brand-name">fineme</p>
            <p className="ad-brand-sub">運営管理</p>
          </div>
          <div className="ad-rail-wrap">
            <div className="ad-rail">
              {CATEGORIES.map(c => (
                <button key={c.key} type="button" className={`ad-rail-btn${c.key === category ? ' active' : ''}`} onClick={() => setCategory(c.key)}>{c.label}</button>
              ))}
            </div>
            <div className="ad-panel">
              {current.items.map(i => (
                <Link key={i.href} href={i.href} className={isActiveHref(pathname, i.href) ? 'active' : ''}>{i.label}</Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="ad-main">{children}</div>
      </div>
    </>
  );
}
