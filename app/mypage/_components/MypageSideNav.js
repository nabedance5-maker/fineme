'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import useTrack from '@/app/_hooks/useTrack';

// マイページ内タブ（スマホでは横スクロール）。全ページで別々に複製されていた結果、
// タブを押すたびにページごと再マウントされ横スクロール位置がリセットされる不具合があった。
// 1つの共有コンポーネントに統一し、scrollLeft を sessionStorage に保存・復元することで解決する。
const SCROLL_KEY = 'fineme:mypage:sidenav:scrollLeft';

// サイドナビ・2カラムレイアウトのCSS。これまで各マイページが同じ<style>を複製して持っていたため、
// 複製が無いページ（/mypage/contracts）だけメニューバーが崩れた（でお指摘2026-10-19）。
// コンポーネント自身が持つので、今後ページを足しても崩れない。各ページの複製は同じ内容なので共存して問題ない。
const SIDENAV_CSS = `
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav, .mypage-content { min-width: 0; }
        .mypage-sidenav { background: #151b24; backdrop-filter: blur(8px); border: 1px solid rgba(236,232,223,0.154); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(200,164,90,0.1); color: #e8e4dc; }
        .sidenav-link--active { background: rgba(200,164,90,0.14); font-weight: 700; color: #c8a45a; border-left: 3px solid #c8a45a; padding-left: 9px; }
`;

export default function MypageSideNav({ asideClassName = 'mypage-sidenav' }) {
  const { track } = useTrack();
  const pathname = usePathname();
  const navRef = useRef(null);

  const links = [
    { href: '/mypage', label: 'ホーム', active: pathname === '/mypage' },
    { href: '/mypage/notices', label: 'お店からのお知らせ', active: pathname.startsWith('/mypage/notices') },
    { href: '/mypage/mirror', label: 'Mirror履歴', active: pathname.startsWith('/mypage/mirror') },
    { href: track.diagnosisResult, label: '診断結果', active: pathname === track.diagnosisResult || pathname.startsWith('/mypage/diagnosis') },
    { href: '/mypage/navi', label: 'New Me Map', active: pathname.startsWith('/mypage/navi') },
    { href: '/mypage/log', label: 'New Me Log', active: pathname.startsWith('/mypage/log') },
    { href: '/mypage/packages', label: 'パッケージ・回数券', active: pathname.startsWith('/mypage/packages') },
    { href: '/mypage/memberships', label: '入会手続き', active: pathname.startsWith('/mypage/memberships') },
    { href: '/mypage/contracts', label: '契約書', active: pathname.startsWith('/mypage/contracts') },
    { href: '/mypage/checkin', label: 'チェックインQR', active: pathname.startsWith('/mypage/checkin') },
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
    <>
    <style>{SIDENAV_CSS}</style>
    <aside className={asideClassName}>
      <nav className="stack" style={{ gap: '4px' }} ref={navRef} onScroll={handleScroll}>
        {links.map(l => (
          <Link key={l.label} href={l.href} className={`sidenav-link${l.active ? ' sidenav-link--active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
    </>
  );
}
