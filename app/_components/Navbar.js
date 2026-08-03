"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

// 男女共通の統一ヘッダー。両トラック（男性向け / Belle）を対等に1つのメニューへ畳む。
// トラック切替ボタンは持たない（男女の入口分岐はトップページのデュアルCTAに一本化）。
const MENU_GROUPS = [
  {
    label: '男性向け',
    accent: '#c9a84c',
    links: [
      { href: '/feature',        label: 'Journal' },
      { href: '/diagnosis',      label: 'Me Scan' },
      { href: '/mirror',         label: 'Mirror' },
      { href: '/diagnosis/types', label: 'タイプ図鑑' },
    ],
  },
  {
    label: 'Belle（女性向け）',
    accent: '#e8789e',
    links: [
      { href: '/belle/journal',        label: 'Journal' },
      { href: '/belle/diagnosis',      label: 'Me Scan' },
      { href: '/belle/mirror',         label: 'Mirror' },
      { href: '/belle/diagnosis/types', label: 'タイプ図鑑' },
    ],
  },
];

export default function Navbar() {
  const [authState, setAuthState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      const sbKey = Object.keys(localStorage).find(
        k => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (sbKey) {
        const raw = localStorage.getItem(sbKey);
        if (raw) {
          const obj = JSON.parse(raw);
          const user = obj?.user;
          if (user?.id) {
            setAuthState({ id: user.id, email: user.email || '' });
            return;
          }
        }
      }
      const raw = sessionStorage.getItem('glowup:userSession');
      if (raw) { setAuthState(JSON.parse(raw)); return; }
      setAuthState(false);
    } catch {
      setAuthState(false);
    }
  }, []);

  // メニュー外クリック・Escで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  const handleSignOut = () => {
    try {
      const sbKey = Object.keys(localStorage).find(
        k => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (sbKey) localStorage.removeItem(sbKey);
      sessionStorage.removeItem('glowup:userSession');
    } catch {}
    window.location.href = '/';
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <style>{`
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .nav-link { color: #e8e4dc; text-decoration: none; font-size: 14px; padding: 8px 10px; }
        .nav-link:hover { color: #fff; }
        .menu-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          background: none; border: 1px solid rgba(201,168,76,0.35); color: #e8e4dc;
          cursor: pointer; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 600;
        }
        .menu-toggle:hover { border-color: rgba(201,168,76,0.7); color: #fff; }
        .menu-toggle .bars { display: inline-flex; flex-direction: column; gap: 3px; }
        .menu-toggle .bars span { display: block; width: 16px; height: 2px; background: currentColor; border-radius: 2px; }
        .menu-caret { font-size: 10px; opacity: .8; }
        .menu-panel {
          position: absolute; top: 100%; right: 0; margin-top: 8px;
          min-width: 320px; background: rgba(10,15,30,0.98);
          border: 1px solid rgba(201,168,76,0.25); border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.5); padding: 14px; z-index: 200;
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px;
        }
        .menu-group-label { font-size: 11px; font-weight: 800; letter-spacing: .06em; margin: 2px 0 6px; }
        .menu-group a { display: block; color: #e8e4dc; text-decoration: none; font-size: 14px; padding: 8px 6px; border-radius: 6px; }
        .menu-group a:hover { background: rgba(232,228,220,0.08); color: #fff; }
        .menu-foot { grid-column: 1 / -1; margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(232,228,220,0.12); }
        .menu-foot a { color: rgba(232,228,220,0.75); text-decoration: none; font-size: 13px; padding: 6px; }
        .menu-foot a:hover { color: #fff; }
        .nav-search-mobile { display: none; }
        @media (max-width: 560px) {
          .nav-search-inline { display: none; }
          .nav-search-mobile { display: inline; }
          .menu-panel { position: fixed; left: 12px; right: 12px; min-width: 0; grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="container navbar-inner" style={{ position: 'relative' }}>
        <Link href="/" className="brand logo" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image
            src="/assets/images/fineme-logo-final.png"
            alt="Fineme"
            width={220}
            height={72}
            style={{ height: 'clamp(52px, 7vw, 68px)', width: 'auto', objectFit: 'contain' }}
            priority
          />
        </Link>

        <div className="nav-right" ref={menuRef}>
          <Link href="/search" className="nav-link nav-search-inline" onClick={closeMenu}>検索</Link>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label="メニュー"
          >
            <span className="bars"><span /><span /><span /></span>
            メニュー<span className="menu-caret">▼</span>
          </button>

          {authState === null ? null : authState ? (
            <>
              <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); handleSignOut(); }}>ログアウト</a>
              <Link href="/mypage" className="btn"
                style={{ background: '#111', color: '#fff', padding: '7px 14px',
                         borderRadius: '8px', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>
                マイページ
              </Link>
            </>
          ) : (
            <Link href="/login?next=/mypage" className="nav-link">ログイン</Link>
          )}

          {menuOpen && (
            <div className="menu-panel" role="menu">
              {MENU_GROUPS.map(group => (
                <div className="menu-group" key={group.label}>
                  <div className="menu-group-label" style={{ color: group.accent }}>{group.label}</div>
                  {group.links.map(l => (
                    <Link key={l.href} href={l.href} onClick={closeMenu}>{l.label}</Link>
                  ))}
                </div>
              ))}
              <div className="menu-foot">
                <Link href="/search" onClick={closeMenu} className="nav-search-mobile">検索</Link>
                <Link href="/about" onClick={closeMenu}>Finemeとは？</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
