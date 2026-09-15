'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PROVIDER_AXES } from '@/lib/provider-axes';
import { TAB_TUTORIALS, TUTORIAL_GROUPS, TUTORIAL_MUTED_KEY, tutorialSeenKey } from '@/lib/dashboard-tutorial';
import { JAPAN_CITIES, PREFECTURES } from '@/app/_data/japan-cities';
import { ALL_AXES } from '@/lib/log-axes';
import { CUSTOMER_SCRIPT_AXES } from '@/lib/customer-scripts';
import { CATEGORY_DEFS, LANDING_TAB_OPTIONS, CALENDAR_AXIS_OPTIONS, CALENDAR_DEFAULT_VIEW_OPTIONS, HEADER_SHORTCUT_OPTIONS, MAX_HEADER_SHORTCUTS } from '@/lib/dashboard-prefs';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

export default function ProviderDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      /* サイドバー型ナビ（2026-09 デザイン刷新。/business/dashboard-design-sample の
         方向性を本番に反映。switchTab()はグローバルな.tab-btn/.tab-paneセレクタで
         動くため、この見た目変更だけなら既存のJSロジックには影響しない） */
      /* 2026-09-11：管理画面を白背景の業務ツール然とした配色に刷新（でお指摘・hacomono参考）。
         サイドバー／モバイル上部バーはブランドのネイビー×ゴールドのまま維持し、
         メインの作業エリア（.pd-page-root配下）だけを白系に反転。ユーザー向けページ
         （深海ネイビー×羊皮紙）の世界観とは切り離し、日々数字とフォームを見る道具として
         可読性を優先する。 */
      .pd-page-root { background: var(--color-bg); min-height: 100vh; color: #1a1410; }
      /* <main>には共通クラス"section"（globals.cssでpadding:64px 0）も付いており、
         ダッシュボードではこれが上下に意図しない大きな余白を作っていた
         （でお指摘2026-09-14：「上部の空間は全然消えてない」の正体。今までの
         padding-top調整はこれとは別の話で、この余白そのものには手を付けていなかった）。
         ダッシュボードは独自にpd-main側で余白を管理するため、ここで打ち消す。 */
      .pd-page-root.section { padding: 0; }
      /* サイドバーは画面左に完全に寄せて固定し、メイン画面と明確に分ける（でお要望2026-09-12：
         「白背景に浮いた四角い枠」ではなく「左側が全部メニュー、右側がメイン画面」にしたい）。
         .containerの中央寄せ・余白を使わず.pd-containerで独自にフルブリードにしている。 */
      .pd-container { width: 100%; }
      .pd-layout { display: flex; align-items: flex-start; gap: 0; }
      .pd-topbar { display: none; }
      .pd-backdrop { display: none; }
      .tab-nav { width: 244px; flex-shrink: 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 30; background: #0a0f1e; padding: 20px 0 0; overflow-y: auto; }
      /* 2階層ナビ（2026-09-12）：折りたたみ<details>は「どこが開閉できるのか分かりにくい」との
         でお指摘を受け、hacomono同様の「左に細いカテゴリー列、選ぶと右にそのカテゴリーの一覧」
         という2ペイン構成に変更。常に1カテゴリーだけがアクティブなので状態が曖昧にならない。 */
      .pd-rail-wrap { display: flex; flex: 1; min-height: 0; }
      .pd-rail { width: 64px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; border-right: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
      .pd-rail-btn { display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; padding: 14px 4px; border: none; background: none; cursor: pointer; font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.55); line-height: 1.3; transition: background .15s, color .15s; }
      .pd-rail-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
      .pd-rail-btn.active { background: rgba(201,168,76,0.16); color: #c9a84c; border-right: 2px solid #c9a84c; margin-right: -1px; }
      .pd-rail-panel { flex: 1; min-width: 0; padding: 4px 8px 12px; }
      .pd-panel-section { display: flex; flex-direction: column; gap: 2px; }
      .tab-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; border: none; border-radius: 10px; background: none; cursor: pointer; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.88); text-align: left; white-space: normal; transition: background .15s, color .15s; }
      .tab-btn:hover { background: rgba(255,255,255,0.05); color: #e8e4dc; }
      .tab-btn.active { background: rgba(201,168,76,0.14); color: #c9a84c; }
      .pd-main { flex: 1; min-width: 0; margin-left: 244px; padding: 28px 32px; }
      .pd-page-root .card { background: #ffffff; border-color: rgba(26,20,16,0.08); box-shadow: 0 1px 3px rgba(10,15,30,0.05); }
      .pd-page-root .btn { background: var(--color-gold); color: var(--color-bg-dark); border-color: var(--color-gold); }
      .pd-page-root .btn:hover { opacity: .88; box-shadow: var(--shadow-gold); }
      .pd-page-root .btn-ghost { background: transparent; color: #1a1410; border-color: rgba(26,20,16,0.2); }
      .pd-page-root .btn-ghost:hover { background: rgba(26,20,16,0.05); color: #1a1410; box-shadow: none; }
      .pd-page-root .section-title { color: #1a1410; }
      /* 予約カレンダー（2026-09-11〜12・hacomono参考）。日付ピルはPC・スマホ共通。
         グリッドはPC・スマホとも同一構造：横スクロールでスタッフ列を、グリッド内の
         縦スクロールで時間帯を確認する。時刻ラベル列はsticky leftで横スクロール中も
         固定表示。640px以下はスタッフ列を狭くし、でお要望どおり画面内に3〜4人分見える幅に。 */
      .cal-day-pills { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
      .cal-day-pills::-webkit-scrollbar { display: none; }
      .cal-day-pill { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px; border-radius: 12px; border: 1px solid rgba(26,20,16,0.1); background: #fff; font-size: 11px; color: rgba(26,20,16,0.65); cursor: pointer; }
      .cal-day-pill .cal-pill-date { font-size: 15px; font-weight: 800; color: #1a1410; }
      .cal-day-pill.is-active { background: rgba(201,168,76,0.16); border-color: #c9a84c; color: #a8842f; }
      .cal-day-pill.is-active .cal-pill-date { color: #a8842f; }
      /* グリッドをCSS Gridの単一グリッドに再構成（でお再報告2026-09-12：前回のflexベースの
         修正でも列境界のズレが直らなかった）。ヘッダー行・本体行を別々のflexコンテナに
         分けていた構成そのものをやめ、両方を「同じgrid-template-columnsを持つ1つのグリッド」
         のセルにする。これなら列幅はブラウザが1回だけ計算するため、行ごとに独立計算されて
         ズレるという構造的な原因が原理的に起こり得ない。列数はJS側で動的なので
         grid-template-columnsはインラインstyleで都度指定し、列の最小幅だけ
         --cal-col-min カスタムプロパティ経由でCSS側（メディアクエリ含む）から制御する。 */
      .cal-day-grid { border: 1px solid rgba(26,20,16,0.08); border-radius: 10px; overflow: auto; max-height: 560px; -webkit-overflow-scrolling: touch; --cal-col-min: 130px; }
      .cal-grid-inner { display: grid; width: max-content; min-width: 100%; }
      .cal-time-col-spacer { position: sticky; top: 0; left: 0; z-index: 4; background: #fff; border-bottom: 1px solid rgba(26,20,16,0.08); }
      .cal-staff-head { position: sticky; top: 0; z-index: 3; background: #fff; text-align: center; font-size: 11.5px; font-weight: 700; padding: 6px 4px; border-right: 1px solid rgba(26,20,16,0.06); border-bottom: 1px solid rgba(26,20,16,0.08); }
      .cal-staff-head:last-child { border-right: none; }
      .cal-time-col { position: sticky; left: 0; z-index: 1; background: rgba(250,248,243,0.97); border-right: 1px solid rgba(26,20,16,0.08); }
      .cal-time-label { position: absolute; left: 0; right: 4px; text-align: right; font-size: 10px; color: rgba(26,20,16,0.4); transform: translateY(-50%); }
      /* 先頭（表示範囲の開始時刻＝0:00等）はtranslateY(-50%)でグリッド上端より上にはみ出し、
         overflow:autoの親にクリップされて文字が切れていた（でお報告2026-09-14）。
         先頭だけ上寄せに変える。 */
      .cal-time-label.is-first { transform: translateY(0); }
      .cal-staff-col { position: relative; border-right: 1px solid rgba(26,20,16,0.06); }
      .cal-staff-col:last-child { border-right: none; }
      /* 合体ビュー（スタッフ×部屋）：部屋列をスタッフ列と見た目で区別し、境目に太い
         区切り線を入れる（でお指摘2026-09-14：「部屋が軸の中に入ってきてない」→
         部屋を独立した列として追加。見分けがつくよう色分け・区切りを付ける）。 */
      .cal-staff-head.is-resource-head { background: #f0fdf4; }
      .cal-staff-col.is-resource-col { background: rgba(5,150,105,0.03); }
      .cal-staff-head.is-group-start, .cal-staff-col.is-group-start { border-left: 3px solid #c9a84c; }
      .cal-hour-line { position: absolute; left: 0; right: 0; border-top: 1px solid rgba(26,20,16,0.06); }
      .cal-hour-line.is-half { border-top-style: dashed; border-top-color: rgba(26,20,16,0.04); }
      .cal-block, .cal-block-h { background: rgba(201,168,76,0.16); border-left: 3px solid #c9a84c; border-radius: 5px; padding: 2px 5px; font-size: 10.5px; line-height: 1.3; overflow: hidden; cursor: pointer; }
      .cal-block:hover, .cal-block-h:hover { background: rgba(201,168,76,0.28); }
      .cal-block.is-visited, .cal-block-h.is-visited { border-left-color: #9ca3af; background: rgba(26,20,16,0.05); opacity: .7; }
      .cal-block.is-pending, .cal-block-h.is-pending { background: repeating-linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.14) 6px, rgba(245,158,11,0.22) 6px, rgba(245,158,11,0.22) 12px); border-left-color: #f59e0b; border-left-style: dashed; }
      .cal-block.is-pending:hover, .cal-block-h.is-pending:hover { background: rgba(245,158,11,0.28); }
      .cal-block.is-manual-assign, .cal-block-h.is-manual-assign { background: rgba(96,165,250,0.16); border-left-color: #60a5fa; }
      .cal-block.is-manual-assign:hover, .cal-block-h.is-manual-assign:hover { background: rgba(96,165,250,0.28); }
      .cal-block-tag { display: block; font-size: 9.5px; color: #3b82f6; font-weight: 700; }
      /* スタッフの休憩・外出ブロック／シフト外時間のグレー帯（でお要望2026-09-14：
         「出勤してないスタッフの枠は予約が入らないように自動でブロックしてカレンダーでも
         グレーで帯をかけて」）。予約ブロックより手前（下）に描画し、クリックは通さない。 */
      .cal-grey-band { position: absolute; background: repeating-linear-gradient(135deg, rgba(26,20,16,0.05), rgba(26,20,16,0.05) 6px, rgba(26,20,16,0.09) 6px, rgba(26,20,16,0.09) 12px); pointer-events: none; z-index: 0; }
      .cal-grey-band.is-deletable { pointer-events: auto; cursor: pointer; }
      .cal-grey-band-v { left: 0; right: 0; }
      .cal-grey-band-h { top: 0; bottom: 0; }
      .cal-block, .cal-block-h { z-index: 1; }
      .cal-block strong, .cal-block-h strong { display: block; font-size: 10.5px; }
      .cal-block { position: absolute; left: 2px; right: 2px; }
      /* 縦横入れ替え版（でお要望2026-09-13：店舗によって時間軸を横に置きたい／
         部屋別をメインにしたい、というニーズがあるため設定でどちらも選べるようにした。
         こちらは1時間あたりの幅を広めに取り、予約者名が途中で切れにくいようにする）。 */
      .cal-day-grid-h { border: 1px solid rgba(26,20,16,0.08); border-radius: 10px; overflow: auto; max-height: 560px; -webkit-overflow-scrolling: touch; }
      .cal-grid-inner-h { display: grid; width: max-content; min-width: 100%; }
      .cal-hour-head-spacer { position: sticky; top: 0; left: 0; z-index: 4; background: #fff; border-bottom: 1px solid rgba(26,20,16,0.08); border-right: 1px solid rgba(26,20,16,0.08); }
      .cal-hour-head-track { position: sticky; top: 0; z-index: 3; background: #fff; height: 32px; border-bottom: 1px solid rgba(26,20,16,0.08); }
      .cal-hour-label-h { position: absolute; top: 50%; transform: translate(-6px,-50%); font-size: 11px; font-weight: 700; color: rgba(26,20,16,0.5); }
      /* 縦版と同じ理由：先頭（0:00等）は-6pxの左オフセットでグリッド左端より外に出てクリップされていた。 */
      .cal-hour-label-h.is-first { transform: translateY(-50%); }
      .cal-row-name-h { position: sticky; left: 0; z-index: 2; background: rgba(250,248,243,0.97); display: flex; align-items: center; padding: 4px 10px; font-size: 11.5px; font-weight: 700; border-right: 1px solid rgba(26,20,16,0.08); border-bottom: 1px solid rgba(26,20,16,0.06); }
      .cal-lane { position: relative; border-bottom: 1px solid rgba(26,20,16,0.06); }
      .cal-row-name-h.is-resource-head { background: #f0fdf4; }
      .cal-lane.is-resource-col { background: rgba(5,150,105,0.03); }
      .cal-row-name-h.is-group-start, .cal-lane.is-group-start { border-top: 3px solid #c9a84c; }
      .cal-vline { position: absolute; top: 0; bottom: 0; border-left: 1px solid rgba(26,20,16,0.06); }
      .cal-vline.is-half { border-left-style: dashed; border-left-color: rgba(26,20,16,0.04); }
      .cal-block-h { position: absolute; top: 4px; bottom: 4px; white-space: nowrap; }
      .cal-agenda-row { cursor: pointer; }
      .cal-agenda-row:hover { background: rgba(26,20,16,0.03); }
      .cal-modal-overlay { position: fixed; inset: 0; background: rgba(10,15,30,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
      .cal-modal-card { background: #fff; border-radius: 16px; padding: 22px; max-width: 460px; width: 100%; max-height: 84vh; overflow-y: auto; }
      /* 顧客一覧のコンパクト行（でお指摘2026-09-12：1画面に多く並べたい） */
      .cust-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr auto; gap: 10px; align-items: center; padding: 10px 12px; border-bottom: 1px solid rgba(26,20,16,0.06); font-size: 13px; }
      .cust-row[data-cust-open] { cursor: pointer; }
      .cust-row[data-cust-open]:hover { background: rgba(26,20,16,0.03); }
      .cust-row-head { font-size: 11px; font-weight: 700; color: rgba(26,20,16,0.45); text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid rgba(26,20,16,0.1); }
      .cust-row-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cust-row-date { color: rgba(26,20,16,0.6); font-size: 12.5px; }
      /* 予約リクエストのコンパクト行（顧客管理タブと同じ方式。でお要望2026-09-12） */
      .req-row { display: grid; grid-template-columns: 1.4fr 1.2fr auto; gap: 10px; align-items: center; padding: 10px 12px; border-bottom: 1px solid rgba(26,20,16,0.06); font-size: 13px; cursor: pointer; }
      .req-row:hover { background: rgba(26,20,16,0.03); }
      .req-row-head { font-size: 11px; font-weight: 700; color: rgba(26,20,16,0.45); text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid rgba(26,20,16,0.1); cursor: default; }
      .req-row-head:hover { background: none; }
      .req-row-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .req-row-date { color: rgba(26,20,16,0.6); font-size: 12.5px; }
      @media (max-width: 640px) {
        .cal-day-grid { --cal-col-min: 90px; }
      }
      @media (max-width: 900px) {
        .pd-topbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0a0f1e; border-bottom: 1px solid rgba(201,168,76,0.15); position: fixed; top: 0; left: 0; right: 0; z-index: 40; }
        .pd-topbar-shortcut-btn { flex-shrink: 0; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(201,168,76,0.3); background: rgba(201,168,76,0.08); color: #c9a84c; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
        .pd-topbar-shortcut-btn:active { background: rgba(201,168,76,0.2); }
        .tab-nav {
          position: fixed; top: 0; bottom: 0; left: 0; z-index: 60; width: 264px; height: 100vh;
          background: #0a0f1e; padding: 20px 0 0; overflow-y: auto; box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          transform: translateX(-100%); transition: transform .25s ease;
        }
        .tab-nav.pd-open { transform: translateX(0); }
        .pd-backdrop.pd-open { display: block; position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,0.5); }
        .pd-main { margin-left: 0; padding: 16px; padding-top: 70px; }
      }
      .tab-pane { display: none; }
      .tab-pane.active { display: block; }
      .form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
      .form-field label { font-size: 12px; font-weight: 700; color: rgba(26,20,16,0.85); }
      .form-field input, .form-field textarea, .form-field select { padding: 10px 12px; border: 1.5px solid rgba(26,20,16,0.15); border-radius: 10px; font-size: 14px; width: 100%; box-sizing: border-box; background: #ffffff; color: #1a1410; }
      .form-field input[type=checkbox] { width: auto; padding: 0; border: none; border-radius: 0; flex-shrink: 0; background: none; }
      .form-field textarea { min-height: 100px; resize: vertical; }
      .form-field select option { background: #ffffff; color: #1a1410; }
      .form-field input::placeholder, .form-field textarea::placeholder { color: rgba(26,20,16,0.35); }
      .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
      .checkbox-item { display: flex; flex-direction: row; align-items: center; gap: 6px; font-size: 14px; text-align: left; color: rgba(26,20,16,0.8); }
      @media (max-width: 640px) { .checkbox-group { flex-direction: column; gap: 8px; } .checkbox-item { width: 100%; flex-direction: row; align-items: flex-start; } }
      .stat-card { background: #ffffff; border: 1px solid rgba(26,20,16,0.08); box-shadow: 0 1px 3px rgba(10,15,30,0.05); border-radius: 12px; padding: 16px; text-align: center; }
      .stat-value { font-size: 32px; font-weight: 800; color: #1a1410; }
      .stat-label { font-size: 12px; color: rgba(26,20,16,0.55); margin-top: 2px; }
      .muted { color: rgba(26,20,16,0.55); }
      .publish-toggle { display: flex; align-items: center; gap: 12px; padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid rgba(26,20,16,0.08); box-shadow: 0 1px 3px rgba(10,15,30,0.05); }
      .toggle-switch { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 26px; cursor: pointer; transition: background .2s; }
      .toggle-slider:before { content:''; position: absolute; width: 18px; height: 18px; left: 4px; bottom: 4px; background: #fff; border-radius: 50%; transition: transform .2s; }
      .toggle-switch input:checked + .toggle-slider { background: #111; }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }
      .referral-code-box { padding: 16px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3); border-radius: 12px; font-family: monospace; font-size: 18px; font-weight: 800; text-align: center; letter-spacing: 2px; color: #1a1410; }
      /* 機能OFFのタブ：完全に隠すと「そもそも存在しない機能」に見えてしまい発見できないという
         でお指摘（2026-09-11）を受け、常に一覧には出しつつ視覚的に区別する方式に変更。 */
      .tab-btn.tab-feature-off { opacity: .45; }
      .feature-off-badge { display: none; margin-left: 6px; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px; background: rgba(96,165,250,0.18); color: #60a5fa; vertical-align: middle; }
      .tab-btn.tab-feature-off .feature-off-badge { display: inline-block; }
      .feature-enable-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.35); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; }
    `;
    document.head.appendChild(style);

    // ── Auth helpers (inlined from scripts/auth.js) ──────────────
    const PROVIDER_KEY = 'fineme:provider:current';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';

    // ── Tab switching ────────────────────────────────────────────
    // ── サイドバーの2階層ナビ（2026-09-12でお指摘：折りたたみ<details>は「どこが開閉
    //    できるのか分かりにくい」）。hacomono同様、左の細いカテゴリー列で選ぶと右側に
    //    そのカテゴリーのタブ一覧が出る2ペイン構成に変更。常に1カテゴリーだけが
    //    アクティブなので状態が曖昧にならない。 ──
    function selectCategory(category) {
      document.querySelectorAll('.pd-rail-btn').forEach(b => b.classList.toggle('active', b.dataset.category === category));
      document.querySelectorAll('.pd-panel-section').forEach(s => { s.style.display = s.dataset.panel === category ? '' : 'none'; });
    }
    document.querySelectorAll('.pd-rail-btn').forEach(btn => {
      btn.addEventListener('click', () => selectCategory(btn.dataset.category));
    });
    function openGroupFor(tabId) {
      const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
      const section = btn?.closest('.pd-panel-section');
      if (section) selectCategory(section.dataset.panel);
    }

    // switchTab()は見た目（activeクラス）の切り替えだけを行う純粋な関数。
    // 各タブの実データ読み込みは「タブボタンをクリックした時」のイベントリスナー
    // （data-tab="X"へのaddEventListener('click', loadX)）にしか紐づいていない。
    //
    // 過去にswitchTab内で対応ボタンのclickイベントを自前でdispatchしてこれを
    // 補おうとしたが、ユーザーが本物のタブボタンをクリックした時に「共通リスナー
    // →switchTab→dispatch→共通リスナーとloadXが再実行→dispatch完了後、元の
    // ネイティブイベントの続きでloadXがもう一度実行」という二重発火を起こし、
    // 2つの非同期ロードが競合してDOM・イベントバインドが不安定になっていた
    // （でお報告2026-09-14：「今日の業務」の一覧クリックが直らない、の実際の原因）。
    // 正しい修正：switchTabからdispatchを完全に排除し、プログラムからタブを
    // 切り替えたい箇所（起動時タブの自動切り替え等）は、この関数ではなく
    // 対応するタブボタンの.click()を直接呼ぶ（ネイティブクリックと全く同じ
    // 経路を1回だけ通るため、二重発火が起こりようがない）。
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      openGroupFor(tabId);
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const pane = document.getElementById('tab-' + tabId);
      if (btn) btn.classList.add('active');
      if (pane) pane.classList.add('active');
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => { switchTab(btn.dataset.tab); closeMobileNav(); });
    });

    // ── モバイル用サイドバードロワー開閉 ──────────────────────────
    function closeMobileNav() {
      document.getElementById('pd-sidebar')?.classList.remove('pd-open');
      document.getElementById('pd-backdrop')?.classList.remove('pd-open');
    }
    document.getElementById('pd-menu-btn')?.addEventListener('click', () => {
      document.getElementById('pd-sidebar')?.classList.add('pd-open');
      document.getElementById('pd-backdrop')?.classList.add('pd-open');
    });
    document.getElementById('pd-backdrop')?.addEventListener('click', closeMobileNav);

    // ── チュートリアル ─────────────────────────────────────────
    // 以前はタブを開くたびに（初回のみ）自動でこの案内を上部に出していたが、
    // 「使い始めは助かるが慣れたら邪魔・毎回一番上に出るのがわかりづらい」という
    // でお指摘（2026-09-12）を受けて自動表示は廃止。①初回ダッシュボード訪問時だけ
    // 「📘 チュートリアル」タブ（全タブの案内をまとめて閲覧）に自動着地、②各タブの
    // ヘッダーにあった「💡 使い方を見る」ボタンでその場に手動表示、の2経路にしていたが、
    // ②は全タブヘッダーに常時表示されノイズになっていた上、内容は「チュートリアル」
    // タブに既にまとまっているため重複していた（でお+奥様指摘2026-09-13：使い方
    // メニューにまとめるだけで十分）。②のボタンは廃止し、①のみに統一。
    function renderTutorial(tabId) {
      const box = document.getElementById('tab-tutorial-banner');
      if (!box) return;
      if (localStorage.getItem(TUTORIAL_MUTED_KEY)) { box.innerHTML = ''; return; }
      const entry = TAB_TUTORIALS[tabId];
      if (!entry || localStorage.getItem(tutorialSeenKey(tabId))) { box.innerHTML = ''; return; }
      box.innerHTML = `
        <div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.35);border-radius:12px;padding:16px 18px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-weight:700;color:#c9a84c;font-size:13px;">💡 ${entry.title}タブの使い方</p>
          <ol style="margin:0 0 12px;padding-left:20px;font-size:13px;line-height:1.8;color:#1a1410;">
            ${entry.tips.map(t => `<li>${t}</li>`).join('')}
          </ol>
          <button type="button" id="tutorial-dismiss-btn" class="btn btn-ghost" style="font-size:12px;padding:6px 14px;">わかった</button>
          <button type="button" id="tutorial-mute-btn" class="btn btn-ghost" style="font-size:12px;padding:6px 14px;margin-left:8px;">すべて非表示にする</button>
        </div>
      `;
      document.getElementById('tutorial-dismiss-btn')?.addEventListener('click', () => {
        localStorage.setItem(tutorialSeenKey(tabId), '1');
        box.innerHTML = '';
      });
      document.getElementById('tutorial-mute-btn')?.addEventListener('click', () => {
        localStorage.setItem(TUTORIAL_MUTED_KEY, '1');
        box.innerHTML = '';
      });
    }
    document.getElementById('tutorial-unmute-btn')?.addEventListener('click', () => {
      localStorage.removeItem(TUTORIAL_MUTED_KEY);
      Object.keys(TAB_TUTORIALS).forEach(key => localStorage.removeItem(tutorialSeenKey(key)));
      showToast('各タブの案内を出し直しました');
    });

    const tabParam = new URLSearchParams(location.search).get('tab');
    const DASHBOARD_VISITED_KEY = 'fineme:provider:dashboard-visited';
    let needsLandingTabApply = false;
    if (tabParam) {
      switchTab(tabParam);
    } else if (!localStorage.getItem(DASHBOARD_VISITED_KEY)) {
      // 初めてのダッシュボード訪問はチュートリアルタブから
      switchTab('tutorial');
    } else {
      // URL指定も初回訪問でもない、通常のログイン時。店舗が「起動時に開くタブ」を
      // カスタマイズしていればそれを優先する（でお要望2026-09-13：予約カレンダーを
      // 最初に開きたい、等）。設定はAPIから非同期取得するため、取得完了後
      // （下のdashboardPrefs初期化処理）に一度だけ切り替える。
      needsLandingTabApply = true;
    }
    localStorage.setItem(DASHBOARD_VISITED_KEY, '1');

    // ── ダッシュボード表示カスタマイズ設定（でお要望2026-09-13） ─────────
    // 起動時に開くタブ・サイドバーの並び順・カレンダーの向き/初期表示は店舗により
    // ニーズが分かれるため、lib/dashboard-prefs.jsのデフォルト値を今の構成のまま
    // 使いつつ、店舗ごとに変更できるようにする。calendar IIFE等、後方の複数の
    // クロージャから読めるようダッシュボードのトップレベルで保持する。
    let dashboardPrefs = null;

    // ヘッダー（モバイル用トップバー）のショートカットボタンを描画（でお要望2026-09-14）。
    // サイドバーを開かずに主要タブへ直接飛べるようにする。タブボタン自体を.click()するだけ
    // なので、対象タブ固有のデータ読み込みロジックもそのまま流用できる。
    function renderHeaderShortcuts(prefs) {
      const el = document.getElementById('pd-topbar-shortcuts');
      if (!el) return;
      const keys = prefs?.header_shortcuts || [];
      el.innerHTML = keys.map(k => {
        const opt = HEADER_SHORTCUT_OPTIONS.find(o => o.key === k);
        if (!opt) return '';
        return `<button type="button" class="pd-topbar-shortcut-btn" data-shortcut-tab="${k}">${opt.label}</button>`;
      }).join('');
      el.querySelectorAll('[data-shortcut-tab]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelector(`[data-tab="${btn.dataset.shortcutTab}"]`)?.click();
        document.getElementById('pd-sidebar')?.classList.remove('pd-open');
        document.getElementById('pd-backdrop')?.classList.remove('pd-open');
      }));
    }

    (async () => {
      const _prefsToken = getSupabaseToken();
      if (!_prefsToken) return;
      const res = await fetch('/api/provider/dashboard-prefs', { headers: { Authorization: `Bearer ${_prefsToken}` } });
      if (!res.ok) return;
      const { prefs } = await res.json();
      dashboardPrefs = prefs;
      renderHeaderShortcuts(prefs);

      // サイドバーの並び順を適用（CSS flexのorderプロパティで見た目の順序だけ変える。
      // DOM構造・data-category自体は変えないので他のロジックへの影響がない）。
      prefs.sidebar_order.forEach((key, i) => {
        const btn = document.querySelector(`.pd-rail-btn[data-category="${key}"]`);
        if (btn) btn.style.order = String(i);
      });

      // 起動時タブの適用。switchTab()は見た目だけなので、対応するタブボタンの
      // .click()を直接呼ぶ（ネイティブクリックと全く同じ経路を1回だけ通るため、
      // switchTab側の共通リスナーとタブ固有ロードの両方が正しく1回ずつ動く）。
      // このタイミングは非同期フェッチ完了後のため、各タブのクリックリスナーは
      // 既に登録済みで安全に呼べる。
      if (needsLandingTabApply) {
        document.querySelector(`[data-tab="${prefs.landing_tab}"]`)?.click();
      }
    })();

    // ── Provider data helpers ────────────────────────────────────
    function loadProviderData() {
      try { const raw = localStorage.getItem(PROVIDER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function getSupabaseToken() {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!key) return null;
        const session = JSON.parse(localStorage.getItem(key));
        return session?.access_token || null;
      } catch { return null; }
    }

    // getSupabaseToken()はlocalStorageのaccess_tokenを直接読むだけでSupabase SDKの
    // 自動リフレッシュを経由しない。タブを長時間開いたまま、またはブラウザを閉じて
    // 後日再訪すると期限切れのトークンのままAPIを叩き続け、各タブが軒並み
    // 「取得エラー」になっていた（でお報告：再ログインすると直る＝セッション切れが原因）。
    // ここでSDK経由のgetSession()を一度呼んでおくと、必要な場合は裏側でリフレッシュされ
    // localStorageの値も更新される（以降のgetSupabaseToken()の読み取り値が新しくなる）。
    //
    // ただしこれはページを開いた瞬間の1回きり。SDKのautoRefreshTokenはタブが
    // バックグラウンドになっている間（他の作業・PCスリープ等）はタイマーが動かない
    // ことがあり、アクセストークンの有効期限（既定1時間）が来た状態で長時間放置すると
    // 復帰後もgetSupabaseToken()は古いトークンを返し続け、業務中に何度もログインし
    // 直す羽目になっていた（でお報告2026-09-12：「セッションの有効期限がすぐ切れる」）。
    // 対策として、①タブがバックグラウンドから戻った瞬間（visibilitychange）と
    // ②念のための定期チェック（10分毎）の両方でgetSession()を呼び直し、
    // 開きっぱなしでも裏側で自動延長され続けるようにする。
    _sb.auth.getSession().catch(() => {});
    const sessionKeepAlive = setInterval(() => { _sb.auth.getSession().catch(() => {}); }, 10 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') _sb.auth.getSession().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisible);

    // ログアウト（でお要望2026-09-15）
    document.getElementById('pd-logout-btn')?.addEventListener('click', async () => {
      if (!confirm('ログアウトしますか？')) return;
      await _sb.auth.signOut().catch(() => {});
      window.location.href = '/login';
    });

    // 上のgetSession()呼び出しでも直せない場合（リフレッシュトークン自体も失効等）に、
    // 各タブの「取得エラー」を401の時だけ再ログイン導線付きに出し分けるための共通ヘルパー。
    function authErrorHtml(res) {
      if (res?.status === 401) {
        return '<p style="color:#ef4444" class="muted">セッションの有効期限が切れています。<a href="/login?redirect=%2Fprovider%2Fdashboard" style="color:inherit;text-decoration:underline;font-weight:700;">再ログインしてください</a></p>';
      }
      return '<p style="color:#ef4444" class="muted">取得エラー</p>';
    }

    async function fetchAndCacheProviderData() {
      const token = getSupabaseToken();
      if (!token) return null;
      try {
        const res = await fetch('/api/provider/me', {
          headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(data));
        return data;
      } catch { return null; }
    }

    const PLAN_LABELS = { A: 'ライト（¥5,000/月）', B: 'スタンダード（¥7,000/月）', C: 'プレミアム（¥10,000/月）', free: '特例（無料）' };

    function calcPageScore(prov, svcs) {
      let s = 0;
      if (prov?.photo_url) s += 10;
      if (prov?.cover_image_url) s += 5;
      if (prov?.catchphrase) s += 10;
      if (prov?.philosophy) s += 10;
      if (prov?.unique_strengths) s += 10;
      if ((prov?.facility_photos || []).filter(Boolean).length > 0) s += 5;
      if (svcs?.length > 0) s += 15;
      if (svcs?.some(x => x.transformation_promise)) s += 15;
      if (svcs?.some(x => x.target_axis)) s += 10;
      if (svcs?.some(x => (x.before_text && x.after_text) || (x.before_image_url && x.after_image_url))) s += 10;
      return Math.min(s, 100);
    }
    function renderPageScore(prov, svcs) {
      const el = document.getElementById('page-score-bar');
      if (!el) return;
      const score = calcPageScore(prov, svcs);
      const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#ef4444';
      const msg = score >= 80 ? '掲載者として誇れるページです' : score >= 50 ? 'もう少しで魅力的なページになります' : 'まだ掲載者の魅力が伝わりにくい状態です';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;font-weight:700;color:rgba(26,20,16,0.9)">ページ完成度</span>
          <span style="font-size:14px;font-weight:900;color:${color}">${score}%</span>
        </div>
        <div style="height:8px;background:rgba(26,20,16,0.12);border-radius:99px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${score}%;background:${color};border-radius:99px;transition:width .4s ease"></div>
        </div>
        <div style="font-size:11px;color:${color};font-weight:600">${msg}</div>
      `;
    }

    let provider = loadProviderData();
    fetchAndCacheProviderData().then(data => {
      if (data && JSON.stringify(data) !== JSON.stringify(provider)) {
        location.reload();
      }
    });

    if (provider) {
      const fnCode = provider.referral_code || '';
      const slug = provider.slug || fnCode.toLowerCase() || '';
      if (slug) {
        document.getElementById('view-page-btn').href = `/provider/${slug}`;
        const lpPreviewBtn = document.getElementById('lp-preview-btn');
        if (lpPreviewBtn) lpPreviewBtn.href = `/provider/${slug}/for/eyebrow`;
      }
      document.getElementById('billing-plan').textContent = PLAN_LABELS[provider.plan || 'A'] || 'プランA';
      if (provider.plan === 'free') {
        document.getElementById('billing-status').textContent = '';
        const billingStatusEl = document.getElementById('billing-status');
        if (billingStatusEl) billingStatusEl.style.display = 'none';
      } else {
        document.getElementById('billing-status').textContent = provider.billing_started ? '課金中' : '課金はまだ始まっていません（初回予約発生後に開始）';
      }
      document.getElementById('referral-code').textContent = fnCode || slug || '—';
      document.getElementById('publish-toggle-input').checked = !!provider.published;
      document.getElementById('publish-label').textContent = provider.published ? '公開中' : '非公開';
      ['name', 'catchphrase', 'target_desc', 'philosophy', 'guide_message', 'photo_url',
       'unique_strengths', 'nearest_station', 'prefecture', 'address',
       'price_from',
      ].forEach(k => {
        const el = document.getElementById('profile-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      // 都道府県に連動して市区町村セレクトを更新し、保存済みの市区町村を選択
      const prefEl = document.getElementById('profile-form').elements['prefecture'];
      const cityEl = document.getElementById('profile-city-select');
      if (prefEl && cityEl && provider.prefecture) {
        populateCitySelect(cityEl, provider.prefecture);
        cityEl.value = provider.city || '';
      }
      // service-form内のAIフィールド読み込み
      ['ideal_client_desc', 'client_before_state', 'transformation_pattern', 'best_fit_desc'].forEach(k => {
        const el = document.getElementById('service-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      // AI分析ステータス表示 & ボタン制御
      const aiStatus = document.getElementById('ai-match-status');
      if (provider.ai_match_profile) {
        const d = provider.ai_match_profile;
        const date = d.analyzed_at ? new Date(d.analyzed_at).toLocaleDateString('ja-JP') : '';
        if (aiStatus) aiStatus.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析済み（${date}）</span><br><span style="font-size:12px;color:rgba(26,20,16,0.6)">${d.summary || ''}</span>`;
        setAnalyzeButtonState(true);
      } else {
        if (aiStatus) aiStatus.textContent = '未分析 — プロフィールを入力後「AIで分析する」ボタンを押してください';
        setAnalyzeButtonState(false);
      }
      // カバー画像プレビュー
      if (provider.cover_image_url) {
        const cp = document.getElementById('cover-photo-preview');
        const cw = document.getElementById('cover-photo-preview-wrap');
        const cu = document.querySelector('[name=cover_image_url]');
        if (cp) cp.src = provider.cover_image_url;
        if (cw) cw.style.display = 'block';
        if (cu) cu.value = provider.cover_image_url;
      }
      const oaEl = document.querySelector('[name=online_available]');
      if (oaEl) oaEl.checked = !!provider.online_available;
      (provider.facility_photos || []).forEach((url, i) => {
        const el = document.querySelector(`[name=facility_photo_${i + 1}]`);
        if (el) el.value = url || '';
      });

      ['description', 'provider_style'].forEach(k => {
        const el = document.getElementById('service-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      // 新サービスフィールド
      ['cancellation_policy', 'first_session_desc', 'trial_desc'].forEach(k => {
        const el = document.getElementById('service-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      const taEl = document.querySelector('[name=trial_available]');
      if (taEl) taEl.checked = !!provider.trial_available;
      const rhEl = document.getElementById('service-form').elements['response_hours'];
      if (rhEl && provider.response_hours) rhEl.value = String(provider.response_hours);

      document.querySelectorAll('[name=suitable_triggers]').forEach(cb => { cb.checked = (provider.suitable_triggers || []).includes(cb.value); });
      document.querySelectorAll('[name=handles_failure_patterns]').forEach(cb => { cb.checked = (provider.handles_failure_patterns || []).includes(cb.value); });
      document.querySelectorAll('[name=payment_methods]').forEach(cb => { cb.checked = (provider.payment_methods || []).includes(cb.value); });
    } else {
      document.getElementById('tab-stats').innerHTML = `
        <div class="card" style="padding:20px;text-align:center">
          <p class="muted">掲載者データが見つかりません。</p>
          <p style="font-size:13px;color:#6b7280">運営側より登録が完了次第、こちらに情報が表示されます。</p>
        </div>
      `;
    }

    // 今月の統計を非同期で取得
    (async function loadDashboardStats() {
      const pid = provider?.id;
      if (!pid) return;
      const yyyymm = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 今月のページ閲覧数
      try {
        const res = await fetch(`/api/track/provider-view?provider_id=${encodeURIComponent(pid)}&month=${yyyymm}`);
        if (res.ok) {
          const data = await res.json();
          document.getElementById('stat-views').textContent = (data.total || 0) + '回';
        } else {
          document.getElementById('stat-views').textContent = '—';
        }
      } catch { document.getElementById('stat-views').textContent = '—'; }

      // 今月の問い合わせ数（予約リクエスト）
      try {
        const _statsToken = getSupabaseToken();
        const res = await fetch(`/api/reservations?providerId=${encodeURIComponent(pid)}`, {
          headers: _statsToken ? { 'Authorization': `Bearer ${_statsToken}` } : {}
        });
        if (res.ok) {
          const items = await res.json();
          const thisMonthItems = items.filter(r => (r.created_at || '').startsWith(yyyymm));
          const inquiryCount = thisMonthItems.length;
          document.getElementById('stat-inquiries').textContent = inquiryCount + '件';

          // 予約転換率・確定数・来店数
          const approvedCount = thisMonthItems.filter(r => r.status === 'approved').length;
          const visitedCount = thisMonthItems.filter(r => r.status === 'visited').length;
          const cvr = inquiryCount > 0 ? Math.round((approvedCount / inquiryCount) * 100) : 0;
          document.getElementById('stat-approved').textContent = approvedCount + '件';
          document.getElementById('stat-cvr').textContent = cvr + '%';
          document.getElementById('stat-visited').textContent = visitedCount + '件';
        } else {
          document.getElementById('stat-inquiries').textContent = '—';
          document.getElementById('stat-approved').textContent = '—';
          document.getElementById('stat-cvr').textContent = '—';
          document.getElementById('stat-visited').textContent = '—';
        }
      } catch {
        document.getElementById('stat-inquiries').textContent = '—';
        document.getElementById('stat-approved').textContent = '—';
        document.getElementById('stat-cvr').textContent = '—';
        document.getElementById('stat-visited').textContent = '—';
      }

      // 紹介報酬（今月の見込み）
      try {
        const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
        if (res.ok) {
          const data = await res.json();
          const amount = data.summary?.pending_this_month || 0;
          document.getElementById('stat-referrals').textContent = '¥' + amount.toLocaleString();
        } else {
          document.getElementById('stat-referrals').textContent = '—';
        }
      } catch { document.getElementById('stat-referrals').textContent = '—'; }
    })();

    // ── New Me Navi カバー軸の表示 ─────────────────────────────────
    if (provider) {
      const CAT_TO_AXIS = { gym:'body', eyebrow:'eyebrow', fashion:'fashion', hair:'hair', aga:'hair', makeup:'skin', hairremoval:'skin', esthetic:'skin', whitening:'teeth', orthodontics:'teeth', nail:'nail' };
      const AXIS_LABELS = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
      const AXIS_ICONS = { body:'💪', eyebrow:'✏️', fashion:'👔', hair:'💇', skin:'✨', teeth:'😁', nail:'💅' };
      const allCats = [provider.main_category, ...(provider.sub_categories || [])].filter(Boolean);
      const coveredAxes = [...new Set(allCats.map(c => CAT_TO_AXIS[c]).filter(Boolean))];
      const infoEl = document.getElementById('axis-coverage-info');
      if (infoEl) {
        if (coveredAxes.length > 0) {
          infoEl.innerHTML = `
            <div style="padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
              <p style="font-size:12px;font-weight:700;color:#059669;margin:0 0 8px">✓ 自動検出されたカバー軸（8軸のうち）</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${coveredAxes.map(ax => `<span style="font-size:13px;font-weight:700;padding:4px 12px;background:#dcfce7;color:#15803d;border-radius:99px">${AXIS_ICONS[ax]} ${AXIS_LABELS[ax]}</span>`).join('')}
              </div>
              <p style="font-size:12px;color:#6b7280;margin:8px 0 0">このサービスがカバーする軸のギャップが大きいユーザーほど一致度が高くなります。</p>
            </div>`;
        } else {
          infoEl.innerHTML = `<div style="padding:10px 14px;background:#fef9c3;border:1px solid #fde68a;border-radius:10px;font-size:13px;color:#92400e">このサービスのカテゴリは8軸外（photo / consulting等）のため、軸一致スコアは計算されません。きっかけ・スタイルの一致で判定されます。</div>`;
        }
      }
    }

    // ── 公開設定トグル ───────────────────────────────────────────
    document.getElementById('publish-toggle-input').addEventListener('change', async function () {
      document.getElementById('publish-label').textContent = this.checked ? '公開中' : '非公開';
      await saveToLocal({ published: this.checked });
    });

    // ── フォーム保存 ─────────────────────────────────────────────
    async function saveToLocal(updates) {
      try {
        const raw = localStorage.getItem(PROVIDER_KEY);
        const d = raw ? JSON.parse(raw) : {};
        Object.assign(d, updates);
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(d));
      } catch {}
      const token = getSupabaseToken();
      if (token) {
        try {
          const res = await fetch('/api/provider/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify(updates)
          });
          if (res.ok) {
            const updated = await res.json();
            localStorage.setItem(PROVIDER_KEY, JSON.stringify(updated));
            showToast('保存しました');
            return true;
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast('保存エラー: ' + (errData.error || res.status));
            return false;
          }
        } catch (e) { showToast('通信エラー: ' + e.message); return false; }
      } else {
        showToast('保存しました');
        return true;
      }
    }

    function showToast(msg) {
      try {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:999';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
      } catch {}
    }
    // 動的HTML内のinline onclick属性はグローバルスコープで実行されるため、そこから
    // 呼べるようwindowにも公開する（approveRequest等の既存グローバル関数と同じ理由）。
    window.showToast = showToast;

    // 一覧の行タップで開くポップアップ等、複数箇所で必要になる共通のタップ判定。
    // iOS Safariは指のわずかな動きをスクロールジェスチャーと誤判定し、合成click
    // イベント自体をキャンセルすることがある（でお報告2026-09-14で原因確定：
    // pointerdown/touchstartは発火するのにclickだけ発火しない）。touchstart→
    // touchendの移動量が小さい場合だけ「タップ」として処理し、その場合は
    // preventDefaultで後続の合成clickを抑止する（PC側のclickはそのまま生きる）。
    function bindTapHandler(el, handler) {
      let startX = 0, startY = 0, moved = false;
      el.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY; moved = false;
      }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) moved = true;
      }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (!moved) {
          e.preventDefault();
          const t = e.changedTouches[0];
          // クリック位置が必要なハンドラ（カレンダーの空き枠タップ等）のため、
          // touch側でもclientX/clientY・targetをMouseEventと同じ形で渡す。
          handler({ clientX: t.clientX, clientY: t.clientY, target: e.target, currentTarget: el });
        }
      });
      el.addEventListener('click', handler);
    }

    // 市区町村セレクトを都道府県に連動して更新
    function populateCitySelect(selectEl, prefecture) {
      const cities = JAPAN_CITIES[prefecture] || [];
      selectEl.innerHTML = '<option value="">市区町村を選ぶ（任意）</option>';
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        selectEl.appendChild(opt);
      });
    }
    const profilePrefEl = document.getElementById('profile-form').elements['prefecture'];
    const profileCityEl = document.getElementById('profile-city-select');
    if (profilePrefEl && profileCityEl) {
      profilePrefEl.addEventListener('change', () => {
        populateCitySelect(profileCityEl, profilePrefEl.value);
        profileCityEl.value = '';
      });
    }

    document.getElementById('profile-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      // boolean
      data.online_available = !!e.target.querySelector('[name=online_available]')?.checked;
      // numbers
      if (data.price_from) data.price_from = Number(data.price_from) || null;
      // arrays
      data.payment_methods = [...e.target.querySelectorAll('[name=payment_methods]:checked')].map(el => el.value);
      // city は select から取得
      data.city = profileCityEl ? profileCityEl.value : '';
      // facility_photos: 3つのURL入力を配列に結合
      data.facility_photos = [fd.get('facility_photo_1'), fd.get('facility_photo_2'), fd.get('facility_photo_3')].filter(Boolean);
      delete data.facility_photo_1; delete data.facility_photo_2; delete data.facility_photo_3;
      // プロフィール保存時にAI分析をリセット（再分析を促す）
      data.ai_match_profile = null;
      const ok = await saveToLocal(data);
      if (ok) setAnalyzeButtonState(false);
    });

    // AI分析ボタンの有効/無効を制御
    function setAnalyzeButtonState(analyzed) {
      const btn = document.getElementById('ai-analyze-btn');
      const status = document.getElementById('ai-match-status');
      if (!btn) return;
      if (analyzed) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.title = 'プロフィールを編集して保存すると再分析できます';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.title = '';
        if (status && !status.innerHTML.includes('✅')) {
          status.textContent = '未分析（ボタンを押すとマッチング精度が向上します）';
        }
      }
    }

    // AI分析ボタン
    document.getElementById('ai-analyze-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('ai-analyze-btn');
      const status = document.getElementById('ai-match-status');
      const token = getSupabaseToken();
      if (!token) { showToast('ログインが必要です'); return; }
      btn.disabled = true;
      btn.textContent = '分析中…';
      if (status) status.textContent = 'Claudeがプロフィールを読み取っています…';
      try {
        const res = await fetch('/api/provider/analyze', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '分析に失敗しました');
        const d = json.profile;
        if (status) {
          status.innerHTML = `<span style="color:#059669;font-weight:700">✅ AI分析完了</span><br><span style="font-size:12px;color:#6b7280">${d.summary || ''}</span>`;
        }
        showToast('✅ AI分析が完了しました。マッチングに反映されます。');
        setAnalyzeButtonState(true);
      } catch (err) {
        if (status) status.textContent = `エラー: ${err.message}`;
        showToast(`分析失敗: ${err.message}`);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'AIで分析する';
      } finally {
        if (btn.textContent === '分析中…') btn.textContent = 'AIで分析する';
      }
    });

    document.getElementById('service-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.suitable_triggers = [...e.target.querySelectorAll('[name=suitable_triggers]:checked')].map(el => el.value);
      data.handles_failure_patterns = [...e.target.querySelectorAll('[name=handles_failure_patterns]:checked')].map(el => el.value);
      data.trial_available = !!e.target.querySelector('[name=trial_available]')?.checked;
      data.response_hours = data.response_hours ? Number(data.response_hours) : null;
      saveToLocal(data);
    });

    // ── サービス（メニュー）管理 ─────────────────────────────────
    (function setupServices() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('services-list');
      const editCard = document.getElementById('service-edit-card');
      const editForm = document.getElementById('service-edit-form');
      const editTitle = document.getElementById('service-edit-title');

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      async function loadServices() {
        if (!listEl) return;
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        renderPageScore(provider, items);
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだサービスがありません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f3f4f6;gap:10px';
          const AXIS_LABELS_D = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', hairremoval:'脱毛', teeth:'歯', nail:'爪' };
          const AXIS_ICONS_D  = { body:'💪', eyebrow:'✏️', fashion:'👔', hair:'💇', skin:'✨', hairremoval:'🪒', teeth:'😁', nail:'💅' };
          row.innerHTML = `
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;font-size:14px">${esc(s.name)}</span>
                ${s.is_featured ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">看板</span>' : ''}
                ${s.target_axis ? `<span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:99px">${AXIS_ICONS_D[s.target_axis]||''} ${AXIS_LABELS_D[s.target_axis]||s.target_axis}</span>` : ''}
              </div>
              <div style="font-size:13px;color:#6b7280">¥${Number(s.price).toLocaleString()}${s.duration ? ' · ' + esc(s.duration) : ''}</div>
              ${s.transformation_promise ? `<div style="font-size:12px;color:#374151;margin-top:3px;font-style:italic">「${esc(s.transformation_promise)}」</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-del="${s.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = items.find(x => x.id === btn.dataset.edit); if (!s) return;
          editTitle.textContent = 'サービスを編集'; editCard.style.display = 'block';
          editForm.elements['name'].value = s.name || ''; editForm.elements['price'].value = s.price || '';
          editForm.elements['duration'].value = s.duration || '';
          editForm.elements['is_featured'].checked = !!s.is_featured; editForm.elements['_service_id'].value = s.id;
          editForm.querySelectorAll('[name=suitable_path_types]').forEach(cb => { cb.checked = (s.suitable_path_types || []).includes(cb.value); });
          // 新フィールド
          if (editForm.elements['target_axis']) editForm.elements['target_axis'].value = s.target_axis || '';
          if (editForm.elements['category']) editForm.elements['category'].value = s.category || '';
          if (editForm.elements['transformation_promise']) editForm.elements['transformation_promise'].value = s.transformation_promise || '';
          if (editForm.elements['before_text']) editForm.elements['before_text'].value = s.before_text || '';
          if (editForm.elements['after_text']) editForm.elements['after_text'].value = s.after_text || '';
          if (editForm.elements['benefit_list_text']) editForm.elements['benefit_list_text'].value = (s.benefit_list || []).join('\n');
          const sImgPreview = document.getElementById('service-img-preview');
          const sImgPreviewWrap = document.getElementById('service-img-preview-wrap');
          const sImgUrl = document.getElementById('service-image-url');
          if (s.image_url) { if (sImgPreview) sImgPreview.src = s.image_url; if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'block'; if (sImgUrl) sImgUrl.value = s.image_url; }
          else { if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'none'; if (sImgUrl) sImgUrl.value = ''; }
          const sBIp = document.getElementById('service-before-img-preview'), sBIw = document.getElementById('service-before-img-wrap'), sBIu = document.getElementById('service-before-image-url');
          if (s.before_image_url) { if (sBIp) sBIp.src = s.before_image_url; if (sBIw) sBIw.style.display = 'block'; if (sBIu) sBIu.value = s.before_image_url; }
          else { if (sBIw) sBIw.style.display = 'none'; if (sBIu) sBIu.value = ''; }
          const sAIp = document.getElementById('service-after-img-preview'), sAIw = document.getElementById('service-after-img-wrap'), sAIu = document.getElementById('service-after-image-url');
          if (s.after_image_url) { if (sAIp) sAIp.src = s.after_image_url; if (sAIw) sAIw.style.display = 'block'; if (sAIu) sAIu.value = s.after_image_url; }
          else { if (sAIw) sAIw.style.display = 'none'; if (sAIu) sAIu.value = ''; }
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このサービスを削除しますか？')) return;
          await fetch(`/api/provider/services/${btn.dataset.del}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
          loadServices();
        }));
      }

      function resetServiceImgPreview() {
        const w = document.getElementById('service-img-preview-wrap'); if (w) w.style.display = 'none';
        const u = document.getElementById('service-image-url'); if (u) u.value = '';
        const m = document.getElementById('service-img-msg'); if (m) { m.style.display = 'none'; m.textContent = ''; }
        const bw = document.getElementById('service-before-img-wrap'); if (bw) bw.style.display = 'none';
        const bu = document.getElementById('service-before-image-url'); if (bu) bu.value = '';
        const bm = document.getElementById('service-before-img-msg'); if (bm) { bm.style.display = 'none'; bm.textContent = ''; }
        const aw = document.getElementById('service-after-img-wrap'); if (aw) aw.style.display = 'none';
        const au = document.getElementById('service-after-image-url'); if (au) au.value = '';
        const am = document.getElementById('service-after-img-msg'); if (am) { am.style.display = 'none'; am.textContent = ''; }
      }
      document.getElementById('btn-add-service')?.addEventListener('click', () => {
        editTitle.textContent = 'サービスを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_service_id'].value = '';
        resetServiceImgPreview();
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('service-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset(); resetServiceImgPreview();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id = fd.get('_service_id');
        const suitablePathTypes = [...editForm.querySelectorAll('[name=suitable_path_types]:checked')].map(el => el.value);
        const benefitListRaw = fd.get('benefit_list_text') || '';
        const benefitList = benefitListRaw.split('\n').map(s => s.replace(/^[・▶→✓\s]+/, '').trim()).filter(Boolean);
        const body = { name: fd.get('name'), price: Number(fd.get('price')), duration: fd.get('duration') || null, is_featured: !!editForm.elements['is_featured'].checked, image_url: fd.get('image_url') || null, suitable_path_types: suitablePathTypes.length > 0 ? suitablePathTypes : null, target_axis: fd.get('target_axis') || null, transformation_promise: fd.get('transformation_promise') || null, before_text: fd.get('before_text') || null, after_text: fd.get('after_text') || null, before_image_url: fd.get('before_image_url') || null, after_image_url: fd.get('after_image_url') || null, benefit_list: benefitList.length > 0 ? benefitList : null, category: fd.get('category') || null };
        const url = id ? `/api/provider/services/${id}` : '/api/provider/services';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadServices(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="service"]').forEach(btn => btn.addEventListener('click', loadServices, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'service') loadServices();
    })();

    // ── スタッフ管理 ─────────────────────────────────────────────
    (function setupStaff() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl    = document.getElementById('staff-list');
      const editCard  = document.getElementById('staff-edit-card');
      const editForm  = document.getElementById('staff-edit-form');
      const editTitle = document.getElementById('staff-edit-title');

      function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      const STAFF_AXIS_LABEL = { eyebrow: '眉', skin: '肌', hair: 'ヘア', expression: '表情', posture: '姿勢', body: '体型', fashion: 'ファッション' };

      async function loadStaff() {
        if (!listEl) return;
        const res = await fetch('/api/provider/staff', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだスタッフが登録されていません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f3f4f6';
          row.innerHTML = `
            <div style="flex-shrink:0">
              ${s.photo_url
                ? `<img src="${esc(s.photo_url)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb" />`
                : `<div style="width:52px;height:52px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px">👤</div>`}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
                <strong style="font-size:14px">${esc(s.name)}</strong>
                ${s.is_featured ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">担当</span>' : ''}
                ${s.role ? `<span style="font-size:12px;color:#6b7280">${esc(s.role)}</span>` : ''}
                ${s.bookable === false ? '<span style="font-size:10px;background:#f3f4f6;color:#9ca3af;padding:1px 6px;border-radius:99px">指名候補に出さない</span>' : s.booking_fee > 0 ? `<span style="font-size:10px;background:#eef2ff;color:#4338ca;padding:1px 6px;border-radius:99px">指名料¥${Number(s.booking_fee).toLocaleString()}</span>` : ''}
              </div>
              ${s.experience_years ? `<span style="font-size:11px;color:#059669">経験${s.experience_years}年</span>` : ''}
              ${s.bio ? `<p style="font-size:12px;color:#9ca3af;margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.bio.slice(0, 60))}${s.bio.length > 60 ? '…' : ''}</p>` : ''}
              ${(s.strong_axes || []).length ? `<div style="margin-top:4px;">${(s.strong_axes || []).map(a => `<span style="font-size:10px;padding:1px 6px;border-radius:99px;background:#eff6ff;color:#2563eb;margin-right:4px;">${esc(STAFF_AXIS_LABEL[a] || a)}</span>`).join('')}</div>` : ''}
              ${s.assignedCount != null ? `<p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">担当${s.assignedCount}人${s.repeatRate != null ? `／リピート率${s.repeatRate}%` : ''}${s.designationRate != null ? `／指名率${s.designationRate}%` : ''}</p>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-staff-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-staff-del="${s.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-staff-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = items.find(x => x.id === btn.dataset.staffEdit); if (!s) return;
          editTitle.textContent = 'スタッフを編集'; editCard.style.display = 'block';
          editForm.elements['name'].value         = s.name || '';
          editForm.elements['role'].value         = s.role || '';
          editForm.elements['bio'].value          = s.bio || '';
          editForm.elements['experience_years'].value = s.experience_years || '';
          editForm.elements['credentials'].value  = s.credentials || '';
          editForm.elements['is_featured'].checked = !!s.is_featured;
          editForm.elements['sort_order'].value   = s.sort_order ?? 0;
          editForm.elements['bookable'].checked   = s.bookable !== false;
          editForm.elements['booking_fee'].value  = s.booking_fee || '';
          editForm.elements['_staff_id'].value    = s.id;
          editForm.elements['strong_types_text'].value = (s.strong_types || []).join(', ');
          document.querySelectorAll('#staff-strong-axes input').forEach(cb => { cb.checked = (s.strong_axes || []).includes(cb.value); });
          const prev = document.getElementById('staff-photo-preview');
          const prevWrap = document.getElementById('staff-photo-preview-wrap');
          const urlEl  = document.getElementById('staff-photo-url');
          if (s.photo_url) { prev.src = s.photo_url; prevWrap.style.display = 'block'; if (urlEl) urlEl.value = s.photo_url; }
          else { prevWrap.style.display = 'none'; if (urlEl) urlEl.value = ''; }
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-staff-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このスタッフを削除しますか？')) return;
          await fetch(`/api/provider/staff/${btn.dataset.staffDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
          loadStaff();
        }));
      }

      document.getElementById('btn-add-staff')?.addEventListener('click', () => {
        editTitle.textContent = 'スタッフを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_staff_id'].value = '';
        document.getElementById('staff-photo-preview-wrap').style.display = 'none';
        document.getElementById('staff-photo-url').value = '';
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('staff-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id  = fd.get('_staff_id');
        const body = {
          name: fd.get('name'), role: fd.get('role') || null, bio: fd.get('bio') || null,
          photo_url: fd.get('photo_url') || null,
          experience_years: fd.get('experience_years') ? Number(fd.get('experience_years')) : null,
          credentials: fd.get('credentials') || null,
          is_featured: !!editForm.elements['is_featured'].checked,
          sort_order: Number(fd.get('sort_order')) || 0,
          bookable: !!editForm.elements['bookable'].checked,
          booking_fee: fd.get('booking_fee') ? Number(fd.get('booking_fee')) : 0,
          strong_axes: Array.from(document.querySelectorAll('#staff-strong-axes input:checked')).map(i => i.value),
          strong_types: String(fd.get('strong_types_text') || '').split(',').map(s => s.trim()).filter(Boolean),
        };
        const url = id ? `/api/provider/staff/${id}` : '/api/provider/staff';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadStaff(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      // スタッフ写真アップロード（サービス画像と同じエンドポイントを流用）
      const staffImgBtn   = document.getElementById('staff-img-btn');
      const staffImgInput = document.getElementById('staff-img-input');
      const staffImgPrev  = document.getElementById('staff-photo-preview');
      const staffImgPrevW = document.getElementById('staff-photo-preview-wrap');
      const staffImgMsg   = document.getElementById('staff-img-msg');
      const staffPhotoUrl = document.getElementById('staff-photo-url');
      if (staffImgBtn) staffImgBtn.addEventListener('click', () => staffImgInput?.click());
      staffImgInput?.addEventListener('change', async () => {
        const file = staffImgInput.files?.[0]; if (!file) return;
        staffImgMsg.textContent = 'アップロード中…'; staffImgMsg.style.display = 'block'; staffImgBtn.disabled = true;
        const fd = new FormData(); fd.append('photo', file);
        try {
          const res  = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` }, body: fd });
          const data = await res.json();
          if (res.ok && data.url) {
            staffImgPrev.src = data.url; staffImgPrevW.style.display = 'block';
            if (staffPhotoUrl) staffPhotoUrl.value = data.url;
            staffImgMsg.textContent = '✓ 写真を設定しました'; staffImgMsg.style.color = '#059669';
          } else { staffImgMsg.textContent = 'エラー: ' + (data.error || '不明'); staffImgMsg.style.color = '#ef4444'; }
        } catch { staffImgMsg.textContent = '通信エラー'; staffImgMsg.style.color = '#ef4444'; }
        staffImgBtn.disabled = false; staffImgInput.value = '';
      });

      document.querySelectorAll('[data-tab="staff"]').forEach(btn => btn.addEventListener('click', loadStaff, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'staff') loadStaff();
    })();

    // ── シフト管理タブ（でお要望2026-09-13） ──────────────────────────
    (function setupShift() {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersShift = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });

      let shiftStaffList = [];
      let currentPeriodId = null;
      let currentPeriodStatus = null;
      let shiftPatterns = []; // [{id,name,slots}]
      let stagingSlots = []; // 新規パターン作成フォーム用 [{start,end,required}]
      let currentDayPatterns = {}; // 選択中の期間の date -> pattern_id
      let currentPeriodStart = null;
      let currentPeriodEnd = null;

      async function loadStaffLinks() {
        const el = document.getElementById('shift-staff-links');
        if (!el) return;
        const res = await fetch('/api/provider/staff', { headers: authHeadersShift() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        shiftStaffList = await res.json();
        if (!shiftStaffList.length) { el.innerHTML = '<p class="muted" style="font-size:13px">スタッフが登録されていません（「スタッフ」タブから登録してください）。</p>'; return; }
        el.innerHTML = shiftStaffList.map(s => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px">
            <span style="flex:1;font-size:13px;font-weight:600">${esc(s.name)}</span>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-shift-copy="${s.shift_access_token}">リンクをコピー</button>
          </div>
        `).join('');
        el.querySelectorAll('[data-shift-copy]').forEach(btn => btn.addEventListener('click', async () => {
          const url = `${location.origin}/staff-shift/${btn.dataset.shiftCopy}`;
          try { await navigator.clipboard.writeText(url); showToast('リンクをコピーしました'); }
          catch { showToast(url); }
        }));
        // シフト表の手動追加フォームのスタッフ選択肢もここで揃える
        const entryStaffSel = document.getElementById('shift-entry-staff');
        if (entryStaffSel) entryStaffSel.innerHTML = shiftStaffList.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
      }

      // ── ルール設定 ──
      document.getElementById('shift-rule-type-select')?.addEventListener('change', (e) => {
        const on = e.target.value === 'staffing_target';
        const patternsWrap = document.getElementById('shift-patterns-wrap');
        if (patternsWrap) patternsWrap.style.display = on ? '' : 'none';
        const dayPatternsWrap = document.getElementById('shift-day-patterns-wrap');
        if (dayPatternsWrap) dayPatternsWrap.style.display = on ? '' : 'none';
      });

      async function loadRuleSettings() {
        const res = await fetch('/api/provider/shift-settings', { headers: authHeadersShift() });
        if (!res.ok) return;
        const data = await res.json();
        const sel = document.getElementById('shift-rule-type-select');
        if (sel) { sel.value = data.rule_type; sel.dispatchEvent(new Event('change')); }
      }
      document.getElementById('shift-rule-save-btn')?.addEventListener('click', async () => {
        const msg = document.getElementById('shift-rule-save-msg');
        const rule_type = document.getElementById('shift-rule-type-select')?.value;
        if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
        const res = await fetch('/api/provider/shift-settings', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ rule_type }),
        });
        if (msg) {
          if (res.ok) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          else { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
        }
      });

      // ── 時間帯パターン（でお要望2026-09-14） ──
      function renderStagingSlots() {
        const el = document.getElementById('shift-pattern-slot-rows');
        if (!el) return;
        if (!stagingSlots.length) { el.innerHTML = '<p class="muted" style="font-size:12px">まだ時間帯がありません。下のフォームから追加してください。</p>'; return; }
        el.innerHTML = stagingSlots.map((s, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px;font-size:13px">
            <span style="flex:1">${esc(s.start)}〜${esc(s.end)}　必要 ${s.required}人</span>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-slot-del="${i}">削除</button>
          </div>
        `).join('');
        el.querySelectorAll('[data-slot-del]').forEach(btn => btn.addEventListener('click', () => {
          stagingSlots.splice(Number(btn.dataset.slotDel), 1);
          renderStagingSlots();
        }));
      }
      document.getElementById('shift-pattern-slot-add-btn')?.addEventListener('click', () => {
        const start = document.getElementById('shift-pattern-slot-start')?.value;
        const end = document.getElementById('shift-pattern-slot-end')?.value;
        const required = Number(document.getElementById('shift-pattern-slot-required')?.value) || 1;
        if (!start || !end) { showToast('開始・終了時刻を入力してください'); return; }
        stagingSlots.push({ start, end, required });
        renderStagingSlots();
      });

      function renderPatternsList() {
        const el = document.getElementById('shift-patterns-list');
        if (!el) return;
        if (!shiftPatterns.length) { el.innerHTML = '<p class="muted" style="font-size:12px">まだパターンがありません。下のフォームから作成してください。</p>'; return; }
        el.innerHTML = shiftPatterns.map(p => `
          <div style="padding:10px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <strong style="flex:1;font-size:13px">${esc(p.name)}</strong>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-pattern-del="${p.id}">削除</button>
            </div>
            <p class="muted" style="font-size:12px;margin:0">${(p.slots || []).map(s => `${esc(s.start)}〜${esc(s.end)}(${s.required}人)`).join('　')}</p>
          </div>
        `).join('');
        el.querySelectorAll('[data-pattern-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このパターンを削除しますか？')) return;
          const res = await fetch(`/api/provider/shift-patterns/${btn.dataset.patternDel}`, { method: 'DELETE', headers: authHeadersShift() });
          if (res.ok) { showToast('削除しました'); loadPatterns(); } else showToast('削除に失敗しました');
        }));
        // 日付ごとのパターン割当フォームの選択肢も揃える
        const daySel = document.getElementById('shift-day-pattern-select');
        if (daySel) daySel.innerHTML = shiftPatterns.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
      }
      async function loadPatterns() {
        const res = await fetch('/api/provider/shift-patterns', { headers: authHeadersShift() });
        shiftPatterns = res.ok ? await res.json() : [];
        renderPatternsList();
      }
      document.getElementById('shift-pattern-save-btn')?.addEventListener('click', async () => {
        const msg = document.getElementById('shift-pattern-save-msg');
        const name = document.getElementById('shift-pattern-name')?.value;
        if (!name?.trim()) { showToast('パターン名を入力してください'); return; }
        if (!stagingSlots.length) { showToast('時間帯を1つ以上追加してください'); return; }
        if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
        const res = await fetch('/api/provider/shift-patterns', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ name, slots: stagingSlots }),
        });
        if (res.ok) {
          document.getElementById('shift-pattern-name').value = '';
          stagingSlots = []; renderStagingSlots();
          if (msg) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          loadPatterns();
        } else if (msg) { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
      });

      // ── 優先度 ──
      async function loadPriorities() {
        const el = document.getElementById('shift-priorities-list');
        if (!el) return;
        if (!shiftStaffList.length) await loadStaffLinks();
        const res = await fetch('/api/provider/shift-priorities', { headers: authHeadersShift() });
        const priorities = res.ok ? await res.json() : [];
        const byStaff = {};
        priorities.forEach(p => { byStaff[p.staff_id] = p.priority_score; });
        if (!shiftStaffList.length) { el.innerHTML = '<p class="muted" style="font-size:12px">スタッフが登録されていません。</p>'; return; }
        el.innerHTML = shiftStaffList.map(s => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px">
            <span style="flex:1;font-size:13px">${esc(s.name)}</span>
            <input type="number" data-priority-staff="${s.id}" value="${byStaff[s.id] ?? 0}" style="width:70px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px" />
          </div>
        `).join('');
      }
      document.getElementById('shift-priorities-save-btn')?.addEventListener('click', async () => {
        const msg = document.getElementById('shift-priorities-save-msg');
        const items = [...document.querySelectorAll('[data-priority-staff]')].map(input => ({
          staff_id: input.dataset.priorityStaff,
          priority_score: Number(input.value) || 0,
        }));
        if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
        const res = await fetch('/api/provider/shift-priorities', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ items }),
        });
        if (msg) {
          if (res.ok) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          else { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
        }
      });

      // ── 期間 ──
      const PERIOD_STATUS_LABEL = { collecting: '希望募集中', draft: '下書き（調整中）', confirmed: '確定済み' };
      const PERIOD_STATUS_COLOR = { collecting: '#f59e0b', draft: '#6366f1', confirmed: '#10b981' };

      async function loadPeriods() {
        const el = document.getElementById('shift-period-list');
        if (!el) return;
        const res = await fetch('/api/provider/shift-periods', { headers: authHeadersShift() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const periods = await res.json();
        if (!periods.length) { el.innerHTML = '<p class="muted" style="font-size:13px">まだ期間がありません。上のフォームから作成してください。</p>'; return; }
        el.innerHTML = periods.map(p => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px;cursor:pointer" data-period-open="${p.id}" data-period-status="${p.status}" data-period-start="${p.period_start}" data-period-end="${p.period_end}">
            <span style="flex:1;font-size:13px">${esc(p.period_start)} 〜 ${esc(p.period_end)}${p.request_deadline ? `（締切: ${esc(p.request_deadline)}）` : ''}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${PERIOD_STATUS_COLOR[p.status]}20;color:${PERIOD_STATUS_COLOR[p.status]}">${PERIOD_STATUS_LABEL[p.status] || p.status}</span>
          </div>
        `).join('');
        el.querySelectorAll('[data-period-open]').forEach(row => row.addEventListener('click', () => selectPeriod(row.dataset.periodOpen, row.dataset.periodStatus, row.dataset.periodStart, row.dataset.periodEnd)));
      }
      document.getElementById('shift-period-add-btn')?.addEventListener('click', async () => {
        const period_start = document.getElementById('shift-period-start')?.value;
        const period_end = document.getElementById('shift-period-end')?.value;
        const request_deadline = document.getElementById('shift-period-deadline')?.value || null;
        if (!period_start || !period_end) { showToast('開始日・終了日を入力してください'); return; }
        const res = await fetch('/api/provider/shift-periods', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ period_start, period_end, request_deadline }),
        });
        if (res.ok) { showToast('期間を作成しました'); loadPeriods(); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      // ── 期間の詳細（希望一覧・シフト表） ──
      async function selectPeriod(id, status, periodStart, periodEnd) {
        currentPeriodId = id;
        currentPeriodStatus = status;
        currentPeriodStart = periodStart;
        currentPeriodEnd = periodEnd;
        const section = document.getElementById('shift-detail-section');
        if (section) section.style.display = '';
        const title = document.getElementById('shift-detail-title');
        if (title) title.textContent = `期間の詳細（${PERIOD_STATUS_LABEL[status] || status}）`;
        const confirmBtn = document.getElementById('shift-confirm-btn');
        if (confirmBtn) confirmBtn.disabled = status === 'confirmed';
        document.getElementById('shift-generate-warnings').innerHTML = '';
        await Promise.all([loadRequestsSummary(), loadEntries(), loadDayPatterns()]);
      }

      // ── 日付ごとのパターン割当（でお要望2026-09-14） ──
      function datesInRange(start, end) {
        const dates = [];
        const cur = new Date(start + 'T00:00:00Z');
        const last = new Date(end + 'T00:00:00Z');
        while (cur <= last) { dates.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
        return dates;
      }
      function renderDayPatternGrid() {
        const el = document.getElementById('shift-day-pattern-grid');
        if (!el || !currentPeriodStart || !currentPeriodEnd) return;
        const patternName = pid => shiftPatterns.find(p => p.id === pid)?.name || '';
        el.innerHTML = datesInRange(currentPeriodStart, currentPeriodEnd).map(date => {
          const assigned = currentDayPatterns[date];
          const day = Number(date.slice(-2));
          return `
            <label style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border:1.5px solid ${assigned ? '#c9a84c' : '#e5e7eb'};border-radius:8px;cursor:pointer;font-size:11px;background:${assigned ? 'rgba(201,168,76,0.08)' : '#fff'}">
              <input type="checkbox" data-day-check="${date}" style="margin:0" />
              <span>${day}日</span>
              <span class="muted" style="font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56px">${esc(patternName(assigned))}</span>
            </label>
          `;
        }).join('');
      }
      async function loadDayPatterns() {
        const wrap = document.getElementById('shift-day-patterns-wrap');
        if (!currentPeriodId || !wrap || wrap.style.display === 'none') { currentDayPatterns = {}; return; }
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}/day-patterns`, { headers: authHeadersShift() });
        currentDayPatterns = {};
        if (res.ok) { (await res.json()).forEach(r => { currentDayPatterns[r.date] = r.pattern_id; }); }
        renderDayPatternGrid();
      }
      document.getElementById('shift-day-pattern-select-all-btn')?.addEventListener('click', () => {
        document.querySelectorAll('[data-day-check]').forEach(cb => { cb.checked = true; });
      });
      document.getElementById('shift-day-pattern-select-none-btn')?.addEventListener('click', () => {
        document.querySelectorAll('[data-day-check]').forEach(cb => { cb.checked = false; });
      });
      document.getElementById('shift-day-pattern-apply-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        const msg = document.getElementById('shift-day-pattern-msg');
        const pattern_id = document.getElementById('shift-day-pattern-select')?.value;
        const dates = [...document.querySelectorAll('[data-day-check]:checked')].map(cb => cb.dataset.dayCheck);
        if (!pattern_id) { showToast('パターンを選んでください'); return; }
        if (!dates.length) { showToast('日付を選んでください'); return; }
        if (msg) { msg.style.color = ''; msg.textContent = '適用中…'; }
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}/day-patterns`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ dates, pattern_id }),
        });
        if (res.ok) {
          if (msg) { msg.style.color = '#4ade80'; msg.textContent = `✓ ${dates.length}日に適用しました`; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          loadDayPatterns();
        } else if (msg) { msg.style.color = '#ef4444'; msg.textContent = '適用に失敗しました'; }
      });

      async function loadRequestsSummary() {
        const el = document.getElementById('shift-requests-summary');
        if (!el || !currentPeriodId) return;
        el.innerHTML = '読み込み中…';
        const nameOf = id => shiftStaffList.find(s => s.id === id)?.name || '(不明)';
        const [reqRes, subRes] = await Promise.all([
          fetch(`/api/provider/shift-requests?periodId=${currentPeriodId}`, { headers: authHeadersShift() }),
          fetch(`/api/provider/shift-submissions?periodId=${currentPeriodId}`, { headers: authHeadersShift() }),
        ]);
        if (!reqRes.ok) { el.innerHTML = authErrorHtml(reqRes); return; }
        const requests = await reqRes.json();
        const submissions = subRes.ok ? await subRes.json() : [];
        const submittedIds = new Set(submissions.map(s => s.staff_id));

        // 提出完了状況（でお要望2026-09-14：日付ごとの提出ボタンをやめた分、店舗側は
        // 誰が「これで完了です」を押したか一目で分かるようにする）
        const statusHtml = shiftStaffList.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${shiftStaffList.map(s => `
              <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${submittedIds.has(s.id) ? '#10b98120' : '#f3f4f6'};color:${submittedIds.has(s.id) ? '#10b981' : '#9ca3af'}">${submittedIds.has(s.id) ? '✓' : '…'} ${esc(s.name)}</span>
            `).join('')}</div>`
          : '';

        if (!requests.length) { el.innerHTML = statusHtml + '<p class="muted" style="font-size:13px">まだ希望が提出されていません。</p>'; return; }
        el.innerHTML = statusHtml + requests.map(r => `
          <div style="font-size:12.5px;padding:4px 0;border-bottom:1px solid rgba(26,20,16,0.06)">
            ${esc(nameOf(r.staff_id))}　${esc(r.date)}　${r.type === 'work' ? `<span style="color:#2563eb">出勤希望 ${esc(r.start_time || '')}〜${esc(r.end_time || '')}</span>` : '<span style="color:#dc2626">休み希望</span>'}${r.note ? `　<span class="muted">${esc(r.note)}</span>` : ''}
          </div>
        `).join('');
      }

      async function loadEntries() {
        const el = document.getElementById('shift-entries-list');
        if (!el || !currentPeriodId) return;
        el.innerHTML = '読み込み中…';
        const res = await fetch(`/api/provider/shift-entries?periodId=${currentPeriodId}`, { headers: authHeadersShift() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const entries = await res.json();
        if (!entries.length) { el.innerHTML = '<p class="muted" style="font-size:13px">まだシフトがありません。「自動作成」を押すか、下のフォームから手動で追加してください。</p>'; return; }
        const nameOf = id => shiftStaffList.find(s => s.id === id)?.name || '(不明)';
        el.innerHTML = entries.map(e => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px;font-size:12.5px">
            <span style="flex:1">${esc(e.date)}　${esc(nameOf(e.staff_id))}　${esc(e.start_time)}〜${esc(e.end_time)}${e.source === 'auto' ? '<span class="muted"> ・自動</span>' : ''}</span>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-entry-del="${e.id}">削除</button>
          </div>
        `).join('');
        el.querySelectorAll('[data-entry-del]').forEach(btn => btn.addEventListener('click', async () => {
          const res2 = await fetch(`/api/provider/shift-entries/${btn.dataset.entryDel}`, { method: 'DELETE', headers: authHeadersShift() });
          if (res2.ok) loadEntries(); else showToast('削除に失敗しました');
        }));
      }

      document.getElementById('shift-entry-add-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        const staff_id = document.getElementById('shift-entry-staff')?.value;
        const date = document.getElementById('shift-entry-date')?.value;
        const start_time = document.getElementById('shift-entry-start')?.value;
        const end_time = document.getElementById('shift-entry-end')?.value;
        if (!staff_id || !date || !start_time || !end_time) { showToast('全項目を入力してください'); return; }
        const res = await fetch('/api/provider/shift-entries', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ period_id: currentPeriodId, staff_id, date, start_time, end_time }),
        });
        if (res.ok) { showToast('追加しました'); loadEntries(); } else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      document.getElementById('shift-generate-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        const btn = document.getElementById('shift-generate-btn');
        btn.disabled = true; btn.textContent = '作成中…';
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}/generate`, { method: 'POST', headers: authHeadersShift() });
        btn.disabled = false; btn.textContent = '⚙️ 自動作成';
        if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); return; }
        const data = await res.json();
        const warnEl = document.getElementById('shift-generate-warnings');
        if (warnEl) {
          warnEl.innerHTML = data.warnings?.length
            ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#92400e">
                ⚠️ 人員が足りない枠が${data.warnings.length}件あります：${data.warnings.map(w => `${esc(w.date)} ${esc(w.start_time)}〜${esc(w.end_time)}（必要${w.required}人・確保${w.filled}人）`).join('／')}
              </div>`
            : '';
        }
        showToast(`${data.createdCount}件のシフトを作成しました`);
        loadEntries();
      });

      document.getElementById('shift-confirm-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        if (!confirm('この期間のシフトを確定しますか？')) return;
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ status: 'confirmed' }),
        });
        if (res.ok) { showToast('確定しました'); loadPeriods(); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      async function loadShiftTab() {
        await loadStaffLinks();
        await Promise.all([loadRuleSettings(), loadPatterns(), loadPriorities(), loadPeriods()]);
      }
      document.querySelectorAll('[data-tab="shift"]').forEach(btn => btn.addEventListener('click', loadShiftTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'shift') loadShiftTab();
    })();

    // ── 部屋・設備タブ（hacomono/STORES網羅計画 Phase 1） ──────────────
    (function setupResources() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl    = document.getElementById('resource-list');
      const editCard  = document.getElementById('resource-edit-card');
      const editForm  = document.getElementById('resource-edit-form');
      const editTitle = document.getElementById('resource-edit-title');
      function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      const TYPE_LABEL = { room: '部屋', equipment: '設備・マシン', other: 'その他' };

      async function loadResources() {
        if (!listEl) return;
        const res = await fetch('/api/provider/resources', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだ登録されていません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(r => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6';
          row.innerHTML = `
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px">${esc(r.name)}</strong>
              <span style="font-size:11px;color:#6b7280;margin-left:6px">${esc(TYPE_LABEL[r.type] || r.type)}</span>
              ${!r.active ? '<span style="font-size:10px;background:#f3f4f6;color:#9ca3af;padding:1px 6px;border-radius:99px;margin-left:6px">停止中</span>' : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-resource-edit="${r.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-resource-del="${r.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-resource-edit]').forEach(btn => btn.addEventListener('click', () => {
          const r = items.find(x => x.id === btn.dataset.resourceEdit); if (!r) return;
          editTitle.textContent = '部屋・設備を編集'; editCard.style.display = 'block';
          editForm.elements['name'].value = r.name || '';
          editForm.elements['type'].value = r.type || 'room';
          editForm.elements['active'].checked = r.active !== false;
          editForm.elements['_resource_id'].value = r.id;
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-resource-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('削除しますか？')) return;
          await fetch(`/api/provider/resources/${btn.dataset.resourceDel}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
          loadResources();
        }));
      }

      document.getElementById('btn-add-resource')?.addEventListener('click', () => {
        editTitle.textContent = '部屋・設備を追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_resource_id'].value = '';
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('resource-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id = fd.get('_resource_id');
        const body = { name: fd.get('name'), type: fd.get('type'), active: !!editForm.elements['active'].checked };
        const url = id ? `/api/provider/resources/${id}` : '/api/provider/resources';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadResources(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="resources"]').forEach(btn => btn.addEventListener('click', loadResources, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'resources') loadResources();
    })();

    // ── 友達紹介プログラム（B2C・でお要望2026-09-14）タブ ─────
    (function setupMemberReferral() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const rewardEl = document.getElementById('mref-reward-text');
      const saveBtn = document.getElementById('mref-save-btn');
      const msgEl = document.getElementById('mref-msg');
      const listEl = document.getElementById('mref-list');

      async function loadSettings() {
        const res = await fetch('/api/provider/referral-settings', { headers: authH() });
        if (res.ok) { const d = await res.json(); if (rewardEl) rewardEl.value = d.reward_text || ''; }
      }
      saveBtn?.addEventListener('click', async () => {
        saveBtn.disabled = true;
        if (msgEl) { msgEl.style.color = ''; msgEl.textContent = '保存中…'; }
        const res = await fetch('/api/provider/referral-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ reward_text: rewardEl?.value.trim() || '' }) });
        saveBtn.disabled = false;
        if (msgEl) { msgEl.style.color = res.ok ? '#4ade80' : '#ef4444'; msgEl.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
      });

      const STATUS_LABEL_MREF = { pending: '来店待ち', completed: '来店済み・特典対象' };
      async function loadList() {
        if (!listEl) return;
        const res = await fetch('/api/provider/referrals', { headers: authH() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだ紹介実績はありません。</p>'; return; }
        listEl.innerHTML = rows.map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap">
            <span style="font-size:13px"><strong>${esc(r.referrer_name)}</strong>さんの紹介</span>
            <span class="muted" style="font-size:12px">→ ${esc(r.referred_name || '(お名前不明)')}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:auto;background:${r.status === 'completed' ? '#f0fdf4' : '#fffbeb'};color:${r.status === 'completed' ? '#16a34a' : '#d97706'}">${STATUS_LABEL_MREF[r.status] || r.status}</span>
          </div>
        `).join('');
      }

      function loadAll() { loadSettings(); loadList(); }
      document.querySelectorAll('[data-tab="member-referral"]').forEach(btn => btn.addEventListener('click', loadAll, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'member-referral') loadAll();
    })();

    // ── クラス管理（スクール業態特化、でお要望2026-09-14） ─────
    (function setupClasses() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const listEl = document.getElementById('cls-list');
      const editCard = document.getElementById('cls-edit-card');
      const editForm = document.getElementById('cls-edit-form');
      const editTitle = document.getElementById('cls-edit-title');
      const rosterCard = document.getElementById('cls-roster-card');
      const rosterTitle = document.getElementById('cls-roster-title');
      const rosterListEl = document.getElementById('cls-roster-list');
      const enrollForm = document.getElementById('cls-enroll-form');
      let classesCache = [];
      let selectedClass = null;

      async function loadClasses() {
        if (!listEl) return;
        const res = await fetch('/api/provider/classes', { headers: authH() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        classesCache = await res.json();
        if (!classesCache.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだクラスがありません。「＋ クラスを追加」から作成してください。</p>'; return; }
        listEl.innerHTML = classesCache.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--color-bg);border-radius:10px;flex-wrap:wrap" data-cls-row="${c.id}">
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px">${esc(c.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${c.enrolledCount}名${c.capacity ? `／定員${c.capacity}名` : ''}${c.waitlistedCount ? `（待機${c.waitlistedCount}名）` : ''}</span>
            </div>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-cls-roster="${c.id}">名簿・進級</button>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-cls-edit="${c.id}">編集</button>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-cls-del="${c.id}">削除</button>
          </div>
        `).join('');
        listEl.querySelectorAll('[data-cls-edit]').forEach(btn => btn.addEventListener('click', () => {
          const c = classesCache.find(x => x.id === btn.dataset.clsEdit); if (!c) return;
          editTitle.textContent = 'クラスを編集'; editCard.style.display = 'block';
          editForm.elements['_class_id'].value = c.id;
          editForm.elements['name'].value = c.name || '';
          editForm.elements['description'].value = c.description || '';
          editForm.elements['capacity'].value = c.capacity || '';
          editForm.elements['level_labels'].value = (c.level_labels || []).join(',');
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-cls-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このクラスを削除しますか？在籍者・進級履歴も全て削除されます。')) return;
          await fetch(`/api/provider/classes/${btn.dataset.clsDel}`, { method: 'DELETE', headers: authH() });
          loadClasses();
        }));
        listEl.querySelectorAll('[data-cls-roster]').forEach(btn => btn.addEventListener('click', () => openRoster(btn.dataset.clsRoster)));
      }

      document.getElementById('cls-add-btn')?.addEventListener('click', () => {
        editTitle.textContent = 'クラスを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_class_id'].value = '';
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('cls-cancel-btn')?.addEventListener('click', () => { editCard.style.display = 'none'; editForm.reset(); });
      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id = fd.get('_class_id');
        const body = {
          name: fd.get('name'),
          description: fd.get('description'),
          capacity: fd.get('capacity'),
          level_labels: String(fd.get('level_labels') || '').split(',').map(s => s.trim()).filter(Boolean),
        };
        const url = id ? `/api/provider/classes/${id}` : '/api/provider/classes';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadClasses(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      const STATUS_LABEL_CLS = { active: '在籍中', waitlisted: '待機中', withdrawn: '退会' };
      function openRoster(classId) {
        selectedClass = classesCache.find(c => c.id === classId);
        if (!selectedClass || !rosterCard) return;
        rosterTitle.textContent = `${selectedClass.name} の名簿・進級`;
        rosterCard.style.display = 'block';
        rosterCard.scrollIntoView({ behavior: 'smooth' });
        loadRoster();
      }

      async function loadRoster() {
        if (!selectedClass || !rosterListEl) return;
        rosterListEl.innerHTML = '読み込み中…';
        const res = await fetch(`/api/provider/classes/${selectedClass.id}/enrollments`, { headers: authH() });
        if (!res.ok) { rosterListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { rosterListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ生徒がいません。</p>'; return; }
        const levels = selectedClass.level_labels || [];
        rosterListEl.innerHTML = rows.map(en => {
          const nextLevel = levels.length ? levels[Math.min(levels.indexOf(en.current_level) + 1, levels.length - 1)] : null;
          const canPromote = levels.length && nextLevel && nextLevel !== en.current_level;
          return `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:700">${esc(en.student_name)}</span>
            ${en.current_level ? `<span class="muted" style="font-size:12px">${esc(en.current_level)}</span>` : ''}
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:${en.status === 'active' ? '#f0fdf4' : en.status === 'waitlisted' ? '#fffbeb' : '#f3f4f6'};color:${en.status === 'active' ? '#16a34a' : en.status === 'waitlisted' ? '#d97706' : '#6b7280'}">${STATUS_LABEL_CLS[en.status] || en.status}</span>
            <div style="display:flex;gap:6px;margin-left:auto">
              ${canPromote ? `<button class="btn btn-ghost" style="font-size:11.5px;padding:4px 8px" data-cls-promote="${en.id}" data-cls-next-level="${esc(nextLevel)}">進級：${esc(nextLevel)}へ</button>` : ''}
              ${en.status !== 'withdrawn' ? `<button class="btn btn-ghost" style="font-size:11.5px;padding:4px 8px" data-cls-withdraw="${en.id}">退会</button>` : ''}
              <button class="btn btn-ghost" style="font-size:11.5px;padding:4px 8px;color:#ef4444" data-cls-enroll-del="${en.id}">削除</button>
            </div>
          </div>`;
        }).join('');
        rosterListEl.querySelectorAll('[data-cls-promote]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/classes/${selectedClass.id}/enrollments/${btn.dataset.clsPromote}/progressions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ to_level: btn.dataset.clsNextLevel }),
          });
          if (res.ok) { showToast('進級を記録しました'); loadRoster(); } else showToast('進級の記録に失敗しました');
        }));
        rosterListEl.querySelectorAll('[data-cls-withdraw]').forEach(btn => btn.addEventListener('click', async () => {
          await fetch(`/api/provider/classes/${selectedClass.id}/enrollments/${btn.dataset.clsWithdraw}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ status: 'withdrawn' }) });
          loadRoster(); loadClasses();
        }));
        rosterListEl.querySelectorAll('[data-cls-enroll-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この生徒を名簿から削除しますか？（進級履歴も削除されます）')) return;
          await fetch(`/api/provider/classes/${selectedClass.id}/enrollments/${btn.dataset.clsEnrollDel}`, { method: 'DELETE', headers: authH() });
          loadRoster(); loadClasses();
        }));
      }

      enrollForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedClass) return;
        const fd = new FormData(enrollForm);
        const res = await fetch(`/api/provider/classes/${selectedClass.id}/enrollments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ student_name: fd.get('student_name') }),
        });
        if (res.ok) { enrollForm.reset(); loadRoster(); loadClasses(); showToast('生徒を追加しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="classes"]').forEach(btn => btn.addEventListener('click', loadClasses, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'classes') loadClasses();
    })();

    // ── ロッカー月極管理（でお要望2026-09-14） ─────
    (function setupLockers() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function fmtYen(n) { return n || n === 0 ? `¥${Number(n).toLocaleString()}` : '未設定'; }
      const listEl = document.getElementById('lkr-list');
      const editCard = document.getElementById('lkr-edit-card');
      const editForm = document.getElementById('lkr-edit-form');
      const contractCard = document.getElementById('lkr-contract-card');
      const contractTitle = document.getElementById('lkr-contract-title');
      const contractForm = document.getElementById('lkr-contract-form');
      let selectedLockerId = null;
      let selectedMemberUserId = null;

      // Fineme会員検索（でお要望2026-09-14：「ロッカー管理のお客さんをFinemeの会員情報と
      // 紐付けられるようにして」）。予約カレンダーの手動予約作成で使っているものと
      // 同じ仕組み・同じAPIを、このタブ専用に軽量に再実装する。
      const memberSearchInput = document.getElementById('lkr-member-search');
      const memberResultsEl = document.getElementById('lkr-member-results');
      const memberSearchWrap = document.getElementById('lkr-member-search-wrap');
      const memberSelectedEl = document.getElementById('lkr-member-selected');
      const memberSelectedNameEl = document.getElementById('lkr-member-selected-name');
      function setSelectedMember(userId, name) {
        selectedMemberUserId = userId || null;
        if (memberSelectedEl) memberSelectedEl.style.display = userId ? 'flex' : 'none';
        if (memberSearchWrap) memberSearchWrap.style.display = userId ? 'none' : '';
        if (memberSelectedNameEl) memberSelectedNameEl.textContent = name || '';
        if (userId && name && contractForm?.elements['contractor_name'] && !contractForm.elements['contractor_name'].value) {
          contractForm.elements['contractor_name'].value = name;
        }
      }
      let memberSearchTimer = null;
      memberSearchInput?.addEventListener('input', () => {
        clearTimeout(memberSearchTimer);
        const q = memberSearchInput.value.trim();
        if (q.length < 3) { if (memberResultsEl) memberResultsEl.innerHTML = ''; return; }
        memberSearchTimer = setTimeout(async () => {
          if (memberResultsEl) memberResultsEl.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">検索中…</p>';
          const res = await fetch(`/api/provider/customers/search-member?q=${encodeURIComponent(q)}`, { headers: authH() });
          if (!res.ok) { if (memberResultsEl) memberResultsEl.innerHTML = ''; return; }
          const rows = await res.json();
          if (!memberResultsEl) return;
          if (!rows.length) { memberResultsEl.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">見つかりませんでした</p>'; return; }
          memberResultsEl.innerHTML = rows.map(r => `
            <div data-member-pick="${r.id}" data-member-name="${esc(r.name)}" style="padding:6px 8px;border:1px solid rgba(26,20,16,0.1);border-radius:6px;margin-top:4px;cursor:pointer;font-size:12.5px;display:flex;justify-content:space-between;gap:8px">
              <span>${esc(r.name)}</span><span class="muted">${esc(r.maskedPhone || '')}</span>
            </div>
          `).join('');
          memberResultsEl.querySelectorAll('[data-member-pick]').forEach(row => row.addEventListener('click', () => {
            setSelectedMember(row.dataset.memberPick, row.dataset.memberName);
            memberResultsEl.innerHTML = '';
            memberSearchInput.value = '';
          }));
        }, 350);
      });
      document.getElementById('lkr-member-clear')?.addEventListener('click', () => setSelectedMember(null, ''));

      async function loadLockers() {
        if (!listEl) return;
        const res = await fetch('/api/provider/lockers', { headers: authH() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだロッカーがありません。「＋ ロッカーを追加」から作成してください。</p>'; return; }
        listEl.innerHTML = rows.map(l => {
          const c = l.activeContract;
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--color-bg);border-radius:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px">${esc(l.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">月額${fmtYen(l.monthly_fee)}</span>
              ${c
                ? `<div style="margin-top:4px;font-size:12.5px"><span style="font-weight:700;color:#16a34a">契約中</span>：${esc(c.contractor_name)}（月額${fmtYen(c.monthly_fee)}）${c.user_id ? ' <span style="color:#2563eb;font-weight:700;cursor:pointer" data-lkr-open-cust="' + c.user_id + '" data-lkr-cust-name="' + esc(c.contractor_name) + '">会員</span>' : ''}</div>`
                : '<div style="margin-top:4px;font-size:12.5px;color:#9ca3af">空き</div>'}
            </div>
            ${c
              ? `<button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-lkr-cancel-contract="${c.id}" data-lkr-locker-id="${l.id}">解約</button>`
              : `<button type="button" class="btn" style="font-size:12px;padding:5px 10px" data-lkr-contract="${l.id}" data-lkr-name="${esc(l.name)}">契約する</button>`}
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-lkr-del="${l.id}">削除</button>
          </div>`;
        }).join('');

        listEl.querySelectorAll('[data-lkr-open-cust]').forEach(el => el.addEventListener('click', () => {
          if (!window.openCustomerModal) { showToast('読み込み中です。少し待ってから再度お試しください'); return; }
          window.openCustomerModal(el.dataset.lkrOpenCust, 'member', el.dataset.lkrCustName);
        }));
        listEl.querySelectorAll('[data-lkr-contract]').forEach(btn => btn.addEventListener('click', () => {
          selectedLockerId = btn.dataset.lkrContract;
          contractTitle.textContent = `${btn.dataset.lkrName} を契約する`;
          contractForm.reset();
          setSelectedMember(null, '');
          contractCard.style.display = 'block';
          contractCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-lkr-cancel-contract]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この契約を解約しますか？')) return;
          const res = await fetch(`/api/provider/lockers/${btn.dataset.lkrLockerId}/contracts/${btn.dataset.lkrCancelContract}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ status: 'cancelled' }) });
          if (res.ok) { showToast('解約しました'); loadLockers(); } else showToast('解約に失敗しました');
        }));
        listEl.querySelectorAll('[data-lkr-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このロッカーを削除しますか？')) return;
          const res = await fetch(`/api/provider/lockers/${btn.dataset.lkrDel}`, { method: 'DELETE', headers: authH() });
          if (res.ok) loadLockers(); else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        }));
      }

      document.getElementById('lkr-add-btn')?.addEventListener('click', () => { editForm.reset(); editCard.style.display = 'block'; editCard.scrollIntoView({ behavior: 'smooth' }); });
      document.getElementById('lkr-cancel-btn')?.addEventListener('click', () => { editCard.style.display = 'none'; });
      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const res = await fetch('/api/provider/lockers', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ name: fd.get('name'), monthly_fee: fd.get('monthly_fee') }) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadLockers(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.getElementById('lkr-contract-cancel-btn')?.addEventListener('click', () => { contractCard.style.display = 'none'; });
      contractForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedLockerId) return;
        const fd = new FormData(contractForm);
        const res = await fetch(`/api/provider/lockers/${selectedLockerId}/contracts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
          body: JSON.stringify({ contractor_name: fd.get('contractor_name'), monthly_fee: fd.get('monthly_fee'), note: fd.get('note'), user_id: selectedMemberUserId }),
        });
        if (res.ok) { contractCard.style.display = 'none'; loadLockers(); showToast('契約しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="lockers"]').forEach(btn => btn.addEventListener('click', loadLockers, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'lockers') loadLockers();
    })();

    // ── 空き枠タブ（即時予約モード用・hacomono/STORES網羅計画 Phase 1） ─────
    (function setupSlots() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      const listEl  = document.getElementById('slot-list');
      const form    = document.getElementById('slot-add-form');
      const addDateEl = document.getElementById('slot-add-date');
      const staffSel = document.getElementById('slot-staff-select');
      const resourceSel = document.getElementById('slot-resource-select');
      const filterStaffEl = document.getElementById('slot-filter-staff');
      const filterResourceEl = document.getElementById('slot-filter-resource');
      const pillsEl = document.getElementById('slot-date-pills');
      const selDateLabelEl = document.getElementById('slot-selected-date-label');
      function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
      const WEEKDAY_JA_S = ['日','月','火','水','木','金','土'];
      let staffOptionsLoaded = false;
      let staffById = {};
      let resourceById = {};

      // 空き枠タブの一覧（でお指摘2026-09-14：「設定した空き枠が下にバーって出て
      // めっちゃスクロール必要だし、編集もできないし、スタッフや部屋ごとの絞り込みも
      // できない」）。月まとめの全件表示ではなく、1週間分の窓をfrom/toで取得し、
      // 選んだ1日分だけをスタッフ/部屋フィルタつきで表示する。
      let windowStart = new Date(); windowStart.setHours(0,0,0,0);
      let selectedDate = fmtDate(windowStart);
      let userPickedSlotDate = false;
      let slotsWindowCache = [];

      async function loadSelectOptions() {
        if (staffOptionsLoaded) return;
        staffOptionsLoaded = true;
        try {
          const [staffRes, resourceRes] = await Promise.all([
            fetch('/api/provider/staff', { headers: authH() }),
            fetch('/api/provider/resources', { headers: authH() }),
          ]);
          if (staffRes.ok) {
            const staffList = await staffRes.json();
            staffList.forEach(s => { staffById[s.id] = s.name; });
            const opts = staffList.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
            if (staffSel) staffSel.insertAdjacentHTML('beforeend', opts);
            if (filterStaffEl) filterStaffEl.insertAdjacentHTML('beforeend', opts);
          }
          if (resourceRes.ok) {
            const resourceList = await resourceRes.json();
            resourceList.forEach(r => { resourceById[r.id] = r.name; });
            const opts = resourceList.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
            if (resourceSel) resourceSel.insertAdjacentHTML('beforeend', opts);
            if (filterResourceEl) filterResourceEl.insertAdjacentHTML('beforeend', opts);
          }
        } catch {}
      }

      function windowDates() {
        return Array.from({ length: 7 }, (_, i) => { const d = new Date(windowStart); d.setDate(windowStart.getDate() + i); return d; });
      }

      function filteredSlots(dateStr) {
        const fs = filterStaffEl?.value || '';
        const fr = filterResourceEl?.value || '';
        return slotsWindowCache.filter(s => s.date === dateStr && (!fs || s.staff_id === fs) && (!fr || s.resource_id === fr));
      }

      function renderPills() {
        if (!pillsEl) return;
        const todayStr = fmtDate(new Date());
        pillsEl.innerHTML = windowDates().map(d => {
          const dateStr = fmtDate(d);
          const count = filteredSlots(dateStr).length;
          const isActive = dateStr === selectedDate;
          return `
            <button type="button" class="cal-day-pill${isActive ? ' is-active' : ''}" data-slot-pill="${dateStr}" style="flex-shrink:0">
              <span>${WEEKDAY_JA_S[d.getDay()]}${dateStr === todayStr ? '・今日' : ''}</span>
              <span class="cal-pill-date">${d.getDate()}</span>
              <span>${count ? count + '件' : ''}</span>
            </button>
          `;
        }).join('');
        pillsEl.querySelectorAll('[data-slot-pill]').forEach(btn => btn.addEventListener('click', () => {
          selectedDate = btn.dataset.slotPill;
          userPickedSlotDate = true;
          renderPills();
          renderSelectedDateList();
        }));
      }

      function slotEditFormHtml(s) {
        return `
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 0" data-slot-edit-row="${s.id}">
            <input type="time" value="${s.start_time?.slice(0,5) || ''}" data-edit-start style="width:100px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px" />
            <span class="muted">〜</span>
            <input type="time" value="${s.end_time?.slice(0,5) || ''}" data-edit-end style="width:100px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px" />
            <input type="number" min="1" value="${s.capacity}" data-edit-capacity style="width:60px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px" />
            <button type="button" class="btn" style="font-size:11.5px;padding:4px 10px" data-slot-edit-save="${s.id}">保存</button>
            <button type="button" class="btn btn-ghost" style="font-size:11.5px;padding:4px 10px" data-slot-edit-cancel="${s.id}">キャンセル</button>
          </div>
        `;
      }

      function renderSelectedDateList() {
        if (!listEl) return;
        if (selDateLabelEl) {
          const d = new Date(selectedDate + 'T00:00:00');
          selDateLabelEl.textContent = Number.isNaN(d.getTime()) ? selectedDate : `${selectedDate}（${WEEKDAY_JA_S[d.getDay()]}）`;
        }
        const rows = filteredSlots(selectedDate).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        if (!rows.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">この日の枠はありません。</p>'; return; }
        listEl.innerHTML = rows.map(s => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;flex-wrap:wrap" data-slot-row="${s.id}">
            <span style="font-size:13px;font-weight:700">${esc(s.start_time?.slice(0,5))}〜${esc(s.end_time?.slice(0,5))}</span>
            <span style="font-size:12px;color:#6b7280">定員${s.capacity}</span>
            ${s.staff_id ? `<span style="font-size:11px;color:#2563eb">${esc(staffById[s.staff_id] || 'スタッフ')}</span>` : ''}
            ${s.resource_id ? `<span style="font-size:11px;color:#059669">${esc(resourceById[s.resource_id] || '部屋')}</span>` : ''}
            ${!s.is_open ? '<span style="font-size:10px;background:#fef2f2;color:#ef4444;padding:1px 6px;border-radius:99px">締切</span>' : ''}
            <div style="display:flex;gap:6px;margin-left:auto">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-slot-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-slot-toggle="${s.id}" data-open="${s.is_open}">${s.is_open ? '締め切る' : '再開する'}</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-slot-del="${s.id}">削除</button>
            </div>
          </div>`).join('');

        listEl.querySelectorAll('[data-slot-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const isOpen = btn.dataset.open === 'true';
          await fetch(`/api/provider/slots/${btn.dataset.slotToggle}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ is_open: !isOpen }) });
          loadWindow();
        }));
        listEl.querySelectorAll('[data-slot-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この枠を削除しますか？')) return;
          await fetch(`/api/provider/slots/${btn.dataset.slotDel}`, { method: 'DELETE', headers: authH() });
          loadWindow();
        }));
        listEl.querySelectorAll('[data-slot-edit]').forEach(btn => btn.addEventListener('click', () => {
          const id = btn.dataset.slotEdit;
          const row = listEl.querySelector(`[data-slot-row="${id}"]`);
          const s = rows.find(x => x.id === id);
          if (!row || !s) return;
          row.outerHTML = slotEditFormHtml(s);
          const editRow = listEl.querySelector(`[data-slot-edit-row="${id}"]`);
          editRow.querySelector(`[data-slot-edit-save="${id}"]`).addEventListener('click', async () => {
            const start_time = editRow.querySelector('[data-edit-start]').value;
            const end_time = editRow.querySelector('[data-edit-end]').value;
            const capacity = Number(editRow.querySelector('[data-edit-capacity]').value) || 1;
            const res = await fetch(`/api/provider/slots/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ start_time, end_time, capacity }) });
            if (res.ok) { showToast('保存しました'); loadWindow(); }
            else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
          });
          editRow.querySelector(`[data-slot-edit-cancel="${id}"]`).addEventListener('click', () => renderSelectedDateList());
        }));
      }

      async function loadWindow() {
        if (!listEl) return;
        await loadSelectOptions();
        listEl.textContent = '読み込み中…';
        const dates = windowDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        const res = await fetch(`/api/provider/slots?from=${from}&to=${to}`, { headers: authH() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        slotsWindowCache = await res.json();
        if (!userPickedSlotDate) selectedDate = from;
        renderPills();
        renderSelectedDateList();
      }

      filterStaffEl?.addEventListener('change', () => { renderPills(); renderSelectedDateList(); });
      filterResourceEl?.addEventListener('change', () => { renderPills(); renderSelectedDateList(); });
      document.getElementById('slot-nav-prev')?.addEventListener('click', () => { windowStart.setDate(windowStart.getDate() - 7); userPickedSlotDate = false; loadWindow(); });
      document.getElementById('slot-nav-next')?.addEventListener('click', () => { windowStart.setDate(windowStart.getDate() + 7); userPickedSlotDate = false; loadWindow(); });
      document.getElementById('slot-nav-today')?.addEventListener('click', () => { windowStart = new Date(); windowStart.setHours(0,0,0,0); userPickedSlotDate = false; loadWindow(); });

      // 日単位の一括操作（でお要望2026-09-14：祝日等で丸ごと締め切りたい時に1件ずつは辛い）。
      // 現在のスタッフ/部屋フィルタが指定されていれば、その絞り込み範囲内だけに適用する。
      async function bulkAction(action) {
        const label = { open: '開放', close: '締切', delete: '削除' }[action];
        if (action === 'delete' && !confirm(`${selectedDate}の枠を全て削除します。よろしいですか？`)) return;
        const res = await fetch('/api/provider/slots/bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
          body: JSON.stringify({ action, date: selectedDate, staff_id: filterStaffEl?.value || null, resource_id: filterResourceEl?.value || null }),
        });
        if (res.ok) { const d = await res.json(); showToast(`${d.count}件を${label}しました`); loadWindow(); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      }
      document.getElementById('slot-bulk-open')?.addEventListener('click', () => bulkAction('open'));
      document.getElementById('slot-bulk-close')?.addEventListener('click', () => bulkAction('close'));
      document.getElementById('slot-bulk-delete')?.addEventListener('click', () => bulkAction('delete'));

      form?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = {
          date: fd.get('date'), start_time: fd.get('start_time'), end_time: fd.get('end_time'),
          capacity: Number(fd.get('capacity')) || 1,
          staff_id: fd.get('staff_id') || null,
          resource_id: fd.get('resource_id') || null,
        };
        const res = await fetch('/api/provider/slots', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify(body) });
        if (res.ok) {
          form.reset();
          if (body.date) { selectedDate = body.date; userPickedSlotDate = true; }
          loadWindow();
          showToast('枠を追加しました');
        } else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      function loadSlots() {
        if (addDateEl && !addDateEl.value) addDateEl.value = selectedDate;
        loadWindow();
      }
      document.querySelectorAll('[data-tab="slots"]').forEach(btn => btn.addEventListener('click', loadSlots, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'slots') loadSlots();

      // 即時予約のON/OFFをこのタブ内から直接切り替えられるように（でお要望2026-09-12：
      // 「機能設定タブでOFFにできる」という案内だけでなく、その場にトグルを置いた方が便利）。
      // 保存後は既存のapplyFeatureGating()を呼び、サイドバーの表示・未設定バッジも即座に揃える。
      const instantToggle = document.getElementById('slots-instant-toggle');
      const instantToggleStatus = document.getElementById('slots-instant-toggle-status');
      const requestToggle = document.getElementById('slots-request-toggle');
      const requestToggleStatus = document.getElementById('slots-request-toggle-status');
      async function loadInstantToggleState() {
        const res = await fetch('/api/provider/features', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const { features } = await res.json();
        if (instantToggle) instantToggle.checked = !!features?.instant_booking;
        // booking_requestはdefaultOn:trueのため、未設定(undefined)ならチェックON扱い
        if (requestToggle) requestToggle.checked = features?.booking_request !== false;

        const boardBox = document.getElementById('slots-board-link-box');
        const boardLink = document.getElementById('slots-board-link');
        if (boardBox && boardLink) {
          const showBoard = !!features?.instant_booking && !!features?.booking_board && provider?.slug;
          boardBox.style.display = showBoard ? 'block' : 'none';
          if (showBoard) {
            const url = `${window.location.origin}/provider/${provider.slug}/board`;
            boardLink.href = url;
            boardLink.textContent = url;
          }
        }
      }
      requestToggle?.addEventListener('change', async () => {
        requestToggle.disabled = true;
        if (requestToggleStatus) { requestToggleStatus.style.color = ''; requestToggleStatus.textContent = '保存中…'; }
        const res = await fetch('/api/provider/features', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ booking_request: requestToggle.checked }),
        });
        requestToggle.disabled = false;
        if (res.ok) {
          if (requestToggleStatus) { requestToggleStatus.style.color = '#4ade80'; requestToggleStatus.textContent = '✓ 保存しました'; setTimeout(() => { if (requestToggleStatus) requestToggleStatus.textContent = ''; }, 2500); }
        } else {
          requestToggle.checked = !requestToggle.checked;
          if (requestToggleStatus) { requestToggleStatus.style.color = '#ef4444'; requestToggleStatus.textContent = '保存に失敗しました'; }
        }
      });
      instantToggle?.addEventListener('change', async () => {
        instantToggle.disabled = true;
        if (instantToggleStatus) { instantToggleStatus.style.color = ''; instantToggleStatus.textContent = '保存中…'; }
        const res = await fetch('/api/provider/features', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ instant_booking: instantToggle.checked }),
        });
        instantToggle.disabled = false;
        if (res.ok) {
          if (instantToggleStatus) { instantToggleStatus.style.color = '#4ade80'; instantToggleStatus.textContent = '✓ 保存しました'; setTimeout(() => { if (instantToggleStatus) instantToggleStatus.textContent = ''; }, 2500); }
          window.applyFeatureGating?.('instant_booking', instantToggle.checked);
          // ONにした瞬間、営業時間から向こう2週間分の空き枠を自動生成する
          // （でお要望2026-09-14：手動で1つずつ登録させるフローを無くす）。
          if (instantToggle.checked) {
            const genRes = await fetch('/api/provider/slots/auto-generate', {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
              body: JSON.stringify({ days: 14 }),
            });
            if (genRes.ok) {
              const g = await genRes.json();
              showToast(g.createdCount > 0 ? `空き枠を${g.createdCount}件自動生成しました` : '営業時間が未設定のため枠を生成できませんでした。下の「営業時間」から設定してください');
              loadSlots();
            }
          }
        } else {
          instantToggle.checked = !instantToggle.checked;
          if (instantToggleStatus) { instantToggleStatus.style.color = '#ef4444'; instantToggleStatus.textContent = '保存に失敗しました'; }
        }
      });
      document.querySelectorAll('[data-tab="slots"]').forEach(btn => btn.addEventListener('click', loadInstantToggleState, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'slots') loadInstantToggleState();

      // ── 営業時間からの自動生成（でお要望2026-09-14） ──
      const WEEKDAY_LABEL_BH = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };
      // 曜日ごとに1つずつ入力するのが面倒との指摘（でお要望2026-09-14：「まとめて設定
      // できるようにもしてほしい」）。基準となる開始・終了時刻を1回入力し、「全曜日に
      // 反映」ボタンで全ての曜日（休み設定は変えず、時間だけ）に一括コピーする。
      function applyBulkBusinessHours() {
        const el = document.getElementById('business-hours-editor');
        const open = document.getElementById('bh-bulk-open')?.value;
        const close = document.getElementById('bh-bulk-close')?.value;
        if (!el || !open || !close) { showToast('開始・終了時刻を入力してください'); return; }
        Object.keys(WEEKDAY_LABEL_BH).forEach(key => {
          const closedCb = el.querySelector(`[data-bh-closed="${key}"]`);
          const openInput = el.querySelector(`[data-bh-open="${key}"]`);
          const closeInput = el.querySelector(`[data-bh-close="${key}"]`);
          if (closedCb?.checked) return; // 休みの曜日は上書きしない
          if (openInput) openInput.value = open;
          if (closeInput) closeInput.value = close;
        });
        showToast('休み以外の全曜日に反映しました（保存ボタンを押して確定してください）');
      }
      document.getElementById('bh-bulk-apply-btn')?.addEventListener('click', applyBulkBusinessHours);
      function renderBusinessHoursEditor(hours) {
        const el = document.getElementById('business-hours-editor');
        if (!el) return;
        el.innerHTML = Object.entries(WEEKDAY_LABEL_BH).map(([key, label]) => {
          const h = hours[key] || {};
          return `
            <div style="display:flex;align-items:center;gap:10px;padding:4px 0;flex-wrap:wrap">
              <span style="width:24px;font-weight:700;font-size:13px">${label}</span>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280">
                <input type="checkbox" data-bh-closed="${key}" ${h.closed ? 'checked' : ''} /> 休み
              </label>
              <input type="time" data-bh-open="${key}" value="${h.open || ''}" style="width:110px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px" ${h.closed ? 'disabled' : ''} />
              <span class="muted">〜</span>
              <input type="time" data-bh-close="${key}" value="${h.close || ''}" style="width:110px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px" ${h.closed ? 'disabled' : ''} />
            </div>
          `;
        }).join('');
        el.querySelectorAll('[data-bh-closed]').forEach(cb => cb.addEventListener('change', () => {
          const key = cb.dataset.bhClosed;
          const openInput = el.querySelector(`[data-bh-open="${key}"]`);
          const closeInput = el.querySelector(`[data-bh-close="${key}"]`);
          if (openInput) openInput.disabled = cb.checked;
          if (closeInput) closeInput.disabled = cb.checked;
        }));
      }
      async function loadBusinessHours() {
        const res = await fetch('/api/provider/business-hours', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const data = await res.json();
        renderBusinessHoursEditor(data.business_hours || {});
        const durSel = document.getElementById('slot-duration-select');
        if (durSel) durSel.value = String(data.slot_duration_minutes || 60);
      }
      document.getElementById('business-hours-save-btn')?.addEventListener('click', async () => {
        const msg = document.getElementById('business-hours-save-msg');
        const business_hours = {};
        Object.keys(WEEKDAY_LABEL_BH).forEach(key => {
          const closed = document.querySelector(`[data-bh-closed="${key}"]`)?.checked || false;
          const open = document.querySelector(`[data-bh-open="${key}"]`)?.value || null;
          const close = document.querySelector(`[data-bh-close="${key}"]`)?.value || null;
          business_hours[key] = { closed, open, close };
        });
        const slot_duration_minutes = Number(document.getElementById('slot-duration-select')?.value) || 60;
        if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
        const res = await fetch('/api/provider/business-hours', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ business_hours, slot_duration_minutes }),
        });
        if (msg) {
          if (res.ok) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          else { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
        }
      });
      document.getElementById('slots-generate-now-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('slots-generate-now-btn');
        btn.disabled = true; const origText = btn.textContent; btn.textContent = '生成中…';
        const res = await fetch('/api/provider/slots/auto-generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ days: 14 }),
        });
        btn.disabled = false; btn.textContent = origText;
        if (res.ok) {
          const g = await res.json();
          showToast(g.createdCount > 0 ? `${g.createdCount}件の枠を生成しました` : '新たに生成できる枠がありませんでした（営業時間を確認してください）');
          loadSlots();
        } else {
          const e = await res.json().catch(() => ({}));
          showToast('エラー: ' + (e.error || '不明'));
        }
      });
      document.querySelectorAll('[data-tab="slots"]').forEach(btn => btn.addEventListener('click', loadBusinessHours, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'slots') loadBusinessHours();

      // 同時に保持できる予約数の上限（でお要望2026-09-14）
      async function loadBookingLimit() {
        const input = document.getElementById('booking-limit-input');
        if (!input) return;
        const res = await fetch('/api/provider/booking-limits', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (res.ok) { const d = await res.json(); input.value = d.max_active_reservations ?? 1; }
      }
      document.getElementById('booking-limit-save-btn')?.addEventListener('click', async () => {
        const input = document.getElementById('booking-limit-input');
        const msg = document.getElementById('booking-limit-msg');
        const n = Number(input?.value);
        if (!Number.isInteger(n) || n < 1) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = '1以上の整数を入力してください'; } return; }
        const res = await fetch('/api/provider/booking-limits', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ max_active_reservations: n }),
        });
        if (msg) { msg.style.color = res.ok ? '#4ade80' : '#ef4444'; msg.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
      });
      document.querySelectorAll('[data-tab="slots"]').forEach(btn => btn.addEventListener('click', loadBookingLimit, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'slots') loadBookingLimit();
    })();

    // ── 体験談タブ ────────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('stories-list');

      const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };

      async function loadStories() {
        if (!listEl) return;
        listEl.innerHTML = '<p class="muted">読み込み中…</p>';
        const res = await fetch('/api/provider/stories', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだ体験談はありません。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;background:#fff;';
          const isHidden = !!s.provider_hidden;
          const axisLabel = s.axis_id ? (AXIS_LABELS[s.axis_id] || s.axis_id) : null;
          const date = s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP',{month:'long',day:'numeric'}) : '';
          row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
                  ${axisLabel ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;">${axisLabel}</span>` : ''}
                  <span style="font-size:11px;color:#9ca3af;">${date}</span>
                  <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;${s.status==='approved'?'background:#d1fae5;color:#065f46;':'background:#fef3c7;color:#92400e;'}">${s.status==='approved'?'公開中':'審査中'}</span>
                  ${isHidden ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#6b7280;border-radius:99px;">非表示中</span>' : ''}
                </div>
                <p style="font-size:13px;color:#374151;margin:0 0 4px;font-weight:600;">${s.concern_before ? s.concern_before.slice(0,80)+(s.concern_before.length>80?'…':'') : '(悩みなし)'}</p>
                <p style="font-size:12px;color:#6b7280;margin:0;">${s.change_after ? s.change_after.slice(0,80)+(s.change_after.length>80?'…':'') : ''}</p>
              </div>
              <button
                class="btn btn-ghost stories-toggle-btn"
                data-story-id="${s.id}"
                data-hidden="${isHidden ? '1' : '0'}"
                style="font-size:12px;padding:6px 12px;flex-shrink:0;${isHidden ? 'color:#6b7280;' : 'color:#ef4444;'}"
              >${isHidden ? '表示する' : '非表示にする'}</button>
            </div>
          `;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('.stories-toggle-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.storyId;
            const nowHidden = btn.dataset.hidden === '1';
            btn.disabled = true; btn.textContent = '更新中…';
            const res = await fetch(`/api/provider/stories/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
              body: JSON.stringify({ provider_hidden: !nowHidden }),
            });
            if (res.ok) { loadStories(); showToast(nowHidden ? '体験談を表示しました' : '体験談を非表示にしました'); }
            else { btn.disabled = false; btn.textContent = nowHidden ? '表示する' : '非表示にする'; showToast('更新エラー'); }
          });
        });
      }

      document.querySelectorAll('[data-tab="stories"]').forEach(btn => btn.addEventListener('click', loadStories, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'stories') loadStories();
    })();

    // ── 推奨来店周期の設定 ────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const axisSel = document.getElementById('rf-axis');
      const listEl = document.getElementById('rf-list');
      if (!axisSel || !listEl) return;

      axisSel.innerHTML = Object.entries(ALL_AXES).map(([id, def]) => `<option value="${id}">${def.icon} ${def.label}</option>`).join('');

      async function loadRecommended() {
        listEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/recommended-frequencies', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px;margin:4px 0 0">まだ設定していません。</p>'; return; }
        listEl.innerHTML = items.map(r => {
          const def = ALL_AXES[r.axis];
          const freqLabel = r.frequency_months
            ? (r.frequency_months === 1 ? '月1回' : `${r.frequency_months}ヶ月に1回`)
            : (r.frequency_weeks === 1 ? '週1回' : `${r.frequency_weeks}週ごと`);
          return `<span class="badge" style="display:inline-flex;align-items:center;gap:6px;margin:4px 6px 0 0;padding:4px 10px;border-radius:99px;background:rgba(26,20,16,0.1);font-size:12px;">
            ${def ? def.icon : ''} ${def ? def.label : r.axis}：${freqLabel}
            <button type="button" data-rf-del="${r.axis}" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:12px;">✕</button>
          </span>`;
        }).join('');
        listEl.querySelectorAll('[data-rf-del]').forEach(btn => btn.addEventListener('click', async () => {
          await fetch('/api/provider/recommended-frequencies', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({ axis: btn.dataset.rfDel, frequency_weeks: null, frequency_months: null }),
          });
          loadRecommended();
        }));
      }

      const saveBtn = document.getElementById('rf-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', async () => {
        const value = Number(document.getElementById('rf-value').value);
        const unit = document.getElementById('rf-unit').value;
        if (!value || value < 1) { showToast('周期を入力してください'); return; }
        saveBtn.disabled = true;
        await fetch('/api/provider/recommended-frequencies', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({
            axis: axisSel.value,
            frequency_weeks: unit === 'week' ? value : null,
            frequency_months: unit === 'month' ? value : null,
          }),
        });
        document.getElementById('rf-value').value = '';
        saveBtn.disabled = false;
        loadRecommended();
      });

      document.querySelectorAll('[data-tab="visit-settings"]').forEach(btn => btn.addEventListener('click', loadRecommended, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'visit-settings') loadRecommended();
    })();

    // ── 休眠判定の設定 ────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const daysInput = document.getElementById('ds-days');
      const saveBtn = document.getElementById('ds-save-btn');
      const msgEl = document.getElementById('ds-msg');
      if (!daysInput || !saveBtn) return;

      async function loadDormantSettings() {
        const res = await fetch('/api/provider/dormant-settings', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const data = await res.json();
        daysInput.value = data.no_visit_days;
      }

      saveBtn.addEventListener('click', async () => {
        const days = Number(daysInput.value);
        if (!days || days < 1) { msgEl.textContent = '1以上の日数を入力してください'; msgEl.style.color = '#ef4444'; return; }
        saveBtn.disabled = true;
        const res = await fetch('/api/provider/dormant-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ no_visit_days: days }),
        });
        if (res.ok) { msgEl.style.color = '#059669'; msgEl.textContent = '✓ 保存しました'; }
        else { const d = await res.json(); msgEl.style.color = '#ef4444'; msgEl.textContent = d.error || '保存に失敗しました'; }
        saveBtn.disabled = false;
      });

      document.querySelectorAll('[data-tab="visit-settings"]').forEach(btn => btn.addEventListener('click', loadDormantSettings, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'visit-settings') loadDormantSettings();
    })();

    // ── 顧客管理タブ（New Me Log ＋ カルテ 統合） ─────────────────────
    // 元々「New Me Log」（お客様の自己申告する来店サイクル）と「カルテ」（店舗だけの
    // 非公開メモ・履歴）は別タブだったが、どちらも同じ/api/provider/customersのデータを
    // 元にした「この顧客はどうなってる？」を見るための画面であり、店舗からすると
    // タブを跨いで探す必要があり非効率だった（でお指摘2026-09-12）。1つの顧客カードに
    // 両方の情報を統合し、カルテのカスタム項目もtext/select/starsに加えてnumber/date/
    // checkboxを追加してさらに自由度を高めた（でお要望）。
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('customers-list');
      const filterSel = document.getElementById('customers-filter');
      const sortSel = document.getElementById('customers-sort');
      const searchInput = document.getElementById('karte-search');
      const kfListEl = document.getElementById('kf-list');
      const kfLabelInput = document.getElementById('kf-label');
      const kfTypeSel = document.getElementById('kf-type');
      const kfOptionsWrap = document.getElementById('kf-options-wrap');
      const kfOptionsInput = document.getElementById('kf-options');
      const kfAddBtn = document.getElementById('kf-add-btn');
      if (!listEl) return;

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function fmtDate(d) {
        if (!d) return '未設定';
        return new Date(d).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      }
      function fmtDateTime(d) {
        return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      function fmtFreq(c) {
        if (c.frequency_months) return c.frequency_months === 1 ? '月1回' : `${c.frequency_months}ヶ月に1回`;
        if (c.frequency_weeks) return c.frequency_weeks === 1 ? '週1回' : `${c.frequency_weeks}週ごと`;
        return '未設定';
      }
      function overdueBadge(label, days) {
        if (typeof days !== 'number' || days >= 0) return '';
        return `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#fef2f2;color:#dc2626;border-radius:99px;">${label}${-days}日超過</span>`;
      }
      const STATUS_LABEL = {
        active: { label: 'アクティブ', bg: '#f0fdf4', fg: '#16a34a' },
        dormant: { label: '休眠', bg: '#fffbeb', fg: '#d97706' },
        churned: { label: '離脱', bg: '#f3f4f6', fg: '#6b7280' },
      };
      function statusBadge(status) {
        const s = STATUS_LABEL[status] || STATUS_LABEL.active;
        return `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:${s.bg};color:${s.fg};border-radius:99px;">${s.label}</span>`;
      }
      function authHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` }; }

      let allItems = [];
      let staffList = [];
      let karteFields = [];
      let providerMenus = [];
      // カルテのカスタム性を拡張（でお要望2026-09-12）：自由記述／選択肢／5段階評価に加え、
      // 数値／日付／チェックボックスを追加。
      const FIELD_TYPE_LABEL = { text: '自由記述', select: '選択肢', stars: '5段階評価', number: '数値', date: '日付', checkbox: 'チェック' };

      // サービス設定タブで登録済みの自店メニュー一覧を、来店記録の「利用メニュー」選択肢として流用する。
      // 予約データ(reservations)とメニュー(provider_experience_menus)がID単位で綺麗に紐づいていないため
      // 自動検出はできず、記録追加時に店舗側が選ぶ方式にした（でお相談・2026-09合意）。
      async function loadMenus() {
        const res = await fetch('/api/provider/experience-menus', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        const all = res.ok ? await res.json() : [];
        providerMenus = all.filter(m => m.is_active !== false);
      }

      // ── カルテ項目（カスタムフィールド）の管理 ──
      function renderFieldsPanel() {
        if (!kfListEl) return;
        if (!karteFields.length) { kfListEl.innerHTML = '<p class="muted" style="font-size:13px;">まだ項目がありません。下のフォームから追加してください。</p>'; return; }
        kfListEl.innerHTML = karteFields.map((f, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="flex:1;font-size:13px;">${esc(f.label)}${f.field_type === 'select' ? `<span class="muted" style="font-size:11px;"> (${(f.options || []).map(esc).join('・')})</span>` : ''}</span>
            <span style="font-size:11px;padding:2px 8px;background:#f3f4f6;border-radius:99px;">${FIELD_TYPE_LABEL[f.field_type] || f.field_type}</span>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;" data-kf-up="${f.id}"${i === 0 ? ' disabled' : ''}>↑</button>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;" data-kf-down="${f.id}"${i === karteFields.length - 1 ? ' disabled' : ''}>↓</button>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#ef4444;" data-kf-del="${f.id}">削除</button>
          </div>`).join('');

        kfListEl.querySelectorAll('[data-kf-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この項目を削除しますか？（過去の記録に入力済みの値は残ります）')) return;
          await fetch(`/api/provider/karte-fields/${btn.dataset.kfDel}`, { method: 'DELETE', headers: authHeaders() });
          await loadFields();
        }));
        kfListEl.querySelectorAll('[data-kf-up]').forEach(btn => btn.addEventListener('click', () => swapFieldOrder(btn.dataset.kfUp, -1)));
        kfListEl.querySelectorAll('[data-kf-down]').forEach(btn => btn.addEventListener('click', () => swapFieldOrder(btn.dataset.kfDown, 1)));
      }

      async function swapFieldOrder(id, dir) {
        const idx = karteFields.findIndex(f => f.id === id);
        const otherIdx = idx + dir;
        if (idx < 0 || otherIdx < 0 || otherIdx >= karteFields.length) return;
        const a = karteFields[idx], b = karteFields[otherIdx];
        await Promise.all([
          fetch(`/api/provider/karte-fields/${a.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ sort_order: b.sort_order }) }),
          fetch(`/api/provider/karte-fields/${b.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ sort_order: a.sort_order }) }),
        ]);
        await loadFields();
      }

      async function loadFields() {
        const res = await fetch('/api/provider/karte-fields', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        karteFields = res.ok ? await res.json() : [];
        renderFieldsPanel();
        // 項目の追加・編集・削除のたびに呼ばれるため、既に開かれたお客様の「来店記録を追加」
        // フォームは古い項目セットでキャッシュされたままになる。次に開いた時に最新の項目で
        // 組み立て直させる（でお報告：項目を追加しても下のお客様側で使えるようにならなかった）。
        listEl.querySelectorAll('.karte-add-form').forEach(box => {
          box.dataset.built = '';
          box.style.display = 'none';
        });
      }

      if (kfTypeSel) kfTypeSel.addEventListener('change', () => {
        if (kfOptionsWrap) kfOptionsWrap.style.display = kfTypeSel.value === 'select' ? '' : 'none';
      });

      if (kfAddBtn) kfAddBtn.addEventListener('click', async () => {
        const label = kfLabelInput?.value.trim();
        const field_type = kfTypeSel?.value;
        if (!label) { showToast('項目名を入力してください'); return; }
        let options;
        if (field_type === 'select') {
          options = (kfOptionsInput?.value || '').split(',').map(s => s.trim()).filter(Boolean);
          if (!options.length) { showToast('選択肢を入力してください'); return; }
        }
        kfAddBtn.disabled = true;
        try {
          const res = await fetch('/api/provider/karte-fields', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ label, field_type, options }) });
          if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error || '追加に失敗しました'); return; }
          if (kfLabelInput) kfLabelInput.value = '';
          if (kfOptionsInput) kfOptionsInput.value = '';
          await loadFields();
          showToast('項目を追加しました');
        } finally {
          kfAddBtn.disabled = false;
        }
      });

      // ── 来店記録の追加フォーム（カスタム項目をtype別にレンダリング）──
      function renderFieldInputHtml(f) {
        if (f.field_type === 'select') {
          const opts = (f.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><select data-kv="${f.id}"><option value="">（未入力）</option>${opts}</select></div>`;
        }
        if (f.field_type === 'stars') {
          const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="karte-star" data-star="${n}" style="font-size:22px;background:none;border:none;cursor:pointer;color:#d1d5db;padding:2px;">★</button>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><div data-kv-stars="${f.id}" data-kv-value="0">${stars}</div></div>`;
        }
        if (f.field_type === 'number') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="number" data-kv="${f.id}" /></div>`;
        }
        if (f.field_type === 'date') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="date" data-kv="${f.id}" /></div>`;
        }
        if (f.field_type === 'checkbox') {
          return `<label class="checkbox-item"><input type="checkbox" data-kv-checkbox="${f.id}" /> ${esc(f.label)}</label>`;
        }
        return `<div class="form-field"><label>${esc(f.label)}</label><input type="text" data-kv="${f.id}" /></div>`;
      }

      function renderAddFormHtml(uid) {
        const fieldsHtml = karteFields.map(renderFieldInputHtml).join('');
        const menuOptions = providerMenus.map(m => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
        const menuHtml = providerMenus.length
          ? `<div class="form-field"><label>利用メニュー</label><select data-karte-entry-menu="${uid}"><option value="">（選択しない）</option>${menuOptions}</select></div>`
          : '';
        return `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fafafa;">
            ${menuHtml}
            ${fieldsHtml || '<p class="muted" style="font-size:12px;margin:0 0 8px;">カスタム項目は未設定です（上の「カルテ項目を設定」から追加できます）。</p>'}
            <div class="form-field"><label>メモ</label><textarea data-karte-entry-note="${uid}" style="min-height:70px;"></textarea></div>
            <button type="button" class="btn" style="font-size:12px;padding:6px 12px;" data-karte-entry-save="${uid}">記録を保存する</button>
          </div>`;
      }

      function bindStarWidgets(container) {
        container.querySelectorAll('[data-kv-stars]').forEach(wrap => {
          const stars = wrap.querySelectorAll('.karte-star');
          function paint(n) { stars.forEach(s => { s.style.color = Number(s.dataset.star) <= n ? '#f59e0b' : '#d1d5db'; }); }
          stars.forEach(s => s.addEventListener('click', () => { wrap.dataset.kvValue = s.dataset.star; paint(Number(s.dataset.star)); }));
        });
      }

      function collectCustomValues(container) {
        const values = {};
        container.querySelectorAll('[data-kv]').forEach(el => { if (el.value) values[el.dataset.kv] = el.value; });
        container.querySelectorAll('[data-kv-stars]').forEach(el => { if (Number(el.dataset.kvValue) > 0) values[el.dataset.kvStars] = Number(el.dataset.kvValue); });
        container.querySelectorAll('[data-kv-checkbox]').forEach(el => { if (el.checked) values[el.dataset.kvCheckbox] = true; });
        return values;
      }

      // ── 過去の記録の履歴表示 ──
      // entriesは新しい順（API側でcreated_at降順）。1つ後ろの要素が直前の来店にあたるため、
      // 差分から「前回から何日」を自動計算する（でお要望：来店間隔を自動で出したい）。
      function renderHistoryHtml(entries) {
        if (!entries.length) return '<p class="muted" style="font-size:12px;">まだ記録がありません。</p>';
        const labelMap = {};
        const typeMap = {};
        karteFields.forEach(f => { labelMap[f.id] = f.label; typeMap[f.id] = f.field_type; });
        function fmtCustomValue(fid, val) {
          if (typeMap[fid] === 'checkbox') return val ? '✓' : '';
          if (typeMap[fid] === 'date' && val) return new Date(val).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
          return esc(val);
        }
        return entries.map((e, i) => {
          const custom = Object.entries(e.custom_values || {})
            .filter(([fid, val]) => !(typeMap[fid] === 'checkbox' && !val))
            .map(([fid, val]) => `${esc(labelMap[fid] || fid)}: ${fmtCustomValue(fid, val)}`).join(' / ');
          const prev = entries[i + 1];
          const intervalLabel = prev
            ? `・前回から${Math.round((new Date(e.created_at) - new Date(prev.created_at)) / 86400000)}日`
            : '・初回の記録';
          return `
            <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:12.5px;">
              <div style="color:#9ca3af;font-size:11px;margin-bottom:2px;">${fmtDateTime(e.created_at)} <span class="muted">${intervalLabel}</span></div>
              ${e.menu_name ? `<div style="font-size:11.5px;color:#2563eb;">📋 ${esc(e.menu_name)}</div>` : ''}
              ${e.note ? `<div>${esc(e.note)}</div>` : ''}
              ${custom ? `<div class="muted">${custom}</div>` : ''}
            </div>`;
        }).join('');
      }

      // 今野くんの実地メモ（2026-09-12）：絞り込みが乏しいと、来なくなったお客様を
      // 手作業で仕分ける手間が発生し、確度の高いお客様がリストに埋もれる。並び替えを
      // 用意して「放っておいても目に付く」状態にする（デフォルトのnext_visit昇順に加え、
      // 最終来店が古い順を選べば、来なくなった順に自然と上に出てくる）。
      function applySortOrder(items) {
        const sortMode = sortSel?.value || 'next_visit';
        const sorted = [...items];
        if (sortMode === 'last_visit_old') {
          sorted.sort((a, b) => {
            const at = a.last_visit ? new Date(a.last_visit).getTime() : -Infinity;
            const bt = b.last_visit ? new Date(b.last_visit).getTime() : -Infinity;
            return at - bt;
          });
        } else if (sortMode === 'name') {
          sorted.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || '', 'ja'));
        }
        return sorted;
      }

      // 各絞り込み条件に何人該当するかをオプションに表示（クリックしなくても状況が分かるように）
      function updateFilterCounts() {
        if (!filterSel) return;
        const counts = { all: allItems.length, 'user-overdue': 0, 'store-overdue': 0, dormant: 0 };
        allItems.forEach(c => {
          if (typeof c.userOverdueDays === 'number' && c.userOverdueDays < 0) counts['user-overdue']++;
          if (typeof c.storeOverdueDays === 'number' && c.storeOverdueDays < 0) counts['store-overdue']++;
          if (c.status === 'dormant' || c.status === 'churned') counts.dormant++;
        });
        const labels = { all: 'すべて', 'user-overdue': 'ユーザー想定超過のみ', 'store-overdue': '店舗推奨超過のみ', dormant: '休眠のみ' };
        Array.from(filterSel.options).forEach(opt => { opt.textContent = `${labels[opt.value]}（${counts[opt.value] ?? 0}）`; });
      }

      // 一覧はコンパクトな行のみ表示し、クリックでポップアップに詳細をまとめる方式に変更
      // （でお指摘2026-09-12：カードが大きすぎる。今野くんの実地メモ：確度の高いお客様が埋もれる
      // 対策として、1画面により多くの行を並べられるようにする）。
      function isOverdue(c) {
        return (typeof c.userOverdueDays === 'number' && c.userOverdueDays < 0) || (typeof c.storeOverdueDays === 'number' && c.storeOverdueDays < 0);
      }

      // 現在の絞り込み条件（フィルター・検索キーワード）に一致する会員行だけを返す。
      // 一覧の表示にも、一斉メール配信の「今の絞り込み結果全員に送る」にも使う共通ロジック
      // （でお要望2026-09-14：hacomonoのメンバータイプ別一斉配信相当機能）。
      function currentFilteredMemberRows() {
        const filter = filterSel?.value || 'all';
        const kw = (searchInput?.value || '').trim().toLowerCase();
        return allItems.filter(c => {
          if (kw && !(c.customer_name || '').toLowerCase().includes(kw)) return false;
          if (filter === 'user-overdue') return typeof c.userOverdueDays === 'number' && c.userOverdueDays < 0;
          if (filter === 'store-overdue') return typeof c.storeOverdueDays === 'number' && c.storeOverdueDays < 0;
          if (filter === 'dormant') return c.status === 'dormant' || c.status === 'churned';
          return true;
        });
      }

      // 会員（New Me Log紐づき）・非会員（Fineme未登録）を1つのリストに統合（でお指摘
      // 2026-09-12：店舗からすると分ける意味がなく、1箇所にまとまっていないと使えない）。
      function render() {
        const filter = filterSel?.value || 'all';
        const kw = (searchInput?.value || '').trim().toLowerCase();
        const memberRows = currentFilteredMemberRows();
        // 休眠・超過フィルターは非会員には概念自体が無いため、絞り込み中は一覧から外す
        // （「全て」の時だけ非会員も並べる）
        const manualRows = filter === 'all'
          ? manualItems.filter(m => !m.linked_user_id && (!kw || (m.display_name || '').toLowerCase().includes(kw)))
          : [];
        const items = [...applySortOrder(memberRows), ...manualRows];
        updateBroadcastCount();
        if (!items.length) {
          listEl.innerHTML = '<p class="muted">該当するお客様はいません。</p>';
          return;
        }
        listEl.innerHTML = `
          <div class="cust-row cust-row-head"><span>お客様</span><span>前回来店</span><span>次回目安</span><span></span></div>
        ` + items.map(c => {
          const isManual = !c.user_id; // memberはuser_id、manualはid(provider_manual_customers)しか持たない
          return `
          <div class="cust-row" data-cust-open="${isManual ? c.id : c.user_id}" data-cust-type="${isManual ? 'manual' : 'member'}">
            <span class="cust-row-name">${esc(isManual ? c.display_name : c.customer_name)}${!isManual && c.hasStoreNote ? ' 📝' : ''}</span>
            <span class="cust-row-date">${isManual ? '—' : fmtDate(c.last_visit)}</span>
            <span class="cust-row-date">${isManual ? '—' : `${fmtDate(c.next_visit)}${isOverdue(c) ? ' ⚠️' : ''}`}</span>
            <span>${isManual ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:99px;">非会員</span>' : statusBadge(c.status)}</span>
          </div>
        `;
        }).join('');
        listEl.querySelectorAll('[data-cust-open]').forEach(row => bindTapHandler(row, () => openCustomerModal(row.dataset.custOpen, row.dataset.custType)));
      }

      // ── セグメント一斉メール配信（でお要望2026-09-14：hacomonoのメンバータイプ別
      //    一斉メール配信相当機能。凝ったテンプレートは持たず、件名＋本文の自由記述を
      //    「今の絞り込み結果全員」に送るだけのシンプルな実装） ──
      const bcCountEl = document.getElementById('bc-recipient-count');
      const bcSubjectEl = document.getElementById('bc-subject');
      const bcBodyEl = document.getElementById('bc-body');
      const bcSendBtn = document.getElementById('bc-send-btn');
      const bcMsgEl = document.getElementById('bc-msg');
      function updateBroadcastCount() {
        if (!bcCountEl) return;
        const n = currentFilteredMemberRows().length;
        bcCountEl.textContent = `今の絞り込み条件：${n}名に送信されます`;
      }
      bcSendBtn?.addEventListener('click', async () => {
        const subject = bcSubjectEl?.value.trim();
        const body_text = bcBodyEl?.value.trim();
        const userIds = currentFilteredMemberRows().map(c => c.user_id).filter(Boolean);
        if (!subject || !body_text) { showToast('件名と本文を入力してください'); return; }
        if (!userIds.length) { showToast('送信対象がいません'); return; }
        if (!confirm(`${userIds.length}名に一斉メールを送信します。よろしいですか？（取り消せません）`)) return;
        bcSendBtn.disabled = true;
        if (bcMsgEl) { bcMsgEl.style.color = ''; bcMsgEl.textContent = '送信中…'; }
        const res = await fetch('/api/provider/customers/broadcast-email', {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ user_ids: userIds, subject, body_text }),
        });
        bcSendBtn.disabled = false;
        if (!res.ok) { const e = await res.json().catch(() => ({})); if (bcMsgEl) { bcMsgEl.style.color = '#ef4444'; bcMsgEl.textContent = 'エラー: ' + (e.error || '不明'); } return; }
        const d = await res.json();
        if (bcMsgEl) { bcMsgEl.style.color = '#4ade80'; bcMsgEl.textContent = `✓ ${d.sent}名に送信しました（メール未登録等で${d.skipped}名はスキップ）`; }
        if (bcSubjectEl) bcSubjectEl.value = '';
        if (bcBodyEl) bcBodyEl.value = '';
      });

      // ── 顧客詳細ポップアップ（一覧の行クリックで開く。バッジ・固定メモ・声かけ・
      //    担当割当・来店記録追加/履歴/AI傾向分析をここに集約） ──
      const custModalEl = document.getElementById('customer-detail-modal');
      const custModalNameEl = document.getElementById('cust-modal-name');
      const custModalBadgesEl = document.getElementById('cust-modal-badges');
      const custModalInfoEl = document.getElementById('cust-modal-info');
      const custModalNudgeBtn = document.getElementById('cust-modal-nudge-btn');
      const custModalAssignSel = document.getElementById('cust-modal-assign-select');
      const custModalNoteTa = document.getElementById('cust-modal-note-textarea');
      const custModalNoteSaveBtn = document.getElementById('cust-modal-note-save-btn');
      const custModalAddToggle = document.getElementById('cust-modal-add-toggle');
      const custModalAddForm = document.getElementById('cust-modal-add-form');
      const custModalHistoryToggle = document.getElementById('cust-modal-history-toggle');
      const custModalHistoryEl = document.getElementById('cust-modal-history');
      const custModalInsightBtn = document.getElementById('cust-modal-insight-btn');
      const custModalInsightEl = document.getElementById('cust-modal-insight');
      const custModalMemberSection = document.getElementById('cust-modal-member-section');
      const custModalManualSection = document.getElementById('cust-modal-manual-section');
      const custModalLinkSel = document.getElementById('cust-modal-link-select');
      const custModalManualDeleteBtn = document.getElementById('cust-modal-manual-delete-btn');
      const custModalManualMemoTa = document.getElementById('cust-modal-manual-memo-textarea');
      const custModalManualSaveBtn = document.getElementById('cust-modal-manual-save-btn');
      const custModalManualAddToggle = document.getElementById('cust-modal-manual-add-toggle');
      const custModalManualAddForm = document.getElementById('cust-modal-manual-add-form');
      const custModalManualHistoryToggle = document.getElementById('cust-modal-manual-history-toggle');
      const custModalManualHistoryEl = document.getElementById('cust-modal-manual-history');
      let currentCustUid = null;
      let currentCustType = 'member';

      function openCustomerModal(uidOrId, type, fallbackName) {
        if (type === 'manual') return openManualModal(uidOrId);
        return openMemberModal(uidOrId, fallbackName);
      }

      async function openMemberModal(uid, fallbackName) {
        try {
          await openMemberModalInner(uid, fallbackName);
        } catch (e) {
          console.error('[openMemberModal]', e);
          showToast('エラー: ' + e.message);
        }
      }
      async function openMemberModalInner(uid, fallbackName) {
        // 今日の業務・予約カレンダー・予約リクエスト等、顧客管理タブを一度も開かずに
        // 他タブから直接呼ばれる場合はallItemsが空のことがあるため、その場でロードする
        // （でお要望2026-09-13：他の場所からもフルの顧客情報ポップアップを開けるように）。
        let c = allItems.find(x => x.user_id === uid);
        if (!c) {
          // でお報告2026-09-14で確定：loadAll()（顧客一覧＋スタッフ一覧の同時取得、
          // New Me Log連携判定等を含む重い処理）を無条件に待っていたため、詰まる/
          // 遅延すると「押しても何も起きない」ように見えていた。3秒でタイムアウトし、
          // 間に合わなければ簡易表示にフォールバックして必ずモーダル自体は開くようにする。
          await Promise.race([loadAll(), new Promise(resolve => setTimeout(resolve, 3000))]);
          c = allItems.find(x => x.user_id === uid);
        }
        if (!custModalEl) return;
        currentCustUid = uid;
        currentCustType = 'member';
        custModalMemberSection.style.display = '';
        custModalManualSection.style.display = 'none';

        if (c) {
          const def = ALL_AXES[c.axis];
          const axisLabel = def ? `${def.icon} ${esc(def.label)}` : esc(c.axis);
          custModalNameEl.textContent = c.customer_name;
          custModalBadgesEl.innerHTML = `
            <span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;">${axisLabel}</span>
            ${statusBadge(c.status)}
            ${overdueBadge('ユーザー想定', c.userOverdueDays)}
            ${overdueBadge('店舗推奨', c.storeOverdueDays)}
            ${c.meScanType?.fullName ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#faf5ff;color:#9333ea;border-radius:99px;" title="Me Scanタイプ">🧬 ${esc(c.meScanType.fullName)}</span>` : c.meScanDone ? '<span style="font-size:11px;padding:2px 8px;background:#faf5ff;color:#9333ea;border-radius:99px;">Me Scan済</span>' : ''}
            ${c.mirror?.visualTier ? `<span style="font-size:11px;padding:2px 8px;background:#fff7ed;color:#c2410c;border-radius:99px;">Mirror: ${esc(c.mirror.visualTier)}</span>` : ''}
          `;
          custModalInfoEl.textContent = `前回：${fmtDate(c.last_visit)}／次回目安：${fmtDate(c.next_visit)}／頻度：${fmtFreq(c)}／来店回数：${c.visitCount ?? 0}回`;
          const staffOptions = ['<option value="">担当未割当</option>']
            .concat(staffList.map(s => `<option value="${s.id}"${c.assignedStaffId === s.id ? ' selected' : ''}>${esc(s.name)}</option>`))
            .join('');
          custModalAssignSel.innerHTML = staffOptions;
        } else {
          // /api/provider/customers はNew Me Logを自店舗に連携している顧客しか返さない。
          // 予約はしたがNew Me Logは未連携、という会員（でお報告2026-09-13：「会員なのに
          // 開かない」の原因）でも、固定メモ・カルテはuser_idベースで連携有無と無関係に
          // 使えるため、簡易表示でモーダル自体は開く。
          custModalNameEl.textContent = fallbackName || '(お名前不明)';
          custModalBadgesEl.innerHTML = '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#6b7280;border-radius:99px;">New Me Log未連携</span>';
          custModalInfoEl.textContent = 'このお客様はNew Me Log（無料の来店サイクル管理ツール）を貴店に連携していないため、来店サイクルの情報は表示できません。固定メモ・カルテの記録は通常どおり行えます。';
          custModalAssignSel.innerHTML = ['<option value="">担当未割当</option>'].concat(staffList.map(s => `<option value="${s.id}">${esc(s.name)}</option>`)).join('');
        }

        custModalAddForm.style.display = 'none'; custModalAddForm.innerHTML = ''; custModalAddForm.dataset.built = '';
        custModalHistoryEl.style.display = 'none'; custModalHistoryEl.innerHTML = ''; custModalHistoryEl.dataset.built = '';
        custModalInsightEl.style.display = 'none'; custModalInsightEl.innerHTML = '';
        custModalNoteTa.value = ''; custModalNoteTa.disabled = true; custModalNoteTa.placeholder = '読み込み中…';
        custModalNoteSaveBtn.disabled = true;

        custModalEl.style.display = 'flex';

        const noteRes = await fetch(`/api/provider/customers/${uid}/note`, { headers: authHeaders() });
        if (noteRes.ok) {
          const d = await noteRes.json();
          custModalNoteTa.value = d.note || '';
          custModalNoteTa.disabled = false;
          custModalNoteTa.placeholder = 'この店舗だけが見られるメモ（要望・使った薬剤・注意点など）。お客様には表示されません。';
          custModalNoteSaveBtn.disabled = false;
        }
      }

      async function openManualModal(id) {
        let m = manualItems.find(x => x.id === id);
        if (!m) { await loadManualCustomers(); m = manualItems.find(x => x.id === id); }
        if (!m || !custModalEl) { showToast('顧客情報が見つかりませんでした'); return; }
        currentCustUid = id;
        currentCustType = 'manual';
        custModalMemberSection.style.display = 'none';
        custModalManualSection.style.display = '';
        custModalNameEl.textContent = m.display_name;
        custModalBadgesEl.innerHTML = '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:99px;">非会員</span>';
        custModalInfoEl.textContent = 'Finemeに登録していないお客様のカルテです。会員だと分かった場合は下の「会員と紐付ける」で紐付けると、記録が引き継がれます。';
        custModalManualMemoTa.value = m.memo || '';
        const memberOptions = [...new Map(allItems.map(c => [c.user_id, c.customer_name])).entries()]
          .map(([uid, name]) => `<option value="${uid}">${esc(name)}</option>`).join('');
        custModalLinkSel.innerHTML = `<option value="">選択してください</option>${memberOptions}`;
        custModalManualAddForm.style.display = 'none'; custModalManualAddForm.innerHTML = ''; custModalManualAddForm.dataset.built = '';
        custModalManualHistoryEl.style.display = 'none'; custModalManualHistoryEl.innerHTML = ''; custModalManualHistoryEl.dataset.built = '';
        custModalEl.style.display = 'flex';
      }

      custModalLinkSel?.addEventListener('change', async () => {
        if (!currentCustUid || currentCustType !== 'manual' || !custModalLinkSel.value) return;
        if (!confirm('選択した会員と紐付けます。よろしいですか？（後から取り消せません）')) { custModalLinkSel.value = ''; return; }
        const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/link`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ user_id: custModalLinkSel.value }) });
        if (res.ok) {
          showToast('紐付けました。以降このお客様のカルテに記録が引き継がれます');
          custModalEl.style.display = 'none';
          await loadManualCustomers();
        } else {
          const d = await res.json(); showToast('エラー: ' + (d.error || '不明')); custModalLinkSel.value = '';
        }
      });

      custModalManualDeleteBtn?.addEventListener('click', async () => {
        if (!currentCustUid || currentCustType !== 'manual') return;
        if (!confirm('この非会員のお客様を削除しますか？（カルテ記録も削除されます）')) return;
        await fetch(`/api/provider/customers/manual/${currentCustUid}`, { method: 'DELETE', headers: authHeaders() });
        custModalEl.style.display = 'none';
        await loadManualCustomers();
      });

      custModalManualSaveBtn?.addEventListener('click', async () => {
        if (!currentCustUid || currentCustType !== 'manual') return;
        custModalManualSaveBtn.disabled = true;
        const label = custModalManualSaveBtn.textContent;
        custModalManualSaveBtn.textContent = '保存中…';
        try {
          const res = await fetch(`/api/provider/customers/manual/${currentCustUid}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ memo: custModalManualMemoTa.value }) });
          if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error || '保存に失敗しました'); return; }
          showToast('メモを保存しました');
          const m = manualItems.find(x => x.id === currentCustUid); if (m) m.memo = custModalManualMemoTa.value;
        } finally {
          custModalManualSaveBtn.disabled = false; custModalManualSaveBtn.textContent = label;
        }
      });

      custModalManualAddToggle?.addEventListener('click', () => {
        if (!currentCustUid || currentCustType !== 'manual') return;
        const opening = custModalManualAddForm.style.display === 'none';
        custModalManualAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualAddForm.dataset.built) {
          const menuOptions = ['<option value="">利用メニュー（任意）</option>'].concat(providerMenus.map(m => `<option value="${esc(m.name)}">${esc(m.name)}</option>`)).join('');
          custModalManualAddForm.innerHTML = `
            <select id="cust-modal-manual-entry-menu" style="font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;width:100%;box-sizing:border-box;margin-bottom:8px;">${menuOptions}</select>
            <textarea id="cust-modal-manual-entry-note" placeholder="メモ（要望・使った薬剤・注意点など）" style="width:100%;min-height:60px;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;box-sizing:border-box;margin-bottom:8px;"></textarea>
            <button type="button" class="btn" style="font-size:12px;padding:6px 14px;" id="cust-modal-manual-entry-save">記録を追加</button>
          `;
          custModalManualAddForm.dataset.built = '1';
          document.getElementById('cust-modal-manual-entry-save')?.addEventListener('click', async () => {
            const noteEl = document.getElementById('cust-modal-manual-entry-note');
            const menuEl = document.getElementById('cust-modal-manual-entry-menu');
            const note = noteEl?.value || '';
            const menu_name = menuEl?.value || '';
            if (!note.trim() && !menu_name) { showToast('メモか利用メニューのどちらかは入力してください'); return; }
            const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/karte-entries`, {
              method: 'POST', headers: authHeaders(), body: JSON.stringify({ note, menu_name: menu_name || null }),
            });
            if (res.ok) {
              showToast('記録を追加しました');
              if (noteEl) noteEl.value = ''; if (menuEl) menuEl.value = '';
              custModalManualHistoryEl.dataset.built = ''; // 次に開いた時に最新の履歴を取り直す
            } else { const d = await res.json(); showToast('エラー: ' + (d.error || '不明')); }
          });
        }
      });

      custModalManualHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid || currentCustType !== 'manual') return;
        const opening = custModalManualHistoryEl.style.display === 'none';
        custModalManualHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualHistoryEl.dataset.built) {
          custModalManualHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalManualHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/karte-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalManualHistoryEl.innerHTML = renderHistoryHtml(entries);
          } catch {
            custModalManualHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
          }
        }
      });

      const nudgeModalEl = document.getElementById('nudge-modal');
      const nudgeTextareaEl = document.getElementById('nudge-message-textarea');
      const nudgeSendBtn = document.getElementById('nudge-send-btn');

      custModalNudgeBtn?.addEventListener('click', () => {
        if (!currentCustUid || !nudgeModalEl) return;
        nudgeTextareaEl.value = '';
        nudgeModalEl.style.display = 'flex';
        nudgeTextareaEl.focus();
      });
      document.getElementById('nudge-cancel-btn')?.addEventListener('click', () => { nudgeModalEl.style.display = 'none'; });
      nudgeModalEl?.addEventListener('click', (e) => { if (e.target === nudgeModalEl) nudgeModalEl.style.display = 'none'; });
      nudgeSendBtn?.addEventListener('click', async () => {
        if (!currentCustUid) return;
        const message = nudgeTextareaEl.value.trim();
        if (!message) { showToast('メッセージを入力してください'); return; }
        nudgeSendBtn.disabled = true;
        const res = await fetch(`/api/provider/customers/${currentCustUid}/nudge`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ message }) });
        const data = await res.json();
        nudgeSendBtn.disabled = false;
        showToast(res.ok ? '送信しました' : `送信エラー：${data.error || '不明'}`);
        if (res.ok) nudgeModalEl.style.display = 'none';
      });

      custModalAssignSel?.addEventListener('change', async () => {
        if (!currentCustUid) return;
        custModalAssignSel.disabled = true;
        const res = await fetch(`/api/provider/customers/${currentCustUid}/note`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ assigned_staff_id: custModalAssignSel.value || null }) });
        showToast(res.ok ? '担当を更新しました' : '更新に失敗しました');
        custModalAssignSel.disabled = false;
        const c = allItems.find(x => x.user_id === currentCustUid); if (c) c.assignedStaffId = custModalAssignSel.value || null;
      });

      custModalNoteSaveBtn?.addEventListener('click', async () => {
        if (!currentCustUid) return;
        custModalNoteSaveBtn.disabled = true;
        const label = custModalNoteSaveBtn.textContent;
        custModalNoteSaveBtn.textContent = '保存中…';
        try {
          await fetch(`/api/provider/customers/${currentCustUid}/note`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ note: custModalNoteTa.value }) });
          showToast('メモを保存しました');
          const c = allItems.find(x => x.user_id === currentCustUid);
          if (c && c.hasStoreNote !== !!custModalNoteTa.value) { c.hasStoreNote = !!custModalNoteTa.value; render(); }
        } finally {
          custModalNoteSaveBtn.disabled = false; custModalNoteSaveBtn.textContent = label;
        }
      });

      custModalAddToggle?.addEventListener('click', () => {
        if (!currentCustUid) return;
        const opening = custModalAddForm.style.display === 'none';
        custModalAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalAddForm.dataset.built) {
          custModalAddForm.innerHTML = renderAddFormHtml(currentCustUid);
          custModalAddForm.dataset.built = '1';
          bindStarWidgets(custModalAddForm);
          custModalAddForm.querySelector(`[data-karte-entry-save="${currentCustUid}"]`)?.addEventListener('click', async (e) => {
            const saveBtn = e.currentTarget;
            const noteEl = custModalAddForm.querySelector(`[data-karte-entry-note="${currentCustUid}"]`);
            const menuEl = custModalAddForm.querySelector(`[data-karte-entry-menu="${currentCustUid}"]`);
            saveBtn.disabled = true;
            try {
              const res = await fetch(`/api/provider/customers/${currentCustUid}/karte-entries`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ note: noteEl?.value || '', custom_values: collectCustomValues(custModalAddForm), menu_name: menuEl?.value || null }),
              });
              if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error || '保存に失敗しました'); return; }
              showToast('記録を保存しました');
              custModalAddForm.style.display = 'none';
              custModalAddForm.dataset.built = '';
              custModalHistoryEl.dataset.built = ''; // 次に開いた時に最新の履歴を取り直す
            } finally {
              saveBtn.disabled = false;
            }
          });
        }
      });

      custModalHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid) return;
        const opening = custModalHistoryEl.style.display === 'none';
        custModalHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalHistoryEl.dataset.built) {
          custModalHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/${currentCustUid}/karte-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalHistoryEl.innerHTML = renderHistoryHtml(entries);
          } catch {
            custModalHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
          }
        }
      });

      custModalInsightBtn?.addEventListener('click', async () => {
        if (!currentCustUid) return;
        custModalInsightEl.style.display = 'block';
        custModalInsightEl.innerHTML = '<p class="muted" style="font-size:12px;">分析中…</p>';
        custModalInsightBtn.disabled = true;
        try {
          const res = await fetch(`/api/provider/customers/${currentCustUid}/karte-insight`, { method: 'POST', headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            custModalInsightEl.innerHTML = `<p class="muted" style="font-size:12px;color:#ef4444;">${esc(data.error || '分析に失敗しました')}</p>`;
          } else if (data.insufficientData) {
            custModalInsightEl.innerHTML = `<p class="muted" style="font-size:12px;">まだ記録が少なく（${data.count}件）、傾向を出すには早いです。3件以上たまると分析できます。</p>`;
          } else {
            custModalInsightEl.innerHTML = `
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;">
                <p style="font-size:11px;font-weight:700;color:#6d28d9;margin:0 0 6px;">🤖 AIが気づいた傾向</p>
                <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#4c1d95;">
                  ${data.insights.map(i => `<li>${esc(i)}</li>`).join('')}
                </ul>
              </div>`;
          }
        } catch {
          custModalInsightEl.innerHTML = '<p class="muted" style="font-size:12px;color:#ef4444;">分析に失敗しました</p>';
        } finally {
          custModalInsightBtn.disabled = false;
        }
      });

      document.getElementById('cust-modal-close')?.addEventListener('click', () => { custModalEl.style.display = 'none'; });
      custModalEl?.addEventListener('click', (e) => { if (e.target === custModalEl) custModalEl.style.display = 'none'; });

      async function loadAll() {
        listEl.innerHTML = '<p class="muted">読み込み中…</p>';
        try {
          const [res, staffRes] = await Promise.all([
            fetch('/api/provider/customers', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } }),
            fetch('/api/provider/staff', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } }),
          ]);
          if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
          staffList = staffRes.ok ? await staffRes.json() : [];
          allItems = await res.json();
          updateFilterCounts();

          const capBanner = document.getElementById('customers-cap-banner');
          if (capBanner) {
            const totalConnected = res.headers.get('X-Fineme-Total-Connected');
            const visibleLimit = res.headers.get('X-Fineme-Visible-Limit');
            capBanner.innerHTML = totalConnected
              ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#92400e">
                  🔒 現在ライトプランのため、New Me Log連携は先着${visibleLimit}人まで表示（実際の連携数：${totalConnected}人）。連携自体・お客様への通知は制限されません。プレミアムプランで無制限になります。
                </div>`
              : '';
          }

          render(); // render()自体が「該当なし」の空表示も面倒を見る（会員・非会員の統合リスト）
        } catch {
          listEl.innerHTML = '<p class="muted">読み込みに失敗しました</p>';
        }
      }

      // ── 非会員のお客様（Fineme未登録）のカルテ ─────────────────
      // 既存の会員向けカルテ(user_id紐付け)とは別テーブル(provider_manual_customers)。
      // 2026-09-12：会員・非会員で一覧が分かれているのは店舗から見て意味がないとの指摘を受け、
      // render()で統合表示するように変更。データの読み込み・作成フォームだけここに残す。
      const manualAddBtn = document.getElementById('manual-add-btn');
      const manualNameInput = document.getElementById('manual-name-input');
      const manualMemoInput = document.getElementById('manual-memo-input');
      let manualItems = [];

      async function loadManualCustomers() {
        try {
          const res = await fetch('/api/provider/customers/manual', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
          manualItems = res.ok ? await res.json() : [];
          render();
        } catch {}
      }

      manualAddBtn?.addEventListener('click', async () => {
        const display_name = manualNameInput?.value || '';
        if (!display_name.trim()) { showToast('お名前を入力してください'); return; }
        const res = await fetch('/api/provider/customers/manual', {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ display_name, memo: manualMemoInput?.value || '' }),
        });
        if (res.ok) {
          if (manualNameInput) manualNameInput.value = '';
          if (manualMemoInput) manualMemoInput.value = '';
          showToast('非会員のお客様を作成しました');
          loadManualCustomers();
        } else { const d = await res.json(); showToast('エラー: ' + (d.error || '不明')); }
      });

      if (searchInput) searchInput.addEventListener('input', render);
      if (filterSel) filterSel.addEventListener('change', render);
      if (sortSel) sortSel.addEventListener('change', render);
      document.querySelectorAll('[data-tab="customers"]').forEach(btn => btn.addEventListener('click', () => { loadFields(); loadMenus(); loadAll(); loadManualCustomers(); }, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'customers') { loadFields(); loadMenus(); loadAll(); loadManualCustomers(); }

      // 今日の業務・予約カレンダー・予約リクエスト等、他タブからもこのフルの顧客情報
      // ポップアップ（カルテ編集・回数券・声かけ・担当割当）を開けるようにする
      // （でお要望2026-09-13：「他の場所でもポップアップを出す時はちゃんと顧客情報
      // 全部見れて、必要に応じて編集できたりページ飛べたりできるように」）。
      window.openCustomerModal = openCustomerModal;
    })();

    // ── 回数券・パッケージタブ ────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const defListEl = document.getElementById('pkg-def-list');
      const customerListEl = document.getElementById('pkg-customer-list');
      const userSel = document.getElementById('pkg-assign-user');
      const pkgSel = document.getElementById('pkg-assign-package');
      let defs = [];

      async function loadDefs() {
        const res = await fetch('/api/provider/packages', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { if (defListEl) defListEl.innerHTML = authErrorHtml(res); return; }
        defs = await res.json();
        renderDefs();
        renderPkgSelect();
      }

      function renderDefs() {
        if (!defListEl) return;
        if (!defs.length) { defListEl.innerHTML = '<p class="muted" style="font-size:13px">まだパッケージがありません。上のフォームから作成してください。</p>'; return; }
        defListEl.innerHTML = defs.map(d => {
          const typeLabel = d.package_type === 'unlimited' ? '通い放題'
            : d.package_type === 'combo' ? `通い放題＋チケット${d.combo_ticket_sessions ? d.combo_ticket_sessions + '回' : ''}`
            : d.package_type === 'subscription' ? `月額会員（初回${d.total_sessions}回＋毎月${d.recurring_sessions}回自動付与）`
            : `${d.total_sessions}回`;
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;${d.active ? '' : 'opacity:.5'}">
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(d.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${typeLabel}${d.price ? ` ／ ¥${Number(d.price).toLocaleString()}` : ''}${d.validity_days ? ` ／ 有効期限${d.validity_days}日` : ' ／ 無期限'}</span>
            </div>
            <button class="btn btn-ghost" style="font-size:11px;padding:6px 12px" onclick="togglePackageActive('${d.id}', ${!d.active})">${d.active ? '停止する' : '再開する'}</button>
          </div>
        `;
        }).join('');
      }

      function renderPkgSelect() {
        if (!pkgSel) return;
        const active = defs.filter(d => d.active);
        pkgSel.innerHTML = active.length
          ? active.map(d => `<option value="${d.id}">${esc(d.name)}（${d.package_type === 'unlimited' ? '通い放題' : d.package_type === 'subscription' ? `月額・毎月${d.recurring_sessions}回` : d.total_sessions + '回'}）</option>`).join('')
          : '<option value="">先にパッケージを作成してください</option>';
      }

      async function loadUsersForSelect() {
        if (!userSel) return;
        // パッケージ機能はライトプランの表示上限(30人)の対象外（でお決定 2026-08-28）
        const res = await fetch('/api/provider/customers?scope=all', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const rows = await res.json();
        const seen = new Set();
        const opts = [];
        rows.forEach(r => {
          if (seen.has(r.user_id)) return;
          seen.add(r.user_id);
          opts.push(`<option value="${r.user_id}">${esc(r.customer_name)}</option>`);
        });
        userSel.innerHTML = opts.length ? opts.join('') : '<option value="">New Me Log連携済みの顧客がいません</option>';
      }

      async function loadCustomerPackages() {
        if (!customerListEl) return;
        customerListEl.innerHTML = '<p class="muted">読み込み中…</p>';
        // 今野くんの実地メモ：有効な会員のみ表示・使用済みチケットは後ろに回したい（Phase 2）
        const activeOnly = !!document.getElementById('pkg-active-only')?.checked;
        const qs = activeOnly ? '?activeOnly=true' : '';
        const res = await fetch(`/api/provider/customer-packages${qs}`, { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { customerListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { customerListEl.innerHTML = '<p class="muted">まだ購入記録がありません。</p>'; return; }
        const sorted = [...rows].sort((a, b) => (a.used_up || a.expired ? 1 : 0) - (b.used_up || b.expired ? 1 : 0));
        customerListEl.innerHTML = sorted.map(r => {
          const countLabel = r.package_type === 'unlimited' ? '通い放題' : `残り${r.remaining_sessions}/${r.total_sessions}回${r.used_up ? '（使用済み）' : ''}`;
          // 月額会員（でお要望2026-09-14）：次回自動付与日・解約ボタンを表示
          const isSub = r.package_type === 'subscription';
          const subInfo = isSub
            ? r.subscription_status === 'cancelled'
              ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#6b7280;border-radius:99px;margin-left:6px">解約済み</span>'
              : `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;margin-left:6px">月額会員・次回付与${esc(r.next_grant_at || '未定')}</span>`
            : '';
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;${r.expired || r.used_up ? 'opacity:.5' : ''}">
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(r.customer_name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${esc(r.package_name)}｜${countLabel}${r.expired ? '（期限切れ）' : ''}</span>${subInfo}
            </div>
            ${isSub && r.subscription_status !== 'cancelled' ? `<button class="btn btn-ghost" style="font-size:11px;padding:6px 12px;color:#ef4444" onclick="cancelSubscription('${r.id}', this)">解約する</button>` : ''}
            ${r.last_usage_id ? `<button class="btn btn-ghost" style="font-size:11px;padding:6px 12px;color:#ef4444" onclick="undoPackageUsage('${r.id}', this)">直近1回を取り消す</button>` : ''}
          </div>
        `;
        }).join('');
      }

      window.cancelSubscription = async function (customerPackageId, btn) {
        if (!confirm('この月額会員の自動付与を解約しますか？（発行済みの残り回数はそのまま使えます）')) return;
        if (btn) btn.disabled = true;
        const res = await fetch(`/api/provider/customer-packages/${customerPackageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ subscription_status: 'cancelled' }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); if (btn) btn.disabled = false; return; }
        showToast('解約しました');
        loadCustomerPackages();
      };

      window.togglePackageActive = async function (id, active) {
        await fetch(`/api/provider/packages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ active }),
        });
        loadDefs();
      };

      window.undoPackageUsage = async function (customerPackageId, btn) {
        if (!confirm('直近1回分の消化を取り消しますか？')) return;
        if (btn) btn.disabled = true;
        const res = await fetch(`/api/provider/customer-packages/${customerPackageId}/usages`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
        });
        if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); if (btn) btn.disabled = false; return; }
        showToast('取り消しました');
        loadCustomerPackages();
      };

      const typeSel = document.getElementById('pkg-type');
      const sessionsField = document.getElementById('pkg-sessions-field');
      const sessionsLabel = document.getElementById('pkg-sessions-label');
      const comboSessionsField = document.getElementById('pkg-combo-sessions-field');
      const recurringSessionsField = document.getElementById('pkg-recurring-sessions-field');
      function syncTypeFields() {
        const t = typeSel?.value || 'fixed_count';
        if (sessionsField) sessionsField.style.display = t === 'unlimited' ? 'none' : '';
        if (sessionsLabel) sessionsLabel.textContent = t === 'subscription' ? '初回付与回数' : '回数';
        if (comboSessionsField) comboSessionsField.style.display = t === 'combo' ? '' : 'none';
        // 月額会員（でお要望2026-09-14：「月額契約で毎月チケットが自動付与される」仕組み）
        if (recurringSessionsField) recurringSessionsField.style.display = t === 'subscription' ? '' : 'none';
      }
      if (typeSel) { typeSel.addEventListener('change', syncTypeFields); syncTypeFields(); }

      const activeOnlyCheckbox = document.getElementById('pkg-active-only');
      if (activeOnlyCheckbox) activeOnlyCheckbox.addEventListener('change', loadCustomerPackages);

      const createBtn = document.getElementById('pkg-create-btn');
      if (createBtn) {
        createBtn.addEventListener('click', async () => {
          const name = document.getElementById('pkg-name')?.value.trim();
          const package_type = typeSel?.value || 'fixed_count';
          const sessions = document.getElementById('pkg-sessions')?.value;
          const comboSessions = document.getElementById('pkg-combo-sessions')?.value;
          const recurringSessions = document.getElementById('pkg-recurring-sessions')?.value;
          const price = document.getElementById('pkg-price')?.value;
          const validity = document.getElementById('pkg-validity')?.value;
          if (!name) { showToast('パッケージ名を入力してください'); return; }
          if (package_type !== 'unlimited' && !sessions) { showToast('回数を入力してください'); return; }
          if (package_type === 'subscription' && !recurringSessions) { showToast('毎月の付与回数を入力してください'); return; }
          createBtn.disabled = true;
          const res = await fetch('/api/provider/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({
              name, package_type, total_sessions: sessions || null,
              combo_ticket_sessions: package_type === 'combo' ? comboSessions : null,
              recurring_sessions: package_type === 'subscription' ? recurringSessions : null,
              price: price || null, validity_days: validity || null,
            }),
          });
          createBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
          document.getElementById('pkg-name').value = '';
          document.getElementById('pkg-sessions').value = '';
          document.getElementById('pkg-combo-sessions').value = '';
          document.getElementById('pkg-recurring-sessions').value = '';
          document.getElementById('pkg-price').value = '';
          document.getElementById('pkg-validity').value = '';
          showToast('パッケージを作成しました');
          loadDefs();
        });
      }

      const assignBtn = document.getElementById('pkg-assign-btn');
      const assignMsg = document.getElementById('pkg-assign-msg');
      if (assignBtn) {
        assignBtn.addEventListener('click', async () => {
          const user_id = userSel?.value;
          const package_id = pkgSel?.value;
          if (!user_id || !package_id) { if (assignMsg) assignMsg.textContent = '顧客とパッケージを選んでください'; return; }
          assignBtn.disabled = true;
          const res = await fetch('/api/provider/customer-packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({ user_id, package_id }),
          });
          assignBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => {}); if (assignMsg) { assignMsg.style.color = '#ef4444'; assignMsg.textContent = e?.error || '記録に失敗しました'; } return; }
          if (assignMsg) { assignMsg.style.color = '#059669'; assignMsg.textContent = '記録しました'; }
          loadCustomerPackages();
        });
      }

      async function loadAll() {
        await Promise.all([loadDefs(), loadUsersForSelect(), loadCustomerPackages()]);
      }
      document.querySelectorAll('[data-tab="packages"]').forEach(btn => btn.addEventListener('click', loadAll, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'packages') loadAll();
    })();

    // ── LINE連携タブ ──────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const statusEl = document.getElementById('line-channel-status');
      const form = document.getElementById('line-channel-form');
      const msgEl = document.getElementById('lc-msg');
      const submitBtn = document.getElementById('lc-submit-btn');

      async function loadStatus() {
        if (!statusEl) return;
        statusEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/line-channel', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { statusEl.innerHTML = authErrorHtml(res); return; }
        const data = await res.json();
        if (data.connected) {
          statusEl.innerHTML = `✅ 連携済み（${data.verified_at ? new Date(data.verified_at).toLocaleDateString('ja-JP') : ''}確認・${data.connected_by === 'staff' ? '運営代行設定' : '自己設定'}）`;
          const tokenInput = document.getElementById('lc-channel-token');
          if (tokenInput) tokenInput.placeholder = '変更する場合のみ入力（LIFF IDだけの追記なら空欄でOK）';
          const webhookBox = document.getElementById('lc-webhook-url-box');
          const webhookUrlEl = document.getElementById('lc-webhook-url');
          if (webhookBox && webhookUrlEl && provider?.id) {
            webhookUrlEl.textContent = `https://www.fineme.me/api/line/webhook/${provider.id}`;
            webhookBox.style.display = 'block';
          }
          const testBox = document.getElementById('lc-test-send-box');
          const testLiffEl = document.getElementById('lc-test-liff-link');
          if (testBox && testLiffEl && provider?.slug) {
            testLiffEl.textContent = `https://www.fineme.me/l/${provider.slug}`;
            testBox.style.display = 'block';
          }
        } else {
          statusEl.textContent = '未連携（Fineme公式LINEからリマインドが送られます）';
          const testBox = document.getElementById('lc-test-send-box');
          if (testBox) testBox.style.display = 'none';
        }
        const idInput = document.getElementById('lc-channel-id');
        const liffInput = document.getElementById('lc-liff-id');
        if (idInput && data.channel_id && !idInput.value) idInput.value = data.channel_id;
        if (liffInput && data.liff_id && !liffInput.value) liffInput.value = data.liff_id;
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          submitBtn.disabled = true; submitBtn.textContent = '確認中…'; msgEl.textContent = '';
          try {
            const res = await fetch('/api/provider/line-channel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
              body: JSON.stringify({
                channel_id: document.getElementById('lc-channel-id').value.trim(),
                channel_secret: document.getElementById('lc-channel-secret').value.trim(),
                channel_access_token: document.getElementById('lc-channel-token').value.trim(),
                liff_id: document.getElementById('lc-liff-id').value.trim(),
              }),
            });
            const data = await res.json();
            if (res.ok) {
              msgEl.style.color = '#059669';
              msgEl.textContent = `✓ 連携できました（${data.botDisplayName || ''}）`;
              document.getElementById('lc-channel-token').value = '';
              loadStatus();
            } else {
              msgEl.style.color = '#ef4444';
              msgEl.textContent = data.error || '保存に失敗しました';
            }
          } catch (err) {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = '通信エラーが発生しました';
          }
          submitBtn.disabled = false; submitBtn.textContent = '保存して確認する';
        });
      }

      const testSendBtn = document.getElementById('lc-test-send-btn');
      const testSendMsg = document.getElementById('lc-test-send-msg');
      if (testSendBtn) {
        testSendBtn.addEventListener('click', async () => {
          testSendBtn.disabled = true; testSendBtn.textContent = '送信中…';
          if (testSendMsg) testSendMsg.textContent = '';
          try {
            const res = await fetch('/api/provider/line-channel/test-send', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              if (testSendMsg) { testSendMsg.style.color = '#059669'; testSendMsg.textContent = '✓ 送信しました。自分のLINEに届いているか確認してください'; }
            } else {
              if (testSendMsg) { testSendMsg.style.color = '#ef4444'; testSendMsg.textContent = data.error || '送信に失敗しました'; }
            }
          } catch {
            if (testSendMsg) { testSendMsg.style.color = '#ef4444'; testSendMsg.textContent = '通信エラーが発生しました'; }
          }
          testSendBtn.disabled = false; testSendBtn.textContent = 'テスト送信する';
        });
      }

      document.querySelectorAll('[data-tab="line-channel"]').forEach(btn => btn.addEventListener('click', loadStatus, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'line-channel') loadStatus();
    })();

    // ── 機能設定タブ（Phase 0・でお要望2026-09-09〜11） ────────────────
    // hacomono/STORES網羅計画で追加していく機能を店舗ごとにON/OFFできる基盤。
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('features-list');

      async function loadFeatures() {
        if (!listEl) return;
        listEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/features', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const { features, defs } = await res.json();
        const groups = {};
        Object.entries(defs).forEach(([key, def]) => {
          (groups[def.group] = groups[def.group] || []).push({ key, ...def });
        });
        listEl.innerHTML = Object.entries(groups).map(([groupName, items]) => `
          <div>
            <p style="font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(201,168,76,.7);text-transform:uppercase;margin:0 0 8px">${esc(groupName)}</p>
            <div class="stack" style="gap:10px">
              ${items.map(item => `
                <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:10px;cursor:pointer">
                  <input type="checkbox" data-feature-key="${item.key}" ${features[item.key] ? 'checked' : ''} style="margin-top:3px" />
                  <span>
                    <span style="display:block;font-weight:700;font-size:13.5px;color:rgba(26,20,16,0.9)">${esc(item.label)}</span>
                    <span style="display:block;font-size:12px;color:rgba(26,20,16,0.5);margin-top:2px">${esc(item.help)}</span>
                  </span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('');
      }

      listEl?.addEventListener('change', async (e) => {
        const input = e.target.closest('[data-feature-key]');
        if (!input) return;
        const key = input.dataset.featureKey;
        // 保存タイミングが分かりづらいというでお指摘（2026-09-11）：チェックのすぐ右に
        // 「保存中…」→「✓ 保存しました」を一瞬出す。トグル＝即保存という設計自体は維持しつつ、
        // 「今保存された」がその場で見えるようにする。
        const row = input.closest('label');
        let statusEl = row?.querySelector('.feature-save-status');
        if (row && !statusEl) {
          statusEl = document.createElement('span');
          statusEl.className = 'feature-save-status muted';
          statusEl.style.cssText = 'font-size:11px;margin-left:8px;white-space:nowrap';
          row.querySelector('input')?.insertAdjacentElement('afterend', statusEl);
        }
        if (statusEl) { statusEl.style.color = ''; statusEl.textContent = '保存中…'; }
        input.disabled = true;
        try {
          const res = await fetch('/api/provider/features', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({ [key]: input.checked }),
          });
          if (!res.ok) {
            input.checked = !input.checked;
            if (statusEl) { statusEl.style.color = '#ef4444'; statusEl.textContent = '保存に失敗しました'; }
          } else {
            if (statusEl) { statusEl.style.color = '#4ade80'; statusEl.textContent = '✓ 保存しました'; setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2500); }
            window.applyFeatureGating?.(key, input.checked);
          }
        } catch {
          input.checked = !input.checked;
          if (statusEl) { statusEl.style.color = '#ef4444'; statusEl.textContent = '通信エラーが発生しました'; }
        }
        input.disabled = false;
      });

      document.querySelectorAll('[data-tab="features"]').forEach(btn => btn.addEventListener('click', loadFeatures, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'features') loadFeatures();
    })();

    // ── 表示設定タブ（でお要望2026-09-13） ──────────────────────────
    // 起動時に開くタブ・メニューの並び順・予約カレンダーの向き/初期表示は店舗に
    // よって使いやすさが違うため、lib/dashboard-prefs.jsの構成をそのままデフォルトに
    // しつつ店舗ごとに変更できるようにする。dashboardPrefs（トップレベルのlet）は
    // このIIFEの保存成功時にも書き換え、カレンダー等の他クロージャへ即時反映する。
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const landingSel = document.getElementById('ds-landing-tab');
      const landingMsg = document.getElementById('ds-landing-tab-msg');
      const orderEl = document.getElementById('ds-sidebar-order');
      const orderMsg = document.getElementById('ds-sidebar-order-msg');
      const axisEl = document.getElementById('ds-calendar-axis');
      const axisMsg = document.getElementById('ds-calendar-axis-msg');
      const viewEl = document.getElementById('ds-calendar-view');
      const viewMsg = document.getElementById('ds-calendar-view-msg');
      const shortcutsEl = document.getElementById('ds-header-shortcuts');
      const shortcutsMsg = document.getElementById('ds-header-shortcuts-msg');

      if (landingSel) landingSel.innerHTML = LANDING_TAB_OPTIONS.map(o => `<option value="${o.key}">${esc(o.label)}</option>`).join('');

      // ヘッダーのショートカット（でお要望2026-09-14）：最大MAX_HEADER_SHORTCUTS個の
      // チェックボックス。それを超えて選ぼうとしたら選択自体を戻し案内を出す。
      function renderShortcutsList(selected) {
        if (!shortcutsEl) return;
        shortcutsEl.innerHTML = HEADER_SHORTCUT_OPTIONS.map(o => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px;cursor:pointer">
            <input type="checkbox" data-shortcut-key="${o.key}" ${selected.includes(o.key) ? 'checked' : ''} />
            <span style="font-size:13.5px">${esc(o.label)}</span>
          </label>
        `).join('');
        shortcutsEl.querySelectorAll('[data-shortcut-key]').forEach(cb => cb.addEventListener('change', () => {
          const checked = [...shortcutsEl.querySelectorAll('[data-shortcut-key]:checked')].map(c => c.dataset.shortcutKey);
          if (checked.length > MAX_HEADER_SHORTCUTS) {
            cb.checked = false;
            if (shortcutsMsg) { shortcutsMsg.style.color = '#ef4444'; shortcutsMsg.textContent = `最大${MAX_HEADER_SHORTCUTS}つまでです`; }
            return;
          }
          save({ header_shortcuts: checked }, shortcutsMsg).then(ok => { if (ok) renderHeaderShortcuts(dashboardPrefs); });
        }));
      }

      function renderOrderList(order) {
        if (!orderEl) return;
        const labelOf = key => CATEGORY_DEFS.find(c => c.key === key)?.label || key;
        orderEl.innerHTML = order.map((key, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px">
            <span style="flex:1;font-size:13px;font-weight:600">${esc(labelOf(key))}</span>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-ds-up="${key}"${i === 0 ? ' disabled' : ''}>↑</button>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-ds-down="${key}"${i === order.length - 1 ? ' disabled' : ''}>↓</button>
          </div>
        `).join('');
        orderEl.querySelectorAll('[data-ds-up]').forEach(btn => btn.addEventListener('click', () => moveOrder(btn.dataset.dsUp, -1)));
        orderEl.querySelectorAll('[data-ds-down]').forEach(btn => btn.addEventListener('click', () => moveOrder(btn.dataset.dsDown, 1)));
      }

      function renderRadioGroup(el, options, name, current) {
        if (!el) return;
        el.innerHTML = options.map(o => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid ${current === o.key ? '#111' : '#e5e7eb'};border-radius:10px;cursor:pointer">
            <input type="radio" name="${name}" value="${o.key}" ${current === o.key ? 'checked' : ''} />
            <span style="font-size:13px">${esc(o.label)}</span>
          </label>
        `).join('');
      }

      async function save(patch, msgEl) {
        if (msgEl) { msgEl.style.color = ''; msgEl.textContent = '保存中…'; }
        const res = await fetch('/api/provider/dashboard-prefs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const { prefs } = await res.json();
          dashboardPrefs = prefs; // カレンダー等、他のクロージャにも即時反映
          if (msgEl) { msgEl.style.color = '#4ade80'; msgEl.textContent = '✓ 保存しました'; setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 2500); }
        } else if (msgEl) {
          msgEl.style.color = '#ef4444'; msgEl.textContent = '保存に失敗しました';
        }
        return res.ok;
      }

      function moveOrder(key, dir) {
        if (!dashboardPrefs) return;
        const order = [...dashboardPrefs.sidebar_order];
        const idx = order.indexOf(key);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        renderOrderList(order);
        save({ sidebar_order: order }, orderMsg).then(ok => {
          if (ok) {
            // サイドバーの実際の並び順にもその場で反映する
            order.forEach((k, i) => {
              const btn = document.querySelector(`.pd-rail-btn[data-category="${k}"]`);
              if (btn) btn.style.order = String(i);
            });
          }
        });
      }

      landingSel?.addEventListener('change', () => save({ landing_tab: landingSel.value }, landingMsg));
      axisEl?.addEventListener('change', (e) => {
        const input = e.target.closest('input[name="ds-axis"]');
        if (!input) return;
        renderRadioGroup(axisEl, CALENDAR_AXIS_OPTIONS, 'ds-axis', input.value);
        save({ calendar_axis: input.value }, axisMsg).then(() => window.__calReloadWeek?.());
      });
      viewEl?.addEventListener('change', (e) => {
        const input = e.target.closest('input[name="ds-view"]');
        if (!input) return;
        renderRadioGroup(viewEl, CALENDAR_DEFAULT_VIEW_OPTIONS, 'ds-view', input.value);
        save({ calendar_default_view: input.value }, viewMsg);
      });

      async function loadDisplaySettings() {
        const res = await fetch('/api/provider/dashboard-prefs', { headers: { Authorization: `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const { prefs } = await res.json();
        dashboardPrefs = prefs;
        if (landingSel) landingSel.value = prefs.landing_tab;
        renderOrderList(prefs.sidebar_order);
        renderRadioGroup(axisEl, CALENDAR_AXIS_OPTIONS, 'ds-axis', prefs.calendar_axis);
        renderRadioGroup(viewEl, CALENDAR_DEFAULT_VIEW_OPTIONS, 'ds-view', prefs.calendar_default_view);
        renderShortcutsList(prefs.header_shortcuts || []);
      }

      document.querySelectorAll('[data-tab="display-settings"]').forEach(btn => btn.addEventListener('click', loadDisplaySettings, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'display-settings') loadDisplaySettings();
    })();

    // ── 機能フラグによるサイドバーの出し分け（Phase 0基盤） ────────────
    // [data-feature="key"] を持つナビボタンは、その機能がOFFの店舗ではdisplay:noneで
    // 完全に隠していたが、「そもそも機能の存在に気づけない」というでお指摘（2026-09-11）を
    // 受け、常にサイドバーには出しつつ薄く表示＋「未設定」バッジで区別する方式に変更。
    // タブを開くとOFFのままでも中身は見えず、代わりにその場でONにできる案内バナーを出す。
    (() => {
      const token = getSupabaseToken();
      const gatedEls = document.querySelectorAll('[data-feature]');
      if (!token || !gatedEls.length) return;
      let defsCache = {};

      function bannerHtml(key, tabId) {
        const def = defsCache[key];
        const label = def?.label || key;
        const help = def?.help || '';
        return `
          <div class="feature-enable-banner" data-feature-banner="${key}">
            <div>
              <strong style="font-size:13.5px;color:#1a1410">「${esc(label)}」はまだONになっていません</strong>
              <p class="muted" style="font-size:12px;margin:4px 0 0">${esc(help)}</p>
            </div>
            <button type="button" class="btn" style="font-size:12px;padding:8px 16px;flex-shrink:0" data-feature-enable="${key}" data-feature-tab="${tabId}">ONにする</button>
          </div>
        `;
      }

      function applyGating(features) {
        gatedEls.forEach(el => {
          const key = el.dataset.feature;
          const on = !!features?.[key];
          el.classList.toggle('tab-feature-off', !on);
          const badge = el.querySelector('[data-feature-badge]');
          if (badge) badge.textContent = on ? '' : '未設定';

          const tabId = el.dataset.tab;
          const pane = document.getElementById('tab-' + tabId);
          if (!pane) return;
          const existing = pane.querySelector(`[data-feature-banner="${key}"]`);
          if (on) {
            existing?.remove();
          } else if (!existing) {
            pane.insertAdjacentHTML('afterbegin', bannerHtml(key, tabId));
            pane.querySelector(`[data-feature-enable="${key}"]`)?.addEventListener('click', async (e) => {
              const btn = e.currentTarget;
              btn.disabled = true;
              btn.textContent = '設定中…';
              try {
                const res = await fetch('/api/provider/features', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken() || token}` },
                  body: JSON.stringify({ [key]: true }),
                });
                if (!res.ok) { btn.disabled = false; btn.textContent = 'ONにする'; showToast('保存に失敗しました'); return; }
                // ONにしたら、この機能の中身をすぐ使えるようリロードして表示する
                // （各タブの読み込みはそれぞれ独立したIIFEのため、確実なのは再読み込み）
                showToast(`✓ 「${defsCache[key]?.label || key}」をONにしました`);
                location.href = location.pathname + '?tab=' + btn.dataset.featureTab;
              } catch {
                btn.disabled = false; btn.textContent = 'ONにする';
                showToast('通信エラーが発生しました');
              }
            });
          }
        });
      }

      // 機能設定タブのチェックボックスをON/OFFした直後にも、リロードなしでサイドバー・
      // バナー表示へ即座に反映させるための橋渡し（features-list側のchangeハンドラから呼ばれる）。
      window.applyFeatureGating = (key, value) => {
        window.__providerFeatures = { ...(window.__providerFeatures || {}), [key]: value };
        applyGating(window.__providerFeatures);
      };

      (async () => {
        try {
          const res = await fetch('/api/provider/features', { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return;
          const { features, defs } = await res.json();
          defsCache = defs || {};
          window.__providerFeatures = features || {};
          applyGating(features);
        } catch {}
      })();
    })();

    // ── クチコミ依頼タブ ──────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const urlInput = document.getElementById('rv-url');
      const form = document.getElementById('review-form');
      const msgEl = document.getElementById('rv-msg');
      if (!form) return;

      if (urlInput && provider?.google_review_url) urlInput.value = provider.google_review_url;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('rv-submit-btn');
        submitBtn.disabled = true; msgEl.textContent = '';
        try {
          const res = await fetch('/api/provider/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({ google_review_url: urlInput.value.trim() }),
          });
          if (res.ok) {
            msgEl.style.color = '#059669';
            msgEl.textContent = '✓ 保存しました';
          } else {
            const data = await res.json();
            msgEl.style.color = '#ef4444';
            msgEl.textContent = data.error || '保存に失敗しました';
          }
        } catch {
          msgEl.style.color = '#ef4444';
          msgEl.textContent = '通信エラーが発生しました';
        }
        submitBtn.disabled = false;
      });
    })();

    // ── LP設定タブ（メニュー・施術事例） ─────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;

      function escLp(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const AXIS_LABEL_LP = Object.fromEntries(PROVIDER_AXES.map(a => [a.key, a.label]));

      // ── メニュー ──
      const menuForm = document.getElementById('menu-form');
      const menuList = document.getElementById('menu-list');
      const menuMsg = document.getElementById('menu-msg');
      const menuFromService = document.getElementById('menu-from-service');

      async function loadServiceOptions() {
        if (!menuFromService) return;
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        const items = res.ok ? await res.json() : [];
        menuFromService.innerHTML = '<option value="">－ 選択するとメニュー名・価格を自動入力 －</option>'
          + items.map(s => `<option value="${s.id}">${escLp(s.name)}（¥${Number(s.price).toLocaleString()}）</option>`).join('');
        menuFromService.onchange = () => {
          const s = items.find(x => String(x.id) === menuFromService.value);
          if (!s) return;
          document.getElementById('menu-name').value = s.name || '';
          document.getElementById('menu-price').value = s.price || '';
          const durationMatch = String(s.duration || '').match(/\d+/);
          document.getElementById('menu-duration').value = durationMatch ? durationMatch[0] : '';
          const imgInput = document.getElementById('menu-image-url');
          const imgPreview = document.getElementById('menu-image-preview');
          if (imgInput) imgInput.value = s.image_url || '';
          if (imgPreview) {
            if (s.image_url) { imgPreview.src = s.image_url; imgPreview.style.display = 'inline-block'; }
            else { imgPreview.style.display = 'none'; }
          }
        };
      }

      async function loadMenus() {
        if (!menuList) return;
        menuList.innerHTML = '<p class="muted" style="font-size:13px;">読み込み中…</p>';
        const res = await fetch('/api/provider/experience-menus', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        const items = res.ok ? await res.json() : [];
        if (!items.length) { menuList.innerHTML = '<p class="muted" style="font-size:13px;">まだメニューがありません。</p>'; return; }
        menuList.innerHTML = items.map(m => `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;background:#fff;display:flex;gap:12px;">
            ${m.images?.[0] ? `<img src="${m.images[0]}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;" />` : ''}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <strong style="color:#111827;">${escLp(m.name)}</strong>
                <span style="font-size:13px;color:#6b7280;">¥${Number(m.price).toLocaleString()}／${m.duration_min}分</span>
              </div>
              <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${(m.axes || []).map(a => AXIS_LABEL_LP[a] || a).join('・') || '軸未設定'}</div>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:4px 10px;margin-top:6px;" data-menu-del="${m.id}">削除</button>
            </div>
          </div>
        `).join('');
        menuList.querySelectorAll('[data-menu-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このメニューを削除しますか？')) return;
          await fetch(`/api/provider/experience-menus/${btn.dataset.menuDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
          loadMenus();
        }));
      }

      if (menuForm) {
        menuForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById('menu-submit-btn');
          submitBtn.disabled = true; menuMsg.textContent = '';
          const axes = Array.from(document.querySelectorAll('#menu-axes input:checked')).map(i => i.value);
          const imageUrl = document.getElementById('menu-image-url')?.value || '';
          const res = await fetch('/api/provider/experience-menus', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({
              name: document.getElementById('menu-name').value,
              price: document.getElementById('menu-price').value,
              duration_min: document.getElementById('menu-duration').value,
              axes,
              description: document.getElementById('menu-desc').value,
              images: imageUrl ? [imageUrl] : [],
            }),
          });
          if (res.ok) {
            menuMsg.style.color = '#059669'; menuMsg.textContent = '✓ 追加しました';
            menuForm.reset();
            const imgPreview = document.getElementById('menu-image-preview');
            if (imgPreview) imgPreview.style.display = 'none';
            loadMenus();
          } else {
            const d = await res.json(); menuMsg.style.color = '#ef4444'; menuMsg.textContent = d.error || '追加に失敗しました';
          }
          submitBtn.disabled = false;
        });
      }

      // ── 施術事例 ──
      const caseForm = document.getElementById('case-form');
      const caseUserSel = document.getElementById('case-user');
      const caseList = document.getElementById('case-list');
      const caseMsg = document.getElementById('case-msg');

      async function loadCaseCustomers() {
        if (!caseUserSel) return;
        const res = await fetch('/api/provider/customers', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        const items = res.ok ? await res.json() : [];
        const seen = new Set();
        const opts = ['<option value="">お客様を選択</option>'];
        items.forEach(c => {
          if (seen.has(c.user_id)) return;
          seen.add(c.user_id);
          opts.push(`<option value="${c.user_id}">${escLp(c.customer_name)}</option>`);
        });
        caseUserSel.innerHTML = opts.join('');
      }

      async function loadCases() {
        if (!caseList) return;
        caseList.innerHTML = '<p class="muted" style="font-size:13px;">読み込み中…</p>';
        const res = await fetch('/api/provider/cases', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        const items = res.ok ? await res.json() : [];
        if (!items.length) { caseList.innerHTML = '<p class="muted" style="font-size:13px;">まだ事例がありません。</p>'; return; }
        caseList.innerHTML = items.map(c => `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;background:#fff;">
            <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
              <span style="font-size:13px;color:#111827;">${AXIS_LABEL_LP[c.axis] || c.axis}：${c.before_score} → ${c.after_score}</span>
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;${c.approved_by_user ? 'background:#f0fdf4;color:#16a34a;' : 'background:#fffbeb;color:#d97706;'}">${c.approved_by_user ? '公開中' : '承認待ち'}</span>
            </div>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:4px 10px;margin-top:6px;" data-case-del="${c.id}">削除</button>
          </div>
        `).join('');
        caseList.querySelectorAll('[data-case-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この事例を削除しますか？')) return;
          await fetch(`/api/provider/cases/${btn.dataset.caseDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
          loadCases();
        }));
      }

      if (caseForm) {
        caseForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = document.getElementById('case-submit-btn');
          if (!caseUserSel.value) { caseMsg.style.color = '#ef4444'; caseMsg.textContent = 'お客様を選択してください'; return; }
          submitBtn.disabled = true; caseMsg.textContent = '';
          const res = await fetch('/api/provider/cases', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: JSON.stringify({
              user_id: caseUserSel.value,
              axis: document.getElementById('case-axis').value,
              before_score: document.getElementById('case-before').value,
              after_score: document.getElementById('case-after').value,
              image_url: document.getElementById('case-image').value || null,
            }),
          });
          if (res.ok) {
            caseMsg.style.color = '#059669'; caseMsg.textContent = '✓ 登録しました。お客様の承認をお待ちください';
            caseForm.reset();
            loadCases();
          } else {
            const d = await res.json(); caseMsg.style.color = '#ef4444'; caseMsg.textContent = d.error || '登録に失敗しました';
          }
          submitBtn.disabled = false;
        });
      }

      function loadLandingTab() { loadMenus(); loadServiceOptions(); loadCaseCustomers(); loadCases(); }
      document.querySelectorAll('[data-tab="landing"]').forEach(btn => btn.addEventListener('click', loadLandingTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'landing') loadLandingTab();
    })();

    // ── エリア需要タブ ────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const contentEl = document.getElementById('area-demand-content');
      if (!contentEl) return;
      const AXIS_LABEL_AD = { eyebrow: '眉', skin: '肌', hair: 'ヘア', expression: '表情', posture: '姿勢', body: '体型', fashion: 'ファッション' };

      async function loadAreaDemand() {
        contentEl.innerHTML = '<p class="muted" style="font-size:13px;">読み込み中…</p>';
        const res = await fetch('/api/provider/area-demand', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { contentEl.innerHTML = authErrorHtml(res); return; }
        const data = await res.json();
        if (data.note) { contentEl.innerHTML = `<p class="muted" style="font-size:13px;">${data.note}</p>`; return; }
        const area = data.areas?.[0];
        if (!area || !area.axisGaps?.length) {
          contentEl.innerHTML = '<p class="muted" style="font-size:13px;">まだ十分なデータがありません。</p>';
          return;
        }
        contentEl.innerHTML = area.axisGaps.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(26,20,16,0.1);">
            <span style="font-size:13px;">${AXIS_LABEL_AD[g.axis] || g.axis}</span>
            <span style="font-size:12px;color:rgba(26,20,16,0.6);">需要 ${g.demand}人 ／ 対応店舗 ${g.supply}軒</span>
          </div>
        `).join('');
      }

      document.querySelectorAll('[data-tab="area-demand"]').forEach(btn => btn.addEventListener('click', loadAreaDemand, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'area-demand') loadAreaDemand();
    })();

    // ── LTV/CACタブ ───────────────────────────────────────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const adCostInput = document.getElementById('lc-ad-cost');
      const marginInput = document.getElementById('lc-margin');
      const settingsSaveBtn = document.getElementById('lc-settings-save-btn');
      const settingsMsg = document.getElementById('lc-settings-msg');
      const contentEl = document.getElementById('ltv-cac-content');
      if (!contentEl) return;

      async function loadSettings() {
        const res = await fetch('/api/provider/ltv-cac-settings', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) return;
        const data = await res.json();
        adCostInput.value = data.monthly_ad_cost;
        marginInput.value = data.gross_margin_pct;
      }

      async function loadContent() {
        contentEl.innerHTML = '<p class="muted" style="font-size:13px;">読み込み中…</p>';
        const res = await fetch('/api/provider/ltv-cac', { headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` } });
        if (!res.ok) { contentEl.innerHTML = authErrorHtml(res); return; }
        const d = await res.json();
        if (!d.hasData) { contentEl.innerHTML = '<p class="muted" style="font-size:13px;">まだ来店済みの予約データがありません。</p>'; return; }
        contentEl.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
            <div class="stat-card"><div class="stat-value">¥${d.ltv.toLocaleString()}</div><div class="stat-label">LTV（概算）</div></div>
            <div class="stat-card"><div class="stat-value">${d.cac != null ? '¥' + d.cac.toLocaleString() : '—'}</div><div class="stat-label">CAC（概算・直近12ヶ月）</div></div>
            <div class="stat-card"><div class="stat-value">${d.paybackVisits ?? '—'}</div><div class="stat-label">回収に必要な来店回数</div></div>
          </div>
          <p class="muted" style="font-size:12px;margin-top:12px;">
            顧客数${d.customerCount}人／来店${d.totalVisits}回／平均客単価¥${d.avgSpend.toLocaleString()}／平均リピート回数${d.avgRepeatVisits}回／直近12ヶ月の新規${d.newCustomersLast12Months}人
          </p>
        `;
      }

      if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', async () => {
        settingsSaveBtn.disabled = true; settingsMsg.textContent = '';
        const res = await fetch('/api/provider/ltv-cac-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({ monthly_ad_cost: adCostInput.value, gross_margin_pct: marginInput.value }),
        });
        if (res.ok) { settingsMsg.style.color = '#059669'; settingsMsg.textContent = '✓ 保存しました'; loadContent(); }
        else { settingsMsg.style.color = '#ef4444'; settingsMsg.textContent = '保存に失敗しました'; }
        settingsSaveBtn.disabled = false;
      });

      function loadLtvCacTab() { loadSettings(); loadContent(); }
      document.querySelectorAll('[data-tab="ltv-cac"]').forEach(btn => btn.addEventListener('click', loadLtvCacTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'ltv-cac') loadLtvCacTab();
    })();

    // ── 紹介QRタブ ────────────────────────────────────────────────
    (() => {
      const contentEl = document.getElementById('qr-tab-content');
      if (!contentEl) return;
      let rendered = false;

      async function loadQrTab() {
        if (rendered) return;
        const slug = provider?.slug;
        if (!slug) { contentEl.innerHTML = '<p class="muted" style="font-size:13px;">店舗情報の読み込みを待っています…もう一度タブを開いてください。</p>'; return; }
        rendered = true;
        const link = `https://www.fineme.me/log?src=partner_${slug}`;
        contentEl.innerHTML = '<p class="muted" style="font-size:13px;">QRコードを生成中…</p>';
        try {
          const QRCode = (await import('qrcode')).default || (await import('qrcode'));
          const dataUrl = await QRCode.toDataURL(link, { width: 280, margin: 1, color: { dark: '#0a0f1e', light: '#ffffff' } });
          contentEl.innerHTML = `
            <img src="${dataUrl}" alt="New Me Log 紹介QRコード" style="width:220px;height:220px;border-radius:12px;background:#fff;padding:12px;" />
            <p class="muted" style="font-size:12px;margin-top:10px;word-break:break-all;">${link}</p>
            <button type="button" class="btn" id="qr-print-btn" style="margin-top:8px;">印刷する</button>
          `;
          document.getElementById('qr-print-btn')?.addEventListener('click', () => window.open('/provider/log-toolkit', '_blank'));
        } catch {
          contentEl.innerHTML = '<p class="muted" style="font-size:13px;color:#ef4444;">QRコードの生成に失敗しました。</p>';
        }
      }

      document.querySelectorAll('[data-tab="qr"]').forEach(btn => btn.addEventListener('click', loadQrTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'qr') loadQrTab();
    })();

    // ── 画像圧縮ヘルパー（Canvas, max 1200px, JPEG/WebP 0.85） ────
    function compressImage(file, maxPx = 1200, quality = 0.85) {
      return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
            else { width = Math.round(width * maxPx / height); height = maxPx; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
      });
    }

    // ── 施設写真アップロード ──────────────────────────────────────
    (function setupFacilityPhotoUpload() {
      [1, 2, 3].forEach(slot => {
        const btn = document.getElementById(`facility-img-btn-${slot}`);
        const input = document.getElementById(`facility-img-input-${slot}`);
        const preview = document.getElementById(`facility-photo-preview-${slot}`);
        const previewWrap = document.getElementById(`facility-photo-preview-wrap-${slot}`);
        const msg = document.getElementById(`facility-img-msg-${slot}`);
        const hiddenUrl = document.querySelector(`[name=facility_photo_${slot}]`);

        const existingUrl = (provider?.facility_photos || [])[slot - 1];
        if (existingUrl && preview && previewWrap) {
          preview.src = existingUrl; previewWrap.style.display = 'block';
          if (hiddenUrl) hiddenUrl.value = existingUrl;
        }

        if (btn) btn.addEventListener('click', () => input?.click());
        if (!input) return;

        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) return;
          const token = getSupabaseToken();
          if (!token) { showToast('ログインが必要です'); return; }

          msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
          const compressedFacility = await compressImage(file);
          msg.textContent = 'アップロード中…';

          const fd = new FormData();
          fd.append('photo', compressedFacility, 'photo.jpg');
          fd.append('slot', String(slot));
          try {
            const res = await fetch('/api/provider/upload-facility-photo', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
              body: fd,
            });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              preview.src = data.url; previewWrap.style.display = 'block';
              if (hiddenUrl) hiddenUrl.value = data.url;
              msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
              // 現在のfacility_photosを再構築してDB保存
              const allPhotos = [1, 2, 3].map(s => {
                const h = document.querySelector(`[name=facility_photo_${s}]`);
                return h ? h.value : '';
              }).filter(Boolean);
              const saved = await saveToLocal({ facility_photos: allPhotos });
              msg.textContent = saved ? '✓ 写真を保存しました' : '⚠ アップロードはできましたが保存に失敗しました。「保存する」を押してください。';
              msg.style.color = saved ? '#059669' : '#ef4444';
            } else {
              msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
            }
          } catch (e) { msg.textContent = '通信エラーが発生しました: ' + e.message; msg.style.color = '#ef4444'; }
          btn.disabled = false; input.value = '';
        });
      });
    })();

    // ── 写真アップロード ─────────────────────────────────────────
    (function setupPhotoUpload() {
      const btn = document.getElementById('photo-upload-btn');
      const input = document.getElementById('photo-file-input');
      const preview = document.getElementById('photo-preview');
      const previewWrap = document.getElementById('photo-preview-wrap');
      const msg = document.getElementById('photo-upload-msg');
      const hiddenUrl = document.querySelector('[name=photo_url]');

      if (provider?.photo_url) { preview.src = provider.photo_url; previewWrap.style.display = 'block'; }
      if (hiddenUrl && provider?.photo_url) hiddenUrl.value = provider.photo_url;

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = 'アップロード中…'; msg.style.display = 'block'; btn.disabled = true;

        const fd = new FormData();
        fd.append('photo', file);
        try {
          const res = await fetch('/api/provider/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: fd
          });
          const data = await res.json();
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            try { const raw = localStorage.getItem(PROVIDER_KEY); if (raw) { const d = JSON.parse(raw); d.photo_url = data.url; localStorage.setItem(PROVIDER_KEY, JSON.stringify(d)); } } catch {}
            msg.textContent = '✓ 写真を更新しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── カバー画像アップロード ────────────────────────────────────
    (function setupCoverImageUpload() {
      const btn = document.getElementById('cover-photo-upload-btn');
      const input = document.getElementById('cover-photo-file-input');
      const preview = document.getElementById('cover-photo-preview');
      const previewWrap = document.getElementById('cover-photo-preview-wrap');
      const msg = document.getElementById('cover-photo-upload-msg');
      const hiddenUrl = document.querySelector('[name=cover_image_url]');
      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;
      input.addEventListener('change', async () => {
        const file = input.files?.[0]; if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }
        msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
        const compressedCover = await compressImage(file, 1920);
        msg.textContent = 'アップロード中…';
        const fd = new FormData(); fd.append('photo', compressedCover, 'photo.jpg');
        try {
          const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` }, body: fd });
          let data; try { data = await res.json(); } catch { data = {}; }
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
            const saved = await saveToLocal({ cover_image_url: data.url });
            if (saved) {
              msg.textContent = '✓ カバー画像を保存しました（ページに反映されました）'; msg.style.color = '#059669';
            } else {
              msg.textContent = '⚠ 画像はアップロードできましたが、DBへの保存に失敗しました。ページを再読み込みして再試行してください。'; msg.style.color = '#ef4444';
            }
          } else { msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444'; }
        } catch { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false; input.value = '';
      });
    })();

    // ── サービス画像アップロード ─────────────────────────────────
    (function setupServiceImageUpload() {
      const btn = document.getElementById('service-img-btn');
      const input = document.getElementById('service-img-input');
      const preview = document.getElementById('service-img-preview');
      const previewWrap = document.getElementById('service-img-preview-wrap');
      const msg = document.getElementById('service-img-msg');
      const hiddenUrl = document.getElementById('service-image-url');

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
        const compressedSvc = await compressImage(file);
        msg.textContent = 'アップロード中…';

        const fd = new FormData();
        fd.append('photo', compressedSvc, 'photo.jpg');
        try {
          const res = await fetch('/api/provider/upload-service-image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` },
            body: fd
          });
          let data; try { data = await res.json(); } catch { data = {}; }
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '✓ 画像を設定しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || res.status); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラー: ' + e.message; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── サービス Before/After 画像アップロード ────────────────────
    (function setupServiceBeforeAfterImages() {
      function setupImgSlot(btnId, inputId, previewId, wrapId, msgId, hiddenId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn) btn.addEventListener('click', () => input?.click());
        if (!input) return;
        input.addEventListener('change', async () => {
          const file = input.files?.[0]; if (!file) return;
          const token = getSupabaseToken();
          if (!token) { showToast('ログインが必要です'); return; }
          // 毎回 getElementById で取得（初期化タイミングの問題を回避）
          const preview = document.getElementById(previewId);
          const previewWrap = document.getElementById(wrapId);
          const msg = document.getElementById(msgId);
          const hidden = document.getElementById(hiddenId);
          if (msg) { msg.textContent = '圧縮中…'; msg.style.display = 'block'; }
          if (btn) btn.disabled = true;
          const compressed = await compressImage(file);
          if (msg) msg.textContent = 'アップロード中…';
          const fd = new FormData(); fd.append('photo', compressed, 'photo.jpg');
          try {
            const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || token}` }, body: fd });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              if (preview) preview.src = data.url;
              if (previewWrap) previewWrap.style.display = 'block';
              if (hidden) hidden.value = data.url;
              if (msg) { msg.textContent = '✓ 画像を設定しました'; msg.style.color = '#059669'; }
            } else {
              if (msg) { msg.textContent = 'エラー: ' + (data.error || res.status); msg.style.color = '#ef4444'; }
            }
          } catch (e) {
            if (msg) { msg.textContent = '通信エラー: ' + e.message; msg.style.color = '#ef4444'; }
          }
          if (btn) btn.disabled = false; input.value = '';
        });
      }
      setupImgSlot('service-before-img-btn','service-before-img-input','service-before-img-preview','service-before-img-wrap','service-before-img-msg','service-before-image-url');
      setupImgSlot('service-after-img-btn','service-after-img-input','service-after-img-preview','service-after-img-wrap','service-after-img-msg','service-after-image-url');
    })();

    // ── 予約リクエスト管理 ────────────────────────────────────────
    const STATUS_LABELS = { pending: '返答待ち', approved: '承認済み', rejected: 'お断り', counter_proposed: '代替提案済み', visited: '来店確認済み' };
    const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', counter_proposed: '#6366f1', visited: '#059669' };
    const TIME_OPTIONS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    function parseDateChoices(r) {
      const choices = [{ date: r.reserved_date || '', time: r.start_time || '', label: '第1希望' }];
      const note = r.note || '';
      const m2 = note.match(/【第2希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      const m3 = note.match(/【第3希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      if (m2) choices.push({ date: m2[1], time: m2[2], label: '第2希望' });
      if (m3) choices.push({ date: m3[1], time: m3[2], label: '第3希望' });
      return choices;
    }
    function noteWithoutChoices(note) {
      return (note || '')
        .replace(/【第[23]希望】\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/g, '')
        .replace(/【メニュー】[^\n]*/g, '')
        .replace(/【New Me Navi より】[\s\S]*?(?=\n\n|$)/, '')
        .trim();
    }

    function parseMeMapNote(note) {
      const match = (note || '').match(/【New Me Navi より】\n([\s\S]*?)(?:\n\n|$)/);
      return match ? match[1].trim() : null;
    }

    let _allRequests = [];
    let _activePackagesByUser = {}; // user_id -> [{id, package_name, remaining_sessions}]
    let _requestsById = {}; // reservation_id -> reservation（来店確認モーダル用）
    let _salesServicesCache = null; // 来店確認モーダルのメニュー選択肢（services遅延キャッシュ）
    let _salesStaffCache = null;

    async function loadActivePackagesByUser() {
      const _pkgToken = getSupabaseToken();
      if (!_pkgToken) return;
      try {
        const res = await fetch('/api/provider/customer-packages', { headers: { 'Authorization': `Bearer ${_pkgToken}` } });
        if (!res.ok) return;
        const rows = await res.json();
        const map = {};
        rows.forEach(r => {
          if (r.expired || r.remaining_sessions <= 0) return;
          (map[r.user_id] = map[r.user_id] || []).push(r);
        });
        _activePackagesByUser = map;
      } catch {}
    }

    async function loadRequests() {
      const k = document.getElementById('req-filter-kw'); if (k) k.value = '';
      const sf = document.getElementById('req-filter-status'); if (sf) sf.value = '';
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) { document.getElementById('requests-list').innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }
      const _reqToken = getSupabaseToken();
      const [res] = await Promise.all([
        fetch(`/api/reservations?providerId=${providerId}`, { headers: _reqToken ? { 'Authorization': `Bearer ${_reqToken}` } : {} }),
        loadActivePackagesByUser(),
      ]);
      if (!res.ok) { document.getElementById('requests-list').innerHTML = authErrorHtml(res); return; }
      const items = await res.json();
      _allRequests = items;
      const pending = items.filter(r => r.status === 'pending').length;
      const b = document.getElementById('requests-badge');
      if (b) { b.textContent = pending || ''; b.style.display = pending > 0 ? 'inline' : 'none'; }
      applyRequestFilters();
    }

    function applyRequestFilters() {
      const statusFilter = document.getElementById('req-filter-status')?.value || '';
      const kwFilter = (document.getElementById('req-filter-kw')?.value || '').toLowerCase().trim();
      let items = _allRequests;
      if (statusFilter) items = items.filter(r => r.status === statusFilter);
      if (kwFilter) items = items.filter(r => (r.user_name || '').toLowerCase().includes(kwFilter) || (r.note || '').toLowerCase().includes(kwFilter));
      const countEl = document.getElementById('req-filter-count');
      if (countEl) countEl.textContent = `${items.length}件`;
      renderRequests(items);
    }

    // 絞り込みコントロールのイベント登録
    document.getElementById('req-filter-status')?.addEventListener('change', applyRequestFilters);
    document.getElementById('req-filter-kw')?.addEventListener('input', applyRequestFilters);
    document.getElementById('req-filter-reset')?.addEventListener('click', () => {
      const s = document.getElementById('req-filter-status'); if (s) s.value = '';
      const k = document.getElementById('req-filter-kw'); if (k) k.value = '';
      applyRequestFilters();
    });

    // 予約リクエスト1件の詳細HTML（旧：一覧に直接表示していたカードの中身。
    // 現在はポップアップ内に表示する。ロジック・アクションボタンは変更なし）。
    function buildRequestCardHtml(r) {
      const choices = parseDateChoices(r);
      const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
      const menuText = menuMatch ? menuMatch[1] : '';
      const userMsg = noteWithoutChoices(r.note);
      const statusColor = STATUS_COLORS[r.status] || '#6b7280';
      const statusLabel = STATUS_LABELS[r.status] || r.status;

      const choicesHtml = r.status === 'pending' ? choices.map((c, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:4px">
          <input type="radio" name="choice-${r.id}" value="${i}" ${i === 0 ? 'checked' : ''} style="accentColor:#10b981">
          <span style="font-size:13px;font-weight:700;color:#374151">${c.label}:</span>
          <span style="font-size:13px;color:#374151">${c.date} ${c.time}</span>
        </label>
      `).join('') : `<p style="font-size:13px;color:#6b7280">第1希望: ${choices[0].date} ${choices[0].time}${r.confirmed_date ? ` → 確定: ${r.confirmed_date} ${r.confirmed_time || ''}` : ''}</p>`;

      const meMapNote = parseMeMapNote(r.note);
      // inline onclick用にJS文字列リテラルとしても安全になるようエスケープ（名前に
      // シングルクォートが含まれるケースへの対策）。
      const nameForJs = String(r.user_name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div style="color:#111;text-shadow:none">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
            <strong style="font-size:16px">${esc(r.user_name)}</strong>
            <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
            ${r.user_id ? `<button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.openCustomerModal ? window.openCustomerModal('${r.user_id}','member','${nameForJs}') : showToast('読み込み中です。少し待ってから再度お試しください')">👤 顧客情報を見る</button>` : ''}
          </div>
          ${meMapNote ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:10px">
            <p style="font-size:11px;font-weight:700;color:#2563eb;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">🗺 New Me Navi より</p>
            ${meMapNote.split('\n').map(line => `<p style="font-size:13px;color:#1e40af;margin:0 0 2px;font-weight:${line.startsWith('最優先') ? '700' : '400'}">${esc(line)}</p>`).join('')}
          </div>` : ''}
          ${(r.status === 'approved' || r.status === 'visited') ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:10px">
            <p style="font-size:11px;font-weight:700;color:#15803d;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">ユーザー情報</p>
            <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 2px">👤 ${esc(r.user_name)}</p>
            <p style="font-size:13px;color:#374151;margin:0">📧 ${esc(r.user_contact)}</p>
          </div>` : `<p style="font-size:12px;color:#9ca3af;margin:0 0 10px">連絡先: ${esc(r.user_contact)}</p>`}
          ${menuText ? `<p style="font-size:13px;color:#374151;margin:0 0 8px;font-weight:700">🎯 ${esc(menuText)}</p>` : ''}
          <div style="margin-bottom:8px">${choicesHtml}</div>
          ${userMsg ? `<div style="font-size:13px;color:#374151;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px">${esc(userMsg)}</div>` : ''}
          ${r.provider_comment ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px">掲載者コメント: ${esc(r.provider_comment)}</div>` : ''}
          ${r.counter_date ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px;margin-top:6px">代替提案日時: ${r.counter_date} ${r.counter_time || ''}</div>` : ''}
          ${r.status === 'pending' ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6">
            <button class="btn" style="font-size:12px;padding:8px 14px;background:#10b981;white-space:nowrap" onclick="approveRequest('${r.id}')">✓ 承認する</button>
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;white-space:nowrap" onclick="showCounterModal('${r.id}')">代替提案を送る</button>
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;color:#ef4444;white-space:nowrap" onclick="rejectRequest('${r.id}')">お断り</button>
          </div>` : r.status === 'approved' ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6">
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;white-space:nowrap" onclick="showVisitModal('${r.id}')">来店確認</button>
            ${(_activePackagesByUser[r.user_id] || []).map(p => `
            <button class="btn btn-ghost" style="font-size:11px;padding:8px 14px;white-space:nowrap;color:#7c3aed;border-color:#c4b5fd" onclick="consumePackage('${p.id}','${r.id}',this)">🎫 ${esc(p.package_name)}を消化（残${p.remaining_sessions}）</button>`).join('')}
          </div>` : ''}
        </div>
      `;
    }

    function showRequestModal(r) {
      const modal = document.getElementById('request-detail-modal');
      const body = document.getElementById('request-detail-modal-body');
      if (!r || !modal || !body) { showToast('このリクエストが見つかりません'); return; }
      try {
        body.innerHTML = buildRequestCardHtml(r);
      } catch (e) {
        console.error('[showRequestModal]', e);
        showToast('表示エラー: ' + e.message);
        return;
      }
      modal.style.display = 'flex';
    }
    window.openRequestModal = function (id) {
      showRequestModal(_requestsById[id]);
    };
    // カレンダーから未確定のリクエスト（pending/counter_proposed）を開く時用。
    // カレンダーAPIのレスポンスは一覧表示用に絞ってあり、承認/代替提案フォームが
    // 必要とする生カラム（reserved_date・counter_date等）を持たないため、カレンダー側
    // でGET /api/reservations/[id]から生データを取得し、こちらへ渡してもらう
    // （でお要望2026-09-12：カレンダー上の未確定リクエストをクリックした時、確定済み
    // 予約と同じ会員情報モーダルではなく、承認・代替提案ができるこのモーダルを開きたい）。
    window.openRequestModalWithData = function (r) {
      if (!r) return;
      _requestsById[r.id] = r;
      showRequestModal(r);
    };
    document.getElementById('request-modal-close')?.addEventListener('click', () => {
      document.getElementById('request-detail-modal').style.display = 'none';
    });
    document.getElementById('request-detail-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'request-detail-modal') e.currentTarget.style.display = 'none';
    });

    // 一覧はコンパクトな行のみ表示し、クリックでポップアップに詳細をまとめる方式に変更
    // （でお要望2026-09-12：顧客管理タブと同じ方式に統一。今野くんの実地メモにも通じる
    // 「一覧性が悪いと見落としが増える」への対策）。
    function renderRequests(items) {
      const el = document.getElementById('requests-list');
      if (!items.length) { el.innerHTML = '<p class="muted">条件に一致するリクエストはありません。</p>'; return; }
      items.forEach(r => { _requestsById[r.id] = r; }); // ポップアップ・来店確認モーダルの下書きに使う
      el.innerHTML = `
        <div class="req-row req-row-head"><span>お客様</span><span>希望・確定日時</span><span></span></div>
      ` + items.map(r => {
        const choices = parseDateChoices(r);
        const dateLabel = r.confirmed_date ? `${r.confirmed_date} ${r.confirmed_time || ''}` : `${choices[0].date} ${choices[0].time}`;
        const statusColor = STATUS_COLORS[r.status] || '#6b7280';
        const statusLabel = STATUS_LABELS[r.status] || r.status;
        return `
          <div class="req-row" data-req-open="${r.id}">
            <span class="req-row-name">${esc(r.user_name)}</span>
            <span class="req-row-date">${esc(dateLabel)}</span>
            <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${statusColor}20;color:${statusColor};white-space:nowrap">${statusLabel}</span>
          </div>
        `;
      }).join('');
      el.querySelectorAll('[data-req-open]').forEach(row => bindTapHandler(row, () => window.openRequestModal(row.dataset.reqOpen)));
    }

    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function getSelectedChoice(id) {
      const sel = document.querySelector(`input[name="choice-${id}"]:checked`);
      const idx = sel ? parseInt(sel.value) : 0;
      const card = sel ? sel.closest('[style]') : null;
      const labels = card ? card.querySelectorAll('label') : [];
      const choiceLabel = labels[idx];
      if (!choiceLabel) return null;
      const spans = choiceLabel.querySelectorAll('span');
      if (spans.length < 2) return null;
      const parts = spans[1].textContent.trim().split(' ');
      return { date: parts[0], time: parts[1] || '' };
    }

    window.approveRequest = async function (id) {
      const choice = getSelectedChoice(id);
      const body = { status: 'approved' };
      if (choice) { body.confirmed_date = choice.date; body.confirmed_time = choice.time; }
      const _approveToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_approveToken ? { 'Authorization': `Bearer ${_approveToken}` } : {}) }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      document.getElementById('request-detail-modal').style.display = 'none';
      await loadRequests(); showToast('承認しました');
      window.__calReloadWeek?.();
    };

    window.rejectRequest = async function (id) {
      if (!confirm('このリクエストをお断りしますか？（ユーザーへ通知されます）')) return;
      const _rejectToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_rejectToken ? { 'Authorization': `Bearer ${_rejectToken}` } : {}) }, body: JSON.stringify({ status: 'rejected' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      document.getElementById('request-detail-modal').style.display = 'none';
      await loadRequests(); showToast('お断りを送りました');
      window.__calReloadWeek?.();
    };

    // 来店確認モーダル：来店確認と同時に、実際のメニュー・金額・スタッフ・支払い方法を
    // 店舗が確認/修正して売上として確定する（でお要望2026-09-04。予約価格を無条件に
    // 売上へ自動計上しない方針のため、必ずこの確認を経由する）。
    async function loadSalesModalOptions() {
      if (!_salesServicesCache) {
        const res = await fetch('/api/provider/services', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        _salesServicesCache = res.ok ? await res.json() : [];
      }
      if (!_salesStaffCache) {
        const res = await fetch('/api/provider/staff', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        _salesStaffCache = res.ok ? await res.json() : [];
      }
    }

    function visitModalRowHtml(idx, presetName) {
      const preset = _salesServicesCache.find(s => s.name === presetName);
      const menuOptions = ['<option value="">メニューを選択（任意）</option>']
        .concat(_salesServicesCache.map(s => `<option value="${esc(s.name)}" data-amount="${s.price}"${s.name === presetName ? ' selected' : ''}>${esc(s.name)}（¥${Number(s.price).toLocaleString()}）</option>`))
        .join('');
      return `
        <div class="visit-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
          <select class="vr-menu" style="flex:1 1 180px;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">${menuOptions}</select>
          <input class="vr-amount" type="number" min="1" placeholder="金額" value="${preset ? preset.price : ''}" style="width:110px;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <button type="button" class="vr-del" style="padding:6px 10px;background:#f3f4f6;color:#6b7280;border:none;border-radius:8px;font-size:12px;cursor:pointer;">×</button>
        </div>`;
    }

    window.showVisitModal = async function (id) {
      const existing = document.getElementById('visit-modal-overlay'); if (existing) existing.remove();
      await loadSalesModalOptions();
      const r = _requestsById[id] || {};
      const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
      const presetName = menuMatch ? menuMatch[1].trim() : '';

      const staffOptions = ['<option value="">スタッフ（任意）</option>'].concat(_salesStaffCache.map(s => `<option value="${s.id}">${esc(s.name)}</option>`)).join('');
      const overlay = document.createElement('div');
      overlay.id = 'visit-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;padding:28px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto">
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">来店を確認</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 18px">実際にご利用いただいたメニュー・金額を確認してください。予約時の内容から自動で入っていますが、変更・追加できます。</p>
          <div id="visit-rows">${visitModalRowHtml(0, presetName)}</div>
          <button type="button" id="visit-add-row-btn" style="font-size:12px;padding:6px 12px;background:none;border:1px dashed #d1d5db;border-radius:8px;color:#6b7280;cursor:pointer;margin-bottom:14px;">＋ メニューを追加</button>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">担当スタッフ（任意）</label>
          <select id="visit-staff" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">${staffOptions}</select>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">支払い方法（任意）</label>
          <select id="visit-payment" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:16px">
            <option value="">選択なし</option>
            <option value="現金">現金</option><option value="クレジットカード">クレジットカード</option>
            <option value="PayPay">PayPay</option><option value="楽天Pay">楽天Pay</option>
            <option value="LINE Pay">LINE Pay</option><option value="銀行振込">銀行振込</option><option value="その他">その他</option>
          </select>
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <button onclick="confirmVisit('${id}')" style="flex:1;padding:12px;background:#10b981;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">来店確認して売上を記録</button>
            <button onclick="document.getElementById('visit-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">キャンセル</button>
          </div>
          <button onclick="confirmVisit('${id}', true)" style="width:100%;padding:8px;background:none;border:none;font-size:12px;color:#9ca3af;cursor:pointer;text-decoration:underline;">売上を入力せず来店確認だけする</button>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      document.getElementById('visit-add-row-btn').addEventListener('click', () => {
        document.getElementById('visit-rows').insertAdjacentHTML('beforeend', visitModalRowHtml());
        wireVisitRowEvents();
      });
      wireVisitRowEvents();
    };

    function wireVisitRowEvents() {
      document.querySelectorAll('#visit-rows .visit-row').forEach(row => {
        const menuSel = row.querySelector('.vr-menu');
        const amountInput = row.querySelector('.vr-amount');
        const delBtn = row.querySelector('.vr-del');
        if (menuSel && !menuSel.dataset.wired) {
          menuSel.dataset.wired = '1';
          menuSel.addEventListener('change', () => {
            const opt = menuSel.selectedOptions[0];
            if (opt?.dataset.amount) amountInput.value = opt.dataset.amount;
          });
        }
        if (delBtn && !delBtn.dataset.wired) {
          delBtn.dataset.wired = '1';
          delBtn.addEventListener('click', () => { if (document.querySelectorAll('#visit-rows .visit-row').length > 1) row.remove(); });
        }
      });
    }

    window.confirmVisit = async function (id, skipSales) {
      const _visitToken = getSupabaseToken();
      const headers = { 'Content-Type': 'application/json', ...(_visitToken ? { 'Authorization': `Bearer ${_visitToken}` } : {}) };
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'visited' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }

      if (!skipSales) {
        const staffId = document.getElementById('visit-staff')?.value || null;
        const paymentMethod = document.getElementById('visit-payment')?.value || null;
        const items = [...document.querySelectorAll('#visit-rows .visit-row')].map(row => ({
          reservation_id: id,
          amount: row.querySelector('.vr-amount')?.value,
          menu_name: row.querySelector('.vr-menu')?.value || null,
          staff_id: staffId,
          payment_method: paymentMethod,
        })).filter(it => Number(it.amount) > 0);
        if (items.length) {
          await fetch('/api/provider/sales-entries', { method: 'POST', headers, body: JSON.stringify({ items }) });
        }
      }
      document.getElementById('visit-modal-overlay')?.remove();
      await loadRequests(); showToast('来店を確認しました');
      window.__calReloadWeek?.();
    };

    // パッケージ消化：予約カードから並列で押せるボタン。誤操作は
    // 「回数券」タブの「取り消す」から直近1回分を戻せる。
    window.consumePackage = async function (customerPackageId, reservationId, btn) {
      if (btn) btn.disabled = true;
      const _pkgToken = getSupabaseToken();
      try {
        const res = await fetch(`/api/provider/customer-packages/${customerPackageId}/usages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(_pkgToken ? { 'Authorization': `Bearer ${_pkgToken}` } : {}) },
          body: JSON.stringify({ reservation_id: reservationId }),
        });
        if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); if (btn) btn.disabled = false; return; }
        showToast('パッケージを1回消化しました（誤操作は「回数券」タブから取り消せます）');
        await loadRequests();
      } catch {
        showToast('通信エラーが発生しました');
        if (btn) btn.disabled = false;
      }
    };

    window.showCounterModal = function (id) {
      const existing = document.getElementById('counter-modal-overlay');
      if (existing) existing.remove();
      const today = new Date().toISOString().split('T')[0];
      const timeOpts = TIME_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('');
      const overlay = document.createElement('div');
      overlay.id = 'counter-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;padding:28px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto">
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">代替日時を提案する</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 20px">希望に沿えない場合、別の日時を提案してください。ユーザーへメールで通知されます。</p>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案日 *</label>
          <input id="counter-date-input" type="date" min="${today}" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案時間 *</label>
          <select id="counter-time-input" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
            <option value="">選択</option>${timeOpts}
          </select>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">メッセージ（任意）</label>
          <textarea id="counter-msg-input" rows="3" placeholder="ご都合が合えばこちらの日時はいかがでしょうか" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;resize:vertical;margin-bottom:16px"></textarea>
          <div style="display:flex;gap:8px">
            <button onclick="submitCounter('${id}')" style="flex:1;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">提案を送る</button>
            <button onclick="document.getElementById('counter-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">キャンセル</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    };

    window.submitCounter = async function (id) {
      const date = document.getElementById('counter-date-input').value;
      const time = document.getElementById('counter-time-input').value;
      const msg = document.getElementById('counter-msg-input').value;
      if (!date || !time) { showToast('日付と時間を選択してください'); return; }
      const _counterToken = getSupabaseToken();
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(_counterToken ? { 'Authorization': `Bearer ${_counterToken}` } : {}) },
        body: JSON.stringify({ status: 'counter_proposed', counter_date: date, counter_time: time, counter_proposal: msg || null })
      });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      document.getElementById('counter-modal-overlay').remove();
      const _reqModal = document.getElementById('request-detail-modal');
      if (_reqModal) _reqModal.style.display = 'none';
      await loadRequests(); showToast('代替提案を送りました');
      window.__calReloadWeek?.();
    };

    document.querySelectorAll('[data-tab="requests"]').forEach(btn => {
      btn.addEventListener('click', loadRequests, { once: false });
    });
    if (provider?.id || loadProviderData()?.id) setTimeout(loadRequests, 500);

    // ── LINE連携 ─────────────────────────────────────────────────
    (function setupLineConnect() {
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) return;

      const params = new URLSearchParams(location.search);
      if (params.get('line_connected') === '1') {
        showToast('LINEと連携しました！予約リクエスト時にLINE通知が届きます');
        history.replaceState({}, '', location.pathname);
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }
      if (params.get('line_error')) {
        showToast('LINE連携に失敗しました。もう一度お試しください');
        history.replaceState({}, '', location.pathname);
      }

      if (provider?.line_user_id) {
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }

      const btn = document.getElementById('line-connect-btn');
      if (btn) btn.href = `/api/provider/line-connect?provider_id=${encodeURIComponent(providerId)}`;
    })();

    // 紹介コードコピー（課金タブ内）
    document.getElementById('copy-referral').addEventListener('click', () => {
      const code = document.getElementById('referral-code').textContent;
      navigator.clipboard.writeText(code).then(() => showToast('コードをコピーしました')).catch(() => {});
    });

    // ── 紹介報酬タブ ─────────────────────────────────────────────
    (function setupReferralTab() {
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      const fnCode = provider?.referral_code || '';
      const codeEl = document.getElementById('referral-code-tab');
      if (codeEl) codeEl.textContent = fnCode || '—';

      document.getElementById('copy-referral-code-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        navigator.clipboard.writeText(fnCode).then(() => showToast('コードをコピーしました')).catch(() => {});
      });

      document.getElementById('copy-referral-url-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        const url = `https://www.fineme.me/business/fineme-referral.html?ref=${encodeURIComponent(fnCode)}`;
        navigator.clipboard.writeText(url).then(() => showToast('紹介URLをコピーしました')).catch(() => {});
      });

      async function loadReferrals() {
        const pid = provider?.id || loadProviderData()?.id;
        const listEl = document.getElementById('referral-list');
        if (!pid) { if (listEl) listEl.innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }

        try {
          const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
          if (!res.ok) { if (listEl) listEl.innerHTML = authErrorHtml(res); return; }
          const data = await res.json();
          const { referrals, summary } = data;

          const el = (id) => document.getElementById(id);
          if (el('ref-total-referred')) el('ref-total-referred').textContent = summary.total_referred;
          if (el('ref-active-count')) el('ref-active-count').textContent = summary.active_count;
          if (el('ref-pending-month')) el('ref-pending-month').textContent = '¥' + (summary.pending_this_month || 0).toLocaleString();
          if (el('ref-total-earned')) el('ref-total-earned').textContent = '¥' + (summary.total_earned_all_time || 0).toLocaleString();

          if (!listEl) return;
          if (!referrals.length) {
            listEl.innerHTML = '<p class="muted">まだ紹介した掲載者がいません。紹介URLを共有して報酬を獲得しましょう。</p>';
            return;
          }
          listEl.innerHTML = '';
          referrals.forEach(r => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;gap:12px;flex-wrap:wrap;background:#fff';
            const statusBadge = r.status === 'active'
              ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#d1fae5;color:#065f46">課金中</span>'
              : '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#f3f4f6;color:#6b7280">未課金</span>';
            const billingDate = r.billing_started
              ? `<span style="font-size:11px;color:#9ca3af">課金開始: ${esc(r.billing_started.slice(0, 10))}</span>`
              : '<span style="font-size:11px;color:#9ca3af">まだ課金なし</span>';
            row.innerHTML = `
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                  <strong style="font-size:14px">${esc(r.referred_name)}</strong>
                  ${statusBadge}
                </div>
                ${billingDate}
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:13px;font-weight:700;color:${r.status === 'active' ? '#6366f1' : '#9ca3af'}">¥500/月</div>
                <div style="font-size:11px;color:#6b7280">累計: ¥${(r.total_earned || 0).toLocaleString()}</div>
              </div>
            `;
            listEl.appendChild(row);
          });
        } catch (e) {
          if (listEl) listEl.innerHTML = '<p class="muted" style="color:#ef4444">通信エラーが発生しました。</p>';
        }
      }

      document.querySelectorAll('[data-tab="referral"]').forEach(btn => {
        btn.addEventListener('click', loadReferrals, { once: false });
      });
      if (new URLSearchParams(location.search).get('tab') === 'referral') loadReferrals();
    })();

    // ── パスワード変更 ────────────────────────────────────────────
    document.getElementById('pw-change-btn').addEventListener('click', async () => {
      const pw1 = document.getElementById('new-pw1').value;
      const pw2 = document.getElementById('new-pw2').value;
      const msg = document.getElementById('pw-change-msg');
      msg.style.display = 'none';
      if (pw1.length < 8) { msg.textContent = 'パスワードは8文字以上で入力してください'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      if (pw1 !== pw2) { msg.textContent = 'パスワードが一致しません'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        const session = key ? JSON.parse(localStorage.getItem(key)) : null;
        if (!session?.access_token) { msg.textContent = 'ログインセッションが見つかりません。再ログインしてください。'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient('https://qsfpzlvucqzmjldshwwd.supabase.co', SUPABASE_ANON);
        const { error } = await sb.auth.updateUser({ password: pw1 });
        if (error) { msg.textContent = 'エラー: ' + error.message; msg.style.color = '#ef4444'; }
        else { msg.textContent = 'パスワードを変更しました'; msg.style.color = '#059669'; document.getElementById('new-pw1').value = ''; document.getElementById('new-pw2').value = ''; }
        msg.style.display = 'block';
      } catch (e) { msg.textContent = 'エラーが発生しました'; msg.style.color = '#ef4444'; msg.style.display = 'block'; }
    });

    // ── カスタマーポータル ────────────────────────────────────────
    document.getElementById('billing-portal-btn').addEventListener('click', async e => {
      e.preventDefault();
      try {
        const { data: { session } } = await _sb.auth.getSession();
        const token = session?.access_token;
        if (!token) { showToast('ログインが必要です'); return; }
        const res = await fetch('/api/billing/portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else showToast('エラー: ' + (data.error || '不明なエラー'));
      } catch (err) { showToast('ポータルへのアクセスに失敗しました: ' + err.message); }
    });

    // ── 売上管理 ──────────────────────────────────────────────
    (function setupSales() {
      const t = getSupabaseToken();
      if (!t) return;
      const csvBtn = document.getElementById('sales-csv-btn');
      const periodThisBtn = document.getElementById('sales-period-this');
      const periodLastBtn = document.getElementById('sales-period-last');
      const manualForm = document.getElementById('sales-manual-form');
      if (!manualForm) return;

      function escSl(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function authHeadersSl() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || t}` }; }

      let salesPeriod = 'thisMonth';
      let currentEntries = [];
      let salesServices = [];

      async function loadSalesOptions() {
        const res = await fetch('/api/provider/services', { headers: { Authorization: `Bearer ${getSupabaseToken() || t}` } });
        salesServices = res.ok ? await res.json() : [];
        const menuSel = document.getElementById('sm-menu');
        if (menuSel) menuSel.innerHTML = '<option value="">選択なし</option>' + salesServices.map(s => `<option value="${escSl(s.name)}" data-amount="${s.price}">${escSl(s.name)}（¥${Number(s.price).toLocaleString()}）</option>`).join('');
        const staffRes = await fetch('/api/provider/staff', { headers: { Authorization: `Bearer ${getSupabaseToken() || t}` } });
        const staffRows = staffRes.ok ? await staffRes.json() : [];
        const staffSel = document.getElementById('sm-staff');
        if (staffSel) staffSel.innerHTML = '<option value="">選択なし</option>' + staffRows.map(s => `<option value="${s.id}">${escSl(s.name)}</option>`).join('');
      }

      document.getElementById('sm-menu')?.addEventListener('change', e => {
        const opt = e.target.selectedOptions[0];
        const amountInput = document.getElementById('sm-amount');
        if (opt?.dataset.amount && amountInput && !amountInput.value) amountInput.value = opt.dataset.amount;
      });

      async function loadSales() {
        const res = await fetch(`/api/provider/sales-entries?period=${salesPeriod}`, { headers: { Authorization: `Bearer ${getSupabaseToken() || t}` } });
        if (!res.ok) return;
        const d = await res.json();
        currentEntries = d.entries || [];
        document.getElementById('sales-total-finance').textContent = `¥${d.financeTotal.toLocaleString()}`;
        document.getElementById('sales-total-manual').textContent = `¥${d.manualTotal.toLocaleString()}`;
        document.getElementById('sales-total-all').textContent = `¥${d.total.toLocaleString()}`;

        function renderBreakdown(elId, rows) {
          const el = document.getElementById(elId);
          if (!el) return;
          el.innerHTML = rows.length ? rows.map(r => `<div style="display:flex;justify-content:space-between;padding:3px 0;">${escSl(r.l)}<span style="color:#c9a84c;font-weight:700;">¥${r.v.toLocaleString()}</span></div>`).join('') : 'まだ記録がありません';
        }
        renderBreakdown('sales-by-menu', d.byMenu);
        renderBreakdown('sales-by-staff', d.byStaff);
        renderBreakdown('sales-by-payment', d.byPayment);

        const listEl = document.getElementById('sales-entries-list');
        if (listEl) {
          listEl.innerHTML = currentEntries.length ? currentEntries.map(en => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(26,20,16,0.08);font-size:13px;flex-wrap:wrap;">
              <div>
                <span style="color:rgba(26,20,16,0.5);font-size:12px;">${en.entry_date}</span>
                ${en.menu_name ? ` ${escSl(en.menu_name)}` : ''}
                ${en.source === 'reservation' ? ' <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:rgba(201,168,76,0.15);color:#c9a84c;">来店確認</span>' : ''}
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <strong>¥${Number(en.amount).toLocaleString()}</strong>
                <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#ef4444;" data-sales-del="${en.id}">削除</button>
              </div>
            </div>`).join('') : '<p class="muted" style="font-size:13px;">まだ記録がありません。</p>';
          listEl.querySelectorAll('[data-sales-del]').forEach(btn => btn.addEventListener('click', async () => {
            if (!confirm('この記録を削除しますか？')) return;
            await fetch(`/api/provider/sales-entries/${btn.dataset.salesDel}`, { method: 'DELETE', headers: authHeadersSl() });
            loadSales();
          }));
        }
      }

      periodThisBtn?.addEventListener('click', () => {
        salesPeriod = 'thisMonth';
        periodThisBtn.className = 'btn'; periodLastBtn.className = 'btn btn-ghost';
        loadSales();
      });
      periodLastBtn?.addEventListener('click', () => {
        salesPeriod = 'lastMonth';
        periodLastBtn.className = 'btn'; periodThisBtn.className = 'btn btn-ghost';
        loadSales();
      });

      manualForm.addEventListener('submit', async e => {
        e.preventDefault();
        const msg = document.getElementById('sm-msg');
        const body = {
          entry_date: document.getElementById('sm-date').value,
          amount: document.getElementById('sm-amount').value,
          menu_name: document.getElementById('sm-menu').value || null,
          staff_id: document.getElementById('sm-staff').value || null,
          payment_method: document.getElementById('sm-payment').value || null,
          memo: document.getElementById('sm-memo').value || null,
        };
        const res = await fetch('/api/provider/sales-entries', { method: 'POST', headers: authHeadersSl(), body: JSON.stringify(body) });
        if (res.ok) {
          msg.style.color = '#059669'; msg.textContent = '✓ 記録しました';
          manualForm.reset();
          document.getElementById('sm-date').value = new Date().toISOString().split('T')[0];
          loadSales();
        } else { const d = await res.json(); msg.style.color = '#ef4444'; msg.textContent = d.error || '記録に失敗しました'; }
      });

      csvBtn?.addEventListener('click', () => {
        const header = '日付,金額,メニュー,支払い方法,由来,メモ\n';
        const rows = currentEntries.map(e => [e.entry_date, e.amount, e.menu_name || '', e.payment_method || '', e.source === 'reservation' ? '来店確認' : '手動', (e.memo || '').replace(/,/g, '、')].join(',')).join('\n');
        const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fineme-売上_${salesPeriod}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });

      const dateInput = document.getElementById('sm-date');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

      document.querySelectorAll('[data-tab="sales"]').forEach(btn => btn.addEventListener('click', () => { loadSalesOptions(); loadSales(); }, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'sales') { loadSalesOptions(); loadSales(); }
    })();

    // ── 予約カレンダータブ（2026-09-11〜12・でお要望、hacomono参考＋今野くんの実地
    //    フィードバックでモバイルは横縦二重スクロールにならない専用UIに） ──────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersCal = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      const labelEl = document.getElementById('cal-week-label');
      const pillsEl = document.getElementById('cal-day-pills');
      const gridWrapEl = document.getElementById('cal-day-grid');
      const viewToggleEl = document.getElementById('cal-view-toggle');
      if (!pillsEl) return;

      const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
      // 以前は営業時間の実データが無く、一般的な店舗を想定した固定レンジ（9:00〜21:00）
      // だった（でお質問2026-09-14：「なぜ9-21時なのか」）。営業時間設定
      // (providers.business_hours)が追加されたので、そこから最も早い開始・最も遅い
      // 終了（前後1時間の余裕を持たせる）を動的に算出する。設定が無い店舗は
      // 24時間表示にフォールバックする。
      let RANGE_START_MIN = 0;
      let RANGE_END_MIN = 24 * 60;
      async function loadCalendarRange() {
        const res = await fetch('/api/provider/business-hours', { headers: authHeadersCal() });
        if (!res.ok) return;
        const { business_hours } = await res.json();
        const opens = [], closes = [];
        Object.values(business_hours || {}).forEach(h => {
          if (h && !h.closed && h.open && h.close) {
            opens.push(timeToMinutes(h.open));
            closes.push(timeToMinutes(h.close));
          }
        });
        if (opens.length) {
          RANGE_START_MIN = Math.max(0, Math.min(...opens) - 60);
          RANGE_END_MIN = Math.min(24 * 60, Math.max(...closes) + 60);
        }
      }
      const DEFAULT_DURATION_MIN = 40; // 申請制はメニューの所要時間を保持していないため目安値

      function fmtDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      function mondayOf(d) {
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const m = new Date(d);
        m.setDate(d.getDate() + diff);
        m.setHours(0, 0, 0, 0);
        return m;
      }
      function timeToMinutes(t) {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
      }

      const todayStr = fmtDate(new Date());
      let weekStart = mondayOf(new Date());
      let byDate = {};
      let byId = {};
      let staffList = [];
      let resourceList = [];
      let resourceFeatureOn = false;
      let shiftFeatureOn = false;
      // スタッフの休憩・外出ブロック（でお要望2026-09-14）と、シフト確定済みの勤務時間帯を
      // 週窓分キャッシュし、カレンダーのグレー表示（帯）に使う。
      let staffBlocksCache = [];
      let shiftWindowsByStaffDate = {}; // { [staffId]: { [date]: [{start,end}] } }
      let shiftCoveredDates = new Set(); // シフトデータが存在する（＝グレー判定の対象になる）日付
      let selectedDate = todayStr;
      // ピルをクリックして手動で日付を選んだ後は、自動フォーカス（下記）を邪魔しないようにする
      let userPickedDate = false;
      // 'combined'（スタッフ列＋各ブロックに部屋名を注記）| 'staff' | 'resource'
      // （でお要望2026-09-12：カレンダーをスタッフ別/部屋別で切り替え／
      //   でお要望2026-09-14：「合体させたやつが欲しい。デフォルトはそれを表示」）。
      // 列組み・グループ分けは'combined'も'staff'と同じ（スタッフ列＋指名なし）で、
      // 部屋・設備管理がONの店舗だけ各ブロックに担当部屋を注記する。
      let viewMode = 'combined';
      let viewModePicked = false; // 手動で切り替えた後は、店舗の既定値で上書きし直さない

      function weekDates() {
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          return d;
        });
      }

      async function loadStaff() {
        const res = await fetch('/api/provider/staff', { headers: authHeadersCal() });
        if (!res.ok) return;
        const rows = await res.json();
        staffList = (rows || []).filter(s => s.bookable !== false);
      }

      async function loadResourcesAndFeatures() {
        const [featRes, resRes] = await Promise.all([
          fetch('/api/provider/features', { headers: authHeadersCal() }),
          fetch('/api/provider/resources', { headers: authHeadersCal() }),
        ]);
        if (featRes.ok) { const { features } = await featRes.json(); resourceFeatureOn = !!features?.resource_management; shiftFeatureOn = !!features?.shift_management; }
        if (resRes.ok) { const rows = await resRes.json(); resourceList = (rows || []).filter(r => r.active !== false); }
      }

      // スタッフの休憩・外出ブロック＋（シフト管理ONの店舗のみ）確定シフトの勤務時間帯を
      // 表示中の週分まとめて取得する（でお要望2026-09-14：「出勤してないスタッフの枠は
      // 予約が入らないように自動でブロックしてカレンダーでもグレーで帯をかけて」）。
      async function loadStaffBlocksAndShifts() {
        const dates = weekDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        const requests = [fetch(`/api/provider/staff-blocks?from=${from}&to=${to}`, { headers: authHeadersCal() })];
        if (shiftFeatureOn) requests.push(fetch(`/api/provider/shift-entries/for-range?from=${from}&to=${to}`, { headers: authHeadersCal() }));
        const results = await Promise.all(requests);
        staffBlocksCache = results[0].ok ? await results[0].json() : [];

        shiftWindowsByStaffDate = {};
        shiftCoveredDates = new Set();
        if (shiftFeatureOn && results[1]?.ok) {
          const { entries, coveredPeriods } = await results[1].json();
          (coveredPeriods || []).forEach(p => {
            let d = new Date(p.start + 'T00:00:00');
            const end = new Date(p.end + 'T00:00:00');
            while (d <= end) { shiftCoveredDates.add(fmtDate(d)); d.setDate(d.getDate() + 1); }
          });
          (entries || []).forEach(e => {
            shiftWindowsByStaffDate[e.staff_id] = shiftWindowsByStaffDate[e.staff_id] || {};
            (shiftWindowsByStaffDate[e.staff_id][e.date] = shiftWindowsByStaffDate[e.staff_id][e.date] || []).push({ start: e.start_time, end: e.end_time });
          });
        }
      }

      // 指定スタッフ・日付の「グレー表示すべき区間」（分単位、RANGE基準）を返す。
      // ①休憩・外出ブロック ②（シフトデータがある日のみ）勤務時間外、の両方を合成する。
      function greyIntervalsFor(staffId, dateStr) {
        if (!staffId) return [];
        const out = [];
        staffBlocksCache.forEach(b => {
          if (b.staff_id === staffId && b.date === dateStr) out.push({ start: timeToMinutes(b.start_time), end: timeToMinutes(b.end_time), kind: 'block', id: b.id });
        });
        if (shiftFeatureOn && shiftCoveredDates.has(dateStr)) {
          const windows = (shiftWindowsByStaffDate[staffId] && shiftWindowsByStaffDate[staffId][dateStr]) || [];
          const sorted = windows.map(w => ({ start: timeToMinutes(w.start), end: timeToMinutes(w.end) })).sort((a, b) => a.start - b.start);
          let cursor = RANGE_START_MIN;
          sorted.forEach(w => {
            if (w.start > cursor) out.push({ start: cursor, end: w.start, kind: 'offshift' });
            cursor = Math.max(cursor, w.end);
          });
          if (cursor < RANGE_END_MIN) out.push({ start: cursor, end: RANGE_END_MIN, kind: 'offshift' });
        }
        return out;
      }

      function renderPills() {
        const dates = weekDates();
        pillsEl.innerHTML = dates.map(d => {
          const dateStr = fmtDate(d);
          const isActive = dateStr === selectedDate;
          const count = (byDate[dateStr] || []).length;
          return `
            <button type="button" class="cal-day-pill${isActive ? ' is-active' : ''}" data-cal-pill="${dateStr}">
              <span>${WEEKDAY_JA[d.getDay()]}</span>
              <span class="cal-pill-date">${d.getDate()}</span>
              <span>${count ? count + '件' : ''}</span>
            </button>
          `;
        }).join('');
        pillsEl.querySelectorAll('[data-cal-pill]').forEach(btn => btn.addEventListener('click', () => {
          selectedDate = btn.dataset.calPill;
          userPickedDate = true;
          renderPills();
          renderDay();
        }));
      }

      // 予約ブロックの所要時間：即時予約（枠に紐づく）はその枠の実際の時間、
      // それ以外（申請制）はメニュー所要時間を保持していないため目安値を使う。
      function durationOf(r) {
        return r.duration_minutes || DEFAULT_DURATION_MIN;
      }

      // スタッフ列に、休憩・外出ブロック／シフト外時間のグレー帯を描く（でお要望2026-09-14：
      // 「出勤してないスタッフの枠は予約が入らないように自動でブロックしてカレンダーでも
      // グレーで帯をかけてわかるように」）。縦版(top/height)・横版(left/width)共通のロジックを
      // 座標変換関数だけ差し替えて使う。
      function greyBandsHtml(col, totalMin, totalSize, posKey, sizeKey, extraClass) {
        if (col.groupKey !== 'staff_id' || !col.id) return '';
        return greyIntervalsFor(col.id, selectedDate).map(iv => {
          const s = Math.max(RANGE_START_MIN, iv.start);
          const e = Math.min(RANGE_END_MIN, iv.end);
          if (e <= s) return '';
          const pos = ((s - RANGE_START_MIN) / totalMin) * totalSize;
          const size = ((e - s) / totalMin) * totalSize;
          const isBlock = iv.kind === 'block';
          const label = isBlock ? 'タップで削除：休憩・外出ブロック' : 'シフト外（勤務予定なし）';
          return `<div class="cal-grey-band${extraClass}${isBlock ? ' is-deletable' : ''}" style="${posKey}:${pos}px;${sizeKey}:${size}px" title="${esc(label)}"${isBlock ? ` data-staff-block-id="${iv.id}"` : ''}></div>`;
        }).join('');
      }

      // 「スタッフ×部屋」合体ビュー：部屋を単なる注記（タグ）にすると①文字が
      // ボックスに収まらず見切れる②結局「部屋が軸として見えない」の両方で不評だった
      // （でお指摘2026-09-14：「部屋が軸の中に入ってきてない」）。部屋をタグではなく
      // スタッフ列と並ぶ独立した列（軸）として追加する構成に変更する。
      function staffColumns() {
        return [...staffList.map(s => ({ key: 's_' + s.id, id: s.id, name: s.name, groupKey: 'staff_id' })), { key: 's_unassigned', id: null, name: '指名なし', groupKey: 'staff_id' }];
      }
      function resourceColumns() {
        return [...resourceList.map(r => ({ key: 'r_' + r.id, id: r.id, name: r.name, groupKey: 'resource_id' })), { key: 'r_unassigned', id: null, name: '未割当', groupKey: 'resource_id' }];
      }
      function currentColumns() {
        if (viewMode === 'combined') return [...staffColumns(), ...resourceColumns()];
        return viewMode === 'resource' ? resourceColumns() : staffColumns();
      }

      // 時間×スタッフ（または部屋、または合体）のグリッドHTMLを組み立てる共通関数。
      // 各列が自分のgroupKey（'staff_id'|'resource_id'）を持ち、その列で予約を
      // 絞り込む（でお要望2026-09-12：スタッフ別/部屋別カレンダーの切り替え／
      // でお要望2026-09-14：両方を同時に列として並べる合体ビュー）。
      function buildGridHtml(items, columns) {
        const totalMin = RANGE_END_MIN - RANGE_START_MIN;
        const rowH = 26; // 30分あたりの高さ(px)
        const totalHeight = (totalMin / 30) * rowH;

        let timeColHtml = `<div class="cal-time-col" style="height:${totalHeight}px">`;
        for (let m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 60) {
          const top = ((m - RANGE_START_MIN) / totalMin) * totalHeight;
          timeColHtml += `<div class="cal-time-label${m === RANGE_START_MIN ? ' is-first' : ''}" style="top:${top}px">${String(Math.floor(m / 60)).padStart(2, '0')}:00</div>`;
        }
        timeColHtml += `</div>`;

        // 合体ビューでは、部屋列の先頭に太い区切り線を入れてスタッフ群と部屋群の
        // 境目を視覚的にわかりやすくする。
        const firstResourceIdx = columns.findIndex(c => c.groupKey === 'resource_id');
        const headerCellsHtml = columns.map((c, i) => `<div class="cal-staff-head${c.groupKey === 'resource_id' ? ' is-resource-head' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}">${esc(c.name)}</div>`).join('');

        const bodyColsHtml = columns.map((col, i) => {
          const colItems = items.filter(r => (r[col.groupKey] || null) === col.id);
          let hourLines = '';
          for (let m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 30) {
            const top = ((m - RANGE_START_MIN) / totalMin) * totalHeight;
            hourLines += `<div class="cal-hour-line${m % 60 !== 0 ? ' is-half' : ''}" style="top:${top}px"></div>`;
          }
          const blocksHtml = colItems.map(r => {
            const startMin = timeToMinutes(r.time);
            if (startMin === null) return '';
            const clampedStart = Math.max(RANGE_START_MIN, Math.min(RANGE_END_MIN, startMin));
            const top = ((clampedStart - RANGE_START_MIN) / totalMin) * totalHeight;
            // スタッフ列で、お客様の指名ではなく店舗が後から割り当てた予約は色・表記を変える
            // （でお要望2026-09-12：指名予約と見分けたい）。実際の担当スタッフ列でのみ意味を持つ
            // 区別のため、col.groupKeyがstaff_idかつ「指名なし」バケット以外の列でだけ適用する。
            const isManualAssign = col.groupKey === 'staff_id' && col.id !== null && r.staff_manually_assigned;
            const isPending = r.status === 'pending' || r.status === 'counter_proposed';
            const tagsHtml = `${isManualAssign ? '<span class="cal-block-tag">（指名なし）</span>' : ''}${r._choiceLabel ? `<span class="cal-block-tag">（${r._choiceLabel}・返答待ち）</span>` : isPending ? '<span class="cal-block-tag">（返答待ち）</span>' : ''}`;
            // タグの行数が増えると所要時間だけで決めた高さに文字が収まらずボックスの下から
            // 見切れることがあった（でお報告2026-09-14）。実際に入るタグ行数分だけ最低高さを底上げする。
            const tagCount = (tagsHtml.match(/cal-block-tag/g) || []).length;
            const minHeight = 16 + tagCount * 13;
            const height = Math.max(minHeight, (durationOf(r) / totalMin) * totalHeight);
            return `
              <div class="cal-block${r.status === 'visited' ? ' is-visited' : ''}${isManualAssign ? ' is-manual-assign' : ''}${isPending ? ' is-pending' : ''}" style="top:${top}px;height:${height}px" data-cal-open="${r.id}">
                <strong>${r.time ? r.time.slice(0, 5) : ''}</strong>${esc(r.user_name || '')}${tagsHtml}
              </div>
            `;
          }).join('');
          const greyHtml = greyBandsHtml(col, totalMin, totalHeight, 'top', 'height', '-v');
          return `<div class="cal-staff-col${col.groupKey === 'resource_id' ? ' is-resource-col' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}" style="height:${totalHeight}px" data-cal-col-id="${col.id || ''}" data-cal-col-group="${col.groupKey}">${hourLines}${greyHtml}${blocksHtml}</div>`;
        }).join('');

        // ヘッダー・本体を同じgrid-template-columnsを持つ1つのグリッドのセルとして並べる
        // （2列×N行ではなく、ヘッダー用N+1セル→本体用N+1セルの順にDOMへ流し込み、
        // grid-auto-flowの自動配置で1行目・2行目に収まる。列幅の計算は1回だけなので、
        // ヘッダーと本体で列幅がズレることが構造的に起こらない）。
        const gridTemplateColumns = `40px repeat(${columns.length}, minmax(var(--cal-col-min), 1fr))`;
        return `
          <div class="cal-grid-inner" style="grid-template-columns:${gridTemplateColumns}">
            <div class="cal-time-col-spacer"></div>
            ${headerCellsHtml}
            ${timeColHtml}
            ${bodyColsHtml}
          </div>
        `;
      }

      // 縦横入れ替え版：時間を横軸に、スタッフ/部屋を縦のレーンに置く（でお要望2026-09-13：
      // 店舗によって見やすい向きが違う。1時間あたりの幅を広めに取り、予約者名が
      // 途中で切れにくいようにする——横軸なら「1時間ごとの幅」がそのまま調整できる）。
      // 位置計算の考え方はbuildGridHtmlと同じ連続座標方式で、top/height→left/widthに
      // 置き換えただけ。ブロックの状態クラス（is-visited等）・タグ表示ロジックも共通。
      const HOUR_WIDTH_PX = 90;
      function buildGridHtmlHorizontal(items, columns) {
        const totalMin = RANGE_END_MIN - RANGE_START_MIN;
        const totalWidth = (totalMin / 60) * HOUR_WIDTH_PX;
        const rowH = 56; // 各行（スタッフ/部屋1人分）の高さ(px)
        const nameColWidth = 120;

        let hourHeadHtml = `<div class="cal-hour-head-track" style="width:${totalWidth}px">`;
        for (let m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 60) {
          const left = ((m - RANGE_START_MIN) / totalMin) * totalWidth;
          hourHeadHtml += `<div class="cal-hour-label-h${m === RANGE_START_MIN ? ' is-first' : ''}" style="left:${left}px">${String(Math.floor(m / 60)).padStart(2, '0')}:00</div>`;
        }
        hourHeadHtml += `</div>`;

        const firstResourceIdx = columns.findIndex(c => c.groupKey === 'resource_id');
        const rowsHtml = columns.map((col, i) => {
          const colItems = items.filter(r => (r[col.groupKey] || null) === col.id);
          let vLines = '';
          for (let m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 30) {
            const left = ((m - RANGE_START_MIN) / totalMin) * totalWidth;
            vLines += `<div class="cal-vline${m % 60 !== 0 ? ' is-half' : ''}" style="left:${left}px"></div>`;
          }
          const blocksHtml = colItems.map(r => {
            const startMin = timeToMinutes(r.time);
            if (startMin === null) return '';
            const clampedStart = Math.max(RANGE_START_MIN, Math.min(RANGE_END_MIN, startMin));
            const left = ((clampedStart - RANGE_START_MIN) / totalMin) * totalWidth;
            const width = Math.max(64, (durationOf(r) / totalMin) * totalWidth);
            const isManualAssign = col.groupKey === 'staff_id' && col.id !== null && r.staff_manually_assigned;
            const isPending = r.status === 'pending' || r.status === 'counter_proposed';
            return `
              <div class="cal-block-h${r.status === 'visited' ? ' is-visited' : ''}${isManualAssign ? ' is-manual-assign' : ''}${isPending ? ' is-pending' : ''}" style="left:${left}px;width:${width}px" data-cal-open="${r.id}">
                <strong>${r.time ? r.time.slice(0, 5) : ''}</strong>${esc(r.user_name || '')}${isManualAssign ? '<span class="cal-block-tag">（指名なし）</span>' : ''}${r._choiceLabel ? `<span class="cal-block-tag">（${r._choiceLabel}・返答待ち）</span>` : isPending ? '<span class="cal-block-tag">（返答待ち）</span>' : ''}
              </div>
            `;
          }).join('');
          const greyHtml = greyBandsHtml(col, totalMin, totalWidth, 'left', 'width', '-h');
          return `
            <div class="cal-row-name-h${col.groupKey === 'resource_id' ? ' is-resource-head' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}" style="height:${rowH}px">${esc(col.name)}</div>
            <div class="cal-lane${col.groupKey === 'resource_id' ? ' is-resource-col' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}" style="height:${rowH}px;width:${totalWidth}px" data-cal-col-id="${col.id || ''}" data-cal-col-group="${col.groupKey}">${vLines}${greyHtml}${blocksHtml}</div>
          `;
        }).join('');

        return `
          <div class="cal-grid-inner-h" style="grid-template-columns:${nameColWidth}px ${totalWidth}px">
            <div class="cal-hour-head-spacer"></div>
            ${hourHeadHtml}
            ${rowsHtml}
          </div>
        `;
      }

      function renderDesktopGrid() {
        if (!gridWrapEl) return;
        const items = byDate[selectedDate] || [];
        const horizontal = dashboardPrefs?.calendar_axis === 'time-x';
        gridWrapEl.className = horizontal ? 'cal-day-grid-h' : 'cal-day-grid';
        gridWrapEl.innerHTML = horizontal
          ? buildGridHtmlHorizontal(items, currentColumns())
          : buildGridHtml(items, currentColumns());
        bindCalOpenHandlers(gridWrapEl);
        bindCalEmptyHandlers(gridWrapEl);
        bindGreyBandHandlers(gridWrapEl);
      }

      function renderViewToggle() {
        if (!viewToggleEl) return;
        if (!resourceFeatureOn) { viewToggleEl.style.display = 'none'; return; }
        viewToggleEl.style.display = 'flex';
        viewToggleEl.innerHTML = `
          <button type="button" class="btn ${viewMode === 'combined' ? '' : 'btn-ghost'}" data-cal-view="combined" style="font-size:12px;padding:6px 12px">スタッフ×部屋</button>
          <button type="button" class="btn ${viewMode === 'staff' ? '' : 'btn-ghost'}" data-cal-view="staff" style="font-size:12px;padding:6px 12px">スタッフ別</button>
          <button type="button" class="btn ${viewMode === 'resource' ? '' : 'btn-ghost'}" data-cal-view="resource" style="font-size:12px;padding:6px 12px">部屋別</button>
        `;
        viewToggleEl.querySelectorAll('[data-cal-view]').forEach(btn => btn.addEventListener('click', () => {
          viewMode = btn.dataset.calView;
          viewModePicked = true;
          renderViewToggle();
          renderDesktopGrid();
        }));
      }

      function renderAgendaInto(container, items) {
        if (!items.length) { container.innerHTML = '<p class="muted" style="font-size:13px">この日の予約はありません。</p>'; return; }
        container.innerHTML = items.map(r => `
          <div class="cal-agenda-row" data-cal-open="${r.id}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid rgba(26,20,16,0.08);border-radius:10px;margin-bottom:6px;${r.status === 'visited' ? 'opacity:.6' : ''}${(r.status === 'pending' || r.status === 'counter_proposed') ? 'border-style:dashed;border-color:#f59e0b' : ''}">
            <strong style="font-size:13px;flex-shrink:0">${r.time ? r.time.slice(0, 5) : '--:--'}</strong>
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(r.user_name || '')}</strong>
              ${r.staff_name ? `<span class="muted" style="font-size:12px;margin-left:6px">${esc(r.staff_name)}${r.staff_manually_assigned ? '<span style="color:#3b82f6;font-weight:700"> （指名なし）</span>' : ''}</span>` : ''}
              ${r.status === 'pending' ? `<span style="font-size:11px;font-weight:700;color:#b45309;margin-left:6px">${r._choiceLabel ? r._choiceLabel + '・' : ''}返答待ち</span>` : ''}
              ${r.status === 'counter_proposed' ? '<span style="font-size:11px;font-weight:700;color:#b45309;margin-left:6px">代替提案中（返答待ち）</span>' : ''}
            </div>
          </div>
        `).join('');
        bindCalOpenHandlers(container);
      }

      function renderDay() {
        renderDesktopGrid();
      }

      async function loadWeek() {
        const dates = weekDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        if (labelEl) labelEl.textContent = `${from} 〜 ${to}`;
        await loadStaffBlocksAndShifts();
        const res = await fetch(`/api/provider/calendar?from=${from}&to=${to}`, { headers: authHeadersCal() });
        if (!res.ok) { if (gridWrapEl) gridWrapEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        byDate = {};
        byId = {};
        rows.forEach(r => {
          byId[r.id] = r; // 詳細モーダルは常にこの代表データ（第1希望の日時）を使う
          // pending（返答待ち）の間は、第1〜第3希望それぞれの日時にブロックを表示する
          // （でお要望2026-09-12：代替提案を送るまでは全ての候補日時が分かるように
          // したい／代替提案した瞬間、提案した1件の表示に変わるのが正解）。
          // counter_proposed以降は他の状態と同じく1件（date=confirmed||counter||reserved）に
          // 統合される——calendar route.js側の計算そのままなのでここでは分岐不要。
          if (r.status === 'pending') {
            const choices = [{ date: r.date, time: r.time }];
            const note = r.note || '';
            const m2 = note.match(/【第2希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
            const m3 = note.match(/【第3希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
            if (m2) choices.push({ date: m2[1], time: m2[2] });
            if (m3) choices.push({ date: m3[1], time: m3[2] });
            choices.forEach((c, i) => {
              const item = { ...r, date: c.date, time: c.time, _choiceLabel: i === 0 ? '第1希望' : i === 1 ? '第2希望' : '第3希望' };
              (byDate[c.date] = byDate[c.date] || []).push(item);
            });
          } else {
            (byDate[r.date] = byDate[r.date] || []).push(r);
          }
        });
        if (!dates.some(d => fmtDate(d) === selectedDate)) selectedDate = from;
        // 「今日」がデフォルト選択だと、明日以降に届いた予約リクエスト・確定予約が
        // 画面上は何も無いように見えてしまう（でお報告2026-09-12：承認したのに
        // カレンダーに出ていないように見えた）。今日に予約が無く他の日にはある場合、
        // 手動選択前に限り直近の予約がある日へ自動フォーカスする。
        if (!userPickedDate && !(byDate[selectedDate] || []).length) {
          const withData = dates.map(fmtDate).filter(d => (byDate[d] || []).length);
          if (withData.length) {
            selectedDate = withData.find(d => d >= todayStr) || withData[0];
          }
        }
        renderPills();
        renderDay();
      }

      // ── 予約ブロック／アジェンダ行クリック → 会員クイックビュー（氏名・連絡先・
      //    固定メモ・来店記録履歴）。カルテタブの各APIをそのまま再利用する。 ──
      const modalEl = document.getElementById('cal-member-modal');
      const modalNameEl = document.getElementById('cal-modal-name');
      const modalContactEl = document.getElementById('cal-modal-contact');
      const modalReservationEl = document.getElementById('cal-modal-reservation');
      const modalNoteEl = document.getElementById('cal-modal-note');
      const modalNoteSaveBtn = document.getElementById('cal-modal-note-save');
      const modalNoteMsgEl = document.getElementById('cal-modal-note-msg');
      const modalHistoryEl = document.getElementById('cal-modal-history');
      const modalStaffSelectEl = document.getElementById('cal-modal-staff-select');
      const modalResourceFieldEl = document.getElementById('cal-modal-resource-field');
      const modalResourceSelectEl = document.getElementById('cal-modal-resource-select');
      const modalAssignSaveBtn = document.getElementById('cal-modal-assign-save');
      const modalAssignMsgEl = document.getElementById('cal-modal-assign-msg');
      let modalUserId = null;
      let modalReservationId = null;

      const STATUS_LABEL_CAL = { approved: '確定済み', visited: '来店済み', pending: '返答待ち（申請中）', counter_proposed: '代替提案中（お客様の返答待ち）' };

      // カレンダーは縦横にスクロールできるコンテナ(overflow:auto)の中に予約ブロックを
      // 置いているため、スマホでタップした時に指のわずかなブレをブラウザがスクロール
      // ジェスチャーと誤判定し、clickイベント自体をキャンセルすることがある
      // （でお報告2026-09-13：スマホでカレンダーのブロックを押してもポップアップが
      // 開かない。PCでは発生しない既知のタッチUIの落とし穴）。
      // touchstart→touchendの移動量が小さい時だけ「タップ」とみなして処理し、
      // その場合はpreventDefaultで後続の合成clickイベントを抑止する（二重発火防止）。
      // マウス操作（PC）はそのままclickイベントで拾う。
      function bindCalOpenHandlers(container) {
        container.querySelectorAll('[data-cal-open]').forEach(el => bindTapHandler(el, () => openCalItem(el.dataset.calOpen)));
      }

      // 休憩・外出ブロックのグレー帯をタップすると削除できるように（でお要望2026-09-14）。
      function bindGreyBandHandlers(container) {
        container.querySelectorAll('[data-staff-block-id]').forEach(el => bindTapHandler(el, async () => {
          if (!confirm('この休憩・外出ブロックを削除しますか？')) return;
          const res = await fetch(`/api/provider/staff-blocks/${el.dataset.staffBlockId}`, { method: 'DELETE', headers: authHeadersCal() });
          if (res.ok) { showToast('ブロックを削除しました'); await loadStaffBlocksAndShifts(); renderDay(); }
          else showToast('削除に失敗しました');
        }));
      }

      // 空き枠（予約ブロックが無い場所）をタップ/クリックしたら手動予約作成モーダルを開く
      // （でお要望2026-09-14：「電話来た時とかに入れる時あるから」）。列コンテナ
      // （.cal-staff-col / .cal-lane）自体にバインドし、実際にタップされたのが既存の
      // 予約ブロック（data-cal-open付き）の上であれば何もしない（ブロック側の
      // bindCalOpenHandlersに処理を譲る）。
      const manualModalEl = document.getElementById('cal-manual-modal');
      const manualWhenEl = document.getElementById('cal-manual-when');
      const manualNameEl = document.getElementById('cal-manual-name');
      const manualContactEl = document.getElementById('cal-manual-contact');
      const manualStaffEl = document.getElementById('cal-manual-staff');
      const manualResourceFieldEl = document.getElementById('cal-manual-resource-field');
      const manualResourceEl = document.getElementById('cal-manual-resource');
      const manualNoteEl = document.getElementById('cal-manual-note');
      const manualSaveBtn = document.getElementById('cal-manual-save');
      const manualMsgEl = document.getElementById('cal-manual-msg');
      const manualModeReservationBtn = document.getElementById('cal-manual-mode-reservation');
      const manualModeBlockBtn = document.getElementById('cal-manual-mode-block');
      const manualReservationFieldsEl = document.getElementById('cal-manual-reservation-fields');
      const manualReservationFields2El = document.getElementById('cal-manual-reservation-fields-2');
      const manualBlockFieldsEl = document.getElementById('cal-manual-block-fields');
      const manualBlockReasonEl = document.getElementById('cal-manual-block-reason');
      const manualBlockStartEl = document.getElementById('cal-manual-block-start');
      const manualBlockEndEl = document.getElementById('cal-manual-block-end');
      let manualCtx = null; // { date, time, userId, mode: 'reservation'|'block' }

      // 予約追加／休憩・外出ブロックのモード切替（でお要望2026-09-14）。
      function setManualMode(mode) {
        if (manualCtx) manualCtx.mode = mode;
        const isBlock = mode === 'block';
        if (manualReservationFieldsEl) manualReservationFieldsEl.style.display = isBlock ? 'none' : '';
        if (manualReservationFields2El) manualReservationFields2El.style.display = isBlock ? 'none' : '';
        if (manualBlockFieldsEl) manualBlockFieldsEl.style.display = isBlock ? '' : 'none';
        if (manualResourceFieldEl) manualResourceFieldEl.style.display = (!isBlock && resourceFeatureOn) ? '' : 'none';
        if (manualModeReservationBtn) manualModeReservationBtn.className = `btn ${isBlock ? 'btn-ghost' : ''}`;
        if (manualModeBlockBtn) manualModeBlockBtn.className = `btn ${isBlock ? '' : 'btn-ghost'}`;
        if (manualSaveBtn) manualSaveBtn.textContent = isBlock ? 'この時間をブロックする' : 'この内容で予約を追加';
      }
      manualModeReservationBtn?.addEventListener('click', () => setManualMode('reservation'));
      manualModeBlockBtn?.addEventListener('click', () => setManualMode('block'));

      function roundToHalfHour(min) {
        return Math.round(min / 30) * 30;
      }

      // Fineme会員検索の共通ヘルパー（でお要望2026-09-14：手動登録の予約を「その場で」
      // または「後から」Fineme会員と紐付けられるようにする。入力欄・結果表示欄・
      // 選択時コールバックを渡せば、手動予約モーダル・既存予約の詳細モーダル両方から使える）。
      function bindMemberSearch(inputEl, resultsEl, onSelect) {
        if (!inputEl || !resultsEl) return;
        let timer = null;
        inputEl.addEventListener('input', () => {
          clearTimeout(timer);
          const q = inputEl.value.trim();
          if (q.length < 3) { resultsEl.innerHTML = ''; return; }
          timer = setTimeout(async () => {
            resultsEl.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">検索中…</p>';
            const res = await fetch(`/api/provider/customers/search-member?q=${encodeURIComponent(q)}`, { headers: authHeadersCal() });
            if (!res.ok) { resultsEl.innerHTML = ''; return; }
            const rows = await res.json();
            if (!rows.length) { resultsEl.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">見つかりませんでした</p>'; return; }
            resultsEl.innerHTML = rows.map(r => `
              <div data-member-pick="${r.id}" data-member-name="${esc(r.name)}" style="padding:6px 8px;border:1px solid rgba(26,20,16,0.1);border-radius:6px;margin-top:4px;cursor:pointer;font-size:12.5px;display:flex;justify-content:space-between;gap:8px">
                <span>${esc(r.name)}</span><span class="muted">${esc(r.maskedPhone || '')}</span>
              </div>
            `).join('');
            resultsEl.querySelectorAll('[data-member-pick]').forEach(row => row.addEventListener('click', () => {
              onSelect(row.dataset.memberPick, row.dataset.memberName);
              resultsEl.innerHTML = '';
              inputEl.value = '';
            }));
          }, 350);
        });
      }

      const manualMemberSearchWrap = document.getElementById('cal-manual-member-search-wrap');
      const manualMemberSelectedEl = document.getElementById('cal-manual-member-selected');
      const manualMemberSelectedNameEl = document.getElementById('cal-manual-member-selected-name');
      function setManualSelectedMember(userId, name) {
        if (manualCtx) manualCtx.userId = userId || null;
        if (manualMemberSelectedEl) manualMemberSelectedEl.style.display = userId ? 'flex' : 'none';
        if (manualMemberSearchWrap) manualMemberSearchWrap.style.display = userId ? 'none' : '';
        if (manualMemberSelectedNameEl) manualMemberSelectedNameEl.textContent = name || '';
      }
      bindMemberSearch(
        document.getElementById('cal-manual-member-search'),
        document.getElementById('cal-manual-member-results'),
        (userId, name) => setManualSelectedMember(userId, name),
      );
      document.getElementById('cal-manual-member-clear')?.addEventListener('click', () => setManualSelectedMember(null, ''));

      function openManualCreate(date, min, colId, colGroupKey) {
        const clamped = Math.max(RANGE_START_MIN, Math.min(RANGE_END_MIN - 30, roundToHalfHour(min)));
        const time = `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
        manualCtx = { date, time, userId: null, mode: 'reservation' };
        if (manualWhenEl) manualWhenEl.textContent = `${date} ${time}〜`;
        if (manualNameEl) manualNameEl.value = '';
        if (manualContactEl) manualContactEl.value = '';
        if (manualNoteEl) manualNoteEl.value = '';
        if (manualBlockReasonEl) manualBlockReasonEl.value = '';
        if (manualBlockStartEl) manualBlockStartEl.value = time;
        if (manualBlockEndEl) {
          const endMin = Math.min(RANGE_END_MIN, clamped + 30);
          manualBlockEndEl.value = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        }
        if (manualMsgEl) manualMsgEl.textContent = '';
        setManualSelectedMember(null, '');
        // 合体ビューではスタッフ列・部屋列どちらをタップしたかでcolGroupKeyが変わるため、
        // タップした列自身のgroupKeyでどちらのプルダウンを事前選択するか決める。
        if (manualStaffEl) {
          manualStaffEl.innerHTML = '<option value="">指名なし</option>' + staffList.map(s => `<option value="${s.id}"${colGroupKey === 'staff_id' && s.id === colId ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
        }
        if (manualResourceEl) {
          manualResourceEl.innerHTML = '<option value="">未割当</option>' + resourceList.map(r => `<option value="${r.id}"${colGroupKey === 'resource_id' && r.id === colId ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
        }
        // 部屋列をタップして開いた場合は「休憩・外出ブロック」は意味を持たない
        // （ブロックはスタッフ単位のみ）ため、予約追加モード固定でボタン自体を隠す。
        if (manualModeBlockBtn) manualModeBlockBtn.style.display = colGroupKey === 'resource_id' ? 'none' : '';
        setManualMode('reservation');
        if (manualModalEl) manualModalEl.style.display = 'flex';
        setTimeout(() => manualNameEl?.focus(), 50);
      }

      function bindCalEmptyHandlers(container) {
        container.querySelectorAll('.cal-staff-col[data-cal-col-id], .cal-lane[data-cal-col-id]').forEach(col => {
          bindTapHandler(col, (e) => {
            if (e.target?.closest?.('[data-cal-open]')) return; // 既存の予約ブロック上のタップはそちらに任せる
            if (e.target?.closest?.('[data-staff-block-id]')) return; // グレー帯（削除可能）のタップはそちらに任せる
            const rect = col.getBoundingClientRect();
            const totalMin = RANGE_END_MIN - RANGE_START_MIN;
            const horizontal = col.classList.contains('cal-lane');
            const ratio = horizontal
              ? (e.clientX - rect.left) / (rect.width || 1)
              : (e.clientY - rect.top) / (rect.height || 1);
            const min = RANGE_START_MIN + Math.max(0, Math.min(1, ratio)) * totalMin;
            openManualCreate(selectedDate, min, col.dataset.calColId || null, col.dataset.calColGroup);
          });
        });
      }

      document.getElementById('cal-manual-close')?.addEventListener('click', () => { if (manualModalEl) manualModalEl.style.display = 'none'; });
      manualModalEl?.addEventListener('click', (e) => { if (e.target === manualModalEl) manualModalEl.style.display = 'none'; });

      manualSaveBtn?.addEventListener('click', async () => {
        if (!manualCtx) return;
        if (manualCtx.mode === 'block') {
          const staff_id = manualStaffEl?.value || '';
          const start_time = manualBlockStartEl?.value || '';
          const end_time = manualBlockEndEl?.value || '';
          if (!staff_id) { if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = 'ブロックするスタッフを選んでください'; } return; }
          if (!start_time || !end_time || start_time >= end_time) { if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = '開始・終了時刻を正しく入力してください'; } return; }
          manualSaveBtn.disabled = true;
          if (manualMsgEl) { manualMsgEl.style.color = ''; manualMsgEl.textContent = '保存中…'; }
          const res = await fetch('/api/provider/staff-blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
            body: JSON.stringify({ staff_id, date: manualCtx.date, start_time, end_time, reason: manualBlockReasonEl?.value.trim() || null }),
          });
          manualSaveBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => ({})); if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = e.error || '保存に失敗しました'; } return; }
          if (manualModalEl) manualModalEl.style.display = 'none';
          showToast('ブロックを追加しました');
          await loadStaffBlocksAndShifts();
          renderDay();
          return;
        }
        const user_name = manualNameEl?.value.trim();
        if (!user_name) { if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = 'お客様名を入力してください'; } return; }
        manualSaveBtn.disabled = true;
        if (manualMsgEl) { manualMsgEl.style.color = ''; manualMsgEl.textContent = '保存中…'; }
        const body = {
          date: manualCtx.date,
          time: manualCtx.time,
          user_name,
          user_contact: manualContactEl?.value.trim() || '',
          staff_id: manualStaffEl?.value || null,
          resource_id: resourceFeatureOn ? (manualResourceEl?.value || null) : null,
          note: manualNoteEl?.value.trim() || '',
          user_id: manualCtx.userId || null,
        };
        const res = await fetch('/api/provider/reservations/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
          body: JSON.stringify(body),
        });
        manualSaveBtn.disabled = false;
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = e.error || '保存に失敗しました'; }
          return;
        }
        if (manualModalEl) manualModalEl.style.display = 'none';
        showToast('予約を追加しました');
        await loadWeek();
      });

      // まだ確定していないリクエスト（pending/counter_proposed）をカレンダー上でクリックした時は、
      // 確定済み予約と同じ会員情報モーダルではなく、承認・代替提案・お断りができる
      // リクエスト詳細モーダルを開く（でお要望2026-09-12：「確定してないから内容が
      // 一緒じゃダメ」）。カレンダーAPIのレスポンスは一覧表示用に絞ってあるため、
      // 承認・代替提案フォームが必要とする生カラムをGET /api/reservations/[id]で
      // 別途取得してから渡す。
      async function openCalItem(reservationId) {
        try {
          const r = byId[reservationId];
          if (!r) { showToast('この予約データが見つかりません（再読み込みしてください）'); return; }
          if (r.status === 'pending' || r.status === 'counter_proposed') {
            const res = await fetch(`/api/reservations/${reservationId}`, { headers: authHeadersCal() });
            if (!res.ok) {
              const e = await res.json().catch(() => ({}));
              showToast('取得エラー: ' + (e.error || res.status));
              return;
            }
            const full = await res.json();
            window.openRequestModalWithData?.(full);
            return;
          }
          openMemberModal(reservationId);
        } catch (e) {
          console.error('[openCalItem]', e);
          showToast('エラー: ' + e.message);
        }
      }

      async function openMemberModal(reservationId) {
        const r = byId[reservationId];
        if (!r || !modalEl) return;
        modalUserId = r.user_id || null;
        modalReservationId = reservationId;
        if (modalNameEl) modalNameEl.textContent = r.user_name || '(お名前未登録)';
        if (modalContactEl) modalContactEl.textContent = r.user_contact || '';
        if (modalReservationEl) {
          modalReservationEl.innerHTML = `
            <strong>${esc(r.date)} ${r.time ? r.time.slice(0, 5) : ''}</strong>
            ／ <span class="muted">${STATUS_LABEL_CAL[r.status] || r.status}</span>
            ${r.staff_id && r.staff_manually_assigned ? '<span style="color:#3b82f6;font-weight:700;font-size:12px;margin-left:6px">（指名なし・店舗が割当）</span>' : ''}
            ${r.note ? `<p class="muted" style="margin:6px 0 0;font-size:12.5px">${esc(r.note)}</p>` : ''}
            ${r.user_id ? '<button type="button" class="btn btn-ghost" id="cal-modal-open-cust-btn" style="font-size:12px;padding:5px 12px;margin-top:8px">👤 顧客情報を見る（カルテ・回数券など）</button>' : `
              <div style="margin-top:8px;padding:8px 10px;background:var(--color-bg);border-radius:8px">
                <label style="display:block;font-size:11px;font-weight:700;margin-bottom:4px">Fineme会員と紐付ける（任意・電話予約等で後から分かった場合）</label>
                <input type="text" id="cal-modal-member-search" placeholder="お名前または電話番号で検索（3文字以上）" style="width:100%;padding:6px 8px;font-size:12.5px;border:1px solid rgba(26,20,16,0.15);border-radius:6px;box-sizing:border-box" />
                <div id="cal-modal-member-results" style="margin-top:4px"></div>
              </div>
            `}
          `;
          // フルの顧客情報ポップアップ（カルテ編集・回数券・声かけ・担当割当・AI傾向分析）を
          // その場で開けるようにする導線（でお要望2026-09-13：「他の場所でもポップアップを
          // 出す時はちゃんと顧客情報全部見れて編集できたりページ飛べたりできるように」）。
          document.getElementById('cal-modal-open-cust-btn')?.addEventListener('click', () => {
            if (!window.openCustomerModal) { showToast('読み込み中です。少し待ってから再度お試しください'); return; }
            window.openCustomerModal(r.user_id, 'member', r.user_name);
          });
          // 手動登録した予約に後からFineme会員を紐付ける（でお要望2026-09-14：
          // 「Finemeの会員情報と後からでもその時でも紐づけられるように」）。
          if (!r.user_id) {
            bindMemberSearch(
              document.getElementById('cal-modal-member-search'),
              document.getElementById('cal-modal-member-results'),
              async (userId, name) => {
                const res = await fetch(`/api/provider/reservations/${reservationId}/assign`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
                  body: JSON.stringify({ user_id: userId }),
                });
                if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); return; }
                showToast(`${name}さんと紐付けました`);
                r.user_id = userId;
                if (byId[reservationId]) byId[reservationId].user_id = userId;
                await openMemberModal(reservationId); // 表示を「顧客情報を見る」ボタン付きに更新
              },
            );
          }
        }
        // 担当スタッフ・部屋の割り当て（指名の有無に関わらずいつでも変更できる。でお要望2026-09-12）
        if (modalStaffSelectEl) {
          modalStaffSelectEl.innerHTML = '<option value="">指名なし</option>' + staffList.map(s => `<option value="${s.id}"${s.id === r.staff_id ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
        }
        if (modalResourceFieldEl) modalResourceFieldEl.style.display = resourceFeatureOn ? '' : 'none';
        if (modalResourceSelectEl) {
          modalResourceSelectEl.innerHTML = '<option value="">未割当</option>' + resourceList.map(res => `<option value="${res.id}"${res.id === r.resource_id ? ' selected' : ''}>${esc(res.name)}</option>`).join('');
        }
        if (modalAssignMsgEl) modalAssignMsgEl.textContent = '';
        modalEl.style.display = 'flex';

        if (modalNoteEl) { modalNoteEl.value = ''; modalNoteEl.disabled = true; modalNoteEl.placeholder = modalUserId ? '読み込み中…' : 'Finemeアカウントに未登録のため記録できません'; }
        if (modalNoteSaveBtn) modalNoteSaveBtn.disabled = true;
        if (modalHistoryEl) modalHistoryEl.innerHTML = '<p class="muted" style="font-size:12px">読み込み中…</p>';
        if (modalNoteMsgEl) modalNoteMsgEl.textContent = '';

        if (!modalUserId) {
          if (modalHistoryEl) modalHistoryEl.innerHTML = '<p class="muted" style="font-size:12px">Finemeアカウントに未登録のお客様です。</p>';
          return;
        }

        const [noteRes, historyRes] = await Promise.all([
          fetch(`/api/provider/customers/${modalUserId}/note`, { headers: authHeadersCal() }),
          fetch(`/api/provider/customers/${modalUserId}/karte-entries`, { headers: authHeadersCal() }),
        ]);
        if (noteRes.ok) {
          const noteData = await noteRes.json();
          if (modalNoteEl) { modalNoteEl.value = noteData.note || ''; modalNoteEl.disabled = false; }
          if (modalNoteSaveBtn) modalNoteSaveBtn.disabled = false;
        }
        if (historyRes.ok) {
          const entries = await historyRes.json();
          if (modalHistoryEl) {
            modalHistoryEl.innerHTML = entries.length
              ? entries.slice(0, 5).map(e => `
                  <div style="padding:6px 0;border-bottom:1px solid rgba(26,20,16,0.06);font-size:12.5px">
                    <strong>${new Date(e.created_at).toLocaleDateString('ja-JP')}</strong>
                    ${e.menu_name ? ` ／ ${esc(e.menu_name)}` : ''}
                    ${e.note ? `<div class="muted" style="margin-top:2px">${esc(e.note)}</div>` : ''}
                  </div>
                `).join('')
              : '<p class="muted" style="font-size:12px">まだ記録がありません。</p>';
          }
        }
      }

      modalAssignSaveBtn?.addEventListener('click', async () => {
        if (!modalReservationId) return;
        modalAssignSaveBtn.disabled = true;
        const body = { staff_id: modalStaffSelectEl?.value || null };
        if (resourceFeatureOn) body.resource_id = modalResourceSelectEl?.value || null;
        const res = await fetch(`/api/provider/reservations/${modalReservationId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
          body: JSON.stringify(body),
        });
        modalAssignSaveBtn.disabled = false;
        if (!res.ok) { if (modalAssignMsgEl) { modalAssignMsgEl.style.color = '#ef4444'; modalAssignMsgEl.textContent = '保存に失敗しました'; } return; }
        if (modalAssignMsgEl) { modalAssignMsgEl.style.color = '#4ade80'; modalAssignMsgEl.textContent = '✓ 保存しました'; }
        await loadWeek(); // グリッドの列分けに反映
      });

      modalNoteSaveBtn?.addEventListener('click', async () => {
        if (!modalUserId) return;
        modalNoteSaveBtn.disabled = true;
        const res = await fetch(`/api/provider/customers/${modalUserId}/note`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
          body: JSON.stringify({ note: modalNoteEl.value }),
        });
        modalNoteSaveBtn.disabled = false;
        if (modalNoteMsgEl) { modalNoteMsgEl.style.color = res.ok ? '#4ade80' : '#ef4444'; modalNoteMsgEl.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
      });
      document.getElementById('cal-modal-close')?.addEventListener('click', () => { if (modalEl) modalEl.style.display = 'none'; });
      modalEl?.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.style.display = 'none'; });

      document.getElementById('cal-prev-btn')?.addEventListener('click', () => { weekStart.setDate(weekStart.getDate() - 7); userPickedDate = false; loadWeek(); });
      document.getElementById('cal-next-btn')?.addEventListener('click', () => { weekStart.setDate(weekStart.getDate() + 7); userPickedDate = false; loadWeek(); });
      document.getElementById('cal-today-btn')?.addEventListener('click', () => { weekStart = mondayOf(new Date()); selectedDate = todayStr; userPickedDate = false; loadWeek(); });

      const agendaPopupEl = document.getElementById('cal-agenda-popup');
      const agendaPopupTitleEl = document.getElementById('cal-agenda-popup-title');
      const agendaPopupListEl = document.getElementById('cal-agenda-popup-list');
      document.getElementById('cal-agenda-popup-btn')?.addEventListener('click', () => {
        if (!agendaPopupEl) return;
        if (agendaPopupTitleEl) agendaPopupTitleEl.textContent = `予約一覧（${selectedDate}）`;
        if (agendaPopupListEl) renderAgendaInto(agendaPopupListEl, byDate[selectedDate] || []);
        agendaPopupEl.style.display = 'flex';
      });
      document.getElementById('cal-agenda-popup-close')?.addEventListener('click', () => { if (agendaPopupEl) agendaPopupEl.style.display = 'none'; });
      agendaPopupEl?.addEventListener('click', (e) => { if (e.target === agendaPopupEl) agendaPopupEl.style.display = 'none'; });

      async function initAndLoad() {
        // 部屋・設備管理がONの店舗は、店舗設定の既定ビュー（スタッフ別/部屋別）を
        // 初回だけ適用する（でお要望2026-09-13：部屋別をメインにしたい店舗もある）。
        if (!viewModePicked && ['combined', 'staff', 'resource'].includes(dashboardPrefs?.calendar_default_view)) {
          viewMode = dashboardPrefs.calendar_default_view;
        }
        await Promise.all([loadStaff(), loadResourcesAndFeatures(), loadCalendarRange()]);
        renderViewToggle();
        await loadWeek();
      }
      document.querySelectorAll('[data-tab="calendar"]').forEach(btn => btn.addEventListener('click', initAndLoad, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'calendar') initAndLoad();

      // 予約リクエストタブ側（承認・お断り・代替提案・来店確認）から、カレンダーが
      // 既に開かれていれば表示を追従させるための橋渡し（でお要望2026-09-12：
      // 「代替案送ったらカレンダー上でその日時に移動するのが正解」）。
      window.__calReloadWeek = loadWeek;
    })();

    // ── 今日の業務タブ（2026-09-12・でお要望：毎日の流れを1画面にまとめる） ──────
    // サイドバー4グループの中身を横断してダイジェスト表示する日次ハブ。デフォルトの
    // 着地タブ（既存タブの置き換えではなく追加）。各カードの「開く」ボタンは実際の
    // ナビボタンをクリックすることで、対応タブの読み込みロジックをそのまま再利用する。
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersToday = () => ({ Authorization: `Bearer ${getSupabaseToken() || token}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const todayStr = new Date().toISOString().split('T')[0];

      // 名前をタップするとフルの顧客情報ポップアップ（カルテ編集・回数券・声かけ・
      // 担当割当）を開けるようにする（でお要望2026-09-13）。会員（user_idあり）以外は
      // 対象外だが、以前は非対象の名前を見た目上も普通のテキストにしていたため
      // 「タップしても何も起きない＝壊れてる」ように見えてしまっていた
      // （でお報告2026-09-13：「名前タップしてもポップアップひらかない」）。
      // 全ての名前をクリック可能にし、対象外の場合は理由をトーストで説明する。
      // 名前をHTML属性に埋め込むとダブルクォート等でエスケープが崩れる懸念があるため、
      // uid→表示名のルックアップをJS側に持ち、属性にはuidだけ埋め込む。
      //
      // でお報告2026-09-14：名前だけ（テキストの文字ぴったりの<span>）をクリック領域に
      // していたため、当たり判定が非常に狭く「押しても無反応」に見えていた
      // （予約リクエスト一覧の.req-rowはpadding付きの行全体がクリック領域）。
      // data-today-custは呼び出し側で行全体(<div>)に付けるよう変更する。
      const todayNameByUid = {};
      function rememberTodayName(userId, name) {
        if (userId) todayNameByUid[userId] = name || '';
      }
      function custNameSpan(userId, name) {
        return `<span style="${userId ? 'color:#2563eb;text-decoration:underline;text-underline-offset:2px' : ''}">${esc(name || '')}</span>`;
      }
      // でお指摘2026-09-13：「予約リクエストの一覧ではできるんだから全く同じ仕組みに
      // すればいいだけ」。タッチ判定の独自対策（前回の推測）は的外れだったため撤去し、
      // 予約リクエスト一覧（renderRequestsの.req-row）と全く同じ、単純なclickイベント
      // だけのバインドに揃える。あわせて例外を握りつぶさずトーストに出すようにし、
      // 次に同じ報告が来た場合に原因を一発で特定できるようにする。
      function handleTodayCustTap(el) {
        try {
          const uid = el.dataset.todayCust;
          if (!uid) { showToast('Finemeに未登録のお客様のため、顧客情報がありません'); return; }
          if (typeof window.openCustomerModal !== 'function') { showToast('読み込み中です。少し待ってから再度お試しください'); return; }
          window.openCustomerModal(uid, 'member', todayNameByUid[uid]);
        } catch (e) {
          console.error('[handleTodayCustTap]', e);
          showToast('エラー: ' + e.message);
        }
      }
      function bindTodayCustHandlers(container) {
        container.querySelectorAll('[data-today-cust]').forEach(el => bindTapHandler(el, () => handleTodayCustTap(el)));
      }

      async function loadTodayReservations() {
        const el = document.getElementById('today-reservations-list');
        if (!el) return;
        const res = await fetch(`/api/provider/calendar?from=${todayStr}&to=${todayStr}`, { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { el.innerHTML = '<p class="muted" style="font-size:13px">今日の予約はありません。</p>'; return; }
        rows.forEach(r => rememberTodayName(r.user_id, r.user_name));
        // でお指摘2026-09-14：「予約タブの予約リクエストの一覧と表示が違う」ため、
        // 見た目・クリックの当たり判定ともに.req-row（予約リクエスト一覧で実際に
        // 動いている実績のあるクラス）をそのまま使い、完全に同じ構造にする。
        el.innerHTML = rows.map(r => `
          <div class="req-row" style="grid-template-columns:56px 1fr auto" data-today-cust="${r.user_id || ''}">
            <span>${r.time ? r.time.slice(0, 5) : '--:--'}</span>
            <span class="req-row-name">${custNameSpan(r.user_id, r.user_name)}</span>
            <span class="muted" style="font-size:12px">${r.staff_name ? esc(r.staff_name) : ''}</span>
          </div>
        `).join('');
        bindTodayCustHandlers(el);
      }

      async function loadTodayRequests() {
        const el = document.getElementById('today-requests-list');
        if (!el) return;
        const providerId = provider?.id || loadProviderData()?.id;
        if (!providerId) { el.innerHTML = '<p class="muted" style="font-size:13px">掲載者情報が見つかりません。</p>'; return; }
        const res = await fetch(`/api/reservations?providerId=${providerId}`, { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        const pending = rows.filter(r => r.status === 'pending');
        if (!pending.length) { el.innerHTML = '<p class="muted" style="font-size:13px">未対応のリクエストはありません。</p>'; return; }
        // これは予約リクエストタブに出るのと全く同じデータのため、顧客情報ではなく
        // 予約リクエスト詳細モーダル（承認・代替提案ができる、既に確実に動いている
        // window.openRequestModalWithData）をそのまま使う（でお指摘2026-09-14：
        // 「予約リクエスト一覧と表示が違う」→.req-rowで完全に統一）。
        const pendingById = {};
        pending.forEach(r => { pendingById[r.id] = r; });
        el.innerHTML = `<p style="margin:0 0 8px;font-size:20px;font-weight:800">${pending.length}件</p>` +
          pending.slice(0, 5).map(r => `
            <div class="req-row" style="grid-template-columns:1fr auto" data-today-req="${r.id}">
              <span class="req-row-name">${esc(r.user_name || '')}</span>
              <span class="muted" style="font-size:12px">${esc(r.reserved_date || '')} ${esc(r.start_time || '')}</span>
            </div>
          `).join('');
        function handleTodayReqTap(row) {
          const r = pendingById[row.dataset.todayReq];
          if (!r) { showToast('データが見つかりません'); return; }
          if (typeof window.openRequestModalWithData !== 'function') { showToast('読み込み中です。少し待ってから再度お試しください'); return; }
          window.openRequestModalWithData(r);
        }
        el.querySelectorAll('[data-today-req]').forEach(row => bindTapHandler(row, () => handleTodayReqTap(row)));
      }

      async function loadTodayCheckins() {
        const card = document.getElementById('today-checkin-card');
        const el = document.getElementById('today-checkin-list');
        if (!card || !el) return;
        const featRes = await fetch('/api/provider/features', { headers: authHeadersToday() });
        if (!featRes.ok) return;
        const { features } = await featRes.json();
        if (!features?.checkin_qr) { card.style.display = 'none'; return; }
        card.style.display = '';
        const res = await fetch('/api/provider/checkins', { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        const todays = rows.filter(r => (r.created_at || '').slice(0, 10) === todayStr);
        el.innerHTML = todays.length
          ? `<p style="margin:0 0 8px;font-size:20px;font-weight:800">${todays.length}件</p>` +
            todays.slice(0, 5).map(r => `<div style="padding:4px 0;font-size:13px">${esc(r.customer_name || '')}</div>`).join('')
          : '<p class="muted" style="font-size:13px">今日のチェックインはまだありません。</p>';
      }

      async function loadTodaySales() {
        const el = document.getElementById('today-sales-total');
        if (!el) return;
        const res = await fetch(`/api/provider/sales-entries?from=${todayStr}&to=${todayStr}`, { headers: authHeadersToday() });
        if (!res.ok) return;
        const data = await res.json();
        el.textContent = `¥${Number(data.total || 0).toLocaleString()}`;
      }

      function loadToday() {
        loadTodayReservations();
        loadTodayRequests();
        loadTodayCheckins();
        loadTodaySales();
      }

      document.querySelectorAll('[data-today-goto]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelector(`.tab-btn[data-tab="${btn.dataset.todayGoto}"]`)?.click();
      }));

      document.querySelectorAll('[data-tab="today"]').forEach(btn => btn.addEventListener('click', loadToday, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'today' || document.getElementById('tab-today')?.classList.contains('active')) loadToday();
    })();

    // ── POS・在庫タブ（Phase 3・hacomono/STORES網羅計画） ──────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersPos = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` });

      const gridEl = document.getElementById('pos-product-grid');
      const cartListEl = document.getElementById('pos-cart-list');
      const cartTotalEl = document.getElementById('pos-cart-total');
      const checkoutBtn = document.getElementById('pos-checkout-btn');
      const checkoutMsg = document.getElementById('pos-checkout-msg');
      const staffSel = document.getElementById('pos-staff');
      const prodListEl = document.getElementById('prod-list');
      const txListEl = document.getElementById('pos-tx-list');

      let products = [];
      let cart = []; // [{product_id, name, unit_price, qty}]

      function renderCart() {
        if (!cartListEl) return;
        if (!cart.length) {
          cartListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ商品が選ばれていません</p>';
        } else {
          cartListEl.innerHTML = cart.map((c, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
              <div style="flex:1;min-width:0"><strong style="font-size:13px">${esc(c.name)}</strong> <span class="muted" style="font-size:12px">¥${c.unit_price.toLocaleString()} × ${c.qty}</span></div>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-cart-dec="${i}">−</button>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-cart-inc="${i}">＋</button>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#ef4444" data-cart-del="${i}">削除</button>
            </div>
          `).join('');
          cartListEl.querySelectorAll('[data-cart-inc]').forEach(b => b.addEventListener('click', () => { cart[+b.dataset.cartInc].qty++; renderCart(); }));
          cartListEl.querySelectorAll('[data-cart-dec]').forEach(b => b.addEventListener('click', () => { const it = cart[+b.dataset.cartDec]; it.qty--; if (it.qty <= 0) cart.splice(+b.dataset.cartDec, 1); renderCart(); }));
          cartListEl.querySelectorAll('[data-cart-del]').forEach(b => b.addEventListener('click', () => { cart.splice(+b.dataset.cartDel, 1); renderCart(); }));
        }
        const total = cart.reduce((sum, c) => sum + c.unit_price * c.qty, 0);
        if (cartTotalEl) cartTotalEl.textContent = total.toLocaleString();
        if (checkoutBtn) checkoutBtn.disabled = !cart.length;
      }

      function renderGrid() {
        if (!gridEl) return;
        const active = products.filter(p => p.active);
        if (!active.length) { gridEl.innerHTML = '<p class="muted">下の「商品・在庫管理」からまず商品を追加してください。</p>'; return; }
        gridEl.innerHTML = active.map(p => `
          <button type="button" class="btn btn-ghost" data-pos-add="${p.id}" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px;height:auto;text-align:left;${p.track_stock && p.stock_qty <= 0 ? 'opacity:.4' : ''}">
            <strong style="font-size:13px">${esc(p.name)}</strong>
            <span class="muted" style="font-size:12px">¥${Number(p.price).toLocaleString()}${p.track_stock ? ` ／ 在庫${p.stock_qty}` : ''}</span>
          </button>
        `).join('');
        gridEl.querySelectorAll('[data-pos-add]').forEach(btn => btn.addEventListener('click', () => {
          const p = products.find(x => x.id === btn.dataset.posAdd);
          if (!p) return;
          if (p.track_stock && p.stock_qty <= 0) { showToast('在庫がありません'); return; }
          const existing = cart.find(c => c.product_id === p.id);
          if (existing) existing.qty++;
          else cart.push({ product_id: p.id, name: p.name, unit_price: p.price, qty: 1 });
          renderCart();
        }));
      }

      function renderProductList() {
        if (!prodListEl) return;
        if (!products.length) { prodListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ商品がありません。</p>'; return; }
        prodListEl.innerHTML = products.map(p => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;${p.active ? '' : 'opacity:.5'}">
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(p.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">¥${Number(p.price).toLocaleString()}${p.track_stock ? ` ／ 在庫${p.stock_qty}` : ' ／ 在庫管理なし'}</span>
            </div>
            ${p.track_stock ? `
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:6px 10px" data-prod-restock="${p.id}">＋入荷</button>
            ` : ''}
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:6px 10px" data-prod-toggle="${p.id}">${p.active ? '非公開にする' : '再公開する'}</button>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:6px 10px;color:#ef4444" data-prod-del="${p.id}">削除</button>
          </div>
        `).join('');
        prodListEl.querySelectorAll('[data-prod-restock]').forEach(btn => btn.addEventListener('click', async () => {
          const qty = prompt('入荷数を入力してください（マイナスで棚卸修正も可）');
          const delta = parseInt(qty, 10);
          if (!Number.isFinite(delta) || delta === 0) return;
          await fetch(`/api/provider/products/${btn.dataset.prodRestock}`, { method: 'PATCH', headers: authHeadersPos(), body: JSON.stringify({ stock_delta: delta, reason: delta > 0 ? 'restock' : 'adjustment' }) });
          loadProducts();
        }));
        prodListEl.querySelectorAll('[data-prod-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const p = products.find(x => x.id === btn.dataset.prodToggle);
          await fetch(`/api/provider/products/${btn.dataset.prodToggle}`, { method: 'PATCH', headers: authHeadersPos(), body: JSON.stringify({ active: !p.active }) });
          loadProducts();
        }));
        prodListEl.querySelectorAll('[data-prod-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この商品を削除しますか？（過去の会計履歴は残ります）')) return;
          await fetch(`/api/provider/products/${btn.dataset.prodDel}`, { method: 'DELETE', headers: authHeadersPos() });
          loadProducts();
        }));
      }

      async function loadProducts() {
        const res = await fetch('/api/provider/products', { headers: authHeadersPos() });
        if (!res.ok) return;
        products = await res.json();
        renderGrid();
        renderProductList();
      }

      async function loadStaffOptions() {
        if (!staffSel) return;
        const res = await fetch('/api/provider/staff', { headers: authHeadersPos() });
        if (!res.ok) return;
        const rows = await res.json();
        staffSel.innerHTML = '<option value="">選択なし</option>' + rows.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
      }

      async function loadTransactions() {
        if (!txListEl) return;
        const res = await fetch('/api/provider/pos/transactions', { headers: authHeadersPos() });
        if (!res.ok) { txListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { txListEl.innerHTML = '<p class="muted">まだ会計履歴がありません。</p>'; return; }
        txListEl.innerHTML = rows.map(t => `
          <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="font-size:12px" class="muted">${new Date(t.created_at).toLocaleString('ja-JP')}${t.staff_name ? ` ／ ${esc(t.staff_name)}` : ''}${t.payment_method ? ` ／ ${esc(t.payment_method)}` : ''}</span>
              <strong style="font-size:13px">¥${Number(t.total_amount).toLocaleString()}</strong>
            </div>
            <div class="muted" style="font-size:12px;margin-top:4px">${t.items.map(it => `${esc(it.name_snapshot)}×${it.qty}`).join('、')}</div>
          </div>
        `).join('');
      }

      if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
          if (!cart.length) return;
          checkoutBtn.disabled = true;
          if (checkoutMsg) checkoutMsg.textContent = '';
          const res = await fetch('/api/provider/pos/checkout', {
            method: 'POST',
            headers: authHeadersPos(),
            body: JSON.stringify({
              items: cart.map(c => ({ product_id: c.product_id, qty: c.qty })),
              staff_id: staffSel?.value || null,
              payment_method: document.getElementById('pos-payment')?.value || null,
            }),
          });
          checkoutBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => ({})); if (checkoutMsg) { checkoutMsg.style.color = '#ef4444'; checkoutMsg.textContent = e?.error || '会計に失敗しました'; } return; }
          cart = [];
          renderCart();
          showToast('会計を記録しました');
          loadProducts();
          loadTransactions();
        });
      }

      const createProdBtn = document.getElementById('prod-create-btn');
      if (createProdBtn) {
        createProdBtn.addEventListener('click', async () => {
          const name = document.getElementById('prod-name')?.value.trim();
          const price = document.getElementById('prod-price')?.value;
          const stock = document.getElementById('prod-stock')?.value;
          const trackStock = !!document.getElementById('prod-track-stock')?.checked;
          if (!name) { showToast('商品名を入力してください'); return; }
          createProdBtn.disabled = true;
          const res = await fetch('/api/provider/products', {
            method: 'POST', headers: authHeadersPos(),
            body: JSON.stringify({ name, price: price || 0, track_stock: trackStock, stock_qty: stock || 0 }),
          });
          createProdBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
          document.getElementById('prod-name').value = '';
          document.getElementById('prod-price').value = '';
          document.getElementById('prod-stock').value = '';
          showToast('商品を追加しました');
          loadProducts();
        });
      }

      async function loadAll() {
        await Promise.all([loadProducts(), loadStaffOptions(), loadTransactions()]);
      }
      document.querySelectorAll('[data-tab="pos"]').forEach(btn => btn.addEventListener('click', loadAll, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'pos') loadAll();
    })();

    // ── チェックインタブ（Phase 4・hacomono/STORES網羅計画） ────────
    // iPad Safari優先のためjsQRを採用（BarcodeDetectorはSafari対応が不安定なため補助扱いにも使わない）。
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersCk = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` });

      const cameraBtn = document.getElementById('checkin-camera-btn');
      const cameraStopBtn = document.getElementById('checkin-camera-stop-btn');
      const video = document.getElementById('checkin-video');
      const canvas = document.getElementById('checkin-canvas');
      const scanMsg = document.getElementById('checkin-scan-msg');
      const listEl = document.getElementById('checkin-list');
      const manualNameInput = document.getElementById('checkin-manual-name');
      const manualBtn = document.getElementById('checkin-manual-btn');

      let stream = null;
      let scanRafId = null;
      let lastScannedCode = '';
      let lastScannedAt = 0;

      async function loadList() {
        if (!listEl) return;
        const res = await fetch('/api/provider/checkins', { headers: authHeadersCk() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { listEl.innerHTML = '<p class="muted">まだチェックイン記録がありません。</p>'; return; }
        listEl.innerHTML = rows.map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
            <span style="flex:1;min-width:0;font-size:13px">${esc(r.customer_name)}</span>
            <span class="muted" style="font-size:12px">${r.method === 'qr' ? 'QR' : '代理入力'} ／ ${new Date(r.created_at).toLocaleString('ja-JP')}</span>
          </div>
        `).join('');
      }

      async function recordCheckin(body) {
        const res = await fetch('/api/provider/checkins', { method: 'POST', headers: authHeadersCk(), body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { showToast('エラー: ' + (data?.error || res.status)); return false; }
        showToast(`✓ ${data.customer_name} をチェックインしました`);
        loadList();
        return true;
      }

      async function tickScan(jsQR) {
        if (!stream || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          scanRafId = requestAnimationFrame(() => tickScan(jsQR));
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        const now = Date.now();
        if (code?.data && !(code.data === lastScannedCode && now - lastScannedAt < 5000)) {
          lastScannedCode = code.data;
          lastScannedAt = now;
          if (scanMsg) scanMsg.textContent = '読み取りました…';
          recordCheckin({ code: code.data }).then(ok => {
            if (scanMsg) scanMsg.textContent = ok ? '✓ チェックイン完了。続けて次の方をスキャンできます' : '読み取りに失敗しました。もう一度お試しください';
          });
        }
        scanRafId = requestAnimationFrame(() => tickScan(jsQR));
      }

      function stopCamera() {
        if (scanRafId) cancelAnimationFrame(scanRafId);
        scanRafId = null;
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (video) { video.style.display = 'none'; video.srcObject = null; }
        if (cameraBtn) cameraBtn.style.display = '';
        if (cameraStopBtn) cameraStopBtn.style.display = 'none';
      }

      if (cameraBtn) {
        cameraBtn.addEventListener('click', async () => {
          if (scanMsg) scanMsg.textContent = '';
          try {
            const jsQRModule = await import('jsqr');
            const jsQR = jsQRModule.default || jsQRModule;
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.style.display = '';
            await video.play();
            cameraBtn.style.display = 'none';
            if (cameraStopBtn) cameraStopBtn.style.display = '';
            tickScan(jsQR);
          } catch (e) {
            if (scanMsg) scanMsg.textContent = 'カメラを起動できませんでした（権限をご確認ください）';
          }
        });
      }
      if (cameraStopBtn) cameraStopBtn.addEventListener('click', stopCamera);

      if (manualBtn) {
        manualBtn.addEventListener('click', async () => {
          const name = manualNameInput?.value.trim();
          if (!name) { showToast('お名前を入力してください'); return; }
          manualBtn.disabled = true;
          const ok = await recordCheckin({ offline_member_name: name });
          manualBtn.disabled = false;
          if (ok && manualNameInput) manualNameInput.value = '';
        });
      }

      document.querySelectorAll('[data-tab="checkin"]').forEach(btn => btn.addEventListener('click', loadList, { once: false }));
      document.querySelectorAll('.tab-btn:not([data-tab="checkin"])').forEach(btn => btn.addEventListener('click', stopCamera));
      if (new URLSearchParams(location.search).get('tab') === 'checkin') loadList();
    })();

    // ── 出欠確認タブ（Phase 5・hacomono/STORES網羅計画） ────────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersEv = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken() || token}` });

      const listEl = document.getElementById('ev-list');
      const inviteCard = document.getElementById('ev-invite-card');
      const inviteTitleEl = document.getElementById('ev-invite-title');
      const inviteUserSel = document.getElementById('ev-invite-user');
      const attendanceListEl = document.getElementById('ev-attendance-list');
      const inviteMsg = document.getElementById('ev-invite-msg');

      let events = [];
      let currentEventId = null;

      function renderList() {
        if (!listEl) return;
        if (!events.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだイベントがありません。上のフォームから作成してください。</p>'; return; }
        listEl.innerHTML = events.map(e => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(e.title)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${e.event_date}${e.start_time ? ' ' + e.start_time : ''} ／ 参加${e.counts.attending}・不参加${e.counts.declined}・未回答${e.counts.invited}</span>
            </div>
            <button class="btn btn-ghost" style="font-size:11px;padding:6px 12px" data-ev-open="${e.id}">出欠を確認する</button>
          </div>
        `).join('');
        listEl.querySelectorAll('[data-ev-open]').forEach(btn => btn.addEventListener('click', () => openInvite(btn.dataset.evOpen)));
      }

      async function loadEvents() {
        const res = await fetch('/api/provider/events', { headers: authHeadersEv() });
        if (!res.ok) { if (listEl) listEl.innerHTML = authErrorHtml(res); return; }
        events = await res.json();
        renderList();
      }

      async function loadInviteUsers() {
        if (!inviteUserSel) return;
        const res = await fetch('/api/provider/customers?scope=all', { headers: authHeadersEv() });
        if (!res.ok) return;
        const rows = await res.json();
        const seen = new Set();
        const opts = [];
        rows.forEach(r => {
          if (seen.has(r.user_id)) return;
          seen.add(r.user_id);
          opts.push(`<option value="${r.user_id}">${esc(r.customer_name)}</option>`);
        });
        inviteUserSel.innerHTML = opts.length ? opts.join('') : '<option value="">New Me Log連携済みの顧客がいません</option>';
      }

      async function loadAttendances(eventId) {
        if (!attendanceListEl) return;
        attendanceListEl.innerHTML = '<p class="muted">読み込み中…</p>';
        const res = await fetch(`/api/provider/events/${eventId}/attendances`, { headers: authHeadersEv() });
        if (!res.ok) { attendanceListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { attendanceListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ招待していません。</p>'; return; }
        const statusLabel = { invited: '未回答', attending: '参加', declined: '不参加' };
        attendanceListEl.innerHTML = rows.map(r => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
            <span style="flex:1;min-width:0;font-size:13px">${esc(r.customer_name)}</span>
            <span class="muted" style="font-size:12px">${statusLabel[r.status] || r.status}</span>
          </div>
        `).join('');
      }

      function openInvite(eventId) {
        currentEventId = eventId;
        const ev = events.find(e => e.id === eventId);
        if (inviteTitleEl) inviteTitleEl.textContent = ev ? ev.title : '';
        if (inviteCard) inviteCard.style.display = '';
        if (inviteMsg) inviteMsg.textContent = '';
        loadInviteUsers();
        loadAttendances(eventId);
        inviteCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      document.getElementById('ev-invite-close')?.addEventListener('click', () => { if (inviteCard) inviteCard.style.display = 'none'; currentEventId = null; });

      document.getElementById('ev-invite-send-btn')?.addEventListener('click', async () => {
        const userId = inviteUserSel?.value;
        if (!currentEventId || !userId) { if (inviteMsg) inviteMsg.textContent = '顧客を選んでください'; return; }
        const res = await fetch(`/api/provider/events/${currentEventId}/attendances`, {
          method: 'POST', headers: authHeadersEv(), body: JSON.stringify({ user_ids: [userId] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { if (inviteMsg) { inviteMsg.style.color = '#ef4444'; inviteMsg.textContent = data?.error || '送信に失敗しました'; } return; }
        if (inviteMsg) { inviteMsg.style.color = '#059669'; inviteMsg.textContent = data.sent ? 'LINEで送信しました' : '既に招待済みです'; }
        loadAttendances(currentEventId);
        loadEvents();
      });

      document.getElementById('ev-create-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('ev-title')?.value.trim();
        const eventDate = document.getElementById('ev-date')?.value;
        const startTime = document.getElementById('ev-time')?.value;
        if (!title || !eventDate) { showToast('イベント名と日付を入力してください'); return; }
        const res = await fetch('/api/provider/events', {
          method: 'POST', headers: authHeadersEv(), body: JSON.stringify({ title, event_date: eventDate, start_time: startTime || null }),
        });
        if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
        document.getElementById('ev-title').value = '';
        document.getElementById('ev-date').value = '';
        document.getElementById('ev-time').value = '';
        showToast('イベントを作成しました');
        loadEvents();
      });

      document.querySelectorAll('[data-tab="events"]').forEach(btn => btn.addEventListener('click', loadEvents, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'events') loadEvents();
    })();

    // ── 接客の引き出し：お店専用パーソナライズ ───────────────────
    (function setupCustomerScripts() {
      const t = getSupabaseToken();
      if (!t) return;
      const statusEl = document.getElementById('scripts-status');
      const contentEl = document.getElementById('scripts-content');
      const refreshBtn = document.getElementById('scripts-refresh-btn');
      if (!statusEl || !contentEl) return;

      function escSc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      function applyPersonalized(items) {
        items.forEach(a => {
          const block = contentEl.querySelector(`[data-axis="${a.axis}"]`);
          if (!block) return;
          block.innerHTML = `
            <h3 style="margin:0 0 8px;font-size:14px;">${escSc(a.label)} <span style="font-size:10px;font-weight:700;color:#c9a84c;">🏪 このお店専用</span></h3>
            <p class="muted" style="font-size:12px;margin:0 0 6px;font-weight:700;">声かけ例</p>
            <ul style="margin:0 0 10px;padding-left:18px;">
              ${a.openers.map(o => `<li style="font-size:13px;margin-bottom:4px;">${escSc(o)}</li>`).join('')}
            </ul>
            <p class="muted" style="font-size:12px;margin:0 0 6px;font-weight:700;">カルテの着眼点</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${(a.notePoints || []).map(n => `<span style="font-size:12px;padding:3px 10px;border-radius:99px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);">${escSc(n)}</span>`).join('')}
            </div>
          `;
        });
      }

      async function loadScripts(force) {
        statusEl.textContent = force ? '更新中…' : '読み込み中…';
        try {
          const res = await fetch(`/api/provider/customer-scripts${force ? '?force=1' : ''}`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || t}` },
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data.items) && data.items.length) {
            applyPersonalized(data.items);
            statusEl.textContent = `🏪 一部の軸が貴店専用の内容に更新されています（最終更新: ${new Date(data.generatedAt).toLocaleDateString('ja-JP')}）`;
            refreshBtn.style.display = 'inline-block';
          } else if (data.insufficientData) {
            statusEl.textContent = `まだ貴店専用の内容を作るには記録が足りません（現在${data.count}件・カルテ記録等が増えると自動で切り替わります）`;
            refreshBtn.style.display = 'none';
          } else {
            statusEl.textContent = '';
          }
        } catch { statusEl.textContent = ''; }
      }

      refreshBtn?.addEventListener('click', () => loadScripts(true));
      document.querySelectorAll('[data-tab="scripts"]').forEach(btn => btn.addEventListener('click', () => loadScripts(false), { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'scripts') loadScripts(false);
    })();

    return () => {
      try { document.head.removeChild(style); } catch {}
      clearInterval(sessionKeepAlive);
      document.removeEventListener('visibilitychange', onVisible);
      // Clean up window globals
      delete window.showToast;
      delete window.approveRequest;
      delete window.rejectRequest;
      delete window.showVisitModal;
      delete window.confirmVisit;
      delete window.showCounterModal;
      delete window.submitCounter;
      delete window.openRequestModal;
      delete window.openRequestModalWithData;
      delete window.openCustomerModal;
      delete window.__calReloadWeek;
    };
  }, []);

  return (
    <main className="section pd-page-root">
      <div className="pd-container">

        {/* モバイル用トップバー。よく使うタブへのショートカット（でお要望2026-09-14：
            「よく使うメニューを3つくらいここ（ヘッダー）に置いてあげると使いやすいかも。
            カスタムできたらもっといい」）を店舗ごとにカスタマイズして表示する。 */}
        <div className="pd-topbar">
          <button type="button" id="pd-menu-btn" aria-label="メニューを開く" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#c9a84c', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>☰</button>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: '#c9a84c', flexShrink: 0 }}>fineme</p>
          <div id="pd-topbar-shortcuts" style={{ display: 'flex', gap: 6, marginLeft: 'auto', overflowX: 'auto' }}></div>
        </div>
        <div id="pd-backdrop" className="pd-backdrop" />

        <div className="pd-layout">
          {/* サイドバー */}
          <div className="tab-nav" id="pd-sidebar">
            <div style={{ padding: '0 12px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>fineme</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>顧客管理システム</p>
            </div>

            {/* 2階層ナビ（2026-09-12・でお指摘：折りたたみ式は「どこが開閉できるのか分かりにくい」。
                hacomonoの「左に細いカテゴリー列、選ぶと右に一覧」という2ペイン構成に変更。
                常にカテゴリー1つだけがアクティブになるので、開閉状態が曖昧にならない。 */}
            <div className="pd-rail-wrap">
              <div className="pd-rail" id="pd-rail">
                <button type="button" className="pd-rail-btn active" data-category="reservation">予約</button>
                <button type="button" className="pd-rail-btn" data-category="home">ホーム</button>
                <button type="button" className="pd-rail-btn" data-category="customer">顧客</button>
                <button type="button" className="pd-rail-btn" data-category="sales">売上</button>
                <button type="button" className="pd-rail-btn" data-category="store">店舗設定</button>
                <button type="button" className="pd-rail-btn" data-category="growth">集客</button>
                <button type="button" className="pd-rail-btn" data-category="account">アカウント</button>
                <button type="button" className="pd-rail-btn" data-category="tutorial">使い方</button>
              </div>
              <div className="pd-rail-panel">
                <div className="pd-panel-section" data-panel="home" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="today">今日の業務</button>
                  <button className="tab-btn" data-tab="stats">概況</button>
                </div>
                <div className="pd-panel-section" data-panel="reservation">
                  <button className="tab-btn active" data-tab="calendar">予約カレンダー</button>
                  <button className="tab-btn" data-tab="requests">予約リクエスト <span id="requests-badge" style={{ display: 'none', background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', marginLeft: '4px' }}></span></button>
                  <button className="tab-btn" data-tab="slots" data-feature="instant_booking">空き枠<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="checkin" data-feature="checkin_qr">チェックイン<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="events" data-feature="attendance_confirm">出欠確認<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="customer" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="customers">顧客管理（New Me Log・カルテ）</button>
                  <button className="tab-btn" data-tab="reviews">クチコミ</button>
                  <button className="tab-btn" data-tab="visit-settings">来店設定</button>
                  {/* 回数券は日々の売上集計ではなく「顧客ごとの発行・消化を管理する台帳」の
                      性質が強いため、売上カテゴリーから顧客管理カテゴリーへ移動
                      （でお指摘2026-09-13：「本当に売上タブ内が適切か？」）。
                      ロッカーも同じ理由（顧客ごとの契約管理台帳）で顧客管理に置く
                      （でお指摘2026-09-14）。 */}
                  <button className="tab-btn" data-tab="packages">回数券</button>
                  <button className="tab-btn" data-tab="lockers" data-feature="locker_rental">ロッカー管理<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="sales" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="sales">売上管理</button>
                  <button className="tab-btn" data-tab="pos" data-feature="pos">POS・在庫<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="store" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="profile">プロフィール</button>
                  <button className="tab-btn" data-tab="service">サービス設定</button>
                  <button className="tab-btn" data-tab="staff">スタッフ</button>
                  <button className="tab-btn" data-tab="shift" data-feature="shift_management">シフト管理<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="classes" data-feature="class_management">🏫 クラス管理<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="resources" data-feature="resource_management">部屋・設備<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="stories">体験談</button>
                  <button className="tab-btn" data-tab="landing">LP設定</button>
                  <button className="tab-btn" data-tab="publish">公開設定</button>
                </div>
                <div className="pd-panel-section" data-panel="growth" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="area-demand">エリア需要</button>
                  <button className="tab-btn" data-tab="scripts">接客の引き出し</button>
                  <button className="tab-btn" data-tab="ltv-cac">LTV/CAC</button>
                  <button className="tab-btn" data-tab="referral">紹介報酬</button>
                  <button className="tab-btn" data-tab="qr">紹介QR</button>
                  <button className="tab-btn" data-tab="member-referral" data-feature="referral_program">🎁 友達紹介<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="account" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="line-channel">LINE連携</button>
                  <button className="tab-btn" data-tab="billing">課金・プラン</button>
                  <button className="tab-btn" data-tab="features">機能設定</button>
                  <button className="tab-btn" data-tab="display-settings">表示設定</button>
                  <button type="button" className="tab-btn" id="pd-logout-btn" style={{ color: '#ef4444' }}>ログアウト</button>
                </div>
                <div className="pd-panel-section" data-panel="tutorial" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="tutorial">チュートリアル</button>
                </div>
              </div>
            </div>
          </div>

          {/* メイン */}
          <div className="pd-main">
            {/* ダッシュボードヘッダー（店舗名見出し・公開URL文字列・使い方リンク等）は
                段階的に縮小してきたが、最終的に「文字が薄すぎて読めないのに空間だけ
                占有している」状態になっていた（でお指摘2026-09-14：スマホ画面の写真で
                上部の空白を指摘。ヘッダー全体を撤去し、各タブの中身をtopbarのすぐ下から
                始まるようにした。店舗名・掲載者番号を確認したい時は「使い方」タブの
                「公開ページを確認」から辿れる）。 */}

            {/* 初回チュートリアル（タブごとに初回のみ表示） */}
            <div id="tab-tutorial-banner" />

        {/* 今日の業務：予約カレンダー・予約リクエスト・チェックイン・売上を1画面にまとめた
            日次ハブ（でお要望2026-09-12：「毎日やる業務」の流れを1つのページで見られるように）。
            サイドバー4グループの内容を横断してダイジェスト表示し、各カードの続きは
            対応するタブへワンクリックで移動できる。 */}
        <div className="tab-pane" id="tab-today">
          <div className="stack" style={{ gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>今日の予約</h3>
                <button type="button" className="btn btn-ghost" data-today-goto="calendar" style={{ fontSize: '12px', padding: '5px 10px' }}>カレンダーを開く</button>
              </div>
              <div id="today-reservations-list"><p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p></div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>未対応の予約リクエスト</h3>
                <button type="button" className="btn btn-ghost" data-today-goto="requests" style={{ fontSize: '12px', padding: '5px 10px' }}>予約リクエストを開く</button>
              </div>
              <div id="today-requests-list"><p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p></div>
            </div>

            <div className="card" id="today-checkin-card" style={{ padding: '20px', display: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>今日のチェックイン</h3>
                <button type="button" className="btn btn-ghost" data-today-goto="checkin" style={{ fontSize: '12px', padding: '5px 10px' }}>チェックインを開く</button>
              </div>
              <div id="today-checkin-list"><p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p></div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>今日の売上</h3>
                <button type="button" className="btn btn-ghost" data-today-goto="sales" style={{ fontSize: '12px', padding: '5px 10px' }}>売上管理を開く</button>
              </div>
              <div className="stat-card" style={{ display: 'inline-block', minWidth: '160px' }}>
                <div className="stat-value" id="today-sales-total">—</div>
                <div className="stat-label">本日の確定売上</div>
              </div>
            </div>
          </div>
        </div>

        {/* タブ：チュートリアル一覧（全タブの使い方まとめ） */}
        <div className="tab-pane" id="tab-tutorial">
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>チュートリアル</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                  各タブの使い方をまとめています。タブを初めて開いた時にも同じ内容が短く表示されます。
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a id="view-page-btn" href="#" target="_blank" className="btn btn-ghost" style={{ fontSize: '12px' }}>公開ページを確認 ↗</a>
                <a href="/business/provider-guide" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>📖 PDFで見る ↗</a>
                <button type="button" id="tutorial-unmute-btn" className="btn btn-ghost" style={{ fontSize: '12px' }}>各タブの案内を出し直す</button>
              </div>
            </div>
            {TUTORIAL_GROUPS.map(group => (
              <div key={group.heading} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', margin: '0 0 10px', color: 'rgba(26,20,16,0.9)' }}>{group.heading}</h3>
                <div className="stack" style={{ gap: '10px' }}>
                  {group.keys.map(key => {
                    const entry = TAB_TUTORIALS[key];
                    if (!entry) return null;
                    return (
                      <div key={key} style={{ border: '1px solid rgba(26,20,16,0.12)', borderRadius: '10px', padding: '12px 14px' }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '13px' }}>{entry.title}</p>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: '1.7' }} className="muted">
                          {entry.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* タブ①：概況 */}
        <div className="tab-pane" id="tab-stats">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-card"><div className="stat-value" id="stat-views">—</div><div className="stat-label">今月のページ閲覧数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-inquiries">—</div><div className="stat-label">今月の問い合わせ数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-referrals">—</div><div className="stat-label">紹介報酬（今月）</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card"><div className="stat-value" id="stat-approved">—</div><div className="stat-label">予約確定数（今月）</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-cvr">—</div><div className="stat-label">予約転換率</div><div style={{fontSize:'11px',color:'rgba(26,20,16,0.4)',marginTop:'2px'}}>確定÷問い合わせ</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-visited">—</div><div className="stat-label">来店完了数（今月）</div></div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Finemeからのメッセージ</h3>
            <p className="muted" style={{ margin: '0', lineHeight: '1.7' }}>順位は出しません。「合う人に届く」ことを大切にしています。<br />スコアは<strong>①AIマッチング</strong>（プロフィール文章をAIが読み取りユーザーの診断結果と照合）・<strong>②ページの充実度</strong>（写真・サービス・Before/After・スタッフ）・<strong>③ユーザーの変容軸との一致</strong>の3層で決まります。どれか1つではなく、ページ全体を丁寧に作ることが「合う人に届く」近道です。</p>
            <a href="/provider/philosophy" className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '12px', display: 'inline-block' }}>Finemeの考え方を見る</a>
          </div>

          {/* LINE通知設定カード */}
          <div className="card" style={{ padding: '20px', borderColor: '#06c755' }} id="line-connect-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>💬</span>
              <h3 style={{ margin: '0', fontSize: '15px' }}>LINE通知を設定する</h3>
            </div>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: '1.6' }}>
              予約リクエストが届いたとき、LINEに通知が届くようになります。<br />
              ボタンを押してLINEでログインするだけで自動設定されます。
            </p>
            <div id="line-connect-status">
              <a id="line-connect-btn" href="#" className="btn" style={{ background: '#06c755', color: '#fff', border: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                LINEと連携する
              </a>
            </div>
          </div>
        </div>

        {/* 予約カレンダー：申請制（承認済み）・即時予約どちらも同じ「確定した予約」として表示。
            hacomonoの管理画面カレンダーを参考にしたが、PC用グリッドをそのままスマホに縮めると
            縦横二重スクロールになって見づらいという今野くんの実地フィードバック（2026-09-11）を
            踏まえ、スマホでは日付ピル＋当日アジェンダのリスト表示に切り替える（CSSで出し分け）。 */}
        <div className="tab-pane active" id="tab-calendar">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>予約カレンダー</h2>
                <p className="muted" style={{ fontSize: '12px', margin: 0 }} id="cal-week-label">読み込み中…</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-ghost" id="cal-prev-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>← 前週</button>
                <button type="button" className="btn btn-ghost" id="cal-today-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>今週</button>
                <button type="button" className="btn btn-ghost" id="cal-next-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>次週 →</button>
              </div>
            </div>

            {/* 部屋・設備管理をONにした店舗のみ、スタッフ別/部屋別カレンダーを切り替えられる（でお要望2026-09-12） */}
            <div id="cal-view-toggle" style={{ display: 'none', gap: '6px', marginBottom: '10px' }}></div>

            {/* 日付ピル：PC・スマホ共通で選んだ1日を切り替える */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div id="cal-day-pills" className="cal-day-pills" style={{ flex: 1 }}></div>
              <button type="button" className="btn btn-ghost" id="cal-agenda-popup-btn" style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}>予約一覧</button>
            </div>

            {/* 時間×スタッフのグリッド（hacomono参考）。PC・スマホ共通の1つのグリッドで、
                横スクロールでスタッフ列を、縦スクロールで時間帯を確認する。640px以下は
                でお要望（2026-09-12）でスタッフ列を狭くし、画面内に3〜4人分見える形に調整。 */}
            <div id="cal-day-grid" className="cal-day-grid"></div>
            <p className="muted" style={{ fontSize: '11px', margin: '8px 0 0' }}>※ 所要時間はメニューごとの登録が無いため目安表示です（即時予約の枠はその枠の時間で正確に表示）</p>
          </div>
        </div>

        {/* 予約一覧ポップアップ：全スタッフ分を時系列でまとめて見たい時用（でお要望2026-09-12） */}
        <div id="cal-agenda-popup" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }} id="cal-agenda-popup-title">予約一覧</h3>
              <button type="button" className="btn btn-ghost" id="cal-agenda-popup-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <div id="cal-agenda-popup-list"></div>
          </div>
        </div>

        {/* 予約カレンダーから開く会員クイックビュー（氏名・連絡先・固定メモ・来店記録履歴） */}
        <div id="cal-member-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '16px' }} id="cal-modal-name"></h3>
                <p className="muted" style={{ fontSize: '12px', margin: 0 }} id="cal-modal-contact"></p>
              </div>
              <button type="button" className="btn btn-ghost" id="cal-modal-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <div id="cal-modal-reservation" style={{ margin: '12px 0', fontSize: '13px' }}></div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', margin: '12px 0' }}>
              <div className="form-field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                <label>担当スタッフ</label>
                <select id="cal-modal-staff-select"><option value="">指名なし</option></select>
              </div>
              <div className="form-field" id="cal-modal-resource-field" style={{ flex: '1 1 140px', marginBottom: 0, display: 'none' }}>
                <label>部屋・設備</label>
                <select id="cal-modal-resource-select"><option value="">未割当</option></select>
              </div>
              <button type="button" className="btn" id="cal-modal-assign-save" style={{ fontSize: '12px', padding: '8px 14px' }}>割り当てを保存</button>
            </div>
            <p id="cal-modal-assign-msg" className="muted" style={{ fontSize: '12px', margin: '-6px 0 0' }}></p>
            <div style={{ borderTop: '1px solid rgba(26,20,16,0.08)', paddingTop: '12px', marginTop: '12px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700 }}>固定メモ（お客様には表示されません）</p>
              <textarea id="cal-modal-note" style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '8px', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', boxSizing: 'border-box' }} disabled placeholder="読み込み中…"></textarea>
              <button type="button" className="btn" id="cal-modal-note-save" style={{ fontSize: '12px', padding: '6px 12px', marginTop: '6px' }} disabled>保存する</button>
              <span id="cal-modal-note-msg" className="muted" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
            </div>
            <div style={{ borderTop: '1px solid rgba(26,20,16,0.08)', paddingTop: '12px', marginTop: '12px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700 }}>来店記録履歴</p>
              <div id="cal-modal-history"><p className="muted" style={{ fontSize: '12px' }}>読み込み中…</p></div>
            </div>
          </div>
        </div>

        {/* カレンダーの空き枠タップから開く、電話予約等の手動予約作成モーダル
            （でお要望2026-09-14：「予約が入ってない枠をタップやクリックしたら、
            手動で予約を入れられるようにして。電話来た時とかに入れる時あるから」） */}
        <div id="cal-manual-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>この時間に追加</h3>
              <button type="button" className="btn btn-ghost" id="cal-manual-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <p className="muted" id="cal-manual-when" style={{ fontSize: '13px', margin: '0 0 10px', fontWeight: 700 }}></p>

            {/* 予約追加／休憩・外出ブロックのモード切替（でお要望2026-09-14：「スタッフが
                休憩だったり外出でいない時をブロックできるようにしてほしい」）。空き枠タップから
                開く同じモーダルの中で、目的別に入力項目を出し分ける。 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              <button type="button" className="btn" id="cal-manual-mode-reservation" style={{ fontSize: '12.5px', padding: '7px 12px', flex: 1 }}>予約を追加</button>
              <button type="button" className="btn btn-ghost" id="cal-manual-mode-block" style={{ fontSize: '12.5px', padding: '7px 12px', flex: 1 }}>休憩・外出をブロック</button>
            </div>

            <div id="cal-manual-reservation-fields">
              <div className="form-field">
                <label>お客様名 *</label>
                <input type="text" id="cal-manual-name" placeholder="例：山田 花子" />
              </div>
              <div className="form-field">
                <label>連絡先（電話番号など）</label>
                <input type="text" id="cal-manual-contact" placeholder="任意" />
              </div>

              {/* このお客様が実はFineme会員だった場合、その場で紐付けておくとカルテ・
                  来店履歴が引き継がれる（でお要望2026-09-14：「Finemeの会員情報と後からでも
                  その時でも紐づけられるように」）。任意項目のため未紐付けのままでも作成できる。 */}
              <div className="form-field">
                <label>Fineme会員と紐付ける（任意）</label>
                <div id="cal-manual-member-selected" style={{ display: 'none', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#eff6ff', borderRadius: '8px', fontSize: '13px' }}>
                  <span id="cal-manual-member-selected-name" style={{ fontWeight: 700, color: '#2563eb' }}></span>
                  <button type="button" className="btn btn-ghost" id="cal-manual-member-clear" style={{ fontSize: '11px', padding: '3px 8px', marginLeft: 'auto' }}>解除</button>
                </div>
                <div id="cal-manual-member-search-wrap">
                  <input type="text" id="cal-manual-member-search" placeholder="お名前または電話番号で検索（3文字以上）" />
                  <div id="cal-manual-member-results" style={{ marginTop: '4px' }}></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div className="form-field" id="cal-manual-staff-field" style={{ flex: '1 1 140px' }}>
                <label id="cal-manual-staff-label">担当スタッフ</label>
                <select id="cal-manual-staff"><option value="">指名なし</option></select>
              </div>
              <div className="form-field" id="cal-manual-resource-field" style={{ flex: '1 1 140px', display: 'none' }}>
                <label>部屋・設備</label>
                <select id="cal-manual-resource"><option value="">未割当</option></select>
              </div>
            </div>
            <div id="cal-manual-reservation-fields-2" className="form-field">
              <label>メモ</label>
              <textarea id="cal-manual-note" style={{ width: '100%', minHeight: '50px', fontSize: '13px', padding: '8px', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="任意"></textarea>
            </div>
            <div id="cal-manual-block-fields" style={{ display: 'none' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: '1 1 120px' }}><label>開始</label><input type="time" id="cal-manual-block-start" /></div>
                <div className="form-field" style={{ flex: '1 1 120px' }}><label>終了</label><input type="time" id="cal-manual-block-end" /></div>
              </div>
              <div className="form-field">
                <label>理由（任意）</label>
                <input type="text" id="cal-manual-block-reason" placeholder="例：休憩／外出／早退" />
              </div>
            </div>
            <button type="button" className="btn" id="cal-manual-save" style={{ fontSize: '13px', padding: '9px 18px', width: '100%' }}>この内容で予約を追加</button>
            <p id="cal-manual-msg" className="muted" style={{ fontSize: '12px', margin: '8px 0 0' }}></p>
          </div>
        </div>

        {/* タブ②：予約リクエスト */}
        <div className="tab-pane" id="tab-requests">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>予約リクエスト</h2>
              <span style={{ fontSize: '12px', color: 'rgba(26,20,16,0.55)' }} id="req-filter-count"></span>
            </div>

            {/* 絞り込みバー */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', padding: '12px 14px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#111', textShadow: 'none' }}>
              <input
                id="req-filter-kw"
                type="text"
                placeholder="名前・メモで検索"
                autoComplete="off"
                defaultValue=""
                style={{ flex: '1 1 140px', padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
              <select
                id="req-filter-status"
                style={{ padding: '7px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
              >
                <option value="">すべてのステータス</option>
                <option value="pending">返答待ち</option>
                <option value="counter_proposed">代替提案済み</option>
                <option value="approved">承認済み</option>
                <option value="visited">来店確認済み</option>
                <option value="rejected">お断り</option>
              </select>
              <button
                id="req-filter-reset"
                className="btn btn-ghost"
                style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
              >
                リセット
              </button>
            </div>

            <div id="requests-list"><p className="muted">読み込み中…</p></div>
          </div>

          {/* コンパクトな行をクリックすると詳細（希望日時・メニュー・メッセージ・承認/お断り等の
              操作）がポップアップで開く（でお要望2026-09-12：顧客管理タブと同じ方式に）。 */}
          <div id="request-detail-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
            <div className="cal-modal-card" style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                <button type="button" className="btn btn-ghost" id="request-modal-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
              </div>
              <div id="request-detail-modal-body"></div>
            </div>
          </div>
        </div>

        {/* タブ③：プロフィール */}
        <div className="tab-pane" id="tab-profile">
          {/* ページ完成度スコア */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: '16px' }}>
            <div id="page-score-bar">
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.5)' }}>ページ完成度を計算中…</div>
            </div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>基本情報</h2>
            <form id="profile-form">
              <div className="form-field"><label>掲載名 *</label><input name="name" required /></div>
              <div className="form-field">
                <label>キャッチコピー（ページ冒頭に大きく表示されます）</label>
                <input name="catchphrase" placeholder="例: マッチングアプリで勝てる顔をつくる、3ヶ月の変容プログラム" />
                <small className="muted">短く・強く・誰に向けているかが一目でわかる一文が効果的です</small>
              </div>
              <div className="form-field">
                <label>こんな方に向いています（1行ずつ書くと番号リストで表示されます）</label>
                <textarea name="target_desc" placeholder={"マッチングアプリの写真を改善したい\n何度も挫折したが今度こそ変わりたい\n自分が何をすべきかわからない"} style={{ minHeight: '100px' }}></textarea>
                <small className="muted">改行で区切ると①②③のカードとして掲載者ページに表示されます</small>
              </div>
              <div className="form-field">
                <label>このサービスが大切にしていること（引用文として大きく表示されます）</label>
                <textarea name="philosophy" placeholder="あなたのサービスの考え方・信念・強みを自分の言葉で。ページ上では黒背景の引用文スタイルで表示されます。"></textarea>
              </div>
              <div className="form-field" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🧭 <span>変容の旅を始めようとしている方への言葉</span></label>
                <textarea name="guide_message" placeholder="ここから変わろうとしているあなたへ、ガイドとして一言あれば。&#10;例: 「外見を変えることは、自分の優先順位を自分で決めること」だと思っています。まず話を聞かせてください。" style={{ minHeight: '90px' }}></textarea>
                <small className="muted">掲載者ページの最上部に「ガイドからのひと言」として表示されます。サービス説明ではなく、人としてのあなたが伝わる言葉を。</small>
              </div>
              <div className="form-field">
                <label>プロフィール写真（ヒーロー内に円形アバターとして表示）</label>
                <div id="photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="photo-preview" src="" alt="現在の写真" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択・変更（5MB以内・jpg/png/webp）</button>
                <p id="photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" />
              </div>
              <div className="form-field">
                <label>ヒーロー画像（ページ上部の背景バナー）</label>
                <div id="cover-photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="cover-photo-preview" src="" alt="カバー画像" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="cover-photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="cover-photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>🖼️ カバー画像を選択（横長比推奨・jpg/png/webp）</button>
                <p id="cover-photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <small className="muted">ページ上部の大きな背景として使用されます。施設・スタジオの雰囲気が伝わる横長写真を推奨。未設定の場合は黒グラデーションになります。</small>
                <input type="hidden" name="cover_image_url" />
              </div>
              {/* ── 掲載者情報・信頼シグナル ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(26,20,16,0.12)' }}>掲載者情報・信頼シグナル</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>ページ上部の「クイックファクト」として横一列で表示されます。同じカテゴリの他ガイドとの比較に直結します。</small>
              {/* ── 所在地 ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(26,20,16,0.12)' }}>所在地・アクセス</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>
                入力した住所はAIマッチングの距離計算に使用されます。番地まで入力するほど精度が上がります。ユーザーには最寄り駅のみ表示されます。
              </small>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field">
                  <label>都道府県 <span style={{color:'#dc2626',fontSize:'12px'}}>*</span></label>
                  <select name="prefecture">
                    <option value="">選択してください</option>
                    {PREFECTURES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>市区町村</label>
                  <select id="profile-city-select" name="city">
                    <option value="">都道府県を先に選択</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>番地以下（住所詳細）</label>
                <input name="address" placeholder="例: 渋谷区渋谷1-2-3 ○○ビル401号室" />
                <small className="muted">公開ページには表示されません。距離マッチング精度向上のみに使用します。</small>
              </div>
              <div className="form-field">
                <label>最寄り駅・アクセス（公開される情報）</label>
                <input name="nearest_station" placeholder="例: 渋谷駅から徒歩5分" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input type="checkbox" name="online_available" id="online_available" />
                <label htmlFor="online_available" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>オンライン対応あり（バッジ表示）</label>
              </div>

              {/* ── 料金・支払い ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(26,20,16,0.12)' }}>料金・支払い</h3>
              <div className="form-field">
                <label>最低価格（円）</label>
                <input name="price_from" type="number" placeholder="例: 10000" />
                <small className="muted">検索ページでの価格フィルターに使用されます</small>
              </div>
              <div className="form-field">
                <label>支払い方法（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="cash" />現金</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="credit" />クレジットカード</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="paypay" />PayPay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="rakuten_pay" />楽天Pay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="line_pay" />LINE Pay</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="bank" />銀行振込</label>
                  <label className="checkbox-item"><input type="checkbox" name="payment_methods" value="other" />その他</label>
                </div>
              </div>

              <div className="form-field">
                <label>他サービスとの違い・このガイドだけの強み（最上部にゴールドで表示）</label>
                <textarea name="unique_strengths" placeholder={"例: マッチングアプリの写真撮影と外見コーチングをセットで提供できる唯一のサービスです。\n撮影から約1週間でプロフィール改善の結果を実感できます。"}></textarea>
                <small className="muted">同カテゴリで比較されたとき最初に目に入る場所です。「なぜここを選ぶか」を一言で書いてください。</small>
              </div>
              {[1, 2, 3].map(slot => (
                <div key={slot} className="form-field">
                  <label>施設・スタジオ写真 {['①','②','③'][slot-1]}</label>
                  <div id={`facility-photo-preview-wrap-${slot}`} style={{ marginBottom: '8px', display: 'none' }}>
                    <img id={`facility-photo-preview-${slot}`} src="" alt={`施設写真${slot}`} style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id={`facility-img-input-${slot}`} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id={`facility-img-btn-${slot}`} className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択（5MB以内・jpg/png/webp）</button>
                  <p id={`facility-img-msg-${slot}`} className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                  <input type="hidden" name={`facility_photo_${slot}`} />
                </div>
              ))}

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ④：スタッフ */}
        <div className="tab-pane" id="tab-staff">
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>スタッフ管理</h2>
                <p className="muted" style={{ margin: '0', fontSize: '12px', lineHeight: '1.6' }}>
                  個人でやっている方は、ご自身を「スタッフ」として登録してください。<br />
                  掲載者公開ページの「スタッフ紹介」欄に表示されます。
                </p>
              </div>
              <button type="button" className="btn" id="btn-add-staff" style={{ fontSize: '13px', padding: '7px 14px', flexShrink: '0' }}>＋ 追加</button>
            </div>
            <div id="staff-list"><p className="muted">読み込み中…</p></div>
          </div>

          {/* スタッフ追加・編集フォーム */}
          <div className="card" id="staff-edit-card" style={{ padding: '24px', display: 'none' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px' }} id="staff-edit-title">スタッフを追加</h3>
            <form id="staff-edit-form">
              <div className="form-field"><label>名前 *</label><input name="name" required placeholder="例: 山田 太郎" /></div>
              <div className="form-field"><label>役職・肩書き</label><input name="role" placeholder="例: パーソナルトレーナー / 代表" /></div>
              <div className="form-field">
                <label>写真</label>
                <div id="staff-photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="staff-photo-preview" src="" alt="スタッフ写真" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #e5e7eb' }} />
                </div>
                <input type="file" id="staff-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="staff-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択（5MB以内）</button>
                <p id="staff-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" id="staff-photo-url" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field"><label>経験年数</label><input name="experience_years" type="number" min="0" placeholder="例: 5" /></div>
                <div className="form-field"><label>表示順（小さい順）</label><input name="sort_order" type="number" min="0" defaultValue="0" /></div>
              </div>
              <div className="form-field"><label>資格・経歴</label><textarea name="credentials" placeholder={"例: NSCA認定パーソナルトレーナー\n元プロサッカー選手 8年"} style={{ minHeight: '80px' }}></textarea></div>
              <div className="form-field"><label>自己紹介・一言メッセージ</label><textarea name="bio" placeholder="例: 「外見を整えることは、生き方を整えること」。一人ひとりのペースで、一緒に歩んでいきます。" style={{ minHeight: '100px' }}></textarea></div>
              <div className="form-field">
                <label>得意軸（複数選択可）</label>
                <div className="checkbox-group" id="staff-strong-axes">
                  <label className="checkbox-item"><input type="checkbox" value="eyebrow" /> 眉</label>
                  <label className="checkbox-item"><input type="checkbox" value="skin" /> 肌</label>
                  <label className="checkbox-item"><input type="checkbox" value="hair" /> ヘア</label>
                  <label className="checkbox-item"><input type="checkbox" value="expression" /> 表情</label>
                  <label className="checkbox-item"><input type="checkbox" value="posture" /> 姿勢</label>
                  <label className="checkbox-item"><input type="checkbox" value="body" /> 体型</label>
                  <label className="checkbox-item"><input type="checkbox" value="fashion" /> ファッション</label>
                </div>
              </div>
              <div className="form-field">
                <label>得意タイプ（任意・カンマ区切り）</label>
                <input name="strong_types_text" placeholder="例: 知的クール, 信頼アクティブ" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input type="checkbox" name="is_featured" id="staff-is-featured" />
                <label htmlFor="staff-is-featured" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>担当スタッフとして優先表示する</label>
              </div>
              {/* スタッフ指名予約（hacomono/STORES網羅計画 Phase 1）。指名なしでもbookable=trueなら
                  予約時の候補に出る。指名料は0円なら「無料」表示、0より大きければ指名料として案内する。 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input type="checkbox" name="bookable" id="staff-bookable" defaultChecked />
                <label htmlFor="staff-bookable" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>予約時の指名候補に出す</label>
              </div>
              <div className="form-field"><label>指名料（円・任意）</label><input name="booking_fee" type="number" min="0" placeholder="0（無料）" /></div>
              <input type="hidden" name="_staff_id" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn">保存</button>
                <button type="button" className="btn btn-ghost" id="staff-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
        </div>

        {/* シフト管理（でお要望2026-09-13）。スタッフが各自のスマホから出勤・休み希望を
            提出し（Finemeアカウント不要・推測不可能なリンクで本人確認）、店舗側で確認・
            自動作成できる。ルール（希望をそのまま入れるか、曜日・時間帯ごとの必要人数に
            沿って優先度で調整するか）は店舗ごとに変更できる。「機能設定」タブでONにした
            店舗のみ表示。 */}
        <div className="tab-pane" id="tab-shift">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>シフト管理</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                スタッフが各自のスマホから次の期間の出勤・休み希望を提出できます。提出用のリンクは下の「スタッフごとの提出用リンク」からコピーして、LINE等で個別に送ってください。
              </p>
            </div>

            <div id="shift-staff-links" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>期間を作成</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}><label>開始日 *</label><input type="date" id="shift-period-start" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>終了日 *</label><input type="date" id="shift-period-end" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>希望の提出締切（任意）</label><input type="date" id="shift-period-deadline" /></div>
              <button type="button" className="btn" id="shift-period-add-btn">この期間を作成</button>
            </div>
            <div id="shift-period-list" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>シフト作成ルール</h3>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>作り方</label>
              <select id="shift-rule-type-select">
                <option value="as_requested">出勤希望をそのまま全部入れる</option>
                <option value="staffing_target">時間帯パターンの必要人数に沿って優先度で調整する</option>
              </select>
            </div>
            <div>
              <button type="button" className="btn" id="shift-rule-save-btn">ルールを保存</button>
              <span id="shift-rule-save-msg" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
            </div>
          </div>

          {/* 時間帯パターン（でお要望2026-09-14：曜日ごとに1個ずつ作るのは大変。
              時間帯×必要人数のセットを「パターン」として先に作っておき、期間内の
              各日付にまとめて一括で割り当てる方式に変更）。 */}
          <div id="shift-patterns-wrap" className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px', display: 'none' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>時間帯パターン</h3>
            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>時間帯×必要人数の組み合わせをパターンとして登録します。パターンを作ったら、上で作成した期間の一覧から期間を開き、その中の「日付ごとの必要人数パターン」でカレンダーの日付にまとめて割り当ててください。</p>
            <div id="shift-patterns-list" className="stack" style={{ gap: '10px' }}>読み込み中…</div>
            <div style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '14px' }}>
              <div className="form-field" style={{ marginBottom: '10px' }}><label>パターン名</label><input type="text" id="shift-pattern-name" placeholder="例：平日パターン" /></div>
              <div id="shift-pattern-slot-rows" className="stack" style={{ gap: '8px', marginBottom: '10px' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: '8px', alignItems: 'end', marginBottom: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}><label>開始</label><input type="time" id="shift-pattern-slot-start" /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>終了</label><input type="time" id="shift-pattern-slot-end" /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>必要人数</label><input type="number" id="shift-pattern-slot-required" min="1" defaultValue="1" /></div>
                <button type="button" className="btn btn-ghost" id="shift-pattern-slot-add-btn">＋時間帯を追加</button>
              </div>
              <button type="button" className="btn" id="shift-pattern-save-btn">このパターンを保存</button>
              <span id="shift-pattern-save-msg" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
            </div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>スタッフの優先度</h3>
            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>お店を回す上での人員配置の方針をそのまま反映します（店長・社員を高く、アルバイトは低め、等）。各時間帯の必要人数に対して希望者が多い場合、ポイントが高い人から優先的にその枠へ採用されます。</p>
            <div id="shift-priorities-list" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
            <div>
              <button type="button" className="btn btn-ghost" id="shift-priorities-save-btn">優先度を保存</button>
              <span id="shift-priorities-save-msg" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
            </div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px', display: 'none' }} id="shift-detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }} id="shift-detail-title">期間の詳細</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost" id="shift-generate-btn">⚙️ 自動作成</button>
                <button type="button" className="btn" id="shift-confirm-btn">この期間を確定する</button>
              </div>
            </div>
            <div id="shift-generate-warnings"></div>

            {/* 日付ごとのパターン割当（でお要望2026-09-14：1日ずつ作るのは大変なので、
                日付を複数選んでパターンをまとめて一括適用できるように）。 */}
            <div id="shift-day-patterns-wrap" style={{ display: 'none' }}>
              <h4 style={{ margin: '8px 0 8px', fontSize: '13px' }}>日付ごとの必要人数パターン</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}><label>適用するパターン</label><select id="shift-day-pattern-select"></select></div>
                <button type="button" className="btn btn-ghost" id="shift-day-pattern-select-all-btn">全日選択</button>
                <button type="button" className="btn btn-ghost" id="shift-day-pattern-select-none-btn">選択解除</button>
                <button type="button" className="btn" id="shift-day-pattern-apply-btn">選んだ日にまとめて適用</button>
                <span id="shift-day-pattern-msg" style={{ fontSize: '12px' }}></span>
              </div>
              <div id="shift-day-pattern-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: '6px', marginBottom: '10px' }}></div>
            </div>

            <h4 style={{ margin: '8px 0 0', fontSize: '13px' }}>提出された希望</h4>
            <div id="shift-requests-summary" className="stack" style={{ gap: '4px' }}>読み込み中…</div>

            <h4 style={{ margin: '8px 0 0', fontSize: '13px' }}>シフト表</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '8px', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}><label>スタッフ</label><select id="shift-entry-staff"></select></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>日付</label><input type="date" id="shift-entry-date" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>開始</label><input type="time" id="shift-entry-start" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>終了</label><input type="time" id="shift-entry-end" /></div>
              <button type="button" className="btn btn-ghost" id="shift-entry-add-btn">＋手動で追加</button>
            </div>
            <div id="shift-entries-list" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
          </div>
        </div>

        {/* クラス管理（スクール業態特化、でお要望2026-09-14：hacomono機能比較で判明した
            不足機能。「在籍制・定員制クラスの管理や進級結果の管理」相当）。「機能設定」で
            ONにした店舗のみ表示。既存の予約カレンダーとは独立した名簿・進級記録機能。 */}
        <div className="tab-pane" id="tab-classes">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>🏫 クラス管理</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>ダンス・スイミング等の定員制クラスの名簿・進級を管理します。</p>
              </div>
              <button type="button" className="btn" id="cls-add-btn">＋ クラスを追加</button>
            </div>

            <div id="cls-edit-card" style={{ display: 'none', background: 'var(--color-bg)', borderRadius: '12px', padding: '16px' }}>
              <h3 id="cls-edit-title" style={{ margin: '0 0 10px', fontSize: '14px' }}>クラスを追加</h3>
              <form id="cls-edit-form">
                <input type="hidden" name="_class_id" />
                <div className="form-field"><label>クラス名 *</label><input name="name" required /></div>
                <div className="form-field"><label>説明</label><input name="description" placeholder="任意" /></div>
                <div className="form-field"><label>定員</label><input name="capacity" type="number" min="1" placeholder="任意（空欄なら無制限）" /></div>
                <div className="form-field"><label>進級の段階（カンマ区切り。例：白帯,黄帯,緑帯,黒帯）</label><input name="level_labels" placeholder="任意" /></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn">保存する</button>
                  <button type="button" className="btn btn-ghost" id="cls-cancel-btn">キャンセル</button>
                </div>
              </form>
            </div>

            <div id="cls-list" className="stack" style={{ gap: '10px' }}>読み込み中…</div>
          </div>

          {/* 選択中のクラスの名簿・進級管理 */}
          <div id="cls-roster-card" className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px', display: 'none' }}>
            <h3 id="cls-roster-title" style={{ margin: 0, fontSize: '15px' }}></h3>
            <form id="cls-enroll-form" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0, flex: '1 1 160px' }}><label>生徒名 *</label><input name="student_name" required /></div>
              <button type="submit" className="btn">＋ 生徒を追加</button>
            </form>
            <div id="cls-roster-list" className="stack" style={{ gap: '8px' }}></div>
          </div>
        </div>

        {/* 部屋・設備（hacomono/STORES網羅計画 Phase 1）。「機能設定」タブでONにした店舗のみ表示。
            今野くんの実地メモ：スタッフだけブロックして部屋のブロックを忘れダブルブッキングが
            起きていた——スタッフとは独立に部屋/設備を管理し、即時予約の枠でセットにする。 */}
        <div className="tab-pane" id="tab-resources">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>部屋・設備</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>個室やマシンなど、予約に紐づく設備を登録します。</p>
              </div>
              <button className="btn" id="btn-add-resource">＋ 追加</button>
            </div>
            <div id="resource-edit-card" className="card" style={{ display: 'none', padding: '18px', background: '#f9fafb' }}>
              <h3 id="resource-edit-title" style={{ fontSize: '14px', margin: '0 0 12px' }}>部屋・設備を追加</h3>
              <form id="resource-edit-form">
                <div className="form-field"><label>名前 *</label><input name="name" required placeholder="例: 個室A / マシン1" /></div>
                <div className="form-field">
                  <label>種類</label>
                  <select name="type" defaultValue="room">
                    <option value="room">部屋</option>
                    <option value="equipment">設備・マシン</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 16px' }}>
                  <input type="checkbox" name="active" id="resource-active" defaultChecked />
                  <label htmlFor="resource-active" style={{ margin: 0, fontSize: '13px', fontWeight: 400 }}>予約可能にする</label>
                </div>
                <input type="hidden" name="_resource_id" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn">保存</button>
                  <button type="button" className="btn btn-ghost" id="resource-cancel-btn">キャンセル</button>
                </div>
              </form>
            </div>
            <div id="resource-list">読み込み中…</div>
          </div>
        </div>

        {/* 空き枠（即時予約モード用）。hacomono/STORES網羅計画 Phase 1。 */}
        <div className="tab-pane" id="tab-slots">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>空き枠（即時予約）</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                ここに登録した枠は、お客様が選んだ時点でその場で予約確定します（店舗の承認は不要）。<br />
                OFFにすると、この機能を使わずに従来通りの申請制のままにできます。
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', width: 'fit-content' }}>
              <input type="checkbox" id="slots-instant-toggle" style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>即時予約をこの店舗で使う</span>
              <span id="slots-instant-toggle-status" style={{ fontSize: '12px' }}></span>
            </label>

            {/* 即時予約と独立して、従来の申請制（第1〜3希望→店舗が承認/代替提案）自体を
                受け付けるかどうかも切り替えられるように（でお要望2026-09-14）。デフォルトON。 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', width: 'fit-content' }}>
              <input type="checkbox" id="slots-request-toggle" style={{ width: '18px', height: '18px' }} defaultChecked />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>予約リクエスト（第1〜3希望→承認）を受け付ける</span>
              <span id="slots-request-toggle-status" style={{ fontSize: '12px' }}></span>
            </label>

            {/* 店頭タブレット予約ボード（でお要望2026-09-14：hacomono「予約ボード」相当機能）。
                機能設定タブでbooking_boardをONにすると、店内設置タブレットで開くURLが
                ここに出る。即時予約もONでないと枠が出ないため両方必須。 */}
            <div id="slots-board-link-box" style={{ display: 'none', padding: '12px 16px', background: '#eff6ff', borderRadius: '10px', fontSize: '13px' }}>
              📱 店頭タブレット予約ボード：<a id="slots-board-link" href="#" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}></a>
              <span className="muted" style={{ display: 'block', fontSize: '11.5px', marginTop: '4px' }}>店内のタブレットでこのURLを開いてブックマークすると、お客様がスタッフを介さず自分で予約できます。</span>
            </div>

            {/* 同時に保持できる予約数の上限（でお要望2026-09-14）。既定は1件＝来店するまで
                次の予約を取れない。上限を増やしたい店舗向けに変更可能にする。 */}
            <div className="form-field" style={{ marginBottom: 0, maxWidth: '280px' }}>
              <label>1人のお客様が同時に持てる予約数の上限</label>
              <input type="number" id="booking-limit-input" min="1" style={{ width: '100px' }} />
              <span className="muted" style={{ fontSize: '11.5px' }}>既定は1件（来店するまで次の予約は取れません）</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn btn-ghost" id="booking-limit-save-btn" style={{ fontSize: '12px', padding: '6px 14px' }}>保存する</button>
              <span id="booking-limit-msg" className="muted" style={{ fontSize: '12px' }}></span>
            </div>
          </div>

          {/* 営業時間からの自動生成（でお要望2026-09-14：空き枠を1つずつ手動登録させる
              フローは非効率。営業時間さえ分かれば自動で生成できるはず、との指摘）。 */}
          <div className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>営業時間から自動生成</h3>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                曜日ごとの営業時間と枠の刻み幅を設定すると、即時予約ONの間は毎日自動で向こう2週間分の空き枠が補充されます（スタッフ指名予約がONの店舗は、対応可能な各スタッフの枠として生成します）。
              </p>
            </div>
            {/* 曜日ごとに1つずつ入力するのが面倒との指摘に対応：基準時刻を1回入力して
                「全曜日に反映」で一括コピー（でお要望2026-09-14）。休みの曜日は上書きしない。 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
              <span className="muted" style={{ fontSize: '12px' }}>まとめて設定：</span>
              <input type="time" id="bh-bulk-open" style={{ width: '110px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
              <span className="muted">〜</span>
              <input type="time" id="bh-bulk-close" style={{ width: '110px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
              <button type="button" className="btn btn-ghost" id="bh-bulk-apply-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>全曜日に反映</button>
            </div>
            <div id="business-hours-editor" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
            <div className="form-field" style={{ marginBottom: 0, maxWidth: '220px' }}>
              <label>枠の刻み幅</label>
              <select id="slot-duration-select">
                <option value="10">10分</option>
                <option value="15">15分</option>
                <option value="20">20分</option>
                <option value="30">30分</option>
                <option value="45">45分</option>
                <option value="60">60分</option>
                <option value="90">90分</option>
                <option value="120">120分</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn" id="business-hours-save-btn">営業時間を保存</button>
              <button type="button" className="btn btn-ghost" id="slots-generate-now-btn">今すぐ枠を生成する（向こう2週間）</button>
              <span id="business-hours-save-msg" style={{ fontSize: '12px', alignSelf: 'center' }}></span>
            </div>
          </div>

          {/* 空き枠の一覧・管理（でお指摘2026-09-14：「設定した空き枠が下にバーって出て
              めっちゃスクロール必要だし、編集もできないし、スタッフや部屋ごとの絞り込みも
              できない」への全面改修）。月まとめの全件リストではなく1日ずつナビゲートし、
              スタッフ・部屋で絞り込み、日単位でまとめて締切/削除できるようにする。
              個々の枠も時間・定員をその場で編集できる。 */}
          <div className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>空き枠の一覧・管理</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>1日ずつ表示します。スタッフ・部屋で絞り込んだり、日ごとまとめて締切・削除できます。</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select id="slot-filter-staff" style={{ fontSize: '12.5px', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="">スタッフ：すべて</option></select>
              <select id="slot-filter-resource" style={{ fontSize: '12.5px', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="">部屋・設備：すべて</option></select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" className="btn btn-ghost" id="slot-nav-prev" style={{ fontSize: '12px', padding: '6px 10px' }}>← 前の7日</button>
              <button type="button" className="btn btn-ghost" id="slot-nav-today" style={{ fontSize: '12px', padding: '6px 10px' }}>今日</button>
              <button type="button" className="btn btn-ghost" id="slot-nav-next" style={{ fontSize: '12px', padding: '6px 10px' }}>次の7日 →</button>
            </div>
            <div id="slot-date-pills" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
              <strong id="slot-selected-date-label" style={{ fontSize: '13px' }}></strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost" id="slot-bulk-open" style={{ fontSize: '11.5px', padding: '5px 10px' }}>この日を全て開放</button>
                <button type="button" className="btn btn-ghost" id="slot-bulk-close" style={{ fontSize: '11.5px', padding: '5px 10px' }}>この日を全て締切</button>
                <button type="button" className="btn btn-ghost" id="slot-bulk-delete" style={{ fontSize: '11.5px', padding: '5px 10px', color: '#ef4444' }}>この日を全て削除</button>
              </div>
            </div>

            <div id="slot-list">読み込み中…</div>

            <details style={{ marginTop: '4px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>＋ 個別に1件だけ追加する（特別対応など）</summary>
              <form id="slot-add-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '10px', alignItems: 'end', marginTop: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}><label>日付 *</label><input name="date" type="date" id="slot-add-date" required /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>開始 *</label><input name="start_time" type="time" required /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>終了 *</label><input name="end_time" type="time" required /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>定員</label><input name="capacity" type="number" min="1" defaultValue="1" /></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>スタッフ（任意）</label><select name="staff_id" id="slot-staff-select"><option value="">指定なし</option></select></div>
                <div className="form-field" style={{ marginBottom: 0 }}><label>部屋・設備（任意）</label><select name="resource_id" id="slot-resource-select"><option value="">指定なし</option></select></div>
                <button type="submit" className="btn" style={{ height: '40px' }}>枠を追加</button>
              </form>
            </details>
          </div>
        </div>

        {/* タブ⑤：サービス設定 */}
        <div className="tab-pane" id="tab-service">

          {/* Finemeユーザー像バナー */}
          <div className="card" style={{ padding: '20px 22px', marginBottom: '16px', background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', border: '1px solid #c7d2fe' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Finemeに来るユーザーはどんな人か？</div>
            <p style={{ fontSize: '13px', color: '#1e1b4b', fontWeight: '600', margin: '0 0 12px', lineHeight: '1.7' }}>
              Finemeのユーザーは<strong>「Me Scanを受けた、変わる意志が決まっている人」</strong>です。<br />
              自分の<strong>コンパス軸（最優先の変容テーマ）</strong>を持ってあなたのページを訪れます。
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '8px', marginBottom: '12px' }}>
              {[
                { icon: '🧬', text: 'Me Scanで8軸をスキャン済み' },
                { icon: '🧭', text: 'コンパス軸（最優先テーマ）が決まっている' },
                { icon: '💬', text: '「来た道（タイプ）」が明確' },
                { icon: '🎯', text: '対応軸が一致すれば優先表示' },
              ].map(item => (
                <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: 'rgba(26,20,16,0.04)', borderRadius: '10px', padding: '10px' }}>
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', fontWeight: '600' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#4f46e5', margin: '0', fontWeight: '700' }}>
              → 各プログラムに「対応軸」を設定すると、その軸のコンパスを持つユーザーに優先表示されます
            </p>
          </div>

          {/* サービス（メニュー）一覧 */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>サービス・メニュー</h2>
              <button type="button" className="btn" id="btn-add-service" style={{ fontSize: '13px', padding: '7px 14px' }}>＋ 追加</button>
            </div>
            <div id="services-list"><p className="muted">読み込み中…</p></div>
          </div>
          {/* サービス追加・編集フォーム */}
          <div className="card" id="service-edit-card" style={{ padding: '24px', marginBottom: '16px', display: 'none' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px' }} id="service-edit-title">サービスを追加</h3>
            <form id="service-edit-form">
              <div className="form-field"><label>サービス名 *</label><input name="name" required placeholder="例: 初回体験コース 60分" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field"><label>価格（円）*</label><input name="price" type="number" required placeholder="5000" /></div>
                <div className="form-field"><label>所要時間</label><input name="duration" placeholder="例: 60分" /></div>
              </div>

              {/* サービスカテゴリ（L14） */}
              <div className="form-field">
                <label>サービスカテゴリ</label>
                <select name="category">
                  <option value="">選択しない</option>
                  <option value="gym">💪 ジム・パーソナルトレーニング</option>
                  <option value="makeup">💄 メイク・コスメ</option>
                  <option value="hair">💇 ヘア・美容院</option>
                  <option value="colordiagnosis">🎨 パーソナルカラー診断</option>
                  <option value="bonediagnosis">🔍 骨格診断</option>
                  <option value="diagnosis">📋 診断（総合・イメコン）</option>
                  <option value="fashion">👔 ファッション・スタイリング</option>
                  <option value="photo">📷 プロフィール写真・撮影</option>
                  <option value="marriage">💍 婚活・マッチングサポート</option>
                  <option value="eyebrow">✏️ 眉毛サロン</option>
                  <option value="hairremoval">🪒 脱毛</option>
                  <option value="esthetic">✨ エステ・フェイシャル</option>
                  <option value="whitening">😁 歯のホワイトニング</option>
                  <option value="orthodontics">🦷 歯列矯正</option>
                  <option value="nail">💅 ネイル</option>
                  <option value="aga">💊 AGA・薄毛治療</option>
                  <option value="consulting">🗣 コンサルティング</option>
                </select>
                <small className="muted">検索ページでのカテゴリ絞り込みに使われます</small>
              </div>

              {/* 対応軸（新） */}
              <div className="form-field">
                <label>対応軸（Me Scan 8軸）</label>
                <select name="target_axis">
                  <option value="">選択しない</option>
                  <option value="body">💪 体型・ボディ</option>
                  <option value="eyebrow">✏️ 眉</option>
                  <option value="fashion">👔 服・コーデ</option>
                  <option value="hair">💇 髪・ヘア</option>
                  <option value="skin">✨ 肌・エステ</option>
                  <option value="hairremoval">🪒 脱毛・ムダ毛</option>
                  <option value="teeth">😁 歯・口元</option>
                  <option value="nail">💅 爪</option>
                </select>
                <small className="muted">設定すると、その軸のコンパスを持つユーザーのプログラム一覧で最上位に表示されます</small>
              </div>

              {/* 変容の約束（新） */}
              <div className="form-field">
                <label>変容の約束（一言キャッチコピー）</label>
                <input name="transformation_promise" placeholder="例: 骨格から計算した眉で、顔の印象が一変します" />
                <small className="muted">掲載者ページのプログラムカードで「」に囲まれて表示されます</small>
              </div>

              {/* Before / After（新） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field">
                  <label>受ける前の状態（Before）</label>
                  <textarea name="before_text" placeholder="例: 眉の形がわからず、なんとなく描いている" style={{ minHeight: '80px' }}></textarea>
                </div>
                <div className="form-field">
                  <label>受けた後の状態（After）</label>
                  <textarea name="after_text" placeholder="例: 骨格に合った眉で、顔全体が引き締まって見える" style={{ minHeight: '80px' }}></textarea>
                </div>
              </div>

              {/* Before/After 画像（任意） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                <div className="form-field">
                  <label style={{ fontSize: '11px' }}>Before 画像（任意）</label>
                  <div id="service-before-img-wrap" style={{ marginBottom: '6px', display: 'none' }}>
                    <img id="service-before-img-preview" src="" alt="Before" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id="service-before-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id="service-before-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>📷 画像追加</button>
                  <p id="service-before-img-msg" className="muted" style={{ fontSize: '11px', margin: '3px 0 0', display: 'none' }}></p>
                  <input type="hidden" name="before_image_url" id="service-before-image-url" />
                </div>
                <div className="form-field">
                  <label style={{ fontSize: '11px' }}>After 画像（任意）</label>
                  <div id="service-after-img-wrap" style={{ marginBottom: '6px', display: 'none' }}>
                    <img id="service-after-img-preview" src="" alt="After" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id="service-after-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id="service-after-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>📷 画像追加</button>
                  <p id="service-after-img-msg" className="muted" style={{ fontSize: '11px', margin: '3px 0 0', display: 'none' }}></p>
                  <input type="hidden" name="after_image_url" id="service-after-image-url" />
                </div>
              </div>

              {/* ベネフィットリスト（新） */}
              <div className="form-field">
                <label>このプログラムで変わること（1行1項目）</label>
                <textarea name="benefit_list_text" placeholder={"例:\n自分に似合う眉の形が客観的にわかる\n毎朝5分で再現できるセルフケア手順を習得できる\nマッチングアプリの写真で印象が変わる"} style={{ minHeight: '120px' }}></textarea>
                <small className="muted">1行につき1項目。掲載者ページで✓リストとして表示されます（最大5項目）</small>
              </div>
              <div className="form-field">
                <label>サービス画像</label>
                <div id="service-img-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="service-img-preview" src="" alt="サービス画像" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="service-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="service-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 サービス画像を設定（任意）</button>
                <p id="service-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="image_url" id="service-image-url" />
              </div>
              <div className="form-field">
                <label>このプログラムが向いている来た道の類型（任意・複数選択可）</label>
                <small className="muted" style={{ marginBottom: '8px', display: 'block' }}>選択すると掲載者公開ページでバッジとして表示されます</small>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="virgin" />初めてタイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="quit" />続かなかったタイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="blind" />非客観視タイプ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_path_types" value="lapsed" />再開タイプ</label>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input type="checkbox" name="is_featured" id="is_featured" />
                <label htmlFor="is_featured" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>おすすめプログラムとして表示する</label>
              </div>
              <input type="hidden" name="_service_id" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn" id="service-save-btn">保存</button>
                <button type="button" className="btn btn-ghost" id="service-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>New Me Navi マッチング設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0 0 12px', lineHeight: '1.6' }}>ユーザーのNew Me Naviに基づいて「あなたとの一致度」が自動計算されます。カバーする8軸は登録カテゴリから自動検出されます。</p>
            <div id="axis-coverage-info" style={{ marginBottom: '16px' }}></div>
            <form id="service-form">
              <div className="form-field"><label>サービス説明文（料金・メニューなど）</label><textarea name="description" placeholder="提供するサービスの詳細をここに書いてください"></textarea></div>
              <div className="form-field">
                <label>提供スタイル（New Me Navi連動）</label>
                <select name="provider_style">
                  <option value="">選択してください</option>
                  <option value="explanation">納得してから動く人向け（理由を丁寧に説明するスタイル）</option>
                  <option value="consultation">相談しながら進めたい人向け</option>
                  <option value="delegate">任せて結果を出してほしい人向け</option>
                  <option value="cautious">小さく試したい人向け</option>
                </select>
                <small className="muted">ユーザーのMe Scan回答のスタイル傾向と照合されます</small>
              </div>

              {/* ── AIマッチングプロフィール ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(26,20,16,0.12)' }}>AIマッチングプロフィール</h3>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 14px', lineHeight: '1.6' }}>
                ここに書いた内容をAIが読み取り、あなたのサービスにどんなユーザーが合うかを自動判定します。<br />
                チェックボックスより精度の高いマッチングが実現します。書くほど効果的です。
              </p>
              <div className="form-field">
                <label>よく来るお客様の状況・背景</label>
                <textarea name="ideal_client_desc" rows={3} placeholder="例: マッチングアプリを始めたばかりで、写真の撮り方もわからない30代のサラリーマンが多い。自信がなく、何から始めればいいかわからない方が多い。" />
              </div>
              <div className="form-field">
                <label>来る前の典型的な状態</label>
                <textarea name="client_before_state" rows={3} placeholder="例: 外見に無頓着で、ジムや美容院に何年も行っていない。服は量販店で適当に買っていて、自分に似合うものがわからない。" />
              </div>
              <div className="form-field">
                <label>よく起きる変化のパターン</label>
                <textarea name="transformation_pattern" rows={3} placeholder="例: 3回通うと姿勢と歩き方が変わり、周囲から「変わった？」と言われ始める。6ヶ月で体重10kg減・マッチング率が上がったという声が多い。" />
              </div>
              <div className="form-field">
                <label>特に向いている人・状況</label>
                <textarea name="best_fit_desc" rows={3} placeholder="例: 「何かを変えなければ」と焦りを感じている人。過去に挫折したが今回こそはと思っている人。一人ではモチベーションが続かない人に特に向いている。" />
              </div>

              {/* AI分析ボタン */}
              <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#a5b4fc', marginBottom: '6px' }}>AIプロフィール分析</div>
                <p style={{ fontSize: '12px', color: 'rgba(26,20,16,0.75)', margin: '0 0 12px', lineHeight: '1.6' }}>
                  上の4つのフィールドを保存した後、「AIで分析する」をクリックするとClaudeがプロフィール全体を読み取り、マッチング精度を向上させます。
                </p>
                <div id="ai-match-status" style={{ fontSize: '12px', color: 'rgba(26,20,16,0.6)', marginBottom: '10px' }}></div>
                <button type="button" id="ai-analyze-btn" className="btn" style={{ background: '#4f46e5', color: '#fff', fontSize: '13px', padding: '8px 18px' }}>
                  AIで分析する
                </button>
              </div>

              <div className="form-field">
                <label>得意なきっかけ（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="matching_app" />マッチングアプリ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="love" />恋愛・告白前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="career" />就職・転職前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="word" />一言が刺さった</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="vague" />ずっと気になっていた</label>
                </div>
              </div>
              <div className="form-field">
                <label>得意な「来た道」の類型（複数選択可）</label>
                <small className="muted" style={{ display: 'block', marginBottom: '8px' }}>New Me Naviの「来た道スコア」と照合されます。該当する方にとって一致度が高くなります。</small>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="lost_direction" />以前やっていたが疎かになった方（再開タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_continuation" />始めたが続かなかった方（継続タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_result" />やっているが客観的評価がない方（非客観視タイプ）</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="cost" />コストで断念した経験がある方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="awkward" />プロとの関係性で悩んだ方</label>
                </div>
              </div>
              {/* ── 予約・比較情報 ── */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', margin: '20px 0 10px', paddingTop: '16px', borderTop: '1px solid rgba(26,20,16,0.12)' }}>予約・比較情報</h3>
              <small className="muted" style={{ display: 'block', marginBottom: '14px', fontSize: '12px', lineHeight: '1.6' }}>相談フォームや比較時に表示される情報です。設定するほどユーザーの「踏み出せない理由」を減らせます。</small>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input type="checkbox" name="trial_available" id="trial_available" />
                <label htmlFor="trial_available" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>お試し・無料相談あり（クイックファクトにバッジ表示）</label>
              </div>
              <div className="form-field"><label>お試しコースの内容説明</label><textarea name="trial_desc" placeholder="例: 初回30分無料の外見相談を実施しています。オンライン可。まず話を聞くだけでもOKです。"></textarea></div>
              <div className="form-field">
                <label>返信目安</label>
                <select name="response_hours">
                  <option value="">設定しない</option>
                  <option value="12">12時間以内</option>
                  <option value="24">24時間以内（翌日）</option>
                  <option value="48">48時間以内（2日）</option>
                  <option value="72">72時間以内（3日）</option>
                </select>
                <small className="muted">「返信〇時間以内」として相談ページに表示。設定するだけで申込率が上がります。</small>
              </div>
              <div className="form-field">
                <label>キャンセルポリシー</label>
                <textarea name="cancellation_policy" placeholder="例: 前日24時間前までのキャンセルは無料。当日キャンセルは料金の50%をいただきます。"></textarea>
              </div>
              <div className="form-field">
                <label>初回セッションの内容説明</label>
                <textarea name="first_session_desc" placeholder="例: 初回は60分のカウンセリングから始まります。現状ヒアリング・外見診断・今後のプラン提案を行います。見学・話を聞くだけでも歓迎です。"></textarea>
                <small className="muted">相談フォームの直前にユーザーへ表示されます。「何が起きるかわからない不安」を解消する文章を書いてください。</small>
              </div>

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ⑤：体験談 */}
        <div className="tab-pane" id="tab-stories">
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>体験談の管理</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                利用者から寄せられた体験談の表示・非表示を切り替えられます。<br />
                非表示にした体験談は公開ページには表示されません。
              </p>
            </div>
            <div id="stories-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* 来店設定：推奨来店周期・休眠判定。顧客管理タブから移設（でお指摘2026-09-12：
            設定系の項目は「店舗の中身を作る」側に置くべき）。 */}
        <div className="tab-pane" id="tab-visit-settings">
          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>推奨来店周期の設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
              設定すると、お客様がNew Me Logで貴店を選んだ時に頻度欄へ自動で入力されます（任意・お客様は自分で書き換えられます）。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '160px' }}>
                <label>軸</label>
                <select id="rf-axis"></select>
              </div>
              <div className="form-field" style={{ minWidth: '90px' }}>
                <label>周期</label>
                <input id="rf-value" type="number" min="1" placeholder="例：6" />
              </div>
              <div className="form-field" style={{ minWidth: '110px' }}>
                <label>単位</label>
                <select id="rf-unit">
                  <option value="week">週ごと</option>
                  <option value="month">ヶ月ごと</option>
                </select>
              </div>
              <button className="btn" id="rf-save-btn" type="button">設定する</button>
            </div>
            <div id="rf-list"></div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>休眠判定の設定</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
              最終来店からこの日数を超えたお客様を「休眠」として顧客管理タブに表示します（既定90日）。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '120px' }}>
                <label>未来店日数</label>
                <input id="ds-days" type="number" min="1" placeholder="90" />
              </div>
              <button className="btn" id="ds-save-btn" type="button">設定する</button>
              <span id="ds-msg" className="muted" style={{ fontSize: '13px' }}></span>
            </div>
          </div>
        </div>

        {/* New Me Log：紐づいている顧客の一覧 */}
        <div className="tab-pane" id="tab-customers">
          <div className="card" style={{ padding: '24px' }}>
            <div id="customers-cap-banner"></div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
              <label className="muted" style={{ fontSize: '13px' }}>表示：</label>
              <select id="customers-filter">
                <option value="all">すべて</option>
                <option value="user-overdue">ユーザー想定超過のみ</option>
                <option value="store-overdue">店舗推奨超過のみ</option>
                <option value="dormant">休眠のみ</option>
              </select>
              <label className="muted" style={{ fontSize: '13px', marginLeft: '4px' }}>並び替え：</label>
              <select id="customers-sort">
                <option value="next_visit">次回目安が近い順</option>
                <option value="last_visit_old">最終来店が古い順</option>
                <option value="name">名前順</option>
              </select>
              <input id="karte-search" type="text" placeholder="お客様の名前で絞り込み" style={{ flex: '1 1 200px', maxWidth: '260px', padding: '8px 12px', border: '1.5px solid rgba(26,20,16,0.15)', borderRadius: '8px' }} />
            </div>
            <div id="customers-list"><p className="muted">読み込み中…</p></div>
          </div>

          {/* セグメント一斉メール配信（でお要望2026-09-14：hacomonoの「メンバータイプ毎の
              一斉メール配信」相当機能）。上の「表示：」フィルター・検索の絞り込み結果に
              そのまま送信する。凝った差し込み変数等は持たず、件名＋本文の自由記述のみ。 */}
          <div className="card stack" style={{ padding: '24px', gap: 10, marginTop: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>📧 一斉メール配信</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>上の「表示：」の絞り込み結果に、Finemeに登録されたメールアドレスへ一斉送信します（メール未登録の方はスキップされます）。</p>
            </div>
            <p id="bc-recipient-count" className="muted" style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}></p>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>件名</label>
              <input type="text" id="bc-subject" placeholder="例：秋の特別キャンペーンのご案内" />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>本文</label>
              <textarea id="bc-body" style={{ width: '100%', minHeight: '110px', fontSize: '14px', padding: '10px', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="お客様への案内文を入力してください"></textarea>
            </div>
            <button type="button" className="btn" id="bc-send-btn" style={{ width: 'fit-content' }}>この絞り込み結果に送信する</button>
            <p id="bc-msg" className="muted" style={{ fontSize: '12px', margin: 0 }}></p>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px', marginTop: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>カルテ項目を設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                自由記述・選択肢・5段階評価・数値・日付・チェックボックスから、貴店で欲しい項目（例：気をつける点・特徴・癖など）を自由に追加できます。項目は貴店だけに表示され、お客様には見えません。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '160px' }}>
                <label>項目名</label>
                <input id="kf-label" type="text" placeholder="例：癖・注意点" />
              </div>
              <div className="form-field" style={{ minWidth: '140px' }}>
                <label>種類</label>
                <select id="kf-type">
                  <option value="text">自由記述</option>
                  <option value="select">選択肢</option>
                  <option value="stars">5段階評価</option>
                  <option value="number">数値</option>
                  <option value="date">日付</option>
                  <option value="checkbox">チェックボックス</option>
                </select>
              </div>
              <div className="form-field" id="kf-options-wrap" style={{ minWidth: '220px', display: 'none' }}>
                <label>選択肢（カンマ区切り）</label>
                <input id="kf-options" type="text" placeholder="例：右巻き,左巻き,直毛" />
              </div>
              <button className="btn" id="kf-add-btn" type="button">追加する</button>
            </div>
            <div id="kf-list"></div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>非会員のお客様を追加</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                Finemeに登録していないお客様も、上の一覧に「非会員」として並びます。後から会員だと分かった場合は一覧から「会員と紐付ける」を選ぶと、記録がそのお客様に引き継がれます。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input id="manual-name-input" type="text" placeholder="お客様のお名前" style={{ flex: '1 1 160px', padding: '10px 12px', border: '1.5px solid rgba(26,20,16,0.2)', borderRadius: '10px', background: 'rgba(26,20,16,0.04)', color: '#1a1410' }} />
              <input id="manual-memo-input" type="text" placeholder="メモ（任意）" style={{ flex: '2 1 200px', padding: '10px 12px', border: '1.5px solid rgba(26,20,16,0.2)', borderRadius: '10px', background: 'rgba(26,20,16,0.04)', color: '#1a1410' }} />
              <button type="button" id="manual-add-btn" className="btn">＋ 新規作成</button>
            </div>
          </div>
        </div>

        {/* 顧客詳細ポップアップ・声かけメッセージ入力は、以前は顧客管理タブ（.tab-pane#tab-customers）の
            中に置かれていた。.tab-paneは非アクティブ時display:noneになるため、他のタブ（今日の業務・
            予約カレンダー・予約リクエスト等）から開こうとしても親が非表示のままではモーダル自身に
            display:flexを付けても画面に出ない（でお報告2026-09-14「今日の業務の顧客情報がやっぱり
            開かない」の根本原因・確定）。他のカレンダー系モーダルと同じく、どのタブがアクティブでも
            表示できるようタブ構造の外（トップレベル）に移動した。 */}

        {/* お客様一覧はコンパクトな行だけにし、クリックでポップアップに詳細（カルテ・メッセージ送信等）
            をまとめる方式に変更（でお指摘2026-09-12：カードが大きすぎて一覧性が悪い＋今野くんの
            実地メモ：スクロールが多いと確度の高いお客様が埋もれる）。1画面によりたくさん並べられる。 */}
        <div id="customer-detail-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px' }} id="cust-modal-name"></h3>
              <button type="button" className="btn btn-ghost" id="cust-modal-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <div id="cust-modal-badges" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 8px' }}></div>
            <p id="cust-modal-info" className="muted" style={{ fontSize: '12px', margin: '0 0 10px' }}></p>

            {/* 会員（New Me Log紐づき）用セクション */}
            <div id="cust-modal-member-section">
              <div className="cluster" style={{ gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <button type="button" className="btn btn-ghost" id="cust-modal-nudge-btn" style={{ fontSize: '12px', padding: '5px 10px' }}>声かけメッセージを送る</button>
                <select id="cust-modal-assign-select" style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}></select>
              </div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>📌 固定メモ</label>
              <textarea id="cust-modal-note-textarea" style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="読み込み中…" disabled></textarea>
              <button type="button" className="btn" id="cust-modal-note-save-btn" style={{ fontSize: '12px', padding: '5px 10px', marginTop: '6px' }} disabled>保存する</button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" className="btn btn-ghost" id="cust-modal-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>＋ 来店記録を追加</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>記録を見る</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-insight-btn" style={{ fontSize: '12px', padding: '5px 10px' }}>🤖 AIに傾向を聞く</button>
              </div>
              <div id="cust-modal-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-history" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-insight" style={{ display: 'none', marginTop: '10px' }}></div>
            </div>

            {/* 非会員（Fineme未登録）用セクション（でお要望2026-09-12：一覧を統合したため
                ポップアップ側でも同じ場所から操作できるようにする） */}
            <div id="cust-modal-manual-section" style={{ display: 'none' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <label className="muted" style={{ fontSize: '12px' }}>会員と紐付ける：</label>
                <select id="cust-modal-link-select" style={{ fontSize: '12px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}></select>
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-delete-btn" style={{ fontSize: '12px', padding: '5px 10px', color: '#ef4444', marginLeft: 'auto' }}>削除</button>
              </div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>📌 メモ</label>
              <textarea id="cust-modal-manual-memo-textarea" style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="要望・使った薬剤・注意点など"></textarea>
              <button type="button" className="btn" id="cust-modal-manual-save-btn" style={{ fontSize: '12px', padding: '5px 10px', marginTop: '6px' }}>保存する</button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>＋ 来店記録を追加</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>記録を見る</button>
              </div>
              <div id="cust-modal-manual-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-manual-history" style={{ display: 'none', marginTop: '10px' }}></div>
            </div>
          </div>
        </div>

        {/* 声かけメッセージ入力（でお指摘2026-09-12：promptだと改行キーで即送信されてしまい
            事故のもと。テキストエリア＋明示的な送信ボタンに変更しEnterでは送信されないようにした） */}
        <div id="nudge-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card" style={{ maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>声かけメッセージを送る</h3>
            <p className="muted" style={{ fontSize: '12px', margin: '0 0 10px' }}>店舗の公式LINE連携済みならそちらから、未連携ならFineme公式LINEから届きます。</p>
            <textarea id="nudge-message-textarea" style={{ width: '100%', minHeight: '90px', fontSize: '13px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="メッセージを入力してください"></textarea>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button type="button" className="btn" id="nudge-send-btn">送信する</button>
              <button type="button" className="btn btn-ghost" id="nudge-cancel-btn">キャンセル</button>
            </div>
          </div>
        </div>

        {/* 回数券・パッケージ：決済はFinemeが仲介せず記録のみ。店舗・顧客双方が残り回数を確認できる */}
        <div className="tab-pane" id="tab-packages">
          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>パッケージを作る</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
              決済はFineme上では行いません（お店で直接徴収してください）。ここでは「何回分・いくらで売ったか」を記録し、店舗と購入した顧客の両方がFinemeで残り回数を確認できるようにするだけです。
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '180px' }}>
                <label>パッケージ名</label>
                <input id="pkg-name" type="text" placeholder="例：パーソナルトレーニング10回券" />
              </div>
              <div className="form-field" style={{ minWidth: '140px' }}>
                <label>タイプ</label>
                <select id="pkg-type">
                  <option value="fixed_count">回数券</option>
                  <option value="unlimited">通い放題</option>
                  <option value="combo">通い放題＋チケット（複合）</option>
                  <option value="subscription">月額会員（毎月自動でチケット付与）</option>
                </select>
              </div>
              <div className="form-field" id="pkg-sessions-field" style={{ minWidth: '100px' }}>
                <label id="pkg-sessions-label">回数</label>
                <input id="pkg-sessions" type="number" min="1" placeholder="10" />
              </div>
              <div className="form-field" id="pkg-combo-sessions-field" style={{ minWidth: '140px', display: 'none' }}>
                <label>付帯チケット回数</label>
                <input id="pkg-combo-sessions" type="number" min="1" placeholder="4" />
              </div>
              <div className="form-field" id="pkg-recurring-sessions-field" style={{ minWidth: '140px', display: 'none' }}>
                <label>毎月の付与回数</label>
                <input id="pkg-recurring-sessions" type="number" min="1" placeholder="8" />
              </div>
              <div className="form-field" style={{ minWidth: '120px' }}>
                <label>参考価格（任意）</label>
                <input id="pkg-price" type="number" min="0" placeholder="80000" />
              </div>
              <div className="form-field" style={{ minWidth: '120px' }}>
                <label>有効期限・日数（任意）</label>
                <input id="pkg-validity" type="number" min="1" placeholder="180" />
              </div>
              <button className="btn" id="pkg-create-btn" type="button">作成する</button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '-4px 0 8px' }}>
              「通い放題＋チケット」は今野くんの実地メモ通り、通い放題契約に付帯チケット分の回数を1契約で持たせられます（hacomono同等・STORESは2契約が必要）。
            </p>
            <div id="pkg-def-list"></div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>顧客への購入記録・残り回数</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                購入があったら下で顧客とパッケージを選んで記録してください。予約カードの「来店確認」の隣にも消化ボタンが出るようになります。誤って消化した場合はここから直近1回分を取り消せます。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div className="form-field" style={{ minWidth: '200px' }}>
                <label>顧客（New Me Log連携済み）</label>
                <select id="pkg-assign-user"></select>
              </div>
              <div className="form-field" style={{ minWidth: '200px' }}>
                <label>パッケージ</label>
                <select id="pkg-assign-package"></select>
              </div>
              <button className="btn" id="pkg-assign-btn" type="button">購入を記録する</button>
              <span id="pkg-assign-msg" className="muted" style={{ fontSize: '13px' }}></span>
            </div>
            {/* 今野くんの実地メモ2026-09-14：「使い切ったチケットが常に表示されて、
                スタッフが手動で削除する時に手間がかかる」「体験だけしたメンバーが
                ずっと表示されて探すのが手間」。トグル自体は前からあったが既定OFFだった
                ため、初期表示では結局これまで通り全件出てしまっていた。既定ONに変更し、
                見たい時だけ「すべて表示」する方式に反転する。 */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '12px', cursor: 'pointer' }}>
              <input type="checkbox" id="pkg-active-only" defaultChecked />
              有効な会員のみ表示（期限切れ・使用済みを隠す）
            </label>
            <div id="pkg-customer-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* LINE連携：店舗の公式LINEアカウントを連携し、そちらからリマインドを送る */}
        <div className="tab-pane" id="tab-line-channel">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>店舗の公式LINEと連携する</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                連携すると、お客様への来店リマインドがFineme公式LINEではなく、この店舗の公式LINEから届くようになります。<br />
                既に公式LINEを友だち追加しているお客様に届きやすくなります。<br />
                設定にはLINE Official Account ManagerでのMessaging API有効化・チャネルアクセストークンの発行が必要です。ご不明な場合はサポートいたしますのでお気軽にお問い合わせください。
              </p>
              <a
                href="/business/line-connect-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  background: '#06c755',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  marginTop: '12px',
                }}
              >
                📖 連携のやり方を見る（設定ガイド） ↗
              </a>
            </div>
            <div id="line-channel-status" className="muted" style={{ fontSize: '13px' }}>読み込み中…</div>
            <div id="lc-webhook-url-box" style={{ display: 'none', background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', padding: '12px' }}>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 4px' }}>予約前日リマインドの「行きます」ボタン等（ノーショー対策）を使う場合は、LINE Official Account Managerの「応答設定」→Webhookで以下のURLを設定してください（任意）：</p>
              <code id="lc-webhook-url" style={{ background: '#f3f4f6', color: '#111827', padding: '4px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'inline-block' }}></code>
            </div>
            <div id="lc-test-send-box" style={{ display: 'none', background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', padding: '14px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 6px' }}>ちゃんと届くかテストする</p>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 10px', lineHeight: '1.7' }}>
                ① 店舗の公式LINEを自分のスマホで友だち追加する<br />
                ② 下のリンクを、そのアカウントでFinemeにログインした状態のブラウザで開いて連携する：<br />
                <code id="lc-test-liff-link" style={{ background: '#f3f4f6', color: '#111827', padding: '3px 6px', borderRadius: 4, fontSize: 11.5, wordBreak: 'break-all', display: 'inline-block', margin: '4px 0' }}></code><br />
                ③ 連携できたら下のボタンでテストメッセージを送る
              </p>
              <button type="button" className="btn" id="lc-test-send-btn">テスト送信する</button>
              <p id="lc-test-send-msg" className="muted" style={{ fontSize: '13px', margin: '8px 0 0' }}></p>
            </div>
            <form id="line-channel-form" className="stack" style={{ gap: '10px' }}>
              <div className="form-field">
                <label>チャネルID</label>
                <input id="lc-channel-id" type="text" placeholder="任意（控えとして保存）" />
              </div>
              <div className="form-field">
                <label>チャネルシークレット</label>
                <input id="lc-channel-secret" type="text" placeholder="任意（控えとして保存）" />
              </div>
              <div className="form-field">
                <label>チャネルアクセストークン *</label>
                <input id="lc-channel-token" type="text" placeholder="LINE Official Account Managerで発行したトークン" />
                <small className="muted" style={{ display: 'block', marginTop: '4px' }}>初回連携時は必須です。連携済みでLIFF IDだけ追記・変更する場合は空欄のままで構いません。</small>
              </div>
              <div className="form-field">
                <label>LIFF ID</label>
                <small className="muted" style={{ display: 'block', marginBottom: '4px' }}>お客様の連携ページ（LIFF）を作成した場合のみ入力してください</small>
                <input id="lc-liff-id" type="text" placeholder="任意" />
              </div>
              <button type="submit" className="btn" id="lc-submit-btn">保存して確認する</button>
              <p id="lc-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
          </div>
        </div>

        {/* クチコミ依頼の自動化：来店確定の1〜2日後にGoogleクチコミ投稿を促すLINEを自動送信 */}
        <div className="tab-pane" id="tab-reviews">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>来店後クチコミ依頼の自動化</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                GoogleクチコミのURLを設定すると、予約が「来店済み」になった1〜2日後に、自動でクチコミ投稿をお願いするメッセージをお客様に送ります（店舗の公式LINE連携済みならそちらから、未連携ならFineme公式LINEから）。<br />
                未設定の場合はこの機能は動作しません。
              </p>
            </div>
            <form id="review-form" className="stack" style={{ gap: '10px' }}>
              <div className="form-field">
                <label>GoogleクチコミURL</label>
                <input id="rv-url" type="url" placeholder="https://g.page/r/..." />
                <small className="muted" style={{ display: 'block', marginTop: '4px' }}>Googleビジネスプロフィールの「クチコミを増やす」から取得できるリンクです。</small>
              </div>
              <button type="submit" className="btn" id="rv-submit-btn">保存する</button>
              <p id="rv-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
          </div>
        </div>

        {/* 売上管理：予約リクエストの「来店確認」時に確定した記録＋手動記録の集計。
            Finemeは決済を仲介していないため、予約価格やNew Me Logの自己申告costを
            無条件に売上として自動合算することはしない（でお合意 2026-09-04）。 */}
        <div className="tab-pane" id="tab-sales">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>売上管理</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                  「予約リクエスト」で来店確認した際に確定した記録と、手動で追加した記録の合計です。店舗が確認・確定した金額のみを記録します。
                </p>
              </div>
              <button type="button" id="sales-csv-btn" className="btn btn-ghost" style={{ fontSize: '12px' }}>CSVエクスポート ↓</button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" id="sales-period-this" className="btn" style={{ fontSize: '12px', padding: '7px 16px' }}>今月</button>
              <button type="button" id="sales-period-last" className="btn btn-ghost" style={{ fontSize: '12px', padding: '7px 16px' }}>先月</button>
            </div>

            <div id="sales-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px' }}>
              <div className="stat-card"><div className="stat-value" id="sales-total-finance">—</div><div className="stat-label">来店確認からの売上</div></div>
              <div className="stat-card"><div className="stat-value" id="sales-total-manual">—</div><div className="stat-label">手動追加の売上</div></div>
              <div className="stat-card"><div className="stat-value" id="sales-total-all" style={{ color: '#c9a84c' }}>—</div><div className="stat-label">合計売上</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px' }}>
              <div><h3 style={{ fontSize: '13px', margin: '0 0 8px' }}>メニュー別</h3><div id="sales-by-menu" className="muted" style={{ fontSize: '12px' }}>—</div></div>
              <div><h3 style={{ fontSize: '13px', margin: '0 0 8px' }}>スタッフ別</h3><div id="sales-by-staff" className="muted" style={{ fontSize: '12px' }}>—</div></div>
              <div><h3 style={{ fontSize: '13px', margin: '0 0 8px' }}>支払い方法別</h3><div id="sales-by-payment" className="muted" style={{ fontSize: '12px' }}>—</div></div>
            </div>

            <div style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px' }}>＋ 手動で売上を追加</h3>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 10px' }}>Fineme経由でない売上（非会員のお客様・他チャネル経由）を直接記録します。</p>
              <form id="sales-manual-form" className="stack" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="form-field" style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <label>日付</label>
                    <input id="sm-date" type="date" required style={{ minWidth: 0 }} />
                  </div>
                  <div className="form-field" style={{ flex: '1 1 120px', minWidth: 0 }}>
                    <label>金額</label>
                    <input id="sm-amount" type="number" min="1" placeholder="円" required />
                  </div>
                  <div className="form-field" style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <label>メニュー（任意）</label>
                    <select id="sm-menu"><option value="">選択なし</option></select>
                  </div>
                  <div className="form-field" style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <label>スタッフ（任意）</label>
                    <select id="sm-staff"><option value="">選択なし</option></select>
                  </div>
                  <div className="form-field" style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <label>支払い方法（任意）</label>
                    <select id="sm-payment">
                      <option value="">選択なし</option>
                      <option value="現金">現金</option>
                      <option value="クレジットカード">クレジットカード</option>
                      <option value="PayPay">PayPay</option>
                      <option value="楽天Pay">楽天Pay</option>
                      <option value="LINE Pay">LINE Pay</option>
                      <option value="銀行振込">銀行振込</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>メモ（任意）</label>
                  <input id="sm-memo" type="text" placeholder="例：店頭現金売上" />
                </div>
                <button type="submit" className="btn" id="sm-submit-btn">記録する</button>
                <p id="sm-msg" className="muted" style={{ fontSize: '13px' }}></p>
              </form>
            </div>

            <div style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px' }}>記録一覧</h3>
              <div id="sales-entries-list"><p className="muted">読み込み中…</p></div>
            </div>
          </div>
        </div>

        {/* POS・在庫：hacomono同様、専用レジ機ではなくiPad等のWebアプリとして会計・物販在庫を記録する（hacomono/STORES網羅計画 Phase 3）。
            会計確定時に集計1行だけ売上管理タブへ自動連携される。 */}
        <div className="tab-pane" id="tab-pos">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>レジ会計</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                商品をタップしてカートに追加し、会計を確定してください。確定すると自動で「売上管理」タブにも反映されます。
              </p>
            </div>
            <div id="pos-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '10px' }}>
              <p className="muted">読み込み中…</p>
            </div>
            <div style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px' }}>カート</h3>
              <div id="pos-cart-list"><p className="muted" style={{ fontSize: '13px' }}>まだ商品が選ばれていません</p></div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '12px' }}>
                <div className="form-field" style={{ minWidth: '140px' }}>
                  <label>スタッフ（任意）</label>
                  <select id="pos-staff"><option value="">選択なし</option></select>
                </div>
                <div className="form-field" style={{ minWidth: '140px' }}>
                  <label>支払い方法（任意）</label>
                  <select id="pos-payment">
                    <option value="">選択なし</option>
                    <option value="現金">現金</option>
                    <option value="クレジットカード">クレジットカード</option>
                    <option value="PayPay">PayPay</option>
                    <option value="楽天Pay">楽天Pay</option>
                    <option value="LINE Pay">LINE Pay</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 900 }}>合計 ¥<span id="pos-cart-total">0</span></p>
                  <button type="button" id="pos-checkout-btn" className="btn" disabled>会計を確定する</button>
                </div>
              </div>
              <p id="pos-checkout-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>商品・在庫管理</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '180px' }}>
                <label>商品名</label>
                <input id="prod-name" type="text" placeholder="例：プロテインバー" />
              </div>
              <div className="form-field" style={{ minWidth: '100px' }}>
                <label>価格</label>
                <input id="prod-price" type="number" min="0" placeholder="500" />
              </div>
              <div className="form-field" style={{ minWidth: '100px' }}>
                <label>初期在庫</label>
                <input id="prod-stock" type="number" min="0" placeholder="20" />
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input type="checkbox" id="prod-track-stock" defaultChecked />
                在庫数を管理する
              </label>
              <button className="btn" id="prod-create-btn" type="button">追加する</button>
            </div>
            <div id="prod-list"><p className="muted">読み込み中…</p></div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>会計履歴</h2>
            <div id="pos-tx-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* ロッカー月極管理（でお要望2026-09-14：hacomonoにあるロッカー機能）。
            決済は仲介せず、契約状況の記録・管理のみ（service_packagesと同じ方針）。 */}
        <div className="tab-pane" id="tab-lockers">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>ロッカー管理</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>お客様の月極ロッカー契約を記録・管理します。</p>
              </div>
              <button type="button" className="btn" id="lkr-add-btn">＋ ロッカーを追加</button>
            </div>

            <div id="lkr-edit-card" style={{ display: 'none', background: 'var(--color-bg)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '14px' }}>ロッカーを追加</h3>
              <form id="lkr-edit-form">
                <div className="form-field"><label>ロッカー名・番号 *</label><input name="name" placeholder="例：ロッカー12番" required /></div>
                <div className="form-field"><label>月額（円）</label><input name="monthly_fee" type="number" min="0" placeholder="任意" /></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn">保存する</button>
                  <button type="button" className="btn btn-ghost" id="lkr-cancel-btn">キャンセル</button>
                </div>
              </form>
            </div>

            <div id="lkr-list" className="stack" style={{ gap: '10px' }}>読み込み中…</div>
          </div>

          {/* 契約フォーム（空きロッカーの「契約する」から開く） */}
          <div id="lkr-contract-card" className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px', display: 'none' }}>
            <h3 id="lkr-contract-title" style={{ margin: 0, fontSize: '15px' }}></h3>
            <form id="lkr-contract-form">
              <div className="form-field"><label>契約者名 *</label><input name="contractor_name" required /></div>

              {/* Fineme会員と紐付ける（任意、でお要望2026-09-14：「ロッカー管理のお客さんを
                  Finemeの会員情報と紐付けられるようにして」）。紐付けると来店履歴・カルテと
                  同じお客様として扱える。 */}
              <div className="form-field">
                <label>Fineme会員と紐付ける（任意）</label>
                <div id="lkr-member-selected" style={{ display: 'none', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#eff6ff', borderRadius: '8px', fontSize: '13px' }}>
                  <span id="lkr-member-selected-name" style={{ fontWeight: 700, color: '#2563eb' }}></span>
                  <button type="button" className="btn btn-ghost" id="lkr-member-clear" style={{ fontSize: '11px', padding: '3px 8px', marginLeft: 'auto' }}>解除</button>
                </div>
                <div id="lkr-member-search-wrap">
                  <input type="text" id="lkr-member-search" placeholder="お名前または電話番号で検索（3文字以上）" />
                  <div id="lkr-member-results" style={{ marginTop: '4px' }}></div>
                </div>
              </div>

              <div className="form-field"><label>月額（円）</label><input name="monthly_fee" type="number" min="0" placeholder="ロッカーの既定額を使う場合は空欄" /></div>
              <div className="form-field"><label>メモ</label><input name="note" placeholder="任意" /></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn">この内容で契約する</button>
                <button type="button" className="btn btn-ghost" id="lkr-contract-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
        </div>

        {/* チェックイン：入退館管理（スマートロック）は不要という方針のため、会員QRをカメラで
            読み取って記録するだけのシンプルな機能（hacomono/STORES網羅計画 Phase 4）。
            非会員は「代理でチェックイン」から手動記録できる（今野くんの実地メモ：高齢層向け運用）。 */}
        <div className="tab-pane" id="tab-checkin">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>QRチェックイン</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                お客様のマイページに表示されるQRコードをカメラで読み取ると、チェックインを記録します。iPad等のカメラでご利用ください。
              </p>
            </div>
            <div>
              <button type="button" id="checkin-camera-btn" className="btn">📷 カメラを起動する</button>
              <button type="button" id="checkin-camera-stop-btn" className="btn btn-ghost" style={{ display: 'none' }}>停止する</button>
            </div>
            <video id="checkin-video" playsInline muted style={{ width: '100%', maxWidth: '360px', borderRadius: '12px', display: 'none', background: '#000' }}></video>
            <canvas id="checkin-canvas" style={{ display: 'none' }}></canvas>
            <p id="checkin-scan-msg" className="muted" style={{ fontSize: '13px' }}></p>

            <div style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 10px' }}>代理でチェックイン（非会員・スマホをお持ちでない方）</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-field" style={{ minWidth: '200px' }}>
                  <label>お客様のお名前</label>
                  <input id="checkin-manual-name" type="text" placeholder="例：山田太郎様" />
                </div>
                <button type="button" id="checkin-manual-btn" className="btn btn-ghost">記録する</button>
              </div>
            </div>
          </div>

          <div className="card stack" style={{ padding: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>チェックイン履歴</h2>
            <div id="checkin-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* 出欠確認：既存のLINE往復インフラ（クイックリプライ・Webhook）をそのまま横展開
            （hacomono/STORES網羅計画 Phase 5）。既存コードへの変更は追加のみで、リスクが低いフェーズ。 */}
        <div className="tab-pane" id="tab-events">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>イベントを作る</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                作成後、下の一覧から「出欠を確認する」で招待したい顧客を選ぶと、LINEで出欠確認が届きます（参加/不参加をボタンで回答できます）。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '200px' }}>
                <label>イベント名</label>
                <input id="ev-title" type="text" placeholder="例：グループレッスン体験会" />
              </div>
              <div className="form-field" style={{ minWidth: '140px' }}>
                <label>日付</label>
                <input id="ev-date" type="date" />
              </div>
              <div className="form-field" style={{ minWidth: '120px' }}>
                <label>開始時刻（任意）</label>
                <input id="ev-time" type="time" />
              </div>
              <button className="btn" id="ev-create-btn" type="button">作成する</button>
            </div>
            <div id="ev-list"><p className="muted">読み込み中…</p></div>
          </div>

          <div className="card stack" id="ev-invite-card" style={{ padding: '24px', gap: '16px', display: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>出欠を確認する：<span id="ev-invite-title"></span></h2>
              <button className="btn btn-ghost" id="ev-invite-close" type="button" style={{ fontSize: '12px' }}>閉じる</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '220px' }}>
                <label>招待する顧客（New Me Log連携済み）</label>
                <select id="ev-invite-user"></select>
              </div>
              <button className="btn" id="ev-invite-send-btn" type="button">LINEで出欠確認を送る</button>
              <span id="ev-invite-msg" className="muted" style={{ fontSize: '13px' }}></span>
            </div>
            <div id="ev-attendance-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* LP設定：診断起点で表示される専用ページ用のメニュー・施術事例 */}
        <div className="tab-pane" id="tab-landing">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>体験メニュー</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                診断結果からの専用ページ（fineme.me/provider/{'{'}あなたの店舗{'}'}/for/{'{'}軸{'}'}）に表示するメニューです。対応する軸（Mirrorの7軸）を選んでください。
              </p>
              <a
                id="lp-preview-btn"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '13px', marginTop: '8px', display: 'inline-block' }}
              >
                見本を見る（自分のLPを確認） ↗
              </a>
            </div>
            <form id="menu-form" className="stack" style={{ gap: '10px' }}>
              <div className="form-field">
                <label>サービス設定から選ぶ（任意）</label>
                <select id="menu-from-service">
                  <option value="">－ 選択するとメニュー名・価格・写真を自動入力 －</option>
                </select>
                <input type="hidden" id="menu-image-url" />
                <img id="menu-image-preview" alt="" style={{ display: 'none', width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: '1 1 200px' }}>
                  <label>メニュー名</label>
                  <input id="menu-name" type="text" placeholder="例：眉デザイン×スキンケア体験" required />
                </div>
                <div className="form-field" style={{ minWidth: '110px' }}>
                  <label>価格（円）</label>
                  <input id="menu-price" type="number" min="0" required />
                </div>
                <div className="form-field" style={{ minWidth: '110px' }}>
                  <label>所要時間（分）</label>
                  <input id="menu-duration" type="number" min="0" required />
                </div>
              </div>
              <div className="form-field">
                <label>対応軸（複数選択可）</label>
                <div className="checkbox-group" id="menu-axes">
                  {PROVIDER_AXES.map(a => (
                    <label className="checkbox-item" key={a.key}>
                      <input type="checkbox" value={a.key} /> {a.icon} {a.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>説明</label>
                <textarea id="menu-desc" placeholder="メニューの内容・特徴など"></textarea>
              </div>
              <button type="submit" className="btn" id="menu-submit-btn">メニューを追加する</button>
              <p id="menu-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
            <div id="menu-list" style={{ marginTop: '8px' }}></div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>施術事例（Before/After）</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                New Me Logで紐づいているお客様の事例を登録できます。<strong>お客様本人が承認するまで公開されません</strong>（マイページから承認）。
              </p>
            </div>
            <form id="case-form" className="stack" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: '1 1 200px' }}>
                  <label>お客様</label>
                  <select id="case-user" required></select>
                </div>
                <div className="form-field" style={{ minWidth: '140px' }}>
                  <label>軸</label>
                  <select id="case-axis">
                    {PROVIDER_AXES.map(a => (
                      <option value={a.key} key={a.key}>{a.icon} {a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ minWidth: '90px' }}>
                  <label>Before</label>
                  <input id="case-before" type="number" min="0" max="100" required />
                </div>
                <div className="form-field" style={{ minWidth: '90px' }}>
                  <label>After</label>
                  <input id="case-after" type="number" min="0" max="100" required />
                </div>
              </div>
              <div className="form-field">
                <label>画像URL（任意）</label>
                <input id="case-image" type="url" placeholder="https://..." />
              </div>
              <button type="submit" className="btn" id="case-submit-btn">事例を登録する（承認依頼を送る）</button>
              <p id="case-msg" className="muted" style={{ fontSize: '13px' }}></p>
            </form>
            <div id="case-list" style={{ marginTop: '8px' }}></div>
          </div>
        </div>

        {/* エリア需要：Mirrorスコアの伸びしろ分布(需要)と、同エリアの店舗の対応軸数(供給)の比較 */}
        <div className="tab-pane" id="tab-area-demand">
          <div className="card stack" style={{ padding: '24px', gap: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>エリア需要</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                貴店の都道府県で、Mirror診断を受けた方の「伸びしろが大きい軸」の人数（需要）と、対応できる掲載店舗数（供給）を比較します。需要に対して供給が少ない軸ほど、狙い目です。
              </p>
            </div>
            <div id="area-demand-content"><p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p></div>
          </div>
        </div>

        {/* 接客の引き出し：軸別の声かけ例・カルテの着眼点（あくまで参考・貴店のスタイルを優先） */}
        <div className="tab-pane" id="tab-scripts">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>接客の引き出し</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                  困ったときの参考にしてください。貴店のスタイルを優先してかまいません。カルテ・体験談等の記録が増えると、貴店専用の内容に自動で切り替わります。
                </p>
              </div>
              <button type="button" id="scripts-refresh-btn" className="btn btn-ghost" style={{ fontSize: '12px', display: 'none' }}>更新する</button>
            </div>
            <p id="scripts-status" className="muted" style={{ fontSize: '12px', margin: 0 }}></p>
            <div id="scripts-content">
              {CUSTOMER_SCRIPT_AXES.map(a => (
                <div key={a.axis} data-axis={a.axis} style={{ borderTop: '1px solid rgba(26,20,16,0.1)', paddingTop: '14px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>{a.label}</h3>
                  <p className="muted" style={{ fontSize: '12px', margin: '0 0 6px', fontWeight: 700 }}>声かけ例</p>
                  <ul style={{ margin: '0 0 10px', paddingLeft: '18px' }}>
                    {a.openers.map((o, i) => <li key={i} style={{ fontSize: '13px', marginBottom: '4px' }}>{o}</li>)}
                  </ul>
                  <p className="muted" style={{ fontSize: '12px', margin: '0 0 6px', fontWeight: 700 }}>カルテの着眼点</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {a.notePoints.map((n, i) => (
                      <span key={i} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '99px', background: 'rgba(26,20,16,0.06)', border: '1px solid rgba(26,20,16,0.12)' }}>{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LTV/CAC：店舗単位の概算（メニュー別の紐づけデータが無いため店舗全体で算出） */}
        <div className="tab-pane" id="tab-ltv-cac">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>LTV・CAC設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                広告費（Fineme経由以外で払っている集客コスト）と粗利率を入力すると、下の概算に反映されます。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ minWidth: '160px' }}>
                <label>月間広告費（円・任意）</label>
                <input id="lc-ad-cost" type="number" min="0" placeholder="0" />
              </div>
              <div className="form-field" style={{ minWidth: '140px' }}>
                <label>粗利率（%）</label>
                <input id="lc-margin" type="number" min="0" max="100" placeholder="70" />
              </div>
              <button className="btn" id="lc-settings-save-btn" type="button">保存する</button>
              <span id="lc-settings-msg" className="muted" style={{ fontSize: '13px' }}></span>
            </div>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '12px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>概算（店舗全体）</h2>
            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
              メニュー別の来店データが無いため、店舗全体での概算です。予約（来店済み）の実績から算出しています。
            </p>
            <div id="ltv-cac-content"><p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p></div>
          </div>
        </div>

        {/* 紹介QR：貴店専用のNew Me Log紹介QRコード。/log?src=partner_{slug}経由の登録は自動で貴店に紐づく */}
        <div className="tab-pane" id="tab-qr">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>New Me Log 紹介QRコード</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                このQRコードから登録すると、お客様の記録が自動で貴店に紐づき、「New Me Log」タブに表示されます。店頭に置いてご案内ください。
              </p>
            </div>
            <div id="qr-tab-content" style={{ textAlign: 'center' }}>
              <p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p>
            </div>
          </div>
        </div>

        {/* タブ⑥：公開設定 */}
        <div className="tab-pane" id="tab-publish">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>公開設定</h2>
            <div className="publish-toggle">
              <label className="toggle-switch">
                <input type="checkbox" id="publish-toggle-input" />
                <span className="toggle-slider"></span>
              </label>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }} id="publish-label">非公開</div>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '13px' }}>非公開中はサイトに表示されませんが、月額費用は継続します。サービス内容の変更中や一時的に受付を止めたい場合にご利用ください。</p>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '0' }}>※ 掲載を完全に停止（解約）したい場合は「課金・プラン」タブからお手続きください。</p>
          </div>
        </div>

        {/* タブ⑥：課金・プラン */}
        <div className="tab-pane" id="tab-billing">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>課金・プラン</h2>
            <div style={{ background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.6)', marginBottom: '4px' }}>現在のプラン</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1a1410' }} id="billing-plan">読み込み中…</div>
              <div style={{ fontSize: '13px', color: 'rgba(26,20,16,0.6)', marginTop: '4px' }} id="billing-status"></div>
            </div>
            <div style={{ background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.7)', marginBottom: '8px', fontWeight: '700' }}>紹介報酬制度</div>
              <p className="muted" style={{ fontSize: '13px', margin: '0 0 10px' }}>あなたの紹介コードを共有すると、紹介した方が掲載を継続している限り¥500/月の報酬を受け取れます。</p>
              <div className="referral-code-box" id="referral-code">—</div>
              <button className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '10px', width: '100%' }} id="copy-referral">コードをコピー</button>
            </div>
            <div style={{ padding: '14px 16px', border: '1.5px solid rgba(26,20,16,0.15)', borderRadius: '12px', background: 'rgba(26,20,16,0.04)', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(26,20,16,0.9)', margin: '0 0 8px', fontWeight: '700' }}>プラン変更・解約について</p>
              <p className="muted" style={{ fontSize: '13px', margin: '0' }}>プランの変更や解約は、運営（Fineme）への申請が必要です。<br />下記よりご連絡ください。</p>
              <a href="mailto:contact@fineme.me?subject=プラン変更・解約申請" className="btn btn-ghost" style={{ marginTop: '12px', display: 'inline-block', fontSize: '13px' }}>contact@fineme.me に連絡する</a>
            </div>
            {/* billing-portal-btn: referenced in JS for Stripe customer portal */}
            <button id="billing-portal-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>カスタマーポータルを開く</button>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>パスワード変更</h2>
            <div className="form-field"><label>新しいパスワード（8文字以上）</label><input type="password" id="new-pw1" /></div>
            <div className="form-field"><label>新しいパスワード（確認）</label><input type="password" id="new-pw2" /></div>
            <p id="pw-change-msg" style={{ fontSize: '13px', margin: '0', display: 'none' }}></p>
            <button className="btn" id="pw-change-btn" style={{ alignSelf: 'flex-start' }}>パスワードを変更する</button>
          </div>
        </div>

        {/* 機能設定：店舗ごとに使う機能を選べるようにする（Phase 0・でお要望2026-09-11）。
            hacomono/STORES網羅計画で追加していく機能（スタッフ指名予約・POS・チェックイン等）は
            店舗ごとにニーズが違うため、一通り実装した上で店舗が選んで使える形にする。 */}
        <div className="tab-pane" id="tab-features">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>機能設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                使いたい機能だけをオンにできます。オフの機能は左のメニューからも非表示になります。
              </p>
            </div>
            <div id="features-list" className="stack" style={{ gap: '14px' }}>読み込み中…</div>
          </div>
        </div>

        {/* 表示設定：起動時タブ・メニュー並び順・カレンダーの向き/初期表示を店舗ごとに
            カスタマイズ（でお要望2026-09-13）。今の構成がそのままデフォルト値。 */}
        <div className="tab-pane" id="tab-display-settings">
          <div className="card stack" style={{ padding: '24px', gap: '22px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>表示設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                起動時に開くタブ・メニューの並び順・予約カレンダーの表示方法は、店舗によって使いやすさが分かれます。お好みに合わせて変更できます（未設定なら今のままの構成が使われます）。
              </p>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>起動時に開くタブ</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select id="ds-landing-tab" style={{ padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}></select>
                <span id="ds-landing-tab-msg" style={{ fontSize: '12px' }}></span>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>メニューの並び順</p>
              <div id="ds-sidebar-order" className="stack" style={{ gap: '6px', maxWidth: '340px' }}>読み込み中…</div>
              <span id="ds-sidebar-order-msg" style={{ fontSize: '12px' }}></span>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>予約カレンダーの向き</p>
              <div id="ds-calendar-axis" className="stack" style={{ gap: '8px', maxWidth: '340px' }}></div>
              <span id="ds-calendar-axis-msg" style={{ fontSize: '12px' }}></span>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px' }}>予約カレンダーの初期表示</p>
              <div id="ds-calendar-view" className="stack" style={{ gap: '8px', maxWidth: '340px' }}></div>
              <span id="ds-calendar-view-msg" style={{ fontSize: '12px' }}></span>
              <p className="muted" style={{ fontSize: '12px', margin: '8px 0 0' }}>「部屋・設備の空き管理」がONの店舗のみ意味を持ちます（機能設定タブ）。</p>
            </div>

            {/* ヘッダーのショートカット（でお要望2026-09-14：「よく使うメニューを3つくらい
                ヘッダーに置いてあげると使いやすいかも。カスタムできたらもっといい」）。
                サイドバーを開かなくても主要タブへ直接飛べる。最大3つまで。 */}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>ヘッダーのショートカット（最大{MAX_HEADER_SHORTCUTS}つ）</p>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>スマホ画面上部にボタンとして表示され、タップですぐそのタブに移動できます。</p>
              <div id="ds-header-shortcuts" className="stack" style={{ gap: '6px', maxWidth: '340px' }}></div>
              <span id="ds-header-shortcuts-msg" style={{ fontSize: '12px' }}></span>
            </div>
          </div>
        </div>

        {/* タブ⑦：紹介報酬 */}
        <div className="tab-pane" id="tab-referral">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>紹介報酬</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              あなたの紹介コードを使ってFinemeに登録した掲載者が月額課金を継続している間、毎月¥500の報酬が発生します。
            </p>

            {/* 自分の紹介コード */}
            <div style={{ background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.7)', fontWeight: '700', marginBottom: '8px' }}>あなたの紹介コード</div>
              <div className="referral-code-box" id="referral-code-tab">—</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-code-btn">コードをコピー</button>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-url-btn">紹介URLをコピー</button>
              </div>
            </div>

            {/* サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }} id="referral-summary-grid">
              <div className="stat-card"><div className="stat-value" id="ref-total-referred">—</div><div className="stat-label">紹介人数（合計）</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-active-count">—</div><div className="stat-label">課金中の紹介者</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-pending-month" style={{ color: '#6366f1' }}>—</div><div className="stat-label">今月の見込み報酬</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-total-earned">—</div><div className="stat-label">累計報酬額</div></div>
            </div>

            {/* 紹介一覧テーブル */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px', color: 'rgba(26,20,16,0.9)' }}>紹介パートナー一覧</h3>
              <div id="referral-list"><p className="muted">読み込み中…</p></div>
            </div>
          </div>
        </div>

        {/* 友達紹介プログラム（B2C・会員が友達を紹介する仕組み。でお要望2026-09-14。
            上の「紹介報酬」はFineme→掲載者のB2B紹介で別物）。hacomonoのクチコプレミアム
            連携相当機能をFineme内製で実装。特典の実際の付与は店舗の運用に委ねる。 */}
        <div className="tab-pane" id="tab-member-referral">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>🎁 友達紹介プログラム</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              オンにすると、お客様（Finemeログイン中の会員）が公開ページから個人紹介リンクを発行できるようになります。紹介経由の予約・来店を自動で記録し、双方にLINEで通知します。特典の内容・実際の付与は貴店の運用にお任せします（Financeは決済を仲介しません）。
            </p>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>特典の説明文（お客様に表示されます）</label>
              <input type="text" id="mref-reward-text" placeholder="例：紹介した方・された方どちらも次回500円引き" />
            </div>
            <button type="button" className="btn" id="mref-save-btn" style={{ width: 'fit-content' }}>保存する</button>
            <p id="mref-msg" className="muted" style={{ fontSize: '12px', margin: 0 }}></p>

            <div style={{ borderTop: '1px solid rgba(26,20,16,0.08)', paddingTop: '16px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px' }}>紹介実績</h3>
              <div id="mref-list"><p className="muted">読み込み中…</p></div>
            </div>
          </div>
        </div>

          </div>
        </div>
      </div>
    </main>
  );
}
