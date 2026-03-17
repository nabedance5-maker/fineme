"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [authState, setAuthState] = useState(null); // null=loading, false=guest, object=user

  useEffect(() => {
    try {
      // Supabase auth token チェック
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
      // レガシー sessionStorage チェック
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

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="brand logo" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Image
            src="/assets/images/fineme-logo-text.png"
            alt="Fineme"
            height={36}
            width={120}
            style={{ height: 'clamp(28px,4vw,40px)', width: 'auto', objectFit: 'contain' }}
            priority
          />
        </Link>
        <nav className="nav-links">
          <Link href="/search">検索</Link>
          <Link href="/about">Finemeとは？</Link>
          <Link href="/articles">特集</Link>
          <Link href="/diagnosis" className="btn-diagnosis">診断する</Link>
          {authState === null ? null : authState ? (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSignOut(); }}
                style={{ whiteSpace: 'nowrap' }}>ログアウト</a>
              <Link href="/mypage" className="btn"
                style={{ background: '#111', color: '#fff', padding: '7px 14px',
                         borderRadius: '8px', fontWeight: 700, fontSize: '13px' }}>
                マイページ
              </Link>
            </>
          ) : (
            <Link href="/login?next=/mypage" style={{ whiteSpace: 'nowrap' }}>ログイン</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
