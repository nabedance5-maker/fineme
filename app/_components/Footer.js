"use client";
import Link from 'next/link';

export default function Footer() {
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
