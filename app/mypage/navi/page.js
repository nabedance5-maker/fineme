'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// 軸 → 関連カテゴリのマッピング（記事のcategoryフィールドと照合）
const AXIS_RELATED_CATS = {
  hair:    ['清潔感', '垢抜け'],
  skin:    ['清潔感'],
  eyebrow: ['清潔感', '垢抜け'],
  fashion: ['垢抜け'],
  body:    ['垢抜け'],
  teeth:   [],
  nail:    [],
};

export default function NewMeNaviPage() {
  const initialized = useRef(false);
  const [relatedArticles, setRelatedArticles] = useState([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .navi-wrap { max-width: 100%; margin: 0; padding: 24px 0 80px; width: 100%; box-sizing: border-box; overflow-x: hidden; }
      #navi-root { width: 100%; overflow-x: hidden; box-sizing: border-box; }
      #navi-root * { max-width: 100%; box-sizing: border-box; }

      /* ── Navi Header ── */
      .navi-header { padding: 24px 24px 20px; background: linear-gradient(rgba(10,15,30,0.78), rgba(10,15,30,0.88)), url('/assets/images/hero-bg.webp') center / cover no-repeat; border-radius: 14px; margin-bottom: 24px; position: relative; overflow: hidden; border: 1px solid rgba(201,168,76,0.2); }
      .navi-header::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(201,168,76,.1) 0%, transparent 70%); border-radius: 50%; }
      .navi-header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 10px; text-transform: uppercase; position: relative; z-index: 1; }
      .navi-header-badge { display: none; }
      .navi-header h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(16px,4vw,22px); font-weight: 700; color: #fff; margin: 0 0 10px; line-height: 1.55; position: relative; z-index: 1; }
      .navi-header h1 em { font-style: normal; color: #c9a84c; }
      .navi-header-sub { display: none; }

      /* ── Progress bar ── */
      .progress-bar-wrap { margin-top: 18px; position: relative; z-index: 1; }
      .progress-bar-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .progress-bar-label-text { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.8); letter-spacing: .08em; text-transform: uppercase; }
      .progress-bar-pct { font-size: 13px; font-weight: 900; color: #c9a84c; }
      .progress-bar-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
      .progress-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgba(201,168,76,0.7), #c9a84c); transition: width 1s cubic-bezier(.4,0,.2,1) .5s; }
      .progress-bar-sub { font-size: 11px; color: rgba(255,255,255,.35); margin: 5px 0 0; }
      .step-hint { font-size: 11px; color: rgba(232,228,220,0.45); margin: 4px 0 0; line-height: 1.6; padding-left: 2px; }
      .step-hint::before { content: '→ '; color: rgba(201,168,76,0.5); font-weight: 700; }

      /* ── Compass strip ── */
      .compass-strip { background: rgba(201,168,76,0.06); border: 1.5px solid rgba(201,168,76,0.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
      .compass-strip-icon { font-size: 28px; flex-shrink: 0; }
      .compass-strip-body { flex: 1; }
      .compass-strip-label { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.7); letter-spacing: .1em; margin: 0 0 3px; text-transform: uppercase; }
      .compass-strip-text  { font-size: 15px; font-weight: 900; color: rgba(232,228,220,0.90); margin: 0; }
      .compass-strip-cta { font-size: 12px; font-weight: 700; padding: 7px 14px; border: 1.5px solid #c9a84c; color: #c9a84c; background: transparent; border-radius: 8px; text-decoration: none; white-space: nowrap; flex-shrink: 0; transition: all .15s; }
      .compass-strip-cta:hover { background: #c9a84c; color: #0a0f1e; }

      /* ── Section label ── */
      .sec-label { display: flex; align-items: center; gap: 10px; font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: rgba(201,168,76,0.7); margin: 0 0 14px; padding-left: 0; }
      .sec-label::before { content: ''; width: 18px; height: 1.5px; background: #c9a84c; border-radius: 1px; flex-shrink: 0; }
      .sec-label::after { content: ''; flex: 1; height: 1px; background: repeating-linear-gradient(90deg, rgba(201,168,76,0.45) 0, rgba(201,168,76,0.45) 5px, transparent 5px, transparent 11px); }

      /* ── Track card ── */
      .track-list { display: flex; flex-direction: column; gap: 16px; }
      .track-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.15); border-radius: 14px; padding: 22px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); backdrop-filter: blur(8px); }
      .track-card.tier-1 { border-color: rgba(201,168,76,0.45); }
      .track-card.tier-2 { border-color: #a7f3d0; }
      .track-card.tier-3 { border-color: #fde68a; }
      .track-card.tier-4 { opacity: .42; filter: grayscale(.7); transition: opacity .3s, filter .3s; }
      .track-card.tier-4.tier-revealed { opacity: 1; filter: none; }
      .tier-reveal-banner { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(10,15,30,0.50); border: 1px dashed rgba(232,228,220,0.20); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: rgba(232,228,220,0.40); }
      .tier-reveal-btn { font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.55); background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.15); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; }
      .tier-reveal-btn:hover { border-color: #c9a84c; color: #c9a84c; }
      .track-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .track-name { font-size: 17px; font-weight: 900; color: rgba(232,228,220,0.90); display: flex; align-items: center; gap: 8px; }
      .track-tier-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; }
      .tb-1 { background: rgba(201,168,76,0.15); color: #c9a84c; border: 1px solid rgba(201,168,76,.3); }
      .tb-2 { background: #d1fae5; color: #065f46; }
      .tb-3 { background: #fef3c7; color: #92400e; }
      .tb-4 { background: rgba(232,228,220,0.10); color: rgba(232,228,220,0.55); }
      .track-care-badge { font-size: 11px; color: rgba(232,228,220,0.55); padding: 3px 9px; background: rgba(10,15,30,0.50); border: 1px solid rgba(232,228,220,0.15); border-radius: 99px; }

      /* Progress bar */
      .track-progress { margin-bottom: 16px; }
      .track-progress-labels { display: flex; justify-content: space-between; font-size: 11px; color: rgba(232,228,220,0.40); margin-bottom: 5px; }
      .track-progress-track { height: 8px; background: rgba(232,228,220,0.12); border-radius: 99px; overflow: hidden; position: relative; }
      .track-progress-current { height: 100%; border-radius: 99px; background: rgba(96,165,250,0.75); transition: width 1s cubic-bezier(.4,0,.2,1) .4s; }
      .track-progress-ideal { position: absolute; top: 0; height: 100%; width: 3px; background: #c9a84c; transform: translateX(-50%); border-radius: 1px; }

      /* Milestones */
      .milestone-list { display: flex; flex-direction: column; gap: 0; }
      .milestone-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(201,168,76,0.08); }
      .milestone-item:last-child { border-bottom: none; padding-bottom: 0; }
      .milestone-dot-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 20px; margin-top: 2px; }
      .milestone-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
      .milestone-dot.current { background: #0a0f1e; box-shadow: 0 0 0 3px rgba(10,15,30,.15); }
      .milestone-dot.future  { background: rgba(232,228,220,0.15); border: 2px solid rgba(232,228,220,0.25); }
      .milestone-dot.goal    { background: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,.25); }
      .milestone-connector { width: 2px; flex: 1; min-height: 14px; background: repeating-linear-gradient(to bottom, rgba(201,168,76,0.6) 0, rgba(201,168,76,0.6) 4px, transparent 4px, transparent 9px); margin: 2px 0; }
      .milestone-label { font-size: 10px; font-weight: 700; margin: 0 0 2px; }
      .milestone-text { font-size: 13px; color: rgba(232,228,220,0.75); line-height: 1.55; margin: 0; }
      .milestone-current-tag { display: inline-block; font-size: 10px; font-weight: 700; color: rgba(232,228,220,0.90); background: rgba(96,165,250,0.12); padding: 1px 7px; border-radius: 99px; margin-bottom: 3px; border: 1px solid rgba(96,165,250,0.30); }
      .milestone-goal-tag { display: inline-block; font-size: 10px; font-weight: 700; color: #c9a84c; background: rgba(201,168,76,0.12); padding: 1px 7px; border-radius: 99px; margin-bottom: 3px; border: 1px solid rgba(201,168,76,.3); }
      .milestone-dot.past { background: #d1fae5; border: 2px solid #6ee7b7; }

      /* ── ステップ完了チェック ── */
      .milestone-item { position: relative; }
      .step-check-btn { position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(232,228,220,0.15); background: rgba(10,15,30,0.65); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; color: rgba(232,228,220,0.25); transition: all .15s; flex-shrink: 0; font-family: 'Noto Sans JP', sans-serif; }
      .step-check-btn:hover { border-color: #10b981; color: #10b981; background: #f0fdf4; }
      .step-check-btn.checked { border-color: #10b981; background: #10b981; color: #fff; }
      .milestone-item.step-done .milestone-text { text-decoration: line-through; color: #9ca3af; }
      .milestone-item.step-done .milestone-dot:not(.current):not(.goal) { background: #6ee7b7; border: 2px solid #10b981; }

      /* ── ガイド推奨度 ── */
      .guide-badge { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 5px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; line-height: 1.4; }
      .guide-high { background: rgba(201,168,76,0.09); border: 1px solid rgba(201,168,76,0.28); color: rgba(253,230,138,0.9); }
      .guide-mid { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.22); color: rgba(147,197,253,0.85); }
      .guide-low { display: inline-flex; background: none; border: none; font-size: 11px; color: #9ca3af; padding: 2px 0; }
      .guide-find-btn { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 99px; text-decoration: none; white-space: nowrap; letter-spacing: .04em; transition: all .15s; }
      .guide-high .guide-find-btn { background: rgba(201,168,76,0.18); border: 1px solid rgba(201,168,76,0.45); color: #c9a84c; }
      .guide-high .guide-find-btn:hover { background: rgba(201,168,76,0.32); }
      .guide-mid .guide-find-btn { background: rgba(59,130,246,0.14); border: 1px solid rgba(59,130,246,0.38); color: #93c5fd; }
      .guide-mid .guide-find-btn:hover { background: rgba(59,130,246,0.25); }
      .milestone-note { font-size: 11px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; padding: 4px 8px; margin-top: 4px; }

      /* ── 商品サジェスト ── */
      .product-suggestions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
      .product-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 10px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.18); border-radius: 6px; color: rgba(200,230,215,0.75); text-decoration: none; transition: all .15s; }
      .product-chip:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.4); color: rgba(232,228,220,0.95); }
      .product-check-btn { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 4px 10px; background: transparent; border: 1px solid rgba(232,228,220,0.15); border-radius: 99px; color: rgba(232,228,220,0.30); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; white-space: nowrap; }
      .product-check-btn:hover { border-color: #10b981; color: #10b981; }
      .product-check-btn.checked { background: rgba(16,185,129,0.10); border-color: #10b981; color: #10b981; }
      .subtab-header-note { font-size: 11px; color: rgba(232,228,220,0.55); background: rgba(10,15,30,0.50); border: 1px solid rgba(232,228,220,0.15); border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }

      /* CTA inside track */
      .track-article-link { display: inline-flex; align-items: center; gap: 6px; margin: 12px 0 4px; font-size: 12px; font-weight: 600; color: rgba(201,168,76,0.7); text-decoration: none; transition: color .15s; }
      .track-article-link:hover { color: #c9a84c; }
      .track-action { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(201,168,76,0.1); display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
      .track-action-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #c9a84c; text-decoration: none; padding: 6px 12px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,.2); border-radius: 8px; transition: background .12s; }
      .track-action-link:hover { background: rgba(201,168,76,0.16); }

      /* ── 進捗ステータスボタン ── */
      .track-status-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 99px; cursor: pointer; border: 1.5px solid; transition: all .15s; background: transparent; font-family: 'Noto Sans JP', sans-serif; }
      .track-status-btn[data-status=""] { color: #9ca3af; border-color: #e5e7eb; }
      .track-status-btn[data-status=""] :hover { border-color: #c9a84c; color: #c9a84c; }
      .track-status-btn[data-status="active"] { color: #1d4ed8; border-color: #93c5fd; background: #eff6ff; }
      .track-status-btn[data-status="done"]   { color: #065f46; border-color: #6ee7b7; background: #ecfdf5; }

      /* ── Compassが指している軸のバッジ ── */
      .compass-pointing-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; color: #c9a84c; background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.3); padding: 2px 9px; border-radius: 99px; margin-left: 6px; vertical-align: middle; }

      /* ── Done状態のトラック ── */
      .track-card.status-done { opacity: 0.55; }
      .track-card.status-done .track-name { text-decoration: line-through; text-decoration-color: rgba(201,168,76,.4); }

      /* ── 折りたたみ ── */
      .milestone-list.collapsed .milestone-item:not(:first-child) { display: none; }
      .milestone-expand-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: #c9a84c; background: none; border: none; cursor: pointer; padding: 6px 0 0; font-family: 'Noto Sans JP', sans-serif; }
      .milestone-expand-btn:hover { opacity: .75; }

      /* ── サブトラックタブ ── */
      .subtab-wrap { display: flex; gap: 6px; margin-bottom: 14px; }
      .subtab-btn { flex: 1; padding: 7px 10px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid rgba(201,168,76,0.3); background: transparent; color: #9ca3af; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; }
      .subtab-btn.active { background: rgba(201,168,76,0.12); border-color: #c9a84c; color: rgba(232,228,220,0.90); }
      .subtab-note { font-size: 11px; color: #f59e0b; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; }

      /* ── 出発前チェック ── */
      .prereq-section { background: rgba(10,15,30,0.50); border: 1px dashed rgba(232,228,220,0.20); border-radius: 10px; padding: 12px 14px 10px; margin-bottom: 14px; }
      .prereq-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; flex-wrap: wrap; gap: 6px; }
      .prereq-title { font-size: 11px; font-weight: 800; color: rgba(232,228,220,0.55); letter-spacing: .08em; text-transform: uppercase; }
      .prereq-note { font-size: 11px; color: rgba(232,228,220,0.40); line-height: 1.5; margin: 0 0 10px; }
      .prereq-item { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(232,228,220,0.08); position: relative; }
      .prereq-item:last-child { border-bottom: none; padding-bottom: 0; }
      .prereq-box { width: 16px; height: 16px; border-radius: 3px; border: 1px solid rgba(232,228,220,0.25); background: rgba(10,15,30,0.65); flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #10b981; transition: all .15s; cursor: pointer; }
      .prereq-box.checked { background: #10b981; border-color: #10b981; color: #fff; }
      .prereq-text { font-size: 13px; color: rgba(232,228,220,0.75); line-height: 1.5; flex: 1; padding-right: 4px; }
      .prereq-item.step-done .prereq-text { text-decoration: line-through; color: #9ca3af; }

      /* ── 出発前チェックバナー ── */
      .prereq-banner { background: rgba(201,168,76,0.07); border: 1.5px solid rgba(201,168,76,0.28); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
      .prereq-banner-icon { font-size: 22px; flex-shrink: 0; }
      .prereq-banner-body { flex: 1; }
      .prereq-banner-title { font-size: 13px; font-weight: 800; color: rgba(232,228,220,0.90); margin: 0 0 2px; }
      .prereq-banner-desc { font-size: 11px; color: rgba(232,228,220,0.55); line-height: 1.5; margin: 0; }
      .prereq-banner-count { font-weight: 700; color: #c9a84c; }

      /* ── 継続フェーズ区切り ── */
      .layer2-divider { display: flex; align-items: center; gap: 8px; margin: 16px 0 8px; }
      .layer2-divider-line { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, rgba(201,168,76,0.25) 0, rgba(201,168,76,0.25) 4px, transparent 4px, transparent 9px); }
      .layer2-divider-label { font-size: 9px; font-weight: 800; letter-spacing: .12em; color: rgba(201,168,76,0.45); white-space: nowrap; text-transform: uppercase; }

      /* ── 毎日の習慣 ── */
      .habit-section { margin-top: 20px; padding: 14px 16px 4px; background: rgba(16,185,129,0.04); border: 1px solid rgba(16,185,129,0.18); border-radius: 12px; }
      .habit-section-title { font-size: 10px; font-weight: 800; letter-spacing: .12em; color: rgba(74,222,128,0.65); text-transform: uppercase; margin: 0 0 10px; }
      .habit-item { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .habit-item:last-child { border-bottom: none; padding-bottom: 2px; }
      .habit-item-text { flex: 1; font-size: 12px; color: rgba(232,228,220,0.70); line-height: 1.45; }
      .habit-check-today { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 99px; border: 1.5px solid rgba(74,222,128,0.35); background: transparent; color: rgba(74,222,128,0.55); cursor: pointer; white-space: nowrap; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; flex-shrink: 0; }
      .habit-check-today:hover { border-color: #4ade80; color: #4ade80; }
      .habit-check-today.done-today { background: rgba(74,222,128,0.12); border-color: #4ade80; color: #4ade80; }
      .habit-streak { font-size: 11px; color: rgba(249,168,37,0.75); font-weight: 700; white-space: nowrap; flex-shrink: 0; min-width: 40px; text-align: right; }

      /* ── 出発前チェック 全完了トースト ── */
      #prereq-complete-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(120px); background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff; border-radius: 18px; padding: 16px 24px; display: flex; align-items: center; gap: 14px; box-shadow: 0 8px 36px rgba(16,185,129,.4); transition: transform .45s cubic-bezier(.34,1.56,.64,1); z-index: 9999; pointer-events: none; width: min(340px, calc(100vw - 40px)); }
      #prereq-complete-toast.show { transform: translateX(-50%) translateY(0); }
      .prereq-toast-icon { font-size: 28px; flex-shrink: 0; }
      .prereq-toast-title { font-size: 14px; font-weight: 800; margin: 0 0 2px; }
      .prereq-toast-sub { font-size: 12px; opacity: .85; margin: 0; }
      @keyframes confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      .confetti-piece { position: fixed; top: -10px; z-index: 9998; border-radius: 2px; animation: confetti-fall linear forwards; pointer-events: none; }

      /* ── Bottom ── */
      .navi-footer { margin-top: 32px; display: flex; flex-direction: column; gap: 10px; }
      .navi-footer-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 20px; border-radius: 14px; font-size: 14px; font-weight: 700; text-decoration: none; transition: opacity .15s; }
      .navi-footer-btn:hover { opacity: .85; }
      .nfb-primary   { background: #0a0f1e; color: #fff; }
      .nfb-secondary { background: rgba(10,15,30,0.65); color: rgba(232,228,220,0.90); border: 1.5px solid rgba(201,168,76,0.35); backdrop-filter: blur(8px); }
      .nfb-ghost     { color: #9ca3af; font-size: 13px; padding: 10px; text-align: center; }

      /* ── No data ── */
      .no-data { text-align: center; padding: 60px 20px; }
      .no-data-icon { font-size: 48px; margin-bottom: 16px; }
      .no-data-title { font-size: 20px; font-weight: 800; margin: 0 0 10px; }
      .no-data-text { font-size: 14px; color: rgba(232,228,220,0.55); line-height: 1.75; margin: 0 0 24px; }

      /* ── Route pattern selector ── */
      .route-pattern-bar { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
      .rpb { flex: 1; padding: 8px 10px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1.5px solid rgba(201,168,76,0.25); background: transparent; color: rgba(232,228,220,0.55); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; }
      .rpb.active { background: #0a0f1e; border-color: #0a0f1e; color: #c9a84c; }
      .rpb:not(.active):hover { border-color: #c9a84c; color: rgba(232,228,220,0.90); }
      .route-pattern-desc { font-size: 11px; color: rgba(232,228,220,0.40); margin: 0 0 20px; }

      /* ── Route 1本道 ── */
      .route-container { width: 100%; box-sizing: border-box; }
      .route-start-node, .route-goal-node { display: flex; align-items: flex-start; }
      .route-start-icon, .rg-star { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
      .rg-body { flex: 1; padding: 4px 0 8px 12px; }
      .rg-label { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(201,168,76,0.7); margin: 0 0 2px; }
      .rg-text { font-size: 13px; font-weight: 700; color: rgba(232,228,220,0.90); margin: 0; }

      /* ── Station ── */
      .station { display: flex; width: 100%; box-sizing: border-box; }
      .station-collapsed { align-items: center; }
      .station-expanded { align-items: flex-start; }
      .station-spine { display: flex; flex-direction: column; align-items: center; width: 28px; flex-shrink: 0; }
      .station-line-seg { width: 2px; height: 16px; background: rgba(201,168,76,0.35); flex-shrink: 0; }
      .station-line-flex { width: 2px; flex: 1; min-height: 24px; background: rgba(201,168,76,0.35); }
      .station-node { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; border: 2px solid rgba(201,168,76,0.5); background: rgba(10,15,30,0.65); transition: all .2s; }
      .station-node.sn-current { width: 20px; height: 20px; background: #0a0f1e; border-color: #0a0f1e; box-shadow: 0 0 0 4px rgba(10,15,30,0.1); }
      .station-node.sn-done { background: #c9a84c; border-color: #c9a84c; }
      .station-node.sn-future { background: rgba(10,15,30,0.50); border-color: rgba(232,228,220,0.20); }

      /* Collapsed station body */
      .station-body { flex: 1; }
      .station-collapsed .station-body { padding: 8px 0 8px 12px; }
      .station-row { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; overflow: hidden; }
      .station-icon-sm { font-size: 15px; flex-shrink: 0; }
      .station-name-sm { font-size: 14px; font-weight: 800; color: rgba(232,228,220,0.90); flex-shrink: 0; }
      .station-expand-btn { margin-left: auto; font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.40); background: rgba(10,15,30,0.50); border: 1px solid rgba(232,228,220,0.15); border-radius: 6px; padding: 3px 9px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; white-space: nowrap; flex-shrink: 0; }
      .station-expand-btn:hover { border-color: #c9a84c; color: #c9a84c; }
      .station-done-row .station-name-sm { text-decoration: line-through; text-decoration-color: rgba(201,168,76,.4); color: #9ca3af; }
      .station-mini-progress { display: flex; gap: 3px; padding-left: 2px; margin-top: 5px; flex-wrap: wrap; }
      .smp-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(232,228,220,0.20); flex-shrink: 0; }
      .smp-dot.done { background: #10b981; }
      .smp-dot.cur { background: rgba(96,165,250,0.85); }

      /* Expanded station */
      .station-expanded .station-body { padding: 0; }
      .station-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.15); border-radius: 14px; padding: 18px 18px 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); margin: 6px 0 8px 12px; backdrop-filter: blur(8px); }
      .station-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; gap: 8px; flex-wrap: wrap; }
      .station-title { font-size: 17px; font-weight: 900; color: rgba(232,228,220,0.90); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .station-collapse-btn { font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.40); background: rgba(10,15,30,0.50); border: 1px solid rgba(232,228,220,0.15); border-radius: 6px; padding: 3px 9px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; white-space: nowrap; }
      .station-collapse-btn:hover { border-color: #c9a84c; color: #c9a84c; }

      /* ── Zigzag positioning ── */
      .station-card { margin: 0; } /* スパイン時代の left margin をリセット */
      .station-mini-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.15); border-radius: 12px; padding: 10px 14px; backdrop-filter: blur(8px); }
      .station-left .station-card,
      .station-left .station-mini-card { max-width: 72%; }
      .station-right .station-card,
      .station-right .station-mini-card { max-width: 72%; margin-left: 28%; }
      .station-compass .station-card { width: 100%; max-width: 100%; border-color: rgba(201,168,76,0.5); box-shadow: 0 6px 32px rgba(0,0,0,.1); }
      .sic-wrap { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
      .sic-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
      .sic-current { background: #0a0f1e; box-shadow: 0 0 0 3px rgba(10,15,30,.12); }
      .sic-done { background: #c9a84c; }
      .sic-active { background: #3b82f6; }
      .sic-future { background: rgba(232,228,220,0.15); border: 1.5px solid rgba(232,228,220,0.25); }
      .sic-label { font-size: 10px; font-weight: 700; color: rgba(232,228,220,0.40); }

      /* ── カード接続ドット（中央上下）── */
      .station-mini-card, .station-card { position: relative; }
      .station-mini-card::before, .station-card::before,
      .station-mini-card::after,  .station-card::after {
        content: '';
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        width: 9px; height: 9px;
        border-radius: 50%;
        background: rgba(201,168,76,0.55);
        border: 2px solid rgba(10,15,30,0.8);
        box-shadow: 0 0 0 1.5px rgba(201,168,76,0.3);
        z-index: 2;
      }
      .station-mini-card::before, .station-card::before { top: -5px; }
      .station-mini-card::after,  .station-card::after  { bottom: -5px; }
      /* 最初と最後のカードは不要な端ドットを非表示 */
      .station:first-child .station-mini-card::before,
      .station:first-child .station-card::before { display: none; }
      .station:last-child .station-mini-card::after,
      .station:last-child .station-card::after { display: none; }

      /* ── セクションタブバー ── */
      .section-tab-bar { display: flex; gap: 0; background: rgba(10,15,30,0.75); border: 1px solid rgba(201,168,76,0.22); border-radius: 10px; overflow: hidden; margin-bottom: 20px; backdrop-filter: blur(8px); position: sticky; top: 64px; z-index: 10; }
      .section-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 6px; font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.45); background: transparent; border: none; border-right: 1px solid rgba(201,168,76,0.15); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; text-decoration: none; }
      .section-tab:last-child { border-right: none; }
      .section-tab:hover { background: rgba(201,168,76,0.06); color: rgba(232,228,220,0.75); }
      .section-tab.active { background: rgba(201,168,76,0.12); color: rgba(232,228,220,0.92); }
      .section-tab-icon { font-size: 16px; }
      .section-tab-progress { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.65); }

      /* ── 背景マップグリッド ── */
      .navi-wrap { background-image: repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(201,168,76,.028) 39px,rgba(201,168,76,.028) 40px), repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(201,168,76,.028) 39px,rgba(201,168,76,.028) 40px); }

      /* ── 旅路トレイル ── */
      .trail-container { position: relative; padding-left: 26px; overflow: visible; }
      .trail-container::before { content:''; position:absolute; left:7px; top:22px; bottom:24px; width:2px; background:repeating-linear-gradient(to bottom,rgba(201,168,76,.5) 0,rgba(201,168,76,.5) 6px,transparent 6px,transparent 11px); border-radius:1px; pointer-events:none; }
      .trail-stop { position:absolute; left:-18px; width:14px; height:14px; border-radius:50%; flex-shrink:0; pointer-events:none; }
      .trail-stop.ts-done { background:#c9a84c; border:2px solid #c9a84c; box-shadow:0 0 0 3px rgba(201,168,76,.18),0 0 6px rgba(201,168,76,.3); }
      .trail-stop.ts-current { background:#0a0f1e; border:2px solid #c9a84c; animation:trail-pulse 2.2s ease-in-out infinite; }
      .trail-stop.ts-future { background:rgba(10,15,30,.65); border:2px solid rgba(232,228,220,.2); }
      @keyframes trail-pulse { 0%,100% { box-shadow:0 0 0 3px rgba(201,168,76,.12),0 0 8px rgba(201,168,76,.2); } 50% { box-shadow:0 0 0 6px rgba(201,168,76,.22),0 0 16px rgba(201,168,76,.32); } }

      /* ── アクションセクション（新構造） ── */
      .action-section { margin-bottom: 28px; scroll-margin-top: 120px; position: relative; }
      .action-sec-header { display: flex; align-items: center; gap: 12px; padding: 12px 0 10px; border-bottom: 1.5px solid rgba(201,168,76,0.18); margin-bottom: 12px; }
      .action-sec-icon { font-size: 22px; flex-shrink: 0; }
      .action-sec-body { flex: 1; }
      .action-sec-label { font-size: 15px; font-weight: 900; color: rgba(232,228,220,0.92); margin: 0 0 2px; font-family: 'Noto Serif JP', Georgia, serif; }
      .action-sec-desc { font-size: 11px; color: rgba(232,228,220,0.45); margin: 0; }
      .action-sec-progress { font-size: 12px; font-weight: 800; color: rgba(201,168,76,0.75); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 20px; padding: 3px 10px; white-space: nowrap; flex-shrink: 0; }

      /* ── ステップカード ── */
      .step-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 12px; border-bottom: 1px solid rgba(201,168,76,0.07); position: relative; transition: background .12s; }
      .step-card:last-child { border-bottom: none; }
      .step-card.step-compass { background: rgba(201,168,76,0.04); border-radius: 10px; border-bottom: none; margin-bottom: 3px; }
      .step-card.step-done .step-text { text-decoration: line-through; color: #9ca3af; }
      .step-card.guide-high { border-left: 3px solid rgba(201,168,76,0.55); background: rgba(201,168,76,0.03); border-radius: 10px; border-bottom: none; margin-bottom: 3px; padding-left: 14px; }
      .step-card.guide-mid  { border-left: 2px solid rgba(59,130,246,0.45); background: rgba(59,130,246,0.03); border-radius: 10px; border-bottom: none; margin-bottom: 3px; padding-left: 14px; }
      .step-card-body { flex: 1; min-width: 0; padding-right: 4px; }
      .step-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
      .phase-badge { font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 99px; letter-spacing: .04em; white-space: nowrap; flex-shrink: 0; }
      .phase-badge-week1   { background: rgba(52,211,153,.12); color: rgba(52,211,153,.85); border: 1px solid rgba(52,211,153,.22); }
      .phase-badge-week1_2 { background: rgba(59,130,246,.12); color: rgba(147,197,253,.9); border: 1px solid rgba(59,130,246,.22); }
      .phase-badge-month1  { background: rgba(201,168,76,.12); color: rgba(253,230,138,.9); border: 1px solid rgba(201,168,76,.25); }
      .phase-badge-month2_3{ background: rgba(168,85,247,.12);  color: rgba(216,180,254,.9); border: 1px solid rgba(168,85,247,.22); }
      .step-axis-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; border: 1px solid; }
      .step-text { font-size: 14px; color: rgba(232,228,220,0.82); line-height: 1.65; margin: 0; }
      .step-check-btn-wrap { flex-shrink: 0; padding-top: 2px; }

      /* ── 答えを見るパネル ── */
      .step-detail-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.75); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.22); border-radius: 6px; padding: 4px 10px; cursor: pointer; margin-top: 7px; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; }
      .step-detail-toggle:hover { background: rgba(201,168,76,0.14); color: #c9a84c; }
      .step-detail-toggle.open { background: rgba(201,168,76,0.14); color: #c9a84c; }
      .step-detail-panel { display: none; margin-top: 8px; padding: 12px 14px; background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.2); border-radius: 10px; font-size: 12px; color: rgba(232,228,220,0.82); line-height: 1.8; }
      .step-detail-panel.open { display: block; }

      /* ── インラインサービスカード ── */
      .inline-service-card { display: none; margin-top: 10px; text-decoration: none; }
      .inline-service-card.loaded { display: block; }
      .isc-inner { display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; background: rgba(10,15,30,0.65); border: 1px solid rgba(201,168,76,0.25); border-radius: 10px; text-decoration: none; transition: border-color .15s; }
      .isc-inner:hover { border-color: rgba(201,168,76,0.5); }
      .isc-icon { font-size: 22px; flex-shrink: 0; }
      .isc-body { flex: 1; min-width: 0; }
      .isc-label { font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(201,168,76,0.55); margin: 0 0 3px; }
      .isc-name { font-size: 13px; font-weight: 700; color: rgba(232,228,220,0.88); margin: 0 0 3px; line-height: 1.4; }
      .isc-desc { font-size: 11px; color: rgba(232,228,220,0.50); margin: 0; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .isc-cta { font-size: 11px; font-weight: 700; color: #c9a84c; flex-shrink: 0; align-self: center; }

      /* ── Today's Quest ── */
      .todayquest-card { background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(10,15,30,0.40)); border: 1.5px solid rgba(201,168,76,0.4); border-radius: 16px; padding: 20px 22px; margin-bottom: 20px; position: relative; overflow: hidden; }
      .todayquest-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 140px; height: 140px; background: radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
      .tq-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: rgba(201,168,76,0.65); margin: 0 0 10px; }
      .tq-axis-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.32); color: #c9a84c; margin-bottom: 10px; }
      .tq-text { font-size: 15px; font-weight: 800; color: rgba(232,228,220,0.92); line-height: 1.6; margin: 0 0 10px; font-family: 'Noto Serif JP', Georgia, serif; }
      .tq-guide { font-size: 12px; color: rgba(232,228,220,0.50); margin: 0 0 14px; }
      .tq-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .tq-check-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; padding: 10px 20px; background: rgba(201,168,76,0.15); border: 1.5px solid rgba(201,168,76,0.5); border-radius: 9px; color: #c9a84c; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; }
      .tq-check-btn:hover { background: rgba(201,168,76,0.26); }
      .tq-check-btn.done { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.45); color: #4ade80; }
      .tq-skip-link { font-size: 12px; color: rgba(232,228,220,0.35); text-decoration: none; transition: color .12s; }
      .tq-skip-link:hover { color: rgba(232,228,220,0.65); }

      /* ── 旅路ビジュアル ── */
      .journey-section { margin-bottom: 20px; }

      /* ── 軸ステータスグリッド ── */
      .axis-status-section { margin-bottom: 20px; }
      .axis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .agc { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.10); border-radius: 14px; padding: 14px 14px 12px; cursor: pointer; transition: border-color .15s, transform .15s; position: relative; overflow: hidden; }
      .agc:hover { border-color: rgba(201,168,76,0.3); transform: translateY(-1px); }
      .agc.agc-compass { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.05); }
      .agc.agc-done { opacity: 0.48; }
      .agc.agc-active { border-color: rgba(59,130,246,0.28); }
      .agc.agc-selected { border-color: #c9a84c !important; box-shadow: 0 0 0 1px rgba(201,168,76,0.25); }
      .agc-top { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .agc-icon { font-size: 18px; flex-shrink: 0; }
      .agc-name { font-size: 12px; font-weight: 800; color: rgba(232,228,220,0.85); flex: 1; min-width: 0; }
      .agc-badge { font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 99px; white-space: nowrap; flex-shrink: 0; letter-spacing: .04em; }
      .agc-badge-compass { background: rgba(201,168,76,0.12); color: #c9a84c; border: 1px solid rgba(201,168,76,0.3); }
      .agc-badge-done { background: rgba(16,185,129,0.10); color: rgba(52,211,153,0.8); border: 1px solid rgba(16,185,129,0.2); }
      .agc-badge-active { background: rgba(59,130,246,0.10); color: rgba(147,197,253,0.85); border: 1px solid rgba(59,130,246,0.2); }
      .agc-badge-none { background: transparent; color: rgba(232,228,220,0.22); border: 1px solid rgba(232,228,220,0.08); }
      .agc-bar-labels { display: flex; justify-content: space-between; font-size: 9px; color: rgba(232,228,220,0.22); margin-bottom: 4px; }
      .agc-bar { height: 3px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; margin-bottom: 8px; }
      .agc-bar-fill { height: 100%; border-radius: 99px; transition: width 1.2s cubic-bezier(.4,0,.2,1) .3s; }
      .agc-bar-fill.bfill-compass { background: linear-gradient(90deg, rgba(201,168,76,0.5), #c9a84c); }
      .agc-bar-fill.bfill-active { background: rgba(96,165,250,0.65); }
      .agc-bar-fill.bfill-done { background: rgba(52,211,153,0.65); }
      .agc-bar-fill.bfill-none { background: rgba(232,228,220,0.10); }
      .agc-step { font-size: 11px; color: rgba(232,228,220,0.42); line-height: 1.5; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .agc.agc-compass .agc-step { color: rgba(201,168,76,0.58); }
      .agc-compass-mark { position: absolute; top: 8px; right: 10px; font-size: 11px; opacity: 0.55; }

      /* ── 旅の途中の読み物ノード ── */
      .trail-article-node { display: flex; align-items: center; gap: 10px; margin: 8px 0 4px; padding: 10px 14px; background: rgba(10,15,30,0.45); border: 1px solid rgba(201,168,76,0.18); border-left: 3px solid rgba(201,168,76,0.5); border-radius: 8px; text-decoration: none; transition: background .15s; }
      .trail-article-node:hover { background: rgba(201,168,76,0.07); }
      .trail-article-icon { font-size: 16px; flex-shrink: 0; }
      .trail-article-body { flex: 1; min-width: 0; }
      .trail-article-label { font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(201,168,76,0.6); margin: 0 0 2px; }
      .trail-article-title { font-size: 13px; font-weight: 700; color: rgba(232,228,220,0.85); margin: 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .trail-article-arrow { font-size: 14px; color: rgba(201,168,76,0.5); flex-shrink: 0; }

      /* ── 軸フィルターバー ── */
      .axis-filter-bar { display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; margin-bottom: 18px; padding-bottom: 6px; scrollbar-width: none; -ms-overflow-style: none; }
      .axis-filter-bar::-webkit-scrollbar { display: none; }
      .axis-filter-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(232,228,220,0.18); color: rgba(232,228,220,0.40); background: transparent; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; white-space: nowrap; flex-shrink: 0; scroll-snap-align: start; }
      .axis-filter-chip:hover { border-color: rgba(201,168,76,0.4); color: rgba(232,228,220,0.75); }
      .axis-filter-chip.active { border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.10); }

      /* ── 現状把握ステップ（目立たせ） ── */
      .step-card.step-selfcheck { border-left: 3px solid rgba(201,168,76,0.7) !important; background: rgba(201,168,76,0.05); border-radius: 10px; border-bottom: none !important; margin-bottom: 4px; }
      .selfcheck-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; color: #c9a84c; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.3); border-radius: 3px; padding: 1px 6px; letter-spacing: .06em; text-transform: uppercase; }
      .selfcheck-badge::before { content: '📍'; font-size: 9px; }
      .selfcheck-value { font-size: 11px; font-weight: 700; color: #c9a84c; background: rgba(201,168,76,0.10); border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; padding: 2px 7px; margin-top: 4px; display: inline-block; }

      /* ── 現状把握バナー ── */
      .selfcheck-intro-section { background: rgba(201,168,76,0.06); border: 1.5px solid rgba(201,168,76,0.35); border-radius: 14px; padding: 16px 18px 14px; margin-bottom: 20px; }
      .selfcheck-intro-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
      .selfcheck-intro-icon { font-size: 22px; flex-shrink: 0; }
      .selfcheck-intro-title { font-size: 13px; font-weight: 800; color: rgba(232,228,220,0.92); margin: 0 0 2px; }
      .selfcheck-intro-desc { font-size: 11px; color: rgba(232,228,220,0.55); margin: 0; line-height: 1.5; }
      .selfcheck-chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .selfcheck-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(201,168,76,0.35); color: rgba(201,168,76,0.85); background: transparent; line-height: 1.3; }
      .selfcheck-chip.done { color: rgba(16,185,129,0.9); border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.06); }

      /* ── 現状把握モーダル ── */
      #body-data-modal { position: fixed; inset: 0; background: rgba(5,8,20,0.88); z-index: 99998; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
      #body-data-modal.hidden { display: none; }
      .bdm-multi-note.hidden { display: none; }
      .bdm-card { background: rgba(10,15,30,0.97); border: 1.5px solid rgba(201,168,76,0.5); border-radius: 18px; padding: 26px 22px 20px; max-width: 400px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.65); }
      .bdm-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(201,168,76,0.65); margin: 0 0 8px; }
      .bdm-title { font-size: 15px; font-weight: 800; color: rgba(232,228,220,0.95); margin: 0 0 6px; line-height: 1.5; font-family: 'Noto Serif JP', Georgia, serif; }
      .bdm-step-text { font-size: 12px; color: rgba(232,228,220,0.50); margin: 0 0 18px; line-height: 1.6; }
      .bdm-options { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
      .bdm-option { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 9px; border: 1px solid rgba(232,228,220,0.16); cursor: pointer; transition: all .12s; }
      .bdm-option:hover { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.06); }
      .bdm-option.selected { border-color: #c9a84c; background: rgba(201,168,76,0.12); }
      .bdm-option input[type="radio"] { width: 14px; height: 14px; accent-color: #c9a84c; flex-shrink: 0; cursor: pointer; }
      .bdm-option input[type="checkbox"] { width: 14px; height: 14px; accent-color: #c9a84c; flex-shrink: 0; cursor: pointer; }
      .bdm-option-label { font-size: 13px; font-weight: 600; color: rgba(232,228,220,0.85); cursor: pointer; }
      .bdm-multi-note { font-size: 11px; color: rgba(232,228,220,0.40); margin: 0 0 10px; }
      .bdm-actions { display: flex; gap: 8px; }
      .bdm-submit { flex: 1; padding: 12px 20px; background: #c9a84c; color: #0a0f1e; font-size: 14px; font-weight: 800; border: none; border-radius: 9px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: opacity .15s; }
      .bdm-submit:hover { opacity: .85; }
      .bdm-skip { padding: 12px 14px; background: transparent; color: rgba(232,228,220,0.40); font-size: 13px; font-weight: 600; border: 1px solid rgba(232,228,220,0.15); border-radius: 9px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; }
      .bdm-skip:hover { color: rgba(232,228,220,0.65); border-color: rgba(232,228,220,0.3); }

      /* ── Matched products ── */
      .navi-products-section { margin: 0 0 28px; }
      .navi-product-carousel { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; scrollbar-width: none; -ms-overflow-style: none; }
      .navi-product-carousel::-webkit-scrollbar { display: none; }
      .navi-product-card { flex-shrink: 0; width: 158px; scroll-snap-align: start; background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.18); border-radius: 12px; padding: 13px 12px; display: flex; flex-direction: column; gap: 7px; text-decoration: none; transition: border-color .15s; }
      .navi-product-card:hover { border-color: rgba(16,185,129,0.45); }
      .navi-product-card.matched { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.06); }
      .navi-product-card.matched:hover { border-color: #c9a84c; }
      .navi-product-axis { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(16,185,129,0.55); }
      .navi-product-name { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.85); line-height: 1.45; flex: 1; }
      .navi-product-cta { font-size: 11px; font-weight: 700; color: rgba(16,185,129,0.75); }
      .navi-product-match-badge { font-size: 9px; font-weight: 800; background: rgba(201,168,76,0.18); color: #c9a84c; border: 1px solid rgba(201,168,76,.3); border-radius: 99px; padding: 2px 7px; width: fit-content; letter-spacing: .04em; }
    `;
    document.head.appendChild(style);

    // ── データ（Supabase優先 → localStorage fallback）──
    ;(async () => {
    const STORAGE_KEY = 'fineme:diagnosis:latest';
    const PROGRESS_KEY = 'fineme:axis:progress';
    const STEP_DONE_KEY = 'fineme:step:done';
    const root = document.getElementById('navi-root');
    if (!root) return;

    // ── 認証チェック（AuthGateに依存しない） ──
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const isLoggedIn = !!(sbKey && JSON.parse(localStorage.getItem(sbKey) || 'null')?.user?.id);
      if (!isLoggedIn) {
        const hasDiagData = !!(localStorage.getItem('fineme:diagnosis:latest'));
        root.innerHTML = `
          <div style="min-height:50vh;display:flex;align-items:center;justify-content:center;padding:48px 20px">
            <div style="max-width:480px;width:100%;background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.25);border-radius:18px;padding:40px 32px;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,0.4);backdrop-filter:blur(8px)">
              <div style="font-size:40px;margin:0 0 16px">🗺️</div>
              <h2 style="font-family:'Noto Serif JP',Georgia,serif;font-size:18px;font-weight:700;color:rgba(232,228,220,0.90);margin:0 0 12px;line-height:1.6">
                New Me Mapはログイン後に表示されます
              </h2>
              ${hasDiagData
                ? `<p style="font-size:13px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:8px;padding:10px 14px;color:rgba(52,211,153,0.9);margin:0 0 20px;line-height:1.7">
                    ✅ Me Scanのデータは保存されています。<br>ログインまたは登録してマップに反映させましょう。
                  </p>`
                : `<p style="font-size:14px;color:rgba(232,228,220,0.55);line-height:1.85;margin:0 0 20px">
                    7軸の現在地と変容ロードマップ（Fineme Compass）が<br>ここに届きます。まずログイン / 新規登録してください。
                  </p>`
              }
              <a href="/login" style="display:block;width:100%;padding:15px 24px;background:#c9a84c;color:#0a0f1e;font-size:15px;font-weight:700;border-radius:6px;text-decoration:none;letter-spacing:.05em;margin-bottom:12px;box-sizing:border-box">
                ログイン / 新規登録
              </a>
              <a href="/diagnosis" style="font-size:13px;color:rgba(232,228,220,0.40);text-decoration:none;border-bottom:1px solid rgba(232,228,220,0.15);padding-bottom:2px">
                まだMe Scanを受けていない方はこちら
              </a>
            </div>
          </div>`;
        return;
      }
    } catch {}

    try { // ── エラー全捕捉：読み込み中のまま固まることを防ぐ ──

    // タイムアウト付きfetch（5秒で打ち切りlocalStorage fallbackへ）
    async function fetchWithTimeout(url, opts, ms = 5000) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), ms);
      try {
        return await fetch(url, { ...opts, signal: ctrl.signal });
      } catch { return null; } finally { clearTimeout(tid); }
    }

    // ── Supabaseトークン取得 ──
    let token = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        token = sbObj?.access_token || null;
      }
    } catch {}

    // ── 診断データ読み込み（Supabase優先） ──
    try {
      if (token) {
        const res = await fetchWithTimeout('/api/me/diagnosis', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res?.ok) { const data = await res.json(); if (data) {
          try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            const localAt = local?.at ? new Date(local.at).getTime() : 0;
            const remoteAt = data?.at ? new Date(data.at).getTime() : 0;
            if (remoteAt >= localAt) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
          } catch { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }
        } }
      }
    } catch {}

    // ── ステップ完了データ読み込み ──
    let allNaviArticles = [];
    let stepDone = {};
    try { const s = localStorage.getItem(STEP_DONE_KEY); if (s) stepDone = JSON.parse(s); } catch {}

    // ── 現状把握データ読み込み ──
    const BODY_DATA_KEY = 'fineme:body:data';
    let bodyData = {};
    try { const s = localStorage.getItem(BODY_DATA_KEY); if (s) bodyData = JSON.parse(s); } catch {}

    // ── 進捗データ読み込み（Supabase優先） ──
    let axisProgress = {};
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      if (stored) axisProgress = JSON.parse(stored);
    } catch {}
    try {
      if (token) {
        const res = await fetchWithTimeout('/api/me/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res?.ok) {
          const data = await res.json();
          if (data.axis_progress && Object.keys(data.axis_progress).length > 0) {
            axisProgress = data.axis_progress;
            try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(axisProgress)); } catch {}
          }
          // ── stepDone: Supabaseが空でないならマージ（新しい方が優先） ──
          if (data.step_done && Object.keys(data.step_done).length > 0) {
            stepDone = { ...stepDone, ...data.step_done };
            try { localStorage.setItem(STEP_DONE_KEY, JSON.stringify(stepDone)); } catch {}
          }
          if (data.body_data && Object.keys(data.body_data).length > 0) {
            bodyData = { ...bodyData, ...data.body_data };
            try { localStorage.setItem(BODY_DATA_KEY, JSON.stringify(bodyData)); } catch {}
          }
        }
      }
    } catch {}

    // ── 記事フェッチ（非同期・失敗しても無視） ──
    try {
      const artRes = await fetchWithTimeout('/api/features', {}, 5000);
      if (artRes?.ok) {
        const arts = await artRes.json();
        if (Array.isArray(arts)) allNaviArticles = arts;
      }
    } catch {}

    // ── 商品フェッチ（body_dataマッチング用） ──
    let naviProducts = [];
    try {
      const prRes = await fetchWithTimeout('/api/products', {}, 5000);
      if (prRes?.ok) { const rows = await prRes.json(); if (Array.isArray(rows)) naviProducts = rows; }
    } catch {}

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      root.innerHTML = `<div class="no-data">
        <div class="no-data-icon">🧭</div>
        <h2 class="no-data-title">まだ地図がありません</h2>
        <p class="no-data-text">Me Scanを受けると、あなただけの<br>変容マップが生成されます。</p>
        <a href="/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける</a>
      </div>`;
      return;
    }
    let p;
    try { p = JSON.parse(raw); } catch {
      root.innerHTML = `<div class="no-data"><p>データエラー。</p><a href="/diagnosis" class="btn">再スキャン</a></div>`;
      return;
    }
    if (!p.transform_vectors) {
      root.innerHTML = `<div class="no-data">
        <div class="no-data-icon">🗺️</div>
        <h2 class="no-data-title">新しいMe Scanが必要です</h2>
        <p class="no-data-text">診断をアップデートしました。<br>新しいMe Scanで変容マップを生成します。</p>
        <a href="/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（新版）</a>
      </div>`;
      return;
    }

    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── 定数 ──
    const AREA_DEFS = {
      body:    { icon:'💪', label:'体型',  catLink:'gym',       tier:1, articleQ:'垢抜け' },
      eyebrow: { icon:'✂️', label:'眉',    catLink:'eyebrow',  tier:1, articleQ:'清潔感' },
      fashion: { icon:'👔', label:'服',    catLink:'fashion',   tier:1, articleQ:'垢抜け' },
      hair:    { icon:'💇', label:'髪',    catLink:'hair',      tier:1, articleQ:'清潔感' },
      skin:    { icon:'✨', label:'肌',    catLink:'esthetic',  tier:2, articleQ:'清潔感' },
      teeth:   { icon:'🦷', label:'歯',    catLink:'whitening', tier:3, articleQ:'清潔感' },
      nail:    { icon:'💅', label:'爪',    catLink:'nail',      tier:4, articleQ:'垢抜け' },
    };
    const TIER_LABELS = { 1:'基盤', 2:'深化', 3:'補完', 4:'磨き込み' };
    const CARE_LABELS = { none:'未着手', concerned:'気になっている', self:'自己ケア中', self_regular:'自己流・定期', pro:'プロ通い中' };
    // self_regular は self の上位 — milestone上はselfと同じ位置を現在地とする
    function normalizeCareType(ct) { return ct === 'self_regular' ? 'self' : (ct || 'none'); }

    // 現在地スコアを来た道類型ラベルに変換
    function getCareLabel(careType) { return CARE_LABELS[careType] || ''; }

    // ── 記事マッチング ──
    const AXIS_ARTICLE_CATS = {
      body: ['垢抜け'], eyebrow: ['清潔感', '垢抜け'], fashion: ['垢抜け', '清潔感'],
      hair: ['清潔感', '垢抜け'], skin: ['清潔感'], teeth: ['清潔感'], nail: ['垢抜け'],
    };
    function pickSectionArticle(sectionAxes, compassAxis, usedSlugs) {
      if (!allNaviArticles.length) return null;
      let best = null, bestScore = -1;
      for (const art of allNaviArticles) {
        if (usedSlugs.has(art.slug)) continue;
        let score = 0;
        if (art.category === '変容の思想') score = 1;
        for (const axis of sectionAxes) {
          const cats = AXIS_ARTICLE_CATS[axis] || [];
          if (cats.includes(art.category)) score += (axis === compassAxis ? 4 : 1);
        }
        if (score > bestScore) { bestScore = score; best = art; }
      }
      return bestScore > 0 ? best : null;
    }

    // ── ミルストーン（統合リスト形式・全careType共通） ──
    // isCurrentFor: そのcareTypeの「現在地」マーカー
    // guide: 'none'|'LOW'|'MID'|'HIGH' — ガイド推奨度
    // note: 注意書き（任意）
    const MILESTONES = {
      body: [
        { text: '自分の体型で気になる部分を1つ言語化できている（例：「腹まわりが気になる」）', guide: 'none', isCurrentFor: 'none', isSelfCheck: true, bodyDataKey: 'body_concern', bodyDataOptions: ['腹まわり', '胸（上半身）', '背中', '脚（太もも・ふくらはぎ）', '全体的に気になる'] },
        { text: '自分の体型目標を1つ言葉にしてみる（筋肉をつける・引き締めるなど）', guide: 'none', hint: '目標の方向性で取り組むべきことが変わる。まず「どっちを目指すか」を決める', isSelfCheck: true, bodyDataKey: 'body_goal', bodyDataOptions: ['筋肉をつけたい', '体重を落としたい', '引き締めたい', '猫背を改善したい', 'O脚・X脚を改善したい'] },
        { text: '現在の体重・体脂肪率を計測して数字で把握している', guide: 'none',
          products: [{ name: '体組成計（TANITA）', url: 'https://www.amazon.co.jp/s?k=タニタ+体組成計&tag=whero523-22', level: 'intermediate', priceRange: 'mid' }] },
        { text: '今週1週間、体を動かした回数を数えてみる', guide: 'none', hint: 'ゼロでも正直に。現状を知ることが出発点' },
        { text: '日常的に歩く・階段を使うなど、生活のなかに動きを取り入れている', guide: 'none' },
        { text: '週1回以上、意識的な運動習慣がある', guide: 'none',
          products: [{ name: 'プロテイン（SAVAS ホエイ）', url: 'https://www.amazon.co.jp/s?k=ザバスホエイプロテイン&tag=whero523-22', level: 'intermediate', priceRange: 'low' }, { name: 'トレーニングウェア', url: 'https://www.amazon.co.jp/s?k=メンズ+トレーニングウェア&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: '食事の基本ルールを1つ調べてみる（例：タンパク質を毎食とる）', guide: 'LOW', isCurrentFor: 'concerned', hint: '「タンパク質を毎食とる」だけ覚えれば今日から実践できる',
          detail: 'タンパク質の目安：体重(kg)×1.5g/日。体重70kgなら約105g。食材別：鶏むね肉100g→約20g、卵1個→約6g、サバ缶1缶→約25g、納豆1パック→約8g、プロテイン1杯→約20g。まず「毎食に1品タンパク源を足す」だけで十分。炭水化物を減らすより先に、たんぱく質を増やすことの方が体型改善には効果が出やすい。',
          products: [{ name: 'プロテインバー（手軽なタンパク源）', url: 'https://www.amazon.co.jp/s?k=プロテインバー&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: 'パーソナルジムの無料体験カウンセリングに1回行ったことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: 'プロにトレーニングメニューを組んでもらったことがある', guide: 'HIGH' },
        { text: '週2回以上のトレーニングを1ヶ月以上継続している', guide: 'MID', isCurrentFor: 'pro' },
        { text: '食事記録またはPFCバランスの管理を3週間以上続けている', guide: 'MID' },
        { text: '3ヶ月前と今の体型を写真・数値で比較して変化を確認している', guide: 'LOW' },
      ],
      eyebrow: [
        { text: '何らかの方法で眉を整えている（サロン・自己処理どちらでもOK）', guide: 'none', isCurrentFor: 'none' },
        { text: 'スクリューブラシで毎朝眉を整えている', guide: 'none',
          products: [{ name: 'スクリューブラシ（使い捨て）', url: 'https://www.amazon.co.jp/s?k=スクリューブラシ+眉&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: '眉用ハサミ', url: 'https://www.amazon.co.jp/s?k=眉用はさみ+ステンレス&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: '自分の顔型に合う眉の形を1つ調べてみる', guide: 'MID', isCurrentFor: 'concerned', hint: '「顔型 眉 似合う」で検索するか、眉毛サロンで聞くのが一番確実',
          detail: '顔型別の目安：丸顔→アーチ形（縦のバランスを出す）／面長→フラット気味（横に広く見せる）／卵型→どんな形も合う（ナチュラルがおすすめ）／逆三角形→やや丸みのあるアーチ（シャープさを和らげる）。ただし、実際の骨格・筋肉のつき方による個人差が大きいので、眉毛サロンでプロに一度作ってもらうのが最も確実。',
          isSelfCheck: true, bodyDataKey: 'face_shape', bodyDataOptions: ['丸顔', '面長', '卵型', '逆三角形（逆卵型）', '四角（ベース型）', '顔の輪郭がわからない'] },
        { text: '自分の眉の悩みを言語化してみる（薄い・濃い・左右差など）', guide: 'LOW', hint: '眉が薄い人はパウダー補整、濃い人はサロンで輪郭を作るのが近道', isSelfCheck: true, bodyDataKey: 'eyebrow_concerns', bodyDataMulti: true, bodyDataOptions: ['眉が薄い', '眉が濃い・太い', '左右非対称', '眉の形がわからない'] },
        { text: '眉毛サロンでプロに一度整えてもらったことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: 'プロに作ってもらった形を基準に、自宅で眉バサミ＋スクリューブラシでメンテナンスできている', guide: 'LOW' },
        { text: '2〜3週に1回のペースでサロンに通っている', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '担当スタッフと信頼関係ができ、定期的に通い続けている', guide: 'HIGH' },
        { text: '整えた眉のサイクル（サロン＋自宅メンテ）が3ヶ月以上継続している', guide: 'none' },
      ],
      fashion: [
        { text: '自分の服のサイズをメジャーで測ってみる（肩幅・ウエスト・着丈など）', guide: 'none', isCurrentFor: 'none', hint: '手持ちの服を広げて計測するだけでOK。5〜10分でできる' },
        { text: 'クローゼットを開けて、今持っている服を全部出してみる', guide: 'none', hint: '捨てなくていい。まず「何があるか」を把握するだけ。10分でできる' },
        { text: '自分が目指したいスタイルの方向性を考えてみる', guide: 'LOW', hint: '「なりたいイメージ」を言葉にするだけでOK。複数あっていい', isSelfCheck: true, bodyDataKey: 'fashion_self', bodyDataMulti: true, bodyDataOptions: ['キレイめ', 'カジュアル', 'キレイめカジュアル', 'ストリート', 'モード・個性派', 'まずは清潔感から'] },
        { text: 'サイズ感の基本ルールを1つ調べてみる（例：肩幅を合わせることが最優先）', guide: 'LOW', hint: '「肩幅を合わせることが最優先」これだけ覚えれば今日から服選びが変わる',
          detail: '肩幅の合わせ方：試着時に「肩線（肩の縫い目）がちょうど肩の端で終わっているか」を確認する。外にはみ出ていたら大きすぎ、内側に入っていたら小さすぎ。肩さえ合えば、袖の長さや丈の多少のズレは着こなしで吸収できる。上半身アウターは特に肩幅が最優先で、ウエスト・ヒップは二の次。ボトムスは太もも→ウエストの順に確認。' },
        { text: 'ベーシックアイテムが揃っている（白シャツ・ダークデニム・シンプルスニーカーなど）', guide: 'LOW' },
        { text: 'パーソナルカラー診断を受けたことがある', guide: 'HIGH', isCurrentFor: 'concerned' },
        { text: '顔タイプ診断を受けたことがある', guide: 'HIGH', isSelfCheck: true, bodyDataKey: 'face_type', bodyDataOptions: ['チャーミングソフト', 'チャーミングハード', 'フレッシュソフト', 'フレッシュハード', 'エレガントソフト', 'エレガントハード', 'クールソフト', 'クールハード', '診断したことがない'] },
        { text: '骨格診断を受けたことがある', guide: 'HIGH', isSelfCheck: true, bodyDataKey: 'skeletal_type', bodyDataOptions: ['ストレート骨格', 'ウェーブ骨格', 'ナチュラル骨格', '診断したことがない'] },
        { text: '診断結果を踏まえて服を1アイテム以上選び直したことがある', guide: 'MID', isCurrentFor: 'self' },
        { text: 'ショップスタッフやスタイリストに「自分に似合うもの」を相談したことがある', guide: 'MID' },
        { text: '迷わず選べる「自分の正解コーデ」のパターンを1つ持っている', guide: 'LOW', isCurrentFor: 'pro' },
        { text: '場面別（デート・仕事・カジュアル）のコーデを意識して使い分けている', guide: 'LOW' },
      ],
      hair: [
        { text: '定期的に美容院・理髪店に行っている（2ヶ月以内に行った）', guide: 'none', isCurrentFor: 'none' },
        { text: '自分の髪質を確認してみる（硬い・柔らかい・くせ毛・直毛など）', guide: 'LOW', hint: '洗髪後に何もつけず乾かして、うねるならくせ毛。毛を1本つまんで硬さも確認できる',
          detail: '確認手順：①洗髪後に何もつけず完全乾燥する。うねり・広がりが出ればくせ毛、まっすぐなら直毛。②毛を1本抜いてつまむ。太ければ「硬い」、細ければ「柔らかい」。③これらの情報（くせの有無・硬さ・太さ）を美容師に伝えると、似合う髪型の提案精度が上がる。「くせ毛・硬い・太め」なら重め・ストレートが向く。「直毛・柔らかい・細め」なら軽いスタイルがまとまりやすい。',
          isSelfCheck: true, bodyDataKey: 'hair_type', bodyDataOptions: ['硬い', '柔らかい', 'くせ毛', '直毛', '細い', '太い', '髪質がわからない'] },
        { text: '自分の髪・頭皮の悩みを確認してみる（薄毛・スタイリングなど）', guide: 'LOW', hint: '薄毛が気になる人は早めの対応が有効。スタイリングが決まらない場合は美容師相談が近道', isSelfCheck: true, bodyDataKey: 'hair_additional', bodyDataMulti: true, bodyDataOptions: ['薄毛・抜け毛が気になる', 'ボリュームが出ない', '頭皮がべたつく', 'フケが気になる', 'セットが決まらない', 'すぐにペタンとなる', 'まとまらない'] },
        { text: '自分の顔型を確認してみる（丸・面長・卵型など）', guide: 'LOW', hint: '髪を後ろにまとめて鏡の前に立つ。輪郭が丸・面長・卵型・逆三角形のどれかを見る', isSelfCheck: true, bodyDataKey: 'face_shape', bodyDataOptions: ['丸顔', '面長', '卵型', '逆三角形（逆卵型）', '四角（ベース型）', '顔の輪郭がわからない'] },
        { text: '髪質に合ったシャンプーを使っている', guide: 'LOW',
          products: [{ name: 'BOTANIST ボタニカルシャンプー', url: 'https://www.amazon.co.jp/s?k=BOTANIST+シャンプー+メンズ&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'スカルプシャンプー（薄毛が気になる方）', url: 'https://www.amazon.co.jp/s?k=スカルプシャンプー+メンズ&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: 'ドライヤーで根元から乾かしている（自然乾燥していない）', guide: 'none',
          products: [{ name: 'ドライヤー（速乾・髪に優しい）', url: 'https://www.amazon.co.jp/s?k=ドライヤー+速乾+メンズ&tag=whero523-22', level: 'beginner', priceRange: 'mid' }] },
        { text: 'スタイリング剤を使っている', guide: 'none',
          products: [{ name: 'ウーノ スーパーハード（定番）', url: 'https://www.amazon.co.jp/s?k=ウーノ+スーパーハード&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'バーム系スタイリング剤（ナチュラル仕上げ）', url: 'https://www.amazon.co.jp/s?k=ヘアバーム+メンズ&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: 'トリートメントまたはアウトバスケアをしている', guide: 'LOW', isCurrentFor: 'concerned',
          products: [{ name: 'アウトバストリートメント（洗い流さないタイプ）', url: 'https://www.amazon.co.jp/s?k=洗い流さないトリートメント+メンズ&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: '美容師に「顔型・骨格に合う髪型」を相談したことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: '定期的に通う美容師を1人決めている', guide: 'MID' },
        { text: '自宅でのセット方法を美容師に教わったことがある', guide: 'HIGH' },
        { text: '毎朝のセットを5分以内に迷いなく再現できている', guide: 'LOW', isCurrentFor: 'pro' },
        { text: '季節や場面に合わせてスタイルを変えた経験がある', guide: 'MID' },
        { text: 'AGA・薄毛が気になる場合、専門クリニックに相談したことがある', guide: 'HIGH' },
      ],
      nail: [
        { text: '定期的に爪を切っている（1〜2週間に1回）', guide: 'none', isCurrentFor: 'none' },
        { text: '自分の爪の悩みを確認してみる（割れ・黄ばみ・形など）', guide: 'LOW', hint: '爪の状態によってケアの優先順位が変わる。まず現状を把握するだけでOK', isSelfCheck: true, bodyDataKey: 'nail_concerns', bodyDataMulti: true, bodyDataOptions: ['爪が割れやすい', '爪が薄い', '二枚爪になりやすい', '縦線が目立つ', '凸凹がある', '爪が黄ばんでいる', '甘皮が気になる', '噛み癖がある', '手の乾燥が気になる'] },
        { text: '爪やすりでバリや形を整えている', guide: 'none',
          products: [{ name: 'ガラス製爪やすり（水洗いOK）', url: 'https://www.amazon.co.jp/s?k=ガラス製+爪やすり&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: 'ハンドクリームで手・爪を保湿している', guide: 'none',
          products: [{ name: 'ニベア リッチケアハンドクリーム', url: 'https://www.amazon.co.jp/s?k=ニベア+ハンドクリーム&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: '爪の形を丸・スクエアなど意識して整えている', guide: 'LOW', isCurrentFor: 'concerned' },
        { text: 'ネイルオイルを使っている', guide: 'LOW',
          products: [{ name: 'OPI プロスパ ネイルオイル', url: 'https://www.amazon.co.jp/s?k=OPI+ネイルオイル&tag=whero523-22', level: 'intermediate', priceRange: 'low' }, { name: 'ネイルオイル（プチプラ）', url: 'https://www.amazon.co.jp/s?k=ネイルオイル+メンズ&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: '甘皮を押し上げるケアをしている', guide: 'MID', note: '切り取るのはNG。正しい方法はプロに教わるのが理想。', isCurrentFor: 'self' },
        { text: 'ネイルケアサロンでプロのケアを受けたことがある', guide: 'HIGH' },
        { text: '定期的にサロンでメンテナンスしている', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '爪ケアのサイクル（切る・やすり・保湿）が2週間以上途切れず続いている', guide: 'none' },
      ],
    };

    // ── サブトラック（肌・歯の内訳別・統合リスト形式） ──
    const MILESTONES_SUB = {
      skin_care: {
        steps: [
          { text: '洗顔・化粧水・乳液の3ステップが毎日できている', guide: 'none', isCurrentFor: 'none',
            products: [{ name: '肌ラボ 極潤 洗顔フォーム', url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+洗顔&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: '肌ラボ 極潤 ヒアルロン液（化粧水）', url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+化粧水&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'ニベア フェイス 乳液', url: 'https://www.amazon.co.jp/s?k=ニベア+フェイス+乳液&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
          { text: 'クレンジング（夜）と日焼け止め（朝）が習慣になっている', guide: 'none',
            products: [{ name: 'ビオレUV アクアリッチ（日焼け止め）', url: 'https://www.amazon.co.jp/s?k=ビオレUV+アクアリッチ&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'メンズビオレ クレンジング', url: 'https://www.amazon.co.jp/s?k=メンズ+クレンジング+洗顔&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
          { text: '自分の肌タイプを確認してみる（乾燥・脂性・混合）', guide: 'LOW', isCurrentFor: 'concerned', hint: '朝、何もつけずに1〜2時間過ごす。Tゾーンが脂っぽければ混合、全体的に突っ張れば乾燥肌', isSelfCheck: true, bodyDataKey: 'skin_type', bodyDataOptions: ['乾燥肌', '脂性肌（オイリー）', '混合肌', '普通肌', '敏感肌', '肌タイプがわからない'] },
          { text: '自分の肌悩みを1つ言葉にしてみる（ニキビ・毛穴・くすみ・赤みなど）', guide: 'LOW', hint: '鏡を見て「一番気になるのは？」と問いかけるだけ。答えがそのまま肌悩みになる', isSelfCheck: true, bodyDataKey: 'skin_concerns', bodyDataMulti: true, bodyDataOptions: ['毛穴', 'ニキビ・吹き出物', 'くすみ', '赤み', '乾燥・カサつき', 'テカリ', 'シミ・そばかす', 'ハリ・弾力不足', '色ムラ'] },
          { text: '角質ケアを取り入れている', guide: 'MID', isCurrentFor: 'self',
            products: [{ name: 'ピーリングジェル（週1回）', url: 'https://www.amazon.co.jp/s?k=ピーリングジェル+メンズ&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
          { text: '皮膚科またはエステで今の肌状態を1回診てもらったことがある', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: '診断をもとにスキンケアを1アイテム以上アップデートした', guide: 'HIGH',
            products: [{ name: 'WELEDA スキンフード（天然成分・有機認証）', url: 'https://www.amazon.co.jp/s?k=WELEDA+スキンフード&tag=whero523-22', level: 'advanced', priceRange: 'low' }] },
          { text: 'アップデートしたケアが3ヶ月以上途切れず続いている', guide: 'LOW' },
        ],
      },
      skin_hige: {
        headerNote: 'カミソリ・毛抜き・ワックスはNG。電動シェーバーのみ推奨。ひげが普通〜濃い人は医療脱毛が本命。',
        steps: [
          { text: '電動シェーバーを使っている（カミソリ・毛抜きNG）', guide: 'none', note: 'カミソリは剃るたびに皮膚まで削るため肌へのダメージが大きい', isCurrentFor: 'none' },
          { text: '剃り後に保湿している', guide: 'none' },
          { text: '自分のひげの濃さを確認してみる（薄い／普通〜濃い）', guide: 'LOW', note: '迷ったらカウンセリングで確認できる', hint: '剃った翌日に見て青みが強く残るほど濃いタイプ。薄い人は電動シェーバーで十分なことが多い', isCurrentFor: 'concerned', isSelfCheck: true, bodyDataKey: 'beard_density', bodyDataOptions: ['ひげが薄い（青みがほとんど残らない）', 'ひげが濃い（翌日に青みが残る）'] },
          { text: '医療脱毛クリニックのカウンセリングに行ったことがある', guide: 'HIGH', isCurrentFor: 'self' },
          { text: '脱毛を開始している', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: '脱毛完了後のスキンケアが習慣になっている', guide: 'MID' },
        ],
      },
      teeth_white: {
        steps: [
          { text: '毎日歯磨きをしている', guide: 'none', isCurrentFor: 'none',
            products: [{ name: '電動歯ブラシ（オーラルB）', url: 'https://www.amazon.co.jp/s?k=オーラルB+電動歯ブラシ&tag=whero523-22', level: 'intermediate', priceRange: 'mid' }] },
          { text: '歯間ブラシかフロスを使っている', guide: 'none',
            products: [{ name: 'GUM デンタルフロス', url: 'https://www.amazon.co.jp/s?k=GUM+デンタルフロス&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'ルシェロ 歯間ブラシ', url: 'https://www.amazon.co.jp/s?k=歯間ブラシ+細め&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
          { text: 'ホワイトニング配合の歯磨き粉を使っている', guide: 'none',
            products: [{ name: 'アパガード プレミオ', url: 'https://www.amazon.co.jp/s?k=アパガード+プレミオ&tag=whero523-22', level: 'intermediate', priceRange: 'low' }, { name: 'チェックアップ スタンダード', url: 'https://www.amazon.co.jp/s?k=チェックアップ+歯磨き粉&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
          { text: '自分の歯が黄ばんでいる原因を考えてみる（着色・加齢など）', guide: 'LOW', isCurrentFor: 'concerned', hint: 'コーヒー・お茶・タバコをよく摂るなら着色が原因。加齢の場合はホワイトニングが有効', isSelfCheck: true, bodyDataKey: 'teeth_concern', bodyDataOptions: ['着色（コーヒー・お茶・タバコ）', '加齢による黄ばみ', '元々の歯の色が薄い', 'よくわからない'] },
          { text: 'セルフホワイトニングサロンを体験したことがある', guide: 'MID' },
          { text: '歯科でPMTC（クリーニング）を受けたことがある', guide: 'HIGH', isCurrentFor: 'self' },
          { text: '歯科医にホワイトニングの方法・適性を相談したことがある', guide: 'HIGH' },
          { text: '歯科クリニックでオフィスホワイトニングを受けたことがある', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: 'ホワイトニングの効果を維持するケアをしている（着色食品を知るなど）', guide: 'LOW' },
          { text: '定期的にホワイトニングのメンテナンスをしている', guide: 'MID' },
        ],
      },
      teeth_ortho: {
        note: '⚠️ 矯正は長期・高額の意思決定です。他のステップより時間軸が長くなります。',
        steps: [
          { text: '自分の歯並びで気になる部分を言語化できている', guide: 'none', isCurrentFor: 'none' },
          { text: '矯正の種類を調べてみる（ワイヤー・マウスピース・裏側など）', guide: 'none', hint: '3種類あるとだけ知っておけばOK。詳細は無料カウンセリングで確認できる',
            detail: '① ワイヤー矯正：費用60〜100万円・期間1〜3年。確実に動かせる基本形。② マウスピース矯正（インビザラインなど）：70〜120万円・取り外し可能・自己管理が必要。③ 裏側矯正：80〜150万円・正面から見えない・費用は高め。どれが自分に向くかは歯並びの状態によって変わるため、無料カウンセリングで歯科医に診てもらうのが最短。' },
          { text: '矯正の費用・期間の相場をざっくり調べてみる', guide: 'none', hint: 'ワイヤー・マウスピースともに60〜100万円・1〜3年が目安。無料カウンセリングで正確な額がわかる',
            detail: '相場まとめ：ワイヤー矯正60〜100万円・1〜3年／マウスピース矯正70〜120万円・1〜2年／裏側矯正80〜150万円・1〜3年。クリニックによって開きが大きく、同じ治療でも30〜50万円差が出ることがある。複数クリニックの無料カウンセリングを比較するのがおすすめ。矯正は長期プロジェクトなので、担当医との相性と通院しやすさも重要な選択基準。' },
          { text: '矯正歯科の無料カウンセリングに行ったことがある', guide: 'HIGH', isCurrentFor: 'concerned' },
          { text: '「始める・後にする・しない」を意識的に決断している', guide: 'none' },
          { text: '矯正を開始している', guide: 'HIGH', isCurrentFor: 'self' },
          { text: '定期通院（月1回程度）を習慣化している', guide: 'HIGH' },
          { text: '矯正装置に慣れ、日常生活への支障がなくなっている', guide: 'LOW' },
          { text: '保定装置（リテーナー）に移行している', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: '保定期間のケアが習慣になっている', guide: 'MID' },
        ],
      },
    };

    // ── アクションタイプ: quick=即日一回 / habit=毎日毎週 / ongoing=数週間〜数ヶ月 ──
    const ACTION_TYPE_MAP = {
      body:        ['quick','quick','quick','habit','habit','quick','quick','quick','ongoing','ongoing','quick'],
      eyebrow:     ['quick','habit','quick','quick','habit','ongoing','ongoing','ongoing'],
      fashion:     ['quick','quick','quick','quick','quick','quick','quick','quick','quick','habit','habit'],
      hair:        ['ongoing','quick','quick','habit','habit','habit','habit','quick','ongoing','quick','habit','ongoing','quick'],
      nail:        ['habit','habit','habit','habit','habit','habit','quick','ongoing','ongoing'],
      skin_care:   ['habit','habit','quick','quick','habit','quick','quick','ongoing'],
      skin_hige:   ['habit','habit','quick','quick','ongoing','habit'],
      teeth_white: ['habit','habit','habit','quick','quick','quick','quick','quick','habit','ongoing'],
      teeth_ortho: ['quick','quick','quick','quick','quick','ongoing','ongoing','ongoing','ongoing','ongoing'],
    };
    function getActionType(axisKey, idx) {
      return (ACTION_TYPE_MAP[axisKey] || [])[idx] || 'ongoing';
    }

    // ── 全ステップを actionType 別フラットリストに展開（スキン・歯は全サブトラック同時表示）──
    function flattenAllSteps() {
      const result = [];
      const SUB_TRACKS = {
        skin:  ['skin_care', 'skin_hige'],
        teeth: ['teeth_white', 'teeth_ortho'],
      };
      for (const axisId of Object.keys(AREA_DEFS)) {
        const def = AREA_DEFS[axisId];
        const v = tv[axisId] || { current:1, ideal:3, care_type:'none' };
        const careType = v.care_type || 'none';
        const subKeys = SUB_TRACKS[axisId] || [axisId];
        for (const axisKey of subKeys) {
          const steps = axisKey in MILESTONES_SUB
            ? (MILESTONES_SUB[axisKey] || {}).steps || []
            : MILESTONES[axisKey] || [];
          const concernedIdx = steps.findIndex(s => s.isCurrentFor === 'concerned');
          const splitAt = concernedIdx > 0 ? concernedIdx : 0;
          const currentIdx = steps.findIndex(s => s.isCurrentFor === normalizeCareType(careType));
          steps.forEach((step, idx) => {
            const doneKey = (splitAt > 0 && idx < splitAt)
              ? `prereq-${axisKey}-${idx}` : `${axisKey}-${idx}`;
            result.push({
              axisId, axisKey, def, careType,
              step, idx, doneKey,
              actionType: getActionType(axisKey, idx),
              isDone: !!stepDone[doneKey],
              isCurrentPosition: (idx === currentIdx),
            });
          });
        }
      }
      return result;
    }

    // ── 軸フィルター状態 ──
    let activeAxisFilter = null;

    // ── ステップカードHTML ──
    function buildStepCard({ axisId, axisKey, def, step, idx, doneKey, isDone }, compassAxis, compassFirstUndoneKey) {
      const isCompassStep = axisId === compassAxis;
      const isGlobalCurrent = doneKey === compassFirstUndoneKey;
      let guideHtml = '';
      if (step.guide === 'HIGH') {
        const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
        guideHtml = `<div class="guide-badge guide-high"><span>🏥 ここはプロに任せると確実に変わる</span>${btn}</div>`;
      } else if (step.guide === 'MID') {
        const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
        guideHtml = `<div class="guide-badge guide-mid"><span>📋 プロと進めると精度が上がる</span>${btn}</div>`;
      }
      const noteHtml = step.note ? `<div class="milestone-note">💡 ${esc(step.note)}</div>` : '';
      const hintHtml = step.hint ? `<p class="step-hint">${esc(step.hint)}</p>` : '';
      const detailId = `detail-${axisKey}-${idx}`;
      const detailHtml = step.detail ? `
        <button class="step-detail-toggle" onclick="(function(btn){const panel=document.getElementById('${detailId}');panel.classList.toggle('open');btn.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'▲ 閉じる':'📖 答えを見る';})(this)">📖 答えを見る</button>
        <div class="step-detail-panel" id="${detailId}">${esc(step.detail)}</div>` : '';
      const svcCardId = (step.guide === 'HIGH' || step.guide === 'MID') && def.catLink ? `svc-${axisKey}-${idx}` : null;
      const svcCardHtml = svcCardId ? `<div id="${esc(svcCardId)}" class="inline-service-card" data-svc-cat="${esc(def.catLink)}"></div>` : '';
      let productsHtml = '';
      if (step.products && step.products.length > 0) {
        const _totalDone = Object.values(stepDone).filter(Boolean).length;
        const _userLevel = _totalDone >= 9 ? 'advanced' : _totalDone >= 3 ? 'intermediate' : 'beginner';
        const _lvRank = { beginner: 0, intermediate: 1, advanced: 2 };
        const _budgetRank = { low: 0, mid: 1, high: 2 };
        const _maxRank = _lvRank[_userLevel];
        let _budget = null;
        try { const _raw = localStorage.getItem('fineme:diagnosis:latest'); if (_raw) _budget = JSON.parse(_raw).budget || null; } catch {}
        const _maxBudgetRank = (!_budget || _budget === 'high' || _budget === 'premium') ? 2 : (_budget === 'mid' ? 1 : 0);
        const chips = step.products
          .filter(prod => (_lvRank[prod.level||'beginner']) <= _maxRank && (_budgetRank[prod.priceRange||'low']) <= _maxBudgetRank)
          .map((prod, pi) => {
            const prodKey = `prod-${axisKey}-${idx}-${pi}`;
            const isProdDone = !!stepDone[prodKey];
            return `<a href="${esc(prod.url)}" target="_blank" rel="noopener noreferrer" class="product-chip">🛒 ${esc(prod.name)}</a><button class="product-check-btn${isProdDone?' checked':''}" data-done-key="${esc(prodKey)}">${isProdDone?'✓ 使用中':'使ってる？'}</button>`;
          }).join('');
        if (chips) productsHtml = `<div class="product-suggestions">${chips}</div>`;
      }
      const compassTag = isGlobalCurrent ? `<span class="compass-pointing-badge">🧭 今ここ</span>` : '';
      const selfCheckBadge = step.isSelfCheck ? `<span class="selfcheck-badge"> 現状確認</span>` : '';
      const phaseMap = {
        none: { cls: 'phase-badge-week1',   label: '🌱 Week 1' },
        LOW:  { cls: 'phase-badge-week1_2', label: '🚀 Week 1-2' },
        HIGH: { cls: 'phase-badge-month1',  label: '📈 Month 1' },
        MID:  { cls: 'phase-badge-month2_3',label: '💎 Month 2-3' },
      };
      const phaseInfo = phaseMap[step.guide] || phaseMap['none'];
      const phaseBadge = `<span class="phase-badge ${phaseInfo.cls}">${phaseInfo.label}</span>`;
      const selfCheckValue = (step.isSelfCheck && bodyData[step.bodyDataKey])
        ? `<span class="selfcheck-value">✓ ${esc(Array.isArray(bodyData[step.bodyDataKey]) ? bodyData[step.bodyDataKey].join('・') : bodyData[step.bodyDataKey])}</span>`
        : '';
      const badgeBg    = isCompassStep ? 'rgba(201,168,76,0.15)' : 'rgba(10,15,30,0.50)';
      const badgeBorder = isCompassStep ? 'rgba(201,168,76,0.35)' : 'rgba(232,228,220,0.18)';
      const badgeColor  = isCompassStep ? '#c9a84c' : 'rgba(232,228,220,0.55)';
      const guideClass  = step.guide === 'HIGH' ? ' guide-high' : step.guide === 'MID' ? ' guide-mid' : '';
      return `
        <div class="step-card${isDone?' step-done':''}${isCompassStep?' step-compass':''}${step.isSelfCheck?' step-selfcheck':''}${guideClass}">
          <div class="step-check-btn-wrap">
            <button class="step-check-btn${isDone?' checked':''}" data-done-key="${esc(doneKey)}" title="${isDone?'完了を取り消す':'できてる・やった'}">${isDone?'✓':''}</button>
          </div>
          <div class="step-card-body">
            <div class="step-meta">
              <span class="step-axis-badge" style="background:${badgeBg};border-color:${badgeBorder};color:${badgeColor}">${esc(def.icon)} ${esc(def.label)}</span>
              ${phaseBadge}${compassTag}${selfCheckBadge}
            </div>
            <p class="step-text">${esc(step.text)}</p>
            ${selfCheckValue}
            ${hintHtml}${detailHtml}${guideHtml}${svcCardHtml}${noteHtml}${productsHtml}
          </div>
        </div>`;
    }

    // ── 現状把握バナー生成 ──
    const SELF_CHECK_ITEMS = [
      { key: 'body_concern',    label: '体型の気になる部分',   icon: '💪' },
      { key: 'body_goal',       label: '体型目標',             icon: '🎯' },
      { key: 'hair_type',       label: '髪質',                icon: '💇' },
      { key: 'hair_additional', label: '髪・頭皮の悩み',       icon: '🌿' },
      { key: 'face_shape',      label: '顔型',                icon: '🪞' },
      { key: 'face_type',       label: '顔タイプ',             icon: '🎭' },
      { key: 'skeletal_type',   label: '骨格タイプ',           icon: '🦴' },
      { key: 'fashion_self',    label: '目指すスタイル',        icon: '👔' },
      { key: 'skin_type',       label: '肌タイプ',             icon: '✨' },
      { key: 'skin_concerns',   label: '肌悩み',               icon: '🔬' },
      { key: 'beard_density',   label: 'ひげの濃さ',           icon: '🪒' },
      { key: 'teeth_concern',   label: '歯の黄ばみ原因',       icon: '🦷' },
      { key: 'eyebrow_concerns',label: '眉の悩み',             icon: '✂️' },
      { key: 'nail_concerns',   label: '爪の悩み',             icon: '💅' },
    ];
    function buildSelfCheckIntroHtml() {
      const undoneCount = SELF_CHECK_ITEMS.filter(item => !bodyData[item.key]).length;
      const anyFilled   = SELF_CHECK_ITEMS.some(item => bodyData[item.key]);
      // データが全くなければ非表示
      if (undoneCount === SELF_CHECK_ITEMS.length) return `
        <div class="selfcheck-intro-section" id="selfcheck-intro">
          <div class="selfcheck-intro-header">
            <span class="selfcheck-intro-icon">📍</span>
            <div style="flex:1">
              <p class="selfcheck-intro-title">まず自分の現状を把握しておこう</p>
              <p class="selfcheck-intro-desc">「📍 現状確認」バッジのステップをチェックするとMapが自分専用に最適化されます。</p>
            </div>
          </div>
        </div>`;
      const chips = SELF_CHECK_ITEMS.map(item => {
        const val = bodyData[item.key];
        const isDone = !!val;
        const valText = isDone ? (Array.isArray(val) ? val.join('・') : val) : '未確認';
        return `<span class="selfcheck-chip${isDone ? ' done' : ''}">${esc(item.icon)} ${esc(item.label)}${isDone ? '：' + esc(valText) : ''}</span>`;
      }).join('');
      if (undoneCount === 0) {
        return `
          <div class="selfcheck-intro-section" id="selfcheck-intro" style="background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.3)">
            <div class="selfcheck-intro-header">
              <span class="selfcheck-intro-icon">✅</span>
              <div style="flex:1">
                <p class="selfcheck-intro-title" style="color:rgba(52,211,153,0.9)">現状把握データ — 登録完了</p>
                <p class="selfcheck-intro-desc">このデータをもとにMapが最適化されています。タップで再選択できます。</p>
              </div>
            </div>
            <div class="selfcheck-chip-list">${chips}</div>
          </div>`;
      }
      return `
        <div class="selfcheck-intro-section" id="selfcheck-intro">
          <div class="selfcheck-intro-header">
            <span class="selfcheck-intro-icon">📍</span>
            <div style="flex:1">
              <p class="selfcheck-intro-title">現状把握データ（残り${undoneCount}項目）</p>
              <p class="selfcheck-intro-desc">「📍 現状確認」バッジのステップをチェックするとMapが自分専用に最適化されます。</p>
            </div>
          </div>
          <div class="selfcheck-chip-list">${chips}</div>
        </div>`;
    }

    // ── 3セクションHTML生成 ──
    function buildSectionsHtml() {
      const compassAxis = calcDynamicCompass();
      const allSteps = flattenAllSteps();
      const SECTIONS = [
        { type: 'quick',   icon: '⚡', label: '今すぐ動ける一手',         tabLabel: '今すぐ', desc: '今日中に完了できる。まずここから動こう' },
        { type: 'habit',   icon: '🔄', label: '毎日・毎週の習慣にする',   tabLabel: '毎日習慣', desc: '継続が変容を積み上げる。少しずつでOK' },
        { type: 'ongoing', icon: '🌊', label: 'じっくり取り組むプログラム', tabLabel: 'じっくり', desc: '数週間〜数ヶ月スパン。覚悟して始めると変わる' },
      ];

      // Compass軸の最初の未完了ステップのdoneKeyを特定（今ここバッジは全体で1個だけ）
      const compassFirstUndoneKey = allSteps
        .filter(s => s.axisId === compassAxis && !s.isDone)
        .sort((a, b) => a.idx - b.idx)[0]?.doneKey ?? null;

      // タブバー用の進捗を事前計算
      const sectionMeta = SECTIONS.map(({ type }) => {
        const steps = allSteps.filter(s => s.actionType === type);
        return { type, done: steps.filter(s => s.isDone).length, total: steps.length };
      });
      const tabBarHtml = `
        <div class="section-tab-bar" id="section-tab-bar">
          ${SECTIONS.map(({ type, icon, tabLabel }, i) => {
            const m = sectionMeta[i];
            return `<button class="section-tab" data-scroll-to="section-${type}">
              <span class="section-tab-icon">${icon}</span>
              <span>${esc(tabLabel)}</span>
              <span class="section-tab-progress">${m.done}/${m.total}</span>
            </button>`;
          }).join('')}
        </div>`;
      // ゴール
      const doneCount = Object.values(stepDone).filter(Boolean).length;
      const isReady       = doneCount >= 20;
      const isApproaching = doneCount >= 10;
      const cardBg     = isApproaching ? 'linear-gradient(135deg,rgba(201,168,76,0.10),rgba(10,15,30,0.30))' : 'rgba(10,15,30,0.35)';
      const cardBorder = isApproaching ? 'rgba(201,168,76,0.3)' : 'rgba(232,228,220,0.12)';
      const stageReadinessHtml = isReady ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;margin-bottom:18px">
          <span style="font-size:16px">🎉</span><span style="font-size:12px;font-weight:700;color:rgba(52,211,153,0.95)">このステージへ進む準備ができています！</span>
        </div>` : isApproaching ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.22);border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🧭</span><span style="font-size:12px;font-weight:700;color:rgba(201,168,76,0.95)">変容が着実に進んでいます。もう少しで発揮のステージへ。</span>
        </div>` : `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(10,15,30,0.40);border:1px dashed rgba(232,228,220,0.18);border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🔒</span><span style="font-size:12px;color:rgba(232,228,220,0.50);line-height:1.6">まずは変容ルートを歩もう。変化が積み重なるほど、このステージが近づいてくる。</span>
        </div>`;

      let html = buildSelfCheckIntroHtml() + tabBarHtml;
      const sectionHtmlParts = [];
      const usedArticleSlugs = new Set();
      SECTIONS.forEach(({ type, icon, label, desc }) => {
        const sectionSteps = allSteps
          .filter(s => s.actionType === type)
          .filter(s => !activeAxisFilter || s.axisId === activeAxisFilter)
          .sort((a, b) => {
            const aIsCompass = a.axisId === compassAxis ? 0 : 1;
            const bIsCompass = b.axisId === compassAxis ? 0 : 1;
            if (aIsCompass !== bIsCompass) return aIsCompass - bIsCompass;
            const ar = priorityOrder.indexOf(a.axisId); const br = priorityOrder.indexOf(b.axisId);
            return (ar === -1 ? 99 : ar) - (br === -1 ? 99 : br);
          });
        const doneInSection = sectionSteps.filter(s => s.isDone).length;
        const allDone = sectionSteps.length > 0 && doneInSection === sectionSteps.length;
        const hasSome = doneInSection > 0 && !allDone;
        const trailStatus = allDone ? 'ts-done' : hasSome ? 'ts-current' : 'ts-future';

        // guide:HIGH の直前に記事を差し込む（軸ごとに1回・Compass軸を優先）
        // 各軸の最初の guide:HIGH ステップのインデックスを収集
        const insertBefore = new Map(); // stepIdx → article
        const injectedAxes = new Set();
        // Compass軸 → 次に priority_order の順で処理
        const axisOrder = [compassAxis, ...priorityOrder.filter(a => a !== compassAxis)];
        for (const targetAxis of axisOrder) {
          const firstHighIdx = sectionSteps.findIndex(s => s.axisId === targetAxis && s.step.guide === 'HIGH');
          if (firstHighIdx === -1 || injectedAxes.has(targetAxis)) continue;
          const art = pickSectionArticle([targetAxis], compassAxis, usedArticleSlugs);
          if (art) {
            insertBefore.set(firstHighIdx, art);
            usedArticleSlugs.add(art.slug);
            injectedAxes.add(targetAxis);
          }
          if (insertBefore.size >= 2) break; // 1セクション最大2本
        }

        // ステップカードをレンダリング（記事を直前に挿入）
        const stepCardsHtml = sectionSteps.map((s, i) => {
          const art = insertBefore.get(i);
          const artHtml = art ? `
            <a href="/feature/${esc(art.slug)}" class="trail-article-node" target="_blank">
              <span class="trail-article-icon">📖</span>
              <div class="trail-article-body">
                <p class="trail-article-label">この一歩を踏み出す前に読む</p>
                <p class="trail-article-title">${esc(art.title)}</p>
              </div>
              <span class="trail-article-arrow">→</span>
            </a>` : '';
          return artHtml + buildStepCard(s, compassAxis, compassFirstUndoneKey);
        }).join('');

        sectionHtmlParts.push(`
          <div class="action-section" id="section-${type}">
            <span class="trail-stop ${trailStatus}" style="top:16px"></span>
            <div class="action-sec-header">
              <span class="action-sec-icon">${icon}</span>
              <div class="action-sec-body">
                <h3 class="action-sec-label">${esc(label)}</h3>
                <p class="action-sec-desc">${esc(desc)}</p>
              </div>
              <div class="action-sec-progress">${doneInSection}/${sectionSteps.length}</div>
            </div>
            <div class="action-step-list">
              ${stepCardsHtml}
            </div>
          </div>`);
      });
      html += `<div class="trail-container">${sectionHtmlParts.join('')}</div>`;

      // Next Stage
      html += `
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:32px;display:block;margin-top:16px">
          <line x1="50" y1="0" x2="50" y2="32" stroke="rgba(201,168,76,0.45)" stroke-width="2" stroke-dasharray="5 4"/>
        </svg>
        <div style="padding:16px 0 8px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:18px;height:1.5px;background:#c9a84c;flex-shrink:0;border-radius:1px"></div>
            <span style="font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(201,168,76,0.7)">Next Stage</span>
            <div style="flex:1;height:1px;background:repeating-linear-gradient(90deg,rgba(201,168,76,0.25) 0,rgba(201,168,76,0.25) 4px,transparent 4px,transparent 9px)"></div>
          </div>
          <p style="font-family:'Noto Serif JP',Georgia,serif;font-size:16px;font-weight:800;color:rgba(232,228,220,0.95);margin:0 0 6px;line-height:1.5">変わった自分を、世界へ発揮するステージ</p>
          <p style="font-size:12px;color:rgba(232,228,220,0.60);line-height:1.7;margin:0 0 16px">変容は発揮することで初めて完成する。外見の変化を最大限に活かすステージへ。</p>
          ${stageReadinessHtml}
          <div style="display:flex;flex-direction:column;gap:12px">
            <a href="/search?category=photo" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none">
              <span style="font-size:26px;flex-shrink:0">📸</span>
              <div style="flex:1"><p style="font-size:14px;font-weight:800;color:rgba(232,228,220,0.90);margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">プロフィール写真撮影</p><p style="font-size:12px;color:rgba(232,228,220,0.60);margin:0;line-height:1.6">変わった自分を、最高の一枚に。マッチングアプリの第一印象を決定的に変える。</p></div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
            <a href="/search?category=marriage" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none">
              <span style="font-size:26px;flex-shrink:0">💍</span>
              <div style="flex:1"><p style="font-size:14px;font-weight:800;color:rgba(232,228,220,0.90);margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">婚活サポート</p><p style="font-size:12px;color:rgba(232,228,220,0.60);margin:0;line-height:1.6">自信がついた今が、出会いを本気にするタイミング。変容の先にある、本当の出会いへ。</p></div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
          </div>
        </div>`;
      return html;
    }

    // ── カテゴリゴール（理想スコアの言語化） ──
    const IDEAL_GOALS = {
      body:    ['体型が気になる状態を終わらせる', '服が似合う体型をつくる', '自信を持てる体型を維持する', '体型が自信の核になっている', '体型が自分の特徴になっている'],
      eyebrow: ['眉の乱れをなくす', '顔に合う眉の形を持つ', '整った眉で第一印象が変わっている', '眉が顔の印象を決めている', '眉が自分の個性になっている'],
      fashion: ['服への迷いをなくす', '清潔感のある着こなしを持つ', '「なんかいい感じ」と言われる', '服が自信の道具になっている', '着こなしが自分の武器になっている'],
      hair:    ['髪への不安をなくす', '定期的に整えられている状態', '髪が印象の武器になっている', '髪型が「あの人らしい」と思われる', '髪が自分のアイデンティティになっている'],
      skin:    ['肌の気になりをなくす', '清潔感のある肌を保つ', '肌が第一印象の強みになっている', '肌への自信が日常になっている', '肌が自分の特徴になっている'],
      teeth:   ['口元の気になりをなくす', '笑顔を隠さなくなる', '歯・口元が清潔感の源になっている', '笑顔が自分の強みになっている', '歯への自信が当たり前になっている'],
      nail:    ['爪の乱れをなくす', '爪が「整っている」と気づかれる', '手先の細部が整っている', '爪が全体の印象を底上げしている', '細部の完成度が自信に繋がっている'],
    };

    // ── ゴール文 ──
    function getOverallGoal() {
      const VISION_MAP = {
        love_active:      '恋愛で、躊躇せず動けるようになっている',
        no_give_up:       '外見を理由に何かを諦めることが減っている',
        like_self:        '自分のことを、もう少し好きになっている',
        natural_confident:'自信が「自然な状態」になっている',
      };
      const CHANGE_MAP = {
        others_perception: '他の人からの見られ方・評価が変わる',
        self_confidence:   '自分の気持ち・自己肯定感が変わる',
        action_ease:       '行動のしやすさ・動けるようになること',
        life_options:      '外見を理由に諦めることが減ること',
      };
      return VISION_MAP[p.goal_vision] || CHANGE_MAP[p.goal_change] || '外見を起点に、自信を再設計する';
    }

    const tv = p.transform_vectors || {};
    const priorityOrder = p.priority_order || Object.keys(AREA_DEFS);
    const compassFirst  = p.compass_first  || priorityOrder[0] || 'body';
    const overallGoal   = getOverallGoal();

    // ── goal_scene（複数選択対応・後方互換） ──
    const GOAL_SCENE_LABELS = {
      first_impression: { icon:'🫀', label:'初対面' },
      date_confidence:  { icon:'💫', label:'デート' },
      photo_self:       { icon:'📸', label:'写真映え' },
      morning_mirror:   { icon:'🌅', label:'朝の鏡' },
      approach:         { icon:'🚀', label:'積極行動' },
    };
    const rawGoalScene = p.goal_scene;
    const goalScenes = Array.isArray(rawGoalScene)
      ? rawGoalScene
      : (rawGoalScene ? [rawGoalScene] : []);

    function buildGoalSceneHtml() {
      if (!goalScenes.length) return '';
      const pills = goalScenes
        .filter(v => GOAL_SCENE_LABELS[v])
        .map(v => {
          const g = GOAL_SCENE_LABELS[v];
          return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(201,168,76,0.09);border:1px solid rgba(201,168,76,0.22);color:rgba(232,228,220,0.80);white-space:nowrap">${esc(g.icon)} ${esc(g.label)}</span>`;
        }).join('');
      if (!pills) return '';
      return `<div style="margin:0 0 16px;padding:10px 14px;background:rgba(10,15,30,0.5);border:1px solid rgba(201,168,76,0.15);border-radius:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(201,168,76,0.55);white-space:nowrap;text-transform:uppercase">変容ゴール</span>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${pills}</div>
      </div>`;
    }

    // ── ルートパターン ──
    const ROUTE_PATTERNS = {
      recommend: [...new Set([...priorityOrder, ...Object.keys(AREA_DEFS)])].filter(id => AREA_DEFS[id]),
      impact:    ['eyebrow','hair','fashion','skin','body','teeth','nail'],
      ease:      ['eyebrow','nail','skin','hair','teeth','fashion','body'],
    };
    const PATTERN_LABELS = {
      recommend: '📍 推奨ルート',
      impact:    '👁 印象インパクト',
      ease:      '🚶 取り組みやすさ',
    };
    const PATTERN_DESCS = {
      recommend: 'Me Scanの診断結果に基づく推奨順',
      impact:    '他人の印象に最も早く影響する順（眉→髪→服→肌→体型→歯→爪）',
      ease:      '費用・手間が少ない順（始めやすさ優先）',
    };
    let activePattern = '';
    try { activePattern = localStorage.getItem('fineme:navi:pattern') || 'recommend'; } catch { activePattern = 'recommend'; }
    const expandedStations = new Set();

    function getRouteOrder() {
      return ROUTE_PATTERNS[activePattern] || ROUTE_PATTERNS.recommend;
    }

    // ── 動的Compass計算 ──
    function calcDynamicCompass() {
      const doneAxes = new Set(
        Object.entries(axisProgress).filter(([,v]) => v === 'done').map(([k]) => k)
      );
      const compassOverride = localStorage.getItem('fineme:compass:override');
      // overrideが設定されていて、かつdone済みでなければ尊重
      if (compassOverride && AREA_DEFS[compassOverride] && !doneAxes.has(compassOverride)) {
        return compassOverride;
      }
      // priority_order の中で done でない最初の軸
      const next = priorityOrder.find(id => !doneAxes.has(id));
      return next || compassFirst;
    }

    function buildCompassHtml() {
      const currentAxis = calcDynamicCompass();
      const def = AREA_DEFS[currentAxis] || {};
      const doneCount = Object.values(axisProgress).filter(v => v === 'done').length;
      const progressNote = doneCount > 0
        ? `<span style="font-size:11px;color:rgba(201,168,76,.65);margin-left:6px">（${doneCount}軸ひと段落済み）</span>`
        : '';
      return `
        <div class="compass-strip" id="compass-strip">
          <div class="compass-strip-icon">${esc(def.icon||'🧭')}</div>
          <div class="compass-strip-body">
            <p class="compass-strip-label">Fineme Compass — 今向くべき方角${progressNote}</p>
            <p class="compass-strip-text">${esc(def.label||'—')}</p>
          </div>
          <a href="/search?category=${esc(def.catLink||'consulting')}&diag=1" class="compass-strip-cta">探す</a>
        </div>
      `;
    }

    // ── サブトラックフォーカス（buildTrack内で毎回読む） ──
    function getSkinFocus()  { return localStorage.getItem('fineme:skin:focus')  || 'care'; }
    function getTeethFocus() { return localStorage.getItem('fineme:teeth:focus') || 'white'; }

    // ── 出発前チェック全体の進捗 ──
    function getAllPrereqInfo() {
      const simpleAxes = ['body', 'eyebrow', 'fashion', 'hair', 'nail'];
      const skinKey  = getSkinFocus()  === 'hige'  ? 'skin_hige'   : 'skin_care';
      const teethKey = getTeethFocus() === 'ortho' ? 'teeth_ortho' : 'teeth_white';
      let total = 0, done = 0;
      simpleAxes.forEach(axisKey => {
        const steps = MILESTONES[axisKey] || [];
        const idx = steps.findIndex(s => s.isCurrentFor === 'concerned');
        const splitAt = idx > 0 ? idx : 0;
        for (let i = 0; i < splitAt; i++) { total++; if (stepDone[`prereq-${axisKey}-${i}`]) done++; }
      });
      [skinKey, teethKey].forEach(axisKey => {
        const subData = MILESTONES_SUB[axisKey];
        if (!subData) return;
        const steps = subData.steps || [];
        const idx = steps.findIndex(s => s.isCurrentFor === 'concerned');
        const splitAt = idx > 0 ? idx : 0;
        for (let i = 0; i < splitAt; i++) { total++; if (stepDone[`prereq-${axisKey}-${i}`]) done++; }
      });
      return { total, done, allDone: total > 0 && done >= total };
    }

    function buildPrereqBannerHtml() {
      const { total, done, allDone } = getAllPrereqInfo();
      if (allDone) return '';
      return `
        <div class="prereq-banner" id="prereq-banner">
          <div class="prereq-banner-icon">📋</div>
          <div class="prereq-banner-body">
            <p class="prereq-banner-title">まず「出発前チェック」から始めよう</p>
            <p class="prereq-banner-desc">各停留所を展開すると出発前チェックが確認できます ·
              <span class="prereq-banner-count">${done}/${total} チェック済み</span>
            </p>
          </div>
        </div>`;
    }

    // ── マイルストーンHTML生成（共通） ──
    function buildMilestoneItems(steps, careType, isExpanded, catLink, axisKey) {
      const currentIdx = steps.findIndex(s => s.isCurrentFor === careType);
      // isCurrentFor: 'concerned' 以前のステップを「出発前チェック」として分離
      const concernedIdx = steps.findIndex(s => s.isCurrentFor === 'concerned');
      const splitAt = concernedIdx > 0 ? concernedIdx : 0;
      const prereqSteps = splitAt > 0 ? steps.slice(0, splitAt) : [];
      const mainSteps   = steps.slice(splitAt);

      // 出発前チェックHTML
      let prereqHtml = '';
      if (prereqSteps.length > 0) {
        const prereqItems = prereqSteps.map((step, i) => {
          const doneKey = `prereq-${axisKey}-${i}`;  // メインステップと別キー空間
          const isDone = !!stepDone[doneKey];
          return `
            <div class="prereq-item${isDone ? ' step-done' : ''}">
              <div class="prereq-box${isDone ? ' checked' : ''}" data-done-key="${esc(doneKey)}">${isDone ? '✓' : ''}</div>
              <span class="prereq-text">${esc(step.text)}</span>
            </div>`;
        }).join('');
        prereqHtml = `
          <div class="prereq-section">
            <div class="prereq-header">
              <span class="prereq-title">出発前チェック（任意）</span>
            </div>
            <p class="prereq-note">全部揃ってなくてもOK。いきなりプロに頼むのも正解です。</p>
            ${prereqItems}
          </div>`;
      }

      // メインステップHTML（Layer1→Layer2 区切りを proIdx で自動挿入）
      const proIdxInMain = mainSteps.findIndex(s => s.isCurrentFor === 'pro');
      const layer2Divider = '<div class="layer2-divider"><div class="layer2-divider-line"></div><span class="layer2-divider-label">継続・アップデートフェーズ</span><div class="layer2-divider-line"></div></div>';
      const items = mainSteps.map((step, j) => {
        const i = splitAt + j; // 元のインデックス（doneKeyのため）
        const doneKey = `${axisKey}-${i}`;
        const isDone = !!stepDone[doneKey];
        const isCurrentPosition = (i === currentIdx);
        const dotClass = isCurrentPosition ? 'current' : (i < currentIdx || isDone ? 'past' : 'future');
        const labelHtml = isCurrentPosition ? '<span class="milestone-current-tag">★ 現在地</span>' : '';
        let guideHtml = '';
        if (step.guide === 'HIGH') {
          const btn = catLink ? `<a href="/search?category=${esc(catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
          guideHtml = `<div class="guide-badge guide-high"><span>🏥 ここはプロに任せると確実に変わる</span>${btn}</div>`;
        } else if (step.guide === 'MID') {
          const btn = catLink ? `<a href="/search?category=${esc(catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
          guideHtml = `<div class="guide-badge guide-mid"><span>📋 プロと進めると精度が上がる</span>${btn}</div>`;
        } else if (step.guide === 'LOW') {
          guideHtml = `<span class="guide-badge guide-low">🏥</span>`;
        }
        const noteHtml = step.note ? `<div class="milestone-note">💡 ${esc(step.note)}</div>` : '';
        const hintHtml = step.hint ? `<p class="step-hint">${esc(step.hint)}</p>` : '';
        const mDetailId = `detail-${axisKey}-${i}`;
        const mDetailHtml = step.detail ? `
          <button class="step-detail-toggle" onclick="(function(btn){const panel=document.getElementById('${mDetailId}');panel.classList.toggle('open');btn.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'▲ 閉じる':'📖 答えを見る';})(this)">📖 答えを見る</button>
          <div class="step-detail-panel" id="${mDetailId}">${esc(step.detail)}</div>` : '';
        const mSvcId = (step.guide === 'HIGH' || step.guide === 'MID') && catLink ? `svc-${axisKey}-${i}` : null;
        const mSvcHtml = mSvcId ? `<div id="${esc(mSvcId)}" class="inline-service-card" data-svc-cat="${esc(catLink)}"></div>` : '';
        let productsHtml = '';
        if (step.products && step.products.length > 0) {
          // level×budget 2軸フィルター
          const _totalDone = Object.values(stepDone).filter(Boolean).length;
          const _userLevel = _totalDone >= 9 ? 'advanced' : _totalDone >= 3 ? 'intermediate' : 'beginner';
          const _lvRank = { beginner: 0, intermediate: 1, advanced: 2 };
          const _budgetRank = { low: 0, mid: 1, high: 2 };
          const _maxRank = _lvRank[_userLevel];
          let _budget = null;
          try { const _raw = localStorage.getItem('fineme:diagnosis:latest'); if (_raw) _budget = JSON.parse(_raw).budget || null; } catch {}
          const _maxBudgetRank = (!_budget || _budget === 'high' || _budget === 'premium') ? 2 : (_budget === 'mid' ? 1 : 0);
          const chips = step.products
            .map((prod, pi) => ({ prod, pi }))
            .filter(({ prod }) => {
              const lvOk = (_lvRank[prod.level || 'beginner']) <= _maxRank;
              const prOk = (_budgetRank[prod.priceRange || 'low']) <= _maxBudgetRank;
              return lvOk && prOk;
            })
            .map(({ prod, pi }) => {
              const prodKey = `prod-${axisKey}-${i}-${pi}`;
              const isProdDone = !!stepDone[prodKey];
              return `<a href="${esc(prod.url)}" target="_blank" rel="noopener noreferrer" class="product-chip">🛒 ${esc(prod.name)}</a><button class="product-check-btn${isProdDone?' checked':''}" data-done-key="${esc(prodKey)}" title="${isProdDone?'使用中を取り消す':'使っている・試した'}">${isProdDone?'✓ 使用中':'使ってる？'}</button>`;
            }).join('');
          if (chips) productsHtml = `<div class="product-suggestions">${chips}</div>`;
        }
        const checkBtn = `<button class="step-check-btn${isDone?' checked':''}" data-done-key="${esc(doneKey)}" title="${isDone?'完了を取り消す':'できてる・やった'}">${isDone?'✓':''}</button>`;
        const dividerBefore = (proIdxInMain > 0 && j === proIdxInMain) ? layer2Divider : '';
        return dividerBefore + `
          <div class="milestone-item${isDone?' step-done':''}">
            <div class="milestone-dot-wrap">
              ${j > 0 ? '<div class="milestone-connector"></div>' : ''}
              <div class="milestone-dot ${dotClass}"></div>
            </div>
            <div style="padding-top:${j>0?'12px':'0'};padding-right:36px;flex:1">
              ${labelHtml}
              <p class="milestone-text">${esc(step.text)}</p>
              ${hintHtml}${mDetailHtml}${guideHtml}${mSvcHtml}${noteHtml}${productsHtml}
            </div>
            ${checkBtn}
          </div>
        `;
      }).join('');

      const collapseClass = isExpanded ? '' : ' collapsed';
      const mainCount = mainSteps.length;
      const expandBtn = isExpanded ? '' : `<button class="milestone-expand-btn" data-expand="true">＋ すべてのステップを見る（${mainCount}ステップ）</button>`;
      return `${prereqHtml}<div class="milestone-list${collapseClass}">${items}</div>${expandBtn}`;
    }

    // ── ミニ進捗ドット（折りたたみ時） ──
    function getMiniProgressDots(id, careType) {
      let steps, axisKey;
      if (id === 'skin') {
        const sk = getSkinFocus() === 'hige' ? 'skin_hige' : 'skin_care';
        steps = (MILESTONES_SUB[sk] || {}).steps || [];
        axisKey = sk;
      } else if (id === 'teeth') {
        const tk = getTeethFocus() === 'ortho' ? 'teeth_ortho' : 'teeth_white';
        steps = (MILESTONES_SUB[tk] || {}).steps || [];
        axisKey = tk;
      } else {
        steps = MILESTONES[id] || [];
        axisKey = id;
      }
      const currentIdx = steps.findIndex(s => s.isCurrentFor === careType);
      return steps.map((_, i) => {
        const isDone = !!stepDone[`${axisKey}-${i}`];
        const isCur = i === currentIdx;
        return `<div class="smp-dot${isDone ? ' done' : isCur ? ' cur' : ''}"></div>`;
      }).join('');
    }

    // ── 毎日の習慣セクション ──
    function buildHabitSection(id) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const skinFocus  = getSkinFocus();
      const teethFocus = getTeethFocus();
      let axisKey = id;
      if (id === 'skin')  axisKey = skinFocus  === 'hige'  ? 'skin_hige'   : 'skin_care';
      if (id === 'teeth') axisKey = teethFocus === 'ortho' ? 'teeth_ortho' : 'teeth_white';
      const actionTypes = ACTION_TYPE_MAP[axisKey] || [];
      const habitIdxs = actionTypes.map((t, i) => t === 'habit' ? i : -1).filter(i => i >= 0);
      if (habitIdxs.length === 0) return '';
      const allSteps = axisKey in MILESTONES_SUB
        ? (MILESTONES_SUB[axisKey] || {}).steps || []
        : MILESTONES[axisKey] || [];
      const items = habitIdxs.map(i => {
        const step = allSteps[i];
        if (!step) return '';
        const habitKey = 'habit-' + axisKey + '-' + i;
        const storageKey = 'fineme:habit:' + habitKey + ':' + todayStr;
        const isDoneToday = localStorage.getItem(storageKey) === 'done';
        let streakCount = 0;
        try {
          const raw = localStorage.getItem('fineme:streak:' + habitKey);
          if (raw) {
            const d = JSON.parse(raw);
            const yestStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (d.lastDate === todayStr || d.lastDate === yestStr) streakCount = d.count || 0;
          }
        } catch {}
        const streakHtml = streakCount > 0
          ? '<span class="habit-streak">🔥 ' + streakCount + '日</span>'
          : '<span class="habit-streak" style="opacity:.2">—</span>';
        return '<div class="habit-item">'
          + '<span class="habit-item-text">' + esc(step.text) + '</span>'
          + streakHtml
          + '<button class="habit-check-today' + (isDoneToday ? ' done-today' : '') + '"'
          + ' data-habit-key="' + esc(habitKey) + '" data-today="' + esc(todayStr) + '">'
          + (isDoneToday ? '✓ できた' : '今日できた？')
          + '</button></div>';
      }).filter(Boolean).join('');
      if (!items) return '';
      return '<div class="habit-section">'
        + '<div class="habit-section-title">毎日の習慣</div>'
        + items + '</div>';
    }

    // ── ステーションHTMLを生成（ジグザグルート案内型） ──
    function buildStation(id, routeIndex) {
      const def = AREA_DEFS[id];
      if (!def) return '';
      const v = tv[id] || { current:1, ideal:3, gap:2, tier:def.tier, care_type:'none' };
      const careType = v.care_type || 'none';
      const currentPct = Math.min((v.current / 5) * 100, 100).toFixed(1);
      const idealPct   = Math.min((v.ideal   / 5) * 100, 100).toFixed(1);
      const idealGoalText = (IDEAL_GOALS[id] || [])[Math.min(v.ideal - 1, 4)] || `${def.label}の理想を実現する`;
      const statusVal = axisProgress[id] || '';
      const isDoneAxis = statusVal === 'done';
      const isCompass = calcDynamicCompass() === id;
      const isExpanded = isCompass || expandedStations.has(id);

      // 配置クラス: Compass=全幅、偶数=左寄り、奇数=右寄り
      const posClass = isCompass ? 'station-compass' : (routeIndex % 2 === 0 ? 'station-left' : 'station-right');

      // 状態インジケーター
      const dotClass = isDoneAxis ? 'sic-done' : isCompass ? 'sic-current' : statusVal === 'active' ? 'sic-active' : 'sic-future';
      const stateLabel = isDoneAxis ? 'ひと段落 ✅' : isCompass ? '今ここ 🧭' : statusVal === 'active' ? '取り組み中 🔵' : getCareLabel(careType);

      if (!isExpanded) {
        // ── 折りたたみミニカード ──
        const rowClass = isDoneAxis ? ' station-done-row' : '';
        return `
          <div class="station ${posClass}" id="station-${id}">
            <div class="station-mini-card">
              <div class="sic-wrap">
                <div class="sic-dot ${dotClass}"></div>
                <span class="sic-label">${esc(stateLabel)}</span>
              </div>
              <div class="station-row${rowClass}">
                <span class="station-icon-sm">${esc(def.icon)}</span>
                <span class="station-name-sm">${esc(def.label)}</span>
                <button class="station-expand-btn" data-expand-station="${esc(id)}">詳細を見る</button>
              </div>
              <div class="station-mini-progress">${getMiniProgressDots(id, careType)}</div>
            </div>
          </div>
        `;
      }

      // ── 展開カード（milestoneHTML生成） ──
      const skinFocus  = getSkinFocus();
      const teethFocus = getTeethFocus();
      let milestoneHtml = '';
      if (id === 'skin') {
        const subKey = skinFocus === 'hige' ? 'skin_hige' : 'skin_care';
        const subData = MILESTONES_SUB[subKey] || MILESTONES_SUB['skin_care'];
        const steps = subData.steps || [];
        const headerNoteHtml = subData.headerNote ? `<p class="subtab-header-note">ℹ️ ${esc(subData.headerNote)}</p>` : '';
        milestoneHtml = `
          <div class="subtab-wrap">
            <button class="subtab-btn${skinFocus==='care'?' active':''}" data-subtab="skin" data-val="care">✨ スキンケア</button>
            <button class="subtab-btn${skinFocus==='hige'?' active':''}" data-subtab="skin" data-val="hige">🪒 ひげケア</button>
          </div>
          ${headerNoteHtml}
          ${buildMilestoneItems(steps, careType, true, def.catLink, subKey)}
        `;
      } else if (id === 'teeth') {
        const subKey = teethFocus === 'ortho' ? 'teeth_ortho' : 'teeth_white';
        const subData = MILESTONES_SUB[subKey] || MILESTONES_SUB['teeth_white'];
        const steps = subData.steps || [];
        const orthoNote = subData.note ? `<p class="subtab-note">${esc(subData.note)}</p>` : '';
        milestoneHtml = `
          <div class="subtab-wrap">
            <button class="subtab-btn${teethFocus==='white'?' active':''}" data-subtab="teeth" data-val="white">🦷 ホワイトニング</button>
            <button class="subtab-btn${teethFocus==='ortho'?' active':''}" data-subtab="teeth" data-val="ortho">😬 歯並び（矯正）</button>
          </div>
          ${orthoNote}
          ${buildMilestoneItems(steps, careType, true, def.catLink, subKey)}
        `;
      } else {
        const steps = MILESTONES[id] || [];
        milestoneHtml = buildMilestoneItems(steps, careType, true, def.catLink, id);
      }

      const compassBadge = isCompass ? '<span class="compass-pointing-badge">🧭 今ここ</span>' : '';
      const STATUS_BTN_LABELS = { '': '○ 未着手', 'active': '🔵 取り組み中', 'done': '✅ ひと段落' };
      return `
        <div class="station ${posClass}" id="station-${id}">
          <div class="station-card">
            <div class="station-card-header">
              <div class="station-title">${esc(def.icon)} ${esc(def.label)}${compassBadge}</div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span class="track-tier-badge tb-${def.tier}">${esc(TIER_LABELS[def.tier]||'')}</span>
                <span class="track-care-badge">${esc(getCareLabel(careType))}</span>
                <button class="station-collapse-btn" data-collapse-station="${esc(id)}">折りたたむ ↑</button>
              </div>
            </div>

            <div class="track-progress">
              <div class="track-progress-labels">
                <span>現在地</span>
                <span>★ ${esc(idealGoalText)}</span>
              </div>
              <div class="track-progress-track">
                <div class="track-progress-current" style="width:${currentPct}%"></div>
                <div class="track-progress-ideal" style="left:${idealPct}%"></div>
              </div>
            </div>

            ${milestoneHtml}
            ${buildHabitSection(id)}

            <div style="margin-top:14px">
              <div class="milestone-item" style="padding:0">
                <div class="milestone-dot-wrap">
                  <div class="milestone-connector"></div>
                  <div class="milestone-dot goal"></div>
                </div>
                <div style="padding-top:12px">
                  <span class="milestone-goal-tag">ゴール</span>
                  <p class="milestone-text" style="font-weight:700;color:#c9a84c">${esc(idealGoalText)}</p>
                </div>
              </div>
            </div>

            ${def.articleQ ? `
            <a href="/feature?q=${esc(def.articleQ)}" class="track-article-link">
              📖 この軸に関連する読み物を見る →
            </a>` : ''}

            <div class="track-action">
              <a href="/search?category=${esc(def.catLink)}&diag=1" class="track-action-link">
                ${esc(def.icon)} ${esc(def.label)}のプロを探す →
              </a>
              <button class="track-status-btn" data-axis="${esc(id)}" data-status="${esc(statusVal)}">
                ${esc(STATUS_BTN_LABELS[statusVal] || '○ 未着手')}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // ── ページ組み立て ──
    function buildRouteContainerHtml() {
      const routeOrder = getRouteOrder();
      const compassAxis = calcDynamicCompass();

      // 停留所のノード位置X（%）: Compass=中央、偶数=左カード中央(36%)、奇数=右カード中央(64%)
      function getNodeX(idx) {
        if (routeOrder[idx] === compassAxis) return 50;
        return idx % 2 === 0 ? 36 : 64;
      }

      // 停留所間をつなぐ斜め線SVG（カード中央から中央へ）
      function buildConnectorSvg(fromIdx, toIdx) {
        const x1 = getNodeX(fromIdx);
        const x2 = getNodeX(toIdx);
        return `<div style="margin:-2px 0;overflow:visible"><svg viewBox="0 0 100 36" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:36px;display:block;overflow:visible">
          <line x1="${x1}" y1="0" x2="${x2}" y2="36" stroke="rgba(201,168,76,0.65)" stroke-width="2" stroke-dasharray="5 4"/>
        </svg></div>`;
      }

      // スタートノード
      const firstX = routeOrder.length > 0 ? getNodeX(0) : 50;
      const startHtml = `
        <div style="position:relative;height:64px">
          <svg viewBox="0 0 100 64" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
            <line x1="${firstX}" y1="40" x2="${firstX}" y2="64" stroke="rgba(201,168,76,0.55)" stroke-width="2" stroke-dasharray="5 4"/>
          </svg>
          <div style="position:absolute;top:4px;left:${firstX}%;transform:translateX(-50%);text-align:center;line-height:1.2;pointer-events:none">
            <div style="font-size:24px">🏁</div>
            <div style="font-size:9px;font-weight:800;letter-spacing:.1em;color:rgba(201,168,76,0.7);text-transform:uppercase;margin-top:2px">出発点</div>
          </div>
        </div>
      `;

      // ステーション + コネクター
      let html = startHtml;
      routeOrder.forEach((id, i) => {
        html += buildStation(id, i);
        if (i < routeOrder.length - 1) html += buildConnectorSvg(i, i + 1);
      });

      // ゴールノード
      const lastX = routeOrder.length > 0 ? getNodeX(routeOrder.length - 1) : 50;
      html += `
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:40px;display:block;margin-top:-2px">
          <line x1="${lastX}" y1="0" x2="50" y2="38" stroke="rgba(201,168,76,0.55)" stroke-width="2" stroke-dasharray="5 4"/>
        </svg>
        <div style="text-align:center;padding:4px 0 28px">
          <div style="font-size:24px;margin-bottom:4px">⭐</div>
          <p style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(201,168,76,0.7);margin:0 0 4px">ゴール</p>
          <p style="font-size:14px;font-weight:700;color:rgba(232,228,220,0.90);margin:0">${esc(overallGoal)}</p>
        </div>
      `;

      // ── 発揮ステージ ──
      const doneCount = Object.values(stepDone).filter(Boolean).length;
      const isReady      = doneCount >= 20;
      const isApproaching = doneCount >= 10;

      const stageReadinessHtml = isReady ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;margin-bottom:18px">
          <span style="font-size:16px">🎉</span>
          <span style="font-size:12px;font-weight:700;color:rgba(52,211,153,0.95)">このステージへ進む準備ができています！</span>
        </div>
      ` : isApproaching ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.22);border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🧭</span>
          <span style="font-size:12px;font-weight:700;color:rgba(201,168,76,0.95)">変容が着実に進んでいます。もう少しで発揮のステージへ。</span>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(10,15,30,0.40);border:1px dashed rgba(232,228,220,0.18);border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🔒</span>
          <span style="font-size:12px;color:rgba(232,228,220,0.50);line-height:1.6">まずは上の変容ルートを歩もう。変化が積み重なるほど、このステージが近づいてくる。</span>
        </div>
      `;

      const cardBg    = isApproaching ? 'linear-gradient(135deg,rgba(201,168,76,0.10),rgba(10,15,30,0.30))' : 'rgba(10,15,30,0.35)';
      const cardBorder = isApproaching ? 'rgba(201,168,76,0.3)' : 'rgba(232,228,220,0.12)';

      html += `
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:32px;display:block">
          <line x1="50" y1="0" x2="50" y2="32" stroke="rgba(201,168,76,0.45)" stroke-width="2" stroke-dasharray="5 4"/>
        </svg>

        <div style="padding:20px 0 8px">
          <!-- sec-label -->
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:18px;height:1.5px;background:#c9a84c;flex-shrink:0;border-radius:1px"></div>
            <span style="font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(201,168,76,0.7)">Next Stage</span>
            <div style="flex:1;height:1px;background:repeating-linear-gradient(90deg,rgba(201,168,76,0.25) 0,rgba(201,168,76,0.25) 4px,transparent 4px,transparent 9px)"></div>
          </div>

          <p style="font-family:'Noto Serif JP',Georgia,serif;font-size:16px;font-weight:800;color:rgba(232,228,220,0.95);margin:0 0 6px;line-height:1.5">変わった自分を、世界へ発揮するステージ</p>
          <p style="font-size:12px;color:rgba(232,228,220,0.60);line-height:1.7;margin:0 0 16px">変容は発揮することで初めて完成する。外見の変化を最大限に活かすステージへ。</p>

          ${stageReadinessHtml}

          <div style="display:flex;flex-direction:column;gap:12px">
            <a href="/search?category=photo" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none;transition:border-color .2s">
              <span style="font-size:26px;flex-shrink:0">📸</span>
              <div style="flex:1">
                <p style="font-size:14px;font-weight:800;color:rgba(232,228,220,0.90);margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">プロフィール写真撮影</p>
                <p style="font-size:12px;color:rgba(232,228,220,0.60);margin:0;line-height:1.6">変わった自分を、最高の一枚に。マッチングアプリの第一印象を決定的に変える。</p>
              </div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
            <a href="/search?category=marriage" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none;transition:border-color .2s">
              <span style="font-size:26px;flex-shrink:0">💍</span>
              <div style="flex:1">
                <p style="font-size:14px;font-weight:800;color:rgba(232,228,220,0.90);margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">婚活サポート</p>
                <p style="font-size:12px;color:rgba(232,228,220,0.60);margin:0;line-height:1.6">自信がついた今が、出会いを本気にするタイミング。変容の先にある、本当の出会いへ。</p>
              </div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
          </div>
        </div>
      `;

      return html;
    }

    function buildMatchedProductsHtml() {
      if (!naviProducts.length) return '';
      const userConcerns = new Set();
      Object.values(bodyData).forEach(v => {
        if (Array.isArray(v)) v.forEach(x => userConcerns.add(x));
        else if (v) userConcerns.add(v);
      });
      const AXIS_LABEL = { body:'体型', skin:'肌', eyebrow:'眉', hair:'髪', teeth:'歯', nail:'爪', fashion:'服' };
      const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };
      const BUDGET_RANK = { low: 0, mid: 1, high: 2 };
      const doneCount = Object.values(stepDone).filter(Boolean).length;
      const userLevelRank = doneCount >= 9 ? 2 : doneCount >= 3 ? 1 : 0;
      const currentCompass = calcDynamicCompass();
      const displayAxes = new Set(currentCompass ? [currentCompass] : []);
      priorityOrder.slice(0, 5).forEach(a => displayAxes.add(a));
      const cards = naviProducts
        .filter(p => displayAxes.has(p.axis) && LEVEL_RANK[p.level || 'beginner'] <= userLevelRank)
        .map(p => {
          const concerns = p.target_concerns || [];
          const matched = userConcerns.size > 0 && concerns.some(c => userConcerns.has(c));
          return { ...p, matched };
        })
        .sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0))
        .slice(0, 12)
        .map(p => `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" class="navi-product-card${p.matched ? ' matched' : ''}">
          <span class="navi-product-axis">${esc(AXIS_LABEL[p.axis] || p.axis)}</span>
          ${p.matched ? '<span class="navi-product-match-badge">あなた向け</span>' : ''}
          <span class="navi-product-name">${esc(p.name)}</span>
          <span class="navi-product-cta">Amazonで見る →</span>
        </a>`).join('');
      if (!cards) return '';
      const hasMatch = userConcerns.size > 0 && naviProducts.some(p => (p.target_concerns||[]).some(c => userConcerns.has(c)));
      return `<div class="navi-products-section">
        <p class="sec-label">🛒 旅に役立つアイテム</p>
        <p style="font-size:11px;color:rgba(232,228,220,0.35);margin:0 0 10px;line-height:1.5">${hasMatch ? 'あなたのプロフィールに合うアイテムが見つかりました ✦' : 'あなたのCompass軸に関連するアイテム'} ← スワイプで全部見る</p>
        <div class="navi-product-carousel">${cards}</div>
      </div>`;
    }

    // ── Today's Quest ──
    function buildTodayQuestHtml() {
      const compassAxis = calcDynamicCompass();
      const allSteps = flattenAllSteps();
      const nextStep = allSteps
        .filter(s => s.axisId === compassAxis && !s.isDone)
        .sort((a, b) => a.idx - b.idx)[0];
      if (!nextStep) return '';
      const { axisKey, def, step, doneKey } = nextStep;
      const isDone = !!stepDone[doneKey];
      const guideText = step.guide === 'HIGH' ? '🏥 ここはプロに任せると確実に変わる'
        : step.guide === 'MID' ? '📋 プロと進めると精度が上がる' : '';
      const svcPlaceholder = (step.guide === 'HIGH' || step.guide === 'MID') && def.catLink
        ? `<div id="tq-svc" class="inline-service-card" data-svc-cat="${esc(def.catLink)}" style="margin-top:12px"></div>` : '';
      return `
        <div class="todayquest-card">
          <p class="tq-eyebrow">🎯 今日のミッション — Compass：${esc(def.label)}軸</p>
          <div class="tq-axis-badge">${esc(def.icon)} ${esc(def.label)}</div>
          <p class="tq-text">${esc(step.text)}</p>
          ${guideText ? `<p class="tq-guide">${guideText}</p>` : ''}
          <div class="tq-actions">
            <button class="tq-check-btn${isDone?' done':''}" data-done-key="${esc(doneKey)}">${isDone ? '✓ 完了！' : '✓ やった！'}</button>
            <a href="#section-quick" class="tq-skip-link">全ステップを見る →</a>
          </div>
          ${svcPlaceholder}
        </div>`;
    }

    // ── インラインサービスカード注入 ──
    const _svcCache = {};
    async function injectServiceCards() {
      const cards = document.querySelectorAll('.inline-service-card[data-svc-cat]');
      const cats = new Set();
      cards.forEach(el => cats.add(el.dataset.svcCat));
      for (const cat of cats) {
        if (_svcCache[cat] === undefined) {
          try {
            const res = await fetch(`/api/providers?category=${encodeURIComponent(cat)}&limit=3`);
            if (!res.ok) { _svcCache[cat] = null; continue; }
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.providers || []);
            _svcCache[cat] = list.find(p => p.entity_type !== 'affiliate' && p.name) || list[0] || null;
          } catch { _svcCache[cat] = null; }
        }
        const prov = _svcCache[cat];
        if (!prov) continue;
        const html = `<a href="/provider/${esc(prov.slug||'')}" class="isc-inner" target="_self">
          <span class="isc-icon">${esc(AREA_DEFS[Object.keys(AREA_DEFS).find(k=>AREA_DEFS[k].catLink===cat)]?.icon||'🏥')}</span>
          <div class="isc-body">
            <p class="isc-label">Fineme おすすめ</p>
            <p class="isc-name">${esc(prov.name||'')}</p>
            <p class="isc-desc">${esc((prov.ai_match_profile||prov.description||'').slice(0,80))}</p>
          </div>
          <span class="isc-cta">→</span>
        </a>`;
        document.querySelectorAll(`.inline-service-card[data-svc-cat="${cat}"]`).forEach(el => {
          el.innerHTML = html;
          el.classList.add('loaded');
        });
      }
    }

    // ── 軸ごとのステータス計算 ──
    function getAxisStats(axisId) {
      const compassAxis = calcDynamicCompass();
      const allSteps = flattenAllSteps();
      const axisSteps = allSteps.filter(s => s.axisId === axisId);
      const done = axisSteps.filter(s => s.isDone).length;
      const total = axisSteps.length;
      const pct = total > 0 ? Math.round(done / total * 100) : 0;
      const isAxisDone = axisProgress[axisId] === 'done' || (total > 0 && pct === 100);
      const hasAny = done > 0;
      const nextStep = axisSteps.filter(s => !s.isDone).sort((a, b) => a.idx - b.idx)[0];
      const status = axisId === compassAxis ? 'compass' : isAxisDone ? 'done' : hasAny ? 'active' : 'none';
      return { done, total, pct, status, nextStepText: nextStep?.step?.text || '' };
    }

    // ── 旧放射状マップ（未使用・削除予定） ──
    function buildJourneyRouteHtml() {
      const axisIds = Object.keys(AREA_DEFS);
      const n = axisIds.length;
      const cx = 150, cy = 150;
      const innerR = 26; // center circle edge
      const outerR = 95; // node center
      const spokeLen = outerR - innerR;

      const spokes = axisIds.map((axisId, i) => {
        const def = AREA_DEFS[axisId];
        if (!def) return '';
        const { pct, status } = getAxisStats(axisId);
        const angle = (-Math.PI / 2) + (i * 2 * Math.PI / n);
        const cosA = Math.cos(angle), sinA = Math.sin(angle);

        const x1 = (cx + innerR * cosA).toFixed(1);
        const y1 = (cy + innerR * sinA).toFixed(1);
        const x2 = (cx + outerR * cosA).toFixed(1);
        const y2 = (cy + outerR * sinA).toFixed(1);

        const fillFrac = pct / 100;
        const fillEndR = innerR + fillFrac * (spokeLen - 18);
        const xf = (cx + fillEndR * cosA).toFixed(1);
        const yf = (cy + fillEndR * sinA).toFixed(1);

        const labelR = outerR + 25;
        const xl = (cx + labelR * cosA).toFixed(1);
        const yl = (cy + labelR * sinA).toFixed(1);
        const textAnchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle';
        const labelDy = sinA > 0.3 ? 11 : sinA < -0.3 ? -1 : 4;

        const isCompass = status === 'compass';
        const isDone   = status === 'done';
        const isActive = status === 'active';

        const fillColor  = isCompass || isDone ? '#c9a84c' : isActive ? '#3b82f6' : null;
        const nodeStroke = isCompass ? '#c9a84c' : isDone ? 'rgba(201,168,76,0.45)' : isActive ? 'rgba(59,130,246,0.4)' : 'rgba(232,228,220,0.14)';
        const nodeFill   = isCompass ? 'rgba(201,168,76,0.13)' : isDone ? 'rgba(201,168,76,0.06)' : isActive ? 'rgba(59,130,246,0.07)' : 'rgba(10,15,30,0.5)';
        const nodeR      = isCompass ? 17 : 13;
        const labelFill  = isCompass ? '#c9a84c' : isDone ? 'rgba(52,211,153,0.75)' : 'rgba(232,228,220,0.55)';
        const labelWt    = isCompass ? '800' : '600';

        const bgSpoke  = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(232,228,220,0.10)" stroke-width="2" stroke-dasharray="3 3"/>`;
        const fillSpoke = fillColor && pct > 0 ? `<line x1="${x1}" y1="${y1}" x2="${xf}" y2="${yf}" stroke="${fillColor}" stroke-width="${isCompass ? 3.5 : 2.5}" stroke-linecap="round"/>` : '';
        const glowRing  = isCompass ? `<circle cx="${x2}" cy="${y2}" r="${nodeR + 7}" fill="none" stroke="rgba(201,168,76,0.18)" stroke-width="1.5" stroke-dasharray="3 2"/>` : '';
        const iconOrCheck = isDone
          ? `<text x="${x2}" y="${(parseFloat(y2)+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="rgba(52,211,153,0.75)">✓</text>`
          : `<text x="${x2}" y="${(parseFloat(y2)+5).toFixed(1)}" text-anchor="middle" font-size="${isCompass ? 15 : 13}">${def.icon}</text>`;
        const pctTspan = pct > 0
          ? `<tspan x="${xl}" dy="11" font-size="8" fill="${fillColor || 'rgba(232,228,220,0.28)'}88">${pct}%</tspan>`
          : '';

        return `
          <g data-axis-jump="${axisId}" style="cursor:pointer">
            ${bgSpoke}${fillSpoke}${glowRing}
            <circle cx="${x2}" cy="${y2}" r="${nodeR}" fill="${nodeFill}" stroke="${nodeStroke}" stroke-width="${isCompass ? 1.8 : 1.2}"/>
            ${iconOrCheck}
            <text text-anchor="${textAnchor}" font-size="9.5" fill="${labelFill}" font-weight="${labelWt}">
              <tspan x="${xl}" y="${(parseFloat(yl)+labelDy).toFixed(1)}">${def.label}</tspan>${pctTspan}
            </text>
            <rect x="${(parseFloat(x2)-22).toFixed(1)}" y="${(parseFloat(y2)-22).toFixed(1)}" width="44" height="44" fill="transparent"/>
          </g>`;
      }).join('');

      const allSt = flattenAllSteps();
      const doneCount  = allSt.filter(s => s.isDone).length;
      const totalCount = allSt.length;
      const overallPct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

      return `
        <div class="sec-label">🗺️ 変容マップ — 7軸同時進行</div>
        <div class="journey-map-wrap">
          <svg viewBox="0 0 300 300" class="journey-map-svg">
            ${spokes}
            <circle cx="${cx}" cy="${cy}" r="24" fill="rgba(201,168,76,0.07)" stroke="rgba(201,168,76,0.35)" stroke-width="1.5"/>
            <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="8" fill="rgba(232,228,220,0.4)">変容中</text>
            <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="11" fill="rgba(201,168,76,0.9)" font-weight="700">${overallPct}%</text>
          </svg>
        </div>`;
    }

    // ── 軸ステータスグリッド ──
    function buildAxisGridHtml() {
      const cards = Object.entries(AREA_DEFS).map(([axisId, def]) => {
        const { done, total, pct, status, nextStepText } = getAxisStats(axisId);
        const isCompass = status === 'compass';
        const isDone = status === 'done';
        const isActive = status === 'active';
        const badgeText = isCompass ? '🧭 今ここ' : isDone ? '✓ 完了' : isActive ? '進行中' : '未着手';
        const badgeClass = isCompass ? 'agc-badge-compass' : isDone ? 'agc-badge-done' : isActive ? 'agc-badge-active' : 'agc-badge-none';
        const cardClass = isCompass ? ' agc-compass' : isDone ? ' agc-done' : isActive ? ' agc-active' : '';
        const fillClass = isCompass ? 'bfill-compass' : isDone ? 'bfill-done' : isActive ? 'bfill-active' : 'bfill-none';
        const isSelected = activeAxisFilter === axisId;
        const stepText = nextStepText
          ? nextStepText.replace(/（例：[^）]*）/g, '').slice(0, 28) + (nextStepText.length > 28 ? '…' : '')
          : isDone ? 'ゴール達成！' : '';
        return `
          <div class="agc${cardClass}${isSelected ? ' agc-selected' : ''}" data-axis-jump="${esc(axisId)}">
            ${isCompass ? '<span class="agc-compass-mark">🧭</span>' : ''}
            <div class="agc-top">
              <span class="agc-icon">${esc(def.icon)}</span>
              <span class="agc-name">${esc(def.label)}</span>
              <span class="agc-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="agc-bar-labels">
              <span>${done}/${total} ステップ</span><span>${pct}%</span>
            </div>
            <div class="agc-bar">
              <div class="agc-bar-fill ${fillClass}" style="width:${pct}%"></div>
            </div>
            <p class="agc-step">${esc(stepText)}</p>
          </div>`;
      }).join('');
      return `
        <div class="sec-label">📊 変容ステータス</div>
        <div class="axis-grid" id="axis-grid">
          ${cards}
        </div>`;
    }

    function buildAxisFilterBar() {
      return `<div class="axis-filter-bar" id="axis-filter-bar">` +
        `<button class="axis-filter-chip${!activeAxisFilter ? ' active' : ''}" data-axis-filter="">全て</button>` +
        Object.entries(AREA_DEFS).map(([id, def]) =>
          `<button class="axis-filter-chip${activeAxisFilter === id ? ' active' : ''}" data-axis-filter="${esc(id)}">${esc(def.icon)} ${esc(def.label)}</button>`
        ).join('') +
      `</div>`;
    }

    const html = `
      <div class="navi-wrap">
      <div class="navi-header">
        <p class="navi-header-eyebrow">New Me Navi &nbsp;<a href="/mypage/map" style="font-size:9px;font-weight:700;color:rgba(201,168,76,0.6);text-decoration:none;border:1px solid rgba(201,168,76,0.22);padding:2px 8px;border-radius:99px;vertical-align:middle;letter-spacing:.06em">🗺️ Map</a></p>
        <div class="navi-header-badge">🧭 行動タイプ別ロードマップ</div>
        <h1>ゴール：<em>${esc(overallGoal)}</em></h1>
        <p class="navi-header-sub">「今すぐ動ける」から始めよう。<br>Compassが指す軸のステップが最優先で表示される。</p>
        ${(() => { const _all = flattenAllSteps(); const _done = _all.filter(s=>s.isDone).length; const _total = _all.length; const _pct = _total > 0 ? Math.round(_done/_total*100) : 0; return `<div class="progress-bar-wrap"><div class="progress-bar-label"><span class="progress-bar-label-text">変容の進捗</span><span class="progress-bar-pct">${_pct}%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${_pct}%"></div></div><p class="progress-bar-sub">${_done} / ${_total} ステップ完了</p></div>`; })()}
        <svg viewBox="0 0 80 80" width="68" height="68" style="position:absolute;top:14px;right:14px;z-index:1;opacity:0.17" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="37" fill="none" stroke="#c9a84c" stroke-width="0.8"/><circle cx="40" cy="40" r="28" fill="none" stroke="#c9a84c" stroke-width="0.4"/><line x1="40" y1="3" x2="40" y2="77" stroke="#c9a84c" stroke-width="0.8"/><line x1="3" y1="40" x2="77" y2="40" stroke="#c9a84c" stroke-width="0.8"/><line x1="14" y1="14" x2="66" y2="66" stroke="#c9a84c" stroke-width="0.5"/><line x1="66" y1="14" x2="14" y2="66" stroke="#c9a84c" stroke-width="0.5"/><polygon points="40,4 37,23 40,19 43,23" fill="#c9a84c"/><polygon points="40,76 37,57 40,61 43,57" fill="#c9a84c" opacity="0.4"/><polygon points="76,40 57,37 61,40 57,43" fill="#c9a84c" opacity="0.4"/><polygon points="4,40 23,37 19,40 23,43" fill="#c9a84c" opacity="0.4"/><circle cx="40" cy="40" r="5" fill="none" stroke="#c9a84c" stroke-width="1.2"/><circle cx="40" cy="40" r="2" fill="#c9a84c"/></svg>
        <div style="position:absolute;bottom:14px;right:18px;font-size:8px;font-family:'Courier New',monospace;color:rgba(201,168,76,0.42);letter-spacing:.07em;z-index:1">N 35°40′ / E 139°46′</div>
      </div>

      ${buildCompassHtml()}

      ${buildGoalSceneHtml()}

      <div id="todayquest-container">
        ${buildTodayQuestHtml()}
      </div>

      ${buildAxisFilterBar()}

      <div id="sections-container">
        ${buildSectionsHtml()}
      </div>

      ${buildMatchedProductsHtml()}

      <div class="navi-footer">
        <a href="/diagnosis/result" class="navi-footer-btn nfb-secondary">🗺️ New Me Naviに戻る</a>
        <a href="/diagnosis" class="navi-footer-btn nfb-ghost">Me Scanを再スキャンする</a>
      </div>
      </div>

      <!-- 現状把握モーダル -->
      <div id="body-data-modal" class="hidden">
        <div class="bdm-card">
          <p class="bdm-eyebrow">現状把握 — あなたの地図を作る</p>
          <p class="bdm-title" id="bdm-title">自分の現状を記録しておこう</p>
          <p class="bdm-step-text" id="bdm-step-text"></p>
          <p class="bdm-multi-note hidden" id="bdm-multi-note">複数選択できます</p>
          <div class="bdm-options" id="bdm-options"></div>
          <div class="bdm-actions">
            <button class="bdm-submit" id="bdm-submit">記録して完了 →</button>
            <button class="bdm-skip" id="bdm-skip">スキップ</button>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;

    // サービスカードを非同期注入
    injectServiceCards();

    // モーダルをbodyに移動（z-index確保）
    const modalEl = document.getElementById('body-data-modal');
    if (modalEl) document.body.appendChild(modalEl);

    // ── 現状把握モーダル表示 ──
    function showBodyDataModal({ doneKey, bodyDataKey, bodyDataOptions, bodyDataMulti, stepText, onConfirm }) {
      const modal = document.getElementById('body-data-modal');
      if (!modal) { onConfirm(); return; }
      const titleEl    = document.getElementById('bdm-title');
      const stepTextEl = document.getElementById('bdm-step-text');
      const multiNote  = document.getElementById('bdm-multi-note');
      const optionsEl  = document.getElementById('bdm-options');
      const submitBtn  = document.getElementById('bdm-submit');
      const skipBtn    = document.getElementById('bdm-skip');
      if (titleEl)    titleEl.textContent = '自分の現状を記録しておこう';
      if (stepTextEl) stepTextEl.textContent = stepText;
      if (multiNote)  { multiNote.classList.toggle('hidden', !bodyDataMulti); }
      const inputType = bodyDataMulti ? 'checkbox' : 'radio';
      const currentVal = bodyData[bodyDataKey];
      optionsEl.innerHTML = (bodyDataOptions || []).map(opt => {
        const isChecked = bodyDataMulti
          ? (Array.isArray(currentVal) && currentVal.includes(opt))
          : currentVal === opt;
        // label非使用（ラベルclickとinputchangeの二重発火を防ぐ）
        return `<div class="bdm-option${isChecked ? ' selected' : ''}" data-val="${esc(opt)}">
          <span class="bdm-option-label">${esc(opt)}</span>
          ${isChecked ? '<span style="margin-left:auto;color:#c9a84c;font-weight:700;font-size:14px">✓</span>' : ''}
        </div>`;
      }).join('');
      // オプションクリック（ラベルなしdivなので二重発火なし）
      optionsEl.querySelectorAll('.bdm-option').forEach(el => {
        el.addEventListener('click', () => {
          if (!bodyDataMulti) {
            optionsEl.querySelectorAll('.bdm-option').forEach(o => o.classList.remove('selected'));
          }
          el.classList.toggle('selected');
          // ✓マークの表示更新
          const check = el.querySelector('span[style]');
          if (el.classList.contains('selected')) {
            if (!check) el.insertAdjacentHTML('beforeend', '<span style="margin-left:auto;color:#c9a84c;font-weight:700;font-size:14px">✓</span>');
          } else {
            if (check) check.remove();
          }
          // ラジオは1つだけ選択
          if (!bodyDataMulti) {
            optionsEl.querySelectorAll('.bdm-option').forEach(o => {
              const ck = o.querySelector('span[style]');
              if (o !== el && ck) ck.remove();
            });
          }
        });
      });
      modal.classList.remove('hidden');
      // 新しいリスナー（古いリスナーを上書き）
      const newSubmit = submitBtn.cloneNode(true);
      submitBtn.replaceWith(newSubmit);
      const newSkip = skipBtn.cloneNode(true);
      skipBtn.replaceWith(newSkip);
      document.getElementById('bdm-submit').addEventListener('click', () => {
        const selected = optionsEl.querySelectorAll('.bdm-option.selected');
        if (selected.length > 0) {
          const value = bodyDataMulti ? Array.from(selected).map(el => el.dataset.val) : selected[0].dataset.val;
          bodyData[bodyDataKey] = value;
          try { localStorage.setItem(BODY_DATA_KEY, JSON.stringify(bodyData)); } catch {}
          if (token) {
            fetch('/api/me/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ body_data: bodyData }),
            }).catch(() => {});
          }
        }
        modal.classList.add('hidden');
        onConfirm();
      });
      document.getElementById('bdm-skip').addEventListener('click', () => {
        modal.classList.add('hidden');
        onConfirm();
      });
    }

    // ── ステータスボタンのイベントリスナー ──
    const STATUS_CYCLE = { '': 'active', 'active': 'done', 'done': '' };

    function updatePrereqBanner() {
      const banner = document.getElementById('prereq-banner');
      if (!banner) return;
      const { done, total, allDone } = getAllPrereqInfo();
      if (allDone) { banner.remove(); return; }
      const countEl = banner.querySelector('.prereq-banner-count');
      if (countEl) countEl.textContent = `${done}/${total} チェック済み`;
    }

    function showPrereqCelebration() {
      let toast = document.getElementById('prereq-complete-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'prereq-complete-toast';
        toast.innerHTML = '<div class="prereq-toast-icon">🎉</div><div><p class="prereq-toast-title">出発前チェック完了！</p><p class="prereq-toast-sub">旅の準備が整いました。さあ、出発しよう。</p></div>';
        document.body.appendChild(toast);
      }
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => toast.classList.remove('show'), 4200);
      const colors = ['#c9a84c','#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6'];
      for (let i = 0; i < 48; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const size = 5 + Math.random() * 7;
        el.style.cssText = `left:${Math.random()*100}vw;width:${size}px;height:${size}px;background:${colors[i % colors.length]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 0.8}s`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
      }
    }

    // ── selfCheckMap: doneKey → selfCheck メタデータ（属性依存をなくすため） ──
    const selfCheckMap = new Map();
    flattenAllSteps().forEach(s => {
      if (s.step.isSelfCheck) {
        selfCheckMap.set(s.doneKey, {
          bodyDataKey:     s.step.bodyDataKey,
          bodyDataOptions: s.step.bodyDataOptions || [],
          bodyDataMulti:   s.step.bodyDataMulti || false,
          stepText:        s.step.text,
        });
      }
    });

    function refreshCompassAndTracks() {
      const strip = document.getElementById('compass-strip');
      if (strip) { const tmp = document.createElement('div'); tmp.innerHTML = buildCompassHtml(); strip.replaceWith(tmp.firstElementChild); }
      const tqEl = document.getElementById('todayquest-container');
      if (tqEl) tqEl.innerHTML = buildTodayQuestHtml();
      const container = document.getElementById('sections-container');
      if (container) container.innerHTML = buildSectionsHtml();
      const bar = document.getElementById('axis-filter-bar');
      if (bar) { const tmp = document.createElement('div'); tmp.innerHTML = buildAxisFilterBar(); bar.replaceWith(tmp.firstElementChild); }
      injectServiceCards();
    }

    // ── 軸フィルターチップ クリック ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.axis-filter-chip');
      if (!btn) return;
      const axis = btn.dataset.axisFilter || '';
      activeAxisFilter = (axis === '' || axis === activeAxisFilter) ? null : axis;
      refreshCompassAndTracks();
    });

    // ── 展開ボタン ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.milestone-expand-btn');
      if (!btn) return;
      const list = btn.previousElementSibling;
      if (list && list.classList.contains('milestone-list')) {
        list.classList.remove('collapsed');
        btn.remove();
      }
    });

    // ── ステップDOMを完了状態に更新する共通関数 ──
    function applyStepDone(btn, key, newDone) {
      btn.classList.toggle('checked', newDone);
      btn.textContent = newDone ? '✓' : '';
      // メインステップ
      const milestoneItem = btn.closest('.milestone-item');
      if (milestoneItem) {
        milestoneItem.classList.toggle('step-done', newDone);
        const dot = milestoneItem.querySelector('.milestone-dot');
        if (dot && !dot.classList.contains('current') && !dot.classList.contains('goal')) {
          dot.classList.toggle('past', newDone);
          dot.classList.toggle('future', !newDone);
        }
      }
      // 出発前チェック
      const prereqItem = btn.closest('.prereq-item');
      if (prereqItem) {
        prereqItem.classList.toggle('step-done', newDone);
      }
      // step-card
      const stepCard = btn.closest('.step-card');
      if (stepCard) {
        stepCard.classList.toggle('step-done', newDone);
        // self-checkは完了後にsections再レンダーで値表示更新
        if (newDone && selfCheckMap.has(btn.dataset.doneKey)) {
          const container = document.getElementById('sections-container');
          if (container) container.innerHTML = buildSectionsHtml();
          // progress bar 更新
          const pbFill = document.querySelector('.progress-bar-fill');
          const pbPct  = document.querySelector('.progress-bar-pct');
          const pbSub  = document.querySelector('.progress-bar-sub');
          if (pbFill) {
            const _all = flattenAllSteps();
            const _done = _all.filter(s => s.isDone).length;
            const _total = _all.length;
            const _pct = _total > 0 ? Math.round(_done/_total*100) : 0;
            pbFill.style.width = _pct + '%';
            if (pbPct) pbPct.textContent = _pct + '%';
            if (pbSub) pbSub.textContent = `${_done} / ${_total} ステップ完了`;
          }
          return;
        }
      }
      updatePrereqBanner();
      if (newDone && key.startsWith('prereq-')) {
        const allBoxes     = document.querySelectorAll('.prereq-box');
        const checkedBoxes = document.querySelectorAll('.prereq-box.checked');
        if (allBoxes.length > 0 && allBoxes.length === checkedBoxes.length) {
          showPrereqCelebration();
        }
      }
    }

    function persistStepDone(key, newDone) {
      if (newDone) { stepDone[key] = true; } else { delete stepDone[key]; }
      try { localStorage.setItem(STEP_DONE_KEY, JSON.stringify(stepDone)); } catch {}
      if (token) {
        fetch('/api/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ step_done: stepDone }),
        }).catch(() => {});
      }
    }

    // ── ステップ完了チェックボタン（メインステップ + 出発前チェック + 商品チェック共通） ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-check-btn, .prereq-box, .product-check-btn');
      if (!btn) return;
      const key = btn.dataset.doneKey;
      if (!key) return;
      const isDone = !!stepDone[key];

      // 商品チェックボタン
      if (btn.classList.contains('product-check-btn')) {
        persistStepDone(key, !isDone);
        btn.classList.toggle('checked', !isDone);
        btn.textContent = !isDone ? '✓ 使用中' : '使ってる？';
        return;
      }

      // 現状確認ステップ → 未完了のときだけモーダルを表示
      const meta = selfCheckMap.get(key);
      if (meta && !isDone) {
        showBodyDataModal({
          doneKey: key,
          bodyDataKey:     meta.bodyDataKey,
          bodyDataOptions: meta.bodyDataOptions,
          bodyDataMulti:   meta.bodyDataMulti,
          stepText:        meta.stepText,
          onConfirm: () => {
            persistStepDone(key, true);
            applyStepDone(btn, key, true);
          },
        });
        return;
      }

      // 通常のトグル
      persistStepDone(key, !isDone);
      applyStepDone(btn, key, !isDone);
    });

    // ── Today's Quest 完了ボタン ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.tq-check-btn');
      if (!btn) return;
      const key = btn.dataset.doneKey;
      if (!key) return;
      const nowDone = !/** @type {{[k:string]:boolean}} */(stepDone)[key];
      persistStepDone(key, nowDone);
      btn.classList.toggle('done', nowDone);
      btn.textContent = nowDone ? '✓ 完了！' : '✓ やった！';
      refreshCompassAndTracks();
    });

    // ── 旅路ストップ・軸グリッドカード クリック ──
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-axis-jump]');
      if (!el) return;
      const axisId = el.dataset.axisJump;
      if (!axisId) return;
      activeAxisFilter = (activeAxisFilter === axisId) ? null : axisId;
      try { localStorage.setItem('fineme:navi:filter', activeAxisFilter || ''); } catch {}
      refreshCompassAndTracks();
      const sections = document.getElementById('sections-container');
      if (sections) setTimeout(() => sections.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    });

    // ── 習慣チェックボタン ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.habit-check-today');
      if (!btn) return;
      const habitKey = btn.dataset.habitKey;
      const todayStr = btn.dataset.today;
      if (!habitKey || !todayStr) return;
      const storageKey = 'fineme:habit:' + habitKey + ':' + todayStr;
      const isDoneToday = localStorage.getItem(storageKey) === 'done';
      if (!isDoneToday) {
        localStorage.setItem(storageKey, 'done');
        btn.classList.add('done-today');
        btn.textContent = '✓ できた';
        try {
          const streakKey = 'fineme:streak:' + habitKey;
          const raw = localStorage.getItem(streakKey);
          let d = raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
          const yestStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          d.count = (d.lastDate === yestStr) ? (d.count || 0) + 1 : (d.lastDate === todayStr ? d.count : 1);
          d.lastDate = todayStr;
          localStorage.setItem(streakKey, JSON.stringify(d));
          const streakEl = btn.closest('.habit-item') && btn.closest('.habit-item').querySelector('.habit-streak');
          if (streakEl) { streakEl.textContent = '🔥 ' + d.count + '日'; streakEl.style.opacity = '1'; }
        } catch {}
      } else {
        localStorage.removeItem(storageKey);
        btn.classList.remove('done-today');
        btn.textContent = '今日できた？';
      }
    });

    // ── セクションタブ（スクロール移動）──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.section-tab');
      if (!btn) return;
      const targetId = btn.dataset.scrollTo;
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });


    } catch (err) {
      // エラーが発生した場合、読み込み中のまま固まらないようにする
      try {
        root.innerHTML = `<div class="no-data">
          <div class="no-data-icon">⚠️</div>
          <h2 class="no-data-title">読み込みエラー</h2>
          <p class="no-data-text">データの読み込みに失敗しました。<br>ページを再読み込みするか、Me Scanを受け直してください。</p>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:20px">${err.message || ''}</p>
          <a href="/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px;margin-right:10px">Me Scanを受ける</a>
          <button onclick="location.reload()" style="font-size:14px;font-weight:600;padding:12px 24px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer">再読み込み</button>
        </div>`;
      } catch {}
    }

    })(); // async IIFE end

    return () => { document.head.removeChild(style); };
  }, []);

  // 診断軸に基づいて関連記事を取得
  useEffect(() => {
    let topAxes = [];
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (raw) {
        const p = JSON.parse(raw);
        topAxes = p.priority_order?.slice(0, 3) || (p.compass_first ? [p.compass_first] : []);
      }
    } catch {}

    fetch('/api/features')
      .then(r => r.ok ? r.json() : [])
      .then(articles => {
        if (!Array.isArray(articles) || articles.length === 0) return;
        // 関連スコアで並び替え
        const scored = articles.map(a => {
          let score = 0;
          topAxes.forEach((axis, i) => {
            const cats = AXIS_RELATED_CATS[axis] || [];
            if (cats.some(c => a.category?.includes(c))) score += (3 - i);
          });
          // 「変容の思想」系は常に出す
          if (a.category === '変容の思想') score += 1;
          return { ...a, _score: score };
        });
        scored.sort((a, b) => b._score - a._score);
        setRelatedArticles(scored.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        .navi-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; overflow-x: hidden; width: 100%; box-sizing: border-box; }
        .navi-layout > * { min-width: 0; }
        .navi-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; min-width: 0; }
        .navi-sidenav .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .navi-sidenav .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .navi-sidenav .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        @media (max-width: 640px) {
          .navi-layout { grid-template-columns: 1fr; padding: 16px 16px 60px; overflow-x: hidden; }
          .navi-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
          .navi-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; }
          .navi-sidenav nav::-webkit-scrollbar { display: none; }
          .navi-sidenav nav > * { margin-top: 0 !important; }
          .navi-sidenav .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; }
          .navi-wrap { padding: 0 0 40px !important; width: 100%; box-sizing: border-box; overflow-x: hidden; }
        }
      `}</style>
      <main style={{overflowX:'hidden', width:'100%'}}>
        <div className="navi-layout">
          <aside className="navi-sidenav">
            <nav className="stack" style={{ gap: '4px' }}>
              <Link href="/mypage" className="sidenav-link">ホーム</Link>
              <Link href="/diagnosis/result" className="sidenav-link">New Me Navi</Link>
              <Link href="/mypage/navi" className="sidenav-link sidenav-link--active">New Me Map</Link>
              <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
              <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
              <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
              <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
              <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            </nav>
          </aside>
          <div style={{minWidth:0, overflow:'hidden'}}>
            <div id="navi-root">
              <p style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}>読み込み中…</p>
            </div>

            {/* 関連する読み物 */}
            {relatedArticles.length > 0 && (
              <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', margin: '0 0 16px' }}>
                  あなたの変容に関連する読み物
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {relatedArticles.map(a => (
                    <Link key={a.id} href={`/feature/${a.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{
                        display: 'flex', gap: '14px', alignItems: 'center',
                        padding: '14px', borderRadius: '12px',
                        border: '1px solid rgba(201,168,76,0.15)',
                        background: 'rgba(255,255,255,0.6)',
                        transition: 'border-color 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'}
                      >
                        {a.thumbnail && (
                          <img src={a.thumbnail} alt={a.title}
                            style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {a.category && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#c9a84c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{a.category}</span>
                          )}
                          <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 4px', lineHeight: 1.45, fontFamily: 'var(--font-serif)', color: '#0a0f1e' }}>{a.title}</p>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{a.reading_time || 5}分で読める</span>
                        </div>
                        <span style={{ fontSize: '16px', color: 'rgba(201,168,76,0.6)', flexShrink: 0 }}>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                  <Link href="/feature" style={{ fontSize: '12px', color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 700 }}>
                    Fineme Journal を読む →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
