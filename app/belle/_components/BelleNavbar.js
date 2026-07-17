"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function BelleNavbar() {
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
    } catch {}
    window.location.href = '/belle';
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(20, 10, 18, 0.97)',
      borderBottom: '1px solid rgba(200, 140, 160, 0.2)',
      backdropFilter: 'blur(8px)',
    }}>
      <style>{`
        .belle-nav-links { display: flex; align-items: center; gap: 4px; }
        .belle-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; }
        .belle-hamburger span { display: block; width: 22px; height: 2px; background: #f0d8e0; margin: 5px 0; border-radius: 2px; }
        @media (max-width: 768px) {
          .belle-nav-links { display: none; }
          .belle-nav-links.is-open {
            display: flex; flex-direction: column; align-items: stretch; gap: 0;
            position: absolute; top: 60px; left: 0; right: 0;
            background: rgba(20,10,18,0.98); border-bottom: 1px solid rgba(200,140,160,0.2);
            padding: 8px 16px 16px; z-index: 100;
          }
          .belle-nav-links a { padding: 12px 8px; border-bottom: 1px solid rgba(240,216,224,0.12); font-size: 15px; }
          .belle-nav-links a:last-child { border-bottom: none; }
          .belle-hamburger { display: block; }
        }
      `}</style>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        {/* ロゴ */}
        <Link href="/belle" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#f0d8e0', letterSpacing: '.02em' }}>
            Fineme
          </span>
          <span style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 14, fontWeight: 400, color: 'rgba(220,160,180,0.8)', letterSpacing: '.06em', marginLeft: 4 }}>
            Belle
          </span>
        </Link>

        <button className="belle-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="メニュー">
          <span /><span /><span />
        </button>

        <nav className={`belle-nav-links${menuOpen ? ' is-open' : ''}`}>
          <Link href="/belle/diagnosis" onClick={closeMenu}
            style={{ color: 'rgba(240,216,224,0.75)', textDecoration: 'none', fontSize: 14, padding: '6px 10px' }}>
            Me Scan
          </Link>
          <Link href="/belle/mirror" onClick={closeMenu}
            style={{ color: 'rgba(240,216,224,0.75)', textDecoration: 'none', fontSize: 14, padding: '6px 10px' }}>
            Mirror
          </Link>
          <Link href="/" onClick={closeMenu}
            style={{ color: 'rgba(240,216,224,0.4)', textDecoration: 'none', fontSize: 12, padding: '6px 10px' }}>
            男性版 →
          </Link>
          {authState === null ? null : authState ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSignOut(); closeMenu(); }}
                style={{ color: 'rgba(240,216,224,0.5)', textDecoration: 'none', fontSize: 13, padding: '6px 10px' }}>
                ログアウト
              </a>
              <Link href="/mypage" onClick={closeMenu}
                style={{ background: 'rgba(200,140,160,0.15)', border: '1px solid rgba(200,140,160,0.4)', color: '#f0d8e0', padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
                マイページ
              </Link>
            </>
          ) : (
            <Link href="/login?next=/mypage" onClick={closeMenu}
              style={{ color: 'rgba(240,216,224,0.6)', textDecoration: 'none', fontSize: 13, padding: '6px 10px' }}>
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
