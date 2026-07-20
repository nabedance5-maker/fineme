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
  {cat:'colordiagnosis',icon:'🎨', label:'パーソナルカラー診断', sub:'似合う色で印象が変わる'},
  {cat:'bonediagnosis', icon:'🔍', label:'骨格診断',           sub:'自分の基準を知る'},
  {cat:'diagnosis',     icon:'📋', label:'診断（総合）',        sub:'複合診断・イメコン'},
  {cat:'consulting',icon:'🗣', label:'外見トータルサポート', sub:'変容の全体地図を描く'},
  {cat:'whitening',icon:'✨',  label:'歯のホワイトニング', sub:'笑顔への自信をつくる'},
  {cat:'makeup',   icon:'💄',  label:'メイクアップ',       sub:'清潔感を意図的に演出する'},
  {cat:'hairremoval',icon:'🪒',label:'脱毛',               sub:'なめらかさで印象を変える'},
  {cat:'aga',      icon:'💊',  label:'AGA・薄毛治療',      sub:'髪の悩みと向き合う'},
  {cat:'orthodontics',icon:'🦷',label:'歯科矯正',          sub:'笑顔の質を長期で変える'},
  {cat:'nail',     icon:'💅',  label:'ネイル',             sub:'細部まで気を配る人になる'},
];

// 発揮カテゴリ（出口）：変わった自分を世界に見せる
const STAGE2_CATEGORIES = [
  {cat:'photo',    icon:'📸', label:'プロフィール写真撮影', sub:'変わった自分を、最高の一枚に。マッチングアプリの第一印象を決定的に変える。'},
  {cat:'marriage', icon:'💍', label:'婚活サポート',         sub:'自信がついた今が、出会いを本気にするタイミング。変容の先にある、本当の出会いへ。'},
];

