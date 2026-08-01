'use client';
import { useEffect, useRef } from 'react';
import useTrack from '@/app/_hooks/useTrack';
import {
  axisChoicesFor, resolveAxis, CUSTOM_AXIS, CUSTOM_ICON_CHOICES, DEFAULT_CUSTOM_ICON,
  monthlyCost, costSummary, formatYen, BUDGET_LABELS,
  effectiveFreq, formatFreq, idealNextDate, daysUntilIdeal, FREQ_PRESETS,
  monthlyTrend, trendInsights,
} from '@/lib/log-axes';
import { listLogs, createLog, updateLog, removeLog, recordVisit, getAccessToken } from '@/lib/log-store';
import { TRACKS, DEFAULT_TRACK } from '@/lib/track';

// 次回日の算出は lib/log-axes.js の idealNextDate に統一した
// （週・月の両単位を扱うため。ここに週専用の計算を残すと二重管理になる）

// 日付 → 「〇日後」「今日」「〇日前」
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  if (diff === 0) return '今日';
  if (diff > 0) return `${diff}日後`;
  return `${-diff}日前`;
}

// 前回からの経過（通知文・カード表示に使う）
function weeksSince(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000 / 7);
  return diff >= 0 ? diff : null;
}

export default function ServiceLog({ withSideNav = false }) {
  const { trackId } = useTrack();
  const initialized = useRef(false);
  const trackRef = useRef(trackId);
  trackRef.current = trackId;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .log-wrap { max-width: 100%; padding: 0 0 100px; }

      /* ── Header ── */
      .log-header { background: linear-gradient(rgba(10,15,30,0.82), rgba(10,15,30,0.92)), url('/assets/images/hero-bg.webp') center/cover no-repeat; border-radius: 14px; padding: 22px 22px 18px; margin-bottom: 24px; border: 1px solid rgba(201,168,76,0.2); position: relative; overflow: hidden; }
      .log-header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 8px; text-transform: uppercase; }
      .log-header h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,4vw,24px); font-weight: 700; color: #fff; margin: 0 0 6px; }
      .log-header h1 em { font-style: normal; color: #c9a84c; }
      .log-header-sub { font-size: 12px; color: rgba(232,228,220,0.45); margin: 0; line-height: 1.6; }

      /* ── Add button ── */
      .log-add-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: rgba(201,168,76,0.08); border: 1.5px dashed rgba(201,168,76,0.4); border-radius: 12px; color: #c9a84c; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; margin-bottom: 24px; }
      .log-add-btn:hover { background: rgba(201,168,76,0.14); border-color: #c9a84c; }

      /* ── Service card ── */
      .log-axis-section { margin-bottom: 24px; }
      .log-axis-label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(201,168,76,0.6); margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
      .log-axis-label::after { content: ''; flex: 1; height: 1px; background: rgba(201,168,76,0.15); }
      .log-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.12); border-radius: 14px; padding: 16px 18px; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,.35); transition: border-color .2s; }
      .log-card:not(:last-child) { margin-bottom: 10px; }
      .log-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .log-card-name { font-size: 16px; font-weight: 800; color: rgba(232,228,220,0.92); margin: 0 0 4px; }
      .log-card-provider-link { font-size: 11px; color: rgba(201,168,76,0.7); text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
      .log-card-provider-link:hover { color: #c9a84c; text-decoration: underline; }
      .log-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
      .log-card-edit-btn, .log-card-del-btn { font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 7px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; border: 1px solid; }
      .log-card-edit-btn { color: rgba(232,228,220,0.6); border-color: rgba(232,228,220,0.15); background: transparent; }
      .log-card-edit-btn:hover { border-color: #c9a84c; color: #c9a84c; }
      .log-card-del-btn { color: rgba(239,68,68,0.6); border-color: rgba(239,68,68,0.15); background: transparent; }
      .log-card-del-btn:hover { border-color: #ef4444; color: #ef4444; }
      .log-card-schedule { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
      .log-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 99px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); color: rgba(232,228,220,0.65); white-space: nowrap; }
      .log-chip.chip-next-soon { border-color: rgba(52,211,153,0.4); color: rgba(52,211,153,0.9); background: rgba(52,211,153,0.06); }
      .log-chip.chip-next-today { border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08); }
      .log-chip.chip-next-overdue { border-color: rgba(239,68,68,0.4); color: rgba(239,68,68,0.8); background: rgba(239,68,68,0.06); }
      .log-card-memo { font-size: 11px; color: rgba(232,228,220,0.38); margin: 8px 0 0; line-height: 1.55; }
      .log-card-ideal { font-size: 10px; color: rgba(201,168,76,0.5); margin: 6px 0 0; }

      /* ── Empty state ── */
      .log-empty { text-align: center; padding: 48px 20px; color: rgba(232,228,220,0.35); }
      .log-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .log-empty-text { font-size: 13px; line-height: 1.7; }

      /* ── Modal overlay ── */
      .log-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 999; display: flex; align-items: flex-end; justify-content: center; padding-bottom: env(safe-area-inset-bottom); }
      .log-modal-overlay.hidden { display: none; }
      .log-modal { background: #0e1528; border-radius: 20px 20px 0 0; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 24px 20px 40px; }
      .log-modal-title { font-size: 16px; font-weight: 800; color: rgba(232,228,220,0.9); margin: 0 0 20px; }
      .log-field { margin-bottom: 16px; }
      .log-field label { display: block; font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.7); letter-spacing: .08em; margin-bottom: 6px; text-transform: uppercase; }
      .log-field input, .log-field select, .log-field textarea { width: 100%; background: rgba(10,15,30,0.6); border: 1px solid rgba(232,228,220,0.15); border-radius: 9px; padding: 11px 13px; font-size: 14px; color: rgba(232,228,220,0.88); font-family: 'Noto Sans JP', sans-serif; outline: none; box-sizing: border-box; transition: border-color .15s; }
      .log-field input:focus, .log-field select:focus, .log-field textarea:focus { border-color: rgba(201,168,76,0.5); }
      .log-field textarea { resize: vertical; min-height: 64px; }
      .log-field select option { background: #0e1528; }
      .log-field-hint { font-size: 10px; color: rgba(232,228,220,0.3); margin: 4px 0 0; line-height: 1.5; }
      .log-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .log-provider-search { display: flex; gap: 8px; align-items: center; }
      .log-provider-search input { flex: 1; }
      .log-provider-clear { font-size: 11px; color: rgba(239,68,68,0.7); background: none; border: none; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; padding: 0; white-space: nowrap; }
      .log-provider-result { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
      .log-provider-item { padding: 8px 12px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.1); border-radius: 8px; cursor: pointer; font-size: 12px; color: rgba(232,228,220,0.75); transition: all .12s; }
      .log-provider-item:hover, .log-provider-item.selected { border-color: rgba(201,168,76,0.4); color: #c9a84c; background: rgba(201,168,76,0.06); }
      .log-modal-btns { display: flex; gap: 10px; margin-top: 24px; }
      .log-modal-save { flex: 1; padding: 14px; background: #c9a84c; border: none; border-radius: 11px; font-size: 15px; font-weight: 800; color: #0a0f1e; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: opacity .15s; }
      .log-modal-save:hover { opacity: .88; }
      .log-modal-cancel { padding: 14px 20px; background: transparent; border: 1px solid rgba(232,228,220,0.15); border-radius: 11px; font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.5); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; }

      /* ── FVカード（羊皮紙の航海日誌）──
         背景は Canva で作った案3そのもの（文字だけ削除して書き出したもの）。
         金額・内訳は実データで動くのでテキストで上に重ねる。
         背景画像に罫線が入っているので、テキストはその位置(%)に合わせて置く。 */
      .lfv-wrap { margin-bottom: 26px; }
      .lfv-card {
        width: 100%; max-width: 400px; margin: 0 auto;
        aspect-ratio: 1080 / 1350; position: relative;
        background: url('/assets/images/log-parchment-v2.webp') center/cover no-repeat;
        border-radius: 6px; box-shadow: 0 24px 60px rgba(0,0,0,.45);
        color: #3a2712; font-feature-settings: "palt";
        container-type: inline-size;
      }
      /* 背景の罫線に合わせた絶対配置。単位は cqw（カード幅基準）で拡縮に追従させる */
      .lfv-abs { position: absolute; left: 0; right: 0; text-align: center; }

      .lfv-brand { top: 13.67%; transform: translateY(-100%); padding-bottom: 1cqw; font-size: 4.2cqw; letter-spacing: .12em; color: #473020;
                   font-family: 'Noto Serif JP', Georgia, serif; }
      .lfv-date  { top: 13.67%; transform: translateY(-100%); padding-bottom: 1.2cqw; font-size: 3.1cqw; letter-spacing: .06em; color: rgba(71,48,32,.75);
                   font-variant-numeric: tabular-nums; }

      .lfv-label { top: 21.5%; font-size: 3.1cqw; letter-spacing: .3em; color: rgba(71,48,32,.8);
                   font-family: 'Noto Serif JP', serif; }
      .lfv-month { top: 25.5%; font-size: 13.4cqw; line-height: 1; color: #472000;
                   font-family: 'Noto Serif JP', Georgia, serif; font-weight: 500;
                   font-variant-numeric: tabular-nums; }
      .lfv-month-unit { top: 39.5%; font-size: 3.7cqw; letter-spacing: .08em; color: #473020;
                        font-family: 'Noto Serif JP', serif; }
      .lfv-year  { top: 45.2%; font-size: 3.1cqw; letter-spacing: .04em; color: rgba(71,48,32,.72);
                   font-variant-numeric: tabular-nums; }
      .lfv-year b { font-weight: 600; color: #472000; }

      .lfv-bd-head { top: 54.5%; font-size: 2.5cqw; letter-spacing: .28em; color: rgba(71,48,32,.8);
                     font-family: 'Noto Serif JP', serif; }

      /* 内訳は件数が可変（6件以上もある）。背景から罫線を消したので、
         エリア内に flex で流し、リーダー線は CSS で描く。 */
      .lfv-breakdown { position: absolute; left: 21%; right: 21%; top: 57%; bottom: 12.5%;
                       display: flex; flex-direction: column; justify-content: center; gap: 1.1cqw; }
      .lfv-row { display: flex; align-items: baseline; gap: 1.3cqw; line-height: 1.35; }
      .lfv-row-ico  { flex-shrink: 0; }
      .lfv-row-name { flex-shrink: 0; color: rgba(71,48,32,.9); white-space: nowrap;
                      overflow: hidden; text-overflow: ellipsis; max-width: 46%; }
      .lfv-row-lead { flex: 1; border-bottom: 1px dotted rgba(71,48,32,.45); transform: translateY(-0.35cqw); }
      .lfv-row-val  { flex-shrink: 0; color: #472000; font-family: 'Noto Serif JP', Georgia, serif;
                      font-variant-numeric: tabular-nums; }
      .lfv-more { text-align: center; font-size: 2.3cqw; color: rgba(71,48,32,.6); margin-top: .4cqw; }

      .lfv-foot { position: absolute; left: 12%; right: 12%; top: 90.5%;
                  display: flex; justify-content: space-between; align-items: baseline; }
      .lfv-ports { font-family: 'Noto Serif JP', serif; font-size: 2.9cqw; color: rgba(71,48,32,.8); }
      .lfv-site  { font-size: 2.4cqw; letter-spacing: .18em; color: rgba(71,48,32,.7); }

      .lfv-budget, .lfv-note { font-size: 11px; color: rgba(232,228,220,.38); margin: 10px auto 0; max-width: 400px; line-height: 1.75; }
      .lfv-note { color: rgba(232,228,220,.3); }
      .lfv-budget { color: rgba(232,228,220,.5); }

      /* ── 一番下の「次の一歩」── */
      .lnx { background: rgba(10,15,30,0.6); border: 1px solid rgba(201,168,76,0.26); border-radius: 14px; padding: 22px 22px 20px; margin: 28px 0 18px; }
      .lnx-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 16px; font-weight: 700; color: rgba(232,228,220,0.94); line-height: 1.6; margin: 0 0 12px; }
      .lnx-desc { font-size: 12.5px; color: rgba(232,228,220,0.5); line-height: 1.95; margin: 0 0 18px; }
      .lnx-cta { display: inline-block; padding: 12px 26px; background: linear-gradient(135deg,#c9a84c,#e8c86a); color: #0a0f1e; font-size: 13.5px; font-weight: 800; border-radius: 10px; text-decoration: none; }
      .lnx-note { font-size: 11px; color: rgba(232,228,220,0.32); margin: 10px 0 0; }
      .lnx-peek { background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.2); border-radius: 11px; padding: 15px 16px; margin: 0 0 18px; }
      .lnx-peek-head { font-size: 9.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: rgba(201,168,76,0.65); margin: 0 0 11px; }
      .lnx-peek-type { text-align: center; margin-bottom: 11px; }
      .lnx-peek-code { display: block; font-size: 9.5px; font-weight: 800; letter-spacing: .22em; color: rgba(201,168,76,0.7); margin-bottom: 3px; }
      .lnx-peek-name { display: block; font-family: 'Noto Serif JP', Georgia, serif; font-size: 19px; font-weight: 700; color: #e8e4dc; margin-bottom: 3px; }
      .lnx-peek-sub { display: block; font-size: 10px; color: rgba(232,228,220,0.35); }
      .lnx-peek-line { height: 1px; background: linear-gradient(90deg,transparent,rgba(201,168,76,0.22),transparent); margin-bottom: 11px; }
      .lnx-peek-first { font-size: 12px; color: rgba(232,228,220,0.8); margin: 0; line-height: 1.7; text-align: center; }
      .lnx-peek-first b { color: #c9a84c; }
      .lnx-peek-first span { font-size: 11px; color: rgba(232,228,220,0.42); }
      .lnx-peek-axis { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; color: rgba(232,228,220,0.75); padding: 5px 0; border-bottom: 1px solid rgba(232,228,220,0.06); }
      .lnx-peek-axis b { font-size: 11px; font-weight: 700; }
      .lnx-peek-axis .p3 { color: #c9a84c; }
      .lnx-peek-axis .p2 { color: rgba(201,168,76,0.6); }
      .lnx-peek-axis .p1 { color: rgba(232,228,220,0.3); }
      .lnx-peek-quote { font-size: 11.5px; color: rgba(232,228,220,0.55); line-height: 1.8; margin: 11px 0 0; padding-left: 10px; border-left: 2px solid rgba(201,168,76,0.3); }

      .log-chip-cost { border-color: rgba(201,168,76,0.35) !important; color: rgba(201,168,76,0.85) !important; }

      /* ── 頻度（数値＋単位／プリセット） ── */
      .log-freq-row { display: flex; gap: 8px; }
      .log-freq-row input { flex: 1; }
      .log-freq-row select { flex: 0 0 108px; }
      .log-freq-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .log-freq-chip { font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 99px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); transition: all .12s; }
      .log-freq-chip:hover { border-color: rgba(201,168,76,0.5); color: rgba(232,228,220,0.9); }
      .log-freq-chip.selected { border-color: #c9a84c; background: rgba(201,168,76,0.14); color: #c9a84c; }

      /* ── 「行った」の記録（1タップ） ── */
      .log-card-visit { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(232,228,220,0.07); }
      .log-visit-today, .log-visit-pick { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; box-sizing: border-box; }
      .log-visit-today { background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.4); color: #c9a84c; }
      .log-visit-today:hover { background: rgba(201,168,76,0.2); }
      .log-visit-pick { background: rgba(232,228,220,0.04); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); }
      .log-visit-pick:hover { border-color: rgba(201,168,76,0.4); color: rgba(232,228,220,0.85); }
      /* showPicker() を呼ぶための実体。display:none だと呼べないので opacity で隠す */
      .log-visit-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: 0; padding: 0; margin: 0; }
      .log-visit-today:disabled, .log-visit-pick:disabled { opacity: .6; cursor: default; }

      /* 記録できたことを目に見える形で返す */
      .log-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(18px);
        background: linear-gradient(135deg,#c9a84c,#e8c86a); color: #0a0f1e; padding: 12px 24px; border-radius: 99px;
        font-size: 13.5px; font-weight: 800; font-family: 'Noto Sans JP', sans-serif; white-space: nowrap;
        opacity: 0; pointer-events: none; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,.45);
        transition: opacity .22s ease, transform .22s ease; }
      .log-toast.is-on { opacity: 1; transform: translateX(-50%) translateY(0); }
      .log-card.is-flash { animation: logCardFlash 1.5s ease-out; }
      @keyframes logCardFlash {
        0%   { border-color: #c9a84c; background: rgba(201,168,76,0.20); }
        60%  { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.08); }
        100% { border-color: rgba(232,228,220,0.12); background: rgba(10,15,30,0.65); }
      }
      @media (prefers-reduced-motion: reduce) {
        .log-toast { transition: none; }
        .log-card.is-flash { animation: none; box-shadow: 0 0 0 2px rgba(201,168,76,.6); }
      }

      /* ── カスタム軸のアイコン選択 ── */
      .log-icon-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
      .log-icon-choice { width: 38px; height: 38px; font-size: 18px; line-height: 1; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); border-radius: 10px; cursor: pointer; transition: all .12s; }
      .log-icon-choice:hover { border-color: rgba(201,168,76,0.5); }
      .log-icon-choice.selected { border-color: #c9a84c; background: rgba(201,168,76,0.14); }

      /* ── 未ログイン向けの保存導線 ── */
      .log-guest-cta { margin-top: 28px; background: linear-gradient(160deg, rgba(12,18,38,0.98), rgba(8,12,26,0.98)); border: 1px solid rgba(201,168,76,0.28); border-radius: 16px; padding: 24px 22px; text-align: center; }
      .log-guest-cta-title { font-size: 15px; font-weight: 800; color: #e8e4dc; margin: 0 0 8px; }
      .log-guest-cta-desc { font-size: 12px; color: rgba(232,228,220,0.5); margin: 0 0 18px; line-height: 1.8; }
      .log-guest-cta-btn { display: inline-block; padding: 13px 30px; background: linear-gradient(135deg,#c9a84c,#e8c86a); color: #0a0f1e; font-size: 14px; font-weight: 800; border-radius: 11px; text-decoration: none; }
      .log-guest-cta-note { font-size: 10px; color: rgba(232,228,220,0.25); margin: 10px 0 0; letter-spacing: .04em; }

      /* ── 支出の推移（.ltr- = Log TRend） ── */
      .ltr-wrap { background: rgba(10,15,30,0.6); border: 1px solid rgba(201,168,76,0.18); border-radius: 14px; padding: 22px 20px 20px; margin: 20px 0; }
      .ltr-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 15px; font-weight: 700; color: rgba(232,228,220,0.92); margin: 0 0 4px; }
      .ltr-caption { font-size: 11px; color: rgba(232,228,220,0.4); margin: 0 0 16px; }
      .ltr-chart-wrap { width: 100%; max-width: 336px; margin: 0 auto; }
      .ltr-svg { width: 100%; height: auto; display: block; }
      .ltr-baseline { stroke: rgba(232,228,220,0.15); stroke-width: 1; }
      .ltr-bar-label { font-size: 9px; fill: rgba(232,228,220,0.55); font-family: -apple-system, sans-serif; }
      .ltr-axis-label { font-size: 9.5px; fill: rgba(232,228,220,0.4); font-family: -apple-system, sans-serif; }
      .ltr-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 14px 0 0; padding-top: 14px; border-top: 1px solid rgba(232,228,220,0.08); }
      .ltr-legend-item { font-size: 11px; color: rgba(232,228,220,0.65); display: inline-flex; align-items: center; gap: 5px; }
      .ltr-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .ltr-note { font-size: 10.5px; color: rgba(232,228,220,0.32); margin: 10px 0 0; }
      .ltr-insights { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
      .ltr-insight { font-size: 12.5px; color: rgba(232,228,220,0.75); line-height: 1.7; margin: 0; padding: 10px 12px; background: rgba(201,168,76,0.06); border-radius: 9px; }
      .ltr-insight-empty { font-size: 11.5px; color: rgba(232,228,220,0.32); margin: 0; }
      .ltr-empty { text-align: center; padding: 20px 10px 6px; }
      .ltr-empty-icon { font-size: 26px; margin-bottom: 10px; opacity: .5; }
      .ltr-empty-text { font-size: 12px; color: rgba(232,228,220,0.4); line-height: 1.8; margin: 0; }
    `;
    document.head.appendChild(style);

    const root = document.getElementById('log-root');
    if (!root) return;

    let logs = [];
    let editingId = null;
    let providerSearchResults = [];
    let selectedProvider = null;
    let customIcon = DEFAULT_CUSTOM_ICON;
    let budget = null;
    let compassAxis = null;   // Me Scan が指す最初の一手
    let mirrorAxis = null;    // Mirror が指した1点
    let hasDiagnosis = false;
    let hasMirror = false;

    // Me Scan / Mirror の結果を読む。
    // 軸IDが Log と共通なので、通っている軸と突き合わせられる。
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle');
      if (raw) {
        const p = JSON.parse(raw);
        budget = p?.budget || null;
        compassAxis = p?.compass_first || p?.priority_order?.[0] || null;
        hasDiagnosis = !!compassAxis;
      }
    } catch {}
    try {
      const op = JSON.parse(localStorage.getItem('fineme:mirror:one-point') || 'null');
      if (op?.axisId) { mirrorAxis = op.axisId; hasMirror = true; }
    } catch {}
    // one-point が無くてもMirror実施済みのことがあるためセッションでも判定する
    if (!hasMirror) {
      try { hasMirror = !!JSON.parse(localStorage.getItem('fineme:mirror:sessions') || '[]').length; } catch {}
    }

    const isLoggedIn = () => !!getAccessToken();

    async function fetchLogs() {
      try { logs = await listLogs(); } catch { logs = []; }
    }

    // ── Finemeプロバイダー検索 ──
    async function searchProviders(q) {
      if (!q.trim()) { providerSearchResults = []; renderProviderResults(); return; }
      try {
        const r = await fetch(`/api/providers?q=${encodeURIComponent(q)}&limit=5`);
        const d = await r.json();
        providerSearchResults = (d.providers || []).slice(0, 5);
      } catch { providerSearchResults = []; }
      renderProviderResults();
    }

    function renderProviderResults() {
      const el = document.getElementById('log-provider-results');
      if (!el) return;
      if (!providerSearchResults.length) { el.innerHTML = ''; return; }
      el.innerHTML = providerSearchResults.map(p => {
        const isSelected = selectedProvider?.slug === p.slug;
        return `<div class="log-provider-item${isSelected ? ' selected' : ''}" data-slug="${p.slug}" data-type="${p.entity_type || 'provider'}" data-name="${encodeURIComponent(p.name || '')}">${p.entity_type === 'affiliate' ? '🔗 ' : '🏥 '}${esc(p.name)}</div>`;
      }).join('');
    }

    function nextChipClass(dateStr) {
      if (!dateStr) return '';
      const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
      if (diff < 0)  return 'chip-next-overdue';
      if (diff === 0) return 'chip-next-today';
      if (diff <= 7) return 'chip-next-soon';
      return '';
    }

    // ── 費用サマリー ──
    // 頻度が無いものは月額換算せず合計にも入れない（推測で数字を作らない）
    // ── FVカード（海図に記した投資額。スクショ1枚でそのまま素材になる）──
    // 月額を主役にする。年額は「このペースが続くとこうなる」を示す補足に留める。
    function renderCostCard() {
      const s = costSummary(logs);
      if (!s.counted) return '';

      // 件数は可変。多いほど小さく組み、8件を超える分はまとめて示す。
      const MAX_ROWS = 8;
      const shown = s.byAxis.slice(0, MAX_ROWS);
      const rest = s.byAxis.length - shown.length;
      const fs = shown.length <= 5 ? 2.9 : shown.length <= 7 ? 2.6 : 2.35;
      const rows = shown.map(row => {
        const def = resolveAxis(row.axis, row.customIcon);
        return `
          <div class="lfv-row" style="font-size:${fs}cqw">
            <span class="lfv-row-ico">${def.icon}</span>
            <span class="lfv-row-name">${esc(def.label)}</span>
            <span class="lfv-row-lead"></span>
            <span class="lfv-row-val">${row.estimated ? '約' : ''}${formatYen(row.monthly)}</span>
          </div>`;
      }).join('') + (rest > 0 ? `<div class="lfv-more">ほか ${rest}件</div>` : '');

      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const portCount = logs.length;

      const budgetLine = budget && BUDGET_LABELS[budget] ? `
        <p class="lfv-budget">Me Scan では「${BUDGET_LABELS[budget]}」と答えていました</p>` : '';
      const noteLines = [
        s.estimated ? '「約」は軸ごとの目安の頻度で計算した分です（頻度を入れると実額に変わります）' : '',
        s.unknown ? `＋ ${s.unknown}件は頻度の目安がないため合計に入れていません` : '',
      ].filter(Boolean).map(t => `<p class="lfv-note">${t}</p>`).join('');

      return `
        <div class="lfv-wrap">
          <div class="lfv-card">
            <div class="lfv-abs lfv-brand" style="left:12%;right:auto;text-align:left">New Me Log</div>
            <div class="lfv-abs lfv-date" style="left:auto;right:12%;text-align:right">${ym}</div>

            <div class="lfv-abs lfv-label">自分への投資</div>
            <div class="lfv-abs lfv-month">${formatYen(s.monthly)}</div>
            <div class="lfv-abs lfv-month-unit">1ヶ月あたり</div>
            <div class="lfv-abs lfv-year">このまま1年で <b>${formatYen(s.yearly)}</b></div>

            <div class="lfv-abs lfv-bd-head">投 資 記 録</div>
            <div class="lfv-breakdown">${rows}</div>

            <div class="lfv-foot">
              <span class="lfv-ports">${portCount}つの港を巡っている</span>
              <span class="lfv-site">fineme.me</span>
            </div>
          </div>
          ${budgetLine}
          ${noteLines}
        </div>`;
    }

    // ── 支出の推移（サブスクBox的なグラフ・傾向分析）──
    //
    // costSummary()（FVカード）は「今の設定から計算した現時点のスナップショット」。
    // こちらは実際に記録した来店（log.visits）を月ごとに積み上げた時系列で、
    // 「✓ 今日行った」を押すたびに少しずつ精度が上がっていく。
    //
    // 記録一覧の下・次の一歩ブロックの上に置く：ここもまだ「ツールとして使い切る」区間の
    // 続きであり、他機能への誘導ではないため、FV直下を避けるルールとは別枠。
    const TREND_COLORS = ['#3987e5', '#d95926', '#199e70']; // 青・橙・アクア（dataviz skillでdark background検証済）
    const TREND_OTHER_COLOR = '#6b7280'; // 4位以下をまとめる「その他」

    function renderTrendSection() {
      if (!logs.length) return '';
      const trend = monthlyTrend(logs, 6);

      if (!trend.hasAnyVisit) {
        return `
          <div class="ltr-wrap">
            <p class="ltr-title">支出の推移</p>
            <div class="ltr-empty">
              <div class="ltr-empty-icon">📈</div>
              <p class="ltr-empty-text">「✓ 今日行った」を記録していくと、<br>ここに月ごとの推移が表示されます。</p>
            </div>
          </div>`;
      }

      // 色は「この時点での期間合計ランキング」で上位3軸に固定割り当て、4位以下は「その他」
      const topAxes = trend.totalByAxis.slice(0, 3).map((a, i) => ({ ...a, color: TREND_COLORS[i] }));
      const axisColor = {};
      topAxes.forEach(a => { axisColor[a.axis] = a.color; });
      const otherTotal = trend.totalByAxis.filter(a => !axisColor[a.axis]).reduce((s, a) => s + a.amount, 0);

      // ── SVG積み上げ棒グラフ（viewBox 0 0 336 168）──
      const bandW = 336 / trend.months.length;
      const barW = 22;
      const baseline = 148;
      const plotH = 126;
      const svgBars = trend.months.map((m, i) => {
        const x = i * bandW + (bandW - barW) / 2;
        const segments = [
          ...topAxes.map(a => ({ color: a.color, amount: m.byAxis.find(x2 => x2.axis === a.axis)?.amount || 0 })),
          { color: TREND_OTHER_COLOR, amount: m.byAxis.filter(x2 => !axisColor[x2.axis]).reduce((s, x2) => s + x2.amount, 0) },
        ].filter(s => s.amount > 0);
        let y = baseline;
        const rects = segments.map(s => {
          const h = trend.max > 0 ? Math.max(2, (s.amount / trend.max) * plotH) : 0;
          y -= h;
          return `<rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${Math.max(0, h - 1).toFixed(1)}" rx="3" fill="${s.color}" />`;
        }).join('');
        const totalLabel = m.total > 0
          ? `<text x="${x + barW / 2}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="ltr-bar-label">${esc(formatYen(m.total))}</text>`
          : '';
        return `${rects}${totalLabel}<text x="${x + barW / 2}" y="164" text-anchor="middle" class="ltr-axis-label">${esc(m.label)}</text>`;
      }).join('');

      const svg = `
        <svg class="ltr-svg" viewBox="0 0 336 168" role="img" aria-label="直近6ヶ月の月別支出推移グラフ">
          <line x1="0" y1="${baseline}" x2="336" y2="${baseline}" class="ltr-baseline" />
          ${svgBars}
        </svg>`;

      // ── 凡例 ──
      const legendItems = [
        ...topAxes.filter(a => a.amount > 0),
        ...(otherTotal > 0 ? [{ icon: '✦', label: 'その他', color: TREND_OTHER_COLOR, amount: otherTotal }] : []),
      ];
      const legend = legendItems.length ? `
        <div class="ltr-legend">
          ${legendItems.map(a => `
            <span class="ltr-legend-item">
              <span class="ltr-legend-dot" style="background:${a.color}"></span>
              ${a.icon} ${esc(a.label)} ${esc(formatYen(a.amount))}
            </span>`).join('')}
        </div>` : '';

      const unknownCount = trend.months.reduce((s, m) => s + m.unknownCostCount, 0);
      const unknownNote = unknownCount
        ? `<p class="ltr-note">金額未入力の記録が${unknownCount}件あり、合計には含めていません</p>` : '';

      // ── 気づき ──
      const insights = trendInsights(logs, 6);
      const insightsHtml = insights.length
        ? insights.map(ins => `<p class="ltr-insight">${ins.icon} ${esc(ins.text)}</p>`).join('')
        : `<p class="ltr-insight-empty">気づきはまだありません。記録が数ヶ月分たまると、ここに表示されます。</p>`;

      return `
        <div class="ltr-wrap">
          <p class="ltr-title">支出の推移</p>
          <p class="ltr-caption">直近6ヶ月、記録した来店から</p>
          <div class="ltr-chart-wrap">${svg}</div>
          ${legend}
          ${unknownNote}
          <div class="ltr-insights">${insightsHtml}</div>
        </div>`;
    }

    // ── 一番下に置く「次の一歩」──
    //
    // FV直下には置かない。Log に来る人の大半は Fineme を知らず、まだ「変わりたい」とも
    // 認めていない。記録として使い切った後（＝一番下）で初めて次の話が耳に入る。
    //
    // 文面の原則（でお指摘 2026-07-27）：
    //   ・内部用語（New Me Map / Me Scan / Mirror / 現在地）を説明なしで使わない。
    //     読む人の頭の中に無い言葉で書くと「は？」で終わる
    //   ・LPと同じ組み立てにする＝ 問いかけ → 共感 → でも実はこう → だからこれ → 行動
    //   ・金額は「多い/少ない」の評価ではなく「何を根拠に配分したか」の材料として使う
    //   ・CTAのラベルに機能名を使わない。何が起きるかで書く
    function renderNextStep() {
      if (!logs.length) return '';
      const TRACK = TRACKS[trackRef.current] || TRACKS[DEFAULT_TRACK];
      const s = costSummary(logs);
      const loggedIn = isLoggedIn();

      // ① 費用がまだ無い
      if (!s.counted) {
        return `
          <div class="lnx">
            <p class="lnx-title">1回いくら払っているか、覚えていますか</p>
            <p class="lnx-desc">
              金額を入れると、月にいくら・年にいくら使っているかが出ます。<br>
              どこにどれだけかけているかが見えると、見直す時の土台になります。
            </p>
          </div>`;
      }

      // 上位2件を文中で使う（自分の話だと分かるように）
      const top = s.byAxis.slice(0, 2).map(r => {
        const d = resolveAxis(r.axis, r.customIcon);
        return `${d.label}に月 ${formatYen(r.monthly)}`;
      }).join('、');

      // ② 診断がまだ → 順番の話。
      // 文章だけでは動かないので「何が返ってくるか」を見せ、入口は30秒の1問に下げる
      // （/diagnosis は最初に1問お試しが出る作りになっている）。
      if (!hasDiagnosis) {
        return `
          <div class="lnx">
            <p class="lnx-title">その配分、何を根拠に決めましたか</p>
            <p class="lnx-desc">
              ${esc(top)}。<br>
              たぶん「なんとなく気になるところ」から順に始めたはずです。<br><br>
              ただ、見た目が変わって見えるかどうかは、手をつける順番でかなり変わります。
              髪を変える前に眉を整えた方が効く人もいれば、その逆の人もいる。
              いま多くかけている場所を減らしても、印象がほとんど落ちないこともあります。
            </p>

            <div class="lnx-peek">
              <p class="lnx-peek-head">答えると、こういうものが出ます</p>
              <div class="lnx-peek-type">
                <span class="lnx-peek-code">TYPE-HND</span>
                <span class="lnx-peek-name">黒髪の臥す伏竜</span>
                <span class="lnx-peek-sub">136タイプのうちの1つ</span>
              </div>
              <div class="lnx-peek-line"></div>
              <p class="lnx-peek-first">最初の一手 — <b>💇 髪・ヘア</b><br>
                <span>髪型は第一印象の3割。美容院1回で変化を体感できる</span></p>
            </div>

            <a class="lnx-cta" href="${TRACK.diagnosis}">まず1問だけ、30秒で →</a>
            <p class="lnx-note">登録不要。1問で「最初の一手」が出ます。もっと知りたければそのまま8軸へ（約3分）。</p>
          </div>`;
      }

      // ③ Mirror がまだ → 自分では見えない、の話。
      // 写真を送るのはハードルが高いので、返ってくるものを具体的に見せる。
      if (!hasMirror) {
        return `
          <div class="lnx">
            <p class="lnx-title">鏡で見ているのは、見慣れた自分です</p>
            <p class="lnx-desc">
              ${esc(top)}。<br>
              その配分は、自分が気になるところから決めたはずです。<br><br>
              ただ、人が最初に見ている場所と、自分が気にしている場所は、だいたいズレます。
              自分の顔を他人の目で見ることは、どうやってもできないからです。
            </p>

            <div class="lnx-peek">
              <p class="lnx-peek-head">写真1枚で、こう返ってきます</p>
              <div class="lnx-peek-axis"><span>💇 髪・ヘア</span><b class="p3">変わる余地 ★★★</b></div>
              <div class="lnx-peek-axis"><span>✂️ 眉</span><b class="p2">★★☆</b></div>
              <div class="lnx-peek-axis"><span>✨ 肌</span><b class="p1">★☆☆</b></div>
              <p class="lnx-peek-quote">「毛先の重さが顔の輪郭を覆っていて、
                縦のラインが出ていません。長さを変えずに量を落とすだけで印象が変わります」</p>
            </div>

            <a class="lnx-cta" href="${TRACK.mirror}">写真で確かめる →</a>
            <p class="lnx-note">8つの要素を1つずつ見て、いちばん動かす価値がある場所を返します。写真は分析後に削除。</p>
          </div>`;
      }

      // ④ 両方済み → 次にやることが決まっている
      if (!loggedIn) {
        return `
          <div class="lnx">
            <p class="lnx-title">次にやることは、もう出ています</p>
            <p class="lnx-desc">
              診断と写真の結果から、いま動かすと効く一点が決まっています。
              アカウントを作ると、その一点と、ここに登録した通い先が1つの画面にまとまります。
            </p>
            <a class="lnx-cta" href="/login?mode=signup&next=/mypage/navi">無料で受け取る →</a>
          </div>`;
      }
      return `
        <div class="lnx">
          <p class="lnx-title">次にやることは、もう出ています</p>
          <p class="lnx-desc">
            診断と写真の結果から、いま動かすと効く一点が決まっています。
            ここに登録した通い先も、その画面に並んでいます。
          </p>
          <a class="lnx-cta" href="/mypage/navi">今月やることを見る →</a>
        </div>`;
    }

    // ── ゲスト向けの保存導線 ──
    function renderGuestCta() {
      if (isLoggedIn() || !logs.length) return '';
      return `
        <div class="log-guest-cta">
          <p class="log-guest-cta-title">🔔「そろそろ眉、予約したら？」をLINEで受け取る</p>
          <p class="log-guest-cta-desc">
            いまはこの端末に保存されています。アカウントを作ると、
            前回から目安の時期が近づいた時にLINEで届き、どの端末からでも同じ記録を開けます。
          </p>
          <a href="/login?mode=signup&next=/mypage/log" class="log-guest-cta-btn">無料アカウントを作る →</a>
          <p class="log-guest-cta-note">登録1分 · クレカ不要 · 登録済みの内容はそのまま引き継がれます</p>
        </div>`;
    }

    // ── メインレンダリング ──
    function render() {
      const header = `
        <div class="log-header">
          <p class="log-header-eyebrow">New Me Log</p>
          <h1><em>「前いつ行ったっけ？」を、なくす</em></h1>
          <p class="log-header-sub">美容室・眉サロン・ネイル・ジム。登録しておくと、そろそろの時期にLINEで知らせます。月にいくら使っているかも分かります。</p>
        </div>`;

      if (!logs.length) {
        root.innerHTML = `
          ${header}
          <button class="log-add-btn" id="log-open-add">＋ 美容室から登録してみる</button>
          <div class="log-empty">
            <div class="log-empty-icon">💇</div>
            <p class="log-empty-text">まず1つ、通っているところを登録してください。<br>前回行った日を入れるだけで、<br>次に行く時期を自動で計算します。</p>
          </div>`;
        bindEvents();
        return;
      }

      const grouped = {};
      logs.forEach(log => {
        (grouped[log.axis] = grouped[log.axis] || []).push(log);
      });

      const sectionsHtml = Object.keys(grouped).map(axisId => {
        const def = resolveAxis(axisId, grouped[axisId][0]?.custom_icon);
        const cards = grouped[axisId].map(log => {
          const nextDays = daysFromToday(log.next_visit);
          const chipClass = nextChipClass(log.next_visit);
          const providerHref = log.provider_slug
            ? (log.provider_type === 'affiliate' ? `/affiliate/${log.provider_slug}` : `/provider/${log.provider_slug}`)
            : null;
          const since = weeksSince(log.last_visit);
          const freq = effectiveFreq(log);
          // 頻度が未設定でも軸の推奨で月額を出す（出さないと合計と食い違って見える）
          const m = monthlyCost(log.cost, freq);
          const costIsEstimated = !!freq?.estimated;
          const untilIdeal = daysUntilIdeal(log);

          // 予約日が未設定でも「そろそろ」を出す（前回＋頻度から算出）
          let dueChip = '';
          if (!log.next_visit && untilIdeal !== null) {
            if (untilIdeal < 0) {
              dueChip = `<span class="log-chip chip-next-overdue">目安を ${-untilIdeal}日 過ぎています</span>`;
            } else if (untilIdeal <= 7) {
              dueChip = `<span class="log-chip chip-next-soon">あと${untilIdeal}日で ${esc(formatFreq(freq))}</span>`;
            } else {
              dueChip = `<span class="log-chip" style="opacity:.5">次の目安 ${idealNextDate(log)}</span>`;
            }
          }

          // Compass / Mirror が指している軸なら、その情報を重ねる。
          // 誘導ではなく事実の統合。両方該当する時は Compass を優先し、
          // 1枚のカードにバッジを2つ出さない。
          let markHtml = '';
          if (compassAxis && log.axis === compassAxis) {
            markHtml = '<span class="log-card-mark lcm-compass">🧭 Compass の最初の一手</span>';
          } else if (mirrorAxis && log.axis === mirrorAxis) {
            markHtml = '<span class="log-card-mark lcm-mirror">🪞 Mirror が指した1点</span>';
          }

          return `
            <div class="log-card" data-id="${log.id}">
              <div class="log-card-top">
                <div>
                  <p class="log-card-name">${esc(log.name)}</p>
                  ${markHtml}
                  ${providerHref ? `<a class="log-card-provider-link" href="${providerHref}">🔗 Finemeに掲載中</a>` : ''}
                </div>
                <div class="log-card-actions">
                  <button class="log-card-edit-btn" data-edit="${log.id}">編集</button>
                  <button class="log-card-del-btn" data-del="${log.id}">削除</button>
                </div>
              </div>
              <div class="log-card-schedule">
                ${log.last_visit ? `<span class="log-chip">前回 ${log.last_visit}${since !== null ? `（${since}週前）` : ''}</span>` : '<span class="log-chip" style="opacity:.45">前回未記録</span>'}
                ${log.next_visit ? `<span class="log-chip ${chipClass}">次回 ${log.next_visit}${nextDays ? `（${nextDays}）` : ''}</span>` : dueChip}
                ${freq ? `<span class="log-chip">🔄 ${esc(formatFreq(freq))}${freq.estimated ? '（目安）' : ''}</span>` : ''}
                ${log.cost ? `<span class="log-chip log-chip-cost">1回 ${formatYen(log.cost)}${m !== null ? ` · 月 ${costIsEstimated ? '約' : ''}${formatYen(m)}` : ''}</span>` : ''}
              </div>
              ${log.memo ? `<p class="log-card-memo">📝 ${esc(log.memo)}</p>` : ''}
              <div class="log-card-visit">
                <button class="log-visit-today" data-visit-today="${log.id}">✓ 今日行った</button>
                <button class="log-visit-pick" data-visit-pick="${log.id}">📅 日付を選ぶ</button>
                <input type="date" class="log-visit-input" data-visit-date="${log.id}" tabindex="-1" aria-hidden="true" />
              </div>
            </div>`;
        }).join('');
        return `<div class="log-axis-section">
          <p class="log-axis-label">${def.icon} ${esc(def.label)}</p>
          ${cards}
        </div>`;
      }).join('');

      // 費用が入っていれば投資額カードが FV。まだなら従来のヘッダーを出す
      // （空のカードや ¥0 を見せないため）
      // FV直下には何も挟まない。記録として使い切るまでが上半分。
      // 次の一歩とアカウントの話は、一覧を見終わった一番下に置く。
      const card = renderCostCard();
      root.innerHTML = `
        ${card || header}
        <button class="log-add-btn" id="log-open-add">＋ 追加する</button>
        ${sectionsHtml}
        ${renderTrendSection()}
        ${renderNextStep()}
        ${renderGuestCta()}`;
      bindEvents();
    }

    // ── モーダル ──
    // presetAxis: 新規登録時に最初から選んでおく軸（Compass の導線から来た時に使う）
    function openModal(log = null, presetAxis = null) {
      editingId = log?.id || null;
      selectedProvider = log?.provider_slug ? { slug: log.provider_slug, type: log.provider_type } : null;
      customIcon = log?.custom_icon || DEFAULT_CUSTOM_ICON;

      const choices = axisChoicesFor(trackRef.current);
      const known = choices.some(c => c.id === log?.axis);
      const isCustom = !!log && !known;
      const wantAxis = log?.axis || presetAxis;

      const axisOptions = choices.map(c =>
        `<option value="${c.id}"${wantAxis === c.id ? ' selected' : ''}>${c.icon} ${esc(c.label)}</option>`
      ).join('') + `<option value="${CUSTOM_AXIS}"${isCustom ? ' selected' : ''}>${DEFAULT_CUSTOM_ICON} その他（自分で決める）</option>`;

      document.getElementById('log-modal-title').textContent = log ? '記録を編集' : '新しく登録する';
      document.getElementById('log-f-axis').innerHTML = axisOptions;
      document.getElementById('log-f-custom-label').value = isCustom ? log.axis : '';
      document.getElementById('log-f-name').value = log?.name || '';
      document.getElementById('log-f-freq').value = log?.frequency_months || log?.frequency_weeks || '';
      document.getElementById('log-f-freq-unit').value = log?.frequency_months ? 'month' : 'week';
      renderFreqPresets();
      document.getElementById('log-f-last').value = log?.last_visit || '';
      document.getElementById('log-f-next').value = log?.next_visit || '';
      document.getElementById('log-f-cost').value = log?.cost || '';
      document.getElementById('log-f-memo').value = log?.memo || '';
      document.getElementById('log-provider-search-input').value = log?.provider_slug ? `（登録済み）${log.provider_slug}` : '';
      providerSearchResults = [];
      renderProviderResults();
      renderIconPicker();
      document.getElementById('log-modal-overlay').classList.remove('hidden');
      updateAxisUi();
    }

    function closeModal() {
      document.getElementById('log-modal-overlay').classList.add('hidden');
      editingId = null;
      selectedProvider = null;
    }

    function renderIconPicker() {
      const el = document.getElementById('log-icon-picker');
      if (!el) return;
      el.innerHTML = CUSTOM_ICON_CHOICES.map(ic =>
        `<button type="button" class="log-icon-choice${ic === customIcon ? ' selected' : ''}" data-icon="${ic}">${ic}</button>`
      ).join('');
    }

    // 「その他」の時だけ軸名とアイコンの入力を出す
    function updateAxisUi() {
      const axisId = document.getElementById('log-f-axis')?.value;
      const customWrap = document.getElementById('log-custom-wrap');
      if (customWrap) customWrap.style.display = axisId === CUSTOM_AXIS ? '' : 'none';

      const hint = document.getElementById('log-freq-hint');
      if (hint) {
        const def = axisChoicesFor(trackRef.current).find(c => c.id === axisId);
        if (def?.freq) {
          const r = def.freq.min === def.freq.max ? `${def.freq.min}` : `${def.freq.min}〜${def.freq.max}`;
          hint.textContent = `${def.label} の目安：${r}${def.freq.unit}ごと`;
        } else {
          hint.textContent = '';
        }
      }
    }

    // ── 頻度（週 / ヶ月）──
    function freqNumValue() {
      return parseInt(document.getElementById('log-f-freq')?.value) || null;
    }
    function freqUnitValue() {
      return document.getElementById('log-f-freq-unit')?.value === 'month' ? 'month' : 'week';
    }

    // よく使う頻度をワンタップで入れられるようにする（毎回数字を打たせない）
    function renderFreqPresets() {
      const el = document.getElementById('log-freq-presets');
      if (!el) return;
      const curVal = freqNumValue();
      const curUnit = freqUnitValue();
      el.innerHTML = FREQ_PRESETS.map(p => {
        const active = curVal === p.value && curUnit === p.unit;
        return `<button type="button" class="log-freq-chip${active ? ' selected' : ''}" data-fv="${p.value}" data-fu="${p.unit}">${p.label}</button>`;
      }).join('');
    }

    function autoFillNext() {
      const last = document.getElementById('log-f-last')?.value;
      const num = freqNumValue();
      const nextInput = document.getElementById('log-f-next');
      if (!last || !num || !nextInput || nextInput.value) return;
      // 月単位は月で加算する（4週=28日で回すと月をまたぐたびにズレるため）
      nextInput.value = idealNextDate({
        last_visit: last,
        frequency_weeks: freqUnitValue() === 'week' ? num : null,
        frequency_months: freqUnitValue() === 'month' ? num : null,
      }) || '';
    }

    // ── 保存 ──
    async function saveLog() {
      const axisSel = document.getElementById('log-f-axis').value;
      const customLabel = document.getElementById('log-f-custom-label').value.trim();
      const name = document.getElementById('log-f-name').value.trim();

      if (!name) { alert('名前を入力してください'); return; }
      if (axisSel === CUSTOM_AXIS && !customLabel) { alert('カテゴリ名を入力してください'); return; }

      const data = {
        axis: axisSel === CUSTOM_AXIS ? customLabel : axisSel,
        custom_icon: axisSel === CUSTOM_AXIS ? customIcon : null,
        name,
        frequency_weeks: freqUnitValue() === 'week' ? freqNumValue() : null,
        frequency_months: freqUnitValue() === 'month' ? freqNumValue() : null,
        last_visit: document.getElementById('log-f-last').value || null,
        next_visit: document.getElementById('log-f-next').value || null,
        cost: parseInt(document.getElementById('log-f-cost').value) || null,
        memo: document.getElementById('log-f-memo').value.trim() || null,
        provider_slug: selectedProvider?.slug || null,
        provider_type: selectedProvider?.type || null,
      };

      const saveBtn = document.getElementById('log-modal-save');
      saveBtn.disabled = true; saveBtn.textContent = '保存中...';
      try {
        if (editingId) await updateLog(editingId, data);
        else await createLog(data);
        await fetchLogs();
        closeModal();
        render();
      } catch (e) {
        alert('保存に失敗しました: ' + e.message);
      } finally {
        saveBtn.disabled = false; saveBtn.textContent = '保存する';
      }
    }

    // 記録できたことを目に見える形で返す（押しただけでは伝わらない）
    function showToast(msg) {
      let el = document.getElementById('log-toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'log-toast';
        el.className = 'log-toast';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      requestAnimationFrame(() => el.classList.add('is-on'));
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => el.classList.remove('is-on'), 2400);
    }

    function flashCard(id) {
      const card = root.querySelector(`.log-card[data-id="${id}"]`);
      if (!card) return;
      card.classList.add('is-flash');
      card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(() => card.classList.remove('is-flash'), 1600);
    }

    function fmtJa(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      const today = new Date().toISOString().slice(0, 10);
      if (dateStr === today) return '今日';
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // 「行った」を1タップで記録する。
    // 予約日（next_visit）は消化されたので空に戻し、次のサイクルを始める。
    // 次に行く目安は last_visit + 頻度 から自動で出るため、入力させない。
    async function markVisited(id, dateStr, btn) {
      if (!dateStr) return;
      const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '記録中…'; }
      try {
        await recordVisit(id, dateStr);
        await fetchLogs();
        render();
        const log = logs.find(l => String(l.id) === String(id));
        const next = log ? idealNextDate(log) : null;
        showToast(next
          ? `✓ ${fmtJa(dateStr)}の記録をつけました — 次の目安は ${fmtJa(next)}`
          : `✓ ${fmtJa(dateStr)}の記録をつけました`);
        flashCard(id);
      } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        alert('記録に失敗しました: ' + e.message);
      }
    }

    // date input は opacity:0 だとクリックしてもピッカーが開かないため、
    // ボタン経由で showPicker() を明示的に呼ぶ。
    function openDatePicker(id) {
      const input = root.querySelector(`input[data-visit-date="${id}"]`);
      if (!input) return;
      input.value = '';
      input.max = new Date().toISOString().slice(0, 10); // 未来の「行った」は無い
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); return; } catch (e) {}
      }
      input.click();
    }

    async function deleteLog(id) {
      if (!confirm('この記録を削除しますか？')) return;
      await removeLog(id);
      await fetchLogs();
      render();
    }

    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function bindEvents() {
      document.getElementById('log-open-add')?.addEventListener('click', () => openModal());
    }

    root.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) { openModal(logs.find(l => String(l.id) === editBtn.dataset.edit)); return; }
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) { deleteLog(delBtn.dataset.del); return; }
      const todayBtn = e.target.closest('[data-visit-today]');
      if (todayBtn) {
        markVisited(todayBtn.dataset.visitToday, new Date().toISOString().slice(0, 10), todayBtn);
        return;
      }
      const pickBtn = e.target.closest('[data-visit-pick]');
      if (pickBtn) { openDatePicker(pickBtn.dataset.visitPick); return; }
      // Compass が指す軸の登録へ（その軸を選んだ状態でモーダルを開く）
      const addAxis = e.target.closest('[data-add-axis]');
      if (addAxis) {
        e.preventDefault();
        openModal(null, addAxis.dataset.addAxis);
        return;
      }
    });

    // 日付を選んで記録（label 内の date input がネイティブのカレンダーを開く）
    root.addEventListener('change', e => {
      const dateInput = e.target.closest('[data-visit-date]');
      if (!dateInput || !dateInput.value) return;
      const id = dateInput.dataset.visitDate;
      const btn = root.querySelector(`[data-visit-pick="${id}"]`);
      markVisited(id, dateInput.value, btn);
    });

    document.getElementById('log-modal-save')?.addEventListener('click', saveLog);
    document.getElementById('log-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('log-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('log-f-axis')?.addEventListener('change', updateAxisUi);
    document.getElementById('log-f-last')?.addEventListener('change', autoFillNext);
    document.getElementById('log-f-freq')?.addEventListener('change', () => { renderFreqPresets(); autoFillNext(); });
    document.getElementById('log-f-freq-unit')?.addEventListener('change', () => { renderFreqPresets(); autoFillNext(); });
    document.getElementById('log-freq-presets')?.addEventListener('click', e => {
      const chip = e.target.closest('.log-freq-chip');
      if (!chip) return;
      document.getElementById('log-f-freq').value = chip.dataset.fv;
      document.getElementById('log-f-freq-unit').value = chip.dataset.fu;
      renderFreqPresets();
      autoFillNext();
    });
    document.getElementById('log-icon-picker')?.addEventListener('click', e => {
      const btn = e.target.closest('.log-icon-choice');
      if (!btn) return;
      customIcon = btn.dataset.icon;
      renderIconPicker();
    });

    let searchTimer;
    document.getElementById('log-provider-search-input')?.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchProviders(e.target.value), 350);
    });
    document.getElementById('log-provider-results')?.addEventListener('click', e => {
      const item = e.target.closest('.log-provider-item');
      if (!item) return;
      selectedProvider = { slug: item.dataset.slug, type: item.dataset.type };
      document.getElementById('log-provider-search-input').value = decodeURIComponent(item.dataset.name);
      providerSearchResults = [];
      renderProviderResults();
    });
    document.getElementById('log-provider-clear')?.addEventListener('click', () => {
      selectedProvider = null;
      document.getElementById('log-provider-search-input').value = '';
      providerSearchResults = [];
      renderProviderResults();
    });

    root.innerHTML = `<div style="text-align:center;padding:60px 0;color:rgba(232,228,220,0.3);font-size:13px">読み込み中...</div>`;
    fetchLogs().then(() => render());
  }, []);

  return (
    <>
      <div id="log-root" className="log-wrap" />

      {/* モーダル（常にDOM上に存在） */}
      <div id="log-modal-overlay" className="log-modal-overlay hidden">
        <div id="log-modal" className="log-modal">
          <p id="log-modal-title" className="log-modal-title">新しく登録する</p>

          <div className="log-field">
            <label>カテゴリ</label>
            <select id="log-f-axis" />
          </div>

          <div className="log-field" id="log-custom-wrap" style={{ display: 'none' }}>
            <label>カテゴリ名</label>
            <input id="log-f-custom-label" type="text" placeholder="例：ヘッドスパ、部屋の整理、睡眠" />
            <p className="log-field-hint">アイコンを選ぶ</p>
            <div id="log-icon-picker" className="log-icon-picker" />
          </div>

          <div className="log-field">
            <label>名前</label>
            <input id="log-f-name" type="text" placeholder="例：〇〇美容室、△△ジム" />
          </div>

          <div className="log-field">
            <label>Finemeサービスと紐づける（任意）</label>
            <div className="log-provider-search">
              <input id="log-provider-search-input" type="text" placeholder="サービス名で検索..." />
              <button className="log-provider-clear" id="log-provider-clear">解除</button>
            </div>
            <div id="log-provider-results" className="log-provider-result" />
          </div>

          <div className="log-field">
            <label>頻度</label>
            <div id="log-freq-presets" className="log-freq-presets" />
            <div className="log-freq-row">
              <input id="log-f-freq" type="number" placeholder="例：1" min="1" max="52" />
              <select id="log-f-freq-unit">
                <option value="week">週ごと</option>
                <option value="month">ヶ月ごと</option>
              </select>
            </div>
            <p id="log-freq-hint" className="log-field-hint" />
          </div>

          <div className="log-field">
            <label>1回あたりの費用（任意）</label>
            <input id="log-f-cost" type="number" placeholder="例：6000" min="0" step="100" />
            <p className="log-field-hint">頻度と合わせて月額を計算します</p>
          </div>

          <div className="log-modal-row">
            <div className="log-field">
              <label>前回利用日</label>
              <input id="log-f-last" type="date" />
            </div>
            <div className="log-field">
              <label>次回予約日</label>
              <input id="log-f-next" type="date" />
            </div>
          </div>

          <div className="log-field">
            <label>メモ（任意）</label>
            <textarea id="log-f-memo" placeholder="担当者名、店舗の場所など..." />
          </div>

          <div className="log-modal-btns">
            <button className="log-modal-cancel" id="log-modal-cancel">キャンセル</button>
            <button className="log-modal-save" id="log-modal-save">保存する</button>
          </div>
        </div>
      </div>
    </>
  );
}
