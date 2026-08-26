'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import useTrack from '@/app/_hooks/useTrack';

// マイページ内タブ（スマホでは横スクロール）。全ページで別々に複製されていた結果、
// タブを押すたびにページごと再マウントされ横スクロール位置がリセットされる不具合があった。
// 1つの共有コンポーネントに統一し、scrollLeft を sessionStorage に保存・復元することで解決する。
const SCROLL_KEY = 'fineme:mypage:sidenav:scrollLeft';

export default function MypageSideNav({ asideClassName = 'mypage-sidenav' }) {
  const { track } = useTrack();
  const pathname = usePathname();
  const navRef = useRef(null);

  const links = [
    { href: '/mypage', label: 'ホーム', active: pathname === '/mypage' },
    { href: '/mypage/mirror', label: 'Mirror履歴', active: pathname.startsWith('/mypage/mirror') },
    { href: track.diagnosisResult, label: '診断結果', active: pathname === track.diagnosisResult || pathname.startsWith('/mypage/diagnosis') },
    { href: '/mypage/navi', label: 'New Me Map', active: pathname.startsWith('/mypage/navi') },
    { href: '/mypage/log', label: 'New Me Log', active: pathname.startsWith('/mypage/log') },
    { href: '/mypage/subscription', label: 'サブスク設定', active: pathname.startsWith('/mypage/subscription') },
    { href: '/mypage/favorites', label: 'お気に入り', active: pathname.startsWith('/mypage/favorites') },
    { href: '/mypage/history', label: '閲覧履歴', active: pathname.startsWith('/mypage/history') },
    { href: '/my-reservations', label: '予約履歴', active: pathname.startsWith('/my-reservations') },
    { href: '/mypage/story-submit', label: '体験談を書く', active: pathname.startsWith('/mypage/story-submit') },
    { href: '/mypage/profile', label: 'プロフィール編集', active: pathname.startsWith('/mypage/profile') },
  ];

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) el.scrollLeft = parseInt(saved, 10) || 0;
    } catch {}
  }, []);

  function handleScroll(e) {
    try { sessionStorage.setItem(SCROLL_KEY, String(e.currentTarget.scrollLeft)); } catch {}
  }

  return (
    <aside className={asideClassName}>
      <nav className="stack" style={{ gap: '4px' }} ref={navRef} onScroll={handleScroll}>
        {links.map(l => (
          <Link key={l.label} href={l.href} className={`sidenav-link${l.active ? ' sidenav-link--active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
