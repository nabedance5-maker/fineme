'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',              label: 'ダッシュボード',      icon: '📊' },
  { href: '/admin/providers',    label: '掲載者管理',          icon: '🏢' },
  { href: '/admin/customers',    label: '顧客管理',            icon: '👥' },
  { href: '/admin/affiliates',   label: 'アフィリエイト管理',  icon: '🔗' },
  { href: '/admin/products',     label: '商品アフィリエイト',  icon: '🛒' },
  { href: '/admin/curated-posts', label: '投稿キュレーション', icon: '📱' },
  { href: '/admin/payments',     label: '支払い管理',          icon: '💳' },
  { href: '/admin/features',     label: '特集管理',            icon: '📝' },
  { href: '/admin/stories',      label: '体験談管理',          icon: '💬' },
  { href: '/admin/inquiries',    label: 'お問い合わせ',        icon: '📩' },
  { href: '/admin/analytics',    label: 'アナリティクス',      icon: '📈' },
  { href: '/admin/mirror',       label: 'Mirror計測',          icon: '🪞' },
  { href: '/admin/acquisition',  label: '集客施策',            icon: '📣' },
  { href: '/admin/feedback',     label: 'フィードバック',       icon: '⭐' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        /* 1frは minmax(auto,1fr) 扱いで、中の表・nowrap要素の最小幅に列ごと押し広げられ
           ページ全体が右にはみ出す（でお報告2026-10-10：テーブルをoverflow:autoで囲んでも直らなかった真因）。
           minmax(0,1fr)＋子のmin-width:0で、はみ出す要素は各自の枠内でスクロールさせる。 */
        .admin-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 24px; align-items: start; max-width: 1200px; margin: 0 auto; padding: 32px 20px 80px; }
        .admin-main { min-width: 0; max-width: 100%; }
        .admin-main img, .admin-main video { max-width: 100%; height: auto; }
        .admin-sidenav { position: sticky; top: 80px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px 8px; }
        .admin-sidenav a { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; text-decoration: none; transition: background .15s; }
        .admin-sidenav a:hover { background: #f3f4f6; }
        .admin-sidenav a.is-active { background: #111827; color: #fff; font-weight: 700; }
        @media (max-width: 768px) { .admin-layout { grid-template-columns: minmax(0, 1fr); padding: 16px 12px 80px; } .admin-sidenav { position: static; display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; } .admin-sidenav a { padding: 8px 12px; font-size: 13px; } }
      `}</style>
      <div className="admin-layout">
        <nav className="admin-sidenav">
          {NAV.map(({ href, label, icon }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={isActive ? 'is-active' : ''}>
                <span>{icon}</span>{label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-main">{children}</div>
      </div>
    </>
  );
}
