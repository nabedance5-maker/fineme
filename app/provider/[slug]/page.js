'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { hasFeature } from '@/lib/feature-flags';
import { isClosedWeekday } from '@/lib/closed-weekday';
import { WEEKDAY_LABEL_BH } from '@/lib/business-hours-labels';
import { themeToCssVars } from '@/lib/provider-theme';

const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

// ── 定数 ─────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚関連サービス', diagnosis:'骨格診断',
};
const CAT_TO_AXIS = {
  gym:'body', eyebrow:'eyebrow', fashion:'fashion',
  hair:'hair', aga:'hair',
  makeup:'skin', hairremoval:'skin', esthetic:'skin',
  whitening:'teeth', orthodontics:'teeth',
  nail:'nail',
};
const AXIS_LABELS = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
const AXIS_ICONS  = { body:'', eyebrow:'', fashion:'', hair:'', skin:'', teeth:'', nail:'' };
const PATH_LABELS = { virgin:'初めて', quit:'続かなかった', blind:'非客観視', lapsed:'以前やっていた' };
const PATH_COLORS = { virgin:'#10b981', quit:'#f59e0b', blind:'#6366f1', lapsed:'#3b82f6' };
const PATH_PERSON = { virgin:'外見ケアが初めての方', quit:'続かなかった経験がある方', blind:'自己流でやってきたが客観評価がない方', lapsed:'以前やっていたが後回しにしている方' };
const FAILURE_ICONS  = { lost_direction:'', no_continuation:'', no_result:'️', cost:'', awkward:'' };
const TRIGGER_ICONS  = { matching_app:'', love:'️', career:'', word:'', vague:'' };
const TRIGGER_PERSON = { matching_app:'マッチングアプリの写真を良くしたい方', love:'恋愛・告白前に外見を整えたい方', career:'就職・転職前に印象を変えたい方', word:'誰かの一言が刺さって変わろうと思った方', vague:'ずっと気になっていたが踏み出せなかった方' };
const FAILURE_PERSON = { lost_direction:'一度やめてしまったが、また変わりたい方', no_continuation:'始めても続かなかった経験がある方', no_result:'自己流でやっているが、客観的な視点がほしい方', cost:'コストが気になって踏み出せなかった方', awkward:'担当者との関係性に悩んだ経験がある方' };
const STYLE_LABELS = {
  explanation:'「なぜそうするのか」を丁寧に説明するスタイル',
  consultation:'一緒に相談しながら進めるスタイル',
  delegate:'任せてもらって結果を出すスタイル',
  cautious:'小さく始めて様子を見ながら進めるスタイル',
};
const FAILURE_LABELS = {
  lost_direction:'方向を見失った経験がある方（再開タイプ）',
  no_continuation:'続かなかった経験がある方（継続タイプ）',
  no_result:'変化が感じられなかった方（非客観視タイプ）',
  cost:'コストで断念した経験がある方',
  awkward:'プロとの相性で悩んだ経験がある方',
};
const TIME_OPTIONS = ['9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

// 公開ページの3タブ構成（でお要望2026-09-29：「基本情報」「予約」「アピール」を
// タブとして明確に分ける）。元々「見た目を整えたい人向けのポータル」だった構想の
// アピール要素（旧guide+program）は残しつつ、SaaS導入店舗の既存客が最短で
// 予約・空き状況・住所にたどり着けるようにする。診断/Mirror経由の訪問者だけ
// ?tab=appealで従来通りアピールタブに着地させる（呼び出し元は各リンク側で付与）。
const TABS = [
  { id: 'basic',   label: '基本情報' },
  { id: 'consult', label: '予約' },
  { id: 'appeal',  label: 'アピール' },
];
// 予約タブを「予約（即時予約）」と「リクエスト」に分離（でお指摘2026-10-01：
// 「予約タブの中身がリクエストになっていて、即時予約のタブが無い」。即時予約
// （instant_booking）がONの店舗だけ別タブ'instant'を持ち、予約リクエスト
// （booking_request、デフォルトON）は従来のid'consult'のまま中身はリクエスト
// フォーム・ラベルだけ「リクエスト」に変える。両方OFFの店舗だけ'consult'を
// 「予約」ラベルの受付停止メッセージとして残す（下のConsultTabのmode分岐で判定）。
// クラス管理（スクール業態）がONの店舗だけ「クラス」タブを追加する
// （でお指摘2026-09-16：クラス管理は名簿管理のみで、お客様が予約できる導線が無かった）
function tabsFor(provider) {
  const instantOn = hasFeature(provider, 'instant_booking');
  const requestOn = hasFeature(provider, 'booking_request');
  let tabs = [{ id: 'basic', label: '基本情報' }];
  if (instantOn) tabs.push({ id: 'instant', label: '予約' });
  if (requestOn) tabs.push({ id: 'consult', label: 'リクエスト' });
  if (!instantOn && !requestOn) tabs.push({ id: 'consult', label: '予約' });
  tabs.push({ id: 'appeal', label: 'アピール' });
  if (hasFeature(provider, 'class_management')) {
    tabs.push({ id: 'class', label: 'クラス' });
  }
  // 回数券のオンライン購入（でお要望2026-09-27：決済機能Phase 6第一弾）。
  // 購入可能な回数券が無い店舗でも「無い」ことが分かるよう常に表示する
  // （プログラムタブと同じ扱い。空の時の表示はPackagesTab側で出す）。
  tabs.push({ id: 'packages', label: '回数券' });
  return tabs;
}
// 「今すぐ予約する」系CTAの着地先（即時予約があればそちら、無ければリクエスト/受付停止タブ）
function primaryBookingTabId(provider) {
  return hasFeature(provider, 'instant_booking') ? 'instant' : 'consult';
}
const PAYMENT_METHOD_LABELS = {
  cash: '現金', credit: 'クレジットカード', paypay: 'PayPay',
  rakuten_pay: '楽天Pay', line_pay: 'LINE Pay', bank: '銀行振込', other: 'その他',
};

// ── ヘルパー関数 ──────────────────────────────────────────────────────────────

const WEEKDAY_KEYS_BH = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// 「この日のここは空いてる、と直感的にわかる」（でお要望2026-09-29）ための
// 本日の営業状況テキスト。lib/closed-weekday.jsのisClosedWeekday()と同じ
// 曜日判定基準（UTC基準の日付文字列）を使う。business_hoursが無い店舗はnull。
function todayStatusText(provider) {
  const hours = provider?.business_hours;
  if (!hours) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (isClosedWeekday(hours, todayStr)) return '本日は定休日';
  const key = WEEKDAY_KEYS_BH[new Date(`${todayStr}T00:00:00Z`).getUTCDay()];
  const today = hours[key];
  if (!today?.open || !today?.close) return null;
  return `本日 ${today.open}〜${today.close <= today.open ? '翌' + today.close : today.close} 営業中`;
}

// 住所の地図検索リンク（でお要望2026-09-29：住所を公開表示し地図リンクも追加）。
// 埋め込み地図は使わず、外部のGoogleマップ検索へのリンクのみ（実装コストを抑える）。
function fullAddressOf(provider) {
  return [provider?.prefecture, provider?.city, provider?.address].filter(Boolean).join('');
}
function mapsHrefFor(provider) {
  const fullAddress = fullAddressOf(provider);
  if (!fullAddress) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${provider.name || ''} ${fullAddress}`)}`;
}

function calcMatch(provider, diagnosis) {
  if (!diagnosis?.transform_vectors) {
    let score = 0, total = 0;
    if (diagnosis?.trigger && provider.suitable_triggers?.length) { total += 2; if (provider.suitable_triggers.includes(diagnosis.trigger)) score += 2; }
    if (diagnosis?.failure_pattern && provider.handles_failure_patterns?.length) { total += 3; if (provider.handles_failure_patterns.includes(diagnosis.failure_pattern)) score += 3; }
    if (diagnosis?.style && provider.provider_style) { total += 2; if (provider.provider_style === diagnosis.style) score += 2; }
    return { score: total === 0 ? null : Math.round((score / total) * 100), detail: null };
  }
  const vectors = diagnosis.transform_vectors;
  const compassFirst = diagnosis.compass_first;
  const compassAxis = compassFirst ? (CAT_TO_AXIS[compassFirst] || compassFirst) : null;
  const allCats = [provider.main_category, ...(provider.sub_categories || [])].filter(Boolean);
  const coveredAxisIds = [...new Set(allCats.map(c => CAT_TO_AXIS[c]).filter(Boolean))];
  if (coveredAxisIds.length === 0) {
    let score = 0, total = 0;
    if (diagnosis.trigger && provider.suitable_triggers?.length) { total += 2; if (provider.suitable_triggers.includes(diagnosis.trigger)) score += 2; }
    if (diagnosis.failure_pattern && provider.handles_failure_patterns?.length) { total += 3; if (provider.handles_failure_patterns.includes(diagnosis.failure_pattern)) score += 3; }
    return { score: total === 0 ? null : Math.round((score / total) * 100), detail: null };
  }
  let score = 0, total = 0;
  const axisDetails = [];
  const PATH_TO_FAILURE = { virgin: null, quit: 'no_continuation', blind: 'no_result', lapsed: 'lost_direction' };
  for (const axisId of coveredAxisIds) {
    const v = vectors.find(vec => vec.id === axisId);
    if (!v) continue;
    const isCompass = axisId === compassAxis;
    total += 4;
    if (v.gap >= 4) score += 4; else if (v.gap >= 2) score += 3; else if (v.gap >= 1) score += 2;
    const expectedFailure = PATH_TO_FAILURE[v.path_type];
    if (expectedFailure && provider.handles_failure_patterns?.length) {
      total += 2;
      if (provider.handles_failure_patterns.includes(expectedFailure)) score += 2;
    }
    axisDetails.push({ id: axisId, gap: v.gap || 0, tier: v.tier || 4, path_type: v.path_type, isCompass });
  }
  const isCompassProvider = compassAxis && coveredAxisIds.includes(compassAxis);
  if (isCompassProvider) { total += 3; score += 3; }
  if (diagnosis.style && provider.provider_style) { total += 1; if (provider.provider_style === diagnosis.style) score += 1; }
  axisDetails.sort((a, b) => { if (a.isCompass && !b.isCompass) return -1; if (!a.isCompass && b.isCompass) return 1; return b.gap - a.gap; });
  return { score: total === 0 ? null : Math.round((score / total) * 100), detail: { coveredAxes: axisDetails, isCompassProvider } };
}

/** New Me Navi接点のナラティブ生成 */
function buildNarrative(diagnosis, matchData) {
  if (!diagnosis?.transform_vectors || !matchData?.detail) return [];
  const { coveredAxes, isCompassProvider } = matchData.detail;
  const lines = [];
  if (isCompassProvider) {
    const compassAx = coveredAxes.find(ax => ax.isCompass);
    if (compassAx) lines.push(`あなたのFinemeコンパスが示す最優先エリア【${AXIS_LABELS[compassAx.id] || compassAx.id}】をこのガイドと進めることができます。`);
  }
  const topAxis = coveredAxes[0];
  if (topAxis?.path_type) {
    const axLabel = AXIS_LABELS[topAxis.id] || 'このエリア';
    const pathNarrative = {
      virgin: `${axLabel}が初めての方を、基礎から丁寧にサポートすることが得意です。`,
      quit: `「続かなかった」経験がある方に特に強みがあります。続けられる仕組みをつくることが得意です。`,
      blind: `取り組んでいるが「自分では客観的に見られない」という方に強みがあります。外からの視点を持ち込みます。`,
      lapsed: `一度取り組みが途切れてしまった方の再スタートを得意としています。ハードルを下げるところから始めます。`,
    }[topAxis.path_type];
    if (pathNarrative) lines.push(pathNarrative);
  }
  if (topAxis?.gap >= 4) lines.push('変化の伸びしろが大きく、取り組みの効果を実感しやすいエリアです。');
  return lines;
}

/** 相談フォームに添付するMe Scanサマリー */
function buildMeScanSummary(diagnosis, matchData) {
  if (!diagnosis?.transform_vectors || !matchData?.detail?.coveredAxes?.length) return null;
  const topAxis = matchData.detail.coveredAxes[0];
  if (!topAxis) return null;
  const lines = [`最優先トラック: ${AXIS_LABELS[topAxis.id]}（ギャップ +${topAxis.gap}）`];
  if (topAxis.path_type) lines.push(`来た道: ${PATH_LABELS[topAxis.path_type]}`);
  if (diagnosis.goal_change) {
    const g = String(diagnosis.goal_change);
    lines.push(`ゴール: ${g.length > 40 ? g.slice(0, 40) + '…' : g}`);
  }
  return lines;
}

// ── 施設写真ストリップ ──────────────────────────────────────────────────────────
function FacilityPhotosStrip({ provider }) {
  const photos = (provider.facility_photos || []).filter(Boolean);
  if (!photos.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {photos.map((url, i) => (
          <div key={i} style={{ flexShrink: 0, width: '160px', height: '108px', borderRadius: '12px', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)' }}>
            <img src={url} alt={`施設写真${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── クイックファクトストリップ（比較用基礎情報）──────────────────────────────
function QuickFactsStrip({ provider }) {
  const chips = [];
  const areaText = [provider.nearest_station, provider.area].filter(Boolean).join(' ／ ');
  if (areaText) chips.push({ label: areaText, highlight: false });
  if (provider.online_available) chips.push({ label: 'オンライン対応', highlight: true });
  if (provider.trial_available) chips.push({ label: 'お試し・無料相談あり', highlight: true });
  if (provider.response_hours) chips.push({ label: `返信${provider.response_hours}時間以内`, highlight: false });
  if (provider.payment_methods?.length > 0) {
    chips.push({ label: provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(' / '), highlight: false });
  }
  if (!chips.length) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flexWrap: 'nowrap' }}>
        {chips.map((chip, i) => (
          <span key={i} style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '7px 14px',
            background: chip.highlight ? 'rgba(5,150,105,0.15)' : 'var(--pv-surface)',
            color: chip.highlight ? '#10b981' : 'color-mix(in srgb, var(--pv-text) 75%, transparent)',
            border: `1px solid ${chip.highlight ? 'rgba(5,150,105,0.3)' : 'color-mix(in srgb, var(--pv-text) 15%, transparent)'}`,
            borderRadius: '99px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: chip.highlight ? '700' : '500',
            whiteSpace: 'nowrap',
          }}>
            <span>{chip.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── このガイドにしかできないこと（比較アンカー）──────────────────────────────
function UniqueStrengthsSection({ provider }) {
  if (!provider.unique_strengths) return null;
  return (
    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '18px', padding: '22px 24px' }}>
      <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: '#b45309', letterSpacing: '.12em', marginBottom: '12px', textTransform: 'uppercase' }}>このガイドにしかできないこと</div>
      <p style={{ fontSize: 'calc(15px * var(--pv-fs))', color: '#111', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>{provider.unique_strengths}</p>
    </div>
  );
}

// ── スタッフ紹介 ──────────────────────────────────────────────────────────────
function StaffSection({ staff }) {
  const [lightbox, setLightbox] = useState(null);
  if (!staff || staff.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.12em', marginBottom: '16px', textTransform: 'uppercase' }}>担当スタッフ紹介</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {staff.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '20px', background: 'var(--pv-surface)', borderRadius: '18px', border: '1.5px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', backdropFilter: 'blur(8px)' }}>
            {/* アバター */}
            <div style={{ flexShrink: 0 }}>
              {s.photo_url
                ? <img src={s.photo_url} alt={s.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid color-mix(in srgb, var(--pv-text) 25%, transparent)', display: 'block' }} />
                : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#e5e7eb,#d1d5db)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(28px * var(--pv-fs))' }}></div>
              }
            </div>
            {/* テキスト情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontSize: 'calc(16px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)' }}>{s.name}</span>
                {s.is_featured && (
                  <span style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '99px' }}>担当</span>
                )}
                {s.role && <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontWeight: '500' }}>{s.role}</span>}
              </div>
              {/* 経験・資格チップ */}
              {(s.experience_years || s.credentials) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {s.experience_years && (
                    <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: '#d1fae5', color: '#065f46', borderRadius: '99px' }}>
                      経験{s.experience_years}年
                    </span>
                  )}
                  {s.credentials && s.credentials.split('\n').filter(Boolean).slice(0, 2).map((cred, i) => (
                    <span key={i} style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '600', padding: '3px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: '99px' }}>
                      {cred.length > 20 ? cred.slice(0, 20) + '…' : cred}
                    </span>
                  ))}
                </div>
              )}
              {/* 自己紹介 */}
              {s.bio && (
                <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>「{s.bio}」</p>
              )}
              {s.gallery?.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', marginBottom: '8px' }}>実績</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: '8px' }}>
                    {s.gallery.map(ph => (
                      <button key={ph.id} type="button" onClick={() => setLightbox(ph)} aria-label={`${s.name}の実績写真を拡大${ph.caption ? `：${ph.caption}` : ''}`} style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1 / 1' }}>
                        <img src={ph.image_url} alt={ph.caption || `${s.name}の実績写真`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {lightbox && (
        <div onClick={() => setLightbox(null)} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.86)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', cursor: 'zoom-out' }}>
          <img src={lightbox.image_url} alt={lightbox.caption || '実績写真'} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
          {lightbox.caption && <div style={{ color: '#fff', fontSize: '14px', textAlign: 'center' }}>{lightbox.caption}</div>}
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>タップで閉じる</div>
        </div>
      )}
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
// でお指摘2026-10-01：タブが増える店舗（即時予約＋リクエスト＋クラス等）で
// 横幅に収まらず、日本語テキストが折り返されて縦書き風・2行になっていた
// （flexがボタンを押し縮め、white-space指定が無いため文字単位で折り返されていた）。
// 各ボタンをflexShrink:0+whiteSpace:nowrapで固定幅化し、外側を横スクロールに。
function TabBar({ activeTab, onSelect, tabs }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderBottom: '2px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', marginBottom: '28px', gap: '4px' }}>
      {(tabs || TABS).map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          flexShrink: 0, whiteSpace: 'nowrap',
          padding: '12px 20px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: activeTab === t.id ? '800' : '500',
          color: activeTab === t.id ? 'color-mix(in srgb, var(--pv-text) 90%, transparent)' : 'color-mix(in srgb, var(--pv-text) 62%, transparent)', background: 'none', border: 'none',
          borderBottom: activeTab === t.id ? '2px solid var(--pv-accent)' : '2px solid transparent',
          marginBottom: '-2px', cursor: 'pointer', transition: 'all .15s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Section A: New Me Navi との接点 ────────────────────────────────────────────
function NewMeMapSection({ diagnosis, matchData }) {
  const isNewStyle = !!diagnosis?.transform_vectors;
  const { score, detail } = matchData || {};

  if (!diagnosis) {
    return (
      <div style={{ padding: '24px', borderRadius: '16px', border: '1.5px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', background: 'var(--pv-surface)', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', margin: '0 0 6px' }}>Me Scanを受けると、このガイドとの接点がわかります</p>
        <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', margin: '0 0 16px', lineHeight: '1.7' }}>あなたの変容プロファイル（最優先トラック・来た道・ゴール）とこのガイドが合っているかを、8軸で確認できます。</p>
        <a href="/diagnosis" style={{ display: 'inline-block', padding: '10px 22px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
          無料でMe Scanを受ける（約12〜18分）
        </a>
      </div>
    );
  }

  const narratives = buildNarrative(diagnosis, matchData);

  return (
    <div style={{ borderRadius: '16px', border: '1.5px solid #bfdbfe', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', overflow: 'hidden' }}>
      {/* スコアヘッダー */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #bfdbfe' }}>
        <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', color: '#2563eb', letterSpacing: '.05em', marginBottom: '8px' }}>
          {isNewStyle ? 'New Me Navi との接点' : 'あなたの診断との一致度'}
        </div>
        {score !== null ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'calc(36px * var(--pv-fs))', fontWeight: '800', color: '#1d4ed8', lineHeight: 1 }}>{score}%</span>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ height: '10px', background: '#dbeafe', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: score >= 70 ? '#1d4ed8' : score >= 45 ? '#3b82f6' : '#93c5fd', borderRadius: '99px', width: `${score}%`, transition: 'width .5s' }} />
                </div>
              </div>
              {detail?.isCompassProvider && (
                <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '4px 12px', background: '#1d4ed8', color: '#fff', borderRadius: '99px' }}>コンパス一致</span>
              )}
            </div>
            <p style={{ fontSize: 'calc(11px * var(--pv-fs))', color: '#93c5fd', margin: '6px 0 0', lineHeight: '1.5' }}>※ Me Scan 8軸診断（変容ベクトル・来た道・ギャップ）との相性スコア</p>
          </>
        ) : (
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: '#111', margin: 0 }}>診断結果と照らし合わせています。</p>
        )}
      </div>

      {/* カバー軸リスト */}
      {isNewStyle && detail?.coveredAxes?.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: '#1e40af', margin: '0 0 10px' }}>このガイドがカバーするあなたのトラック</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.coveredAxes.map(ax => (
              <div key={ax.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: ax.isCompass ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.7)', borderRadius: '10px', border: ax.isCompass ? '1px solid #93c5fd' : '1px solid rgba(255,255,255,0.5)' }}>
                <span style={{ fontSize: 'calc(18px * var(--pv-fs))', flexShrink: 0 }}>{AXIS_ICONS[ax.id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '800', color: '#111' }}>{AXIS_LABELS[ax.id]}</span>
                    {ax.isCompass && <span style={{ fontSize: 'calc(11px * var(--pv-fs))', color: '#2563eb', fontWeight: '700' }}>← 最優先</span>}
                    {ax.path_type && (
                      <span style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '2px 8px', background: PATH_COLORS[ax.path_type] + '25', color: PATH_COLORS[ax.path_type], borderRadius: '99px' }}>
                        {PATH_LABELS[ax.path_type]}
                      </span>
                    )}
                  </div>
                  {/* 現在地→理想バー */}
                  {ax.gap > 0 && (
                    <div style={{ position: 'relative', height: '6px', background: '#dbeafe', borderRadius: '99px', overflow: 'visible' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: '#2563eb', borderRadius: '99px', width: `${Math.max(10, (10 - ax.gap) / 10 * 100)}%` }} />
                      <span style={{ position: 'absolute', right: 0, top: '-14px', fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '700', color: '#111' }}>理想</span>
                    </div>
                  )}
                </div>
                {ax.gap > 0 && (
                  <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: ax.gap >= 4 ? '#dc2626' : ax.gap >= 2 ? '#d97706' : '#059669', flexShrink: 0 }}>
                    +{ax.gap}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ナラティブ */}
      {narratives.length > 0 && (
        <div style={{ padding: '16px 20px' }}>
          {narratives.map((n, i) => (
            <p key={i} style={{ fontSize: 'calc(14px * var(--pv-fs))', color: '#1e3a8a', lineHeight: '1.7', margin: i < narratives.length - 1 ? '0 0 8px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section B: このガイドの変容哲学（LP型）──────────────────────────────────
function PhilosophySection({ provider }) {
  // target_desc を行ごとに分解してカード化
  const targetLines = provider.target_desc
    ? provider.target_desc.split(/\n/).map(s => s.replace(/^[・▶\s]+/, '').trim()).filter(Boolean)
    : [];

  const personCards = [
    ...(provider.handles_failure_patterns || []).map(f => ({ icon: FAILURE_ICONS[f] || '✓', text: FAILURE_PERSON[f] || f })),
    ...(provider.suitable_triggers || []).map(t => ({ icon: TRIGGER_ICONS[t] || '✓', text: TRIGGER_PERSON[t] || t })),
  ];

  const hasTargetBlock = targetLines.length > 0 || personCards.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ━━ Block 1: こんな方へ ━━ */}
      {hasTargetBlock && (
        <div style={{ background: 'var(--pv-surface)', borderRadius: '20px', padding: '28px 24px', backdropFilter: 'blur(8px)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.12em', marginBottom: '18px', textTransform: 'uppercase' }}>このガイドが伴走できる人</div>

          {/* target_desc 行リスト */}
          {targetLines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: personCards.length > 0 ? '18px' : '0' }}>
              {targetLines.map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ width: '22px', height: '22px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                  <span style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', lineHeight: '1.6', fontWeight: '500' }}>{line}</span>
                </div>
              ))}
            </div>
          )}

          {/* failure/trigger カードグリッド */}
          {personCards.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {personCards.map((card, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'var(--pv-surface)', borderRadius: '14px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                  <span style={{ fontSize: 'calc(22px * var(--pv-fs))', flexShrink: 0, lineHeight: 1 }}>{card.icon}</span>
                  <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.55' }}>{card.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━ Block 2: 哲学 pull-quote ━━ */}
      {provider.philosophy && (
        <div style={{ position: 'relative', background: 'color-mix(in srgb, var(--pv-accent) 16%, #0d1117)', borderRadius: '20px', padding: '40px 28px 32px', overflow: 'hidden' }}>
          {/* 装飾クオート */}
          <div style={{ position: 'absolute', top: '8px', left: '18px', fontSize: 'calc(96px * var(--pv-fs))', color: 'rgba(255,255,255,0.05)', fontFamily: 'Georgia, serif', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}></div>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '.12em', marginBottom: '18px', position: 'relative', textTransform: 'uppercase' }}>このガイドが大切にしていること</div>
          <p style={{ fontSize: 'calc(16px * var(--pv-fs))', color: 'rgba(255,255,255,0.92)', lineHeight: '1.95', margin: '0', whiteSpace: 'pre-wrap', fontWeight: '500', position: 'relative', zIndex: 1 }}>{provider.philosophy}</p>
          {provider.provider_style && (
            <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>スタイル</span>
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{STYLE_LABELS[provider.provider_style] || provider.provider_style}</span>
            </div>
          )}
        </div>
      )}

      {/* ━━ Block 2.5: 変容ストーリー（AIマッチング用テキストフィールド） ━━ */}
      {(provider.ideal_client_desc || provider.client_before_state || provider.transformation_pattern || provider.best_fit_desc) && (
        <div style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '18px', padding: '22px', background: 'var(--pv-surface)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.12em', marginBottom: '18px', textTransform: 'uppercase' }}>来る方のリアルなストーリー</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {provider.ideal_client_desc && (
              <div>
                <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', color: '#6366f1', marginBottom: '6px', letterSpacing: '.05em' }}>よく来るお客様の状況・背景</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.ideal_client_desc}</p>
              </div>
            )}
            {provider.client_before_state && (
              <div>
                <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', color: '#818cf8', marginBottom: '6px', letterSpacing: '.05em' }}>来る前の典型的な状態</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.client_before_state}</p>
              </div>
            )}
            {provider.transformation_pattern && (
              <div>
                <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', color: '#34d399', marginBottom: '6px', letterSpacing: '.05em' }}>よく起きる変化のパターン</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.transformation_pattern}</p>
              </div>
            )}
            {provider.best_fit_desc && (
              <div style={{ background: 'rgba(5,150,105,0.12)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(5,150,105,0.2)' }}>
                <div style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', color: '#34d399', marginBottom: '6px', letterSpacing: '.05em' }}>特に向いている人・状況</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.best_fit_desc}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━ Block 3: サービス詳細 ━━ */}
      {provider.description && (
        <div style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '18px', padding: '22px', background: 'var(--pv-surface)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.12em', marginBottom: '12px', textTransform: 'uppercase' }}>この一手でできること</div>
          <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.description}</p>
        </div>
      )}
    </div>
  );
}

// ── Section C: 変容の証言（before/after カード型）────────────────────────────
function StoriesSection({ stories, provider }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'calc(16px * var(--pv-hs))', fontWeight: '800', margin: '0' }}>変容の証言</h2>
        {stories.length > 0 && <span style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontWeight: '600', background: 'var(--pv-surface)', padding: '2px 10px', borderRadius: '99px' }}>{stories.length}件</span>}
      </div>
      {stories.length === 0 ? (
        <div style={{ background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: '18px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 'calc(36px * var(--pv-fs))', marginBottom: '12px' }}>️</div>
          <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>このガイドへの最初の証言を残す人になれます</p>
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: '#111', margin: '0 0 18px', lineHeight: '1.7' }}>相談・来店後に「変わる前」と「今」をありのままに残してください。あなたの声が次の誰かの地図になります。</p>
          {provider?.slug && (
            <a href={`/story-submit?providerId=${provider.id || ''}`} style={{ display: 'inline-block', padding: '10px 22px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '10px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
              体験談を書く（無料）
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {stories.map(s => (
            <div key={s.id} style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
              {/* ヘッダー: 軸・来た道 */}
              {(s.axis_id || s.path_type) && (
                <div style={{ background: 'var(--pv-surface)', padding: '10px 16px', borderBottom: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {s.axis_id && (
                    <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: '#ecfdf5', color: '#059669', borderRadius: '99px' }}>
                      {AXIS_ICONS[s.axis_id]} {AXIS_LABELS[s.axis_id] || s.axis_id}トラック
                    </span>
                  )}
                  {s.path_type && (
                    <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: (PATH_COLORS[s.path_type] || '#6b7280') + '20', color: PATH_COLORS[s.path_type] || '#6b7280', borderRadius: '99px' }}>
                      {PATH_LABELS[s.path_type] || s.path_type}
                    </span>
                  )}
                </div>
              )}

              {/* AFTER ブロック（先頭・タイトル扱い） */}
              <div style={{ background: '#f0fdf4', padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: '#059669', letterSpacing: '.12em', marginBottom: '10px', textTransform: 'uppercase' }}>After — 今ここにいる</div>
                <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', color: '#111', margin: s.tags?.length ? '0 0 12px' : '0', lineHeight: '1.75' }}>{s.change_after}</p>
                {s.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {s.tags.map(t => <span key={t} style={{ fontSize: 'calc(11px * var(--pv-fs))', padding: '3px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '99px' }}>#{t}</span>)}
                  </div>
                )}
              </div>

              {/* 中継地点 or 矢印（逆向き） */}
              <div style={{ background: 'linear-gradient(to bottom, #f0fdf4 0%, #1f2937 100%)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px' }}>
                {s.milestone_reached ? (
                  <>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(16,185,129,0.25)' }} />
                    <div style={{ padding: '6px 14px', background: 'var(--pv-surface)', border: '1px solid #a7f3d0', borderRadius: '99px', fontSize: 'calc(12px * var(--pv-fs))', color: '#34d399', fontWeight: '700', whiteSpace: 'nowrap', boxShadow: '0 1px 6px rgba(5,150,105,.15)' }}>
                      {s.milestone_reached}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  </>
                ) : (
                  <div style={{ padding: '6px 14px', background: 'var(--pv-surface)', borderRadius: '99px', fontSize: 'calc(13px * var(--pv-fs))', color: 'var(--pv-text)', fontWeight: '600', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>出会う前</div>
                )}
              </div>

              {/* BEFORE ブロック（折りたたみ気味に小さく） */}
              <div style={{ background: '#1f2937', padding: '14px 20px' }}>
                <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'rgba(255,255,255,0.35)', letterSpacing: '.12em', marginBottom: '8px', textTransform: 'uppercase' }}>Before</div>
                <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.7' }}>{s.concern_before}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── タブ①「ガイドを知る」────────────────────────────────────────────────────
// アピールタブのブロック単位カスタム編集（でお要望2026-09-30：「公開ページ自体を
// もっと掲載者が自由に作り込めるようにしたらいいんじゃない？」）。位置・サイズ・
// 回転まで完全自由なビルダーは崩れたページを量産するリスクが高いため、見出し・
// 本文・画像・ボタン・引用の5種を上から順に並べる形に絞った（ダッシュボードの
// 「アピール設定」タブで追加・並び替え・削除できる）。ブロックが1件も無い店舗には
// 何も表示しない。
// カスタムブロック（見出し・本文・画像・ボタン・引用）1件分の描画。デフォルトセクションの
// 固定順レンダリング（旧仕様・未設定店舗向け）と、並び替え設定済み店舗向けの統合レンダリング
// （renderAppealBlock）の両方から呼ばれる共通部分。
function renderCustomBlockElement(b) {
  const c = b.content || {};
  if (b.block_type === 'heading') {
    return <h2 key={b.id} style={{ fontSize: 'calc(20px * var(--pv-hs))', fontWeight: '800', margin: 0, color: 'color-mix(in srgb, var(--pv-text) 92%, transparent)', textAlign: c.align === 'center' ? 'center' : 'left' }}>{c.text}</h2>;
  }
  if (b.block_type === 'paragraph') {
    return <p key={b.id} style={{ fontSize: 'calc(14px * var(--pv-fs))', lineHeight: '1.8', margin: 0, color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', whiteSpace: 'pre-wrap', textAlign: c.align === 'center' ? 'center' : 'left' }}>{c.text}</p>;
  }
  if (b.block_type === 'image' && c.url) {
    return (
      <figure key={b.id} style={{ margin: 0, maxWidth: c.size === 'full' ? '100%' : '360px', marginLeft: c.size === 'full' ? 0 : 'auto', marginRight: c.size === 'full' ? 0 : 'auto' }}>
        <img src={c.url} alt={c.caption || ''} style={{ width: '100%', borderRadius: '14px', display: 'block' }} />
        {c.caption && <figcaption style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', textAlign: 'center', marginTop: '6px' }}>{c.caption}</figcaption>}
      </figure>
    );
  }
  if (b.block_type === 'button' && c.label && c.url) {
    return (
      <a key={b.id} href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '12px 24px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
        {c.label}
      </a>
    );
  }
  if (b.block_type === 'quote' && c.text) {
    return (
      <blockquote key={b.id} style={{ margin: 0, padding: '16px 20px', borderLeft: '3px solid #c9a84c', background: 'var(--pv-surface)', borderRadius: '0 12px 12px 0' }}>
        <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontStyle: 'italic', color: 'color-mix(in srgb, var(--pv-text) 85%, transparent)', margin: 0, lineHeight: '1.8' }}>「{c.text}」</p>
        {c.attribution && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', margin: '8px 0 0' }}>— {c.attribution}</p>}
      </blockquote>
    );
  }
  return null;
}

function AppealBlocksSection({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {blocks.map(renderCustomBlockElement)}
    </div>
  );
}

// ガイドからのひと言カード（単独コンポーネント化。でお要望2026-10-01：デフォルト
// セクションも並び替え設定済み店舗向けの統合リスト〈renderAppealBlock〉から
// 個別に呼び出せるようにするため切り出した。表示内容・見た目は従来通り）。
function GuideMessageCard({ provider }) {
  if (!provider.guide_message) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--pv-accent) 7%, transparent) 0%, rgba(79,70,229,0.04) 100%)', border: '1px solid color-mix(in srgb, var(--pv-accent) 25%, transparent)', borderRadius: '16px', padding: '22px 24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      {provider.photo_url ? (
        <img src={provider.photo_url} alt={provider.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid color-mix(in srgb, var(--pv-accent) 30%, transparent)' }} />
      ) : (
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'color-mix(in srgb, var(--pv-accent) 15%, transparent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(22px * var(--pv-fs))' }}></div>
      )}
      <div>
        <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-accent) 70%, transparent)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>ガイドからのひと言</div>
        <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'var(--pv-text)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>{provider.guide_message}</p>
      </div>
    </div>
  );
}

// プログラム一覧セクション（単独コンポーネント化。GuideMessageCardと同じ理由）。
function ProgramSection({ services, onConsult, userPathType, provider, matchData }) {
  if (!services || services.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', letterSpacing: '.1em', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', textTransform: 'uppercase', margin: '0 0 12px' }}>プログラム</p>
      <ProgramTab services={services} onConsult={onConsult} userPathType={userPathType} provider={provider} matchData={matchData} />
    </div>
  );
}

// デフォルトセクションの並び替え・表示/非表示設定を一度でも保存した店舗向けの統合
// レンダリング（でお要望2026-10-01）。1件分のブロック（カスタム or builtin_*）を
// 描画する。hidden===trueは描画しない。
function renderAppealBlock(b, ctx) {
  if (b.hidden) return null;
  switch (b.block_type) {
    case 'builtin_guide_message':    return <GuideMessageCard key={b.id} provider={ctx.provider} />;
    case 'builtin_unique_strengths': return <UniqueStrengthsSection key={b.id} provider={ctx.provider} />;
    case 'builtin_staff':            return <StaffSection key={b.id} staff={ctx.staff} />;
    case 'builtin_newme_map':        return <NewMeMapSection key={b.id} diagnosis={ctx.diagnosis} matchData={ctx.matchData} />;
    case 'builtin_philosophy':       return <PhilosophySection key={b.id} provider={ctx.provider} />;
    case 'builtin_stories':          return <StoriesSection key={b.id} stories={ctx.stories} provider={ctx.provider} />;
    case 'builtin_program':          return <ProgramSection key={b.id} services={ctx.services} onConsult={ctx.onConsult} userPathType={ctx.userPathType} provider={ctx.provider} matchData={ctx.matchData} />;
    case 'heading': case 'paragraph': case 'image': case 'button': case 'quote':
      return renderCustomBlockElement(b);
    default: return null;
  }
}

// アピールタブ（でお要望2026-09-29：公開ページ3タブ再編。旧「ガイドを知る」＋
// 「プログラム」を1つに統合し、診断/Mirror経由の訪問者だけがこのタブに最初に
// 着地する構成にした。中身（理念・スタッフ紹介・体験談・サービスカード）は
// 従来のまま——タブの独立性だけをやめている）。
function AppealTab({ provider, diagnosis, matchData, stories, staff, services, appealBlocks, onConsult, userPathType, onGoToConsult }) {
  // でお要望2026-10-01：「デフォルトで表示されているものも自由に並び替えたり内容編集
  // したりできるように」。掲載者が一度でもダッシュボードの並び替え設定を開くとbuiltin_*行が
  // シードされ、そちらの並び順・表示/非表示設定で描画する。まだ開いていない店舗
  // （appealBlocksにbuiltin_*が無い）は従来の固定順レンダリングのまま——既存店舗への影響ゼロ。
  const hasBuiltinConfig = (appealBlocks || []).some(b => b.block_type?.startsWith('builtin_'));
  const blockCtx = { provider, diagnosis, matchData, stories, staff, services, onConsult, userPathType };
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '100px' }}>
        {hasBuiltinConfig ? (
          appealBlocks.map(b => renderAppealBlock(b, blockCtx))
        ) : (
          <>
            <AppealBlocksSection blocks={appealBlocks} />
            <GuideMessageCard provider={provider} />
            <UniqueStrengthsSection provider={provider} />
            {(provider.facility_photos || [])[0] && (
              <div style={{ margin: '-8px -16px', overflow: 'hidden' }}>
                <img src={provider.facility_photos[0]} alt="" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} loading="lazy" />
              </div>
            )}
            <StaffSection staff={staff} />
            {/* Me Scan 済みなら最上部に、未スキャンは最下部に小さく */}
            {diagnosis && <NewMeMapSection diagnosis={diagnosis} matchData={matchData} />}
            <PhilosophySection provider={provider} />
            <ProgramSection services={services} onConsult={onConsult} userPathType={userPathType} provider={provider} matchData={matchData} />
            {(provider.facility_photos || [])[1] && (
              <div style={{ margin: '-8px -16px', overflow: 'hidden' }}>
                <img src={provider.facility_photos[1]} alt="" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} loading="lazy" />
              </div>
            )}
            <StoriesSection stories={stories} provider={provider} />
            {!diagnosis && (
              <div style={{ opacity: 0.85 }}>
                <NewMeMapSection diagnosis={diagnosis} matchData={matchData} />
              </div>
            )}
          </>
        )}
      </div>
      {/* スティッキーCTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 16px 24px', background: 'linear-gradient(to top, var(--pv-surface) 70%, rgba(10,15,30,0))', zIndex: 50, pointerEvents: 'none' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', pointerEvents: 'all' }}>
          <button onClick={onGoToConsult} style={{ width: '100%', padding: '16px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '14px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.22)', letterSpacing: '.02em' }}>
            予約する →
          </button>
        </div>
      </div>
    </>
  );
}

// ── タブ②「プログラム」──────────────────────────────────────────────────────
function ProgramCard({ service, onConsult, userPathType, compassAxis }) {
  const [expanded, setExpanded] = useState(false);
  const suitablePaths = service.suitable_path_types || [];
  const isPathMatch = userPathType && suitablePaths.includes(userPathType);
  const isCompassMatch = service.target_axis && compassAxis && service.target_axis === compassAxis;

  const benefits = (service.benefit_list?.length > 0)
    ? service.benefit_list
    : service.description
      ? service.description.split(/\n/).map(s => s.replace(/^[・▶→✓\s]+/, '').trim()).filter(Boolean)
      : [];

  const hasDetails = !!(service.before_text || service.before_image_url || service.after_text || service.after_image_url || benefits.length > 0 || suitablePaths.length > 0);
  const borderColor = isCompassMatch ? '#1d4ed8' : isPathMatch ? '#2563eb' : '#e5e7eb';

  return (
    <div style={{ background: 'var(--pv-surface)', borderRadius: '20px', overflow: 'hidden', border: `${isCompassMatch || isPathMatch ? '2px' : '1px'} solid ${isCompassMatch ? '#1d4ed8' : isPathMatch ? '#2563eb' : 'color-mix(in srgb, var(--pv-text) 15%, transparent)'}`, boxShadow: isCompassMatch ? '0 0 0 4px rgba(29,78,216,.1),0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>

      {/* バナー */}
      {isCompassMatch && (
        <div style={{ background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'calc(16px * var(--pv-fs))' }}></span>
          <div>
            <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)' }}>あなたのコンパス軸「{AXIS_LABELS[service.target_axis]}」の最初の一手</div>
            <div style={{ fontSize: 'calc(11px * var(--pv-fs))', color: 'rgba(255,255,255,.75)', marginTop: '1px' }}>Me Scanで導き出された最優先プログラム</div>
          </div>
        </div>
      )}
      {!isCompassMatch && isPathMatch && (
        <div style={{ background: '#2563eb', padding: '9px 18px' }}>
          <span style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)' }}>あなたの「来た道」に合っています</span>
        </div>
      )}

      {/* カバー画像 */}
      {service.image_url && (
        <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
          <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.4) 100%)' }} />
          {service.is_featured && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#fbbf24', color: '#78350f', fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', padding: '5px 12px', borderRadius: '99px' }}>⭐ おすすめ</div>}
        </div>
      )}

      <div style={{ padding: '20px' }}>
        {/* 軸タグ + 名前 + 変容の約束（常時表示） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '7px' }}>
            {service.target_axis && (
              <span style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: isCompassMatch ? '#dbeafe' : '#f1f5f9', color: isCompassMatch ? '#1d4ed8' : '#475569', borderRadius: '99px' }}>
                {AXIS_ICONS[service.target_axis]} {AXIS_LABELS[service.target_axis]}対応
              </span>
            )}
            {!service.image_url && service.is_featured && <span style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '99px' }}>⭐ おすすめ</span>}
          </div>
          <h3 style={{ fontSize: 'calc(17px * var(--pv-hs))', fontWeight: '900', margin: '0 0 7px', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', lineHeight: '1.3' }}>{service.name}</h3>
          {service.transformation_promise && (
            <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: '0', fontStyle: 'italic', lineHeight: '1.6', padding: '8px 12px', background: 'var(--pv-surface)', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
              「{service.transformation_promise}」
            </p>
          )}
        </div>

        {/* 価格 */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: 'calc(24px * var(--pv-fs))', fontWeight: '900', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', lineHeight: 1 }}>¥{service.price.toLocaleString()}</span>
          {(service.duration_minutes || service.duration) && <span style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', marginLeft: '6px' }}>/ {service.duration_minutes ? `${service.duration_minutes}分` : service.duration}</span>}
        </div>

        {/* 「変容の旅を覗く」ボタン（常時表示・フル幅） */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ width: '100%', padding: '13px', marginBottom: '10px', background: expanded ? 'var(--pv-surface)' : 'color-mix(in srgb, var(--pv-accent) 7%, transparent)', color: expanded ? 'color-mix(in srgb, var(--pv-text) 75%, transparent)' : '#c9a84c', border: `1.5px solid ${expanded ? 'color-mix(in srgb, var(--pv-text) 15%, transparent)' : 'color-mix(in srgb, var(--pv-accent) 35%, transparent)'}`, borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer', transition: 'all .15s', letterSpacing: '.02em' }}
          >
            {expanded ? '閉じる ▲' : '変容の旅を覗く ▾'}
          </button>
        )}

        {/* 展開エリア（アコーディオン） */}
        {expanded && (
          <div style={{ borderTop: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', paddingTop: '16px', marginBottom: '16px' }}>
            {(service.before_text || service.before_image_url || service.after_text || service.after_image_url) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'var(--pv-surface)', borderRadius: '10px', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
                  <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.1em', padding: service.before_image_url ? '8px 12px 4px' : '12px 12px 4px', textTransform: 'uppercase' }}>BEFORE</div>
                  {service.before_image_url && <img src={service.before_image_url} alt="Before" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
                  {service.before_text && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', margin: 0, lineHeight: '1.6', padding: service.before_image_url ? '8px 12px 12px' : '0 12px 12px' }}>{service.before_text}</p>}
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', overflow: 'hidden', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: '#059669', letterSpacing: '.1em', padding: service.after_image_url ? '8px 12px 4px' : '12px 12px 4px', textTransform: 'uppercase' }}>AFTER</div>
                  {service.after_image_url && <img src={service.after_image_url} alt="After" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
                  {service.after_text && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: '#065f46', margin: 0, lineHeight: '1.6', padding: service.after_image_url ? '8px 12px 12px' : '0 12px 12px' }}>{service.after_text}</p>}
                </div>
              </div>
            )}
            {benefits.length > 0 && (
              <div style={{ marginBottom: '12px', padding: '14px', background: 'var(--pv-surface)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
                <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>このプログラムで変わること</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {benefits.slice(0, 5).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#34d399', fontWeight: '800', fontSize: 'calc(13px * var(--pv-fs))', flexShrink: 0, lineHeight: '1.4' }}>✓</span>
                      <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.5' }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suitablePaths.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'var(--pv-surface)', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
                <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.1em', marginBottom: '7px', textTransform: 'uppercase' }}>こんな方に向いています</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {suitablePaths.map(p => (
                    <span key={p} style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: (PATH_COLORS[p] || '#6b7280') + '18', color: PATH_COLORS[p] || '#6b7280', borderRadius: '99px' }}>
                      {PATH_LABELS[p]}タイプ
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onConsult(service)}
          style={{ width: '100%', padding: '15px', background: isCompassMatch ? 'linear-gradient(90deg,#1d4ed8,#4f46e5)' : 'var(--pv-accent)', color: isCompassMatch ? '#fff' : 'var(--pv-on-accent)', border: 'none', borderRadius: '14px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', cursor: 'pointer', letterSpacing: '.02em', transition: 'opacity .15s' }}
          onMouseOver={e => e.currentTarget.style.opacity = '.88'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          {isCompassMatch ? 'この一歩を踏み出す →' : 'このガイドと一歩を踏み出す →'}
        </button>
      </div>
    </div>
  );
}

function ProgramTab({ services, onConsult, userPathType, provider, matchData }) {
  if (services === null) return <div style={{ textAlign: 'center', padding: '40px', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</div>;
  if (!services.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', background: 'var(--pv-surface)', borderRadius: '18px', border: '1px dashed color-mix(in srgb, var(--pv-text) 20%, transparent)' }}>
      <div style={{ fontSize: 'calc(32px * var(--pv-fs))', marginBottom: '12px', opacity: 0.3 }}></div>
      <p style={{ fontSize: 'calc(15px * var(--pv-fs))', margin: 0, fontWeight: '600' }}>プログラムはまだ登録されていません</p>
    </div>
  );

  const coveredAxes = matchData?.detail?.coveredAxes || [];
  const isCompassProvider = matchData?.detail?.isCompassProvider;
  const compassAxis = coveredAxes.find(ax => ax.isCompass)?.id || null;
  const hasScan = coveredAxes.length > 0;

  // コンパス軸一致 → 来た道一致 → おすすめ → 残り の順にソート
  const sorted = [...services].sort((a, b) => {
    const rank = s => {
      if (s.target_axis && compassAxis && s.target_axis === compassAxis) return 0;
      if ((s.suitable_path_types || []).includes(userPathType)) return 1;
      if (s.is_featured) return 2;
      return 3;
    };
    return rank(a) - rank(b);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Me Scan連携バナー */}
      {hasScan && (
        <div style={{ background: isCompassProvider ? 'rgba(29,78,216,0.15)' : 'var(--pv-surface)', border: `1px solid ${isCompassProvider ? '#6366f1' : 'color-mix(in srgb, var(--pv-text) 15%, transparent)'}`, borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 'calc(20px * var(--pv-fs))', flexShrink: 0 }}>{isCompassProvider ? '' : '️'}</span>
          <div>
            <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: isCompassProvider ? '#818cf8' : 'color-mix(in srgb, var(--pv-text) 75%, transparent)', marginBottom: '6px' }}>
              {isCompassProvider ? 'あなたのコンパス軸を専門とするガイドです' : 'あなたの変容軸をカバーするガイドです'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {coveredAxes.map(ax => (
                <span key={ax.id} style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', background: ax.isCompass ? '#1d4ed8' : 'color-mix(in srgb, var(--pv-text) 12%, transparent)', color: ax.isCompass ? '#fff' : 'color-mix(in srgb, var(--pv-text) 75%, transparent)', borderRadius: '99px' }}>
                  {AXIS_ICONS[ax.id]} {AXIS_LABELS[ax.id]}{ax.gap > 0 ? ` +${ax.gap}` : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {sorted.map(s => (
        <ProgramCard key={s.id} service={s} onConsult={onConsult} userPathType={userPathType} compassAxis={compassAxis} />
      ))}
    </div>
  );
}

// ── タブ「基本情報」（でお要望2026-09-29：公開ページ3タブ再編。住所・営業時間・
//    支払い方法・オンライン対応・お試し情報等、事実情報だけをまとめる。予約タブが
//    デフォルト表示になったため、こちらは「今日開いてるか」「どこにあるか」を
//    確認しに来た人がすぐ見られる場所として独立させた）。 ──
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid color-mix(in srgb, var(--pv-text) 8%, transparent)' }}>
      <span style={{ flexShrink: 0, width: '92px', fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontWeight: '700' }}>{label}</span>
      <span style={{ fontSize: 'calc(13.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 85%, transparent)', lineHeight: '1.6' }}>{value}</span>
    </div>
  );
}
function BasicInfoTab({ provider }) {
  const fullAddress = fullAddressOf(provider);
  const mapsHref = mapsHrefFor(provider);
  const status = todayStatusText(provider);
  const todayKey = WEEKDAY_KEYS_BH[new Date().getDay()];
  const paymentText = provider.payment_methods?.length
    ? provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join('、')
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
      {status && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: '700',
          background: status === '本日は定休日' ? 'rgba(107,114,128,0.15)' : 'rgba(5,150,105,0.15)',
          color: status === '本日は定休日' ? 'color-mix(in srgb, var(--pv-text) 62%, transparent)' : '#10b981',
          border: `1px solid ${status === '本日は定休日' ? 'color-mix(in srgb, var(--pv-text) 15%, transparent)' : 'rgba(5,150,105,0.3)'}`,
        }}>
          {status}
        </div>
      )}

      <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
        <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', letterSpacing: '.08em', color: 'color-mix(in srgb, var(--pv-accent) 70%, transparent)', textTransform: 'uppercase', margin: '0 0 4px' }}>所在地・アクセス</p>
        <InfoRow label="住所" value={fullAddress || null} />
        <InfoRow label="最寄り駅" value={provider.nearest_station || null} />
        {mapsHref && (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '700', color: '#c9a84c', textDecoration: 'none' }}>
            地図で見る →
          </a>
        )}
      </div>

      {provider.business_hours && (
        <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
          <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', letterSpacing: '.08em', color: 'color-mix(in srgb, var(--pv-accent) 70%, transparent)', textTransform: 'uppercase', margin: '0 0 4px' }}>営業時間</p>
          {WEEKDAY_KEYS_BH.map(key => {
            const h = provider.business_hours[key];
            const isToday = key === todayKey;
            const text = (!h || h.closed || !h.open || !h.close) ? '定休日' : `${h.open}〜${h.close <= h.open ? '翌' + h.close : h.close}`;
            return (
              <div key={key} style={{ display: 'flex', gap: '10px', padding: '6px 0', fontWeight: isToday ? '800' : '500' }}>
                <span style={{ flexShrink: 0, width: '28px', fontSize: 'calc(13px * var(--pv-fs))', color: isToday ? 'var(--pv-accent)' : 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>{WEEKDAY_LABEL_BH[key]}</span>
                <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: isToday ? 'var(--pv-text)' : 'color-mix(in srgb, var(--pv-text) 65%, transparent)' }}>{text}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
        <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', letterSpacing: '.08em', color: 'color-mix(in srgb, var(--pv-accent) 70%, transparent)', textTransform: 'uppercase', margin: '0 0 4px' }}>料金・お支払い</p>
        <InfoRow label="料金" value={provider.price_from ? `¥${provider.price_from.toLocaleString()}〜` : null} />
        <InfoRow label="お支払い" value={paymentText} />
        <InfoRow label="オンライン対応" value={provider.online_available ? 'あり' : null} />
      </div>

      {(provider.trial_available || provider.response_hours || provider.cancellation_policy || provider.first_session_desc) && (
        <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
          <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '800', letterSpacing: '.08em', color: 'color-mix(in srgb, var(--pv-accent) 70%, transparent)', textTransform: 'uppercase', margin: '0 0 4px' }}>予約前に知っておきたいこと</p>
          <InfoRow label="お試し" value={provider.trial_available ? (provider.trial_desc || 'あり') : null} />
          <InfoRow label="返信目安" value={provider.response_hours ? `${provider.response_hours}時間以内` : null} />
          <InfoRow label="初回について" value={provider.first_session_desc || null} />
          <InfoRow label="キャンセル" value={provider.cancellation_policy || null} />
        </div>
      )}
    </div>
  );
}

// ── クラスタブ：スクール業態向け、クラスの開催回に直接予約する（でお指摘2026-09-16） ──
const WEEKDAY_JA_CLASS = ['日', '月', '火', '水', '木', '金', '土'];
function ClassTab({ provider }) {
  const [classes, setClasses] = useState(null); // null=未取得
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [userId, setUserId] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [doneSlotIds, setDoneSlotIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/classes`)
      .then(r => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [provider?.slug]);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const token = obj?.access_token;
      if (!token) return;
      fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (!data || data.error) return;
          if (data.id) setUserId(data.id);
          const fullName = [data.last_name, data.first_name].filter(Boolean).join(' ');
          const realEmail = (data.email || '').endsWith('@line.fineme.me') ? '' : (data.email || '');
          setForm(prev => ({ ...prev, name: prev.name || fullName, email: prev.email || realEmail, phone: prev.phone || data.phone || '' }));
        })
        .catch(() => {});
    } catch {}
  }, []);

  async function bookSession(slotId, className) {
    setError('');
    if (!form.name.trim()) { setError('お名前を入力してください'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError('メールアドレスまたは電話番号のどちらかは必ず入力してください'); return; }
    setBookingSlotId(slotId);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: provider.id,
          user_id: userId || null,
          user_name: form.name,
          user_contact: [form.email, form.phone].filter(Boolean).join(' / '),
          message: `【クラス予約】${className}`,
          booking_mode: 'instant',
          slot_id: slotId,
        }),
      });
      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        // 予約デポジット（決済機能Phase6③）: 店舗がデポジットを設定していれば決済ページへ誘導する
        if (resData?.deposit_checkout_url) { window.location.href = resData.deposit_checkout_url; return; }
        setDoneSlotIds(prev => [...prev, slotId]);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || '予約に失敗しました');
      }
    } catch { setError('通信エラーが発生しました'); }
    finally { setBookingSlotId(null); }
  }

  if (classes === null) return <p style={{ color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</p>;
  if (classes.length === 0) return <p style={{ color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>現在予約可能なクラスの開催回がありません。</p>;

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ background: 'var(--pv-surface)', borderRadius: '16px', padding: '18px 20px', marginBottom: '20px', backdropFilter: 'blur(8px)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
        <div style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 85%, transparent)', marginBottom: '10px' }}>お名前・連絡先（開催回を選ぶとこの内容で予約されます）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input placeholder="お名前 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input placeholder="メールアドレス" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ flex: 1, padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
            <input placeholder="電話番号" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ flex: 1, padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
          </div>
        </div>
        {error && <p style={{ color: '#f87171', fontSize: 'calc(12.5px * var(--pv-fs))', margin: '8px 0 0' }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {classes.map(c => (
          <div key={c.id} style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '14px', padding: '18px 20px', background: 'var(--pv-surface)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: 800, color: 'color-mix(in srgb, var(--pv-text) 92%, transparent)' }}>{c.name}</p>
            {c.description && <p style={{ margin: '0 0 12px', fontSize: 'calc(12.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', lineHeight: 1.6 }}>{c.description}</p>}
            {c.sessions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 'calc(12.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>現在予約可能な開催回がありません。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {c.sessions.map(s => {
                  const d = new Date(`${s.date}T00:00:00`);
                  const isDone = doneSlotIds.includes(s.id);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                      <div>
                        <span style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: 700, color: 'color-mix(in srgb, var(--pv-text) 85%, transparent)' }}>{s.date}（{WEEKDAY_JA_CLASS[d.getDay()]}）{s.start_time?.slice(0, 5)}〜{s.end_time?.slice(0, 5)}</span>
                        <span style={{ fontSize: 'calc(11.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', marginLeft: '8px' }}>残り{s.remaining}枠</span>
                      </div>
                      {isDone ? (
                        <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: 700, color: '#34d399' }}>✓ 予約済み</span>
                      ) : (
                        <button
                          onClick={() => bookSession(s.id, c.name)}
                          disabled={bookingSlotId === s.id}
                          style={{ padding: '8px 16px', background: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', color: '#0a0f1e', border: 'none', borderRadius: '10px', fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: bookingSlotId === s.id ? 0.6 : 1 }}
                        >
                          {bookingSlotId === s.id ? '予約中…' : '予約する'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── タブ「回数券」（でお要望2026-09-27：決済機能Phase 6第一弾。オンラインでの
//    回数券・パッケージ購入）。Stripe Checkout(mode:'payment')の hosted page に
//    遷移し、決済完了後にこのタブへ戻ってconfirmを叩いて確定する。 ──
function PackagesTab({ provider }) {
  const [packages, setPackages] = useState(null); // null=未取得
  const [userId, setUserId] = useState('');
  const [purchasingId, setPurchasingId] = useState(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [error, setError] = useState('');

  function getToken() {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return null;
    try { return JSON.parse(localStorage.getItem(sbKey))?.access_token || null; } catch { return null; }
  }

  useEffect(() => {
    if (!provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/packages`)
      .then(r => r.ok ? r.json() : [])
      .then(setPackages)
      .catch(() => setPackages([]));
  }, [provider?.slug]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data?.id) setUserId(data.id); })
      .catch(() => {});
  }, []);

  // Stripe Checkout(payment)から戻ってきた時（success_urlの?purchase=success&session_id=...）に確定する
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') !== 'success') return;
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    const token = getToken();
    if (!token) return;
    fetch('/api/me/customer-packages/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        setConfirmMsg(ok ? `✓ 「${d.package_name}」の購入が完了しました。` : (d.error || '確認に失敗しました'));
        const url = new URL(window.location.href);
        url.searchParams.delete('purchase');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(() => setConfirmMsg('確認に失敗しました'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePurchase(pkg) {
    const token = getToken();
    if (!token) { setError('購入にはログインが必要です。ページ上部からログインしてください。'); return; }
    setError(''); setPurchasingId(pkg.id);
    try {
      const res = await fetch('/api/me/customer-packages/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ package_id: pkg.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '購入手続きの開始に失敗しました'); setPurchasingId(null); return; }
      window.location.href = data.url;
    } catch {
      setError('通信エラーが発生しました'); setPurchasingId(null);
    }
  }

  if (packages === null) return <div style={{ padding: '40px', textAlign: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '60px' }}>
      {confirmMsg && (
        <div style={{ padding: '14px 16px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', color: '#4ade80', fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: '700' }}>
          {confirmMsg}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontSize: 'calc(13px * var(--pv-fs))' }}>
          {error}
        </div>
      )}
      {!packages.length ? (
        <p style={{ textAlign: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontSize: 'calc(14px * var(--pv-fs))', padding: '40px 0' }}>現在オンラインで購入できる回数券はありません。</p>
      ) : packages.map(pkg => (
        <div key={pkg.id} style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '16px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', margin: '0 0 4px' }}>{pkg.name}</p>
            <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 65%, transparent)', margin: 0 }}>
              {pkg.package_type === 'unlimited' ? '通い放題' : `${pkg.total_sessions}回分`}
              {pkg.package_type === 'combo' && pkg.combo_ticket_sessions ? `＋チケット${pkg.combo_ticket_sessions}回` : ''}
              {pkg.validity_days ? `／有効期限${pkg.validity_days}日間` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: 'calc(18px * var(--pv-fs))', fontWeight: '900', color: 'var(--pv-text)' }}>¥{Number(pkg.price).toLocaleString()}</span>
            <button
              onClick={() => handlePurchase(pkg)}
              disabled={purchasingId === pkg.id}
              style={{ padding: '10px 20px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: purchasingId === pkg.id ? 'not-allowed' : 'pointer', opacity: purchasingId === pkg.id ? 0.6 : 1 }}
            >
              {purchasingId === pkg.id ? '手続き中…' : '購入する'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsultTab({ provider, services, staff, selectedService, onServiceSelect, submitted, setSubmitted, diagnosis, matchData, menuNameHint, mode }) {
  const today = new Date().toISOString().split('T')[0];
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [userPrefilled, setUserPrefilled] = useState(false);
  // ログイン中のお客様のFineme user_id。予約に紐づけておかないと、承認/代替提案の
  // LINE通知（notifyCustomerLine）が送り先を特定できず届かない（でお報告2026-09-12：
  // ログインして予約したのに代替提案のLINE通知が来なかった不具合の原因）。
  const [userId, setUserId] = useState('');
  const [includeMeScan, setIncludeMeScan] = useState(true);

  // スタッフ指名予約・即時予約（hacomono/STORES網羅計画 Phase 1）。
  // どちらも店舗が「機能設定」タブでON/OFFできる。OFFなら従来通りの3希望日時フォームのまま。
  const staffDesignationOn = hasFeature(provider, 'staff_designation');
  // でお指摘2026-10-01：「予約」タブの中身がリクエスト（第1〜3希望）になっていて
  // 即時予約のタブが無いのはおかしい、予約＝即時予約・リクエスト＝リクエストで
  // タブを分けるべき。親（ProviderPageContent）がtabsFor()で'instant'/'consult'の
  // 2タブに分け、どちらのモードで開かれたかをmode propで渡してくる
  // （'instant'=即時予約タブ、'request'=リクエストタブ、'closed'=両方OFFで受付停止）。
  const showInstantPicker = mode === 'instant';

  // 友達紹介プログラム（でお要望2026-09-14）：ログイン中のお客様に、この店舗向けの
  // 個人紹介リンクを発行して見せる。
  const referralProgramOn = hasFeature(provider, 'referral_program');
  const [referralCode, setReferralCode] = useState('');
  const [referralRewardText, setReferralRewardText] = useState('');
  // でお要望2026-09-30：「友達を紹介する」ボックスの文言・画像・ボタンを店舗が
  // 自由に編集できるように（元は文言が固定文＋特典文言のみだった）。
  const [referralMessageText, setReferralMessageText] = useState('');
  const [referralImageUrl, setReferralImageUrl] = useState('');
  const [referralButtonLabel, setReferralButtonLabel] = useState('');
  const [referralButtonUrl, setReferralButtonUrl] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  useEffect(() => {
    if (!referralProgramOn || !userId || !provider?.slug) return;
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const token = obj?.access_token;
      if (!token) return;
      fetch(`/api/me/referral-code?provider_slug=${provider.slug}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          if (d.code) setReferralCode(d.code);
          if (d.reward_text) setReferralRewardText(d.reward_text);
          if (d.message_text) setReferralMessageText(d.message_text);
          if (d.image_url) setReferralImageUrl(d.image_url);
          if (d.button_label) setReferralButtonLabel(d.button_label);
          if (d.button_url) setReferralButtonUrl(d.button_url);
        })
        .catch(() => {});
    } catch {}
  }, [referralProgramOn, userId, provider?.slug]);
  const referralLink = referralCode && provider?.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/provider/${provider.slug}?ref=${referralCode}` : '';
  const bookableStaff = (staff || []).filter(s => s.bookable !== false);
  const [staffId, setStaffId] = useState('');
  const selectedStaff = bookableStaff.find(s => s.id === staffId);

  const [slots, setSlots] = useState(null); // null=未取得
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [gridStaffFilter, setGridStaffFilter] = useState(''); // ''=指名なし（全スタッフ横断）
  const [gridWeekOffset, setGridWeekOffset] = useState(0); // 表示中の週（0=今日から7日間、1=その次の7日間…）
  const [lastWasInstant, setLastWasInstant] = useState(false);

  // 予約時に使用チケットを選べるように（でお要望2026-09-27：「予約時にどのチケットで
  // 行くか選択できれば」）。ログイン中かつこの店舗の有効なチケットを持っている時だけ表示。
  const [myPackages, setMyPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  useEffect(() => {
    if (!userId || !provider?.id) { setMyPackages([]); return; }
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const token = obj?.access_token;
      if (!token) return;
      fetch('/api/me/packages', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(rows => setMyPackages((rows || []).filter(p => p.provider_slug === provider.slug && !p.expired && (p.package_type === 'unlimited' || p.remaining_sessions > 0))))
        .catch(() => setMyPackages([]));
    } catch { setMyPackages([]); }
  }, [userId, provider?.slug]);

  useEffect(() => {
    if (!showInstantPicker || !provider?.slug) return;
    const params = new URLSearchParams({ from: today });
    if (selectedService?.id) params.set('service_id', selectedService.id);
    fetch(`/api/providers/${provider.slug}/availability?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setSlots(data); setSelectedSlotId(''); })
      .catch(() => setSlots([]));
  }, [showInstantPicker, provider?.slug, selectedService?.id, today]);

  const slotsByDate = (slots || []).reduce((acc, s) => { (acc[s.date] = acc[s.date] || []).push(s); return acc; }, {});

  // 予約カレンダー風の表（でお要望2026-09-27：一般的な予約サイトの「スタイリスト指名・
  // 日時選択」画面と同じ構成——上でスタッフをタブ選択し、その下に日付（列）×時間（行）の
  // 表を出して◯/×で空きを示す）。スタッフは軸ではなくタブ側で絞り込む。
  function addDaysStr(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const gridStaffOptions = [...new Map((slots || []).map(s => [s.staff_id || '_none', { id: s.staff_id, name: s.staff_name || '指名なし' }])).values()];
  const gridHasNamedStaff = gridStaffOptions.some(o => o.id);
  const gridFilteredSlots = gridStaffFilter ? (slots || []).filter(s => s.staff_id === gridStaffFilter) : (slots || []);
  const gridWeekDates = Array.from({ length: 7 }, (_, i) => addDaysStr(today, gridWeekOffset * 7 + i));
  const gridTimes = [...new Set(gridFilteredSlots.map(s => s.start_time))].sort();
  const gridCellMap = {};
  gridFilteredSlots.forEach(s => {
    // 指名なしタブでは同じ日時に複数スタッフの枠が重なることがあるが、◯を1つ出して
    // 押した時にその中の1件（最初に見つかったもの）へ確定する。
    const key = `${s.date}|${s.start_time}`;
    if (!gridCellMap[key]) gridCellMap[key] = s;
  });
  const selectedSlotObj = (slots || []).find(s => s.id === selectedSlotId);
  const WEEKDAY_JA_SLUG = ['日', '月', '火', '水', '木', '金', '土'];
  // mode==='closed'（即時予約・予約リクエストどちらも店舗側でOFF）の時だけフォーム自体を出さない。
  const canBookAnything = mode !== 'closed';

  const meScanSummary = buildMeScanSummary(diagnosis, matchData);

  useEffect(() => {
    // プロフィールAPIから姓名・電話番号を取得して事前入力
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const token = obj?.access_token;
      if (!token) return;
      fetch('/api/me/profile', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (!data || data.error) return;
          if (data.id) setUserId(data.id);
          const fullName = [data.last_name, data.first_name].filter(Boolean).join(' ');
          // @line.fineme.me はシステム内部メールのため空欄にする
          const realEmail = (data.email || '').endsWith('@line.fineme.me') ? '' : (data.email || '');
          const phone = data.phone || '';
          setFormState(prev => ({
            ...prev,
            name: prev.name || fullName,
            email: prev.email || realEmail,
            phone: prev.phone || phone,
          }));
          if (fullName || realEmail || phone) setUserPrefilled(true);
        })
        .catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (submitted) {
      setFormState({ name: '', email: '', phone: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
      setStaffId(''); setSelectedSlotId('');
    }
  }, [submitted]);

  async function handleSubmit(e) {
    e.preventDefault();
    const useInstant = mode === 'instant';
    if (!formState.name) {
      setFormError('お名前は必須です');
      return;
    }
    if (useInstant) {
      if (!selectedSlotId) { setFormError('ご希望の日時を選んでください'); return; }
    } else if (!formState.date || !formState.time) {
      setFormError('お名前・希望日時は必須です');
      return;
    }
    if (!formState.email && !formState.phone) {
      setFormError('メールアドレスまたは電話番号のどちらかは必ず入力してください');
      return;
    }
    setSubmitting(true); setFormError('');
    try {
      // Me Scanデータを添付
      const meScanNote = (includeMeScan && meScanSummary)
        ? `【New Me Navi より】\n${meScanSummary.join('\n')}\n\n`
        : '';
      const noteParts = [
        selectedService ? `【プログラム】${selectedService.name}（¥${selectedService.price.toLocaleString()}）` : '',
        (!selectedService && menuNameHint) ? `【ご希望のメニュー】${menuNameHint}` : '',
        selectedStaff ? `【ご指名】${selectedStaff.name}${selectedStaff.booking_fee > 0 ? `（指名料¥${Number(selectedStaff.booking_fee).toLocaleString()}）` : ''}` : '',
        (!useInstant && formState.date2) ? `【第2希望】${formState.date2} ${formState.time2}` : '',
        (!useInstant && formState.date3) ? `【第3希望】${formState.date3} ${formState.time3}` : '',
        formState.message,
      ].filter(Boolean);
      // メール・電話を結合して user_contact に（既存APIと互換）
      const user_contact = [formState.email, formState.phone].filter(Boolean).join(' / ');
      // 友達紹介プログラム（でお要望2026-09-14）：このページ滞在中に?ref=で保存された
      // コードがあれば予約に添える。自己紹介はサーバー側（attributeReferral）で弾かれる。
      let referral_code;
      try { referral_code = localStorage.getItem(`fineme:referral:${provider.slug}`) || undefined; } catch {}
      const body = {
        provider_id: provider.id,
        user_id: userId || null,
        user_name: formState.name,
        user_contact,
        message: meScanNote + noteParts.join('\n'),
        staff_id: staffId || null,
        service_id: selectedService?.id || null,
        package_id: selectedPackageId || null,
        referral_code,
        ...(useInstant
          ? { booking_mode: 'instant', slot_id: selectedSlotId }
          : { preferred_date: formState.date, preferred_time: formState.time }),
      };
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        // 予約デポジット（決済機能Phase6③）: 店舗がデポジットを設定していれば決済ページへ誘導する
        if (resData?.deposit_checkout_url) { window.location.href = resData.deposit_checkout_url; return; }
        setLastWasInstant(useInstant); setSubmitted(true);
      }
      else { const err = await res.json(); setFormError(err.error || '送信に失敗しました'); }
    } catch { setFormError('通信エラーが発生しました'); }
    finally { setSubmitting(false); }
  }

  if (submitted) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 'calc(48px * var(--pv-fs))', marginBottom: '16px' }}>✓</div>
        <h2 style={{ fontSize: 'calc(20px * var(--pv-hs))', fontWeight: '800', color: '#34d399', margin: '0 0 8px' }}>{lastWasInstant ? '予約が確定しました' : '相談リクエストを送りました'}</h2>
        <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: '0 0 24px', lineHeight: '1.7' }}>
          {lastWasInstant
            ? <>選んだ日時で確定しました。当日お待ちしております。</>
            : <>このガイドからの返答をお待ちください。<br />連絡先にご連絡が届きます。</>}
        </p>
        <button onClick={() => setSubmitted(false)} style={{ padding: '10px 24px', background: 'var(--pv-surface)', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer' }}>
          {lastWasInstant ? '別の日時でもう一件予約する' : '別のリクエストを送る'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      {/* 友達紹介プログラム（でお要望2026-09-14）：ログイン中かつ店舗が実施している場合のみ表示。
          文言・画像・任意ボタンは店舗のダッシュボード（友達紹介タブ）で自由に編集できる
          （でお要望2026-09-30：「ここに書く内容も編集できるように、特典も設定できるように。
          画像を入れられたりボタンをつけたりも自由に編集できるように」）。 */}
      {referralProgramOn && userId && referralLink && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
          {referralImageUrl && (
            <img src={referralImageUrl} alt="" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '800', color: '#b45309', marginBottom: '6px' }}>友達を紹介する</div>
            <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: '#111', margin: '0 0 6px', lineHeight: '1.6' }}>
              {referralMessageText || `${provider.name}を友達に紹介できます。`}
            </p>
            {referralRewardText && (
              <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: '700', color: '#b45309', margin: '0 0 10px', lineHeight: '1.6' }}>
                特典：{referralRewardText}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input readOnly value={referralLink} onFocus={e => e.target.select()} style={{ flex: 1, padding: '8px 10px', fontSize: 'calc(12px * var(--pv-fs))', border: '1px solid #fde68a', borderRadius: '8px', background: '#fff', color: '#111', boxSizing: 'border-box' }} />
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(referralLink); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}
                style={{ padding: '8px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: '8px', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
              >
                {referralCopied ? 'コピー済み' : 'コピー'}
              </button>
            </div>
            {referralButtonLabel && /^https?:\/\//i.test(referralButtonUrl || '') && (
              <a href={referralButtonUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '10px', padding: '10px 14px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '8px', fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
                {referralButtonLabel}
              </a>
            )}
          </div>
        </div>
      )}

      {/* ① 相談の流れ 3ステップ */}
      <div style={{ background: 'var(--pv-surface)', borderRadius: '16px', padding: '20px', marginBottom: '20px', backdropFilter: 'blur(8px)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
        <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>相談の流れ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(showInstantPicker ? [
            { n: '1', label: '空き枠を選ぶ', desc: '表から空いている日時をタップします' },
            { n: '2', label: 'その場で予約確定', desc: '店舗の承認を待たず、選んだ時点で予約が確定します' },
            { n: '3', label: '当日 → 変容の旅スタート', desc: '準備ができたら当日を迎えましょう。まず話を聞くだけでも大丈夫です' },
          ] : [
            { n: '1', label: 'リクエストを送る', desc: 'このフォームで希望日時と連絡先を送信します' },
            { n: '2', label: 'ガイドから返信が届く', desc: `通常${provider.response_hours ? provider.response_hours + '時間以内' : '2〜3日以内'}に、ご連絡先へ返信が届きます` },
            { n: '3', label: '日程確定 → 変容の旅スタート', desc: '準備ができたら当日を迎えましょう。まず話を聞くだけでも大丈夫です' },
          ]).map(step => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{step.n}</span>
              <div>
                <div style={{ fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', marginBottom: '2px' }}>{step.label}</div>
                <div style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', lineHeight: '1.5' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ② お試し・無料相談がある場合の強調カード */}
      {provider.trial_available && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '800', color: '#b45309', marginBottom: '4px' }}>まずお試しから始めることができます</div>
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: '#111', margin: 0, lineHeight: '1.6' }}>{provider.trial_desc || '初回お試し・無料相談を提供しています。まずは気軽にご連絡ください。'}</p>
        </div>
      )}

      {/* ③ 初回セッション説明 */}
      {provider.first_session_desc && (
        <div style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', background: 'var(--pv-surface)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>初回はこんな内容です</div>
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{provider.first_session_desc}</p>
        </div>
      )}

      {/* Me Scanデータ添付パネル */}
      {meScanSummary && (
        <div style={{ padding: '16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <p style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: '#2563eb', margin: 0 }}>以下のMe Scanデータがこのガイドに送られます</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={includeMeScan} onChange={e => setIncludeMeScan(e.target.checked)} style={{ accentColor: '#2563eb' }} />
              <span style={{ fontSize: 'calc(12px * var(--pv-fs))', color: '#111' }}>送る</span>
            </label>
          </div>
          {meScanSummary.map((line, i) => (
            <p key={i} style={{ fontSize: 'calc(13px * var(--pv-fs))', color: '#1e40af', margin: i < meScanSummary.length - 1 ? '0 0 4px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{line}</p>
          ))}
          {!includeMeScan && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: '#111', margin: '8px 0 0' }}>チェックを外したためデータは送られません。</p>}
        </div>
      )}

      {userPrefilled && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '20px', fontSize: 'calc(13px * var(--pv-fs))', color: '#15803d' }}>
          ✓ ログイン中のアカウント情報を自動入力しました
        </div>
      )}

      {/* プログラム選択 */}
      {services && services.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '8px' }}>相談したいプログラム（任意）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${!selectedService ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
              <input type="radio" name="menu" checked={!selectedService} onChange={() => onServiceSelect(null)} style={{ accentColor: '#111' }} />
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>まず話を聞いてみたい（プログラム未定）</span>
            </label>
            {services.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${selectedService?.id === s.id ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
                <input type="radio" name="menu" checked={selectedService?.id === s.id} onChange={() => onServiceSelect(s)} style={{ accentColor: '#111' }} />
                <span style={{ flex: 1, fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>{s.name}{s.duration_minutes ? ` (${s.duration_minutes}分)` : (s.duration ? ` (${s.duration})` : '')}</span>
                <span style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '700', color: 'var(--pv-text)', flexShrink: 0 }}>¥{s.price.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* スタッフ指名（hacomono/STORES網羅計画 Phase 1）。店舗の「機能設定」でONの時だけ表示。
          指名なし（お任せ）も選択肢として並べ、指名スタッフには指名料をその場で明示する
          （hacomonoの「指名無し＝無料／実名スタッフ＝+指名料」表示に合わせた設計）。 */}
      {staffDesignationOn && bookableStaff.length > 0 && !showInstantPicker && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '8px' }}>スタッフの指名（任意）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${!staffId ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
              <input type="radio" name="staff" checked={!staffId} onChange={() => setStaffId('')} style={{ accentColor: '#111' }} />
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>指名なし（お任せ）</span>
            </label>
            {bookableStaff.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${staffId === s.id ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
                <input type="radio" name="staff" checked={staffId === s.id} onChange={() => setStaffId(s.id)} style={{ accentColor: '#111' }} />
                <span style={{ flex: 1, fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>{s.name}{s.role ? `（${s.role}）` : ''}</span>
                <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: s.booking_fee > 0 ? '#c9a84c' : 'color-mix(in srgb, var(--pv-text) 62%, transparent)', flexShrink: 0 }}>
                  {s.booking_fee > 0 ? `指名料 ¥${Number(s.booking_fee).toLocaleString()}` : '無料'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!canBookAnything ? (
        <div style={{ padding: '20px', background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', margin: '0 0 6px' }}>現在オンラインでのご予約受付を停止しています</p>
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', margin: 0, lineHeight: '1.7' }}>お手数ですが、店舗へ直接お問い合わせください。</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '4px' }}>お名前（姓名） *</label>
          <input value={formState.name} onChange={e => setFormState(p => ({ ...p, name: e.target.value }))} placeholder="山田 太郎" style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} required />
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '4px' }}>
            メールアドレス <span style={{ fontWeight: 400, color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>（電話番号がある場合は省略可）</span>
          </label>
          <input
            type="email"
            value={formState.email}
            onChange={e => setFormState(p => ({ ...p, email: e.target.value }))}
            placeholder="example@email.com"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '4px' }}>
            電話番号 <span style={{ fontWeight: 400, color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>（メールアドレスがある場合は省略可）</span>
          </label>
          <input
            type="tel"
            value={formState.phone}
            onChange={e => setFormState(p => ({ ...p, phone: e.target.value }))}
            placeholder="090-0000-0000"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}
          />
          <p style={{ fontSize: 'calc(11px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: '4px 0 0' }}>メールアドレス・電話番号のどちらか一方は必須です。</p>
        </div>

        {/* 使用チケット選択（でお要望2026-09-27：「予約時にどのチケットで行くか選択
            できれば」）。この店舗の有効なチケットを持っている会員にだけ表示。選んだ
            チケットは来店確認時に優先して自動消化される（複数持っている場合の
            「どれを自動消化すべきか判断できない」問題を、ここでの選択で解消する）。 */}
        {myPackages.length > 0 && (
          <div>
            <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>使用するチケット（任意）</label>
            <select
              value={selectedPackageId}
              onChange={e => setSelectedPackageId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}
            >
              <option value="" style={{ color: '#000' }}>選択しない（通常のお支払い）</option>
              {myPackages.map(p => (
                <option key={p.id} value={p.id} style={{ color: '#000' }}>
                  {p.package_name}（{p.package_type === 'unlimited' ? '通い放題' : `残り${p.remaining_sessions}回`}）
                </option>
              ))}
            </select>
          </div>
        )}

        {showInstantPicker ? (
          // 即時予約モード（hacomono/STORES網羅計画 Phase 1）。空き枠を選んだ時点で
          // その場で確定する——店舗の承認を待たない。
          // でお要望2026-09-27（一般的な予約サイトの「スタイリスト指名・日時選択」画面の
          // スクショ添付）：スタッフはタブで選び、その下に日付（列）×時間（行）の表を出して
          // 空きマスだけ◯で選べるようにする。
          <div>
            <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '8px' }}>ご希望の日時 *（選ぶとその場で予約確定します）</label>

            {gridHasNamedStaff && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px' }}>
                {gridStaffOptions.map(o => {
                  const active = (o.id || '') === gridStaffFilter;
                  return (
                    <button
                      key={o.id || '_none'}
                      type="button"
                      onClick={() => { setGridStaffFilter(o.id || ''); setSelectedSlotId(''); }}
                      style={{
                        flexShrink: 0, padding: '8px 12px', borderRadius: '10px', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer',
                        border: active ? '1.5px solid #111' : '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)',
                        background: active ? '#111' : 'transparent',
                        color: active ? '#fff' : 'color-mix(in srgb, var(--pv-text) 85%, transparent)',
                      }}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setGridWeekOffset(w => Math.max(0, w - 1))}
                disabled={gridWeekOffset === 0}
                style={{ background: 'none', border: 'none', color: gridWeekOffset === 0 ? 'color-mix(in srgb, var(--pv-text) 62%, transparent)' : 'color-mix(in srgb, var(--pv-text) 75%, transparent)', fontSize: 'calc(12px * var(--pv-fs))', cursor: gridWeekOffset === 0 ? 'default' : 'pointer', padding: '4px' }}
              >
                ＜ 前の週へ
              </button>
              <button
                type="button"
                onClick={() => setGridWeekOffset(w => w + 1)}
                style={{ background: 'none', border: 'none', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', fontSize: 'calc(12px * var(--pv-fs))', cursor: 'pointer', padding: '4px' }}
              >
                次の週へ ＞
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--pv-accent)', padding: '6px 8px', fontSize: 'calc(11px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', textAlign: 'left' }}></th>
                    {gridWeekDates.map(date => {
                      const d = new Date(`${date}T00:00:00`);
                      const wd = d.getDay();
                      return (
                        <th key={date} style={{ padding: '6px 4px', fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', whiteSpace: 'nowrap', color: wd === 0 ? '#f87171' : wd === 6 ? '#60a5fa' : 'color-mix(in srgb, var(--pv-text) 85%, transparent)' }}>
                          {d.getMonth() + 1}/{d.getDate()}<br /><span style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: 400 }}>{WEEKDAY_JA_SLUG[wd]}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {gridTimes.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '16px', textAlign: 'center', fontSize: 'calc(12.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>この条件の空き枠がありません</td></tr>
                  ) : gridTimes.map(t => (
                    <tr key={t}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--pv-accent)', padding: '6px 8px', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', whiteSpace: 'nowrap' }}>{t.slice(0, 5)}</td>
                      {gridWeekDates.map(date => {
                        const s = gridCellMap[`${date}|${t}`];
                        const available = s && s.remaining > 0;
                        return (
                          <td key={date} style={{ textAlign: 'center', padding: '4px', borderTop: '1px solid color-mix(in srgb, var(--pv-text) 8%, transparent)' }}>
                            {available ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSlotId(s.id)}
                                aria-label={`${date} ${t.slice(0, 5)} 予約可能`}
                                style={{
                                  width: '30px', height: '30px', borderRadius: '8px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer',
                                  border: selectedSlotId === s.id ? '2px solid #111' : '1px solid rgba(74,222,128,0.4)',
                                  background: selectedSlotId === s.id ? '#111' : 'rgba(74,222,128,0.12)',
                                  color: selectedSlotId === s.id ? '#fff' : '#4ade80',
                                }}
                              >
                                ○
                              </button>
                            ) : (
                              <span style={{ color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontSize: 'calc(14px * var(--pv-fs))' }}>×</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSlotObj && (
              <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: '700', color: '#4ade80', margin: '10px 0 0' }}>
                選択中：{selectedSlotObj.date}（{new Date(`${selectedSlotObj.date}T00:00:00`).toLocaleDateString('ja-JP', { weekday: 'short' })}）{selectedSlotObj.start_time?.slice(0, 5)}〜{selectedSlotObj.staff_name ? `　担当：${selectedSlotObj.staff_name}` : ''}
              </p>
            )}
          </div>
        ) : (
          <>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第1希望）*</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date} min={today} onChange={e => setFormState(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: '#fff', color: '#111' }} required />
            <select value={formState.time} onChange={e => setFormState(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: '#fff', color: '#111' }} required>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第2希望）<span style={{ fontWeight: '400', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date2} min={today} onChange={e => setFormState(p => ({ ...p, date2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
            <select value={formState.time2} onChange={e => setFormState(p => ({ ...p, time2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第3希望）<span style={{ fontWeight: '400', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date3} min={today} onChange={e => setFormState(p => ({ ...p, date3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
            <select value={formState.time3} onChange={e => setFormState(p => ({ ...p, time3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
          </>
        )}
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '4px' }}>このガイドに一番聞きたいこと（任意）</label>
          <textarea value={formState.message} onChange={e => setFormState(p => ({ ...p, message: e.target.value }))} placeholder="今の状況や悩み、気になることがあれば教えてください" rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', resize: 'vertical', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
        </div>
        {formError && <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: '#ef4444', margin: 0 }}>{formError}</p>}
        <button type="submit" disabled={submitting} style={{ padding: '14px', background: submitting ? '#9ca3af' : '#111', color: 'var(--pv-text)', border: 'none', borderRadius: '12px', fontSize: 'calc(16px * var(--pv-fs))', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? '送信中…' : (showInstantPicker ? 'この日時で予約を確定する' : '相談リクエストを送る')}
        </button>
      </form>
      )}

      {/* キャンセルポリシー */}
      {provider.cancellation_policy && (
        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.1em', marginBottom: '6px', textTransform: 'uppercase' }}>キャンセルポリシー</div>
          <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{provider.cancellation_policy}</p>
        </div>
      )}
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────────────
function ProviderPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug;

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState(null);
  const [matchData, setMatchData] = useState(null);
  // でお要望2026-09-29：直接訪問・ブックマーク・QR等（?tab=指定なし）は「予約」タブを
  // 既定にする（元々通っている店舗の客が最短で予約できるように）。診断/Mirror経由の
  // リンクだけ?tab=appealを付けて従来通りアピールタブに着地させる。
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'consult');
  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [stories, setStories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appealBlocks, setAppealBlocks] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);

  // お気に入り確認
  useEffect(() => {
    if (!provider) return;
    try {
      const href = `/provider/${slug}`;
      const favs = JSON.parse(localStorage.getItem('fineme:favorites') || '[]');
      setIsFavorited(favs.some(f => f.href === href));
    } catch {}
  }, [provider, slug]);

  // 友達紹介プログラム（でお要望2026-09-14）：?ref=コード付きでこのページに来た場合、
  // 予約リクエスト送信時まで持ち越せるようlocalStorageに保存しておく（店舗ごとに保持）。
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && slug) {
      try { localStorage.setItem(`fineme:referral:${slug}`, ref); } catch {}
    }
  }, [searchParams, slug]);

  // 閲覧履歴に保存
  useEffect(() => {
    if (!provider) return;
    try {
      const href = `/provider/${slug}`;
      const item = {
        href,
        providerName: provider.name,
        image: provider.cover_image_url || '',
        region: provider.prefecture || '',
        category: provider.main_category || '',
        providerId: provider.id,
        viewedAt: new Date().toISOString(),
      };
      const arr = JSON.parse(localStorage.getItem('fineme:history') || '[]')
        .filter(f => f.href !== href);
      arr.unshift(item);
      localStorage.setItem('fineme:history', JSON.stringify(arr.slice(0, 50)));
    } catch {}
  }, [provider, slug]);

  function toggleFavorite() {
    try {
      const href = `/provider/${slug}`;
      const favs = JSON.parse(localStorage.getItem('fineme:favorites') || '[]');
      if (isFavorited) {
        localStorage.setItem('fineme:favorites', JSON.stringify(favs.filter(f => f.href !== href)));
        setIsFavorited(false);
      } else {
        const item = {
          href,
          providerName: provider.name,
          image: provider.cover_image_url || '',
          region: provider.prefecture || '',
          category: provider.main_category || '',
          providerId: provider.id,
          addedAt: new Date().toISOString(),
        };
        localStorage.setItem('fineme:favorites', JSON.stringify([item, ...favs]));
        setIsFavorited(true);
      }
    } catch {}
  }

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/providers/${slug}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/providers/${slug}/services`).then(r => r.ok ? r.json() : []),
      fetch(`/api/providers/${slug}/staff`).then(r => r.ok ? r.json() : []),
      fetch(`/api/providers/${slug}/appeal-blocks`).then(r => r.ok ? r.json() : []),
    ]).then(([prov, svcs, stf, blocks]) => {
      setProvider(prov);
      setServices(Array.isArray(svcs) ? svcs : []);
      setStaff(Array.isArray(stf) ? stf : []);
      setAppealBlocks(Array.isArray(blocks) ? blocks : []);
      setLoading(false);
      // ?tab=consultでの直接着地・ブックマーク等で、その店舗には実在しないタブIDを
      // 指していた場合のフォールバック（例：即時予約のみでリクエストOFFの店舗に
      // ?tab=consultで来た場合は'instant'へ寄せる）
      if (prov) {
        const validIds = tabsFor(prov).map(t => t.id);
        setActiveTab(current => validIds.includes(current) ? current : (validIds[0] || 'basic'));
      }
    }).catch(() => setLoading(false));

    (async () => {
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (raw) { const d = JSON.parse(raw); if (d.version) { setDiagnosis(d); return; } }
      } catch {}
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!sbKey) return;
        const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        const token = sbObj?.access_token;
        if (!token) return;
        const res = await fetch('/api/me/diagnosis', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          if (d?.version) { try { localStorage.setItem('fineme:diagnosis:latest', JSON.stringify(d)); } catch {} setDiagnosis(d); }
        }
      } catch {}
    })();
  }, [slug]);

  useEffect(() => {
    if (provider && diagnosis) setMatchData(calcMatch(provider, diagnosis));
    else if (provider) setMatchData(null);
  }, [provider, diagnosis]);

  // ページ閲覧トラッキング（1セッション1カウント）
  useEffect(() => {
    if (!provider?.id) return;
    const key = `fineme:view:${provider.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch('/api/track/provider-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id }),
    }).catch(() => {});
  }, [provider?.id]);

  useEffect(() => {
    if (!provider?.id) return;
    fetch(`/api/stories?providerId=${provider.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setStories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [provider?.id]);

  // プログラムカードから相談タブへ
  const handleConsultFromProgram = useCallback((service) => {
    setSelectedService(service);
    setActiveTab(primaryBookingTabId(provider));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [provider]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</p></div>;
  if (!provider) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', fontWeight: '700' }}>掲載者が見つかりませんでした。</p>
      <a href="/search" style={{ padding: '10px 20px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '10px', textDecoration: 'none' }}>サービスを探す</a>
    </div>
  );

  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category;

  // 店舗ごとのデザイン設定（でお要望2026-10-01）。色・書体・文字サイズは
  // すべてこの CSS 変数経由で決まる（lib/provider-theme.js）。未設定の店舗はデフォルト。
  const themeVars = themeToCssVars(provider.page_theme);

  return (
    <div className="pv-theme" style={{ ...themeVars, background: 'var(--pv-bg)', color: 'var(--pv-text)', minHeight: '100vh' }}>
    <style>{`
      .pv-theme :is(h1, h2, h3) {
        font-family: var(--pv-hfont) !important;
        font-weight: var(--pv-hweight) !important;
        font-style: var(--pv-hstyle) !important;
      }
      .pv-theme :is(h2, h3):not(.pv-hero *) { color: var(--pv-heading) !important; }
    `}</style>
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* ヒーロー */}
      <div className={provider.cover_image_url ? 'pv-hero' : 'pv-hero fm-contour'} style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', marginBottom: '28px', minHeight: '320px', background: provider.cover_image_url ? `url(${provider.cover_image_url}) center/cover no-repeat` : 'color-mix(in srgb, var(--pv-accent) 24%, #0d1117)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.75) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '320px', padding: '28px 28px 32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '99px', backdropFilter: 'blur(4px)' }}>{catLabel}</span>
            {provider.area && <span style={{ fontSize: 'calc(12px * var(--pv-fs))', padding: '4px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '99px' }}>{provider.area}</span>}
            {matchData?.detail?.isCompassProvider && (
              <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '4px 12px', background: 'rgba(37,99,235,0.85)', color: '#fff', borderRadius: '99px', backdropFilter: 'blur(4px)' }}>あなたの最優先</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginBottom: '8px' }}>
            {provider.photo_url && (
              <img src={provider.photo_url} alt={provider.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 'calc(clamp(22px,4vw,30px) * var(--pv-hs))', fontWeight: '800', margin: '0 0 6px', lineHeight: '1.3', color: '#fff' }}>{provider.name}</h1>
              {provider.catchphrase && <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'rgba(255,255,255,0.88)', margin: '0', lineHeight: '1.6', fontWeight: '600' }}>{provider.catchphrase}</p>}
              {/* 「お店で、どこにあって、予約できるのはここ、この日のここは空いてる、と
                  直感的にわかることが重要」（でお要望2026-09-29）への対応：名前・
                  キャッチコピー直下に場所と本日の営業状況を一行で出す。 */}
              {(provider.nearest_station || todayStatusText(provider)) && (
                <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {provider.nearest_station && <span>{provider.nearest_station}</span>}
                  {todayStatusText(provider) && <span>{todayStatusText(provider)}</span>}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
            {provider.price_from && (
              <span style={{ padding: '10px 18px', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', color: '#fff', backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.1)' }}>
                ¥{provider.price_from.toLocaleString()}〜
              </span>
            )}
            <button onClick={() => { setActiveTab(primaryBookingTabId(provider)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '12px 24px', background: 'rgba(232,228,220,0.9)', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer' }}>
              予約する
            </button>
            <button onClick={toggleFavorite} title={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'} style={{ padding: '12px 16px', background: isFavorited ? 'rgba(201,168,76,0.85)' : 'rgba(255,255,255,0.15)', color: '#fff', border: `1.5px solid ${isFavorited ? '#c9a84c' : 'rgba(255,255,255,0.4)'}`, borderRadius: '12px', fontSize: 'calc(18px * var(--pv-fs))', cursor: 'pointer', backdropFilter: 'blur(4px)', lineHeight: 1 }}>
              {isFavorited ? '★' : '☆'}
            </button>
            {services && services.length > 0 && (
              <button onClick={() => setActiveTab('appeal')} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                プログラムを見る
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 施設写真 + クイックファクト */}
      <FacilityPhotosStrip provider={provider} />
      <QuickFactsStrip provider={provider} />

      {/* タブ */}
      <TabBar activeTab={activeTab} tabs={tabsFor(provider)} onSelect={tab => { setActiveTab(tab); if (tab !== 'consult' && tab !== 'instant') setSelectedService(null); }} />

      {/* タブコンテンツ */}
      {activeTab === 'basic' && <BasicInfoTab provider={provider} />}
      {activeTab === 'appeal' && (
        <AppealTab
          provider={provider}
          diagnosis={diagnosis}
          matchData={matchData}
          stories={stories}
          staff={staff}
          services={services}
          appealBlocks={appealBlocks}
          onConsult={handleConsultFromProgram}
          userPathType={matchData?.detail?.coveredAxes?.[0]?.path_type || null}
          onGoToConsult={() => { setActiveTab(primaryBookingTabId(provider)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      )}
      {activeTab === 'instant' && (
        <ConsultTab
          provider={provider}
          services={services}
          staff={staff}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          submitted={submitted}
          setSubmitted={setSubmitted}
          diagnosis={diagnosis}
          matchData={matchData}
          menuNameHint={searchParams.get('menu_name') || ''}
          mode="instant"
        />
      )}
      {activeTab === 'consult' && (
        <ConsultTab
          provider={provider}
          services={services}
          staff={staff}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          submitted={submitted}
          setSubmitted={setSubmitted}
          diagnosis={diagnosis}
          matchData={matchData}
          menuNameHint={searchParams.get('menu_name') || ''}
          mode={hasFeature(provider, 'booking_request') ? 'request' : 'closed'}
        />
      )}
      {activeTab === 'class' && <ClassTab provider={provider} />}
      {activeTab === 'packages' && <PackagesTab provider={provider} />}
    </div>
    </div>
  );
}

export default function ProviderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</div>}>
      <ProviderPageContent />
    </Suspense>
  );
}
