"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [authState, setAuthState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
        .nav-links { display: flex; align-items: center; gap: 4px; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: #e8e4dc; margin: 5px 0; border-radius: 2px; transition: all .2s; }
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-links.is-open {
            display: flex; flex-direction: column; align-items: stretch; gap: 0;
            position: absolute; top: 64px; left: 0; right: 0;
            background: rgba(10,15,30,0.97); border-bottom: 1px solid rgba(201,168,76,0.2);
            padding: 8px 16px 16px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          .nav-links a { padding: 12px 8px; border-bottom: 1px solid rgba(232,228,220,0.12); font-size: 15px; }
          .nav-links a:last-child { border-bottom: none; }
          .btn-diagnosis { text-align: center; margin-top: 4px; }
          .hamburger { display: block; }
        }
      `}</style>
      <div className="container navbar-inner" style={{ position: 'relative' }}>
        <Link href="/" className="brand logo" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
          <Image
            src="/assets/images/fineme-logo-v2.png"
            alt="Fineme"
            width={220}
            height={72}
            style={{ height: 'clamp(52px, 7vw, 68px)', width: 'auto', objectFit: 'contain' }}
            priority
          />
        </Link>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="メニュー">
          <span />
          <span />
          <span />
        </button>
        <nav className={`nav-links${menuOpen ? ' is-open' : ''}`}>
          <Link href="/search" onClick={closeMenu}>検索</Link>
          <Link href="/about" onClick={closeMenu}>Finemeとは？</Link>
          <Link href="/guide" onClick={closeMenu}>変容ガイド</Link>
          <Link href="/diagnosis" className="btn-diagnosis" onClick={closeMenu}>診断する</Link>
          {authState === null ? null : authState ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSignOut(); }}>ログアウト</a>
              <Link href="/mypage" className="btn"
                style={{ background: '#111', color: '#fff', padding: '7px 14px',
                         borderRadius: '8px', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}
                onClick={closeMenu}>
                マイページ
              </Link>
            </>
          ) : (
            <Link href="/login?next=/mypage" onClick={closeMenu}>ログイン</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
