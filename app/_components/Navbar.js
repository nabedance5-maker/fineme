"use client";
import Link from 'next/link';
import dynamic from 'next/dynamic';

const SearchBar = dynamic(() => import('./SearchBar'), { ssr: false });

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
  <Link href="/" className="brand">Fineme</Link>
        <div className="navbar-search hide-mobile">
          <SearchBar compact={true} />
        </div>
        <nav className="nav-links">
          <Link href="/search">検索</Link>
          <Link href="/articles">特集</Link>
          <Link href="/account">マイページ</Link>
        </nav>
      </div>
    </header>
  );
}
