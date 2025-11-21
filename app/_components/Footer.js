"use client";
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container cluster" style={{justifyContent:'space-between'}}>
  <span>© {new Date().getFullYear()} Fineme</span>
        <nav className="cluster">
          <Link href="/about">運営者情報</Link>
          <Link href="/privacy">プライバシー</Link>
          <Link href="/terms">利用規約</Link>
        </nav>
      </div>
    </footer>
  );
}
