'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PROVIDER_AXES } from '@/lib/provider-axes';
import { TAB_TUTORIALS, TUTORIAL_GROUPS, TUTORIAL_MUTED_KEY, tutorialSeenKey } from '@/lib/dashboard-tutorial';
import { JAPAN_CITIES, PREFECTURES } from '@/app/_data/japan-cities';
import { ALL_AXES } from '@/lib/log-axes';
import { CUSTOMER_SCRIPT_AXES } from '@/lib/customer-scripts';
import { LANDING_TAB_OPTIONS, CALENDAR_AXIS_OPTIONS, CALENDAR_DEFAULT_VIEW_OPTIONS, HEADER_SHORTCUT_OPTIONS, MAX_HEADER_SHORTCUTS, TAB_CATALOG, categoryOfTab, allCategoryDefs, generateCategoryKey, MAX_CUSTOM_CATEGORIES, MAX_CATEGORY_LABEL_LENGTH } from '@/lib/dashboard-prefs';
import { WEEKDAY_LABEL_BH } from '@/lib/business-hours-labels';
import PageDesignSettings from './PageDesignSettings';
import ConsultantWidget from './ConsultantWidget';
import ConsultantPanel from './ConsultantPanel';
import ActivityLogPanel from './ActivityLogPanel';
import { withOperator } from './operator';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

// 掲載者向けログイン画面へのURLは、必ずこの1箇所からだけ組み立てる（でお報告
// 2026-09-18：「掲載者管理画面のログイン画面のデザインが前のものに戻っている」。
// ログアウト導線は?type=provider付きで直していたが、セッション切れ時の再ログイン
// リンク（401フォールバック）は別の場所にハードコードされていて直っていなかった。
// この種の「直したはずなのに別の場所に同じ問題が残っている」を二度と起こさないため、
// このファイル内で掲載者ログインへ遷移する箇所は全てこの定数を使うこと。新しく
// ログインへの導線を足す時は絶対に'/login'を直書きしない）。
const PROVIDER_LOGIN_URL = '/login?type=provider';

// サイドバー・タブ・カード等の見た目CSS。以前はuseEffect内でdocument.createElement('style')
// により動的にDOM注入していたが、useEffectはクライアント側の初回マウント後（=最初の描画の後）
// にしか走らないため、ページ読み込み直後の一瞬だけCSS無しの生のHTMLが見えてしまっていた
// （でお報告2026-09-15：「ログインやページ更新の度に、一瞬デザインされてない裸のページが出てくる」）。
// JSXの<style>タグとしてサーバー側で描画されるようにし、初回HTMLの時点でCSSを含めて解消する。
const DASHBOARD_CSS = `
      /* サイドバー型ナビ（2026-09 デザイン刷新。/business/dashboard-design-sample の
         方向性を本番に反映。switchTab()はグローバルな.tab-btn/.tab-paneセレクタで
         動くため、この見た目変更だけなら既存のJSロジックには影響しない） */
      /* 2026-09-11：管理画面を白背景の業務ツール然とした配色に刷新（でお指摘・hacomono参考）。
         サイドバー／モバイル上部バーはブランドのネイビー×ゴールドのまま維持し、
         メインの作業エリア（.pd-page-root配下）だけを白系に反転。ユーザー向けページ
         （深海ネイビー×羊皮紙）の世界観とは切り離し、日々数字とフォームを見る道具として
         可読性を優先する。 */
      .pd-page-root { background: var(--color-bg); min-height: 100vh; color: #1a1410; }
      /* 初回読み込み中の待機表示（でお要望2026-09-28）。ページ全体を覆い、
         データ取得が終わり次第JSで非表示にする。 */
      .pd-global-loading { position: fixed; inset: 0; background: var(--color-bg); display: flex; align-items: center; justify-content: center; z-index: 9999; }
      .pd-spinner { width: 40px; height: 40px; border: 4px solid rgba(26,20,16,0.12); border-top-color: #c9a84c; border-radius: 50%; animation: pd-spin .8s linear infinite; }
      @keyframes pd-spin { to { transform: rotate(360deg); } }
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
      /* 「非表示」カテゴリーは並び替え設定の対象外（表示設定の並び順リストにも出ない）
         なので、常に一番下に固定する。指定しないとCSSのorderが他のボタンと衝突し、
         2番目あたりに割り込んで見えることがあった（でお報告2026-09-17：「表示設定の
         並び順が現状のメニューバーの項目とあってない」の一因）。 */
      .pd-rail-btn[data-category="hidden"] { order: 999; }
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
      .cal-grid-inner { display: grid; width: max-content; min-width: 100%; position: relative; }
      /* 現在時刻の線（でお要望2026-09-15）。左端の時刻列(40px)の右から右端まで。 */
      /* z-indexを予約ブロック（1）より下にして、名前の文字に赤線が重なって見えなく
         なる不具合を防ぐ（でお報告2026-09-17：「名前に赤い線が被らないようにして」）。
         ブロックが無い時間帯だけ線が見え、ブロックがある部分は自然に隠れる。 */
      .cal-now-line { position: absolute; left: 40px; right: 0; height: 0; border-top: 2px solid #ef4444; z-index: 0; pointer-events: none; }
      .cal-now-line::before { content: ''; position: absolute; left: -5px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
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
      .cal-block.is-class-session, .cal-block-h.is-class-session { background: rgba(168,85,247,0.16); border-left-color: #a855f7; }
      .cal-block.is-class-session:hover, .cal-block-h.is-class-session:hover { background: rgba(168,85,247,0.28); }
      .cal-block.is-class-session.is-closed, .cal-block-h.is-class-session.is-closed { opacity: .55; border-left-style: dashed; }
      .cal-block-tag { display: block; font-size: 9.5px; color: #3b82f6; font-weight: 700; }
      /* スタッフの休憩・外出ブロック／シフト外時間のグレー帯（でお要望2026-09-14：
         「出勤してないスタッフの枠は予約が入らないように自動でブロックしてカレンダーでも
         グレーで帯をかけて」）。予約ブロックより手前（下）に描画し、クリックは通さない。 */
      /* でお報告2026-09-18：「ブロックしても表示されない（機能はあるがブロックされて
         いるのか分からない）」。旧配色はrgba(26,20,16,0.05〜0.09)とほぼ透明で、実際は
         描画されていても肉眼でほぼ判別できなかった。はっきり見えるグレーに変更し、
         帯の中に「休憩」「勤務外」のラベルも出す。 */
      .cal-grey-band { position: absolute; background: repeating-linear-gradient(135deg, rgba(107,114,128,0.28), rgba(107,114,128,0.28) 7px, rgba(107,114,128,0.42) 7px, rgba(107,114,128,0.42) 14px); pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .cal-grey-band.is-deletable { pointer-events: auto; cursor: pointer; }
      .cal-grey-band-v { left: 0; right: 0; }
      .cal-grey-band-h { top: 0; bottom: 0; }
      .cal-grey-band-label { font-size: 10px; font-weight: 700; color: #4b5563; white-space: nowrap; background: rgba(255,255,255,0.55); padding: 1px 5px; border-radius: 99px; pointer-events: none; }
      /* 営業時間外（表示範囲の前後1時間の余白）のグレー表示（でお要望2026-09-18：
         「予約カレンダーは営業時間の前後1時間も表示させてくれてる。その営業時間外の
         ところは色をグレーにするとかでわかりやすくして」）。全列にまたがる帯のため、
         スタッフ列の中ではなくグリッド全体に重ねる（now-lineと同じ座標の取り方）。 */
      .cal-outofhours-band { position: absolute; background: rgba(107,114,128,0.14); pointer-events: none; z-index: 0; }
      .cal-outofhours-band-v { left: 40px; right: 0; }
      .cal-outofhours-band-h { top: 0; bottom: 0; }
      .cal-block, .cal-block-h { z-index: 1; }
      .cal-block strong, .cal-block-h strong { display: block; font-size: 10.5px; }
      .cal-block { position: absolute; left: 2px; right: 2px; }
      /* 縦横入れ替え版（でお要望2026-09-13：店舗によって時間軸を横に置きたい／
         部屋別をメインにしたい、というニーズがあるため設定でどちらも選べるようにした。
         こちらは1時間あたりの幅を広めに取り、予約者名が途中で切れにくいようにする）。 */
      .cal-day-grid-h { border: 1px solid rgba(26,20,16,0.08); border-radius: 10px; overflow: auto; max-height: 560px; -webkit-overflow-scrolling: touch; }
      .cal-grid-inner-h { display: grid; width: max-content; min-width: 100%; position: relative; }
      .cal-now-line-h { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid #ef4444; z-index: 0; pointer-events: none; }
      .cal-now-line-h::before { content: ''; position: absolute; top: -5px; left: -4px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
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
      .req-unread-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #ef4444; margin-right: 6px; vertical-align: middle; }
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

export default function ProviderDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // モバイル回線の瞬断・タブがバックグラウンドに回った時等にfetch()が中断されると、
    // Safari/WebKit系ブラウザは汎用的な「Load failed」というTypeErrorを返す。この画面
    // には多数のfetch呼び出しがあり、その中断は実害の無い一時的なものでも未処理の
    // Promise rejectionとしてそのままSentryに「エラー」として飛んでしまっていた
    // （でお報告2026-09-15：Sentry通知でTypeError「読み込みに失敗しました」/provider/dashboard）。
    // ネットワーク由来と判別できるメッセージだけを黙らせ、それ以外の本当の不具合は
    // 引き続き報告させる。
    //
    // でお報告2026-09-29：同じ種類のSentry通知が再発（iPhone・iOS 26.6.1・Chrome）。
    // 原因はメッセージが英語「Load failed」ではなく、端末が日本語ロケールだと
    // WebKit（SafariもChrome for iOSも中身はWebKit）がエラーメッセージ自体を
    // 「ロードに失敗しました」と日本語化して返していたこと——正規表現が英語文言
    // しか見ておらず素通りしていた。日本語パターンも追加する。
    const onUnhandledRejection = (e) => {
      const msg = String(e?.reason?.message || e?.reason || '');
      if (/load failed|failed to fetch|networkerror|the network connection was lost|ロードに失敗|読み込みに失敗|ネットワーク接続が失われ/i.test(msg)) {
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    // 初回読み込みが「画面に何も無いページ」に見えるというでお報告（2026-09-28）への対応。
    // 最初の実装ではプロフィール描画完了時点＋window.loadで消していたが、それらは
    // 「予約カレンダーの枠組み（見出し・ナビ）」が描画された直後に発火してしまい、
    // 実際にグリッドの中身（loadWeekData等の非同期フェッチ）が埋まるまでの本当に
    // 「壊れて見える」時間帯はスピナー無しのままだった（でお報告2026-09-28：「枠組み
    // だけ先に出てきて、実際のカレンダーが出てくるまで時差がある。その時間スピナーが
    // ちゃんと出てほしい」）。起動時に開くタブ（landing_tab）が実際に決まった後、
    // "そのタブ自身のデータ読み込みが完了した"タイミングでのみ消すようにする。
    let pdGlobalLoadingHidden = false;
    let pdLandingTabKey = null; // 起動時に開くタブが確定したらセットする（'calendar'|'today'|'requests'|'customers'|'sales'|それ以外）
    function hidePdGlobalLoading() {
      if (pdGlobalLoadingHidden) return;
      pdGlobalLoadingHidden = true;
      const el = document.getElementById('pd-global-loading');
      if (el) el.style.display = 'none';
    }
    // 各タブの読み込み完了処理から呼ぶ。「今まさに開いている（=起動時に開くタブとして
    // 確定した）タブ」の完了だけを合図として使う——他タブのバックグラウンド更新
    // （例：予約リクエストの件数バッジは常に裏で読み込まれる）で誤って消さないため。
    window.__pdMarkTabReady = (key) => { if (pdLandingTabKey === key) hidePdGlobalLoading(); };
    setTimeout(hidePdGlobalLoading, 6000); // 起動時タブの特定に失敗した場合等の保険

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
      // ログアウトボタンなど、実際のタブに対応しない.tab-btn（見た目を揃えるために
      // 同じクラスを使っているだけ）はこの共通ハンドラの対象外にする（でお報告
      // 2026-09-17：「ログアウト押したらprovider/dashboard?tab=undefinedに飛ぶ」。
      // data-tab属性が無いボタンでswitchTab(undefined)が走り、URLが?tab=undefinedに
      // 書き換わった上で全タブが非表示になっていたのが実際の原因）。
      if (!btn.dataset.tab) return;
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        closeMobileNav();
        // タブを切り替えるたびにURLの?tab=を更新しておくと、ページ更新時に同じ
        // タブへ自動的に戻れる（既存の起動時タブ判定ロジック(tabParam)がそのまま
        // 使える）。でお指摘2026-09-15：「更新するたびに1番上のページに戻ってしまう」。
        try { history.replaceState(null, '', `?tab=${btn.dataset.tab}`); } catch {}
      });
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
    // 「チュートリアル」タブ（全タブの案内をまとめて閲覧）に自動着地、②各タブの
    // ヘッダーにあった「使い方を見る」ボタンでその場に手動表示、の2経路にしていたが、
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
          <p style="margin:0 0 8px;font-weight:700;color:#c9a84c;font-size:13px;">${entry.title}タブの使い方</p>
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

    // スピナーを消す合図として追跡している起動時タブの一覧（LANDING_TAB_OPTIONSと同じ5つ）。
    // これ以外のタブへの直接リンク（?tab=billing 等）は追跡対象外——その場でスピナーを消す
    // （そのタブ自体は元々の「読み込み中…」表示のままだが、追跡対象5タブほど頻繁な
    // 起動時タブではないため許容する）。
    const SPINNER_TRACKED_TABS = ['calendar', 'today', 'requests', 'customers', 'sales'];

    const tabParam = new URLSearchParams(location.search).get('tab');
    const DASHBOARD_VISITED_KEY = 'fineme:provider:dashboard-visited';
    let needsLandingTabApply = false;
    if (tabParam) {
      switchTab(tabParam);
      if (SPINNER_TRACKED_TABS.includes(tabParam)) pdLandingTabKey = tabParam;
      else hidePdGlobalLoading();
    } else if (!localStorage.getItem(DASHBOARD_VISITED_KEY)) {
      // 初めてのダッシュボード訪問はチュートリアルタブから（重いデータ取得が無いため即消す）
      switchTab('tutorial');
      hidePdGlobalLoading();
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

    // タブのカテゴリー所属・カテゴリー内並び順のカスタマイズ（でお要望2026-09-27：
    // 「タブの並びやどのタブにどの項目を入れるかなどのカスタム性をもっと自由にできるといい」）。
    // sidebar_orderの見た目順（CSS order）と違い、こちらは実際にDOMノードを移動する
    // （機能フラグOFF時のhidden移動ロジックと同じ方式。openGroupFor()等がclosest()で
    // 所属カテゴリーを判定しているため、見た目だけでなく実際の親を変える必要がある）。
    // 機能フラグOFF中のタブ（hidden行き）はここでは動かさない——復帰先の判定は
    // categoryOfTab()を使ってapplyFeatureGating側が都度計算するため、二重管理にならない。
    window.__tabCategoryOverrides = {};

    // 店舗が任意の名前で追加した大カテゴリー（でお要望2026-09-27）を、実際のサイドバーの
    // レール（.pd-rail）・パネル（.pd-panel-section）としてその場で生成/削除する。
    // 標準8カテゴリーはJSXに静的に書かれているが、カスタムカテゴリーは店舗ごとに
    // 増減するためDOM生成が必要——機能フラグOFF時にタブを'hidden'へ動かす既存の仕組み
    // （.pd-panel-section[data-panel]間でDOMノードを移動するだけ）と同じ土台の上に乗せる。
    function syncCustomCategoryRail(prefs) {
      const rail = document.getElementById('pd-rail');
      if (!rail) return;
      const hiddenBtn = document.getElementById('pd-rail-hidden-btn');
      const anyPanel = document.querySelector('.pd-panel-section');
      const customCategories = prefs?.custom_categories || [];
      customCategories.forEach(cat => {
        let btn = rail.querySelector(`.pd-rail-btn[data-category="${cat.key}"]`);
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pd-rail-btn';
          btn.dataset.category = cat.key;
          btn.addEventListener('click', () => selectCategory(cat.key));
          rail.insertBefore(btn, hiddenBtn || null);
        }
        btn.textContent = cat.label;
        if (!document.querySelector(`.pd-panel-section[data-panel="${cat.key}"]`)) {
          const panel = document.createElement('div');
          panel.className = 'pd-panel-section';
          panel.dataset.panel = cat.key;
          panel.style.display = 'none';
          anyPanel?.parentElement?.appendChild(panel);
        }
      });
      // 削除されたカスタムカテゴリーに対応する要素は取り除く（標準8種・hiddenは対象外）
      const validKeys = new Set(customCategories.map(c => c.key));
      rail.querySelectorAll('.pd-rail-btn[data-category^="custom_"]').forEach(btn => {
        if (!validKeys.has(btn.dataset.category)) btn.remove();
      });
      document.querySelectorAll('.pd-panel-section[data-panel^="custom_"]').forEach(panel => {
        if (!validKeys.has(panel.dataset.panel)) panel.remove();
      });
    }

    function applyTabLayout(prefs) {
      syncCustomCategoryRail(prefs);
      window.__tabCategoryOverrides = prefs?.tab_category_overrides || {};
      const orderOverrides = prefs?.tab_order_overrides || {};
      TAB_CATALOG.forEach(t => {
        const btn = document.querySelector(`.tab-btn[data-tab="${t.key}"]`);
        if (!btn || btn.classList.contains('tab-feature-off')) return; // OFF中は現状維持（hidden側の管理に任せる）
        const targetCategory = categoryOfTab(t.key, window.__tabCategoryOverrides);
        const targetSection = document.querySelector(`.pd-panel-section[data-panel="${targetCategory}"]`);
        if (targetSection && btn.parentElement !== targetSection) targetSection.appendChild(btn);
      });
      Object.entries(orderOverrides).forEach(([categoryKey, order]) => {
        const section = document.querySelector(`.pd-panel-section[data-panel="${categoryKey}"]`);
        if (!section) return;
        order.forEach(tabKey => {
          const btn = section.querySelector(`.tab-btn[data-tab="${tabKey}"]`);
          if (btn) section.appendChild(btn);
        });
      });
    }

    (async () => {
      const _prefsToken = getSupabaseToken();
      if (!_prefsToken) return;
      const res = await fetch('/api/provider/dashboard-prefs', { headers: { Authorization: `Bearer ${_prefsToken}` } });
      if (!res.ok) return;
      const { prefs } = await res.json();
      dashboardPrefs = prefs;
      renderHeaderShortcuts(prefs);
      applyTabLayout(prefs);

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
        if (SPINNER_TRACKED_TABS.includes(prefs.landing_tab)) pdLandingTabKey = prefs.landing_tab;
        else hidePdGlobalLoading();
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

    // でお報告2026-10-02：「タイムアウトで再ログインが必要になる回数が多すぎる」。
    // auth.refresh_tokens/sessions を調べると、再ログインの直前までセッションは失効しておらず
    // （最後のリフレッシュトークンが revoked でない）、スマホ復帰直後など回線が不安定な瞬間の
    // リフレッシュ失敗→アクセストークン期限切れ→/api が401→即ログイン画面、という経路で
    // 生きているセッションを捨てていた。401を受けたら、まずリフレッシュを数回リトライして
    // 成功すればそのまま再実行する。ログイン画面へ飛ばすのは、リフレッシュトークン自体が
    // 無効（fatal）と確定した時だけにする。通信不良（network）の間は何もしない。
    let refreshInflight = null;
    let lastRefreshResult = null;
    function refreshSessionWithRetry() {
      if (refreshInflight) return refreshInflight;
      refreshInflight = (async () => {
        for (let i = 0; i < 4; i++) {
          try {
            const { data, error } = await _sb.auth.refreshSession();
            if (!error && data?.session) return 'ok';
            if (error && !(error.name === 'AuthRetryableFetchError' || error.status >= 500)) return 'fatal';
          } catch {}
          await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        }
        return 'network';
      })().then(r => { lastRefreshResult = r; return r; }).finally(() => { refreshInflight = null; });
      return refreshInflight;
    }
    const rawFetch = window.fetch;
    window.fetch = async function (input, init) {
      init = withOperator(input, init);
      const res = await rawFetch.call(this, input, init);
      if (res.status !== 401) return res;
      const url = typeof input === 'string' ? input : input?.url || '';
      const auth = init?.headers && (init.headers.Authorization || init.headers.authorization);
      if (!url.startsWith('/api/') || !auth || !String(auth).startsWith('Bearer ')) return res;
      if ((await refreshSessionWithRetry()) !== 'ok') return res;
      const fresh = getSupabaseToken();
      if (!fresh) return res;
      const headers = { ...init.headers };
      delete headers.authorization;
      headers.Authorization = `Bearer ${fresh}`;
      return rawFetch.call(this, input, { ...init, headers });
    };
    const onOnline = () => { _sb.auth.getSession().catch(() => {}); };
    window.addEventListener('online', onOnline);

    // ログアウト（でお要望2026-09-15：「ログアウトボタンを押したら、掲載者管理画面への
    // ログイン画面に戻るようにして」）。confirm()ダイアログは、環境によって黙って
    // falseを返す・表示されないケースがあり（でお報告2026-09-17：ログアウトを押しても
    // 画面が変わらずURLに?tab=undefinedが付くだけになる不具合の実際の原因の1つだった）、
    // ログアウトはやり直しがきく操作なので確認ダイアログ自体を廃止する。signOut()は
    // ネットワーク通信を伴い、回線が不安定だとawaitが長引くことがあるため3秒で
    // タイムアウトし、signOut自体が終わらなくても必ず掲載者向けログイン画面へ遷移させる。
    document.getElementById('pd-logout-btn')?.addEventListener('click', async () => {
      try {
        await Promise.race([
          _sb.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]);
      } catch {}
      window.location.replace(PROVIDER_LOGIN_URL);
    });

    // 上のgetSession()呼び出しでも直せない場合（リフレッシュトークン自体も失効等）に、
    // 各タブの「取得エラー」を401の時だけ再ログイン導線付きに出し分けるための共通ヘルパー。
    // でお報告2026-09-18：「掲載者管理画面のログイン画面のデザインが前のものに戻っている」
    // の原因はここ——type=providerを付け忘れていたため、セッション切れ時の再ログイン
    // リンクだけ一般ユーザー向けの見た目に戻ってしまっていた（ログアウトボタン側は
    // 別途type=provider付きで直し済みだったが、この401フォールバックは対象外だった）。
    // ビルド時に検知できるよう、URLをハードコードせず唯一の定数から組み立てる。
    function authErrorHtml(res) {
      if (res?.status === 401) {
        return `<p style="color:#ef4444" class="muted">セッションの有効期限が切れています。<a href="${PROVIDER_LOGIN_URL}&redirect=%2Fprovider%2Fdashboard" style="color:inherit;text-decoration:underline;font-weight:700;">再ログインしてください</a></p>`;
      }
      return '<p style="color:#ef4444" class="muted">取得エラー</p>';
    }

    // でお要望2026-09-24：「特定の掲載者管理画面を直接URLを開いた時に、タイムアウトに
    // なっているならちゃんとログイン画面に戻るようにして」。以前は401が返ってもnullを
    // 返すだけで、呼び出し元(下のfetchAndCacheProviderData().then)は「データが無い＝
    // 何もしない」としか扱っていなかった。localStorageに前回ログイン時のprovider情報が
    // 残っていると、その古いキャッシュのままダッシュボードの見た目だけは表示され、
    // 各タブを開いた時に個別に「セッション切れ」表示が出るだけでログイン画面には
    // 戻らなかった。401(＝セッションタイムアウト)の時だけ、ここで即座にログイン画面へ
    // リダイレクトする。トークンが元から無い（未ログインでURLを直接開いた等）場合や
    // ネットワーク瞬断等それ以外は対象外——でお指摘2026-09-24「タイムアウトになってたら
    // の時だけ」の通り、タイムアウト以外でログイン画面へ飛ばすと未ログイン時の意図しない
    // 挙動やトークン読み取りのタイミング差での誤リダイレクトを招くため、範囲を絞る。
    function redirectToProviderLogin() {
      window.location.replace(`${PROVIDER_LOGIN_URL}&redirect=%2Fprovider%2Fdashboard`);
    }
    async function fetchAndCacheProviderData() {
      // 401でリダイレクトする前に、まず失効トークンの裏側リフレッシュ（474行目、
      // fire-and-forget）を待つ。待たずに読むと、リフレッシュ可能なだけの期限切れ
      // トークンでも本当に無効と誤判定してログイン画面へ飛ばしてしまう。
      await _sb.auth.getSession().catch(() => {});
      const token = getSupabaseToken();
      if (!token) return null;
      try {
        const res = await fetch('/api/provider/me', {
          headers: { 'Authorization': `Bearer ${getSupabaseToken()}` }
        });
        if (res.status === 401) {
          if (lastRefreshResult !== 'network') redirectToProviderLogin();
          return null;
        }
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
        // でお要望2026-09-29：プロフィール・アピール設定タブの上部からも公開ページを
        // すぐ確認できるように（編集内容がどう見えるかその場で確認したい場面が多いため）。
        const profileViewBtn = document.getElementById('profile-view-page-btn');
        if (profileViewBtn) profileViewBtn.href = `/provider/${slug}?tab=basic`;
        const appealViewBtn = document.getElementById('appeal-view-page-btn');
        if (appealViewBtn) appealViewBtn.href = `/provider/${slug}?tab=appeal`;
        const publishViewBtn = document.getElementById('publish-view-page-btn');
        if (publishViewBtn) publishViewBtn.href = `/provider/${slug}`;
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
      ['name', 'photo_url', 'nearest_station', 'prefecture', 'address',
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
      // アピール設定タブのフィールド読み込み（でお要望2026-09-29：profile-form/
      // service-formから分離した文言フィールド。philosophy/guide_message/unique_strengthsは
      // でお要望2026-10-01でページ構成ブロック一覧側の直接編集に一本化したためここでは読まない）
      ['catchphrase', 'target_desc'].forEach(k => {
        const el = document.getElementById('appeal-profile-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      ['ideal_client_desc', 'client_before_state', 'transformation_pattern', 'best_fit_desc'].forEach(k => {
        const el = document.getElementById('appeal-matching-form')?.elements[k];
        if (el) el.value = provider[k] || '';
      });
      // AI分析ステータス表示 & ボタン制御
      const aiStatus = document.getElementById('ai-match-status');
      if (provider.ai_match_profile) {
        const d = provider.ai_match_profile;
        const date = d.analyzed_at ? new Date(d.analyzed_at).toLocaleDateString('ja-JP') : '';
        if (aiStatus) aiStatus.innerHTML = `<span style="color:#059669;font-weight:700">AI分析済み（${date}）</span><br><span style="font-size:12px;color:rgba(26,20,16,0.6)">${d.summary || ''}</span>`;
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
      // このケースは起動時タブの読み込み完了という合図が発生しえないため、ここで消す
      // （プロフィール自体が取得できていない＝どのタブも正しく動かない状態のため）。
      hidePdGlobalLoading();
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
      const allCats = [provider.main_category, ...(provider.sub_categories || [])].filter(Boolean);
      const coveredAxes = [...new Set(allCats.map(c => CAT_TO_AXIS[c]).filter(Boolean))];
      const infoEl = document.getElementById('axis-coverage-info');
      if (infoEl) {
        if (coveredAxes.length > 0) {
          infoEl.innerHTML = `
            <div style="padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
              <p style="font-size:12px;font-weight:700;color:#059669;margin:0 0 8px">✓ 自動検出されたカバー軸（8軸のうち）</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${coveredAxes.map(ax => `<span style="font-size:13px;font-weight:700;padding:4px 12px;background:#dcfce7;color:#15803d;border-radius:99px">${AXIS_LABELS[ax]}</span>`).join('')}
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        if (status && !status.innerHTML.includes('')) {
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
          headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '分析に失敗しました');
        const d = json.profile;
        if (status) {
          status.innerHTML = `<span style="color:#059669;font-weight:700">AI分析完了</span><br><span style="font-size:12px;color:#6b7280">${d.summary || ''}</span>`;
        }
        showToast('AI分析が完了しました。マッチングに反映されます。');
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
      data.trial_available = !!e.target.querySelector('[name=trial_available]')?.checked;
      data.response_hours = data.response_hours ? Number(data.response_hours) : null;
      saveToLocal(data);
    });

    // アピール設定タブ（でお要望2026-09-29：公開ページ3タブ再編に合わせ、キャッチコピー・
    // 理念・AIマッチング用の物語的説明など「アピール」文言だけをまとめた新タブ）。
    // PATCH /api/provider/profile は部分更新のため、フォームを分けても保存は独立して安全。
    document.getElementById('appeal-profile-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      saveToLocal(data);
    });
    document.getElementById('appeal-matching-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.suitable_triggers = [...e.target.querySelectorAll('[name=suitable_triggers]:checked')].map(el => el.value);
      data.handles_failure_patterns = [...e.target.querySelectorAll('[name=handles_failure_patterns]:checked')].map(el => el.value);
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
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        renderPageScore(provider, items);
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだサービスがありません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f3f4f6;gap:10px';
          const AXIS_LABELS_D = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', hairremoval:'脱毛', teeth:'歯', nail:'爪' };
          row.innerHTML = `
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                <span style="font-weight:700;font-size:14px">${esc(s.name)}</span>
                ${s.is_featured ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">看板</span>' : ''}
                ${s.target_axis ? `<span style="font-size:11px;background:#eff6ff;color:#1d4ed8;padding:1px 7px;border-radius:99px">${AXIS_LABELS_D[s.target_axis]||s.target_axis}</span>` : ''}
              </div>
              <div style="font-size:13px;color:#6b7280">¥${Number(s.price).toLocaleString()}${s.duration_minutes ? ' · ' + s.duration_minutes + '分' : (s.duration ? ' · ' + esc(s.duration) : '')}</div>
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
          editForm.elements['duration_minutes'].value = s.duration_minutes || '';
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
          await fetch(`/api/provider/services/${btn.dataset.del}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
        const body = { name: fd.get('name'), price: Number(fd.get('price')), duration_minutes: fd.get('duration_minutes') ? Number(fd.get('duration_minutes')) : null, is_featured: !!editForm.elements['is_featured'].checked, image_url: fd.get('image_url') || null, suitable_path_types: suitablePathTypes.length > 0 ? suitablePathTypes : null, target_axis: fd.get('target_axis') || null, transformation_promise: fd.get('transformation_promise') || null, before_text: fd.get('before_text') || null, after_text: fd.get('after_text') || null, before_image_url: fd.get('before_image_url') || null, after_image_url: fd.get('after_image_url') || null, benefit_list: benefitList.length > 0 ? benefitList : null, category: fd.get('category') || null };
        const url = id ? `/api/provider/services/${id}` : '/api/provider/services';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` }, body: JSON.stringify(body) });
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
      const STAFF_EMP_LABEL = { fulltime: '正社員', parttime: 'パート', arbeit: 'アルバイト', contractor: '業務委託', other: 'その他' };
      const STAFF_COND_LEGAL = { max_hours_per_day: 8, max_hours_per_week: 40, min_days_off_per_week: 1, max_consecutive_days: 6 };
      const STAFF_COND_KEYS = ['max_hours_per_day', 'max_hours_per_week', 'max_hours_per_month', 'max_days_per_week', 'min_days_off_per_week', 'max_days_per_month', 'max_consecutive_days'];
      let staffConds = {};

      function applyCondPlaceholders() {
        const emp = editForm.elements['cond_employment_type'].value;
        STAFF_COND_KEYS.forEach(k => {
          editForm.elements['cond_' + k].placeholder = emp !== 'contractor' && STAFF_COND_LEGAL[k] != null ? `法定 ${STAFF_COND_LEGAL[k]}` : 'なし';
        });
      }
      function fillCondFields(c) {
        editForm.elements['cond_employment_type'].value = c?.employment_type || 'fulltime';
        STAFF_COND_KEYS.forEach(k => { editForm.elements['cond_' + k].value = c?.[k] ?? ''; });
        applyCondPlaceholders();
      }
      editForm?.elements['cond_employment_type']?.addEventListener('change', applyCondPlaceholders);

      async function loadStaff() {
        if (!listEl) return;
        const authH = { 'Authorization': `Bearer ${getSupabaseToken()}` };
        const [res, condRes] = await Promise.all([
          fetch('/api/provider/staff', { headers: authH }),
          fetch('/api/provider/shift-staff-conditions', { headers: authH }).catch(() => null),
        ]);
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const items = await res.json();
        staffConds = {};
        if (condRes && condRes.ok) (await condRes.json()).forEach(r => { staffConds[r.staff_id] = r; });
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだスタッフが登録されていません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f3f4f6';
          row.innerHTML = `
            <div style="flex-shrink:0">
              ${s.photo_url
                ? `<img src="${esc(s.photo_url)}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb" />`
                : `<div style="width:52px;height:52px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px"></div>`}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px">
                <strong style="font-size:14px">${esc(s.name)}</strong>
                ${s.is_featured ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">担当</span>' : ''}
                ${s.is_public === false ? '<span style="font-size:10px;background:#f3f4f6;color:#6b7280;padding:1px 6px;border-radius:99px;border:1px solid #d1d5db">非公開</span>' : ''}
                ${s.role ? `<span style="font-size:12px;color:#6b7280">${esc(s.role)}</span>` : ''}
                ${staffConds[s.id] ? `<span style="font-size:10px;background:#eef2ff;color:#4f46e5;padding:1px 6px;border-radius:99px">${esc(STAFF_EMP_LABEL[staffConds[s.id].employment_type] || '')}</span>` : ''}
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
          editForm.elements['is_public'].checked  = s.is_public !== false;
          editForm.elements['booking_fee'].value  = s.booking_fee || '';
          editForm.elements['_staff_id'].value    = s.id;
          showGallery(s.id);
          editForm.elements['strong_types_text'].value = (s.strong_types || []).join(', ');
          fillCondFields(staffConds[s.id]);
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
          await fetch(`/api/provider/staff/${btn.dataset.staffDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
          loadStaff();
        }));
      }

      document.getElementById('btn-add-staff')?.addEventListener('click', () => {
        editTitle.textContent = 'スタッフを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_staff_id'].value = '';
        showGallery('');
        fillCondFields(null);
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
          is_public: !!editForm.elements['is_public'].checked,
          booking_fee: fd.get('booking_fee') ? Number(fd.get('booking_fee')) : 0,
          strong_axes: Array.from(document.querySelectorAll('#staff-strong-axes input:checked')).map(i => i.value),
          strong_types: String(fd.get('strong_types_text') || '').split(',').map(s => s.trim()).filter(Boolean),
        };
        const url = id ? `/api/provider/staff/${id}` : '/api/provider/staff';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` }, body: JSON.stringify(body) });
        if (res.ok) {
          const saved = await res.json().catch(() => ({}));
          const staffId = id || saved.id;
          let condOk = true;
          if (staffId) {
            const cond = { staff_id: staffId, employment_type: fd.get('cond_employment_type') };
            STAFF_COND_KEYS.forEach(k => { cond[k] = fd.get('cond_' + k); });
            const cres = await fetch('/api/provider/shift-staff-conditions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` }, body: JSON.stringify({ items: [cond] }) }).catch(() => null);
            condOk = !!cres && cres.ok;
          }
          editCard.style.display = 'none'; editForm.reset(); loadStaff();
          showToast(condOk ? '保存しました' : 'スタッフは保存しましたが、労働条件の保存に失敗しました。もう一度編集して保存してください');
        }
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
          const res  = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` }, body: fd });
          const data = await res.json();
          if (res.ok && data.url) {
            staffImgPrev.src = data.url; staffImgPrevW.style.display = 'block';
            if (staffPhotoUrl) staffPhotoUrl.value = data.url;
            staffImgMsg.textContent = '✓ 写真を設定しました'; staffImgMsg.style.color = '#059669';
          } else { staffImgMsg.textContent = 'エラー: ' + (data.error || '不明'); staffImgMsg.style.color = '#ef4444'; }
        } catch { staffImgMsg.textContent = '通信エラー'; staffImgMsg.style.color = '#ef4444'; }
        staffImgBtn.disabled = false; staffImgInput.value = '';
      });

      // スタッフごとの実績写真ギャラリー（1人12枚まで。サービス画像と同じアップロードAPIを流用）
      const galGrid  = document.getElementById('staff-gallery-grid');
      const galHint  = document.getElementById('staff-gallery-hint');
      const galBtn   = document.getElementById('staff-gallery-btn');
      const galInput = document.getElementById('staff-gallery-input');
      const galMsg   = document.getElementById('staff-gallery-msg');
      let galStaffId = '';
      const galAuth = () => ({ 'Authorization': `Bearer ${getSupabaseToken()}` });

      function renderGallery(photos) {
        galGrid.innerHTML = '';
        photos.forEach(ph => {
          const cell = document.createElement('div');
          cell.style.cssText = 'width:110px;display:flex;flex-direction:column;gap:4px';
          const img = document.createElement('img');
          img.src = ph.image_url; img.alt = ph.caption || '実績写真';
          img.style.cssText = 'width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb';
          const cap = document.createElement('input');
          cap.type = 'text'; cap.maxLength = 80; cap.placeholder = '説明（任意）'; cap.value = ph.caption || '';
          cap.style.cssText = 'font-size:11px;padding:4px 6px;width:100%';
          cap.addEventListener('change', async () => {
            const r = await fetch(`/api/provider/staff/${galStaffId}/gallery/${ph.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...galAuth() }, body: JSON.stringify({ caption: cap.value }) });
            if (!r.ok) showToast('説明の保存に失敗しました');
          });
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除';
          del.style.cssText = 'font-size:11px;padding:2px 8px;color:#ef4444';
          del.addEventListener('click', async () => {
            if (!confirm('この写真を削除しますか？')) return;
            const r = await fetch(`/api/provider/staff/${galStaffId}/gallery/${ph.id}`, { method: 'DELETE', headers: galAuth() });
            if (r.ok) loadGallery(); else showToast('削除に失敗しました');
          });
          cell.append(img, cap, del);
          galGrid.appendChild(cell);
        });
      }
      async function loadGallery() {
        if (!galStaffId) return;
        const r = await fetch(`/api/provider/staff/${galStaffId}/gallery`, { headers: galAuth() });
        renderGallery(r.ok ? await r.json() : []);
      }
      function showGallery(staffId) {
        galStaffId = staffId;
        galGrid.innerHTML = ''; galMsg.textContent = '';
        galBtn.style.display = staffId ? '' : 'none';
        galHint.style.display = staffId ? 'none' : 'block';
        if (staffId) loadGallery();
      }
      galBtn?.addEventListener('click', () => galInput?.click());
      galInput?.addEventListener('change', async () => {
        const files = Array.from(galInput.files || []); if (!files.length || !galStaffId) return;
        galBtn.disabled = true;
        let ok = 0, lastErr = '';
        for (const [i, file] of files.entries()) {
          galMsg.textContent = `アップロード中… (${i + 1}/${files.length})`; galMsg.style.color = '';
          try {
            const fd = new FormData(); fd.append('photo', file);
            const up = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: galAuth(), body: fd });
            const upData = await up.json();
            if (!up.ok || !upData.url) { lastErr = upData.error || 'アップロードに失敗しました'; continue; }
            const add = await fetch(`/api/provider/staff/${galStaffId}/gallery`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...galAuth() }, body: JSON.stringify({ image_url: upData.url }) });
            if (add.ok) ok++; else { lastErr = (await add.json().catch(() => ({}))).error || '追加に失敗しました'; break; }
          } catch { lastErr = '通信エラー'; }
        }
        galMsg.textContent = lastErr ? `${ok}枚追加しました。${lastErr}` : `${ok}枚追加しました`;
        galMsg.style.color = lastErr ? '#ef4444' : '#059669';
        galBtn.disabled = false; galInput.value = '';
        loadGallery();
      });

      document.querySelectorAll('[data-tab="staff"]').forEach(btn => btn.addEventListener('click', loadStaff, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'staff') loadStaff();
    })();

    // ── シフト管理タブ（でお要望2026-09-13） ──────────────────────────
    (function setupShift() {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersShift = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });

      let shiftStaffList = [];
      let currentPeriodId = null;
      let currentPeriodStatus = null;
      let shiftPatterns = []; // [{id,name,slots}]
      let stagingSlots = []; // 新規パターン作成フォーム用 [{start,end,required}]
      let currentDayPatterns = {}; // 選択中の期間の date -> pattern_id
      let currentPeriodStart = null;
      let currentPeriodEnd = null;
      let currentEntries = []; // loadEntries()が最後に取得した確定シフト一覧（セル編集時の参照用）
      let shiftConditions = {}; // staff_id → 労働条件（雇用形態・上限・休日確保）
      let laborResult = { violations: [], stats: {} }; // 選択中の期間の労働条件チェック結果

      // でお指摘2026-10-01：「提出されたシフトを見るのがわかりづらい、編集も全部縦に
      // 1人ずつ出てきてみづらい。もっとカレンダーにまとめてほしい」。希望一覧・確定シフト
      // 一覧のどちらも「スタッフ×日付」の表にまとめ、縦の1行ずつの羅列をやめる。
      const SHIFT_WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

      // 定休日（でお要望2026-10-02：定休日はカレンダー上でもグレー表示に）。営業時間が未設定の店舗は
      // 全日が休みに見えてしまうため、1つでも曜日設定がある場合だけ判定する。
      let shiftBH = {};
      let shiftClosedDates = new Set();
      const SHIFT_WD_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      let closedInfoLoaded = false;
      async function loadClosedInfo() {
        closedInfoLoaded = true;
        const [bhRes, cdRes] = await Promise.all([
          fetch('/api/provider/business-hours', { headers: authHeadersShift() }).catch(() => null),
          fetch('/api/provider/closed-dates', { headers: authHeadersShift() }).catch(() => null),
        ]);
        if (bhRes?.ok) shiftBH = (await bhRes.json()).business_hours || {};
        if (cdRes?.ok) shiftClosedDates = new Set(((await cdRes.json()) || []).map(r => r.date));
      }
      function isShiftClosed(date) {
        if (shiftClosedDates.has(date)) return true;
        if (!Object.keys(shiftBH).length) return false;
        const h = shiftBH[SHIFT_WD_KEYS[new Date(date + 'T00:00:00Z').getUTCDay()]];
        return !h || h.closed || !h.open || !h.close;
      }
      function renderStaffDateGrid(dates, cellFn) {
        const header = dates.map(d => {
          const day = Number(d.slice(-2));
          const wd = new Date(d + 'T00:00:00Z').getUTCDay();
          const closed = isShiftClosed(d);
          return `<th style="padding:4px 6px;font-size:10px;font-weight:700;color:${wd === 0 ? '#dc2626' : wd === 6 ? '#2563eb' : '#6b7280'};white-space:nowrap;border-bottom:1px solid #e5e7eb${closed ? ';background:#e5e7eb' : ''}">${day}<br>${SHIFT_WEEKDAY_JA[wd]}${closed ? '<br><span style="font-weight:400">休</span>' : ''}</th>`;
        }).join('');
        const rows = shiftStaffList.map(s => `
          <tr>
            <td style="position:sticky;left:0;background:#fff;padding:4px 10px;font-size:12px;font-weight:700;white-space:nowrap;border-right:1px solid #e5e7eb;border-bottom:1px solid #f3f4f6">${esc(s.name)}</td>
            ${dates.map(d => (isShiftClosed(d) ? cellFn(s, d).replace('<td style="', '<td style="background:#f3f4f6;') : cellFn(s, d))).join('')}
          </tr>`).join('');
        return `<div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;max-width:100%">
          <table style="border-collapse:collapse;width:max-content;min-width:100%">
            <thead><tr><th style="position:sticky;left:0;background:#fff;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb"></th>${header}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      }
      function renderShiftRequestsGrid(dates, requests) {
        const reqMap = {};
        requests.forEach(r => { (reqMap[r.staff_id] = reqMap[r.staff_id] || {})[r.date] = r; });
        const cell = (s, d) => {
          const r = reqMap[s.id]?.[d];
          if (!r) return `<td style="padding:4px 6px;text-align:center;font-size:11px;color:#d1d5db;border-bottom:1px solid #f3f4f6">—</td>`;
          if (r.type === 'work') return `<td style="padding:4px 6px;text-align:center;font-size:11px;color:#2563eb;font-weight:700;white-space:nowrap;border-bottom:1px solid #f3f4f6">${esc((r.start_time || '').slice(0, 5))}〜${esc((r.end_time || '').slice(0, 5))}</td>`;
          return `<td style="padding:4px 6px;text-align:center;font-size:12px;color:#dc2626;font-weight:700;border-bottom:1px solid #f3f4f6">休</td>`;
        };
        return renderStaffDateGrid(dates, cell) + '<p class="muted" style="font-size:11px;margin-top:6px">青=出勤希望時間／赤「休」=休み希望／グレー「—」=未提出</p>';
      }
      function renderShiftEntriesGrid(dates, entries) {
        const map = {};
        entries.forEach(e => { ((map[e.staff_id] = map[e.staff_id] || {})[e.date] = map[e.staff_id][e.date] || []).push(e); });
        const cell = (s, d) => {
          const list = map[s.id]?.[d] || [];
          const inner = list.length
            ? list.map(e => `${esc((e.start_time || '').slice(0, 5))}〜${esc((e.end_time || '').slice(0, 5))}${e.source === 'auto' ? '<span style="color:#9ca3af">・自動</span>' : ''}`).join('<br>')
            : '<span style="color:#d1d5db">—</span>';
          return `<td style="padding:4px 6px;text-align:center;font-size:11px;white-space:nowrap;border-bottom:1px solid #f3f4f6;cursor:pointer" data-shift-cell-staff="${s.id}" data-shift-cell-date="${d}">${inner}</td>`;
        };
        return renderStaffDateGrid(dates, cell);
      }
      // セルをタップしてその日のシフトを追加・削除する（縦の手動追加フォームまで
      // スクロールしなくても、その場で編集できるように）。
      function showShiftCellEditor(staffId, date) {
        document.getElementById('shift-cell-modal-overlay')?.remove();
        const nameOf = id => shiftStaffList.find(s => s.id === id)?.name || '(不明)';
        const list = currentEntries.filter(e => e.staff_id === staffId && e.date === date);
        const overlay = document.createElement('div');
        overlay.id = 'shift-cell-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:360px">
            <h3 style="margin:0 0 4px;font-size:15px;font-weight:800">${esc(nameOf(staffId))}・${esc(date)}</h3>
            <p class="muted" style="font-size:12px;margin:0 0 14px">この日のシフトを編集します</p>
            <div style="margin-bottom:12px">
              ${list.length ? list.map(e => `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
                  <span style="flex:1">${esc((e.start_time || '').slice(0, 5))}〜${esc((e.end_time || '').slice(0, 5))}${e.source === 'auto' ? '<span class="muted" style="font-size:11px"> ・自動</span>' : ''}</span>
                  <button type="button" data-shift-cell-del="${e.id}" style="font-size:11px;padding:3px 8px;border:1px solid #fca5a5;color:#ef4444;background:none;border-radius:6px;cursor:pointer">削除</button>
                </div>
              `).join('') : '<p class="muted" style="font-size:12px;margin:0">まだシフトがありません。</p>'}
            </div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:12px">
              <input type="time" id="shift-cell-start" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
              <span style="color:#9ca3af">〜</span>
              <input type="time" id="shift-cell-end" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
            </div>
            <div style="display:flex;gap:8px">
              <button type="button" id="shift-cell-add-btn" style="flex:1;padding:10px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">追加</button>
              <button type="button" id="shift-cell-close-btn" style="padding:10px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">閉じる</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#shift-cell-close-btn')?.addEventListener('click', () => overlay.remove());
        overlay.querySelectorAll('[data-shift-cell-del]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/shift-entries/${btn.dataset.shiftCellDel}`, { method: 'DELETE', headers: authHeadersShift() });
          if (res.ok) { overlay.remove(); loadEntries(); loadCalendar(); } else showToast('削除に失敗しました');
        }));
        overlay.querySelector('#shift-cell-add-btn')?.addEventListener('click', async () => {
          const start_time = document.getElementById('shift-cell-start')?.value;
          const end_time = document.getElementById('shift-cell-end')?.value;
          if (!start_time || !end_time) { showToast('開始・終了時刻を入力してください'); return; }
          const res = await fetch('/api/provider/shift-entries', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
            body: JSON.stringify({ period_id: currentPeriodId, staff_id: staffId, date, start_time, end_time }),
          });
          if (res.ok) { overlay.remove(); loadEntries(); loadCalendar(); } else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        });
      }

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

      // ── スタッフの労働条件（でお指摘2026-10-02：雇用形態・上限・休日確保が人によって違うので、
      //    見ながら作れて、自動作成にも反映されないと労基違反になる） ──
      const SHIFT_EMP_LABEL = { fulltime: '正社員', parttime: 'パート', arbeit: 'アルバイト', contractor: '業務委託', other: 'その他' };
      const COND_LEGAL = { max_hours_per_day: 8, max_hours_per_week: 40, min_days_off_per_week: 1, max_consecutive_days: 6 };
      const COND_FIELDS = [
        ['max_hours_per_day', '1日の上限（時間）'],
        ['max_hours_per_week', '週の上限（時間）'],
        ['max_hours_per_month', '月の上限（時間）'],
        ['max_days_per_week', '週の最大勤務日数'],
        ['min_days_off_per_week', '週の最低休日数'],
        ['max_days_per_month', '月の最大勤務日数'],
        ['max_consecutive_days', '連続勤務の上限（日）'],
      ];
      const condPlaceholder = (emp, key) => (emp !== 'contractor' && COND_LEGAL[key] != null ? `法定 ${COND_LEGAL[key]}` : 'なし');
      const empOf = id => shiftConditions[id]?.employment_type || null;
      const empBadge = id => (empOf(id) ? `<span style="font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px;background:#eef2ff;color:#4f46e5;margin-left:6px">${esc(SHIFT_EMP_LABEL[empOf(id)] || '')}</span>` : '');

      async function loadConditions() {
        const el = document.getElementById('shift-conditions-list');
        if (!el) return;
        if (!shiftStaffList.length) await loadStaffLinks();
        const res = await fetch('/api/provider/shift-staff-conditions', { headers: authHeadersShift() });
        const rows = res.ok ? await res.json() : [];
        shiftConditions = {};
        rows.forEach(r => { shiftConditions[r.staff_id] = r; });
        if (!shiftStaffList.length) { el.innerHTML = '<p class="muted" style="font-size:12px">スタッフが登録されていません。</p>'; return; }
        el.innerHTML = shiftStaffList.map(st => {
          const c = shiftConditions[st.id] || {};
          const emp = c.employment_type || 'fulltime';
          return `
          <div data-cond-card="${st.id}" style="padding:10px 12px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <strong style="flex:1;font-size:13px">${esc(st.name)}</strong>
              <select data-cond-staff="${st.id}" data-cond-field="employment_type" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px">
                ${Object.entries(SHIFT_EMP_LABEL).map(([k, v]) => `<option value="${k}"${k === emp ? ' selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">
              ${COND_FIELDS.map(([key, label]) => `
                <label style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:#6b7280">${label}
                  <input type="number" min="0" step="0.5" data-cond-staff="${st.id}" data-cond-field="${key}" value="${c[key] ?? ''}" placeholder="${condPlaceholder(emp, key)}" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;color:#111" />
                </label>`).join('')}
            </div>
          </div>`;
        }).join('');
        el.querySelectorAll('select[data-cond-field="employment_type"]').forEach(sel => sel.addEventListener('change', () => {
          el.querySelectorAll(`input[data-cond-staff="${sel.dataset.condStaff}"]`).forEach(inp => { inp.placeholder = condPlaceholder(sel.value, inp.dataset.condField); });
        }));
        renderLaborPanel();
      }
      document.getElementById('shift-conditions-save-btn')?.addEventListener('click', async () => {
        const msg = document.getElementById('shift-conditions-save-msg');
        const byStaff = {};
        document.querySelectorAll('[data-cond-staff]').forEach(inp => {
          (byStaff[inp.dataset.condStaff] = byStaff[inp.dataset.condStaff] || { staff_id: inp.dataset.condStaff })[inp.dataset.condField] = inp.value;
        });
        const items = Object.values(byStaff);
        if (!items.length) return;
        if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
        const res = await fetch('/api/provider/shift-staff-conditions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ items }),
        });
        if (res.ok) {
          if (msg) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
          await loadConditions();
          loadLaborCheck();
        } else if (msg) { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
      });

      async function fetchLabor(periodId) {
        const res = await fetch(`/api/provider/shift-periods/${periodId}/labor-check`, { headers: authHeadersShift() });
        return res.ok ? await res.json() : { violations: [], stats: {} };
      }
      const stripName = msg => String(msg || '').replace(/^[^：]*：/, '');
      function renderLaborPanel() {
        const el = document.getElementById('shift-labor-panel');
        if (!el || !currentPeriodId) return;
        const { violations = [], stats = {} } = laborResult;
        const unset = shiftStaffList.filter(st => !shiftConditions[st.id]);
        const vioHtml = violations.length
          ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#991b1b">
              <strong>労働条件を超えている箇所が${violations.length}件あります。確定する前に調整してください。</strong>
              <ul style="margin:6px 0 0;padding-left:18px">${violations.map(v => `<li>${esc(v.message)}</li>`).join('')}</ul>
            </div>`
          : '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:8px 14px;font-size:12.5px;color:#065f46">✓ 労働条件（上限・休日確保）の超過はありません</div>';
        const rows = shiftStaffList.map(st => {
          const sx = stats[st.id] || { days: 0, hours: 0 };
          const bad = violations.some(v => v.staff_id === st.id);
          return `<tr${bad ? ' style="background:#fef2f2"' : ''}>
            <td style="padding:4px 8px;white-space:nowrap">${esc(st.name)}${empBadge(st.id)}</td>
            <td style="padding:4px 8px;text-align:right;white-space:nowrap">${sx.days}日</td>
            <td style="padding:4px 8px;text-align:right;white-space:nowrap">${sx.hours}時間</td>
          </tr>`;
        }).join('');
        el.innerHTML = vioHtml
          + (shiftStaffList.length ? `<div style="overflow-x:auto;margin-top:8px"><table style="font-size:12px;border-collapse:collapse;min-width:220px"><thead><tr style="color:#6b7280"><th style="padding:4px 8px;text-align:left;font-weight:600">スタッフ（この期間）</th><th style="padding:4px 8px;text-align:right;font-weight:600">勤務日数</th><th style="padding:4px 8px;text-align:right;font-weight:600">合計</th></tr></thead><tbody>${rows}</tbody></table></div>` : '')
          + (unset.length ? `<p class="muted" style="font-size:11.5px;margin:8px 0 0;line-height:1.6">労働条件が未設定のスタッフ（${unset.map(x => esc(x.name)).join('、')}）は、正社員扱いの法定の目安（1日8時間・週40時間・週1日以上の休み・連続6日まで）で判定しています。下の「設定」の「スタッフの労働条件」で設定できます。</p>` : '')
          + '<p class="muted" style="font-size:11px;margin:6px 0 0;line-height:1.6">時間は拘束時間から法定の最低休憩（6時間超45分・8時間超60分）を引いた実働で数えています。休憩は実際に確保してください。</p>';
      }
      async function loadLaborCheck() {
        const el = document.getElementById('shift-labor-panel');
        if (!el || !currentPeriodId) return;
        laborResult = await fetchLabor(currentPeriodId);
        renderLaborPanel();
      }

      // ── 期間 ──
      const PERIOD_STATUS_LABEL = { collecting: '希望募集中', draft: '下書き（調整中）', confirmed: '確定済み' };
      const PERIOD_STATUS_COLOR = { collecting: '#f59e0b', draft: '#6366f1', confirmed: '#10b981' };

      let shiftPeriods = [];
      function setDetailBody(show) {
        const body = document.getElementById('shift-detail-body');
        if (body) body.style.display = show ? '' : 'none';
      }
      function highlightPeriodRows() {
        const sel = document.getElementById('shift-period-select');
        if (sel && currentPeriodId) sel.value = currentPeriodId;
        const p = shiftPeriods.find(x => x.id === currentPeriodId);
        const badge = document.getElementById('shift-period-badge');
        if (badge && p) {
          badge.textContent = PERIOD_STATUS_LABEL[p.status] || p.status;
          badge.style.background = `${PERIOD_STATUS_COLOR[p.status]}20`;
          badge.style.color = PERIOD_STATUS_COLOR[p.status];
        }
        const meta = document.getElementById('shift-period-meta');
        if (meta && p) {
          const over = p.status === 'collecting' && p.request_deadline && p.request_deadline < shiftTodayStr();
          meta.textContent = p.request_deadline ? `希望の提出締切：${p.request_deadline}${p.status === 'collecting' ? (over ? '（締切超過・未提出のスタッフは遅れて提出できます。提出済みのスタッフは変更できません）' : '（締切後は提出済みのスタッフが変更できなくなります）') : ''}` : '';
        }
        const nd = document.getElementById('shift-period-notify-days');
        if (nd && p) {
          nd.value = (p.notify_days_before || [1, 0]).join(',');
          document.getElementById('shift-period-notify-wrap').style.display = p.status === 'collecting' && p.request_deadline ? '' : 'none';
        }
      }
      async function loadPeriods() {
        const el = document.getElementById('shift-period-list');
        if (!el) return;
        const res = await fetch('/api/provider/shift-periods', { headers: authHeadersShift() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const periods = await res.json();
        shiftPeriods = periods;
        if (!periods.length) {
          el.innerHTML = '<p class="muted" style="font-size:13px;margin:0">まだ期間がありません。下の「設定」の「期間を作成」から追加してください。</p>';
          currentPeriodId = null;
          setDetailBody(false);
          return;
        }
        el.innerHTML = `
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">対象の期間</label>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <select id="shift-period-select" style="flex:1;min-width:200px;padding:9px 10px;font-size:14px;border:1.5px solid #c9a84c;border-radius:8px;background:#fff;color:#111827">
              ${periods.map(p => `<option value="${p.id}">${esc(p.period_start)} 〜 ${esc(p.period_end)}</option>`).join('')}
            </select>
            <span id="shift-period-badge" style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px"></span>
          </div>
          <div id="shift-period-meta" class="muted" style="font-size:12px;margin-top:4px"></div>
          <div id="shift-period-notify-wrap" style="margin-top:8px;display:none">
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">締切の何日前にLINEで通知するか（カンマ区切り・0は締切当日）</label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input id="shift-period-notify-days" type="text" placeholder="3,1,0" style="width:140px;padding:7px 10px;font-size:14px;border:1px solid #d1d5db;border-radius:8px" />
              <button type="button" class="btn btn-ghost" id="shift-period-notify-save" style="font-size:12px;padding:6px 12px">保存</button>
            </div>
          </div>`;
        el.querySelector('#shift-period-notify-save').addEventListener('click', async () => {
          if (!currentPeriodId) return;
          const raw = document.getElementById('shift-period-notify-days').value;
          if (!/^\s*\d+(\s*[,、，]\s*\d+)*\s*$/.test(raw)) { showToast('数字をカンマで区切って入力してください（例：3,1,0）'); return; }
          const res = await fetch('/api/provider/shift-periods/' + currentPeriodId, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
            body: JSON.stringify({ notify_days_before: raw.replace(/[、，]/g, ',') }),
          });
          if (res.ok) { showToast('通知日を保存しました'); await loadPeriods(); }
          else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        });
        el.querySelector('#shift-period-select').addEventListener('change', e => {
          const p = shiftPeriods.find(x => x.id === e.target.value);
          if (p) selectPeriod(p.id, p.status, p.period_start, p.period_end);
        });
        // 選択中の期間が無い／消えた場合は、今日を含む期間（無ければ開始日が最新の期間）を自動で開く
        let target = periods.find(p => p.id === currentPeriodId);
        if (!target) {
          const todayStr = shiftTodayStr();
          target = periods.find(p => p.period_start <= todayStr && todayStr <= p.period_end)
            || [...periods].sort((a, b) => (a.period_start < b.period_start ? 1 : -1))[0];
        }
        if (target) await selectPeriod(target.id, target.status, target.period_start, target.period_end);
      }
      document.getElementById('shift-period-add-btn')?.addEventListener('click', async () => {
        const period_start = document.getElementById('shift-period-start')?.value;
        const period_end = document.getElementById('shift-period-end')?.value;
        const request_deadline = document.getElementById('shift-period-deadline')?.value || null;
        const notify_days_before = document.getElementById('shift-period-notify-new')?.value || '1,0';
        if (!period_start || !period_end) { showToast('開始日・終了日を入力してください'); return; }
        const res = await fetch('/api/provider/shift-periods', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ period_start, period_end, request_deadline, notify_days_before }),
        });
        if (res.ok) { showToast('期間を作成しました'); await loadPeriods(); loadCalendar(); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      // ── 期間の詳細（希望一覧・シフト表） ──
      async function selectPeriod(id, status, periodStart, periodEnd) {
        currentPeriodId = id;
        currentPeriodStatus = status;
        currentPeriodStart = periodStart;
        currentPeriodEnd = periodEnd;
        setDetailBody(true);
        const confirmBtn = document.getElementById('shift-confirm-btn');
        if (confirmBtn) confirmBtn.disabled = status === 'confirmed';
        document.getElementById('shift-generate-warnings').innerHTML = '';
        const laborEl = document.getElementById('shift-labor-panel');
        if (laborEl) laborEl.innerHTML = '';
        highlightPeriodRows();
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
        const [reqRes, subRes, entRes] = await Promise.all([
          fetch(`/api/provider/shift-requests?periodId=${currentPeriodId}&implied=1`, { headers: authHeadersShift() }),
          fetch(`/api/provider/shift-submissions?periodId=${currentPeriodId}`, { headers: authHeadersShift() }),
          fetch(`/api/provider/shift-entries?periodId=${currentPeriodId}`, { headers: authHeadersShift() }),
          closedInfoLoaded ? null : loadClosedInfo(),
        ]);
        const applyEntries = entRes.ok ? await entRes.json() : [];
        if (!reqRes.ok) { el.innerHTML = authErrorHtml(reqRes); return; }
        const allRequests = await reqRes.json();
        // implied:true は休み希望のみで提出した人の「休み以外は出勤可」分（一括適用パネル専用・表には出さない）
        const requests = allRequests.filter(r => !r.implied);
        const submissions = subRes.ok ? await subRes.json() : [];
        const submittedIds = new Set(submissions.map(s => s.staff_id));

        // 提出完了状況（でお要望2026-09-14：日付ごとの提出ボタンをやめた分、店舗側は
        // 誰が「これで完了です」を押したか一目で分かるようにする）
        const statusHtml = shiftStaffList.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${shiftStaffList.map(s => `
              <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${submittedIds.has(s.id) ? '#10b98120' : '#f3f4f6'};color:${submittedIds.has(s.id) ? '#10b981' : '#9ca3af'}">${submittedIds.has(s.id) ? '✓' : '…'} ${esc(s.name)}</span>
            `).join('')}</div>`
          : '';

        if (!allRequests.length) { el.innerHTML = statusHtml + '<p class="muted" style="font-size:13px">まだ希望が提出されていません。</p>'; return; }
        if (!shiftStaffList.length || !currentPeriodStart || !currentPeriodEnd) { el.innerHTML = statusHtml; return; }
        el.innerHTML = statusHtml + renderShiftRequestsGrid(datesInRange(currentPeriodStart, currentPeriodEnd), requests) + renderApplyPanel(allRequests, applyEntries);
        bindApplyPanel(el);
        // noteがある希望は表には出さないため、別途一覧で補足する（でお要望の主眼は
        // 「表でまとめて見たい」であり、備考の文章までは表のセルに収まらないため）
        const withNote = requests.filter(r => r.note);
        if (withNote.length) {
          el.innerHTML += `<div style="margin-top:10px">${withNote.map(r => `
            <p class="muted" style="font-size:12px;margin:2px 0">${esc(nameOf(r.staff_id))}・${esc(r.date)}：${esc(r.note)}</p>
          `).join('')}</div>`;
        }
      }

      // ── 提出された希望をスタッフごとに選んで一括適用（でお要望2026-10-02） ──
      // 選択状態は selectedApply（"staffId|date"）で持つ。スタッフ名チェック＝その人の全日、
      // 日付個別の調整はポップアップのミニカレンダーで行う（スマホで縦に長くならないように）。
      let applyData = { works: [], offSet: new Set(), entries: [] };
      const selectedApply = new Set();
      function applyStatus(r) {
        const toMin = t => { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + m; };
        if (applyData.entries.some(e => e.staff_id === r.staff_id && e.date === r.date && toMin(e.start_time) < toMin(r.end_time) && toMin(e.end_time) > toMin(r.start_time))) return 'done';
        if (applyData.offSet.has(`${r.staff_id}|${r.date}`)) return 'off';
        return 'free';
      }
      function renderApplyPanel(requests, entries) {
        applyData = { works: requests.filter(r => r.type === 'work'), offSet: new Set(requests.filter(r => r.type === 'off').map(r => `${r.staff_id}|${r.date}`)), entries };
        selectedApply.clear();
        if (!applyData.works.length) return '';
        const rows = shiftStaffList.map(st => {
          const mine = applyData.works.filter(r => r.staff_id === st.id);
          if (!mine.length) return '';
          const free = mine.filter(r => applyStatus(r) === 'free').length;
          const impliedOnly = mine.every(r => r.implied);
          return `<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #f3f4f6">
            <input type="checkbox" data-apply-staff="${st.id}" ${free ? '' : 'disabled'} style="margin:0;width:18px;height:18px;flex:none" />
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(st.name)}</div>
              <div class="muted" style="font-size:11.5px">${impliedOnly ? `休み希望のみ・休み以外の${mine.length}日が出勤可` : `希望${mine.length}日`}・未適用${free}日・<span data-apply-count="${st.id}">選択0日</span></div>
            </div>
            <button type="button" class="btn btn-ghost" data-apply-open="${st.id}" style="font-size:12px;padding:5px 10px;flex:none" ${mine.length ? '' : 'disabled'}>日付を選ぶ</button>
          </div>`;
        }).join('');
        return `<div style="margin-top:14px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px">
          <div style="font-size:13px;font-weight:800;margin-bottom:2px">提出された希望をまとめてシフトに適用</div>
          <p class="muted" style="font-size:11.5px;margin:0 0 4px">名前にチェックでその人の希望を全部選択。除きたい日は「日付を選ぶ」で外せます。労働条件を超える日は自動で除外し、理由を表示します。休み希望だけ提出した人は、定休日と休み希望日以外を営業時間どおりの出勤可として扱います。</p>
          ${rows}
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px">
            <button type="button" class="btn btn-ghost" id="shift-apply-all-btn" style="font-size:12px;padding:5px 10px">全員を選択</button>
            <button type="button" class="btn btn-ghost" id="shift-apply-none-btn" style="font-size:12px;padding:5px 10px">選択を解除</button>
            <button type="button" class="btn" id="shift-apply-btn" style="font-size:13px">選んだ希望を適用</button>
            <span id="shift-apply-total" class="muted" style="font-size:12px"></span>
          </div>
        </div>`;
      }
      function openApplyModal(staffId, onClose) {
        const st = shiftStaffList.find(x => x.id === staffId);
        const mine = applyData.works.filter(r => r.staff_id === staffId);
        const byDate = {}; mine.forEach(r => { byDate[r.date] = r; });
        const months = [...new Set(mine.map(r => r.date.slice(0, 7)))].sort();
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
        const box = document.createElement('div');
        box.style.cssText = 'background:#fff;width:100%;max-width:460px;max-height:88vh;display:flex;flex-direction:column;border-radius:14px 14px 0 0;color:#111827';
        ov.appendChild(box);
        const freeDates = () => mine.filter(r => applyStatus(r) === 'free').map(r => r.date);
        function draw() {
          const calHtml = months.map(m => {
            const [y, mo] = m.split('-').map(Number);
            const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
            const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
            let cells = '';
            for (let i = 0; i < first; i++) cells += '<div></div>';
            for (let d = 1; d <= days; d++) {
              const date = `${m}-${String(d).padStart(2, '0')}`;
              const r = byDate[date];
              const closed = isShiftClosed(date);
              if (!r) { cells += `<div style="min-height:46px;border-radius:6px;background:${closed ? '#e5e7eb' : 'transparent'};color:#d1d5db;font-size:11px;padding:3px 4px">${d}</div>`; continue; }
              const stt = applyStatus(r);
              const sel = selectedApply.has(`${staffId}|${date}`);
              const dis = stt !== 'free';
              const bg = dis ? '#f3f4f6' : sel ? '#111827' : '#fff';
              const col = dis ? '#9ca3af' : sel ? '#fff' : '#111827';
              const sub = stt === 'done' ? '適用済' : stt === 'off' ? '休希望' : `${String(r.start_time).slice(0, 5).replace(/^0/, '')}-${String(r.end_time).slice(0, 5).replace(/^0/, '')}`;
              cells += `<button type="button" data-d="${date}" ${dis ? 'disabled' : ''} style="min-height:46px;border-radius:6px;border:1px solid ${sel ? '#111827' : '#d1d5db'};background:${bg};color:${col};padding:2px 0;line-height:1.25;cursor:${dis ? 'default' : 'pointer'}">
                <div style="font-size:13px;font-weight:700">${d}</div><div style="font-size:9.5px">${esc(sub)}</div>${closed && !dis ? `<div style="font-size:9px;opacity:.75">定休日</div>` : ''}</button>`;
            }
            return `<div style="margin-bottom:12px"><div style="font-size:12.5px;font-weight:700;margin-bottom:4px">${y}年${mo}月</div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center">
                ${SHIFT_WEEKDAY_JA.map((w, i) => `<div style="font-size:10.5px;color:${i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#6b7280'}">${w}</div>`).join('')}${cells}
              </div></div>`;
          }).join('');
          const n = freeDates().filter(d => selectedApply.has(`${staffId}|${d}`)).length;
          box.innerHTML = `<div style="padding:14px 16px 8px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px">
              <div style="flex:1;font-size:14px;font-weight:800">${esc(st?.name || '')}の${mine.length && mine.every(r => r.implied) ? '出勤可能日（休み希望以外）' : '希望日'}</div>
              <button type="button" class="btn btn-ghost" data-m="all" style="font-size:12px;padding:4px 8px">全て選択</button>
              <button type="button" class="btn btn-ghost" data-m="none" style="font-size:12px;padding:4px 8px">解除</button>
            </div>
            <div style="padding:12px 16px;overflow-y:auto;flex:1">${calHtml}</div>
            <div style="padding:10px 16px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #e5e7eb;display:flex;align-items:center;gap:10px">
              <span style="flex:1;font-size:12.5px">${n}日を選択中</span>
              <button type="button" class="btn" data-m="close" style="font-size:13px">完了</button>
            </div>`;
          box.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
            const k = `${staffId}|${b.dataset.d}`;
            selectedApply.has(k) ? selectedApply.delete(k) : selectedApply.add(k);
            const sc = box.querySelector('div[style*="overflow-y"]').scrollTop; draw(); box.querySelector('div[style*="overflow-y"]').scrollTop = sc;
          }));
          box.querySelector('[data-m="all"]').addEventListener('click', () => { freeDates().forEach(d => selectedApply.add(`${staffId}|${d}`)); draw(); });
          box.querySelector('[data-m="none"]').addEventListener('click', () => { freeDates().forEach(d => selectedApply.delete(`${staffId}|${d}`)); draw(); });
          box.querySelector('[data-m="close"]').addEventListener('click', close);
        }
        function close() { ov.remove(); onClose(); }
        ov.addEventListener('click', e => { if (e.target === ov) close(); });
        document.body.appendChild(ov);
        draw();
      }
      function bindApplyPanel(root) {
        const freeOf = id => applyData.works.filter(r => r.staff_id === id && applyStatus(r) === 'free');
        const sync = () => {
          root.querySelectorAll('[data-apply-staff]').forEach(sc => {
            const id = sc.dataset.applyStaff;
            const free = freeOf(id);
            const n = free.filter(r => selectedApply.has(`${id}|${r.date}`)).length;
            sc.checked = free.length > 0 && n === free.length;
            sc.indeterminate = n > 0 && n < free.length;
            const c = root.querySelector(`[data-apply-count="${id}"]`);
            if (c) c.textContent = `選択${n}日`;
          });
          let total = 0;
          shiftStaffList.forEach(st => { total += freeOf(st.id).filter(r => selectedApply.has(`${st.id}|${r.date}`)).length; });
          const t = root.querySelector('#shift-apply-total');
          if (t) t.textContent = total ? `計${total}日分を選択中` : '';
        };
        root.querySelectorAll('[data-apply-staff]').forEach(sc => sc.addEventListener('change', () => {
          const id = sc.dataset.applyStaff;
          freeOf(id).forEach(r => { sc.checked ? selectedApply.add(`${id}|${r.date}`) : selectedApply.delete(`${id}|${r.date}`); });
          sync();
        }));
        root.querySelectorAll('[data-apply-open]').forEach(b => b.addEventListener('click', () => openApplyModal(b.dataset.applyOpen, sync)));
        root.querySelector('#shift-apply-all-btn')?.addEventListener('click', () => { shiftStaffList.forEach(st => freeOf(st.id).forEach(r => selectedApply.add(`${st.id}|${r.date}`))); sync(); });
        root.querySelector('#shift-apply-none-btn')?.addEventListener('click', () => { selectedApply.clear(); sync(); });
        root.querySelector('#shift-apply-btn')?.addEventListener('click', async () => {
          const items = [...selectedApply].map(k => { const [staff_id, date] = k.split('|'); return { staff_id, date }; });
          if (!items.length) { showToast('適用する希望を選んでください'); return; }
          const btn = root.querySelector('#shift-apply-btn');
          btn.disabled = true; btn.textContent = '適用中…';
          const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}/apply-requests`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() }, body: JSON.stringify({ items }),
          });
          btn.disabled = false; btn.textContent = '選んだ希望を適用';
          if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); return; }
          const data = await res.json();
          const warnEl = document.getElementById('shift-generate-warnings');
          if (warnEl) {
            const nameOf = id => shiftStaffList.find(x => x.id === id)?.name || '(不明)';
            warnEl.innerHTML = data.skipped?.length
              ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#9a3412">
                  <strong>労働条件を超えるため、適用しなかった希望が${data.skipped.length}件あります（労基法違反を避けるため入れていません）</strong>
                  <ul style="margin:6px 0 0;padding-left:18px">${data.skipped.map(k => `<li>${esc(nameOf(k.staff_id))}・${esc(k.date)} ${esc(String(k.start_time).slice(0, 5))}〜${esc(String(k.end_time).slice(0, 5))}：${esc(k.reason)}</li>`).join('')}</ul>
                </div>` : '';
          }
          showToast(`${data.appliedCount}件を適用しました${data.skipped?.length ? `（${data.skipped.length}件は労働条件のため除外）` : ''}`);
          loadEntries(); loadRequestsSummary(); loadCalendar();
        });
        sync();
      }

      async function loadEntries() {
        const el = document.getElementById('shift-entries-list');
        if (!el || !currentPeriodId) return;
        if (!closedInfoLoaded) await loadClosedInfo();
        el.innerHTML = '読み込み中…';
        const res = await fetch(`/api/provider/shift-entries?periodId=${currentPeriodId}`, { headers: authHeadersShift() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        currentEntries = await res.json();
        loadLaborCheck();
        if (!shiftStaffList.length) { el.innerHTML = '<p class="muted" style="font-size:13px">スタッフが登録されていません。</p>'; return; }
        if (!currentPeriodStart || !currentPeriodEnd) return;
        const dates = datesInRange(currentPeriodStart, currentPeriodEnd);
        el.innerHTML = renderShiftEntriesGrid(dates, currentEntries) +
          '<p class="muted" style="font-size:11px;margin-top:8px">セルをタップするとその日のシフトを追加・削除できます。</p>';
        el.querySelectorAll('[data-shift-cell-staff]').forEach(td => td.addEventListener('click', () => showShiftCellEditor(td.dataset.shiftCellStaff, td.dataset.shiftCellDate)));
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
        if (res.ok) { showToast('追加しました'); loadEntries(); loadCalendar(); } else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      document.getElementById('shift-generate-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        const btn = document.getElementById('shift-generate-btn');
        btn.disabled = true; btn.textContent = '作成中…';
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}/generate`, { method: 'POST', headers: authHeadersShift() });
        btn.disabled = false; btn.textContent = '自動作成';
        if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); return; }
        const data = await res.json();
        const warnEl = document.getElementById('shift-generate-warnings');
        if (warnEl) {
          const nameOf = id => shiftStaffList.find(x => x.id === id)?.name || '(不明)';
          const shortHtml = data.warnings?.length
            ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#92400e">
                人員が足りない枠が${data.warnings.length}件あります：${data.warnings.map(w => `${esc(w.date)} ${esc(w.start_time)}〜${esc(w.end_time)}（必要${w.required}人・確保${w.filled}人）`).join('／')}
              </div>`
            : '';
          const skipHtml = data.skipped?.length
            ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;font-size:12.5px;color:#9a3412;margin-top:${shortHtml ? '8px' : '0'}">
                <strong>労働条件を超えるため、採用しなかった希望が${data.skipped.length}件あります（労基法違反を避けるため自動では入れていません）</strong>
                <ul style="margin:6px 0 0;padding-left:18px">${data.skipped.map(k => `<li>${esc(nameOf(k.staff_id))}・${esc(k.date)} ${esc(String(k.start_time).slice(0, 5))}〜${esc(String(k.end_time).slice(0, 5))}：${esc(k.reason)}</li>`).join('')}</ul>
              </div>`
            : '';
          warnEl.innerHTML = shortHtml + skipHtml;
        }
        showToast(`${data.createdCount}件のシフトを作成しました`);
        loadEntries();
        loadCalendar();
      });

      document.getElementById('shift-confirm-btn')?.addEventListener('click', async () => {
        if (!currentPeriodId) return;
        const labor = await fetchLabor(currentPeriodId);
        const vios = labor.violations || [];
        const ask = vios.length
          ? `労働条件を超えている箇所が${vios.length}件あります。\n\n${vios.slice(0, 5).map(v => '・' + v.message).join('\n')}${vios.length > 5 ? `\n…ほか${vios.length - 5}件` : ''}\n\nこのまま確定すると労基法違反になる可能性があります。それでも確定しますか？`
          : 'この期間のシフトを確定しますか？';
        if (!confirm(ask)) return;
        const res = await fetch(`/api/provider/shift-periods/${currentPeriodId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
          body: JSON.stringify({ status: 'confirmed' }),
        });
        if (res.ok) { showToast('確定しました'); await loadPeriods(); loadCalendar(); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      // ── シフトカレンダー（でお指摘2026-10-02：最初にカレンダー、日付タップでその日のシフト表、前月・次月へ移動） ──
      function shiftTodayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      const calNow = new Date();
      let calYear = calNow.getFullYear();
      let calMonth = calNow.getMonth(); // 0-11
      let calEntries = [];
      let calRequests = [];
      const pad2 = n => String(n).padStart(2, '0');
      const periodForDate = date => shiftPeriods.find(p => p.period_start <= date && date <= p.period_end) || null;

      async function loadCalendar() {
        const grid = document.getElementById('shift-cal-grid');
        const title = document.getElementById('shift-cal-title');
        if (!grid) return;
        if (title) title.textContent = `${calYear}年${calMonth + 1}月`;
        const last = new Date(calYear, calMonth + 1, 0).getDate();
        const from = `${calYear}-${pad2(calMonth + 1)}-01`;
        const to = `${calYear}-${pad2(calMonth + 1)}-${pad2(last)}`;
        const [eRes, rRes] = await Promise.all([
          fetch(`/api/provider/shift-entries?from=${from}&to=${to}`, { headers: authHeadersShift() }),
          fetch(`/api/provider/shift-requests?from=${from}&to=${to}`, { headers: authHeadersShift() }),
          loadClosedInfo(),
        ]);
        if (!eRes.ok) { grid.innerHTML = authErrorHtml(eRes); return; }
        calEntries = await eRes.json();
        calRequests = rRes.ok ? await rRes.json() : [];
        renderCalendar();
      }

      function renderCalendar() {
        const grid = document.getElementById('shift-cal-grid');
        if (!grid) return;
        const firstWd = new Date(calYear, calMonth, 1).getDay();
        const last = new Date(calYear, calMonth + 1, 0).getDate();
        const todayStr = shiftTodayStr();
        const entryStaff = {};
        calEntries.forEach(e => { (entryStaff[e.date] = entryStaff[e.date] || new Set()).add(e.staff_id); });
        const reqStaff = {};
        calRequests.filter(r => r.type === 'work').forEach(r => { (reqStaff[r.date] = reqStaff[r.date] || new Set()).add(r.staff_id); });
        const head = SHIFT_WEEKDAY_JA.map((w, i) => `<div style="text-align:center;font-size:11px;font-weight:700;padding:4px 0;color:${i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#6b7280'}">${w}</div>`).join('');
        let cells = '';
        for (let i = 0; i < firstWd; i++) cells += '<div></div>';
        for (let day = 1; day <= last; day++) {
          const date = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
          const wd = (firstWd + day - 1) % 7;
          const confirmed = entryStaff[date]?.size || 0;
          const wishing = [...(reqStaff[date] || [])].filter(id => !entryStaff[date]?.has(id)).length;
          const isToday = date === todayStr;
          const closed = isShiftClosed(date);
          cells += `<div data-cal-date="${date}" style="min-height:58px;padding:4px 5px;border:1px solid ${isToday ? '#c9a84c' : '#e5e7eb'};border-radius:8px;cursor:pointer;background:${closed ? '#e5e7eb' : isToday ? 'rgba(201,168,76,0.08)' : '#fff'};display:flex;flex-direction:column;gap:2px;overflow:hidden">
            <span style="font-size:12px;font-weight:700;color:${closed ? '#9ca3af' : wd === 0 ? '#dc2626' : wd === 6 ? '#2563eb' : '#374151'}">${day}${closed ? '<span style="font-size:10px;font-weight:400;margin-left:4px">定休日</span>' : ''}</span>
            ${confirmed ? `<span style="font-size:10.5px;font-weight:700;color:#059669;white-space:nowrap">確定${confirmed}人</span>` : ''}
            ${wishing ? `<span style="font-size:10.5px;font-weight:700;color:#2563eb;white-space:nowrap">希望${wishing}人</span>` : ''}
          </div>`;
        }
        grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${head}${cells}</div>`;
        grid.querySelectorAll('[data-cal-date]').forEach(c => c.addEventListener('click', () => showDayModal(c.dataset.calDate)));
      }

      function moveCalMonth(delta) {
        const d = new Date(calYear, calMonth + delta, 1);
        calYear = d.getFullYear(); calMonth = d.getMonth();
        loadCalendar();
      }
      document.getElementById('shift-cal-prev')?.addEventListener('click', () => moveCalMonth(-1));
      document.getElementById('shift-cal-next')?.addEventListener('click', () => moveCalMonth(1));
      document.getElementById('shift-cal-today')?.addEventListener('click', () => {
        const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); loadCalendar();
      });

      // その日のスタッフ別「希望」と「確定シフト」を1枚のポップアップで確認・編集する
      function showDayModal(date) {
        document.getElementById('shift-day-modal-overlay')?.remove();
        const period = periodForDate(date);
        const wd = new Date(date + 'T00:00:00Z').getUTCDay();
        const overlay = document.createElement('div');
        overlay.id = 'shift-day-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        let dayLabor = { violations: [] };
        const refresh = async () => { await loadCalendar(); if (period && period.id === currentPeriodId) { loadEntries(); loadRequestsSummary(); } if (period) dayLabor = await fetchLabor(period.id); draw(); };
        const post = async (payload) => {
          const res = await fetch('/api/provider/shift-entries', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersShift() },
            body: JSON.stringify({ period_id: period.id, date, ...payload }),
          });
          if (res.ok) { await refresh(); } else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        };

        function draw() {
          const dayEntries = calEntries.filter(e => e.date === date);
          const dayReqs = calRequests.filter(r => r.date === date);
          const rows = shiftStaffList.map(s => {
            const req = dayReqs.find(r => r.staff_id === s.id && r.type === 'work') || dayReqs.find(r => r.staff_id === s.id);
            const mine = dayEntries.filter(e => e.staff_id === s.id);
            const reqHtml = !req ? '<span style="color:#9ca3af">未提出</span>'
              : req.type === 'off' ? '<span style="color:#dc2626;font-weight:700">休み希望</span>'
              : `<span style="color:#2563eb;font-weight:700">${esc((req.start_time || '').slice(0, 5))}〜${esc((req.end_time || '').slice(0, 5))}</span>`;
            const adopt = req && req.type === 'work' && !mine.length && period
              ? `<button type="button" data-day-adopt="${s.id}" data-start="${esc((req.start_time || '').slice(0, 5))}" data-end="${esc((req.end_time || '').slice(0, 5))}" style="font-size:11px;padding:3px 8px;border:1px solid #93c5fd;color:#2563eb;background:none;border-radius:6px;cursor:pointer;white-space:nowrap">希望を採用</button>` : '';
            const mineHtml = mine.length ? mine.map(e => `
              <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
                <span style="font-size:12px;font-weight:700;color:#059669">${esc((e.start_time || '').slice(0, 5))}〜${esc((e.end_time || '').slice(0, 5))}${e.source === 'auto' ? '<span style="color:#9ca3af;font-weight:400">・自動</span>' : ''}</span>
                <button type="button" data-day-del="${e.id}" style="font-size:11px;padding:2px 7px;border:1px solid #fca5a5;color:#ef4444;background:none;border-radius:6px;cursor:pointer">削除</button>
              </div>`).join('') : '';
            const vios = (dayLabor.violations || []).filter(v => v.staff_id === s.id && v.dates.includes(date));
            const vioHtml = vios.map(v => `<div style="font-size:11.5px;color:#dc2626;margin-top:3px;line-height:1.5">⚠ ${esc(stripName(v.message))}</div>`).join('');
            return `<div style="padding:8px 0;border-bottom:1px solid #f3f4f6">
              <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
                <span><strong style="font-size:13px">${esc(s.name)}</strong>${empBadge(s.id)}</span>${adopt}
              </div>
              <div style="font-size:12px;margin-top:2px">希望：${reqHtml}</div>
              ${mineHtml ? `<div style="font-size:12px;margin-top:2px">確定：${mineHtml}</div>` : ''}
              ${vioHtml}
            </div>`;
          }).join('');
          overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;padding:22px;width:100%;max-width:420px;max-height:88vh;overflow-y:auto">
              <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:2px">
                <h3 style="margin:0;font-size:16px;font-weight:800">${esc(date)}（${SHIFT_WEEKDAY_JA[wd]}）のシフト</h3>
                <button type="button" id="shift-day-close" style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#6b7280" aria-label="閉じる">×</button>
              </div>
              ${isShiftClosed(date) ? '<p style="font-size:12px;margin:0 0 6px;padding:4px 10px;background:#e5e7eb;color:#4b5563;border-radius:6px">この日は定休日（休業日）です</p>' : ''}
              <p class="muted" style="font-size:12px;margin:0 0 8px">${period ? `期間：${esc(period.period_start)}〜${esc(period.period_end)}（${esc(PERIOD_STATUS_LABEL[period.status] || period.status)}）` : 'この日を含む期間がありません。下の「設定」の「期間を作成」から追加すると、シフトを入れられます。'}</p>
              ${shiftStaffList.length ? rows : '<p class="muted" style="font-size:13px">スタッフが登録されていません（「スタッフ」タブから登録してください）。</p>'}
              ${period && shiftStaffList.length ? `
              <div style="margin-top:14px">
                <div style="font-size:12px;font-weight:700;margin-bottom:6px">シフトを追加</div>
                <select id="shift-day-staff" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;margin-bottom:6px">${shiftStaffList.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
                  <input type="time" id="shift-day-start" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
                  <span style="color:#9ca3af">〜</span>
                  <input type="time" id="shift-day-end" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
                </div>
                <button type="button" id="shift-day-add" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">追加</button>
              </div>` : ''}
            </div>`;
          overlay.querySelector('#shift-day-close')?.addEventListener('click', () => overlay.remove());
          overlay.querySelectorAll('[data-day-del]').forEach(btn => btn.addEventListener('click', async () => {
            const res = await fetch(`/api/provider/shift-entries/${btn.dataset.dayDel}`, { method: 'DELETE', headers: authHeadersShift() });
            if (res.ok) await refresh(); else showToast('削除に失敗しました');
          }));
          overlay.querySelectorAll('[data-day-adopt]').forEach(btn => btn.addEventListener('click', () => post({ staff_id: btn.dataset.dayAdopt, start_time: btn.dataset.start, end_time: btn.dataset.end })));
          overlay.querySelector('#shift-day-add')?.addEventListener('click', () => {
            const staff_id = overlay.querySelector('#shift-day-staff')?.value;
            const start_time = overlay.querySelector('#shift-day-start')?.value;
            const end_time = overlay.querySelector('#shift-day-end')?.value;
            if (!staff_id || !start_time || !end_time) { showToast('スタッフと開始・終了時刻を入力してください'); return; }
            post({ staff_id, start_time, end_time });
          });
        }
        draw();
        if (period) fetchLabor(period.id).then(r => { dayLabor = r; draw(); });
      }

      async function loadShiftTab() {
        await loadStaffLinks();
        await Promise.all([loadRuleSettings(), loadPatterns(), loadPriorities(), loadConditions(), loadPeriods()]);
        loadCalendar();
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
        const res = await fetch('/api/provider/resources', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
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
          await fetch(`/api/provider/resources/${btn.dataset.resourceDel}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
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
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` }, body: JSON.stringify(body) });
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
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const rewardEl = document.getElementById('mref-reward-text');
      const messageEl = document.getElementById('mref-message-text');
      const buttonLabelEl = document.getElementById('mref-button-label');
      const buttonUrlEl = document.getElementById('mref-button-url');
      const imagePreview = document.getElementById('mref-image-preview');
      const imagePreviewWrap = document.getElementById('mref-image-preview-wrap');
      let mrefImageUrl = '';
      const saveBtn = document.getElementById('mref-save-btn');
      const msgEl = document.getElementById('mref-msg');
      const listEl = document.getElementById('mref-list');

      async function loadSettings() {
        const res = await fetch('/api/provider/referral-settings', { headers: authH() });
        if (!res.ok) return;
        const d = await res.json();
        if (rewardEl) rewardEl.value = d.reward_text || '';
        if (messageEl) messageEl.value = d.message_text || '';
        if (buttonLabelEl) buttonLabelEl.value = d.button_label || '';
        if (buttonUrlEl) buttonUrlEl.value = d.button_url || '';
        mrefImageUrl = d.image_url || '';
        if (mrefImageUrl && imagePreview && imagePreviewWrap) {
          imagePreview.src = mrefImageUrl;
          imagePreviewWrap.style.display = 'block';
        }
      }
      async function saveReferralSettings() {
        saveBtn.disabled = true;
        if (msgEl) { msgEl.style.color = ''; msgEl.textContent = '保存中…'; }
        const res = await fetch('/api/provider/referral-settings', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() },
          body: JSON.stringify({
            reward_text: rewardEl?.value.trim() || '',
            message_text: messageEl?.value.trim() || '',
            image_url: mrefImageUrl || '',
            button_label: buttonLabelEl?.value.trim() || '',
            button_url: buttonUrlEl?.value.trim() || '',
          }),
        });
        saveBtn.disabled = false;
        if (msgEl) { msgEl.style.color = res.ok ? '#4ade80' : '#ef4444'; msgEl.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
        return res.ok;
      }
      saveBtn?.addEventListener('click', saveReferralSettings);

      // 紹介バナー画像アップロード（既存のカバー画像アップロードと同じパターン）
      (function setupReferralImageUpload() {
        const btn = document.getElementById('mref-image-upload-btn');
        const input = document.getElementById('mref-image-file-input');
        const msg = document.getElementById('mref-image-upload-msg');
        if (btn) btn.addEventListener('click', () => input?.click());
        if (!input) return;
        input.addEventListener('change', async () => {
          const file = input.files?.[0]; if (!file) return;
          const uploadToken = getSupabaseToken();
          if (!uploadToken) { showToast('ログインが必要です'); return; }
          msg.textContent = '圧縮中…'; msg.style.display = 'block'; btn.disabled = true;
          const compressed = await compressImage(file, 1600);
          msg.textContent = 'アップロード中…';
          const fd = new FormData(); fd.append('photo', compressed, 'photo.jpg');
          try {
            const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || uploadToken}` }, body: fd });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              mrefImageUrl = data.url;
              if (imagePreview) imagePreview.src = data.url;
              if (imagePreviewWrap) imagePreviewWrap.style.display = 'block';
              msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
              const saved = await saveReferralSettings();
              msg.textContent = saved ? '✓ 画像を保存しました' : '画像はアップロードできましたが、保存に失敗しました';
              msg.style.color = saved ? '#059669' : '#ef4444';
            } else { msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444'; }
          } catch { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
          btn.disabled = false;
        });
      })();

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

    // ── アピールブロック（公開ページ「アピール」タブのカスタムブロック編集、でお要望2026-09-30） ─────
    (function setupAppealBlocks() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const listEl = document.getElementById('ablk-list');
      if (!listEl) return;
      const addToggleBtn = document.getElementById('ablk-add-toggle');
      const addFormEl = document.getElementById('ablk-add-form');
      const addTypeEl = document.getElementById('ablk-add-type');
      const addFieldsEl = document.getElementById('ablk-add-fields');
      const addSaveBtn = document.getElementById('ablk-add-save');
      const msgEl = document.getElementById('ablk-msg');
      let blocks = [];

      const TYPE_LABEL = { heading: '見出し', paragraph: '本文', image: '画像', button: 'ボタン', quote: '引用' };
      // デフォルトセクション（でお要望2026-10-01：「デフォルトで表示されているものも
      // 自由に並び替えたり内容編集したりできるように」）。本文がguide_message/
      // unique_strengths/philosophyの単純な1フィールドのものはこの一覧内で直接編集でき、
      // データ量が多いもの（スタッフ・体験談・サービス）は専用タブへのリンクのみ、
      // New Me Mapは診断結果連動の自動表示のため編集項目自体が無い。
      const BUILTIN_LABEL = {
        builtin_guide_message: 'ガイドからのひと言',
        builtin_unique_strengths: 'このガイドにしかできないこと（強み）',
        builtin_staff: 'スタッフ紹介',
        builtin_newme_map: 'New Me Map（診断との接点）',
        builtin_philosophy: '大切にしていること（理念）',
        builtin_stories: '体験談',
        builtin_program: 'プログラム一覧',
      };
      const BUILTIN_PROFILE_FIELD = {
        builtin_guide_message: 'guide_message',
        builtin_unique_strengths: 'unique_strengths',
        builtin_philosophy: 'philosophy',
      };
      const BUILTIN_EDIT_LINK = {
        builtin_staff: { tab: 'staff', label: 'スタッフタブで編集する' },
        builtin_stories: { tab: 'stories', label: '体験談タブで編集する' },
        builtin_program: { tab: 'service', label: 'サービス設定タブで編集する' },
      };

      function fieldsHtml(type, c) {
        c = c || {};
        if (type === 'heading' || type === 'paragraph') {
          return `
            <textarea data-ablk-field="text" rows="${type === 'heading' ? 2 : 4}" style="width:100%;margin-bottom:8px" placeholder="${type === 'heading' ? '見出しテキスト' : '本文テキスト'}">${esc(c.text || '')}</textarea>
            <select data-ablk-field="align" style="margin-bottom:8px">
              <option value="left"${c.align !== 'center' ? ' selected' : ''}>左揃え</option>
              <option value="center"${c.align === 'center' ? ' selected' : ''}>中央揃え</option>
            </select>`;
        }
        if (type === 'image') {
          return `
            <div data-ablk-image-preview-wrap style="display:${c.url ? 'block' : 'none'};margin-bottom:8px">
              <img data-ablk-image-preview src="${esc(c.url || '')}" style="max-width:240px;border-radius:8px;display:block" />
            </div>
            <input type="hidden" data-ablk-field="url" value="${esc(c.url || '')}" />
            <button type="button" class="btn btn-ghost" data-ablk-image-upload-btn style="font-size:12px;margin-bottom:8px">画像を選択</button>
            <input type="file" accept="image/*" data-ablk-image-file-input style="display:none" />
            <div data-ablk-image-upload-msg class="muted" style="font-size:12px;margin-bottom:8px"></div>
            <input type="text" data-ablk-field="caption" value="${esc(c.caption || '')}" placeholder="キャプション（任意）" style="width:100%;margin-bottom:8px" />
            <select data-ablk-field="size" style="margin-bottom:8px">
              <option value="medium"${c.size !== 'full' ? ' selected' : ''}>標準サイズ</option>
              <option value="full"${c.size === 'full' ? ' selected' : ''}>大きめ（横幅いっぱい）</option>
            </select>`;
        }
        if (type === 'button') {
          return `
            <input type="text" data-ablk-field="label" value="${esc(c.label || '')}" placeholder="ボタンの文字（例: 公式LINEで相談する）" style="width:100%;margin-bottom:8px" />
            <input type="text" data-ablk-field="url" value="${esc(c.url || '')}" placeholder="https://... （リンク先URL）" style="width:100%;margin-bottom:8px" />`;
        }
        if (type === 'quote') {
          return `
            <textarea data-ablk-field="text" rows="3" style="width:100%;margin-bottom:8px" placeholder="引用文">${esc(c.text || '')}</textarea>
            <input type="text" data-ablk-field="attribution" value="${esc(c.attribution || '')}" placeholder="引用元（任意）" style="width:100%;margin-bottom:8px" />`;
        }
        return '';
      }

      function readFields(scopeEl) {
        const out = {};
        scopeEl?.querySelectorAll('[data-ablk-field]').forEach(el => { out[el.dataset.ablkField] = el.value; });
        return out;
      }

      function bindImageUpload(scopeEl) {
        const btn = scopeEl?.querySelector('[data-ablk-image-upload-btn]');
        const input = scopeEl?.querySelector('[data-ablk-image-file-input]');
        const msg = scopeEl?.querySelector('[data-ablk-image-upload-msg]');
        const urlField = scopeEl?.querySelector('[data-ablk-field="url"]');
        const previewWrap = scopeEl?.querySelector('[data-ablk-image-preview-wrap]');
        const preview = scopeEl?.querySelector('[data-ablk-image-preview]');
        if (!btn || !input) return;
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', async () => {
          const file = input.files?.[0]; if (!file) return;
          const uploadToken = getSupabaseToken();
          if (!uploadToken) { showToast('ログインが必要です'); return; }
          if (msg) msg.textContent = '圧縮中…';
          btn.disabled = true;
          const compressed = await compressImage(file, 1600);
          if (msg) msg.textContent = 'アップロード中…';
          const fd = new FormData(); fd.append('photo', compressed, 'photo.jpg');
          try {
            const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken() || uploadToken}` }, body: fd });
            let data; try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.url) {
              if (urlField) urlField.value = data.url;
              if (preview) preview.src = data.url;
              if (previewWrap) previewWrap.style.display = 'block';
              if (msg) msg.textContent = '✓ 画像を選択しました（保存ボタンを押してください）';
            } else if (msg) { msg.textContent = 'エラー: ' + (data.error || '不明'); }
          } catch { if (msg) msg.textContent = '通信エラーが発生しました'; }
          btn.disabled = false;
        });
      }

      function renderRow(b, idx, total) {
        const isBuiltin = b.block_type.startsWith('builtin_');
        const label = isBuiltin ? (BUILTIN_LABEL[b.block_type] || b.block_type) : (TYPE_LABEL[b.block_type] || b.block_type);
        const profileField = BUILTIN_PROFILE_FIELD[b.block_type];
        const editLink = BUILTIN_EDIT_LINK[b.block_type];
        let body;
        if (profileField) {
          body = `<textarea data-ablk-builtin-field="${profileField}" rows="4" style="width:100%;margin-bottom:8px" placeholder="未入力">${esc(provider[profileField] || '')}</textarea>`;
        } else if (editLink) {
          body = `<p class="muted" style="font-size:12px;margin:0 0 8px">内容はこの一覧では編集できません。専用タブから編集してください。</p>
                  <button type="button" class="btn btn-ghost" style="font-size:12px" data-ablk-goto-tab="${editLink.tab}">${editLink.label} →</button>`;
        } else if (isBuiltin) {
          body = `<p class="muted" style="font-size:12px;margin:0">お客様のMe Scan診断結果に連動して自動表示されるセクションです。編集項目はありません。</p>`;
        } else {
          body = fieldsHtml(b.block_type, b.content);
        }
        const showSaveBtn = !!profileField || !isBuiltin;
        return `
          <div data-ablk-row="${b.id}" style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:10px;background:${b.hidden ? '#f9fafb' : '#fff'};opacity:${b.hidden ? '0.6' : '1'}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:${isBuiltin ? '#eef2ff' : '#f3f4f6'};color:${isBuiltin ? '#4338ca' : '#374151'}">${isBuiltin ? 'デフォルト・' : ''}${esc(label)}</span>
              <div style="display:flex;align-items:center;gap:8px">
                <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;cursor:pointer">
                  <input type="checkbox" data-ablk-hidden="${b.id}"${b.hidden ? ' checked' : ''} /> 非表示
                </label>
                <button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px" data-ablk-up="${b.id}"${idx === 0 ? ' disabled' : ''}>↑</button>
                <button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px" data-ablk-down="${b.id}"${idx === total - 1 ? ' disabled' : ''}>↓</button>
                ${isBuiltin ? '' : `<button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px;color:#ef4444" data-ablk-del="${b.id}">削除</button>`}
              </div>
            </div>
            ${body}
            ${showSaveBtn ? `<button type="button" class="btn" style="font-size:12px;padding:5px 12px" data-ablk-save="${b.id}">この内容を保存</button>` : ''}
            <span data-ablk-row-msg style="font-size:11px;margin-left:8px"></span>
          </div>`;
      }

      function renderList() {
        listEl.innerHTML = blocks.length
          ? blocks.map((b, i) => renderRow(b, i, blocks.length)).join('')
          : '<p class="muted" style="font-size:13px">まだブロックがありません。「＋ ブロックを追加」から作成してください。</p>';

        listEl.querySelectorAll('[data-ablk-row]').forEach(rowEl => bindImageUpload(rowEl));

        listEl.querySelectorAll('[data-ablk-up]').forEach(btn => btn.addEventListener('click', async () => { await swapBlockOrder(btn.dataset.ablkUp, -1); await loadBlocks(); renderList(); }));
        listEl.querySelectorAll('[data-ablk-down]').forEach(btn => btn.addEventListener('click', async () => { await swapBlockOrder(btn.dataset.ablkDown, 1); await loadBlocks(); renderList(); }));
        listEl.querySelectorAll('[data-ablk-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このブロックを削除しますか？')) return;
          await fetch(`/api/provider/appeal-blocks/${btn.dataset.ablkDel}`, { method: 'DELETE', headers: authH() });
          await loadBlocks(); renderList();
        }));
        listEl.querySelectorAll('[data-ablk-hidden]').forEach(cb => cb.addEventListener('change', async () => {
          await fetch(`/api/provider/appeal-blocks/${cb.dataset.ablkHidden}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ hidden: cb.checked }) });
          await loadBlocks(); renderList();
        }));
        listEl.querySelectorAll('[data-ablk-goto-tab]').forEach(btn => btn.addEventListener('click', () => {
          document.querySelector(`.tab-btn[data-tab="${btn.dataset.ablkGotoTab}"]`)?.click();
        }));
        listEl.querySelectorAll('[data-ablk-save]').forEach(btn => btn.addEventListener('click', async () => {
          const id = btn.dataset.ablkSave;
          const rowEl = listEl.querySelector(`[data-ablk-row="${id}"]`);
          const msgSpan = rowEl?.querySelector('[data-ablk-row-msg]');
          const builtinFieldEl = rowEl?.querySelector('[data-ablk-builtin-field]');
          btn.disabled = true;
          let ok;
          if (builtinFieldEl) {
            // デフォルトセクションの本文（guide_message/unique_strengths/philosophy）は
            // providers側のカラムが正——AIマッチング分析・掲載順スコアリング等が既に
            // そちらを読んでいるため、保存先はこれまでと同じ/api/provider/profile経由のまま
            // （でお要望2026-10-01：この一覧内で直接編集できるようにはするが、二重管理は避ける）。
            // saveToLocal()は他の設定フォームと同じ保存関数（PATCH＋ローカルキャッシュ更新）。
            const fieldName = builtinFieldEl.dataset.ablkBuiltinField;
            const value = builtinFieldEl.value;
            ok = await saveToLocal({ [fieldName]: value });
            if (ok) provider[fieldName] = value;
          } else {
            const content = readFields(rowEl);
            const res = await fetch(`/api/provider/appeal-blocks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ content }) });
            ok = res.ok;
            if (ok) await loadBlocks();
          }
          btn.disabled = false;
          if (msgSpan) { msgSpan.style.color = ok ? '#059669' : '#ef4444'; msgSpan.textContent = ok ? '✓ 保存しました' : '保存に失敗しました'; }
        }));
      }

      async function swapBlockOrder(id, dir) {
        const idx = blocks.findIndex(b => b.id === id);
        const otherIdx = idx + dir;
        if (idx < 0 || otherIdx < 0 || otherIdx >= blocks.length) return;
        const a = blocks[idx], b = blocks[otherIdx];
        await Promise.all([
          fetch(`/api/provider/appeal-blocks/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ sort_order: b.sort_order }) }),
          fetch(`/api/provider/appeal-blocks/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ sort_order: a.sort_order }) }),
        ]);
      }

      async function loadBlocks() {
        const res = await fetch('/api/provider/appeal-blocks', { headers: authH() });
        blocks = res.ok ? await res.json() : [];
      }

      addToggleBtn?.addEventListener('click', () => {
        if (!addFormEl) return;
        const show = addFormEl.style.display === 'none';
        addFormEl.style.display = show ? 'block' : 'none';
        if (show && addFieldsEl && addTypeEl) {
          addFieldsEl.innerHTML = fieldsHtml(addTypeEl.value, {});
          bindImageUpload(addFormEl);
        }
      });
      addTypeEl?.addEventListener('change', () => {
        if (addFieldsEl) addFieldsEl.innerHTML = fieldsHtml(addTypeEl.value, {});
        bindImageUpload(addFormEl);
      });
      addSaveBtn?.addEventListener('click', async () => {
        const block_type = addTypeEl?.value;
        const content = readFields(addFieldsEl);
        addSaveBtn.disabled = true;
        const res = await fetch('/api/provider/appeal-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ block_type, content }) });
        addSaveBtn.disabled = false;
        if (res.ok) {
          if (addFormEl) addFormEl.style.display = 'none';
          if (addFieldsEl) addFieldsEl.innerHTML = '';
          if (msgEl) msgEl.textContent = '';
          await loadBlocks(); renderList();
        } else if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = '追加に失敗しました'; }
      });

      async function loadAll() { await loadBlocks(); renderList(); }
      document.querySelectorAll('[data-tab="appeal-settings"]').forEach(btn => btn.addEventListener('click', loadAll, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'appeal-settings') loadAll();
    })();

    // ── クラス管理（スクール業態特化、でお要望2026-09-14） ─────
    (function setupClasses() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      const listEl = document.getElementById('cls-list');
      const editCard = document.getElementById('cls-edit-card');
      const editForm = document.getElementById('cls-edit-form');
      const editTitle = document.getElementById('cls-edit-title');
      const rosterCard = document.getElementById('cls-roster-card');
      const rosterTitle = document.getElementById('cls-roster-title');
      const rosterListEl = document.getElementById('cls-roster-list');
      const enrollForm = document.getElementById('cls-enroll-form');
      const sessionsCard = document.getElementById('cls-sessions-card');
      const sessionsTitle = document.getElementById('cls-sessions-title');
      const sessionListEl = document.getElementById('cls-session-list');
      const sessionForm = document.getElementById('cls-session-form');
      const instructorSelectEl = editForm?.elements['instructor_staff_id'];
      let classesCache = [];
      let selectedClass = null;
      let staffOptionsForClasses = [];

      async function loadStaffOptionsForClasses() {
        const res = await fetch('/api/provider/staff', { headers: authH() });
        if (!res.ok) return;
        staffOptionsForClasses = await res.json();
        if (instructorSelectEl) {
          instructorSelectEl.innerHTML = '<option value="">未設定</option>' + staffOptionsForClasses.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
        }
      }

      async function loadClasses() {
        if (!listEl) return;
        const res = await fetch('/api/provider/classes', { headers: authH() });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        classesCache = await res.json();
        if (!classesCache.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだクラスがありません。「＋ クラスを追加」から作成してください。</p>'; return; }
        listEl.innerHTML = classesCache.map(c => `
          <div style="display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:var(--color-bg);border-radius:10px" data-cls-row="${c.id}">
            <div style="min-width:0">
              <strong style="font-size:14px">${esc(c.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${c.enrolledCount}名${c.capacity ? `／定員${c.capacity}名／残り${c.remaining}名` : ''}${c.waitlistedCount ? `（待機${c.waitlistedCount}名）` : ''}${c.price != null ? `／¥${Number(c.price).toLocaleString()}` : ''}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn" style="font-size:12px;padding:5px 10px" data-cls-sessions="${c.id}">予約枠を管理</button>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-cls-roster="${c.id}">名簿・進級</button>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-cls-edit="${c.id}">編集</button>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-cls-del="${c.id}">削除</button>
            </div>
          </div>
        `).join('');
        listEl.querySelectorAll('[data-cls-edit]').forEach(btn => btn.addEventListener('click', () => {
          const c = classesCache.find(x => x.id === btn.dataset.clsEdit); if (!c) return;
          editTitle.textContent = 'クラスを編集'; editCard.style.display = 'block';
          editForm.elements['_class_id'].value = c.id;
          editForm.elements['name'].value = c.name || '';
          editForm.elements['description'].value = c.description || '';
          editForm.elements['capacity'].value = c.capacity || '';
          editForm.elements['price'].value = c.price ?? '';
          if (editForm.elements['instructor_staff_id']) editForm.elements['instructor_staff_id'].value = c.instructor_staff_id || '';
          editForm.elements['level_labels'].value = (c.level_labels || []).join(',');
          if (newSessionFieldsEl) newSessionFieldsEl.style.display = 'none';
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-cls-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このクラスを削除しますか？在籍者・進級履歴も全て削除されます。')) return;
          await fetch(`/api/provider/classes/${btn.dataset.clsDel}`, { method: 'DELETE', headers: authH() });
          loadClasses();
        }));
        listEl.querySelectorAll('[data-cls-roster]').forEach(btn => btn.addEventListener('click', () => openRoster(btn.dataset.clsRoster)));
        listEl.querySelectorAll('[data-cls-sessions]').forEach(btn => btn.addEventListener('click', () => openSessions(btn.dataset.clsSessions)));
      }

      const newSessionFieldsEl = document.getElementById('cls-new-session-fields');
      const newSessionRecurTypeEl = document.getElementById('cls-new-session-recur-type');
      const newSessionWeekdayFieldEl = document.getElementById('cls-new-session-weekday-field');
      const newSessionUntilFieldEl = document.getElementById('cls-new-session-until-field');
      function updateNewSessionRecurFields() {
        const type = newSessionRecurTypeEl?.value || 'once';
        if (newSessionWeekdayFieldEl) newSessionWeekdayFieldEl.style.display = type === 'weekly' ? '' : 'none';
        if (newSessionUntilFieldEl) newSessionUntilFieldEl.style.display = type === 'once' ? 'none' : '';
      }
      newSessionRecurTypeEl?.addEventListener('change', updateNewSessionRecurFields);

      document.getElementById('cls-add-btn')?.addEventListener('click', () => {
        editTitle.textContent = 'クラスを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_class_id'].value = '';
        if (newSessionFieldsEl) newSessionFieldsEl.style.display = '';
        updateNewSessionRecurFields();
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
          price: fd.get('price'),
          instructor_staff_id: fd.get('instructor_staff_id') || null,
          level_labels: String(fd.get('level_labels') || '').split(',').map(s => s.trim()).filter(Boolean),
        };
        const url = id ? `/api/provider/classes/${id}` : '/api/provider/classes';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); return; }
        const savedClass = await res.json();

        // 新規作成時のみ、「最初の開催日時」が入力されていれば同時に開催回も作る
        // （でお要望2026-09-26：「クラスを追加を押して出てくる新規の設定画面の中に
        // 日時を入れてほしい」）。編集時はこのフィールド自体を非表示にしているため対象外。
        let sessionCount = 0;
        if (!id) {
          const baseDate = document.getElementById('cls-new-session-date')?.value || '';
          if (baseDate) {
            const start_time = document.getElementById('cls-new-session-start')?.value || '';
            const end_time = document.getElementById('cls-new-session-end')?.value || '';
            const capacity = document.getElementById('cls-new-session-capacity')?.value || '';
            const recurType = document.getElementById('cls-new-session-recur-type')?.value || 'once';
            const untilDate = document.getElementById('cls-new-session-until')?.value || '';
            const weekdays = Array.from(document.querySelectorAll('.cls-new-session-weekday:checked')).map(el => el.value);
            if (start_time && end_time) {
              const dates = generateSessionDates({ recurType, baseDate, untilDate, weekdays });
              for (const dateStr of dates) {
                const sRes = await fetch(`/api/provider/classes/${savedClass.id}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ date: dateStr, start_time, end_time, capacity }) });
                if (sRes.ok) sessionCount++;
              }
            }
          }
        }

        editCard.style.display = 'none'; editForm.reset(); loadClasses();
        showToast(sessionCount ? `保存しました（開催回${sessionCount}件も追加）` : '保存しました');
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

      // 開催回（予約枠）管理を単独で開く（でお報告2026-09-16：「名簿・進級」ボタンの
      // 裏に隠れていて予約枠を作る場所が見つからないという不具合。クラス一覧に
      // 専用ボタンを出し、押したら直接この画面を開く）。
      function openSessions(classId) {
        selectedClass = classesCache.find(c => c.id === classId);
        if (!selectedClass || !sessionsCard) return;
        sessionsTitle.textContent = `${selectedClass.name} の開催回・予約枠`;
        sessionsCard.style.display = 'block';
        sessionsCard.scrollIntoView({ behavior: 'smooth' });
        loadSessions();
      }

      const WEEKDAY_JA_CLS = ['日', '月', '火', '水', '木', '金', '土'];
      async function loadSessions() {
        if (!selectedClass || !sessionListEl) return;
        sessionListEl.innerHTML = '読み込み中…';
        const res = await fetch(`/api/provider/classes/${selectedClass.id}/sessions`, { headers: authH() });
        if (!res.ok) { sessionListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { sessionListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ開催回がありません。上のフォームから追加してください。</p>'; return; }
        const today = new Date().toISOString().slice(0, 10);
        sessionListEl.innerHTML = rows.map(s => {
          const d = new Date(`${s.date}T00:00:00`);
          const isPast = s.date < today;
          return `
          <div style="padding:10px 14px;background:var(--color-bg);border-radius:10px;opacity:${isPast ? 0.55 : 1}">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:0">
                <strong style="font-size:13.5px">${s.date}（${WEEKDAY_JA_CLS[d.getDay()]}）${s.start_time?.slice(0,5)}〜${s.end_time?.slice(0,5)}</strong>
                <span class="muted" style="font-size:12px;margin-left:8px">${s.booked}/${s.capacity}名${!s.is_open ? '（締切中）' : ''}</span>
              </div>
              <button type="button" class="btn btn-ghost" style="font-size:11.5px;padding:4px 10px" data-sess-attendees="${s.id}">参加者を見る</button>
              <button type="button" class="btn btn-ghost" style="font-size:11.5px;padding:4px 10px" data-sess-toggle="${s.id}" data-open="${s.is_open}">${s.is_open ? '締め切る' : '再開する'}</button>
              <button type="button" class="btn btn-ghost" style="font-size:11.5px;padding:4px 10px;color:#ef4444" data-sess-del="${s.id}">削除</button>
            </div>
            <div class="cls-attendees-box" data-sess-attendees-box="${s.id}" style="display:none;margin-top:8px"></div>
          </div>`;
        }).join('');
        sessionListEl.querySelectorAll('[data-sess-attendees]').forEach(btn => btn.addEventListener('click', () => toggleSessionAttendees(btn.dataset.sessAttendees)));
        sessionListEl.querySelectorAll('[data-sess-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/classes/${selectedClass.id}/sessions/${btn.dataset.sessToggle}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ is_open: btn.dataset.open !== 'true' }) });
          if (res.ok) loadSessions(); else showToast('更新に失敗しました');
        }));
        sessionListEl.querySelectorAll('[data-sess-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この開催回を削除しますか？')) return;
          const res = await fetch(`/api/provider/classes/${selectedClass.id}/sessions/${btn.dataset.sessDel}`, { method: 'DELETE', headers: authH() });
          if (res.ok) loadSessions(); else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        }));
      }

      // 開催回ごとの参加者一覧（でお要望2026-09-26：予約タブ「グループレッスン」
      // （閲覧専用）とこのクラス管理タブがほぼ同じ内容だったため統合。参加者表示は
      // 旧グループレッスンタブから移植。
      async function toggleSessionAttendees(sessionId) {
        if (!selectedClass) return;
        const box = sessionListEl.querySelector(`[data-sess-attendees-box="${sessionId}"]`);
        if (!box) return;
        if (box.style.display === 'block') { box.style.display = 'none'; return; }
        box.style.display = 'block';
        box.innerHTML = '読み込み中…';
        const res = await fetch(`/api/provider/classes/${selectedClass.id}/sessions/${sessionId}/attendees`, { headers: authH() });
        if (!res.ok) { box.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { box.innerHTML = '<p class="muted" style="font-size:12.5px;margin:0">まだ参加者がいません。</p>'; return; }
        box.innerHTML = rows.map(r => `
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:4px 0;border-top:1px solid #f3f4f6">
            <span>${esc(r.user_name)}</span><span class="muted">${esc(r.user_contact || '')}</span>
          </div>
        `).join('');
      }

      const sessionRecurTypeEl = document.getElementById('cls-session-recur-type');
      const sessionWeekdayFieldEl = document.getElementById('cls-session-weekday-field');
      const sessionUntilFieldEl = document.getElementById('cls-session-until-field');
      function updateSessionRecurFields() {
        const type = sessionRecurTypeEl?.value || 'once';
        if (sessionWeekdayFieldEl) sessionWeekdayFieldEl.style.display = type === 'weekly' ? '' : 'none';
        if (sessionUntilFieldEl) sessionUntilFieldEl.style.display = type === 'once' ? 'none' : '';
      }
      sessionRecurTypeEl?.addEventListener('change', updateSessionRecurFields);
      updateSessionRecurFields();

      function fmtYMD(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
      // 「毎週」「毎月」の繰り返しから実際の開催日一覧を作る（でお要望2026-09-16：
      // 「何曜日の何時から、何月何日何時からなど...毎週やるものや毎月やるものなども
      // 選べるように」）。RRULEのような汎用エンジンは使わず、シンプルな日付列挙に留める。
      function generateSessionDates({ recurType, baseDate, untilDate, weekdays }) {
        if (recurType === 'once' || !untilDate) return [baseDate];
        const start = new Date(`${baseDate}T00:00:00`);
        const until = new Date(`${untilDate}T00:00:00`);
        if (until < start) return [baseDate];
        const MAX_OCC = 104; // 安全のための上限（週1なら約2年分）
        const dates = [];
        if (recurType === 'weekly') {
          const wdSet = weekdays.length ? new Set(weekdays.map(Number)) : new Set([start.getDay()]);
          const d = new Date(start);
          while (d <= until && dates.length < MAX_OCC) {
            if (wdSet.has(d.getDay())) dates.push(fmtYMD(d));
            d.setDate(d.getDate() + 1);
          }
        } else if (recurType === 'monthly') {
          const dayOfMonth = start.getDate();
          const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
          while (cursor <= until && dates.length < MAX_OCC) {
            const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
            if (candidate.getMonth() === cursor.getMonth() && candidate >= start && candidate <= until) dates.push(fmtYMD(candidate));
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }
        return dates.length ? dates : [baseDate];
      }

      sessionForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedClass) return;
        const fd = new FormData(sessionForm);
        const baseDate = fd.get('date');
        const recurType = fd.get('recur_type') || 'once';
        const untilDate = fd.get('until_date') || '';
        const weekdays = fd.getAll('weekday');
        const start_time = fd.get('start_time');
        const end_time = fd.get('end_time');
        const capacity = fd.get('capacity');
        const dates = generateSessionDates({ recurType, baseDate, untilDate, weekdays });
        let okCount = 0;
        for (const dateStr of dates) {
          const res = await fetch(`/api/provider/classes/${selectedClass.id}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ date: dateStr, start_time, end_time, capacity }) });
          if (res.ok) okCount++;
        }
        sessionForm.reset();
        updateSessionRecurFields();
        loadSessions();
        showToast(`${okCount}件の開催回を追加しました`);
      });

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

      // 講師選択肢の読み込みは、実際にクラス管理タブを開いた時だけでよい
      // （でお報告2026-09-16：「カレンダーの読み込みが遅い」。全タブ共通のuseEffect内で
      // 無条件に動くIIFEが増えるたびに、カレンダーを開くだけでも無関係な通信が
      // 積み重なっていた。タブを開くまで発火しないように変更）。
      document.querySelectorAll('[data-tab="classes"]').forEach(btn => btn.addEventListener('click', () => { loadStaffOptionsForClasses(); loadClasses(); }, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'classes') { loadStaffOptionsForClasses(); loadClasses(); }
    })();

    // ── ロッカー月極管理（でお要望2026-09-14） ─────
    (function setupLockers() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
      function fmtYen(n) { return n || n === 0 ? `¥${Number(n).toLocaleString()}` : '未設定'; }
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

      // ── ロッカー配置図（でお要望2026-10-02：hacomonoのように店舗ごとに段数・横の数・大きさを
      // 設定して、どこが空き／契約中／使用不可かを図で見られるようにする） ─────
      const layoutEl = document.getElementById('lkr-layout');
      const modalRoot = document.getElementById('lkr-modal-root');
      let banks = [];
      let lockers = [];
      let selectedBankId = null;

      const STATE_STYLE = {
        free: 'background:#ffffff;border:1.5px solid #cbd5e1;color:#1e293b;',
        taken: 'background:#dcfce7;border:1.5px solid #16a34a;color:#14532d;',
        off: 'background:repeating-linear-gradient(135deg,#e5e7eb,#e5e7eb 6px,#f3f4f6 6px,#f3f4f6 12px);border:1.5px solid #cbd5e1;color:#6b7280;',
      };
      const inputCss = 'width:100%;padding:8px 10px;border:1px solid rgba(26,20,16,0.2);border-radius:8px;font-size:14px;box-sizing:border-box;';

      function lockerRect(l) { return { r1: l.grid_row, c1: l.grid_col, r2: l.grid_row + (l.row_span || 1) - 1, c2: l.grid_col + (l.col_span || 1) - 1 }; }
      function rectsOverlap(a, b) { return a.r1 <= b.r2 && b.r1 <= a.r2 && a.c1 <= b.c2 && b.c1 <= a.c2; }
      function placementError(bank, others, cand) {
        const rect = { r1: cand.grid_row, c1: cand.grid_col, r2: cand.grid_row + cand.row_span - 1, c2: cand.grid_col + cand.col_span - 1 };
        if (rect.r2 > bank.grid_rows || rect.c2 > bank.grid_cols) return '配置図の範囲を超えています';
        if (others.some(o => rectsOverlap(rect, lockerRect(o)))) return '他のロッカーと重なっています';
        return null;
      }
      function lockerState(l) { return !l.active ? 'off' : (l.activeContract ? 'taken' : 'free'); }
      function currentBank() { return banks.find(b => b.id === selectedBankId) || null; }
      function bankLockers(bankId) { return lockers.filter(l => l.bank_id === bankId); }

      async function apiJson(url, method, body) {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...authH() }, body: body ? JSON.stringify(body) : undefined });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      }

      function closeModal() { if (modalRoot) modalRoot.innerHTML = ''; }
      function openModal(title, bodyHtml) {
        if (!modalRoot) return null;
        modalRoot.innerHTML = `
          <div data-lkr-overlay style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px">
            <div style="background:#fff;color:#1a1410;border-radius:16px;padding:20px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;box-sizing:border-box">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h3 style="margin:0;font-size:16px">${esc(title)}</h3>
                <button type="button" data-lkr-modal-close style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;line-height:1">×</button>
              </div>
              ${bodyHtml}
            </div>
          </div>`;
        modalRoot.querySelector('[data-lkr-modal-close]')?.addEventListener('click', closeModal);
        modalRoot.querySelector('[data-lkr-overlay]')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
        return modalRoot;
      }
      function field(label, inner, hint) {
        return `<div style="margin-bottom:10px"><label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px">${label}</label>${inner}${hint ? `<div style="font-size:11px;color:#6b7280;margin-top:3px">${hint}</div>` : ''}</div>`;
      }

      async function loadLockers() {
        if (!layoutEl) return;
        const [bRes, lRes] = await Promise.all([
          fetch('/api/provider/locker-banks', { headers: authH() }),
          fetch('/api/provider/lockers', { headers: authH() }),
        ]);
        if (!bRes.ok) { layoutEl.innerHTML = authErrorHtml(bRes); return; }
        if (!lRes.ok) { layoutEl.innerHTML = authErrorHtml(lRes); return; }
        banks = await bRes.json();
        lockers = await lRes.json();
        if (!banks.some(b => b.id === selectedBankId)) selectedBankId = banks[0]?.id || null;
        renderLayout();
      }

      const gcdN = (a, b) => (b ? gcdN(b, a % b) : a);
      const lcmN = (a, b) => (a / gcdN(a, b)) * b;
      const tierRows = (tiers, base) => tiers.reduce((a, t) => (t > 0 ? lcmN(a, t) : a), base || 1);

      // 列ごとの段数エディタ（例：1列目=2段、2〜4列目=3段）。fixed=true なら列の増減不可
      function bindTierEditor(box, initial, opts) {
        const tiers = initial.slice();
        const froms = opts.froms ? opts.froms.slice() : tiers.map(() => null);
        const baseRows = opts.baseRows || 1;
        function refresh() {
          const rows = tierRows(tiers, baseRows);
          const prev = box.querySelector('[data-tier-preview]');
          const sum = box.querySelector('[data-tier-summary]');
          if (prev) {
            prev.innerHTML = tiers.map(t => t > 0
              ? `<div style="display:flex;flex-direction:column;gap:3px;width:30px;height:100%">${Array.from({ length: Math.min(t, 60) }, () => '<div style="flex:1;min-height:2px;border-radius:3px;background:#d1fae5;border:1px solid #6ee7b7"></div>').join('')}</div>`
              : '<div style="width:30px;height:100%;border:1.5px dashed #d1d5db;border-radius:3px"></div>').join('');
          }
          if (sum) {
            const bad = rows > 60;
            sum.style.color = bad ? '#dc2626' : '#6b7280';
            sum.textContent = bad
              ? `段数の組み合わせだと縦が${rows}分割になり、上限60を超えます。段数を揃えるか減らしてください`
              : `${tiers.length}列。縦は${rows}マスに分割して配置します（大きいロッカーは複数マス分の高さになります）`;
          }
          opts.onChange?.(tiers, rows);
        }
        function render() {
          box.innerHTML = `
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px">
              ${tiers.map((t, i) => `<div style="width:62px;text-align:center">
                <div style="font-size:11px;color:#6b7280;margin-bottom:3px">${i + 1}列目</div>
                <input data-tier="${i}" type="number" min="0" max="60" value="${t}" style="${inputCss}text-align:center;padding:6px 2px">
                ${opts.fixed ? '' : `<button type="button" data-tier-del="${i}" style="margin-top:3px;background:none;border:none;color:#9ca3af;font-size:11px;cursor:pointer">削除</button>`}
              </div>`).join('')}
              ${opts.fixed || tiers.length >= 60 ? '' : '<button type="button" data-tier-add class="btn btn-ghost" style="font-size:12px;padding:6px 10px;margin-bottom:' + (opts.fixed ? 0 : 22) + 'px">＋列を追加</button>'}
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px">各列に縦に並ぶロッカーの数（段数）を入れます。0 にするとその列は作りません。</div>
            <div data-tier-preview style="display:flex;gap:6px;height:110px;padding:8px;background:var(--color-bg);border-radius:8px;overflow-x:auto;margin-bottom:6px"></div>
            <div data-tier-summary style="font-size:11.5px"></div>`;
          box.querySelectorAll('[data-tier]').forEach(inp => inp.addEventListener('input', () => {
            const v = Math.floor(Number(inp.value));
            tiers[Number(inp.dataset.tier)] = Number.isFinite(v) && v > 0 ? Math.min(v, 60) : 0;
            refresh();
          }));
          box.querySelectorAll('[data-tier-del]').forEach(b => b.addEventListener('click', () => {
            if (tiers.length <= 1) return;
            tiers.splice(Number(b.dataset.tierDel), 1);
            froms.splice(Number(b.dataset.tierDel), 1);
            render();
          }));
          box.querySelector('[data-tier-add]')?.addEventListener('click', () => {
            tiers.push(tiers.length ? tiers[tiers.length - 1] : 3);
            froms.push(null);
            render();
          });
          refresh();
        }
        render();
        return { get tiers() { return tiers; }, get froms() { return froms; }, get rows() { return tierRows(tiers, baseRows); } };
      }

      function renderLayout() {
        if (!layoutEl) return;
        if (!banks.length) {
          layoutEl.innerHTML = `
            <div style="text-align:center;padding:28px 12px;background:var(--color-bg);border-radius:12px">
              <p style="margin:0 0 6px;font-weight:700;font-size:14px">ロッカーの配置図を作りましょう</p>
              <p class="muted" style="margin:0 0 14px;font-size:12.5px">段数・横の数を決めるとマス目ができ、そこにロッカーを置けます。更衣室ごとなど、複数作れます。</p>
              <button type="button" class="btn" data-lkr-bank-new>ロッカー群を作成</button>
            </div>`;
          layoutEl.querySelector('[data-lkr-bank-new]')?.addEventListener('click', () => openBankModal());
          return;
        }
        const bank = currentBank();
        const list = bankLockers(bank.id);
        const counts = { all: list.length, taken: 0, free: 0, off: 0 };
        list.forEach(l => { counts[lockerState(l)]++; });

        const occupied = new Set();
        list.forEach(l => { const r = lockerRect(l); for (let y = r.r1; y <= r.r2; y++) for (let x = r.c1; x <= r.c2; x++) occupied.add(`${y},${x}`); });

        const unit = Math.max(22, Math.min(64, Math.round(300 / bank.grid_rows)));
        let cellsHtml = '';
        for (let y = 1; y <= bank.grid_rows; y++) {
          for (let x = 1; x <= bank.grid_cols; x++) {
            if (occupied.has(`${y},${x}`)) continue;
            cellsHtml += `<button type="button" data-lkr-empty data-r="${y}" data-c="${x}" aria-label="${y}段目${x}列目にロッカーを追加" style="grid-row:${y};grid-column:${x};border:1.5px dashed #d1d5db;border-radius:8px;background:transparent;color:#9ca3af;font-size:18px;cursor:pointer;padding:0">＋</button>`;
          }
        }
        list.forEach(l => {
          const st = lockerState(l);
          const c = l.activeContract;
          const sub = st === 'taken' ? esc(c.contractor_name) : st === 'off' ? '使用不可' : '空き';
          const cellH = l.row_span * unit + (l.row_span - 1) * 6;
          const compact = cellH < 44;
          cellsHtml += `<button type="button" data-lkr-cell="${l.id}" style="grid-row:${l.grid_row} / span ${l.row_span};grid-column:${l.grid_col} / span ${l.col_span};${STATE_STYLE[st]}border-radius:8px;padding:${compact ? '0 4px' : '4px 6px'};cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;overflow:hidden;text-align:center">
            <span style="font-size:${compact ? 11 : 14}px;font-weight:700;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.name)}</span>
            ${compact ? '' : `<span style="font-size:10.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85">${sub}</span>`}
          </button>`;
        });

        const legend = (st, label) => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;${STATE_STYLE[st]}"></span>${label}</span>`;
        const chips = banks.map(b => `<button type="button" data-lkr-bank-pick="${b.id}" style="padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid ${b.id === bank.id ? '#1a1410' : '#d1d5db'};background:${b.id === bank.id ? '#1a1410' : '#fff'};color:${b.id === bank.id ? '#fff' : '#374151'}">${esc(b.name)}</button>`).join('');

        layoutEl.innerHTML = `
          <div style="display:flex;gap:8px;flex-wrap:wrap">${chips}</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px">
            <span>全${counts.all}</span>
            <span style="color:#16a34a;font-weight:700">契約中 ${counts.taken}</span>
            <span style="font-weight:700">空き ${counts.free}</span>
            <span style="color:#6b7280">使用不可 ${counts.off}</span>
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap">${legend('free', '空き')}${legend('taken', '契約中')}${legend('off', '使用不可')}<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;border:1.5px dashed #d1d5db"></span>未配置（タップで追加）</span></div>
          <div style="overflow-x:auto;padding:2px">
            <div style="display:grid;grid-template-columns:repeat(${bank.grid_cols},minmax(68px,1fr));grid-auto-rows:${unit}px;gap:6px;min-width:${bank.grid_cols * 68 + (bank.grid_cols - 1) * 6}px">${cellsHtml}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:6px 12px" data-lkr-bank-edit>編集</button>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:6px 12px;color:#ef4444" data-lkr-bank-del-main>この配置図を削除</button>
          </div>`;

        layoutEl.querySelectorAll('[data-lkr-bank-pick]').forEach(btn => btn.addEventListener('click', () => { selectedBankId = btn.dataset.lkrBankPick; renderLayout(); }));
        layoutEl.querySelectorAll('[data-lkr-empty]').forEach(btn => btn.addEventListener('click', () => openNewLockerModal(bank, Number(btn.dataset.r), Number(btn.dataset.c))));
        layoutEl.querySelectorAll('[data-lkr-cell]').forEach(btn => btn.addEventListener('click', () => { const l = lockers.find(x => x.id === btn.dataset.lkrCell); if (l) openLockerModal(l); }));
        layoutEl.querySelector('[data-lkr-bank-edit]')?.addEventListener('click', () => openBankModal(bank));
        layoutEl.querySelector('[data-lkr-bank-del-main]')?.addEventListener('click', async () => {
          if (!confirm(`「${bank.name}」と、その中のロッカー${list.length}個をすべて削除します。よろしいですか？`)) return;
          const r = await apiJson(`/api/provider/locker-banks/${bank.id}`, 'DELETE');
          if (!r.ok) { showToast('エラー: ' + (r.data.error || '不明')); return; }
          showToast('削除しました');
          loadLockers();
        });
      }

      function openBankModal(bank) {
        const editing = !!bank;
        const others = editing ? bankLockers(bank.id) : [];
        const curTiers = editing
          ? Array.from({ length: bank.grid_cols }, (_, i) => others.filter(l => { const rc = lockerRect(l); return i + 1 >= rc.c1 && i + 1 <= rc.c2; }).length)
          : [3, 3, 3, 3];
        const startDefault = editing ? (nextLockerName(others).replace(/\D+/g, '') || 1) : 1;
        const root = openModal(editing ? 'ロッカー群を編集' : 'ロッカー群を追加', `
          <form data-lkr-form>
            ${field('名前', `<input name="name" value="${editing ? esc(bank.name) : (banks.length ? '' : 'ロッカー')}" placeholder="例：男子更衣室" required style="${inputCss}">`)}
            <div style="font-size:12px;font-weight:700;margin-bottom:6px">列ごとの段数</div>
            <div data-lkr-tiers style="margin-bottom:12px"></div>
            ${editing ? '' : '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin-bottom:8px"><input type="checkbox" name="make" checked> この形でロッカーも一緒に作る</label>'}
            <div data-lkr-make>
              <div style="display:flex;gap:10px">
                <div style="flex:1">${field('頭の文字', `<input name="prefix" placeholder="例：A-" style="${inputCss}">`)}</div>
                <div style="flex:1">${field('開始番号', `<input name="start" type="number" min="0" value="${startDefault}" required style="${inputCss}">`)}</div>
                <div style="flex:1">${field('桁数', `<input name="digits" type="number" min="0" max="10" value="0" style="${inputCss}">`, '0=そのまま')}</div>
              </div>
              ${field('番号の振り方', `<select name="order" style="${inputCss}"><option value="column">列ごとに上から下へ（1列目の上から順）</option><option value="row">段ごとに左から右へ</option></select>`)}
              ${field('月額（円）', `<input name="monthly_fee" type="number" min="0" placeholder="任意（全部に同じ額）" style="${inputCss}">`)}
            </div>
            <p style="font-size:11.5px;color:#6b7280;margin:0 0 12px">${editing
              ? '段数を変えていない列のロッカーはそのまま残ります。段数を変えた列・追加した列は、空きロッカーを作り直して上の番号で振り直します（契約中のロッカーがある列は変えられません）。'
              : '例：1列目を2段の大きいロッカー、2〜4列目を3段の小さいロッカーにする場合は「2, 3, 3, 3」。あとから大きさ・個数は個別に変更できます。'}</p>
            <button type="submit" class="btn" style="width:100%">${editing ? '保存する' : '作成する'}</button>
            ${editing ? '<button type="button" data-lkr-bank-del style="margin-top:12px;width:100%;background:none;border:none;color:#ef4444;font-size:12.5px;cursor:pointer">この配置図を削除</button>' : ''}
          </form>`);
        if (!root) return;
        const editor = bindTierEditor(root.querySelector('[data-lkr-tiers]'), curTiers, { baseRows: 1, froms: editing ? curTiers.map((_, i) => i + 1) : null });
        const makeBox = root.querySelector('[data-lkr-make]');
        root.querySelector('input[name="make"]')?.addEventListener('change', e => { makeBox.style.display = e.target.checked ? '' : 'none'; });
        root.querySelector('[data-lkr-bank-del]')?.addEventListener('click', async () => {
          if (!confirm(`「${bank.name}」と、その中のロッカーをすべて削除します。よろしいですか？`)) return;
          const r = await apiJson(`/api/provider/locker-banks/${bank.id}`, 'DELETE');
          if (!r.ok) { showToast('エラー: ' + (r.data.error || '不明')); return; }
          closeModal();
          loadLockers();
        });
        root.querySelector('[data-lkr-form]').addEventListener('submit', async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const tiers = editor.tiers.slice();
          if (!tiers.some(t => t > 0) && !editing) { showToast('段数を入れた列がありません'); return; }
          if (editor.rows > 60) { showToast('段数の組み合わせが大きすぎます（縦の分割が60を超えます）'); return; }
          if (editing) {
            const body = {
              name: fd.get('name'),
              layout: tiers.map((t, i) => ({ from: editor.froms[i], tiers: t })),
              order: fd.get('order'), prefix: fd.get('prefix'), start: fd.get('start'), digits: fd.get('digits'), monthly_fee: fd.get('monthly_fee'),
            };
            let r = await apiJson(`/api/provider/locker-banks/${bank.id}/layout`, 'POST', body);
            if (!r.ok && r.data.needs_confirm) {
              if (!confirm(r.data.error + '。よろしいですか？')) return;
              r = await apiJson(`/api/provider/locker-banks/${bank.id}/layout`, 'POST', { ...body, confirm_remove: true });
            }
            if (!r.ok) { showToast('エラー: ' + (r.data.error || '不明')); return; }
            closeModal();
            await loadLockers();
            showToast(r.data.created ? `保存しました（ロッカー${r.data.created}個を新しく作成）` : '保存しました');
            return;
          }
          const r = await apiJson('/api/provider/locker-banks', 'POST', { name: fd.get('name'), grid_rows: editor.rows, grid_cols: tiers.length });
          if (!r.ok) { showToast('エラー: ' + (r.data.error || '不明')); return; }
          selectedBankId = r.data.id;
          let msg = '配置図を作りました。マスをタップしてロッカーを置けます';
          if (fd.get('make')) {
            const f = await apiJson(`/api/provider/locker-banks/${r.data.id}/fill`, 'POST', { column_tiers: tiers, order: fd.get('order'), prefix: fd.get('prefix'), start: fd.get('start'), digits: fd.get('digits'), monthly_fee: fd.get('monthly_fee') });
            msg = f.ok ? `${f.data.created}個のロッカーを作りました` : '配置図は作りましたが、ロッカーの作成に失敗しました: ' + (f.data.error || '不明');
          }
          closeModal();
          await loadLockers();
          showToast(msg);
        });
      }

      function nextLockerName(list) {
        let best = null;
        list.forEach(l => {
          const m = String(l.name).match(/^(.*?)(\d+)$/);
          if (m && (!best || Number(m[2]) >= best.num)) best = { prefix: m[1], num: Number(m[2]), width: m[2].length, padded: m[2].startsWith('0') };
        });
        if (!best) return '';
        const n = String(best.num + 1);
        return best.prefix + (best.padded ? n.padStart(best.width, '0') : n);
      }

      function openNewLockerModal(bank, r, c) {
        const others = bankLockers(bank.id);
        const root = openModal(`${r}段目・${c}列目にロッカーを置く`, `
          <form data-lkr-form>
            ${field('ロッカー名・番号', `<input name="name" value="${esc(nextLockerName(others))}" placeholder="例：12" required style="${inputCss}">`)}
            ${field('月額（円）', `<input name="monthly_fee" type="number" min="0" placeholder="任意" style="${inputCss}">`)}
            <div style="display:flex;gap:10px">
              <div style="flex:1">${field('縦の大きさ（段）', `<input name="row_span" type="number" min="1" value="1" required style="${inputCss}">`)}</div>
              <div style="flex:1">${field('横の大きさ（列）', `<input name="col_span" type="number" min="1" value="1" required style="${inputCss}">`)}</div>
            </div>
            <p style="font-size:11.5px;color:#6b7280;margin:0 0 12px">大きいロッカーは、縦・横の数字を増やすとその分のマスを使います。</p>
            <button type="submit" class="btn" style="width:100%">置く</button>
          </form>`);
        root?.querySelector('[data-lkr-form]')?.addEventListener('submit', async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { bank_id: bank.id, grid_row: r, grid_col: c, row_span: Number(fd.get('row_span')), col_span: Number(fd.get('col_span')), name: fd.get('name'), monthly_fee: fd.get('monthly_fee') };
          const perr = placementError(bank, others, body);
          if (perr) { showToast(perr); return; }
          const res = await apiJson('/api/provider/lockers', 'POST', body);
          if (!res.ok) { showToast('エラー: ' + (res.data.error || '不明')); return; }
          closeModal();
          loadLockers();
        });
      }

      function openLockerModal(l) {
        const bank = banks.find(b => b.id === l.bank_id);
        const c = l.activeContract;
        const st = lockerState(l);
        const locked = !!c;
        const dis = locked ? 'disabled' : '';
        const stateLabel = st === 'taken' ? '<span style="font-weight:700;color:#16a34a">契約中</span>' : st === 'off' ? '<span style="font-weight:700;color:#6b7280">使用不可</span>' : '<span style="font-weight:700">空き</span>';
        const contractHtml = c ? `
          <div style="background:#f0fdf4;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px">
            <div><strong>${esc(c.contractor_name)}</strong>（月額${fmtYen(c.monthly_fee)}）${c.user_id ? ' <span style="color:#2563eb;font-weight:700;cursor:pointer" data-lkr-open-cust>会員</span>' : ''}</div>
            <div style="margin-top:4px;font-size:12px">${c.stripe_subscription_item_id
              ? '<span style="font-weight:700;padding:1px 8px;border-radius:99px;background:#ecfdf5;color:#059669">自動課金中</span>'
              : c.payment_link_url
                ? `<span style="font-weight:700;padding:1px 8px;border-radius:99px;background:#fffbeb;color:#92400e">支払いリンク未完了</span> <a href="${esc(c.payment_link_url)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:700">リンクを開く</a>`
                : '<span style="color:#6b7280">手動管理</span>'}</div>
          </div>` : '';
        const root = openModal(`${l.name}（${stateLabel.replace(/<[^>]+>/g, '')}）`, `
          ${contractHtml}
          <form data-lkr-form>
            ${field('ロッカー名・番号', `<input name="name" value="${esc(l.name)}" required style="${inputCss}">`)}
            ${field('月額（円）', `<input name="monthly_fee" type="number" min="0" value="${l.monthly_fee ?? ''}" placeholder="未設定" style="${inputCss}">`)}
            <div style="display:flex;gap:10px">
              <div style="flex:1">${field('縦の大きさ（段）', `<input name="row_span" type="number" min="1" value="${l.row_span}" ${dis} style="${inputCss}">`)}</div>
              <div style="flex:1">${field('横の大きさ（列）', `<input name="col_span" type="number" min="1" value="${l.col_span}" ${dis} style="${inputCss}">`)}</div>
            </div>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px"><input type="checkbox" name="unusable" ${l.active ? '' : 'checked'} ${dis}> 使用不可にする（入会ページにも出しません）</label>
            ${locked ? '<p style="font-size:11.5px;color:#6b7280;margin:0 0 10px">契約中は大きさの変更・使用不可にはできません。名前と月額は変更できます。</p>' : ''}
            <button type="submit" class="btn" style="width:100%;margin-bottom:8px">変更を保存</button>
          </form>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${c
              ? '<button type="button" class="btn btn-ghost" style="flex:1;color:#ef4444" data-lkr-cancel-contract>解約する</button>'
              : (l.active ? '<button type="button" class="btn" style="flex:1" data-lkr-start-contract>契約する</button>' : '')}
            <button type="button" class="btn btn-ghost" style="color:#ef4444" data-lkr-del>削除</button>
          </div>`);
        root?.querySelector('[data-lkr-open-cust]')?.addEventListener('click', () => {
          if (!window.openCustomerModal) { showToast('読み込み中です。少し待ってから再度お試しください'); return; }
          closeModal();
          window.openCustomerModal(c.user_id, 'member', c.contractor_name);
        });
        root?.querySelector('[data-lkr-form]')?.addEventListener('submit', async e => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = { name: fd.get('name'), monthly_fee: fd.get('monthly_fee') };
          if (!locked) {
            const rs = Number(fd.get('row_span')), cs = Number(fd.get('col_span'));
            body.active = !fd.get('unusable');
            if (rs !== l.row_span || cs !== l.col_span) {
              const cand = { grid_row: l.grid_row, grid_col: l.grid_col, row_span: rs, col_span: cs };
              const perr = placementError(bank, bankLockers(bank.id).filter(o => o.id !== l.id), cand);
              if (perr) { showToast(perr); return; }
              body.row_span = rs; body.col_span = cs;
            }
          }
          const r = await apiJson(`/api/provider/lockers/${l.id}`, 'PATCH', body);
          if (!r.ok) { showToast('エラー: ' + (r.data.error || '不明')); return; }
          closeModal();
          loadLockers();
          showToast('保存しました');
        });
        root?.querySelector('[data-lkr-start-contract]')?.addEventListener('click', () => {
          selectedLockerId = l.id;
          closeModal();
          contractTitle.textContent = `${l.name} を契約する`;
          contractForm.reset();
          setSelectedMember(null, '');
          contractCard.style.display = 'block';
          contractCard.scrollIntoView({ behavior: 'smooth' });
        });
        root?.querySelector('[data-lkr-cancel-contract]')?.addEventListener('click', async () => {
          if (!confirm('この契約を解約しますか？')) return;
          const r = await apiJson(`/api/provider/lockers/${l.id}/contracts/${c.id}`, 'PATCH', { status: 'cancelled' });
          if (r.ok) { closeModal(); showToast('解約しました'); loadLockers(); } else showToast('解約に失敗しました');
        });
        root?.querySelector('[data-lkr-del]')?.addEventListener('click', async () => {
          if (!confirm('このロッカーを削除しますか？')) return;
          const r = await apiJson(`/api/provider/lockers/${l.id}`, 'DELETE');
          if (r.ok) { closeModal(); loadLockers(); } else showToast('エラー: ' + (r.data.error || '不明'));
        });
      }

      document.getElementById('lkr-bank-add-btn')?.addEventListener('click', () => openBankModal());

      document.getElementById('lkr-contract-cancel-btn')?.addEventListener('click', () => { contractCard.style.display = 'none'; });
      contractForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedLockerId) return;
        const fd = new FormData(contractForm);
        const res = await fetch(`/api/provider/lockers/${selectedLockerId}/contracts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
          body: JSON.stringify({ contractor_name: fd.get('contractor_name'), monthly_fee: fd.get('monthly_fee'), note: fd.get('note'), user_id: selectedMemberUserId }),
        });
        if (res.ok) {
          const d = await res.json();
          contractCard.style.display = 'none';
          loadLockers();
          if (d.billing_mode === 'auto') showToast('契約しました（既存の月会費サブスクに自動課金を追加しました）');
          else if (d.billing_mode === 'link') showToast('契約しました。カード未登録のため支払いリンクを発行しました。一覧の「リンクを開く」から確認し、お客様へ送ってください');
          else if (d.billing_mode === 'error') showToast('契約は記録しましたが、自動課金の設定に失敗しました：' + (d.billing_error || '不明なエラー'));
          else showToast('契約しました');
          return;
        }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="lockers"]').forEach(btn => btn.addEventListener('click', loadLockers, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'lockers') loadLockers();
    })();

    // ── 入会手続きタブ（でお要望2026-09-15〜16：オンライン入会・Stripe決済） ─────
    (function setupMemberships() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
      function fmtYen(n) { return n || n === 0 ? `¥${Number(n).toLocaleString()}` : '未設定'; }
      const STATUS_LABEL = { pending_approval: '承認待ち', active: '有効', rejected: '却下', cancelled: '解約' };
      const STATUS_COLOR = { pending_approval: '#d97706', active: '#16a34a', rejected: '#ef4444', cancelled: '#9ca3af' };

      const warningEl = document.getElementById('mbr-connect-warning');
      const joinUrlEl = document.getElementById('mbr-join-url');
      const planListEl = document.getElementById('mbr-plan-list');
      const appListEl = document.getElementById('mbr-app-list');
      const detailCard = document.getElementById('mbr-detail-card');
      const detailBody = document.getElementById('mbr-detail-body');
      const detailMsg = document.getElementById('mbr-detail-msg');
      let currentDetailId = null;
      let loaded = false;

      async function checkConnectStatus() {
        try {
          const res = await fetch('/api/stripe/connect/status', { headers: authH() });
          if (!res.ok) return;
          const data = await res.json();
          if (warningEl) {
            if (data.status !== 'active') {
              warningEl.style.display = 'block';
              warningEl.innerHTML = 'Stripe Connectの本人確認が完了していないため、承認・課金開始ができません。「Fineme利用契約」タブから設定を完了してください。';
            } else {
              warningEl.style.display = 'none';
            }
          }
        } catch {}
      }

      async function loadPlans() {
        if (!planListEl) return;
        const res = await fetch('/api/provider/membership-plans', { headers: authH() });
        if (!res.ok) { planListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { planListEl.innerHTML = '<p class="muted" style="font-size:13px">まだプランがありません。上のフォームから追加してください。</p>'; return; }
        planListEl.innerHTML = rows.map(p => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-bg);border-radius:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px">${esc(p.name)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">月額${fmtYen(p.monthly_price)}</span>
              ${p.description ? `<div class="muted" style="font-size:12px;margin-top:2px">${esc(p.description)}</div>` : ''}
              ${!p.active ? '<div style="font-size:11px;color:#9ca3af;margin-top:2px">非公開</div>' : ''}
            </div>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-mbr-plan-toggle="${p.id}" data-active="${p.active}">${p.active ? '非公開にする' : '公開する'}</button>
            <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px;color:#ef4444" data-mbr-plan-del="${p.id}">削除</button>
          </div>
        `).join('');
        planListEl.querySelectorAll('[data-mbr-plan-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/membership-plans/${btn.dataset.mbrPlanToggle}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ active: btn.dataset.active !== 'true' }) });
          if (res.ok) loadPlans(); else showToast('更新に失敗しました');
        }));
        planListEl.querySelectorAll('[data-mbr-plan-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このプランを削除しますか？')) return;
          const res = await fetch(`/api/provider/membership-plans/${btn.dataset.mbrPlanDel}`, { method: 'DELETE', headers: authH() });
          if (res.ok) loadPlans(); else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        }));
      }

      document.getElementById('mbr-plan-add-btn')?.addEventListener('click', async () => {
        const nameEl = document.getElementById('mbr-plan-name');
        const priceEl = document.getElementById('mbr-plan-price');
        const descEl = document.getElementById('mbr-plan-desc');
        const name = nameEl.value.trim();
        const price = Number(priceEl.value);
        if (!name || !price) { showToast('プラン名と月額を入力してください'); return; }
        const res = await fetch('/api/provider/membership-plans', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ name, monthly_price: price, description: descEl.value.trim() }) });
        if (res.ok) { nameEl.value = ''; priceEl.value = ''; descEl.value = ''; loadPlans(); showToast('プランを追加しました'); }
        else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
      });

      async function loadSettings() {
        const res = await fetch('/api/provider/membership-settings', { headers: authH() });
        if (!res.ok) return;
        const s = await res.json();
        const prorateEl = document.getElementById('mbr-set-prorate');
        const idreqEl = document.getElementById('mbr-set-idreq');
        const termsEl = document.getElementById('mbr-set-terms');
        if (prorateEl) prorateEl.checked = !!s.prorate_first_month;
        if (idreqEl) idreqEl.checked = !!s.require_id_document;
        if (termsEl) termsEl.value = s.terms_text || '';
      }
      document.getElementById('mbr-set-save-btn')?.addEventListener('click', async () => {
        const msgEl = document.getElementById('mbr-set-msg');
        const body = {
          prorate_first_month: document.getElementById('mbr-set-prorate')?.checked,
          require_id_document: document.getElementById('mbr-set-idreq')?.checked,
          terms_text: document.getElementById('mbr-set-terms')?.value || '',
        };
        const res = await fetch('/api/provider/membership-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify(body) });
        if (msgEl) { msgEl.textContent = res.ok ? '保存しました' : '保存に失敗しました'; setTimeout(() => { msgEl.textContent = ''; }, 3000); }
      });

      async function loadApplications() {
        if (!appListEl) return;
        const res = await fetch('/api/provider/memberships', { headers: authH() });
        if (!res.ok) { appListEl.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { appListEl.innerHTML = '<p class="muted" style="font-size:13px">まだ入会申込がありません。</p>'; return; }
        appListEl.innerHTML = rows.map(m => `
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--color-bg);border-radius:10px;flex-wrap:wrap;cursor:pointer" data-mbr-open="${m.id}">
            <div style="flex:1;min-width:0">
              <strong style="font-size:14px">${esc(m.last_name || '')} ${esc(m.first_name || '')}</strong>
              <span style="font-size:11px;font-weight:700;color:${STATUS_COLOR[m.status] || '#6b7280'};margin-left:8px">${STATUS_LABEL[m.status] || m.status}</span>
              <div class="muted" style="font-size:12px;margin-top:2px">${esc(m.plan_name || 'プラン未選択')} ／ 入会希望日：${esc(m.enrollment_date || '未設定')}</div>
            </div>
          </div>
        `).join('');
        appListEl.querySelectorAll('[data-mbr-open]').forEach(row => row.addEventListener('click', () => openDetail(row.dataset.mbrOpen)));
      }

      async function openDetail(id) {
        currentDetailId = id;
        if (!detailCard || !detailBody) return;
        detailCard.style.display = 'block';
        detailBody.innerHTML = '読み込み中…';
        if (detailMsg) detailMsg.textContent = '';
        detailCard.scrollIntoView({ behavior: 'smooth' });
        const res = await fetch(`/api/provider/memberships/${id}`, { headers: authH() });
        if (!res.ok) { detailBody.innerHTML = '読み込みに失敗しました'; return; }
        const m = await res.json();
        const approveBtn = document.getElementById('mbr-detail-approve-btn');
        const rejectBtn = document.getElementById('mbr-detail-reject-btn');
        if (approveBtn) approveBtn.style.display = m.status === 'pending_approval' ? '' : 'none';
        if (rejectBtn) rejectBtn.style.display = m.status === 'pending_approval' ? '' : 'none';
        detailBody.innerHTML = `
          <div><strong>${esc(m.last_name || '')} ${esc(m.first_name || '')}</strong> <span style="font-size:11px;font-weight:700;color:${STATUS_COLOR[m.status] || '#6b7280'}">${STATUS_LABEL[m.status] || m.status}</span></div>
          <div>生年月日：${esc(m.birthdate || '未入力')}</div>
          <div>住所：〒${esc(m.postal_code || '')} ${esc(m.address || '')}</div>
          <div>電話：${esc(m.phone || '未入力')}</div>
          <div>プラン：${esc(m.plan_name || '未選択')}（月額${fmtYen(m.plan_price)}）</div>
          <div>入会希望日：${esc(m.enrollment_date || '未設定')}${m.prorated_first_amount != null ? `（初回目安：${fmtYen(m.prorated_first_amount)}）` : ''}</div>
          <div>ロッカー：${esc(m.locker_name || 'なし')}</div>
          <div>緊急連絡先：${esc(m.emergency_contact_name || '未入力')}（${esc(m.emergency_contact_relation || '')}）${esc(m.emergency_contact_phone || '')}</div>
          <div>本人確認書類：${m.id_document_url ? `<a href="${esc(m.id_document_url)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb">画像を確認する</a>` : '未提出'}</div>
          <div>規約同意：${m.terms_agreed_at ? `同意済み（${esc(m.terms_agreed_at.slice(0, 10))}）` : '未同意'}</div>
        `;
      }
      document.getElementById('mbr-detail-close')?.addEventListener('click', () => { detailCard.style.display = 'none'; currentDetailId = null; });
      document.getElementById('mbr-detail-approve-btn')?.addEventListener('click', async () => {
        if (!currentDetailId) return;
        if (!confirm('承認して課金を開始しますか？')) return;
        const res = await fetch(`/api/provider/memberships/${currentDetailId}/approve`, { method: 'POST', headers: authH() });
        if (res.ok) { showToast('承認しました'); detailCard.style.display = 'none'; loadApplications(); }
        else { const e = await res.json().catch(() => ({})); if (detailMsg) detailMsg.textContent = 'エラー: ' + (e.error || '不明'); }
      });
      document.getElementById('mbr-detail-reject-btn')?.addEventListener('click', async () => {
        if (!currentDetailId) return;
        const reason = prompt('却下理由（お客様には通知されません。店舗記録用）', '');
        if (reason === null) return;
        const res = await fetch(`/api/provider/memberships/${currentDetailId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ reason }) });
        if (res.ok) { showToast('却下しました'); detailCard.style.display = 'none'; loadApplications(); }
        else { const e = await res.json().catch(() => ({})); if (detailMsg) detailMsg.textContent = 'エラー: ' + (e.error || '不明'); }
      });

      document.getElementById('mbr-copy-url-btn')?.addEventListener('click', () => {
        const url = joinUrlEl?.textContent;
        if (!url) return;
        navigator.clipboard?.writeText(url).then(() => showToast('コピーしました')).catch(() => {});
      });

      function loadAll() {
        if (loaded) return;
        loaded = true;
        const slug = provider?.slug || '';
        if (joinUrlEl) joinUrlEl.textContent = slug ? `${location.origin}/provider/${slug}/join` : location.origin + '/provider/[店舗URL]/join';
        checkConnectStatus();
        loadPlans();
        loadSettings();
        loadApplications();
      }
      document.querySelectorAll('[data-tab="memberships"]').forEach(btn => btn.addEventListener('click', loadAll, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'memberships') loadAll();
    })();

    // ── 空き枠タブ（即時予約モード用・hacomono/STORES網羅計画 Phase 1） ─────
    (function setupSlots() {
      const token = getSupabaseToken();
      if (!token) return;
      const authH = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
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

      // 複数選択でまとめて開放/締切/削除（でお要望2026-09-28）。
      let multiSelectMode = false;
      let selectedSlotIds = new Set();

      // シフトとの連動確認用（でお報告2026-09-28：「空き枠とシフトがちゃんと連動して
      // いるように思えない」）。自動生成側（lib/slot-generator.js）は既に確定シフトの
      // 無い日・時間帯の枠を作らないよう修正済みだが、それ以前に生成された枠や手動追加の
      // 枠は残りうるため、この一覧でも「開放中に見えるが実際は予約できない（シフト未確定）」
      // 状態を視覚的に警告する（予約カレンダータブのグレー帯と同じ判定基準）。
      let shiftFeatureOn = false;
      let shiftCoveredDates = new Set();
      let shiftWindowsByStaffDate = {}; // {staffId: {date: [{start,end}]}}
      function toMinutesSlot(t) { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; }
      async function loadShiftCoverage(from, to) {
        shiftFeatureOn = !!(window.__providerFeatures?.shift_management);
        if (!shiftFeatureOn) { shiftCoveredDates = new Set(); shiftWindowsByStaffDate = {}; return; }
        try {
          const res = await fetch(`/api/provider/shift-entries/for-range?from=${from}&to=${to}`, { headers: authH() });
          if (!res.ok) return;
          const { entries, coveredPeriods } = await res.json();
          shiftCoveredDates = new Set();
          (coveredPeriods || []).forEach(p => {
            let d = new Date(p.start + 'T00:00:00Z');
            const end = new Date(p.end + 'T00:00:00Z');
            while (d <= end) { shiftCoveredDates.add(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
          });
          shiftWindowsByStaffDate = {};
          (entries || []).forEach(e => {
            (shiftWindowsByStaffDate[e.staff_id] = shiftWindowsByStaffDate[e.staff_id] || {});
            (shiftWindowsByStaffDate[e.staff_id][e.date] = shiftWindowsByStaffDate[e.staff_id][e.date] || []).push({ start: e.start_time, end: e.end_time });
          });
        } catch {}
      }
      // lib/shift-availability.jsのisOutsideShift()と同じ判定基準（確定シフト期間の
      // 対象外日は全面ブロック／対象日でも出勤予定の無い時間帯はブロック）。
      function isSlotOutsideShift(s) {
        if (!shiftFeatureOn) return false;
        if (!shiftCoveredDates.has(s.date)) return true;
        if (s.staff_id) {
          const windows = (shiftWindowsByStaffDate[s.staff_id] && shiftWindowsByStaffDate[s.staff_id][s.date]) || [];
          if (!windows.length) return true;
          return !windows.some(w => toMinutesSlot(s.start_time) >= toMinutesSlot(w.start) && toMinutesSlot(s.end_time) <= toMinutesSlot(w.end));
        }
        const anyStaffCovers = Object.values(shiftWindowsByStaffDate).some(byDate =>
          (byDate[s.date] || []).some(w => toMinutesSlot(s.start_time) >= toMinutesSlot(w.start) && toMinutesSlot(s.end_time) <= toMinutesSlot(w.end)));
        return !anyStaffCovers;
      }

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

      // フィルタ（スタッフ/部屋）のみで絞った、表示期間全体の枠（でお要望2026-09-27：
      // 「空き枠の一覧のところの表示もお客様が即時予約するページと同じ表の形式に」に
      // 対応するため、1日分だけでなく期間全体を日付×時間の表で一望できるようにする）。
      function filteredSlotsAll() {
        const fs = filterStaffEl?.value || '';
        const fr = filterResourceEl?.value || '';
        return slotsWindowCache.filter(s => (!fs || s.staff_id === fs) && (!fr || s.resource_id === fr));
      }

      function updateSelDateLabel() {
        if (!selDateLabelEl) return;
        const d = new Date(selectedDate + 'T00:00:00');
        const dateLabel = Number.isNaN(d.getTime()) ? selectedDate : `${selectedDate}（${WEEKDAY_JA_S[d.getDay()]}）`;
        selDateLabelEl.textContent = `一括操作・新規追加の対象日：${dateLabel}`;
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
        updateSelDateLabel();
        pillsEl.querySelectorAll('[data-slot-pill]').forEach(btn => btn.addEventListener('click', () => {
          selectedDate = btn.dataset.slotPill;
          userPickedSlotDate = true;
          renderPills();
        }));
      }

      // 空き枠のカレンダー表示（でお指摘2026-09-15：「作った枠が何個も下に連なっていて
      // スクロールめっちゃしなきゃいけないし死ぬほどだるい。カレンダー的な表示の仕方が
      // 1番いいはず」）。1日分でも刻み幅を短くすると数十件になる（10分刻みなら1日39件等）
      // ため、縦に積む一覧ではなく「時間×スタッフ（部屋）」の表で一望できるようにする。
      // 予約カレンダー本体（連続座標の絶対配置）ほど厳密でなくてよいため、実際に枠がある
      // 時刻だけを行にしたシンプルな表で組む。
      function renderSlotEditor(s) {
        const editorEl = document.getElementById('slot-grid-editor');
        if (!editorEl) return;
        editorEl.innerHTML = `
          <div style="border:1px solid rgba(26,20,16,0.12);border-radius:10px;padding:14px;background:var(--color-bg)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <strong style="font-size:13px">${esc(s.staff_id ? (staffById[s.staff_id] || 'スタッフ') : '指名なし')}${s.resource_id ? ' ／ ' + esc(resourceById[s.resource_id] || '部屋') : ''}</strong>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px" id="slot-editor-close">閉じる</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
              <input type="time" value="${s.start_time?.slice(0,5) || ''}" data-edit-start style="padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px" />
              <span class="muted">〜</span>
              <input type="time" value="${s.end_time?.slice(0,5) || ''}" data-edit-end style="padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px" />
              <span class="muted">定員</span>
              <input type="number" min="1" value="${s.capacity}" data-edit-capacity style="width:60px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px" />
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn" style="font-size:12px;padding:6px 14px" id="slot-editor-save">保存</button>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:6px 14px" id="slot-editor-toggle">${s.is_open ? '締め切る' : '再開する'}</button>
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:6px 14px;color:#ef4444" id="slot-editor-del">削除</button>
            </div>
          </div>
        `;
        editorEl.querySelector('#slot-editor-close').addEventListener('click', () => { editorEl.innerHTML = ''; });
        editorEl.querySelector('#slot-editor-save').addEventListener('click', async () => {
          const start_time = editorEl.querySelector('[data-edit-start]').value;
          const end_time = editorEl.querySelector('[data-edit-end]').value;
          const capacity = Number(editorEl.querySelector('[data-edit-capacity]').value) || 1;
          const res = await fetch(`/api/provider/slots/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ start_time, end_time, capacity }) });
          if (res.ok) { showToast('保存しました'); editorEl.innerHTML = ''; loadWindow(); }
          else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        });
        editorEl.querySelector('#slot-editor-toggle').addEventListener('click', async () => {
          await fetch(`/api/provider/slots/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ is_open: !s.is_open }) });
          editorEl.innerHTML = '';
          loadWindow();
        });
        editorEl.querySelector('#slot-editor-del').addEventListener('click', async () => {
          if (!confirm('この枠を削除しますか？')) return;
          await fetch(`/api/provider/slots/${s.id}`, { method: 'DELETE', headers: authH() });
          editorEl.innerHTML = '';
          loadWindow();
        });
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // 1つの日付×時間セルに複数の枠がある場合（スタッフ/部屋フィルタを「すべて」に
      // している時）に、そのうちの1件だけしか編集できなかった不具合を修正（でお報告
      // 2026-09-28：「絞り込みを全てにしているときは、編集ボタンを押したらその枠を
      // 開放している全てのスタッフを表示して選択して編集できるようにしてほしい。
      // 現状だと誰か1人だけが出てくる」）。該当セルの全件を一覧表示し、それぞれを
      // 個別に開放/締切・編集・複数選択チェックできるようにする。
      function renderSlotGroupEditor(group) {
        const editorEl = document.getElementById('slot-grid-editor');
        if (!editorEl) return;
        editorEl.innerHTML = `
          <div style="border:1px solid rgba(26,20,16,0.12);border-radius:10px;padding:14px;background:var(--color-bg)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <strong style="font-size:13px">${esc(group[0].date)} ${esc(group[0].start_time?.slice(0, 5) || '')}〜 の枠（${group.length}件）</strong>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px" id="slot-group-close">閉じる</button>
            </div>
            <div class="stack" style="gap:8px">
              ${group.map(s => {
                const ghost = s.is_open && isSlotOutsideShift(s);
                return `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(26,20,16,0.03);border-radius:8px">
                  <input type="checkbox" data-group-select="${s.id}" ${selectedSlotIds.has(s.id) ? 'checked' : ''} />
                  <span style="flex:1;font-size:12.5px">${esc(s.staff_id ? (staffById[s.staff_id] || 'スタッフ') : '指名なし')}${s.resource_id ? ' ／ ' + esc(resourceById[s.resource_id] || '部屋') : ''}（定員${s.capacity}）${!s.is_open ? '<span style="color:#ef4444;font-weight:700">・締切中</span>' : ghost ? '<span style="color:#b45309;font-weight:700">・シフト未確定</span>' : ''}</span>
                  <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 8px" data-group-toggle="${s.id}">${s.is_open ? '締め切る' : '再開する'}</button>
                  <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 8px" data-group-edit="${s.id}">編集</button>
                </div>`;
              }).join('')}
            </div>
          </div>
        `;
        editorEl.querySelector('#slot-group-close').addEventListener('click', () => { editorEl.innerHTML = ''; });
        editorEl.querySelectorAll('[data-group-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const s = group.find(x => x.id === btn.dataset.groupToggle);
          if (!s) return;
          btn.disabled = true;
          const res = await fetch(`/api/provider/slots/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ is_open: !s.is_open }) });
          if (res.ok) { s.is_open = !s.is_open; renderSlotGroupEditor(group); renderSlotGrid(); }
          else { btn.disabled = false; const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        }));
        editorEl.querySelectorAll('[data-group-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = group.find(x => x.id === btn.dataset.groupEdit);
          if (s) renderSlotEditor(s);
        }));
        editorEl.querySelectorAll('[data-group-select]').forEach(cb => cb.addEventListener('change', () => {
          toggleSlotSelection(cb.dataset.groupSelect);
        }));
      }

      // ── 複数選択モード（でお要望2026-09-28：「複数選択でまとめて編集できるように」）──
      function updateSelectionBar() {
        const bar = document.getElementById('slot-selection-bar');
        if (!bar) return;
        if (selectedSlotIds.size > 0) {
          bar.style.display = 'flex';
          const countEl = document.getElementById('slot-selection-count');
          if (countEl) countEl.textContent = `${selectedSlotIds.size}件選択中`;
        } else {
          bar.style.display = 'none';
        }
      }
      function toggleSlotSelection(id) {
        if (selectedSlotIds.has(id)) selectedSlotIds.delete(id); else selectedSlotIds.add(id);
        updateSelectionBar();
      }
      async function bulkActionOnSelection(action) {
        const ids = [...selectedSlotIds];
        if (!ids.length) return;
        const label = { open: '開放', close: '締切', delete: '削除' }[action];
        if (action === 'delete' && !confirm(`選択した${ids.length}件を削除します。よろしいですか？`)) return;
        const res = await fetch('/api/provider/slots/bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authH() },
          body: JSON.stringify({ action, slot_ids: ids }),
        });
        if (res.ok) {
          const d = await res.json();
          showToast(`${d.count}件を${label}しました`);
          selectedSlotIds.clear();
          updateSelectionBar();
          loadWindow();
        } else {
          const e = await res.json().catch(() => ({}));
          showToast('エラー: ' + (e.error || '不明'));
        }
      }
      document.getElementById('slot-multiselect-toggle')?.addEventListener('click', () => {
        multiSelectMode = !multiSelectMode;
        if (!multiSelectMode) selectedSlotIds.clear();
        const btn = document.getElementById('slot-multiselect-toggle');
        if (btn) btn.textContent = multiSelectMode ? '複数選択を終了' : '複数選択';
        const editorEl = document.getElementById('slot-grid-editor');
        if (editorEl) editorEl.innerHTML = '';
        updateSelectionBar();
        renderSlotGrid();
      });
      document.getElementById('slot-selection-clear')?.addEventListener('click', () => { selectedSlotIds.clear(); updateSelectionBar(); renderSlotGrid(); });
      document.getElementById('slot-selection-open')?.addEventListener('click', () => bulkActionOnSelection('open'));
      document.getElementById('slot-selection-close')?.addEventListener('click', () => bulkActionOnSelection('close'));
      document.getElementById('slot-selection-delete')?.addEventListener('click', () => bulkActionOnSelection('delete'));

      // お客様の即時予約ページ（app/provider/[slug]/board/page.js）と同じ「日付×時間」の
      // 表形式に統一（でお要望2026-09-27：「空き枠の一覧のところの表示もお客様が即時予約
      // するページと同じ表の形式の表示にしてほしい」）。あわせて、セルの○/×を直接タップ
      // するだけでその場で開放・締切できるようにした（でお要望「シフトを出してる出してなくても、
      // 空き枠設定のところで簡単に枠を開放・閉鎖できるようにしてほしい」）。時間・定員の変更や
      // 削除は「編集」リンクから従来のrenderSlotEditor()を開く。
      function renderSlotGrid() {
        if (!listEl) return;
        const dates = windowDates();
        const rows = filteredSlotsAll();
        const times = [...new Set(rows.map(s => s.start_time))].sort();
        if (!times.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">この期間の枠はありません。「営業時間から自動生成」または下の個別追加フォームから作成してください。</p><div id="slot-grid-editor"></div>'; return; }

        const todayStr = fmtDate(new Date());
        // 同じ日付×時間に複数の枠がありうる（スタッフ/部屋フィルタが「すべて」の時）ため、
        // 1件に間引かずグループとして持つ（でお報告2026-09-28の不具合修正）。
        const groupMap = {};
        rows.forEach(s => { const key = `${s.date}|${s.start_time}`; (groupMap[key] = groupMap[key] || []).push(s); });

        const headerHtml = `<th style="text-align:left;padding:6px 8px;font-size:11px;color:#6b7280;position:sticky;left:0;background:#fff;z-index:1">時間</th>`
          + dates.map(d => {
            const ds = fmtDate(d);
            const dow = d.getDay();
            const color = dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#374151';
            return `<th style="padding:6px 8px;font-size:11px;color:${color};font-weight:700;white-space:nowrap;background:#fff">${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY_JA_S[dow]}）${ds === todayStr ? '<br/><span style="font-size:9px;color:#c9a84c;font-weight:800">今日</span>' : ''}</th>`;
          }).join('');

        const bodyHtml = times.map(t => {
          const cells = dates.map(d => {
            const ds = fmtDate(d);
            const group = groupMap[`${ds}|${t}`];
            if (!group) return '<td style="padding:3px 5px;text-align:center;color:#d1d5db;font-size:12px">−</td>';

            if (group.length > 1) {
              // 複数の枠（スタッフ違い等）が同じ日時にある場合はまとめて件数バッジにし、
              // タップで内訳（renderSlotGroupEditor）を開く／複数選択モードでは
              // まとめて選択する（でお報告2026-09-28）。
              const selectedCount = group.filter(s => selectedSlotIds.has(s.id)).length;
              const anyGhost = group.some(s => s.is_open && isSlotOutsideShift(s));
              const border = selectedCount > 0 ? '#2563eb' : anyGhost ? '#f59e0b' : '#9ca3af';
              const bg = selectedCount > 0 ? 'rgba(37,99,235,0.12)' : anyGhost ? 'rgba(245,158,11,0.14)' : 'rgba(26,20,16,0.04)';
              return `<td style="padding:3px 5px;text-align:center">
                <button type="button" data-slot-group="${ds}|${t}" title="${group.length}件の枠${anyGhost ? '（シフト未確定のものを含みます）' : ''}" style="min-width:34px;height:34px;padding:0 6px;border-radius:8px;border:1.5px solid ${border};background:${bg};color:#374151;font-weight:800;font-size:12px;cursor:pointer">${group.length}件${selectedCount ? `<br/><span style="font-size:9px;color:#2563eb">${selectedCount}選択</span>` : ''}</button>
              </td>`;
            }

            const s = group[0];
            const isOpen = s.is_open;
            const ghost = isOpen && isSlotOutsideShift(s); // 開放中に見えるが実際は予約できない（シフト未確定）
            const isSelected = selectedSlotIds.has(s.id);
            const border = isSelected ? '#2563eb' : ghost ? '#f59e0b' : (isOpen ? '#c9a84c' : '#d1d5db');
            const bg = isSelected ? 'rgba(37,99,235,0.14)' : ghost ? 'rgba(245,158,11,0.16)' : (isOpen ? 'rgba(201,168,76,0.16)' : 'rgba(26,20,16,0.04)');
            const color = isSelected ? '#2563eb' : ghost ? '#b45309' : (isOpen ? '#c9a84c' : '#9ca3af');
            const title = ghost
              ? `定員${s.capacity}（シフト未確定のため実質締切中。タップで設定上の開放も解除できます）`
              : `定員${s.capacity}${isOpen ? '（タップで締切）' : '（タップで再開）'}`;
            // シフト未確定の枠は、設定上はis_open=trueのままでも見た目は「×（締切）」として
            // 表示する（でお確認2026-09-28：「シフトが入っていないなら空き枠一覧でも締め切りの
            // 状態になるってことだよね？」）。実際にお客様は予約できないため、店舗側にも
            // 「締切」と同じ見た目で伝えるのが正しい。ただし色はグレー（手動締切）と区別し、
            // アンバーで「シフト未確定による締切」であることが分かるようにしている。
            const glyph = multiSelectMode ? (isSelected ? '✕' : '○') : (ghost ? '×' : (isOpen ? '○' : '×'));
            return `<td style="padding:3px 5px;text-align:center">
              <button type="button" data-slot-toggle="${s.id}" title="${esc(title)}" style="width:34px;height:34px;border-radius:8px;border:1.5px solid ${border};background:${bg};color:${color};font-weight:800;font-size:15px;cursor:pointer">${glyph}</button>
              ${multiSelectMode ? '' : `<button type="button" data-slot-edit="${s.id}" style="display:block;margin:2px auto 0;font-size:9px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">編集</button>`}
            </td>`;
          }).join('');
          return `<tr><td style="padding:5px 8px;font-size:12px;font-weight:700;white-space:nowrap;position:sticky;left:0;background:#fff">${esc(t.slice(0, 5))}</td>${cells}</tr>`;
        }).join('');

        listEl.innerHTML = `
          <div style="overflow-x:auto;border:1px solid rgba(26,20,16,0.08);border-radius:10px">
            <table style="border-collapse:collapse;width:100%">
              <thead><tr>${headerHtml}</tr></thead>
              <tbody>${bodyHtml}</tbody>
            </table>
          </div>
          <div id="slot-grid-editor" style="margin-top:12px"></div>
        `;
        listEl.querySelectorAll('[data-slot-toggle]').forEach(btn => btn.addEventListener('click', async () => {
          const s = rows.find(x => x.id === btn.dataset.slotToggle);
          if (!s) return;
          if (multiSelectMode) { toggleSlotSelection(s.id); renderSlotGrid(); return; }
          btn.disabled = true;
          const res = await fetch(`/api/provider/slots/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authH() }, body: JSON.stringify({ is_open: !s.is_open }) });
          if (res.ok) { s.is_open = !s.is_open; renderSlotGrid(); }
          else { btn.disabled = false; const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); }
        }));
        listEl.querySelectorAll('[data-slot-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = rows.find(x => x.id === btn.dataset.slotEdit);
          if (s) renderSlotEditor(s);
        }));
        listEl.querySelectorAll('[data-slot-group]').forEach(btn => btn.addEventListener('click', () => {
          const group = groupMap[btn.dataset.slotGroup];
          if (!group) return;
          if (multiSelectMode) {
            const allSelected = group.every(s => selectedSlotIds.has(s.id));
            group.forEach(s => { if (allSelected) selectedSlotIds.delete(s.id); else selectedSlotIds.add(s.id); });
            updateSelectionBar();
            renderSlotGrid();
            return;
          }
          renderSlotGroupEditor(group);
        }));
      }

      async function loadWindow() {
        if (!listEl) return;
        await loadSelectOptions();
        listEl.textContent = '読み込み中…';
        const dates = windowDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        const [res] = await Promise.all([
          fetch(`/api/provider/slots?from=${from}&to=${to}`, { headers: authH() }),
          loadShiftCoverage(from, to),
        ]);
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        slotsWindowCache = await res.json();
        if (!userPickedSlotDate) selectedDate = from;
        renderPills();
        renderSlotGrid();
      }

      filterStaffEl?.addEventListener('change', () => { renderPills(); renderSlotGrid(); });
      filterResourceEl?.addEventListener('change', () => { renderPills(); renderSlotGrid(); });
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
        const res = await fetch('/api/provider/features', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
      // でお要望2026-09-17：「営業時間の設定はそこにも必要だけど、店舗設定のタブ内にも
      // 同じものが必要」。空き枠タブ（即時予約の枠生成と一体）に加えて、店舗設定タブにも
      // 同じ営業時間エディタを置きたいため、ids差し替えで複数箇所に同じUIを組み立てられる
      // ファクトリ関数にしておく。
      function setupBusinessHoursEditor(ids) {
        function applyBulk() {
          const el = document.getElementById(ids.editor);
          const open = document.getElementById(ids.bulkOpen)?.value;
          const close = document.getElementById(ids.bulkClose)?.value;
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
        document.getElementById(ids.bulkApplyBtn)?.addEventListener('click', applyBulk);

        function render(hours) {
          const el = document.getElementById(ids.editor);
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
        async function load() {
          const res = await fetch('/api/provider/business-hours', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
          if (!res.ok) return;
          const data = await res.json();
          render(data.business_hours || {});
          const durSel = document.getElementById(ids.durationSelect);
          if (durSel) durSel.value = String(data.slot_duration_minutes || 60);
        }
        document.getElementById(ids.saveBtn)?.addEventListener('click', async () => {
          const msg = document.getElementById(ids.saveMsg);
          const business_hours = {};
          Object.keys(WEEKDAY_LABEL_BH).forEach(key => {
            const el = document.getElementById(ids.editor);
            const closed = el?.querySelector(`[data-bh-closed="${key}"]`)?.checked || false;
            const open = el?.querySelector(`[data-bh-open="${key}"]`)?.value || null;
            const close = el?.querySelector(`[data-bh-close="${key}"]`)?.value || null;
            business_hours[key] = { closed, open, close };
          });
          const slot_duration_minutes = Number(document.getElementById(ids.durationSelect)?.value) || 60;
          if (msg) { msg.style.color = ''; msg.textContent = '保存中…'; }
          const res = await fetch('/api/provider/business-hours', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
            body: JSON.stringify({ business_hours, slot_duration_minutes }),
          });
          if (msg) {
            if (res.ok) { msg.style.color = '#4ade80'; msg.textContent = '✓ 保存しました'; setTimeout(() => { if (msg) msg.textContent = ''; }, 2500); }
            else { msg.style.color = '#ef4444'; msg.textContent = '保存に失敗しました'; }
          }
        });
        if (ids.generateNowBtn) {
          document.getElementById(ids.generateNowBtn)?.addEventListener('click', async () => {
            const btn = document.getElementById(ids.generateNowBtn);
            btn.disabled = true; const origText = btn.textContent; btn.textContent = '生成中…';
            const res = await fetch('/api/provider/slots/auto-generate', {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
        }
        document.querySelectorAll(`[data-tab="${ids.tab}"]`).forEach(btn => btn.addEventListener('click', load, { once: false }));
        if (new URLSearchParams(location.search).get('tab') === ids.tab) load();

        // 臨時休業日（でお要望2026-09-18：「特定の1日だけ臨時休業、みたいな例外日の
        // 設定もできるようにしたい」）。曜日パターンだけでは表現できない不定休に対応。
        if (ids.closedList) {
          const WEEKDAY_JA_CD = ['日', '月', '火', '水', '木', '金', '土'];
          async function loadClosedDates() {
            const listEl2 = document.getElementById(ids.closedList);
            if (!listEl2) return;
            const res = await fetch('/api/provider/closed-dates', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
            const rows = res.ok ? await res.json() : [];
            if (!rows.length) { listEl2.innerHTML = '<p class="muted" style="font-size:12.5px">今後の臨時休業日はありません。</p>'; return; }
            listEl2.innerHTML = rows.map(r => {
              const d = new Date(`${r.date}T00:00:00`);
              return `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--color-bg);border-radius:8px;margin-bottom:4px">
                  <span style="flex:1;font-size:13px">${r.date}（${WEEKDAY_JA_CD[d.getDay()]}）${r.reason ? `<span class="muted" style="margin-left:6px">${esc(r.reason)}</span>` : ''}</span>
                  <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#ef4444" data-closed-del="${r.date}">削除</button>
                </div>`;
            }).join('');
            listEl2.querySelectorAll('[data-closed-del]').forEach(btn => btn.addEventListener('click', async () => {
              await fetch(`/api/provider/closed-dates?date=${btn.dataset.closedDel}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
              loadClosedDates();
            }));
          }
          document.getElementById(ids.closedAddBtn)?.addEventListener('click', async () => {
            const dateInput = document.getElementById(ids.closedDateInput);
            const reasonInput = document.getElementById(ids.closedReasonInput);
            if (!dateInput?.value) { showToast('日付を選んでください'); return; }
            const res = await fetch('/api/provider/closed-dates', {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
              body: JSON.stringify({ date: dateInput.value, reason: reasonInput?.value.trim() || null }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); return; }
            dateInput.value = ''; if (reasonInput) reasonInput.value = '';
            showToast('臨時休業日を追加しました');
            loadClosedDates();
          });
          document.querySelectorAll(`[data-tab="${ids.tab}"]`).forEach(btn => btn.addEventListener('click', loadClosedDates, { once: false }));
          if (new URLSearchParams(location.search).get('tab') === ids.tab) loadClosedDates();
        }
      }

      setupBusinessHoursEditor({
        tab: 'slots', editor: 'business-hours-editor', bulkOpen: 'bh-bulk-open', bulkClose: 'bh-bulk-close',
        bulkApplyBtn: 'bh-bulk-apply-btn', durationSelect: 'slot-duration-select', saveBtn: 'business-hours-save-btn',
        saveMsg: 'business-hours-save-msg', generateNowBtn: 'slots-generate-now-btn',
        closedList: 'closed-dates-list', closedDateInput: 'closed-date-input', closedReasonInput: 'closed-date-reason', closedAddBtn: 'closed-date-add-btn',
      });
      setupBusinessHoursEditor({
        tab: 'business-hours', editor: 'bh2-editor', bulkOpen: 'bh2-bulk-open', bulkClose: 'bh2-bulk-close',
        bulkApplyBtn: 'bh2-bulk-apply-btn', durationSelect: 'bh2-duration-select', saveBtn: 'bh2-save-btn',
        saveMsg: 'bh2-save-msg', generateNowBtn: null,
        closedList: 'bh2-closed-dates-list', closedDateInput: 'bh2-closed-date-input', closedReasonInput: 'bh2-closed-date-reason', closedAddBtn: 'bh2-closed-date-add-btn',
      });

      // 同時に保持できる予約数の上限・予約可能時間の締切（でお要望2026-09-14／
      // でお確認2026-09-18：「予約可能時間の設定どこ（前日21時まで予約可能等）」）
      async function loadBookingLimit() {
        const input = document.getElementById('booking-limit-input');
        const cutoffModeSel = document.getElementById('booking-cutoff-mode');
        const cutoffInput = document.getElementById('booking-cutoff-input');
        const cutoffTimeInput = document.getElementById('booking-cutoff-time-input');
        if (!input) return;
        const res = await fetch('/api/provider/booking-limits', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        if (res.ok) {
          const d = await res.json();
          input.value = d.max_active_reservations ?? 1;
          if (cutoffModeSel) cutoffModeSel.value = d.booking_cutoff_mode || 'hours';
          if (cutoffInput) cutoffInput.value = d.booking_cutoff_hours ?? 0;
          if (cutoffTimeInput) cutoffTimeInput.value = d.booking_cutoff_time || '';
          updateCutoffModeFields();
        }
      }
      document.getElementById('booking-limit-save-btn')?.addEventListener('click', async () => {
        const input = document.getElementById('booking-limit-input');
        const msg = document.getElementById('booking-limit-msg');
        const n = Number(input?.value);
        if (!Number.isInteger(n) || n < 1) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = '1以上の整数を入力してください'; } return; }
        const res = await fetch('/api/provider/booking-limits', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
          body: JSON.stringify({ max_active_reservations: n }),
        });
        if (msg) { msg.style.color = res.ok ? '#4ade80' : '#ef4444'; msg.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
      });
      // 予約締切の指定方法（でお要望2026-09-18：「前日の何時までというのと、何時間前
      // までを選べるように」）。「開始◯時間前まで」と「前日◯時まで（固定時刻）」を切替。
      function updateCutoffModeFields() {
        const mode = document.getElementById('booking-cutoff-mode')?.value || 'hours';
        const hoursField = document.getElementById('booking-cutoff-hours-field');
        const timeField = document.getElementById('booking-cutoff-time-field');
        if (hoursField) hoursField.style.display = mode === 'hours' ? '' : 'none';
        if (timeField) timeField.style.display = mode === 'day_before_time' ? '' : 'none';
      }
      document.getElementById('booking-cutoff-mode')?.addEventListener('change', updateCutoffModeFields);
      document.getElementById('booking-cutoff-save-btn')?.addEventListener('click', async () => {
        const mode = document.getElementById('booking-cutoff-mode')?.value || 'hours';
        const cutoffInput = document.getElementById('booking-cutoff-input');
        const cutoffTimeInput = document.getElementById('booking-cutoff-time-input');
        const msg = document.getElementById('booking-cutoff-msg');
        const body = { booking_cutoff_mode: mode };
        if (mode === 'hours') {
          const h = Number(cutoffInput?.value);
          if (!Number.isInteger(h) || h < 0) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = '0以上の整数を入力してください'; } return; }
          body.booking_cutoff_hours = h;
        } else {
          if (!cutoffTimeInput?.value) { if (msg) { msg.style.color = '#ef4444'; msg.textContent = '時刻を選んでください'; } return; }
          body.booking_cutoff_time = cutoffTimeInput.value;
        }
        const res = await fetch('/api/provider/booking-limits', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
          body: JSON.stringify(body),
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
        const res = await fetch('/api/provider/stories', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/recommended-frequencies', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/dormant-settings', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) return;
        const data = await res.json();
        daysInput.value = data.no_visit_days;
      }

      saveBtn.addEventListener('click', async () => {
        const days = Number(daysInput.value);
        if (!days || days < 1) { msgEl.textContent = '1以上の日数を入力してください'; msgEl.style.color = '#ef4444'; return; }
        saveBtn.disabled = true;
        const res = await fetch('/api/provider/dormant-settings', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
      function authHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` }; }

      let allItems = [];
      let staffList = [];
      let karteFields = [];
      let providerMenus = [];
      // カルテのカスタム性を拡張（でお要望2026-09-12）：自由記述／選択肢／5段階評価に加え、
      // 数値／日付／チェックボックスを追加。
      const FIELD_TYPE_LABEL = { text: '自由記述', select: '選択肢', multiselect: '複数選択', stars: '5段階評価', rating10: '10段階評価', number: '数値', date: '日付', time: '時刻', url: 'リンク', checkbox: 'チェック' };

      // サービス設定タブで登録済みの自店メニュー一覧を、来店記録の「利用メニュー」選択肢として流用する。
      // 予約データ(reservations)とメニュー(provider_experience_menus)がID単位で綺麗に紐づいていないため
      // 自動検出はできず、記録追加時に店舗側が選ぶ方式にした（でお相談・2026-09合意）。
      async function loadMenus() {
        const res = await fetch('/api/provider/experience-menus', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        const all = res.ok ? await res.json() : [];
        providerMenus = all.filter(m => m.is_active !== false);
      }

      // ── カルテ項目（カスタムフィールド）の管理 ──
      // でお指摘2026-09-17：「カルテ項目を管理っていうやつのフローがクソだるい。カルテを
      // 書くの中で、追加するボタンをつけてどの項目を追加するか選択したらそれがそこの
      // カルテに出てくるっていうフローの方がシンプルでわかりやすいに決まってんだろ」。
      // 以前は「項目を追加」専用の別パネルを別途開く2段階のフローだったが、それをやめ、
      // カルテを書くフォームそのものの中に、各項目の並び替え・削除ボタンと「＋項目を追加」
      // ボタンを直接埋め込む（下のrenderKarteFieldRow/renderAddFormHtml/
      // bindKarteFieldControlsが実体）。項目定義自体は店舗全体で共有（1顧客専用ではない）。
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
        const res = await fetch('/api/provider/karte-fields', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        karteFields = res.ok ? await res.json() : [];
      }

      // ── 来店記録の追加フォーム（カスタム項目をtype別にレンダリング）──
      function renderFieldInputHtml(f) {
        if (f.field_type === 'select') {
          const opts = (f.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><select data-kv="${f.id}"><option value="">（未入力）</option>${opts}</select></div>`;
        }
        if (f.field_type === 'multiselect') {
          const opts = (f.options || []).map(o => `<label class="checkbox-item"><input type="checkbox" data-kv-multiselect="${f.id}" value="${esc(o)}" /> ${esc(o)}</label>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><div>${opts}</div></div>`;
        }
        if (f.field_type === 'stars') {
          const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="karte-star" data-star="${n}" style="font-size:22px;background:none;border:none;cursor:pointer;color:#d1d5db;padding:2px;">★</button>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><div data-kv-stars="${f.id}" data-kv-value="0">${stars}</div></div>`;
        }
        if (f.field_type === 'rating10') {
          const stars = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<button type="button" class="karte-star" data-star="${n}" style="font-size:16px;background:none;border:none;cursor:pointer;color:#d1d5db;padding:1px;">★</button>`).join('');
          return `<div class="form-field"><label>${esc(f.label)}</label><div data-kv-stars="${f.id}" data-kv-value="0">${stars}</div></div>`;
        }
        if (f.field_type === 'number') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="number" data-kv="${f.id}" /></div>`;
        }
        if (f.field_type === 'date') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="date" data-kv="${f.id}" /></div>`;
        }
        if (f.field_type === 'time') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="time" data-kv="${f.id}" /></div>`;
        }
        if (f.field_type === 'url') {
          return `<div class="form-field"><label>${esc(f.label)}</label><input type="url" data-kv="${f.id}" placeholder="https://" /></div>`;
        }
        if (f.field_type === 'checkbox') {
          return `<label class="checkbox-item"><input type="checkbox" data-kv-checkbox="${f.id}" /> ${esc(f.label)}</label>`;
        }
        return `<div class="form-field"><label>${esc(f.label)}</label><input type="text" data-kv="${f.id}" /></div>`;
      }

      // 各項目の入力欄に、並び替え・削除の小さなコントロールを添えて1行にする。
      function renderKarteFieldRow(f, idx, total) {
        const widget = renderFieldInputHtml(f);
        return `
          <div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:6px" data-kf-block="${f.id}">
            <div style="flex:1;min-width:0">${widget}</div>
            <div style="display:flex;gap:2px;flex-shrink:0;padding-top:4px">
              <button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px" data-kf-block-up="${f.id}"${idx === 0 ? ' disabled' : ''}>↑</button>
              <button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px" data-kf-block-down="${f.id}"${idx === total - 1 ? ' disabled' : ''}>↓</button>
              <button type="button" class="btn btn-ghost" style="font-size:10px;padding:3px 6px;color:#ef4444" data-kf-block-del="${f.id}">×</button>
            </div>
          </div>`;
      }

      const KF_TYPE_OPTIONS_HTML = `
        <option value="text">自由記述</option>
        <option value="select">選択肢（単一選択）</option>
        <option value="multiselect">選択肢（複数選択）</option>
        <option value="stars">5段階評価</option>
        <option value="rating10">10段階評価</option>
        <option value="number">数値</option>
        <option value="date">日付</option>
        <option value="time">時刻</option>
        <option value="url">リンク（URL）</option>
        <option value="checkbox">チェックボックス</option>
      `;

      function renderAddFormHtml(uid) {
        const fieldsHtml = karteFields.map((f, i) => renderKarteFieldRow(f, i, karteFields.length)).join('');
        const menuOptions = providerMenus.map(m => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
        const menuHtml = providerMenus.length
          ? `<div class="form-field"><label>利用メニュー</label><select data-karte-entry-menu="${uid}"><option value="">（選択しない）</option>${menuOptions}</select></div>`
          : '';
        return `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#fafafa;">
            ${menuHtml}
            <div data-kf-fields-wrap>${fieldsHtml || '<p class="muted" style="font-size:12px;margin:0 0 8px;">まだカルテ項目がありません。下の「＋ 項目を追加」から作成できます。</p>'}</div>
            <div style="margin:4px 0 12px">
              <button type="button" class="btn btn-ghost" style="font-size:12px;padding:5px 10px" data-kf-inline-add-toggle>＋ 項目を追加</button>
              <div data-kf-inline-add-form style="display:none;margin-top:8px;padding:10px;background:#f3f4f6;border-radius:8px">
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end">
                  <div class="form-field" style="margin-bottom:0;min-width:120px"><label style="font-size:11px">項目名</label><input type="text" data-kf-inline-label placeholder="例：癖・注意点" style="font-size:12.5px" /></div>
                  <div class="form-field" style="margin-bottom:0;min-width:120px"><label style="font-size:11px">種類</label><select data-kf-inline-type style="font-size:12.5px">${KF_TYPE_OPTIONS_HTML}</select></div>
                  <div class="form-field" data-kf-inline-options-wrap style="margin-bottom:0;min-width:150px;display:none"><label style="font-size:11px">選択肢（カンマ区切り）</label><input type="text" data-kf-inline-options placeholder="例：右巻き,左巻き,直毛" style="font-size:12.5px" /></div>
                  <button type="button" class="btn" style="font-size:12px;padding:6px 12px" data-kf-inline-save>追加してこの記録にも使う</button>
                </div>
              </div>
            </div>
            <div class="form-field"><label>メモ</label><textarea data-karte-entry-note="${uid}" style="min-height:70px;"></textarea></div>
            <button type="button" class="btn" style="font-size:12px;padding:6px 12px;" data-karte-entry-save="${uid}">記録を保存する</button>
          </div>`;
      }

      // renderAddFormHtmlで作ったフォームの、項目の並び替え・削除・新規追加の操作を配線する。
      // 操作のたびに項目セットが変わるため、フォーム全体を作り直して呼び出し側に渡された
      // rebuild関数で再構築する（入力途中の値は失われるが、項目管理自体が頻繁な操作では
      // ないため許容する）。
      function bindKarteFieldControls(container, rebuild) {
        container.querySelectorAll('[data-kf-block-up]').forEach(btn => btn.addEventListener('click', async () => { await swapFieldOrder(btn.dataset.kfBlockUp, -1); rebuild(); }));
        container.querySelectorAll('[data-kf-block-down]').forEach(btn => btn.addEventListener('click', async () => { await swapFieldOrder(btn.dataset.kfBlockDown, 1); rebuild(); }));
        container.querySelectorAll('[data-kf-block-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この項目を削除しますか？（過去の記録に入力済みの値は残ります）')) return;
          await fetch(`/api/provider/karte-fields/${btn.dataset.kfBlockDel}`, { method: 'DELETE', headers: authHeaders() });
          await loadFields();
          rebuild();
        }));
        const addToggleBtn = container.querySelector('[data-kf-inline-add-toggle]');
        const addFormEl = container.querySelector('[data-kf-inline-add-form]');
        addToggleBtn?.addEventListener('click', () => {
          if (!addFormEl) return;
          addFormEl.style.display = addFormEl.style.display === 'none' ? 'block' : 'none';
        });
        const typeSel = container.querySelector('[data-kf-inline-type]');
        const optionsWrap = container.querySelector('[data-kf-inline-options-wrap]');
        typeSel?.addEventListener('change', () => {
          if (optionsWrap) optionsWrap.style.display = (typeSel.value === 'select' || typeSel.value === 'multiselect') ? '' : 'none';
        });
        container.querySelector('[data-kf-inline-save]')?.addEventListener('click', async (e) => {
          const saveBtn = e.currentTarget;
          const label = container.querySelector('[data-kf-inline-label]')?.value.trim();
          const field_type = typeSel?.value;
          if (!label) { showToast('項目名を入力してください'); return; }
          let options;
          if (field_type === 'select' || field_type === 'multiselect') {
            options = (container.querySelector('[data-kf-inline-options]')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
            if (!options.length) { showToast('選択肢を入力してください'); return; }
          }
          saveBtn.disabled = true;
          try {
            const res = await fetch('/api/provider/karte-fields', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ label, field_type, options }) });
            if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error || '追加に失敗しました'); return; }
            await loadFields();
            rebuild();
            showToast('項目を追加しました。すぐ下に入力欄が出ています');
          } finally {
            saveBtn.disabled = false;
          }
        });
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
        const multiselectGroups = {};
        container.querySelectorAll('[data-kv-multiselect]').forEach(el => {
          if (!el.checked) return;
          (multiselectGroups[el.dataset.kvMultiselect] = multiselectGroups[el.dataset.kvMultiselect] || []).push(el.value);
        });
        Object.entries(multiselectGroups).forEach(([fid, vals]) => { values[fid] = vals; });
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
          if (typeMap[fid] === 'multiselect' && Array.isArray(val)) return val.map(esc).join('・');
          if (typeMap[fid] === 'url' && val) return `<a href="${esc(val)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb">${esc(val)}</a>`;
          if ((typeMap[fid] === 'stars' || typeMap[fid] === 'rating10') && val) return '★'.repeat(Number(val));
          return esc(val);
        }
        return entries.map((e, i) => {
          const custom = Object.entries(e.custom_values || {})
            .filter(([fid, val]) => !(typeMap[fid] === 'checkbox' && !val) && !(Array.isArray(val) && !val.length))
            .map(([fid, val]) => `${esc(labelMap[fid] || fid)}: ${fmtCustomValue(fid, val)}`).join(' / ');
          const prev = entries[i + 1];
          const intervalLabel = prev
            ? `・前回から${Math.round((new Date(e.created_at) - new Date(prev.created_at)) / 86400000)}日`
            : '・初回の記録';
          return `
            <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:12.5px;">
              <div style="color:#9ca3af;font-size:11px;margin-bottom:2px;">${fmtDateTime(e.created_at)} <span class="muted">${intervalLabel}</span></div>
              ${e.menu_name ? `<div style="font-size:11.5px;color:#2563eb;">${esc(e.menu_name)}</div>` : ''}
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
      // （でお要望2026-09-14：hacomonoのメンバータイプ別一斉配信相当機能）。引数を渡すと
      // 顧客管理タブの絞り込みUIとは独立に判定できる（でお報告2026-09-18：「メールの
      // ページ、対象者の絞り込み方が無い」。一斉メール配信タブ自身に絞り込みUIを追加した）。
      // 会員番号（店舗内連番）。表示は0埋め4桁、検索は「12」「0012」「No.12」「#12」のどれでも当たる。
      function fmtNo(n) { return n == null ? '' : 'No.' + String(n); }
      function matchesCustomer(kw, name, no) {
        if (!kw) return true;
        if ((name || '').toLowerCase().includes(kw)) return true;
        if (no == null) return false;
        const digits = kw.replace(/^(no\.?|#|会員番号)\s*/i, '').replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
        return /^\d+$/.test(digits) && String(no).includes(digits.replace(/^0+(?=\d)/, ''));
      }

      function currentFilteredMemberRows(filterOverride, kwOverride) {
        const filter = filterOverride !== undefined ? filterOverride : (filterSel?.value || 'all');
        const kw = kwOverride !== undefined ? kwOverride : (searchInput?.value || '').trim().toLowerCase();
        return allItems.filter(c => {
          if (kw && !matchesCustomer(kw, c.customer_name, c.member_number)) return false;
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
          ? manualItems.filter(m => !m.linked_user_id && matchesCustomer(kw, m.display_name, m.member_number))
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
            <span class="cust-row-name">${c.member_number != null ? `<span style="font-size:11px;font-weight:600;color:#9a8f85;margin-right:6px;">${fmtNo(c.member_number)}</span>` : ''}${esc(isManual ? c.display_name : c.customer_name)}${!isManual && c.hasStoreNote ? ' ' : ''}</span>
            <span class="cust-row-date">${isManual ? '—' : fmtDate(c.last_visit)}</span>
            <span class="cust-row-date">${isManual ? '—' : `${fmtDate(c.next_visit)}${isOverdue(c) ? ' ' : ''}`}</span>
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
      const bcFilterSel = document.getElementById('bc-filter');
      const bcSearchInput = document.getElementById('bc-search');
      function bcCurrentFilterKw() {
        return [bcFilterSel?.value || 'all', (bcSearchInput?.value || '').trim().toLowerCase()];
      }
      function updateBroadcastCount() {
        if (!bcCountEl) return;
        const [filter, kw] = bcCurrentFilterKw();
        const n = currentFilteredMemberRows(filter, kw).length;
        bcCountEl.textContent = `今の絞り込み条件：${n}名に送信されます`;
      }
      bcFilterSel?.addEventListener('change', updateBroadcastCount);
      bcSearchInput?.addEventListener('input', updateBroadcastCount);
      bcSendBtn?.addEventListener('click', async () => {
        const subject = bcSubjectEl?.value.trim();
        const body_text = bcBodyEl?.value.trim();
        const [filter, kw] = bcCurrentFilterKw();
        const userIds = currentFilteredMemberRows(filter, kw).map(c => c.user_id).filter(Boolean);
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
      const custModalLinkSearch = document.getElementById('cust-modal-link-search');
      const custModalLinkResults = document.getElementById('cust-modal-link-results');
      const custModalManualDeleteBtn = document.getElementById('cust-modal-manual-delete-btn');
      const custModalManualMemoTa = document.getElementById('cust-modal-manual-memo-textarea');
      const custModalManualSaveBtn = document.getElementById('cust-modal-manual-save-btn');
      const custModalManualAddToggle = document.getElementById('cust-modal-manual-add-toggle');
      const custModalManualAddForm = document.getElementById('cust-modal-manual-add-form');
      const custModalManualHistoryToggle = document.getElementById('cust-modal-manual-history-toggle');
      const custModalManualHistoryEl = document.getElementById('cust-modal-manual-history');
      // AI姿勢分析（でお要望2026-09-25）。
      // でお報告2026-09-27「機能設定でAI姿勢分析をオンにしたのにメニューの中に出てきてない」：
      // 以前はprovider.enabled_features（localStorageキャッシュから読んだ、ページ読み込み時点の
      // 1回きりのスナップショット）を見ていたため、機能設定タブでトグルしてもリロードするまで
      // 反映されなかった。機能設定タブのトグルはwindow.__providerFeaturesをその場で更新する
      // 仕組み（applyFeatureGating、4717行目付近）が既にあるので、そちらを毎回モーダルを
      // 開くたびに読み直す形に変更し、リロード不要でその場反映されるようにする。
      // でお要望2026-09-25「10000円のプランに入ってる人しか使えないように（特例無料は除く）」：
      // プランで使えない場合は非表示にせず、あえてアップセル文言を出す（このAI姿勢分析は
      // 10000円プランへ誘導するための差別化材料という位置づけのため、存在自体を隠すと
      // 誘導にならない）。実際の書き込みはAPI側（posture-entries route.js）でも同じ判定で
      // 二重に弾く。
      const custModalPostureSection = document.getElementById('cust-modal-posture-section');
      const custModalPostureControls = document.getElementById('cust-modal-posture-controls');
      const custModalPostureUpsell = document.getElementById('cust-modal-posture-upsell');
      const custModalPostureAddToggle = document.getElementById('cust-modal-posture-add-toggle');
      const custModalPostureAddForm = document.getElementById('cust-modal-posture-add-form');
      const custModalPostureHistoryToggle = document.getElementById('cust-modal-posture-history-toggle');
      const custModalPostureHistoryEl = document.getElementById('cust-modal-posture-history');
      const custModalManualPostureSection = document.getElementById('cust-modal-manual-posture-section');
      const custModalManualPostureControls = document.getElementById('cust-modal-manual-posture-controls');
      const custModalManualPostureUpsell = document.getElementById('cust-modal-manual-posture-upsell');
      const custModalManualPostureAddToggle = document.getElementById('cust-modal-manual-posture-add-toggle');
      const custModalManualPostureAddForm = document.getElementById('cust-modal-manual-posture-add-form');
      const custModalManualPostureHistoryToggle = document.getElementById('cust-modal-manual-posture-history-toggle');
      const custModalManualPostureHistoryEl = document.getElementById('cust-modal-manual-posture-history');

      // AI健診アドバイス（でお要望2026-09-27・今野くん発案）。姿勢分析と全く同じ
      // ゲーティング方式（機能フラグ＋10000円プラン限定）を使い回す。
      const custModalHealthSection = document.getElementById('cust-modal-health-section');
      const custModalHealthControls = document.getElementById('cust-modal-health-controls');
      const custModalHealthUpsell = document.getElementById('cust-modal-health-upsell');
      const custModalHealthAddToggle = document.getElementById('cust-modal-health-add-toggle');
      const custModalHealthAddForm = document.getElementById('cust-modal-health-add-form');
      const custModalHealthHistoryToggle = document.getElementById('cust-modal-health-history-toggle');
      const custModalHealthHistoryEl = document.getElementById('cust-modal-health-history');
      const custModalManualHealthSection = document.getElementById('cust-modal-manual-health-section');
      const custModalManualHealthControls = document.getElementById('cust-modal-manual-health-controls');
      const custModalManualHealthUpsell = document.getElementById('cust-modal-manual-health-upsell');
      const custModalManualHealthAddToggle = document.getElementById('cust-modal-manual-health-add-toggle');
      const custModalManualHealthAddForm = document.getElementById('cust-modal-manual-health-add-form');
      const custModalManualHealthHistoryToggle = document.getElementById('cust-modal-manual-health-history-toggle');
      const custModalManualHealthHistoryEl = document.getElementById('cust-modal-manual-health-history');

      // window.__providerFeaturesは機能設定タブが開かれて初めて populate されるため、
      // 未取得の間はキャッシュ済みprovider.enabled_featuresへフォールバックする。
      // 本番実データでは特例無料の実際のplan値は'special'（'free'というキーは実在しない。
      // lib/posture-analysis.jsのPOSTURE_ELIGIBLE_PLANSと必ず一致させること）。
      function applyPremiumFeatureGating(featureKey, pairs) {
        const liveFeatures = window.__providerFeatures;
        const on = liveFeatures ? !!liveFeatures[featureKey] : !!provider?.enabled_features?.[featureKey];
        const planEligible = provider?.plan === 'C' || provider?.plan === 'special';
        pairs.forEach(([section, controls, upsell]) => {
          if (!section) return;
          section.style.display = on ? '' : 'none';
          if (controls) controls.style.display = planEligible ? '' : 'none';
          if (upsell) upsell.style.display = planEligible ? 'none' : '';
        });
      }
      function applyPostureGating() {
        applyPremiumFeatureGating('posture_analysis', [
          [custModalPostureSection, custModalPostureControls, custModalPostureUpsell],
          [custModalManualPostureSection, custModalManualPostureControls, custModalManualPostureUpsell],
        ]);
        applyPremiumFeatureGating('health_advice_analysis', [
          [custModalHealthSection, custModalHealthControls, custModalHealthUpsell],
          [custModalManualHealthSection, custModalManualHealthControls, custModalManualHealthUpsell],
        ]);
      }
      applyPostureGating();
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
        resetContracts();
        applyPostureGating();
        custModalMemberSection.style.display = '';
        custModalManualSection.style.display = 'none';

        if (c) {
          const def = ALL_AXES[c.axis];
          const axisLabel = def ? `${def.icon} ${esc(def.label)}` : esc(c.axis);
          custModalNameEl.textContent = c.customer_name;
          custModalBadgesEl.innerHTML = `
            ${c.member_number != null ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#374151;border-radius:99px;">会員番号 ${c.member_number}</span>` : ''}
            <span style="font-size:11px;font-weight:700;padding:2px 8px;background:#eff6ff;color:#2563eb;border-radius:99px;">${axisLabel}</span>
            ${statusBadge(c.status)}
            ${overdueBadge('ユーザー想定', c.userOverdueDays)}
            ${overdueBadge('店舗推奨', c.storeOverdueDays)}
            ${c.meScanType?.fullName ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#faf5ff;color:#9333ea;border-radius:99px;" title="Me Scanタイプ">${esc(c.meScanType.fullName)}</span>` : c.meScanDone ? '<span style="font-size:11px;padding:2px 8px;background:#faf5ff;color:#9333ea;border-radius:99px;">Me Scan済</span>' : ''}
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
        if (custModalPostureAddForm) { custModalPostureAddForm.style.display = 'none'; custModalPostureAddForm.innerHTML = ''; custModalPostureAddForm.dataset.built = ''; }
        if (custModalPostureHistoryEl) { custModalPostureHistoryEl.style.display = 'none'; custModalPostureHistoryEl.innerHTML = ''; custModalPostureHistoryEl.dataset.built = ''; }
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

        // 契約中のロッカーがあればバッジで表示（でお質問2026-09-18：「ロッカーを契約したら
        // 顧客情報に紐づいて表示されるようになってる？」）。
        const lockerRes = await fetch(`/api/provider/customers/${uid}/locker`, { headers: authHeaders() });
        if (lockerRes.ok) {
          const lockerData = await lockerRes.json();
          if (lockerData && custModalBadgesEl) {
            custModalBadgesEl.insertAdjacentHTML('beforeend', `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#ecfdf5;color:#059669;border-radius:99px;">ロッカー契約中：${esc(lockerData.locker_name || '')}${lockerData.monthly_fee ? `（月額¥${Number(lockerData.monthly_fee).toLocaleString()}）` : ''}</span>`);
          }
        }
      }

      async function openManualModal(id) {
        let m = manualItems.find(x => x.id === id);
        if (!m) { await loadManualCustomers(); m = manualItems.find(x => x.id === id); }
        if (!m || !custModalEl) { showToast('顧客情報が見つかりませんでした'); return; }
        currentCustUid = id;
        currentCustType = 'manual';
        resetContracts();
        applyPostureGating();
        custModalMemberSection.style.display = 'none';
        custModalManualSection.style.display = '';
        custModalNameEl.textContent = m.display_name;
        custModalBadgesEl.innerHTML = (m.member_number != null ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#f3f4f6;color:#374151;border-radius:99px;">会員番号 ${m.member_number}</span> ` : '') + '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:99px;">非会員</span>';
        custModalInfoEl.textContent = 'Finemeに登録していないお客様のカルテです。会員だと分かった場合は下の「会員と紐付ける」で紐付けると、記録が引き継がれます。';
        custModalManualMemoTa.value = m.memo || '';
        custModalLinkSearch.value = '';
        renderLinkResults();
        custModalManualAddForm.style.display = 'none'; custModalManualAddForm.innerHTML = ''; custModalManualAddForm.dataset.built = '';
        custModalManualHistoryEl.style.display = 'none'; custModalManualHistoryEl.innerHTML = ''; custModalManualHistoryEl.dataset.built = '';
        if (custModalManualPostureAddForm) { custModalManualPostureAddForm.style.display = 'none'; custModalManualPostureAddForm.innerHTML = ''; custModalManualPostureAddForm.dataset.built = ''; }
        if (custModalManualPostureHistoryEl) { custModalManualPostureHistoryEl.style.display = 'none'; custModalManualPostureHistoryEl.innerHTML = ''; custModalManualPostureHistoryEl.dataset.built = ''; }
        custModalEl.style.display = 'flex';
      }

      // 会員の紐付け候補。全会員を並べず、名前または会員番号を入力した分だけ絞って出す。
      function renderLinkResults() {
        if (!custModalLinkResults) return;
        const kw = (custModalLinkSearch?.value || '').trim().toLowerCase();
        if (!kw) { custModalLinkResults.innerHTML = '<p class="muted" style="font-size:12px;margin:0;">名前または会員番号を入力すると、該当する会員が表示されます。</p>'; return; }
        const members = [...new Map(allItems.map(c => [c.user_id, c])).values()].filter(c => matchesCustomer(kw, c.customer_name, c.member_number));
        if (!members.length) { custModalLinkResults.innerHTML = '<p class="muted" style="font-size:12px;margin:0;">該当する会員はいません。</p>'; return; }
        const shown = members.slice(0, 8);
        custModalLinkResults.innerHTML = shown.map(c => `
          <button type="button" data-link-uid="${esc(c.user_id)}" style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#1a1410;font-size:13px;margin-bottom:6px;cursor:pointer;">
            <span style="font-size:11px;color:#9a8f85;min-width:56px;">${c.member_number != null ? fmtNo(c.member_number) : ''}</span>
            <span style="flex:1;font-weight:700;">${esc(c.customer_name)}</span>
            <span style="font-size:11px;color:#2563eb;font-weight:700;">紐付ける</span>
          </button>`).join('') + (members.length > shown.length ? `<p class="muted" style="font-size:12px;margin:0;">他${members.length - shown.length}名。さらに絞り込んでください。</p>` : '');
        custModalLinkResults.querySelectorAll('[data-link-uid]').forEach(btn => {
          btn.addEventListener('click', () => linkManualToMember(btn.dataset.linkUid, members.find(c => c.user_id === btn.dataset.linkUid)?.customer_name));
        });
      }
      custModalLinkSearch?.addEventListener('input', renderLinkResults);

      async function linkManualToMember(userId, name) {
        if (!currentCustUid || currentCustType !== 'manual' || !userId) return;
        if (!confirm(`「${name || 'この会員'}」と紐付けます。よろしいですか？（後から取り消せません）`)) return;
        const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/link`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ user_id: userId }) });
        if (res.ok) {
          showToast('紐付けました。以降このお客様のカルテに記録が引き継がれます');
          custModalEl.style.display = 'none';
          await loadManualCustomers();
          await loadAll();
        } else {
          const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明'));
        }
      }

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

      // 契約書（店舗とお客様が交わした契約書のアップロード・保管）
      const custModalContractsToggle = document.getElementById('cust-modal-contracts-toggle');
      const custModalContractsEl = document.getElementById('cust-modal-contracts');
      const CONTRACT_KINDS = { package: '回数券', membership: '会員プラン', other: 'その他' };
      const contractHeaders = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
      const contractQuery = () => (currentCustType === 'manual' ? `manual_customer_id=${encodeURIComponent(currentCustUid)}` : `user_id=${encodeURIComponent(currentCustUid)}`);
      function resetContracts() {
        if (!custModalContractsEl) return;
        custModalContractsEl.style.display = 'none';
        custModalContractsEl.dataset.built = '';
        custModalContractsEl.innerHTML = '';
      }
      async function renderContracts() {
        const isManual = currentCustType === 'manual';
        custModalContractsEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
        let docs = [];
        try {
          const res = await fetch(`/api/provider/contract-documents?${contractQuery()}`, { headers: contractHeaders() });
          docs = res.ok ? await res.json() : [];
        } catch { /* 一覧が空のまま表示される */ }
        const rows = docs.length ? docs.map(d => `
          <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:12px;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:13px;">${esc(d.title)}</span>
              <span style="padding:1px 8px;border-radius:99px;background:#f3f4f6;color:#374151;">${esc(CONTRACT_KINDS[d.contract_kind] || 'その他')}</span>
              ${d.customer_acknowledged_at ? `<span style="padding:1px 8px;border-radius:99px;background:#ecfdf5;color:#059669;">お客様確認済み（${esc(d.customer_acknowledged_at.slice(0, 10))}）</span>` : (d.visible_to_customer ? '<span style="padding:1px 8px;border-radius:99px;background:#fffbeb;color:#b45309;">お客様未確認</span>' : '<span style="padding:1px 8px;border-radius:99px;background:#f3f4f6;color:#6b7280;">お客様には非表示</span>')}
            </div>
            <div class="muted" style="margin-top:2px;">${d.contract_date ? `契約日 ${esc(d.contract_date)} ・ ` : ''}${esc(d.file_name)}${d.note ? ` ・ ${esc(d.note)}` : ''}</div>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-ghost" data-contract-open="${esc(d.id)}" style="font-size:12px;padding:4px 10px;">開く</button>
              ${!isManual ? `<button type="button" class="btn btn-ghost" data-contract-vis="${esc(d.id)}" data-vis="${d.visible_to_customer ? '1' : '0'}" style="font-size:12px;padding:4px 10px;">${d.visible_to_customer ? 'お客様に見せない' : 'お客様に見せる'}</button>` : ''}
              <button type="button" class="btn btn-ghost" data-contract-del="${esc(d.id)}" style="font-size:12px;padding:4px 10px;color:#ef4444;">削除</button>
            </div>
          </div>`).join('') : '<p class="muted" style="font-size:12px;margin:0 0 8px;">保管している契約書はまだありません。</p>';
        custModalContractsEl.innerHTML = `
          ${rows}
          <div style="margin-top:12px;padding:12px;border:1px dashed #d1d5db;border-radius:10px;">
            <p style="font-size:12px;font-weight:700;margin:0 0 8px;">契約書をアップロード</p>
            <p class="muted" style="font-size:11px;margin:0 0 8px;line-height:1.6;">お客様と交わした契約書（署名済みの紙をスキャン・撮影したものや、PDF）を保管できます。電子署名ではなく、契約を交わした記録として使います。</p>
            <input type="text" id="cust-contract-title" maxlength="80" placeholder="契約書の名前（例：パーソナル10回券 契約書）" style="width:100%;box-sizing:border-box;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              <select id="cust-contract-kind" style="font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;">
                <option value="package">回数券</option><option value="membership">会員プラン</option><option value="other">その他</option>
              </select>
              <input type="date" id="cust-contract-date" style="font-size:13px;padding:7px;border:1px solid #e5e7eb;border-radius:8px;">
            </div>
            <input type="text" id="cust-contract-note" maxlength="200" placeholder="メモ（任意）" style="width:100%;box-sizing:border-box;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;">
            <input type="file" id="cust-contract-file" accept="application/pdf,image/jpeg,image/png,image/webp" style="font-size:12px;margin-bottom:6px;">
            ${isManual ? '<p class="muted" style="font-size:11px;margin:0 0 6px;">会員と紐付けていないお客様のため、お客様側には表示されません。紐付けた後に「お客様に見せる」にできます。</p>' : '<label style="display:flex;gap:6px;align-items:center;font-size:12px;margin-bottom:6px;"><input type="checkbox" id="cust-contract-visible" checked> お客様のマイページにも表示する</label>'}
            <button type="button" class="btn" id="cust-contract-upload" style="font-size:12px;padding:6px 14px;">アップロード</button>
          </div>`;
        custModalContractsEl.querySelectorAll('[data-contract-open]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/contract-documents/${btn.dataset.contractOpen}`, { headers: contractHeaders() });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.url) window.open(d.url, '_blank', 'noopener'); else showToast('開けませんでした：' + (d.error || '不明なエラー'));
        }));
        custModalContractsEl.querySelectorAll('[data-contract-vis]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch(`/api/provider/contract-documents/${btn.dataset.contractVis}`, {
            method: 'PATCH', headers: { ...contractHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ visible_to_customer: btn.dataset.vis !== '1' }),
          });
          if (res.ok) renderContracts(); else { const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明')); }
        }));
        custModalContractsEl.querySelectorAll('[data-contract-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('この契約書を削除しますか？（ファイルも削除され、元に戻せません）')) return;
          const res = await fetch(`/api/provider/contract-documents/${btn.dataset.contractDel}`, { method: 'DELETE', headers: contractHeaders() });
          if (res.ok) { showToast('削除しました'); renderContracts(); } else { const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明')); }
        }));
        document.getElementById('cust-contract-upload')?.addEventListener('click', async () => {
          const title = document.getElementById('cust-contract-title').value.trim();
          const file = document.getElementById('cust-contract-file').files?.[0];
          if (!title) { showToast('契約書の名前を入力してください'); return; }
          if (!file) { showToast('ファイルを選んでください'); return; }
          const fd = new FormData();
          fd.append('file', file);
          fd.append('title', title);
          fd.append('contract_kind', document.getElementById('cust-contract-kind').value);
          fd.append('contract_date', document.getElementById('cust-contract-date').value);
          fd.append('note', document.getElementById('cust-contract-note').value);
          fd.append(isManual ? 'manual_customer_id' : 'user_id', currentCustUid);
          if (!isManual) fd.append('visible_to_customer', document.getElementById('cust-contract-visible').checked ? 'true' : 'false');
          const btn = document.getElementById('cust-contract-upload');
          btn.disabled = true;
          const res = await fetch('/api/provider/contract-documents', { method: 'POST', headers: contractHeaders(), body: fd });
          if (res.ok) { showToast('契約書を保管しました'); renderContracts(); }
          else { const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明')); btn.disabled = false; }
        });
      }
      custModalContractsToggle?.addEventListener('click', async () => {
        if (!currentCustUid) return;
        const opening = custModalContractsEl.style.display === 'none';
        custModalContractsEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalContractsEl.dataset.built) {
          custModalContractsEl.dataset.built = '1';
          await renderContracts();
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

      // ── AI姿勢分析（でお要望2026-09-25。今野くんとのLINE「AI姿勢」より）─────────
      // 来店時にスタッフが撮影した写真をClaude Visionで分析し、スコア・気になる癖・
      // 凝っていそうな筋肉部位を記録する。posture_analysis機能フラグでON/OFF。
      // 会員/非会員どちらもカルテと同じ二択エンドポイントで扱う。
      function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      function renderPostureHistoryHtml(entries) {
        if (!entries.length) return '<p class="muted" style="font-size:12px;">まだ記録がありません。</p>';
        return entries.map(e => `
          <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <img src="${esc(e.photo_url)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f3f4f6;" />
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                <span class="muted" style="font-size:11px;">${fmtDate(e.created_at)}</span>
                ${Number.isFinite(e.score) ? `<span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:99px;background:#eff6ff;color:#2563eb;">スコア ${e.score}</span>` : ''}
              </div>
              ${(e.findings || []).length ? `<ul style="margin:0 0 4px;padding-left:16px;font-size:12.5px;color:#374151;">${e.findings.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
              ${e.note ? `<p style="margin:0;font-size:12px;color:#6b7280;">${esc(e.note)}</p>` : ''}
            </div>
          </div>
        `).join('');
      }

      function buildPostureAddForm(container, endpointBase, onSaved) {
        container.innerHTML = `
          <input type="file" accept="image/*" capture="environment" id="posture-photo-input" style="display:block;margin-bottom:8px;font-size:12.5px;" />
          <textarea id="posture-note-input" placeholder="メモ（任意）" style="width:100%;min-height:50px;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;box-sizing:border-box;margin-bottom:8px;"></textarea>
          <button type="button" class="btn" style="font-size:12px;padding:6px 14px;" id="posture-save-btn">写真を分析して記録</button>
          <p class="muted" id="posture-save-msg" style="font-size:11px;margin:6px 0 0;"></p>
        `;
        container.dataset.built = '1';
        const saveBtn = container.querySelector('#posture-save-btn');
        const msgEl = container.querySelector('#posture-save-msg');
        saveBtn?.addEventListener('click', async () => {
          const fileInput = container.querySelector('#posture-photo-input');
          const noteEl = container.querySelector('#posture-note-input');
          const file = fileInput?.files?.[0];
          if (!file) { showToast('写真を選択してください'); return; }
          saveBtn.disabled = true;
          msgEl.textContent = '圧縮中…';
          try {
            const compressed = await compressImage(file);
            msgEl.textContent = 'AIが分析中…（数秒かかります）';
            const photo_base64 = await blobToBase64(compressed);
            const res = await fetch(endpointBase, {
              method: 'POST', headers: authHeaders(),
              body: JSON.stringify({ photo_base64, media_type: 'image/jpeg', note: noteEl?.value || '' }),
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); msgEl.textContent = ''; showToast(d.error || '分析に失敗しました'); return; }
            showToast('姿勢分析を記録しました');
            container.style.display = 'none';
            container.dataset.built = '';
            if (onSaved) onSaved();
          } catch {
            msgEl.textContent = '';
            showToast('通信エラーが発生しました');
          } finally {
            saveBtn.disabled = false;
          }
        });
      }

      custModalPostureAddToggle?.addEventListener('click', () => {
        if (!currentCustUid || !custModalPostureAddForm) return;
        const opening = custModalPostureAddForm.style.display === 'none';
        custModalPostureAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalPostureAddForm.dataset.built) {
          buildPostureAddForm(custModalPostureAddForm, `/api/provider/customers/${currentCustUid}/posture-entries`, () => {
            if (custModalPostureHistoryEl) custModalPostureHistoryEl.dataset.built = '';
          });
        }
      });

      custModalPostureHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid || !custModalPostureHistoryEl) return;
        const opening = custModalPostureHistoryEl.style.display === 'none';
        custModalPostureHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalPostureHistoryEl.dataset.built) {
          custModalPostureHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalPostureHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/${currentCustUid}/posture-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalPostureHistoryEl.innerHTML = renderPostureHistoryHtml(entries);
          } catch {
            custModalPostureHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
          }
        }
      });

      custModalManualPostureAddToggle?.addEventListener('click', () => {
        if (!currentCustUid || currentCustType !== 'manual' || !custModalManualPostureAddForm) return;
        const opening = custModalManualPostureAddForm.style.display === 'none';
        custModalManualPostureAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualPostureAddForm.dataset.built) {
          buildPostureAddForm(custModalManualPostureAddForm, `/api/provider/customers/manual/${currentCustUid}/posture-entries`, () => {
            if (custModalManualPostureHistoryEl) custModalManualPostureHistoryEl.dataset.built = '';
          });
        }
      });

      custModalManualPostureHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid || currentCustType !== 'manual' || !custModalManualPostureHistoryEl) return;
        const opening = custModalManualPostureHistoryEl.style.display === 'none';
        custModalManualPostureHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualPostureHistoryEl.dataset.built) {
          custModalManualPostureHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalManualPostureHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/posture-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalManualPostureHistoryEl.innerHTML = renderPostureHistoryHtml(entries);
          } catch {
            custModalManualPostureHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
          }
        }
      });

      // ── AI健診アドバイス（でお要望2026-09-27・今野くん発案）───────────────
      // v1は人間ドックのみ（lib/health-advice-categories.jsのHEALTH_ADVICE_CATEGORIESに
      // 合わせてある。将来カテゴリが増えたらこのHTMLも合わせて増やす）。
      const HEALTH_ADVICE_AXES = [
        ['diet', '食事'], ['exercise', '運動'], ['lifestyle', '生活習慣'], ['overall', '全般'],
      ];
      function renderHealthHistoryHtml(entries) {
        if (!entries.length) return '<p class="muted" style="font-size:12px;">まだ記録がありません。</p>';
        return entries.map(e => `
          <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <img src="${esc(e.photo_url)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f3f4f6;" />
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                <span class="muted" style="font-size:11px;">${fmtDate(e.created_at)}</span>
                ${e.advice_axis ? `<span style="font-size:11px;font-weight:700;padding:1px 8px;border-radius:99px;background:#fef3c7;color:#92400e;">${esc((HEALTH_ADVICE_AXES.find(a => a[0] === e.advice_axis) || [,e.advice_axis])[1])}</span>` : ''}
              </div>
              ${(e.advice || []).length ? `<ul style="margin:0 0 4px;padding-left:16px;font-size:12.5px;color:#374151;">${e.advice.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
              ${e.input_text ? `<p style="margin:0 0 2px;font-size:11.5px;color:#9ca3af;">補足入力：${esc(e.input_text)}</p>` : ''}
              ${e.note ? `<p style="margin:0;font-size:12px;color:#6b7280;">${esc(e.note)}</p>` : ''}
            </div>
          </div>
        `).join('');
      }

      function buildHealthAddForm(container, endpointBase, onSaved) {
        const axisOptions = ['<option value="">アドバイスの軸（任意）</option>'].concat(HEALTH_ADVICE_AXES.map(([id, label]) => `<option value="${id}">${label}</option>`)).join('');
        container.innerHTML = `
          <input type="file" accept="image/*" capture="environment" id="health-photo-input" style="display:block;margin-bottom:8px;font-size:12.5px;" />
          <select id="health-axis-input" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">${axisOptions}</select>
          <textarea id="health-input-text" placeholder="結果表の数値等の補足入力（任意・写真だけでは読み取りにくい場合に）" style="width:100%;min-height:50px;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;box-sizing:border-box;margin-bottom:8px;"></textarea>
          <textarea id="health-note-input" placeholder="メモ（任意）" style="width:100%;min-height:40px;font-size:13px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;box-sizing:border-box;margin-bottom:8px;"></textarea>
          <button type="button" class="btn" style="font-size:12px;padding:6px 14px;" id="health-save-btn">写真を分析して記録</button>
          <p class="muted" id="health-save-msg" style="font-size:11px;margin:6px 0 0;"></p>
        `;
        container.dataset.built = '1';
        const saveBtn = container.querySelector('#health-save-btn');
        const msgEl = container.querySelector('#health-save-msg');
        saveBtn?.addEventListener('click', async () => {
          const fileInput = container.querySelector('#health-photo-input');
          const axisEl = container.querySelector('#health-axis-input');
          const inputTextEl = container.querySelector('#health-input-text');
          const noteEl = container.querySelector('#health-note-input');
          const file = fileInput?.files?.[0];
          if (!file) { showToast('写真を選択してください'); return; }
          saveBtn.disabled = true;
          msgEl.textContent = '圧縮中…';
          try {
            const compressed = await compressImage(file);
            msgEl.textContent = 'AIが分析中…（数秒かかります）';
            const photo_base64 = await blobToBase64(compressed);
            const res = await fetch(endpointBase, {
              method: 'POST', headers: authHeaders(),
              body: JSON.stringify({ photo_base64, media_type: 'image/jpeg', category: 'medical_checkup', advice_axis: axisEl?.value || null, input_text: inputTextEl?.value || '', note: noteEl?.value || '' }),
            });
            if (!res.ok) { const d = await res.json().catch(() => ({})); msgEl.textContent = ''; showToast(d.error || '分析に失敗しました'); return; }
            showToast('健診アドバイスを記録しました');
            container.style.display = 'none';
            container.dataset.built = '';
            if (onSaved) onSaved();
          } catch {
            msgEl.textContent = '';
            showToast('通信エラーが発生しました');
          } finally {
            saveBtn.disabled = false;
          }
        });
      }

      custModalHealthAddToggle?.addEventListener('click', () => {
        if (!currentCustUid || !custModalHealthAddForm) return;
        const opening = custModalHealthAddForm.style.display === 'none';
        custModalHealthAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalHealthAddForm.dataset.built) {
          buildHealthAddForm(custModalHealthAddForm, `/api/provider/customers/${currentCustUid}/health-advice-entries`, () => {
            if (custModalHealthHistoryEl) custModalHealthHistoryEl.dataset.built = '';
          });
        }
      });

      custModalHealthHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid || !custModalHealthHistoryEl) return;
        const opening = custModalHealthHistoryEl.style.display === 'none';
        custModalHealthHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalHealthHistoryEl.dataset.built) {
          custModalHealthHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalHealthHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/${currentCustUid}/health-advice-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalHealthHistoryEl.innerHTML = renderHealthHistoryHtml(entries);
          } catch {
            custModalHealthHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
          }
        }
      });

      custModalManualHealthAddToggle?.addEventListener('click', () => {
        if (!currentCustUid || currentCustType !== 'manual' || !custModalManualHealthAddForm) return;
        const opening = custModalManualHealthAddForm.style.display === 'none';
        custModalManualHealthAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualHealthAddForm.dataset.built) {
          buildHealthAddForm(custModalManualHealthAddForm, `/api/provider/customers/manual/${currentCustUid}/health-advice-entries`, () => {
            if (custModalManualHealthHistoryEl) custModalManualHealthHistoryEl.dataset.built = '';
          });
        }
      });

      custModalManualHealthHistoryToggle?.addEventListener('click', async () => {
        if (!currentCustUid || currentCustType !== 'manual' || !custModalManualHealthHistoryEl) return;
        const opening = custModalManualHealthHistoryEl.style.display === 'none';
        custModalManualHealthHistoryEl.style.display = opening ? 'block' : 'none';
        if (opening && !custModalManualHealthHistoryEl.dataset.built) {
          custModalManualHealthHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込み中…</p>';
          custModalManualHealthHistoryEl.dataset.built = '1';
          try {
            const res = await fetch(`/api/provider/customers/manual/${currentCustUid}/health-advice-entries`, { headers: authHeaders() });
            const entries = res.ok ? await res.json() : [];
            custModalManualHealthHistoryEl.innerHTML = renderHealthHistoryHtml(entries);
          } catch {
            custModalManualHealthHistoryEl.innerHTML = '<p class="muted" style="font-size:12px;">読み込みに失敗しました</p>';
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

      // カルテを書くフォームの構築・配線一式。項目の追加・並び替え・削除の直後にも
      // 同じ関数でその場で作り直せるようにする（でお要望2026-09-17：項目を追加したら
      // すぐそのカルテに出てくるように。フォームを閉じ直させない）。
      function buildKarteEntryForm() {
        custModalAddForm.innerHTML = renderAddFormHtml(currentCustUid);
        custModalAddForm.dataset.built = '1';
        bindStarWidgets(custModalAddForm);
        bindKarteFieldControls(custModalAddForm, buildKarteEntryForm);
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

      custModalAddToggle?.addEventListener('click', () => {
        if (!currentCustUid) return;
        const opening = custModalAddForm.style.display === 'none';
        custModalAddForm.style.display = opening ? 'block' : 'none';
        if (opening && !custModalAddForm.dataset.built) buildKarteEntryForm();
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
                <p style="font-size:11px;font-weight:700;color:#6d28d9;margin:0 0 6px;">AIが気づいた傾向</p>
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
            fetch('/api/provider/customers', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } }),
            fetch('/api/provider/staff', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } }),
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
                  現在ライトプランのため、New Me Log連携は先着${visibleLimit}人まで表示（実際の連携数：${totalConnected}人）。連携自体・お客様への通知は制限されません。プレミアムプランで無制限になります。
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
          const res = await fetch('/api/provider/customers/manual', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
      function loadCustomersTab() {
        Promise.all([loadFields(), loadMenus(), loadAll(), loadManualCustomers()])
          .then(() => window.__pdMarkTabReady?.('customers'));
      }
      document.querySelectorAll('[data-tab="customers"]').forEach(btn => btn.addEventListener('click', loadCustomersTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'customers') loadCustomersTab();

      // 一斉メール配信タブ（でお要望2026-09-16：顧客管理から独立させた）を直接開いた
      // 場合でも、送信対象を計算できるよう顧客データを読み込んでおく。
      async function loadForBroadcastTab() { if (!allItems.length) await loadAll(); updateBroadcastCount(); }
      document.querySelectorAll('[data-tab="broadcast-email"]').forEach(btn => btn.addEventListener('click', loadForBroadcastTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'broadcast-email') loadForBroadcastTab();

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
        const res = await fetch('/api/provider/packages', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
              <span class="muted" style="font-size:12px;margin-left:8px">${typeLabel}${d.price ? ` ／ ¥${Number(d.price).toLocaleString()}` : ''}${d.expires_on ? ` ／ ${d.expires_on}まで有効` : d.validity_days ? ` ／ 有効期限${d.validity_days}日` : ' ／ 無期限'}</span>
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
        const res = await fetch('/api/provider/customers?scope=all', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
        const res = await fetch(`/api/provider/customer-packages${qs}`, { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
          body: JSON.stringify({ subscription_status: 'cancelled' }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); if (btn) btn.disabled = false; return; }
        showToast('解約しました');
        loadCustomerPackages();
      };

      window.togglePackageActive = async function (id, active) {
        await fetch(`/api/provider/packages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
          body: JSON.stringify({ active }),
        });
        loadDefs();
      };

      window.undoPackageUsage = async function (customerPackageId, btn) {
        if (!confirm('直近1回分の消化を取り消しますか？')) return;
        if (btn) btn.disabled = true;
        const res = await fetch(`/api/provider/customer-packages/${customerPackageId}/usages`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        // comboは「回数」ではなく「付帯チケット回数」だけが実際に発行されるチケット数
        // （でお指摘2026-09-16。両方出すと「回数と付帯チケット回数の違いは？」となり、
        // かつ従来は「回数」の値がそのまま使われ「付帯チケット回数」は無視される
        // バグがあった。comboでは「回数」欄自体を隠し、付帯チケット回数のみ入力させる）。
        if (sessionsField) sessionsField.style.display = (t === 'unlimited' || t === 'combo') ? 'none' : '';
        if (sessionsLabel) sessionsLabel.textContent = t === 'subscription' ? '初回付与回数' : '回数';
        if (comboSessionsField) comboSessionsField.style.display = t === 'combo' ? '' : 'none';
        // 月額会員（でお要望2026-09-14：「月額契約で毎月チケットが自動付与される」仕組み）
        if (recurringSessionsField) recurringSessionsField.style.display = t === 'subscription' ? '' : 'none';
      }
      if (typeSel) { typeSel.addEventListener('change', syncTypeFields); syncTypeFields(); }

      const activeOnlyCheckbox = document.getElementById('pkg-active-only');
      if (activeOnlyCheckbox) activeOnlyCheckbox.addEventListener('change', loadCustomerPackages);

      // 有効期限の指定方法（でお要望2026-09-16：「有効期限はカレンダーから選択して
      // いつまでって設定できるように」）。購入からの日数（従来）に加えて、季節
      // キャンペーン券のように全員同じ日に切れる絶対日付も選べるようにする。
      const validityModeSel = document.getElementById('pkg-validity-mode');
      const validityDaysFieldEl = document.getElementById('pkg-validity-days-field');
      const validityDateFieldEl = document.getElementById('pkg-validity-date-field');
      validityModeSel?.addEventListener('change', () => {
        const mode = validityModeSel.value;
        if (validityDaysFieldEl) validityDaysFieldEl.style.display = mode === 'days' ? '' : 'none';
        if (validityDateFieldEl) validityDateFieldEl.style.display = mode === 'date' ? '' : 'none';
      });

      const createBtn = document.getElementById('pkg-create-btn');
      if (createBtn) {
        createBtn.addEventListener('click', async () => {
          const name = document.getElementById('pkg-name')?.value.trim();
          const package_type = typeSel?.value || 'fixed_count';
          const sessions = document.getElementById('pkg-sessions')?.value;
          const comboSessions = document.getElementById('pkg-combo-sessions')?.value;
          const recurringSessions = document.getElementById('pkg-recurring-sessions')?.value;
          const price = document.getElementById('pkg-price')?.value;
          const validityMode = validityModeSel?.value || 'none';
          const validity = validityMode === 'days' ? document.getElementById('pkg-validity')?.value : null;
          const expiresOn = validityMode === 'date' ? document.getElementById('pkg-expires-on')?.value : null;
          if (!name) { showToast('パッケージ名を入力してください'); return; }
          if ((package_type === 'fixed_count' || package_type === 'subscription') && !sessions) { showToast('回数を入力してください'); return; }
          if (package_type === 'combo' && !comboSessions) { showToast('付帯チケット回数を入力してください'); return; }
          if (package_type === 'subscription' && !recurringSessions) { showToast('毎月の付与回数を入力してください'); return; }
          if (validityMode === 'date' && !expiresOn) { showToast('有効期限の日付を選んでください'); return; }
          createBtn.disabled = true;
          const res = await fetch('/api/provider/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
            body: JSON.stringify({
              name, package_type, total_sessions: sessions || null,
              combo_ticket_sessions: package_type === 'combo' ? comboSessions : null,
              recurring_sessions: package_type === 'subscription' ? recurringSessions : null,
              price: price || null, validity_days: validity || null, expires_on: expiresOn || null,
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
          document.getElementById('pkg-expires-on').value = '';
          if (validityModeSel) validityModeSel.value = 'none';
          if (validityDaysFieldEl) validityDaysFieldEl.style.display = 'none';
          if (validityDateFieldEl) validityDateFieldEl.style.display = 'none';
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/line-channel', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) { statusEl.innerHTML = authErrorHtml(res); return; }
        const data = await res.json();
        if (data.connected) {
          statusEl.innerHTML = `連携済み（${data.verified_at ? new Date(data.verified_at).toLocaleDateString('ja-JP') : ''}確認・${data.connected_by === 'staff' ? '運営代行設定' : '自己設定'}）`;
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
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
              headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
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
      const depositBox = document.getElementById('deposit-settings-box');
      const depositInput = document.getElementById('deposit-amount-input');
      const depositSaveBtn = document.getElementById('deposit-amount-save');
      const depositMsg = document.getElementById('deposit-amount-msg');
      const depositWarn = document.getElementById('deposit-payment-warn');

      async function loadDepositSettings() {
        if (!depositInput) return;
        const res = await fetch('/api/provider/deposit-settings', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) return;
        const d = await res.json();
        depositInput.value = d.deposit_amount || '';
        if (depositWarn) depositWarn.style.display = d.payment_ready ? 'none' : 'block';
      }
      if (depositSaveBtn) {
        depositSaveBtn.addEventListener('click', async () => {
          depositSaveBtn.disabled = true;
          if (depositMsg) { depositMsg.style.color = ''; depositMsg.textContent = '保存中…'; }
          try {
            const res = await fetch('/api/provider/deposit-settings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
              body: JSON.stringify({ deposit_amount: depositInput.value === '' ? null : depositInput.value }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); if (depositMsg) { depositMsg.style.color = '#ef4444'; depositMsg.textContent = e?.error || '保存に失敗しました'; } }
            else if (depositMsg) { depositMsg.style.color = '#4ade80'; depositMsg.textContent = '✓ 保存しました'; setTimeout(() => { if (depositMsg) depositMsg.textContent = ''; }, 2500); }
          } catch { if (depositMsg) { depositMsg.style.color = '#ef4444'; depositMsg.textContent = '通信エラーが発生しました'; } }
          depositSaveBtn.disabled = false;
        });
      }

      async function loadFeatures() {
        if (!listEl) return;
        listEl.textContent = '読み込み中…';
        const res = await fetch('/api/provider/features', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) { listEl.innerHTML = authErrorHtml(res); return; }
        const { features, defs, locks = {} } = await res.json();
        if (depositBox) depositBox.style.display = features.payment_mediation ? 'block' : 'none';
        if (features.payment_mediation) loadDepositSettings();
        const groups = {};
        Object.entries(defs).forEach(([key, def]) => {
          (groups[def.group] = groups[def.group] || []).push({ key, ...def });
        });
        listEl.innerHTML = Object.entries(groups).map(([groupName, items]) => `
          <div>
            <p style="font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(201,168,76,.7);text-transform:uppercase;margin:0 0 8px">${esc(groupName)}</p>
            <div class="stack" style="gap:10px">
              ${items.map(item => `
                <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(26,20,16,0.03);border:1px solid rgba(26,20,16,0.12);border-radius:10px;cursor:${locks[item.key] ? 'default' : 'pointer'};${locks[item.key] ? 'opacity:.6;' : ''}">
                  <input type="checkbox" data-feature-key="${item.key}" ${features[item.key] && !locks[item.key] ? 'checked' : ''} ${locks[item.key] ? 'disabled' : ''} style="margin-top:3px" />
                  <span>
                    <span style="display:block;font-weight:700;font-size:13.5px;color:rgba(26,20,16,0.9)">${esc(item.label)}${locks[item.key] ? `<span style="margin-left:8px;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:99px;background:rgba(96,165,250,0.18);color:#2f4f8f">${esc(locks[item.key])}プラン以上</span>` : ''}</span>
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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
            body: JSON.stringify({ [key]: input.checked }),
          });
          if (!res.ok) {
            input.checked = !input.checked;
            if (statusEl) { statusEl.style.color = '#ef4444'; statusEl.textContent = '保存に失敗しました'; }
          } else {
            if (statusEl) { statusEl.style.color = '#4ade80'; statusEl.textContent = '✓ 保存しました'; setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2500); }
            window.applyFeatureGating?.(key, input.checked);
            if (key === 'payment_mediation') {
              if (depositBox) depositBox.style.display = input.checked ? 'block' : 'none';
              if (input.checked) loadDepositSettings();
            }
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
      const axisEl = document.getElementById('ds-calendar-axis');
      const axisMsg = document.getElementById('ds-calendar-axis-msg');
      const viewEl = document.getElementById('ds-calendar-view');
      const viewMsg = document.getElementById('ds-calendar-view-msg');
      const shortcutsEl = document.getElementById('ds-header-shortcuts');
      const shortcutsMsg = document.getElementById('ds-header-shortcuts-msg');
      const layoutEl = document.getElementById('ds-layout');
      const layoutMsg = document.getElementById('ds-layout-msg');
      const newCategoryInput = document.getElementById('ds-new-category-input');
      const newCategoryBtn = document.getElementById('ds-new-category-btn');

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

      // メニューの並び順（カテゴリー自体の順序）とタブの配置（どのタブがどのカテゴリーに
      // 属し、カテゴリー内でどう並ぶか）は元々別々のUIだったが、「統合するべき」という
      // でお指摘（2026-09-27）を受け1つの編集画面にまとめた。カテゴリー自体の追加・削除・
      // 名前変更（でお要望「『ホーム』や『予約』などの大きいタブも任意の名前で追加できる
      // ようにしてほしい」）もここで行う。
      function effectiveTabsByCategory(prefs) {
        const overrides = prefs.tab_category_overrides || {};
        const orderOverrides = prefs.tab_order_overrides || {};
        const byCategory = {};
        (prefs.sidebar_order || []).forEach(key => { byCategory[key] = []; });
        TAB_CATALOG.forEach(t => {
          const cat = overrides[t.key] || t.category;
          if (byCategory[cat]) byCategory[cat].push(t.key);
        });
        Object.keys(byCategory).forEach(cat => {
          const explicit = orderOverrides[cat];
          if (!explicit) return;
          const known = byCategory[cat];
          const ordered = explicit.filter(k => known.includes(k));
          const rest = known.filter(k => !ordered.includes(k));
          byCategory[cat] = [...ordered, ...rest];
        });
        return byCategory;
      }

      function labelOfTab(key) { return TAB_CATALOG.find(t => t.key === key)?.label || key; }

      function renderLayout(prefs) {
        if (!layoutEl) return;
        const order = prefs.sidebar_order || [];
        const defs = allCategoryDefs(prefs.custom_categories);
        const labelOf = key => defs.find(c => c.key === key)?.label || key;
        const byCategory = effectiveTabsByCategory(prefs);

        layoutEl.innerHTML = order.map((catKey, catIdx) => {
          const isCustom = catKey.startsWith('custom_');
          const tabs = byCategory[catKey] || [];
          return `
            <div style="border:1px solid rgba(26,20,16,0.12);border-radius:10px;padding:10px 12px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-cat-up="${catKey}"${catIdx === 0 ? ' disabled' : ''}>↑</button>
                <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-cat-down="${catKey}"${catIdx === order.length - 1 ? ' disabled' : ''}>↓</button>
                <strong style="flex:1;font-size:13px">${esc(labelOf(catKey))}</strong>
                ${isCustom ? `
                  <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-cat-rename="${catKey}">名前を変更</button>
                  <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#ef4444" data-cat-delete="${catKey}">削除</button>
                ` : ''}
              </div>
              <div class="stack" style="gap:6px">
                ${tabs.length ? tabs.map((key, i) => `
                  <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(26,20,16,0.03);border-radius:8px">
                    <span style="flex:1;font-size:12.5px">${esc(labelOfTab(key))}</span>
                    <button type="button" class="btn btn-ghost" style="font-size:10px;padding:2px 6px" data-tl-up="${key}" data-tl-cat="${catKey}"${i === 0 ? ' disabled' : ''}>↑</button>
                    <button type="button" class="btn btn-ghost" style="font-size:10px;padding:2px 6px" data-tl-down="${key}" data-tl-cat="${catKey}"${i === tabs.length - 1 ? ' disabled' : ''}>↓</button>
                    <select data-tl-move="${key}" style="font-size:11px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px">
                      ${defs.map(c2 => `<option value="${c2.key}"${c2.key === catKey ? ' selected' : ''}>${esc(c2.label)}</option>`).join('')}
                    </select>
                  </div>
                `).join('') : `<p class="muted" style="font-size:11.5px;margin:0">タブがありません。他のカテゴリーのタブをここへ移動できます。</p>`}
              </div>
            </div>
          `;
        }).join('');

        layoutEl.querySelectorAll('[data-cat-up]').forEach(btn => btn.addEventListener('click', () => moveCategory(btn.dataset.catUp, -1)));
        layoutEl.querySelectorAll('[data-cat-down]').forEach(btn => btn.addEventListener('click', () => moveCategory(btn.dataset.catDown, 1)));
        layoutEl.querySelectorAll('[data-cat-rename]').forEach(btn => btn.addEventListener('click', () => renameCategory(btn.dataset.catRename)));
        layoutEl.querySelectorAll('[data-cat-delete]').forEach(btn => btn.addEventListener('click', () => deleteCategory(btn.dataset.catDelete)));
        layoutEl.querySelectorAll('[data-tl-up]').forEach(btn => btn.addEventListener('click', () => moveTabInCategory(btn.dataset.tlCat, btn.dataset.tlUp, -1)));
        layoutEl.querySelectorAll('[data-tl-down]').forEach(btn => btn.addEventListener('click', () => moveTabInCategory(btn.dataset.tlCat, btn.dataset.tlDown, 1)));
        layoutEl.querySelectorAll('[data-tl-move]').forEach(sel => sel.addEventListener('change', () => moveTabToCategory(sel.dataset.tlMove, sel.value)));

        if (newCategoryBtn) newCategoryBtn.disabled = (prefs.custom_categories || []).length >= MAX_CUSTOM_CATEGORIES;
      }

      function moveCategory(key, dir) {
        if (!dashboardPrefs) return;
        const order = [...dashboardPrefs.sidebar_order];
        const idx = order.indexOf(key);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        save({ sidebar_order: order }, layoutMsg).then(ok => {
          if (ok) {
            renderLayout(dashboardPrefs);
            applyTabLayout(dashboardPrefs);
            // サイドバーの実際の並び順にもその場で反映する
            order.forEach((k, i) => {
              const btn = document.querySelector(`.pd-rail-btn[data-category="${k}"]`);
              if (btn) btn.style.order = String(i);
            });
          }
        });
      }

      function moveTabInCategory(categoryKey, tabKey, dir) {
        if (!dashboardPrefs) return;
        const byCategory = effectiveTabsByCategory(dashboardPrefs);
        const order = [...(byCategory[categoryKey] || [])];
        const idx = order.indexOf(tabKey);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        const orderOverrides = { ...(dashboardPrefs.tab_order_overrides || {}), [categoryKey]: order };
        save({ tab_order_overrides: orderOverrides }, layoutMsg).then(ok => {
          if (ok) { renderLayout(dashboardPrefs); applyTabLayout(dashboardPrefs); }
        });
      }

      function moveTabToCategory(tabKey, newCategoryKey) {
        if (!dashboardPrefs) return;
        const defaultCategory = TAB_CATALOG.find(t => t.key === tabKey)?.category;
        const overrides = { ...(dashboardPrefs.tab_category_overrides || {}) };
        if (newCategoryKey === defaultCategory) delete overrides[tabKey];
        else overrides[tabKey] = newCategoryKey;
        save({ tab_category_overrides: overrides }, layoutMsg).then(ok => {
          if (ok) { renderLayout(dashboardPrefs); applyTabLayout(dashboardPrefs); }
        });
      }

      // カテゴリーの追加・名前変更・削除（でお要望2026-09-27：「『ホーム』や『予約』などの
      // 大きいタブも任意の名前で追加できるようにしてほしい」）。追加・削除時は
      // sidebar_order/tab_category_overrides/tab_order_overridesの自己修復をサーバー側
      // （app/api/provider/dashboard-prefs/route.js）に任せ、custom_categoriesだけ送る。
      function addCategory() {
        if (!dashboardPrefs || !newCategoryInput) return;
        const label = newCategoryInput.value.trim();
        if (!label) return;
        if (label.length > MAX_CATEGORY_LABEL_LENGTH) { showToast(`カテゴリー名は${MAX_CATEGORY_LABEL_LENGTH}文字以内にしてください`); return; }
        const existing = dashboardPrefs.custom_categories || [];
        if (existing.length >= MAX_CUSTOM_CATEGORIES) { showToast(`カテゴリーは最大${MAX_CUSTOM_CATEGORIES}個までです`); return; }
        const key = generateCategoryKey(existing);
        save({ custom_categories: [...existing, { key, label }] }, layoutMsg).then(ok => {
          if (ok) {
            newCategoryInput.value = '';
            renderLayout(dashboardPrefs);
            applyTabLayout(dashboardPrefs);
            dashboardPrefs.sidebar_order.forEach((k, i) => {
              const btn = document.querySelector(`.pd-rail-btn[data-category="${k}"]`);
              if (btn) btn.style.order = String(i);
            });
          }
        });
      }
      newCategoryBtn?.addEventListener('click', addCategory);
      newCategoryInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } });

      function renameCategory(key) {
        if (!dashboardPrefs) return;
        const current = (dashboardPrefs.custom_categories || []).find(c => c.key === key);
        if (!current) return;
        const label = prompt('新しいカテゴリー名を入力してください', current.label)?.trim();
        if (!label || label === current.label) return;
        if (label.length > MAX_CATEGORY_LABEL_LENGTH) { showToast(`カテゴリー名は${MAX_CATEGORY_LABEL_LENGTH}文字以内にしてください`); return; }
        const updated = dashboardPrefs.custom_categories.map(c => c.key === key ? { ...c, label } : c);
        save({ custom_categories: updated }, layoutMsg).then(ok => {
          if (ok) { renderLayout(dashboardPrefs); applyTabLayout(dashboardPrefs); }
        });
      }

      function deleteCategory(key) {
        if (!dashboardPrefs) return;
        const byCategory = effectiveTabsByCategory(dashboardPrefs);
        if ((byCategory[key] || []).length) { showToast('先にこのカテゴリー内のタブを他へ移動してから削除してください'); return; }
        if (!confirm('このカテゴリーを削除しますか？')) return;
        const updated = (dashboardPrefs.custom_categories || []).filter(c => c.key !== key);
        save({ custom_categories: updated }, layoutMsg).then(ok => {
          if (ok) { renderLayout(dashboardPrefs); applyTabLayout(dashboardPrefs); }
        });
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/dashboard-prefs', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) return;
        const { prefs } = await res.json();
        dashboardPrefs = prefs;
        if (landingSel) landingSel.value = prefs.landing_tab;
        renderRadioGroup(axisEl, CALENDAR_AXIS_OPTIONS, 'ds-axis', prefs.calendar_axis);
        renderRadioGroup(viewEl, CALENDAR_DEFAULT_VIEW_OPTIONS, 'ds-view', prefs.calendar_default_view);
        renderShortcutsList(prefs.header_shortcuts || []);
        renderLayout(prefs);
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
        const lockPlan = (window.__providerLocks || {})[key];
        if (lockPlan) {
          return `
          <div class="feature-enable-banner" data-feature-banner="${key}">
            <div>
              <strong style="font-size:13.5px;color:#1a1410">「${esc(label)}」は${esc(lockPlan)}プラン以上でご利用いただけます</strong>
              <p class="muted" style="font-size:12px;margin:4px 0 0">${esc(help)}</p>
            </div>
            <button type="button" class="btn" style="font-size:12px;padding:8px 16px;flex-shrink:0" data-plan-upgrade="${key}">プランを見る</button>
          </div>
        `;
        }
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
          const lockPlan = (window.__providerLocks || {})[key];
          const on = !!features?.[key] && !lockPlan;
          el.classList.toggle('tab-feature-off', !on);
          const badge = el.querySelector('[data-feature-badge]');
          if (badge) badge.textContent = on ? '' : (lockPlan ? lockPlan + 'プラン〜' : '未設定');

          // OFFのタブは所属カテゴリーから「非表示」カテゴリーへ移動しておく
          // （でお要望2026-09-16：「非表示にしたやつはまとめておくといい」）。ONに戻したら
          // 元の場所へ戻す。所属カテゴリーはcategoryOfTab()でその都度計算する（でお要望
          // 2026-09-27のタブ配置カスタマイズと二重管理にならないよう、dataset保存はしない）。
          const homePanelKey = categoryOfTab(el.dataset.tab, window.__tabCategoryOverrides || {});
          if (homePanelKey) {
            const targetPanelKey = on ? homePanelKey : 'hidden';
            const targetSection = document.querySelector(`.pd-panel-section[data-panel="${targetPanelKey}"]`);
            if (targetSection && el.parentElement !== targetSection) targetSection.appendChild(el);
          }

          const tabId = el.dataset.tab;
          const pane = document.getElementById('tab-' + tabId);
          if (!pane) return;
          const existing = pane.querySelector(`[data-feature-banner="${key}"]`);
          if (existing && !!lockPlan !== (existing.querySelector('[data-plan-upgrade]') !== null)) existing.remove();
          if (on) {
            existing?.remove();
            // OFFの間に隠していた中身を元に戻す（下のelse節で保存したdisplay値を復元）。
            Array.from(pane.children).forEach(c => {
              if (c.dataset.featureHiddenDisplay === undefined) return;
              c.style.display = c.dataset.featureHiddenDisplay;
              delete c.dataset.featureHiddenDisplay;
            });
          } else {
            if (!pane.querySelector(`[data-feature-banner="${key}"]`)) {
              pane.insertAdjacentHTML('afterbegin', bannerHtml(key, tabId));
              pane.querySelector(`[data-plan-upgrade="${key}"]`)?.addEventListener('click', () => {
                document.querySelector('[data-tab="billing"]')?.click();
              });
              pane.querySelector(`[data-feature-enable="${key}"]`)?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.textContent = '設定中…';
                try {
                  const res = await fetch('/api/provider/features', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` },
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
            // バナーを上に出すだけで、実際の中身はそのまま操作できてしまっていた
            // （でお報告2026-09-16：「機能設定のチェックに関係なく全部出てる」）。
            // バナー以外の子要素を全て隠し、ONにするまで実際に使えないようにする。
            Array.from(pane.children).forEach(c => {
              if (c.dataset.featureBanner !== undefined) return;
              if (c.dataset.featureExempt !== undefined) return; // 機能に関わらず常に使える部分（例：営業時間）
              if (c.style.display === 'none') return;
              c.dataset.featureHiddenDisplay = c.style.display || '';
              c.style.display = 'none';
            });
          }
        });

        const hiddenSection = document.querySelector('.pd-panel-section[data-panel="hidden"]');
        const hiddenRailBtn = document.getElementById('pd-rail-hidden-btn');
        if (hiddenSection && hiddenRailBtn) {
          hiddenRailBtn.style.display = hiddenSection.children.length ? '' : 'none';
        }
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
          const { features, defs, locks } = await res.json();
          defsCache = defs || {};
          window.__providerLocks = locks || {};
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        const items = res.ok ? await res.json() : [];
        menuFromService.innerHTML = '<option value="">－ 選択するとメニュー名・価格を自動入力 －</option>'
          + items.map(s => `<option value="${s.id}">${escLp(s.name)}（¥${Number(s.price).toLocaleString()}）</option>`).join('');
        menuFromService.onchange = () => {
          const s = items.find(x => String(x.id) === menuFromService.value);
          if (!s) return;
          document.getElementById('menu-name').value = s.name || '';
          document.getElementById('menu-price').value = s.price || '';
          document.getElementById('menu-duration').value = s.duration_minutes || '';
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
        const res = await fetch('/api/provider/experience-menus', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
          await fetch(`/api/provider/experience-menus/${btn.dataset.menuDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/customers', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
        const res = await fetch('/api/provider/cases', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
          await fetch(`/api/provider/cases/${btn.dataset.caseDel}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
        const res = await fetch('/api/provider/area-demand', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
        const res = await fetch('/api/provider/ltv-cac-settings', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) return;
        const data = await res.json();
        adCostInput.value = data.monthly_ad_cost;
        marginInput.value = data.gross_margin_pct;
      }

      async function loadContent() {
        contentEl.innerHTML = '<p class="muted" style="font-size:13px;">読み込み中…</p>';
        const res = await fetch('/api/provider/ltv-cac', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
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
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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
              headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
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
              msg.textContent = saved ? '✓ 写真を保存しました' : 'アップロードはできましたが保存に失敗しました。「保存する」を押してください。';
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
            headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
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
          const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` }, body: fd });
          let data; try { data = await res.json(); } catch { data = {}; }
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '保存中…'; msg.style.color = '#9ca3af';
            const saved = await saveToLocal({ cover_image_url: data.url });
            if (saved) {
              msg.textContent = '✓ カバー画像を保存しました（ページに反映されました）'; msg.style.color = '#059669';
            } else {
              msg.textContent = '画像はアップロードできましたが、DBへの保存に失敗しました。ページを再読み込みして再試行してください。'; msg.style.color = '#ef4444';
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
            headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
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
            const res = await fetch('/api/provider/upload-service-image', { method: 'POST', headers: { 'Authorization': `Bearer ${getSupabaseToken()}` }, body: fd });
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
      // でお要望2026-09-25：「既読一覧見れるといいですね」。バッジは元々pending件数
      // だったが、pendingでも一度確認済みなら店舗側は気にしなくていい。未読件数（＝
      // viewed_atが無いもの）に変更し、既読/未読の区別自体は一覧側の未読ドットで見る。
      const unread = items.filter(r => !r.viewed_at).length;
      const b = document.getElementById('requests-badge');
      if (b) { b.textContent = unread || ''; b.style.display = unread > 0 ? 'inline' : 'none'; }
      applyRequestFilters();
      window.__pdMarkTabReady?.('requests');
    }

    function applyRequestFilters() {
      const statusFilter = document.getElementById('req-filter-status')?.value || '';
      const kwFilter = (document.getElementById('req-filter-kw')?.value || '').toLowerCase().trim();
      const unreadOnly = !!document.getElementById('req-filter-unread')?.checked;
      let items = _allRequests;
      if (statusFilter) items = items.filter(r => r.status === statusFilter);
      if (unreadOnly) items = items.filter(r => !r.viewed_at);
      if (kwFilter) items = items.filter(r => (r.user_name || '').toLowerCase().includes(kwFilter) || (r.note || '').toLowerCase().includes(kwFilter));
      const countEl = document.getElementById('req-filter-count');
      if (countEl) countEl.textContent = `${items.length}件`;
      renderRequests(items);
    }

    // 予約リクエストを開いたら既読にする（でお要望2026-09-25）。1回だけAPIを叩けば
    // 十分なので、ローカルにまだviewed_atが無い時だけ送る。
    async function markRequestViewed(r) {
      if (!r || r.viewed_at) return;
      try {
        const tk = getSupabaseToken();
        if (!tk) return;
        const res = await fetch(`/api/reservations/${r.id}/view`, { method: 'POST', headers: { 'Authorization': `Bearer ${tk}` } });
        if (res.ok) {
          const data = await res.json();
          r.viewed_at = data.viewed_at;
          applyRequestFilters();
        }
      } catch {}
    }

    // 絞り込みコントロールのイベント登録
    document.getElementById('req-filter-status')?.addEventListener('change', applyRequestFilters);
    document.getElementById('req-filter-kw')?.addEventListener('input', applyRequestFilters);
    document.getElementById('req-filter-unread')?.addEventListener('change', applyRequestFilters);
    document.getElementById('req-filter-reset')?.addEventListener('click', () => {
      const s = document.getElementById('req-filter-status'); if (s) s.value = '';
      const k = document.getElementById('req-filter-kw'); if (k) k.value = '';
      const u = document.getElementById('req-filter-unread'); if (u) u.checked = false;
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
            ${r.user_id ? `<button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="window.openCustomerModal ? window.openCustomerModal('${r.user_id}','member','${nameForJs}') : showToast('読み込み中です。少し待ってから再度お試しください')">顧客情報を見る</button>` : ''}
          </div>
          ${meMapNote ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:10px">
            <p style="font-size:11px;font-weight:700;color:#2563eb;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">New Me Navi より</p>
            ${meMapNote.split('\n').map(line => `<p style="font-size:13px;color:#1e40af;margin:0 0 2px;font-weight:${line.startsWith('最優先') ? '700' : '400'}">${esc(line)}</p>`).join('')}
          </div>` : ''}
          ${(r.status === 'approved' || r.status === 'visited') ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:10px">
            <p style="font-size:11px;font-weight:700;color:#15803d;margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em">ユーザー情報</p>
            <p style="font-size:13px;font-weight:700;color:#111;margin:0 0 2px">${esc(r.user_name)}</p>
            <p style="font-size:13px;color:#374151;margin:0">${esc(r.user_contact)}</p>
          </div>` : `<p style="font-size:12px;color:#9ca3af;margin:0 0 10px">連絡先: ${esc(r.user_contact)}</p>`}
          ${menuText ? `<p style="font-size:13px;color:#374151;margin:0 0 8px;font-weight:700">${esc(menuText)}</p>` : ''}
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
            <button class="btn btn-ghost" style="font-size:11px;padding:8px 14px;white-space:nowrap;color:#7c3aed;border-color:#c4b5fd" onclick="consumePackage('${p.id}','${r.id}',this)">${esc(p.package_name)}を消化（残${p.remaining_sessions}）</button>`).join('')}
          </div>` : r.status === 'visited' && r.user_id ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6">
            <button class="btn btn-ghost" style="font-size:11px;padding:8px 14px;white-space:nowrap;color:#7c3aed;border-color:#c4b5fd" onclick="showChangePackageModal('${r.id}','${r.user_id}','${r.package_id || ''}')">使用チケットを変更</button>
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
      markRequestViewed(r);
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
            <span class="req-row-name">${!r.viewed_at ? '<span class="req-unread-dot" title="未読"></span>' : ''}${esc(r.user_name)}</span>
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

    window.showVisitModal = async function (id, opts) {
      const alreadyVisited = !!opts?.alreadyVisited;
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
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">${alreadyVisited ? 'チェックイン済みです' : '来店を確認'}</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 18px">${alreadyVisited ? 'QRチェックインと同時に予約も来店確認済みです。実際にご利用いただいたメニュー・金額を記録してください。' : '実際にご利用いただいたメニュー・金額を確認してください。予約時の内容から自動で入っていますが、変更・追加できます。'}</p>
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
            <button onclick="confirmVisit('${id}', false, ${alreadyVisited})" style="flex:1;padding:12px;background:#10b981;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">${alreadyVisited ? '売上を記録する' : '来店確認して売上を記録'}</button>
            <button onclick="document.getElementById('visit-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">${alreadyVisited ? '後で記録する' : 'キャンセル'}</button>
          </div>
          ${alreadyVisited ? '' : '<button onclick="confirmVisit(\'' + id + '\', true)" style="width:100%;padding:8px;background:none;border:none;font-size:12px;color:#9ca3af;cursor:pointer;text-decoration:underline;">売上を入力せず来店確認だけする</button>'}
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

    window.confirmVisit = async function (id, skipSales, skipStatusUpdate) {
      const _visitToken = getSupabaseToken();
      const headers = { 'Content-Type': 'application/json', ...(_visitToken ? { 'Authorization': `Bearer ${_visitToken}` } : {}) };
      // skipStatusUpdate: チェックインQRのスキャン時点で予約側は既に来店確認済み
      // （app/api/provider/checkins/route.js側で自動処理済み）のため、ここで
      // もう一度PATCHすると通知・紹介プログラム確定等の副作用が二重発火してしまう。
      // このモーダルでは売上記録だけを行う。
      let autoConsumedPackage = null;
      if (!skipStatusUpdate) {
        const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'visited' }) });
        if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
        const resData = await res.json().catch(() => ({}));
        autoConsumedPackage = resData?.auto_consumed_package || null;
      }

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
      await loadRequests();
      showToast(autoConsumedPackage
        ? `来店を確認しました（${autoConsumedPackage.packageName}を自動消化。誤りは「回数券」タブから取り消せます）`
        : '来店を確認しました');
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

    // 使用チケットの変更（でお要望2026-09-27：「実際行った時にその場で内容が変わる
    // かもしれないから、店舗側で予約時の利用チケットを変更できるように」）。
    // 来店確認済みの予約カードから開き、現在の紐付けを見ながら別のチケットに
    // 付け替えたり「使用しない」に戻したりできる。
    window.showChangePackageModal = async function (reservationId, userId, currentPackageId) {
      const existing = document.getElementById('change-pkg-modal-overlay');
      if (existing) existing.remove();
      const _cpToken = getSupabaseToken();
      const headers = { 'Content-Type': 'application/json', ...(_cpToken ? { 'Authorization': `Bearer ${_cpToken}` } : {}) };

      const overlay = document.createElement('div');
      overlay.id = 'change-pkg-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;padding:28px;width:100%;max-width:400px;">
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">使用チケットを変更</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 14px">読み込み中…</p>
          <div id="change-pkg-body"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

      const res = await fetch('/api/provider/customer-packages', { headers });
      const bodyEl = document.getElementById('change-pkg-body');
      const msgEl = overlay.querySelector('p');
      if (!res.ok) { if (msgEl) msgEl.textContent = '読み込みに失敗しました'; return; }
      const rows = await res.json();
      const userPackages = rows.filter(p => p.user_id === userId);
      if (msgEl) msgEl.textContent = '実際にご利用いただいたチケットを選んでください。';

      const options = ['<option value="">使用しない</option>']
        .concat(userPackages.map(p => `<option value="${p.id}"${p.id === currentPackageId ? ' selected' : ''}>${esc(p.package_name)}（${p.package_type === 'unlimited' ? '通い放題' : `残り${p.remaining_sessions}${p.expired ? '・期限切れ' : ''}`}）</option>`))
        .join('');
      bodyEl.innerHTML = `
        <select id="change-pkg-select" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:16px">${options}</select>
        <div style="display:flex;gap:8px">
          <button id="change-pkg-save" style="flex:1;padding:12px;background:#10b981;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">保存する</button>
          <button onclick="document.getElementById('change-pkg-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">キャンセル</button>
        </div>
      `;
      document.getElementById('change-pkg-save').addEventListener('click', async () => {
        const sel = document.getElementById('change-pkg-select');
        const saveBtn = document.getElementById('change-pkg-save');
        saveBtn.disabled = true; saveBtn.textContent = '保存中…';
        try {
          const r = await fetch(`/api/reservations/${reservationId}/change-package`, { method: 'POST', headers, body: JSON.stringify({ package_id: sel.value || null }) });
          if (!r.ok) { const e = await r.json().catch(() => ({})); showToast('エラー: ' + (e.error || '不明')); saveBtn.disabled = false; saveBtn.textContent = '保存する'; return; }
          overlay.remove();
          showToast('使用チケットを変更しました');
          await loadRequests();
        } catch {
          showToast('通信エラーが発生しました');
          saveBtn.disabled = false; saveBtn.textContent = '保存する';
        }
      });
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

      let fnCode = '';
      const codeEl = document.getElementById('referral-code-tab');

      document.getElementById('copy-referral-code-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        navigator.clipboard.writeText(fnCode).then(() => showToast('コードをコピーしました')).catch(() => {});
      });

      document.getElementById('copy-referral-url-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        const url = `https://www.fineme.me/business/fineme-referral.html?ref=${encodeURIComponent(fnCode)}`;
        navigator.clipboard.writeText(url).then(() => showToast('紹介URLをコピーしました')).catch(() => {});
      });

      // 営業パートナー登録のopt-in状態を見て、未登録なら登録導線だけを出す
      // （でお方針2026-10-02：掲載者＝営業パートランの自動一体化を廃止）
      async function checkRegistrationAndLoad() {
        const promptEl = document.getElementById('referral-optin-prompt');
        const contentEl = document.getElementById('referral-registered-content');
        try {
          const res = await fetch('/api/provider/sales-partner', { headers: { 'Authorization': `Bearer ${getSupabaseToken()}` } });
          if (!res.ok) { if (promptEl) promptEl.style.display = ''; return; }
          const data = await res.json();
          if (data.registered) {
            fnCode = data.partner?.referral_code || '';
            if (codeEl) codeEl.textContent = fnCode || '—';
            const portalLink = document.getElementById('referral-portal-link');
            if (portalLink && data.partner?.access_token) portalLink.href = `/partner/${data.partner.access_token}`;
            if (promptEl) promptEl.style.display = 'none';
            if (contentEl) contentEl.style.display = '';
            loadReferrals();
          } else {
            if (promptEl) promptEl.style.display = '';
            if (contentEl) contentEl.style.display = 'none';
          }
        } catch {
          if (promptEl) promptEl.style.display = '';
        }
      }

      document.getElementById('referral-optin-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = '登録中…';
        try {
          const res = await fetch('/api/provider/sales-partner', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getSupabaseToken()}` },
          });
          if (!res.ok) { showToast('登録に失敗しました'); btn.disabled = false; btn.textContent = '営業パートナーとして登録する'; return; }
          showToast('営業パートナーに登録しました');
          checkRegistrationAndLoad();
        } catch {
          showToast('通信エラーが発生しました');
          btn.disabled = false;
          btn.textContent = '営業パートナーとして登録する';
        }
      });

      async function loadReferrals() {
        const pid = provider?.id || loadProviderData()?.id;
        const listEl = document.getElementById('referral-list');
        if (!pid) { if (listEl) listEl.innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }

        try {
          const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
          if (!res.ok) { if (listEl) listEl.innerHTML = authErrorHtml(res); return; }
          const data = await res.json();
          if (data.not_registered) { if (listEl) listEl.innerHTML = '<p class="muted">営業パートナー登録が必要です。</p>'; return; }
          const { referrals, summary } = data;
          if (summary?.referral_code) { fnCode = summary.referral_code; if (codeEl) codeEl.textContent = fnCode; }

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
        btn.addEventListener('click', checkRegistrationAndLoad, { once: false });
      });
      if (new URLSearchParams(location.search).get('tab') === 'referral') checkRegistrationAndLoad();
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

    // ── 掲載者向け利用規約への同意状況（版と同意日時を記録） ──────────
    async function loadTermsAgreement() {
      const textEl = document.getElementById('terms-agreement-text');
      const btnEl = document.getElementById('terms-agreement-btn');
      if (!textEl || !btnEl) return;
      try {
        const res = await fetch('/api/provider/terms-agreement', { headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
        if (!res.ok) { textEl.textContent = '同意状況を取得できませんでした'; return; }
        const d = await res.json();
        const fmt = iso => new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (d.agreedCurrent) {
          const cur = (d.history || []).find(h => h.terms_version === d.currentVersion);
          textEl.innerHTML = `利用規約（${esc(d.currentVersion)}版）に同意済み${cur ? `（${esc(fmt(cur.agreed_at))}）` : ''}`;
          btnEl.style.display = 'none';
        } else {
          textEl.textContent = `最新の利用規約（${d.currentVersion}版）には、まだ同意が記録されていません。内容をご確認のうえ、同意してください。`;
          btnEl.style.display = 'inline-block';
        }
      } catch { textEl.textContent = '同意状況を取得できませんでした'; }
    }
    document.getElementById('terms-agreement-btn')?.addEventListener('click', async () => {
      const res = await fetch('/api/provider/terms-agreement', { method: 'POST', headers: { Authorization: `Bearer ${getSupabaseToken()}` } });
      if (res.ok) { showToast('同意を記録しました'); loadTermsAgreement(); }
      else { const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明')); }
    });
    document.querySelectorAll('[data-tab="billing"]').forEach(btn => btn.addEventListener('click', loadTermsAgreement));

    // ── カスタマーポータル ────────────────────────────────────────
    document.getElementById('billing-portal-btn').addEventListener('click', async e => {
      e.preventDefault();
      try {
        const { data: { session } } = await _sb.auth.getSession();
        const token = session?.access_token;
        if (!token) { showToast('ログインが必要です'); return; }
        const res = await fetch('/api/billing/portal-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` },
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

      function loadSalesTab() {
        Promise.all([loadSalesOptions(), loadSales()]).then(() => window.__pdMarkTabReady?.('sales'));
      }
      document.querySelectorAll('[data-tab="sales"]').forEach(btn => btn.addEventListener('click', loadSalesTab, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'sales') loadSalesTab();
    })();

    // ── 請求（お客様へのお支払いのお願い） ────────────────────────
    (() => {
      const form = document.getElementById('inv-form');
      if (!form) return;
      const listEl = document.getElementById('inv-list');
      const msgEl = document.getElementById('inv-msg');
      const targetEl = document.getElementById('inv-target');
      const clearTargetBtn = document.getElementById('inv-clear-target');
      const filterUnpaidBtn = document.getElementById('inv-filter-unpaid');
      const filterAllBtn = document.getElementById('inv-filter-all');
      let target = null; // { type: 'member'|'manual', id, name }
      let showAll = false;
      let invoices = [];
      const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getSupabaseToken()}` });
      const yen = n => '¥' + Number(n).toLocaleString();
      const todayStr = () => new Date().toISOString().split('T')[0];

      function setTarget(t) {
        target = t;
        targetEl.style.display = t ? 'block' : 'none';
        clearTargetBtn.style.display = t ? 'inline-block' : 'none';
        if (t) {
          targetEl.textContent = `請求先：${t.name}（${t.type === 'member' ? '会員のお客様。LINEでもお知らせします' : '非会員のお客様。お支払いリンクを共有してください'}）`;
          document.getElementById('inv-name').value = t.name;
        }
      }
      clearTargetBtn.addEventListener('click', () => setTarget(null));

      document.getElementById('cust-modal-invoice-btn')?.addEventListener('click', () => {
        if (!currentCustUid) return;
        setTarget({ type: currentCustType === 'manual' ? 'manual' : 'member', id: currentCustUid, name: (document.getElementById('cust-modal-name')?.textContent || '').trim() });
        document.getElementById('customer-detail-modal').style.display = 'none';
        document.querySelector('[data-tab="invoices"]')?.click();
      });

      function render() {
        const unpaid = invoices.filter(i => i.status === 'unpaid');
        document.getElementById('inv-unpaid-total').textContent = yen(unpaid.reduce((a, i) => a + i.amount, 0));
        const month = new Date().toISOString().slice(0, 7);
        document.getElementById('inv-paid-month').textContent = yen(invoices.filter(i => i.status === 'paid' && (i.paid_at || '').slice(0, 7) === month).reduce((a, i) => a + i.amount, 0));
        const rows = showAll ? invoices : unpaid;
        if (!rows.length) { listEl.innerHTML = `<p class="muted" style="font-size:13px;">${showAll ? '請求はまだありません。' : '未払いの請求はありません。'}</p>`; return; }
        const badge = i => {
          if (i.status === 'paid') return `<span style="padding:1px 8px;border-radius:99px;background:#ecfdf5;color:#059669;">${i.paid_method === 'online' ? 'カードで入金済み' : '入金済み（店舗で確認）'}</span>`;
          if (i.status === 'canceled') return '<span style="padding:1px 8px;border-radius:99px;background:#f3f4f6;color:#6b7280;">取り消し</span>';
          if (i.due_date && i.due_date < todayStr()) return '<span style="padding:1px 8px;border-radius:99px;background:#fef2f2;color:#dc2626;">期限切れ・未払い</span>';
          return '<span style="padding:1px 8px;border-radius:99px;background:#fffbeb;color:#b45309;">未払い</span>';
        };
        listEl.innerHTML = rows.map(i => `
          <div style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:12px;">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:14px;">${esc(i.title)}</span>
              <span style="font-weight:800;font-size:14px;">${yen(i.amount)}</span>
              ${badge(i)}
            </div>
            <div class="muted" style="margin-top:2px;">${i.customer_name ? esc(i.customer_name) + ' ・ ' : ''}${esc(i.created_at.slice(0, 10))}作成${i.due_date ? ` ・ 期限 ${esc(i.due_date)}` : ''}${i.note ? ` ・ ${esc(i.note)}` : ''}</div>
            ${i.status === 'unpaid' ? `<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-ghost" data-inv-copy="${esc(i.pay_url)}" style="font-size:12px;padding:4px 10px;">お支払いリンクをコピー</button>
              <button type="button" class="btn btn-ghost" data-inv-paid="${esc(i.id)}" style="font-size:12px;padding:4px 10px;">入金済みにする</button>
              <button type="button" class="btn btn-ghost" data-inv-cancel="${esc(i.id)}" style="font-size:12px;padding:4px 10px;color:#ef4444;">取り消す</button>
            </div>` : ''}
          </div>`).join('');
        listEl.querySelectorAll('[data-inv-copy]').forEach(b => b.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(b.dataset.invCopy); showToast('リンクをコピーしました'); } catch { prompt('このリンクをコピーしてください', b.dataset.invCopy); }
        }));
        listEl.querySelectorAll('[data-inv-paid]').forEach(b => b.addEventListener('click', () => act(b.dataset.invPaid, 'mark_paid', '現金などで受け取った入金として記録します（売上管理にも反映されます）。よろしいですか？')));
        listEl.querySelectorAll('[data-inv-cancel]').forEach(b => b.addEventListener('click', () => act(b.dataset.invCancel, 'cancel', 'この請求を取り消しますか？お支払いリンクも使えなくなります。')));
      }

      async function act(id, action, confirmText) {
        if (!confirm(confirmText)) return;
        const res = await fetch(`/api/provider/invoices/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ action }) });
        if (res.ok) { showToast('更新しました'); load(); }
        else { const d = await res.json().catch(() => ({})); showToast('エラー: ' + (d.error || '不明')); }
      }

      async function load() {
        try {
          const res = await fetch('/api/provider/invoices', { headers: headers() });
          if (!res.ok) { listEl.innerHTML = '<p class="muted" style="font-size:13px;">取得に失敗しました</p>'; return; }
          const d = await res.json();
          invoices = d.invoices || [];
          document.getElementById('inv-not-ready').style.display = d.online_ready ? 'none' : 'block';
          render();
        } catch { listEl.innerHTML = '<p class="muted" style="font-size:13px;">取得に失敗しました</p>'; }
      }

      filterUnpaidBtn.addEventListener('click', () => { showAll = false; filterUnpaidBtn.className = 'btn'; filterAllBtn.className = 'btn btn-ghost'; render(); });
      filterAllBtn.addEventListener('click', () => { showAll = true; filterAllBtn.className = 'btn'; filterUnpaidBtn.className = 'btn btn-ghost'; render(); });

      form.addEventListener('submit', async e => {
        e.preventDefault();
        msgEl.style.color = '#6b7280'; msgEl.textContent = '作成中…';
        const body = {
          title: document.getElementById('inv-title').value,
          amount: document.getElementById('inv-amount').value,
          due_date: document.getElementById('inv-due').value || null,
          note: document.getElementById('inv-note').value || null,
          customer_name: document.getElementById('inv-name').value || null,
        };
        if (target) body[target.type === 'member' ? 'user_id' : 'manual_customer_id'] = target.id;
        const res = await fetch('/api/provider/invoices', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({}));
        if (res.ok) {
          msgEl.style.color = '#059669';
          msgEl.textContent = d.notified ? '請求を作り、お客様にLINEでお知らせしました' : '請求を作りました。リンクをコピーしてお客様に送ってください';
          form.reset(); setTarget(null);
          if (!d.notified) { try { await navigator.clipboard.writeText(d.pay_url); } catch { /* コピーできなくても一覧から取得できる */ } }
          load();
        } else { msgEl.style.color = '#ef4444'; msgEl.textContent = d.error || '作成に失敗しました'; }
      });

      document.querySelectorAll('[data-tab="invoices"]').forEach(btn => btn.addEventListener('click', load));
      if (new URLSearchParams(location.search).get('tab') === 'invoices') load();
    })();

    // ── 予約カレンダータブ（2026-09-11〜12・でお要望、hacomono参考＋今野くんの実地
    //    フィードバックでモバイルは横縦二重スクロールにならない専用UIに） ──────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersCal = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
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
      let businessHoursData = {}; // {mon:{open,close,closed}, ...}。前後1時間の余白帯をグレー表示するために使う
      let closedDatesSet = new Set(); // 臨時休業日（YYYY-MM-DD）
      const WEEKDAY_KEYS_BH = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      async function loadCalendarRange() {
        const [bhRes, closedRes] = await Promise.all([
          fetch('/api/provider/business-hours', { headers: authHeadersCal() }),
          fetch('/api/provider/closed-dates', { headers: authHeadersCal() }),
        ]);
        if (bhRes.ok) {
          const { business_hours } = await bhRes.json();
          businessHoursData = business_hours || {};
        }
        if (closedRes.ok) {
          const rows = await closedRes.json();
          closedDatesSet = new Set((rows || []).map(r => r.date));
        }
        const opens = [], closes = [];
        Object.values(businessHoursData).forEach(h => {
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

      // 定休日（毎週固定の曜日休み）または臨時休業日か（でお確認2026-09-28：
      // 「指名なしとか、トレーニングの枠って営業しない日なら確実に入らないのかな?」に
      // 対応する形で、カレンダー側も休業日をシンプルに「定休日です」と表示するようにした）。
      function isDateClosed(dateStr) {
        if (closedDatesSet.has(dateStr)) return true;
        const d = new Date(`${dateStr}T00:00:00`);
        const hours = businessHoursData[WEEKDAY_KEYS_BH[d.getDay()]];
        return !hours || hours.closed || !hours.open || !hours.close;
      }

      // 表示範囲は営業時間の前後1時間の余白を含む（でお好評：「ナイスアイデア」）。
      // でお要望2026-09-18：その余白（＝営業時間外）をグレーにしてわかりやすくしたい。
      // 表示中の日付の曜日の営業時間から、RANGE内で営業時間外にあたる区間を返す。
      function outOfHoursIntervalsFor(dateStr) {
        const d = new Date(`${dateStr}T00:00:00`);
        const hours = businessHoursData[WEEKDAY_KEYS_BH[d.getDay()]];
        if (!hours || hours.closed || !hours.open || !hours.close) {
          return [{ start: RANGE_START_MIN, end: RANGE_END_MIN }]; // 休業日はRANGE全体が対象外
        }
        const openMin = timeToMinutes(hours.open);
        const closeMin = timeToMinutes(hours.close);
        const out = [];
        if (openMin > RANGE_START_MIN) out.push({ start: RANGE_START_MIN, end: Math.min(openMin, RANGE_END_MIN) });
        if (closeMin < RANGE_END_MIN) out.push({ start: Math.max(closeMin, RANGE_START_MIN), end: RANGE_END_MIN });
        return out;
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
      let classById = {};
      let classList = [];
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
        const [featRes, resRes, clsRes] = await Promise.all([
          fetch('/api/provider/features', { headers: authHeadersCal() }),
          fetch('/api/provider/resources', { headers: authHeadersCal() }),
          fetch('/api/provider/classes', { headers: authHeadersCal() }),
        ]);
        if (featRes.ok) { const { features } = await featRes.json(); resourceFeatureOn = !!features?.resource_management; shiftFeatureOn = !!features?.shift_management; }
        if (resRes.ok) { const rows = await resRes.json(); resourceList = (rows || []).filter(r => r.active !== false); }
        if (clsRes.ok) { classList = await clsRes.json(); (classList || []).forEach(c => { classById[c.id] = c.name; }); }
      }

      // スタッフの休憩・外出ブロック＋（シフト管理ONの店舗のみ）確定シフトの勤務時間帯を
      // 表示中の週分まとめて取得する（でお要望2026-09-14：「出勤してないスタッフの枠は
      // 予約が入らないように自動でブロックしてカレンダーでもグレーで帯をかけて」）。
      async function loadStaffBlocksAndShifts() {
        const dates = weekDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        // shiftFeatureOnの判定（/api/provider/features）を待たずに呼べるよう、常に両方
        // 並列で取得しておき、使うかどうかだけ後段でshiftFeatureOnを見て決める
        // （でお報告2026-09-16：「グループレッスンを入れる前から遅かった」。初回読み込みで
        // 「機能設定を先に確認してからシフトを取れるか判断する」という直列待ちが不要な
        // 通信のために全体を遅らせていた）。シフト管理未使用の店舗にも1回余分な問い合わせが
        // 増えるが、対象テーブルが空でごく軽いため実害はない。
        const [staffBlocksRes, shiftRes] = await Promise.all([
          fetch(`/api/provider/staff-blocks?from=${from}&to=${to}`, { headers: authHeadersCal() }),
          fetch(`/api/provider/shift-entries/for-range?from=${from}&to=${to}`, { headers: authHeadersCal() }),
        ]);
        staffBlocksCache = staffBlocksRes.ok ? await staffBlocksRes.json() : [];

        shiftWindowsByStaffDate = {};
        shiftCoveredDates = new Set();
        if (shiftFeatureOn && shiftRes?.ok) {
          const { entries, coveredPeriods } = await shiftRes.json();
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
        // シフト未確定日（このstoreがシフト管理を使っていて、かつこの日を確定シフト期間が
        // 一件もカバーしていない）は、その日は誰も出勤予定が無い＝1日丸ごと予約不可
        // （でお要望2026-09-27「シフトを出していないから予約できないようになってるのであれば
        // 該当時間の予約カレンダーはグレーで表示して」。lib/shift-availability.jsの
        // isOutsideShift()の「!coveredDates.has(date) → ブロック」と同じ判定をここでも揃える）。
        if (shiftFeatureOn && !shiftCoveredDates.has(dateStr)) {
          return [{ start: RANGE_START_MIN, end: RANGE_END_MIN, kind: 'offshift' }];
        }
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

      // 指定日、そのスタッフが丸ごと出勤予定なし（＝グリッド上は全区間グレーになる）かどうか。
      // でお指摘2026-09-29：「シフト登録されてない時は黒塗りっていうより、表示されてないと
      // 見やすい。スタッフが増えると大変だと思う」への対応で、列を隠す判定に使う。
      function isStaffOffThisDay(staffId, dateStr) {
        if (!shiftFeatureOn || !staffId) return false;
        if (!shiftCoveredDates.has(dateStr)) return true;
        const windows = (shiftWindowsByStaffDate[staffId] && shiftWindowsByStaffDate[staffId][dateStr]) || [];
        return !windows.length;
      }

      // カレンダー最下部の「本日お休みのスタッフ」折りたたみ（でお要望2026-09-29：
      // 「急にシフトが変わったとか間違ってた時にカレンダーからすぐに変更ができる」ように、
      // 列を隠すだけでなくここから確認・シフト編集へすぐ飛べるようにする）。
      // でお指摘2026-09-29「カレンダーのUIと同じものにしてほしい」を受け、独自デザインの
      // 行リストではなく、実際のカレンダーと全く同じ列描画（buildGridHtml等）を
      // そのまま流用する——見た目が完全に一致する（グレー帯の出方・列幅・ヘッダー等）。
      function renderOffStaff(offStaffColumns, items) {
        const el = document.getElementById('cal-off-staff');
        if (!el) return;
        if (!offStaffColumns.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
        el.style.display = 'block';
        const horizontal = dashboardPrefs?.calendar_axis === 'time-x';
        const innerHtml = horizontal ? buildGridHtmlHorizontal(items, offStaffColumns) : buildGridHtml(items, offStaffColumns);
        el.innerHTML = `
          <details class="cal-off-staff-details">
            <summary style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12.5px;font-weight:700;color:#6b7280;padding:8px 4px">
              <span>本日お休みのスタッフ（${offStaffColumns.length}名）</span>
              <button type="button" class="btn btn-ghost" style="font-size:11px;padding:4px 10px" id="cal-off-staff-edit-link">シフトを編集する</button>
            </summary>
            <div class="${horizontal ? 'cal-day-grid-h' : 'cal-day-grid'}" style="margin-top:8px">${innerHtml}</div>
          </details>
        `;
        bindCalOpenHandlers(el);
        bindCalEmptyHandlers(el);
        bindGreyBandHandlers(el);
        document.getElementById('cal-off-staff-edit-link')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation(); // <summary>内のボタンなので、開閉トグルへのクリック伝播を止める
          document.querySelector('.tab-btn[data-tab="shift"]')?.click();
        });
      }

      function renderPills() {
        const dateJumpEl = document.getElementById('cal-date-jump');
        if (dateJumpEl) dateJumpEl.value = selectedDate || '';
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
          const shortLabel = isBlock ? '休憩・外出' : '勤務外';
          const labelHtml = size >= 24 ? `<span class="cal-grey-band-label">${esc(shortLabel)}</span>` : '';
          // でお報告2026-09-26で確定した重大バグの修正：extraClassの前にスペースが
          // 無かったため、class="cal-grey-band-h"のように1つの単語に連結されてしまい、
          // 本来別クラスであるはずの基底.cal-grey-band（position:absolute等を持つ）が
          // 一切適用されていなかった。結果position:staticのまま描画され、left/top等の
          // インラインstyleが完全に無視されて常にレーン先頭（左端/上端）に表示され、
          // backgroundも透明で見えなくなっていた（休憩・外出ブロックが「左端に出る」
          // 「消えない」問題の本当の原因）。
          return `<div class="cal-grey-band cal-grey-band${extraClass}${isBlock ? ' is-deletable' : ''}" style="${posKey}:${pos}px;${sizeKey}:${size}px" title="${esc(label)}"${isBlock ? ` data-staff-block-id="${iv.id}"` : ''}>${labelHtml}</div>`;
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
      // グループレッスン専用ビュー（でお要望2026-09-16：「予約カレンダーの中に
      // 「グループレッスン」というタブを1個作ってほしい」）。列＝クラス、
      // ブロック＝そのクラスの開催回（予約枠）。個別のお客様ごとではなく
      // 1開催回＝1ブロックで、残り枠数を表示する。
      function classColumns() {
        return classList.map(c => ({ key: 'cls_' + c.id, id: c.id, name: c.name, groupKey: 'class_id' }));
      }
      // 「スタッフ×部屋」合体ビューの列の並び順を自由に変更できるように（でお要望
      // 2026-09-17：「まとまってるところの順番を自由に変えられるように。部屋が先に
      // 表示できるとか」）。店舗ごとの並び順設定（dashboardPrefs.calendar_column_order、
      // "staff:<id>"/"resource:<id>"のトークン配列）があればそれに従い、無い列は
      // 元の並び（スタッフ→部屋）のまま末尾に追加する。
      function columnToken(col) { return `${col.groupKey === 'staff_id' ? 'staff' : 'resource'}:${col.id || 'unassigned'}`; }
      function applySavedColumnOrder(columns) {
        const order = dashboardPrefs?.calendar_column_order;
        if (!order || !order.length) return columns;
        const rank = new Map(order.map((t, i) => [t, i]));
        return columns
          .map((col, i) => ({ col, r: rank.has(columnToken(col)) ? rank.get(columnToken(col)) : order.length + i }))
          .sort((a, b) => a.r - b.r)
          .map(x => x.col);
      }
      function currentColumns() {
        if (viewMode === 'combined') return applySavedColumnOrder([...staffColumns(), ...resourceColumns()]);
        if (viewMode === 'resource') return resourceColumns();
        if (viewMode === 'class') return classColumns();
        return staffColumns();
      }

      // 時間×スタッフ（または部屋、または合体）のグリッドHTMLを組み立てる共通関数。
      // 各列が自分のgroupKey（'staff_id'|'resource_id'）を持ち、その列で予約を
      // 絞り込む（でお要望2026-09-12：スタッフ別/部屋別カレンダーの切り替え／
      // でお要望2026-09-14：両方を同時に列として並べる合体ビュー）。
      // 現在時刻の線（でお要望2026-09-15：「今の時間のところに自動で動いてくれると
      // ありがたい。今の時間は赤いラインとか出るとよりわかりやすい」）。表示中の日付が
      // 今日の時だけ出す。
      function nowMinutesLocal() {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      }
      function isShowingNowLine() {
        const nowMin = nowMinutesLocal();
        return selectedDate === todayStr && nowMin >= RANGE_START_MIN && nowMin <= RANGE_END_MIN;
      }

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
            // グループレッスンの開催回は個別のお客様ではなく1開催回＝1ブロック。
            // 残り枠数を表示する（でお要望2026-09-16：「カレンダー内のコマには
            // 残りの枠数を表示させてほしい」）。
            if (r._isClassSession) {
              const csHeight = Math.max(30, (durationOf(r) / totalMin) * totalHeight);
              return `
                <div class="cal-block is-class-session${!r.is_open ? ' is-closed' : ''}" style="top:${top}px;height:${csHeight}px" data-cal-open="${r.id}">
                  <strong>${r.time ? r.time.slice(0, 5) : ''}</strong>${esc(r.class_name || '')}<span class="cal-block-tag">残り${r.remaining}/${r.capacity}枠${!r.is_open ? '・締切中' : ''}</span>
                </div>
              `;
            }
            // スタッフ列で、お客様の指名ではなく店舗が後から割り当てた予約は色・表記を変える
            // （でお要望2026-09-12：指名予約と見分けたい）。実際の担当スタッフ列でのみ意味を持つ
            // 区別のため、col.groupKeyがstaff_idかつ「指名なし」バケット以外の列でだけ適用する。
            const isManualAssign = col.groupKey === 'staff_id' && col.id !== null && r.staff_manually_assigned;
            const isPending = r.status === 'pending' || r.status === 'counter_proposed';
            const classTag = r.class_id && classById[r.class_id] ? `<span class="cal-block-tag">${esc(classById[r.class_id])}</span>` : '';
            const tagsHtml = `${classTag}${isManualAssign ? '<span class="cal-block-tag">（指名なし）</span>' : ''}${r._choiceLabel ? `<span class="cal-block-tag">（${r._choiceLabel}・返答待ち）</span>` : isPending ? '<span class="cal-block-tag">（返答待ち）</span>' : ''}`;
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
        const nowLineHtml = isShowingNowLine()
          ? `<div class="cal-now-line" style="top:${((nowMinutesLocal() - RANGE_START_MIN) / totalMin) * totalHeight}px"></div>`
          : '';
        const outOfHoursHtml = outOfHoursIntervalsFor(selectedDate).map(iv => {
          const top = ((iv.start - RANGE_START_MIN) / totalMin) * totalHeight;
          const height = ((iv.end - iv.start) / totalMin) * totalHeight;
          return `<div class="cal-outofhours-band cal-outofhours-band-v" style="top:${top}px;height:${height}px" title="営業時間外"></div>`;
        }).join('');
        return `
          <div class="cal-grid-inner" style="grid-template-columns:${gridTemplateColumns}">
            <div class="cal-time-col-spacer"></div>
            ${headerCellsHtml}
            ${timeColHtml}
            ${outOfHoursHtml}
            ${bodyColsHtml}
            ${nowLineHtml}
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
            if (r._isClassSession) {
              return `
                <div class="cal-block-h is-class-session${!r.is_open ? ' is-closed' : ''}" style="left:${left}px;width:${width}px" data-cal-open="${r.id}">
                  <strong>${r.time ? r.time.slice(0, 5) : ''}</strong>${esc(r.class_name || '')}<span class="cal-block-tag">残り${r.remaining}/${r.capacity}枠${!r.is_open ? '・締切中' : ''}</span>
                </div>
              `;
            }
            const isManualAssign = col.groupKey === 'staff_id' && col.id !== null && r.staff_manually_assigned;
            const isPending = r.status === 'pending' || r.status === 'counter_proposed';
            const classTagH = r.class_id && classById[r.class_id] ? `<span class="cal-block-tag">${esc(classById[r.class_id])}</span>` : '';
            return `
              <div class="cal-block-h${r.status === 'visited' ? ' is-visited' : ''}${isManualAssign ? ' is-manual-assign' : ''}${isPending ? ' is-pending' : ''}" style="left:${left}px;width:${width}px" data-cal-open="${r.id}">
                <strong>${r.time ? r.time.slice(0, 5) : ''}</strong>${esc(r.user_name || '')}${classTagH}${isManualAssign ? '<span class="cal-block-tag">（指名なし）</span>' : ''}${r._choiceLabel ? `<span class="cal-block-tag">（${r._choiceLabel}・返答待ち）</span>` : isPending ? '<span class="cal-block-tag">（返答待ち）</span>' : ''}
              </div>
            `;
          }).join('');
          const greyHtml = greyBandsHtml(col, totalMin, totalWidth, 'left', 'width', '-h');
          return `
            <div class="cal-row-name-h${col.groupKey === 'resource_id' ? ' is-resource-head' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}" style="height:${rowH}px">${esc(col.name)}</div>
            <div class="cal-lane${col.groupKey === 'resource_id' ? ' is-resource-col' : ''}${i === firstResourceIdx ? ' is-group-start' : ''}" style="height:${rowH}px;width:${totalWidth}px" data-cal-col-id="${col.id || ''}" data-cal-col-group="${col.groupKey}">${vLines}${greyHtml}${blocksHtml}</div>
          `;
        }).join('');

        const nowLineHtmlH = isShowingNowLine()
          ? `<div class="cal-now-line-h" style="left:${nameColWidth + ((nowMinutesLocal() - RANGE_START_MIN) / totalMin) * totalWidth}px"></div>`
          : '';
        const outOfHoursHtmlH = outOfHoursIntervalsFor(selectedDate).map(iv => {
          const left = nameColWidth + ((iv.start - RANGE_START_MIN) / totalMin) * totalWidth;
          const width = ((iv.end - iv.start) / totalMin) * totalWidth;
          return `<div class="cal-outofhours-band cal-outofhours-band-h" style="left:${left}px;width:${width}px" title="営業時間外"></div>`;
        }).join('');
        return `
          <div class="cal-grid-inner-h" style="grid-template-columns:${nameColWidth}px ${totalWidth}px">
            <div class="cal-hour-head-spacer"></div>
            ${hourHeadHtml}
            ${outOfHoursHtmlH}
            ${rowsHtml}
            ${nowLineHtmlH}
          </div>
        `;
      }

      // でお要望2026-09-15：「今の時間のところに自動で動いてくれるとありがたい」。
      // 表示中の日付が今日の時だけ、現在時刻が画面上部から1/3あたりに来るように
      // スクロールする。60秒ごとの定期再描画（下のsetInterval）では、線の位置は
      // 更新しつつユーザーが自分でスクロールした位置を奪わないよう据え置く。
      function renderDesktopGrid(opts = {}) {
        if (!gridWrapEl) return;
        const items = byDate[selectedDate] || [];
        const horizontal = dashboardPrefs?.calendar_axis === 'time-x';
        const prevScrollTop = gridWrapEl.scrollTop;
        const prevScrollLeft = gridWrapEl.scrollLeft;
        gridWrapEl.className = horizontal ? 'cal-day-grid-h' : 'cal-day-grid';
        // 定休日・臨時休業日はシンプルに「定休日です」とだけ出す（でお要望2026-09-28。
        // hacomonoの表示にならい、既に予約が入っている日は通常のグリッドのまま見せる）。
        if (!items.length && isDateClosed(selectedDate)) {
          gridWrapEl.innerHTML = '<div style="padding:18px 20px;background:#eff6ff;border-radius:10px;color:#1d4ed8;font-size:13.5px;font-weight:700">定休日です。</div>';
          renderOffStaff([], items);
          return;
        }
        // シフト未登録のスタッフは列を丸ごと隠し、代わりに下の折りたたみにまとめる
        // （でお指摘2026-09-29：「黒塗りっていうより、表示されてないと見やすい。
        // スタッフが増えると大変だと思う」）。指名なし列・部屋列はそのまま残す。
        const offStaffColumns = [];
        const columns = currentColumns().filter(col => {
          if (col.groupKey !== 'staff_id' || col.id == null) return true;
          if (!isStaffOffThisDay(col.id, selectedDate)) return true;
          offStaffColumns.push(col);
          return false;
        });
        renderOffStaff(offStaffColumns, items);
        if (viewMode === 'class' && columns.length === 0) {
          gridWrapEl.innerHTML = '<p class="muted" style="font-size:13px;padding:20px">まだグループレッスンがありません。「クラス管理」タブでクラスを作成してください。</p>';
          return;
        }
        if (columns.length === 0) {
          gridWrapEl.innerHTML = '<p class="muted" style="font-size:13px;padding:20px">本日出勤予定のスタッフがいません。下の「お休みのスタッフ」から確認・編集できます。</p>';
          return;
        }
        gridWrapEl.innerHTML = horizontal
          ? buildGridHtmlHorizontal(items, columns)
          : buildGridHtml(items, columns);
        bindCalOpenHandlers(gridWrapEl);
        bindCalEmptyHandlers(gridWrapEl);
        bindGreyBandHandlers(gridWrapEl);

        if (opts.preserveScroll) {
          gridWrapEl.scrollTop = prevScrollTop;
          gridWrapEl.scrollLeft = prevScrollLeft;
        } else if (isShowingNowLine()) {
          requestAnimationFrame(() => {
            const line = gridWrapEl.querySelector('.cal-now-line, .cal-now-line-h');
            if (!line) return;
            if (horizontal) {
              const left = parseFloat(line.style.left) || 0;
              gridWrapEl.scrollLeft = Math.max(0, left - gridWrapEl.clientWidth / 3);
            } else {
              const top = parseFloat(line.style.top) || 0;
              gridWrapEl.scrollTop = Math.max(0, top - gridWrapEl.clientHeight / 3);
            }
          });
        }
      }
      // 現在時刻の線を毎分更新する（データの再取得はせず表示中のキャッシュから
      // 再描画するだけの軽い処理。ユーザーのスクロール位置は保つ）。
      setInterval(() => { if (selectedDate === todayStr) renderDesktopGrid({ preserveScroll: true }); }, 60000);

      function renderViewToggle() {
        if (!viewToggleEl) return;
        const hasClasses = classList.length > 0;
        if (!resourceFeatureOn && !hasClasses) { viewToggleEl.style.display = 'none'; return; }
        viewToggleEl.style.display = 'flex';
        viewToggleEl.innerHTML = `
          ${resourceFeatureOn ? `
            <button type="button" class="btn ${viewMode === 'combined' ? '' : 'btn-ghost'}" data-cal-view="combined" style="font-size:12px;padding:6px 12px">スタッフ×部屋</button>
            <button type="button" class="btn ${viewMode === 'staff' ? '' : 'btn-ghost'}" data-cal-view="staff" style="font-size:12px;padding:6px 12px">スタッフ別</button>
            <button type="button" class="btn ${viewMode === 'resource' ? '' : 'btn-ghost'}" data-cal-view="resource" style="font-size:12px;padding:6px 12px">部屋別</button>
          ` : (hasClasses ? `<button type="button" class="btn ${viewMode !== 'class' ? '' : 'btn-ghost'}" data-cal-view="staff" style="font-size:12px;padding:6px 12px">予約カレンダー</button>` : '')}
          ${hasClasses ? `<button type="button" class="btn ${viewMode === 'class' ? '' : 'btn-ghost'}" data-cal-view="class" style="font-size:12px;padding:6px 12px">グループレッスン</button>` : ''}
        `;
        viewToggleEl.querySelectorAll('[data-cal-view]').forEach(btn => btn.addEventListener('click', () => {
          viewMode = btn.dataset.calView;
          viewModePicked = true;
          renderViewToggle();
          renderDesktopGrid();
        }));
        // 「列の並び順」は表示モード選択の1つに見えないよう、別の行に独立させている
        // （でお報告2026-09-18）。
        const columnOrderRowEl = document.getElementById('cal-column-order-row');
        if (columnOrderRowEl) columnOrderRowEl.style.display = resourceFeatureOn ? 'block' : 'none';
      }

      // 「スタッフ×部屋」列の並び替え（でお要望2026-09-17）。その場で使う設定なので、
      // カレンダー画面から直接開けるようにする（別タブに置いて遠回りさせない）。
      const columnOrderModalEl = document.getElementById('cal-column-order-modal');
      const columnOrderListEl = document.getElementById('cal-column-order-list');
      let columnOrderDraft = [];
      function renderColumnOrderList() {
        if (!columnOrderListEl) return;
        columnOrderListEl.innerHTML = columnOrderDraft.map((col, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--color-bg);border-radius:8px;margin-bottom:6px">
            <span style="flex:1;font-size:13px;font-weight:600">${esc(col.name)}${col.groupKey === 'resource_id' ? '<span class="muted" style="font-size:11px;margin-left:6px">部屋</span>' : '<span class="muted" style="font-size:11px;margin-left:6px">スタッフ</span>'}</span>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-col-up="${i}"${i === 0 ? ' disabled' : ''}>↑</button>
            <button type="button" class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-col-down="${i}"${i === columnOrderDraft.length - 1 ? ' disabled' : ''}>↓</button>
          </div>
        `).join('');
        columnOrderListEl.querySelectorAll('[data-col-up]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.colUp);
          [columnOrderDraft[i - 1], columnOrderDraft[i]] = [columnOrderDraft[i], columnOrderDraft[i - 1]];
          renderColumnOrderList();
        }));
        columnOrderListEl.querySelectorAll('[data-col-down]').forEach(btn => btn.addEventListener('click', () => {
          const i = Number(btn.dataset.colDown);
          [columnOrderDraft[i + 1], columnOrderDraft[i]] = [columnOrderDraft[i], columnOrderDraft[i + 1]];
          renderColumnOrderList();
        }));
      }
      function openColumnOrderModal() {
        if (!columnOrderModalEl) return;
        columnOrderDraft = applySavedColumnOrder([...staffColumns(), ...resourceColumns()]);
        renderColumnOrderList();
        columnOrderModalEl.style.display = 'flex';
      }
      document.getElementById('cal-column-order-btn')?.addEventListener('click', openColumnOrderModal);
      document.getElementById('cal-column-order-close')?.addEventListener('click', () => { if (columnOrderModalEl) columnOrderModalEl.style.display = 'none'; });
      columnOrderModalEl?.addEventListener('click', (e) => { if (e.target === columnOrderModalEl) columnOrderModalEl.style.display = 'none'; });
      document.getElementById('cal-column-order-save')?.addEventListener('click', async () => {
        const order = columnOrderDraft.map(columnToken);
        const res = await fetch('/api/provider/dashboard-prefs', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
          body: JSON.stringify({ calendar_column_order: order }),
        });
        if (!res.ok) { showToast('保存に失敗しました'); return; }
        const { prefs } = await res.json();
        dashboardPrefs = prefs;
        if (columnOrderModalEl) columnOrderModalEl.style.display = 'none';
        showToast('列の並び順を保存しました');
        renderDay();
      });

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

      // 予約データの取得のみ行い、描画はしない（でお報告2026-09-16：「グループレッスンを
      // 入れる前から遅かった」。初回読み込みは元々「スタッフ/部屋/クラス/機能/営業時間の
      // 設定データを全部待ってから、休憩ブロック取得→カレンダー本体取得の順に直列で
      // 進む」という3段階の直列待ちになっていたのが体感速度の主要因だった。設定データと
      // 週データを同時に取りにいけるよう、取得と描画を分離する）。戻り値はfalseで失敗。
      async function loadWeekData() {
        const dates = weekDates();
        const from = fmtDate(dates[0]);
        const to = fmtDate(dates[6]);
        if (labelEl) labelEl.textContent = `${from} 〜 ${to}`;
        const [, res] = await Promise.all([
          loadStaffBlocksAndShifts(),
          fetch(`/api/provider/calendar?from=${from}&to=${to}`, { headers: authHeadersCal() }),
        ]);
        if (!res.ok) { if (gridWrapEl) gridWrapEl.innerHTML = authErrorHtml(res); return false; }
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
        // ただし対象は今日以降に限る——過去日（today未満）にしか予約が無い場合まで
        // フォールバックしてしまうと、今日が9/15なのに過去の9/14が表示され続ける
        // 不具合になっていた（でお報告2026-09-15：「予約カレンダーの日付がズレてる」）。
        if (!userPickedDate && !(byDate[selectedDate] || []).length) {
          const withData = dates.map(fmtDate).filter(d => d >= todayStr && (byDate[d] || []).length);
          if (withData.length) selectedDate = withData[0];
        }
        return true;
      }

      async function loadWeek() {
        const ok = await loadWeekData();
        if (ok === false) return;
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
      const manualModeClassBtn = document.getElementById('cal-manual-mode-class');
      const manualReservationFieldsEl = document.getElementById('cal-manual-reservation-fields');
      const manualReservationFields2El = document.getElementById('cal-manual-reservation-fields-2');
      const manualBlockFieldsEl = document.getElementById('cal-manual-block-fields');
      const manualBlockReasonEl = document.getElementById('cal-manual-block-reason');
      const manualBlockStartEl = document.getElementById('cal-manual-block-start');
      const manualBlockEndEl = document.getElementById('cal-manual-block-end');
      const manualClassFieldsEl = document.getElementById('cal-manual-class-fields');
      const manualClassEl = document.getElementById('cal-manual-class');
      const manualClassStartEl = document.getElementById('cal-manual-class-start');
      const manualClassEndEl = document.getElementById('cal-manual-class-end');
      const manualClassCapacityEl = document.getElementById('cal-manual-class-capacity');
      let manualCtx = null; // { date, time, userId, mode: 'reservation'|'block'|'class' }

      // 予約追加／休憩・外出ブロック／グループレッスン作成のモード切替
      // （でお要望2026-09-14・2026-09-16）。
      function setManualMode(mode) {
        if (manualCtx) manualCtx.mode = mode;
        const isBlock = mode === 'block';
        const isClass = mode === 'class';
        if (manualReservationFieldsEl) manualReservationFieldsEl.style.display = (isBlock || isClass) ? 'none' : '';
        if (manualReservationFields2El) manualReservationFields2El.style.display = (isBlock || isClass) ? 'none' : '';
        if (manualBlockFieldsEl) manualBlockFieldsEl.style.display = isBlock ? '' : 'none';
        if (manualClassFieldsEl) manualClassFieldsEl.style.display = isClass ? '' : 'none';
        if (manualResourceFieldEl) manualResourceFieldEl.style.display = (!isBlock && resourceFeatureOn) ? '' : 'none';
        if (manualModeReservationBtn) manualModeReservationBtn.className = `btn ${mode === 'reservation' ? '' : 'btn-ghost'}`;
        if (manualModeBlockBtn) manualModeBlockBtn.className = `btn ${isBlock ? '' : 'btn-ghost'}`;
        if (manualModeClassBtn) manualModeClassBtn.className = `btn ${isClass ? '' : 'btn-ghost'}`;
        if (manualSaveBtn) manualSaveBtn.textContent = isBlock ? 'この時間をブロックする' : isClass ? 'この内容でグループレッスンを作成' : 'この内容で予約を追加';
      }
      manualModeReservationBtn?.addEventListener('click', () => setManualMode('reservation'));
      manualModeBlockBtn?.addEventListener('click', () => setManualMode('block'));
      manualModeClassBtn?.addEventListener('click', () => setManualMode('class'));

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
        // グループレッスン用のクラス選択肢。「グループレッスン」ビューの列をタップした場合は
        // その列＝そのクラスなので事前選択する（でお要望2026-09-16）。
        if (manualClassEl) {
          manualClassEl.innerHTML = classList.length
            ? classList.map(c => `<option value="${c.id}"${colGroupKey === 'class_id' && c.id === colId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')
            : '<option value="">クラスがありません</option>';
        }
        if (manualClassStartEl) manualClassStartEl.value = time;
        if (manualClassEndEl) {
          const endMin = Math.min(RANGE_END_MIN, clamped + 60);
          manualClassEndEl.value = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
        }
        if (manualClassCapacityEl) manualClassCapacityEl.value = '';
        const isClassColumn = colGroupKey === 'class_id';
        // 部屋列をタップして開いた場合は「休憩・外出ブロック」は意味を持たない
        // （ブロックはスタッフ単位のみ）ため、予約追加モード固定でボタン自体を隠す。
        // 「グループレッスン」ビューの列をタップした場合は、その場でクラスが確定している
        // ためグループレッスン作成一択にし、他モードのボタンごと隠す。
        if (manualModeBlockBtn) manualModeBlockBtn.style.display = (colGroupKey === 'resource_id' || isClassColumn) ? 'none' : '';
        if (manualModeReservationBtn) manualModeReservationBtn.style.display = isClassColumn ? 'none' : '';
        if (manualModeClassBtn) manualModeClassBtn.style.display = classList.length ? '' : 'none';
        setManualMode(isClassColumn ? 'class' : 'reservation');
        if (manualModalEl) manualModalEl.style.display = 'flex';
        setTimeout(() => { if (isClassColumn) manualClassEl?.focus(); else manualNameEl?.focus(); }, 50);
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

      // グループレッスンの開催回ブロックをタップした時の詳細（でお要望2026-09-16）。
      // 個別のお客様モーダルではなく、締切/再開・削除だけのシンプルな管理モーダル。
      const csModalEl = document.getElementById('cal-class-session-modal');
      const csTitleEl = document.getElementById('cal-cs-title');
      const csInfoEl = document.getElementById('cal-cs-info');
      const csToggleBtn = document.getElementById('cal-cs-toggle');
      const csDeleteBtn = document.getElementById('cal-cs-delete');
      const csMsgEl = document.getElementById('cal-cs-msg');
      let csCtx = null;
      function openClassSessionModal(r) {
        csCtx = r;
        if (csTitleEl) csTitleEl.textContent = `${r.class_name || ''}`;
        if (csInfoEl) csInfoEl.textContent = `${r.date} ${r.time ? r.time.slice(0, 5) : ''}〜${r.end_time ? r.end_time.slice(0, 5) : ''}／予約 ${r.booked}/${r.capacity}名${!r.is_open ? '（締切中）' : ''}`;
        if (csToggleBtn) csToggleBtn.textContent = r.is_open ? 'この回を締め切る' : 'この回を再開する';
        if (csMsgEl) csMsgEl.textContent = '';
        if (csModalEl) csModalEl.style.display = 'flex';
      }
      document.getElementById('cal-cs-close')?.addEventListener('click', () => { if (csModalEl) csModalEl.style.display = 'none'; });
      csModalEl?.addEventListener('click', (e) => { if (e.target === csModalEl) csModalEl.style.display = 'none'; });
      csToggleBtn?.addEventListener('click', async () => {
        if (!csCtx) return;
        const res = await fetch(`/api/provider/classes/${csCtx.class_id}/sessions/${csCtx.slot_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeadersCal() }, body: JSON.stringify({ is_open: !csCtx.is_open }) });
        if (res.ok) { if (csModalEl) csModalEl.style.display = 'none'; showToast('更新しました'); loadWeek(); }
        else { const e = await res.json().catch(() => ({})); if (csMsgEl) { csMsgEl.style.color = '#ef4444'; csMsgEl.textContent = e.error || '更新に失敗しました'; } }
      });
      csDeleteBtn?.addEventListener('click', async () => {
        if (!csCtx) return;
        if (!confirm('この開催回を削除しますか？')) return;
        const res = await fetch(`/api/provider/classes/${csCtx.class_id}/sessions/${csCtx.slot_id}`, { method: 'DELETE', headers: authHeadersCal() });
        if (res.ok) { if (csModalEl) csModalEl.style.display = 'none'; showToast('削除しました'); loadWeek(); }
        else { const e = await res.json().catch(() => ({})); if (csMsgEl) { csMsgEl.style.color = '#ef4444'; csMsgEl.textContent = e.error || '削除に失敗しました'; } }
      });

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
        if (manualCtx.mode === 'class') {
          const classId = manualClassEl?.value || '';
          const start_time = manualClassStartEl?.value || '';
          const end_time = manualClassEndEl?.value || '';
          if (!classId) { if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = 'クラスを選んでください'; } return; }
          if (!start_time || !end_time || start_time >= end_time) { if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = '開始・終了時刻を正しく入力してください'; } return; }
          manualSaveBtn.disabled = true;
          if (manualMsgEl) { manualMsgEl.style.color = ''; manualMsgEl.textContent = '保存中…'; }
          const res = await fetch(`/api/provider/classes/${classId}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeadersCal() },
            body: JSON.stringify({
              date: manualCtx.date, start_time, end_time,
              capacity: manualClassCapacityEl?.value || '',
              staff_id: manualStaffEl?.value || null,
              resource_id: resourceFeatureOn ? (manualResourceEl?.value || null) : null,
            }),
          });
          manualSaveBtn.disabled = false;
          if (!res.ok) { const e = await res.json().catch(() => ({})); if (manualMsgEl) { manualMsgEl.style.color = '#ef4444'; manualMsgEl.textContent = e.error || '保存に失敗しました'; } return; }
          if (manualModalEl) manualModalEl.style.display = 'none';
          showToast('グループレッスンを作成しました');
          await loadWeek();
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
          if (r._isClassSession) { openClassSessionModal(r); return; }
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
            ${r.class_id && classById[r.class_id] ? `<div style="margin-top:4px;font-size:12.5px;font-weight:700;color:#16a34a">${esc(classById[r.class_id])}</div>` : ''}
            ${r.note ? `<p class="muted" style="margin:6px 0 0;font-size:12.5px">${esc(r.note)}</p>` : ''}
            ${r.user_id ? '<button type="button" class="btn btn-ghost" id="cal-modal-open-cust-btn" style="font-size:12px;padding:5px 12px;margin-top:8px">顧客情報を見る（カルテ・回数券など）</button>' : `
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

      // 日付を直接選んで一気に飛ぶ（でお要望2026-09-28）。
      const dateJumpInput = document.getElementById('cal-date-jump');
      dateJumpInput?.addEventListener('change', (e) => {
        const v = e.target.value;
        if (!v) return;
        weekStart = mondayOf(new Date(`${v}T00:00:00`));
        selectedDate = v;
        userPickedDate = true;
        loadWeek();
      });

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
        // 設定データ（スタッフ/部屋/クラス/機能/営業時間）と、その週の予約データは
        // 互いに依存しないため同時に取得する（でお報告2026-09-16：「グループレッスンを
        // 入れる前から遅かった」。従来は設定データを全部待ってから週データの取得を
        // 始めていたため、直列2段階分の待ち時間がそのままカレンダー表示の遅さになっていた）。
        const [weekOk] = await Promise.all([loadWeekData(), loadStaff(), loadResourcesAndFeatures(), loadCalendarRange()]);
        renderViewToggle();
        if (weekOk !== false) { renderPills(); renderDay(); }
        window.__pdMarkTabReady?.('calendar');
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
      const authHeadersToday = () => ({ Authorization: `Bearer ${getSupabaseToken()}` });
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
        const el = document.getElementById('today-checkin-list');
        if (!el) return;
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

      // 以下4つは任意追加カード（でお要望2026-10-01「他にもいろんなカードを追加できる
      // ように」）。いずれも既存タブのAPIをそのまま再利用するだけで新規エンドポイントは
      // 増やしていない。
      const STATUS_LABEL_TODAY_REF = { pending: '来店待ち', completed: '来店済み・特典対象' };
      async function loadTodayReferrals() {
        const el = document.getElementById('today-referrals-list');
        if (!el) return;
        const res = await fetch('/api/provider/referrals', { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { el.innerHTML = '<p class="muted" style="font-size:13px">まだ紹介実績はありません。</p>'; return; }
        const pendingCount = rows.filter(r => r.status === 'pending').length;
        el.innerHTML = `<p style="margin:0 0 8px;font-size:20px;font-weight:800">${pendingCount}件<span style="font-size:12px;font-weight:400;color:#6b7280">来店待ち</span></p>` +
          rows.slice(0, 5).map(r => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
              <span style="flex:1"><strong>${esc(r.referrer_name)}</strong>さん → ${esc(r.referred_name || '(お名前不明)')}</span>
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:${r.status === 'completed' ? '#f0fdf4' : '#fffbeb'};color:${r.status === 'completed' ? '#16a34a' : '#d97706'}">${STATUS_LABEL_TODAY_REF[r.status] || r.status}</span>
            </div>
          `).join('');
      }

      async function loadTodayEvents() {
        const el = document.getElementById('today-events-list');
        if (!el) return;
        const res = await fetch('/api/provider/events', { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        const upcoming = rows.filter(r => r.event_date >= todayStr).sort((a, b) => a.event_date.localeCompare(b.event_date));
        if (!upcoming.length) { el.innerHTML = '<p class="muted" style="font-size:13px">予定されているイベントはありません。</p>'; return; }
        el.innerHTML = upcoming.slice(0, 3).map(e => `
          <div style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
            <div><strong>${esc(e.title)}</strong><span class="muted" style="font-size:12px;margin-left:6px">${esc(e.event_date)}${e.start_time ? ' ' + esc(e.start_time.slice(0, 5)) : ''}</span></div>
            <div class="muted" style="font-size:12px;margin-top:2px">出席 ${e.counts.attending}／招待 ${e.counts.invited}／欠席 ${e.counts.declined}</div>
          </div>
        `).join('');
      }

      async function loadTodayDormant() {
        const el = document.getElementById('today-dormant-list');
        if (!el) return;
        const res = await fetch('/api/provider/customers', { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        const dormant = rows.filter(r => r.status === 'dormant');
        if (!dormant.length) { el.innerHTML = '<p class="muted" style="font-size:13px">休眠中のお客様はいません。</p>'; return; }
        el.innerHTML = `<p style="margin:0 0 8px;font-size:20px;font-weight:800">${dormant.length}名</p>` +
          dormant.slice(0, 5).map(c => `<div style="padding:4px 0;font-size:13px">${esc(c.customer_name)}</div>`).join('') +
          (dormant.length > 5 ? `<p class="muted" style="font-size:12px;margin-top:4px">他${dormant.length - 5}名</p>` : '');
      }

      async function loadTodayClasses() {
        const el = document.getElementById('today-classes-list');
        if (!el) return;
        const res = await fetch('/api/provider/classes', { headers: authHeadersToday() });
        if (!res.ok) { el.innerHTML = authErrorHtml(res); return; }
        const rows = await res.json();
        if (!rows.length) { el.innerHTML = '<p class="muted" style="font-size:13px">まだクラスがありません。</p>'; return; }
        el.innerHTML = rows.map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
            <span>${esc(c.name)}</span>
            <span class="muted" style="font-size:12px">${c.enrolledCount}名${c.capacity ? `／定員${c.capacity}名` : ''}${c.waitlistedCount ? `（待機${c.waitlistedCount}名）` : ''}</span>
          </div>
        `).join('');
      }

      // ── 「今日の業務」カードのカスタム編集（でお要望2026-10-01：「店舗側で何を表示
      // させるかの選択や並び替え、メモを入れるブロックやポップアップで表示させる選択とか
      // 自由度を高めたやつ」）。provider_appeal_blocksと同じ「provider所有・sort_order付き
      // CRUDリスト」の設計を踏襲。公開ページ向けではない（掲載者本人しか見ない）ため
      // 公開read APIは作らず、このダッシュボードの認証済みAPIのみ。
      let todayBlocks = [];
      let todayEditMode = false;
      let todayFeaturesCache = null;

      const BUILTIN_TODAY_DEFS = {
        builtin_reservations: { title: '今日の予約', gotoTab: 'calendar', gotoLabel: 'カレンダーを開く', mountId: 'today-reservations-list' },
        builtin_requests: { title: '未対応の予約リクエスト', gotoTab: 'requests', gotoLabel: '予約リクエストを開く', mountId: 'today-requests-list' },
        builtin_checkin: { title: '今日のチェックイン', gotoTab: 'checkin', gotoLabel: 'チェックインを開く', mountId: 'today-checkin-list', featureGate: 'checkin_qr' },
        builtin_sales: { title: '今日の売上', gotoTab: 'sales', gotoLabel: '売上管理を開く' },
        // 任意追加カード（でお要望2026-10-01）
        builtin_referrals: { title: '紹介実績', gotoTab: 'member-referral', gotoLabel: '友達紹介タブを開く', mountId: 'today-referrals-list' },
        builtin_events: { title: 'イベント出欠', gotoTab: 'events', gotoLabel: '出欠確認タブを開く', mountId: 'today-events-list', featureGate: 'attendance_confirm' },
        builtin_dormant: { title: '休眠顧客アラート', gotoTab: 'customers', gotoLabel: '顧客管理タブを開く', mountId: 'today-dormant-list' },
        builtin_classes: { title: 'クラスの状況', gotoTab: 'classes', gotoLabel: 'クラス管理タブを開く', mountId: 'today-classes-list', featureGate: 'class_management' },
      };
      // 「＋カードを追加」で選べる任意カード一覧（1枚まで・削除可）。常設4カードは含めない。
      const ADDABLE_TODAY_TYPES = [
        { type: 'builtin_referrals', label: '紹介実績' },
        { type: 'builtin_events', label: 'イベント出欠', featureGate: 'attendance_confirm' },
        { type: 'builtin_dormant', label: '休眠顧客アラート' },
        { type: 'builtin_classes', label: 'クラスの状況', featureGate: 'class_management' },
      ];

      async function loadTodayFeatures() {
        if (todayFeaturesCache) return todayFeaturesCache;
        const res = await fetch('/api/provider/features', { headers: authHeadersToday() });
        if (!res.ok) return {};
        const { features } = await res.json();
        todayFeaturesCache = features || {};
        return todayFeaturesCache;
      }

      async function loadTodayBlocks() {
        const res = await fetch('/api/provider/today-blocks', { headers: authHeadersToday() });
        todayBlocks = res.ok ? await res.json() : [];
      }

      function todayControlsHtml(b, idx, total) {
        if (!todayEditMode) return '';
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px dashed #e5e7eb;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;cursor:pointer">
              <input type="checkbox" data-today-hidden="${b.id}"${b.hidden ? ' checked' : ''} /> 非表示
            </label>
            <select data-today-display="${b.id}" style="font-size:11px;padding:2px 4px;border-radius:6px">
              <option value="inline"${b.display_mode !== 'popup' ? ' selected' : ''}>通常表示</option>
              <option value="popup"${b.display_mode === 'popup' ? ' selected' : ''}>ポップアップ表示</option>
            </select>
            <button type="button" class="btn btn-ghost" style="font-size:10px;padding:2px 6px" data-today-up="${b.id}"${idx === 0 ? ' disabled' : ''}>↑</button>
            <button type="button" class="btn btn-ghost" style="font-size:10px;padding:2px 6px" data-today-down="${b.id}"${idx === total - 1 ? ' disabled' : ''}>↓</button>
            ${b.block_type === 'memo' ? `<button type="button" class="btn btn-ghost" style="font-size:10px;padding:2px 6px;color:#ef4444" data-today-del="${b.id}">削除</button>` : ''}
          </div>`;
      }

      function todayCardShellHtml(b, idx, total) {
        if (b.block_type === 'memo') {
          return `
            <div class="card" style="padding:20px" data-today-block="${b.id}">
              <h3 style="margin:0 0 10px;font-size:15px">📝 メモ</h3>
              <textarea data-today-memo-text="${b.id}" rows="4" style="width:100%;box-sizing:border-box" placeholder="今日気をつけること・引き継ぎ事項など">${esc(b.content?.text || '')}</textarea>
              <button type="button" class="btn" style="font-size:12px;margin-top:8px" data-today-memo-save="${b.id}">保存</button>
              <span data-today-memo-msg style="font-size:11px;margin-left:8px"></span>
              ${todayControlsHtml(b, idx, total)}
            </div>`;
        }
        const def = BUILTIN_TODAY_DEFS[b.block_type];
        if (!def) return '';
        const bodyHtml = b.block_type === 'builtin_sales'
          ? `<div class="stat-card" style="display:inline-block;min-width:160px"><div class="stat-value" id="today-sales-total">—</div><div class="stat-label">本日の確定売上</div></div>`
          : `<div id="${def.mountId}"><p class="muted" style="font-size:13px">読み込み中…</p></div>`;
        return `
          <div class="card" style="padding:20px" data-today-block="${b.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <h3 style="margin:0;font-size:15px">${def.title}</h3>
              <button type="button" class="btn btn-ghost" data-today-goto="${def.gotoTab}" style="font-size:12px;padding:5px 10px">${def.gotoLabel}</button>
            </div>
            ${bodyHtml}
            ${todayControlsHtml(b, idx, total)}
          </div>`;
      }

      async function swapTodayOrder(id, dir) {
        const idx = todayBlocks.findIndex(b => b.id === id);
        const otherIdx = idx + dir;
        if (idx < 0 || otherIdx < 0 || otherIdx >= todayBlocks.length) return;
        const a = todayBlocks[idx], b = todayBlocks[otherIdx];
        await Promise.all([
          fetch(`/api/provider/today-blocks/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ sort_order: b.sort_order }) }),
          fetch(`/api/provider/today-blocks/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ sort_order: a.sort_order }) }),
        ]);
      }

      function bindTodayShellControls(root) {
        root.querySelectorAll('[data-today-goto]').forEach(btn => btn.addEventListener('click', () => {
          document.querySelector(`.tab-btn[data-tab="${btn.dataset.todayGoto}"]`)?.click();
        }));
        root.querySelectorAll('[data-today-hidden]').forEach(cb => cb.addEventListener('change', async () => {
          await fetch(`/api/provider/today-blocks/${cb.dataset.todayHidden}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ hidden: cb.checked }) });
          await loadTodayBlocks(); renderToday();
        }));
        root.querySelectorAll('[data-today-display]').forEach(sel => sel.addEventListener('change', async () => {
          await fetch(`/api/provider/today-blocks/${sel.dataset.todayDisplay}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ display_mode: sel.value }) });
          await loadTodayBlocks(); renderToday();
        }));
        root.querySelectorAll('[data-today-up]').forEach(btn => btn.addEventListener('click', async () => { await swapTodayOrder(btn.dataset.todayUp, -1); await loadTodayBlocks(); renderToday(); }));
        root.querySelectorAll('[data-today-down]').forEach(btn => btn.addEventListener('click', async () => { await swapTodayOrder(btn.dataset.todayDown, 1); await loadTodayBlocks(); renderToday(); }));
        root.querySelectorAll('[data-today-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このメモを削除しますか？')) return;
          await fetch(`/api/provider/today-blocks/${btn.dataset.todayDel}`, { method: 'DELETE', headers: authHeadersToday() });
          await loadTodayBlocks(); renderToday();
        }));
        root.querySelectorAll('[data-today-memo-save]').forEach(btn => btn.addEventListener('click', async () => {
          const id = btn.dataset.todayMemoSave;
          const textarea = root.querySelector(`[data-today-memo-text="${id}"]`);
          const msgSpan = root.querySelector(`[data-today-block="${id}"] [data-today-memo-msg]`);
          btn.disabled = true;
          const res = await fetch(`/api/provider/today-blocks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ content: { text: textarea?.value || '' } }) });
          btn.disabled = false;
          if (msgSpan) { msgSpan.style.color = res.ok ? '#059669' : '#ef4444'; msgSpan.textContent = res.ok ? '✓ 保存しました' : '保存に失敗しました'; }
          if (res.ok) await loadTodayBlocks();
        }));
      }

      function showTodayPopup(popupBlocks) {
        const existing = document.getElementById('today-popup-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'today-popup-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:18px;padding:24px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h2 style="font-size:16px;font-weight:800;margin:0">本日のお知らせ</h2>
              <button type="button" id="today-popup-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af">×</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${popupBlocks.map((b, i) => todayCardShellHtml(b, i, popupBlocks.length)).join('')}
            </div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#today-popup-close-btn')?.addEventListener('click', () => overlay.remove());
        bindTodayShellControls(overlay);
      }

      async function renderToday() {
        const listEl = document.getElementById('today-blocks-list');
        if (!listEl) return;
        const features = await loadTodayFeatures();
        const visible = todayBlocks.filter(b => {
          const def = BUILTIN_TODAY_DEFS[b.block_type];
          return !(def?.featureGate && !features[def.featureGate]);
        });
        const activeInline = visible.filter(b => !b.hidden && b.display_mode !== 'popup');
        const activePopup = visible.filter(b => !b.hidden && b.display_mode === 'popup');
        // 編集モード中は非表示・ポップアップ設定のブロックも薄く表示する
        // （「どこで戻すか分からない」状態を避けるため）
        const listed = todayEditMode ? visible : activeInline;
        listEl.innerHTML = listed.length
          ? listed.map((b, i) => {
              const dimmed = todayEditMode && (b.hidden || b.display_mode === 'popup');
              return `<div style="${dimmed ? 'opacity:0.55' : ''}">${todayCardShellHtml(b, i, listed.length)}</div>`;
            }).join('')
          : '<p class="muted" style="font-size:13px">表示するカードがありません。「⚙ このページをカスタマイズ」から表示を戻せます。</p>';
        bindTodayShellControls(listEl);

        const LOADER_BY_TYPE = {
          builtin_reservations: loadTodayReservations, builtin_requests: loadTodayRequests,
          builtin_checkin: loadTodayCheckins, builtin_sales: loadTodaySales,
          builtin_referrals: loadTodayReferrals, builtin_events: loadTodayEvents,
          builtin_dormant: loadTodayDormant, builtin_classes: loadTodayClasses,
        };
        const loaders = visible.filter(b => !b.hidden).map(b => LOADER_BY_TYPE[b.block_type]?.()).filter(Boolean);
        await Promise.all(loaders);

        if (activePopup.length && !todayEditMode) showTodayPopup(activePopup);
        renderAddCardMenu(features);
      }

      // 「＋カードを追加」メニュー（でお要望2026-10-01「他にもいろんなカードを追加できる
      // ように」）。メモは何枚でも追加可、ADDABLE_TODAY_TYPESの任意カードは既に追加済み・
      // 機能OFFのものをボタン一覧から除外する。
      function renderAddCardMenu(features) {
        const wrap = document.getElementById('today-add-memo-wrap');
        if (!wrap) return;
        const existingTypes = new Set(todayBlocks.map(b => b.block_type));
        const available = ADDABLE_TODAY_TYPES.filter(t => !existingTypes.has(t.type) && !(t.featureGate && !features[t.featureGate]));
        wrap.innerHTML = `
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost" id="today-add-memo-btn" style="font-size:13px">＋ メモを追加</button>
            ${available.map(t => `<button type="button" class="btn btn-ghost" style="font-size:13px" data-today-add-type="${t.type}">＋ ${esc(t.label)}</button>`).join('')}
          </div>`;
        document.getElementById('today-add-memo-btn')?.addEventListener('click', async () => {
          const res = await fetch('/api/provider/today-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ block_type: 'memo', content: { text: '' } }) });
          if (res.ok) { await loadTodayBlocks(); renderToday(); } else showToast('メモの追加に失敗しました');
        });
        wrap.querySelectorAll('[data-today-add-type]').forEach(btn => btn.addEventListener('click', async () => {
          const res = await fetch('/api/provider/today-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeadersToday() }, body: JSON.stringify({ block_type: btn.dataset.todayAddType }) });
          if (res.ok) { await loadTodayBlocks(); renderToday(); } else { const e = await res.json().catch(() => ({})); showToast('エラー: ' + (e.error || '追加に失敗しました')); }
        }));
      }

      document.getElementById('today-customize-toggle')?.addEventListener('click', () => {
        todayEditMode = !todayEditMode;
        const toggleBtn = document.getElementById('today-customize-toggle');
        if (toggleBtn) toggleBtn.textContent = todayEditMode ? '✓ 完了' : '⚙ このページをカスタマイズ';
        const addWrap = document.getElementById('today-add-memo-wrap');
        if (addWrap) addWrap.style.display = todayEditMode ? 'block' : 'none';
        renderToday();
      });
      function loadToday() {
        loadTodayBlocks().then(renderToday).then(() => window.__pdMarkTabReady?.('today'));
      }

      document.querySelectorAll('[data-tab="today"]').forEach(btn => btn.addEventListener('click', loadToday, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'today' || document.getElementById('tab-today')?.classList.contains('active')) loadToday();
    })();

    // ── POS・在庫タブ（Phase 3・hacomono/STORES網羅計画） ──────────
    (() => {
      const token = getSupabaseToken();
      if (!token) return;
      const authHeadersPos = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` });

      const gridEl = document.getElementById('pos-product-grid');
      const cartListEl = document.getElementById('pos-cart-list');
      const cartTotalEl = document.getElementById('pos-cart-total');
      const checkoutBtn = document.getElementById('pos-checkout-btn');
      const onlineCheckoutBtn = document.getElementById('pos-online-checkout-btn');
      const onlineCheckoutBox = document.getElementById('pos-online-checkout-box');
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
        if (onlineCheckoutBtn) onlineCheckoutBtn.disabled = !cart.length;
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

      let onlineCheckoutPollId = null;
      function stopOnlineCheckoutPoll() {
        if (onlineCheckoutPollId) { clearTimeout(onlineCheckoutPollId); onlineCheckoutPollId = null; }
      }

      if (onlineCheckoutBtn) {
        onlineCheckoutBtn.addEventListener('click', async () => {
          if (!cart.length) return;
          stopOnlineCheckoutPoll();
          onlineCheckoutBtn.disabled = true;
          if (checkoutMsg) checkoutMsg.textContent = '';
          if (onlineCheckoutBox) { onlineCheckoutBox.style.display = 'block'; onlineCheckoutBox.innerHTML = '<p class="muted" style="font-size:13px;">決済リンクを発行中…</p>'; }
          try {
            const res = await fetch('/api/provider/pos/online-checkout', {
              method: 'POST',
              headers: authHeadersPos(),
              body: JSON.stringify({
                items: cart.map(c => ({ product_id: c.product_id, qty: c.qty })),
                staff_id: staffSel?.value || null,
                memo: document.getElementById('pos-payment')?.value || null,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              onlineCheckoutBtn.disabled = !cart.length;
              if (onlineCheckoutBox) onlineCheckoutBox.innerHTML = `<p style="font-size:13px;color:#ef4444;">${esc(data?.error || 'オンライン決済リンクの発行に失敗しました')}</p>`;
              return;
            }
            const QRCode = (await import('qrcode')).default || (await import('qrcode'));
            const dataUrl = await QRCode.toDataURL(data.url, { width: 220, margin: 1, color: { dark: '#0a0f1e', light: '#ffffff' } });
            if (onlineCheckoutBox) {
              onlineCheckoutBox.innerHTML = `
                <img src="${dataUrl}" alt="オンライン決済QRコード" style="width:180px;height:180px;border-radius:12px;background:#fff;padding:10px;" />
                <p class="muted" style="font-size:12px;margin-top:8px;">お客様にこのQRを読み取っていただくか、リンクを共有してください。</p>
                <p class="muted" style="font-size:12px;word-break:break-all;">${esc(data.url)}</p>
                <p id="pos-online-checkout-status" style="font-size:13px;font-weight:700;margin-top:8px;">支払い待ちです…</p>
              `;
            }
            const pendingId = data.pending_id;
            const poll = async () => {
              const r = await fetch(`/api/provider/pos/online-checkout/${pendingId}`, { headers: authHeadersPos() });
              if (!r.ok) { onlineCheckoutPollId = setTimeout(poll, 3000); return; }
              const p = await r.json();
              const statusEl = document.getElementById('pos-online-checkout-status');
              if (p.status === 'paid') {
                if (statusEl) { statusEl.textContent = 'お支払いが完了しました'; statusEl.style.color = '#22c55e'; }
                onlineCheckoutBtn.disabled = false;
                cart = [];
                renderCart();
                showToast('オンライン決済が完了しました');
                loadProducts();
                loadTransactions();
                return;
              }
              if (p.status === 'failed') {
                if (statusEl) { statusEl.textContent = 'お支払いの確認でエラーが発生しました'; statusEl.style.color = '#ef4444'; }
                onlineCheckoutBtn.disabled = !cart.length;
                return;
              }
              onlineCheckoutPollId = setTimeout(poll, 3000);
            };
            poll();
          } catch {
            onlineCheckoutBtn.disabled = !cart.length;
            if (onlineCheckoutBox) onlineCheckoutBox.innerHTML = '<p style="font-size:13px;color:#ef4444;">オンライン決済リンクの発行に失敗しました</p>';
          }
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
      const authHeadersCk = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` });

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
        if (data.matched_reservation_id) {
          showToast(`✓ ${data.customer_name} をチェックイン（本日の予約も来店確認済み）`);
          window.showVisitModal?.(data.matched_reservation_id, { alreadyVisited: true });
        } else {
          showToast(`✓ ${data.customer_name} をチェックインしました`);
        }
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
      const authHeadersEv = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSupabaseToken()}` });

      const listEl = document.getElementById('ev-list');
      const inviteCard = document.getElementById('ev-invite-card');
      const inviteTitleEl = document.getElementById('ev-invite-title');
      const inviteUserSel = document.getElementById('ev-invite-user');
      const attendanceListEl = document.getElementById('ev-attendance-list');
      const inviteMsg = document.getElementById('ev-invite-msg');

      let events = [];
      let currentEventId = null;
      let uploadedEventImageUrl = null;

      function renderList() {
        if (!listEl) return;
        if (!events.length) { listEl.innerHTML = '<p class="muted" style="font-size:13px">まだイベントがありません。上のフォームから作成してください。</p>'; return; }
        listEl.innerHTML = events.map(e => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">
            ${e.image_url ? `<img src="${esc(e.image_url)}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0" />` : ''}
            <div style="flex:1;min-width:0">
              <strong style="font-size:13px">${esc(e.title)}</strong>
              <span class="muted" style="font-size:12px;margin-left:8px">${e.event_date}${e.start_time ? ' ' + e.start_time : ''} ／ 参加${e.counts.attending}・不参加${e.counts.declined}・未回答${e.counts.invited}</span>
              ${e.memo ? `<div class="muted" style="font-size:12px;margin-top:2px;white-space:pre-wrap">${esc(e.memo)}</div>` : ''}
            </div>
            <button class="btn btn-ghost" style="font-size:11px;padding:6px 12px" data-ev-open="${e.id}">出欠を確認する</button>
            <button class="btn btn-ghost" style="font-size:11px;padding:6px 12px;color:#ef4444" data-ev-del="${e.id}">削除</button>
          </div>
        `).join('');
        listEl.querySelectorAll('[data-ev-open]').forEach(btn => btn.addEventListener('click', () => openInvite(btn.dataset.evOpen)));
        listEl.querySelectorAll('[data-ev-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このイベントを削除しますか？出欠回答も削除されます。')) return;
          await fetch(`/api/provider/events/${btn.dataset.evDel}`, { method: 'DELETE', headers: authHeadersEv() });
          loadEvents();
        }));
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

      // イベント画像アップロード（でお要望2026-09-15）。選択した瞬間にアップロードして
      // URLを確定させ、作成ボタンを押した時にそのURLを一緒に送る。
      document.getElementById('ev-image-input')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        const msgEl = document.getElementById('ev-image-msg');
        const previewEl = document.getElementById('ev-image-preview');
        if (!file) return;
        if (msgEl) { msgEl.style.color = ''; msgEl.textContent = 'アップロード中…'; }
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch('/api/provider/events/upload-image', {
          method: 'POST', headers: { Authorization: `Bearer ${getSupabaseToken()}` }, body: fd,
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = 'エラー: ' + (err.error || '不明'); } return; }
        const { url } = await res.json();
        uploadedEventImageUrl = url;
        if (previewEl) { previewEl.style.display = 'block'; previewEl.querySelector('img').src = url; }
        if (msgEl) { msgEl.style.color = '#4ade80'; msgEl.textContent = '✓ アップロードしました'; }
      });

      document.getElementById('ev-create-btn')?.addEventListener('click', async () => {
        const title = document.getElementById('ev-title')?.value.trim();
        const eventDate = document.getElementById('ev-date')?.value;
        const startTime = document.getElementById('ev-time')?.value;
        const memo = document.getElementById('ev-memo')?.value.trim();
        if (!title || !eventDate) { showToast('イベント名と日付を入力してください'); return; }
        const res = await fetch('/api/provider/events', {
          method: 'POST', headers: authHeadersEv(), body: JSON.stringify({ title, event_date: eventDate, start_time: startTime || null, memo: memo || null, image_url: uploadedEventImageUrl }),
        });
        if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
        document.getElementById('ev-title').value = '';
        document.getElementById('ev-date').value = '';
        document.getElementById('ev-time').value = '';
        document.getElementById('ev-memo').value = '';
        document.getElementById('ev-image-input').value = '';
        document.getElementById('ev-image-preview').style.display = 'none';
        document.getElementById('ev-image-msg').textContent = '';
        uploadedEventImageUrl = null;
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
            <h3 style="margin:0 0 8px;font-size:14px;">${escSc(a.label)} <span style="font-size:10px;font-weight:700;color:#c9a84c;">このお店専用</span></h3>
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
            statusEl.textContent = `一部の軸が貴店専用の内容に更新されています（最終更新: ${new Date(data.generatedAt).toLocaleDateString('ja-JP')}）`;
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
      clearInterval(sessionKeepAlive);
      window.fetch = rawFetch;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
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
      <style>{DASHBOARD_CSS}</style>

      {/* 初回読み込み中は画面が何も無いページのように見えるというでお報告（2026-09-28）
          への対応。データ取得が終わり次第（またはタイムアウト時）JSでdisplay:noneにする。 */}
      <div id="pd-global-loading" className="pd-global-loading">
        <div className="pd-spinner" />
      </div>

      <div className="pd-container">

        {/* モバイル用トップバー。よく使うタブへのショートカット（でお要望2026-09-14：
            「よく使うメニューを3つくらいここ（ヘッダー）に置いてあげると使いやすいかも。
            カスタムできたらもっといい」）を店舗ごとにカスタマイズして表示する。 */}
        <div className="pd-topbar">
          <button type="button" id="pd-menu-btn" aria-label="メニューを開く" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: '#c9a84c', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>☰</button>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: '#c9a84c', flexShrink: 0 }}>Fineme</p>
          <div id="pd-topbar-shortcuts" style={{ display: 'flex', gap: 6, marginLeft: 'auto', overflowX: 'auto' }}></div>
        </div>
        <div id="pd-backdrop" className="pd-backdrop" />

        <div className="pd-layout">
          {/* サイドバー */}
          <div className="tab-nav" id="pd-sidebar">
            <div style={{ padding: '0 12px', marginBottom: 14 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>Fineme</p>
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
                {/* OFFにした機能のタブをまとめる場所（でお要望2026-09-16：「非表示にしたやつは
                    非表示というタブを作ってまとめておくといい」）。中身が無い間はJS側で隠す。 */}
                <button type="button" className="pd-rail-btn" data-category="hidden" id="pd-rail-hidden-btn" style={{ display: 'none' }}>非表示</button>
              </div>
              <div className="pd-rail-panel">
                <div className="pd-panel-section" data-panel="home" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="today">今日の業務</button>
                  <button className="tab-btn" data-tab="stats">概況</button>
                  <button className="tab-btn" data-tab="consultant" data-feature="ai_consultant">AIコンサル<span className="feature-off-badge" data-feature-badge></span></button>
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
                  <button className="tab-btn" data-tab="broadcast-email">一斉メール配信</button>
                  <button className="tab-btn" data-tab="reviews" data-feature="review_request">クチコミ<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="visit-settings">来店設定</button>
                  {/* 回数券は日々の売上集計ではなく「顧客ごとの発行・消化を管理する台帳」の
                      性質が強いため、売上カテゴリーから顧客管理カテゴリーへ移動
                      （でお指摘2026-09-13：「本当に売上タブ内が適切か？」）。
                      ロッカーも同じ理由（顧客ごとの契約管理台帳）で顧客管理に置く
                      （でお指摘2026-09-14）。 */}
                  <button className="tab-btn" data-tab="packages" data-feature="customer_packages">回数券<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="lockers" data-feature="locker_rental">ロッカー管理<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="memberships" data-feature="membership_enrollment">入会手続き<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="sales" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="sales">売上管理</button>
                  <button className="tab-btn" data-tab="invoices">請求</button>
                  <button className="tab-btn" data-tab="pos" data-feature="pos">POS・在庫<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="store" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="profile">プロフィール</button>
                  <button className="tab-btn" data-tab="appeal-settings">アピール設定</button>
                  <button className="tab-btn" data-tab="page-design">ページデザイン</button>
                  <button className="tab-btn" data-tab="business-hours">営業時間</button>
                  <button className="tab-btn" data-tab="service">サービス設定</button>
                  <button className="tab-btn" data-tab="staff">スタッフ</button>
                  <button className="tab-btn" data-tab="shift" data-feature="shift_management">シフト管理<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="classes" data-feature="class_management">クラス管理<span className="feature-off-badge" data-feature-badge></span></button>
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
                  <button className="tab-btn" data-tab="member-referral" data-feature="referral_program">友達紹介<span className="feature-off-badge" data-feature-badge></span></button>
                </div>
                <div className="pd-panel-section" data-panel="account" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="line-channel" data-feature="line_channel">LINE連携<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="features">機能設定</button>
                  <button className="tab-btn" data-tab="activity-log" data-feature="activity_log">操作ログ<span className="feature-off-badge" data-feature-badge></span></button>
                  <button className="tab-btn" data-tab="display-settings">表示設定</button>
                  <button className="tab-btn" data-tab="billing" style={{ borderLeft: '3px solid #2f4f8f' }}>Fineme利用契約</button>
                  <button type="button" className="tab-btn" id="pd-logout-btn" style={{ color: '#ef4444' }}>ログアウト</button>
                </div>
                <div className="pd-panel-section" data-panel="tutorial" style={{ display: 'none' }}>
                  <button className="tab-btn" data-tab="tutorial">チュートリアル</button>
                </div>
                {/* OFFの機能タブはJS側（機能フラグ振り分け）がここへ移動してくる。空欄でOK。 */}
                <div className="pd-panel-section" data-panel="hidden" style={{ display: 'none' }}></div>
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
            {/* でお要望2026-10-01：「何を表示させるかの選択や並び替え、メモを入れるブロックや
                ポップアップで表示させる選択とか自由度を高めたやつ」。カード自体はJS側で
                today-blocks-listの中に動的に構築する（並び替え・非表示・表示方法の設定は
                provider_today_blocksで管理）。日常使いの邪魔にならないよう、並び替え等の
                操作UIは「⚙ このページをカスタマイズ」を押した時だけ表示する。 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" id="today-customize-toggle" style={{ fontSize: '12px' }}>⚙ このページをカスタマイズ</button>
            </div>
            <div id="today-blocks-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p className="muted" style={{ fontSize: '13px' }}>読み込み中…</p>
            </div>
            <div id="today-add-memo-wrap" style={{ display: 'none' }}></div>
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
                <a href="/business/provider-guide" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>PDFで見る ↗</a>
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
              <span style={{ fontSize: '22px' }}></span>
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
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost" id="cal-prev-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>← 前週</button>
                <button type="button" className="btn btn-ghost" id="cal-today-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>今日に戻る</button>
                <button type="button" className="btn btn-ghost" id="cal-next-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>次週 →</button>
                {/* 遠い日付へ一気に飛べるよう、ネイティブの日付ピッカーをその場で開く
                    （でお要望2026-09-28：「何月って書いてあるボタンとかで押したら、その次の
                    カレンダーがポップアップで開いて違う日に飛べるボタンもあるといい」）。
                    隠し入力+showPicker()方式はAndroid Chromeで反応しないことがあった
                    （でお報告2026-09-28）ため、input自体を小さく見せてタップ＝ピッカーが
                    開くネイティブ挙動にそのまま乗る、より確実な方式に変更。日付の数字だけ
                    だと何のための欄か分からない（でお報告2026-09-28）ため、ラベルを添える。 */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(26,20,16,0.6)' }}>
                  日付選択
                  <input type="date" id="cal-date-jump" style={{ fontSize: '12px', padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: '8px', background: '#fff', color: 'inherit' }} />
                </label>
              </div>
            </div>

            {/* 部屋・設備管理をONにした店舗のみ、スタッフ別/部屋別カレンダーを切り替えられる（でお要望2026-09-12） */}
            <div id="cal-view-toggle" style={{ display: 'none', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}></div>

            {/* 日付ピル：PC・スマホ共通で選んだ1日を切り替える */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div id="cal-day-pills" className="cal-day-pills" style={{ flex: 1 }}></div>
              <button type="button" className="btn btn-ghost" id="cal-agenda-popup-btn" style={{ fontSize: '12px', padding: '6px 12px', flexShrink: 0 }}>予約一覧</button>
            </div>

            {/* 時間×スタッフのグリッド（hacomono参考）。PC・スマホ共通の1つのグリッドで、
                横スクロールでスタッフ列を、縦スクロールで時間帯を確認する。640px以下は
                でお要望（2026-09-12）でスタッフ列を狭くし、画面内に3〜4人分見える形に調整。 */}
            <div id="cal-day-grid" className="cal-day-grid"></div>
            <p className="muted" style={{ fontSize: '11px', margin: '8px 0 0' }}>※ 所要時間は即時予約の枠・メニューを選択した予約は正確に表示、メニュー未選択の予約は目安表示です</p>

            {/* シフト未登録のスタッフは列ごとグレーで塗りつぶすより、スタッフが多い店舗では
                かえって見づらいというでお指摘（2026-09-29：「シフト登録されてない時は
                黒塗りっていうより、表示されてないと見やすい」）。列自体は非表示にし、
                代わりにカレンダー最下部の折りたたみにまとめる（でお要望：「急にシフトが
                変わったとか間違ってた時にカレンダーからすぐに変更ができる」ように）。 */}
            <div id="cal-off-staff" style={{ display: 'none', marginTop: '10px' }}></div>

            {/* 「列の並び順」は表示モードの選択肢と並べるとボタンの1つに見えてしまい紛らわしい
                （でお報告2026-09-18：「列の順はここじゃない気がする。赤丸のボタンは下に
                持っていくべきかな」）ため別の行に分け、さらにカレンダー本体の下に移動した
                （でお要望2026-09-18：「予約カレンダーの下に移動して」）。 */}
            <div id="cal-column-order-row" style={{ display: 'none', marginTop: '14px' }}>
              <button type="button" className="btn btn-ghost" id="cal-column-order-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>列の並び順を変更</button>
            </div>
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
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button type="button" className="btn" id="cal-manual-mode-reservation" style={{ fontSize: '12.5px', padding: '7px 12px', flex: 1 }}>予約を追加</button>
              <button type="button" className="btn btn-ghost" id="cal-manual-mode-block" style={{ fontSize: '12.5px', padding: '7px 12px', flex: 1 }}>休憩・外出をブロック</button>
              <button type="button" className="btn btn-ghost" id="cal-manual-mode-class" style={{ fontSize: '12.5px', padding: '7px 12px', flex: 1 }}>グループレッスンを作成</button>
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

            {/* グループレッスンの開催回をカレンダーから直接作成（でお要望2026-09-16：
                「空いてるところをタップしたらイベントを作るみたいなのが出てきて、
                そこでグループレッスンを選べるやつもつけてほしい」） */}
            <div id="cal-manual-class-fields" style={{ display: 'none' }}>
              <div className="form-field">
                <label>クラス *</label>
                <select id="cal-manual-class"></select>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ flex: '1 1 120px' }}><label>開始</label><input type="time" id="cal-manual-class-start" /></div>
                <div className="form-field" style={{ flex: '1 1 120px' }}><label>終了</label><input type="time" id="cal-manual-class-end" /></div>
                <div className="form-field" style={{ flex: '1 1 100px' }}><label>定員</label><input type="number" min="1" id="cal-manual-class-capacity" placeholder="クラス既定" /></div>
              </div>
            </div>
            <button type="button" className="btn" id="cal-manual-save" style={{ fontSize: '13px', padding: '9px 18px', width: '100%' }}>この内容で予約を追加</button>
            <p id="cal-manual-msg" className="muted" style={{ fontSize: '12px', margin: '8px 0 0' }}></p>
          </div>
        </div>

        {/* グループレッスンの開催回ブロックをタップした時の詳細（でお要望2026-09-16） */}
        <div id="cal-class-session-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 id="cal-cs-title" style={{ margin: 0, fontSize: '15px' }}></h3>
              <button type="button" className="btn btn-ghost" id="cal-cs-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <p id="cal-cs-info" className="muted" style={{ fontSize: '13px', margin: '0 0 14px' }}></p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" id="cal-cs-toggle" style={{ fontSize: '12.5px', padding: '7px 14px' }}></button>
              <button type="button" className="btn btn-ghost" id="cal-cs-delete" style={{ fontSize: '12.5px', padding: '7px 14px', color: '#ef4444' }}>削除</button>
            </div>
            <p id="cal-cs-msg" className="muted" style={{ fontSize: '12px', margin: '8px 0 0' }}></p>
          </div>
        </div>

        {/* 「スタッフ×部屋」列の並び替え（でお要望2026-09-17：「まとまってるところの
            順番を自由に変えられるように。部屋が先に表示できるとか」） */}
        <div id="cal-column-order-modal" className="cal-modal-overlay" style={{ display: 'none' }}>
          <div className="cal-modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>列の並び順</h3>
              <button type="button" className="btn btn-ghost" id="cal-column-order-close" style={{ fontSize: '12px', padding: '5px 10px' }}>閉じる</button>
            </div>
            <p className="muted" style={{ fontSize: '12.5px', margin: '0 0 12px' }}>「スタッフ×部屋」表示での列の並び順を変更できます。矢印で入れ替えてください。</p>
            <div id="cal-column-order-list"></div>
            <button type="button" className="btn" id="cal-column-order-save" style={{ marginTop: '10px' }}>この並び順で保存する</button>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '0 4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input id="req-filter-unread" type="checkbox" style={{ accentColor: '#c9a84c' }} />
                未読のみ
              </label>
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
          {/* でお要望2026-09-29：編集画面から公開ページ（お客様が見る画面）をすぐ確認できるように */}
          <div style={{ marginBottom: '16px' }}>
            <a id="profile-view-page-btn" href="#" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>公開ページを確認 ↗</a>
          </div>
          {/* ページ完成度スコア */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: '16px' }}>
            <div id="page-score-bar">
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.5)' }}>ページ完成度を計算中…</div>
            </div>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>基本情報</h2>
            <p className="muted" style={{ fontSize: '12.5px', margin: '0 0 16px' }}>キャッチコピーや理念などのアピール文言は「アピール設定」タブへ移動しました。ここは住所・営業時間・料金など事実情報のみです。</p>
            <form id="profile-form">
              <div className="form-field"><label>掲載名 *</label><input name="name" required /></div>
              <div className="form-field">
                <label>プロフィール写真（ヒーロー内に円形アバターとして表示）</label>
                <div id="photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="photo-preview" src="" alt="現在の写真" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>写真を選択・変更（5MB以内・jpg/png/webp）</button>
                <p id="photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" />
              </div>
              <div className="form-field">
                <label>ヒーロー画像（ページ上部の背景バナー）</label>
                <div id="cover-photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="cover-photo-preview" src="" alt="カバー画像" style={{ width: '100%', maxHeight: '130px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="cover-photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="cover-photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>カバー画像を選択（横長比推奨・jpg/png/webp）</button>
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
                入力した住所は公開ページの「基本情報」タブに表示され、地図リンクも自動生成されます。AIマッチングの距離計算にも使われるため、番地まで入力するほど精度が上がります。
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
                <small className="muted">都道府県・市区町村とあわせて公開ページに表示され、地図リンクが自動生成されます。</small>
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

              {[1, 2, 3].map(slot => (
                <div key={slot} className="form-field">
                  <label>施設・スタジオ写真 {['①','②','③'][slot-1]}</label>
                  <div id={`facility-photo-preview-wrap-${slot}`} style={{ marginBottom: '8px', display: 'none' }}>
                    <img id={`facility-photo-preview-${slot}`} src="" alt={`施設写真${slot}`} style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id={`facility-img-input-${slot}`} accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id={`facility-img-btn-${slot}`} className="btn btn-ghost" style={{ fontSize: '13px' }}>写真を選択（5MB以内・jpg/png/webp）</button>
                  <p id={`facility-img-msg-${slot}`} className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                  <input type="hidden" name={`facility_photo_${slot}`} />
                </div>
              ))}

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* アピール設定タブ（でお要望2026-09-29：公開ページ3タブ再編に合わせ、
            プロフィールタブ・サービス設定タブに混在していたキャッチコピー・理念・
            AIマッチング用の物語的説明など「アピール」文言だけをここに集約した。
            個別メニューのBefore/After等はメニュー単位の情報のため、サービス設定タブの
            メニュー編集フォームに残したまま移動していない）。 */}
        <div className="tab-pane" id="tab-appeal-settings">
          <div style={{ marginBottom: '16px' }}>
            <a id="appeal-view-page-btn" href="#" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>公開ページを確認 ↗</a>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>アピール設定</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                公開ページの「アピール」タブに表示される文言です。住所・営業時間・料金などの事実情報は「プロフィール」タブで設定してください。
              </p>
            </div>
            <form id="appeal-profile-form">
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
              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
            {/* でお要望2026-10-01：「デフォルトで表示されているものも自由に並び替えたり
                内容編集したりできるように」。ガイドからのひと言・強み・理念（引用文）は、
                下の「ページ構成ブロック」一覧の該当行で直接編集する一本化に変更
                （このフォームからは重複するため削除）。 */}
          </div>

          <div className="card" style={{ padding: '24px', marginTop: '16px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>AIマッチングプロフィール</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0 0 12px', lineHeight: '1.6' }}>
              ここに書いた内容をAIが読み取り、あなたのサービスにどんなユーザーが合うかを自動判定します。チェックボックスより精度の高いマッチングが実現します。書くほど効果的です。
            </p>
            <form id="appeal-matching-form">
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
              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>

          <div className="card" style={{ padding: '24px', marginTop: '16px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>ページ構成ブロック</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0 0 16px', lineHeight: '1.6' }}>
              公開ページ「アピール」タブの中身を、この一覧で上から順に並び替えできます。デフォルトで表示されている「ガイドからのひと言」「強み」「スタッフ紹介」「New Me Map」「理念」「体験談」「プログラム一覧」も含め、並び替え・非表示に切り替え・（テキスト項目は）内容編集ができます。見出し・本文・画像・ボタン・引用は「＋ ブロックを追加」から新しく追加できます。
            </p>
            <div id="ablk-list"></div>
            <div style={{ marginTop: '12px' }}>
              <button type="button" className="btn btn-ghost" id="ablk-add-toggle">＋ ブロックを追加</button>
              <div id="ablk-add-form" style={{ display: 'none', marginTop: '10px', padding: '14px', background: '#f9fafb', borderRadius: '10px' }}>
                <div className="form-field">
                  <label>種類</label>
                  <select id="ablk-add-type">
                    <option value="heading">見出し</option>
                    <option value="paragraph">本文</option>
                    <option value="image">画像</option>
                    <option value="button">ボタン</option>
                    <option value="quote">引用</option>
                  </select>
                </div>
                <div id="ablk-add-fields"></div>
                <button type="button" className="btn" id="ablk-add-save" style={{ marginTop: '8px' }}>追加する</button>
              </div>
            </div>
            <div id="ablk-msg" style={{ fontSize: '12px', marginTop: '8px' }}></div>
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
                <button type="button" id="staff-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>写真を選択（5MB以内）</button>
                <p id="staff-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" id="staff-photo-url" />
              </div>
              <div className="form-field">
                <label>実績写真ギャラリー（1人12枚まで）</label>
                <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>施術・指導の仕上がりなど、このスタッフの実績が伝わる写真。公開ページのスタッフ紹介に並びます。</p>
                <div id="staff-gallery-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}></div>
                <input type="file" id="staff-gallery-input" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} />
                <button type="button" id="staff-gallery-btn" className="btn btn-ghost" style={{ fontSize: '13px', display: 'none' }}>写真を追加（1枚5MB以内・複数選択可）</button>
                <p id="staff-gallery-hint" className="muted" style={{ fontSize: '12px', margin: 0 }}>スタッフを一度保存すると、写真を追加できます。</p>
                <p id="staff-gallery-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0' }}></p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input type="checkbox" name="is_public" id="staff-is-public" defaultChecked />
                <label htmlFor="staff-is-public" style={{ margin: '0', fontSize: '13px', fontWeight: '600' }}>公開ページに表示する</label>
              </div>
              <p className="muted" style={{ fontSize: '11.5px', margin: '0 0 14px' }}>オフにすると、公開ページのスタッフ紹介と予約時の指名候補に出ません（管理画面・シフト・カルテでは今までどおり使えます）。</p>
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
              {/* シフトの労働条件（でお要望2026-10-02：シフト管理タブと同じ条件をスタッフ登録時にも入力できるように）。
                  空欄＝正社員・パート等は法定の既定値、業務委託は制限なし。保存先はシフト管理タブと共通。 */}
              <div style={{ margin: '4px 0 16px', padding: '12px 14px', background: 'rgba(26,20,16,0.03)', border: '1px solid rgba(26,20,16,0.12)', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>シフトの労働条件</div>
                <p className="muted" style={{ fontSize: '11.5px', margin: '0 0 10px' }}>シフトの自動作成・確定前チェックで使います。空欄は法定の既定値（業務委託は制限なし）。時間は実働（休憩を除く）で数えます。</p>
                <div className="form-field">
                  <label>雇用形態</label>
                  <select name="cond_employment_type" id="staff-cond-emp" defaultValue="fulltime">
                    <option value="fulltime">正社員</option>
                    <option value="parttime">パート</option>
                    <option value="arbeit">アルバイト</option>
                    <option value="contractor">業務委託</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {[
                    ['max_hours_per_day', '1日の上限（時間）'],
                    ['max_hours_per_week', '週の上限（時間）'],
                    ['max_hours_per_month', '月の上限（時間）'],
                    ['max_days_per_week', '週の最大勤務日数'],
                    ['min_days_off_per_week', '週の最低休日数'],
                    ['max_days_per_month', '月の最大勤務日数'],
                    ['max_consecutive_days', '連続勤務の上限（日）'],
                  ].map(([key, label]) => (
                    <div className="form-field" key={key} style={{ margin: 0 }}><label style={{ fontSize: '11.5px' }}>{label}</label><input name={`cond_${key}`} type="number" min="0" step="0.5" /></div>
                  ))}
                </div>
              </div>
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
          {/* でお指摘2026-10-02：「シフト管理の中の並び順が意味不明。最初にカレンダーを出して、
              日付をタップするとその日のシフト表がポップアップ、前月・次月にも移動できるように」。
              ①月カレンダー（日付タップでその日のシフト編集ポップアップ）→②期間ごとの管理
              （希望一覧・シフト表・自動作成・確定）→③設定（提出リンク・期間作成・ルール・
              時間帯パターン・優先度）の順に並べ替え、初期設定系は折りたたみにした。 */}
          <div className="card stack" style={{ padding: '24px', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>シフトカレンダー</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="button" className="btn btn-ghost" id="shift-cal-prev" style={{ padding: '4px 12px' }} aria-label="前の月">‹</button>
                <strong id="shift-cal-title" style={{ minWidth: '92px', textAlign: 'center', fontSize: '14px' }}></strong>
                <button type="button" className="btn btn-ghost" id="shift-cal-next" style={{ padding: '4px 12px' }} aria-label="次の月">›</button>
                <button type="button" className="btn btn-ghost" id="shift-cal-today" style={{ padding: '4px 10px', fontSize: '12px' }}>今月</button>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: 0, lineHeight: '1.6' }}>日付をタップすると、その日のスタッフ別の希望と確定シフトを確認・編集できます。</p>
            <div id="shift-cal-grid">読み込み中…</div>
            <p className="muted" style={{ fontSize: '11px', margin: 0 }}><span style={{ color: '#059669', fontWeight: 700 }}>■</span> 確定シフトの人数　<span style={{ color: '#2563eb', fontWeight: 700 }}>■</span> 出勤希望の人数（確定前）</p>
          </div>

          <div className="card stack" style={{ padding: '24px', gap: '16px' }} id="shift-detail-section">
            <h3 style={{ margin: 0, fontSize: '15px' }}>期間ごとのシフト作成</h3>
            <div id="shift-period-list">読み込み中…</div>
            <div id="shift-detail-body" className="stack" style={{ gap: '16px', display: 'none' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" id="shift-generate-btn">自動作成</button>
              <button type="button" className="btn" id="shift-confirm-btn">この期間を確定する</button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: 0, lineHeight: '1.7' }}>
              流れ：①提出された希望を確認 → ②「自動作成」（スタッフごとの労働条件・法定の上限を守って自動で割り振ります）→ ③下の労働条件チェックとシフト表を見ながら調整 → ④問題がなければ「この期間を確定する」。条件を超える希望は自動では入れず、理由を表示します。
            </p>
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

            <h4 style={{ margin: '8px 0 0', fontSize: '13px' }}>労働条件チェック</h4>
            <div id="shift-labor-panel"></div>

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

          <h3 style={{ margin: '24px 0 10px', fontSize: '14px' }}>設定</h3>
          <details className="card" style={{ padding: '16px 24px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>スタッフの提出用リンク</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
              <p className="muted" style={{ fontSize: '12px', margin: 0, lineHeight: '1.6' }}>スタッフが各自のスマホから出勤・休み希望を提出できます。リンクをコピーして、LINE等で個別に送ってください。</p>
              <div id="shift-staff-links" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
            </div>
          </details>

          <details className="card" style={{ padding: '16px 24px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>期間を作成</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '10px', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}><label>開始日 *</label><input type="date" id="shift-period-start" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>終了日 *</label><input type="date" id="shift-period-end" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>希望の提出締切（任意）</label><input type="date" id="shift-period-deadline" /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>締切の何日前に通知（0=当日）</label><input type="text" id="shift-period-notify-new" defaultValue="1,0" placeholder="3,1,0" /></div>
              <button type="button" className="btn" id="shift-period-add-btn">この期間を作成</button>
            </div>
            </div>
          </details>

          <details className="card" style={{ padding: '16px 24px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>シフト作成ルール</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
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
          </details>

          <details id="shift-patterns-wrap" className="card" style={{ padding: '16px 24px', marginBottom: '10px', display: 'none' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>時間帯パターン</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
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
          </details>

          <details className="card" style={{ padding: '16px 24px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>スタッフの労働条件</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
              <p className="muted" style={{ fontSize: '12px', margin: 0, lineHeight: '1.7' }}>雇用形態ごとの働ける上限・休日の確保を登録します。自動作成はこの条件を超えない範囲でだけシフトを入れ、確定前のチェックでも超過を知らせます。空欄は既定値です：業務委託以外は法定の目安（1日8時間・週40時間・週1日以上の休み・連続6日まで）、業務委託は上限なし（入力した項目のみ適用）。週は月曜始まり、月は暦月で数えます。</p>
              <div id="shift-conditions-list" className="stack" style={{ gap: '8px' }}>読み込み中…</div>
              <div>
                <button type="button" className="btn btn-ghost" id="shift-conditions-save-btn">労働条件を保存</button>
                <span id="shift-conditions-save-msg" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
              </div>
            </div>
          </details>

          <details className="card" style={{ padding: '16px 24px', marginBottom: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '2px 0' }}>スタッフの優先度</summary>
            <div className="stack" style={{ gap: '16px', marginTop: '14px' }}>
                        <p className="muted" style={{ fontSize: '12px', margin: 0 }}>お店を回す上での人員配置の方針をそのまま反映します（店長・社員を高く、アルバイトは低め、等）。各時間帯の必要人数に対して希望者が多い場合、ポイントが高い人から優先的にその枠へ採用されます。</p>
            <div id="shift-priorities-list" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
            <div>
              <button type="button" className="btn btn-ghost" id="shift-priorities-save-btn">優先度を保存</button>
              <span id="shift-priorities-save-msg" style={{ fontSize: '12px', marginLeft: '8px' }}></span>
            </div>
            </div>
          </details>

        </div>

        {/* クラス管理（スクール業態特化、でお要望2026-09-14：hacomono機能比較で判明した
            不足機能。「在籍制・定員制クラスの管理や進級結果の管理」相当）。「機能設定」で
            ONにした店舗のみ表示。既存の予約カレンダーとは独立した名簿・進級記録機能。 */}
        <div className="tab-pane" id="tab-classes">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>クラス管理</h2>
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>ダンス・スイミング等の定員制クラスの作成・名簿・進級・開催回スケジュール・参加者確認をここでまとめて管理します。</p>
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
                <div className="form-field"><label>金額（円・任意）</label><input name="price" type="number" min="0" placeholder="例：3000" /></div>
                <div className="form-field"><label>担当講師（任意）</label><select name="instructor_staff_id"><option value="">未設定</option></select></div>
                <div className="form-field"><label>進級の段階（カンマ区切り。例：白帯,黄帯,緑帯,黒帯）</label><input name="level_labels" placeholder="任意" /></div>

                {/* でお要望2026-09-26：「クラスを追加を押して出てくる新規の設定画面の中に
                    日時を入れてほしい」。クラス作成と同時に最初の開催回もまとめて作れる
                    ようにする（空欄ならクラスだけ作成、従来通り「予約枠を管理」から後で
                    追加も可能）。編集時は既存クラスの日時を書き換える機能ではないため
                    非表示にする（JSでcls-add-btn/編集クリック時に出し分け）。 */}
                <div id="cls-new-session-fields" style={{ borderTop: '1px solid rgba(26,20,16,0.1)', marginTop: '12px', paddingTop: '12px' }}>
                  <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px', fontWeight: 700 }}>最初の開催日時（任意・空欄ならクラスだけ作成されます）</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div className="form-field" style={{ marginBottom: 0 }}><label>開始日</label><input type="date" id="cls-new-session-date" /></div>
                    <div className="form-field" style={{ marginBottom: 0 }}><label>開始</label><input type="time" id="cls-new-session-start" /></div>
                    <div className="form-field" style={{ marginBottom: 0 }}><label>終了</label><input type="time" id="cls-new-session-end" /></div>
                    <div className="form-field" style={{ marginBottom: 0, width: '90px' }}><label>定員</label><input type="number" id="cls-new-session-capacity" min="1" placeholder="上の定員" /></div>
                    <div className="form-field" style={{ marginBottom: 0, width: '110px' }}>
                      <label>繰り返し</label>
                      <select id="cls-new-session-recur-type" defaultValue="once">
                        <option value="once">1回のみ</option>
                        <option value="weekly">毎週</option>
                        <option value="monthly">毎月</option>
                      </select>
                    </div>
                    <div id="cls-new-session-weekday-field" className="form-field" style={{ marginBottom: 0, display: 'none' }}>
                      <label>曜日（複数可）</label>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="0" />日</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="1" />月</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="2" />火</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="3" />水</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="4" />木</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="5" />金</label>
                        <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" className="cls-new-session-weekday" value="6" />土</label>
                      </div>
                    </div>
                    <div id="cls-new-session-until-field" className="form-field" style={{ marginBottom: 0, display: 'none' }}>
                      <label>この日まで作成</label>
                      <input type="date" id="cls-new-session-until" />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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

          {/* 選択中のクラスの開催回＝予約枠（でお指摘2026-09-16：「予約できる仕組みが
              まだない。お客様側にはその店舗のページに予約枠が出てこないと無意味」）。
              既存の即時予約基盤（provider_slots）を再利用し、class_idを付けて作成する。
              お客様は店舗の公開ページ「クラス」タブから、ここで作った開催回に予約できる。 */}
          <div id="cls-sessions-card" className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px', display: 'none' }}>
            <h3 id="cls-sessions-title" style={{ margin: 0, fontSize: '15px' }}></h3>
            <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>
              ここで追加した開催回が、お客様が閲覧する店舗ページの「クラス」タブに予約枠として表示されます。
            </p>
            <form id="cls-session-form" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}><label>開始日 *</label><input type="date" name="date" required /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>開始 *</label><input type="time" name="start_time" required /></div>
              <div className="form-field" style={{ marginBottom: 0 }}><label>終了 *</label><input type="time" name="end_time" required /></div>
              <div className="form-field" style={{ marginBottom: 0, width: '90px' }}><label>定員</label><input type="number" name="capacity" min="1" placeholder="クラス既定" /></div>
              <div className="form-field" style={{ marginBottom: 0, width: '110px' }}>
                <label>繰り返し</label>
                <select id="cls-session-recur-type" name="recur_type" defaultValue="once">
                  <option value="once">1回のみ</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>
              {/* 毎週の場合の曜日指定（でお要望2026-09-16：「何曜日の何時から...毎週やるもの
                  なども選べるように」）。未選択なら開始日の曜日をそのまま使う。 */}
              <div id="cls-session-weekday-field" className="form-field" style={{ marginBottom: 0, display: 'none' }}>
                <label>曜日（複数可）</label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="0" />日</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="1" />月</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="2" />火</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="3" />水</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="4" />木</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="5" />金</label>
                  <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><input type="checkbox" name="weekday" value="6" />土</label>
                </div>
              </div>
              <div id="cls-session-until-field" className="form-field" style={{ marginBottom: 0, display: 'none' }}>
                <label>この日まで作成</label>
                <input type="date" name="until_date" />
              </div>
              <button type="submit" className="btn">＋ 開催回を追加</button>
            </form>
            <div id="cls-session-list" className="stack" style={{ gap: '8px' }}></div>
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
              店頭タブレット予約ボード：<a id="slots-board-link" href="#" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}></a>
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

            {/* 予約可能時間の締切（でお確認2026-09-18：「予約可能時間の設定どこ
                (ex.前日21時まで予約可能)」／でお要望2026-09-18：「前日の何時までという
                のと、何時間前までを選べるように」）。2つの指定方法から選べる。 */}
            <div className="form-field" style={{ marginBottom: 0, maxWidth: '280px', marginTop: '16px' }}>
              <label>予約可能時間の締切</label>
              <select id="booking-cutoff-mode">
                <option value="hours">開始の何時間前まで受付</option>
                <option value="day_before_time">前日の何時まで受付</option>
              </select>
            </div>
            <div className="form-field" id="booking-cutoff-hours-field" style={{ marginBottom: 0, maxWidth: '280px' }}>
              <label>何時間前まで</label>
              <input type="number" id="booking-cutoff-input" min="0" style={{ width: '100px' }} />
              <span className="muted" style={{ fontSize: '11.5px' }}>0で無制限（直前まで予約可）。例：12を入れると開始12時間前で受付終了</span>
            </div>
            <div className="form-field" id="booking-cutoff-time-field" style={{ marginBottom: 0, maxWidth: '280px', display: 'none' }}>
              <label>前日の何時まで</label>
              <input type="time" id="booking-cutoff-time-input" />
              <span className="muted" style={{ fontSize: '11.5px' }}>例：21:00にすると、予約日の前日21時で受付終了（予約時間帯に関わらず一律）</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" id="booking-cutoff-save-btn" style={{ fontSize: '12px', padding: '6px 14px' }}>保存する</button>
              <span id="booking-cutoff-msg" className="muted" style={{ fontSize: '12px' }}></span>
            </div>
          </div>

          {/* 営業時間からの自動生成（でお要望2026-09-14：空き枠を1つずつ手動登録させる
              フローは非効率。営業時間さえ分かれば自動で生成できるはず、との指摘）。
              営業時間は即時予約に関わらず予約カレンダーの表示時間帯（何時から何時まで
              表示するか）にも使われる全店舗共通の設定のため、即時予約がOFFの間も
              このカードだけは隠さない（でお報告2026-09-16：「営業時間を設定できる
              ようになってる？」＝OFFの間ここに辿り着けなかった）。 */}
          <div className="card stack" data-feature-exempt="true" style={{ padding: '24px', gap: '14px', marginTop: '16px' }}>
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

            {/* 臨時休業日（でお要望2026-09-18：「特定の1日だけ臨時休業、みたいな
                例外日の設定もできるようにしたい」）。曜日パターンでは表現できない不定休。 */}
            <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(26,20,16,0.08)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '13px' }}>臨時休業日</h4>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>特定の1日だけ休業する場合はここに追加してください。その日の予約枠は自動的に締め切られます。</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}><label>日付</label><input type="date" id="closed-date-input" /></div>
                <div className="form-field" style={{ marginBottom: 0, minWidth: '160px' }}><label>理由（任意）</label><input type="text" id="closed-date-reason" placeholder="例：臨時休業" /></div>
                <button type="button" className="btn btn-ghost" id="closed-date-add-btn" style={{ fontSize: '12px', padding: '6px 14px' }}>追加</button>
              </div>
              <div id="closed-dates-list"></div>
            </div>
          </div>

          {/* 空き枠の一覧・管理（でお指摘2026-09-14：「設定した空き枠が下にバーって出て
              めっちゃスクロール必要だし、編集もできないし、スタッフや部屋ごとの絞り込みも
              できない」への全面改修）。さらにでお要望2026-09-27：「お客様が即時予約する
              ページと同じ表の形式に」対応し、日付×時間の表（app/provider/[slug]/board/page.js
              と同じ形式）に統一。○/×をタップするだけでその場で開放・締切できる。 */}
          <div className="card stack" style={{ padding: '24px', gap: '14px', marginTop: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>空き枠の一覧・管理</h3>
              <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>お客様の予約画面と同じ、日付×時間の表で1週間分を一望できます。○/×をタップするだけで開放・締切を切り替えられます（スタッフを指名している場合は下のフィルタで絞り込んでください）。アンバー色の×は「設定上は開放しているが、シフトが未確定のため実際にはお客様が予約できない」枠です（シフト管理タブで確定すると開放されます）。</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select id="slot-filter-staff" style={{ fontSize: '12.5px', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="">スタッフ：すべて</option></select>
              <select id="slot-filter-resource" style={{ fontSize: '12.5px', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="">部屋・設備：すべて</option></select>
              <span className="muted" style={{ fontSize: '11px' }}>「すべて」のまま同じ日時に複数の枠がある場合は「N件」とまとめて表示され、タップすると内訳から選んで編集できます</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" id="slot-nav-prev" style={{ fontSize: '12px', padding: '6px 10px' }}>← 前の7日</button>
              <button type="button" className="btn btn-ghost" id="slot-nav-today" style={{ fontSize: '12px', padding: '6px 10px' }}>今日</button>
              <button type="button" className="btn btn-ghost" id="slot-nav-next" style={{ fontSize: '12px', padding: '6px 10px' }}>次の7日 →</button>
              {/* 複数選択でまとめて開放/締切/削除（でお要望2026-09-28） */}
              <button type="button" className="btn btn-ghost" id="slot-multiselect-toggle" style={{ fontSize: '12px', padding: '6px 10px', marginLeft: 'auto' }}>複数選択</button>
            </div>

            <div id="slot-selection-bar" style={{ display: 'none', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', flexWrap: 'wrap' }}>
              <strong id="slot-selection-count" style={{ fontSize: '13px', color: '#1d4ed8' }}></strong>
              <button type="button" className="btn btn-ghost" id="slot-selection-open" style={{ fontSize: '11.5px', padding: '5px 10px' }}>選択分を開放</button>
              <button type="button" className="btn btn-ghost" id="slot-selection-close" style={{ fontSize: '11.5px', padding: '5px 10px' }}>選択分を締切</button>
              <button type="button" className="btn btn-ghost" id="slot-selection-delete" style={{ fontSize: '11.5px', padding: '5px 10px', color: '#ef4444' }}>選択分を削除</button>
              <button type="button" className="btn btn-ghost" id="slot-selection-clear" style={{ fontSize: '11.5px', padding: '5px 10px' }}>選択解除</button>
            </div>

            <div id="slot-list">読み込み中…</div>

            {/* 表全体は1週間分を一望する用途に切り替えたため、この日付ピル＋一括操作は
                「まとめて開放/締切/削除したい特定の1日」を選ぶ専用UIとして下に残す
                （でお要望2026-09-27の表形式化後も、丸ごと締切ニーズ自体は残るため）。 */}
            <div id="slot-date-pills" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '8px' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
              <strong id="slot-selected-date-label" style={{ fontSize: '13px' }}></strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost" id="slot-bulk-open" style={{ fontSize: '11.5px', padding: '5px 10px' }}>この日を全て開放</button>
                <button type="button" className="btn btn-ghost" id="slot-bulk-close" style={{ fontSize: '11.5px', padding: '5px 10px' }}>この日を全て締切</button>
                <button type="button" className="btn btn-ghost" id="slot-bulk-delete" style={{ fontSize: '11.5px', padding: '5px 10px', color: '#ef4444' }}>この日を全て削除</button>
              </div>
            </div>

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

        {/* 営業時間（店舗設定タブから直接開ける版。でお要望2026-09-17：「営業時間の
            設定はそこにも必要だけど、店舗設定のタブ内にも同じものが必要」。空き枠
            タブの営業時間エディタと同じデータを扱う、店舗設定側の入口）。 */}
        <div className="tab-pane" id="tab-business-hours">
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>営業時間</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                曜日ごとの営業時間です。予約カレンダーの表示時間帯や、即時予約の空き枠自動生成に使われます。
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 12px', background: 'var(--color-bg)', borderRadius: '10px' }}>
              <span className="muted" style={{ fontSize: '12px' }}>まとめて設定：</span>
              <input type="time" id="bh2-bulk-open" style={{ width: '110px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
              <span className="muted">〜</span>
              <input type="time" id="bh2-bulk-close" style={{ width: '110px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
              <button type="button" className="btn btn-ghost" id="bh2-bulk-apply-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>全曜日に反映</button>
            </div>
            <div id="bh2-editor" className="stack" style={{ gap: '6px' }}>読み込み中…</div>
            <div className="form-field" style={{ marginBottom: 0, maxWidth: '220px' }}>
              <label>枠の刻み幅</label>
              <select id="bh2-duration-select">
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
              <button type="button" className="btn" id="bh2-save-btn">営業時間を保存</button>
              <span id="bh2-save-msg" style={{ fontSize: '12px', alignSelf: 'center' }}></span>
            </div>

            {/* 臨時休業日（でお要望2026-09-18） */}
            <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(26,20,16,0.08)' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '13px' }}>臨時休業日</h4>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>特定の1日だけ休業する場合はここに追加してください。その日の予約枠は自動的に締め切られます。</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}><label>日付</label><input type="date" id="bh2-closed-date-input" /></div>
                <div className="form-field" style={{ marginBottom: 0, minWidth: '160px' }}><label>理由（任意）</label><input type="text" id="bh2-closed-date-reason" placeholder="例：臨時休業" /></div>
                <button type="button" className="btn btn-ghost" id="bh2-closed-date-add-btn" style={{ fontSize: '12px', padding: '6px 14px' }}>追加</button>
              </div>
              <div id="bh2-closed-dates-list"></div>
            </div>
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
                'Me Scanで8軸をスキャン済み',
                'コンパス軸（最優先テーマ）が決まっている',
                '「来た道（タイプ）」が明確',
                '対応軸が一致すれば優先表示',
              ].map(text => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: 'rgba(26,20,16,0.04)', borderRadius: '10px', padding: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', fontWeight: '600' }}>{text}</span>
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
                <div className="form-field">
                  <label>所要時間</label>
                  <select name="duration_minutes" defaultValue="">
                    <option value="">選択しない</option>
                    {[15, 20, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180, 240].map(m => (
                      <option key={m} value={m}>{m}分{m >= 60 ? `（${Math.floor(m / 60)}時間${m % 60 ? m % 60 + '分' : ''}）` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* サービスカテゴリ（L14） */}
              <div className="form-field">
                <label>サービスカテゴリ</label>
                <select name="category">
                  <option value="">選択しない</option>
                  <option value="gym">ジム・パーソナルトレーニング</option>
                  <option value="makeup">メイク・コスメ</option>
                  <option value="hair">ヘア・美容院</option>
                  <option value="colordiagnosis">パーソナルカラー診断</option>
                  <option value="bonediagnosis">骨格診断</option>
                  <option value="diagnosis">診断（総合・イメコン）</option>
                  <option value="fashion">ファッション・スタイリング</option>
                  <option value="photo">プロフィール写真・撮影</option>
                  <option value="marriage">婚活・マッチングサポート</option>
                  <option value="eyebrow">眉毛サロン</option>
                  <option value="hairremoval">脱毛</option>
                  <option value="esthetic">エステ・フェイシャル</option>
                  <option value="whitening">歯のホワイトニング</option>
                  <option value="orthodontics">歯列矯正</option>
                  <option value="nail">ネイル</option>
                  <option value="aga">AGA・薄毛治療</option>
                  <option value="consulting">コンサルティング</option>
                </select>
                <small className="muted">検索ページでのカテゴリ絞り込みに使われます</small>
              </div>

              {/* 対応軸（新） */}
              <div className="form-field">
                <label>対応軸（Me Scan 8軸）</label>
                <select name="target_axis">
                  <option value="">選択しない</option>
                  <option value="body">体型・ボディ</option>
                  <option value="eyebrow">眉</option>
                  <option value="fashion">服・コーデ</option>
                  <option value="hair">髪・ヘア</option>
                  <option value="skin">肌・エステ</option>
                  <option value="hairremoval">脱毛・ムダ毛</option>
                  <option value="teeth">歯・口元</option>
                  <option value="nail">爪</option>
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
                  <button type="button" id="service-before-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>画像追加</button>
                  <p id="service-before-img-msg" className="muted" style={{ fontSize: '11px', margin: '3px 0 0', display: 'none' }}></p>
                  <input type="hidden" name="before_image_url" id="service-before-image-url" />
                </div>
                <div className="form-field">
                  <label style={{ fontSize: '11px' }}>After 画像（任意）</label>
                  <div id="service-after-img-wrap" style={{ marginBottom: '6px', display: 'none' }}>
                    <img id="service-after-img-preview" src="" alt="After" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  </div>
                  <input type="file" id="service-after-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                  <button type="button" id="service-after-img-btn" className="btn btn-ghost" style={{ fontSize: '11px', padding: '5px 10px' }}>画像追加</button>
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
                <button type="button" id="service-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>サービス画像を設定（任意）</button>
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

              <p className="muted" style={{ fontSize: '12px', margin: '0 0 4px' }}>AIマッチングプロフィール（お客様像・変化のパターン等）は「アピール設定」タブへ移動しました。</p>
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
              <input id="karte-search" type="text" placeholder="お客様の名前・会員番号で絞り込み" style={{ flex: '1 1 200px', maxWidth: '260px', padding: '8px 12px', border: '1.5px solid rgba(26,20,16,0.15)', borderRadius: '8px' }} />
            </div>
            <div id="customers-list"><p className="muted">読み込み中…</p></div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>非会員のお客様を追加</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                Finemeに登録していないお客様も、上の一覧に「非会員」として並びます。後から会員だと分かった場合は、そのお客様を開いて「会員と紐付ける」で名前か会員番号から検索して選ぶと、記録がそのお客様に引き継がれます。
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>固定メモ</label>
              <textarea id="cust-modal-note-textarea" style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="読み込み中…" disabled></textarea>
              <button type="button" className="btn" id="cust-modal-note-save-btn" style={{ fontSize: '12px', padding: '5px 10px', marginTop: '6px' }} disabled>保存する</button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" className="btn btn-ghost" id="cust-modal-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>＋ カルテを書く</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>カルテを見る</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-insight-btn" style={{ fontSize: '12px', padding: '5px 10px' }}>AIに傾向を聞く</button>
              </div>
              <div id="cust-modal-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-history" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-insight" style={{ display: 'none', marginTop: '10px' }}></div>

              {/* AI姿勢分析（でお要望2026-09-25・posture_analysis機能フラグでON/OFF）。
                  カルテと同じ「開いたら既読フォームが下に開く」操作感で統一する。 */}
              <div id="cust-modal-posture-section" style={{ display: 'none', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <div id="cust-modal-posture-controls">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost" id="cust-modal-posture-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>姿勢分析を記録</button>
                    <button type="button" className="btn btn-ghost" id="cust-modal-posture-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>姿勢分析を見る</button>
                  </div>
                  <div id="cust-modal-posture-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
                  <div id="cust-modal-posture-history" style={{ display: 'none', marginTop: '10px' }}></div>
                </div>
                <p id="cust-modal-posture-upsell" className="muted" style={{ display: 'none', fontSize: '12px', margin: '0' }}>AI姿勢分析はプレミアムプラン（¥10,000/月）限定の機能です。<a href="/provider/billing" style={{ color: '#c9a84c', fontWeight: '700' }}>プランをアップグレード</a>すると使えるようになります。</p>
              </div>

              {/* AI健診アドバイス（でお要望2026-09-27・今野くん発案。health_advice_analysis機能
                  フラグでON/OFF。姿勢分析と同じ操作感で統一する）。 */}
              <div id="cust-modal-health-section" style={{ display: 'none', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <div id="cust-modal-health-controls">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost" id="cust-modal-health-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>健診アドバイスを記録</button>
                    <button type="button" className="btn btn-ghost" id="cust-modal-health-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>健診アドバイスを見る</button>
                  </div>
                  <div id="cust-modal-health-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
                  <div id="cust-modal-health-history" style={{ display: 'none', marginTop: '10px' }}></div>
                </div>
                <p id="cust-modal-health-upsell" className="muted" style={{ display: 'none', fontSize: '12px', margin: '0' }}>AI健診アドバイスはプレミアムプラン（¥10,000/月）限定の機能です。<a href="/provider/billing" style={{ color: '#c9a84c', fontWeight: '700' }}>プランをアップグレード</a>すると使えるようになります。</p>
              </div>
            </div>

            {/* 非会員（Fineme未登録）用セクション（でお要望2026-09-12：一覧を統合したため
                ポップアップ側でも同じ場所から操作できるようにする） */}
            <div id="cust-modal-manual-section" style={{ display: 'none' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <label className="muted" style={{ fontSize: '12px' }}>会員と紐付ける：</label>
                <input id="cust-modal-link-search" type="text" placeholder="会員の名前・会員番号で検索" autoComplete="off" style={{ flex: '1 1 160px', fontSize: '13px', padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-delete-btn" style={{ fontSize: '12px', padding: '5px 10px', color: '#ef4444', marginLeft: 'auto' }}>削除</button>
              </div>
              <div id="cust-modal-link-results" style={{ marginBottom: '12px' }}></div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>メモ</label>
              <textarea id="cust-modal-manual-memo-textarea" style={{ width: '100%', minHeight: '60px', fontSize: '13px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="要望・使った薬剤・注意点など"></textarea>
              <button type="button" className="btn" id="cust-modal-manual-save-btn" style={{ fontSize: '12px', padding: '5px 10px', marginTop: '6px' }}>保存する</button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>＋ カルテを書く</button>
                <button type="button" className="btn btn-ghost" id="cust-modal-manual-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>カルテを見る</button>
              </div>
              <div id="cust-modal-manual-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
              <div id="cust-modal-manual-history" style={{ display: 'none', marginTop: '10px' }}></div>

              <div id="cust-modal-manual-posture-section" style={{ display: 'none', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <div id="cust-modal-manual-posture-controls">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost" id="cust-modal-manual-posture-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>姿勢分析を記録</button>
                    <button type="button" className="btn btn-ghost" id="cust-modal-manual-posture-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>姿勢分析を見る</button>
                  </div>
                  <div id="cust-modal-manual-posture-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
                  <div id="cust-modal-manual-posture-history" style={{ display: 'none', marginTop: '10px' }}></div>
                </div>
                <p id="cust-modal-manual-posture-upsell" className="muted" style={{ display: 'none', fontSize: '12px', margin: '0' }}>AI姿勢分析はプレミアムプラン（¥10,000/月）限定の機能です。<a href="/provider/billing" style={{ color: '#c9a84c', fontWeight: '700' }}>プランをアップグレード</a>すると使えるようになります。</p>
              </div>

              <div id="cust-modal-manual-health-section" style={{ display: 'none', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                <div id="cust-modal-manual-health-controls">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost" id="cust-modal-manual-health-add-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>健診アドバイスを記録</button>
                    <button type="button" className="btn btn-ghost" id="cust-modal-manual-health-history-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>健診アドバイスを見る</button>
                  </div>
                  <div id="cust-modal-manual-health-add-form" style={{ display: 'none', marginTop: '10px' }}></div>
                  <div id="cust-modal-manual-health-history" style={{ display: 'none', marginTop: '10px' }}></div>
                </div>
                <p id="cust-modal-manual-health-upsell" className="muted" style={{ display: 'none', fontSize: '12px', margin: '0' }}>AI健診アドバイスはプレミアムプラン（¥10,000/月）限定の機能です。<a href="/provider/billing" style={{ color: '#c9a84c', fontWeight: '700' }}>プランをアップグレード</a>すると使えるようになります。</p>
              </div>
            </div>

            {/* 契約書（でお要望2026-10-04）：店舗とお客様が交わした契約書（紙・PDF等）をアップロードして
                保管し、会員にはマイページから見せる。電子署名はせず「同意の記録」に留める。
                回数券・会員プラン・入会手続きなど種類を問わず使える。 */}
            <div id="cust-modal-contracts-section" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
              <button type="button" className="btn btn-ghost" id="cust-modal-contracts-toggle" style={{ fontSize: '12px', padding: '5px 10px' }}>契約書</button>
              <button type="button" className="btn btn-ghost" id="cust-modal-invoice-btn" style={{ fontSize: '12px', padding: '5px 10px', marginLeft: '6px' }}>請求する</button>
              <div id="cust-modal-contracts" style={{ display: 'none', marginTop: '10px' }}></div>
            </div>
          </div>
        </div>

        {/* 一斉メール配信（でお要望2026-09-16：「顧客管理の中に一斉メール配信があるけど、
            これは独立したタブで別にするべき」を受けて分離。でお報告2026-09-18：「メールの
            ページ、対象者の絞り込み方が無い」を受けて、このタブ自身に絞り込みUIを追加
            （顧客管理タブの絞り込みとは独立。他タブへ行き来させない）。 */}
        <div className="tab-pane" id="tab-broadcast-email">
          <div className="card stack" style={{ padding: '24px', gap: 10 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>一斉メール配信</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                下の絞り込み条件に一致する、Finemeに登録されたメールアドレスへ一斉送信します（メール未登録の方はスキップされます）。
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="muted" style={{ fontSize: '13px' }}>対象：</label>
              <select id="bc-filter">
                <option value="all">すべて</option>
                <option value="user-overdue">ユーザー想定超過のみ</option>
                <option value="store-overdue">店舗推奨超過のみ</option>
                <option value="dormant">休眠のみ</option>
              </select>
              <input id="bc-search" type="text" placeholder="お客様の名前で絞り込み" style={{ padding: '8px 12px', border: '1.5px solid rgba(26,20,16,0.15)', borderRadius: '8px', minWidth: '180px' }} />
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

        {/* 回数券・パッケージ：店舗が記録して発行、またはお客様がオンライン購入（Stripe Connect）。店舗・顧客双方が残り回数を確認できる */}
        <div className="tab-pane" id="tab-packages">
          <div className="card stack" style={{ padding: '24px', gap: 12, marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px' }}>パッケージを作る</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
              ここでは「何回分・いくらで売ったか」を記録し、店舗と購入した顧客の両方がFinemeで残り回数を確認できるようにします。お店で直接代金を受け取った場合はこの画面で記録し、お客様がFineme上で購入する場合は、Stripe連携（Fineme利用契約タブ）の設定が必要です。
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
              <div className="form-field" style={{ minWidth: '140px' }}>
                <label>有効期限の指定方法</label>
                <select id="pkg-validity-mode">
                  <option value="none">無期限</option>
                  <option value="days">購入から◯日</option>
                  <option value="date">カレンダーで日付指定</option>
                </select>
              </div>
              <div className="form-field" id="pkg-validity-days-field" style={{ minWidth: '110px', display: 'none' }}>
                <label>日数</label>
                <input id="pkg-validity" type="number" min="1" placeholder="180" />
              </div>
              <div className="form-field" id="pkg-validity-date-field" style={{ minWidth: '150px', display: 'none' }}>
                <label>この日まで有効</label>
                <input id="pkg-expires-on" type="date" />
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
                連携のやり方を見る（設定ガイド） ↗
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

        {/* 請求：店舗がお客様にFineme経由でお支払いをお願いする（でお要望2026-10-04）。
            お支払いリンクを発行し、会員にはLINEでも送る。カード決済は店舗のStripe Connectへ入金、
            現金などで受け取った場合は「入金済みにする」。入金は売上管理にも1行記録される。 */}
        <div className="tab-pane" id="tab-invoices">
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '16px' }}>請求</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.7 }}>
                お客様へのお支払いのお願いを作り、お支払いリンクを送れます。お客様はリンクからカードで支払い、代金は貴店のStripeアカウントへ入金されます。会員のお客様にはLINEでも届きます。
              </p>
            </div>
            <p id="inv-not-ready" style={{ display: 'none', fontSize: '12px', margin: 0, padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', color: '#92400e', lineHeight: 1.7 }}>
              カード決済の受け入れ準備がまだ完了していません。「Fineme利用契約」タブからStripe連携を設定するまで、お客様はリンクからお支払いできません（現金で受け取った分は「入金済みにする」で記録できます）。
            </p>
            <form id="inv-form" className="stack" style={{ gap: '10px', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
              <p id="inv-target" style={{ margin: 0, fontSize: '12px', color: '#374151', display: 'none' }}></p>
              <div className="form-field"><label>宛名（お客様のお名前）</label><input type="text" id="inv-name" maxLength={60} placeholder="例：山田 太郎" /></div>
              <div className="form-field"><label>請求の内容</label><input type="text" id="inv-title" maxLength={80} required placeholder="例：パーソナル10回券" /></div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ minWidth: '150px' }}><label>金額（円・税込）</label><input type="number" id="inv-amount" min="1" max="1000000" required /></div>
                <div className="form-field" style={{ minWidth: '150px' }}><label>お支払い期限（任意）</label><input type="date" id="inv-due" /></div>
              </div>
              <div className="form-field"><label>メモ（任意・お客様にも表示されます）</label><input type="text" id="inv-note" maxLength={200} /></div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" className="btn" style={{ fontSize: '13px' }}>請求を作る</button>
                <button type="button" className="btn btn-ghost" id="inv-clear-target" style={{ fontSize: '12px', display: 'none' }}>お客様の指定を外す</button>
                <span id="inv-msg" style={{ fontSize: '12px' }}></span>
              </div>
            </form>
            <div id="inv-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px' }}>
              <div className="stat-card"><div className="stat-value" id="inv-unpaid-total" style={{ color: '#b45309' }}>—</div><div className="stat-label">未払いの合計</div></div>
              <div className="stat-card"><div className="stat-value" id="inv-paid-month">—</div><div className="stat-label">今月入金</div></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn" id="inv-filter-unpaid" style={{ fontSize: '12px', padding: '7px 16px' }}>未払い</button>
              <button type="button" className="btn btn-ghost" id="inv-filter-all" style={{ fontSize: '12px', padding: '7px 16px' }}>すべて</button>
            </div>
            <div id="inv-list"></div>
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
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button type="button" id="pos-online-checkout-btn" className="btn btn-ghost" disabled>オンライン決済リンクを発行</button>
                    <button type="button" id="pos-checkout-btn" className="btn" disabled>会計を確定する</button>
                  </div>
                </div>
              </div>
              <p id="pos-checkout-msg" className="muted" style={{ fontSize: '13px' }}></p>
              {/* でお要望2026-09-27：決済機能Phase6②POSオンライン決済。QRを表示してお客様
                  自身のスマホで支払ってもらい、Stripe Webhookでの確定をポーリングで待つ。 */}
              <div id="pos-online-checkout-box" style={{ display: 'none', padding: '16px', background: '#f9fafb', borderRadius: '12px', textAlign: 'center' }}></div>
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
                <p className="muted" style={{ fontSize: '13px', margin: 0 }}>ロッカーの配置図を店舗に合わせて作り、空き・契約中を図で確認します。マスをタップして契約・設定できます。</p>
              </div>
              <button type="button" className="btn" id="lkr-bank-add-btn">＋ ロッカー群を追加</button>
            </div>

            <div id="lkr-layout" className="stack" style={{ gap: '14px' }}>読み込み中…</div>
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
          <div id="lkr-modal-root"></div>
        </div>

        {/* 入会手続き（でお要望2026-09-15〜16：「お客様がジムなどの店舗に入会する手続きも
            Fineme上でできるようにしたい」）。決済はStripe実装（Connect送金・カードのみ、
            口座振替は日本未対応のためV1では非対応）。公開ページ側（/provider/[slug]/join）で
            お客様が入力〜カード登録まで完結し、ここで店舗が最終承認する。 */}
        <div className="tab-pane" id="tab-memberships">
          <div className="card stack" style={{ padding: '24px', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px' }}>入会手続き</h2>
              <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                お客様が公開ページから入会申込〜カード登録までを完結できます。ここで内容を確認して承認すると、初回のお支払いが開始されます（決済は
                <a href="/provider/billing" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>「Fineme利用契約」タブのStripe Connect</a>
                の設定完了が必要です）。
              </p>
            </div>
            <div id="mbr-connect-warning" style={{ display: 'none', padding: '12px 14px', background: '#fef2f2', color: '#b91c1c', borderRadius: '10px', fontSize: '13px' }}></div>
            <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>
              入会ページのURL：<code id="mbr-join-url"></code>
              <button type="button" className="btn btn-ghost" id="mbr-copy-url-btn" style={{ fontSize: '11px', padding: '3px 8px', marginLeft: '8px' }}>コピー</button>
            </p>
          </div>

          {/* プラン管理 */}
          <div className="card stack" style={{ padding: '24px', gap: '14px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>会員プラン</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ marginBottom: 0, minWidth: '160px' }}><label>プラン名</label><input id="mbr-plan-name" placeholder="例：月4回プラン" /></div>
              <div className="form-field" style={{ marginBottom: 0, minWidth: '120px' }}><label>月額（円）</label><input id="mbr-plan-price" type="number" min="1" placeholder="8000" /></div>
              <div className="form-field" style={{ marginBottom: 0, minWidth: '160px' }}><label>説明（任意）</label><input id="mbr-plan-desc" placeholder="任意" /></div>
              <button type="button" className="btn" id="mbr-plan-add-btn">追加する</button>
            </div>
            <div id="mbr-plan-list" className="stack" style={{ gap: '8px' }}>読み込み中…</div>
          </div>

          {/* 入会手続き設定（でお要望：各項目は店舗ごとにカスタマイズ可能に） */}
          <div className="card stack" style={{ padding: '24px', gap: '14px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>入会手続きの設定</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" id="mbr-set-prorate" />初月を日割りにする（OFFの場合は承認日から満額で開始）
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" id="mbr-set-idreq" />本人確認書類（免許証・保険証・パスポート）を必須にする
            </label>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>利用規約・同意書の内容（入会ページとお客様のマイページに表示されます）</label>
              <textarea id="mbr-set-terms" style={{ width: '100%', minHeight: '140px', fontSize: '13px', padding: '10px', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="規約・同意書の文面を入力してください"></textarea>
            </div>
            <button type="button" className="btn" id="mbr-set-save-btn" style={{ width: 'fit-content' }}>設定を保存する</button>
            <span id="mbr-set-msg" className="muted" style={{ fontSize: '12px' }}></span>
          </div>

          {/* 申込一覧 */}
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>入会申込一覧</h3>
            <div id="mbr-app-list" className="stack" style={{ gap: '10px' }}>読み込み中…</div>
          </div>

          {/* 申込詳細（一覧から開く） */}
          <div id="mbr-detail-card" className="card stack" style={{ padding: '24px', gap: '12px', marginTop: '16px', display: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>申込詳細</h3>
              <button type="button" className="btn btn-ghost" id="mbr-detail-close" style={{ fontSize: '12px' }}>閉じる</button>
            </div>
            <div id="mbr-detail-body" style={{ fontSize: '13px', lineHeight: '1.8' }}></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn" id="mbr-detail-approve-btn">承認する（課金開始）</button>
              <button type="button" className="btn btn-ghost" id="mbr-detail-reject-btn" style={{ color: '#ef4444' }}>却下する</button>
            </div>
            <span id="mbr-detail-msg" className="muted" style={{ fontSize: '12px' }}></span>
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
              <button type="button" id="checkin-camera-btn" className="btn">カメラを起動する</button>
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
            </div>
            {/* 詳細・画像（でお要望2026-09-15：「タイトルだけじゃなくて、詳細を書けるように
                したり画像を入れたりできるように」）。招待LINEの案内文にそのまま反映される。 */}
            <div className="form-field">
              <label>詳細（任意）</label>
              <textarea id="ev-memo" style={{ width: '100%', minHeight: '70px', fontSize: '14px', padding: '10px', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '8px', boxSizing: 'border-box' }} placeholder="持ち物・参加費・場所など"></textarea>
            </div>
            <div className="form-field">
              <label>画像（任意）</label>
              <input id="ev-image-input" type="file" accept="image/png,image/jpeg,image/webp" />
              <div id="ev-image-preview" style={{ display: 'none', marginTop: '8px' }}>
                <img alt="" style={{ maxWidth: '160px', borderRadius: '8px', display: 'block' }} />
              </div>
              <span id="ev-image-msg" className="muted" style={{ fontSize: '12px' }}></span>
            </div>
            <button className="btn" id="ev-create-btn" type="button" style={{ width: 'fit-content' }}>作成する</button>
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
                      <input type="checkbox" value={a.key} /> {a.label}
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
                      <option value={a.key} key={a.key}>{a.label}</option>
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

        {/* AIコンサル：店舗が選んだゴールから道筋を作る専用ページ（でお要望2026-10-03）。未設定でも他機能は使える */}
        <div className="tab-pane" id="tab-consultant">
          <ConsultantPanel />
        </div>

        {/* ページデザイン：公開ページの色・書体・文字の大きさを店舗が選ぶ（でお要望2026-10-01） */}
        <div className="tab-pane" id="tab-page-design">
          <PageDesignSettings />
        </div>

        {/* タブ⑥：公開設定 */}
        <div className="tab-pane" id="tab-publish">
          <div style={{ marginBottom: '16px' }}>
            <a id="publish-view-page-btn" href="#" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '12px' }}>公開ページを確認 ↗</a>
          </div>
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
            <p className="muted" style={{ fontSize: '12px', margin: '0' }}>※ 掲載を完全に停止（解約）したい場合は「Fineme利用契約」タブからお手続きください。</p>
          </div>
        </div>

        {/* タブ⑥：課金・プラン */}
        <div className="tab-pane" id="tab-billing">
          <div style={{ background: '#2f4f8f', color: '#fff', borderRadius: '12px', padding: '14px 18px', marginBottom: '14px' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}>Finemeとのご契約</p>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', lineHeight: 1.7, opacity: 0.92 }}>このページは、貴店とFinemeの間のご契約とお支払い（Finemeへのお支払い）です。お客様から貴店へのお支払い（回数券・会員プラン等）とは別のものです。</p>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>Fineme利用契約・プラン</h2>
            <div style={{ background: 'rgba(26,20,16,0.04)', border: '1px solid rgba(26,20,16,0.15)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(26,20,16,0.6)', marginBottom: '4px' }}>Finemeのご利用プラン</div>
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
            <button id="billing-portal-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>Finemeへのお支払い情報を管理する（カスタマーポータル）</button>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '12px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>ご契約書類</h2>
            <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: 1.7 }}>貴店とFinemeの契約内容を、いつでもここから確認できます。</p>
            <div id="terms-agreement-box" style={{ padding: '12px 14px', borderRadius: '10px', background: '#f9fafb', fontSize: '13px', lineHeight: 1.7 }}>
              <span id="terms-agreement-text" className="muted">利用規約への同意状況を確認中…</span>
              <button type="button" className="btn" id="terms-agreement-btn" style={{ display: 'none', marginTop: '8px', fontSize: '13px', padding: '6px 14px' }}>最新の利用規約に同意する</button>
            </div>
            <a href="/terms-provider" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '13px', textAlign: 'left' }}>掲載者向け利用規約（ご契約の内容）</a>
            <a href="/tokusho" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '13px', textAlign: 'left' }}>特定商取引法に基づく表記</a>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '13px', textAlign: 'left' }}>プライバシーポリシー</a>
            <a href="/provider/billing" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '13px', textAlign: 'left' }}>プラン比較・変更（Stripe連携の設定もこちら）</a>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>パスワード変更</h2>
            <div className="form-field"><label>新しいパスワード（8文字以上）</label><input type="password" id="new-pw1" /></div>
            <div className="form-field"><label>新しいパスワード（確認）</label><input type="password" id="new-pw2" /></div>
            <p id="pw-change-msg" style={{ fontSize: '13px', margin: '0', display: 'none' }}></p>
            <button className="btn" id="pw-change-btn" style={{ alignSelf: 'flex-start' }}>パスワードを変更する</button>
          </div>
        </div>

        {/* 操作ログ：いつ・誰が・何を操作したかの記録（でお要望2026-10-03）。トラブル確認とAIコンサルの学習に使う */}
        <div className="tab-pane" id="tab-activity-log">
          <ActivityLogPanel />
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
            <div id="deposit-settings-box" style={{ display: 'none', padding: '14px 16px', background: 'rgba(26,20,16,0.03)', border: '1px solid rgba(26,20,16,0.12)', borderRadius: '10px' }}>
              <p style={{ fontSize: '13.5px', fontWeight: 700, margin: '0 0 4px' }}>予約デポジット</p>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 10px', lineHeight: '1.6' }}>金額を設定すると、即時予約で確定した予約にお客様の前払いデポジットを求められます。0円または空欄で無効になります。</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px' }}>¥</span>
                <input type="number" id="deposit-amount-input" min="0" step="100" style={{ width: '120px', padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                <button type="button" className="btn btn-ghost" id="deposit-amount-save" style={{ fontSize: '12px', padding: '8px 14px' }}>保存する</button>
                <span id="deposit-amount-msg" style={{ fontSize: '12px' }}></span>
              </div>
              <p id="deposit-payment-warn" className="muted" style={{ fontSize: '12px', margin: '10px 0 0', display: 'none' }}>オンライン決済の受け入れ設定が完了していないため、デポジットを設定しても実際には請求されません。「Fineme利用契約」タブから設定してください。</p>
            </div>
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

            {/* メニューの並び順（カテゴリー自体の順序）とタブの配置（どのタブがどのカテゴリーに
                属し、カテゴリー内でどう並ぶか）を1つに統合（でお要望2026-09-27「統合するべき」）。
                カテゴリー自体を任意の名前で追加できるようにもした（でお要望「『ホーム』や
                『予約』などの大きいタブも任意の名前で追加できるようにしてほしい」）。 */}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>メニューの並び順・タブの配置</p>
              <p className="muted" style={{ fontSize: '12px', margin: '0 0 10px', lineHeight: '1.6' }}>
                カテゴリー自体の並び順・追加・名前変更・削除と、各タブをどのカテゴリーに入れるか・カテゴリー内でどの順に並べるかを、まとめて変更できます（未設定なら今の構成のまま）。
              </p>
              <div id="ds-layout" className="stack" style={{ gap: '14px' }}>読み込み中…</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                <input type="text" id="ds-new-category-input" placeholder="新しいカテゴリー名（例：スクール運営）" maxLength={MAX_CATEGORY_LABEL_LENGTH} style={{ flex: 1, maxWidth: '260px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }} />
                <button type="button" className="btn btn-ghost" id="ds-new-category-btn" style={{ fontSize: '12px', padding: '8px 14px' }}>＋ カテゴリーを追加</button>
              </div>
              <span id="ds-layout-msg" style={{ fontSize: '12px' }}></span>
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

        {/* タブ⑦：紹介報酬（でお方針2026-10-02：掲載者＝営業パートナーの自動一体化を廃止。
            掲載者も「希望すれば」別途sales_partnersへ登録するopt-in方式に変更。
            登録していない掲載者には紹介コードを出さず、登録導線のみ出す） */}
        <div className="tab-pane" id="tab-referral">
          <div id="referral-optin-prompt" className="card stack" style={{ padding: '24px', gap: '14px', display: 'none' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>紹介報酬（営業パートナー）</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              Finemeを他の店舗・事業者にご紹介いただくと、直接ご紹介いただいた掲載者が月額課金を継続している間、継続的な紹介報酬が発生します。
              これは掲載契約とは別の、任意の登録です。登録しなくても掲載のご利用に影響はありません。
            </p>
            <button className="btn" style={{ alignSelf: 'flex-start' }} id="referral-optin-btn">営業パートナーとして登録する</button>
          </div>

          <div id="referral-registered-content" className="card stack" style={{ padding: '24px', gap: '16px', display: 'none' }}>
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
              <a id="referral-portal-link" href="#" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#6366f1' }}>専用の営業パートナー管理画面を開く ↗</a>
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
            <h2 style={{ margin: '0', fontSize: '16px' }}>友達紹介プログラム</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              オンにすると、お客様（Finemeログイン中の会員）が公開ページから個人紹介リンクを発行できるようになります。紹介経由の予約・来店を自動で記録し、双方にLINEで通知します。特典の内容・実際の付与は貴店の運用にお任せします（特典のやり取りはFinemeを通りません）。
            </p>
            {/* でお要望2026-09-30：紹介ボックスの文言・特典・画像・任意ボタンを自由に編集できるように */}
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>紹介文言（お客様に表示される本文。未入力なら「（店舗名）を友達に紹介できます。」）</label>
              <textarea id="mref-message-text" placeholder="例：いつもご利用ありがとうございます。ぜひお友達にもこのお店をご紹介ください！" style={{ minHeight: '70px' }}></textarea>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>特典の説明文（お客様に表示されます）</label>
              <input type="text" id="mref-reward-text" placeholder="例：紹介した方・された方どちらも次回500円引き" />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>バナー画像（任意）</label>
              <div id="mref-image-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                <img id="mref-image-preview" src="" alt="紹介バナー画像" style={{ width: '100%', maxWidth: '320px', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              </div>
              <input type="file" id="mref-image-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
              <button type="button" id="mref-image-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>画像を選択（5MB以内・jpg/png/webp）</button>
              <p id="mref-image-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>任意ボタンの文字（任意）</label>
                <input type="text" id="mref-button-label" placeholder="例：キャンペーン詳細" />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>ボタンのリンク先URL（http(s)のみ有効）</label>
                <input type="text" id="mref-button-url" placeholder="https://..." />
              </div>
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
      <ConsultantWidget />
    </main>
  );
}
