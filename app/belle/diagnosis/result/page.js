'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LocationPrompt } from '@/app/_components/LocationPrompt';

export default function BelleDiagnosisResultPage() {
  const initialized = useRef(false);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── ページ固有スタイル ───
    const style = document.createElement('style');
    style.textContent = `
      .map-wrap { max-width: 680px; margin: 0 auto; padding: 32px 20px 80px; width: 100%; box-sizing: border-box; overflow-x: hidden; }
      /* 全子要素のはみ出し防止（innerHTML追加コンテンツにも適用） */
      #result-root { width: 100%; overflow-x: hidden; box-sizing: border-box; }
      #result-root * { max-width: 100%; box-sizing: border-box; }
      /* カルーセルは横スクロール許可（overflow-xをautoに戻す） */
      #result-root .product-carousel { max-width: none; overflow-x: auto; }

      /* ── Hero ── */
      .map-hero { padding: 44px 28px 40px; background: linear-gradient(rgba(10,15,30,0.78), rgba(10,15,30,0.88)), url('/assets/images/hero-bg.webp') center / cover no-repeat; border-radius: 14px; margin-bottom: 24px; position: relative; overflow: hidden; border: 1px solid rgba(201,168,76,0.2); }
      .map-hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(201,168,76,.1) 0%, transparent 70%); border-radius: 50%; }
      .map-hero::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; background: radial-gradient(circle, rgba(201,168,76,.07) 0%, transparent 70%); border-radius: 50%; }
      .map-hero-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 12px; position: relative; z-index: 1; text-transform: uppercase; }
      .map-hero-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 14px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); color: #c9a84c; border-radius: 3px; margin-bottom: 18px; letter-spacing: .08em; position: relative; z-index: 1; }
      .map-hero h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,4.5vw,24px); font-weight: 700; margin: 0 0 14px; line-height: 1.6; color: #fff; letter-spacing: -.01em; position: relative; z-index: 1; }
      .map-hero h1 em { font-style: normal; color: #c9a84c; }
      .map-hero-divider { width: 40px; height: 1px; background: linear-gradient(90deg, #c9a84c, transparent); margin: 16px 0; position: relative; z-index: 1; }
      .map-hero-sub { font-family: 'Noto Serif JP', Georgia, serif; font-size: 14px; color: rgba(255,255,255,.72); margin: 0; line-height: 1.9; position: relative; z-index: 1; }
      .map-hero-sub strong { color: rgba(255,255,255,.92); font-weight: 500; }

      /* ── Section label ── */
      .sec-label { display: flex; align-items: center; gap: 10px; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: rgba(201,168,76,0.7); margin: 28px 0 16px; padding-left: 0; }
      .sec-label::before { content: ''; width: 18px; height: 1.5px; background: #c9a84c; border-radius: 1px; flex-shrink: 0; }
      .sec-label::after { content: ''; flex: 1; height: 1px; background: repeating-linear-gradient(90deg, rgba(201,168,76,0.45) 0, rgba(201,168,76,0.45) 5px, transparent 5px, transparent 11px); }

      /* ── Compass (最初の一手) ── */
      .compass-card { background: var(--color-bg-dark, #0a0f1e); border: 1.5px solid rgba(201,168,76,0.4); border-radius: 14px; padding: 36px 24px 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(201,168,76,.12), 0 1px 4px rgba(0,0,0,.2); position: relative; overflow: visible; }
      .compass-card::before { content: '🧭'; position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 32px; filter: drop-shadow(0 2px 8px rgba(201,168,76,.4)); }
      .compass-eyebrow { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.7); letter-spacing: .1em; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
      .compass-eyebrow::before { content: ''; display: inline-block; width: 6px; height: 6px; background: #c9a84c; border-radius: 50%; }
      .compass-main { font-size: 24px; font-weight: 900; color: #fff; margin: 0 0 12px; display: flex; align-items: center; gap: 10px; }
      .compass-reason { font-size: 14px; color: rgba(255,255,255,.75); line-height: 1.85; margin: 0; }
      .compass-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 18px; padding: 10px 20px; border: 1.5px solid #c9a84c; color: #c9a84c; background: transparent; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; transition: background .18s, color .18s; }
      .compass-cta:hover { background: #c9a84c; color: #0a0f1e; }
      .compass-override-chip { padding: 7px 14px; border-radius: 99px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid rgba(201,168,76,0.3); background: rgba(201,168,76,0.08); color: rgba(255,255,255,0.75); transition: all .15s; }
      .compass-override-chip:hover { background: rgba(201,168,76,0.2); border-color: rgba(201,168,76,0.65); color: #fff; transform: translateY(-1px); }
      .compass-override-chip.active { background: #c9a84c; color: #0a0f1e; border-color: #c9a84c; box-shadow: 0 2px 10px rgba(201,168,76,0.4); }

      /* ── Radar chart card ── */
      .radar-card { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.3); border-radius: 14px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.4); }
      .radar-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--color-fg, #0a0f1e); margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
      .radar-subtitle { font-size: 12px; color: var(--color-muted, #7a6e65); margin: 0 0 20px; }
      .radar-legend { display: flex; align-items: center; gap: 20px; justify-content: center; margin-top: 16px; }
      .radar-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-muted, #7a6e65); }
      .radar-legend-dot { width: 12px; height: 4px; border-radius: 2px; }

      /* ── Vector cards (priority categories) ── */
      .vector-list { display: flex; flex-direction: column; gap: 12px; }
      .vector-item { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.25); border-radius: 12px; padding: 16px 18px; }
      .vector-item.priority-1 { border-color: rgba(201,168,76,0.5); background: var(--color-bg-dark, #0a0f1e); }
      .vector-item.priority-1 .vector-item-name { color: #fff; }
      .vector-item.priority-1 .vector-bar-label { color: rgba(255,255,255,.5); }
      .vector-item.priority-1 .vector-bar-labels { color: rgba(255,255,255,.4); }
      .vector-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .vector-item-name { font-size: 15px; font-weight: 800; color: var(--color-fg, #0a0f1e); display: flex; align-items: center; gap: 8px; }
      .vector-tier-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
      .tier-1 { background: rgba(201,168,76,0.15); color: #c9a84c; border: 1px solid rgba(201,168,76,.3); }
      .tier-2 { background: #d1fae5; color: #065f46; }
      .tier-3 { background: #fef3c7; color: #92400e; }
      .tier-4 { background: rgba(232,228,220,0.10); color: rgba(232,228,220,0.60); }
      .vector-bar-wrap { display: flex; align-items: center; gap: 10px; }
      .vector-bar-label { font-size: 11px; color: var(--color-muted, #7a6e65); width: 36px; text-align: right; flex-shrink: 0; }
      .vector-bar-track { flex: 1; height: 8px; background: rgba(232,228,220,0.12); border-radius: 99px; overflow: hidden; position: relative; }
      .vector-bar-current { height: 100%; border-radius: 99px; background: rgba(96,165,250,0.75); transition: width 1s cubic-bezier(.4,0,.2,1) .3s; }
      .vector-bar-ideal-marker { position: absolute; top: 0; height: 100%; width: 3px; background: #c9a84c; border-radius: 1px; transform: translateX(-50%); }
      .vector-bar-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-muted, #7a6e65); margin-top: 4px; }
      .vector-gap-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(201,168,76,0.15); color: #c9a84c; border: 1px solid rgba(201,168,76,.3); flex-shrink: 0; }
      .vector-gap-badge.small { background: #fef3c7; color: #92400e; border: none; }
      .vector-gap-badge.none { background: #d1fae5; color: #065f46; border: none; }

      /* ── Goal card ── */
      .goal-card { background: var(--color-bg-dark, #0a0f1e); border: 1.5px solid rgba(201,168,76,0.25); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
      .goal-card-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 15px; font-weight: 700; color: #c9a84c; margin: 0 0 16px; }
      .goal-layers { display: flex; flex-direction: column; gap: 10px; }
      .goal-layer { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; border: 1px solid rgba(201,168,76,0.15); }
      .goal-layer-icon { width: 36px; height: 36px; background: rgba(201,168,76,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
      .goal-layer-body { flex: 1; }
      .goal-layer-label { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.7); margin: 0 0 3px; letter-spacing: .06em; }
      .goal-layer-text { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.88); margin: 0; line-height: 1.5; }

      /* ── Barrier card ── */
      .result-card { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.25); border-radius: 14px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.4); }
      .result-card-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 16px; font-weight: 700; color: var(--color-fg, #0a0f1e); margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
      .result-card-subtitle { font-size: 12px; color: var(--color-muted, #7a6e65); margin: 0 0 18px; line-height: 1.5; }
      .insight-list { display: flex; flex-direction: column; gap: 12px; }
      .insight-item { padding: 16px 18px; border-radius: 10px; border-left: 4px solid #c9a84c; background: rgba(201,168,76,0.05); }
      .insight-label { font-size: 10px; font-weight: 800; color: #c9a84c; margin: 0 0 5px; text-transform: uppercase; letter-spacing: .1em; }
      .insight-text { font-size: 14px; font-weight: 800; color: var(--color-fg, #0a0f1e); margin: 0 0 4px; line-height: 1.5; }
      .insight-sub { font-size: 13px; color: var(--color-muted, #7a6e65); margin: 0; line-height: 1.7; }
      .trait-list { display: flex; flex-direction: column; gap: 10px; }
      .trait-item { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #e8e4dc; line-height: 1.55; padding: 12px 14px; background: rgba(232,228,220,0.06); border-radius: 10px; }
      .trait-check { width: 20px; height: 20px; background: rgba(201,168,76,0.2); color: #c9a84c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; flex-shrink: 0; margin-top: 1px; }

      /* ── Provider match ── */
      .pmc-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1.5px solid rgba(201,168,76,0.25); border-radius: 12px; margin-bottom: 10px; text-decoration: none; color: inherit; transition: border-color .12s, box-shadow .12s; }
      .pmc-card:hover { border-color: #c9a84c; box-shadow: 0 2px 12px rgba(201,168,76,.15); }
      .pmc-card.top { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.04); }
      .pmc-photo { width: 52px; height: 52px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: rgba(232,228,220,0.10); display: flex; align-items: center; justify-content: center; }
      .pmc-photo img { width: 100%; height: 100%; object-fit: cover; }
      .pmc-photo-icon { font-size: 24px; }
      .pmc-body { flex: 1; min-width: 0; }
      .pmc-name { font-size: 15px; font-weight: 700; color: var(--color-fg, #0a0f1e); margin: 0 0 2px; }
      .pmc-catch { font-size: 12px; color: var(--color-muted, #7a6e65); margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pmc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 5px; }
      .pmc-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; background: rgba(201,168,76,0.12); color: #c9a84c; border-radius: 99px; border: 1px solid rgba(201,168,76,.25); }
      .pmc-meta { font-size: 11px; color: var(--color-muted, #7a6e65); }
      .pmc-arrow { font-size: 14px; color: var(--color-muted, #7a6e65); flex-shrink: 0; }

      /* ── Next step section ── */
      .navi-section { margin: 32px 0; padding: 28px 24px; background: var(--color-bg-dark, #0a0f1e); border-radius: 14px; border: 1px solid rgba(201,168,76,0.2); }
      .navi-section-label { font-size: 12px; font-weight: 700; color: rgba(201,168,76,0.6); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 16px; }
      .navi-btn { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 10px; text-decoration: none; transition: opacity .15s; margin-bottom: 12px; }
      .navi-btn:last-child { margin-bottom: 0; }
      .navi-btn:hover { opacity: .9; }
      .navi-btn-primary { background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.35); }
      .navi-btn-secondary { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
      .navi-btn-icon { font-size: 24px; flex-shrink: 0; }
      .navi-btn-body { flex: 1; }
      .navi-btn-title { display: block; font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 3px; }
      .navi-btn-desc { display: block; font-size: 12px; color: rgba(255,255,255,.55); line-height: 1.5; }
      .navi-btn-arrow { font-size: 18px; color: rgba(201,168,76,0.5); flex-shrink: 0; }

      /* ── Bottom CTA ── */
      .cta-block { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 24px; margin-top: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.4); }
      .cta-section { display: flex; flex-direction: column; gap: 10px; }
      .cta-btn-secondary { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; background: rgba(10,15,30,0.50); color: #e8e4dc; font-size: 15px; font-weight: 700; border: 1.5px solid rgba(201,168,76,0.3); border-radius: 10px; text-decoration: none; transition: border-color .12s; cursor: pointer; }
      .cta-btn-secondary:hover { border-color: #c9a84c; }
      .cta-divider { height: 1px; background: rgba(201,168,76,0.1); margin: 4px 0; }
      .cta-btn-ghost { display: block; text-align: center; padding: 10px 20px; color: var(--color-muted, #7a6e65); font-size: 13px; text-decoration: none; }
      .cta-btn-ghost:hover { color: var(--color-fg, #0a0f1e); }

      /* ── Save map CTA (non-logged-in) ── */
      .save-map-cta { display: flex; gap: 16px; align-items: flex-start; padding: 22px 24px; background: linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(79,70,229,0.06) 100%); border: 1.5px solid rgba(201,168,76,0.35); border-radius: 14px; margin: 0 0 16px; }
      .save-map-cta-icon { font-size: 36px; flex-shrink: 0; }
      .save-map-cta-title { font-size: 16px; font-weight: 800; color: var(--color-fg, #0a0f1e); margin: 0 0 6px; }
      .save-map-cta-desc { font-size: 13px; color: var(--color-muted, #7a6e65); line-height: 1.8; margin: 0 0 14px; }
      .save-map-cta-btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 22px; background: #c9a84c; color: #0a0f1e; font-size: 14px; font-weight: 800; border-radius: 6px; text-decoration: none; transition: opacity .15s; }
      .save-map-cta-btn:hover { opacity: .88; }
      .save-map-cta-note { font-size: 11px; color: var(--color-muted, #7a6e65); margin: 10px 0 0; line-height: 1.7; }
      /* ── ヒーロー直下 登録促進バナー ── */
      .auth-hero-banner { margin: 0 0 20px; padding: 18px 20px; background: linear-gradient(135deg, rgba(201,168,76,0.13) 0%, rgba(10,15,30,0.6) 100%); border: 1.5px solid rgba(201,168,76,0.5); border-radius: 14px; animation: abpulse 3s ease-in-out infinite; }
      @keyframes abpulse { 0%,100%{ border-color:rgba(201,168,76,0.5); } 50%{ border-color:rgba(201,168,76,0.85); } }
      .auth-hero-banner-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .auth-hero-banner-icon { font-size: 22px; flex-shrink: 0; }
      .auth-hero-banner-title { font-size: 14px; font-weight: 900; color: #c9a84c; line-height: 1.4; }
      .auth-hero-banner-body { font-size: 12px; color: rgba(232,228,220,0.7); line-height: 1.75; margin: 0 0 14px; }
      .auth-hero-banner-btns { display: flex; gap: 10px; flex-wrap: wrap; }
      .auth-hero-banner-btn-primary { flex: 1; min-width: 140px; display: block; text-align: center; padding: 11px 16px; background: #c9a84c; color: #0a0f1e; font-size: 13px; font-weight: 800; border-radius: 8px; text-decoration: none; transition: opacity .15s; }
      .auth-hero-banner-btn-primary:hover { opacity: .88; }
      .auth-hero-banner-btn-secondary { flex: 1; min-width: 100px; display: block; text-align: center; padding: 11px 16px; background: transparent; color: rgba(201,168,76,0.85); font-size: 13px; font-weight: 700; border-radius: 8px; border: 1px solid rgba(201,168,76,0.4); text-decoration: none; transition: background .15s; }
      .auth-hero-banner-btn-secondary:hover { background: rgba(201,168,76,0.08); }

      /* ── Voyage route connector ── */
      .v-route { display: flex; flex-direction: column; align-items: center; height: 28px; margin: -4px auto 0; width: 16px; }
      .v-route-line { flex: 1; width: 1px; background: repeating-linear-gradient(to bottom, rgba(201,168,76,0.55) 0, rgba(201,168,76,0.55) 4px, transparent 4px, transparent 9px); }
      .v-route-dot { width: 7px; height: 7px; background: rgba(201,168,76,0.7); border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(201,168,76,0.4); }

      /* ── 商品カルーセル ── */
      .product-carousel-section { margin: 28px 0; overflow: hidden; }
      .product-carousel-label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(16,185,129,0.65); margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
      .product-carousel-note { font-size: 11px; color: rgba(232,228,220,0.35); margin: 0 0 12px; line-height: 1.5; }
      .product-carousel { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; scrollbar-width: none; -ms-overflow-style: none; }
      .product-carousel::-webkit-scrollbar { display: none; }
      .product-card { flex-shrink: 0; width: 160px; scroll-snap-align: start; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.18); border-radius: 12px; padding: 14px 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s; text-decoration: none; }
      .product-card:hover { border-color: rgba(16,185,129,0.45); }
      .product-card-matched { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.06); }
      .product-card-matched:hover { border-color: #c9a84c; }
      .product-card-axis { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(16,185,129,0.55); }
      .product-card-name { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.85); line-height: 1.45; flex: 1; }
      .product-card-cta { font-size: 11px; font-weight: 700; color: rgba(16,185,129,0.75); display: flex; align-items: center; gap: 3px; }

      /* ── Type Hero ── */
      .type-hero { width: 100%; text-align: center; padding: 40px 20px 32px; margin-bottom: 0; position: relative; overflow: hidden; }
      .type-hero-lead { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: rgba(232,228,220,0.45); margin: 0 0 8px; }
      .type-hero-code { font-size: clamp(36px,10vw,52px); font-weight: 900; letter-spacing: .14em; margin: 0 0 24px; line-height: 1; }
      .type-hero-img-wrap { width: min(240px,68vw); height: min(320px,90vw); margin: 0 auto 20px; border-radius: 18px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; }
      .type-hero-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; border-radius: 18px; }
      .type-hero-name { font-family: 'Noto Serif JP',Georgia,serif; font-size: clamp(20px,6vw,30px); font-weight: 900; color: #fff; margin: 0 0 6px; line-height: 1.3; }
      .type-hero-axis { font-size: 13px; color: rgba(232,228,220,0.45); margin: 0 0 20px; letter-spacing: .06em; }
      .type-hero-tagline { font-size: 13px; color: rgba(232,228,220,0.5); line-height: 1.85; max-width: 280px; margin: 0 auto 20px; text-align: left; }
      .type-hero-share-btn { padding: 9px 20px; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(232,228,220,0.65); font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
      .type-hero-divider { height: 1px; background: linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent); margin: 24px 0 0; }
    `;
    document.head.appendChild(style);

    // ─── ユーティリティ ───
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ─── 軸別おすすめ商品（DBから取得・管理画面 /admin/products で管理）───
    // AXIS_PRODUCTS は非同期で /api/products から取得してから buildProductCarousel に渡す
    let AXIS_PRODUCTS = {}; // axis → [{name, url, level, price_range, target_concerns}]

    // body_data: ユーザーが New Me Map で入力した自己把握データ
    function getUserBodyData() {
      try { return JSON.parse(localStorage.getItem('fineme:body:data') || '{}'); } catch { return {}; }
    }
    function getUserBodyConcerns(bodyData) {
      const concerns = new Set();
      Object.values(bodyData).forEach(v => {
        if (Array.isArray(v)) v.forEach(x => concerns.add(x));
        else if (v) concerns.add(v);
      });
      return concerns;
    }

    // stepDone総数でレベル判定: 0-2→入門 / 3-8→習慣化中 / 9+→こだわり派
    const LEVEL_RANK  = { beginner: 0, intermediate: 1, advanced: 2 };
    const LEVEL_LABEL = { beginner: '入門', intermediate: '習慣化中', advanced: 'こだわり派' };
    const BUDGET_RANK = { low: 0, mid: 1, high: 2 };
    function getUserLevel() {
      try {
        const obj = JSON.parse(localStorage.getItem('fineme:step:done') || '{}');
        const n = Object.values(obj).filter(Boolean).length;
        return n >= 9 ? 'advanced' : n >= 3 ? 'intermediate' : 'beginner';
      } catch { return 'beginner'; }
    }
    function getUserBudget() {
      try {
        const raw = localStorage.getItem('fineme:diagnosis:belle');
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p.budget || null;
      } catch { return null; }
    }
    function getBudgetMaxRank(budget) {
      if (!budget || budget === 'high' || budget === 'premium') return 2;
      if (budget === 'mid') return 1;
      return 0; // 'low'のみ
    }

    function buildProductCarousel(axes, userLevel) {
      const maxRank = LEVEL_RANK[userLevel || 'beginner'];
      const budget = getUserBudget();
      const maxBudgetRank = getBudgetMaxRank(budget);
      const userConcerns = getUserBodyConcerns(getUserBodyData());
      const axisLabel = { body:'体型', skin:'肌', eyebrow:'眉', hair:'髪', teeth:'歯', nail:'爪', fashion:'服' };
      const cards = axes
        .filter(id => AXIS_PRODUCTS[id])
        .flatMap(id =>
          AXIS_PRODUCTS[id]
            .filter(p => {
              const lvOk = (LEVEL_RANK[p.level || 'beginner']) <= maxRank;
              const prOk = (BUDGET_RANK[p.price_range || 'low']) <= maxBudgetRank;
              return lvOk && prOk;
            })
            .map(p => {
              const concerns = p.target_concerns || [];
              const matched = userConcerns.size > 0 && concerns.some(c => userConcerns.has(c));
              const matchBadge = matched
                ? `<span style="font-size:9px;font-weight:800;background:rgba(201,168,76,0.2);color:#c9a84c;border:1px solid rgba(201,168,76,.35);border-radius:99px;padding:2px 7px;letter-spacing:.04em">あなた向け</span>`
                : '';
              return `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="product-card${matched ? ' product-card-matched' : ''}">
                <span class="product-card-axis">${esc(axisLabel[id] || id)}</span>
                ${matchBadge}
                <span class="product-card-name">${esc(p.name)}</span>
                <span class="product-card-cta">Amazonで見る →</span>
              </a>`;
            })
        )
        .sort((a, b) => (b.includes('product-card-matched') ? 1 : 0) - (a.includes('product-card-matched') ? 1 : 0))
        .join('');
      if (!cards) return '';
      const lvLabel = LEVEL_LABEL[userLevel || 'beginner'];
      const hasMatch = userConcerns.size > 0 && cards.includes('product-card-matched');
      return `
        <div class="product-carousel-section">
          <p class="product-carousel-label">🛒 旅に役立つグッズ <span style="font-size:10px;font-weight:600;opacity:0.55;margin-left:6px">${lvLabel}向け</span></p>
          <p class="product-carousel-note">${hasMatch ? 'あなたのプロフィールに合うアイテムが見つかりました ✦' : 'あなたの診断結果に関連するアイテムです'} ← スワイプで全部見る</p>
          <div class="product-carousel">${cards}</div>
        </div>`;
    }

    // ─── データ読み込み（Supabase優先 → localStorage fallback）───
    ;(async () => {
    // 商品データをDBから取得（失敗時は空のまま続行）
    try {
      const pr = await fetch('/api/products');
      if (pr.ok) {
        const rows = await pr.json();
        rows.forEach(r => {
          if (!AXIS_PRODUCTS[r.axis]) AXIS_PRODUCTS[r.axis] = [];
          AXIS_PRODUCTS[r.axis].push(r);
        });
      }
    } catch {}

    const STORAGE_KEY = 'fineme:diagnosis:belle';
    const root = document.getElementById('result-root');
    let isLoggedIn = false;
    let authToken = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        const token = sbObj?.access_token;
        if (token) {
          isLoggedIn = true;
          authToken = token;
          setAccessToken(token);
          const res = await fetch('/api/me/diagnosis?track=belle', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { const data = await res.json(); if (data) {
            // 共有リモート行（/api/me/diagnosis は user_id 単一行）には男性版Me Scanの
            // データも入りうる。Belle（女性版）の結果ページは女性版データ以外を採用しない。
            if (data.gender === 'female') {
              // localStorageの方が新しい場合は上書きしない（新規診断直後を保護）
              try {
                const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                const localAt = local?.at ? new Date(local.at).getTime() : 0;
                const remoteAt = data?.at ? new Date(data.at).getTime() : 0;
                if (remoteAt >= localAt) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
              } catch { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
            }
          } }
        }
      }
    } catch {}
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      root.innerHTML = '<div style="text-align:center;padding:60px 20px"><p style="color:#6b7280">診断データが見つかりませんでした。</p><a href="/belle/diagnosis" class="btn" style="margin-top:16px;display:inline-block">Me Scanを受ける</a></div>';
      return;
    }
    let p;
    try { p = JSON.parse(raw); } catch {
      root.innerHTML = '<div style="text-align:center;padding:60px 20px"><p>エラーが発生しました。</p><a href="/belle/diagnosis" class="btn" style="margin-top:16px;display:inline-block">再スキャンする</a></div>';
      return;
    }

    // 旧フォーマット検出（transform_vectorsがない場合）
    if (!p.transform_vectors) {
      root.innerHTML = `<div style="text-align:center;padding:60px 20px">
        <p style="font-size:32px;margin-bottom:16px">🗺️</p>
        <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">新しいMe Scanで地図を生成しよう</h2>
        <p style="color:#6b7280;font-size:14px;line-height:1.75;margin:0 0 24px">診断をアップデートしました。<br>新しいMe Scanで、あなただけの変容ナビを作成します。</p>
        <a href="/belle/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（新版）</a>
      </div>`;
      return;
    }

    // ─── 定数・マッピング ───
    const AREA_DEFS = {
      body:    { icon:'💪', label:'体型', catLink:'gym',          tier:1 },
      eyebrow: { icon:'✂️', label:'眉',   catLink:'eyebrow',     tier:1 },
      fashion: { icon:'👗', label:'服',   catLink:'fashion',      tier:1 },
      hair:    { icon:'💇', label:'髪',   catLink:'hair',         tier:1 },
      skin:        { icon:'✨', label:'肌',   catLink:'esthetic',     tier:2 },
      hairremoval: { icon:'🪒', label:'脱毛', catLink:'hairremoval',  tier:2 },
      teeth:       { icon:'🦷', label:'歯',   catLink:'whitening',    tier:3 },
      nail:        { icon:'💅', label:'爪',   catLink:'nail',         tier:4 },
    };
    const TIER_LABELS = { 1:'基盤', 2:'深化', 3:'補完', 4:'磨き込み' };
    const PATH_LABELS = { virgin:'未経験', quit:'試したが続かない', blind:'非客観視', lapsed:'以前やっていた' };

    // ─── タイプシステム ───
    const AXIS_TYPE_CODE = { body:'B', eyebrow:'E', fashion:'F', hair:'H', skin:'S', hairremoval:'R', teeth:'T', nail:'W' };
    const CARE_CODE_MAP  = { none:'N', concerned:'C', self:'A', self_regular:'A', pro:'P' };
    const PATH_CODE_MAP  = { virgin:'V', quit:'Q', blind:'K', lapsed:'L', doing:'D' };
    // 表示用タイプコード（でお指摘 2026-08-07：MBTIのような全アルファベットは飽和している。
    // かといって全部数字だと「レベル」に見えてしまうので、先頭だけ軸のアルファベットを残し、
    // ケア度・経路は数字にする。末尾のトラック文字（M=Fineme/L=Belle）は軸文字と衝突しない
    // アルファベットを選び、男女で同じ軸・ケア・経路でもコードが重複しないようにする。
    // 内部の typeCode（軸+ケア+経路のアルファベット3文字）は画像ファイル名・説明文の
    // キーとして使い続けるため変更しない。ユーザーに見せる文字列だけ displayCode に分離する
    const CARE_DIGIT_MAP = { N:'0', C:'1', A:'2', P:'3' };
    const PATH_DIGIT_MAP = { V:'0', Q:'1', K:'2', L:'3', D:'4' };
    const TRACK_CODE_LETTER = 'L';
    const TYPE_CREATURE  = {
      NV:'薔薇', NK:'芙蓉', ND:'野菫',
      CV:'蕾', CQ:'紫陽花', CK:'夾竹桃', CL:'牡丹', CD:'椿',
      AV:'新芽', AQ:'勿忘草', AK:'月見草', AL:'山茶花', AD:'白梅',
      PQ:'落梅', PK:'百合', PL:'蓮', PD:'桜',
    };
    // 軸×ケア×パス の136通り全パターン説明文（typeCodeをキーに）
    const TYPE_DESCRIPTION = {
      // ── B軸（体型） ──
      BNV:'体型をこれまで意識してこなかった。それはある意味、一番フラットな出発点だ。変えるべき習慣がまだ根付いていない分、正しい方向へ動けば誰より早く変わる可能性がある。まず自分の現在地を数値で知ることから始めよう。体重や体組成の計測が、最初の地図になる。体型は外見の中で最も「土台」になる軸だ。ここが変わると、服の見え方も印象も連動して変わっていく。',
      BNK:'体型について自分なりに動いてはいるが、客観的なフィードバックを受けたことがない。自己流の積み重ねには、気づきにくい盲点が潜んでいる。間違った方向の努力ほど、時間とエネルギーを無駄にするものはない。一度だけプロに体組成を計測してもらい、今の取り組みが正しい方向かを確認しよう。方向が合っていれば加速する。合っていなければ、今すぐ修正できる。',
      BND:'体型を特別気にするわけでもなく、淡々と体を動かしている。実はこれが最も長続きするパターンだ。「変わらなければ」という強迫観念がない分、習慣として定着しやすい。今の取り組みに一つだけ意識を足してみよう。食事のタンパク質を少し増やすか、有酸素と筋トレを組み合わせるか。小さな調整が、今の習慣を大きな変化に変える。',
      BCV:'体型が気になっているのに、なかなか動けない。その焦りと後ろめたさを、毎朝感じている人は多い。でも一気に変えようとするから動けないのだ。食事・運動・睡眠のうち、今週一つだけ変えると決める。歩数を1000歩増やすだけでもいい。最初の一点を変えると、不思議なことに残りも動き始める。',
      BCQ:'以前トレーニングや食事制限を始めたが、続かなかった経験がある。続かなかったのは意志が弱かったからではない。仕組みが自分に合っていなかっただけだ。次は「何をやるか」より「どう続けるか」を先に設計する。週に何回、どこで、何分やるかを具体的に決める。続けやすい環境を作ることが、結果への最短ルートだ。',
      BCK:'体型が気になって自分なりに取り組んでいる。その意欲は本物で、それ自体が大きな強みだ。ただ、自己流の努力は方向がズレていると、頑張るほど遠回りになる。一度プロに現状を見てもらい、今の取り組みに修正が必要かを確認しよう。フォームが正しければ効果は2倍になり、食事が合っていれば停滞が解消する。努力を正しい場所に向けるだけで、結果が変わる。',
      BCL:'以前は体づくりに取り組んでいた。今は何かのきっかけで止まっている。でも一度動けた体は、また動ける記憶を持っている。ゼロから始めるのとは違う。まず今週、以前より少しだけ動いてみる。かつての自分を取り戻す必要はない。今の自分のペースで再起動するだけでいい。再開すること自体が、最大の一手だ。',
      BCD:'体型改善に向けて今まさに動いている。これは外見の変化の中でも、最も時間と努力を要する軸だ。だからこそ、今動いているあなたには大きなアドバンテージがある。焦らず、でも止まらず続けること。変化は線形ではなく、ある日突然「あれ、変わってる」と気づく形でやってくる。記録をつけると、その変化の地図が見える。',
      BAV:'自分でトレーニングや食事管理をしている。その自立心は強みだ。でもパーソナルトレーナーやピラティスインストラクターなど、プロに頼ったことがない。独学には限界があり、特に「自分の体に合ったやり方」を見つけるのが難しい。一度だけプロに相談してみよう。今の取り組みの何が正しくて、何が足りないかが明確になる。その知見を手に入れれば、以降は自分でも精度高く動ける。',
      BAQ:'自分でトレーニングしていたが、一度やめた。やめた理由が何かあるはずだ。それを一つだけ特定する。時間なのか、モチベーションなのか、結果が見えなかったのか。原因がわかれば対策が立つ。再開するのに「以前と同じレベル」まで戻す必要はない。まず週1回、10分だけ動くことから始めよう。',
      BAK:'自分流で体を鍛えている。継続できているのは本当の強みだ。でも独学には必ず盲点がある。フォームの問題は自分では気づきにくく、積み重なると故障につながる。栄養の偏りは、頑張っているのに体が変わらない原因になる。一度プロに「今やっていること」を見せるだけで、効果が劇的に変わることがある。',
      BAL:'以前は自分でしっかり体を管理していた。今は生活の変化などで一時停止している。でも体の記憶は消えない。再開すれば、以前より速く取り戻せる。まず今の自分にできる最小の一歩を一つ決めよう。フルスペックで再開しなくていい。小さく動き始めることが、再起動の鍵だ。',
      BAD:'自分でトレーニングや食事管理をしながら、今まさに動いている。この状態は最も伸びやすい時期だ。変化を数値と写真で記録しよう。記録は「続ける理由」になり、停滞した時の指針にもなる。次のフェーズは、外見の変化を人との場で試すことだ。変わった体を、実際の出会いで確かめていこう。',
      BPQ:'パーソナルトレーナーやジムに通っていたが今は辞めた。その経験は確実に体と知識に残っている。辞めた理由が費用なのか時間なのか相性なのかで、次の一手が変わる。もし再開を考えるなら、オンラインや短期集中など、以前より費用・時間を抑えた形も選択肢だ。あの頃の体を取り戻すのは、ゼロから始めるより確実に速い。',
      BPK:'トレーナーに頼りながら、その外でも自己流な部分がある。プロとの時間を最大限に活かしきれていない可能性がある。疑問はその場で全部聞く。食事についても、日常の動きについても、遠慮せずに相談しよう。プロへの投資は、対話の質で結果が変わる。もし今のトレーナーとの相性が合わないなら、変えることも選択肢だ。',
      BPL:'プロのサポートで体づくりをしていたが、今は止まっている。その時に得た知識と体の変化は、確かに残っている。今の生活の中で再開できる形を探してみよう。週一のジムより、毎日の歩数管理の方が合っていることもある。大事なのは完全な再開より、何かしら続くことだ。',
      BPD:'プロのサポートを受けながら、今まさに体と向き合っている。外見の変化の中で最も時間がかかるこの軸を、プロとともに動いている。これ以上ない状態だ。次のフェーズは、変わった体を外の世界で試すことだ。服を変え、写真を撮り、人と会う場に出ていこう。変わった自分を、現実の場で体感する番だ。',
      // ── E軸（眉） ──
      ENV:'眉を整えたことがほとんどない。それはある意味、一番大きな変化の余白を持っているということだ。眉は顔の印象を最も短時間・低コストで変えられる部位で、整形なしで「別人のように変わった」という感覚を得やすい軸だ。1回のサロンで30分、数千円で別人のような変化を体感できる。試す価値が最も高い軸の一つだと覚えておいてほしい。',
      ENK:'眉について自分なりにケアしているが、客観的に評価されたことがない。眉は顔の中で最も「他人の目に映る印象」と「本人の認識」がズレやすい部位だ。自分の鏡の中の眉と、他人から見た眉は、驚くほど違うことがある。一度だけプロに見てもらい、正しい形の基準を知ろう。その基準が手に入れば、その後のセルフケアが変わる。',
      END:'眉を気にせず、自分のペースで手入れしている。習慣化できているのは本当の強みだ。ただ、自己流のケアは少しずつズレが生じる。一度プロに基準の形を作ってもらうと、その後のセルフの精度が大きく上がる。眉は「作ってもらう」より「自分で維持できる形を学ぶ」という視点でサロンを使うと、長期的に一番コスパが高い。',
      ECV:'眉が気になっている。でも眉サロンへのハードルを感じている。実は眉サロンは施術時間30分以下、費用も数千円からと、外見ケアの中で最も手軽に入れる施術の一つだ。一度だけ試してみよう。一回で正しい形の基準ができると、その後のセルフケアが劇的に変わる。まずは予約だけ入れるところから始めてみよう。',
      ECQ:'眉サロンか自己処理を一度したが、何かのきっかけで続かなくなった。眉は「正しい形を一度作ってしまえば、あとは維持するだけ」という特徴がある。もし以前の仕上がりに満足していたなら、同じサロンへ戻るのが最速だ。不満があったなら、別のサロンを試してみよう。「続かなかった」というのは、合う形をまだ見つけていないサインかもしれない。',
      ECK:'眉が気になって自分で整えている。その継続力は評価できる。でもセルフ眉は、角度・太さ・左右差のズレが少しずつ積み重なりやすい。気づかないうちに「なんか顔がおかしい」という状態になっていることがある。1回サロンで正しい形を作ってもらうと、明確な基準が生まれる。その基準に合わせてセルフケアをするだけで、精度が大きく上がる。',
      ECL:'以前は眉を整えていたが今は放置している。眉は顔の印象の中で最も「整えるとすぐ変わる、放置するとすぐ崩れる」部位だ。再開のハードルは低い。眉ペンシル一本で今日から始められる。以前整えていた経験があるから、基準の形は記憶の中に残っているはずだ。少しの手入れで、大きく印象が戻る。',
      ECD:'眉ケアに今まさに取り組んでいる。外見の変化の中で最も即効性が高い軸を動かしている。定期的なサロンと自己管理を組み合わせると、印象の安定感が増す。次のステップは、整った眉を写真や動画で記録することだ。変化を客観的に見ると、何が効いていて何が足りないかがわかる。',
      EAV:'自分で眉を整えているがサロンに行ったことがない。自己管理できているのは強みだ。でも一度プロに形を作ってもらうと、その後が劇的に変わる。プロが作る眉と自分が作る眉の差を知ることで、「正解の形」が手に入る。その基準があれば、その後はセルフで維持できる。1回の投資が、その後の全部を変える。',
      EAQ:'自分で眉を整えていたが一度やめた。眉は放置すると印象への影響が大きく出る部位だ。再開のハードルは低い。眉ペンシルを一本出してみるところから始めよう。以前やっていた経験があるから、ゼロから覚え直す必要はない。手が覚えている。まず一日だけやってみると、また動き始める。',
      EAK:'自分流で眉を整えている。毎日の手入れを続けているのは本物の強みだ。でも鏡では気づきにくい左右差や、骨格・顔型とのズレが生じやすい。自分では正しいと思っているが、客観的に見るとズレているということが眉では特に起きやすい。1回サロンで正解の形を学ぶと、今の努力が正しい方向に向かう。その後のセルフの精度が一気に上がる。',
      EAL:'以前はしっかり眉ケアをしていた。今は何かのきっかけで放置している。眉は顔の印象を最も大きく左右する部位だ。放置が続くほど、全体的な印象が崩れていく。再開は難しくない。まず今日、眉を少しだけ整えるだけでいい。以前の経験があるから、すぐに取り戻せる。少しの手入れが、大きな印象の変化を生む。',
      EAD:'自分で眉を整えながら、今まさに力を入れている。この状態で次のステップは、プロの技術で「完璧な土台」を一度作ることだ。自己管理の上にプロの基準を乗せると、仕上がりの精度が一段上がる。また、整った眉の印象変化を写真で記録すると、何が最も効いているかが見えてくる。その記録が、さらなる改善の地図になる。',
      EPQ:'眉サロンに定期的に通っていたが今は辞めた。その時に作られた形が、今の眉の基準になっているはずだ。再開すれば、以前より短い時間でベストな状態に戻れる。辞めた理由が費用なのか時間なのかによって、次の選択肢が変わる。もしコストが理由なら、頻度を下げた形での再開も選択肢だ。',
      EPK:'眉サロンに通いながらも、仕上がりに完全に満足できていない感覚がある人もいる。それは担当者への遠慮で、本当の希望を伝えられていないことが多い。次回は具体的な希望を写真とともに持参しよう。「もう少し太く」「もう少し自然に」といった一言が、仕上がりを大きく変える。プロは希望を聞くために存在している。',
      EPL:'プロレベルの眉ケアの経験がある。今は何かの理由で止まっている。眉は定期的なメンテナンスがないと、形が崩れていく部位だ。まず再開のタイミングを一つ決めよう。「来月中に一度だけ行く」と決めるだけでいい。その一回で、印象はすぐに戻る。経験があるから、取り戻すのは早い。',
      EPD:'眉サロンに通いながら、今まさにケアを続けている。外見の中で最も即効性の高い軸を、プロとともに磨いている。この状態で次に目を向けるべきは、整った眉を「全体の印象設計」の一部として活かすことだ。アイメイク・リップ・チークの設計を意識すると、眉と顔全体の調和が整い、印象がさらに引き上がる。',
      // ── F軸（服装・ファッション） ──
      FNV:'服装をほとんど気にしたことがない。でも実は、外見の変化の中で最も「今日から変えられる」軸だ。体型や肌は変わるまでに時間がかかる。でも服は今すぐ変えられる。しかも体型より「服の選び方」の方が、印象に与える影響は大きい。まず一着だけ意識して選んでみよう。その一着が、見た目への意識を変える最初のきっかけになる。',
      FNK:'服装について自分なりには選んでいるが、客観的なフィードバックを受けたことがない。ファッションは本人が気に入っているスタイルと、他者から見た印象が大きくズレることがある。一度だけ信頼できる人やショップスタッフに「率直に見てほしい」と頼んでみよう。そのフィードバックが、今まで見えなかった自分の地図になる。',
      FND:'服を気にしすぎず、自分なりのスタイルで選んでいる。それが安定感ある印象につながっていることもある。一度クローゼットを棚卸しして、本当に着ているものと着ていないものを分けてみよう。多くの場合、少ない枚数の服を着回せるようにした方が、印象の統一感と清潔感が上がる。整えることで、今の自分のスタイルがさらに洗練される。',
      FCV:'服装が気になっている。何を買えばいいか、どこで買えばいいかわからない状態だ。まず「今持っている服を全部出して並べる」ことから始めよう。持っているものを知ることが、最初の地図になる。買い足す前に、捨てる。それだけでも印象は変わる。足りないものは、捨てた後に初めて見えてくる。',
      FCQ:'服装を改善しようとして、一度は動いたが続かなかった。ファッションは「一気に変えよう」とすると失敗しやすい。何十着も買い替えようとすると、費用も判断力も消耗する。次は「捨てる」ことだけを先にする。クローゼットの中のノイズが減ると、残ったものが活きてくる。変化は引き算から始まる。',
      FCK:'服装が気になって自分なりに試行錯誤している。その行動力は強みだ。でもルールなしに選び続けると、何を着てもしっくりこない状態が続く。色・サイズ・素材の3つだけにルールを作ると、選びやすく着回しやすくなる。特にサイズ感は、高い服より安い服でも、ぴったり合う方が圧倒的に印象がよくなる。',
      FCL:'以前は服装に気を使っていた。今は忙しさや気分の変化で、惰性で着ている。その落差を感じているなら、まず一着だけ「今の自分に合うもの」を意識して選んでみよう。その一着が鎮になり、他の服の使い方が変わってくる。全部変える必要はない。一点突破で、全体が動き出す。',
      FCD:'服装改善に今まさに取り組んでいる。外見の中で最も即日変化が出る軸を動かしている。この時期に大事なのは、買い足すより「何を手放すか」を先に決めることだ。クローゼットにノイズがあると、せっかくの新しい服も活きない。整理してから足すと、全体の精度が一気に上がる。',
      FAV:'自分なりのコーデをしているがパーソナルスタイリストに頼ったことがない。自分で判断できるのは強みだが、自己流には「自分では気づかないパターン」がある。一度だけパーソナルスタイリングを受けてみよう。自分に合う色・形・素材の「型」がわかる。その型さえ手に入れば、以降は自分で判断する精度が大きく上がる。',
      FAQ:'自分でコーデを工夫していたが一度やめた。おそらくその時なりの理由があったはずだ。服への意識は一度下がっても、再び上げるのは難しくない。まず一着だけ、今の自分の気分や生活に合うものを選んでみよう。ゼロから始め直す必要はない。以前のセンスは消えていない。少し意識を向けるだけで戻れる。',
      FAK:'自分流のスタイルがある。それは本物の資産だ。個性は清潔感と組み合わさると、記憶に残る印象になる。でも独自スタイルは、外の目では違和感に見えることもある。率直なフィードバックを一度もらうと、何を守って何を調整すべきかが見える。個性を消すのではなく、磨くために外の視点を使う。',
      FAL:'以前はしっかりファッションを楽しんでいた。今は何かのきっかけで惰性になっている。クローゼットを一度整理するだけで、また楽しめる状態に戻れることが多い。今は着ていない服を手放して、本当に好きなものだけ残す。少ない服でもっとよく見える状態を作ると、選ぶ楽しさが戻ってくる。',
      FAD:'自分でスタイリングしながら今まさに力を入れている。この段階で一番大事なのは「絞ること」だ。アイテムを増やすより、定番の核になるものを固めると、毎日の選択が速くなり、全体の統一感が上がる。次のフェーズは、整ったスタイルを実際の場で試すことだ。写真で記録すると、何が最も効いているかが見えてくる。',
      FPQ:'パーソナルスタイリストに頼ったり、本格的に服装を整えていた時期があった。今はその時より意識が下がっている。でもその時に学んだ「自分の型」は残っているはずだ。再開する時は、以前より速く洗練された状態に戻れる。辞めた理由を振り返り、今の生活に合った形で再び始めてみよう。',
      FPK:'プロのサポートを受けながらも、日常のコーデに自己流な部分が残っている。プロの提案を「週に何回着るか」まで落とし込めているかが問われる。次回のセッションで、実際の生活シーンに合わせた着回しを相談してみよう。プロへの投資は、日常で使い切れてはじめて回収できる。',
      FPL:'パーソナルスタイリングを受けた経験がある。今は止まっている。その時に作った自分の「型」は消えていない。今のクローゼットをその型に基づいて見直すだけで、投資の回収ができる。再開を考えるなら、シーズンに一度の頻度でも十分効果がある。季節ごとに一度整えるだけで、印象は大きく変わる。',
      FPD:'プロのサポートを受けながら、今まさにファッションを磨いている。この状態で意識すべきは、整ったスタイルが実際の場でどう機能しているかを確かめることだ。デートや仕事の場、写真の中の自分を記録してみよう。投資が結果に出ているかを検証し、次の方向を決める材料にする。',
      // ── H軸（髪） ──
      HNV:'髪型をほとんど気にしたことがない。でも髪は第一印象の最大30%を占めるとも言われる部位だ。「なんかあの人、雰囲気いいな」と感じる時、多くの場合髪型が影響している。一度だけ美容師に「似合う形にしてください」と任せてみよう。その一回で、自分に合う形の基準ができる。そこから全部が変わり始める。',
      HNK:'髪について自分なりに整えているが、プロの目から見てもらったことがない。髪型は自分では判断しにくい軸で、骨格・顔型・生え際によって似合う形が大きく変わる。次の美容院で「今の髪型についてどう思いますか」と一言聞いてみよう。プロの率直な意見が、これまで気づかなかった地図になる。',
      HND:'髪を気にしすぎず、自分のペースで整えている。定期的に美容院に行く習慣があるなら、それ自体は強みだ。次は「どの美容師に切ってもらうか」を一度こだわってみよう。同じサロンでも担当者によって仕上がりが変わる。自分の骨格や好みを理解してくれる美容師を見つけると、毎回の仕上がりが変わる。',
      HCV:'髪が気になっている。でもどの美容院に行けばいいか、どう伝えればいいかわからない。まず一つだけ美容院を探して予約を入れてみよう。予約の前に「メンズ・骨格に合わせた提案が得意なサロン」などで検索すると、自分に合う場所が見つかりやすい。行けば必ず何かが変わる。その変化が、次の一手の地図になる。',
      HCQ:'以前カットやスタイリングを変えようとしたが、続かなかった経験がある。髪は定期的なメンテナンスがないと、形が崩れていく軸だ。一度行って終わりではなく、次の予約をその場で入れる習慣を作ることが大事だ。2〜3ヶ月に一度のペースを先にスケジューリングする。仕組みができれば、自然と続く。',
      HCK:'髪が気になって、スタイリング剤を試したり自分なりに工夫している。その行動力は強みだ。でも根本のカットの形が合っていないと、どんなにスタイリングしても補いきれない。次の美容院でカット自体を相談してみよう。「もっとスタイリングしやすい形に」と伝えるだけで、毎日の5分が楽になる。',
      HCL:'以前は髪型にこだわっていた。今は流れで近くの美容院に行っている。髪型は「誰が切るか」で大きく変わる。今の美容院に不満があるなら、一度別のサロンを試してみよう。新しい美容師に「イメージ写真」を見せるだけで、同じ長さでも別人のように変わることがある。一度の変化が、また意識を上げるきっかけになる。',
      HCD:'髪型改善に今まさに取り組んでいる。印象の変化が最も早く出る軸だ。ここを動かすことで、全体の印象が引き上げられる。次のステップは「形」だけでなく「質感」を整えることだ。ホームケアのシャンプーやトリートメントを見直すと、美容院から帰った後の状態が長く続く。仕上がりの持ちが変わると、印象の安定感が増す。',
      HAV:'自分でスタイリングはしているが、美容師に「あなたに似合う形」をゼロから作ってもらったことがない。スタイリング技術があるからこそ、一度プロに形から任せてみると効果が大きい。骨格や顔型に合った「土台の形」が手に入ると、自己スタイリングの精度が一段上がる。次の美容院で「骨格に合わせて形から変えてほしい」と伝えてみよう。',
      HAQ:'自分で髪をケアしていたが一度やめた。髪は放置すると印象への影響が大きく出てくる。再開は難しくない。まず次の美容院の予約だけ入れてみよう。それだけで動き出せる。以前やっていた経験があるから、ゼロから始める必要はない。一度行けば、また意識が戻ってくる。',
      HAK:'自分流のスタイリングを続けている。毎日こだわっているのは本物の強みだ。でも自分の「好みのスタイル」と、他人から見て「印象がいいスタイル」は違うことがある。一度だけプロに任せてみよう。自分では気づかなかった骨格との相性や、似合う形の基準が手に入る。その基準が、今の努力を正しい方向に向ける。',
      HAL:'以前はしっかり髪をケアしていた。今は少し放置している。髪は放置すると、全体の印象が少しずつ崩れていく部位だ。再開は早い。まず「次の美容院の予約」を一つ入れるだけでいい。以前の経験があるから、一回行けばすぐに取り戻せる。その一回が、また意識を上げるきっかけになる。',
      HAD:'自分でケアしながら、今まさに髪に力を入れている。この状態で最も効果的な次の一手は、担当美容師を固定することだ。同じ美容師に継続して切ってもらうと、自分の髪の性質や好みを理解してくれる。その積み重ねが、毎回の仕上がりの質を上げていく。「次もお願いします」の一言が、変化を加速させる。',
      HPQ:'定期的にプロの美容師に通っていたが今は辞めた。その時に作られた形や、担当美容師からのアドバイスは、記憶の中に残っているはずだ。辞めた理由によって次の選択が変わる。担当者が変わったなら新しい美容師を探す。費用が理由なら頻度を落として継続する。どちらにせよ、一回だけ再開してみると、以前の状態に戻るのは早い。',
      HPK:'美容師に通いながらも、希望通りの仕上がりになりきれていない感覚がある人もいる。美容師との対話が仕上がりを決める。次回は「こうなりたい」というイメージを写真で持参しよう。「もう少しここを短く」「毎朝スタイリングしやすくしてほしい」という具体的な言葉が、プロの判断を助ける。投資を結果に変えるのは、コミュニケーションの質だ。',
      HPL:'プロレベルの髪ケアを受けていた経験がある。今は止まっている。髪は放置すると印象がすぐ変わる。まず再開のタイミングを一つ決めよう。以前通っていたサロンへ戻るか、新しいサロンを試すか、どちらでもいい。一回だけ行けば、状態はすぐに戻る。その一回を予約するだけでいい。',
      HPD:'プロの美容師とともに、今まさに髪を磨いている。外見の中で最も印象に直結する軸をプロとともに動かしている。次のフェーズで意識すべきは「持ち」だ。美容院の仕上がりを長く維持するために、ホームケアのシャンプー・トリートメント・スタイリング剤を整えよう。プロの施術と日常のケアが連動すると、印象の安定感が変わる。',
      // ── S軸（肌） ──
      SNV:'肌ケアをほとんどしたことがない。でも肌は近距離での印象を最も左右する軸だ。清潔感の土台であり、ここを整えると他の全ての外見が底上げされる。洗顔と保湿の2ステップだけ始めよう。正しい洗顔で油分汚れを落とし、保湿でバリアを作る。この2つだけで、1〜2週間で肌の質感が変わり始める。',
      SNK:'肌について自分なりにはケアしているが、客観的に評価されたことがない。肌は「何もしていない状態が普通」だと思っていると、改善すべき問題に気づけない。一度だけ皮膚科か化粧品カウンターで肌診断を受けてみよう。今の肌タイプと、合っているケアと合っていないケアが明確になる。その情報が、ルーティンを正しくする地図になる。',
      SND:'肌を特別意識せず、自分なりにケアを続けている。継続できているのは最大の強みだ。次は成分と順番を少し意識してみよう。洗顔後の肌に、何を最初に塗るかで浸透率が変わる。今使っているアイテムの成分を一つ確認するだけで、同じ習慣がより高い結果を生む。',
      SCV:'肌が気になっている。でも何から始めればいいか、何を買えばいいかわからない。まず洗顔を見直すことから始めよう。肌トラブルの多くは「洗いすぎ」か「洗えていない」のどちらかが原因だ。泡立てた洗顔料で優しく洗い、ぬるま湯で流すだけ。それだけで一週間で変化が出ることがある。商品を買い足す前に、今の洗顔を正すのが最速だ。',
      SCQ:'肌ケアを一度始めたが続かなかった。続かなかった原因のほとんどは「ステップが多すぎた」か「効果が見えなかった」かのどちらかだ。次は商品を2つだけに絞る。洗顔料と保湿クリームの2つ。それだけで十分だ。続けやすい仕組みにすることが、全ての前提になる。',
      SCK:'肌が気になって色々と試している。その行動力は本物の強みだ。でも自己流で商品を重ねると、かえって肌荒れや迷走を引き起こしやすい。一度今のルーティンを全部書き出して、皮膚科か信頼できるカウンセラーに見せてみよう。余計なものが整理され、本当に必要なものだけが残る。それがあなたの肌に合ったルーティンだ。',
      SCL:'以前は肌ケアをしていた。今は何かのきっかけで惰性になっている。肌は継続が全てだ。一度止まった習慣を再開するのに、全部を完璧にやり直す必要はない。まず今日、洗顔と保湿だけ丁寧にやってみよう。その小さな再開が、ルーティンを取り戻すきっかけになる。',
      SCD:'肌改善に今まさに取り組んでいる。肌は積み重ねが結果に出る軸だ。3〜6ヶ月続けて初めて、本当の変化が見えてくる。焦らず、一つのルーティンを90日続けることを目標にしよう。途中で商品を変えたくなる衝動に負けないことが、この時期の最大の戦略だ。',
      SAV:'自分でスキンケアはしているがエステや皮膚科に頼ったことがない。自分で続けられているのは本当の強みだ。でも独学には見えない限界がある。一度だけプロに見てもらうと、今のケアの何が正解で、何が間違っているかが明確になる。その診断を受けた後でも、日常のセルフケアは続けられる。プロの知見をセルフに取り込む使い方が最も効果的だ。',
      SAQ:'自分でスキンケアしていたが一度やめた。肌は放置すると、清潔感の土台が少しずつ崩れていく。でも再開は難しくない。まず洗顔だけ再開しよう。それだけでいい。保湿は翌日からでもいい。一番簡単なことから再起動すると、習慣は自然と戻ってくる。',
      SAK:'自分流のスキンケアルーティンがある。毎日続けているのは本物の強みだ。次の一歩は、今使っているアイテムの成分を確認することだ。自分の肌タイプに合っているか、重ねる順番は正しいかを一度整理する。合っていれば加速する。合っていなければ修正できる。成分を知ることが、独学の限界を突破する鍵だ。',
      SAL:'以前はスキンケアをしっかりやっていた。今は少し怠けている。肌は放置すると徐々に変化するが、再開すれば比較的早く戻る。まず一番簡単なステップから戻ろう。洗顔か保湿か、どちらか一つだけ今日丁寧にやってみよう。完璧なルーティンを再開する必要はない。一つの習慣が戻れば、他も引き連れて戻ってくる。',
      SAD:'自分でスキンケアしながら今まさに力を入れている。この時期に気をつけるべきことは「引き算」だ。「もっと良くなりたい」という気持ちから商品を増やすと、肌への負担と迷走が起きやすい。今のルーティンで何が効いていて何が不要かを整理しよう。効果が出ているものを深め、不要なものを手放すことが近道だ。',
      SPQ:'エステや皮膚科に通っていたが辞めた。その時に改善されたものは、ホームケアで維持することができる。辞めた後でも、プロから学んだ知識は残っているはずだ。今のホームケアを丁寧に続けることで、その成果を守れる。再開を考えるなら、月一回の頻度でも継続できる施術を選ぶと負担が少ない。',
      SPK:'プロのケアを受けながらも、期待していた変化を感じられていない部分がある。それは担当者に伝えるべき情報だ。何が改善されていて、何が変わっていないかを言語化して、次回のセッションで共有しよう。プロは指摘されて初めて対応できることがある。投資を結果に変えるのは、コミュニケーションだ。',
      SPL:'プロレベルの肌ケアを受けていた経験がある。今は止まっている。その経験で得た知識と肌の変化は消えない。今のホームケアを丁寧に続けることが、その成果を維持する最善策だ。もし再開を考えるなら、定期的な施術より皮膚科での診断相談から始めるのがコスパがいい。',
      SPD:'プロのサポートを受けながら肌を磨いている。清潔感の土台となる肌をプロとともに整えている。次のフェーズで意識すべきは生活習慣との連動だ。睡眠・食事・ストレス管理が肌の状態に直結する。プロの施術と生活習慣が両輪で揃うと、印象の底上げが加速する。',
      // ── T軸（歯・笑顔） ──
      TNV:'歯のケアをほとんど気にしたことがない。でも笑顔と口元は第一印象の核心だ。特に近距離での会話や写真撮影の場面で、口元の印象は人の記憶に残りやすい。まず歯科検診に行くだけでいい。今の口元の現状を客観的に知ることから始まる。問題があれば対処でき、問題がなければその安心が自信につながる。',
      TNK:'歯について自分では気になっていないが、客観的なフィードバックを受けたことがない。口元は本人が思っている以上に、他人の目には映っている部位だ。一度だけ歯科医や歯科衛生士に見てもらおう。「特に気になることはないですか」と聞くだけでいい。プロの目で見て初めてわかる問題と、逆に問題がないという安心を手に入れよう。',
      TND:'歯を気にしすぎず、自分なりにケアしている。基本的な習慣があるのは強みだ。次のステップとして、フロスかホワイトニングを一つ加えてみよう。フロスは歯と歯の間の汚れを取り、ホワイトニングは笑顔の明るさを引き上げる。どちらか一つを今の習慣に足すだけで、印象が静かに底上げされる。',
      TCV:'歯や笑顔が気になっている。でも歯科は費用や時間のハードルを感じている。まず近くの歯科でクリーニングだけ予約してみよう。保険が効くクリーニングは数千円以内で、30〜45分で終わる。それだけで口元の清潔感が変わり、自分の笑顔への自信が少し上がる。「治療」ではなく「予防とケア」から始めると、ハードルが下がる。',
      TCQ:'歯のケアや矯正を一度考えたが、踏み出せなかったか、始めかけて止まった。歯は「時間がかかるから後で」と思っていると、ずっと後回しになる軸だ。でも一度始めると、その変化は一生続く。まず小さく、歯科クリーニングだけ予約しよう。そこから次のステップが見えてくる。最初の一歩が最も難しく、最も大事だ。',
      TCK:'歯が気になって自分なりにケアしている。毎日の歯磨きへの意識は本物の強みだ。でも自己流には届かない部分がある。特に歯と歯の間や歯茎の際は、どんなに丁寧に磨いても自己ケアでは取れない汚れが残る。プロのクリーニングを一度受けると、自己ケアで届く場所と届かない場所の違いがわかる。その理解が、日々のケアの質を上げる。',
      TCL:'以前は歯のケアをしていた。今は惰性になっている。口元の清潔感は、印象の中で「気づかれにくいが確実に影響する」要素だ。まずフロスを一本だけ買ってみよう。洗面台に置いておくだけで使う確率が上がる。小さな再開が、習慣を取り戻すきっかけになる。',
      TCD:'歯・笑顔の改善に今まさに取り組んでいる。笑顔が変わると、人との距離感が変わる。自分から笑顔を見せやすくなり、相手の反応も変わる。その変化を実感できる場に積極的に出てみよう。整えた笑顔は、使うことで価値が出る。',
      TAV:'自分で歯磨きケアはしているがプロの施術を受けたことがない。自己ケアの継続は強みだ。でも一度だけ歯科クリーニングを受けてみよう。自己ケアでは取れない汚れが取れ、口元の清潔感が一段上がる。また、プロに「今の磨き方は正しいですか」と聞くだけで、毎日のケアの質が上がる。',
      TAQ:'自分でケアしていたが一度やめた。口内の健康は、印象だけでなく体の健康全体に影響する。再開のハードルは低い。まず歯磨きの時間を30秒だけ延ばしてみよう。今日から始められる、最小の再開だ。一度の丁寧な歯磨きが、また意識を上げるきっかけになる。',
      TAK:'自分流の口元ケアをしている。毎日続けているのは強みだ。でも正しいブラッシング法ができているかは確認が必要だ。間違った磨き方は、歯の表面を傷つけたり、歯茎を傷める可能性がある。一度歯科衛生士に「今の磨き方を見てほしい」と頼んでみよう。正しい磨き方が手に入ると、同じ時間で結果が変わる。',
      TAL:'以前は歯のケアをしっかりやっていた。今は基本的な歯磨きだけになっている。その落差を少し意識するだけで戻れる。週一回のフロスから再開しよう。小さな習慣を一つ足すことが、意識全体を上げるきっかけになる。口元の清潔感は、印象に対する影響が意外に大きい。',
      TAD:'自分でケアしながら、今まさに歯・笑顔に力を入れている。この状態を維持するためには、定期的な歯科メンテナンスを仕組み化することが大事だ。3ヶ月に一度、歯科クリーニングの予約を先に入れてしまおう。自己ケアとプロの施術が合わさると、口元の清潔感が安定して維持される。',
      TPQ:'歯科・ホワイトニング・矯正などのプロ施術を経験したが今は通っていない。その時に得た変化は本物だ。ホームケアを丁寧に続けることで、その状態を維持できる。再開を考えるなら、維持のためのメンテナンスクリーニングだけに絞って通う形でもいい。費用と時間を抑えながら、プロとのつながりを保てる。',
      TPK:'プロのケアを受けながらも、期待していた変化が出にくい感覚がある人もいる。担当医に率直に伝えることが大事だ。「どの程度まで改善できますか」「今の進み具合はどうですか」という具体的な質問を次回持参しよう。プロは正直に聞かれると正直に答えられる。投資を結果に変えるのは、対話の質だ。',
      TPL:'プロレベルの歯・口元ケアの経験がある。今は止まっている。笑顔は外見の中で最も「場の空気」を変える要素だ。整った口元の笑顔は、自分の行動量にも影響する。再開のタイミングを一つ決めよう。以前の担当医に連絡するだけでいい。経験があるから、戻るのは早い。',
      TPD:'プロのサポートを受けながら歯・笑顔を磨いている。笑顔の自信は、実際の行動量を変える。整えた笑顔を積極的に使っていこう。デートや人との出会い、写真など、笑顔が映える場面に自分を置くことで、投資の価値が現実になる。',
      // ── W軸（爪・手元） ──
      WNV:'爪や手元を気にしたことがない。でも手元は、相手との距離が近い場面で確実に目に入る部位だ。食事・飲み物を渡す・書き物をする場面で、爪の清潔感は相手の記憶に残る。まず爪を清潔に短く整えるだけでいい。それだけで、近距離での印象が静かに変わる。',
      WNK:'手元について自分なりにはしているが、客観的に気にしたことがない。爪の長さ・形・清潔感は、相手の目には意外と見えている。特にビジネスや恋愛において、手元は「細かいところまで気が回る人かどうか」の判断材料になる。一度だけネイルケアサロンでベースケアを受けてみよう。プロが整えた手元の印象の差を体感できる。',
      WND:'爪や手元を気にしすぎず、自分なりに整えている。その習慣は静かに信頼感を作っている。次のステップとして、甘皮処理かネイルオイルを一つ加えてみよう。甘皮を整えると爪の見た目がすっきりし、ネイルオイルを塗ると指先の乾燥が防げる。小さな一手が、印象の質を一段引き上げる。',
      WCV:'爪や手元が気になっている。でも何から始めればいいかわからない。まずネイルファイルで爪の形を整えるだけでいい。100円ショップでも手に入る道具で、数分あれば形が変わる。最初の変化はそれだけで十分だ。その小さな変化が、手元への意識を上げる最初のきっかけになる。',
      WCQ:'以前ネイルケアを始めたが続かなかった。続かなかった理由は、ほとんどの場合「道具が手の届かない場所にあった」からだ。洗面台かデスクの上に、爪やすり一本だけ置いてみよう。目に入る場所にあるだけで使う確率が変わる。続く仕組みは環境を変えることで作れる。',
      WCK:'爪が気になって自分なりにケアしている。その行動力は強みだ。でも自己流には限界がある。特に甘皮の処理や爪の形の整え方は、間違えると見た目が逆に悪くなることもある。一度ネイルケアサロンでベースを作ってもらうと、正しい形の基準が手に入る。その基準を持てば、その後のセルフケアが一気に楽になる。',
      WCL:'以前は爪や手元を気にしていた。今は流れでほったらかしになっている。手元は近距離での印象を静かに左右する部位だ。再開は難しくない。まず爪を短く切って形を整えるだけでいい。それだけで手元の印象がすぐに戻る。',
      WCD:'爪・手元の改善に今まさに取り組んでいる。細部へのこだわりが全体の質感を決める。この段階で大事なのは、定期的なケアを仕組みにすることだ。月一回のネイルケアサロンのメンテナンスをスケジューリングしてしまおう。仕組みができれば、状態が安定して維持される。',
      WAV:'自分で爪を整えているがネイルサロンに行ったことがない。自己ケアできているのは強みだ。でも一度だけサロンでベースケアを受けてみよう。プロが整えた手元と、自分で整えた手元の差を体感できる。その差がわかると、セルフケアの何を改善すればいいかが明確になる。一回の経験が、その後の全部を変える。',
      WAQ:'自分でケアしていたが一度やめた。手元はすぐ乱れるが、すぐ戻せる軸でもある。爪切りとヤスリだけで今日から再起動できる。やめた理由が何であれ、再開のハードルは外見ケアの中で最も低い。まず爪を一本だけ整えてみよう。それだけで、また意識が戻ってくる。',
      WAK:'自分流で爪・手元を整えている。毎日気にしているのは本物の強みだ。でも自己流には、知らないうちに積み重なるズレがある。一度プロの仕上がりを体感してみよう。「正解の手元」の基準が手に入ると、セルフケアの目標が明確になる。その基準があるだけで、毎日のケアの精度が上がる。',
      WAL:'以前はしっかり爪・手元を整えていた。今は少し放置している。手元は外見ケアの中で、再開コストが最も低い軸だ。爪切り一本で今日から戻れる。以前の経験があるから、丁寧にやる感覚も残っているはずだ。まず一度だけ、丁寧に整えてみよう。その感覚が、また意識を引き上げる。',
      WAD:'自分でケアしながら、今まさに手元に力を入れている。次のステップはネイルオイルでの保湿を習慣化することだ。指先の乾燥は、どんなに形を整えても印象を下げる。寝る前にネイルオイルを一滴塗るだけで、翌朝の指先の印象が変わる。細部へのこだわりが、全体の質感を底上げする。',
      WPQ:'ネイルサロンに通っていたが辞めた。その時の手元の変化は本物だった。再開を考えるなら、カラーやアートより「ベースケアとメンテナンスだけ」に絞った施術から始めてもいい。費用も時間も半分で、手元の清潔感と整った形は維持できる。コストを下げて継続できる形を探してみよう。',
      WPK:'ネイルサロンに通いながらも、毎回の仕上がりに完全に満足できていない感覚がある人もいる。担当者への遠慮が、希望を伝えることを妨げていることが多い。次回は「もう少しここをこうしてほしい」という一言だけ言ってみよう。プロは希望を聞くために存在している。伝えるだけで仕上がりが変わる。',
      WPL:'プロレベルの手元ケアの経験がある。今は止まっている。手元は他の軸に比べて、再開のコストが最も低い。費用・時間・心理的ハードル、全部低い。次の予約を一つ入れるだけで動き出せる。経験があるから、一回行けばすぐに元の状態に戻れる。',
      WPD:'プロのサポートを受けながら手元を磨いている。細部が整うと、全体の印象の質感が変わる。次のフェーズで意識すべきは、整えた手元を「見せる」ことだ。食事の場面・話している時・写真の時、手元が映える機会を意識して使っていこう。整えたものを活かすことで、投資の価値が現実になる。',
      // ── R軸（脱毛） ──
      RNV:'脱毛を全く考えたことがない。でも毎日カミソリで処理するムダな時間と肌へのダメージは確実に積み重なっている。脱毛は「美容」ではなく「インフラ整備」だ。一度整えてしまえば、毎朝の処理から解放される。まず自分の気になる部位を一つ確認してみよう。現状把握が、最初の一手だ。',
      RNK:'自己処理を当たり前にこなしているが、このまま続けることへの疑問を持ったことがない。カミソリによる肌荒れや埋没毛、毎日の時間コスト。自己処理には見えないコストがある。一度だけ医療脱毛のカウンセリングに行ってみよう。現状と選択肢が、初めて明確に見える。',
      RND:'定期的に自己処理を続けている。習慣になっているのは強みだ。でも自己処理は永続的にコストがかかる。脱毛サロンや医療脱毛に切り替えることで、長期的には時間とお金の両方を節約できる。今の習慣をアップグレードする選択肢として、無料カウンセリングで一度比較してみよう。',
      RCV:'脱毛が気になっているが、まだ行動に移せていない。費用・痛み・期間への不安が足を止めているはずだ。でも無料カウンセリングは予約するだけで、費用も痛みも全くない。まず「どんなものか」を知るだけでいい。行ったからといって即契約する必要はない。情報だけを取りに行く感覚でいい。',
      RCQ:'脱毛を始めようとしたか、一度通い始めたが途中で止まった。止まった理由が費用なのか、痛みなのか、通うのが面倒だったのかによって、次の一手が変わる。今は医療脱毛の価格は以前より大幅に下がっている。もし費用が理由なら、改めて調べてみる価値がある。一度止まったからといって、再開できないわけではない。',
      RCK:'気になって自己処理は続けているが、脱毛を受けるかどうか迷っている。自分に合っているか、効果があるかが不安なのだ。一度だけクリニックのカウンセリングで「自分の毛質・肌に合う方法は何か」を専門家に聞いてみよう。曖昧な情報をネットで調べるより、プロに確認する方が判断が速くなる。',
      RCL:'以前は脱毛を受けていたが今は止まっている。通っていた時の状態は確かに良かったはずだ。止まった理由を振り返り、再開できる形を探してみよう。完了まで続けられていなかったなら、今からでも効果が出る部位は残っている。中断した分のセッションを再開するだけでいい。',
      RCD:'脱毛に関心を持ち、今まさに動き始めている。この段階で一番大事なのは「部位の優先順位」だ。すべてを一度にやろうとすると費用と期間がかさむ。ワキ・脚・腕など、見えやすい部位から優先するとコスパよく進められる。カウンセリングで優先部位を相談しよう。',
      RAV:'自己処理は自分でしているがサロン・クリニックには行ったことがない。毎月の処理の手間と肌への負担を数えてみよう。脱毛の費用は一見高く見えるが、自己処理の道具代と時間コストと比較すると長期的には逆転する。一度だけ無料カウンセリングで試算してみよう。',
      RAQ:'自己処理をしていたが一度やめた。毛が薄くなったか、処理が面倒になったかなど理由はさまざまだろう。もし肌が荒れやすくなっているなら、カミソリを電動シェーバーに変えるだけでも改善する。より根本的に解決したいなら、脱毛クリニックのカウンセリングで現状に合った方法が見つかる。',
      RAK:'自己処理は続けているが、今の方法が正しいか疑問を持っている。カミソリは肌を削り、毛抜きは毛穴を傷つける。電動シェーバーが最も肌に優しい。もし将来的に処理の手間を完全になくしたいなら、医療脱毛クリニックのカウンセリングで「今の肌状態に合った方法」を確認しよう。',
      RAL:'以前は自己処理をきちんとやっていた。今は後回しになっている。肌の荒れや見た目の清潔感に影響が出ていないか確認しよう。まず電動シェーバー1本だけ用意するところから再開する。自己処理ではなく脱毛に移行することを検討しているなら、今がちょうどいいタイミングだ。',
      RAD:'自己処理しながら今まさに清潔感を整えている。次のステップは、自己処理からの卒業を検討することだ。医療脱毛クリニックのカウンセリングは無料で、勧誘なしで情報収集できるところが多い。今の自己処理コストと脱毛の費用を一度比較するだけで、決断の材料が揃う。',
      RPQ:'脱毛サロンやクリニックに通っていたが今は止まっている。施術の途中であれば、効果はまだ出せる可能性がある。完了できていない部位があるなら、同じクリニックか別のクリニックで再開することを検討しよう。費用が理由なら、今は価格帯の選択肢が増えている。',
      RPK:'クリニックに通いながらも、施術の効果に満足できていない感覚がある。担当者に率直に伝えることが大事だ。「期待した効果が出ていない気がする」という言葉を次回持参しよう。照射出力の調整や部位ごとの対応が変わることがある。投資を結果に変えるのは、対話の質だ。',
      RPL:'プロレベルの脱毛施術を経験した。今は止まっている。完了していない部位が残っているなら、再開の価値がある。完了済みなら、たまに生えてくる産毛へのメンテナンスとして年1回程度の施術で維持できる。経験があるから、再開のハードルは低い。',
      RPD:'クリニックで脱毛施術を受けながら、今まさに進めている。大事なのは「中断しないこと」だ。脱毛は毛周期に合わせて複数回施術することで効果が出る。途中でやめると最も重要な回を逃すことになる。スケジュールを先にブロックして、完了まで継続することだけを意識しよう。',
    };
    const AXIS_ACCENT_COLOR = { B:'#ef4444', E:'#8b5cf6', F:'#10b981', H:'#3b82f6', S:'#f59e0b', R:'#06b6d4', T:'#eab308', W:'#14b8a6' };
    const AXIS_WORD = { B:'しなやかな', E:'眉の', F:'纏いの', H:'光髪の', S:'麗肌の', R:'素肌の', T:'白磁の', W:'花爪の' };
    const TYPE_MODIFIER = {
      NV:'眠れる', NK:'鏡なき', ND:'咲き続ける',
      CV:'凍れる', CQ:'散り際の', CK:'迷える', CL:'眠れる', CD:'紅の',
      AV:'揺れる', AQ:'忘れゆく', AK:'独り咲く', AL:'休める', AD:'白き',
      PQ:'散りかけの', PK:'委ねた', PL:'封じた', PD:'黎明の',
    };
    const PATH_COLORS = { virgin:'rgba(201,168,76,0.12):#c9a84c', quit:'#fee2e2:#b91c1c', blind:'#f5f0e8:#7a6e65', lapsed:'#d1fae5:#065f46' };
    const VIEW_ALERTS = {
      worse:   '⚠️ 他者評価が自己評価より低い可能性',
      unknown: '💡 客観的フィードバックを得たことがない',
    };

    const tv = p.transform_vectors || {};

    // ── 基礎チェックリスト（New Me Navi用・横スクロール）──
    const stepDone = (() => { try { return JSON.parse(localStorage.getItem('fineme:step:done') || '{}'); } catch { return {}; } })();

    const BASELINE_STEPS = {
      eyebrow: [
        { id: 'eyebrow-b-01', axis: 'eyebrow', text: '眉用コームを今日買って、鏡の前で毛流れを整えてみる（3分でできる、顔の印象が変わる）' },
        { id: 'eyebrow-b-02', axis: 'eyebrow', text: '余分な産毛・単独毛を電動フェイスシェーバーで週1回除去する（コームで整えた後の産毛が対象）' },
        { id: 'eyebrow-b-03', axis: 'eyebrow', text: '鏡で左右の眉の高さと長さを比べて、どちらがズレているか確認する（非対称の現状把握）' },
      ],
      skin: [
        { id: 'skin-b-01', axis: 'skin', text: '朝晩2回の洗顔を今日から習慣にする（今の洗顔料でOK。まず頻度が先）' },
        { id: 'skin-b-02', axis: 'skin', text: '洗顔後30秒以内に化粧水をつける（コットンでも手でも可。水分を閉じ込めるのが目的）' },
        { id: 'skin-b-03', axis: 'skin', text: '化粧水の後に乳液またはクリームで蓋をする（ニベア青缶500円台でOK）' },
        { id: 'skin-b-04', axis: 'skin', text: '外出前にUV（日焼け止めSPF30以上）を塗る習慣を作る（老化の最大原因は紫外線）' },
        { id: 'skin-b-05', axis: 'skin', text: '美容液を1本導入する（ビタミンC誘導体配合が毛穴・シミに効果的）' },
      ],
      hair: [
        { id: 'hair-b-01', axis: 'hair', text: '洗髪後は自然乾燥禁止。今日からドライヤーで根元から乾かす（清潔感が1日で変わる）' },
        { id: 'hair-b-02', axis: 'hair', text: 'シャンプーは頭皮で泡立ててから揉み込む（髪をこすらない。頭皮の血行が変わる）' },
        { id: 'hair-b-03', axis: 'hair', text: 'トリートメントを毎回使う（毛先に馴染ませて2分置いてから流す）' },
        { id: 'hair-b-04', axis: 'hair', text: 'ドライヤー後にヘアオイルまたはアウトバストリートメントをつける（ツヤが変わる）' },
      ],
      fashion: [
        { id: 'fashion-b-01', axis: 'fashion', text: 'クローゼットからサイズが合っている服だけ取り出して今日着る（ゆるい服は見た目を5kg太らせる）' },
        { id: 'fashion-b-02', axis: 'fashion', text: '着る前にシワを確認する。シワがある服は蒸気またはアイロンで伸ばす（清潔感の9割はシワで決まる）' },
        { id: 'fashion-b-03', axis: 'fashion', text: '1コーデを白・グレー・ネイビーの無地3色以内にまとめる（色は少ない方が清潔感が出る）' },
        { id: 'fashion-b-04', axis: 'fashion', text: '靴を今日拭く・磨く（靴の汚れは全体の印象を下げる。週1回10分の手入れで変わる）' },
      ],
      body: [
        { id: 'body-b-01', axis: 'body', text: '壁を背にして立ち、後頭部・肩・お尻・かかとを全部つける。正しい姿勢を30秒キープして鏡で確認する' },
        { id: 'body-b-02', axis: 'body', text: '歩くとき「頭のてっぺんを引っ張られている」イメージで歩く。姿勢を意識するだけで見た目が変わる' },
        { id: 'body-b-03', axis: 'body', text: 'スマホのヘルスケアアプリで歩数を記録し始める（目標：1日7,000歩）' },
        { id: 'body-b-04', axis: 'body', text: '体幹プランク30秒×3セットを毎朝始める（姿勢の維持が楽になる）' },
      ],
      teeth: [
        { id: 'teeth-b-01', axis: 'teeth', text: '歯磨きを食後30分以内に固定し、2分以上かける（頻度と時間の習慣化が最初の一歩）' },
        { id: 'teeth-b-02', axis: 'teeth', text: 'デンタルフロスを今日買って今夜使う。歯ブラシだけでは取れない汚れが一目瞭然になる' },
        { id: 'teeth-b-03', axis: 'teeth', text: '歯磨き粉をホワイトニング成分（ポリリン酸・フッ素配合）に切り替える' },
        { id: 'teeth-b-04', axis: 'teeth', text: 'コーヒー・お茶を飲んだ後は水でゆすぐ。着色を防ぐ最小コストの習慣' },
      ],
      nail: [
        { id: 'nail-b-01', axis: 'nail', text: '今すぐ爪を「白い部分1〜2mm残る長さ」に切り揃える（10分で手の印象が別人になる）' },
        { id: 'nail-b-02', axis: 'nail', text: '爪やすり（100均）で角を丸く整える。週1回切るたびに必ずセットでやる' },
        { id: 'nail-b-03', axis: 'nail', text: '爪周りの甘皮・ささくれにネイルオイルを塗る（手全体の印象が変わる）' },
      ],
      hairremoval: [
        { id: 'hairremoval-b-01', axis: 'hairremoval', text: 'ひげのスタイル（完全除去 or 整えて残す）を今日決める。迷いをなくすと清潔感が上がる' },
        { id: 'hairremoval-b-02', axis: 'hairremoval', text: '毎日同じタイミング（洗顔後など）でひげを処理する習慣を作る。生えかけの状態をなくす' },
        { id: 'hairremoval-b-03', axis: 'hairremoval', text: '現在のシェーバーの刃を確認する。3〜6ヶ月が交換目安。切れ味が落ちると肌荒れの原因になる' },
      ],
    };

    const priorityOrder = p.priority_order || [];
    const compassCalculated = p.compass_first || priorityOrder[0] || 'body';
    const compassOverride = localStorage.getItem('fineme:compass:override');
    const isOverrideActive = !!(compassOverride && AREA_DEFS[compassOverride]);
    const compassFirst = isOverrideActive ? compassOverride : compassCalculated;

    // ─── タイプ（識別軸）は「一番できてる軸」、Compass（次の一手）は従来どおり
    // 「一番優先度が高い軸」——男性版と同じ理由で分離（でお指摘 2026-08-26）
    function computeStrengthAxis() {
      const entries = Object.entries(tv);
      if (!entries.length) return compassCalculated;
      entries.sort((a, b) => {
        if (b[1].current !== a[1].current) return b[1].current - a[1].current;
        return (a[1].tier || 9) - (b[1].tier || 9);
      });
      return entries[0][0];
    }
    const identityAxis = isOverrideActive ? compassOverride : computeStrengthAxis();

    // ─── Hero headline ───
    function getHeroContent() {
      const gc = p.goal_change;
      const gv = p.goal_vision;
      const t  = p.trigger;
      const CHANGE_HEADLINES = {
        others_perception: { h1: '<em>「あの人、変わった」と言わせる地図が、<br>今できた。</em>', sub: '他の人からの見られ方を変えたい。その動機は正しい。外見は「自分が思っているより他者に見られている」。変えるべき場所を変えれば、<strong>あの人の目が変わる。</strong>' },
        self_confidence:   { h1: '<em>自分が自分を好きになる——<br>その旅の出発点がここにある。</em>', sub: '他人の目より先に、自分が自分を認める。そのためにまず「変えられる場所を変える」ことが必要だ。<strong>鏡の中の自分が少しずつ変わると、何かが変わり始める。</strong>' },
        action_ease:       { h1: '<em>外見が足を引っ張らなくなれば、<br>もっと動ける。その通りだ。</em>', sub: '行動できない理由を外見に帰属している限り、変わらない。逆に外見への引っかかりが消えると、<strong>驚くほど動けるようになる。</strong>' },
        life_options:      { h1: '<em>外見を理由に、諦めることを<br>一つずつ減らしていく地図。</em>', sub: '「どうせ自分なんて」という言葉を頭から消すために、変えられる場所を変える。<strong>諦めの連鎖を断ち切る最初の一点</strong>がここに示されている。' },
      };
      const TRIGGER_FALLBACK = {
        matching_app: { h1: '<em>頑張っているのに変わらない。<br>その理由は、もう見えている。</em>', sub: '努力が結果に変わらない理由は「<strong>変えるべき場所を変えていない</strong>」からだ。今回のスキャンで、その場所が特定された。' },
        love:         { h1: '<em>好きな人がいる。外見への自信が<br>その距離を作っている。</em>', sub: '動機は今が最大だ。<strong>この気持ちが薄れないうちに</strong>、最初の一点を変えることが大事。変えた先に自信が生まれる。' },
        career:       { h1: '<em>大事な場面が控えている。<br>外見への準備が、結果を左右する。</em>', sub: '節目は外見への意識が最も高まるタイミングだ。<strong>その後も通用する外見の土台</strong>をここで作る。' },
        word:         { h1: '<em>誰かの一言が、ずっと引っかかっている。<br>その違和感は、変われるサインだ。</em>', sub: '「なんか違う」という感覚は裏切らない。<strong>そこだけ変えればいい。</strong>全部変えなくていい。一点変えると連鎖が始まる。' },
        vague:        { h1: '<em>特別なきっかけはなくていい。<br>「今やる」に変わった瞬間がすべてだ。</em>', sub: '「いつかやろう」が「今やる」に変わった。<strong>まず一点だけ変えると次が見えてくる。</strong>' },
      };
      if (gc && CHANGE_HEADLINES[gc]) return CHANGE_HEADLINES[gc];
      if (t && TRIGGER_FALLBACK[t]) return TRIGGER_FALLBACK[t];
      return { h1: '<em>あなただけの変容プロファイルが、<br>今完成した。</em>', sub: '全カテゴリの現在地と理想を測定した。Fineme Compassが指す方角から始めよう。' };
    }

    // ─── ゴール4層テキスト ───
    function buildGoalLayers() {
      const SCENE_MAP = {
        first_impression: '初対面の瞬間、相手の反応が変わる',
        date_confidence:  '好きな人といる時間、外見を気にせず相手に集中できる',
        photo_self:       '写真や動画の自分が、気にならなくなる',
        morning_mirror:   '毎朝鏡を見て、気分が上がる',
        approach:         '自分から積極的に動けるようになる',
      };
      const CHANGE_MAP = {
        others_perception: '他の人からの見られ方・評価が変わる',
        self_confidence:   '自分の気持ち・自己肯定感が変わる',
        action_ease:       '行動のしやすさ・動けるようになること',
        life_options:      '外見を理由に諦めることが減ること',
      };
      const VISION_MAP = {
        love_active:      '恋愛で、躊躇せず動けるようになっている',
        no_give_up:       '外見を理由に何かを諦めることが減っている',
        like_self:        '自分のことを、もう少し好きになっている',
        natural_confident:'自信が「自然な状態」になっている',
      };
      const layers = [];
      if (p.goal_scene && SCENE_MAP[p.goal_scene])
        layers.push({ icon:'🎬', label:'Layer 2 — 場面・行動のゴール', text: SCENE_MAP[p.goal_scene] });
      if (p.goal_change && CHANGE_MAP[p.goal_change])
        layers.push({ icon:'🔥', label:'Layer 3 — 感情・状態のゴール', text: CHANGE_MAP[p.goal_change] });
      if (p.goal_vision && VISION_MAP[p.goal_vision])
        layers.push({ icon:'🌱', label:'Layer 4 — あり方のゴール（変容の先）', text: VISION_MAP[p.goal_vision] });
      if (!layers.length) return '';
      return `
        <p class="sec-label" style="margin-top:28px">Your Goal</p>
        <div class="goal-card">
          <div class="goal-card-title">🎯 あなたが目指す場所</div>
          <div class="goal-layers">
            ${layers.map(l => `
              <div class="goal-layer">
                <div class="goal-layer-icon">${l.icon}</div>
                <div class="goal-layer-body">
                  <div class="goal-layer-label">${esc(l.label)}</div>
                  <div class="goal-layer-text">${esc(l.text)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // ─── SVGレーダーチャート ───
    function buildRadarChart() {
      const areas = ['body','eyebrow','fashion','hair','skin','teeth','nail'];
      const labels = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
      const icons  = { body:'💪', eyebrow:'✂️', fashion:'👗', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
      const cx = 150, cy = 150, R = 90;

      // Grid
      let grid = '';
      for (let lv = 1; lv <= 5; lv++) {
        const pts = areas.map((_, i) => {
          const a = -Math.PI/2 + (2*Math.PI*i/7);
          const r = (lv/5)*R;
          return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        grid += `<polygon points="${pts}" fill="none" stroke="rgba(201,168,76,0.15)" stroke-width="${lv===5?1.5:1}"/>`;
      }

      // Axis lines
      let axes = '';
      areas.forEach((_, i) => {
        const a = -Math.PI/2 + (2*Math.PI*i/7);
        axes += `<line x1="${cx}" y1="${cy}" x2="${(cx+R*Math.cos(a)).toFixed(1)}" y2="${(cy+R*Math.sin(a)).toFixed(1)}" stroke="rgba(201,168,76,0.12)" stroke-width="1"/>`;
      });

      // Ideal polygon (dashed gold)
      const idealPts = areas.map((id, i) => {
        const score = Math.min(tv[id]?.ideal || 3, 5);
        const a = -Math.PI/2 + (2*Math.PI*i/7);
        const r = (score/5)*R;
        return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;
      }).join(' ');

      // Current polygon (filled navy)
      const currentPts = areas.map((id, i) => {
        const score = Math.min(tv[id]?.current || 1, 5);
        const a = -Math.PI/2 + (2*Math.PI*i/7);
        const r = (score/5)*R;
        return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`;
      }).join(' ');

      // Labels
      let labelsSvg = '';
      areas.forEach((id, i) => {
        const a = -Math.PI/2 + (2*Math.PI*i/7);
        const lr = R + 24;
        const lx = (cx + lr*Math.cos(a)).toFixed(1);
        const ly = (cy + lr*Math.sin(a) + 4).toFixed(1);
        labelsSvg += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" font-weight="700" fill="rgba(232,228,220,0.80)">${icons[id]}${labels[id]}</text>`;
      });

      return `
        <svg viewBox="0 0 300 300" width="100%" style="max-width:300px;display:block;margin:0 auto">
          ${grid}${axes}
          <polygon points="${idealPts}" fill="rgba(201,168,76,0.08)" stroke="#c9a84c" stroke-width="1.5" stroke-dasharray="4,3"/>
          <polygon points="${currentPts}" fill="rgba(96,165,250,0.10)" stroke="rgba(96,165,250,0.85)" stroke-width="2"/>
          ${labelsSvg}
          <circle cx="${cx}" cy="${cy}" r="4" fill="#c9a84c"/>
        </svg>
        <div class="radar-legend">
          <div class="radar-legend-item"><div class="radar-legend-dot" style="background:rgba(96,165,250,0.85)"></div>現在地</div>
          <div class="radar-legend-item"><div class="radar-legend-dot" style="background:#c9a84c;opacity:.8"></div>理想</div>
        </div>
      `;
    }

    // ─── タイプ判定（Compass軸の care_type × path_type で136通りが確定する）───
    // ヒーロー表示・シェア文・OG画像で共用する
    function computeTypeIdentity() {
      const axisCode = AXIS_TYPE_CODE[identityAxis];
      if (!axisCode) return null;
      const v = tv[identityAxis] || {};
      const careCode = CARE_CODE_MAP[v.care_type] || 'N';
      const pathCode = PATH_CODE_MAP[v.path_type] || 'V';
      const creature = TYPE_CREATURE[careCode + pathCode];
      if (!creature) return null;
      const modifier = TYPE_MODIFIER[careCode + pathCode] || '';
      const axisWord = AXIS_WORD[axisCode] || '';
      return {
        axisCode, careCode, pathCode, creature, modifier, axisWord,
        typeCode: `${axisCode}${careCode}${pathCode}`,
        displayCode: `${axisCode}${CARE_DIGIT_MAP[careCode]}${PATH_DIGIT_MAP[pathCode]}${TRACK_CODE_LETTER}`,
        fullName: `${axisWord}${modifier}${creature}`,
      };
    }
    const typeIdentity = computeTypeIdentity();

    // ─── タイプヒーロー（Naviの最初のセクション） ───
    function buildTypeHero() {
      if (!typeIdentity) return '';
      const { axisCode, creature, typeCode, displayCode, fullName } = typeIdentity;
      const desc      = TYPE_DESCRIPTION[typeCode] || '';
      const color     = AXIS_ACCENT_COLOR[axisCode] || '#c9a84c';
      const axisLabel = AREA_DEFS[identityAxis]?.label || '';
      return `
        <div class="type-hero" style="background:linear-gradient(180deg,${color}1a 0%,rgba(10,15,30,0) 100%)">
          <p class="type-hero-lead">あなたのタイプは →</p>
          <p class="type-hero-code" style="color:${color}">${esc(displayCode)}</p>
          <div class="type-hero-img-wrap" style="border:2px solid ${color}44;box-shadow:0 0 36px ${color}22">
            <img class="type-hero-img" src="/images/types/belle/TYPE-${esc(typeCode)}.webp" alt="${esc(creature)}" />
          </div>
          <h1 class="type-hero-name">～ ${esc(fullName)} ～</h1>
          <p class="type-hero-axis">（${esc(axisLabel)}軸）</p>
          <p class="type-hero-tagline">${esc(desc)}</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button id="share-type-card-btn" class="type-hero-share-btn"
              data-type-code="${esc(typeCode)}"
              data-display-code="${esc(displayCode)}"
              data-creature="${esc(fullName)}"
              data-color="${esc(color)}"
              data-tagline="${esc(desc)}">
              📷 カードを画像保存
            </button>
            <a href="/belle/diagnosis/types" class="type-hero-share-btn" style="text-decoration:none">全136タイプを見る →</a>
          </div>
          <div class="type-hero-divider"></div>
        </div>
      `;
    }

    // ─── Fineme Compass ───
    function buildCompass() {
      const def = AREA_DEFS[compassFirst];
      if (!def) return '';
      const v = tv[compassFirst] || {};
      const gap = v.gap || 0;
      const COMPASS_REASONS = {
        body:    '体型が変わると服の見え方がすべて変わる。他の軸の効果を最大化する「土台」だ。',
        eyebrow: '顔の印象を最も短時間・低コストで変えられる部位。1回のサロンで別人のような印象になれる。',
        fashion: 'サイズ感と色を整えるだけで印象は別物になる。体型より「選び方」で変えられる。変化が即日見える。',
        hair:    '髪型は第一印象の30%を占める。美容院1回で「なんかいい感じ」という変化が体感できる。',
        skin:    '肌は近距離で一番差が出る。清潔感の土台であり、ここを整えると全体の印象が底上げされる。',
        teeth:   '笑顔と口元は第一印象の核心。ここが整うと自信が外に出やすくなる。',
        nail:    '細部の仕上がりが「全体の質感」を決める。磨き込みの段階にある証拠だ。',
      };
      const urgencyNote = p.urgency === 'high' ? '<br><strong>締め切りがある今、ここが最短ルート。</strong>' : '';
      const pathType = tv[compassFirst]?.path_type;
      const PATH_ACTION = {
        virgin: '→ まず知識・入門から始める一手',
        quit:   '→ 継続できる仕組みを先に設計する',
        blind:  '→ 客観的なフィードバックを得ることから始める',
        lapsed: '→ 再開のハードルを最小化する',
      };
      const pathActionNote = pathType ? `<br><span style="font-size:12px;color:#c9a84c;font-weight:700">${PATH_ACTION[pathType]||''}</span>` : '';
      const overrideChips = Object.entries(AREA_DEFS).map(([id, d]) => {
        const isActive = id === compassFirst;
        return `<button class="compass-override-chip${isActive ? ' active' : ''}" data-axis="${id}">${esc(d.icon)} ${esc(d.label)}</button>`;
      }).join('');
      const overrideNote = isOverrideActive
        ? `<p style="font-size:11px;color:#c9a84c;font-weight:700;margin:4px 0 0">🧭 あなたが選んだ方角 — <button id="compass-reset-btn" style="background:none;border:none;color:#c9a84c;font-size:11px;font-weight:700;cursor:pointer;padding:0;text-decoration:underline">診断の推奨に戻す</button></p>`
        : `<p style="font-size:11px;color:#6b7280;margin:4px 0 0">診断が算出した最初の一手</p>`;
      // TOP2, TOP3
      const top2Id = isOverrideActive ? (priorityOrder.filter(id => id !== compassFirst)[0] || null) : (priorityOrder.filter(id => id !== compassFirst)[0] || null);
      const top3Id = priorityOrder.filter(id => id !== compassFirst && id !== top2Id)[0] || null;
      const top2Def = top2Id && AREA_DEFS[top2Id];
      const top3Def = top3Id && AREA_DEFS[top3Id];
      const subCompasses = [top2Id, top3Id].filter(Boolean).map((id, si) => {
        const d = AREA_DEFS[id];
        if (!d) return '';
        const pathT = tv[id]?.path_type;
        const pathNote = pathT ? `<span style="font-size:10px;color:#c9a84c;font-weight:700;display:block;margin-top:3px">${(PATH_ACTION[pathT]||'').replace('→ ','')}</span>` : '';
        return `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(201,168,76,0.12);border-radius:10px;flex:1;min-width:0">
            <span style="font-size:18px;flex-shrink:0;line-height:1.4">${esc(d.icon)}</span>
            <div style="min-width:0">
              <span style="font-size:10px;color:rgba(201,168,76,0.6);font-weight:700;letter-spacing:.06em">第${si+2}候補</span>
              <div style="font-size:13px;font-weight:700;color:rgba(232,228,220,0.9)">${esc(d.label)}</div>
              ${pathNote}
            </div>
          </div>`;
      }).join('');

      return `
        <p class="sec-label" style="margin-top:28px">Fineme Compass</p>
        <div class="compass-card">
          <div class="compass-eyebrow">今向くべき方角 — 第1候補</div>
          <div class="compass-main">${esc(def.icon)} ${esc(def.label)}</div>
          ${overrideNote}
          <div class="compass-reason" style="margin-top:12px">${COMPASS_REASONS[compassFirst] || ''}${urgencyNote}${pathActionNote}</div>
          <a href="/mypage/navi" class="compass-cta">変容ロードマップを見る →</a>
          <a href="/search?category=${esc(def.catLink)}&diag=1" style="display:inline-block;margin-top:8px;font-size:12px;color:#6b7280;text-decoration:none;" onmouseover="this.style.color='#c9a84c'" onmouseout="this.style.color='#6b7280'">このカテゴリのプロを探すなら →</a>

          ${subCompasses ? `
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(201,168,76,0.15)">
            <p style="font-size:11px;font-weight:700;color:rgba(201,168,76,0.6);margin:0 0 8px;letter-spacing:.06em">第2・第3候補</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">${subCompasses}</div>
          </div>` : ''}

          <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(201,168,76,0.2);">
            <p style="font-size:12px;font-weight:800;color:rgba(201,168,76,0.8);margin:0 0 10px;letter-spacing:.06em;display:flex;align-items:center;gap:6px"><span>🔄</span> 最初の一手を自分で選ぶ</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${overrideChips}</div>
          </div>
        </div>
      `;
    }

    // ─── 次に描き込む1軸（第3層への導き）───
    // 軸を並べて選ばせない。羅針盤は方角を1つ指すもの。
    // hairremoval・nailは恋愛への影響を聞かない設計（has_love:false）なので、
    // love_impactを必須から外さないと永遠に「未完了」のまま残ってしまう
    const NO_LOVE_AXES = new Set(['hairremoval', 'nail']);
    function isAxisDrawn(id) {
      const v = tv[id] || {};
      const fields = NO_LOVE_AXES.has(id) ? ['path_type', 'self_view'] : ['path_type', 'self_view', 'love_impact'];
      return fields.every(k => !!v[k]);
    }
    function buildNextDrawBlock() {
      const allIds = Object.keys(AREA_DEFS);
      const ordered = priorityOrder.length
        ? priorityOrder.concat(allIds.filter(id => !priorityOrder.includes(id)))
        : allIds;
      const remaining = ordered.filter(id => AREA_DEFS[id] && !isAxisDrawn(id));
      const drawn = allIds.filter(id => isAxisDrawn(id)).length;

      // 全軸を描き終えた → 地図と現在地のサイクルへ接続する（順番ではなく循環）
      if (!remaining.length) {
        let lastMirrorAt = null;
        try {
          const raw = localStorage.getItem('fineme:mirror:one-point');
          if (raw) lastMirrorAt = JSON.parse(raw)?.savedAt || null;
        } catch (e) {}
        const days = lastMirrorAt
          ? Math.max(0, Math.floor((Date.now() - new Date(lastMirrorAt).getTime()) / 86400000))
          : null;
        const title = days === null
          ? 'あとは、今の現在地を測るだけです'
          : `前回の観測から ${days} 日`;
        const body = days === null
          ? '地図はすべて描けました。写真1枚で、自分では見えていない今の現在地がわかります。'
          : '地図が変わったなら、現在地も変わっています。同じ場所から、もう一度測ってみましょう。';
        return `
          <div style="margin:16px 0 20px;padding:20px 18px;background:rgba(18,10,18,0.7);border:1px solid rgba(200,100,140,0.3);border-radius:14px;text-align:center">
            <p style="font-size:10px;font-weight:800;letter-spacing:.16em;color:rgba(200,100,140,0.6);text-transform:uppercase;margin:0 0 8px">Map ✓ Complete</p>
            <p style="font-size:15px;font-weight:800;color:#f0d8e0;margin:0 0 6px;line-height:1.5">${esc(title)}</p>
            <p style="font-size:12px;color:rgba(240,216,224,0.5);margin:0 0 16px;line-height:1.75">${esc(body)}</p>
            <a href="/belle/mirror" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,rgba(220,130,160,1),rgba(200,100,140,0.85));color:#fff;font-size:14px;font-weight:800;border-radius:10px;text-decoration:none">🪞 現在地を測る →</a>
          </div>`;
      }

      const nextId = remaining[0];
      const def = AREA_DEFS[nextId];
      const total = allIds.length;
      // 来た道はQ3で既に回答済みなので、deepenで残っているのは自己視点(+恋愛への影響)のみ
      const qCount = NO_LOVE_AXES.has(nextId) ? 1 : 2;
      return `
        <div style="margin:16px 0 20px;padding:20px 18px;background:rgba(18,10,18,0.7);border:1px solid rgba(200,100,140,0.28);border-radius:14px;text-align:center">
          <p style="font-size:10px;font-weight:800;letter-spacing:.16em;color:rgba(200,100,140,0.6);text-transform:uppercase;margin:0 0 10px">Map ${drawn} / ${total}</p>
          <p style="font-size:13px;color:rgba(240,216,224,0.55);margin:0 0 4px">地図はまだ骨格の状態です</p>
          <p style="font-size:17px;font-weight:800;color:#f0d8e0;margin:0 0 16px;line-height:1.4">次に描き込むのは —— ${esc(def.icon)} ${esc(def.label)}</p>
          <a href="/belle/diagnosis?deepen=${esc(nextId)}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,rgba(220,130,160,1),rgba(200,100,140,0.85));color:#fff;font-size:14px;font-weight:800;border-radius:10px;text-decoration:none">${esc(def.label)}の地図を描き込む（${qCount}問・30秒）→</a>
          <p style="font-size:11px;color:rgba(240,216,224,0.32);margin:12px 0 0;line-height:1.6">描き込むほど、New Me Navi のステップが具体的になります</p>
        </div>`;
    }

    // ─── 変容ベクトルリスト ───
    function buildVectorList() {
      if (!priorityOrder.length) return '';
      // 全軸を優先度順で表示（上位5件に絞らない）
      const orderedIds = priorityOrder.filter(id => AREA_DEFS[id]);
      // BASELINE_STEPSにあるがpriorityOrderにない軸を末尾に追加
      const extra = Object.keys(BASELINE_STEPS).filter(id => AREA_DEFS[id] && !orderedIds.includes(id));
      const allAreas = [...orderedIds, ...extra];
      if (!allAreas.length) return '';

      const CARE_LABELS = { none:'未着手', concerned:'気になっている', self:'自己ケア中', self_regular:'自己流・定期', pro:'プロ通い中' };

      const rows = allAreas.map((id, idx) => {
        const def = AREA_DEFS[id];
        const v   = tv[id] || { current:1, ideal:3, gap:2, tier:def.tier };
        const currentPct = ((v.current / 5) * 100).toFixed(1);
        const idealPct   = ((v.ideal   / 5) * 100).toFixed(1);
        const gapClass   = v.gap >= 3 ? '' : v.gap >= 1 ? ' small' : ' none';
        const gapLabel   = v.gap > 0 ? `ギャップ${v.gap}` : '達成済み';
        const tierLabel  = TIER_LABELS[def.tier] || '';
        const careLabel  = CARE_LABELS[v.care_type] || '';
        const pathLabel  = PATH_LABELS[v.path_type] || '';
        const pathColStr = PATH_COLORS[v.path_type] || '';
        const [pathBg, pathFg] = pathColStr ? pathColStr.split(':') : ['#f3f4f6','#374151'];
        const viewAlert  = v.self_view ? VIEW_ALERTS[v.self_view] || '' : '';

        const baseSteps = BASELINE_STEPS[id] || [];
        const baseCardsHtml = baseSteps.length === 0 ? '' : (() => {
          const doneCount = baseSteps.filter(s => stepDone[s.id]).length;
          const cards = baseSteps.map(step => {
            const done = !!stepDone[step.id];
            return `<div class="bl-card${done ? ' bl-card-done' : ''}">
              <div class="bl-card-check" data-done-key="${esc(step.id)}">${done ? '✓' : ''}</div>
              <p class="bl-card-text">${esc(step.text)}</p>
            </div>`;
          }).join('');
          return `<div style="margin-top:12px">
            <div style="font-size:10px;font-weight:700;color:rgba(201,168,76,0.6);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">基礎の一手 <span style="color:rgba(201,168,76,0.45);font-weight:400">${doneCount}/${baseSteps.length}</span></div>
            <div class="bl-scroll-row">${cards}</div>
          </div>`;
        })();

        return `
          <div class="vector-item${idx === 0 ? ' priority-1' : ''}">
            <div class="vector-item-header">
              <div class="vector-item-name">${esc(def.icon)} ${esc(def.label)}</div>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="vector-tier-badge tier-${def.tier}">${tierLabel}</span>
                <span class="vector-gap-badge${gapClass}">${esc(gapLabel)}</span>
              </div>
            </div>
            ${pathLabel ? `<div style="margin-bottom:8px"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${pathBg};color:${pathFg}">来た道：${esc(pathLabel)}</span>${viewAlert ? `<span style="font-size:10px;color:#92400e;margin-left:8px">${esc(viewAlert)}</span>` : ''}</div>` : ''}
            <div class="vector-bar-wrap">
              <div class="vector-bar-label" style="font-size:10px">${esc(careLabel)}</div>
              <div style="flex:1">
                <div class="vector-bar-track">
                  <div class="vector-bar-current" style="width:${currentPct}%"></div>
                  <div class="vector-bar-ideal-marker" style="left:${idealPct}%"></div>
                </div>
                <div class="vector-bar-labels"><span>現在地</span><span>理想 ★</span></div>
              </div>
            </div>
            ${baseCardsHtml}
          </div>
        `;
      }).join('');

      return `
        <p class="sec-label" style="margin-top:28px">Transform Vector</p>
        <div class="result-card">
          <div class="result-card-title">📐 変容ベクトル</div>
          <div class="result-card-subtitle">現在地と理想のギャップ。ギャップが大きいほど変化の余地が大きい</div>
          <div class="vector-list">${rows}</div>
        </div>
      `;
    }

    // ─── 来た道の障壁分析 ───
    function buildBarrier() {
      const f = p.failure_pattern;
      if (!f) return '';
      const MAP = {
        lost_direction: { text:'「何をすればいいかわからない」状態で止まる傾向がある。', sub:'意志の問題ではなく、プログラム設計の問題。週ごとの目標が明確で次のステップが常に見えているプロと組むことで、この壁は乗り越えられる。', condition:'ステップバイステップで進めてくれるプロ' },
        no_continuation:{ text:'効果を感じながらも、続かなかった経験がある。', sub:'続かない理由の多くは「ハードルが高すぎる」か「一人でやろうとした」こと。月1〜2回でも継続できる環境が解決策になる。', condition:'負担が小さく継続サポートが得意なプロ' },
        cost:           { text:'コストや時間の面で続けられなかった経験がある。', sub:'まず1点だけ変える。変化が実感できたら次に進む。この順序が鍵。', condition:'小さく始められる体験メニューがある、または単価が明確なプロ' },
        awkward:        { text:'プロとの関係性でつまずいた経験がある。', sub:'押し付け感・空気感・やり取りの違和感がストレスになる。「相性」を最初から重視できるプロを選ぶことが今回の最優先事項。', condition:'押し売りせず、こちらのペースを尊重してくれるプロ' },
        no_result:      { text:'変化が感じられずに諦めた経験がある。', sub:'変化が見えない理由は「合っていないサービスを選んでいた」か「評価方法を知らなかった」かのどちらかが多い。', condition:'before/afterが明確で変化を可視化してくれるプロ' },
        ongoing:        { text:'今も継続中。さらに深化させる段階にいる。', sub:'基礎は出来ている。次はバラバラに磨いてきたパーツを全体として活かす「統合」の段階。', condition:'総合的な外見プロデュースができるプロ' },
      };
      const b = MAP[f];
      if (!b) return '';
      return `
        <p class="sec-label" style="margin-top:28px">Your Road</p>
        <div class="result-card">
          <div class="result-card-title">🪨 これまでの道にあった障壁</div>
          <div class="result-card-subtitle">過去のパターンを知ることが、次に勝つための準備になる</div>
          <div class="insight-list">
            <div class="insight-item">
              <div class="insight-label">過去のパターン</div>
              <div class="insight-text">${esc(b.text)}</div>
              <div class="insight-sub">${esc(b.sub)}</div>
            </div>
            ${b.condition ? `<div class="insight-item" style="border-left-color:#059669;background:#f0fdf4">
              <div class="insight-label" style="color:#059669">今回優先するプロの条件</div>
              <div class="insight-text" style="color:#0a0f1e">${esc(b.condition)}</div>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    // ─── プロの条件 ───
    function buildTraits() {
      const traits = [];
      const failMap = {
        lost_direction: 'プログラムが明確で週ごとの目標がある',
        no_continuation:'無理なく続けられるペースを提案してくれる',
        awkward:        '空気感がよく、話しやすい',
        no_result:      'before/afterが明確で変化を可視化してくれる',
      };
      if (p.failure_pattern && failMap[p.failure_pattern]) traits.push(failMap[p.failure_pattern]);
      const urgencyMap = {
        high:   '短期で変化が出やすいプログラムを持っている',
        low:    '長期継続のサポート体制が整っている',
        medium: '月1〜2回のペースで継続できる',
      };
      if (p.urgency && urgencyMap[p.urgency]) traits.push(urgencyMap[p.urgency]);
      const unique = [...new Set(traits)].slice(0, 4);
      if (!unique.length) return '';
      return `
        <p class="sec-label" style="margin-top:28px">あなたに合う変容環境</p>
        <div class="result-card">
          <div class="result-card-title">🌱 あなたが変わりやすい環境の条件</div>
          <div class="result-card-subtitle">旅を通じて見えてきた、あなたに合う変容環境の条件。プロと組むときも、独学で進めるときも、この軸で選ぶと続きやすい</div>
          <div class="trait-list">
            ${unique.map(t => `<div class="trait-item"><div class="trait-check">✓</div><span>${esc(t)}</span></div>`).join('')}
          </div>
        </div>
      `;
    }

    // ─── 掲載者マッチング ───
    async function loadMatchedProviders() {
      const slot = document.getElementById('match-providers-slot');
      if (!slot) return;
      try {
        // Me Scan データをクエリパラメーターで渡してサーバー側で総合スコアリング
        const params = new URLSearchParams();
        if (p.trigger) params.set('trigger', p.trigger);
        if (p.failure_pattern && p.failure_pattern !== 'ongoing') params.set('failure', p.failure_pattern);
        if (compassFirst) params.set('compass', compassFirst);
        if (priorityOrder?.length) params.set('axes', priorityOrder.join(','));
        try {
          const upref = localStorage.getItem('fineme:user:area') || '';
          const ucity = localStorage.getItem('fineme:user:city') || '';
          const ulat  = localStorage.getItem('fineme:user:lat') || '';
          const ulon  = localStorage.getItem('fineme:user:lon') || '';
          if (ulat && ulon) { params.set('lat', ulat); params.set('lon', ulon); }
          else if (upref) { params.set('prefecture', upref); if (ucity) params.set('city', ucity); }
        } catch {}
        const res = await fetch(`/api/providers?${params}`);
        if (!res.ok) return;
        const providers = await res.json();
        if (!providers?.length) return;
        const top3 = providers.slice(0, 3);
        const hasMatch = (top3[0]?.match_score || 0) > 0;
        const title    = hasMatch ? 'あなたのプロファイルに一致するプロ' : '掲載中のプロ';
        const subtitle = hasMatch ? 'スキャン結果・変容軸・プロフィール充実度から自動マッチング' : '現在掲載中のプロをご覧ください';
        slot.innerHTML = `
          <p class="sec-label" style="margin-top:28px">Pro Match</p>
          <div class="result-card">
            <div class="result-card-title">✨ ${esc(title)}</div>
            <div class="result-card-subtitle">${esc(subtitle)}</div>
            ${top3.map((prov, i) => `
              <a href="${prov.entity_type === 'affiliate' ? '/affiliate' : '/provider'}/${esc(prov.slug)}" class="pmc-card${i===0&&hasMatch?' top':''}">
                <div class="pmc-photo">${prov.photo_url ? `<img src="${esc(prov.photo_url)}" alt="${esc(prov.name)}" loading="lazy">` : '<span class="pmc-photo-icon">🧑</span>'}</div>
                <div class="pmc-body">
                  <div class="pmc-name">${esc(prov.name)}</div>
                  ${prov.catchphrase ? `<div class="pmc-catch">${esc(prov.catchphrase)}</div>` : ''}
                  ${prov.match_tags?.length ? `<div class="pmc-tags">${prov.match_tags.map(t => `<span class="pmc-tag">${esc(t)}</span>`).join('')}</div>` : ''}
                  <div class="pmc-meta">${esc(prov.area||'')}${(prov.entity_type!=='affiliate'&&prov.price_from)?` ・ ¥${Number(prov.price_from).toLocaleString()}〜`:''}</div>
                </div>
                <div class="pmc-arrow">→</div>
              </a>
            `).join('')}
          </div>
        `;
      } catch {}
    }

    // 同じ軸で悩んでいた先輩の体験談（vision.md「卒業生が次の夜の人を照らす」の実装。
    // 該当が無ければ何も表示しない。でお指摘 2026-08-07）
    let matchedStoryHtml = '';
    try {
      const storyRes = await fetch(`/api/stories?axisId=${encodeURIComponent(compassFirst)}&status=approved`);
      if (storyRes.ok) {
        const storyList = await storyRes.json();
        const story = Array.isArray(storyList) ? storyList[0] : null;
        if (story?.change_after) {
          matchedStoryHtml = `<div style="margin:12px 0 20px;padding:16px 18px;background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.28);border-radius:12px">
            <p style="font-size:10px;font-weight:800;letter-spacing:.1em;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:0 0 8px">同じ軸で悩んでいた、先輩の声</p>
            ${story.concern_before ? `<p style="font-size:12px;color:rgba(232,228,220,0.5);margin:0 0 4px">${esc(story.concern_before)}</p>` : ''}
            <p style="font-size:14px;font-weight:700;color:rgba(232,228,220,0.92);line-height:1.7;margin:0">${esc(story.change_after)}</p>
          </div>`;
        }
      }
    } catch {}

    // ─── HTML組み立て ───
    const hero = getHeroContent();
    const compassFirstDef = AREA_DEFS[compassFirst] || {};

    const html = `
      ${buildTypeHero()}

      ${!isLoggedIn ? `
      <div class="auth-hero-banner">
        <div class="auth-hero-banner-top">
          <span class="auth-hero-banner-icon">⚠️</span>
          <div class="auth-hero-banner-title">この地図は、この端末に保存されています</div>
        </div>
        <p class="auth-hero-banner-body">アカウントを作ると、スマホ・PCどこからでも同じ地図を開けます。<br>描き込んだ内容も、Mirror の記録も、まとめて引き継がれます。</p>
        <div class="auth-hero-banner-btns">
          <a href="/login?mode=signup&next=/belle/diagnosis/result" class="auth-hero-banner-btn-primary">無料で登録して保存する</a>
          <a href="/login?next=/belle/diagnosis/result" class="auth-hero-banner-btn-secondary">ログインはこちら</a>
        </div>
      </div>
      ` : ''}

      ${buildCompass()}

      ${buildNextDrawBlock()}

      ${compassFirstDef.label ? `<div style="margin:12px 0 20px;padding:16px 18px;background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.28);border-radius:12px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(8px)">
        <span style="font-size:26px;flex-shrink:0">🪞</span>
        <div style="flex:1;min-width:0">
          <p style="font-size:13px;font-weight:700;color:rgba(232,228,220,0.9);margin:0 0 2px;line-height:1.55">地図では ${esc(compassFirstDef.icon||'')} ${esc(compassFirstDef.label)} が最初の一手。<br>実際の現在地は、写真1枚で測れます。</p>
          <p style="font-size:11px;color:rgba(232,228,220,0.4);margin:0">写真は保存しません</p>
        </div>
        <a href="/belle/mirror" style="font-size:12px;font-weight:800;padding:10px 14px;background:rgba(200,100,140,0.1);border:1.5px solid rgba(200,100,140,0.7);color:rgba(200,100,140,0.9);border-radius:8px;text-decoration:none;white-space:nowrap;flex-shrink:0;text-align:center;line-height:1.4">現在地を<br>測る</a>
      </div>` : ''}

      ${matchedStoryHtml}

      <p class="sec-label" style="margin-top:28px">Radar Map</p>
      <div class="radar-card">
        <div class="radar-title">📡 8軸変容レーダー</div>
        <div class="radar-subtitle">現在地（紺）と理想（金点線）。面積の差が変容の余白</div>
        ${buildRadarChart()}
      </div>

      <div class="v-route"><div class="v-route-line"></div><div class="v-route-dot"></div><div class="v-route-line"></div></div>
      ${buildVectorList()}
      ${buildGoalLayers()}
      ${buildBarrier()}

      ${!isLoggedIn ? `
      <div class="save-map-cta">
        <div class="save-map-cta-icon">🧬</div>
        <div class="save-map-cta-body">
          <div class="save-map-cta-title">この地図を、どの端末からでも開けるようにする</div>
          <div class="save-map-cta-desc">今はこの端末にだけ保存されています。<br>アカウントを作ると、続きをどこからでも描き込めます。</div>
          <a href="/login?mode=signup&next=/belle/diagnosis/result" class="save-map-cta-btn">無料アカウントを作る →</a>
          <p class="save-map-cta-note">登録1分 · クレカ不要 · いつでも削除可</p>
        </div>
      </div>
      ` : ''}

      <div class="navi-section">
        <div class="navi-section-label">🗺️ 次の行き先</div>
        <a href="/mypage/navi" class="navi-btn navi-btn-primary">
          <span class="navi-btn-icon">🧭</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">New Me Mapを開く</span>
            <span class="navi-btn-desc">出発前チェック・8軸変容トラック・今向くべき方角が一画面で見える</span>
          </span>
          <span class="navi-btn-arrow">→</span>
        </a>
        <a href="/guide" class="navi-btn navi-btn-secondary">
          <span class="navi-btn-icon">🗺️</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">8軸変容ガイドを読む</span>
            <span class="navi-btn-desc">各軸の意味・始め方・来た道別アドバイス</span>
          </span>
          <span class="navi-btn-arrow">→</span>
        </a>
        <a href="/feature" class="navi-btn navi-btn-secondary">
          <span class="navi-btn-icon">📖</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">Fineme Journal を読む</span>
            <span class="navi-btn-desc">清潔感・写真・変容の思想——変容の旅を後押しするコンテンツ</span>
          </span>
          <span class="navi-btn-arrow">→</span>
        </a>
      </div>

      ${buildTraits()}

      <div id="match-providers-slot"></div>

      ${(() => {
        const _mt = priorityOrder.slice(0, 3).map(id => AREA_DEFS[id]?.label).filter(Boolean);
        const _title = _mt.length >= 2 ? _mt.join('・') + 'の現在地を写真で測る' : '写真1枚で、今の現在地を測る';
        return `<a href="/belle/lp/mirror" style="display:block;text-decoration:none;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px;padding:18px 20px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.35);border-radius:14px;transition:border-color 0.2s">
          <span style="font-size:28px;flex-shrink:0">🪞</span>
          <div style="flex:1">
            <p style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#c9a84c;text-transform:uppercase;margin:0 0 4px">Fineme Mirror — ¥780/月</p>
            <p style="font-size:14px;font-weight:700;color:rgba(232,228,220,0.95);margin:0 0 3px">${esc(_title)}</p>
            <p style="font-size:12px;color:rgba(232,228,220,0.55);margin:0;line-height:1.5">地図を描くのがMe Scan、現在地を測るのがMirror。毎月測り直すと、地図に変化の軌跡が残ります。<span style="color:rgba(232,228,220,0.35)">（1回だけなら ¥500）</span></p>
          </div>
          <span style="font-size:11px;font-weight:800;color:#0a0f1e;background:linear-gradient(135deg,#c9a84c,#e8c97a);border-radius:20px;padding:5px 14px;flex-shrink:0;white-space:nowrap">詳しく見る →</span>
        </div>
      </a>`;
      })()}

      ${buildProductCarousel(priorityOrder.filter(id => AXIS_PRODUCTS[id]).slice(0, 5), getUserLevel())}

      <div id="share-block" style="margin: 0 0 20px; text-align: center;"></div>

      ${!isLoggedIn ? `
      <div class="save-map-cta" style="margin-bottom:24px">
        <div class="save-map-cta-icon">🔑</div>
        <div class="save-map-cta-body">
          <div class="save-map-cta-title">この地図を New Me Map に引き継ぐ</div>
          <div class="save-map-cta-desc">アカウントを作ると、描き込んだ内容がそのまま<br>New Me Map に反映され、月ごとの変化も追えます。</div>
          <a href="/login?mode=signup&next=/mypage/navi" class="save-map-cta-btn">無料アカウントを作る →</a>
          <p class="save-map-cta-note">登録後すぐに New Me Map が開きます</p>
        </div>
      </div>
      ` : ''}

      ${!localStorage.getItem('fineme:feedback:diagnosis_result') ? `
      <div id="feedback-widget" style="background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.18);border-radius:16px;padding:24px 20px;margin-bottom:24px">
        <div style="font-size:13px;font-weight:700;color:rgba(201,168,76,0.9);letter-spacing:.06em;margin-bottom:4px">FEEDBACK</div>
        <div style="font-size:16px;font-weight:700;color:#e8e4dc;margin-bottom:20px">この診断はどうでしたか？</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${['accuracy','usability','revisit'].map((k,i) => {
            const label = ['結果の的確さ','使いやすさ','また使いたいか'][i];
            return `<div class="fb-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <span style="font-size:13px;color:rgba(232,228,220,0.75);min-width:100px">${label}</span>
              <div class="fb-stars" data-key="${k}" style="display:flex;gap:4px">
                ${[1,2,3,4,5].map(n=>`<button class="fb-star" data-val="${n}" style="background:none;border:none;cursor:pointer;font-size:22px;color:rgba(255,255,255,0.2);transition:color .15s;padding:2px">★</button>`).join('')}
              </div>
            </div>`;
          }).join('')}
          <textarea id="fb-comment" placeholder="ひとこと（任意）" rows="2" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e8e4dc;font-size:13px;padding:10px 12px;resize:vertical;width:100%;box-sizing:border-box;margin-top:4px"></textarea>
          <div id="fb-error" style="display:none;font-size:12px;color:#f87171;text-align:right;margin-top:-8px"></div>
          <button id="fb-submit" type="button" style="background:rgba(201,168,76,0.18);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:#c9a84c;font-size:13px;font-weight:700;padding:10px 24px;cursor:pointer;letter-spacing:.04em;transition:background .15s;align-self:flex-end">送信する</button>
        </div>
      </div>
      ` : ''}

      <div class="cta-block">
        <div class="cta-section">
          <button id="btn-save-map" class="cta-btn-secondary" type="button">この地図を保存する</button>
          <div class="cta-divider"></div>
          <a href="/belle/diagnosis" class="cta-btn-ghost">地図を更新する（Me Scan 再スキャン）</a>
        </div>
      </div>
    `;

    root.innerHTML = html;

    // ── 基礎チェックリスト チェック処理 ──
    root.addEventListener('click', e => {
      const btn = e.target.closest('.bl-card-check');
      if (!btn) return;
      const key = btn.dataset.doneKey;
      if (!key) return;
      const newDone = !stepDone[key];
      if (newDone) stepDone[key] = true; else delete stepDone[key];
      try { localStorage.setItem('fineme:step:done', JSON.stringify(stepDone)); } catch {}
      btn.classList.toggle('checked', newDone);
      btn.textContent = newDone ? '✓' : '';
      const card = btn.closest('.bl-card');
      if (card) {
        card.classList.toggle('bl-card-done', newDone);
        const group = card.closest('.bl-axis-group');
        if (group) {
          const allCards = group.querySelectorAll('.bl-card');
          const doneCards = group.querySelectorAll('.bl-card-done');
          group.classList.toggle('bl-axis-done', allCards.length === doneCards.length);
          const countEl = group.querySelector('.bl-axis-count');
          if (countEl) countEl.textContent = `${doneCards.length}/${allCards.length}`;
        }
      }
    });

    // ── フィードバックウィジェット ──
    const fbWidget = document.getElementById('feedback-widget');
    if (fbWidget) {
      const ratings = { accuracy: 0, usability: 0, revisit: 0 };
      fbWidget.querySelectorAll('.fb-stars').forEach(group => {
        const key = group.dataset.key;
        group.querySelectorAll('.fb-star').forEach(star => {
          star.addEventListener('mouseenter', () => {
            group.querySelectorAll('.fb-star').forEach(s => {
              s.style.color = parseInt(s.dataset.val) <= parseInt(star.dataset.val) ? '#c9a84c' : 'rgba(255,255,255,0.2)';
            });
          });
          star.addEventListener('mouseleave', () => {
            group.querySelectorAll('.fb-star').forEach(s => {
              s.style.color = parseInt(s.dataset.val) <= ratings[key] ? '#c9a84c' : 'rgba(255,255,255,0.2)';
            });
          });
          star.addEventListener('click', () => {
            ratings[key] = parseInt(star.dataset.val);
            group.querySelectorAll('.fb-star').forEach(s => {
              s.style.color = parseInt(s.dataset.val) <= ratings[key] ? '#c9a84c' : 'rgba(255,255,255,0.2)';
            });
          });
        });
      });
      const fbSubmitBtn = fbWidget.querySelector('#fb-submit');
      const fbErrorEl   = fbWidget.querySelector('#fb-error');
      if (fbSubmitBtn) fbSubmitBtn.addEventListener('click', async () => {
        if (fbErrorEl) { fbErrorEl.style.display = 'none'; fbErrorEl.textContent = ''; }
        fbSubmitBtn.disabled = true; fbSubmitBtn.textContent = '送信中...';
        try {
          const fbRes = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              page: 'diagnosis_result',
              rating_accuracy:  ratings.accuracy  || null,
              rating_usability: ratings.usability || null,
              rating_revisit:   ratings.revisit   || null,
              comment: fbWidget.querySelector('#fb-comment')?.value?.trim() || null,
              type_code:    null,
              compass_first: compassFirst || null,
            }),
          });
          if (!fbRes.ok) {
            fbSubmitBtn.disabled = false; fbSubmitBtn.textContent = '送信する';
            if (fbErrorEl) { fbErrorEl.textContent = '送信に失敗しました。もう一度お試しください。'; fbErrorEl.style.display = 'block'; }
            return;
          }
        } catch {
          fbSubmitBtn.disabled = false; fbSubmitBtn.textContent = '送信する';
          if (fbErrorEl) { fbErrorEl.textContent = 'ネットワークエラーが発生しました。'; fbErrorEl.style.display = 'block'; }
          return;
        }
        localStorage.setItem('fineme:feedback:diagnosis_result', '1');
        fbWidget.innerHTML = '<div style="padding:16px 0;text-align:center;color:rgba(201,168,76,0.9);font-size:14px;font-weight:700">フィードバックを送りました。ありがとうございます 🙏</div>';
      });
    }

    // ── タイプカード画像保存 ──
    const shareTypeCardBtn = document.getElementById('share-type-card-btn');
    if (shareTypeCardBtn) {
      shareTypeCardBtn.addEventListener('click', async () => {
        const tc  = shareTypeCardBtn.dataset.typeCode;
        const dc  = shareTypeCardBtn.dataset.displayCode || tc;
        const cr  = shareTypeCardBtn.dataset.creature;
        const col = shareTypeCardBtn.dataset.color;
        const tl  = shareTypeCardBtn.dataset.tagline;
        shareTypeCardBtn.textContent = '生成中...';
        shareTypeCardBtn.disabled = true;

        try {
          // 画像を先にロード（CORSあり）
          const typeImg = new Image();
          typeImg.crossOrigin = 'anonymous';
          await new Promise(res => { typeImg.onload = res; typeImg.onerror = res; typeImg.src = `/images/types/belle/TYPE-${tc}.webp`; });

          const W = 540, S = 2;
          // テキスト行数を事前計測してカード高さを動的算出
          const tmpCtx = document.createElement('canvas').getContext('2d');
          tmpCtx.font = '13px system-ui,-apple-system,sans-serif';
          let lineCount = 0, tmpLine = '';
          for (const ch of tl) {
            const t = tmpLine + ch;
            if (tmpCtx.measureText(t).width > 420) { lineCount++; tmpLine = ch; }
            else { tmpLine = t; }
          }
          if (tmpLine) lineCount++;
          const H = Math.max(720, 36 + 320 + 26 + 42 + 18 + 22 + lineCount * 20 + 60);
          const canvas = document.createElement('canvas');
          canvas.width = W * S; canvas.height = H * S;
          const ctx = canvas.getContext('2d');
          ctx.scale(S, S);

          // 背景
          ctx.fillStyle = '#0a0f1e';
          ctx.fillRect(0, 0, W, H);

          // 上部グロー
          const grd = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 240);
          grd.addColorStop(0, col + '55'); grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

          // 画像エリア（240×320, 3:4）
          const iW = 240, iH = 320, iX = (W - iW) / 2, iY = 36;

          // 角丸クリップ用ヘルパー
          function rRect(cx, x, y, w, h, r) {
            cx.beginPath();
            if (cx.roundRect) { cx.roundRect(x,y,w,h,r); return; }
            cx.moveTo(x+r,y); cx.lineTo(x+w-r,y); cx.arcTo(x+w,y,x+w,y+r,r);
            cx.lineTo(x+w,y+h-r); cx.arcTo(x+w,y+h,x+w-r,y+h,r);
            cx.lineTo(x+r,y+h); cx.arcTo(x,y+h,x,y+h-r,r);
            cx.lineTo(x,y+r); cx.arcTo(x,y,x+r,y,r); cx.closePath();
          }

          // 画像をobject-fit:cover相当で描画
          ctx.save(); rRect(ctx, iX, iY, iW, iH, 18); ctx.clip();
          if (typeImg.naturalWidth > 0) {
            const sW = typeImg.naturalWidth, sH = typeImg.naturalHeight;
            const sR = sW / sH, dR = iW / iH;
            let sx = 0, sy = 0, sw = sW, sh = sH;
            if (sR > dR) { sw = sH * dR; sx = (sW - sw) / 2; }
            else { sh = sW / dR; sy = (sH - sh) / 2; }
            ctx.drawImage(typeImg, sx, sy, sw, sh, iX, iY, iW, iH);
          } else {
            ctx.fillStyle = col + '22'; ctx.fillRect(iX, iY, iW, iH);
          }
          ctx.restore();

          // 画像ボーダー
          ctx.strokeStyle = col + '66'; ctx.lineWidth = 2;
          rRect(ctx, iX, iY, iW, iH, 18); ctx.stroke();

          // TYPE コード
          let ty = iY + iH + 26;
          ctx.globalAlpha = 0.7; ctx.fillStyle = col;
          ctx.font = '700 11px system-ui,-apple-system,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TYPE-' + dc, W/2, ty); ctx.globalAlpha = 1;

          // クリーチャー名
          ty += 42;
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 34px system-ui,-apple-system,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cr, W/2, ty);

          // 区切り線
          ty += 18;
          ctx.strokeStyle = col + '44'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(W/2-50, ty); ctx.lineTo(W/2+50, ty); ctx.stroke();

          // 説明文（全文・折り返し）
          ty += 22;
          ctx.fillStyle = 'rgba(232,228,220,0.55)';
          ctx.font = '13px system-ui,-apple-system,sans-serif';
          ctx.textAlign = 'center';
          let line = '';
          for (const ch of tl) {
            const test = line + ch;
            if (ctx.measureText(test).width > 420) { ctx.fillText(line, W/2, ty); line = ch; ty += 20; }
            else { line = test; }
          }
          if (line) ctx.fillText(line, W/2, ty);
          ty += 20;

          // フッター
          ctx.globalAlpha = 0.3; ctx.fillStyle = col;
          ctx.font = '800 11px system-ui,-apple-system,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('FINEME.ME', W/2, H - 24);
          ctx.globalAlpha = 1;

          const link = document.createElement('a');
          link.download = 'fineme-type-' + tc + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        } catch (e) { console.error('share card error:', e); }

        shareTypeCardBtn.innerHTML = '📷 カードを画像保存';
        shareTypeCardBtn.disabled = false;
      });
    }

    // ── Xシェアボタン生成 ──
    const shareBlock = document.getElementById('share-block');
    if (shareBlock) {
      const ogUrl = `https://www.fineme.me/api/og/diagnosis?compass=${encodeURIComponent(identityAxis)}&type=${encodeURIComponent(typeIdentity?.displayCode||'')}&name=${encodeURIComponent(typeIdentity?.fullName||'')}&goal=${encodeURIComponent(p.goal_change||'')}&trigger=${encodeURIComponent(p.trigger||'')}`;
      const axisLabel = AREA_DEFS[compassFirst]?.label || '外見';
      const shareText = typeIdentity
        ? `Me Scan を受けた。\n私は「${typeIdentity.fullName}」だった。\n最初の一手は「${axisLabel}」から。\n\n136タイプ、あなたはどれ？👇\n#Fineme`
        : `Me Scan を受けた。\n今の私に一番効くのは「${axisLabel}」からだった。\n\nあなたも試してみて👇\n#Fineme`;
      const shareUrl = `https://www.fineme.me/belle/diagnosis`;
      const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      shareBlock.innerHTML = `
        <a href="${twitterHref}" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:10px;padding:13px 28px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          この診断結果をXでシェアする
        </a>
        <p style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:10px;">シェアするとあなたのタイプが表示されます</p>
      `;
    }

    // Compass override チップ
    document.querySelectorAll('.compass-override-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.dataset.axis;
        if (!axis || !AREA_DEFS[axis]) return;
        localStorage.setItem('fineme:compass:override', axis);
        // 診断データにも反映（New Me Mapが読む用）
        try {
          const raw = localStorage.getItem('fineme:diagnosis:belle');
          if (raw) {
            const d = JSON.parse(raw);
            d.compass_first = axis;
            localStorage.setItem('fineme:diagnosis:belle', JSON.stringify(d));
          }
        } catch {}
        location.reload();
      });
    });
    document.getElementById('compass-reset-btn')?.addEventListener('click', () => {
      localStorage.removeItem('fineme:compass:override');
      // 診断データのcompass_firstを元の計算値に戻す
      try {
        const raw = localStorage.getItem('fineme:diagnosis:belle');
        if (raw) {
          const d = JSON.parse(raw);
          d.compass_first = compassCalculated;
          localStorage.setItem('fineme:diagnosis:belle', JSON.stringify(d));
        }
      } catch {}
      location.reload();
    });

    // 保存ボタン
    const saveBtn = document.getElementById('btn-save-map');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        try {
          const arr = JSON.parse(localStorage.getItem('fineme:saved:diagnoses') || '[]');
          arr.unshift({ savedAt: new Date().toISOString(), profile: p });
          if (arr.length > 20) arr.length = 20;
          localStorage.setItem('fineme:saved:diagnoses', JSON.stringify(arr));
          saveBtn.textContent = '保存しました ✓';
          saveBtn.style.opacity = '.6';
          saveBtn.style.pointerEvents = 'none';
        } catch {}
      });
    }

    loadMatchedProviders();

    // LINEリマインド登録（ログイン済み・LINE連携済みユーザーのみ有効）
    if (isLoggedIn && authToken) {
      fetch('/api/me/line-diagnosis-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ compass_first: p?.compass_first || null }),
      }).catch(() => {});
    }

    })(); // async IIFE end

    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <>
      <style>{`
        .result-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; overflow-x: hidden; width: 100%; box-sizing: border-box; }
        /* グリッド子要素のはみ出し防止用ルールは削除した。子は.result-sidenavと
           直下divのみで、どちらも自分のルール／インラインstyleで既にmin-width:0を
           持つため冗長だった上、直接子孫を選ぶ記号を使うとJSXのstyleタグ内では
           SSR時にエンティティへ変換されてしまいhydrationミスマッチを起こしていた
           （でお報告2026-08-27の原因。stackタグ内では記号そのものを書かないこと） */
        .result-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; min-width: 0; }
        .result-sidenav .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .result-sidenav .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .result-sidenav .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        @media (max-width: 640px) {
          .result-layout { grid-template-columns: 1fr; padding: 16px 16px 60px; overflow-x: hidden; }
          .result-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
          .result-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; }
          .result-sidenav nav::-webkit-scrollbar { display: none; }
          .result-sidenav nav .sidenav-link { margin-top: 0 !important; }
          .result-sidenav .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; }
          .map-wrap { padding: 0 0 40px !important; width: 100%; box-sizing: border-box; overflow-x: hidden; }
        }
        .bl-navi-section { margin-bottom: 28px; }
        .bl-axis-group { margin-bottom: 18px; }
        .bl-axis-group.bl-axis-done { opacity: 0.5; }
        .bl-axis-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 2px; }
        .bl-axis-label { font-size: 12px; font-weight: 800; color: rgba(232,228,220,0.75); }
        .bl-axis-count { font-size: 11px; color: rgba(201,168,76,0.7); font-weight: 700; }
        .bl-scroll-row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .bl-scroll-row::-webkit-scrollbar { height: 3px; }
        .bl-scroll-row::-webkit-scrollbar-track { background: transparent; }
        .bl-scroll-row::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        .bl-card { flex: 0 0 200px; scroll-snap-align: start; background: rgba(10,15,30,0.55); border: 1px solid rgba(232,228,220,0.12); border-radius: 12px; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; transition: border-color .15s; }
        .bl-card:hover { border-color: rgba(201,168,76,0.35); }
        .bl-card-done { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.25); }
        .bl-card-check { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid rgba(232,228,220,0.25); background: rgba(10,15,30,0.65); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #10b981; flex-shrink: 0; transition: all .15s; cursor: pointer; }
        .bl-card-check.checked { background: #10b981; border-color: #10b981; color: #fff; }
        .bl-card-text { font-size: 12px; color: rgba(232,228,220,0.75); line-height: 1.55; flex: 1; }
        .bl-card-done .bl-card-text { text-decoration: line-through; color: #9ca3af; }
      `}</style>
      <main style={{overflowX:'hidden', width:'100%'}}>
        <div className="result-layout">
          <aside className="result-sidenav">
            <nav className="stack" style={{ gap: '4px' }}>
              <Link href="/mypage" className="sidenav-link">ホーム</Link>
              <Link href="/mypage/mirror" className="sidenav-link">Mirror履歴</Link>
              <Link href="/belle/diagnosis/result" className="sidenav-link sidenav-link--active">New Me Navi</Link>
              <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
              <Link href="/mypage/log" className="sidenav-link">New Me Log</Link>
              <Link href="/mypage/subscription" className="sidenav-link">サブスク設定</Link>
              <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
              <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
              <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
              <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
              <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            </nav>
          </aside>
          <div style={{minWidth: 0, overflow: 'hidden'}}>
            <div id="result-root">
              <p style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}>読み込み中…</p>
            </div>
            <LocationPrompt accessToken={accessToken} />
          </div>
        </div>
      </main>
    </>
  );
}
