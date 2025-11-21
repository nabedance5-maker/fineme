import React from 'react';
import Link from 'next/link';

const Header: React.FC = ()=>{
  return (
    <header id="site-header">
      <style jsx global>{`
        #header-diagnosis-btn{ color: #fff !important; background: linear-gradient(90deg,var(--primary,#2563eb),#0e3760) !important; border:none !important; padding:8px 10px; border-radius:8px; }
      `}</style>
      <style jsx>{`
        /* keep small, mirrors components/header.html styles used by static pages */
        .navbar .brand { white-space:nowrap; font-weight:700; font-size:clamp(16px,2.2vw,20px); }
        .nav-links { display:flex; gap:8px; align-items:center; overflow-x:auto; }
        .nav-links a { display:inline-block; white-space:nowrap; text-decoration:none; }
        .header-actions { display:inline-flex; align-items:center; gap:8px; }
        @media (min-width:1025px) { .nav-links > a:first-of-type { margin-left:auto !important; } }
      `}</style>
      <div className="navbar">
        <div className="container navbar-inner">
          <Link href="/"><a className="brand logo">Fineme</a></Link>
          <button className="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="メニュー">☰</button>
          <div className="nav-group" id="nav-menu">
            <nav className="nav-links">
              <a href="/pages/search.html">検索</a>
              <a href="/pages/about.html">私たちについて</a>
              <a href="/pages/feature.html">特集</a>
              <div className="header-actions">
                <div id="header-notifs" style={{position:'relative'}}>
                  <button id="header-notifs-btn" className="btn btn-ghost" type="button" aria-label="通知">🔔 <span id="header-notifs-badge" style={{display:'inline-block',minWidth:18,padding:'2px 6px',borderRadius:999,background:'#ef4444',color:'#fff',fontSize:12,marginLeft:6}} hidden>0</span></button>
                  <div id="header-notifs-dropdown" style={{position:'absolute',right:0,top:36,minWidth:280,background:'#fff',border:'1px solid #eee',borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,.06)',display:'none',zIndex:1200,padding:8}}>
                    <div id="header-notifs-list" style={{maxHeight:240,overflow:'auto'}} />
                    <div style={{textAlign:'right',marginTop:8}}><button id="header-notifs-clear" className="btn btn-ghost">すべて既読</button></div>
                  </div>
                </div>
                <Link href="/diagnosis"><a id="header-diagnosis-btn" className="btn" style={{color:'#fff'}}>診断する</a></Link>
                <span id="header-auth-area"><a id="header-login-link" href="/pages/user/login.html">ログイン</a></span>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
