'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  // ホームページ用スクリプトをDOMContentLoadedが発火済みでも動くよう動的ロード
  useEffect(() => {
    const srcs = [
      '/scripts/home-roadmap.js?v=20260316',
      '/scripts/home-reco.js?v=20251016',
      '/scripts/home-features.js?v=20251015',
      '/scripts/home-recent.js?v=20251016',
    ];
    let loaded = 0;
    srcs.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        loaded++;
        // 全スクリプトのロード完了後に1回だけDOMContentLoadedを発火
        if (loaded === srcs.length) {
          document.dispatchEvent(new Event('DOMContentLoaded'));
        }
      };
      document.body.appendChild(s);
    });
  }, []);

  useEffect(() => {
    // 目的セクション（保存済みゴールがあれば表示）
    try {
      const isLoggedIn = !!sessionStorage.getItem('glowup:userSession');
      if (isLoggedIn) {
        const saved = localStorage.getItem('fineme:goal:category');
        if (saved) {
          const map = { consulting:'コンサル/相談', gym:'パーソナルジム', makeup:'メイク', hair:'美容室', diagnosis:'診断', fashion:'ファッション', photo:'写真/撮影', marriage:'婚活/印象', eyebrow:'眉', hairremoval:'脱毛', esthetic:'エステ', cosmetic:'美容外科・美容クリニック', whitening:'ホワイトニング', orthodontics:'矯正', nail:'ネイル' };
          const label = map[saved] || saved;
          const sec = document.getElementById('goal-next-section');
          if (sec) sec.style.display = 'block';
          const host = document.getElementById('goal-next-content');
          if (host) {
            const ttl = document.createElement('div'); ttl.className = 'muted'; ttl.textContent = `保存された目的：${label}`; host.appendChild(ttl);
            const btnGo = document.createElement('a'); btnGo.className = 'btn'; btnGo.textContent = `${label}で探す`; btnGo.href = `/search?category=${encodeURIComponent(saved)}`; host.appendChild(btnGo);
          }
        }
      }
    } catch {}
  }, []);

  return (
    <>
      <style>{`
        .roadmap-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;}
        .roadmap-dot.is-done{background:#111;color:#fff;}
        .roadmap-dot.is-current{background:#2563eb;color:#fff;box-shadow:0 0 0 5px rgba(37,99,235,.15);}
        .roadmap-dot.is-locked{background:#e5e7eb;color:#9ca3af;}
        .roadmap-conn{flex:1;height:2px;background:#e5e7eb;transition:background .3s;}
        .roadmap-conn.is-done{background:#111;}
        .roadmap-phase-block{padding:16px;border-radius:14px;border:1.5px solid #e5e7eb;transition:all .3s;}
        .roadmap-phase-block.is-active{border-color:#2563eb;background:#f0f7ff;}
        .roadmap-phase-block.is-done{border-color:#10b981;background:#f0fdf4;}
        .roadmap-phase-block.is-locked{background:#fafafa;opacity:.65;}
        .roadmap-phase-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;}
        .roadmap-phase-num{font-size:11px;font-weight:800;padding:4px 12px;border-radius:99px;white-space:nowrap;}
        .roadmap-phase-num.active{background:#2563eb;color:#fff;}
        .roadmap-phase-num.done{background:#10b981;color:#fff;}
        .roadmap-phase-num.locked{background:#e5e7eb;color:#9ca3af;}
        .roadmap-phase-name{font-weight:700;font-size:15px;margin-bottom:3px;}
        .roadmap-phase-desc{font-size:13px;color:#6b7280;line-height:1.6;}
        .roadmap-status{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:6px;}
        .roadmap-status.active{background:#dbeafe;color:#1d4ed8;}
        .roadmap-status.done{background:#d1fae5;color:#065f46;}
      `}</style>

      <main>
        {/* ヒーロー */}
        <section className="hero hero--visual" style={{padding:'72px 0 56px'}}>
          <div className="container stack" style={{borderRadius:'32px',width:'100vw',maxWidth:'100vw',minWidth:0,overflowX:'auto',background:'transparent',boxShadow:'none'}}>
            <div className="hero-bg-fog"></div>
            <div className="hero-warm-overlay"></div>
            <h1 className="hero-title" style={{fontSize:'clamp(32px,6vw,54px)',fontFamily:"'Montserrat','Noto Sans JP',sans-serif",fontWeight:800,color:'#ffffff',marginBottom:'18px',textShadow:'0 3px 14px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.5)',textAlign:'center'}}>
              Find New Me<br />
              <span style={{fontSize:'22px',fontWeight:500,color:'#ffffff',textAlign:'center',display:'inline-block',width:'100%',textShadow:'0 3px 10px rgba(0,0,0,0.45)'}}>見た目も恋もアプデする、垢抜けサービス予約サイト。</span>
            </h1>
            <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center',justifyContent:'center',marginBottom:'8px'}}>
              <div style={{width:'100%',maxWidth:'900px',margin:'0 auto',textAlign:'center'}}>
                <p style={{fontSize:'15px',color:'#ffffff',margin:'0 0 16px',fontWeight:600,textShadow:'0 4px 14px rgba(0,0,0,0.5)'}}>選ばなくていい。まずはあなたを教えてください。</p>
                <Link href="/diagnosis" className="btn" style={{fontSize:'20px',padding:'14px 22px',borderRadius:'14px',background:'linear-gradient(90deg,var(--primary,#2563eb),#0e3760)',color:'#fff',border:'none',display:'inline-flex',alignItems:'center',gap:'10px',boxShadow:'0 6px 18px rgba(37,99,235,0.18)'}}>無料で診断する（3分）</Link>
                <div style={{marginTop:'14px',display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'center',justifyContent:'center',color:'#374151'}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'13px',background:'rgba(255,255,255,0.9)',padding:'6px 10px',borderRadius:'999px',border:'1px solid #e5e7eb'}}>⏱️ <strong style={{fontWeight:700}}>3分で完了</strong></span>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'13px',background:'rgba(255,255,255,0.9)',padding:'6px 10px',borderRadius:'999px',border:'1px solid #e5e7eb'}}>🙅‍♂️ 営業なし</span>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'8px',fontSize:'13px',background:'rgba(255,255,255,0.9)',padding:'6px 10px',borderRadius:'999px',border:'1px solid #e5e7eb'}}>🫱 正解・不正解はありません</span>
                </div>
                <p className="hero-sub" style={{fontSize:'15px',color:'#ffffff',margin:'22px 0 10px',fontWeight:500,textAlign:'center',maxWidth:'640px',marginLeft:'auto',marginRight:'auto',textShadow:'0 3px 10px rgba(0,0,0,0.4)'}}>眉を整える。肌を整える。髪を変える。服を見直す。</p>
                <p style={{fontSize:'15px',color:'#ffffff',margin:'0 0 18px',fontWeight:600,textAlign:'center',maxWidth:'640px',marginLeft:'auto',marginRight:'auto',textShadow:'0 4px 14px rgba(0,0,0,0.5)'}}>外見を磨くすべての一歩を、Finemeが"迷わせず"つなぎます。</p>
                <div style={{marginTop:'10px'}}>
                  <Link href="/search" className="btn" style={{fontSize:'14px',color:'#111827',background:'#ffffff',border:'1px solid #e5e7eb',borderRadius:'10px',padding:'10px 14px',boxShadow:'0 3px 10px rgba(0,0,0,0.08)'}}>診断せずに探す</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 変容ロードマップ（診断済みユーザー向け・home-roadmap.jsが制御） */}
        <section className="section" id="roadmap-section" style={{display:'none'}}>
          <div className="container stack" style={{gap:'20px'}}>
            <div>
              <span style={{display:'inline-block',fontSize:'11px',fontWeight:800,padding:'3px 10px',background:'#111',color:'#fff',borderRadius:'99px',marginBottom:'10px'}} id="roadmap-badge-text">診断済み</span>
              <h2 className="section-title" style={{margin:'0 0 8px'}}>あなたの変容ロードマップ</h2>
              <p className="muted" id="roadmap-sub" style={{fontSize:'15px',lineHeight:'1.7',margin:'0 0 4px'}}></p>
              <p style={{fontSize:'13px',color:'#6b7280',margin:0}} id="roadmap-current-phase"></p>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:0,padding:'0 4px'}}>
              <div className="roadmap-dot is-locked" id="phase-dot-1">1</div>
              <div className="roadmap-conn" id="phase-conn-1"></div>
              <div className="roadmap-dot is-locked" id="phase-dot-2">2</div>
              <div className="roadmap-conn" id="phase-conn-2"></div>
              <div className="roadmap-dot is-locked" id="phase-dot-3">3</div>
            </div>
            <div className="roadmap-phase-block" id="roadmap-phase-1"></div>
            <div className="roadmap-phase-block" id="roadmap-phase-2"></div>
            <div className="roadmap-phase-block" id="roadmap-phase-3"></div>
            <div className="card" style={{padding:'20px'}}>
              <h3 style={{fontSize:'17px',fontWeight:800,margin:'0 0 4px'}}>今すぐ着手するTop3</h3>
              <p className="muted" style={{fontSize:'13px',margin:'0 0 16px'}}>診断結果から、最も優先度が高い3つを厳選しました。</p>
              <div id="roadmap-top3-list"></div>
              <div className="cluster" style={{marginTop:'16px',gap:'10px',flexWrap:'wrap'}}>
                <Link href="/search?diag=1&origin=roadmap" className="btn">候補サービスをすべて見る</Link>
                <Link href="/diagnosis" className="btn btn-ghost" style={{fontSize:'13px'}}>診断をやり直す</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 診断結果サンプル（未診断ユーザー向け） */}
        <section className="section" id="sample-section" style={{display:'none'}}>
          <div className="container stack" style={{gap:'20px'}}>
            <div>
              <p className="muted" style={{fontSize:'12px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',margin:'0 0 6px'}}>診断するとこうなります</p>
              <h2 className="section-title" style={{margin:'0 0 8px'}}>あなたの「変容ロードマップ」が、<br />3分で出てきます。</h2>
              <p className="muted" style={{fontSize:'14px',lineHeight:'1.7',margin:0}}>以下はサンプルです。実際の診断ではあなたのスコアに基づいた、もっと具体的な内容が出ます。</p>
            </div>
            <div className="features-grid" id="sample-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'16px'}}></div>
            <div style={{textAlign:'center'}}>
              <Link href="/diagnosis" className="btn" style={{fontSize:'16px',padding:'14px 28px'}}>無料で自分の結果を見る（3分）</Link>
              <p className="muted" style={{fontSize:'12px',margin:'10px 0 0'}}>匿名・登録不要 / 営業なし / 約3分</p>
            </div>
          </div>
        </section>

        {/* あなたの目的（続きやすいCTA） */}
        <section className="section" id="goal-next-section" style={{display:'none'}}>
          <div className="container stack">
            <div className="cluster space-between" style={{marginBottom:'8px'}}>
              <h2 className="section-title">あなたの目的</h2>
              <Link className="btn btn-ghost" href="/search">他のカテゴリを見る</Link>
            </div>
            <div className="card" style={{padding:'16px'}}>
              <div id="goal-next-content" className="cluster" style={{gap:'8px',flexWrap:'wrap'}}></div>
            </div>
          </div>
        </section>

        {/* カテゴリ */}
        <section className="home-categories">
          <div className="container">
            <div className="cluster space-between" style={{marginBottom:'16px'}}>
              <h2 className="section-title">何を変えたい？</h2>
              <Link className="btn btn-ghost" href="/guide">垢抜けガイドを見る</Link>
            </div>
            <div className="categories-grid">
              {[
                {cat:'gym',icon:'🏋️‍♂️',label:'体・ジム',sub:'ボディメイク・トレーニング'},
                {cat:'eyebrow',icon:'✂️',label:'眉毛',sub:'眉カット・デザイン'},
                {cat:'fashion',icon:'👔',label:'服・コーデ',sub:'パーソナルスタイリング'},
                {cat:'hair',icon:'💇‍♂️',label:'ヘア',sub:'髪型・カット・パーマ'},
                {cat:'esthetic',icon:'💆‍♂️',label:'肌・エステ',sub:'フェイシャル・スキンケア'},
                {cat:'photo',icon:'📸',label:'写真撮影',sub:'プロフィール写真・撮影'},
                {cat:'diagnosis',icon:'🔍',label:'診断',sub:'カラー・骨格診断'},
                {cat:'consulting',icon:'🧑‍⚕️',label:'外見トータルサポート',sub:'トータルコンサルティング'},
                {cat:'whitening',icon:'✨',label:'ホワイトニング',sub:'歯の美白'},
                {cat:'orthodontics',icon:'🦷',label:'歯科矯正',sub:'噛み合わせ・見た目改善'},
                {cat:'makeup',icon:'💄',label:'メイク',sub:'男性向けメイクレッスン'},
                {cat:'hairremoval',icon:'🪒',label:'脱毛',sub:'永久脱毛・光脱毛'},
                {cat:'aga',icon:'🧪',label:'AGA',sub:'薄毛治療・発毛'},
                {cat:'marriage',icon:'💍',label:'結婚相談',sub:'婚活・相談所'},
                {cat:'nail',icon:'💅',label:'ネイル',sub:'ケア・デザイン'},
                {cat:'cosmetic',icon:'🏥',label:'美容外科・クリニック',sub:'外科/美容医療'},
              ].map(({cat,icon,label,sub}) => (
                <div key={cat} className="category-card">
                  <Link href={`/search?category=${cat}`}>
                    <div className="category-icon">{icon}</div>
                    <div className="category-label">{label}</div>
                    <div className="category-sub">{sub}</div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* おすすめサービス */}
        <section className="section">
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">おすすめサービス</h2>
              <Link className="btn btn-ghost" href="/search">もっと見る</Link>
            </div>
            <div className="features-grid">
              <div id="top-reco"></div>
            </div>
          </div>
        </section>

        {/* 最近閲覧 */}
        <section className="section" id="recent-section" style={{display:'none'}}>
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">最近閲覧したサービス</h2>
              <Link className="btn btn-ghost" href="/mypage/history">履歴を見る</Link>
            </div>
            <div className="features-grid">
              <div id="top-recent"></div>
            </div>
          </div>
        </section>

        {/* 特集 */}
        <section className="section">
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">特集</h2>
              <Link className="btn btn-ghost" href="/feature">特集一覧</Link>
            </div>
            <div className="features-grid">
              <div id="top-features"></div>
            </div>
          </div>
        </section>
      </main>

    </>
  );
}
