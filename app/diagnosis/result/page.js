'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LocationPrompt } from '@/app/_components/LocationPrompt';

export default function DiagnosisResultPage() {
  const initialized = useRef(false);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── ページ固有スタイル ───
    const style = document.createElement('style');
    style.textContent = `
      .map-wrap { max-width: 680px; margin: 0 auto; padding: 32px 20px 80px; }

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

      /* ── Voyage route connector ── */
      .v-route { display: flex; flex-direction: column; align-items: center; height: 28px; margin: -4px auto 0; width: 16px; }
      .v-route-line { flex: 1; width: 1px; background: repeating-linear-gradient(to bottom, rgba(201,168,76,0.55) 0, rgba(201,168,76,0.55) 4px, transparent 4px, transparent 9px); }
      .v-route-dot { width: 7px; height: 7px; background: rgba(201,168,76,0.7); border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(201,168,76,0.4); }

      /* ── 商品カルーセル ── */
      .product-carousel-section { margin: 28px 0; }
      .product-carousel-label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(16,185,129,0.65); margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
      .product-carousel-note { font-size: 11px; color: rgba(232,228,220,0.35); margin: 0 0 12px; line-height: 1.5; }
      .product-carousel { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; scrollbar-width: none; -ms-overflow-style: none; }
      .product-carousel::-webkit-scrollbar { display: none; }
      .product-card { flex-shrink: 0; width: 160px; scroll-snap-align: start; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.18); border-radius: 12px; padding: 14px 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s; text-decoration: none; }
      .product-card:hover { border-color: rgba(16,185,129,0.45); }
      .product-card-axis { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(16,185,129,0.55); }
      .product-card-name { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.85); line-height: 1.45; flex: 1; }
      .product-card-cta { font-size: 11px; font-weight: 700; color: rgba(16,185,129,0.75); display: flex; align-items: center; gap: 3px; }
    `;
    document.head.appendChild(style);

    // ─── ユーティリティ ───
    function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ─── 軸別おすすめ商品（Amazonアフィリエイト）───
    const AXIS_PRODUCTS = {
      skin:    [
        { name: '肌ラボ 極潤 洗顔フォーム',          url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+洗顔&tag=whero523-22' },
        { name: '肌ラボ 極潤 ヒアルロン液（化粧水）', url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+化粧水&tag=whero523-22' },
        { name: 'ビオレUV アクアリッチ（日焼け止め）', url: 'https://www.amazon.co.jp/s?k=ビオレUV+アクアリッチ&tag=whero523-22' },
      ],
      eyebrow: [
        { name: 'スクリューブラシ（眉整え）',          url: 'https://www.amazon.co.jp/s?k=スクリューブラシ+眉&tag=whero523-22' },
        { name: '眉用ハサミ（ステンレス）',            url: 'https://www.amazon.co.jp/s?k=眉用はさみ+ステンレス&tag=whero523-22' },
      ],
      hair:    [
        { name: 'BOTANIST ボタニカルシャンプー',       url: 'https://www.amazon.co.jp/s?k=BOTANIST+シャンプー+メンズ&tag=whero523-22' },
        { name: 'ウーノ スーパーハード（スタイリング）', url: 'https://www.amazon.co.jp/s?k=ウーノ+スーパーハード&tag=whero523-22' },
        { name: '洗い流さないトリートメント',           url: 'https://www.amazon.co.jp/s?k=洗い流さないトリートメント+メンズ&tag=whero523-22' },
      ],
      body:    [
        { name: 'ザバス ホエイプロテイン',             url: 'https://www.amazon.co.jp/s?k=ザバスホエイプロテイン&tag=whero523-22' },
        { name: 'タニタ 体組成計',                    url: 'https://www.amazon.co.jp/s?k=タニタ+体組成計&tag=whero523-22' },
        { name: 'トレーニングウェア（メンズ）',         url: 'https://www.amazon.co.jp/s?k=メンズ+トレーニングウェア&tag=whero523-22' },
      ],
      teeth:   [
        { name: 'アパガード プレミオ（歯磨き粉）',      url: 'https://www.amazon.co.jp/s?k=アパガード+プレミオ&tag=whero523-22' },
        { name: 'GUM デンタルフロス',                 url: 'https://www.amazon.co.jp/s?k=GUM+デンタルフロス&tag=whero523-22' },
        { name: 'オーラルB 電動歯ブラシ',             url: 'https://www.amazon.co.jp/s?k=オーラルB+電動歯ブラシ&tag=whero523-22' },
      ],
      nail:    [
        { name: 'OPI プロスパ ネイルオイル',           url: 'https://www.amazon.co.jp/s?k=OPI+ネイルオイル&tag=whero523-22' },
        { name: 'ニベア ハンドクリーム',               url: 'https://www.amazon.co.jp/s?k=ニベア+ハンドクリーム&tag=whero523-22' },
        { name: 'ガラス製爪やすり',                   url: 'https://www.amazon.co.jp/s?k=ガラス製+爪やすり&tag=whero523-22' },
      ],
      fashion: [
        { name: 'ステンカラーコート（ベーシック）',     url: 'https://www.amazon.co.jp/s?k=ステンカラーコート+メンズ&tag=whero523-22' },
        { name: '白シャツ（ジャストサイズ）',           url: 'https://www.amazon.co.jp/s?k=白シャツ+メンズ+スリム&tag=whero523-22' },
      ],
    };

    function buildProductCarousel(axes) {
      const cards = axes
        .filter(id => AXIS_PRODUCTS[id])
        .flatMap(id => {
          const def = { body:'体型', skin:'肌', eyebrow:'眉', hair:'髪', teeth:'歯', nail:'爪', fashion:'服' }[id] || id;
          return AXIS_PRODUCTS[id].map(p =>
            `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="product-card">
              <span class="product-card-axis">${esc(def)}</span>
              <span class="product-card-name">${esc(p.name)}</span>
              <span class="product-card-cta">Amazonで見る →</span>
            </a>`
          );
        }).join('');
      if (!cards) return '';
      return `
        <div class="product-carousel-section">
          <p class="product-carousel-label">🛒 旅に役立つグッズ</p>
          <p class="product-carousel-note">あなたの診断結果に関連するアイテムです（Amazonアフィリエイト）← スワイプで全部見る</p>
          <div class="product-carousel">${cards}</div>
        </div>`;
    }

    // ─── データ読み込み（Supabase優先 → localStorage fallback）───
    ;(async () => {
    const STORAGE_KEY = 'fineme:diagnosis:latest';
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
          const res = await fetch('/api/me/diagnosis', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) { const data = await res.json(); if (data) {
            // localStorageの方が新しい場合は上書きしない（新規診断直後を保護）
            try {
              const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
              const localAt = local?.at ? new Date(local.at).getTime() : 0;
              const remoteAt = data?.at ? new Date(data.at).getTime() : 0;
              if (remoteAt >= localAt) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
            } catch { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
          } }
        }
      }
    } catch {}
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      root.innerHTML = '<div style="text-align:center;padding:60px 20px"><p style="color:#6b7280">診断データが見つかりませんでした。</p><a href="/diagnosis" class="btn" style="margin-top:16px;display:inline-block">Me Scanを受ける</a></div>';
      return;
    }
    let p;
    try { p = JSON.parse(raw); } catch {
      root.innerHTML = '<div style="text-align:center;padding:60px 20px"><p>エラーが発生しました。</p><a href="/diagnosis" class="btn" style="margin-top:16px;display:inline-block">再スキャンする</a></div>';
      return;
    }

    // 旧フォーマット検出（transform_vectorsがない場合）
    if (!p.transform_vectors) {
      root.innerHTML = `<div style="text-align:center;padding:60px 20px">
        <p style="font-size:32px;margin-bottom:16px">🗺️</p>
        <h2 style="font-size:20px;font-weight:800;margin:0 0 10px">新しいMe Scanで地図を生成しよう</h2>
        <p style="color:#6b7280;font-size:14px;line-height:1.75;margin:0 0 24px">診断をアップデートしました。<br>新しいMe Scanで、あなただけの変容マップを作成します。</p>
        <a href="/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（新版）</a>
      </div>`;
      return;
    }

    // ─── 定数・マッピング ───
    const AREA_DEFS = {
      body:    { icon:'💪', label:'体型', catLink:'gym',          tier:1 },
      eyebrow: { icon:'✂️', label:'眉',   catLink:'eyebrow',     tier:1 },
      fashion: { icon:'👔', label:'服',   catLink:'fashion',      tier:1 },
      hair:    { icon:'💇', label:'髪',   catLink:'hair',         tier:1 },
      skin:    { icon:'✨', label:'肌',   catLink:'esthetic',     tier:2 },
      teeth:   { icon:'🦷', label:'歯',   catLink:'whitening',    tier:3 },
      nail:    { icon:'💅', label:'爪',   catLink:'nail',         tier:4 },
    };
    const TIER_LABELS = { 1:'基盤', 2:'深化', 3:'補完', 4:'磨き込み' };
    const PATH_LABELS = { virgin:'未経験', quit:'試したが続かない', blind:'非客観視', lapsed:'以前やっていた' };
    const PATH_COLORS = { virgin:'rgba(201,168,76,0.12):#c9a84c', quit:'#fee2e2:#b91c1c', blind:'#f5f0e8:#7a6e65', lapsed:'#d1fae5:#065f46' };
    const VIEW_ALERTS = {
      worse:   '⚠️ 他者評価が自己評価より低い可能性',
      unknown: '💡 客観的フィードバックを得たことがない',
    };

    const tv = p.transform_vectors || {};
    const priorityOrder = p.priority_order || [];
    const compassCalculated = p.compass_first || priorityOrder[0] || 'body';
    const compassOverride = localStorage.getItem('fineme:compass:override');
    const isOverrideActive = !!(compassOverride && AREA_DEFS[compassOverride]);
    const compassFirst = isOverrideActive ? compassOverride : compassCalculated;

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
      const icons  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
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
      return `
        <p class="sec-label" style="margin-top:28px">Fineme Compass</p>
        <div class="compass-card">
          <div class="compass-eyebrow">今向くべき方角</div>
          <div class="compass-main">${esc(def.icon)} ${esc(def.label)}</div>
          ${overrideNote}
          <div class="compass-reason" style="margin-top:12px">${COMPASS_REASONS[compassFirst] || ''}${urgencyNote}${pathActionNote}</div>
          <a href="/mypage/navi" class="compass-cta">変容ロードマップを見る →</a>
          <a href="/search?category=${esc(def.catLink)}&diag=1" style="display:inline-block;margin-top:8px;font-size:12px;color:#6b7280;text-decoration:none;" onmouseover="this.style.color='#c9a84c'" onmouseout="this.style.color='#6b7280'">このカテゴリのプロを探すなら →</a>

          <div style="margin-top:20px;padding-top:18px;border-top:1px solid rgba(201,168,76,0.2);">
            <p style="font-size:12px;font-weight:800;color:rgba(201,168,76,0.8);margin:0 0 10px;letter-spacing:.06em;display:flex;align-items:center;gap:6px"><span>🔄</span> 最初の一手を自分で選ぶ</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${overrideChips}</div>
          </div>
        </div>
      `;
    }

    // ─── 変容ベクトルリスト ───
    function buildVectorList() {
      if (!priorityOrder.length) return '';
      const topAreas = priorityOrder.filter(id => AREA_DEFS[id]).slice(0, 5);
      if (!topAreas.length) return '';

      const CARE_LABELS = { none:'未着手', concerned:'気になっている', self:'自己ケア中', pro:'プロ通い中' };

      const rows = topAreas.map((id, idx) => {
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
      if (p.aga_concern === 'yes') traits.push('AGAや薄毛に詳しい、または連携先を知っている');
      const unique = [...new Set(traits)].slice(0, 4);
      if (!unique.length) return '';
      return `
        <p class="sec-label" style="margin-top:28px">Pro Matching</p>
        <div class="result-card">
          <div class="result-card-title">🧭 この旅に合うガイドの条件</div>
          <div class="result-card-subtitle">この条件を持つプロとの相性がいい。サービス選びの判断軸にしてほしい</div>
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
                  <div class="pmc-meta">${esc(prov.area||'')}${prov.price_from?` ・ ¥${Number(prov.price_from).toLocaleString()}〜`:''}</div>
                </div>
                <div class="pmc-arrow">→</div>
              </a>
            `).join('')}
          </div>
        `;
      } catch {}
    }

    // ─── HTML組み立て ───
    const hero = getHeroContent();
    const compassFirstDef = AREA_DEFS[compassFirst] || {};

    const html = `
      <div class="map-hero">
        <p class="map-hero-eyebrow">New Me Map</p>
        <div class="map-hero-badge">🗺️ あなたの変容プロファイル</div>
        <h1>${hero.h1}</h1>
        <div class="map-hero-divider"></div>
        <p style="font-size:11px;color:rgba(255,255,255,.4);margin:0 0 10px;position:relative;z-index:1;letter-spacing:.06em">— 今日、あなたの地図が描かれました —</p>
        <p class="map-hero-sub">${hero.sub}</p>
        <svg viewBox="0 0 80 80" width="68" height="68" style="position:absolute;top:14px;right:14px;z-index:1;opacity:0.17" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="37" fill="none" stroke="#c9a84c" stroke-width="0.8"/><circle cx="40" cy="40" r="28" fill="none" stroke="#c9a84c" stroke-width="0.4"/><line x1="40" y1="3" x2="40" y2="77" stroke="#c9a84c" stroke-width="0.8"/><line x1="3" y1="40" x2="77" y2="40" stroke="#c9a84c" stroke-width="0.8"/><line x1="14" y1="14" x2="66" y2="66" stroke="#c9a84c" stroke-width="0.5"/><line x1="66" y1="14" x2="14" y2="66" stroke="#c9a84c" stroke-width="0.5"/><polygon points="40,4 37,23 40,19 43,23" fill="#c9a84c"/><polygon points="40,76 37,57 40,61 43,57" fill="#c9a84c" opacity="0.4"/><polygon points="76,40 57,37 61,40 57,43" fill="#c9a84c" opacity="0.4"/><polygon points="4,40 23,37 19,40 23,43" fill="#c9a84c" opacity="0.4"/><circle cx="40" cy="40" r="5" fill="none" stroke="#c9a84c" stroke-width="1.2"/><circle cx="40" cy="40" r="2" fill="#c9a84c"/></svg>
        <div style="position:absolute;bottom:14px;right:18px;font-size:8px;font-family:'Courier New',monospace;color:rgba(201,168,76,0.42);letter-spacing:.07em;z-index:1">N 35°40′ / E 139°46′</div>
      </div>

      <div class="v-route"><div class="v-route-line"></div><div class="v-route-dot"></div><div class="v-route-line"></div></div>

      ${buildCompass()}

      <p class="sec-label" style="margin-top:28px">Radar Map</p>
      <div class="radar-card">
        <div class="radar-title">📡 7軸変容レーダー</div>
        <div class="radar-subtitle">現在地（紺）と理想（金点線）。面積の差が変容の余白</div>
        ${buildRadarChart()}
      </div>

      <div class="v-route"><div class="v-route-line"></div><div class="v-route-dot"></div><div class="v-route-line"></div></div>
      ${buildVectorList()}
      ${buildGoalLayers()}
      ${buildBarrier()}
      ${buildTraits()}

      <div id="match-providers-slot"></div>

      ${!isLoggedIn ? `
      <div class="save-map-cta">
        <div class="save-map-cta-icon">🧬</div>
        <div class="save-map-cta-body">
          <div class="save-map-cta-title">この変容プロファイルを保存する</div>
          <div class="save-map-cta-desc">今このページを閉じると、あなたの地図は消えます。<br>無料登録すれば、どこからでも続きを見られます。</div>
          <a href="/login?mode=signup&next=/diagnosis/result" class="save-map-cta-btn">無料アカウントを作って保存する →</a>
          <p class="save-map-cta-note">登録すると診断データがクラウドに同期され、スマホ・PCどこからでも閲覧できます</p>
        </div>
      </div>
      ` : ''}

      <div class="navi-section">
        <div class="navi-section-label">🗺️ 次の行き先</div>
        <a href="/mypage/navi" class="navi-btn navi-btn-primary">
          <span class="navi-btn-icon">📋</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">出発前チェックを確認する</span>
            <span class="navi-btn-desc">旅を始める前に、今の自分の状態を確認しよう（任意・全部揃わなくてもOK）</span>
          </span>
          <span class="navi-btn-arrow">→</span>
        </a>
        <a href="/mypage/navi" class="navi-btn navi-btn-secondary">
          <span class="navi-btn-icon">🧭</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">New Me Naviを見る</span>
            <span class="navi-btn-desc">7軸それぞれの変容トラックと、今向くべき方角が常に見える</span>
          </span>
          <span class="navi-btn-arrow">→</span>
        </a>
        <a href="/guide" class="navi-btn navi-btn-secondary">
          <span class="navi-btn-icon">🗺️</span>
          <span class="navi-btn-body">
            <span class="navi-btn-title">7軸変容ガイドを読む</span>
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

      <div style="position:relative;opacity:0.45;pointer-events:none;user-select:none;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:16px;padding:18px 20px;background:rgba(10,15,30,0.55);border:1px solid rgba(201,168,76,0.2);border-radius:14px">
          <span style="font-size:28px;flex-shrink:0">🪞</span>
          <div style="flex:1">
            <p style="font-size:10px;font-weight:800;letter-spacing:.14em;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:0 0 4px">New Me Mirror — オプション</p>
            <p style="font-size:14px;font-weight:700;color:rgba(232,228,220,0.9);margin:0 0 3px">写真でも変容余地を確認する</p>
            <p style="font-size:12px;color:rgba(232,228,220,0.5);margin:0;line-height:1.5">診断結果と照らし合わせて、AIが写真から変容余地マップを生成。</p>
          </div>
          <span style="font-size:11px;font-weight:800;color:rgba(232,228,220,0.6);background:rgba(232,228,220,0.1);border:1px solid rgba(232,228,220,0.2);border-radius:20px;padding:4px 12px;flex-shrink:0;letter-spacing:.06em">Coming soon</span>
        </div>
      </div>

      ${buildProductCarousel(priorityOrder.filter(id => AXIS_PRODUCTS[id]).slice(0, 5))}

      <div id="share-block" style="margin: 0 0 20px; text-align: center;"></div>

      <div class="cta-block">
        <div class="cta-section">
          <button id="btn-save-map" class="cta-btn-secondary" type="button">この地図を保存する</button>
          <div class="cta-divider"></div>
          <a href="/diagnosis" class="cta-btn-ghost">地図を更新する（Me Scan 再スキャン）</a>
        </div>
      </div>
    `;

    root.innerHTML = html;

    // ── Xシェアボタン生成 ──
    const shareBlock = document.getElementById('share-block');
    if (shareBlock) {
      const ogUrl = `https://www.fineme.me/api/og/diagnosis?compass=${encodeURIComponent(compassFirst)}&goal=${encodeURIComponent(p.goal_change||'')}&trigger=${encodeURIComponent(p.trigger||'')}`;
      const axisLabel = AREA_DEFS[compassFirst]?.label || '外見';
      const shareText = `Me Scan を受けた。\n今の私に一番効くのは「${axisLabel}」からだった。\n\nあなたも試してみて👇\n`;
      const shareUrl = `https://www.fineme.me/diagnosis`;
      const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      shareBlock.innerHTML = `
        <a href="${twitterHref}" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:10px;padding:13px 28px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:background 0.15s;"
          onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.07)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          この診断結果をXでシェアする
        </a>
        <p style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:10px;">シェアするとあなたのCompass軸が表示されます</p>
      `;
    }

    // Compass override チップ
    document.querySelectorAll('.compass-override-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.dataset.axis;
        if (!axis || !AREA_DEFS[axis]) return;
        localStorage.setItem('fineme:compass:override', axis);
        // 診断データにも反映（New Me Naviが読む用）
        try {
          const raw = localStorage.getItem('fineme:diagnosis:latest');
          if (raw) {
            const d = JSON.parse(raw);
            d.compass_first = axis;
            localStorage.setItem('fineme:diagnosis:latest', JSON.stringify(d));
          }
        } catch {}
        location.reload();
      });
    });
    document.getElementById('compass-reset-btn')?.addEventListener('click', () => {
      localStorage.removeItem('fineme:compass:override');
      // 診断データのcompass_firstを元の計算値に戻す
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (raw) {
          const d = JSON.parse(raw);
          d.compass_first = compassCalculated;
          localStorage.setItem('fineme:diagnosis:latest', JSON.stringify(d));
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
        .result-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
        .result-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        .result-sidenav .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .result-sidenav .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .result-sidenav .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        @media (max-width: 640px) {
          .result-layout { grid-template-columns: 1fr; padding: 16px 16px 60px; }
          .result-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
          .result-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; }
          .result-sidenav nav::-webkit-scrollbar { display: none; }
          .result-sidenav nav > * { margin-top: 0 !important; }
          .result-sidenav .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; }
          .map-wrap { padding: 0 0 40px !important; }
        }
      `}</style>
      <main>
        <div className="result-layout">
          <aside className="result-sidenav">
            <nav className="stack" style={{ gap: '4px' }}>
              <Link href="/mypage" className="sidenav-link">ホーム</Link>
              <Link href="/diagnosis/result" className="sidenav-link sidenav-link--active">New Me Map</Link>
              <Link href="/mypage/navi" className="sidenav-link">New Me Navi</Link>
              <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
              <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
              <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
              <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
              <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            </nav>
          </aside>
          <div>
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
