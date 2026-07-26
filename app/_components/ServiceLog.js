'use client';
import { useEffect, useRef } from 'react';
import useTrack from '@/app/_hooks/useTrack';
import {
  axisChoicesFor, resolveAxis, CUSTOM_AXIS, CUSTOM_ICON_CHOICES, DEFAULT_CUSTOM_ICON,
  monthlyCost, costSummary, formatYen, BUDGET_LABELS,
  effectiveFreq, formatFreq, idealNextDate, daysUntilIdeal, FREQ_PRESETS,
} from '@/lib/log-axes';
import { listLogs, createLog, updateLog, removeLog, getAccessToken } from '@/lib/log-store';

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

      /* ── 費用サマリー ── */
      .log-cost-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 20px 20px 18px; margin-bottom: 20px; }
      .log-cost-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: rgba(201,168,76,0.6); margin: 0 0 10px; }
      .log-cost-main { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
      .log-cost-month { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(24px,6vw,32px); font-weight: 800; color: #c9a84c; }
      .log-cost-year { font-size: 13px; color: rgba(232,228,220,0.45); }
      .log-cost-bars { display: flex; flex-direction: column; gap: 7px; }
      .log-cost-row { display: flex; align-items: center; gap: 10px; font-size: 12px; }
      .log-cost-row-label { flex: 0 0 auto; min-width: 96px; color: rgba(232,228,220,0.72); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .log-cost-bar { flex: 1; height: 6px; background: rgba(232,228,220,0.07); border-radius: 99px; overflow: hidden; }
      .log-cost-bar-fill { display: block; height: 100%; background: linear-gradient(90deg, rgba(201,168,76,0.85), rgba(232,201,122,0.6)); border-radius: 99px; }
      .log-cost-row-val { flex: 0 0 auto; color: rgba(232,228,220,0.55); font-variant-numeric: tabular-nums; }
      .log-cost-note { font-size: 11px; color: rgba(232,228,220,0.35); margin: 12px 0 0; }
      .log-cost-budget { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(201,168,76,0.14); }
      .log-cost-budget p { font-size: 12px; color: rgba(232,228,220,0.55); margin: 0 0 3px; line-height: 1.7; }
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
      .log-visit-pick { background: rgba(232,228,220,0.04); border: 1px solid rgba(232,228,220,0.14); color: rgba(232,228,220,0.6); position: relative; }
      .log-visit-pick:hover { border-color: rgba(201,168,76,0.4); color: rgba(232,228,220,0.85); }
      /* input はラベル内に隠すが、クリック領域として生かす（ネイティブのカレンダーが開く） */
      .log-visit-pick input[type="date"] { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0; }

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

    // Me Scan の予算回答（あれば実費と並べる）
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest') || localStorage.getItem('fineme:diagnosis:belle');
      if (raw) budget = JSON.parse(raw)?.budget || null;
    } catch {}

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
    function renderCostSummary() {
      const s = costSummary(logs);
      if (!s.counted && !s.irregular) return '';

      const bars = s.byAxis.slice(0, 6).map(row => {
        const def = resolveAxis(row.axis, row.customIcon);
        const pct = s.monthly ? Math.max(4, Math.round((row.monthly / s.monthly) * 100)) : 0;
        return `
          <div class="log-cost-row">
            <span class="log-cost-row-label">${def.icon} ${esc(def.label)}</span>
            <span class="log-cost-bar"><span class="log-cost-bar-fill" style="width:${pct}%"></span></span>
            <span class="log-cost-row-val">${row.estimated ? '約' : ''}${formatYen(row.monthly)}</span>
          </div>`;
      }).join('');

      const budgetLine = budget && BUDGET_LABELS[budget] && s.counted ? `
        <div class="log-cost-budget">
          <p>Me Scan では「${BUDGET_LABELS[budget]}」と答えていました</p>
          <p>いま登録されている分の合計は 月 ${formatYen(s.monthly)} です</p>
        </div>` : '';

      return `
        <div class="log-cost-card">
          <p class="log-cost-eyebrow">自分に使っている額</p>
          <div class="log-cost-main">
            <span class="log-cost-month">月 ${formatYen(s.monthly)}</span>
            <span class="log-cost-year">年 ${formatYen(s.yearly)}</span>
          </div>
          ${bars ? `<div class="log-cost-bars">${bars}</div>` : ''}
          ${s.estimated ? `<p class="log-cost-note">「約」がついた分は、軸ごとの目安の頻度で計算しています（頻度を入れると実額に変わります）</p>` : ''}
          ${s.unknown ? `<p class="log-cost-note">＋ ${s.unknown}件は頻度の目安がないため合計に入れていません</p>` : ''}
          ${budgetLine}
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

          return `
            <div class="log-card" data-id="${log.id}">
              <div class="log-card-top">
                <div>
                  <p class="log-card-name">${esc(log.name)}</p>
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
                <label class="log-visit-pick">
                  📅 日付を選ぶ
                  <input type="date" data-visit-date="${log.id}" />
                </label>
              </div>
            </div>`;
        }).join('');
        return `<div class="log-axis-section">
          <p class="log-axis-label">${def.icon} ${esc(def.label)}</p>
          ${cards}
        </div>`;
      }).join('');

      root.innerHTML = `
        ${header}
        ${renderCostSummary()}
        <button class="log-add-btn" id="log-open-add">＋ 追加する</button>
        ${sectionsHtml}
        ${renderGuestCta()}`;
      bindEvents();
    }

    // ── モーダル ──
    function openModal(log = null) {
      editingId = log?.id || null;
      selectedProvider = log?.provider_slug ? { slug: log.provider_slug, type: log.provider_type } : null;
      customIcon = log?.custom_icon || DEFAULT_CUSTOM_ICON;

      const choices = axisChoicesFor(trackRef.current);
      const known = choices.some(c => c.id === log?.axis);
      const isCustom = !!log && !known;

      const axisOptions = choices.map(c =>
        `<option value="${c.id}"${log?.axis === c.id ? ' selected' : ''}>${c.icon} ${esc(c.label)}</option>`
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

    // 「行った」を1タップで記録する。
    // 予約日（next_visit）は消化されたので空に戻し、次のサイクルを始める。
    // 次に行く目安は last_visit + 頻度 から自動で出るため、入力させない。
    async function markVisited(id, dateStr) {
      if (!dateStr) return;
      try {
        await updateLog(id, { last_visit: dateStr, next_visit: null });
        await fetchLogs();
        render();
      } catch (e) {
        alert('記録に失敗しました: ' + e.message);
      }
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
        markVisited(todayBtn.dataset.visitToday, new Date().toISOString().slice(0, 10));
        return;
      }
    });

    // 日付を選んで記録（label 内の date input がネイティブのカレンダーを開く）
    root.addEventListener('change', e => {
      const dateInput = e.target.closest('[data-visit-date]');
      if (!dateInput) return;
      markVisited(dateInput.dataset.visitDate, dateInput.value);
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
