'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

// ── Before / After カルーセル ─────────────────────────────────────────
const BA_SLIDES = [
  { type: 'image', caption: <>外見が変わると、<strong>自信が変わる。</strong><br />自信が変わると、<strong>人生が変わる。</strong></> },
  {
    type: 'text', axis: '💇 髪・ヘア',
    before: { state: 'BEFORE', body: '「いつも同じ、なんとなく」\nセットも面倒で毎朝同じ髪型。\n清潔感はあるつもり、でも指摘されたことがある。', quote: null },
    after: { state: 'AFTER', body: '信頼できる美容師と出会い\nスタイリング習慣が変わった。\nマッチングアプリで「清潔感ある」と初めて言われた。', quote: '「朝が楽しくなった」' },
  },
  {
    type: 'text', axis: '👔 服・コーデ',
    before: { state: 'BEFORE', body: '「服に興味ない」\nコーデを考えるのが苦手で\nいつも無難な黒ばかり選んでいた。', quote: null },
    after: { state: 'AFTER', body: '骨格診断で「自分に合う服」を知った。\n全身コーデが5分で決まるようになり\n「おしゃれになった？」と聞かれた。', quote: '「鏡を見るのが楽しくなった」' },
  },
];

function BaCarousel() {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % BA_SLIDES.length), 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const slide = BA_SLIDES[idx];

  return (
    <section className="ba-section">
      <div className="ba-carousel">
        {slide.type === 'image' ? (
          <div className="ba-img-wrap">
            <img src="/assets/images/before-after.webp" alt="外見と自信のBefore / After" className="ba-img" />
            <div className="ba-overlay" />
            <div className="ba-divider" />
            <div className="ba-label-before"><span className="ba-label-text">Before</span></div>
            <div className="ba-label-after"><span className="ba-label-text">After</span></div>
          </div>
        ) : (
          <div className="ba-text-slide">
            <div className="ba-text-half ba-text-half--before">
              <div className="ba-text-axis">{slide.axis}</div>
              <div className="ba-text-state ba-text-state--before">{slide.before.state}</div>
              <p className="ba-text-body" style={{ whiteSpace: 'pre-line' }}>{slide.before.body}</p>
            </div>
            <div className="ba-text-half">
              <div className="ba-text-axis">{slide.axis}</div>
              <div className="ba-text-state ba-text-state--after">{slide.after.state}</div>
              <p className="ba-text-body" style={{ whiteSpace: 'pre-line' }}>{slide.after.body}</p>
              {slide.after.quote && <p className="ba-text-quote">{slide.after.quote}</p>}
            </div>
          </div>
        )}
      </div>
      <div className="ba-caption">
        <p>外見が変わると、<strong>自信が変わる。</strong><br />自信が変わると、<strong>人生が変わる。</strong></p>
        <div className="ba-dots">
          {BA_SLIDES.map((_, i) => (
            <button key={i} className={`ba-dot${i === idx ? ' active' : ''}`} onClick={() => { setIdx(i); clearInterval(timerRef.current); }} aria-label={`スライド${i + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 変容シルエット SVG（Before / After 人物線画） ──────────────────────
function HeroFigures() {
  const s = 'rgba(201,168,76,0.65)';
  const sw = 1.3;
  return (
    <svg viewBox="0 0 1200 580" width="100%" height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' }}
      aria-hidden="true" preserveAspectRatio="xMidYMid slice"
    >
      {/* 航路線：before → after（破線アーク） */}
      <path d="M 248,310 C 420,130 800,130 958,292"
        fill="none" stroke="rgba(201,168,76,0.1)" strokeWidth="1.2" strokeDasharray="10 7" />
      {/* 始点・終点の小さな菱形マーク */}
      <polygon points="248,300 254,310 248,320 242,310"
        fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="1" />
      <polygon points="958,282 964,292 958,302 952,292"
        fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="1" />

      {/* ── Before 人物（左・前傾・肩落ち） ── */}
      <g transform="translate(248,310)" opacity="0.13">
        <circle cx="0" cy="-100" r="20" fill="none" stroke={s} strokeWidth={sw}/>
        <line x1="0" y1="-80" x2="-2" y2="-68" stroke={s} strokeWidth={sw}/>
        {/* 肩ライン：不均等・やや垂れ下がり */}
        <path d="M-22,-64 L-2,-68 L18,-62" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 背骨：前傾カーブ */}
        <path d="M-2,-68 C-6,-28 -10,22 -7,80" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 左腕：内向きに垂れる */}
        <path d="M-22,-64 C-28,-42 -26,-16 -22,16" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 右腕：内向きに垂れる */}
        <path d="M18,-62 C22,-40 20,-14 16,16" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 腰 */}
        <path d="M-16,78 L-7,80 L5,78" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 左脚：閉じ気味 */}
        <path d="M-12,80 C-13,108 -12,140 -11,170" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 右脚：閉じ気味 */}
        <path d="M2,80 C3,108 2,140 1,170" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 地図注記 */}
        <text x="0" y="-128" textAnchor="middle" fill={s} fontSize="8.5"
          fontFamily="Georgia,serif" opacity="0.6" letterSpacing="1">現在地</text>
      </g>

      {/* ── After 人物（右・直立・肩幅・自信） ── */}
      <g transform="translate(958,292)" opacity="0.18">
        <circle cx="0" cy="-112" r="20" fill="none" stroke={s} strokeWidth={sw}/>
        <line x1="0" y1="-92" x2="0" y2="-78" stroke={s} strokeWidth={sw}/>
        {/* 肩ライン：広く水平 */}
        <path d="M-30,-72 L0,-78 L30,-72" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 背骨：まっすぐ */}
        <line x1="0" y1="-78" x2="0" y2="80" stroke={s} strokeWidth={sw}/>
        {/* 左腕：体から少し離れる */}
        <path d="M-30,-72 C-38,-46 -36,-14 -32,18" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 右腕：体から少し離れる */}
        <path d="M30,-72 C38,-46 36,-14 32,18" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 腰 */}
        <path d="M-20,78 L0,80 L20,78" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 左脚：やや開いた安定感 */}
        <path d="M-16,80 C-18,108 -17,142 -15,174" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 右脚：やや開いた安定感 */}
        <path d="M16,80 C18,108 17,142 15,174" fill="none" stroke={s} strokeWidth={sw}/>
        {/* 地図注記 */}
        <text x="0" y="-142" textAnchor="middle" fill={s} fontSize="8.5"
          fontFamily="Georgia,serif" opacity="0.6" letterSpacing="1">目的地</text>
      </g>
    </svg>
  );
}


const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };
const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };

const CATEGORIES = [
  {cat:'gym',      icon:'🏋️',  label:'パーソナルジム',     sub:'体型・姿勢を変える'},
  {cat:'eyebrow',  icon:'✂️',  label:'眉毛サロン',         sub:'顔の印象を即日変える'},
  {cat:'fashion',  icon:'👔',  label:'ファッション',       sub:'似合う服で自信をつくる'},
  {cat:'hair',     icon:'💇',  label:'ヘア',               sub:'毎朝の自信を変える'},
  {cat:'esthetic', icon:'💆',  label:'肌・エステ',         sub:'清潔感を底上げする'},
  {cat:'photo',    icon:'📸',  label:'写真撮影',           sub:'第一印象を最大化する'},
  {cat:'diagnosis',icon:'🔍',  label:'骨格・パーソナルカラー診断', sub:'自分の基準を知る'},
  {cat:'consulting',icon:'🗣', label:'外見トータルサポート', sub:'変容の全体地図を描く'},
  {cat:'whitening',icon:'✨',  label:'歯のホワイトニング', sub:'笑顔への自信をつくる'},
  {cat:'makeup',   icon:'💄',  label:'メイクアップ',       sub:'清潔感を意図的に演出する'},
  {cat:'hairremoval',icon:'🪒',label:'脱毛',               sub:'なめらかさで印象を変える'},
  {cat:'aga',      icon:'💊',  label:'AGA・薄毛治療',      sub:'髪の悩みと向き合う'},
  {cat:'orthodontics',icon:'🦷',label:'歯科矯正',          sub:'笑顔の質を長期で変える'},
  {cat:'marriage', icon:'💍',  label:'婚活サポート',       sub:'変容の先にある出会いへ'},
  {cat:'nail',     icon:'💅',  label:'ネイル',             sub:'細部まで気を配る人になる'},
];

export default function HomePage() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [stories, setStories] = useState([]);

  // スクリプト（おすすめ・特集・最近閲覧）
  useEffect(() => {
    const srcs = [
      '/scripts/home-reco.js?v=20251016',
      '/scripts/home-features.js?v=20251015',
      '/scripts/home-recent.js?v=20251016',
    ];
    let loaded = 0;
    srcs.forEach(src => {
      if (document.querySelector(`script[src="${src}"]`)) { loaded++; return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => {
        loaded++;
        if (loaded === srcs.length) document.dispatchEvent(new Event('DOMContentLoaded'));
      };
      document.body.appendChild(s);
    });
  }, []);

  // ログイン状態 + 診断データ読み込み
  useEffect(() => {
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        if (obj?.user?.id) setLoggedIn(true);
      }
    } catch {}
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (raw) setDiagnosis(JSON.parse(raw));
    } catch {}
  }, []);

  // 体験談取得
  useEffect(() => {
    fetch('/api/stories?status=approved&limit=3')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length) setStories(data.slice(0, 3)); })
      .catch(() => {});
  }, []);

  const compass = diagnosis?.compass_first;

  return (
    <>
      <style>{`
        /* ── Nautical Hero ── */
        .hero-nav {
          position: relative;
          padding: 120px 20px 100px;
          background:
            linear-gradient(rgba(10,15,30,0.60), rgba(10,15,30,0.75)),
            url('/assets/images/hero-bg.png') center / cover no-repeat;
          overflow: hidden;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .hero-nav::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(10,15,30,0.45) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero-nav-inner { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
        .hero-nav-brand {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .22em;
          color: rgba(201,168,76,0.45);
          text-transform: uppercase;
          margin: 0 0 16px;
        }
        .hero-nav-h1 {
          font-family: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
          font-size: clamp(72px, 14vw, 120px);
          font-weight: 900;
          color: #c9a84c;
          margin: 0 0 12px;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .hero-nav-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(18px, 3.5vw, 28px);
          font-weight: 700;
          font-style: italic;
          color: rgba(201,168,76,0.55);
          margin: 0 0 44px;
          letter-spacing: .02em;
        }
        .hero-nav-verse {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: clamp(16px, 2.5vw, 19px);
          color: rgba(255,255,255,0.75);
          line-height: 1.9;
          margin: 0 0 8px;
          font-weight: 400;
        }
        .hero-nav-verse-q {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          display: block;
          font-size: clamp(17px, 2.8vw, 21px);
          font-weight: 700;
          color: rgba(255,255,255,0.92);
          line-height: 1.7;
          padding: 10px 0 0 0;
          border-left: 2px solid rgba(201,168,76,0.5);
          margin: 12px 0 0 8px;
          padding-left: 16px;
          text-align: left;
        }
        .hero-nav-tagline {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.85;
          margin: 28px 0 40px;
        }
        .hero-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 40px;
          border: 1.5px solid #c9a84c;
          color: #0a0f1e;
          background: #c9a84c;
          border-radius: 3px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: .08em;
          box-shadow: 0 0 32px rgba(201,168,76,0.35);
          transition: background .2s, color .2s, box-shadow .2s, opacity .2s;
        }
        .hero-nav-cta:hover {
          opacity: .88;
          box-shadow: 0 0 48px rgba(201,168,76,0.55);
        }
        .hero-nav-badges {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 18px 0 20px;
        }
        .hero-nav-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border: 1px solid rgba(201,168,76,0.2);
          color: rgba(201,168,76,0.55);
          border-radius: 2px;
          letter-spacing: .06em;
        }
        .hero-nav-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          padding-bottom: 2px;
          transition: color .15s;
          display: inline-block;
        }
        .hero-nav-sub:hover { color: rgba(255,255,255,0.55); }
        .hero-nav-closing {
          margin-top: 52px;
          padding-top: 40px;
          border-top: 1px solid rgba(201,168,76,0.1);
        }
        .hero-nav-closing p {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          line-height: 1.9;
          margin: 0;
          letter-spacing: .02em;
        }
        .hero-nav-closing strong { color: rgba(255,255,255,0.5); font-weight: 500; }

        /* ── Compass banner (diagnosed) ── */
        .compass-banner { max-width: 580px; margin: 0 auto; display: flex; align-items: center; gap: 14px; padding: 14px 20px; background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; text-decoration: none; transition: background .15s; margin-top: 32px; }
        .compass-banner:hover { background: rgba(201,168,76,0.12); }
        .compass-banner-body { flex: 1; text-align: left; }
        .compass-banner-label { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.5); letter-spacing: .12em; text-transform: uppercase; margin: 0 0 3px; }
        .compass-banner-main { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); margin: 0; }
        .compass-banner-arrow { font-size: 14px; color: rgba(201,168,76,0.5); }

        /* ── Before / After carousel ── */
        .ba-section { padding: 0; background: var(--color-bg-dark, #0a0f1e); overflow: hidden; }
        .ba-carousel { position: relative; }
        .ba-slides { display: flex; transition: transform .5s ease; }
        .ba-slide { min-width: 100%; }
        /* image slide */
        .ba-img-wrap { position: relative; max-height: 420px; overflow: hidden; }
        .ba-img { width: 100%; max-height: 420px; object-fit: cover; object-position: center top; display: block; }
        .ba-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(10,15,30,0.35) 0%, rgba(10,15,30,0.1) 40%, rgba(10,15,30,0.1) 60%, rgba(10,15,30,0.55) 100%); }
        .ba-label-before { position: absolute; left: 6%; top: 50%; transform: translateY(-50%); }
        .ba-label-after  { position: absolute; right: 6%; top: 50%; transform: translateY(-50%); }
        .ba-label-text { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; padding: 4px 12px; border-radius: 2px; }
        .ba-label-before .ba-label-text { color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.18); }
        .ba-label-after  .ba-label-text { color: #c9a84c; border: 1px solid rgba(201,168,76,0.4); }
        .ba-divider { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(201,168,76,0.3); transform: translateX(-50%); }
        .ba-divider::before { content: '→'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; color: rgba(201,168,76,0.7); background: #0a0f1e; padding: 4px 6px; border-radius: 50%; border: 1px solid rgba(201,168,76,0.3); line-height: 1; }
        /* text slides */
        .ba-text-slide { display: flex; min-height: 260px; }
        .ba-text-half { flex: 1; padding: 40px 24px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
        .ba-text-half--before { border-right: 1px solid rgba(201,168,76,0.2); }
        .ba-text-axis { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(201,168,76,0.55); }
        .ba-text-state { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 6px; }
        .ba-text-state--before { color: rgba(255,255,255,0.35); }
        .ba-text-state--after  { color: #c9a84c; }
        .ba-text-body { font-size: 14px; color: rgba(255,255,255,0.78); line-height: 1.8; font-family: 'Noto Serif JP', Georgia, serif; font-weight: 500; }
        .ba-text-quote { font-size: 13px; color: rgba(201,168,76,0.8); font-style: italic; margin-top: 8px; }
        /* caption & dots */
        .ba-caption { text-align: center; padding: 14px 20px 20px; }
        .ba-caption p { font-family: 'Noto Serif JP', Georgia, serif; font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 10px; line-height: 1.8; letter-spacing: .02em; }
        .ba-caption strong { color: rgba(201,168,76,0.7); font-weight: 500; }
        .ba-dots { display: flex; justify-content: center; gap: 6px; }
        .ba-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); border: none; cursor: pointer; padding: 0; transition: background .2s; }
        .ba-dot.active { background: #c9a84c; }

        /* ── Steps section ── */
        .steps-section { padding: 72px 20px; background: rgba(245,240,232,0.68); }
        .steps-inner { max-width: 800px; margin: 0 auto; }
        .steps-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-gold, #c9a84c); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 10px; text-align: center; }
        .steps-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(20px, 3.5vw, 26px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 8px; }
        .steps-sub { font-size: 14px; color: var(--color-muted, #7a6e65); text-align: center; margin: 0 0 48px; line-height: 1.7; }
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        @media (max-width: 640px) { .steps-grid { grid-template-columns: 1fr; gap: 16px; } }
        .step-card { position: relative; padding: 28px 22px 22px; border-radius: 12px; border: 1.5px solid var(--color-border-gold, rgba(201,168,76,0.28)); background: rgba(255,255,255,0.82); box-shadow: var(--shadow-sm); backdrop-filter: blur(4px); }
        .step-card:nth-child(2) { background: var(--color-bg-dark, #0a0f1e); border-color: rgba(201,168,76,0.35); }
        .step-card:nth-child(2) .step-name { color: #fff; }
        .step-card:nth-child(2) .step-desc { color: rgba(255,255,255,0.6); }
        .step-num { position: absolute; top: -14px; left: 20px; width: 28px; height: 28px; background: var(--color-gold, #c9a84c); color: var(--color-bg-dark, #0a0f1e); border-radius: 50%; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .step-card:nth-child(2) .step-num { background: var(--color-gold, #c9a84c); color: var(--color-bg-dark, #0a0f1e); }
        .step-icon { font-size: 32px; margin: 0 0 12px; }
        .step-name { font-size: 15px; font-weight: 800; color: var(--color-fg, #0a0f1e); margin: 0 0 8px; }
        .step-desc { font-size: 13px; color: var(--color-muted, #7a6e65); line-height: 1.65; margin: 0; }
        .steps-cta-wrap { text-align: center; margin-top: 40px; }

        /* ── Sample output ── */
        .sample-section { padding: 64px 20px; background: rgba(10,15,30,0.86); }
        .sample-inner { max-width: 720px; margin: 0 auto; }
        .sample-eyebrow { font-size: 11px; font-weight: 800; color: rgba(201,168,76,0.6); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 10px; text-align: center; }
        .sample-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,3vw,24px); font-weight: 700; color: #fff; text-align: center; margin: 0 0 32px; }
        .sample-mockup { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 20px; padding: 24px; }
        .sample-compass { display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,.08); border-radius: 14px; padding: 16px 18px; margin-bottom: 16px; border: 1px solid rgba(201,168,76,0.25); }
        .sample-vectors { display: flex; flex-direction: column; gap: 8px; }
        .sample-vec { display: flex; align-items: center; gap: 10px; }
        .sample-vec-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,.1); border-radius: 99px; overflow: hidden; }
        .sample-vec-bar-fill { height: 100%; border-radius: 99px; }
        .sample-vec-label { font-size: 12px; color: rgba(255,255,255,.6); width: 72px; flex-shrink: 0; }
        .sample-vec-gap { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.8); width: 32px; text-align: right; flex-shrink: 0; }

        /* ── Stories ── */
        .stories-section { padding: 64px 20px; background: rgba(245,240,232,0.68); }
        .stories-inner { max-width: 880px; margin: 0 auto; }
        .stories-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-gold, #c9a84c); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 10px; text-align: center; }
        .stories-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,3vw,24px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 32px; }
        .stories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 16px; }
        .story-card { background: rgba(255,255,255,0.82); backdrop-filter: blur(4px); border-radius: 12px; padding: 20px; border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28)); box-shadow: var(--shadow-sm); }
        .story-axis { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; background: rgba(201,168,76,0.1); color: var(--color-gold, #c9a84c); border-radius: 99px; margin-bottom: 12px; border: 1px solid rgba(201,168,76,0.25); }
        .story-before { font-size: 12px; color: var(--color-muted, #7a6e65); margin: 0 0 6px; }
        .story-after { font-size: 14px; font-weight: 700; color: var(--color-fg, #0a0f1e); line-height: 1.6; margin: 0; }
        .story-milestone { margin-top: 10px; font-size: 12px; font-weight: 600; color: var(--color-bg-dark, #0a0f1e); background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); padding: 4px 10px; border-radius: 8px; display: inline-block; }

        /* ── Categories ── */
        .categories-section { padding: 64px 20px 48px; background: rgba(255,255,255,0.62); }
        .categories-inner { max-width: 960px; margin: 0 auto; }
        .categories-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-muted, #7a6e65); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 8px; text-align: center; }
        .categories-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(16px,2.5vw,20px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 28px; }
        .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .cat-card { display: flex; flex-direction: column; align-items: center; padding: 16px 8px; border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28)); border-radius: 12px; background: rgba(255,255,255,0.78); backdrop-filter: blur(4px); text-decoration: none; color: inherit; transition: background .15s, border-color .15s, box-shadow .15s, transform .12s; gap: 6px; }
        .cat-card:hover { background: rgba(245,240,232,0.92); border-color: var(--color-gold, #c9a84c); box-shadow: var(--shadow-gold); transform: translateY(-2px); }
        .cat-icon { font-size: 24px; }
        .cat-label { font-size: 12px; font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; line-height: 1.3; }
        .cat-sub { font-size: 10px; color: var(--color-muted, #7a6e65); text-align: center; line-height: 1.4; }
      `}</style>

      <main>
        {/* ── Nautical Hero ── */}
        <section className="hero-nav">
          <div className="hero-nav-inner">
            <p className="hero-nav-brand">— Find New Me —</p>
            <h1 className="hero-nav-h1">Fineme</h1>
            <p className="hero-nav-h2">Find New Me.</p>

            <div className="hero-nav-verse">
              鏡の前でふと気づく瞬間がある。
              <span className="hero-nav-verse-q">
                「今の自分を、このまま<br />
                &nbsp;好きだと言えるか？」
              </span>
            </div>

            <p className="hero-nav-tagline">
              その問いが生まれたなら、<br />もう準備はできています。
            </p>

            <Link href="/diagnosis" className="hero-nav-cta">
              Me Scanを受ける（無料）
            </Link>

            <div className="hero-nav-badges">
              <span className="hero-nav-badge">約15分</span>
              <span className="hero-nav-badge">匿名・登録不要</span>
              <span className="hero-nav-badge">7軸コンパス生成</span>
            </div>

            <Link href="/search" className="hero-nav-sub">診断せずに探す</Link>

            {/* 診断済みユーザー向けバナー */}
            {compass && (
              <Link href="/diagnosis/result" className="compass-banner">
                <span style={{ fontSize: '22px', color: '#c9a84c' }}>◎</span>
                <div className="compass-banner-body">
                  <p className="compass-banner-label">あなたのFineme Compass</p>
                  <p className="compass-banner-main">
                    最初の一手：{AXIS_ICONS[compass]} {AXIS_LABELS[compass]} — New Me Mapを見る →
                  </p>
                </div>
                <span className="compass-banner-arrow">→</span>
              </Link>
            )}

            <div className="hero-nav-closing">
              <p>
                外見は、運命じゃない。<br />
                <strong>正しい地図と羅針盤があれば、誰でも更新できる。</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ── Before / After carousel ── */}
        <BaCarousel />

        {/* ── 3ステップ or 診断済みパネル ── */}
        {diagnosis && loggedIn ? (
          /* 診断済み：Map / Navi へのナビゲーション */
          <section className="steps-section" style={{ background: 'rgba(248,250,252,0.65)' }}>
            <div className="steps-inner">
              <p className="steps-eyebrow">あなたの変容の旅、進行中</p>
              <h2 className="steps-title">New Me Mapが生成されています</h2>
              <p className="steps-sub">変容プロファイルを確認して、次の一手へ進みましょう。</p>
              <div className="steps-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '520px', margin: '0 auto' }}>
                <Link href="/diagnosis/result" className="step-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  <div className="step-icon">🗺️</div>
                  <p className="step-name">New Me Map</p>
                  <p className="step-desc">7軸変容プロファイルとFineme Compassを確認する</p>
                </Link>
                <Link href="/mypage/navi" className="step-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  <div className="step-icon">🧭</div>
                  <p className="step-name">New Me Navi</p>
                  <p className="step-desc">軸ごとの変容ロードマップと中継地点を確認する</p>
                </Link>
              </div>
              <div className="steps-cta-wrap">
                <Link href="/diagnosis" className="btn btn-ghost" style={{ fontSize: '13px', padding: '9px 22px' }}>
                  診断をやり直す
                </Link>
              </div>
            </div>
          </section>
        ) : (
          /* 未診断：3ステップ説明 */
          <section className="steps-section">
            <div className="steps-inner">
              <p className="steps-eyebrow">Me Scanを受けると</p>
              <h2 className="steps-title">約15分で、あなたの「変容地図」が完成する</h2>
              <p className="steps-sub">何を診断するか選ばなくていい。7軸の質問に答えるだけ。</p>
              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-num">1</div>
                  <div className="step-icon">🧬</div>
                  <p className="step-name">Me Scan</p>
                  <p className="step-desc">体型・眉・服・髪・肌・歯・爪の7軸で、現在地と理想のギャップを測定。恋愛・人生ゴールも紐づけて診断。</p>
                </div>
                <div className="step-card">
                  <div className="step-num">2</div>
                  <div className="step-icon">🗺️</div>
                  <p className="step-name">New Me Map</p>
                  <p className="step-desc">7軸のレーダーチャートと変容ベクトルが即座に生成。<strong style={{color:'#c9a84c'}}>Fineme Compass</strong>があなたの「最初の一手」を明示する。</p>
                </div>
                <div className="step-card">
                  <div className="step-num">3</div>
                  <div className="step-icon">🧭</div>
                  <p className="step-name">New Me Navi</p>
                  <p className="step-desc">軸ごとの変容ロードマップと、来た道タイプ別の中継地点が表示される。迷わず次の一手へ。</p>
                </div>
              </div>
              <div className="steps-cta-wrap">
                <Link href="/diagnosis" className="btn" style={{ fontSize: '15px', padding: '12px 28px' }}>
                  🧬 Me Scanを受ける（無料）
                </Link>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '10px 0 0' }}>匿名・登録不要 / 営業なし / 約15分</p>
              </div>
            </div>
          </section>
        )}

        {/* ── サンプル出力プレビュー（ログイン済み診断済み以外） ── */}
        {!(diagnosis && loggedIn) && <section className="sample-section">
          <div className="sample-inner">
            <p className="sample-eyebrow">出力サンプル</p>
            <h2 className="sample-title">こんな「地図」が生成されます</h2>
            <div className="sample-mockup">
              {/* Compass */}
              <div className="sample-compass">
                <span style={{ fontSize: '28px', flexShrink: 0 }}>🧭</span>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Fineme Compass — 最初の一手</p>
                  <p style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: '0 0 4px' }}>💇 ヘア・髪型</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.55)', margin: 0 }}>→ 客観的なフィードバックを得ることから始める</p>
                </div>
              </div>

              {/* Vector bars */}
              <div className="sample-vectors">
                {[
                  { id: 'hair',    pct: 30, gap: '+5', color: '#6366f1' },
                  { id: 'body',    pct: 55, gap: '+3', color: '#3b82f6' },
                  { id: 'fashion', pct: 45, gap: '+4', color: '#3b82f6' },
                  { id: 'eyebrow', pct: 70, gap: '+2', color: '#6b7280' },
                  { id: 'skin',    pct: 60, gap: '+2', color: '#6b7280' },
                ].map(v => (
                  <div key={v.id} className="sample-vec">
                    <span className="sample-vec-label">{AXIS_ICONS[v.id]} {AXIS_LABELS[v.id]}</span>
                    <div className="sample-vec-bar-track">
                      <div className="sample-vec-bar-fill" style={{ width: `${v.pct}%`, background: v.color }} />
                    </div>
                    <span className="sample-vec-gap">{v.gap}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', margin: 0 }}>※ これはサンプルです。あなたの実際の結果は診断後に生成されます。</p>
              </div>
            </div>
          </div>
        </section>}

        {/* ── 変容ストーリー（体験談） ── */}
        <section className="stories-section">
          <div className="stories-inner">
            <p className="stories-eyebrow">変容ストーリー</p>
            <h2 className="stories-title">実際に変わった人たちの記録</h2>
            {stories.length > 0 ? (
              <div className="stories-grid">
                {stories.map(s => (
                  <div key={s.id} className="story-card">
                    {s.axis_id && (
                      <span className="story-axis">
                        {AXIS_ICONS[s.axis_id]} {AXIS_LABELS[s.axis_id]}
                      </span>
                    )}
                    {s.concern_before && (
                      <p className="story-before">
                        「{s.concern_before.slice(0, 50)}{s.concern_before.length > 50 ? '…' : ''}」
                      </p>
                    )}
                    {s.change_after && (
                      <p className="story-after">
                        {s.change_after.slice(0, 80)}{s.change_after.length > 80 ? '…' : ''}
                      </p>
                    )}
                    {s.milestone_reached && (
                      <span className="story-milestone">🎯 {s.milestone_reached.slice(0, 40)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="stories-grid">
                {[
                  { axis: 'hair',    before: '美容院に行くたびに「どうしたいですか？」と聞かれるのが怖かった', after: '初めて「こういうスタイルにしたい」と自分から言えた。鏡を見るのが少し好きになった。', milestone: '初回サロン訪問' },
                  { axis: 'body',    before: '服を買っても似合わない気がして、ずっと同じ服を着ていた', after: '体型が変わると、選べる服の幅が広がった。それだけで外出が楽しくなった。', milestone: '3ヶ月継続達成' },
                  { axis: 'fashion', before: 'デートで何を着ていけばいいか毎回悩んで、結局無難な服になっていた', after: 'スタイリストに相談したら「あなたに似合う型」が分かった。迷う時間が消えた。', milestone: '私服コーデ確立' },
                ].map((s, i) => (
                  <div key={i} className="story-card">
                    <span className="story-axis">{AXIS_ICONS[s.axis]} {AXIS_LABELS[s.axis]}</span>
                    <p className="story-before">「{s.before}」</p>
                    <p className="story-after">{s.after}</p>
                    <span className="story-milestone">🎯 {s.milestone}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-muted)', marginTop: '24px' }}>
              <a href="/mypage/story-submit" style={{ color: 'var(--color-gold)', fontWeight: '700', textDecoration: 'none' }}>あなたの変容ストーリーを記録する →</a>
            </p>
          </div>
        </section>

        {/* ── カテゴリ（補助ナビ） ── */}
        <section className="categories-section">
          <div className="categories-inner">
            <p className="categories-eyebrow">変容の入口を選ぶ</p>
            <h2 className="categories-title">変えたい場所がすでに決まっている方へ</h2>
            <div className="cat-grid">
              {CATEGORIES.map(({ cat, icon, label, sub }) => (
                <Link key={cat} href={`/search?category=${cat}`} className="cat-card">
                  <span className="cat-icon">{icon}</span>
                  <span className="cat-label">{label}</span>
                  <span className="cat-sub">{sub}</span>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 14px', lineHeight: '1.7' }}>
                カテゴリが決まっていない方は、7軸変容ガイドで<br />どこから始めるべきかを確認できます。
              </p>
              <Link href="/guide" style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '11px 24px', border: '1.5px solid var(--color-gold, #c9a84c)',
                color: 'var(--color-gold, #c9a84c)', background: 'transparent',
                borderRadius: '6px', fontSize: '14px', fontWeight: '700',
                textDecoration: 'none', transition: 'background .18s, color .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#c9a84c'; e.currentTarget.style.color = '#0a0f1e'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c9a84c'; }}
              >
                🗺️ 7軸変容ガイドを見る
              </Link>
            </div>
          </div>
        </section>

        {/* ── おすすめサービス ── */}
        <section className="section">
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">おすすめのガイド</h2>
              <Link className="btn btn-ghost" href="/search">もっと見る</Link>
            </div>
            <div className="features-grid">
              <div id="top-reco"></div>
            </div>
          </div>
        </section>

        {/* ── 最近閲覧 ── */}
        <section className="section" id="recent-section" style={{ display: 'none' }}>
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">最近見たガイド</h2>
              <Link className="btn btn-ghost" href="/mypage/history">履歴を見る</Link>
            </div>
            <div className="features-grid">
              <div id="top-recent"></div>
            </div>
          </div>
        </section>

        {/* ── 特集 ── */}
        <section className="section">
          <div className="container stack">
            <div className="cluster space-between">
              <h2 className="section-title">変容ガイド</h2>
              <Link className="btn btn-ghost" href="/feature">一覧を見る</Link>
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
