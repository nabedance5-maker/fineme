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
      .navi-wrap { max-width: 100%; margin: 0; padding: 24px 0 80px; }

      /* ── Header ── */
      .navi-header { padding: 44px 28px 36px; background: linear-gradient(rgba(10,15,30,0.78), rgba(10,15,30,0.88)), url('/assets/images/hero-bg.webp') center / cover no-repeat; border-radius: 14px; margin-bottom: 24px; position: relative; overflow: hidden; border: 1px solid rgba(201,168,76,0.2); }
      .navi-header::before { content: ''; position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(201,168,76,.1) 0%, transparent 70%); border-radius: 50%; }
      .navi-header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 10px; text-transform: uppercase; position: relative; z-index: 1; }
      .navi-header-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 14px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); color: #c9a84c; border-radius: 3px; margin-bottom: 14px; position: relative; z-index: 1; letter-spacing: .08em; }
      .navi-header h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(16px,4vw,22px); font-weight: 700; color: #fff; margin: 0 0 10px; line-height: 1.55; position: relative; z-index: 1; }
      .navi-header h1 em { font-style: normal; color: #c9a84c; }
      .navi-header-sub { font-size: 13px; color: rgba(255,255,255,.65); margin: 0; line-height: 1.75; position: relative; z-index: 1; }

      /* ── Compass strip ── */
      .compass-strip { background: rgba(201,168,76,0.06); border: 1.5px solid rgba(201,168,76,0.3); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
      .compass-strip-icon { font-size: 28px; flex-shrink: 0; }
      .compass-strip-body { flex: 1; }
      .compass-strip-label { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.7); letter-spacing: .1em; margin: 0 0 3px; text-transform: uppercase; }
      .compass-strip-text  { font-size: 15px; font-weight: 900; color: #0a0f1e; margin: 0; }
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
      .track-progress-track { height: 8px; background: rgba(10,15,30,0.07); border-radius: 99px; overflow: hidden; position: relative; }
      .track-progress-current { height: 100%; border-radius: 99px; background: #0a0f1e; transition: width 1s cubic-bezier(.4,0,.2,1) .4s; }
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
      .milestone-current-tag { display: inline-block; font-size: 10px; font-weight: 700; color: #0a0f1e; background: rgba(10,15,30,0.07); padding: 1px 7px; border-radius: 99px; margin-bottom: 3px; border: 1px solid rgba(10,15,30,0.12); }
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
      .guide-badge { display: flex; align-items: center; gap: 5px; margin-top: 5px; padding: 4px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; line-height: 1.4; }
      .guide-high { background: rgba(201,168,76,0.09); border: 1px solid rgba(201,168,76,0.22); color: #78350f; }
      .guide-high a { color: #c9a84c; font-weight: 700; text-decoration: none; }
      .guide-mid { background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.15); color: #1e40af; }
      .guide-low { display: inline-flex; background: none; border: none; font-size: 11px; color: #9ca3af; padding: 2px 0; }
      .milestone-note { font-size: 11px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; padding: 4px 8px; margin-top: 4px; }
      .subtab-header-note { font-size: 11px; color: rgba(232,228,220,0.55); background: rgba(10,15,30,0.50); border: 1px solid rgba(232,228,220,0.15); border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }

      /* CTA inside track */
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
      .subtab-btn.active { background: rgba(201,168,76,0.12); border-color: #c9a84c; color: #0a0f1e; }
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
      .prereq-banner-title { font-size: 13px; font-weight: 800; color: #0a0f1e; margin: 0 0 2px; }
      .prereq-banner-desc { font-size: 11px; color: #6b7280; line-height: 1.5; margin: 0; }
      .prereq-banner-count { font-weight: 700; color: #c9a84c; }

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
      .smp-dot.cur { background: #0a0f1e; }

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
        root.innerHTML = `
          <div style="min-height:50vh;display:flex;align-items:center;justify-content:center;padding:48px 20px">
            <div style="max-width:480px;width:100%;background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.25);border-radius:18px;padding:40px 32px;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,0.4);backdrop-filter:blur(8px)">
              <div style="font-size:40px;margin:0 0 16px">🗺️</div>
              <h2 style="font-family:'Noto Serif JP',Georgia,serif;font-size:18px;font-weight:700;color:rgba(232,228,220,0.90);margin:0 0 12px;line-height:1.6">
                ここはあなただけの<br>変容ロードマップが届く場所です。
              </h2>
              <p style="font-size:14px;color:rgba(232,228,220,0.55);line-height:1.85;margin:0 0 28px">
                Me Scanを受けると、7軸の現在地と変容ロードマップ<br>（Fineme Compass）がここに保存されます。<br>診断はアカウントなしで受けられます。
              </p>
              <a href="/diagnosis" style="display:block;width:100%;padding:15px 24px;background:#c9a84c;color:#0a0f1e;font-size:15px;font-weight:700;border-radius:6px;text-decoration:none;letter-spacing:.05em;margin-bottom:12px;box-sizing:border-box">
                🧬 Me Scanを受ける（無料・約15分）
              </a>
              <a href="/login" style="font-size:13px;color:rgba(232,228,220,0.40);text-decoration:none;border-bottom:1px solid rgba(232,228,220,0.15);padding-bottom:2px">
                すでにアカウントをお持ちの方はログイン
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
    let stepDone = {};
    try { const s = localStorage.getItem(STEP_DONE_KEY); if (s) stepDone = JSON.parse(s); } catch {}

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
        }
      }
    } catch {}
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      root.innerHTML = `<div class="no-data">
        <div class="no-data-icon">🧭</div>
        <h2 class="no-data-title">まだ地図がありません</h2>
        <p class="no-data-text">Me Scanを受けると、あなただけの<br>変容ナビが生成されます。</p>
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
        <p class="no-data-text">診断をアップデートしました。<br>新しいMe Scanで変容ナビを生成します。</p>
        <a href="/diagnosis" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（新版）</a>
      </div>`;
      return;
    }

    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── 定数 ──
    const AREA_DEFS = {
      body:    { icon:'💪', label:'体型',  catLink:'gym',       tier:1 },
      eyebrow: { icon:'✂️', label:'眉',    catLink:'eyebrow',  tier:1 },
      fashion: { icon:'👔', label:'服',    catLink:'fashion',   tier:1 },
      hair:    { icon:'💇', label:'髪',    catLink:'hair',      tier:1 },
      skin:    { icon:'✨', label:'肌',    catLink:'esthetic',  tier:2 },
      teeth:   { icon:'🦷', label:'歯',    catLink:'whitening', tier:3 },
      nail:    { icon:'💅', label:'爪',    catLink:'nail',      tier:4 },
    };
    const TIER_LABELS = { 1:'基盤', 2:'深化', 3:'補完', 4:'磨き込み' };
    const CARE_LABELS = { none:'未着手', concerned:'気になっている', self:'自己ケア中', pro:'プロ通い中' };

    // 現在地スコアを来た道類型ラベルに変換
    function getCareLabel(careType) { return CARE_LABELS[careType] || ''; }

    // ── ミルストーン（統合リスト形式・全careType共通） ──
    // isCurrentFor: そのcareTypeの「現在地」マーカー
    // guide: 'none'|'LOW'|'MID'|'HIGH' — ガイド推奨度
    // note: 注意書き（任意）
    const MILESTONES = {
      body: [
        { text: '自分の体型で気になる部分を言語化できている', guide: 'none', isCurrentFor: 'none' },
        { text: '現在の体重・体脂肪率を把握している', guide: 'none' },
        { text: '食事・運動の現状を把握している', guide: 'none' },
        { text: '日常的に歩く・階段を使うなど生活習慣に動きを取り入れている', guide: 'none' },
        { text: '週1回以上の運動習慣がある', guide: 'none' },
        { text: '食事の基本ルール（タンパク質・糖質など）を1つ知っている', guide: 'LOW', isCurrentFor: 'concerned' },
        { text: 'パーソナルジムの無料体験カウンセリングに行ったことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: 'トレーニングメニューをプロに組んでもらったことがある', guide: 'HIGH' },
        { text: '週2回以上のトレーニングを1ヶ月以上継続している', guide: 'MID', isCurrentFor: 'pro' },
        { text: '食事管理と運動のバランスが取れている', guide: 'MID' },
        { text: '3ヶ月前と今の体型を比較して変化を確認している', guide: 'LOW' },
      ],
      eyebrow: [
        { text: '眉を整えている（何らかのケアをしている）', guide: 'none', isCurrentFor: 'none' },
        { text: 'スクリューブラシで毎朝眉を整えている', guide: 'none' },
        { text: '自分の顔に合う眉の形を把握している', guide: 'MID', isCurrentFor: 'concerned' },
        { text: '眉毛サロンで一度プロに整えてもらったことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: 'プロが作った形を自分でメンテナンスできている', guide: 'LOW' },
        { text: '2〜3週に1回のペースでサロンに通っている', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '眉の形が顔の第一印象に影響していると実感している', guide: 'none' },
        { text: '担当スタッフと信頼関係ができ、定期的に通っている', guide: 'HIGH' },
      ],
      fashion: [
        { text: '自分の服のサイズを正確に把握している（肩幅・ウエストなど）', guide: 'none', isCurrentFor: 'none' },
        { text: 'クローゼットを整理し、今持っている服を把握している', guide: 'none' },
        { text: 'サイズ感の基本ルールを1つ知っている（肩幅を合わせるなど）', guide: 'LOW' },
        { text: 'ベーシックアイテムが揃っている（白シャツ・ダークデニム・シンプルスニーカーなど）', guide: 'LOW' },
        { text: 'パーソナルカラー診断を受けたことがある', guide: 'HIGH', isCurrentFor: 'concerned' },
        { text: '顔タイプ診断を受けたことがある', guide: 'HIGH' },
        { text: '骨格診断を受けたことがある', guide: 'HIGH' },
        { text: '診断結果を踏まえたコーデを実践している', guide: 'MID', isCurrentFor: 'self' },
        { text: 'ショップスタッフやスタイリストに「自分に似合うもの」を相談したことがある', guide: 'MID' },
        { text: '「これが自分の正解コーデ」と言えるパターンを持っている', guide: 'LOW', isCurrentFor: 'pro' },
        { text: '場面別（デート・仕事・カジュアル）のコーデを使い分けできている', guide: 'LOW' },
      ],
      hair: [
        { text: '定期的に美容院・理髪店に行っている', guide: 'none', isCurrentFor: 'none' },
        { text: '自分の髪質を把握している（硬い・柔らかい・くせ毛・直毛など）', guide: 'LOW' },
        { text: '自分の顔型を把握している', guide: 'LOW' },
        { text: '自分の髪質に合ったシャンプーを使っている', guide: 'LOW' },
        { text: 'ドライヤーで正しく乾かしている（自然乾燥していない）', guide: 'none' },
        { text: 'スタイリング剤を使っている', guide: 'none' },
        { text: 'トリートメント・アウトバスケアをしている', guide: 'LOW', isCurrentFor: 'concerned' },
        { text: '美容師に「顔型・骨格に合う髪型」を相談したことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: '定期的に通う美容師を1人決めている', guide: 'MID' },
        { text: '自宅でのセット方法を美容師に教わったことがある', guide: 'HIGH' },
        { text: '毎朝のセットが迷いなく再現できている', guide: 'LOW', isCurrentFor: 'pro' },
        { text: '季節や場面に合わせてスタイルを変えられている', guide: 'MID' },
        { text: 'AGA・薄毛が気になる場合、専門クリニックに相談したことがある', guide: 'HIGH' },
      ],
      nail: [
        { text: '定期的に爪を切っている', guide: 'none', isCurrentFor: 'none' },
        { text: '爪やすりでバリや形を整えている', guide: 'none' },
        { text: 'ハンドクリームで手・爪を保湿している', guide: 'none' },
        { text: '爪の形を意識して整えている', guide: 'LOW', isCurrentFor: 'concerned' },
        { text: 'ネイルオイルを使っている', guide: 'LOW' },
        { text: '甘皮を押し上げるケアをしている', guide: 'MID', note: '切り取るのはNG。正しい方法はプロに教わるのが理想。', isCurrentFor: 'self' },
        { text: 'ネイルケアサロンでプロのケアを受けたことがある', guide: 'HIGH' },
        { text: '定期的にサロンでメンテナンスしている', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '手元・指先が清潔感のある状態を保てている', guide: 'none' },
      ],
    };

    // ── サブトラック（肌・歯の内訳別・統合リスト形式） ──
    const MILESTONES_SUB = {
      skin_care: {
        steps: [
          { text: '洗顔料で洗顔している', guide: 'none', isCurrentFor: 'none' },
          { text: '化粧水をつけている', guide: 'none' },
          { text: '乳液で保湿している', guide: 'none' },
          { text: '日焼け止めを朝塗っている', guide: 'none' },
          { text: '肌タイプを把握している（乾燥・脂性・混合）', guide: 'LOW', isCurrentFor: 'concerned' },
          { text: '肌悩みを言語化している（ニキビ・毛穴・くすみ・赤みなど）', guide: 'LOW' },
          { text: 'クレンジングをしている（夜）', guide: 'MID', isCurrentFor: 'self' },
          { text: '角質ケアをしている', guide: 'MID' },
          { text: '皮膚科・エステで今の肌状態を診てもらった', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: 'スペシャルケア（美容液・シートマスクなど）を取り入れている', guide: 'HIGH' },
        ],
      },
      skin_hige: {
        headerNote: 'カミソリ・毛抜き・ワックスはNG。電動シェーバーのみ推奨。ひげが普通〜濃い人は医療脱毛が本命。',
        steps: [
          { text: '電動シェーバーを使っている（カミソリ・毛抜きNG）', guide: 'none', note: 'カミソリは剃るたびに皮膚まで削るため肌へのダメージが大きい', isCurrentFor: 'none' },
          { text: '剃り後に保湿している', guide: 'none' },
          { text: '自分のひげタイプを把握している（薄い／普通〜濃い）', guide: 'LOW', note: '迷ったらカウンセリングで確認できる', isCurrentFor: 'concerned' },
          { text: '医療脱毛クリニックのカウンセリングに行ったことがある', guide: 'HIGH', isCurrentFor: 'self' },
          { text: '脱毛を開始している', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: '脱毛完了後のスキンケアが習慣になっている', guide: 'MID' },
        ],
      },
      teeth_white: {
        steps: [
          { text: '毎日歯磨きをしている', guide: 'none', isCurrentFor: 'none' },
          { text: '歯間ブラシかフロスを使っている', guide: 'none' },
          { text: 'ホワイトニング配合の歯磨き粉を使っている', guide: 'none' },
          { text: '自分の歯の黄ばみの原因を把握している（着色・加齢など）', guide: 'LOW', isCurrentFor: 'concerned' },
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
          { text: '矯正の種類を知っている（ワイヤー・マウスピース・裏側など）', guide: 'none' },
          { text: '費用・期間の相場をざっくり把握している', guide: 'none' },
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

      // メインステップHTML
      const items = mainSteps.map((step, j) => {
        const i = splitAt + j; // 元のインデックス（doneKeyのため）
        const doneKey = `${axisKey}-${i}`;
        const isDone = !!stepDone[doneKey];
        const isCurrentPosition = (i === currentIdx);
        const dotClass = isCurrentPosition ? 'current' : (i < currentIdx || isDone ? 'past' : 'future');
        const labelHtml = isCurrentPosition ? '<span class="milestone-current-tag">★ 現在地</span>' : '';
        let guideHtml = '';
        if (step.guide === 'HIGH') {
          const link = catLink ? ` <a href="/search?category=${esc(catLink)}&diag=1">ガイドを探す →</a>` : '';
          guideHtml = `<div class="guide-badge guide-high">🏥 ここはプロに任せると確実に変わる${link}</div>`;
        } else if (step.guide === 'MID') {
          guideHtml = `<div class="guide-badge guide-mid">📋 プロと進めると精度が上がる</div>`;
        } else if (step.guide === 'LOW') {
          guideHtml = `<span class="guide-badge guide-low">🏥</span>`;
        }
        const noteHtml = step.note ? `<div class="milestone-note">💡 ${esc(step.note)}</div>` : '';
        const checkBtn = `<button class="step-check-btn${isDone?' checked':''}" data-done-key="${esc(doneKey)}" title="${isDone?'完了を取り消す':'できてる・やった'}">${isDone?'✓':''}</button>`;
        return `
          <div class="milestone-item${isDone?' step-done':''}">
            <div class="milestone-dot-wrap">
              ${j > 0 ? '<div class="milestone-connector"></div>' : ''}
              <div class="milestone-dot ${dotClass}"></div>
            </div>
            <div style="padding-top:${j>0?'12px':'0'};padding-right:36px;flex:1">
              ${labelHtml}
              <p class="milestone-text">${esc(step.text)}</p>
              ${guideHtml}${noteHtml}
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

      const tier4Note = def.tier === 4
        ? `<p style="font-size:11px;color:#9ca3af;background:#f9fafb;border:1px dashed #d1d5db;border-radius:6px;padding:6px 10px;margin:0 0 12px">💡 今すぐ必要でない場合が多いカテゴリです</p>`
        : '';

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

            ${tier4Note}
            ${milestoneHtml}

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
          <p style="font-size:14px;font-weight:700;color:#0a0f1e;margin:0">${esc(overallGoal)}</p>
        </div>
      `;

      // ── 発揮ステージ ──
      const doneCount = Object.values(stepDone).filter(Boolean).length;
      const isReady      = doneCount >= 5;
      const isApproaching = doneCount >= 2;

      const stageReadinessHtml = isReady ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;margin-bottom:18px">
          <span style="font-size:16px">🎉</span>
          <span style="font-size:12px;font-weight:700;color:#065f46">このステージへ進む準備ができています！</span>
        </div>
      ` : isApproaching ? `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.22);border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🧭</span>
          <span style="font-size:12px;font-weight:700;color:#92400e">変容が着実に進んでいます。もう少しで発揮のステージへ。</span>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;margin-bottom:18px">
          <span style="font-size:14px">🔒</span>
          <span style="font-size:12px;color:#9ca3af;line-height:1.6">まずは上の変容ルートを歩もう。変化が積み重なるほど、このステージが近づいてくる。</span>
        </div>
      `;

      const cardBg    = isApproaching ? 'linear-gradient(135deg,rgba(201,168,76,0.07),rgba(10,15,30,0.03))' : '#f9fafb';
      const cardBorder = isApproaching ? 'rgba(201,168,76,0.3)' : '#e5e7eb';

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

          <p style="font-family:'Noto Serif JP',Georgia,serif;font-size:16px;font-weight:800;color:#0a0f1e;margin:0 0 6px;line-height:1.5">変わった自分を、世界へ発揮するステージ</p>
          <p style="font-size:12px;color:#6b7280;line-height:1.7;margin:0 0 16px">変容は発揮することで初めて完成する。外見の変化を最大限に活かすステージへ。</p>

          ${stageReadinessHtml}

          <div style="display:flex;flex-direction:column;gap:12px">
            <a href="/search?category=photo" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none;transition:border-color .2s">
              <span style="font-size:26px;flex-shrink:0">📸</span>
              <div style="flex:1">
                <p style="font-size:14px;font-weight:800;color:#0a0f1e;margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">プロフィール写真撮影</p>
                <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6">変わった自分を、最高の一枚に。マッチングアプリの第一印象を決定的に変える。</p>
              </div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
            <a href="/search?category=marriage" style="display:flex;align-items:center;gap:16px;padding:16px 18px;background:${cardBg};border:1px solid ${cardBorder};border-radius:14px;text-decoration:none;transition:border-color .2s">
              <span style="font-size:26px;flex-shrink:0">💍</span>
              <div style="flex:1">
                <p style="font-size:14px;font-weight:800;color:#0a0f1e;margin:0 0 4px;font-family:'Noto Serif JP',Georgia,serif">婚活サポート</p>
                <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6">自信がついた今が、出会いを本気にするタイミング。変容の先にある、本当の出会いへ。</p>
              </div>
              <span style="color:rgba(201,168,76,0.6);font-size:16px;flex-shrink:0">→</span>
            </a>
          </div>
        </div>
      `;

      return html;
    }

    const patternBarHtml = `
      <div class="route-pattern-bar" id="route-pattern-bar">
        ${Object.entries(PATTERN_LABELS).map(([k, label]) =>
          `<button class="rpb${k === activePattern ? ' active' : ''}" data-pattern="${esc(k)}">${esc(label)}</button>`
        ).join('')}
      </div>
      <p class="route-pattern-desc" id="route-pattern-desc">${esc(PATTERN_DESCS[activePattern])}</p>
    `;

    const html = `
      <div class="navi-wrap">
      <div class="navi-header">
        <p class="navi-header-eyebrow">New Me Navi</p>
        <div class="navi-header-badge">🧭 ルート案内</div>
        <h1>ゴール：<em>${esc(overallGoal)}</em></h1>
        <p class="navi-header-sub">変容の旅を一本道で案内する。<br>Compassが指す停留所がいまの次の一手。</p>
        <svg viewBox="0 0 80 80" width="68" height="68" style="position:absolute;top:14px;right:14px;z-index:1;opacity:0.17" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="37" fill="none" stroke="#c9a84c" stroke-width="0.8"/><circle cx="40" cy="40" r="28" fill="none" stroke="#c9a84c" stroke-width="0.4"/><line x1="40" y1="3" x2="40" y2="77" stroke="#c9a84c" stroke-width="0.8"/><line x1="3" y1="40" x2="77" y2="40" stroke="#c9a84c" stroke-width="0.8"/><line x1="14" y1="14" x2="66" y2="66" stroke="#c9a84c" stroke-width="0.5"/><line x1="66" y1="14" x2="14" y2="66" stroke="#c9a84c" stroke-width="0.5"/><polygon points="40,4 37,23 40,19 43,23" fill="#c9a84c"/><polygon points="40,76 37,57 40,61 43,57" fill="#c9a84c" opacity="0.4"/><polygon points="76,40 57,37 61,40 57,43" fill="#c9a84c" opacity="0.4"/><polygon points="4,40 23,37 19,40 23,43" fill="#c9a84c" opacity="0.4"/><circle cx="40" cy="40" r="5" fill="none" stroke="#c9a84c" stroke-width="1.2"/><circle cx="40" cy="40" r="2" fill="#c9a84c"/></svg>
        <div style="position:absolute;bottom:14px;right:18px;font-size:8px;font-family:'Courier New',monospace;color:rgba(201,168,76,0.42);letter-spacing:.07em;z-index:1">N 35°40′ / E 139°46′</div>
      </div>

      ${buildCompassHtml()}
      ${buildPrereqBannerHtml()}

      <p class="sec-label">ルート選択</p>
      ${patternBarHtml}

      <p class="sec-label">変容ルート</p>
      <div class="route-container" id="route-container">
        ${buildRouteContainerHtml()}
      </div>

      <div class="navi-footer">
        <a href="/diagnosis/result" class="navi-footer-btn nfb-secondary">🗺️ New Me Mapに戻る</a>
        <a href="/diagnosis" class="navi-footer-btn nfb-ghost">Me Scanを再スキャンする</a>
      </div>
      </div>
    `;

    root.innerHTML = html;

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

    function refreshCompassAndTracks() {
      // Compassストリップ更新
      const strip = document.getElementById('compass-strip');
      if (strip) {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildCompassHtml();
        strip.replaceWith(tmp.firstElementChild);
      }
      // 全ステーションを再描画（Compass変化・ステータス変化に対応）
      const container = document.getElementById('route-container');
      if (container) container.innerHTML = buildRouteContainerHtml();
    }

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.track-status-btn');
      if (!btn) return;
      const axisId = btn.dataset.axis;
      const currentStatus = axisProgress[axisId] || '';
      const nextStatus = STATUS_CYCLE[currentStatus] ?? '';
      if (nextStatus === '') {
        delete axisProgress[axisId];
      } else {
        axisProgress[axisId] = nextStatus;
      }
      // ローカル保存
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(axisProgress)); } catch {}
      // Supabase保存（非同期、失敗しても無視）
      if (token) {
        fetch('/api/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ axis_progress: axisProgress }),
        }).catch(() => {});
      }
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

    // ── ステップ完了チェックボタン（メインステップ + 出発前チェック共通） ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-check-btn, .prereq-box');
      if (!btn) return;
      const key = btn.dataset.doneKey;
      if (!key) return;
      const isDone = !!stepDone[key];
      if (isDone) { delete stepDone[key]; } else { stepDone[key] = true; }
      try { localStorage.setItem(STEP_DONE_KEY, JSON.stringify(stepDone)); } catch {}
      if (token) {
        fetch('/api/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ step_done: stepDone }),
        }).catch(() => {});
      }
      // メインステップのDOM更新
      const milestoneItem = btn.closest('.milestone-item');
      if (milestoneItem) {
        milestoneItem.classList.toggle('step-done', !isDone);
        btn.classList.toggle('checked', !isDone);
        btn.textContent = !isDone ? '✓' : '';
        const dot = milestoneItem.querySelector('.milestone-dot');
        if (dot && !dot.classList.contains('current') && !dot.classList.contains('goal')) {
          dot.classList.toggle('past', !isDone);
          dot.classList.toggle('future', isDone);
        }
      }
      // 出発前チェックのDOM更新
      const prereqItem = btn.closest('.prereq-item');
      if (prereqItem) {
        prereqItem.classList.toggle('step-done', !isDone);
        btn.classList.toggle('checked', !isDone);
        btn.textContent = !isDone ? '✓' : '';
      }
      updatePrereqBanner();
      // チェックした瞬間に全完了→祝福ギミック
      // ※ 表示中の .prereq-box を数える（全軸ではなく描画済みのみ）
      if (!isDone && key.startsWith('prereq-')) {
        const allBoxes     = document.querySelectorAll('.prereq-box');
        const checkedBoxes = document.querySelectorAll('.prereq-box.checked');
        if (allBoxes.length > 0 && allBoxes.length === checkedBoxes.length) {
          showPrereqCelebration();
        }
      }
    });

    // ── サブトラックタブ切り替え ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.subtab-btn');
      if (!btn) return;
      const axis = btn.dataset.subtab;
      const val  = btn.dataset.val;
      if (axis === 'skin')  { localStorage.setItem('fineme:skin:focus',  val); }
      if (axis === 'teeth') { localStorage.setItem('fineme:teeth:focus', val); }
      const routeIdx = getRouteOrder().indexOf(axis);
      const stationEl = document.getElementById('station-' + axis);
      if (stationEl) {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildStation(axis, routeIdx);
        stationEl.replaceWith(tmp.firstElementChild);
      }
    });

    // ── ルートパターン切り替え ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.rpb');
      if (!btn) return;
      const pattern = btn.dataset.pattern;
      if (!ROUTE_PATTERNS[pattern]) return;
      activePattern = pattern;
      try { localStorage.setItem('fineme:navi:pattern', pattern); } catch {}
      document.querySelectorAll('.rpb').forEach(b => b.classList.toggle('active', b.dataset.pattern === pattern));
      const desc = document.getElementById('route-pattern-desc');
      if (desc) desc.textContent = PATTERN_DESCS[pattern] || '';
      const container = document.getElementById('route-container');
      if (container) container.innerHTML = buildRouteContainerHtml();
    });

    // ── ステーション展開 ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.station-expand-btn');
      if (!btn) return;
      const id = btn.dataset.expandStation;
      if (!id) return;
      expandedStations.add(id);
      const routeIdx = getRouteOrder().indexOf(id);
      const el = document.getElementById('station-' + id);
      if (el) {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildStation(id, routeIdx);
        el.replaceWith(tmp.firstElementChild);
      }
    });

    // ── ステーション折りたたみ ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.station-collapse-btn');
      if (!btn) return;
      const id = btn.dataset.collapseStation;
      if (!id) return;
      expandedStations.delete(id);
      const routeIdx = getRouteOrder().indexOf(id);
      const el = document.getElementById('station-' + id);
      if (el) {
        const tmp = document.createElement('div');
        tmp.innerHTML = buildStation(id, routeIdx);
        el.replaceWith(tmp.firstElementChild);
      }
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
        .navi-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
        .navi-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        .navi-sidenav .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .navi-sidenav .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .navi-sidenav .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        @media (max-width: 640px) {
          .navi-layout { grid-template-columns: 1fr; padding: 16px 16px 60px; }
          .navi-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
          .navi-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; }
          .navi-sidenav nav::-webkit-scrollbar { display: none; }
          .navi-sidenav nav > * { margin-top: 0 !important; }
          .navi-sidenav .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; }
          .navi-wrap { padding: 0 0 40px !important; }
        }
      `}</style>
      <main>
        <div className="navi-layout">
          <aside className="navi-sidenav">
            <nav className="stack" style={{ gap: '4px' }}>
              <Link href="/mypage" className="sidenav-link">ホーム</Link>
              <Link href="/diagnosis/result" className="sidenav-link">New Me Map</Link>
              <Link href="/mypage/navi" className="sidenav-link sidenav-link--active">New Me Navi</Link>
              <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
              <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
              <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
              <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
              <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            </nav>
          </aside>
          <div>
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
                    特集一覧を見る →
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
