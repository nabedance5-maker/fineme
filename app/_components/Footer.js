"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  // 掲載者ダッシュボードは白背景の業務ツールに刷新（2026-09-11）。ユーザー向け
  // マーケティングフッターが下に付くと世界観が合わないため、Navbar同様に非表示にする。
  if (pathname?.startsWith('/provider/dashboard')) return null;

  return (
    <footer className="footer">
      <div className="container" style={{display:'flex', flexDirection:'column', gap:'12px'}}>
        <nav style={{display:'flex', flexWrap:'wrap', gap:'12px 20px', justifyContent:'center'}}>
          <Link href="/tokusho" style={{fontSize:'13px', color:'inherit'}}>特定商取引法</Link>
          <Link href="/privacy" style={{fontSize:'13px', color:'inherit'}}>プライバシーポリシー</Link>
          <Link href="/terms" style={{fontSize:'13px', color:'inherit'}}>利用規約</Link>
          <Link href="/about" style={{fontSize:'13px', color:'inherit'}}>About Fineme</Link>
          <Link href="/provider/join" style={{fontSize:'13px', color:'inherit'}}>掲載をご検討中の方</Link>
          <Link href="/login?type=provider" style={{fontSize:'13px', color:'inherit'}}>掲載者ログイン</Link>
        </nav>
        <div style={{textAlign:'center', fontSize:'12px', color:'#9ca3af'}}>
          © {new Date().getFullYear()} Fineme
        </div>
      </div>
    </footer>
  );
}
