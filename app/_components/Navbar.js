"use client";
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const SearchBar = dynamic(() => import('./SearchBar'), { ssr: false });

export default function Navbar() {
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
        <div className="navbar-search hide-mobile">
          <SearchBar compact={true} />
        </div>
        <nav className="nav-links">
          <Link href="/search">検索</Link>
          <Link href="/articles">特集</Link>
          <Link href="/pages/mypage/index.html">マイページ</Link>
          <Link
            href="/pages/diagnosis.html"
            style={{
              background: 'linear-gradient(90deg,#2563eb,#0e3760)',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            診断する
          </Link>
        </nav>
      </div>
    </header>
  );
}