export default function HomePage() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [stories, setStories] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);

  // 特集記事取得（Supabase経由）
  useEffect(() => {
    fetch('/api/features')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length) setFeaturedArticles(data.slice(0, 3)); })
      .catch(() => {});
  }, []);

  // スクリプト（おすすめ・最近閲覧）
  useEffect(() => {
    const srcs = [
      '/scripts/home-reco.js?v=20251016',
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
      const raw = localStorage.getItem('fineme:diagnosis:latest')
        || localStorage.getItem('fineme:diagnosis:belle');
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
            linear-gradient(rgba(5,10,24,0.65) 0%, rgba(5,10,24,0.80) 100%),
            url('/assets/images/hero-bg-c3.jpg') center / cover no-repeat;
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
          margin: 0 0 12px;
          line-height: 1;
        }
        .hero-nav-logo {
          width: clamp(220px, 48vw, 420px);
          height: auto;
          display: block;
          margin: 0 auto;
          filter: drop-shadow(0 2px 24px rgba(201,168,76,0.45));
        }
        .hero-nav-resolve {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: clamp(13px, 1.8vw, 15px);
          color: rgba(232,228,220,0.55);
          line-height: 1.85;
          margin: 28px 0 0;
        }
        .hero-nav-resolve strong {
          color: rgba(232,228,220,0.80);
          font-weight: 700;
        }
        .hero-nav-catchcopy {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: clamp(18px, 3vw, 24px);
          font-weight: 700;
          color: rgba(232,228,220,0.90);
          margin: 0 0 32px;
          line-height: 1.6;
          letter-spacing: .02em;
        }
        .hero-nav-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 6vw, 52px);
          font-weight: 700;
          font-style: italic;
          color: rgba(201,168,76,0.65);
          margin: 32px 0 44px;
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
          border-left: none;
          margin: 12px 0 0 0;
          padding-left: 0;
          text-align: center;
        }
        .hero-nav-tagline {
          font-family: 'Noto Serif JP', 'Noto Serif', Georgia, serif;
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.85;
          margin: 28px 0 40px;
        }
        .hero-nav-cta-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          max-width: 560px;
          margin: 0 auto;
        }
        @media (max-width: 480px) {
          .hero-nav-cta-pair { grid-template-columns: 1fr; }
        }
        .hero-gender-col {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px 14px 14px;
        }
        .hero-gender-col--male { border-color: rgba(201,168,76,0.25); }
        .hero-gender-col--female { border-color: rgba(200,100,140,0.25); }
        .hero-gender-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .1em;
          text-transform: uppercase;
          margin: 0 0 10px;
          text-align: center;
        }
        .hero-gender-col--male .hero-gender-label { color: rgba(201,168,76,0.7); }
        .hero-gender-col--female .hero-gender-label { color: rgba(200,100,140,0.8); }
        .hero-gender-btns { display: flex; flex-direction: column; gap: 6px; }
        .hero-nav-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          transition: opacity .18s;
        }
        .hero-nav-cta:hover { opacity: .82; }
        .hero-nav-cta--scan-m {
          background: #c9a84c;
          color: #0a0f1e;
          border: 1.5px solid #c9a84c;
        }
        .hero-nav-cta--mirror-m {
          background: transparent;
          border: 1.5px solid rgba(201,168,76,0.4);
          color: rgba(201,168,76,0.9);
        }
        .hero-nav-cta--scan-f {
          background: rgba(200,100,140,0.85);
          color: #fff;
          border: 1.5px solid rgba(200,100,140,0.85);
        }
        .hero-nav-cta--mirror-f {
          background: transparent;
          border: 1.5px solid rgba(200,100,140,0.4);
          color: rgba(220,140,170,0.9);
        }
        .hero-nav-cta-main { font-size: 13px; font-weight: 700; }
        .hero-nav-cta-sub { font-size: 10px; font-weight: 500; opacity: .75; letter-spacing: .03em; }
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
        /* ── Dual section ── */
        .dual-section { padding: 64px 20px; background: rgba(10,15,30,0.78); }
        .dual-inner { max-width: 760px; margin: 0 auto; text-align: center; }
        .dual-eyebrow { font-size: 11px; font-weight: 800; color: rgba(201,168,76,0.55); letter-spacing: .12em; text-transform: uppercase; margin: 0 0 10px; }
        .dual-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(20px,3.5vw,28px); font-weight: 700; color: rgba(232,228,220,0.92); margin: 0 0 40px; line-height: 1.5; }
        .dual-cards { display: flex; align-items: stretch; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .dual-card { flex: 1; min-width: 200px; max-width: 280px; padding: 24px 20px; border-radius: 14px; text-align: left; }
        .dual-card--scan { background: rgba(201,168,76,0.06); border: 1.5px solid rgba(201,168,76,0.25); }
        .dual-card--mirror { background: rgba(100,160,255,0.05); border: 1.5px solid rgba(100,160,255,0.22); }
        .dual-card-icon { font-size: 28px; margin: 0 0 10px; }
        .dual-card-name { font-size: 16px; font-weight: 800; color: rgba(232,228,220,0.92); margin: 0 0 2px; }
        .dual-card-role { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.55); letter-spacing: .06em; margin: 0 0 10px; text-transform: uppercase; }
        .dual-card--mirror .dual-card-role { color: rgba(100,160,255,0.65); }
        .dual-card-desc { font-size: 13px; color: rgba(232,228,220,0.55); line-height: 1.7; margin: 0 0 16px; }
        .dual-card-link { font-size: 13px; font-weight: 700; color: #c9a84c; text-decoration: none; }
        .dual-card--mirror .dual-card-link { color: rgba(100,160,255,0.85); }
        .dual-card-plus { font-size: 32px; color: rgba(201,168,76,0.3); font-weight: 200; flex-shrink: 0; align-self: center; }
        .dual-merge { margin-top: 32px; font-size: 14px; color: rgba(232,228,220,0.45); line-height: 1.8; }
        .dual-merge strong { color: rgba(201,168,76,0.85); font-weight: 700; }
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
        .steps-section { padding: 72px 20px; background: rgba(10,15,30,0.50); }
        .steps-inner { max-width: 800px; margin: 0 auto; }
        .steps-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-gold, #c9a84c); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 10px; text-align: center; }
        .steps-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(20px, 3.5vw, 26px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 8px; }
        .steps-sub { font-size: 14px; color: var(--color-muted, #7a6e65); text-align: center; margin: 0 0 48px; line-height: 1.7; }
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        @media (max-width: 640px) { .steps-grid { grid-template-columns: 1fr; gap: 16px; } }
        .step-card { position: relative; padding: 28px 22px 22px; border-radius: 12px; border: 1.5px solid var(--color-border-gold, rgba(201,168,76,0.28)); background: rgba(10,15,30,0.65); box-shadow: 0 4px 24px rgba(0,0,0,0.4); backdrop-filter: blur(8px); }
        .step-card:nth-child(2) { background: var(--color-bg-dark, #0a0f1e); border-color: rgba(201,168,76,0.35); }
        .step-card:nth-child(2) .step-name { color: #fff; }
        .step-card:nth-child(2) .step-desc { color: rgba(255,255,255,0.6); }
        .step-num { position: absolute; top: -14px; left: 20px; width: 28px; height: 28px; background: var(--color-gold, #c9a84c); color: var(--color-bg-dark, #0a0f1e); border-radius: 50%; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .step-card:nth-child(2) .step-num { background: var(--color-gold, #c9a84c); color: var(--color-bg-dark, #0a0f1e); }
        .step-icon { font-size: 32px; margin: 0 0 12px; }
        .step-name { font-size: 15px; font-weight: 800; color: rgba(232,228,220,0.90); margin: 0 0 8px; }
        .step-desc { font-size: 13px; color: rgba(232,228,220,0.55); line-height: 1.65; margin: 0; }
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
        .stories-section { padding: 64px 20px; background: rgba(10,15,30,0.50); }
        .stories-inner { max-width: 880px; margin: 0 auto; }
        .stories-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-gold, #c9a84c); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 10px; text-align: center; }
        .stories-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,3vw,24px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 32px; }
        .stories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 16px; }
        .story-card { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border-radius: 12px; padding: 20px; border: 1px solid rgba(232,228,220,0.15); box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
        .story-axis { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; background: rgba(201,168,76,0.1); color: var(--color-gold, #c9a84c); border-radius: 99px; margin-bottom: 12px; border: 1px solid rgba(201,168,76,0.25); }
        .story-before { font-size: 12px; color: var(--color-muted, #7a6e65); margin: 0 0 6px; }
        .story-after { font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.90); line-height: 1.6; margin: 0; }
        .story-milestone { margin-top: 10px; font-size: 12px; font-weight: 600; color: #c9a84c; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3); padding: 4px 10px; border-radius: 8px; display: inline-block; }

        /* ── Categories ── */
        .categories-section { padding: 64px 20px 48px; background: rgba(10,15,30,0.50); }
        .categories-inner { max-width: 960px; margin: 0 auto; }
        .categories-eyebrow { font-size: 11px; font-weight: 800; color: var(--color-muted, #7a6e65); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 8px; text-align: center; }
        .categories-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(16px,2.5vw,20px); font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; margin: 0 0 28px; }
        .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
        .cat-card { display: flex; flex-direction: column; align-items: center; padding: 16px 8px; border: 1px solid rgba(232,228,220,0.15); border-radius: 12px; background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); text-decoration: none; color: inherit; transition: background .15s, border-color .15s, box-shadow .15s, transform .12s; gap: 6px; }
        .cat-card:hover { background: rgba(245,240,232,0.92); border-color: var(--color-gold, #c9a84c); box-shadow: var(--shadow-gold); transform: translateY(-2px); }
        .cat-icon { font-size: 24px; }
        .cat-label { font-size: 12px; font-weight: 700; color: var(--color-fg, #0a0f1e); text-align: center; line-height: 1.3; }
        .cat-sub { font-size: 10px; color: var(--color-muted, #7a6e65); text-align: center; line-height: 1.4; }
      `}</style>

      <main>
        {/* ── Nautical Hero ── */}
        <section className="hero-nav">
          <div className="hero-nav-inner">
            <h1 className="hero-nav-h1">
              <img
                src="/assets/images/fineme-logo-final.png"
                alt="Fineme"
                className="hero-nav-logo"
              />
            </h1>
            <p className="hero-nav-catchcopy">なんとなく、外見がひっかかっている。</p>

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

            <p className="hero-nav-resolve">
              外見は、運命じゃない。<br />
              <strong>正しい地図と羅針盤があれば、誰でも更新できる。</strong>
            </p>

            <p className="hero-nav-h2">Find New Me.</p>

            <div className="hero-nav-cta-pair">
              {/* 男性 */}
              <div className="hero-gender-col hero-gender-col--male">
                <p className="hero-gender-label">男性の外見を変える</p>
                <div className="hero-gender-btns">
                  <Link href="/diagnosis" className="hero-nav-cta hero-nav-cta--scan-m">
                    <span className="hero-nav-cta-main">🧬 Me Scan（無料）</span>
                    <span className="hero-nav-cta-sub">7軸で外見を自己診断</span>
                  </Link>
                  <Link href="/mirror" className="hero-nav-cta hero-nav-cta--mirror-m">
                    <span className="hero-nav-cta-main">📸 Mirror</span>
                    <span className="hero-nav-cta-sub">写真から他者目線を分析</span>
                  </Link>
                </div>
              </div>
              {/* 女性 */}
              <div className="hero-gender-col hero-gender-col--female">
                <p className="hero-gender-label">女性の外見を変える</p>
                <div className="hero-gender-btns">
                  <Link href="/belle/diagnosis" className="hero-nav-cta hero-nav-cta--scan-f">
                    <span className="hero-nav-cta-main">🧬 Me Scan（無料）</span>
                    <span className="hero-nav-cta-sub">女性向け外見診断</span>
                  </Link>
                  <Link href="/belle/mirror" className="hero-nav-cta hero-nav-cta--mirror-f">
                    <span className="hero-nav-cta-main">📸 Mirror</span>
                    <span className="hero-nav-cta-sub">写真から他者目線を分析</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 診断済みユーザー向けバナー（ログイン済みのみ） */}
            {loggedIn && compass && (
              <Link href="/diagnosis/result" className="compass-banner">
                <span style={{ fontSize: '22px', color: '#c9a84c' }}>◎</span>
                <div className="compass-banner-body">
                  <p className="compass-banner-label">あなたのFineme Compass</p>
                  <p className="compass-banner-main">
                    最初の一手：{AXIS_ICONS[compass]} {AXIS_LABELS[compass]} — New Me Naviを見る →
                  </p>
                </div>
                <span className="compass-banner-arrow">→</span>
              </Link>
            )}

          </div>
        </section>

        {/* ── 2ツール統合価値 ── */}
        <section className="dual-section">
          <div className="dual-inner">
            <p className="dual-eyebrow">推奨の使い方：Mirror → Me Scan → Map</p>
            <h2 className="dual-title">2つの視点が揃うと、<br />変えるべき一点が見えてくる。</h2>
            <div className="dual-cards">
              <div className="dual-card dual-card--mirror">
                <div className="dual-card-icon">📸</div>
                <p className="dual-card-name">① Mirror</p>
                <p className="dual-card-role">他人から見えている自分（What）</p>
                <p className="dual-card-desc">写真から他者目線の外見分析が届く。自分では気づかない印象の差分と、変容の余白を正確に読み取る。</p>
                <Link href="/mirror" className="dual-card-link">試してみる（まずは無料）→</Link>
              </div>
              <div className="dual-card-plus">→</div>
              <div className="dual-card dual-card--scan">
                <div className="dual-card-icon">🧬</div>
                <p className="dual-card-name">② Me Scan</p>
                <p className="dual-card-role">変容の経路を決める（Where）</p>
                <p className="dual-card-desc">8軸の自己診断で現在地とゴールを地図化。Mirrorと照合して「何を・どの順で変えるか」が決まり、Fineme Compassが最初の一手を指す。</p>
                <Link href="/diagnosis" className="dual-card-link">受ける（無料）→</Link>
              </div>
            </div>
            <p className="dual-merge">両方揃うと → <strong>New Me Map</strong> が精度最大の自走ロードマップに</p>
          </div>
        </section>

        {/* ── Before / After carousel ── */}
        <BaCarousel />

        {/* ── 3ステップ or 診断済みパネル ── */}
        {diagnosis && loggedIn ? (
          /* 診断済み：Map / Navi へのナビゲーション */
          <section className="steps-section" style={{ background: 'rgba(10,15,30,0.55)' }}>
            <div className="steps-inner">
              <p className="steps-eyebrow">あなたの変容の旅、進行中</p>
              <h2 className="steps-title">New Me Naviが生成されています</h2>
              <p className="steps-sub">変容プロファイルを確認して、次の一手へ進みましょう。</p>
              <div className="steps-grid" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: '520px', margin: '0 auto' }}>
                <Link href="/diagnosis/result" className="step-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  <div className="step-icon">🧭</div>
                  <p className="step-name">New Me Navi</p>
                  <p className="step-desc">7軸変容プロファイルとFineme Compassを確認する</p>
                </Link>
                <Link href="/mypage/navi" className="step-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  <div className="step-icon">🗺️</div>
                  <p className="step-name">New Me Map</p>
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
          /* 未診断：3ステップ説明（Mirror→Me Scan→Map の推奨フロー） */
          <section className="steps-section">
            <div className="steps-inner">
              <p className="steps-eyebrow">Fineme の使い方</p>
              <h2 className="steps-title">まず「今どう見えているか」を知る。<br />次に「何から変えるか」を決める。</h2>
              <p className="steps-sub">外見改善の最大の障壁は「迷い」だ。Mirror と Me Scan の2ステップで迷いを消し、Map で今日から動き始める。</p>
              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-num">1</div>
                  <div className="step-icon">📸</div>
                  <p className="step-name">Mirror</p>
                  <p className="step-desc">写真を撮るだけで、他人の目線での外見分析が届く。<strong style={{color:'#c9a84c'}}>「今どう見えているか」の事実</strong>を、正確に把握するところから始める。</p>
                </div>
                <div className="step-card">
                  <div className="step-num">2</div>
                  <div className="step-icon">🧬</div>
                  <p className="step-name">Me Scan</p>
                  <p className="step-desc">8軸の自己診断でゴールと現在地を地図化。Mirrorと照合して<strong style={{color:'#c9a84c'}}>「何を・どの順で変えるか」</strong>を決める。Fineme Compass が最初の一手を指す。</p>
                </div>
                <div className="step-card">
                  <div className="step-num">3</div>
                  <div className="step-icon">🗺️</div>
                  <p className="step-name">New Me Map</p>
                  <p className="step-desc">「今日から一人でできること」から積み上げる変容ロードマップ。自走できる習慣と行動の設計図が、軸ごとに整理されて届く。</p>
                </div>
              </div>
              <div className="steps-cta-wrap">
                <Link href="/mirror" className="btn" style={{ fontSize: '15px', padding: '12px 28px' }}>
                  📸 まずMirrorを試す
                </Link>
                <p style={{ marginTop: '10px' }}>
                  <Link href="/diagnosis" style={{ fontSize: '13px', color: 'rgba(201,168,76,0.7)', textDecoration: 'none' }}>
                    Me Scanから始める（無料・約15分）→
                  </Link>
                </p>
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

        {/* ── 継続価値：Map の中身を見せる ── */}
        <section style={{ padding: 'clamp(56px,8vw,80px) 20px', background: 'rgba(10,15,30,0.78)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 10px' }}>
              続けると何が起きるか
            </p>
            <h2 style={{ fontFamily: "'Noto Serif JP', Georgia, serif", fontSize: 'clamp(20px,3.5vw,26px)', fontWeight: 700, color: '#fff', textAlign: 'center', margin: '0 0 8px', lineHeight: 1.5 }}>
              Finemeは「診断で終わる」サービスじゃない。
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(232,228,220,0.55)', textAlign: 'center', margin: '0 0 44px', lineHeight: 1.8 }}>
              Map・チェックイン・Mirror——3つの仕組みが連動して、変化が目に見えていく。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[
                { icon: '🗺️', title: 'New Me Map', sub: '毎日の自走ロードマップ', desc: '「今日家でできること」から積み上げる25〜35ステップ。一人でコツコツ続けられる行動設計図が届く。' },
                { icon: '📅', title: '週次チェックイン', sub: '7日ごとの振り返り', desc: '先週やれたこと・やれなかったことを確認。できなかったステップは翌週に最適化される。習慣が育まれる。' },
                { icon: '📊', title: '月次変化レポート', sub: 'Mirrorで変化を確認', desc: '1ヶ月前のMirrorと今のMirrorを比較。外見の変化が数値と言葉で記録される。「変わっている」が見える。' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: 'clamp(18px,3vw,24px)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{item.title}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,168,76,0.7)', margin: '0 0 10px', letterSpacing: '0.05em' }}>{item.sub}</p>
                  <p style={{ fontSize: 13, color: 'rgba(232,228,220,0.55)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <style>{`@media(max-width:640px){.cont-grid{grid-template-columns:1fr!important}}`}</style>
          </div>
        </section>

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
                  { axis: 'eyebrow', before: 'Mirrorで「眉の左右差が顔全体をアンバランスに見せている」と指摘された', after: '眉サロンで形を整えた翌日、鏡を見て初めて「あ、整っている」と思えた。小さな変化なのに全然違う。', milestone: '眉サロン初回' },
                  { axis: 'skin',    before: 'スキンケアを何年もしてきたのに、何が正解かずっとわからなかった', after: 'Mapの「洗顔後3分以内に保湿」を1ヶ月続けたら、Mirrorで「肌のツヤが改善」と出た。やっと実感できた。', milestone: '習慣1ヶ月達成' },
                  { axis: 'fashion', before: '服を買っても似合わない気がして、ずっと同じ服を着ていた', after: '体型が変わると、選べる服の幅が広がった。それだけで外出が楽しくなった。', milestone: '3ヶ月継続達成' },
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

        {/* ── カテゴリ（ログイン+診断済み：補助ナビ / それ以外：Me Scan誘導） ── */}
        {(loggedIn && diagnosis) ? (
        <section className="categories-section">
          <div className="categories-inner">
            <p className="categories-eyebrow">あなたの変容ルートを深める</p>
            <h2 className="categories-title">専門家・サービスから次の一手を選ぶ</h2>
            <div className="cat-grid">
              {CATEGORIES.map(({ cat, icon, label, sub }) => (
                <Link key={cat} href={`/search?category=${cat}`} className="cat-card">
                  <span className="cat-icon">{icon}</span>
                  <span className="cat-label">{label}</span>
                  <span className="cat-sub">{sub}</span>
                </Link>
              ))}
            </div>

            {/* ── STEP 2：発揮のステージ ── */}
            <div style={{
              marginTop: '56px',
              paddingTop: '48px',
              borderTop: '1px solid rgba(201,168,76,0.2)',
            }}>
              {/* sec-label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '20px', height: '1.5px', background: '#c9a84c', borderRadius: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.75)', margin: 0, fontFamily: 'var(--font-sans)' }}>
                  Next Stage
                </p>
                <div style={{ flex: 1, height: '1px', background: 'repeating-linear-gradient(90deg,rgba(201,168,76,0.25) 0,rgba(201,168,76,0.25) 4px,transparent 4px,transparent 9px)' }} />
              </div>
              <h3 style={{ fontSize: 'clamp(17px, 3vw, 22px)', fontWeight: 800, fontFamily: 'var(--font-serif)', color: 'var(--color-fg)', marginBottom: '6px' }}>
                自信がついてきたら、発揮するステージへ
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.75 }}>
                変容は外見を変えることで完結しない。変わった自分を世界に見せて、初めて完成する。
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {STAGE2_CATEGORIES.map(({ cat, icon, label, sub }) => (
                  <Link key={cat} href={`/search?category=${cat}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', gap: '18px', alignItems: 'flex-start',
                      padding: '22px 24px',
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(10,15,30,0.4) 100%)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      borderRadius: '16px',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.7)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.transform = ''; }}
                    >
                      <span style={{ fontSize: '28px', flexShrink: 0, marginTop: '2px' }}>{icon}</span>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-fg)', margin: '0 0 6px', fontFamily: 'var(--font-serif)' }}>{label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0, lineHeight: 1.7 }}>{sub}</p>
                      </div>
                      <span style={{ marginLeft: 'auto', color: 'rgba(201,168,76,0.6)', fontSize: '16px', alignSelf: 'center', flexShrink: 0 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </section>
        ) : (
        /* 未診断：Me Scan への強い誘導 */
        <section style={{ padding: '72px 20px', background: 'rgba(10,15,30,0.70)', textAlign: 'center' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.16em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'var(--font-sans)' }}>地図なき旅は迷う</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 700, color: '#f0ece4', margin: '0 0 16px', lineHeight: 1.5 }}>
              「何を変えるか」を決める前に、<br />あなたの「変容地図」を描く。
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', margin: '0 0 36px', lineHeight: 1.9 }}>
              カテゴリから選ぶことはできる。でも何から始めるべきかは、<br />あなたの現在地を測ってから分かる。<br />
              Me Scanが、7軸の中で「今のあなたに効く順番」を教えてくれる。
            </p>
            <Link href="/diagnosis" className="hero-nav-cta">
              🧬 Me Scanで地図を描く（無料）
            </Link>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '16px 0 0' }}>約15分 · 匿名 · 登録不要</p>
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>すでに始める場所が決まっている方</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {CATEGORIES.slice(0, 6).map(({ cat, icon, label }) => (
                  <Link key={cat} href={`/search?category=${cat}`} style={{ fontSize: '12px', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {icon} {label}
                  </Link>
                ))}
                <Link href="/search" style={{ fontSize: '12px', padding: '6px 14px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>
                  全カテゴリ →
                </Link>
              </div>
            </div>
          </div>
        </section>
        )}

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
        {featuredArticles.length > 0 && (
          <section className="section">
            <div className="container stack">
              <div className="cluster space-between">
                <h2 className="section-title">Fineme Journal</h2>
                <Link className="btn btn-ghost" href="/feature">一覧を見る</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {featuredArticles.map(a => (
                  <Link key={a.id} href={`/feature/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(255,255,255,0.03)', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'}
                    >
                      {a.thumbnail && (
                        <img src={a.thumbnail} alt={a.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                      )}
                      <div style={{ padding: '16px' }}>
                        {a.category && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{a.category}</span>
                        )}
                        <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.5, margin: '8px 0 6px', fontFamily: 'var(--font-serif)' }}>{a.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.6, margin: 0 }}>{a.description || a.summary}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section style={{ padding: '80px 24px', background: "linear-gradient(rgba(10,15,30,0.82), rgba(10,15,30,0.82)), url('/assets/images/hero-bg.png') center / cover no-repeat", borderTop: '1px solid rgba(201,168,76,0.12)' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', margin: '0 0 12px', textAlign: 'center' }}>FAQ</p>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: 'var(--color-heading)', textAlign: 'center', margin: '0 0 48px', lineHeight: 1.4 }}>よくある質問</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { q: 'Finemeとは何ですか？', a: 'Finemeは外見を起点に自信を再設計するプラットフォームです。男性向けのFinemeと女性向けのBelleの2トラックで構成され、診断・AI分析・ガイドマッチングを提供しています。' },
                { q: 'Fineme Belleとは何ですか？', a: 'Fineme Belleは女性向けの外見診断・変容ロードマップサービスです。眉・ヘア・ファッション・スキンなど8軸のMe Scanから、あなただけのBelleコンパス（最初の一手）を生成します。/belleからアクセスできます。' },
                { q: 'Me Scanとは何ですか？料金はかかりますか？', a: 'Me Scanは無料の外見診断です。複数軸の問診形式でスキャンし、あなたの「最優先の一手（コンパス）」を特定します。男性版（7軸）・女性版Belle（8軸）それぞれがあります。無料でご利用いただけます。' },
                { q: 'Fineme Mirrorとは何ですか？', a: '写真1枚でAIが外見を7軸で分析するサービスです。表情・雰囲気・清潔感・服装などの改善点を具体的にフィードバックします。写真は分析後に保存されません。' },
                { q: 'Fineme Mirrorの料金は？', a: '¥500（単発）または¥780/月（月額）でご利用いただけます。' },
                { q: '外見を改善するには何から始めればいいですか？', a: 'まずはMe Scan（無料診断）で自分の「コンパス（最優先の一手）」を把握することをおすすめします。一般的には眉毛の整えが最もコストパフォーマンスが高く、最初の一手に最適です。' },
                { q: '清潔感を出すにはどうすればいいですか？', a: '清潔感の土台は眉毛・髪・肌の3つです。特に眉毛は最も即効性が高く、1〜2回のサロン施術で劇的に印象が変わります。次に髪型を整え、肌のスキンケアを日課にすることをおすすめします。' },
                { q: '眉毛を整えるにはどうすればいいですか？', a: '初回は眉サロンに行くことを強くおすすめします。自己流では左右差や形の失敗リスクが高いためです。サロンで形を作ってもらった後、自宅でのメンテナンスに移行するのが最短で綺麗な眉を手に入れる方法です。' },
                { q: '外見改善にかかる費用はどのくらいですか？', a: '眉サロン（初回¥3,000〜）から始めれば最低限の費用で大きな変化が得られます。全体的には月¥10,000〜¥30,000程度の継続投資でかなりの変化が期待できます。' },
                { q: '外見と自己肯定感の関係は？', a: '外見改善は自己肯定感を高める有効な手段の一つです。鏡を見るたびに「なんか違う」という感覚が消えることで、行動の自信につながります。見た目を変えることは「自分が変われる」という体験を積むことでもあります。' },
              ].map(({ q, a }, i) => (
                <details key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                  <summary style={{ padding: '18px 20px', fontWeight: 700, fontSize: '15px', color: 'var(--color-heading)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span>{q}</span>
                    <span style={{ fontSize: '18px', color: 'var(--color-gold)', flexShrink: 0, lineHeight: 1 }}>+</span>
                  </summary>
                  <div style={{ padding: '0 20px 18px', fontSize: '14px', lineHeight: 1.8, color: 'var(--color-text)' }}>{a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
