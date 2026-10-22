'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import useTrack from '@/app/_hooks/useTrack';
import { mypageMenu } from './menu';

// マイページのメニュー（2026-10-22 UI刷新）。
// 以前は16項目を平らに並べ、スマホでは横スクロールのタブにしていたため「ごちゃごちゃして使いづらい」状態だった。
// ・PC：左に「予約・お店／あなたの変化／アカウント」の3つのまとまりで並べる
// ・スマホ：ホームではメニューを出さない（ホーム自体がメニューになっている）。各ページでは
//   「‹ マイページ」と今いるページ名、押すと開く「メニュー」だけを出す
// 2カラムのレイアウトのCSSもこの部品が持つ（ページごとに複製しない）。
const NAV_CSS = `
  .mypage-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 40px; align-items: start; }
  .mypage-content { min-width: 0; }
  .mpn-aside { position: sticky; top: 84px; min-width: 0; }
  .mpn-group + .mpn-group { margin-top: 22px; }
  .mpn-group-label { margin: 0 0 6px 12px; font-size: 11.5px; font-weight: 700; letter-spacing: .08em; color: rgba(232,228,220,0.62); }
  .mpn-link { display: flex; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 10px; font-size: 14px; color: #e8e4dc; text-decoration: none; transition: background .15s; }
  .mpn-link:hover { background: rgba(232,228,220,0.06); }
  .mpn-link:focus-visible { outline: 2px solid #c8a45a; outline-offset: 2px; }
  .mpn-link[aria-current="page"] { background: rgba(200,164,90,0.14); color: #fff; font-weight: 700; box-shadow: inset 3px 0 0 #c8a45a; }
  .mpn-home { margin-bottom: 18px; }
  .mpn-bar { display: none; }
  @media (max-width: 760px) {
    .mypage-layout { grid-template-columns: minmax(0, 1fr); gap: 0; }
    .mpn-aside { position: static; }
    .mpn-desktop { display: none; }
    .mpn-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: -8px 0 18px; }
    .mpn-back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 14px; color: #e8e4dc; text-decoration: none; }
    .mpn-menu-btn { min-height: 40px; padding: 0 16px; border-radius: 99px; border: 1px solid rgba(232,228,220,0.22); background: transparent; color: #e8e4dc; font-size: 13px; font-weight: 700; cursor: pointer; }
    .mpn-sheet { margin: -6px 0 20px; padding: 14px 6px; border: 1px solid rgba(232,228,220,0.14); border-radius: 16px; background: #151b24; }
  }
`;

function MenuGroups({ groups, pathname, onPick }) {
  return groups.map(g => (
    <div key={g.label} className="mpn-group">
      <p className="mpn-group-label">{g.label}</p>
      {g.items.map(it => (
        <Link key={it.href} href={it.href} className="mpn-link" aria-current={it.match(pathname) ? 'page' : undefined} onClick={onPick}>
          {it.label}
        </Link>
      ))}
    </div>
  ));
}

export default function MypageSideNav() {
  const { track } = useTrack();
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  const groups = mypageMenu(track);
  const isHome = pathname === '/mypage';
  const current = groups.flatMap(g => g.items).find(it => it.match(pathname));

  return (
    <>
      <style>{NAV_CSS}</style>
      <aside className="mpn-aside">
        <nav className="mpn-desktop" aria-label="マイページのメニュー">
          <Link href="/mypage" className="mpn-link mpn-home" aria-current={isHome ? 'page' : undefined}>マイページのホーム</Link>
          <MenuGroups groups={groups} pathname={pathname} />
        </nav>
        {!isHome && (
          <>
            <div className="mpn-bar">
              <Link href="/mypage" className="mpn-back"><span aria-hidden="true">‹</span>マイページ{current ? <span style={{ color: 'rgba(232,228,220,0.62)' }}>／{current.label}</span> : null}</Link>
              <button type="button" className="mpn-menu-btn" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? '閉じる' : 'メニュー'}</button>
            </div>
            {open && (
              <nav className="mpn-sheet" aria-label="マイページのメニュー">
                <MenuGroups groups={groups} pathname={pathname} onPick={() => setOpen(false)} />
              </nav>
            )}
          </>
        )}
      </aside>
    </>
  );
}
