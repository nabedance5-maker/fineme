'use client';
import { useEffect, useRef } from 'react';
import useTrack from '@/app/_hooks/useTrack';
import {
  axisChoicesFor, resolveAxis, CUSTOM_AXIS, CUSTOM_ICON_CHOICES, DEFAULT_CUSTOM_ICON,
  monthlyCost, costSummary, formatYen, BUDGET_LABELS,
  effectiveFreq, formatFreq, idealNextDate, daysUntilIdeal, FREQ_PRESETS,
  monthlyTrend, buildAnalysis,
  ENTRY_TYPES, DEFAULT_ENTRY_TYPE, resolveEntryType,
} from '@/lib/log-axes';
import { listLogs, createLog, updateLog, removeLog, recordVisit, getAccessToken } from '@/lib/log-store';
import { TRACKS, DEFAULT_TRACK, getKnownTrackId } from '@/lib/track';

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

    // ?src= パラメータを読み取り計測（提携店舗QR・Pinterest等の流入元を測る。D-20260712-3と同じ既存パターン）
    // src が partner_{slug} 形式（店舗の紹介QR）の場合、その店舗を新規登録のデフォルトとして
    // 紐づける（でお指摘：QRを読んでもNew Me Logに飛ぶだけで店舗と繋がっていなかった問題）。
    try {
      const logSrc = new URLSearchParams(window.location.search).get('src');
      if (logSrc) {
        localStorage.setItem('fineme:log:src', logSrc);
        fetch('/api/track/src?src=' + encodeURIComponent(logSrc)).catch(() => {});

        const partnerMatch = /^partner_(.+)$/.exec(logSrc);
        if (partnerMatch && partnerMatch[1] !== 'unknown') {
          const slug = partnerMatch[1];
          fetch(`/api/providers/${encodeURIComponent(slug)}/landing`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d?.provider) {
                defaultProviderFromSrc = { slug: d.provider.slug, type: 'provider', name: d.provider.name, category: d.provider.main_category };
                partnerConfirmState = 'pending';
                render();
              }
            })
            .catch(() => {});
        }
      }
    } catch {}

    const style = document.createElement('style');
    style.textContent = `
      .log-wrap { max-width: 100%; padding: 0 0 100px; }

      /* ── Header ── */
      .log-header { background: linear-gradient(rgba(10,15,30,0.82), rgba(10,15,30,0.92)), url('/assets/images/hero-bg.webp') center/cover no-repeat; border-radius: 14px; padding: 22px 22px 18px; margin-bottom: 24px; border: 1px solid rgba(201,168,76,0.2); position: relative; overflow: hidden; }
      .log-header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 8px; text-transform: uppercase; }
      .log-header h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,4vw,24px); font-weight: 700; color: #fff; margin: 0 0 6px; }
      .log-header h1 em { font-style: normal; color: #c9a84c; }
      .log-header-sub { font-size: 12px; color: rgba(232,228,220,0.45); margin: 0; line-height: 1.6; }
      .log-partner-banner { margin-top: 14px; padding: 14px; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.35); border-radius: 10px; font-size: 12.5px; color: #e8e4dc; line-height: 1.6; }
      .log-partner-banner-btns { display: flex; gap: 8px; }
      .log-partner-btn-yes, .log-partner-btn-no { flex: 1; padding: 10px 12px; border-radius: 9px; font-size: 12.5px; font-weight: 800; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; }
      .log-partner-btn-yes { background: #c9a84c; border: none; color: #0a0f1e; }
      .log-partner-btn-yes:hover { opacity: .88; }
      .log-partner-btn-yes:disabled, .log-partner-btn-no:disabled { opacity: .5; cursor: default; }
      .log-partner-btn-no { background: transparent; border: 1px solid rgba(232,228,220,0.2); color: rgba(232,228,220,0.55); }

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
      .log-provider-search-btn { flex-shrink: 0; padding: 11px 14px; background: rgba(201,168,76,0.14); border: 1px solid rgba(201,168,76,0.4); border-radius: 9px; color: #c9a84c; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; white-space: nowrap; transition: all .12s; }
      .log-provider-search-btn:hover { background: rgba(201,168,76,0.22); }
      .log-provider-search-btn:disabled { opacity: .6; cursor: default; }
      .log-provider-clear { font-size: 11px; color: rgba(239,68,68,0.7); background: none; border: none; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; padding: 0; white-space: nowrap; }
      .log-provider-result { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
      .log-provider-item { padding: 8px 12px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.1); border-radius: 8px; cursor: pointer; font-size: 12px; color: rgba(232,228,220,0.75); transition: all .12s; }
      .log-provider-item:hover, .log-provider-item.selected { border-color: rgba(201,168,76,0.4); color: #c9a84c; background: rgba(201,168,76,0.06); }
      .log-provider-hint { font-size: 11px; color: rgba(232,228,220,0.4); margin: 6px 0 0; line-height: 1.6; }
      .log-modal-btns { display: flex; gap: 10px; margin-top: 24px; }
      .log-modal-save { flex: 1; padding: 14px; background: #c9a84c; border: none; border-radius: 11px; font-size: 15px; font-weight: 800; color: #0a0f1e; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: opacity .15s; }
      .log-modal-save:hover { opacity: .88; }
      .log-modal-cancel { padding: 14px 20px; background: transparent; border: 1px solid rgba(232,228,220,0.15); border-radius: 11px; font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.5); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; }

      /* ── FVカード（羊皮紙の航海日誌）──
         背景は Canva で作った案3そのもの（文字だけ削除して書き出したもの）。
         金額・内訳は実データで動くのでテキストで上に重ねる。
         背景画像に罫線が入っているので、テキストはその位置(%)に合わせて置く。 */
      .lfv-wrap { margin-bottom: 26px; }

      /* ── FVカード／支出推移カードのスワイプカルーセル ──
         スライド幅を100%よりわずかに狭くし、右端に次のカードの端を覗かせる（peek）。
         横スクロールできることに気づいてもらうための唯一の手がかりがドット・ヒント文だけでは
         弱いという指摘（でお 2026-08-02）を受けて、視覚的にも気づけるようにした。 */
      .lfv-carousel-wrap { margin-bottom: 26px; }
      .lfv-carousel-track {
        display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden;
        scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scroll-behavior: smooth;
        scrollbar-width: none; -ms-overflow-style: none;
      }
      .lfv-carousel-track::-webkit-scrollbar { display: none; }
      .lfv-carousel-slide { flex: 0 0 88%; scroll-snap-align: start; margin-bottom: 0; }
      .lfv-carousel-dots { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
      .lfv-carousel-dot { width: 7px; height: 7px; border-radius: 50%; border: none; padding: 0;
        background: rgba(232,228,220,0.22); cursor: pointer; transition: background .15s, transform .15s; }
      .lfv-carousel-dot.is-active { background: #c9a84c; transform: scale(1.3); }
      .lfv-carousel-hint { text-align: center; font-size: 10.5px; color: rgba(232,228,220,0.3); margin: 8px 0 0; letter-spacing: .04em; }
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

      /* 羊皮紙カード内から「支出から見えること」へ飛ぶリンク。
         横スクロールできることに気づいてもらうのと同じ理由で、カード内に置いて見つけやすくする */
      .lfv-jump {
        top: 94%; display: flex; justify-content: center; gap: 8px;
      }
      .lfv-jump-btn {
        display: inline-flex; align-items: center; gap: 2px;
        font-size: 2.3cqw; font-weight: 700; letter-spacing: .03em; font-family: 'Noto Sans JP', sans-serif;
        color: #3a2712; text-decoration: none; cursor: pointer;
        background: rgba(255,250,235,.85); border: 1px solid rgba(71,48,32,.35); border-radius: 999px;
        padding: 1.3cqw 3cqw; box-shadow: 0 2px 6px rgba(71,48,32,.15);
      }
      .lfv-jump-btn:hover { background: rgba(255,250,235,.98); border-color: rgba(71,48,32,.55); }
      .lfv-jump-btn:disabled { opacity: .6; cursor: default; }

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

      /* ── 種別（通う／買う） ── */
      .log-type-toggle { display: flex; gap: 8px; }
      .log-type-chip { flex: 1; text-align: center; font-size: 13px; font-weight: 700; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); transition: all .12s; }
      .log-type-chip:hover { border-color: rgba(201,168,76,0.5); color: rgba(232,228,220,0.9); }
      .log-type-chip.selected { border-color: #c9a84c; background: rgba(201,168,76,0.14); color: #c9a84c; }

      /* ── 頻度（数値＋単位／プリセット） ── */
      .log-freq-row { display: flex; gap: 8px; }
      .log-freq-row input { flex: 1; }
      .log-freq-row select { flex: 0 0 108px; }
      .log-freq-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
      .log-freq-chip { font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 99px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); transition: all .12s; }
      .log-freq-chip:hover { border-color: rgba(201,168,76,0.5); color: rgba(232,228,220,0.9); }
      .log-freq-chip.selected { border-color: #c9a84c; background: rgba(201,168,76,0.14); color: #c9a84c; }

      /* ── 「行った」の記録（1タップ） ── */
      .log-card-visit { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(232,228,220,0.07); }
      .log-visit-today, .log-visit-pick { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; box-sizing: border-box; }
      .log-visit-today { background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.4); color: #c9a84c; }
      .log-visit-today:hover { background: rgba(201,168,76,0.2); }
      .log-visit-pick { background: rgba(232,228,220,0.04); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); }
      .log-visit-pick:hover { border-color: rgba(201,168,76,0.4); color: rgba(232,228,220,0.85); }
      /* showPicker() を呼ぶための実体。display:none だと呼べないので opacity で隠す。
         pointer-events:none は付けない — 一部Chromeはこれが付いた要素を showPicker() でも
         「操作不可」とみなし失敗させるため（でお報告 2026-08-02 の再発の原因） */
      .log-visit-input { position: absolute; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; margin: 0; }
      /* showPicker() が使えない/失敗した時の最終フォールバック。実体を見せてフォーカスする */
      .log-visit-input.is-fallback-visible { position: static; width: auto; height: auto; opacity: 1; flex-basis: 100%; margin-top: 4px; padding: 9px 10px; border: 1px solid rgba(201,168,76,0.4); border-radius: 8px; background: rgba(232,228,220,0.05); color: rgba(232,228,220,0.85); font-family: inherit; font-size: 13px; }
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

      /* ── 支出の推移（羊皮紙カード内。.ltp- = Log Trend Parchment） ──
         でお指摘：文字・グラフが小さくて見えにくい（2026-08-02）。
         チャート枠の下に大きな空白ができていたので、そこまで枠を広げて拡大した */
      .ltp-caption { top: 25.5%; font-size: 2.8cqw; letter-spacing: .04em; color: rgba(71,48,32,.6); }
      .ltp-chart-wrap { position: absolute; left: 6%; right: 6%; top: 29%; bottom: 22%; }
      .ltp-svg { width: 100%; height: 100%; display: block; }
      .ltp-baseline { stroke: rgba(71,48,32,.4); stroke-width: 1.2; }
      .ltp-bar-label { font-size: 13px; font-weight: 600; fill: rgba(71,48,32,.75); font-family: -apple-system, sans-serif; }
      .ltp-axis-label { font-size: 12px; fill: rgba(71,48,32,.55); font-family: -apple-system, sans-serif; }
      .ltp-legend { position: absolute; left: 6%; right: 6%; top: 80.5%; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; }
      .ltp-legend-item { font-size: 3.3cqw; color: rgba(71,48,32,.8); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
      .ltp-legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
      .ltp-note { font-size: 10.5px; color: rgba(232,228,220,0.32); margin: 10px auto 0; max-width: 400px; line-height: 1.75; text-align: center; }
      .ltp-empty { position: absolute; left: 12%; right: 12%; top: 30%; bottom: 15%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
      .ltp-empty-icon { font-size: 7cqw; margin-bottom: 10px; opacity: .55; }
      .ltp-empty-text { font-size: 2.6cqw; color: rgba(71,48,32,.55); line-height: 1.8; margin: 0; }

      /* ── 支出から見えること（.lan- = Log ANalysis） ── */
      .lan-wrap { background: rgba(10,15,30,0.6); border: 1px solid rgba(201,168,76,0.26); border-radius: 14px; padding: 22px 20px 20px; margin: 20px 0; }
      .lan-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 15px; font-weight: 700; color: rgba(232,228,220,0.92); margin: 0 0 14px; }
      .lan-goal-toggle { display: flex; gap: 8px; margin: 0 0 16px; }
      .lan-goal-chip { flex: 1; text-align: center; font-size: 12px; font-weight: 700; padding: 9px 8px; border-radius: 10px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); transition: all .12s; }
      .lan-goal-chip:hover { border-color: rgba(201,168,76,0.5); color: rgba(232,228,220,0.9); }
      .lan-goal-chip.selected { border-color: #c9a84c; background: rgba(201,168,76,0.14); color: #c9a84c; }
      .lan-list { display: flex; flex-direction: column; gap: 10px; }
      .lan-item { padding: 12px 13px; background: rgba(201,168,76,0.06); border-radius: 9px; }
      .lan-item-text { font-size: 12.5px; color: rgba(232,228,220,0.75); line-height: 1.7; margin: 0; }
      .lan-item-suggestion { font-size: 11.5px; color: rgba(232,228,220,0.45); line-height: 1.7; margin: 6px 0 0; padding-top: 6px; border-top: 1px solid rgba(232,228,220,0.08); }
      .lan-empty { font-size: 11.5px; color: rgba(232,228,220,0.32); margin: 0; }
      .lan-hint { font-size: 11px; color: rgba(232,228,220,0.32); margin: 12px 0 0; }
    `;
    document.head.appendChild(style);

    const root = document.getElementById('log-root');
    if (!root) return;

    let logs = [];
    let editingId = null;
    let providerSearchResults = [];
    let selectedProvider = null;
    let defaultProviderFromSrc = null; // 店舗紹介QR（?src=partner_{slug}）経由で来た場合のデフォルト紐づけ先
    let partnerConfirmState = null; // 'pending' | 'done' | null（店舗紹介QRの追加確認バナーの状態）
    let partnerConfirmBusy = false;
    let partnerConfirmDoneMsg = '';
    let customIcon = DEFAULT_CUSTOM_ICON;
    let entryType = DEFAULT_ENTRY_TYPE; // 'visit' | 'purchase'（モーダルで選ぶ種別）
    let budget = null;
    let compassAxis = null;   // Me Scan が指す最初の一手
    let mirrorAxis = null;    // Mirror が指した1点
    let hasDiagnosis = false;
    let hasMirror = false;
    let activeFvSlide = 0;    // FVカード／支出推移カルーセルの現在ページ（render()での再構築後も保持する）
    let analysisGoal = 'both'; // 'save' | 'effect' | 'both'（「支出から見えること」の目的設定）
    try { analysisGoal = localStorage.getItem('fineme:log:goal') || 'both'; } catch {}

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

    // 店舗紹介QR確認時に main_category から Log の軸へ変換する
    // （app/affiliate/[slug]/page.js の CAT_TO_AXIS と同じ対応表）
    const PARTNER_CAT_TO_AXIS = {
      gym: 'body', eyebrow: 'eyebrow', fashion: 'fashion',
      hair: 'hair', aga: 'hair',
      makeup: 'skin', hairremoval: 'skin', esthetic: 'skin',
      whitening: 'teeth', orthodontics: 'teeth',
      nail: 'nail',
    };
    const PARTNER_CAT_LABELS = {
      consulting: '外見トータルサポート', diagnosis: '診断', colordiagnosis: 'パーソナルカラー診断',
      bonediagnosis: '骨格診断', photo: '写真撮影', marriage: '結婚関連サービス',
    };

    const isLoggedIn = () => !!getAccessToken();

    let loadError = null;
    async function fetchLogs() {
      try { logs = await listLogs(); loadError = null; }
      catch (e) { logs = []; loadError = e?.message === 'expired_session' ? 'expired_session' : 'load_failed'; }
    }

    // ── Finemeプロバイダー検索 ──
    // 「自由記述だけで検索ボタンが無いのはおかしい」という指摘（でお 2026-08-07）を受け、
    // 入力に応じた自動検索（既存）に加えてボタンでも即座に検索できるようにした。
    // lastProviderQuery は「検索したが0件だった」を「まだ検索していない」と区別するために持つ。
    let lastProviderQuery = '';
    let providerSearchInFlight = false;

    async function searchProviders(q) {
      lastProviderQuery = q.trim();
      if (!lastProviderQuery) { providerSearchResults = []; renderProviderResults(); return; }
      providerSearchInFlight = true;
      renderProviderResults();
      try {
        const r = await fetch(`/api/providers?q=${encodeURIComponent(lastProviderQuery)}&limit=8`);
        const d = await r.json();
        // /api/providers はオブジェクトの配列をそのまま返す（{providers:[]}ではない）。
        // ここが食い違っていたため検索結果が常に空になっていた（でお報告 2026-08-07）
        providerSearchResults = (Array.isArray(d) ? d : []).slice(0, 8);
      } catch { providerSearchResults = []; }
      providerSearchInFlight = false;
      renderProviderResults();
    }

    function renderProviderResults() {
      const el = document.getElementById('log-provider-results');
      if (!el) return;
      if (providerSearchInFlight) { el.innerHTML = '<p class="log-provider-hint">検索中…</p>'; return; }
      if (!providerSearchResults.length) {
        el.innerHTML = lastProviderQuery
          ? '<p class="log-provider-hint">該当するサービスが見つかりませんでした。紐づけずに名前欄へ直接入力できます</p>'
          : '';
        return;
      }
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
    function renderCostCard(opts = {}) {
      const s = costSummary(logs);
      if (!s.counted) return '';
      const wrapClass = opts.slide ? 'lfv-wrap lfv-carousel-slide' : 'lfv-wrap';

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
        <div class="${wrapClass}">
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
            <div class="lfv-abs lfv-jump">
              <a class="lfv-jump-btn" href="#log-analysis-section" data-jump="analysis">支出から見えること →</a>
              <button type="button" class="lfv-jump-btn" data-share-fv="1">📤 シェア/保存</button>
            </div>
          </div>
          ${budgetLine}
          ${noteLines}
        </div>`;
    }

    // ── 支出の推移（サブスクBox的なグラフ。羊皮紙のFVカードと同じ器を2ページ目として使う）──
    //
    // costSummary()（FVカード）は「今の設定から計算した現時点のスナップショット」。
    // こちらは実際に記録した来店・購入（log.visits）を月ごとに積み上げた時系列で、
    // 「✓ 今日行った/買った」を押すたびに少しずつ精度が上がっていく。
    //
    // 気づき・改善提案は renderAnalysisSection() に分離した（羊皮紙カードは
    // スクショ映えするスナップショット用途のため、読み物系のコンテンツは持たせない）。
    const TREND_COLORS = ['#2f4d6b', '#a8461f', '#3d6b52']; // 藍・朱赤・緑青（羊皮紙＝明るい背景向け）
    const TREND_OTHER_COLOR = '#8a7a63'; // 4位以下をまとめる「その他」

    function renderTrendCard(opts = {}) {
      if (!logs.length) return '';
      const trend = monthlyTrend(logs, 6);
      const wrapClass = opts.slide ? 'lfv-wrap lfv-carousel-slide' : 'lfv-wrap';
      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
      const periodLabel = trend.months.length
        ? `${trend.months[0].label}〜${trend.months[trend.months.length - 1].label}` : ym;

      if (!trend.hasAnyVisit) {
        return `
          <div class="${wrapClass}">
            <div class="lfv-card">
              <div class="lfv-abs lfv-brand" style="left:12%;right:auto;text-align:left">New Me Log</div>
              <div class="lfv-abs lfv-date" style="left:auto;right:12%;text-align:right">${esc(periodLabel)}</div>
              <div class="lfv-abs lfv-label">支出の推移</div>
              <div class="ltp-empty">
                <div class="ltp-empty-icon">📈</div>
                <p class="ltp-empty-text">「✓ 今日行った/買った」を記録していくと、<br>ここに月ごとの推移が表示されます。</p>
              </div>
              <div class="lfv-foot">
                <span class="lfv-ports">まだ記録がありません</span>
                <span class="lfv-site">fineme.me</span>
              </div>
              <div class="lfv-abs lfv-jump">
                <a class="lfv-jump-btn" href="#log-analysis-section" data-jump="analysis">支出から見えること →</a>
              </div>
            </div>
          </div>`;
      }

      // 色は「この時点での期間合計ランキング」で上位3軸に固定割り当て、4位以下は「その他」
      const topAxes = trend.totalByAxis.slice(0, 3).map((a, i) => ({ ...a, color: TREND_COLORS[i] }));
      const axisColor = {};
      topAxes.forEach(a => { axisColor[a.axis] = a.color; });
      const otherTotal = trend.totalByAxis.filter(a => !axisColor[a.axis]).reduce((s, a) => s + a.amount, 0);

      // ── SVG積み上げ棒グラフ（viewBox 0 0 320 190）──
      // カード内でチャート枠を大きく取った分、viewBoxもそれに合わせて拡大し、
      // 文字（.ltp-bar-label / .ltp-axis-label）が縮小されすぎないようにしてある。
      const CHART_W = 320;
      const bandW = CHART_W / trend.months.length;
      const barW = 28;
      const baseline = 148;
      const plotH = 108;
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
          ? `<text x="${x + barW / 2}" y="${(y - 9).toFixed(1)}" text-anchor="middle" class="ltp-bar-label">${esc(formatYen(m.total))}</text>`
          : '';
        return `${rects}${totalLabel}<text x="${x + barW / 2}" y="172" text-anchor="middle" class="ltp-axis-label">${esc(m.label)}</text>`;
      }).join('');

      const svg = `
        <svg class="ltp-svg" viewBox="0 0 ${CHART_W} 190" role="img" aria-label="直近6ヶ月の月別支出推移グラフ">
          <line x1="0" y1="${baseline}" x2="${CHART_W}" y2="${baseline}" class="ltp-baseline" />
          ${svgBars}
        </svg>`;

      // ── 凡例 ──
      const legendItems = [
        ...topAxes.filter(a => a.amount > 0),
        ...(otherTotal > 0 ? [{ icon: '✦', label: 'その他', color: TREND_OTHER_COLOR, amount: otherTotal }] : []),
      ];
      const legend = legendItems.length ? `
        <div class="ltp-legend">
          ${legendItems.map(a => `
            <span class="ltp-legend-item">
              <span class="ltp-legend-dot" style="background:${a.color}"></span>
              ${a.icon} ${esc(a.label)}
            </span>`).join('')}
        </div>` : '';

      const totalVisits = trend.months.reduce((s, m) => s + m.visitCount, 0);
      const unknownCount = trend.months.reduce((s, m) => s + m.unknownCostCount, 0);
      const unknownNote = unknownCount
        ? `<p class="ltp-note">金額未入力の記録が${unknownCount}件あり、合計には含めていません</p>` : '';

      return `
        <div class="${wrapClass}">
          <div class="lfv-card">
            <div class="lfv-abs lfv-brand" style="left:12%;right:auto;text-align:left">New Me Log</div>
            <div class="lfv-abs lfv-date" style="left:auto;right:12%;text-align:right">${esc(periodLabel)}</div>

            <div class="lfv-abs lfv-label">支出の推移</div>
            <div class="lfv-abs ltp-caption">直近6ヶ月の記録から</div>
            <div class="ltp-chart-wrap">${svg}</div>
            ${legend}

            <div class="lfv-foot">
              <span class="lfv-ports">${totalVisits}回分の記録から</span>
              <span class="lfv-site">fineme.me</span>
            </div>
            <div class="lfv-abs lfv-jump">
              <a class="lfv-jump-btn" href="#log-analysis-section" data-jump="analysis">支出から見えること →</a>
            </div>
          </div>
          ${unknownNote}
        </div>`;
    }

    // ── 支出から見えること（気づき＋改善提案）──
    //
    // trendInsights() は「起きている事実」だけだったが、それだけでは「グラフが出ているだけ」に
    // なってしまう（でお指摘 2026-08-02）。ここでは経済系（予算とのズレ）・効果系（Compass/Mirror
    // が指す軸に実際お金がかかっているか）の両方を出し、目的設定（節約重視／効果重視／両方）で
    // 採用件数・並び順を変える。羊皮紙カードの外＝プレーンな暗色カードに置く（.lnx/.ltr-wrapと
    // 同じ「装飾＝羊皮紙、読み物＝プレーンカード」の使い分けに沿う）。
    const GOAL_OPTIONS = [
      { id: 'save', label: '節約重視' },
      { id: 'effect', label: '効果重視' },
      { id: 'both', label: '両方見る' },
    ];

    function renderAnalysisSection() {
      if (!logs.length) return '';
      const { economic, effect, items } = buildAnalysis(
        logs, { budget, compassAxis, mirrorAxis }, analysisGoal, 6
      );

      if (!economic.length && !effect.length) {
        return `
          <div class="lan-wrap" id="log-analysis-section">
            <p class="lan-title">支出から見えること</p>
            <p class="lan-empty">記録が増えると、ここに気づきや提案が表示されます。</p>
          </div>`;
      }

      const hintHtml = (!hasDiagnosis && !hasMirror)
        ? `<p class="lan-hint">見た目づくりの効果からの気づきは、Me ScanかMirrorの結果があると出せます</p>`
        : '';

      return `
        <div class="lan-wrap" id="log-analysis-section">
          <p class="lan-title">支出から見えること</p>
          <div class="lan-goal-toggle" id="log-goal-toggle">
            ${GOAL_OPTIONS.map(g => `
              <button type="button" class="lan-goal-chip${analysisGoal === g.id ? ' selected' : ''}" data-goal="${g.id}">${esc(g.label)}</button>`).join('')}
          </div>
          <div class="lan-list">
            ${items.map(it => `
              <div class="lan-item">
                <p class="lan-item-text">${it.icon} ${esc(it.text)}</p>
                ${it.suggestion ? `<p class="lan-item-suggestion">${esc(it.suggestion)}</p>` : ''}
              </div>`).join('')}
          </div>
          ${hintHtml}
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
      // trackRef.current は不明でも DEFAULT_TRACK（男性版）に決め打ちされる。
      // 表示文言はそれで構わないが、男女で行き先が変わるリンクは
      // knownTrack が無い（＝本当に不明）時だけ /choose-track を経由させる。
      const knownTrack = getKnownTrackId();
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
        // 結果プレビュー例はトラック固定の文言（タイプ名は男女で呼び方が違う）。
        // トラックが分からない段階では、特定の性別向けの例を見せない。
        const typeExample = knownTrack === 'belle'
          ? `<div class="lnx-peek-type">
              <span class="lnx-peek-code">TYPE-HND</span>
              <span class="lnx-peek-name">光髪の咲き続ける野菫</span>
              <span class="lnx-peek-sub">136タイプのうちの1つ</span>
            </div>
            <div class="lnx-peek-line"></div>`
          : knownTrack === 'fineme'
          ? `<div class="lnx-peek-type">
              <span class="lnx-peek-code">TYPE-HND</span>
              <span class="lnx-peek-name">黒髪の臥す伏竜</span>
              <span class="lnx-peek-sub">136タイプのうちの1つ</span>
            </div>
            <div class="lnx-peek-line"></div>`
          : '';
        const diagnosisHref = knownTrack ? TRACK.diagnosis : '/choose-track?dest=diagnosis';
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
              ${typeExample}
              <p class="lnx-peek-first">最初の一手 — <b>💇 髪・ヘア</b><br>
                <span>髪型は第一印象の3割。美容院1回で変化を体感できる</span></p>
            </div>

            <a class="lnx-cta" href="${diagnosisHref}">まず1問だけ、30秒で →</a>
            <p class="lnx-note">登録不要。1問で「最初の一手」が出ます。もっと知りたければそのまま8軸へ（約3分）。</p>
          </div>`;
      }

      // ③ Mirror がまだ → 自分では見えない、の話。
      // 写真を送るのはハードルが高いので、返ってくるものを具体的に見せる。
      if (!hasMirror) {
        const mirrorHref = knownTrack ? TRACK.mirror : '/choose-track?dest=mirror';
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

            <a class="lnx-cta" href="${mirrorHref}">写真で確かめる →</a>
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
      let partnerBanner = '';
      if (defaultProviderFromSrc && partnerConfirmState === 'pending') {
        const name = esc(defaultProviderFromSrc.name || defaultProviderFromSrc.slug);
        // 同じ店舗を何度もQRで読むたびに新規項目を作らないよう、既存の紐づけ済みログが
        // あれば「来店を記録」に、無ければ「追加＋記録」に文言・挙動を出し分ける
        // （でお指摘：来店するたびに同じ店舗が別項目として増えてしまっていた）
        const existing = logs.find(l => l.provider_slug === defaultProviderFromSrc.slug);
        const today = new Date().toISOString().slice(0, 10);
        const alreadyToday = existing && existing.last_visit === today;
        const question = existing
          ? (alreadyToday ? `今日はすでに記録済みです。` : `今日の来店を記録しますか？`)
          : `New Me Logに追加して、今日の来店を記録しますか？`;
        const yesLabel = partnerConfirmBusy ? (existing ? '記録中…' : '追加中…') : (existing ? 'はい、記録する' : 'はい、追加する');
        partnerBanner = `
          <div class="log-partner-banner">
            <p style="margin:0 0 10px;">🏬 ${name}${existing ? 'に登録済みです。' : 'からのご案内です。'}${question}</p>
            <div class="log-partner-banner-btns">
              ${alreadyToday ? '' : `<button type="button" class="log-partner-btn-yes" id="log-partner-yes"${partnerConfirmBusy ? ' disabled' : ''}>${yesLabel}</button>`}
              <button type="button" class="log-partner-btn-no" id="log-partner-no"${partnerConfirmBusy ? ' disabled' : ''}>${alreadyToday ? '閉じる' : 'あとで'}</button>
            </div>
          </div>`;
      } else if (defaultProviderFromSrc && partnerConfirmState === 'done') {
        partnerBanner = `
          <div class="log-partner-banner">
            ✓ ${esc(partnerConfirmDoneMsg || '記録しました。')}
          </div>`;
      }

      const header = `
        <div class="log-header">
          <p class="log-header-eyebrow">New Me Log</p>
          <h1><em>「前いつ行ったっけ？」を、なくす</em></h1>
          <p class="log-header-sub">美容室・エステ・ジムから、スキンケアやプロテインなどの購入まで。登録しておくと、そろそろの時期にLINEで知らせます。月の美容代がまるごと分かります。</p>
        </div>`;

      if (loadError) {
        root.innerHTML = `
          ${header}
          ${partnerBanner}
          <div class="log-empty">
            <div class="log-empty-icon">⚠️</div>
            <p class="log-empty-text">${loadError === 'expired_session'
              ? 'ログインの有効期限が切れているようです。<br>再ログインすると、登録済みの記録が表示されます。'
              : '記録の読み込みに失敗しました。<br>時間をおいて再度お試しください。'}</p>
            ${loadError === 'expired_session'
              ? `<a href="/login?redirect=${encodeURIComponent('/mypage/log')}" class="log-add-btn" style="display:inline-block;text-decoration:none;margin-top:12px">ログインし直す</a>`
              : `<button class="log-add-btn" id="log-retry-btn" style="margin-top:12px">再読み込み</button>`}
          </div>`;
        const retryBtn = document.getElementById('log-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => { fetchLogs().then(() => render()); });
        return;
      }

      if (!logs.length) {
        root.innerHTML = `
          ${header}
          ${partnerBanner}
          <button class="log-add-btn" id="log-open-add">＋ まず1つ登録してみる</button>
          <div class="log-empty">
            <div class="log-empty-icon">💇</div>
            <p class="log-empty-text">通っている場所でも、使っているものでもOKです。<br>前回の日を入れるだけで、<br>次の目安を自動で計算します。</p>
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
          const etDef = resolveEntryType(log.entry_type);
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
                <button class="log-visit-today" data-visit-today="${log.id}">${esc(etDef.recordDoneLabel)}</button>
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
      //
      // FVカードがある時は、支出推移カードとセットでスワイプカルーセルにする
      // （でお要望 2026-08-02）。FVカードが無い（費用未入力）時はカルーセルを組まず、
      // 支出推移だけ従来の位置（一覧の下）に単体で出す。
      const card = renderCostCard({ slide: true });
      const fvBlock = card ? `
        <div class="lfv-carousel-wrap">
          <div class="lfv-carousel-track" tabindex="0" role="region" aria-label="今月の投資額と支出の推移">
            ${card}
            ${renderTrendCard({ slide: true })}
          </div>
          <div class="lfv-carousel-dots">
            <button type="button" class="lfv-carousel-dot${activeFvSlide === 0 ? ' is-active' : ''}" data-slide="0" aria-label="1/2 今月の投資額"></button>
            <button type="button" class="lfv-carousel-dot${activeFvSlide === 1 ? ' is-active' : ''}" data-slide="1" aria-label="2/2 支出の推移"></button>
          </div>
          <p class="lfv-carousel-hint">スワイプで「支出の推移」も見られます</p>
        </div>` : header;

      root.innerHTML = `
        ${fvBlock}
        ${partnerBanner}
        <button class="log-add-btn" id="log-open-add">＋ 追加する</button>
        ${sectionsHtml}
        ${card ? '' : renderTrendCard()}
        ${renderAnalysisSection()}
        ${renderNextStep()}
        ${renderGuestCta()}`;
      bindEvents();

      // render()はinnerHTMLを丸ごと作り直すため、2枚目を見ていた場合はスクロール位置を復元する
      if (card && activeFvSlide === 1) {
        const track = root.querySelector('.lfv-carousel-track');
        if (track) track.scrollLeft = slideStepPx(track);
      }
    }

    // ── モーダル ──
    // presetAxis: 新規登録時に最初から選んでおく軸（Compass の導線から来た時に使う）
    function openModal(log = null, presetAxis = null) {
      editingId = log?.id || null;
      selectedProvider = log?.provider_slug
        ? { slug: log.provider_slug, type: log.provider_type }
        : (!log ? defaultProviderFromSrc : null);
      customIcon = log?.custom_icon || DEFAULT_CUSTOM_ICON;
      entryType = log?.entry_type === 'purchase' ? 'purchase' : DEFAULT_ENTRY_TYPE;
      renderTypeToggle();

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
      const nextInputEl = document.getElementById('log-f-next');
      nextInputEl.value = log?.next_visit || '';
      nextInputEl.dataset.auto = ''; // モーダルは使い回すため、前回開いた時のフラグを必ず消す
      document.getElementById('log-f-cost').value = log?.cost || '';
      document.getElementById('log-f-memo').value = log?.memo || '';
      document.getElementById('log-provider-search-input').value = log?.provider_slug
        ? `（登録済み）${log.provider_slug}`
        : (selectedProvider ? `（お店から案内）${selectedProvider.name || selectedProvider.slug}` : '');
      providerSearchResults = [];
      lastProviderQuery = '';
      providerSearchInFlight = false;
      renderProviderResults();
      renderIconPicker();
      document.getElementById('log-modal-overlay').classList.remove('hidden');
      updateAxisUi();
      updateEntryTypeUi();
    }

    function renderTypeToggle() {
      const el = document.getElementById('log-type-toggle');
      if (!el) return;
      el.innerHTML = Object.values(ENTRY_TYPES).map(t =>
        `<button type="button" class="log-type-chip${t.id === entryType ? ' selected' : ''}" data-entry-type="${t.id}">${esc(t.label)}</button>`
      ).join('');
    }

    // 種別（通う／買う）に応じてフォームの文言・項目を出し分ける。
    // Fineme掲載サービスは「行く」場所のみのため、買う記録では紐付け欄を隠す。
    function updateEntryTypeUi() {
      const def = resolveEntryType(entryType);
      const nameInput = document.getElementById('log-f-name');
      if (nameInput) nameInput.placeholder = def.namePlaceholder;
      const lastLabel = document.getElementById('log-f-last-label');
      if (lastLabel) lastLabel.textContent = def.lastLabel;
      const nextLabel = document.getElementById('log-f-next-label');
      if (nextLabel) nextLabel.textContent = def.nextLabel;
      const providerWrap = document.getElementById('log-provider-wrap');
      if (providerWrap) providerWrap.style.display = entryType === 'purchase' ? 'none' : '';
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
      if (!last || !num || !nextInput) return;
      // 次回予約日を手で入力/選択した場合はそれを優先し上書きしない。
      // ただし「自動計算で入った値」はdataset.autoで区別し、頻度を変えたら
      // 追従して更新し直す（でお報告：頻度だけ変えても次回予約日が古いままだった）。
      if (nextInput.value && nextInput.dataset.auto !== '1') return;
      // 月単位は月で加算する（4週=28日で回すと月をまたぐたびにズレるため）
      nextInput.value = idealNextDate({
        last_visit: last,
        frequency_weeks: freqUnitValue() === 'week' ? num : null,
        frequency_months: freqUnitValue() === 'month' ? num : null,
      }) || '';
      nextInput.dataset.auto = '1';
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
        entry_type: entryType,
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

    // 店舗紹介QR（?src=partner_{slug}）のバナーで「はい」を押した時。
    // 既にその店舗を登録済みなら、新規項目を増やさず既存ログに来店記録だけを積む。
    // 未登録なら軸・名前を店舗情報から自動で決め、新規登録＋今日の来店記録を1タップで行う
    // （でお指摘：来店するたびに同じ店舗が別項目として何個も増えてしまっていた）。
    async function confirmPartnerAdd() {
      if (partnerConfirmBusy || !defaultProviderFromSrc) return;
      const today = new Date().toISOString().slice(0, 10);
      const existing = logs.find(l => l.provider_slug === defaultProviderFromSrc.slug);
      if (existing && existing.last_visit === today) return; // 同日の二重記録を防ぐ
      partnerConfirmBusy = true;
      render();
      try {
        let targetId;
        if (existing) {
          await recordVisit(existing.id, today);
          targetId = existing.id;
          partnerConfirmDoneMsg = `${defaultProviderFromSrc.name}の来店を記録しました`;
        } else {
          const axis = PARTNER_CAT_TO_AXIS[defaultProviderFromSrc.category] || null;
          const data = {
            axis: axis || (PARTNER_CAT_LABELS[defaultProviderFromSrc.category] || defaultProviderFromSrc.name),
            custom_icon: axis ? null : DEFAULT_CUSTOM_ICON,
            entry_type: 'visit',
            name: defaultProviderFromSrc.name,
            last_visit: today,
            next_visit: null,
            provider_slug: defaultProviderFromSrc.slug,
            provider_type: defaultProviderFromSrc.type,
          };
          const created = await createLog(data);
          const createdLog = created?.log || created; // ログイン時は{ok,log}、ゲスト時はrowそのものを返すため両対応
          await recordVisit(createdLog.id, today);
          targetId = createdLog.id;
          partnerConfirmDoneMsg = `${defaultProviderFromSrc.name}を追加し、今日の来店を記録しました`;
        }
        await fetchLogs();
        partnerConfirmState = 'done';
        render();
        showToast(`✓ ${partnerConfirmDoneMsg}`);
        flashCard(targetId);
      } catch (e) {
        alert('記録に失敗しました: ' + e.message);
      } finally {
        partnerConfirmBusy = false;
      }
    }

    function dismissPartnerBanner() {
      partnerConfirmState = null;
      render();
    }

    // date input は opacity:0 だとクリックしてもピッカーが開かないため、
    // ボタン経由で showPicker() を明示的に呼ぶ。
    function openDatePicker(id) {
      const input = root.querySelector(`input[data-visit-date="${id}"]`);
      if (!input) return;
      input.value = '';
      input.max = new Date().toISOString().slice(0, 10); // 未来の「行った」は無い

      let opened = false;
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); opened = true; }
        catch (err) { console.warn('[ServiceLog] showPicker() に失敗、手動入力にフォールバックします:', err); }
      }
      if (!opened) revealDateInputFallback(input);
    }

    // showPicker() が使えない/失敗した時の最終フォールバック。
    // .click() はネイティブのカレンダーUIを確実には開かないため、実体を見せて直接入力させる。
    function revealDateInputFallback(input) {
      input.classList.add('is-fallback-visible');
      input.focus();
      input.addEventListener('blur', () => input.classList.remove('is-fallback-visible'), { once: true });
    }

    // FVカードを画像化してシェア/保存する。
    // でお指摘：サーバー側で別途組んだ画像だと羊皮紙にならない → html2canvasでDOMを直接
    // キャプチャする方式にした → 投資記録が8行あると行の文字が潰れて重なる新たな不具合
    // （2026-08-05）。html2canvas は3つの手（既定／letterRendering／foreignObjectRendering／
    // クローンの余白拡張）すべてでこのカード特有の構成（cqw・flex中央寄せ・背景画像）を
    // 正しく描けなかったため、html2canvasを諦め <canvas> に自前で描く方式に切り替えた。
    // 座標は .lfv-card の各ゾーン（%指定）を1080×1350（背景画像の実寸）へ変換して使う。
    async function shareOrDownloadFvCard(btn) {
      const s = costSummary(logs);
      if (!s.counted) return;

      const label = btn.textContent;
      btn.disabled = true; btn.textContent = '作成中…';
      try {
        const blob = await renderFvCardImage(s);
        if (!blob) throw new Error('画像の生成に失敗しました');

        const now = new Date();
        const filename = `new-me-log-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'New Me Log',
            text: `今月の自分への投資は${formatYen(s.monthly)}でした`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }
      } catch (e) {
        if (e?.name !== 'AbortError') alert('シェア/保存に失敗しました: ' + e.message);
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    }

    function loadImageEl(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    // FVカードを1080×1350のcanvasに手描きする。ドット区切りの罫線を描く小関数
    function drawDottedLine(ctx, x1, x2, y, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.restore();
    }

    async function renderFvCardImage(s) {
      const W = 1080, H = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      try { await document.fonts.ready; } catch {}
      const bg = await loadImageEl('/assets/images/log-parchment-v2.webp');
      ctx.drawImage(bg, 0, 0, W, H);

      const SERIF = "'Noto Serif JP', Georgia, serif";
      const SANS = "'Noto Sans JP', sans-serif";
      const INK_DARK = '#472000';
      const INK_BRAND = '#473020';
      const INK_SOFT = 'rgba(71,48,32,.85)';
      const INK_MED = 'rgba(71,48,32,.8)';
      const INK_ROW = 'rgba(71,48,32,.9)';
      const INK_LEAD = 'rgba(71,48,32,.45)';

      const now = new Date();
      const ym = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;

      // ── ブランド／日付（top:13.67%、CSSはtranslateY(-100%)＝この線がテキスト下端）──
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = INK_BRAND;
      ctx.font = `${0.042 * W}px ${SERIF}`;
      ctx.fillText('New Me Log', 0.12 * W, 0.1367 * H);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(71,48,32,.75)';
      ctx.font = `${0.031 * W}px ${SANS}`;
      ctx.fillText(ym, 0.88 * W, 0.1367 * H);

      // ── 上から順に並ぶブロック（top:X% がテキスト上端、baselineはfontSize*0.8下と近似）──
      ctx.textAlign = 'center';
      ctx.fillStyle = INK_MED;
      ctx.font = `${0.031 * W}px ${SERIF}`;
      ctx.fillText('自分への投資', 0.5 * W, 0.215 * H + 0.031 * W * 0.8);

      ctx.fillStyle = INK_DARK;
      ctx.font = `${0.134 * W}px ${SERIF}`;
      ctx.fillText(formatYen(s.monthly), 0.5 * W, 0.255 * H + 0.134 * W * 0.8);

      ctx.fillStyle = INK_BRAND;
      ctx.font = `${0.037 * W}px ${SERIF}`;
      ctx.fillText('1ヶ月あたり', 0.5 * W, 0.395 * H + 0.037 * W * 0.8);

      ctx.fillStyle = 'rgba(71,48,32,.72)';
      ctx.font = `${0.031 * W}px ${SANS}`;
      ctx.fillText(`このまま1年で ${formatYen(s.yearly)}`, 0.5 * W, 0.452 * H + 0.031 * W * 0.8);

      ctx.fillStyle = INK_MED;
      ctx.font = `${0.025 * W}px ${SERIF}`;
      ctx.fillText('投 資 記 録', 0.5 * W, 0.545 * H + 0.025 * W * 0.8);

      // ── 投資記録（左21%〜右79%の帯に、縦中央寄せで積み上げる）──
      const MAX_ROWS = 8;
      const shown = s.byAxis.slice(0, MAX_ROWS);
      const rest = s.byAxis.length - shown.length;
      const rowFs = (shown.length <= 5 ? 0.029 : shown.length <= 7 ? 0.026 : 0.0235) * W;
      const rowGap = rowFs * 0.55;
      const rowH = rowFs * 1.35;
      const bandTop = 0.57 * H, bandBottom = 0.875 * H;
      const totalRowsH = shown.length * rowH + Math.max(0, shown.length - 1) * rowGap + (rest > 0 ? rowFs * 1.3 : 0);
      let y = bandTop + Math.max(0, (bandBottom - bandTop - totalRowsH) / 2) + rowH * 0.8;

      const left = 0.21 * W, right = 0.79 * W;
      shown.forEach(row => {
        const def = resolveAxis(row.axis, row.customIcon);
        const valueText = `${row.estimated ? '約' : ''}${formatYen(row.monthly)}`;

        ctx.textAlign = 'left';
        ctx.fillStyle = '#000';
        ctx.font = `${rowFs}px ${SANS}`;
        ctx.fillText(def.icon, left, y);
        const iconW = ctx.measureText(def.icon).width + rowFs * 0.35;

        ctx.fillStyle = INK_ROW;
        ctx.fillText(def.label, left + iconW, y);
        const nameW = ctx.measureText(def.label).width;

        ctx.textAlign = 'right';
        ctx.fillStyle = INK_DARK;
        ctx.font = `${rowFs}px ${SERIF}`;
        ctx.fillText(valueText, right, y);
        const valueW = ctx.measureText(valueText).width;

        drawDottedLine(ctx, left + iconW + nameW + rowFs * 0.4, right - valueW - rowFs * 0.4, y - rowFs * 0.32, INK_LEAD);

        y += rowH + rowGap;
      });
      if (rest > 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(71,48,32,.6)';
        ctx.font = `${rowFs * 0.85}px ${SANS}`;
        ctx.fillText(`ほか ${rest}件`, W / 2, y);
      }

      // ── フッター（top:90.5%）──
      ctx.textAlign = 'left';
      ctx.fillStyle = INK_MED;
      ctx.font = `${0.029 * W}px ${SERIF}`;
      ctx.fillText(`${logs.length}つの港を巡っている`, 0.12 * W, 0.905 * H + 0.029 * W * 0.8);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(71,48,32,.7)';
      ctx.font = `${0.024 * W}px ${SANS}`;
      ctx.fillText('fineme.me', 0.88 * W, 0.905 * H + 0.024 * W * 0.8);

      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
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

    // スライド1枚分の移動量（px）。CSSの .lfv-carousel-slide { flex: 0 0 88% } と
    // track の gap:10px に合わせてここで計算する（次のカードを右端に覗かせるため、
    // 1スライド=トラック幅そのものではなくなった）。
    function slideStepPx(track) {
      return track.clientWidth * 0.88 + 10;
    }

    function scrollFvCarouselTo(i) {
      const track = root.querySelector('.lfv-carousel-track');
      if (!track) return;
      track.scrollTo({ left: i * slideStepPx(track), behavior: 'smooth' });
    }

    function bindEvents() {
      document.getElementById('log-open-add')?.addEventListener('click', () => openModal());

      // 手動スワイプ時にドットの表示とスクロール位置の記憶を同期する。
      // scrollイベントはバブリングしないため、委譲ではなくトラックに直接付ける
      // （render()のたびにトラックごと作り直されるので、都度ここで付け直す）。
      const track = root.querySelector('.lfv-carousel-track');
      if (track) {
        let debounce;
        track.addEventListener('scroll', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            const i = Math.round(track.scrollLeft / slideStepPx(track));
            activeFvSlide = i;
            root.querySelectorAll('.lfv-carousel-dot').forEach((d, idx) => d.classList.toggle('is-active', idx === i));
          }, 80);
        });
      }
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
      // FV／支出推移カルーセルのドット
      const dot = e.target.closest('[data-slide]');
      if (dot) { scrollFvCarouselTo(Number(dot.dataset.slide)); return; }
      // 「支出から見えること」の目的設定
      const goalBtn = e.target.closest('[data-goal]');
      if (goalBtn) {
        analysisGoal = goalBtn.dataset.goal;
        try { localStorage.setItem('fineme:log:goal', analysisGoal); } catch {}
        render();
        return;
      }
      // 羊皮紙カード内から「支出から見えること」へジャンプ
      const jumpLink = e.target.closest('[data-jump="analysis"]');
      if (jumpLink) {
        e.preventDefault();
        document.getElementById('log-analysis-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // FVカードをシェア/保存
      const shareBtn = e.target.closest('[data-share-fv]');
      if (shareBtn) { shareOrDownloadFvCard(shareBtn); return; }
      // 店舗紹介QRの追加確認バナー
      if (e.target.closest('#log-partner-yes')) { confirmPartnerAdd(); return; }
      if (e.target.closest('#log-partner-no')) { dismissPartnerBanner(); return; }
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
    document.getElementById('log-type-toggle')?.addEventListener('click', e => {
      const chip = e.target.closest('.log-type-chip');
      if (!chip) return;
      entryType = chip.dataset.entryType;
      renderTypeToggle();
      updateEntryTypeUi();
    });
    document.getElementById('log-f-axis')?.addEventListener('change', updateAxisUi);
    document.getElementById('log-f-last')?.addEventListener('change', autoFillNext);
    // ユーザーが次回予約日を直接編集したら、以後は自動計算で上書きしない
    document.getElementById('log-f-next')?.addEventListener('input', e => { e.target.dataset.auto = ''; });
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
    // 入力しただけで検索されると気づけない人向けに、ボタンでも即座に検索できるようにする
    // （でお指摘 2026-08-07：「自由記述だけで検索ボタンが無いのはおかしい」）
    document.getElementById('log-provider-search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchTimer); searchProviders(e.target.value); }
    });
    document.getElementById('log-provider-search-btn')?.addEventListener('click', () => {
      clearTimeout(searchTimer);
      searchProviders(document.getElementById('log-provider-search-input').value);
    });
    document.getElementById('log-provider-results')?.addEventListener('click', e => {
      const item = e.target.closest('.log-provider-item');
      if (!item) return;
      selectedProvider = { slug: item.dataset.slug, type: item.dataset.type };
      document.getElementById('log-provider-search-input').value = decodeURIComponent(item.dataset.name);
      providerSearchResults = [];
      lastProviderQuery = '';
      renderProviderResults();
      prefillProviderFrequency();
    });

    // 店舗が推奨来店周期を設定していれば、頻度が未入力の時だけ自動入力する
    // （本人が既に入力している値は上書きしない）
    async function prefillProviderFrequency() {
      const freqInput = document.getElementById('log-f-freq');
      const axisSel = document.getElementById('log-f-axis');
      if (!selectedProvider?.slug || !freqInput || freqInput.value || !axisSel?.value || axisSel.value === CUSTOM_AXIS) return;
      try {
        const res = await fetch(`/api/providers/${selectedProvider.slug}/recommended-frequencies`);
        if (!res.ok) return;
        const list = await res.json();
        const rec = list.find(r => r.axis === axisSel.value);
        if (!rec || freqInput.value) return;
        if (rec.frequency_months) {
          freqInput.value = rec.frequency_months;
          document.getElementById('log-f-freq-unit').value = 'month';
        } else if (rec.frequency_weeks) {
          freqInput.value = rec.frequency_weeks;
          document.getElementById('log-f-freq-unit').value = 'week';
        }
        renderFreqPresets();
      } catch {}
    }
    document.getElementById('log-provider-clear')?.addEventListener('click', () => {
      selectedProvider = null;
      document.getElementById('log-provider-search-input').value = '';
      providerSearchResults = [];
      lastProviderQuery = '';
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
            <label>種別</label>
            <div id="log-type-toggle" className="log-type-toggle" />
          </div>

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

          <div className="log-field" id="log-provider-wrap">
            <label>Finemeサービスと紐づける（任意）</label>
            <div className="log-provider-search">
              <input id="log-provider-search-input" type="text" placeholder="サービス名で検索..." />
              <button type="button" className="log-provider-search-btn" id="log-provider-search-btn">🔍 検索</button>
              <button className="log-provider-clear" id="log-provider-clear">解除</button>
            </div>
            <div id="log-provider-results" className="log-provider-result" />
            <p className="log-field-hint">紐づけると、あなたの名前とこの記録がそのお店にも見えるようになります。</p>
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
              <label id="log-f-last-label">前回利用日</label>
              <input id="log-f-last" type="date" />
            </div>
            <div className="log-field">
              <label id="log-f-next-label">次回予約日</label>
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
