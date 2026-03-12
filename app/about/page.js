'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';

export default function AboutPage() {
  const rangeRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const range = rangeRef.current;
    const overlay = overlayRef.current;
    if (!range || !overlay) return;
    const update = () => {
      overlay.style.width = (parseInt(range.value, 10) || 0) + '%';
    };
    range.addEventListener('input', update);
    update();
    return () => range.removeEventListener('input', update);
  }, []);

  return (
    <>
      <style>{`
        .about-value-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .about-value-card{background:linear-gradient(180deg,#ffffff,#fbfbff);border-radius:12px;padding:14px;border:1px solid rgba(15,23,42,0.04);box-shadow:0 4px 10px rgba(2,6,23,0.03);transition:transform .22s cubic-bezier(.2,.9,.2,1),box-shadow .22s}
        .about-value-card:hover{transform:translateY(-10px);box-shadow:0 20px 40px rgba(2,6,23,0.12)}
        .about-value-card h4{margin:0 0 6px 0;font-size:15px;font-weight:700}
        .about-hero-section{background:linear-gradient(180deg,#f8fbff,#ffffff);background-size:200% 200%;animation:bgShift 18s linear infinite alternate;padding:40px 32px;border-radius:12px;margin-bottom:6px}
        .about-hero-inner{display:flex;gap:28px;align-items:center}
        .about-hero-section .hero-image img{transition:transform .45s cubic-bezier(.2,.9,.2,1)}
        .about-hero-section .hero-image:hover img{transform:scale(1.03)}
        .about-btn-primary{background:linear-gradient(90deg,var(--primary,#2563eb),#0e3760);color:#fff;padding:12px 16px;border-radius:12px;text-decoration:none;display:inline-block;transition:transform .18s cubic-bezier(.2,.9,.2,1),box-shadow .18s;will-change:transform;animation:ctaPulse 4s ease-in-out 0.6s infinite}
        .about-btn-primary:hover{transform:translateY(-6px);box-shadow:0 14px 34px rgba(2,6,23,0.12)}
        .about-btn-ghost{padding:12px 16px;border-radius:12px;text-decoration:none;display:inline-block;border:1px solid rgba(15,23,42,0.12);color:#0f172a;transition:transform .18s cubic-bezier(.2,.9,.2,1),box-shadow .18s}
        .about-btn-ghost:hover{transform:translateY(-6px);box-shadow:0 14px 34px rgba(2,6,23,0.12)}
        .about-section{padding:32px 0}
        .about-section h2{font-weight:700;font-size:clamp(20px,3vw,28px);margin-bottom:12px}
        .about-section p,.about-section li{font-size:16px;line-height:1.75;color:#475569}
        @keyframes bgShift{from{background-position:0% 50%}to{background-position:100% 50%}}
        @keyframes ctaPulse{0%{transform:translateY(0)}50%{transform:translateY(-3px)}100%{transform:translateY(0)}}
        @media(max-width:880px){.about-hero-inner{flex-direction:column}.about-hero-section .hero-image{width:100%}}
        @media(max-width:900px){.about-value-grid{grid-template-columns:1fr 1fr}}
      `}</style>

      {/* Hero */}
      <section className="about-hero-section" style={{margin:0}}>
        <div className="about-hero-inner">
          <div style={{flex:1,minWidth:'280px'}}>
            <h1 style={{fontSize:'clamp(48px,9vw,120px)',lineHeight:0.9,color:'#0f172a',fontWeight:900,letterSpacing:'-0.02em',margin:'0 0 8px'}}>Fineme</h1>
            <h2 style={{fontWeight:600,margin:'0 0 12px',fontSize:'20px',color:'#334155'}}>外見の第一歩を、あなたへ</h2>
            <p style={{fontSize:'18px',color:'#475569',margin:'0 0 18px'}}>外見に自信がないあなたが気軽に始められて、続けられるように。検索・比較・予約を一つの場所で提供します。</p>
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'8px'}}>
              <Link href="/search" className="about-btn-primary">サービスを探す</Link>
              <Link href="/diagnosis" className="about-btn-ghost">まずは診断</Link>
              <Link href="/guide" className="about-btn-ghost">垢抜けガイドを見る</Link>
            </div>
          </div>
          <div className="hero-image" style={{flex:'0 0 420px',minWidth:'220px'}}>
            <div style={{borderRadius:'12px',overflow:'hidden',border:'1px solid rgba(2,6,23,0.06)',boxShadow:'0 12px 34px rgba(2,6,23,0.06)'}}>
              <img src="/assets/images/hero-combined.jpg" alt="Fineme" style={{width:'100%',height:'320px',objectFit:'cover',display:'block'}} />
            </div>
          </div>
        </div>
      </section>

      <main className="container" style={{padding:'0 0 60px'}}>

        {/* Services quick cards */}
        <section className="about-section" style={{marginTop:'18px'}}>
          <h2>まず始めやすいサービス</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginTop:'12px'}}>
            {[
              {category:'hair',label:'ヘア',icon:'placeholder-hair.svg'},
              {category:'eyebrow',label:'眉・メイク',icon:'placeholder-makeup.svg'},
              {category:'fashion',label:'ファッション',icon:'placeholder-fashion.svg'},
              {category:'gym',label:'ジム',icon:'placeholder-gym.svg'},
            ].map(({category,label,icon})=>(
              <Link key={category} href={`/search?category=${category}`} className="about-value-card" style={{display:'block',textDecoration:'none',color:'inherit',padding:'14px'}}>
                <img src={`/assets/placeholders/${icon}`} alt={label} style={{width:'64px',height:'64px',display:'block',margin:'0 auto 8px'}} />
                <div style={{textAlign:'center',fontWeight:700}}>{label}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* What Fineme does */}
        <section className="about-section" style={{marginTop:'24px',background:'linear-gradient(180deg,rgba(15,23,42,0.02),transparent)',padding:'18px',borderRadius:'10px'}}>
          <h2>Finemeができること（ビジュアルで見る）</h2>
          <div className="about-value-grid" style={{marginTop:'12px'}}>
            {[
              {title:'診断（軸を知る）',body:'約3分の診断で上位軸を特定してタイプを形成。「納得/寄り添い/最短/進め方/世界観」を把握します。'},
              {title:'相性で並ぶ候補',body:'検索結果は価格ではなく「合う可能性」順。タイプに近い掲載者が優先表示され、迷いが減ります。'},
              {title:'スターター/ガイド',body:'「スターター3選」とカテゴリ別ガイド/CTAで初手が明確。価格帯・ペース・得意領域・地域のフィルタも。'},
              {title:'クイック・空き状況',body:'「今日/週末」クイックとカードの空き状況バッジで、今行ける候補へスムーズに予約できます。'},
            ].map(({title,body})=>(
              <div key={title} className="about-value-card">
                <h4>{title}</h4>
                <p style={{margin:'6px 0',color:'#475569'}}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Value Proposition */}
        <section className="about-section">
          <h2>Finemeが提供する価値（Value Proposition）</h2>
          <p>診断を起点に「相性」で選ぶ流れに沿って、行動までの障壁を最小化します。</p>
          <ul>
            <li><strong>Step 1: 軸診断（約3分）</strong>：上位の軸を特定しタイプを形成。自分の考え方に近い基準が分かる。</li>
            <li><strong>Step 2: 相性で並ぶ候補</strong>：検索結果は「合う可能性」順。タイプに近い掲載者を優先表示。</li>
            <li><strong>Step 3: ガイド/フィルタで具体化</strong>：カテゴリごとの詳しいガイドと、価格帯・ペース・得意領域・地域で絞り込み。</li>
            <li><strong>Step 4: すぐ行ける導線</strong>：「スターター3選」「今日/週末」クイックと空き状況バッジで即予約へ。</li>
            <li><strong>Step 5: 保存・比較</strong>：気になる候補や診断を保存し、後から比較・再開ができる。</li>
          </ul>
        </section>

        {/* Before / After slider */}
        <section className="about-section" style={{marginTop:'22px'}}>
          <h2>ビフォー・アフター（インタラクティブサンプル）</h2>
          <div style={{marginTop:'12px',background:'#fff',padding:'12px',borderRadius:'12px',border:'1px solid rgba(2,6,23,0.04)'}}>
            <div style={{position:'relative',maxWidth:'900px',margin:'0 auto'}}>
              <img src="/assets/placeholders/placeholder-default.svg" alt="before" style={{width:'100%',display:'block',borderRadius:'8px'}} />
              <div ref={overlayRef} style={{position:'absolute',left:0,top:0,height:'100%',width:'50%',overflow:'hidden',borderRadius:'8px'}}>
                <img src="/assets/placeholders/placeholder-default.svg" alt="after" style={{width:'100%',height:'auto',display:'block',objectFit:'cover'}} />
              </div>
              <input ref={rangeRef} type="range" min="0" max="100" defaultValue="50" style={{width:'100%',marginTop:'12px'}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'10px',fontSize:'13px',color:'#64748b'}}>
              <div>Before</div>
              <div>After</div>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
