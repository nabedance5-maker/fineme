'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TRACKS, getTrackId, syncTrackWithServer } from '@/lib/track';
import { AXIS_HABIT_ITEM_LABELS, BELLE_MAKEUP_ITEM_LABELS, BELLE_HAIRREMOVAL_ITEM_LABELS } from '@/lib/axis-habits';
import { FACE_TYPE_OPTIONS, FACE_TYPE_OPTIONS_BELLE } from '@/lib/profile-basics';
import MypageSideNav from '../_components/MypageSideNav';

// 軸 → 関連カテゴリのマッピング（記事のcategoryフィールドと照合）
const AXIS_RELATED_CATS = {
  hair:        ['清潔感', '垢抜け'],
  skin:        ['清潔感'],
  hairremoval: ['清潔感'],
  eyebrow:     ['清潔感', '垢抜け'],
  fashion:     ['垢抜け'],
  body:        ['垢抜け'],
  teeth:       [],
  nail:        [],
};

export default function NewMeNaviPage() {
  const initialized = useRef(false);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [trackId, setTrackId] = useState('fineme');
  const track = TRACKS[trackId] || TRACKS.fineme;

  // ログイン済みならサーバのトラックを正として取り込む
  useEffect(() => {
    setTrackId(getTrackId());
    syncTrackWithServer().then((t) => { if (t) setTrackId(t); }).catch(() => {});
  }, []);

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

      /* ── New Me Log Widget ── */
      .sl-widget { background: rgba(10,15,30,0.65); border: 1px solid rgba(201,168,76,0.18); border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; backdrop-filter: blur(8px); }
      .sl-widget-empty { border-style: dashed; border-color: rgba(232,228,220,0.10); }
      .sl-widget-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .sl-widget-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(201,168,76,0.65); }
      .sl-widget-link { font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.7); text-decoration: none; }
      .sl-widget-link:hover { color: #c9a84c; }
      .sl-widget-empty-text { font-size: 12px; color: rgba(232,228,220,0.38); line-height: 1.65; margin: 0; }
      .sl-items { display: flex; flex-direction: column; gap: 8px; }
      .sl-item { display: flex; align-items: center; gap: 10px; }
      .sl-item-icon { font-size: 20px; flex-shrink: 0; width: 28px; text-align: center; }
      .sl-item-body { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
      .sl-item-name { font-size: 13px; font-weight: 700; color: rgba(232,228,220,0.80); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sl-next-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; white-space: nowrap; flex-shrink: 0; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); color: rgba(232,228,220,0.45); }
      .sl-next-badge.sl-next-soon { border-color: rgba(52,211,153,0.35); color: rgba(52,211,153,0.85); background: rgba(52,211,153,0.06); }
      .sl-next-badge.sl-next-today { border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08); }
      .sl-next-badge.sl-next-overdue { border-color: rgba(239,68,68,0.35); color: rgba(239,68,68,0.80); background: rgba(239,68,68,0.06); }
      .sl-next-badge.sl-next-none { opacity: .4; }
      /* ── ongoingステップのログバッジ ── */
      .step-log-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 8px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); color: rgba(232,228,220,0.55); margin-top: 8px; width: 100%; box-sizing: border-box; text-decoration: none; }
      .step-log-badge.slb-linked { border-color: rgba(201,168,76,0.3); color: rgba(201,168,76,0.85); background: rgba(201,168,76,0.06); }
      .step-log-badge.slb-soon { border-color: rgba(52,211,153,0.3); color: rgba(52,211,153,0.85); background: rgba(52,211,153,0.06); }
      .step-log-badge.slb-overdue { border-color: rgba(239,68,68,0.3); color: rgba(239,68,68,0.80); background: rgba(239,68,68,0.06); }

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
      .route-container { width: 100%; box-sizing: border-box; position: relative; }
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
      .inline-service-card { display: none; text-decoration: none; }
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
      .tq-item { padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(201,168,76,0.12); }
      .tq-item:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
      .tq-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
      .tq-item-axis { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.7); letter-spacing: .04em; }

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

      /* ── Journey Overview (変容の旅 全体図) ── */
      .jov-section { margin-bottom: 24px; }
      .jov-hero { background: rgba(10,15,30,0.65); border: 1.5px solid rgba(201,168,76,0.4); border-radius: 16px; padding: 18px 16px 16px; margin-bottom: 14px; }
      .jov-hero-axis { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .jov-hero-icon { font-size: 20px; flex-shrink: 0; }
      .jov-hero-sub { font-size: 9px; font-weight: 800; letter-spacing:.1em; color: rgba(201,168,76,0.6); text-transform: uppercase; margin: 0 0 2px; }
      .jov-hero-title { font-size: 14px; font-weight: 900; color: rgba(232,228,220,0.90); margin: 0; }
      .jov-track-row { display: flex; align-items: center; gap: 0; margin: 0 0 6px; }
      .jov-wp-node { flex: 0 0 auto; }
      .jov-wp-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(232,228,220,0.2); background: rgba(10,15,30,0.65); flex-shrink: 0; display: block; }
      .jov-wp-dot.jov-done { background: #c9a84c; border-color: #c9a84c; }
      .jov-wp-dot.jov-current { background: #0a0f1e; border-color: #c9a84c; box-shadow: 0 0 0 4px rgba(201,168,76,0.18); animation: jov-pulse 2.2s ease-in-out infinite; }
      .jov-wp-dot.jov-goal { width: 14px; height: 14px; }
      .jov-wp-dot.jov-goal.jov-done { background: rgba(52,211,153,0.9); border-color: rgba(52,211,153,0.9); }
      @keyframes jov-pulse { 0%,100% { box-shadow: 0 0 0 3px rgba(201,168,76,.12),0 0 6px rgba(201,168,76,.18); } 50% { box-shadow: 0 0 0 6px rgba(201,168,76,.22),0 0 14px rgba(201,168,76,.28); } }
      .jov-track-conn { flex: 1; height: 2px; background: rgba(232,228,220,0.1); border-radius: 1px; align-self: center; margin-bottom: 0; }
      .jov-track-conn.jov-done { background: #c9a84c; }
      .jov-labels-row { display: flex; align-items: flex-start; gap: 0; margin-top: 5px; }
      .jov-wp-label-wrap { flex: 0 0 auto; text-align: center; width: 0; overflow: visible; }
      .jov-conn-spacer { flex: 1; }
      .jov-wp-label { font-size: 9px; font-weight: 700; color: rgba(232,228,220,0.38); line-height: 1.3; white-space: nowrap; transform: translateX(-50%); display: inline-block; }
      .jov-wp-label.jov-done { color: rgba(201,168,76,0.75); }
      .jov-wp-label.jov-next { color: rgba(232,228,220,0.75); font-weight: 800; }
      .jov-next-target { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; margin-top: 14px; }
      .jov-next-target-text { flex: 1; min-width: 0; }
      .jov-next-target-eyebrow { font-size: 9px; font-weight: 800; letter-spacing:.08em; text-transform: uppercase; color: rgba(201,168,76,0.55); margin: 0 0 2px; }
      .jov-next-target-label { font-size: 13px; font-weight: 800; color: rgba(232,228,220,0.88); margin: 0 0 2px; }
      .jov-next-target-desc { font-size: 11px; color: rgba(232,228,220,0.50); margin: 0; line-height: 1.5; }
      .jov-next-steps { text-align: center; flex-shrink: 0; }
      .jov-next-steps-num { font-size: 24px; font-weight: 900; color: #c9a84c; line-height: 1; display: block; }
      .jov-next-steps-unit { font-size: 10px; color: rgba(201,168,76,0.65); display: block; }
      .jov-other-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .jov-other-chip { background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.1); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: border-color .15s; }
      .jov-other-chip:hover { border-color: rgba(201,168,76,0.3); }
      .jov-other-chip-head { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; }
      .jov-other-chip-icon { font-size: 14px; }
      .jov-other-chip-name { font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.75); flex: 1; }
      .jov-stage-dots { display: flex; gap: 3px; margin-bottom: 4px; }
      .jov-sd { flex: 1; height: 3px; border-radius: 99px; background: rgba(232,228,220,0.1); }
      .jov-sd.jov-done { background: #c9a84c; }
      .jov-sd.jov-goal-done { background: rgba(52,211,153,0.7); }
      .jov-stage-label { font-size: 9px; font-weight: 700; color: rgba(232,228,220,0.28); }
      .jov-stage-label.s1 { color: rgba(201,168,76,0.65); }
      .jov-stage-label.s2 { color: rgba(201,168,76,0.80); }
      .jov-stage-label.s3 { color: rgba(52,211,153,0.75); }
      /* ── 軸完了ボタン ── */
      .jov-complete-btn { width:100%;margin-top:14px;padding:14px 20px;background:linear-gradient(135deg,rgba(201,168,76,0.18),rgba(201,168,76,0.10));border:1.5px solid rgba(201,168,76,0.5);border-radius:12px;color:#c9a84c;font-size:15px;font-weight:800;cursor:pointer;font-family:'Noto Sans JP',sans-serif;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.04em; }
      .jov-complete-btn:hover { background:linear-gradient(135deg,rgba(201,168,76,0.28),rgba(201,168,76,0.18));border-color:#c9a84c;transform:translateY(-1px);box-shadow:0 4px 16px rgba(201,168,76,0.2); }
      .jov-complete-btn:active { transform:translateY(0); }
      .jov-complete-btn:disabled { opacity:.5;cursor:default;transform:none; }

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

      /* ── Game Map Path ── */
      .path-wrap { position: relative; padding: 0 4px; }
      .path-phase-banner { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: rgba(10,15,30,0.55); border: 1px solid rgba(201,168,76,0.22); border-radius: 12px; margin: 24px 0 8px; }
      .path-phase-banner-icon { font-size: 22px; flex-shrink: 0; }
      .path-phase-banner-body { flex: 1; min-width: 0; }
      .path-phase-banner-label { font-size: 14px; font-weight: 900; color: rgba(232,228,220,0.88); margin: 0 0 2px; font-family: 'Noto Serif JP', Georgia, serif; }
      .path-phase-banner-desc { font-size: 11px; color: rgba(232,228,220,0.42); margin: 0; }
      .path-phase-banner-count { font-size: 11px; font-weight: 800; color: rgba(201,168,76,0.7); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 99px; padding: 3px 10px; white-space: nowrap; flex-shrink: 0; }
      .gmap-node-row { display: flex; padding: 4px 8px; }
      .gmap-node-row.gnr-left { justify-content: flex-start; padding-left: 20px; }
      .gmap-node-row.gnr-right { justify-content: flex-end; padding-right: 20px; }
      .gmap-node-row.gnr-center { justify-content: center; }
      .gmap-node { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 96px; cursor: pointer; }
      .gm-circle { width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; border: 3px solid; transition: all .25s; position: relative; flex-shrink: 0; z-index: 1; }
      .gmap-node-row { position: relative; z-index: 1; }
      .gm-c-future { border-color: rgba(232,228,220,0.18); background: rgba(10,15,30,0.5); box-shadow: 0 3px 12px rgba(0,0,0,.3); }
      .gm-c-active { border-color: rgba(201,168,76,0.45); background: rgba(201,168,76,0.07); box-shadow: 0 4px 16px rgba(201,168,76,.1); }
      .gm-c-done { border-color: #c9a84c; background: rgba(201,168,76,0.15); box-shadow: 0 4px 14px rgba(201,168,76,.2); }
      .gm-c-done::after { content: '✓'; position: absolute; top: -4px; right: -4px; width: 22px; height: 22px; border-radius: 50%; background: #10b981; color: #fff; font-size: 13px; font-weight: 900; line-height: 22px; text-align: center; display: block; }
      .gm-c-compass { border-color: #c9a84c; background: rgba(201,168,76,0.12); box-shadow: 0 0 0 8px rgba(201,168,76,.08), 0 6px 20px rgba(201,168,76,.25); animation: gmap-pulse 2.2s ease-in-out infinite; width: 70px; height: 70px; font-size: 32px; }
      @keyframes gmap-pulse { 0%,100% { box-shadow: 0 0 0 6px rgba(201,168,76,.08), 0 6px 20px rgba(201,168,76,.2); } 50% { box-shadow: 0 0 0 14px rgba(201,168,76,.14), 0 8px 28px rgba(201,168,76,.35); } }
      .gmap-node-label { text-align: center; width: 100%; }
      .gmap-node-axis-name { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.75); letter-spacing: .05em; display: block; margin-bottom: 3px; }
      .gmap-node-text { font-size: 11px; color: rgba(232,228,220,0.72); line-height: 1.45; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .path-node.pn-done .gmap-node-text { text-decoration: line-through; color: #6b7280; }
      .path-node.pn-done .gmap-node-axis-name { opacity: 0.45; }
      .gmap-now-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 9px; font-weight: 800; color: #c9a84c; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.32); border-radius: 99px; padding: 1px 6px; white-space: nowrap; margin-bottom: 2px; }
      .gmap-baseline-chip { font-size: 8px; font-weight: 800; color: rgba(52,211,153,0.9); background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.28); border-radius: 99px; padding: 1px 5px; margin-left: 2px; vertical-align: middle; }
      .gmap-habit-chip { font-size: 8px; font-weight: 800; color: rgba(201,168,76,0.9); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); border-radius: 99px; padding: 1px 5px; margin-left: 2px; vertical-align: middle; }
      .gmap-selfcheck-badge { font-size: 9px; font-weight: 700; color: rgba(52,211,153,0.85); background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); border-radius: 99px; padding: 1px 6px; display: inline-block; margin-bottom: 2px; }
      .path-node-detail { display: none; margin: 4px 0 8px; }
      .path-node-detail.pnd-open { display: block; }
      .gmap-detail-card { background: rgba(8,12,26,0.92); border: 1px solid rgba(232,228,220,0.12); border-radius: 12px; padding: 16px; margin: 0 4px; display: flex; flex-direction: column; gap: 10px; }
      .path-node.pn-compass .gmap-detail-card { border-color: rgba(201,168,76,0.3); }
      .gmap-detail-title { font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.90); line-height: 1.6; margin: 0; }
      .curated-post-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); border-radius: 10px; text-decoration: none; }
      .curated-post-card:hover { border-color: rgba(201,168,76,0.3); }
      .curated-post-thumb { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
      .curated-post-body { flex: 1; min-width: 0; }
      .curated-post-label { font-size: 10px; color: rgba(232,228,220,0.40); margin: 0 0 2px; }
      .curated-post-caption { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.75); margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .gmap-check-btn { position: static; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 13px; background: rgba(16,185,129,0.1); border: 1.5px solid rgba(16,185,129,0.35); border-radius: 10px; color: rgba(16,185,129,0.85); font-size: 15px; font-weight: 800; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; flex-shrink: 0; transform: none; }
      .gmap-check-btn:hover { background: rgba(16,185,129,0.18); border-color: #10b981; }
      .gmap-check-btn.checked { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; }
      .gmap-check-btn.checked:hover { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.45); color: rgba(239,68,68,0.8); }
      .gmap-check-btn.checked:hover::before { content: '× '; }
      .mirror-confirmed-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: rgba(100,160,255,0.9); background: rgba(100,160,255,0.08); border: 1px solid rgba(100,160,255,0.25); border-radius: 99px; padding: 3px 10px; align-self: flex-start; }
      .confirmed-insights-widget { margin: 0 0 16px; padding: 14px 16px; background: rgba(100,160,255,0.05); border: 1px solid rgba(100,160,255,0.18); border-radius: 12px; }
      .confirmed-insights-label { font-size: 11px; font-weight: 800; color: rgba(100,160,255,0.85); margin: 0 0 8px; }
      .confirmed-insights-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .confirmed-insight-chip { font-size: 11.5px; color: rgba(232,228,220,0.75); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 99px; padding: 4px 10px; }
      .gmap-article-row { display: flex; justify-content: center; padding: 2px 8px; }
      .gmap-article-node { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(10,15,30,0.45); border: 1px solid rgba(232,228,220,0.12); border-radius: 10px; text-decoration: none; width: 100%; max-width: 310px; }
      .gmap-article-node:hover { border-color: rgba(201,168,76,0.3); }
      .gmap-article-icon { font-size: 18px; flex-shrink: 0; }
      .gmap-article-body { flex: 1; min-width: 0; }
      .gmap-article-label { font-size: 10px; color: rgba(232,228,220,0.40); margin: 0 0 2px; }
      .gmap-article-title { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.75); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      /* === チャンク設計（ゴール勾配効果。2026-08-10）：次チャンクの要約カード === */
      .navi-next-chunk-card { background: rgba(201,168,76,.06); border: 1px solid rgba(201,168,76,.18); border-radius: 12px; padding: 16px 18px; margin: 12px 0 4px; text-align: center; }
      .navi-next-chunk-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .12em; color: rgba(201,168,76,0.55); text-transform: uppercase; margin: 0 0 6px; }
      .navi-next-chunk-text { font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.85); margin: 0 0 6px; }
      .navi-next-chunk-sub { font-size: 12px; color: #6b7280; line-height: 1.6; margin: 0; }
      .navi-next-chunk-link { display: inline-block; margin-top: 10px; font-size: 12px; font-weight: 700; color: #c9a84c; text-decoration: none; }
      .mirror-promo-strip { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(100,160,255,0.05); border: 1px solid rgba(100,160,255,0.2); border-radius: 10px; font-size: 12px; color: rgba(232,228,220,0.55); margin-bottom: 14px; }
      .mirror-promo-strip a { color: rgba(100,160,255,0.85); font-weight: 700; text-decoration: none; margin-left: auto; white-space: nowrap; }
      .navi-done-toggle { font-size: 12px; color: #9ca3af; background: none; border: none; cursor: pointer; padding: 0 0 10px; display: block; width: 100%; text-align: left; }
      .navi-done-list { display: none; }
      .navi-done-list.open { display: block; }
.mirror-basis-card { background: rgba(100,160,255,0.05); border: 1px solid rgba(100,160,255,0.18); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
.mb-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.mb-icon { font-size: 20px; flex-shrink: 0; }
.mb-title { font-size: 12px; font-weight: 700; color: rgba(100,160,255,0.85); margin: 0 0 2px; }
.mb-sub { font-size: 11px; color: rgba(232,228,220,0.4); margin: 0; }
.mb-axes { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; }
.mb-axis-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.mb-axis-name { font-weight: 700; color: rgba(232,228,220,0.8); min-width: 42px; }
.mb-axis-level { font-weight: 600; min-width: 82px; }
.mb-axis-placement { color: rgba(232,228,220,0.4); }
.voyage-log { background: rgba(10,15,30,0.5); border: 1px solid rgba(201,168,76,0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.voyage-log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.voyage-log-title { font-size: 10px; font-weight: 800; letter-spacing: .1em; color: rgba(201,168,76,0.55); text-transform: uppercase; margin: 0; }
.voyage-log-mirror { font-size: 10px; color: rgba(100,160,255,0.7); }
.voyage-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.voyage-stat { background: rgba(255,255,255,0.03); border-radius: 8px; padding: 10px 8px; text-align: center; }
.voyage-stat-num { font-size: 24px; font-weight: 800; color: rgba(201,168,76,0.9); line-height: 1; display: block; margin-bottom: 3px; }
.voyage-stat-label { font-size: 9px; color: rgba(232,228,220,0.4); letter-spacing: .05em; }
.voyage-recent-title { font-size: 10px; color: rgba(232,228,220,0.35); margin: 0 0 6px; }
.voyage-recent-item { font-size: 11px; color: rgba(232,228,220,0.65); display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; line-height: 1.5; }
.voyage-recent-check { color: rgba(201,168,76,0.7); flex-shrink: 0; font-size: 10px; }

      /* ── 週次チェックイン ── */
      .wcw { background: rgba(10,15,30,0.65); border: 1px solid rgba(201,168,76,0.22); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; backdrop-filter: blur(8px); }
      .wcw.wcw-done { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.04); }
      .wcw-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(201,168,76,0.65); margin: 0 0 12px; }
      .wcw-prev { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.08); border-radius: 8px; margin-bottom: 6px; }
      .wcw-prev-label { font-size: 9px; font-weight: 800; letter-spacing: .08em; color: rgba(232,228,220,0.35); white-space: nowrap; text-transform: uppercase; }
      .wcw-prev-text { flex: 1; font-size: 11px; color: rgba(232,228,220,0.45); line-height: 1.4; }
      .wcw-prev-done { color: rgba(16,185,129,0.7); font-weight: 700; flex-shrink: 0; font-size: 12px; }
      .wcw-prev-arrow { font-size: 11px; color: rgba(201,168,76,0.4); margin-bottom: 6px; }
      .wcw-current { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
      .wcw-axis-icon { font-size: 24px; flex-shrink: 0; }
      .wcw-body { flex: 1; }
      .wcw-axis-name { font-size: 13px; font-weight: 800; color: rgba(232,228,220,0.85); margin: 0 0 3px; }
      .wcw-step-text { font-size: 13px; color: rgba(232,228,220,0.65); margin: 0; line-height: 1.55; }
      .wcw-check { font-size: 18px; color: #10b981; flex-shrink: 0; padding-top: 2px; }
      .wcw-note { font-size: 11px; color: rgba(232,228,220,0.35); margin: 0 0 10px; line-height: 1.5; }
      .wcw-done-msg { font-size: 12px; color: rgba(16,185,129,0.75); font-weight: 700; padding: 6px 0 0; margin: 0; }
      .wcw-btn { display: block; width: 100%; padding: 10px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3); border-radius: 8px; font-size: 13px; font-weight: 700; color: #c9a84c; cursor: pointer; font-family: inherit; transition: background .12s; }
      .wcw-btn:hover { background: rgba(201,168,76,0.14); }
      .wcw-continuity { margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(232,228,220,0.12); }
      .wcw-continuity-q { font-size: 12px; color: rgba(232,228,220,0.6); margin: 0 0 8px; line-height: 1.5; }
      .wcw-continuity-opts { display: flex; flex-wrap: wrap; gap: 6px; }
      .wcw-continuity-opt { padding: 7px 10px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.15); border-radius: 8px; font-size: 11px; font-weight: 700; color: rgba(232,228,220,0.65); cursor: pointer; font-family: inherit; transition: border-color .12s; }
      .wcw-continuity-opt:hover { border-color: rgba(201,168,76,0.4); color: #c9a84c; }
      .wcw-continuity-ack { font-size: 11px; color: rgba(201,168,76,0.7); margin: 12px 0 0; padding-top: 12px; border-top: 1px dashed rgba(232,228,220,0.12); line-height: 1.5; }
      .axis-habit-banner { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.22); border-radius: 10px; margin-bottom: 16px; }
      .axis-habit-banner-icon { font-size: 20px; flex-shrink: 0; }
      .axis-habit-banner-body { flex: 1; min-width: 0; }
      .axis-habit-banner-title { font-size: 12px; font-weight: 700; color: rgba(232,228,220,0.85); margin: 0 0 2px; line-height: 1.5; }
      .axis-habit-banner-desc { font-size: 10px; color: rgba(232,228,220,0.4); margin: 0; }
      .axis-habit-banner-btn { font-size: 11px; font-weight: 700; padding: 7px 12px; background: rgba(201,168,76,0.1); border: 1px solid #c9a84c; color: #c9a84c; border-radius: 8px; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
    `;
    document.head.appendChild(style);

    // ── データ（Supabase優先 → localStorage fallback）──
    ;(async () => {
    // 読むデータはユーザーのトラックで決まる（lib/track.js が単一の真実）。
    // 以前は「latestがあればlatest」という順で、両方受けた人は必ず男性版が勝っていた。
    const TRACK_ID = getTrackId();
    const TRACK = TRACKS[TRACK_ID] || TRACKS.fineme;
    const STORAGE_KEY = TRACK.storageKey;
    const PROGRESS_KEY = 'fineme:axis:progress';
    const STEP_DONE_KEY = 'fineme:step:done';
    const root = document.getElementById('navi-root');
    if (!root) return;

    // ── 認証チェック（AuthGateに依存しない） ──
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const isLoggedIn = !!(sbKey && JSON.parse(localStorage.getItem(sbKey) || 'null')?.user?.id);
      if (!isLoggedIn) {
        const hasDiagData = !!(localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle'));
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
                    8軸の現在地と変容ロードマップ（Fineme Compass）が<br>ここに届きます。まずログイン / 新規登録してください。
                  </p>`
              }
              <a href="/login" style="display:block;width:100%;padding:15px 24px;background:#c9a84c;color:#0a0f1e;font-size:15px;font-weight:700;border-radius:6px;text-decoration:none;letter-spacing:.05em;margin-bottom:12px;box-sizing:border-box">
                ログイン / 新規登録
              </a>
              <a href="${TRACK.diagnosis}" style="font-size:13px;color:rgba(232,228,220,0.40);text-decoration:none;border-bottom:1px solid rgba(232,228,220,0.15);padding-bottom:2px">
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
    let currentUid = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        token = sbObj?.access_token || null;
        currentUid = sbObj?.user?.id || null;
      }
    } catch {}

    // ── アカウント切り替え検知: 前回と異なるユーザーならfineme:*キーを全削除 ──
    try {
      const lastUid = localStorage.getItem('fineme:uid');
      if (currentUid && lastUid && lastUid !== currentUid) {
        ['fineme:diagnosis:latest','fineme:axis:progress','fineme:step:done',
         'fineme:body:data','fineme:navi:pattern','fineme:compass:override',
         'fineme:navi:filter','fineme:mirror:sessions'].forEach(k => localStorage.removeItem(k));
      }
      if (currentUid) localStorage.setItem('fineme:uid', currentUid);
    } catch {}

    // ── 診断データ読み込み（Supabase優先） ──
    try {
      if (token) {
        const res = await fetchWithTimeout(`/api/me/diagnosis?track=${TRACK_ID}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res?.ok) { const data = await res.json(); if (data) {
          // 共有リモート行（/api/me/diagnosis は user_id 単一行）には男女両方のMe Scanが
          // 入りうる。STORAGE_KEY で決まる性別トラックと一致するデータ以外は採用しない
          // （belle=女性版 / lat=旧データは gender 未設定＝男性版）。
          const expectFemale = STORAGE_KEY === 'fineme:diagnosis:belle';
          const genderMatch = expectFemale ? (data.gender === 'female') : (data.gender !== 'female');
          if (genderMatch) {
            try {
              const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
              const localAt = local?.at ? new Date(local.at).getTime() : 0;
              const remoteAt = data?.at ? new Date(data.at).getTime() : 0;
              if (remoteAt >= localAt) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
            } catch { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }
          }
        } }
      }
    } catch {}

    // ── ステップ完了データ読み込み ──
    let allNaviArticles = [];
    let stepDone = {};
    try { const s = localStorage.getItem(STEP_DONE_KEY); if (s) stepDone = JSON.parse(s); } catch {}
    let mirrorOnePoint = null;
    try { mirrorOnePoint = JSON.parse(localStorage.getItem('fineme:mirror:one-point') || 'null'); } catch {}

    // ── 現状把握データ読み込み ──
    const BODY_DATA_KEY = 'fineme:body:data';
    let bodyData = {};
    try { const s = localStorage.getItem(BODY_DATA_KEY); if (s) bodyData = JSON.parse(s); } catch {}

    // ── AI生成パーソナライズステップ ──
    let naviStepsData = null;
    let hasMirrorData      = false;
    let mirrorAnalysisAxes = null;
    let mirrorSessionDate  = null;

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
          if (data.navi_steps?.steps?.length > 0) {
            naviStepsData = data.navi_steps;
          }
        }
      }
    } catch {}

    // ── あなたについて分かってきたこと: 過去の月次スナップショットのstep_outcomesを軸ごとに集計 ──
    let confirmedByAxis = {};
    if (token) {
      try {
        const snapRes = await fetchWithTimeout('/api/me/navi-snapshots', { headers: { 'Authorization': `Bearer ${token}` } });
        if (snapRes?.ok) {
          const snapData = await snapRes.json();
          for (const snap of (snapData.snapshots || [])) {
            for (const o of (snap.step_outcomes || [])) {
              if (o.done && o.mirror_change === true) {
                confirmedByAxis[o.axis] = (confirmedByAxis[o.axis] || 0) + 1;
              }
            }
          }
        }
      } catch {}
    }

    // ── from=mirror: Mirrorから来た場合、Mapを自動更新 ──
    const fromMirror = new URLSearchParams(location.search).get('from') === 'mirror';
    if (fromMirror && token) {
      try {
        root.innerHTML = `<div style="min-height:40vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:48px 20px;text-align:center">
          <div style="font-size:36px">🪞</div>
          <p style="font-size:15px;font-weight:700;color:rgba(232,228,220,0.85)">Mirrorデータを反映してMapを更新しています…</p>
          <p style="font-size:12px;color:rgba(232,228,220,0.4)">20〜40秒ほどかかります。そのままお待ちください。</p>
        </div>`;

        // 直近のMirrorセッションIDを取得（先月の振り返り接続・部分更新の両方に使う）
        let latestMirrorSessionId = null;
        try {
          const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          const uidForMirror = JSON.parse(localStorage.getItem(sbKey) || 'null')?.user?.id;
          if (uidForMirror) {
            const sRes = await fetchWithTimeout(`/api/mirror/sessions?user_id=${uidForMirror}&limit=1`);
            if (sRes?.ok) {
              const sd = await sRes.json();
              latestMirrorSessionId = sd.sessions?.[0]?.id || null;
            }
          }
        } catch {}

        // 先月の振り返り接続（失敗しても続行。前月スナップショットのstep_outcomesを埋める）
        if (latestMirrorSessionId) {
          try {
            await fetch('/api/me/navi-reconcile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ mirror_session_id: latestMirrorSessionId }),
            });
          } catch {}
        }

        // ロードマップ（既存ステップ・stepDoneの紐付け）を温存できるなら部分更新、
        // baselineが無ければ（初回Mirror）差分比較不能なのでフル生成にフォールバック
        if (naviStepsData?.mirror_baseline_session_id && latestMirrorSessionId) {
          try {
            const syncRes = await fetch('/api/me/navi-steps/mirror-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ mirror_session_id: latestMirrorSessionId }),
            });
            if (syncRes.ok) {
              const url = new URL(location.href);
              url.searchParams.delete('from');
              window.location.replace(url.toString());
              return;
            }
          } catch {}
        }

        const genRes = await fetch('/api/me/navi-steps/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ mirror_only: true }),
        });
        if (genRes.ok) {
          // 成功 → URLパラメータを除去してリロード
          const url = new URL(location.href);
          url.searchParams.delete('from');
          window.location.replace(url.toString());
          return;
        }
        // 429: すでに反映済み、または今日の制限。そのまま続行してMapを表示
        const errData = genRes.status === 429 ? await genRes.json().catch(() => ({})) : {};
        if (genRes.status === 429 && errData.error === 'daily_limit') {
          // Mapはすでに最新 → パラメータだけ除去してそのまま表示
          const url = new URL(location.href);
          url.searchParams.delete('from');
          history.replaceState(null, '', url.toString());
          // fall-through to normal rendering
        }
      } catch {
        // エラー時はそのまま表示に fall-through
        root.innerHTML = '';
      }
      // root が中間表示のままなら空にしてfall-through
      if (root.innerHTML && root.innerHTML.includes('Mirrorデータを反映')) root.innerHTML = '';
    }

    // ── New Me Log: サービスログ取得 ──
    let serviceLogs = [];
    if (token) {
      try {
        const r = await fetchWithTimeout('/api/me/service-logs', { headers: { Authorization: `Bearer ${token}` } });
        if (r?.ok) { const d = await r.json(); serviceLogs = d.logs || []; }
      } catch {}
    }
    // axis → log のマップ（軸ごとの直近ログ）
    const serviceLogByAxis = {};
    serviceLogs.forEach(log => {
      if (!serviceLogByAxis[log.axis]) serviceLogByAxis[log.axis] = log;
    });

    // ── 記事フェッチ（非同期・失敗しても無視） ──
    try {
      const artRes = await fetchWithTimeout(`/api/features?track=${TRACK_ID}`, {}, 5000);
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

    // ── キュレーション済み投稿フェッチ（ステップに紐づくInstagram/TikTok。
    //     でお指摘 2026-08-12：AI生成時にstep本文の内容に合う投稿だけrelated_post_idで紐付け済み） ──
    let curatedPostsById = {};
    try {
      const relatedIds = [...new Set((naviStepsData?.steps || []).map(s => s.related_post_id).filter(Boolean))];
      if (relatedIds.length) {
        const cpRes = await fetchWithTimeout(`/api/curated-posts?ids=${relatedIds.join(',')}`, {}, 5000);
        if (cpRes?.ok) {
          const rows = await cpRes.json();
          if (Array.isArray(rows)) rows.forEach(r => { curatedPostsById[r.id] = r; });
        }
      }
    } catch {}

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Mirror履歴があればMirror-only Map生成を提案
      if (token) {
        try {
          const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          const uid = JSON.parse(localStorage.getItem(sbKey) || 'null')?.user?.id;
          if (uid) {
            const mRes = await fetchWithTimeout(`/api/mirror/sessions?user_id=${uid}&limit=1&include_axes=1`);
            if (mRes?.ok) {
              const d = await mRes.json();
              if (d.sessions?.length) {
                hasMirrorData      = true;
                mirrorAnalysisAxes = d.sessions[0]?.axes || null;
                mirrorSessionDate  = d.sessions[0]?.created_at || null;
              }
            }
          }
        } catch {}
      }

      if (hasMirrorData) {
        root.innerHTML = `<div class="no-data">
          <div class="no-data-icon">📸</div>
          <h2 class="no-data-title">Mirrorのデータがあります</h2>
          <p class="no-data-text">Mirror分析の変容余地データから、<br>あなた専用の New Me Map を生成できます。</p>
          <button id="mirror-map-gen-btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px;background:linear-gradient(135deg,#c9a84c,#e8c97a);border:none;border-radius:10px;color:#0a0f1e;cursor:pointer;font-family:inherit;box-shadow:0 6px 24px rgba(201,168,76,0.3)">📸 Mirrorデータでマップを生成 →</button>
          <p style="margin-top:14px;font-size:11px;color:rgba(232,228,220,0.3)">Me Scan（無料診断）を受けるとさらに精度が上がります</p>
          <a href="${TRACK.diagnosis}" style="display:block;margin-top:8px;font-size:12px;color:rgba(201,168,76,0.55);text-decoration:none">Me Scanも受ける（推奨）→</a>
        </div>`;
        document.getElementById('mirror-map-gen-btn')?.addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true; btn.textContent = '生成中… しばらくお待ちください';
          try {
            const res = await fetch('/api/me/navi-steps/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ mirror_only: true }),
            });
            if (res.status === 429) { btn.textContent = '本日はすでに生成済みです。明日また生成できます。'; return; }
            if (!res.ok) { btn.textContent = '生成に失敗しました。再度お試しください'; btn.disabled = false; return; }
            window.location.reload();
          } catch { btn.textContent = 'エラーが発生しました'; btn.disabled = false; }
        });
      } else {
        root.innerHTML = `<div class="no-data">
          <div class="no-data-icon">🧭</div>
          <h2 class="no-data-title">まだ地図がありません</h2>
          <p class="no-data-text">Me Scanを受けるか、Mirrorで写真を分析すると、<br>あなただけの変容マップが生成されます。</p>
          <div style="display:flex;flex-direction:column;gap:10px;align-items:center;margin-top:4px">
            <a href="${TRACK.diagnosis}" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（無料）</a>
            <a href="${TRACK.mirror}" style="font-size:13px;color:rgba(201,168,76,0.7);text-decoration:none">写真でMirror分析 →</a>
          </div>
        </div>`;
      }
      return;
    }
    let p;
    try { p = JSON.parse(raw); } catch {
      root.innerHTML = `<div class="no-data"><p>データエラー。</p><a href="${TRACK.diagnosis}" class="btn">再スキャン</a></div>`;
      return;
    }
    if (!p.transform_vectors) {
      root.innerHTML = `<div class="no-data">
        <div class="no-data-icon">🗺️</div>
        <h2 class="no-data-title">新しいMe Scanが必要です</h2>
        <p class="no-data-text">診断をアップデートしました。<br>新しいMe Scanで変容マップを生成します。</p>
        <a href="${TRACK.diagnosis}" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px">Me Scanを受ける（新版）</a>
      </div>`;
      return;
    }

    // ── Me Scanが最新Mapより新しい場合は自動生成（古いMapを見せない） ──
    if (token && p?.at) {
      const diagAt = new Date(p.at).getTime();
      const mapAt = naviStepsData?.generated_at ? new Date(naviStepsData.generated_at).getTime() : 0;
      if (diagAt > mapAt) {
        const isFirstTime = !naviStepsData;
        root.innerHTML = `<div style="min-height:40vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:48px 20px;text-align:center">
          <div style="font-size:36px">🧭</div>
          <p style="font-size:15px;font-weight:700;color:rgba(232,228,220,0.85)">${isFirstTime ? 'あなた専用のMapを生成しています…' : '新しいMe Scanを反映してMapを更新しています…'}</p>
          <p style="font-size:12px;color:rgba(232,228,220,0.4)">20〜40秒ほどかかります。そのままお待ちください。</p>
        </div>`;
        try {
          const genRes = await fetch('/api/me/navi-steps/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ diagnosis: p, body_data: bodyData }),
          });
          if (genRes.ok) { window.location.reload(); return; }
          // 429（本日生成済み）またはエラー → 既存Mapをそのまま表示
        } catch {}
        root.innerHTML = '';
      }
    }

    if (!hasMirrorData && (naviStepsData?.source === 'mirror_only' || naviStepsData?.source === 'diagnosis_mirror')) hasMirrorData = true;
    if (!hasMirrorData && currentUid) {
      try {
        const mRes = await fetchWithTimeout(`/api/mirror/sessions?user_id=${currentUid}&limit=1&include_axes=1`);
        if (mRes?.ok) {
          const d = await mRes.json();
          if (d.sessions?.length) {
            hasMirrorData      = true;
            mirrorAnalysisAxes = d.sessions[0]?.axes || null;
            mirrorSessionDate  = d.sessions[0]?.created_at || null;
          }
        }
      } catch {}
    }

    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // ── 定数 ──
    const AREA_DEFS = {
      body:    { icon:'💪', label:'体型',  catLink:'gym',       tier:1, articleQ:'垢抜け' },
      eyebrow: { icon:'✂️', label:'眉',    catLink:'eyebrow',  tier:1, articleQ:'清潔感' },
      fashion: { icon:'👔', label:'服',    catLink:'fashion',   tier:1, articleQ:'垢抜け' },
      hair:    { icon:'💇', label:'髪',    catLink:'hair',      tier:1, articleQ:'清潔感' },
      skin:        { icon:'✨', label:'肌',   catLink:'esthetic',    tier:2, articleQ:'清潔感' },
      hairremoval: { icon:'🪒', label:'脱毛', catLink:'hairremoval', tier:2, articleQ:'清潔感' },
      teeth:       { icon:'🦷', label:'歯',   catLink:'whitening',   tier:3, articleQ:'清潔感' },
      nail:        { icon:'💅', label:'爪',   catLink:'nail',        tier:4, articleQ:'垢抜け' },
    };

    // ── 軸ごとの変容中継地点定義 ──
    const AXIS_WAYPOINTS = {
      hair:        { cp1: { label:'清潔感が届く',   desc:'「なんか髪型整ってる？」と気づかれる' },  cp2: { label:'印象が変わる',  desc:'「どこで切ってるの？」と聞かれる' },          goal: '髪が自分の武器になる' },
      skin:        { cp1: { label:'清潔感が届く',   desc:'「肌きれいになった？」と気づかれる' },    cp2: { label:'印象が変わる',  desc:'「清潔感ある人」という印象が定着する' },      goal: '肌が自信の土台になる' },
      fashion:     { cp1: { label:'変化が見える',   desc:'「なんか雰囲気変わった？」と言われる' },  cp2: { label:'印象が変わる',  desc:'「おしゃれだね」と言われる' },                goal: '服で自分を表現できる' },
      body:        { cp1: { label:'自分で感じる',   desc:'体の変化を自分でも実感できる' },          cp2: { label:'他者が気づく',  desc:'「引き締まったね」と言われる' },              goal: '体が自信の源になる' },
      eyebrow:     { cp1: { label:'顔がすっきり',   desc:'「顔がすっきりした？」と言われる' },      cp2: { label:'印象が整う',    desc:'眉が顔全体の印象を整えている' },              goal: '顔に統一感が出る' },
      teeth:       { cp1: { label:'笑顔に自信',     desc:'笑顔に自信が持てるようになる' },          cp2: { label:'笑顔が変わる',  desc:'「笑顔いいね」と言われる' },                  goal: '笑顔が最大の武器になる' },
      hairremoval: { cp1: { label:'清潔感の底上げ', desc:'ムダ毛が気にならなくなる' },              cp2: { label:'肌質が変わる',  desc:'「肌きれいだね」と言われる' },                goal: '清潔感が全身に行き渡る' },
      nail:        { cp1: { label:'手元を意識する', desc:'手元が整った状態が当たり前になる' },      cp2: { label:'細部が変わる',  desc:'「手元きれいだね」と言われる' },               goal: '細部まで整った自分になる' },
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
      hair: ['清潔感', '垢抜け'], skin: ['清潔感'], hairremoval: ['清潔感'], teeth: ['清潔感'], nail: ['垢抜け'],
    };

    // ステップテキストと記事タイトルのキーワード一致スコア
    function keywordScore(stepText, art) {
      if (!stepText) return 0;
      // 2文字以上の単語を抽出（助詞・記号除去）
      const words = stepText.replace(/[（）「」・。、\s\d]/g, ' ').split(' ')
        .map(w => w.trim()).filter(w => w.length >= 2);
      const target = art.title + ' ' + (Array.isArray(art.tags) ? art.tags.join(' ') : '');
      let s = 0;
      for (const w of words) { if (target.includes(w)) s += 2; }
      return s;
    }

    function pickSectionArticle(sectionAxes, compassAxis, usedSlugs, stepText) {
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
        // キーワード一致ボーナス（カテゴリ一致より優先度高め）
        score += keywordScore(stepText, art) * 2;
        if (score > bestScore) { bestScore = score; best = art; }
      }
      return bestScore > 0 ? best : null;
    }

    // ── ミルストーン（統合リスト形式・全careType共通） ──
    // isCurrentFor: そのcareTypeの「現在地」マーカー
    // guide: 'none'|'LOW'|'MID'|'HIGH' — ガイド推奨度
    // note: 注意書き（任意）
    const MILESTONES_RAW = {
      body: [
        { text: '自分の体型で気になる部分を1つ言語化できている（例：「腹まわりが気になる」）', guide: 'none', isCurrentFor: 'none', isSelfCheck: true, bodyDataKey: 'body_concern', bodyDataOptions: ['腹まわり', '胸（上半身）', '背中', '脚（太もも・ふくらはぎ）', '全体的に気になる'] },
        { text: '自分の体型目標を1つ言葉にしてみる（筋肉をつける・引き締めるなど）', guide: 'none', hint: '目標の方向性で取り組むべきことが変わる。まず「どっちを目指すか」を決める', isSelfCheck: true, bodyDataKey: 'body_goal', bodyDataOptions: ['筋肉をつけたい', '体重を落としたい', '引き締めたい', '猫背を改善したい', 'O脚・X脚を改善したい'] },
        { text: '現在の体重・体脂肪率を計測して数字で把握している', guide: 'none',
          products: [{ name: '体組成計（TANITA）', url: 'https://www.amazon.co.jp/s?k=タニタ+体組成計&tag=whero523-22', level: 'intermediate', priceRange: 'mid' }] },
        { text: '今週1週間、体を動かした回数を数えてみる', guide: 'none', hint: 'ゼロでも正直に。現状を知ることが出発点' },
        { text: '日常的に歩く・階段を使うなど、生活のなかに動きを取り入れている', guide: 'none' },
        { text: '週1回以上、意識的な運動習慣がある', guide: 'none',
          products: [{ name: 'プロテイン（SAVAS ホエイ）', url: 'https://www.amazon.co.jp/s?k=ザバスホエイプロテイン&tag=whero523-22', level: 'intermediate', priceRange: 'low' }, { name: 'トレーニングウェア', url: 'https://www.amazon.co.jp/s?k=トレーニングウェア&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
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
        { text: '顔タイプ診断を受けたことがある', guide: 'HIGH', isSelfCheck: true, bodyDataKey: 'face_type', bodyDataOptions: trackId === 'belle' ? FACE_TYPE_OPTIONS_BELLE : FACE_TYPE_OPTIONS },
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
          products: [{ name: 'BOTANIST ボタニカルシャンプー', url: 'https://www.amazon.co.jp/s?k=BOTANIST+シャンプー&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'スカルプシャンプー（薄毛が気になる方）', url: 'https://www.amazon.co.jp/s?k=スカルプシャンプー&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: 'ドライヤーで根元から乾かしている（自然乾燥していない）', guide: 'none',
          products: [{ name: 'ドライヤー（速乾・髪に優しい）', url: 'https://www.amazon.co.jp/s?k=ドライヤー+速乾&tag=whero523-22', level: 'beginner', priceRange: 'mid' }] },
        { text: 'スタイリング剤を使っている', guide: 'none',
          products: [{ name: 'ウーノ スーパーハード（定番）', url: 'https://www.amazon.co.jp/s?k=ウーノ+スーパーハード&tag=whero523-22', level: 'beginner', priceRange: 'low', track: 'fineme' }, { name: 'バーム系スタイリング剤（ナチュラル仕上げ）', url: 'https://www.amazon.co.jp/s?k=ヘアバーム&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: 'トリートメントまたはアウトバスケアをしている', guide: 'LOW', isCurrentFor: 'concerned',
          products: [{ name: 'アウトバストリートメント（洗い流さないタイプ）', url: 'https://www.amazon.co.jp/s?k=洗い流さないトリートメント&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
        { text: '美容師に「顔型・骨格に合う髪型」を相談したことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: '定期的に通う美容師を1人決めている', guide: 'MID' },
        { text: '自宅でのセット方法を美容師に教わったことがある', guide: 'HIGH' },
        { text: '毎朝のセットを5分以内に迷いなく再現できている', guide: 'LOW', isCurrentFor: 'pro' },
        { text: '季節や場面に合わせてスタイルを変えた経験がある', guide: 'MID' },
        { text: 'AGA・薄毛が気になる場合、専門クリニックに相談したことがある', guide: 'HIGH', track: 'fineme' },
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
          products: [{ name: 'OPI プロスパ ネイルオイル', url: 'https://www.amazon.co.jp/s?k=OPI+ネイルオイル&tag=whero523-22', level: 'intermediate', priceRange: 'low' }, { name: 'ネイルオイル（プチプラ）', url: 'https://www.amazon.co.jp/s?k=ネイルオイル&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
        { text: '爪のケアを自分なりのルーティンにしている（切る・やすり・オイル）', guide: 'none', isCurrentFor: 'self' },
        { text: 'ネイルケアサロンでプロのケアを受けたことがある', guide: 'HIGH' },
        { text: '定期的にサロンでメンテナンスしている', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '爪ケアのサイクル（切る・やすり・保湿）が2週間以上途切れず続いている', guide: 'none' },
      ],
      hairremoval: [
        { text: '気になる部位を1つ確認してみる（ヒゲ・腕・胸・脚・VIOなど）', guide: 'none', isCurrentFor: 'none', isSelfCheck: true, bodyDataKey: 'depilation_target', bodyDataMulti: true, bodyDataOptions: ['ヒゲ', '腕・脚', '胸・背中', 'VIO', '全身', '今は気にしていない'] },
        { text: '現在の自己処理の頻度と手間を確認してみる', guide: 'none', hint: '「週何回カミソリを当てているか」を数えるだけでOK。ゼロでも正直に。' },
        { text: '脱毛サロンとクリニックの違いを調べてみる', guide: 'LOW', hint: 'サロン＝光脱毛（痛み少・通い多）、クリニック＝医療レーザー（永久・通い少）', isCurrentFor: 'concerned' },
        { text: '脱毛サロン・クリニックの無料カウンセリングに1回行ったことがある', guide: 'HIGH', isCurrentFor: 'self' },
        { text: '1〜3ヶ所の照射を完了している', guide: 'HIGH' },
        { text: '定期的に通い、気になる部位の脱毛が概ね完了した', guide: 'HIGH', isCurrentFor: 'pro' },
        { text: '脱毛後のアフターケア（保湿）が習慣になっている', guide: 'LOW',
          products: [{ name: 'ヴァセリン ボディローション（脱毛後保湿）', url: 'https://www.amazon.co.jp/s?k=ヴァセリン+ボディローション&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
      ],
    };

    // ── サブトラック（肌・歯の内訳別・統合リスト形式） ──
    const MILESTONES_SUB_RAW = {
      skin_care: {
        steps: [
          { text: '洗顔・化粧水・乳液の3ステップが毎日できている', guide: 'none', isCurrentFor: 'none',
            products: [{ name: '肌ラボ 極潤 洗顔フォーム', url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+洗顔&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: '肌ラボ 極潤 ヒアルロン液（化粧水）', url: 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+化粧水&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'ニベア フェイス 乳液', url: 'https://www.amazon.co.jp/s?k=ニベア+フェイス+乳液&tag=whero523-22', level: 'beginner', priceRange: 'low' }] },
          { text: 'クレンジング（夜）と日焼け止め（朝）が習慣になっている', guide: 'none',
            products: [{ name: 'ビオレUV アクアリッチ（日焼け止め）', url: 'https://www.amazon.co.jp/s?k=ビオレUV+アクアリッチ&tag=whero523-22', level: 'beginner', priceRange: 'low' }, { name: 'メンズビオレ クレンジング', url: 'https://www.amazon.co.jp/s?k=メンズビオレ+クレンジング&tag=whero523-22', level: 'beginner', priceRange: 'low', track: 'fineme' }] },
          { text: '自分の肌タイプを確認してみる（乾燥・脂性・混合）', guide: 'LOW', isCurrentFor: 'concerned', hint: '朝、何もつけずに1〜2時間過ごす。Tゾーンが脂っぽければ混合、全体的に突っ張れば乾燥肌', isSelfCheck: true, bodyDataKey: 'skin_type', bodyDataOptions: ['乾燥肌', '脂性肌（オイリー）', '混合肌', '普通肌', '敏感肌', '肌タイプがわからない'] },
          { text: '自分の肌悩みを1つ言葉にしてみる（ニキビ・毛穴・くすみ・赤みなど）', guide: 'LOW', hint: '鏡を見て「一番気になるのは？」と問いかけるだけ。答えがそのまま肌悩みになる', isSelfCheck: true, bodyDataKey: 'skin_concerns', bodyDataMulti: true, bodyDataOptions: ['毛穴', 'ニキビ・吹き出物', 'くすみ', '赤み', '乾燥・カサつき', 'テカリ', 'シミ・そばかす', 'ハリ・弾力不足', '色ムラ'] },
          { text: '角質ケアを取り入れている', guide: 'MID', isCurrentFor: 'self',
            products: [{ name: 'ピーリングジェル（週1回）', url: 'https://www.amazon.co.jp/s?k=ピーリングジェル&tag=whero523-22', level: 'intermediate', priceRange: 'low' }] },
          { text: '皮膚科またはエステで今の肌状態を1回診てもらったことがある', guide: 'HIGH', isCurrentFor: 'pro' },
          { text: '診断をもとにスキンケアを1アイテム以上アップデートした', guide: 'HIGH',
            products: [{ name: 'WELEDA スキンフード（天然成分・有機認証）', url: 'https://www.amazon.co.jp/s?k=WELEDA+スキンフード&tag=whero523-22', level: 'advanced', priceRange: 'low' }] },
          { text: 'アップデートしたケアが3ヶ月以上途切れず続いている', guide: 'LOW' },
        ],
      },
      skin_hige: {
        track: 'fineme',
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

    // MILESTONES_RAW/MILESTONES_SUB_RAWは男性向け内容を前提に書かれた項目が
    // 一部あり（AGA相談・ひげケア・特定ブランドの商品リンクなど）、男女共通で
    // 出すと不自然なため、trackタグ付きの項目・商品・サブトラックを現在の
    // トラックでフィルタしてから使う（でお指摘 2026-08-26）。
    // タグなし＝男女共通としてそのまま両トラックに表示する。
    function filterStepsForTrack(steps) {
      return (steps || [])
        .filter(s => !s.track || s.track === trackId)
        .map(s => s.products
          ? { ...s, products: s.products.filter(p => !p.track || p.track === trackId) }
          : s
        );
    }
    const MILESTONES = Object.fromEntries(
      Object.entries(MILESTONES_RAW).map(([k, steps]) => [k, filterStepsForTrack(steps)])
    );
    const MILESTONES_SUB = Object.fromEntries(
      Object.entries(MILESTONES_SUB_RAW)
        .filter(([, sub]) => !sub.track || sub.track === trackId)
        .map(([k, sub]) => [k, { ...sub, steps: filterStepsForTrack(sub.steps) }])
    );

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
          const staticCurrentIdx = steps.findIndex(s => s.isCurrentFor === normalizeCareType(careType));
          // ① step_done基準の現在地: 最後に完了したステップの次を「今ここ」にする
          let lastDoneIdx = -1;
          steps.forEach((_, idx) => {
            const dk = (splitAt > 0 && idx < splitAt) ? `prereq-${axisKey}-${idx}` : `${axisKey}-${idx}`;
            if (stepDone[dk]) lastDoneIdx = idx;
          });
          const currentIdx = lastDoneIdx >= 0
            ? (lastDoneIdx + 1 < steps.length ? lastDoneIdx + 1 : -1)
            : staticCurrentIdx;
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

    // ── マップ順で次のN件の未完了ステップを返す ──
    function getNextUndoneSteps(n) {
      const SECTION_ORDER = { quick: 0, habit: 1, ongoing: 2 };
      return flattenAllSteps()
        .filter(s => !s.isDone)
        .sort((a, b) => {
          const sa = SECTION_ORDER[a.actionType] ?? 2, sb = SECTION_ORDER[b.actionType] ?? 2;
          if (sa !== sb) return sa - sb;
          const ar = priorityOrder.indexOf(a.axisId), br = priorityOrder.indexOf(b.axisId);
          const arn = ar === -1 ? 99 : ar, brn = br === -1 ? 99 : br;
          if (arn !== brn) return arn - brn;
          return a.idx - b.idx;
        })
        .slice(0, n);
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
        try { const _raw = localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle'); if (_raw) _budget = JSON.parse(_raw).budget || null; } catch {}
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

    // ── あなたについて分かってきたこと（過去の月次スナップショットのstep_outcomes集計） ──
    function buildConfirmedInsightsHtml() {
      const axisIds = Object.keys(confirmedByAxis).sort((a, b) => confirmedByAxis[b] - confirmedByAxis[a]);
      if (!axisIds.length) return '';
      const chips = axisIds.map(id => {
        const def = AREA_DEFS[id] || {};
        return `<span class="confirmed-insight-chip">${esc(def.icon || '')} ${esc(def.label || id)} — ${confirmedByAxis[id]}件の変化を確認</span>`;
      }).join('');
      return `<div class="confirmed-insights-widget">
        <p class="confirmed-insights-label">🪞 あなたについて分かってきたこと</p>
        <div class="confirmed-insights-chips">${chips}</div>
      </div>`;
    }

    // ── AI生成「一本の道」ビュー（ゲームマップ形式） ──
    function buildOnePathHtml() {
      if (!naviStepsData?.steps?.length) return null;
      const compassAxis = calcDynamicCompass();
      const allNaviSteps = naviStepsData.steps;
      // MeScanの行動習慣回答をMapの初期状態に機械的に反映する（でお指摘 2026-08-06：
      // AIの推測ではなく回答そのものを「実施済み／やってみる」として最初から反映したい）
      const habitStatusNodes = computeHabitStatusItems();
      // 基礎チェックリストを独立バナーではなく、道の先頭ノードとして合流させる（でお指摘：
      // 「あらかじめ用意されたコンテンツとAI生成コンテンツが1つの場所に統合され」ていない見た目を直す）
      const baselineNodes = computeBaselineItems().map(item => ({
        ...item,
        action_type: item.action_type || 'quick',
        guide: item.guide || 'none',
        _isBaseline: true,
      }));
      const combinedSteps = [...habitStatusNodes, ...baselineNodes, ...allNaviSteps];
      // 「実施済み」ノードはstepDoneに書き込まず、未登録時のみ_autoDoneでdone扱いにする
      // （手動で外すとpersistStepDone側がhabit-prefixにfalseを明示保存し、以後はそちらが優先される）
      const isStepDone = (s) => (s.id in stepDone) ? !!stepDone[s.id] : !!s._autoDone;
      const steps = activeAxisFilter
        ? combinedSteps.filter(s => s.axis === activeAxisFilter)
        : combinedSteps;
      // チャンク設計（ゴール勾配効果：ゴールは近くに刻む。2026-08-10 概念整理を実装）。
      // 全ステップを4分割し、「今ここ」が属するチャンクだけを個別展開する。
      // 次のチャンクは件数だけの要約カードで示し、その先は存在の痕跡も出さない。
      // 基礎・行動習慣ノードはチャンク区切りに関わらず常にアクティブ扱い（従来の「霧に隠さない」を踏襲）
      const CHUNK_COUNT = 4;
      const _chunkSize = Math.max(1, Math.ceil(combinedSteps.length / CHUNK_COUNT));
      const _chunkIndexById = new Map();
      combinedSteps.forEach((s, idx) => _chunkIndexById.set(s.id, Math.floor(idx / _chunkSize)));
      const isForcedActive = (s) => !!(s._isBaseline || s._isHabitStatus);
      const stepChunkIndex = (s) => _chunkIndexById.get(s.id) ?? 0;
      const _globalFirstUndone = combinedSteps.find(s => !isStepDone(s));
      const activeChunkIndex = _globalFirstUndone
        ? stepChunkIndex(_globalFirstUndone)
        : Math.floor((combinedSteps.length - 1) / _chunkSize);

      // 進捗の主役は「今の一手」（アクティブチャンク内）。全体の総数は前面に出さない
      const activeChunkAllSteps = combinedSteps.filter(s => isForcedActive(s) || stepChunkIndex(s) === activeChunkIndex);
      const totalDone = activeChunkAllSteps.filter(isStepDone).length;
      const pct = activeChunkAllSteps.length > 0 ? Math.round(totalDone / activeChunkAllSteps.length * 100) : 0;
      const genDate = naviStepsData.generated_at
        ? new Date(naviStepsData.generated_at).toLocaleDateString('ja-JP', { month:'numeric', day:'numeric' })
        : '';

      // 「今ここ」= 全体で最初の未完了ステップ（旅の先頭に立つ）
      const currentStepId   = steps.find(s => !isStepDone(s))?.id ?? null;
      // Compass軸の最初の未完了ステップ（gnr-center強調表示、「今ここ」と同じ場合もある）
      const compassNextId   = steps.find(s => s.axis === compassAxis && !isStepDone(s))?.id ?? null;
      // Mirrorで変化が裏付けられたステップ（完了判定・霧の境界には影響させず、実績バッジの表示にのみ使う）
      const mirrorConfirmedIds = new Set(
        (naviStepsData.step_outcomes || []).filter(o => o.mirror_change === true).map(o => o.step_id)
      );

      const POS_CYCLE = ['gnr-left', 'gnr-right'];
      // このチャンク境界を超える未完了ステップは描画しない（完全非表示）。
      // 次チャンクぶんだけ件数を集計し、後で要約カード1枚として表示する（個別ノードは出さない）
      const visibleSteps   = steps.filter(s => isStepDone(s) || isForcedActive(s) || stepChunkIndex(s) <= activeChunkIndex);
      const nextChunkItems = steps.filter(s => !isStepDone(s) && !isForcedActive(s) && stepChunkIndex(s) === activeChunkIndex + 1);
      const _doneCount     = steps.filter(s => isStepDone(s)).length;
      let completedHtml = '';
      let activeHtml    = '';

      let posIdx = 0;
      let _stepIdx = 0;
      for (const step of visibleSteps) {
        const i = _stepIdx;
        const def = AREA_DEFS[step.axis] || {};
        const isDone        = isStepDone(step);
        const isCurrentStep = step.id === currentStepId;   // 「今ここ」バッジ
        const isCompassNext = step.id === compassNextId;    // gnr-center + 🧭強調

        const posClass = isCompassNext ? 'gnr-center' : POS_CYCLE[posIdx % 2];
        if (!isCompassNext) posIdx++;

        const circleClass = isDone ? 'gm-c-done'
          : isCompassNext ? 'gm-c-compass'
          : (step.guide === 'HIGH' || step.guide === 'MID') ? 'gm-c-active'
          : 'gm-c-future';
        const nodeClasses = ['path-node', isDone ? 'pn-done' : '', isCompassNext ? 'pn-compass' : ''].filter(Boolean).join(' ');

        let nowBadge = '';
        if (isCurrentStep && isCompassNext) nowBadge = `<span class="gmap-now-badge">🧭 今ここ</span><br>`;
        else if (isCurrentStep)             nowBadge = `<span class="gmap-now-badge">📍 今ここ</span><br>`;
        else if (isCompassNext)             nowBadge = `<span class="gmap-now-badge">🧭 重点</span><br>`;

        const actionLabel = { quick:'⚡', habit:'🔄', ongoing:'🌊' }[step.action_type] || '';
        const baselineChip = step._isBaseline ? ' <span class="gmap-baseline-chip">基礎</span>' : '';
        const habitStatusChip = step._isHabitStatus ? ' <span class="gmap-habit-chip">あなたの回答</span>' : '';

        let guideBadgeHtml = '';
        if (step.guide === 'HIGH') {
          const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
          guideBadgeHtml = `<div class="guide-badge guide-high"><span>🏥 ここはプロに任せると確実に変わる</span>${btn}</div>`;
        } else if (step.guide === 'MID') {
          const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
          guideBadgeHtml = `<div class="guide-badge guide-mid"><span>📋 プロと進めると精度が上がる</span>${btn}</div>`;
        }
        const hintHtml = step.hint ? `<p class="step-hint">${esc(step.hint)}</p>` : '';
        const mirrorConfirmedHtml = isDone && mirrorConfirmedIds.has(step.id)
          ? `<span class="mirror-confirmed-badge">✓ 変化を確認できました</span>` : '';

        // ongoingステップにサービスログバッジを表示
        let logBadgeHtml = '';
        if (step.action_type === 'ongoing') {
          const linkedLog = serviceLogByAxis[step.axis];
          if (linkedLog) {
            const diff = linkedLog.next_visit ? Math.round((new Date(linkedLog.next_visit) - new Date()) / 86400000) : null;
            let nextLabel = diff === null ? '次回未設定' : diff < 0 ? `${-diff}日前（要予約）` : diff === 0 ? '今日！' : `${diff}日後`;
            const cls = diff === null ? '' : diff < 0 ? 'slb-overdue' : diff <= 7 ? 'slb-soon' : 'slb-linked';
            logBadgeHtml = `<a href="/mypage/log" class="step-log-badge ${cls}">📖 ${esc(linkedLog.name)} — 次回 ${esc(nextLabel)}</a>`;
          } else {
            logBadgeHtml = `<a href="/mypage/log" class="step-log-badge">＋ 通っているサービスをLogに登録する</a>`;
          }
        }

        // このstepの内容に合う投稿があれば軽量カードで表示。permission_confirmedの値で
        // プレーンリンク／サムネ付きを出し分ける（管理画面で許諾フラグを立てるだけで
        // Map再生成なしに次回描画から自動でサムネ付きへ切り替わる）
        let curatedPostHtml = '';
        const relatedPost = step.related_post_id ? curatedPostsById[step.related_post_id] : null;
        if (relatedPost) {
          const platformIcon = relatedPost.platform === 'tiktok' ? '🎵' : '📷';
          const platformLabel = relatedPost.platform === 'tiktok' ? 'TikTok' : 'Instagram';
          const thumbHtml = relatedPost.permission_confirmed && relatedPost.thumbnail_url
            ? `<img src="${esc(relatedPost.thumbnail_url)}" alt="" class="curated-post-thumb" />` : '';
          curatedPostHtml = `<a href="${esc(relatedPost.post_url)}" target="_blank" rel="noopener noreferrer" class="curated-post-card">
            ${thumbHtml}
            <div class="curated-post-body">
              <p class="curated-post-label">${platformIcon} ${platformLabel}で見る</p>
              <p class="curated-post-caption">${esc(relatedPost.caption)}</p>
            </div>
          </a>`;
        }

        // prevPos: posIdxはnon-compassNextのみインクリメント済みのため2引く
        const prevIsCompassNext = visibleSteps[i-1]?.id === compassNextId;
        const prevPos = i === 0 ? null
          : prevIsCompassNext ? 'gnr-center'
          : POS_CYCLE[(posIdx - (isCompassNext ? 1 : 2) + 100) % 2];
        const connHtml = i > 0 ? connectorSvg(prevPos || 'gnr-left', posClass, isDone) : '';

        const nodeHtml = `${connHtml}<div class="${nodeClasses}" data-done-key="${esc(step.id)}">
          <div class="gmap-node-row ${posClass}">
            <div class="gmap-node" data-toggle-node="${esc(step.id)}">
              <div class="gm-circle ${circleClass}">${esc(def.icon || '•')}</div>
              <div class="gmap-node-label">
                ${nowBadge}
                <span class="gmap-node-axis-name">${esc(def.label || step.axis)} ${actionLabel}${baselineChip}${habitStatusChip}</span>
              </div>
            </div>
          </div>
          <div class="path-node-detail${isCurrentStep ? ' pnd-open' : ''}">
            <div class="gmap-detail-card">
              <p class="gmap-detail-title">${esc(step.text)}</p>
              ${mirrorConfirmedHtml}${hintHtml}${guideBadgeHtml}${logBadgeHtml}${curatedPostHtml}
              <button class="step-check-btn gmap-check-btn${isDone?' checked':''}" data-done-key="${esc(step.id)}">${isDone ? '✓ 完了済み' : '✓ やった！'}</button>
            </div>
          </div>
        </div>`;
        if (isDone) completedHtml += nodeHtml;
        else        activeHtml    += nodeHtml;
        _stepIdx++;
      }
      // セクション組み立て（完了折りたたみ → アクティブ → 次チャンクの要約カード）
      const completedSection = _doneCount > 0
        ? `<button class="navi-done-toggle" onclick="const l=this.nextElementSibling;l.classList.toggle('open');this.textContent=(l.classList.contains('open')?'▴':'▾')+' 完了した行程 ${_doneCount}件';">▾ 完了した行程 ${_doneCount}件</button><div class="navi-done-list">${completedHtml}</div>`
        : '';
      // 次のチャンクは個別ノードを出さず、件数だけの要約カード1枚にする。
      // その先のチャンクは存在の痕跡も出さない（でお決定 2026-08-10：ゴールを近くに刻む）
      const nextChunkSection = nextChunkItems.length > 0
        ? `<div class="navi-next-chunk-card">
            <p class="navi-next-chunk-eyebrow">この先</p>
            <p class="navi-next-chunk-text">まだ ${nextChunkItems.length} つの一手が続きます。</p>
            <p class="navi-next-chunk-sub">${hasMirrorData
              ? '今の一手をやり切ったら、次のMirrorで変化を確認してみよう。'
              : 'Mirrorで写真を分析すると、先の道の精度が上がります。'}</p>
            ${!hasMirrorData ? `<a href="/mypage/mirror" class="navi-next-chunk-link">Mirrorで写真を分析する →</a>` : ''}
          </div>`
        : '';
      const nodesHtml = completedSection + activeHtml + nextChunkSection;

      const regenBtn = token ? `
        <button id="navi-regen-btn" style="display:block;width:100%;padding:10px;background:rgba(10,15,30,0.5);border:1px solid rgba(232,228,220,0.12);border-radius:8px;color:rgba(232,228,220,0.4);font-size:11px;font-weight:700;cursor:pointer;font-family:'Noto Sans JP',sans-serif;margin-top:24px;letter-spacing:.05em">
          ↻ 旅を再生成する
        </button>` : '';

      const AXIS_JA_MAP = { eyebrow:'眉', skin:'肌', hair:'髪', body:'体型', fashion:'服', hairremoval:'脱毛', teeth:'歯', nail:'爪', posture:'姿勢', color:'カラー', expression:'表情' };
      const PLACEMENT_MAP = { '高':'序盤に優先配置', '中':'中盤に配置', '低':'維持ステップのみ' };
      const LEVEL_COLOR   = { '高':'#c9a84c', '中':'#60a5fa', '低':'#34d399' };
      const mirrorBasisHtml = mirrorAnalysisAxes?.length
        ? (() => {
            const dateLabel = mirrorSessionDate
              ? new Date(mirrorSessionDate).toLocaleDateString('ja-JP', { year:'numeric', month:'long' })
              : '';
            const axisRows = mirrorAnalysisAxes
              .filter(ax => ax.id !== 'overall')
              .slice(0, 5)
              .map(ax => {
                const name  = AXIS_JA_MAP[ax.id] || ax.name || ax.id;
                const level = ax.potential_level || '中';
                const color = LEVEL_COLOR[level]   || '#9ca3af';
                const place = PLACEMENT_MAP[level] || '';
                return `<div class="mb-axis-row">
                  <span class="mb-axis-name">${esc(name)}</span>
                  <span class="mb-axis-level" style="color:${color}">変容余地 ${esc(level)}</span>
                  <span class="mb-axis-placement">→ ${esc(place)}</span>
                </div>`;
              }).join('');
            return `<div class="mirror-basis-card">
              <div class="mb-header">
                <span class="mb-icon">📸</span>
                <div>
                  <p class="mb-title">${dateLabel ? `${esc(dateLabel)}のMirror分析がこのMapに反映されています` : 'Mirror分析がこのMapに反映されています'}</p>
                  <p class="mb-sub">以下の変容余地データをもとに優先順位を決定しました</p>
                </div>
              </div>
              <div class="mb-axes">${axisRows}</div>
            </div>`;
          })()
        : '';

      const _doneSteps = steps.filter(s => isStepDone(s));
      const voyageLogHtml = _doneSteps.length > 0
        ? (() => {
            const doneCount = _doneSteps.length;
            const daysSince = naviStepsData.generated_at
              ? Math.max(0, Math.floor((Date.now() - new Date(naviStepsData.generated_at).getTime()) / 86400000))
              : 0;
            const recentItems = _doneSteps.slice(-3).reverse().map(s => {
              const def = AREA_DEFS[s.axis] || {};
              const label = def.label || s.axis;
              const txt = s.text.length > 28 ? s.text.slice(0, 28) + '…' : s.text;
              return `<div class="voyage-recent-item">
                <span class="voyage-recent-check">✓</span>
                <span>${esc(label)}：${esc(txt)}</span>
              </div>`;
            }).join('');
            const mirrorBadge = mirrorAnalysisAxes?.length
              ? `<span class="voyage-log-mirror">📸 Mirror分析済み</span>`
              : '';
            return `<div class="voyage-log">
              <div class="voyage-log-header">
                <p class="voyage-log-title">あなたの航海記録</p>
                ${mirrorBadge}
              </div>
              <div class="voyage-stats">
                <div class="voyage-stat">
                  <span class="voyage-stat-num">${doneCount}</span>
                  <span class="voyage-stat-label">達成ステップ</span>
                </div>
                <div class="voyage-stat">
                  <span class="voyage-stat-num">${daysSince}</span>
                  <span class="voyage-stat-label">日間の航海</span>
                </div>
              </div>
              <p class="voyage-recent-title">直近の達成</p>
              ${recentItems}
            </div>`;
          })()
        : '';

      const mirrorPromoBanner = (!hasMirrorData && naviStepsData.source === 'diagnosis_only')
        ? `<div class="mirror-promo-strip"><span>📸</span><span>Mirrorで写真を分析すると、この地図の精度が上がります</span><a href="/mypage/mirror">試す（まずは無料）→</a></div>`
        : '';

      const mirrorOnlyBanner = naviStepsData.source === 'mirror_only' ? `
        <div style="margin-bottom:16px;padding:12px 16px;background:rgba(100,160,255,0.07);border:1px solid rgba(100,160,255,0.25);border-radius:12px;display:flex;align-items:center;gap:12px">
          <span style="font-size:22px;flex-shrink:0">📸</span>
          <div style="flex:1">
            <p style="font-size:11px;font-weight:800;color:rgba(100,160,255,0.8);margin:0 0 3px;letter-spacing:.06em">MIRROR データから生成</p>
            <p style="font-size:12px;color:rgba(232,228,220,0.55);margin:0;line-height:1.6">Me Scan（無料診断）を受けるとさらに精度の高いマップに更新されます</p>
          </div>
          <a href="${TRACK.diagnosis}" style="font-size:11px;font-weight:700;padding:7px 14px;border:1px solid rgba(100,160,255,0.4);border-radius:8px;color:rgba(100,160,255,0.9);text-decoration:none;flex-shrink:0;white-space:nowrap">Me Scanを受ける →</a>
        </div>` : '';

      return `
        ${mirrorOnlyBanner}
        ${mirrorPromoBanner}
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:10px;font-weight:800;letter-spacing:.1em;color:rgba(201,168,76,0.55);text-transform:uppercase">あなただけの変容の道</span>
            ${genDate ? `<span style="font-size:9px;color:rgba(232,228,220,0.25)">${genDate}生成</span>` : ''}
          </div>
          <div style="background:rgba(10,15,30,0.4);border:1px solid rgba(201,168,76,0.12);border-radius:10px;padding:12px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:11px;color:rgba(232,228,220,0.50)">今の一手：${totalDone} / ${activeChunkAllSteps.length}</span>
              <span style="font-size:12px;font-weight:800;color:rgba(201,168,76,0.8)">${pct}%</span>
            </div>
            <div style="height:3px;background:rgba(232,228,220,0.08);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#c9a84c,#f5d78e);border-radius:2px;transition:width .4s"></div>
            </div>
          </div>
        </div>
        ${mirrorBasisHtml}
        ${voyageLogHtml}
        <div class="route-container">${nodesHtml}</div>
        ${regenBtn}`;
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
            const _go = { none:0, LOW:1, HIGH:2, MID:3 };
            const ag = _go[a.step.guide] ?? 0, bg = _go[b.step.guide] ?? 0;
            if (ag !== bg) return ag - bg;
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
          // HIGH ステップとその直前ステップのテキストをキーワード源に使う
          const highStepText = sectionSteps[firstHighIdx]?.step?.text || '';
          const prevStepText = firstHighIdx > 0 ? (sectionSteps[firstHighIdx - 1]?.step?.text || '') : '';
          const contextText = highStepText + ' ' + prevStepText;
          const art = pickSectionArticle([targetAxis], compassAxis, usedArticleSlugs, contextText);
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
            <a href="${esc(TRACK.articlePath(art.slug))}" class="trail-article-node" target="_blank">
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

    // ── ゲームマップ：ノード間コネクターSVG（3タブビュー用・旧方式） ──
    function connectorSvg(fromClass, toClass, done) {
      const POS = { 'gnr-left': 19, 'gnr-center': 50, 'gnr-right': 81 };
      const x1 = POS[fromClass] ?? 50, x2 = POS[toClass] ?? 50;
      const color = done ? '#c9a84c' : 'rgba(201,168,76,0.30)';
      const w = done ? '3' : '2';
      const dash = done ? '' : 'stroke-dasharray="7 5"';
      return `<svg viewBox="0 0 100 52" preserveAspectRatio="none" style="width:100%;height:52px;display:block;overflow:visible;margin:-2px 0"><path d="M${x1} 0 C${x1} 30 ${x2} 57 ${x2} 87" stroke="${color}" stroke-width="${w}" fill="none" ${dash} stroke-linecap="round"/></svg>`;
    }

    // ── ゲームマップ（一本の道）：DOMベースでcircle中心間を曲線コネクターで結ぶ ──
    function drawGmapConnectors() {
      const container = document.querySelector('.route-container');
      if (!container) return;

      let overlay = document.getElementById('gmap-connector-overlay');
      if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.id = 'gmap-connector-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;overflow:visible;z-index:0';
        container.prepend(overlay);
      }

      const circles = Array.from(container.querySelectorAll('[data-circle-idx]'))
        .sort((a, b) => +a.dataset.circleIdx - +b.dataset.circleIdx);

      if (circles.length < 2) { overlay.innerHTML = ''; return; }

      const containerRect = container.getBoundingClientRect();
      const containerH = containerRect.height;
      overlay.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerH}`);
      overlay.setAttribute('preserveAspectRatio', 'none');
      overlay.style.height = containerH + 'px';

      let pathsHtml = '';
      for (let i = 0; i < circles.length - 1; i++) {
        const r1 = circles[i].getBoundingClientRect();
        const r2 = circles[i + 1].getBoundingClientRect();
        const x1 = r1.left + r1.width / 2 - containerRect.left;
        const y1 = r1.top + r1.height / 2 - containerRect.top;
        const x2 = r2.left + r2.width / 2 - containerRect.left;
        const y2 = r2.top + r2.height / 2 - containerRect.top;
        const isDone = circles[i].dataset.done === 'true';
        const color = isDone ? '#c9a84c' : 'rgba(201,168,76,0.30)';
        const w = isDone ? '3' : '2';
        const dash = isDone ? '' : 'stroke-dasharray="7 5"';
        // S字曲線: 中間y点で水平方向に曲げてDuolingo風の滑らかな道に
        const my = (y1 + y2) / 2;
        pathsHtml += `<path d="M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}" stroke="${color}" stroke-width="${w}" fill="none" ${dash} stroke-linecap="round"/>`;
      }
      overlay.innerHTML = pathsHtml;
    }

    // ── ゲームマップ：ノード生成 ──
    function buildPathNode(s, compassFirstUndoneKey, posClass) {
      const { axisId, axisKey, def, step, idx, doneKey, isDone } = s;
      const isCompassStep = doneKey === compassFirstUndoneKey;
      const isGlobalCurrent = isCompassStep;
      const isHigh = step.guide === 'HIGH';
      const isMid  = step.guide === 'MID';
      const circleClass = isDone ? 'gm-c-done'
        : isCompassStep ? 'gm-c-compass'
        : (isHigh || isMid) ? 'gm-c-active'
        : 'gm-c-future';
      const nodeClasses = ['path-node', isDone ? 'pn-done' : '', isCompassStep && !isDone ? 'pn-compass' : ''].filter(Boolean).join(' ');
      const nowBadge = isGlobalCurrent ? `<span class="gmap-now-badge">🧭 今ここ</span><br>` : '';
      const selfCheckBadge = step.isSelfCheck ? `<span class="gmap-selfcheck-badge">📋 現状確認</span><br>` : '';
      const selfCheckValue = (step.isSelfCheck && bodyData[step.bodyDataKey])
        ? `<span class="selfcheck-value">✓ ${esc(Array.isArray(bodyData[step.bodyDataKey]) ? bodyData[step.bodyDataKey].join('・') : bodyData[step.bodyDataKey])}</span>` : '';
      let guideBadgeHtml = '';
      if (isHigh) {
        const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
        guideBadgeHtml = `<div class="guide-badge guide-high"><span>🏥 ここはプロに任せると確実に変わる</span>${btn}</div>`;
      } else if (isMid) {
        const btn = def.catLink ? `<a href="/search?category=${esc(def.catLink)}&diag=1" class="guide-find-btn">🔍 サービスを探す</a>` : '';
        guideBadgeHtml = `<div class="guide-badge guide-mid"><span>📋 プロと進めると精度が上がる</span>${btn}</div>`;
      }
      const hintHtml   = step.hint ? `<p class="step-hint">${esc(step.hint)}</p>` : '';
      const noteHtml   = step.note ? `<div class="milestone-note">💡 ${esc(step.note)}</div>` : '';
      const detailId   = `detail-${axisKey}-${idx}`;
      const detailHtml = step.detail ? `<button class="step-detail-toggle" onclick="(function(btn){const panel=document.getElementById('${detailId}');panel.classList.toggle('open');btn.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'▲ 閉じる':'📖 答えを見る';})(this)">📖 答えを見る</button><div class="step-detail-panel" id="${detailId}">${esc(step.detail)}</div>` : '';
      const svcCardId  = (isHigh || isMid) && def.catLink ? `svc-${axisKey}-${idx}` : null;
      const svcCardHtml = svcCardId ? `<div id="${esc(svcCardId)}" class="inline-service-card" data-svc-cat="${esc(def.catLink)}"></div>` : '';
      let productsHtml = '';
      if (step.products && step.products.length > 0) {
        const _totalDone = Object.values(stepDone).filter(Boolean).length;
        const _userLevel = _totalDone >= 9 ? 'advanced' : _totalDone >= 3 ? 'intermediate' : 'beginner';
        const _lvRank = { beginner: 0, intermediate: 1, advanced: 2 };
        const _budgetRank = { low: 0, mid: 1, high: 2 };
        const _maxRank = _lvRank[_userLevel];
        let _budget = null;
        try { const _raw = localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle'); if (_raw) _budget = JSON.parse(_raw).budget || null; } catch {}
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
      const aboveBtn = [selfCheckValue, hintHtml, detailHtml, guideBadgeHtml, noteHtml, productsHtml].filter(Boolean).join('');
      const isAutoOpen = isGlobalCurrent;
      const shortText = step.text.length > 22 ? step.text.slice(0, 22) + '…' : step.text;
      return `<div class="${nodeClasses}" data-done-key="${esc(doneKey)}">
        <div class="gmap-node-row ${posClass}">
          <div class="gmap-node" data-toggle-node="${esc(doneKey)}">
            <div class="gm-circle ${circleClass}">${esc(def.icon)}</div>
            <div class="gmap-node-label">
              ${nowBadge}${selfCheckBadge}
              <span class="gmap-node-axis-name">${esc(def.label)}</span>
              <p class="gmap-node-text">${esc(shortText)}</p>
            </div>
          </div>
        </div>
        <div class="path-node-detail${isAutoOpen ? ' pnd-open' : ''}">
          <div class="gmap-detail-card">
            <p class="gmap-detail-title">${esc(step.text)}</p>
            ${aboveBtn}
            <button class="step-check-btn gmap-check-btn${isDone?' checked':''}" data-done-key="${esc(doneKey)}">${isDone ? '✓ 完了済み' : '✓ やった！'}</button>
            ${svcCardHtml}
          </div>
        </div>
      </div>`;
    }

    function buildPathHtml() {
      // AI生成ステップがあれば一本の道ビューを返す
      const onePathHtml = buildOnePathHtml();
      if (onePathHtml) return onePathHtml;

      // ── フォールバック表示 + 生成CTAバナー ──
      const genCtaBanner = token ? `
        <div id="navi-gen-banner" style="margin-bottom:20px;padding:16px 18px;background:linear-gradient(135deg,rgba(201,168,76,0.10),rgba(10,15,30,0.30));border:1px solid rgba(201,168,76,0.30);border-radius:14px">
          <p style="font-size:12px;font-weight:800;color:rgba(201,168,76,0.85);margin:0 0 4px;letter-spacing:.04em">✨ あなただけの変容の道を生成できます</p>
          <p style="font-size:11px;color:rgba(232,228,220,0.55);margin:0 0 12px;line-height:1.6">Me Scanの診断データをAIが読み取り、この人だけの順番と内容でステップを生成します。</p>
          <button id="navi-regen-btn" style="display:block;width:100%;padding:11px;background:rgba(201,168,76,0.18);border:1px solid rgba(201,168,76,0.45);border-radius:8px;color:#c9a84c;font-size:13px;font-weight:800;cursor:pointer;font-family:'Noto Sans JP',sans-serif;letter-spacing:.05em">
            🧭 変容の道を生成する
          </button>
        </div>` : '';

      const allSteps = flattenAllSteps();
      const SECTIONS = [
        { type: 'quick',   icon: '⚡', tabLabel: '今すぐ',   label: '今すぐ動ける一手',           desc: '今日中に完了できる。まずここから動こう' },
        { type: 'habit',   icon: '🔄', tabLabel: '毎日習慣', label: '毎日・毎週の習慣にする',     desc: '継続が変容を積み上げる。少しずつでOK' },
        { type: 'ongoing', icon: '🌊', tabLabel: 'じっくり', label: 'じっくり取り組むプログラム', desc: '数週間〜数ヶ月スパン。覚悟して始めると変わる' },
      ];
      const POS_CYCLE = ['gnr-left', 'gnr-right'];
      const compassFirstUndoneKey = getNextUndoneSteps(1)[0]?.doneKey ?? null;
      const sectionMeta = SECTIONS.map(({ type }) => {
        const steps = allSteps.filter(s => s.actionType === type);
        return { type, done: steps.filter(s => s.isDone).length, total: steps.length };
      });
      const tabBarHtml = `<div class="section-tab-bar" id="section-tab-bar">
        ${SECTIONS.map(({ type, icon, tabLabel }, i) => {
          const m = sectionMeta[i];
          return `<button class="section-tab" data-scroll-to="path-section-${type}">
            <span class="section-tab-icon">${icon}</span>
            <span>${esc(tabLabel)}</span>
            <span class="section-tab-progress">${m.done}/${m.total}</span>
          </button>`;
        }).join('')}
      </div>`;
      let html = buildSelfCheckIntroHtml() + tabBarHtml + `<div class="path-wrap">`;
      const usedArticleSlugs = new Set();
      SECTIONS.forEach(({ type, icon, label, desc }) => {
        const sectionSteps = allSteps
          .filter(s => s.actionType === type)
          .filter(s => !activeAxisFilter || s.axisId === activeAxisFilter)
          .sort((a, b) => {
            const ar = priorityOrder.indexOf(a.axisId); const br = priorityOrder.indexOf(b.axisId);
            return (ar === -1 ? 99 : ar) - (br === -1 ? 99 : br);
          });
        const doneInSection = sectionSteps.filter(s => s.isDone).length;
        html += `<div class="path-phase-block" id="path-section-${type}">
          <div class="path-phase-banner">
            <span class="path-phase-banner-icon">${icon}</span>
            <div class="path-phase-banner-body">
              <p class="path-phase-banner-label">${esc(label)}</p>
              <p class="path-phase-banner-desc">${esc(desc)}</p>
            </div>
            <span class="path-phase-banner-count">${doneInSection}/${sectionSteps.length}</span>
          </div>`;
        const insertBefore = new Map();
        const injectedAxes = new Set();
        for (const targetAxis of priorityOrder) {
          const firstHighIdx = sectionSteps.findIndex(s => s.axisId === targetAxis && s.step.guide === 'HIGH');
          if (firstHighIdx === -1 || injectedAxes.has(targetAxis)) continue;
          const art = pickSectionArticle([targetAxis], priorityOrder[0], usedArticleSlugs);
          if (art) { insertBefore.set(firstHighIdx, art); usedArticleSlugs.add(art.slug); injectedAxes.add(targetAxis); }
          if (insertBefore.size >= 2) break;
        }
        let posIdx = 0;
        let prevPosClass = null;
        sectionSteps.forEach((s, i) => {
          const art = insertBefore.get(i);
          if (art) {
            html += `<div class="gmap-article-row">
              <a href="${esc(TRACK.articlePath(art.slug))}" class="gmap-article-node" target="_blank">
                <span class="gmap-article-icon">📖</span>
                <div class="gmap-article-body">
                  <p class="gmap-article-label">この一歩を踏み出す前に読む</p>
                  <p class="gmap-article-title">${esc(art.title)}</p>
                </div>
                <span style="color:rgba(201,168,76,0.6);font-size:14px;flex-shrink:0">→</span>
              </a>
            </div>`;
          }
          const posClass = POS_CYCLE[posIdx % 2];
          if (i > 0 && prevPosClass !== null) {
            html += connectorSvg(prevPosClass, posClass, s.isDone);
          }
          html += buildPathNode(s, compassFirstUndoneKey, posClass);
          prevPosClass = posClass;
          posIdx++;
        });
        html += `</div>`;
      });
      html += `</div>`;
      const doneCount = Object.values(stepDone).filter(Boolean).length;
      const isReady = doneCount >= 20;
      const isApproaching = doneCount >= 10;
      const cardBg = isApproaching ? 'linear-gradient(135deg,rgba(201,168,76,0.10),rgba(10,15,30,0.30))' : 'rgba(10,15,30,0.35)';
      const cardBorder = isApproaching ? 'rgba(201,168,76,0.3)' : 'rgba(232,228,220,0.12)';
      const stageReadinessHtml = isReady
        ? `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.25);border-radius:8px;margin-bottom:18px"><span style="font-size:16px">🎉</span><span style="font-size:12px;font-weight:700;color:rgba(52,211,153,0.95)">このステージへ進む準備ができています！</span></div>`
        : isApproaching
        ? `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(201,168,76,0.07);border:1px solid rgba(201,168,76,0.22);border-radius:8px;margin-bottom:18px"><span style="font-size:14px">🧭</span><span style="font-size:12px;font-weight:700;color:rgba(201,168,76,0.95)">変容が着実に進んでいます。もう少しで発揮のステージへ。</span></div>`
        : `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(10,15,30,0.40);border:1px dashed rgba(232,228,220,0.18);border-radius:8px;margin-bottom:18px"><span style="font-size:14px">🔒</span><span style="font-size:12px;color:rgba(232,228,220,0.50);line-height:1.6">まずは変容ルートを歩もう。変化が積み重なるほど、このステージが近づいてくる。</span></div>`;
      html += `<svg viewBox="0 0 100 32" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:32px;display:block;margin-top:8px"><line x1="50" y1="0" x2="50" y2="32" stroke="rgba(201,168,76,0.45)" stroke-width="2" stroke-dasharray="5 4"/></svg>
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
      return genCtaBanner + html;
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

    // ── 基礎チェックリスト（BASELINE_STEPS） ──
    const BASELINE_STEPS = {
      eyebrow: [
        { id: 'eyebrow-b-01', axis: 'eyebrow', priority: 9, action_type: 'quick',
          text: '眉用コームを今日買って、鏡の前で毛流れを整えてみる（3分でできる、顔の印象が変わる）' },
        { id: 'eyebrow-b-02', axis: 'eyebrow', priority: 8, action_type: 'habit',
          text: '余分な産毛・単独毛を電動フェイスシェーバーで週1回除去する（コームで整えた後の産毛が対象）' },
        { id: 'eyebrow-b-03', axis: 'eyebrow', priority: 6, action_type: 'quick',
          text: '鏡で左右の眉の高さと長さを比べて、どちらがズレているか確認する（非対称の現状把握）' },
      ],
      skin: [
        { id: 'skin-b-01', axis: 'skin', priority: 10, action_type: 'habit',
          text: '朝晩2回の洗顔を今日から習慣にする（今の洗顔料でOK。まず頻度が先）' },
        { id: 'skin-b-02', axis: 'skin', priority: 9, action_type: 'habit',
          text: '洗顔後30秒以内に化粧水をつける（コットンでも手でも可。水分を閉じ込めるのが目的）' },
        { id: 'skin-b-03', axis: 'skin', priority: 8, action_type: 'habit',
          text: '化粧水の後に乳液またはクリームで蓋をする（ニベア青缶500円台でOK）' },
        { id: 'skin-b-04', axis: 'skin', priority: 7, action_type: 'habit',
          text: '外出前にUV（日焼け止めSPF30以上）を塗る習慣を作る（老化の最大原因は紫外線）' },
        { id: 'skin-b-05', axis: 'skin', priority: 5, action_type: 'habit',
          text: '美容液を1本導入する（ビタミンC誘導体配合が毛穴・シミに効果的）' },
      ],
      hair: [
        { id: 'hair-b-01', axis: 'hair', priority: 10, action_type: 'habit',
          text: '洗髪後は自然乾燥禁止。今日からドライヤーで根元から乾かす（清潔感が1日で変わる）' },
        { id: 'hair-b-02', axis: 'hair', priority: 8, action_type: 'habit',
          text: 'シャンプーは頭皮で泡立ててから揉み込む（髪をこすらない。頭皮の血行が変わる）' },
        { id: 'hair-b-03', axis: 'hair', priority: 7, action_type: 'habit',
          text: 'トリートメントを毎回使う（毛先に馴染ませて2分置いてから流す）' },
        { id: 'hair-b-04', axis: 'hair', priority: 6, action_type: 'habit',
          text: 'ドライヤー後にヘアオイルまたはアウトバストリートメントをつける（ツヤが変わる）' },
      ],
      fashion: [
        { id: 'fashion-b-01', axis: 'fashion', priority: 10, action_type: 'quick',
          text: 'クローゼットからサイズが合っている服だけ取り出して今日着る（ゆるい服は見た目を5kg太らせる）' },
        { id: 'fashion-b-02', axis: 'fashion', priority: 9, action_type: 'habit',
          text: '着る前にシワを確認する。シワがある服は蒸気またはアイロンで伸ばす（清潔感の9割はシワで決まる）' },
        { id: 'fashion-b-03', axis: 'fashion', priority: 8, action_type: 'quick',
          text: '1コーデを白・グレー・ネイビーの無地3色以内にまとめる（色は少ない方が清潔感が出る）' },
        { id: 'fashion-b-04', axis: 'fashion', priority: 7, action_type: 'habit',
          text: '靴を今日拭く・磨く（靴の汚れは全体の印象を下げる。週1回10分の手入れで変わる）' },
      ],
      body: [
        { id: 'body-b-01', axis: 'body', priority: 10, action_type: 'quick',
          text: '壁を背にして立ち、後頭部・肩・お尻・かかとを全部つける。正しい姿勢を30秒キープして鏡で確認する' },
        { id: 'body-b-02', axis: 'body', priority: 9, action_type: 'habit',
          text: '歩くとき「頭のてっぺんを引っ張られている」イメージで歩く。姿勢を意識するだけで見た目が変わる' },
        { id: 'body-b-03', axis: 'body', priority: 7, action_type: 'habit',
          text: 'スマホのヘルスケアアプリで歩数を記録し始める（目標：1日7,000歩）' },
        { id: 'body-b-04', axis: 'body', priority: 5, action_type: 'habit',
          text: '体幹プランク30秒×3セットを毎朝始める（姿勢の維持が楽になる）' },
      ],
      teeth: [
        { id: 'teeth-b-01', axis: 'teeth', priority: 10, action_type: 'habit',
          text: '歯磨きを食後30分以内に固定し、2分以上かける（頻度と時間の習慣化が最初の一歩）' },
        { id: 'teeth-b-02', axis: 'teeth', priority: 9, action_type: 'quick',
          text: 'デンタルフロスを今日買って今夜使う。歯ブラシだけでは取れない汚れが一目瞭然になる' },
        { id: 'teeth-b-03', axis: 'teeth', priority: 8, action_type: 'habit',
          text: '歯磨き粉をホワイトニング成分（ポリリン酸・フッ素配合）に切り替える' },
        { id: 'teeth-b-04', axis: 'teeth', priority: 6, action_type: 'habit',
          text: 'コーヒー・お茶を飲んだ後は水でゆすぐ。着色を防ぐ最小コストの習慣' },
      ],
      nail: [
        { id: 'nail-b-01', axis: 'nail', priority: 10, action_type: 'quick',
          text: '今すぐ爪を「白い部分1〜2mm残る長さ」に切り揃える（10分で手の印象が別人になる）' },
        { id: 'nail-b-02', axis: 'nail', priority: 9, action_type: 'habit',
          text: '爪やすり（100均）で角を丸く整える。週1回切るたびに必ずセットでやる' },
        { id: 'nail-b-03', axis: 'nail', priority: 6, action_type: 'habit',
          text: '爪周りの甘皮・ささくれにネイルオイルを塗る（手全体の印象が変わる）' },
      ],
      hairremoval: [
        // 3件ともひげ前提の内容（男女で悩みの中心が違う。computeHabitStatusItemsの
        // BELLE_HAIRREMOVAL_ITEM_LABELS分岐と同じ理由）のためfineme限定にする
        { id: 'hairremoval-b-01', axis: 'hairremoval', priority: 10, action_type: 'quick', track: 'fineme',
          text: 'ひげのスタイル（完全除去 or 整えて残す）を今日決める。迷いをなくすと清潔感が上がる' },
        { id: 'hairremoval-b-02', axis: 'hairremoval', priority: 9, action_type: 'habit', track: 'fineme',
          text: '毎日同じタイミング（洗顔後など）でひげを処理する習慣を作る。生えかけの状態をなくす' },
        { id: 'hairremoval-b-03', axis: 'hairremoval', priority: 7, action_type: 'quick', track: 'fineme',
          text: '現在のシェーバーの刃を確認する。3〜6ヶ月が交換目安。切れ味が落ちると肌荒れの原因になる' },
      ],
    };

    // Map用: priority×(gap + mirrorBoost + compassBonus) スコアで上位5件を選定
    function computeBaselineItems() {
      const mirrorMap = {};
      (mirrorAnalysisAxes || []).forEach(ax => { mirrorMap[ax.id] = ax.potential_level; });

      // Compassランクボーナス: priorityOrder 1位=+10.5, 2位=+9, ... 8位=+1.5
      const compassRank = {};
      (p.priority_order || []).forEach((id, i) => { compassRank[id] = Math.max(0, 8 - i) * 1.5; });

      // MeScanでスキンケアアイテムの回答済み（=computeHabitStatusItems側が化粧水/乳液/美容液を
      // 個別ノードとして担当済み）なら、内容が重なる固定リストの項目は候補から除外する（重複表示防止）
      const skinHabitAnswered = !!p.skincare_habits?.items;
      const SKIN_ITEM_OVERLAP_IDS = new Set(['skin-b-02', 'skin-b-03', 'skin-b-05']);

      const candidates = [];
      for (const [axis, steps] of Object.entries(BASELINE_STEPS)) {
        const v = tv[axis];
        if (!v || v.care_type === 'pro') continue;  // プロ通い中のみ除外
        const gap = Math.max(0, (v.ideal || 3) - (v.current || 1));
        const mirrorBoost = mirrorMap[axis] === '高' ? 3 : mirrorMap[axis] === '中' ? 1 : 0;
        const axisWeight = gap + mirrorBoost + (compassRank[axis] || 0);
        if (axisWeight === 0) continue;
        for (const step of steps) {
          if (step.track && step.track !== trackId) continue;
          if (stepDone[step.id]) continue;
          if (skinHabitAnswered && SKIN_ITEM_OVERLAP_IDS.has(step.id)) continue;
          candidates.push({ ...step, _score: step.priority * axisWeight });
        }
      }
      candidates.sort((a, b) => b._score - a._score);
      return candidates.slice(0, 5);
    }

    // MeScanの行動習慣回答（axis_habits、全軸共通の複数選択items）を、New Me Mapの
    // 初期状態（実施済み／やってみる）に機械的に反映する固定ノード（AI生成に頼らない・
    // でお指摘 2026-08-06：回答内容がそのままMapの初期状態に反映されてほしい）
    function computeHabitStatusItems() {
      const items = [];
      const axisHabits = p.axis_habits || {};

      for (const [axisId, baseLabels] of Object.entries(AXIS_HABIT_ITEM_LABELS)) {
        const selected = axisHabits[axisId]?.items;
        if (!Array.isArray(selected)) continue; // その軸の回答自体がまだ無い（未診断・旧データ）
        const axisLabel = AREA_DEFS[axisId]?.label || axisId;
        // skin軸はBelleのメイク回答も同じitems配列に混ざって入る。hairremovalは男女で
        // 悩みの中心が違う（男性=ひげ、女性=VIO・脚腕ワキ）ため語彙自体を出し分ける
        const itemLabels = axisId === 'skin' ? { ...baseLabels, ...BELLE_MAKEUP_ITEM_LABELS }
          : axisId === 'hairremoval' && p.gender === 'female' ? BELLE_HAIRREMOVAL_ITEM_LABELS
          : baseLabels;
        for (const [key, label] of Object.entries(itemLabels)) {
          const done = selected.includes(key);
          items.push({
            id: `habit-${axisId}-${key}`, axis: axisId,
            text: `${done ? '✓' : '☐'} ${label}`,
            action_type: 'quick', guide: 'none',
            _isHabitStatus: true, _autoDone: done,
          });
        }
      }

      return items;
    }

    const _diagPriorityOrder = p.priority_order || Object.keys(AREA_DEFS);
    // ③ 軸ごとの実ステップ完了率を算出するヘルパー（③④で共用）
    // naviStepsData（AI生成）があればそちらのstep.idを使う
    function computeAxisCompletion(axisId) {
      if (naviStepsData?.steps?.length) {
        const axisSteps = naviStepsData.steps.filter(s => s.axis === axisId);
        return { total: axisSteps.length, done: axisSteps.filter(s => stepDone[s.id]).length };
      }
      const subKeys = { skin: ['skin_care','skin_hige'], teeth: ['teeth_white','teeth_ortho'] }[axisId] || [axisId];
      let total = 0, done = 0;
      for (const axisKey of subKeys) {
        const steps = axisKey in MILESTONES_SUB ? (MILESTONES_SUB[axisKey]?.steps || []) : (MILESTONES[axisKey] || []);
        const cIdx = steps.findIndex(s => s.isCurrentFor === 'concerned');
        const splitAt = cIdx > 0 ? cIdx : 0;
        steps.forEach((_, idx) => {
          const dk = (splitAt > 0 && idx < splitAt) ? `prereq-${axisKey}-${idx}` : `${axisKey}-${idx}`;
          total++;
          if (stepDone[dk]) done++;
        });
      }
      return { total, done };
    }
    // ③ 動的優先順: gap×(1-完了率) が高い軸を上位に。同スコアは診断順を維持
    const priorityOrder = [..._diagPriorityOrder].sort((a, b) => {
      const ca = computeAxisCompletion(a), cb = computeAxisCompletion(b);
      const tierA = AREA_DEFS[a]?.tier || 1;
      const tierB = AREA_DEFS[b]?.tier || 1;
      const gapA = (tv[a]?.ideal || 3) - (tv[a]?.current || 1);
      const gapB = (tv[b]?.ideal || 3) - (tv[b]?.current || 1);
      const ratioA = ca.total > 0 ? ca.done / ca.total : 0;
      const ratioB = cb.total > 0 ? cb.done / cb.total : 0;
      const scoreA = gapA * (1 - ratioA) / tierA;
      const scoreB = gapB * (1 - ratioB) / tierB;
      if (Math.abs(scoreA - scoreB) > 0.01) return scoreB - scoreA;
      return _diagPriorityOrder.indexOf(a) - _diagPriorityOrder.indexOf(b);
    });
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
      ease:      ['eyebrow','skin','hair','teeth','fashion','nail','body'],
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
      // ④ step_done上で全ステップ完了の軸もdone扱い（手動axisProgressに頼らない）
      Object.keys(AREA_DEFS).forEach(axisId => {
        const { done, total } = computeAxisCompletion(axisId);
        if (total > 0 && done >= total) doneAxes.add(axisId);
      });
      const compassOverride = localStorage.getItem('fineme:compass:override');
      if (compassOverride && AREA_DEFS[compassOverride] && !doneAxes.has(compassOverride)) {
        return compassOverride;
      }
      // ③の動的priorityOrderを使い、未完了の先頭軸を選ぶ
      const next = priorityOrder.find(id => !doneAxes.has(id));
      return next || compassFirst;
    }

    // ── 軸の変容ステージ（0〜3）を計算 ──
    function getAxisStage(axisId) {
      const { done, total, status } = getAxisStats(axisId);
      if (status === 'done' || (total > 0 && done >= total)) return 3;
      if (total === 0) return 0;
      const pct = done / total;
      if (pct >= 0.60) return 2;
      if (pct >= 0.25 || done >= 2) return 1;
      return 0;
    }
    function stepsToNextCheckpoint(axisId) {
      const stage = getAxisStage(axisId);
      if (stage >= 3) return 0;
      const { done, total } = getAxisStats(axisId);
      if (total === 0) return 0;
      const thresholds = [Math.max(2, Math.ceil(total * 0.25)), Math.ceil(total * 0.60), total];
      return Math.max(0, thresholds[stage] - done);
    }

    function buildCompassHtml() {
      if (naviStepsData?.steps?.length)
        return '<div class="compass-strip" id="compass-strip" style="display:none"></div>';
      let nextText = '', nextDef = {};
      if (naviStepsData?.steps?.length) {
        // AI生成パス: Compass軸の未完了ステップ → 全体の未完了ステップ の順で探す
        const compassAxis = calcDynamicCompass();
        const aiNext = naviStepsData.steps.find(s => s.axis === compassAxis && !stepDone[s.id])
          || naviStepsData.steps.find(s => !stepDone[s.id]);
        if (!aiNext) {
          return `<div class="compass-strip" id="compass-strip">
            <div class="compass-strip-icon">🎉</div>
            <div class="compass-strip-body">
              <p class="compass-strip-label">Fineme Compass</p>
              <p class="compass-strip-text">すべてのステップが完了しています</p>
            </div>
          </div>`;
        }
        nextText = aiNext.text;
        nextDef  = AREA_DEFS[aiNext.axis] || {};
      } else {
        const steps = getNextUndoneSteps(1);
        if (!steps.length) {
          return `<div class="compass-strip" id="compass-strip">
            <div class="compass-strip-icon">🎉</div>
            <div class="compass-strip-body">
              <p class="compass-strip-label">Fineme Compass</p>
              <p class="compass-strip-text">すべてのステップが完了しています</p>
            </div>
          </div>`;
        }
        nextText = steps[0].step.text;
        nextDef  = steps[0].def;
      }
      const shortText = nextText.length > 30 ? nextText.slice(0, 30) + '…' : nextText;
      return `<div class="compass-strip" id="compass-strip">
        <div class="compass-strip-icon">🧭</div>
        <div class="compass-strip-body">
          <p class="compass-strip-label">Fineme Compass — 次の一手</p>
          <p class="compass-strip-text">${esc(shortText)}</p>
          <p style="font-size:11px;color:rgba(201,168,76,0.55);margin:3px 0 0">${esc(nextDef.icon)} ${esc(nextDef.label)}</p>
        </div>
        <a href="#sections-container" class="compass-strip-cta" onclick="event.preventDefault();document.getElementById('sections-container')?.scrollIntoView({behavior:'smooth'})">見る</a>
      </div>`;
    }

    // ── 変容の旅 全体図 ──
    function buildJourneyOverviewHtml() {
      const compassAxis = calcDynamicCompass();
      const compassDef  = AREA_DEFS[compassAxis] || {};
      const wp = AXIS_WAYPOINTS[compassAxis] || {
        cp1: { label:'はじめの変化', desc:'変化が自分でわかる' },
        cp2: { label:'印象が変わる',  desc:'他者にも伝わり始める' },
        goal: '目標達成',
      };
      const stage       = getAxisStage(compassAxis);
      const stepsToNext = stepsToNextCheckpoint(compassAxis);

      // ドット4個とコネクター3本
      const nodes = [
        { label: '今ここ',         dotCls: 'jov-current',                          labelCls: '' },
        { label: wp.cp1.label,     dotCls: stage >= 1 ? 'jov-done' : '',            labelCls: stage >= 1 ? 'jov-done' : (stage === 0 ? 'jov-next' : '') },
        { label: wp.cp2.label,     dotCls: stage >= 2 ? 'jov-done' : '',            labelCls: stage >= 2 ? 'jov-done' : (stage === 1 ? 'jov-next' : '') },
        { label: 'ゴール',         dotCls: `jov-goal${stage >= 3 ? ' jov-done' : ''}`, labelCls: stage >= 3 ? 'jov-done' : (stage === 2 ? 'jov-next' : '') },
      ];
      const connsDone = [stage >= 1, stage >= 2, stage >= 3];

      const trackRowHtml = `
        <div class="jov-track-row">
          ${nodes.map((n, i) => `
            <div class="jov-wp-node"><div class="jov-wp-dot ${n.dotCls}"></div></div>
            ${i < 3 ? `<div class="jov-track-conn${connsDone[i] ? ' jov-done' : ''}"></div>` : ''}
          `).join('')}
        </div>
        <div class="jov-labels-row">
          ${nodes.map((n, i) => `
            <div class="jov-wp-label-wrap"><span class="jov-wp-label ${n.labelCls}">${esc(n.label)}</span></div>
            ${i < 3 ? '<div class="jov-conn-spacer"></div>' : ''}
          `).join('')}
        </div>`;

      const nextWpList = [
        { label: wp.cp1.label, desc: wp.cp1.desc },
        { label: wp.cp2.label, desc: wp.cp2.desc },
        { label: 'ゴール',     desc: wp.goal },
      ];
      const nextWp = stage < 3 ? nextWpList[stage] : null;
      const alreadyDone = axisProgress[compassAxis] === 'done';
      let nextTargetHtml;
      if (nextWp) {
        nextTargetHtml = `<div class="jov-next-target">
            <div class="jov-next-target-text">
              <p class="jov-next-target-eyebrow">次の中継地点</p>
              <p class="jov-next-target-label">${esc(nextWp.label)}</p>
              <p class="jov-next-target-desc">${esc(nextWp.desc)}</p>
            </div>
            ${stepsToNext > 0
              ? `<div class="jov-next-steps"><span class="jov-next-steps-num">${stepsToNext}</span><span class="jov-next-steps-unit">ステップ</span></div>`
              : `<div style="font-size:12px;font-weight:700;color:rgba(52,211,153,0.85)">到達中！</div>`}
          </div>`;
      } else if (alreadyDone) {
        const nextAxisId = priorityOrder.find(id => axisProgress[id] !== 'done' && id !== compassAxis);
        const nextDef = nextAxisId ? AREA_DEFS[nextAxisId] : null;
        nextTargetHtml = `<div class="jov-next-target" style="border-color:rgba(52,211,153,0.3);background:rgba(16,185,129,0.06)">
            <span style="font-size:18px">✅</span>
            <div class="jov-next-target-text">
              <p class="jov-next-target-label" style="color:rgba(52,211,153,0.9)">この軸の旅は完了しました</p>
              <p class="jov-next-target-desc">${nextDef ? `次は ${esc(nextDef.icon)} ${esc(nextDef.label)}軸へ進みましょう` : esc(wp.goal)}</p>
            </div>
          </div>`;
      } else {
        // stage === 3: ゴール達成。ボタンは表示しない
        const nextAxisId2 = priorityOrder.find(id => axisProgress[id] !== 'done' && id !== compassAxis);
        const nextDef2 = nextAxisId2 ? AREA_DEFS[nextAxisId2] : null;
        nextTargetHtml = `
          <div class="jov-next-target" style="border-color:rgba(52,211,153,0.3);background:rgba(16,185,129,0.06)">
            <span style="font-size:18px">🎉</span>
            <div class="jov-next-target-text">
              <p class="jov-next-target-label" style="color:rgba(52,211,153,0.9)">ゴール達成！</p>
              <p class="jov-next-target-desc">${nextDef2 ? `次は ${esc(nextDef2.icon)} ${esc(nextDef2.label)}軸へ進みましょう` : 'すべての軸の旅が完成しました 🎊'}</p>
            </div>
          </div>`;
      }

      const stageLabelText = ['未着手', 'はじめの変化', '印象が変わる', 'ゴール達成'];
      const stageLabelCls  = ['', 's1', 's2', 's3'];
      const otherAxesHtml = Object.entries(AREA_DEFS)
        .filter(([id]) => id !== compassAxis)
        .map(([id, def]) => {
          const s = getAxisStage(id);
          const dots = [0,1,2,3].map(i =>
            `<div class="jov-sd${s > i ? (i === 3 ? ' jov-goal-done' : ' jov-done') : (s === 3 && i === 3 ? ' jov-goal-done' : '')}"></div>`
          ).join('');
          return `
            <div class="jov-other-chip" data-axis-jump="${esc(id)}">
              <div class="jov-other-chip-head">
                <span class="jov-other-chip-icon">${esc(def.icon)}</span>
                <span class="jov-other-chip-name">${esc(def.label)}</span>
              </div>
              <div class="jov-stage-dots">${dots}</div>
              <div class="jov-stage-label ${stageLabelCls[s]}">${stageLabelText[s]}</div>
            </div>`;
        }).join('');

      return `
        <div class="jov-section" id="jov-section">
          <div class="sec-label">🗺️ 変容の旅 — 全体図</div>
          <div class="jov-hero">
            <div class="jov-hero-axis">
              <span class="jov-hero-icon">${esc(compassDef.icon||'🧭')}</span>
              <div>
                <p class="jov-hero-sub">Compass — 今向くべき方角</p>
                <p class="jov-hero-title">${esc(compassDef.label||'')}軸の変容ロードマップ</p>
              </div>
            </div>
            ${trackRowHtml}
            ${nextTargetHtml}
          </div>
          <div class="sec-label" style="margin-top:4px;font-size:8px">その他の軸</div>
          <div class="jov-other-grid">${otherAxesHtml}</div>
        </div>`;
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

      // メインステップをguide時系列順にソート（元インデックスをdoneKey用に保持）
      const _guideOrder = { none:0, LOW:1, HIGH:2, MID:3 };
      const mainStepsSorted = mainSteps
        .map((step, j) => ({ ...step, _oi: splitAt + j }))
        .sort((a, b) => (_guideOrder[a.guide]??0) - (_guideOrder[b.guide]??0));

      // メインステップHTML（Layer1→Layer2 区切りを proIdx で自動挿入）
      const proIdxInMain = mainStepsSorted.findIndex(s => s.isCurrentFor === 'pro');
      const layer2Divider = '<div class="layer2-divider"><div class="layer2-divider-line"></div><span class="layer2-divider-label">継続・アップデートフェーズ</span><div class="layer2-divider-line"></div></div>';
      const items = mainStepsSorted.map((step, j) => {
        const doneKey = `${axisKey}-${step._oi}`;
        const isDone = !!stepDone[doneKey];
        const isCurrentPosition = (step._oi === currentIdx);
        const dotClass = isCurrentPosition ? 'current' : (step._oi < currentIdx || isDone ? 'past' : 'future');
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
        const mDetailId = `detail-${axisKey}-${step._oi}`;
        const mDetailHtml = step.detail ? `
          <button class="step-detail-toggle" onclick="(function(btn){const panel=document.getElementById('${mDetailId}');panel.classList.toggle('open');btn.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'▲ 閉じる':'📖 答えを見る';})(this)">📖 答えを見る</button>
          <div class="step-detail-panel" id="${mDetailId}">${esc(step.detail)}</div>` : '';
        const mSvcId = (step.guide === 'HIGH' || step.guide === 'MID') && catLink ? `svc-${axisKey}-${step._oi}` : null;
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
          try { const _raw = localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle'); if (_raw) _budget = JSON.parse(_raw).budget || null; } catch {}
          const _maxBudgetRank = (!_budget || _budget === 'high' || _budget === 'premium') ? 2 : (_budget === 'mid' ? 1 : 0);
          const chips = step.products
            .map((prod, pi) => ({ prod, pi }))
            .filter(({ prod }) => {
              const lvOk = (_lvRank[prod.level || 'beginner']) <= _maxRank;
              const prOk = (_budgetRank[prod.priceRange || 'low']) <= _maxBudgetRank;
              return lvOk && prOk;
            })
            .map(({ prod, pi }) => {
              const prodKey = `prod-${axisKey}-${step._oi}-${pi}`;
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
      const mainCount = mainStepsSorted.length;
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
      // 理想マーカーが現在地バーより左に来ないよう下限をクランプ（でお指摘 2026-08-14）
      const idealPct   = Math.min((Math.max(v.ideal, v.current) / 5) * 100, 100).toFixed(1);
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
            ${trackId === 'fineme' ? `<button class="subtab-btn${skinFocus==='hige'?' active':''}" data-subtab="skin" data-val="hige">🪒 ひげケア</button>` : ''}
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
            <a href="${esc(TRACK.articlesSearch(def.articleQ))}" class="track-article-link">
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

    // ── New Me Log ウィジェット ──
    function buildServiceLogWidget() {
      if (!serviceLogs.length) {
        return `<div class="sl-widget sl-widget-empty">
          <div class="sl-widget-head">
            <span class="sl-widget-eyebrow">New Me Log</span>
            <a href="/mypage/log" class="sl-widget-link">管理する →</a>
          </div>
          <p class="sl-widget-empty-text">📖 通っているサービスをまだ登録していません。<br>
            <a href="/mypage/log" style="color:#c9a84c;text-decoration:underline">登録して変容の旅を一元管理しよう</a>
          </p>
        </div>`;
      }

      const today = new Date();
      // 次回予約日が近い順にソート（未設定は後ろ）
      const sorted = [...serviceLogs].sort((a, b) => {
        if (!a.next_visit && !b.next_visit) return 0;
        if (!a.next_visit) return 1;
        if (!b.next_visit) return -1;
        return new Date(a.next_visit) - new Date(b.next_visit);
      });

      const items = sorted.slice(0, 4).map(log => {
        const def = AREA_DEFS[log.axis] || {};
        const diff = log.next_visit ? Math.round((new Date(log.next_visit) - today) / 86400000) : null;
        let nextLabel = '', nextCls = '';
        if (diff === null)      { nextLabel = '次回未設定'; nextCls = 'sl-next-none'; }
        else if (diff < 0)      { nextLabel = `${-diff}日前 （要予約）`; nextCls = 'sl-next-overdue'; }
        else if (diff === 0)    { nextLabel = '今日！'; nextCls = 'sl-next-today'; }
        else if (diff <= 7)     { nextLabel = `${diff}日後`; nextCls = 'sl-next-soon'; }
        else                    { nextLabel = `${diff}日後`; nextCls = ''; }
        return `<div class="sl-item">
          <span class="sl-item-icon">${esc(def.icon || '🏥')}</span>
          <div class="sl-item-body">
            <p class="sl-item-name">${esc(log.name)}</p>
            <span class="sl-next-badge ${nextCls}">次回 ${esc(nextLabel)}</span>
          </div>
        </div>`;
      }).join('');

      return `<div class="sl-widget">
        <div class="sl-widget-head">
          <span class="sl-widget-eyebrow">📖 New Me Log</span>
          <a href="/mypage/log" class="sl-widget-link">すべて見る →</a>
        </div>
        <div class="sl-items">${items}</div>
      </div>`;
    }

    // ── Today's Quest ──
    function buildTodayQuestHtml() {
      if (naviStepsData?.steps?.length) return ''; // AI Mapでは地図上の🧭バッジで代替
      const steps = getNextUndoneSteps(3);
      if (!steps.length) return '';
      const itemsHtml = steps.map((s, i) => {
        const { def, step, doneKey } = s;
        const isDone = !!stepDone[doneKey];
        const fontSize = i === 0 ? '' : ' style="font-size:13px;font-weight:700"';
        return `<div class="tq-item">
          <div class="tq-item-head">
            <span class="tq-item-axis">${esc(def.icon)} ${esc(def.label)}</span>
            <button class="tq-check-btn${isDone?' done':''}" data-done-key="${esc(doneKey)}">${isDone ? '✓ 完了！' : '✓ やった！'}</button>
          </div>
          <p class="tq-text"${fontSize}>${esc(step.text)}</p>
        </div>`;
      }).join('');
      return `<div class="todayquest-card">
        <p class="tq-eyebrow">🎯 次の一手 — マップから</p>
        ${itemsHtml}
        <div class="tq-actions">
          <a href="#sections-container" class="tq-skip-link" onclick="event.preventDefault();document.getElementById('sections-container')?.scrollIntoView({behavior:'smooth'})">マップ全体を見る →</a>
        </div>
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
        const provHref = prov.entity_type === 'affiliate' ? `/affiliate/${esc(prov.slug||'')}` : `/provider/${esc(prov.slug||'')}`;
        const html = `<a href="${provHref}" class="isc-inner" target="_self">
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
        <div class="sec-label">🗺️ 変容マップ — 8軸同時進行</div>
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

    function buildWeeklyCheckinHtml() {
      if (!compassFirst || !AREA_DEFS[compassFirst]) return '';
      const WEEKLY_STEPS = {
        hair:        '今週の洗髪後に、根元だけ鏡で1か所確認してみる',
        skin:        '洗顔後に保湿を1ステップ足してみる（乳液か化粧水を1プッシュだけ）',
        fashion:     '今週1日、服の肩幅が合っているかだけ鏡で確認してみる',
        body:        '今週、階段を使える機会があれば1回使ってみる',
        eyebrow:     '眉の一番濃い1本の生え方を、鏡で1回だけ見てみる',
        teeth:       '今週1回、奥歯まで丁寧に磨いてみる（いつもより30秒だけ）',
        hairremoval: '今週、気になる1か所だけ確認してみる',
        nail:        '今週1回、爪の長さだけ確認してみる',
      };
      function weekStartISO() {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        return d.toISOString().slice(0, 10);
      }
      const CHECKIN_KEY = 'fineme:navi:weekly-checkin';
      const HISTORY_KEY = 'fineme:navi:weekly-checkin-history';
      const thisWeek = weekStartISO();
      let cd = null;
      try { cd = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null'); } catch {}
      let prev = null;
      if (cd) {
        if (cd.weekStart !== thisWeek) {
          prev = { weekStart: cd.weekStart, axisId: cd.axisId, stepText: cd.stepText, status: cd.status };
          // 継続確認用：完了した週の記録を直近8件まで保持
          try {
            const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            hist.push({ weekStart: cd.weekStart, status: cd.status });
            localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(-8)));
          } catch {}
          cd = null;
        } else {
          prev = cd.prev || null;
        }
      }
      if (!cd) {
        const stepText = WEEKLY_STEPS[compassFirst] || (AREA_DEFS[compassFirst].label + 'について、今週1つだけやってみる');
        cd = { axisId: compassFirst, weekStart: thisWeek, stepText, status: 'todo', prev };
        try { localStorage.setItem(CHECKIN_KEY, JSON.stringify(cd)); } catch {}
      }
      const def = AREA_DEFS[compassFirst];
      const isDone = cd.status === 'done';
      const prevHtml = prev
        ? `<div class="wcw-prev"><span class="wcw-prev-label">先週</span><span class="wcw-prev-text">${esc(prev.stepText)}</span>${prev.status === 'done' ? '<span class="wcw-prev-done">✓</span>' : ''}</div><div class="wcw-prev-arrow">↓ 今週</div>`
        : '';
      const checkHtml = isDone ? '<span class="wcw-check">✓</span>' : '';
      const actionHtml = isDone
        ? '<p class="wcw-done-msg">1点、動かせたね。来週の羅針盤もここにある。</p>'
        : `<button id="weekly-checkin-btn" class="wcw-btn">やった</button>`;

      // 直近3週のうち2週以上未達なら「継続できていますか？」を出す（でお指摘：ルート途中に継続確認ステップを挟む）
      let continuityHtml = '';
      if (!isDone && !cd.continuityAsked) {
        let hist = [];
        try { hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch {}
        const recent3 = hist.slice(-3);
        const doneCount = recent3.filter(h => h.status === 'done').length;
        if (recent3.length === 3 && doneCount <= 1) {
          continuityHtml = `<div class="wcw-continuity" id="wcw-continuity">
            <p class="wcw-continuity-q">直近3週、なかなかできていないみたい。継続できていますか？</p>
            <div class="wcw-continuity-opts">
              <button class="wcw-continuity-opt" data-choice="keep">このまま続ける</button>
              <button class="wcw-continuity-opt" data-choice="slow">ペースを落とす</button>
              <button class="wcw-continuity-opt" data-choice="change">別の一手に変える</button>
            </div>
          </div>`;
        }
      }

      return `<div id="weekly-checkin-widget" class="wcw${isDone ? ' wcw-done' : ''}">
        <p class="wcw-eyebrow">羅針盤 — 今週の1点</p>
        ${prevHtml}
        <div class="wcw-current">
          <span class="wcw-axis-icon">${esc(def.icon)}</span>
          <div class="wcw-body">
            <p class="wcw-axis-name">${esc(def.label)}</p>
            <p class="wcw-step-text">${esc(cd.stepText)}</p>
          </div>
          ${checkHtml}
        </div>
        <p class="wcw-note">やれなくても大丈夫。羅針盤はそのまま置いてある。</p>
        ${actionHtml}
        ${continuityHtml}
      </div>`;
    }

    // 月1回だけ「最近、誰かに優しくできた瞬間はあったか」を聞く。
    // vision.md：北極星は継続率でなく「この人を起点に優しさがどれだけ広がったか」。
    // それを実際に聞く場所がどこにも無かったので新設（でお指摘 2026-08-07）
    function buildKindnessCheckinHtml() {
      if (!token) return '';
      const jst = new Date(Date.now() + 9 * 3600000);
      const thisMonth = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}`;
      const checkins = Array.isArray(bodyData.kindness_checkins) ? bodyData.kindness_checkins : [];
      if (checkins.some(c => c.month === thisMonth)) return '';
      return `<div id="kindness-checkin-widget" class="wcw">
        <p class="wcw-eyebrow">ふと、聞かせてください</p>
        <p style="font-size:13px;color:rgba(232,228,220,0.75);line-height:1.7;margin:0 0 12px">最近、誰かに少しでも優しくできた瞬間はありましたか？</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="kindness-checkin-btn" data-answer="yes" style="flex:1;min-width:100px;padding:10px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:8px;font-size:13px;font-weight:700;color:#c9a84c;cursor:pointer;font-family:inherit">あった</button>
          <button class="kindness-checkin-btn" data-answer="no" style="flex:1;min-width:100px;padding:10px;background:rgba(10,15,30,0.5);border:1px solid rgba(232,228,220,0.15);border-radius:8px;font-size:13px;font-weight:700;color:rgba(232,228,220,0.6);cursor:pointer;font-family:inherit">特に無かった</button>
        </div>
        <button id="kindness-checkin-skip" style="display:block;width:100%;text-align:center;margin-top:8px;font-size:11px;color:rgba(232,228,220,0.3);background:none;border:none;cursor:pointer;font-family:inherit">今は答えない</button>
      </div>`;
    }

    const html = `
      <div class="navi-wrap">
      <div class="navi-header">
        <p class="navi-header-eyebrow">New Me Navi &nbsp;<a href="/mypage/map" style="font-size:9px;font-weight:700;color:rgba(201,168,76,0.6);text-decoration:none;border:1px solid rgba(201,168,76,0.22);padding:2px 8px;border-radius:99px;vertical-align:middle;letter-spacing:.06em">🧭 部位マップ</a></p>
        <div class="navi-header-badge">🧭 ${naviStepsData ? 'あなただけの変容ロードマップ' : '行動タイプ別ロードマップ'}</div>
        <h1>ゴール：<em>${esc(overallGoal)}</em></h1>
        <p class="navi-header-sub">${naviStepsData ? 'Me Scanをもとに生成された、あなただけの変容の道。' : '「今すぐ動ける」から始めよう。<br>Compassが指す軸のステップが最優先で表示される。'}</p>
        ${(() => { let _done, _total; if (naviStepsData?.steps?.length) { _total = naviStepsData.steps.length; _done = naviStepsData.steps.filter(s => stepDone[s.id]).length; } else { const _all = flattenAllSteps(); _done = _all.filter(s=>s.isDone).length; _total = _all.length; } const _pct = _total > 0 ? Math.round(_done/_total*100) : 0; return `<div class="progress-bar-wrap"><div class="progress-bar-label"><span class="progress-bar-label-text">変容の進捗</span><span class="progress-bar-pct">${_pct}%</span></div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${_pct}%"></div></div><p class="progress-bar-sub">${_done} / ${_total} ステップ完了</p></div>`; })()}
        <svg viewBox="0 0 80 80" width="68" height="68" style="position:absolute;top:14px;right:14px;z-index:1;opacity:0.17" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="37" fill="none" stroke="#c9a84c" stroke-width="0.8"/><circle cx="40" cy="40" r="28" fill="none" stroke="#c9a84c" stroke-width="0.4"/><line x1="40" y1="3" x2="40" y2="77" stroke="#c9a84c" stroke-width="0.8"/><line x1="3" y1="40" x2="77" y2="40" stroke="#c9a84c" stroke-width="0.8"/><line x1="14" y1="14" x2="66" y2="66" stroke="#c9a84c" stroke-width="0.5"/><line x1="66" y1="14" x2="14" y2="66" stroke="#c9a84c" stroke-width="0.5"/><polygon points="40,4 37,23 40,19 43,23" fill="#c9a84c"/><polygon points="40,76 37,57 40,61 43,57" fill="#c9a84c" opacity="0.4"/><polygon points="76,40 57,37 61,40 57,43" fill="#c9a84c" opacity="0.4"/><polygon points="4,40 23,37 19,40 23,43" fill="#c9a84c" opacity="0.4"/><circle cx="40" cy="40" r="5" fill="none" stroke="#c9a84c" stroke-width="1.2"/><circle cx="40" cy="40" r="2" fill="#c9a84c"/></svg>
        <div style="position:absolute;bottom:14px;right:18px;font-size:8px;font-family:'Courier New',monospace;color:rgba(201,168,76,0.42);letter-spacing:.07em;z-index:1">N 35°40′ / E 139°46′</div>
      </div>

      <div id="service-log-widget">
        ${buildServiceLogWidget()}
      </div>

      <div id="todayquest-container">
        ${buildTodayQuestHtml()}
      </div>

      ${buildCompassHtml()}

      ${buildWeeklyCheckinHtml()}

      ${buildKindnessCheckinHtml()}

      ${(() => { const _mDef = AREA_DEFS[compassFirst] || {}; if (!_mDef.label) return ''; return `<div style="margin:0 0 16px;padding:16px 18px;background:rgba(10,15,30,0.65);border:1px solid rgba(201,168,76,0.28);border-radius:12px;display:flex;align-items:center;gap:14px;backdrop-filter:blur(8px)"><span style="font-size:26px;flex-shrink:0">🪞</span><div style="flex:1;min-width:0"><p style="font-size:13px;font-weight:700;color:rgba(232,228,220,0.9);margin:0 0 2px;line-height:1.55">${esc(_mDef.icon||'')} ${esc(_mDef.label)}が、あなたの最初の一手。<br>今の${esc(_mDef.label)}、写真1枚で確かめてみる？</p><p style="font-size:11px;color:rgba(232,228,220,0.4);margin:0">写真は保存しません</p></div><a href="${TRACK.mirror}" style="font-size:12px;font-weight:800;padding:10px 14px;background:rgba(201,168,76,0.1);border:1.5px solid #c9a84c;color:#c9a84c;border-radius:8px;text-decoration:none;white-space:nowrap;flex-shrink:0;text-align:center;line-height:1.4">Mirror<br><span style="font-size:10px;font-weight:600">¥500</span></a></div>`; })()}

      ${(() => {
        if (!mirrorOnePoint?.axisId) return '';
        const _isDone = mirrorOnePoint.status === 'done';
        const _isActive = mirrorOnePoint.status === 'active';
        const _axIcon = esc(mirrorOnePoint.axisIcon || '');
        const _axName = esc(mirrorOnePoint.axisName || '');
        const _bg    = _isDone ? 'rgba(16,185,129,0.06)' : 'rgba(201,168,76,0.05)';
        const _bd    = _isDone ? 'rgba(16,185,129,0.3)'  : 'rgba(201,168,76,0.22)';
        const _lbClr = _isDone ? 'rgba(16,185,129,0.7)'  : 'rgba(201,168,76,0.6)';
        const _btnHtml = _isDone ? '' : `<button id="mirror-one-point-btn" data-curstat="${_isActive ? 'active' : ''}" style="display:block;width:100%;padding:10px;margin-top:12px;background:${_isActive ? 'rgba(16,185,129,0.12)' : 'rgba(201,168,76,0.08)'};border:1px solid ${_isActive ? 'rgba(16,185,129,0.35)' : 'rgba(201,168,76,0.3)'};border-radius:8px;font-size:13px;font-weight:700;color:${_isActive ? '#10b981' : '#c9a84c'};cursor:pointer;font-family:inherit">${_isActive ? 'やった！（完了を記録）' : '今月やってみる →'}</button>`;
        const _checkMark = _isDone ? `<span style="font-size:18px;color:#10b981;flex-shrink:0">✓</span>` : '';
        return `<div id="mirror-one-point-widget" style="margin:0 0 16px;padding:16px 18px;background:${_bg};border:1px solid ${_bd};border-radius:12px"><p style="font-size:10px;font-weight:800;color:${_lbClr};letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">Mirror — この30日で動かす1点</p><div style="display:flex;align-items:center;gap:12px"><span style="font-size:24px;flex-shrink:0">${_axIcon}</span><div style="flex:1"><p style="font-size:14px;font-weight:800;color:rgba(232,228,220,0.9);margin:0 0 2px">${_axName}</p><p style="font-size:11px;color:rgba(232,228,220,0.5);margin:0">この1点だけ、今月やってみよう</p></div>${_checkMark}</div>${_btnHtml}</div>`;
      })()}

      ${buildConfirmedInsightsHtml()}

      ${buildAxisFilterBar()}

      <div id="sections-container">
        ${buildPathHtml()}
      </div>

      ${buildMatchedProductsHtml()}

      ${(serviceLogs.length >= 1 && Object.values(stepDone).filter(Boolean).length >= 3) ? `
      <div style="margin-top:28px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:16px;padding:24px 22px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">✍️</div>
        <p style="font-size:15px;font-weight:800;color:rgba(240,236,228,0.9);margin:0 0 8px;line-height:1.6">変化を感じ始めたら、あなたの物語を残しませんか？</p>
        <p style="font-size:12px;color:rgba(240,236,228,0.5);margin:0 0 18px;line-height:1.75">あなたの一歩は、同じ悩みを抱える誰かの地図になります。<br>かかった期間・変わったこと——リアルな記録が誰かの背中を押します。</p>
        <a href="/mypage/story-submit" style="display:inline-block;font-size:14px;font-weight:800;padding:12px 28px;background:linear-gradient(135deg,#c9a84c,#e8c97a);border-radius:10px;color:#0a0f1e;text-decoration:none;box-shadow:0 4px 18px rgba(201,168,76,0.25)">体験談を書く →</a>
      </div>` : ''}

      <div class="navi-footer">
        <a href="/mypage/log" class="navi-footer-btn nfb-secondary" style="border-color:rgba(201,168,76,0.45)">📖 New Me Log — サービスを管理する</a>
        <a href="${TRACK.diagnosisResult}" class="navi-footer-btn nfb-secondary">📋 診断結果を見る</a>
        <a href="${TRACK.diagnosis}" class="navi-footer-btn nfb-ghost">Me Scanを再スキャンする</a>
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

    // 動かす1点 トグルボタン
    document.getElementById('mirror-one-point-btn')?.addEventListener('click', () => {
      try {
        const saved = JSON.parse(localStorage.getItem('fineme:mirror:one-point') || 'null');
        if (!saved) return;
        const nextStatus = saved.status === 'active' ? 'done' : 'active';
        saved.status = nextStatus;
        localStorage.setItem('fineme:mirror:one-point', JSON.stringify(saved));
        const widget = document.getElementById('mirror-one-point-widget');
        const btn = document.getElementById('mirror-one-point-btn');
        if (!widget || !btn) return;
        if (nextStatus === 'done') {
          widget.style.background = 'rgba(16,185,129,0.06)';
          widget.style.borderColor = 'rgba(16,185,129,0.3)';
          const lbl = widget.querySelector('p[style*="letter-spacing"]');
          if (lbl) lbl.style.color = 'rgba(16,185,129,0.7)';
          const flex = widget.querySelector('[style*="display:flex"]');
          if (flex) flex.insertAdjacentHTML('beforeend', '<span style="font-size:18px;color:#10b981;flex-shrink:0">✓</span>');
          btn.remove();
        } else {
          btn.dataset.curstat = 'active';
          btn.textContent = 'やった！（完了を記録）';
          btn.style.background = 'rgba(16,185,129,0.12)';
          btn.style.borderColor = 'rgba(16,185,129,0.35)';
          btn.style.color = '#10b981';
        }
      } catch {}
    });

    // 波及チェックイン（優しさの循環。答えはbody_dataに月1件だけ蓄積）
    document.querySelectorAll('.kindness-checkin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const jst = new Date(Date.now() + 9 * 3600000);
        const thisMonth = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}`;
        const checkins = Array.isArray(bodyData.kindness_checkins) ? bodyData.kindness_checkins : [];
        checkins.push({ month: thisMonth, answer: btn.dataset.answer });
        bodyData.kindness_checkins = checkins;
        try { localStorage.setItem(BODY_DATA_KEY, JSON.stringify(bodyData)); } catch {}
        if (token) {
          fetch('/api/me/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ body_data: bodyData }),
          }).catch(() => {});
        }
        const widget = document.getElementById('kindness-checkin-widget');
        if (widget) widget.outerHTML = `<div class="wcw"><p style="font-size:12px;color:rgba(201,168,76,0.7);margin:0;line-height:1.6">教えてくれてありがとう。その小さな一つが、ちゃんと積み重なっています。</p></div>`;
      });
    });
    document.getElementById('kindness-checkin-skip')?.addEventListener('click', () => {
      document.getElementById('kindness-checkin-widget')?.remove();
    });

    // 週次チェックイン やったボタン
    document.getElementById('weekly-checkin-btn')?.addEventListener('click', () => {
      try {
        const CHECKIN_KEY = 'fineme:navi:weekly-checkin';
        const cd = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
        if (!cd) return;
        cd.status = 'done';
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(cd));
        const widget = document.getElementById('weekly-checkin-widget');
        const btn = document.getElementById('weekly-checkin-btn');
        if (!widget || !btn) return;
        widget.classList.add('wcw-done');
        const eyebrow = widget.querySelector('.wcw-eyebrow');
        if (eyebrow) eyebrow.style.color = 'rgba(16,185,129,0.65)';
        const current = widget.querySelector('.wcw-current');
        if (current) current.insertAdjacentHTML('beforeend', '<span class="wcw-check">✓</span>');
        const msg = document.createElement('p');
        msg.className = 'wcw-done-msg';
        msg.textContent = '1点、動かせたね。来週の羅針盤もここにある。';
        btn.replaceWith(msg);
      } catch {}
    });

    // 継続確認（このまま続ける／ペースを落とす／別の一手に変える）
    document.getElementById('wcw-continuity')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.wcw-continuity-opt');
      if (!btn) return;
      const choice = btn.dataset.choice;
      try {
        const CHECKIN_KEY = 'fineme:navi:weekly-checkin';
        const cd = JSON.parse(localStorage.getItem(CHECKIN_KEY) || 'null');
        if (cd) {
          cd.continuityAsked = true;
          cd.continuityChoice = choice;
          localStorage.setItem(CHECKIN_KEY, JSON.stringify(cd));
        }
      } catch {}
      const ACK = { keep: 'そのまま続けよう。焦らなくて大丈夫。', slow: 'ペースを落として大丈夫。少しずつでいい。', change: '次のMap更新で、別の一手に切り替えます。' };
      const wrap = document.getElementById('wcw-continuity');
      if (wrap) wrap.outerHTML = `<p class="wcw-continuity-ack">${ACK[choice] || '記録しました。'}</p>`;
    });

    // サービスカードを非同期注入
    injectServiceCards();

    // ゲームマップのコネクター描画（DOMが確定してから）
    requestAnimationFrame(() => requestAnimationFrame(drawGmapConnectors));

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
      // TRACK_MILESTONES の出発前チェックバナー
      const banner = document.getElementById('prereq-banner');
      if (banner) {
        const { done, total, allDone } = getAllPrereqInfo();
        if (allDone) { banner.remove(); }
        else {
          const countEl = banner.querySelector('.prereq-banner-count');
          if (countEl) countEl.textContent = `${done}/${total} チェック済み`;
        }
      }
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

    function showAxisCompleteCelebration(axisId) {
      const def = AREA_DEFS[axisId] || {};
      const nextAxisId = priorityOrder.find(id => axisProgress[id] !== 'done');
      const nextDef = nextAxisId ? AREA_DEFS[nextAxisId] : null;
      let toast = document.getElementById('axis-complete-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'axis-complete-toast';
        toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(120px);background:linear-gradient(135deg,#c9a84c 0%,#a0832b 100%);color:#0a0f1e;border-radius:18px;padding:18px 24px;display:flex;align-items:center;gap:14px;box-shadow:0 8px 36px rgba(201,168,76,.4);transition:transform .45s cubic-bezier(.34,1.56,.64,1);z-index:9999;pointer-events:none;width:min(360px,calc(100vw - 40px))';
        document.body.appendChild(toast);
      }
      const nextMsg = nextDef ? `次は ${nextDef.icon} ${nextDef.label}軸へ` : 'すべての軸が前進中！';
      toast.innerHTML = `<div style="font-size:28px;flex-shrink:0">🏁</div><div><p style="font-size:15px;font-weight:800;margin:0 0 3px">${esc(def.icon)} ${esc(def.label)}軸 — ひと段落！</p><p style="font-size:12px;opacity:.85;margin:0">${nextMsg}</p></div>`;
      requestAnimationFrame(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; });
      setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(120px)'; }, 4500);
      const colors = ['#c9a84c','#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6'];
      for (let i = 0; i < 36; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const size = 5 + Math.random() * 7;
        el.style.cssText = `left:${Math.random()*100}vw;width:${size}px;height:${size}px;background:${colors[i%colors.length]};animation-duration:${2+Math.random()*2.5}s;animation-delay:${Math.random()*.8}s`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
      }
    }

    function _updateProgressBar() {
      const pbFill = document.querySelector('.progress-bar-fill');
      const pbPct  = document.querySelector('.progress-bar-pct');
      const pbSub  = document.querySelector('.progress-bar-sub');
      if (!pbFill) return;
      let _done, _total;
      if (naviStepsData?.steps?.length) {
        _total = naviStepsData.steps.length;
        _done  = naviStepsData.steps.filter(s => stepDone[s.id]).length;
      } else {
        const _all = flattenAllSteps();
        _done  = _all.filter(s => s.isDone).length;
        _total = _all.length;
      }
      const _pct = _total > 0 ? Math.round(_done / _total * 100) : 0;
      pbFill.style.width = _pct + '%';
      if (pbPct) pbPct.textContent = _pct + '%';
      if (pbSub) pbSub.textContent = `${_done} / ${_total} ステップ完了`;
    }

    function refreshCompassOnly() {
      const strip = document.getElementById('compass-strip');
      if (strip) { const tmp = document.createElement('div'); tmp.innerHTML = buildCompassHtml(); strip.replaceWith(tmp.firstElementChild); }
      const tqEl = document.getElementById('todayquest-container');
      if (tqEl) tqEl.innerHTML = buildTodayQuestHtml();
      const jovEl = document.getElementById('jov-section');
      if (jovEl) { const tmp = document.createElement('div'); tmp.innerHTML = buildJourneyOverviewHtml(); const newJov = tmp.querySelector('#jov-section'); if (newJov) jovEl.replaceWith(newJov); }
      const bar = document.getElementById('axis-filter-bar');
      if (bar) { const tmp = document.createElement('div'); tmp.innerHTML = buildAxisFilterBar(); bar.replaceWith(tmp.firstElementChild); }
    }

    function refreshCompassAndTracks() {
      const strip = document.getElementById('compass-strip');
      if (strip) { const tmp = document.createElement('div'); tmp.innerHTML = buildCompassHtml(); strip.replaceWith(tmp.firstElementChild); }
      const tqEl = document.getElementById('todayquest-container');
      if (tqEl) tqEl.innerHTML = buildTodayQuestHtml();
      const jovEl = document.getElementById('jov-section');
      if (jovEl) { const tmp = document.createElement('div'); tmp.innerHTML = buildJourneyOverviewHtml(); const newJov = tmp.querySelector('#jov-section'); if (newJov) jovEl.replaceWith(newJov); }
      const container = document.getElementById('sections-container');
      if (container) container.innerHTML = buildPathHtml();
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
      if (btn.classList.contains('gmap-check-btn')) {
        btn.textContent = newDone ? '✓ 完了済み' : '✓ やった！';
      } else {
        btn.textContent = newDone ? '✓' : '';
      }
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
      // step-card (旧ジグザグルート 互換)
      const stepCard = btn.closest('.step-card');
      if (stepCard) {
        stepCard.classList.toggle('step-done', newDone);
        if (newDone && selfCheckMap.has(btn.dataset.doneKey)) {
          const container = document.getElementById('sections-container');
          if (container) { container.innerHTML = buildPathHtml(); injectServiceCards(); }
          _updateProgressBar();
          return;
        }
      }
      // path-node (ゲームマップ)
      const pathNode = btn.closest('.path-node');
      if (pathNode) {
        pathNode.classList.toggle('pn-done', newDone);
        const circle = pathNode.querySelector('.gm-circle');
        if (circle) {
          if (newDone) {
            circle.className = 'gm-circle gm-c-done';
            circle.dataset.done = 'true';
            circle.style.animation = '';
            requestAnimationFrame(drawGmapConnectors);
          } else {
            const container = document.getElementById('sections-container');
            if (container) {
              container.innerHTML = buildPathHtml();
              injectServiceCards();
              requestAnimationFrame(drawGmapConnectors);
              // 取り消し後：詳細パネルを再オープンしてスクロール
              const reNode = container.querySelector(`.path-node[data-done-key="${key}"]`);
              if (reNode) {
                const detail = reNode.querySelector('.path-node-detail');
                if (detail) detail.classList.add('pnd-open');
                setTimeout(() => reNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
              }
            }
            refreshCompassOnly();
            _updateProgressBar();
            return;
          }
        }
        if (newDone && selfCheckMap.has(btn.dataset.doneKey)) {
          const container = document.getElementById('sections-container');
          if (container) { container.innerHTML = buildPathHtml(); injectServiceCards(); requestAnimationFrame(drawGmapConnectors); }
        }
        refreshCompassOnly();
        _updateProgressBar();
        updatePrereqBanner();
        return;
      }
      updatePrereqBanner();
      if (newDone && (key.startsWith('prereq-') || key.includes('-b-'))) {
        const allBoxes     = document.querySelectorAll('.prereq-box');
        const checkedBoxes = document.querySelectorAll('.prereq-box.checked');
        if (allBoxes.length > 0 && allBoxes.length === checkedBoxes.length) {
          showPrereqCelebration();
        }
      }
    }

    function persistStepDone(key, newDone) {
      if (newDone) {
        stepDone[key] = true;
      } else if (key.startsWith('habit-')) {
        // 行動習慣ノードは未登録だと_autoDoneで「済み」に戻ってしまうため、
        // 手動で外した場合は明示的にfalseを保存して恒久的に取り消す
        stepDone[key] = false;
      } else {
        delete stepDone[key];
      }
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

    // ── パスノード タップ展開 ──
    root.addEventListener('click', (e) => {
      if (e.target.closest('.step-check-btn, .product-check-btn, .prereq-box, .step-detail-toggle, a')) return;
      const head = e.target.closest('[data-toggle-node]');
      if (!head) return;
      const node = head.closest('.path-node');
      const detail = node?.querySelector('.path-node-detail');
      if (!detail) return;
      detail.classList.toggle('pnd-open');
      const expandIcon = head.querySelector('.path-expand-icon');
      if (expandIcon) expandIcon.textContent = detail.classList.contains('pnd-open') ? '▲' : '▼';
      // detailの高さ変化に合わせてコネクターを再描画
      requestAnimationFrame(drawGmapConnectors);
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

    // ── 軸完了ボタン ──
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.jov-complete-btn');
      if (!btn) return;
      const axisId = btn.dataset.completeAxis;
      if (!axisId) return;
      btn.disabled = true;
      btn.textContent = '✓ 完了しました！';
      axisProgress[axisId] = 'done';
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(axisProgress)); } catch {}
      if (token) {
        fetch('/api/me/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ axis_progress: axisProgress }),
        }).catch(() => {});
      }
      showAxisCompleteCelebration(axisId);
      setTimeout(() => refreshCompassAndTracks(), 800);
    });


    // ── 旅を再生成するボタン ──
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('#navi-regen-btn');
      if (!btn || !token) return;
      btn.disabled = true;
      btn.textContent = '生成中… しばらくお待ちください';
      try {
        const diagRaw = localStorage.getItem(STORAGE_KEY);
        const diag = diagRaw ? JSON.parse(diagRaw) : null;
        if (!diag?.transform_vectors) { btn.textContent = '診断データが見つかりません'; return; }
        const bd = JSON.parse(localStorage.getItem(BODY_DATA_KEY) || '{}');
        const res = await fetch('/api/me/navi-steps/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ diagnosis: diag, body_data: bd }),
        });
        if (res.status === 429) { btn.textContent = '本日はすでに生成済みです。明日また生成できます。'; return; }
        if (!res.ok) { btn.textContent = '生成に失敗しました。再度お試しください'; btn.disabled = false; return; }
        const data = await res.json();
        naviStepsData = data.navi_steps;
        const container = document.getElementById('sections-container');
        if (container) container.innerHTML = buildPathHtml();
      } catch { btn.textContent = 'エラーが発生しました'; btn.disabled = false; }
    });

    } catch (err) {
      // エラーが発生した場合、読み込み中のまま固まらないようにする
      try {
        root.innerHTML = `<div class="no-data">
          <div class="no-data-icon">⚠️</div>
          <h2 class="no-data-title">読み込みエラー</h2>
          <p class="no-data-text">データの読み込みに失敗しました。<br>ページを再読み込みするか、Me Scanを受け直してください。</p>
          <p style="font-size:11px;color:#9ca3af;margin-bottom:20px">${err.message || ''}</p>
          <a href="${TRACK.diagnosis}" class="btn" style="display:inline-block;font-size:15px;font-weight:700;padding:14px 28px;margin-right:10px">Me Scanを受ける</a>
          <button onclick="location.reload()" style="font-size:14px;font-weight:600;padding:12px 24px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer">再読み込み</button>
        </div>`;
      } catch {}
    }

    })(); // async IIFE end

    return () => { document.head.removeChild(style); };
  }, []);

  // 診断軸に基づいて関連記事を取得（自分のトラックの記事だけ）
  useEffect(() => {
    let topAxes = [];
    try {
      const raw = localStorage.getItem(track.storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        topAxes = p.priority_order?.slice(0, 3) || (p.compass_first ? [p.compass_first] : []);
      }
    } catch {}

    fetch(`/api/features?track=${trackId}`)
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
  }, [trackId, track.storageKey]);

  return (
    <>
      <style>{`
        .navi-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; overflow-x: hidden; width: 100%; box-sizing: border-box; }
        /* グリッド子要素のはみ出し防止用ルールは削除した。子は.navi-sidenavと
           直下divのみで、どちらも既にmin-width:0を持つため冗長だった上、
           直接子孫を選ぶ記号を使うとJSXのstyleタグ内ではSSR時にエンティティへ
           変換されhydrationミスマッチを起こしていた（でお報告2026-08-27の原因。
           styleタグ内では記号そのものを書かないこと） */
        .navi-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; min-width: 0; }
        .navi-sidenav .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .navi-sidenav .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .navi-sidenav .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        @media (max-width: 640px) {
          .navi-layout { grid-template-columns: 1fr; padding: 16px 16px 60px; overflow-x: hidden; }
          .navi-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
          .navi-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; }
          .navi-sidenav nav::-webkit-scrollbar { display: none; }
          .navi-sidenav nav .sidenav-link { margin-top: 0 !important; }
          .navi-sidenav .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; }
          .navi-wrap { padding: 0 0 40px !important; width: 100%; box-sizing: border-box; overflow-x: hidden; }
        }

      `}</style>
      <main style={{overflowX:'hidden', width:'100%'}}>
        <div className="navi-layout">
          <MypageSideNav asideClassName="navi-sidenav" />
          <div style={{minWidth:0, overflow:'hidden'}}>
            <div id="navi-root">
              <p style={{textAlign:'center',padding:'60px 20px',color:'#9ca3af'}}>読み込み中…</p>
            </div>

            {/* 関連する読み物 */}
            {relatedArticles.length > 0 && (
              <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: `1px solid rgba(${track.accentRgb},0.15)` }}>
                <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: `rgba(${track.accentRgb},0.7)`, margin: '0 0 16px' }}>
                  あなたの変容に関連する読み物
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {relatedArticles.map(a => (
                    <Link key={a.id} href={track.articlePath(a.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{
                        display: 'flex', gap: '14px', alignItems: 'center',
                        padding: '14px', borderRadius: '12px',
                        border: `1px solid rgba(${track.accentRgb},0.15)`,
                        background: 'rgba(255,255,255,0.6)',
                        transition: 'border-color 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = `rgba(${track.accentRgb},0.4)`}
                        onMouseLeave={e => e.currentTarget.style.borderColor = `rgba(${track.accentRgb},0.15)`}
                      >
                        {a.thumbnail && (
                          <img src={a.thumbnail} alt={a.title}
                            style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {a.category && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: track.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{a.category}</span>
                          )}
                          <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 4px', lineHeight: 1.45, fontFamily: 'var(--font-serif)', color: '#0a0f1e' }}>{a.title}</p>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{a.reading_time || 5}分で読める</span>
                        </div>
                        <span style={{ fontSize: '16px', color: `rgba(${track.accentRgb},0.6)`, flexShrink: 0 }}>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                  <Link href={track.articles} style={{ fontSize: '12px', color: track.accent, textDecoration: 'none', fontWeight: 700 }}>
                    {track.label} {track.articlesLabel} を読む →
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
