'use client';
import { useEffect, useState, useCallback, Fragment } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { hasFeature } from '@/lib/feature-flags';
import { isClosedWeekday } from '@/lib/closed-weekday';
import { WEEKDAY_LABEL_BH } from '@/lib/business-hours-labels';
import { themeToCssVars } from '@/lib/provider-theme';
import { freshAccessToken } from '@/lib/browser-auth';
import { isShown } from '@/lib/page-visibility';

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
const AXIS_ICONS  = { body:'体', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
const PATH_LABELS = { virgin:'初めて', quit:'続かなかった', blind:'非客観視', lapsed:'以前やっていた' };
const PATH_PERSON = { virgin:'外見ケアが初めての方', quit:'続かなかった経験がある方', blind:'自己流でやってきたが客観評価がない方', lapsed:'以前やっていたが後回しにしている方' };
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
// 公開ページの共通の見た目（2026-10-22 UI刷新）。青・緑・紫・クリーム色などが混ざって
// ごちゃごちゃしていたため、文字は店舗のテーマの文字色の濃淡、強調はテーマのアクセント色だけにそろえる。
const tx = pct => `color-mix(in srgb, var(--pv-text) ${pct}%, transparent)`;
const ac = pct => `color-mix(in srgb, var(--pv-accent) ${pct}%, transparent)`;
const PV_CARD = { background: 'var(--pv-surface)', border: `1px solid ${tx(12)}`, borderRadius: '16px', padding: '20px' };
const PV_LABEL = { fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', letterSpacing: '.06em', color: tx(62), margin: '0 0 12px' };
const PV_CHIP = { display: 'inline-flex', alignItems: 'center', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', padding: '3px 10px', borderRadius: '99px', border: `1px solid ${tx(20)}`, color: tx(85), whiteSpace: 'nowrap' };
const PV_CHIP_ACCENT = { ...PV_CHIP, border: '1px solid var(--pv-accent)', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)' };
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
function tabsFor(provider, opts = {}) {
  // 店舗が「出さない」にしたタブは除く（でお要望 2026-10-22。予約のタブはいつも出す）
  let tabs = isShown(provider, 'tab_basic') ? [{ id: 'basic', label: '基本情報' }] : [];
  // 予約・リクエスト・グループレッスンは1つの「予約」タブにまとめる（でお要望 2026-10-22：
  // タブが分かれていてだるい。メニューとレッスンを並べ、押したら詳細と日時選びが出る形に）
  tabs.push({ id: 'book', label: '予約' });
  // 会員・チケットをお持ちの方には「会員」タブ（持っているチケット・次の予約・前回と同じ内容で予約）。
  // 勝手に表示を切り替えず、タブとして選べるようにする（でお指摘 2026-10-22）
  if (opts.member) tabs.push({ id: 'mine', label: '会員' });
  if (isShown(provider, 'tab_appeal')) tabs.push({ id: 'appeal', label: 'アピール' });
  // 回数券のオンライン購入（でお要望2026-09-27：決済機能Phase 6第一弾）。
  // 購入可能な回数券が無い店舗でも「無い」ことが分かるよう常に表示する
  // （プログラムタブと同じ扱い。空の時の表示はPackagesTab側で出す）。
  // 月額プラン（入会ページへ）は回数券と別のタブ（でお指摘 2026-10-27：同じタブに混ぜない）。
  // オンラインで入会できる月額プランがある店舗にだけ出す
  if (opts.plans && isShown(provider, 'tab_plans')) tabs.push({ id: 'plans', label: '月額プラン' });
  if (isShown(provider, 'tab_packages')) tabs.push({ id: 'packages', label: '回数券' });
  return tabs;
}
// 「今すぐ予約する」系CTAの着地先。予約は1つのタブにまとめた（2026-10-22）。旧タブ名（instant/consult/class）のリンクもここへ
const OLD_BOOKING_TABS = ['instant', 'consult', 'class'];
function primaryBookingTabId() {
  return 'book';
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
  // 以前は世界標準時の日付で判定していたため、日本の朝9時前は前日の曜日になっていた。
  // また営業時間外でも「営業中」と出ていたので、今の時刻で「営業中／営業時間外」を分ける（2026-10-22）
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (isClosedWeekday(hours, todayStr)) return '本日は定休日';
  const today = hours[WEEKDAY_KEYS_BH[now.getDay()]];
  if (!today?.open || !today?.close) return null;
  const overnight = today.close <= today.open;
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const openNow = overnight ? (hm >= today.open || hm < today.close) : (hm >= today.open && hm < today.close);
  const range = `${today.open}〜${overnight ? '翌' + today.close : today.close}`;
  return openNow ? `営業中（${overnight ? '翌' : ''}${today.close}まで）` : `本日 ${range}`;
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
  // transform_vectors は配列のことも、軸IDをキーにしたobject（{body:{...}, eyebrow:{...}}）のこともある
  // （軸ごとの再スキャンでobject形式になる。app/mypage/page.js と同じ扱い）。object のまま .find して落ちていた（Sentry 2026-10-26）
  const tvRaw = diagnosis.transform_vectors;
  const vectors = Array.isArray(tvRaw) ? tvRaw : Object.entries(tvRaw || {}).map(([id, v]) => ({ id, ...(v || {}) }));
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
    <div>
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
  if (!isShown(provider, 'quick_facts')) return null;
  const chips = [];
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
            background: 'var(--pv-surface)',
            color: chip.highlight ? 'var(--pv-text)' : tx(75),
            border: `1px solid ${chip.highlight ? 'var(--pv-accent)' : tx(15)}`,
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
    <div style={{ ...PV_CARD, boxShadow: 'inset 3px 0 0 var(--pv-accent)' }}>
      <p style={PV_LABEL}>このお店ならではのこと</p>
      <p style={{ fontSize: 'calc(15px * var(--pv-fs))', color: tx(92), lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>{provider.unique_strengths}</p>
    </div>
  );
}

// ── 設備紹介（でお要望 2026-10-22：予約で使わない設備も、どんな設備があるかを見せたい） ─────
function FacilitiesSection({ facilities }) {
  if (!facilities || facilities.length === 0) return null;
  return (
    <div>
      <p style={PV_LABEL}>設備</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
        {facilities.map(f => (
          <div key={f.id} style={{ padding: '14px 16px', background: 'var(--pv-surface)', borderRadius: '14px', border: '1.5px solid color-mix(in srgb, var(--pv-text) 15%, transparent)' }}>
            <div style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)' }}>{f.name}</div>
            {f.description && <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 72%, transparent)', lineHeight: '1.7', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{f.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── スタッフ紹介 ──────────────────────────────────────────────────────────────
function StaffSection({ staff }) {
  const [lightbox, setLightbox] = useState(null);
  if (!staff || staff.length === 0) return null;
  return (
    <div>
      <p style={PV_LABEL}>スタッフ</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {staff.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '20px', background: 'var(--pv-surface)', borderRadius: '18px', border: '1.5px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', backdropFilter: 'blur(8px)' }}>
            {/* アバター */}
            <div style={{ flexShrink: 0 }}>
              {s.photo_url
                ? <img src={s.photo_url} alt={s.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid color-mix(in srgb, var(--pv-text) 25%, transparent)', display: 'block' }} />
                : <div aria-hidden="true" style={{ width: '72px', height: '72px', borderRadius: '50%', background: ac(14), color: tx(85), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(26px * var(--pv-fs))', fontFamily: 'var(--pv-hfont)', fontWeight: '700' }}>{(s.name || '').trim().charAt(0)}</div>
              }
            </div>
            {/* テキスト情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontSize: 'calc(16px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)' }}>{s.name}</span>
                {s.is_featured && (
                  <span style={PV_CHIP_ACCENT}>担当</span>
                )}
                {s.role && <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontWeight: '500' }}>{s.role}</span>}
              </div>
              {/* 経験・資格（資格は長い文章のことが多いので、丸い枠に入れず文で出す） */}
              {s.experience_years && <div style={{ marginBottom: '8px' }}><span style={PV_CHIP}>経験{s.experience_years}年</span></div>}
              {s.credentials && (
                <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {s.credentials.split('\n').filter(Boolean).slice(0, 3).map((cred, i) => (
                    <li key={i} style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(75), lineHeight: '1.6' }}>{cred}</li>
                  ))}
                </ul>
              )}
              {/* 自己紹介 */}
              {s.bio && (
                <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>{s.bio}</p>
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
// 2026-10-22 UI刷新：スクロールしても上に残るようにし、タブは横幅を等分（4〜5個なら折り返さず全部見える）
function TabBar({ activeTab, onSelect, tabs }) {
  const list = tabs || TABS;
  return (
    <div role="tablist" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--pv-bg)', display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderBottom: `1px solid ${tx(15)}`, margin: '0 -4px 24px', padding: '0 4px' }}>
      {list.map(t => {
        const on = activeTab === t.id;
        return (
          <button key={t.id} role="tab" aria-selected={on} onClick={() => { onSelect(t.id); }} style={{
            flex: list.length <= 5 ? '1 0 auto' : '0 0 auto', whiteSpace: 'nowrap', minHeight: '48px',
            padding: '0 10px', fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: on ? '800' : '500',
            color: on ? 'var(--pv-text)' : tx(62), background: 'none', border: 'none',
            boxShadow: on ? 'inset 0 -2px 0 var(--pv-accent)' : 'none', cursor: 'pointer', transition: 'color .15s',
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

// ── Section A: New Me Navi との接点 ────────────────────────────────────────────
function NewMeMapSection({ diagnosis, matchData }) {
  const isNewStyle = !!diagnosis?.transform_vectors;
  const { score, detail } = matchData || {};

  if (!diagnosis) {
    return (
      <div style={PV_CARD}>
        <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', color: tx(92), margin: '0 0 6px' }}>Me Scanを受けると、このお店があなたに合うかが分かります</p>
        <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(65), margin: '0 0 16px', lineHeight: '1.7' }}>外見の8つの項目から、あなたが最初に整えるとよい所と、このお店が得意な所を照らし合わせます。</p>
        <a href="/diagnosis" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 20px', border: `1px solid ${tx(25)}`, color: 'var(--pv-text)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
          無料でMe Scanを受ける
        </a>
      </div>
    );
  }

  const narratives = buildNarrative(diagnosis, matchData);

  return (
    <div style={{ ...PV_CARD, padding: 0, overflow: 'hidden' }}>
      {/* スコアヘッダー */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${tx(10)}` }}>
        <p style={PV_LABEL}>あなたとの相性（Me Scanより）</p>
        {score !== null ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'calc(36px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{score}%</span>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ height: '8px', background: tx(12), borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--pv-accent)', borderRadius: '99px', width: `${score}%`, transition: 'width .5s' }} />
                </div>
              </div>
              {detail?.isCompassProvider && <span style={PV_CHIP_ACCENT}>最初の一手に合うお店</span>}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(75), margin: 0 }}>診断結果と照らし合わせています。</p>
        )}
      </div>

      {/* カバー軸リスト */}
      {isNewStyle && detail?.coveredAxes?.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${tx(10)}` }}>
          <p style={{ ...PV_LABEL, margin: '0 0 10px' }}>このお店が対応している、あなたの項目</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.coveredAxes.map(ax => (
              <div key={ax.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: ax.isCompass ? ac(10) : 'transparent', borderRadius: '10px', border: `1px solid ${ax.isCompass ? 'var(--pv-accent)' : tx(12)}` }}>
                <span aria-hidden="true" style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${tx(20)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--pv-hfont)', fontWeight: '700', flexShrink: 0 }}>{AXIS_ICONS[ax.id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '800', color: tx(92) }}>{AXIS_LABELS[ax.id]}</span>
                    {ax.isCompass && <span style={PV_CHIP_ACCENT}>最初の一手</span>}
                    {ax.path_type && <span style={PV_CHIP}>{PATH_LABELS[ax.path_type]}</span>}
                  </div>
                  {/* 現在地→理想バー */}
                  {ax.gap > 0 && (
                    <div style={{ position: 'relative', height: '6px', background: tx(12), borderRadius: '99px' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: ax.isCompass ? 'var(--pv-accent)' : tx(55), borderRadius: '99px', width: `${Math.max(10, (10 - ax.gap) / 10 * 100)}%` }} />
                    </div>
                  )}
                </div>
                {ax.gap > 0 && (
                  <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: tx(75), flexShrink: 0 }}>
                    伸びしろ {ax.gap >= 4 ? '大' : ax.gap >= 2 ? '中' : '小'}
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
            <p key={i} style={{ fontSize: 'calc(14px * var(--pv-fs))', color: tx(i === 0 ? 92 : 75), lineHeight: '1.7', margin: i < narratives.length - 1 ? '0 0 8px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{n}</p>
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
    ...(provider.handles_failure_patterns || []).map(f => ({ text: FAILURE_PERSON[f] || f })),
    ...(provider.suitable_triggers || []).map(t => ({ text: TRIGGER_PERSON[t] || t })),
  ];

  const hasTargetBlock = targetLines.length > 0 || personCards.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ━━ Block 1: こんな方へ ━━ */}
      {hasTargetBlock && (
        <div style={PV_CARD}>
          <p style={PV_LABEL}>こんな方に</p>

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
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {personCards.map((card, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: 'calc(14px * var(--pv-fs))', color: tx(85), lineHeight: '1.6' }}>
                  <span aria-hidden="true" style={{ color: 'var(--pv-accent)', fontWeight: '800', flexShrink: 0 }}>✓</span>{card.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ━━ Block 2: 哲学 pull-quote ━━ */}
      {provider.philosophy && (
        <div style={{ ...PV_CARD, padding: '28px 24px' }}>
          <p style={PV_LABEL}>大切にしていること</p>
          <p style={{ fontSize: 'calc(16px * var(--pv-fs))', color: tx(92), lineHeight: '1.95', margin: '0', whiteSpace: 'pre-wrap', fontWeight: '500', fontFamily: 'var(--pv-hfont)' }}>{provider.philosophy}</p>
          {provider.provider_style && (
            <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: `1px solid ${tx(10)}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ ...PV_LABEL, margin: 0 }}>進め方</span>
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(85), fontWeight: '500' }}>{STYLE_LABELS[provider.provider_style] || provider.provider_style}</span>
            </div>
          )}
        </div>
      )}

      {/* ━━ Block 2.5: 変容ストーリー（AIマッチング用テキストフィールド） ━━ */}
      {(provider.ideal_client_desc || provider.client_before_state || provider.transformation_pattern || provider.best_fit_desc) && (
        <div style={PV_CARD}>
          <p style={PV_LABEL}>通っている方のこと</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {provider.ideal_client_desc && (
              <div>
                <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', marginBottom: '6px', letterSpacing: '.05em' }}>よく来るお客様の状況・背景</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.ideal_client_desc}</p>
              </div>
            )}
            {provider.client_before_state && (
              <div>
                <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', marginBottom: '6px', letterSpacing: '.05em' }}>来る前の典型的な状態</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.client_before_state}</p>
              </div>
            )}
            {provider.transformation_pattern && (
              <div>
                <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', marginBottom: '6px', letterSpacing: '.05em' }}>よく起きる変化のパターン</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.transformation_pattern}</p>
              </div>
            )}
            {provider.best_fit_desc && (
              <div style={{ background: ac(8), borderRadius: '12px', padding: '16px', border: `1px solid ${ac(30)}` }}>
                <div style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', marginBottom: '6px', letterSpacing: '.05em' }}>特に向いている人・状況</div>
                <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.best_fit_desc}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━ Block 3: サービス詳細 ━━ */}
      {provider.description && (
        <div style={PV_CARD}>
          <p style={PV_LABEL}>サービスの内容</p>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <h2 style={{ fontSize: 'calc(17px * var(--pv-hs))', fontWeight: '800', margin: '0' }}>お客様の体験談</h2>
        {stories.length > 0 && <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(62) }}>{stories.length}件</span>}
      </div>
      {stories.length === 0 ? (
        <div style={{ ...PV_CARD, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: tx(80), margin: 0, lineHeight: '1.7', flex: '1 1 240px' }}>まだ体験談はありません。通ったことがある方は、変わる前と今を書いてみませんか。</p>
          {provider?.slug && (
            <a href={`/story-submit?providerId=${provider.id || ''}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 18px', border: `1px solid ${tx(25)}`, color: 'var(--pv-text)', borderRadius: '10px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>
              体験談を書く
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {stories.map(s => (
            <article key={s.id} style={{ ...PV_CARD, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(s.axis_id || s.path_type) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {s.axis_id && <span style={PV_CHIP}>{AXIS_LABELS[s.axis_id] || s.axis_id}</span>}
                  {s.path_type && <span style={PV_CHIP}>{PATH_LABELS[s.path_type] || s.path_type}</span>}
                </div>
              )}
              <div>
                <p style={{ ...PV_LABEL, margin: '0 0 4px' }}>今</p>
                <p style={{ fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '700', color: tx(92), margin: 0, lineHeight: '1.75' }}>{s.change_after}</p>
              </div>
              {s.concern_before && (
                <div style={{ paddingTop: '12px', borderTop: `1px solid ${tx(10)}` }}>
                  <p style={{ ...PV_LABEL, margin: '0 0 4px' }}>{s.milestone_reached ? `通う前（${s.milestone_reached}）` : '通う前'}</p>
                  <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(70), margin: 0, lineHeight: '1.7' }}>{s.concern_before}</p>
                </div>
              )}
              {s.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {s.tags.map(t => <span key={t} style={{ fontSize: 'calc(12px * var(--pv-fs))', color: tx(62) }}>#{t}</span>)}
                </div>
              )}
            </article>
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
      <blockquote key={b.id} style={{ margin: 0, padding: '16px 20px', borderLeft: '3px solid var(--pv-accent)', background: 'var(--pv-surface)', borderRadius: '0 12px 12px 0' }}>
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
    <div style={{ ...PV_CARD, display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      {provider.photo_url ? (
        <img src={provider.photo_url} alt={provider.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid color-mix(in srgb, var(--pv-accent) 30%, transparent)' }} />
      ) : (
        <div aria-hidden="true" style={{ width: '48px', height: '48px', borderRadius: '50%', background: ac(14), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(20px * var(--pv-fs))', fontFamily: 'var(--pv-hfont)', fontWeight: '700', color: tx(85) }}>{(provider.name || '').trim().charAt(0)}</div>
      )}
      <div>
        <p style={{ ...PV_LABEL, margin: '0 0 8px' }}>お店からのひと言</p>
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
      <h2 style={{ fontSize: 'calc(17px * var(--pv-hs))', fontWeight: '800', margin: '0 0 14px' }}>メニュー</h2>
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
    // 設備は並び替えの項目を増やさず、スタッフ紹介のすぐ後に出す
    case 'builtin_staff':            return <Fragment key={b.id}><StaffSection staff={ctx.staff} /><FacilitiesSection facilities={ctx.facilities} /></Fragment>;
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
function AppealTab({ provider, diagnosis, matchData, stories, staff, facilities, services, appealBlocks, onConsult, userPathType, onGoToConsult }) {
  // でお要望2026-10-01：「デフォルトで表示されているものも自由に並び替えたり内容編集
  // したりできるように」。掲載者が一度でもダッシュボードの並び替え設定を開くとbuiltin_*行が
  // シードされ、そちらの並び順・表示/非表示設定で描画する。まだ開いていない店舗
  // （appealBlocksにbuiltin_*が無い）は従来の固定順レンダリングのまま——既存店舗への影響ゼロ。
  const hasBuiltinConfig = (appealBlocks || []).some(b => b.block_type?.startsWith('builtin_'));
  const blockCtx = { provider, diagnosis, matchData, stories, staff, facilities, services, onConsult, userPathType };
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
            <FacilitiesSection facilities={facilities} />
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
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, var(--pv-bg) 65%, transparent)', zIndex: 50, pointerEvents: 'none' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', pointerEvents: 'all' }}>
          <button onClick={onGoToConsult} style={{ width: '100%', padding: '16px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '14px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.22)', letterSpacing: '.02em' }}>
            予約する
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

  return (
    <div style={{ background: 'var(--pv-surface)', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${isCompassMatch || isPathMatch ? 'var(--pv-accent)' : tx(12)}` }}>

      {/* あなたに合っている印（Me Scanを受けた方だけ） */}
      {(isCompassMatch || isPathMatch) && (
        <div style={{ background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', padding: '9px 18px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: '800' }}>
          {isCompassMatch ? `あなたの最初の一手「${AXIS_LABELS[service.target_axis]}」に合うメニュー` : 'あなたのこれまでに合うメニュー'}
        </div>
      )}

      {/* カバー画像 */}
      {service.image_url && (
        <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
          <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.4) 100%)' }} />
          {service.is_featured && <div style={{ ...PV_CHIP_ACCENT, position: 'absolute', top: '12px', right: '12px' }}>おすすめ</div>}
        </div>
      )}

      <div style={{ padding: '20px' }}>
        {/* 軸タグ + 名前 + 変容の約束（常時表示） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '7px' }}>
            {service.target_axis && (
              <span style={PV_CHIP}>{AXIS_LABELS[service.target_axis]}</span>
            )}
            {!service.image_url && service.is_featured && <span style={PV_CHIP_ACCENT}>おすすめ</span>}
          </div>
          <h3 style={{ fontSize: 'calc(17px * var(--pv-hs))', fontWeight: '900', margin: '0 0 7px', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', lineHeight: '1.3' }}>{service.name}</h3>
          {service.transformation_promise && (
            <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: '0', lineHeight: '1.6' }}>
              {service.transformation_promise}
            </p>
          )}
        </div>

        {/* 価格 */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: 'calc(22px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{service.price != null ? `¥${Number(service.price).toLocaleString()}` : ''}</span>
          {(service.duration_minutes || service.duration) && <span style={{ fontSize: 'calc(12px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', marginLeft: '6px' }}>/ {service.duration_minutes ? `${service.duration_minutes}分` : service.duration}</span>}
        </div>

        {/* 「変容の旅を覗く」ボタン（常時表示・フル幅） */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            style={{ width: '100%', minHeight: '44px', marginBottom: '10px', background: 'transparent', color: 'var(--pv-text)', border: `1px solid ${tx(20)}`, borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer' }}
          >
            {expanded ? '閉じる' : '詳しく見る'}
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
                <div style={{ background: 'var(--pv-surface)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--pv-accent)' }}>
                  <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'var(--pv-text)', letterSpacing: '.1em', padding: service.after_image_url ? '8px 12px 4px' : '12px 12px 4px', textTransform: 'uppercase' }}>AFTER</div>
                  {service.after_image_url && <img src={service.after_image_url} alt="After" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
                  {service.after_text && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: tx(85), margin: 0, lineHeight: '1.6', padding: service.after_image_url ? '8px 12px 12px' : '0 12px 12px' }}>{service.after_text}</p>}
                </div>
              </div>
            )}
            {benefits.length > 0 && (
              <div style={{ marginBottom: '12px', padding: '14px', background: 'var(--pv-surface)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)' }}>
                <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>このプログラムで変わること</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {benefits.slice(0, 5).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--pv-accent)', fontWeight: '800', fontSize: 'calc(13px * var(--pv-fs))', flexShrink: 0, lineHeight: '1.4' }}>✓</span>
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
                    <span key={p} style={PV_CHIP}>{PATH_PERSON[p] || PATH_LABELS[p]}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onConsult(service)}
          style={{ width: '100%', minHeight: '48px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '12px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', cursor: 'pointer', transition: 'opacity .15s' }}
          onMouseOver={e => e.currentTarget.style.opacity = '.88'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          このメニューを予約する
        </button>
      </div>
    </div>
  );
}

function ProgramTab({ services, onConsult, userPathType, provider, matchData }) {
  if (services === null) return <div style={{ textAlign: 'center', padding: '40px', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</div>;
  if (!services.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', background: 'var(--pv-surface)', borderRadius: '18px', border: '1px dashed color-mix(in srgb, var(--pv-text) 20%, transparent)' }}>
      <p style={{ fontSize: 'calc(15px * var(--pv-fs))', margin: 0, fontWeight: '600' }}>メニューはまだ登録されていません</p>
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

      {/* Me Scanを受けた方には、このお店が対応しているあなたの項目を出す */}
      {hasScan && (
        <div style={{ ...PV_CARD, padding: '14px 16px', borderColor: isCompassProvider ? 'var(--pv-accent)' : tx(12) }}>
          <p style={{ ...PV_LABEL, margin: '0 0 8px' }}>{isCompassProvider ? 'あなたの最初の一手を得意とするお店です' : 'あなたの項目に対応しているお店です'}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {coveredAxes.map(ax => <span key={ax.id} style={ax.isCompass ? PV_CHIP_ACCENT : PV_CHIP}>{AXIS_LABELS[ax.id]}</span>)}
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
  const sh = key => isShown(provider, key);
  const status = sh('basic_hours') ? todayStatusText(provider) : null;
  const todayKey = WEEKDAY_KEYS_BH[new Date().getDay()];
  const paymentText = sh('basic_payment') && provider.payment_methods?.length
    ? provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join('、')
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
      <FacilityPhotosStrip provider={provider} />
      {status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', background: 'var(--pv-surface)', border: `1px solid ${status.startsWith('営業中') ? 'var(--pv-accent)' : tx(15)}`, color: 'var(--pv-text)' }}>
          <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.startsWith('営業中') ? 'var(--pv-accent)' : tx(35), flexShrink: 0 }} />
          {status}
        </div>
      )}

      {(sh('basic_address') || sh('basic_station')) && (
      <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
        <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', letterSpacing: '.06em', color: tx(62), margin: '0 0 4px' }}>所在地・アクセス</p>
        <InfoRow label="住所" value={sh('basic_address') ? (fullAddress || null) : null} />
        <InfoRow label="最寄り駅" value={sh('basic_station') ? (provider.nearest_station || null) : null} />
        {sh('basic_address') && mapsHref && (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', color: 'var(--pv-text)', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: 'var(--pv-accent)' }}>
            地図で見る
          </a>
        )}
      </div>
      )}

      {sh('basic_hours') && provider.business_hours && (
        <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
          <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', letterSpacing: '.06em', color: tx(62), margin: '0 0 4px' }}>営業時間</p>
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

      {(sh('basic_price') || sh('basic_payment') || sh('basic_online')) && (
      <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
        <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', letterSpacing: '.06em', color: tx(62), margin: '0 0 4px' }}>料金・お支払い</p>
        <InfoRow label="料金" value={sh('basic_price') && provider.price_from ? `¥${provider.price_from.toLocaleString()}〜` : null} />
        <InfoRow label="お支払い" value={paymentText} />
        <InfoRow label="オンライン対応" value={sh('basic_online') && provider.online_available ? 'あり' : null} />
      </div>
      )}

      {((sh('basic_trial') && provider.trial_available) || (sh('basic_response') && provider.response_hours) || (sh('basic_cancel') && provider.cancellation_policy) || (sh('basic_first_session') && provider.first_session_desc)) && (
        <div style={{ background: 'var(--pv-surface)', border: '1px solid color-mix(in srgb, var(--pv-text) 10%, transparent)', borderRadius: '16px', padding: '18px 20px' }}>
          <p style={{ fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', letterSpacing: '.06em', color: tx(62), margin: '0 0 4px' }}>予約前に知っておきたいこと</p>
          <InfoRow label="お試し" value={sh('basic_trial') && provider.trial_available ? (provider.trial_desc || 'あり') : null} />
          <InfoRow label="返信目安" value={sh('basic_response') && provider.response_hours ? `${provider.response_hours}時間以内` : null} />
          <InfoRow label="初回について" value={sh('basic_first_session') ? (provider.first_session_desc || null) : null} />
          <InfoRow label="キャンセル" value={sh('basic_cancel') ? (provider.cancellation_policy || null) : null} />
        </div>
      )}
    </div>
  );
}

// ── クラスタブ：スクール業態向け、クラスの開催回に直接予約する（でお指摘2026-09-16） ──
const WEEKDAY_JA_CLASS = ['日', '月', '火', '水', '木', '金', '土'];
// classId：予約タブ（BookTab）でレッスンを選んだ時は、そのレッスンの開催日時だけを出す（2026-10-22）
function ClassTab({ provider, classId, preferTicket }) {
  const [classes, setClasses] = useState(null); // null=未取得
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [userId, setUserId] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [doneSlotIds, setDoneSlotIds] = useState([]);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [pickedId, setPickedId] = useState(null);
  // チケットが要るレッスン（でお要望 2026-10-22）：ログイン中のお客様が持っているチケットで予約する
  const [elig, setElig] = useState(null);
  const [ticketId, setTicketId] = useState('');
  useEffect(() => {
    if (!provider?.slug) return;
    freshAccessToken().then(t => fetch(`/api/providers/${provider.slug}/my-eligibility`, { headers: t ? { Authorization: `Bearer ${t}` } : {} }))
      .then(r => (r.ok ? r.json() : null)).then(setElig).catch(() => setElig(null));
  }, [provider?.slug, userId, doneSlotIds.length]);

  useEffect(() => {
    if (!provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/classes`)
      .then(r => r.ok ? r.json() : { classes: [], rooms: [], sessions: [] })
      .then(setClasses)
      .catch(() => setClasses({ classes: [], rooms: [], sessions: [] }));
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

  async function bookSession(slotId, className, packageId) {
    setError('');
    if (!form.name.trim()) { setError('お名前を入力してください'); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError('メールアドレスまたは電話番号のどちらかは必ず入力してください'); return; }
    setBookingSlotId(slotId);
    try {
      // ログイン中ならトークンで本人を確かめてもらう（でお要望 2026-10-21）
      const tk = userId ? await freshAccessToken() : null;
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
        body: JSON.stringify({
          provider_id: provider.id,
          user_id: userId || null,
          user_name: form.name,
          user_contact: [form.email, form.phone].filter(Boolean).join(' / '),
          message: `【グループレッスン予約】${className}`,
          booking_mode: 'instant',
          slot_id: slotId,
          package_id: packageId || null,
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
  const sessions = (classes.sessions || []).filter(x => !classId || x.class_id === classId);
  if (!sessions.length) return <p style={{ color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>{classId ? 'このレッスンは、今予約できる開催日時がありません。' : '現在予約できるグループレッスンの開催日時がありません。'}</p>;

  // でお要望（2026-10-16）：hacomonoの予約画面のように、日付を選ぶと部屋ごとの列に開催回のカードが並ぶ
  const dates = [...new Set(sessions.map(x => x.date))].sort();
  const day = selectedDate && dates.includes(selectedDate) ? selectedDate : dates[0];
  const weekStart = Math.max(0, Math.min(weekOffset, Math.max(0, dates.length - 7)));
  const visibleDates = dates.slice(weekStart, weekStart + 7);
  const daySessions = sessions.filter(x => x.date === day).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  const roomList = [...(classes.rooms || [])];
  if (!roomList.length || daySessions.some(x => !x.place)) roomList.push({ id: null, name: roomList.length ? 'その他' : 'レッスン' });
  const inRoom = (x, r) => (x.place || null) === r.id;
  const usedRooms = roomList.filter(r => daySessions.some(x => inRoom(x, r)));
  const times = [...new Set(daySessions.map(x => String(x.start_time).slice(0, 5)))];
  const fmtDay = d => { const dt = new Date(`${d}T00:00:00`); return { md: `${dt.getMonth() + 1}/${dt.getDate()}`, wd: WEEKDAY_JA_CLASS[dt.getDay()], dd: dt.getDate(), sun: dt.getDay() === 0, sat: dt.getDay() === 6 }; };
  const COLORS = ['#1a1410', '#2f4f8f', '#7c3aed', '#b45309', '#047857', '#be185d', '#0e7490'];
  const colorOf = id => COLORS[Math.max(0, (classes.classes || []).findIndex(c => c.id === id)) % COLORS.length];
  const picked = sessions.find(x => x.id === pickedId) || null;
  const pickedClass = picked ? (classes.classes || []).find(c => c.id === picked.class_id) : null;
  const pickedRule = pickedClass?.needs_ticket ? (elig?.classes?.[pickedClass.id] || { ok: false, ticket_ids: [] }) : null;
  const pickedTickets = pickedRule ? (elig?.tickets || []).filter(t => pickedRule.ticket_ids.includes(t.id)) : [];
  // お支払い方法（2026-10-22）：チケット専用のレッスンはチケットのみ。そうでなければ「チケットを使う／単発」を選ぶ（ticketId '__single' が単発）
  const onlyT = !!(pickedClass?.needs_ticket && pickedClass?.ticket_only);
  const canTicket = !!(pickedClass?.needs_ticket && pickedTickets.length);
  const choice = ticketId === '__single' || pickedTickets.some(t => t.id === ticketId) ? ticketId : (onlyT || preferTicket ? (pickedTickets[0]?.id || '') : '');
  const chosenTicket = choice && choice !== '__single' ? choice : null;
  const loginHref = `/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')}`;
  const muted = 'color-mix(in srgb, var(--pv-text) 62%, transparent)';
  const line = '1px solid color-mix(in srgb, var(--pv-text) 12%, transparent)';

  return (
    <div style={{ maxWidth: '900px', minWidth: 0, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <button type="button" disabled={weekStart === 0} onClick={() => setWeekOffset(Math.max(0, weekStart - 7))} aria-label="前の日程" style={{ padding: '6px 10px', borderRadius: '8px', border: line, background: 'transparent', color: 'var(--pv-text)', opacity: weekStart === 0 ? 0.3 : 1, cursor: 'pointer' }}>‹</button>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, minWidth: 0 }}>
          {visibleDates.map(d => {
            const f = fmtDay(d);
            const on = d === day;
            return (
              <button key={d} type="button" onClick={() => { setSelectedDate(d); setPickedId(null); }}
                style={{ flex: '0 0 auto', minWidth: '56px', padding: '7px 8px', borderRadius: '8px', border: on ? 'none' : line, background: on ? 'var(--pv-accent, #c9a84c)' : 'var(--pv-surface)', color: on ? 'var(--pv-on-accent, #0a0f1e)' : (f.sun ? '#f87171' : f.sat ? '#60a5fa' : 'var(--pv-text)'), fontWeight: 700, fontSize: 'calc(12.5px * var(--pv-fs))', cursor: 'pointer' }}>
                {f.dd}（{f.wd}）
              </button>
            );
          })}
        </div>
        <button type="button" disabled={weekStart + 7 >= dates.length} onClick={() => setWeekOffset(weekStart + 7)} aria-label="次の日程" style={{ padding: '6px 10px', borderRadius: '8px', border: line, background: 'transparent', color: 'var(--pv-text)', opacity: weekStart + 7 >= dates.length ? 0.3 : 1, cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ background: 'var(--pv-accent, #c9a84c)', color: 'var(--pv-on-accent, #0a0f1e)', textAlign: 'center', fontWeight: 800, borderRadius: '8px', padding: '7px', fontSize: 'calc(13px * var(--pv-fs))', marginBottom: '10px' }}>{fmtDay(day).md}（{fmtDay(day).wd}）</div>

      <div style={{ overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${usedRooms.length}, minmax(130px, 1fr))`, gap: '8px', minWidth: `${usedRooms.length * 138}px` }}>
          {usedRooms.map(r => <div key={r.id || 'none'} style={{ textAlign: 'center', fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: 700, color: muted, padding: '6px', borderBottom: line }}>{r.name}</div>)}
          {times.map(t => usedRooms.map(r => {
            const here = daySessions.filter(x => String(x.start_time).slice(0, 5) === t && inRoom(x, r));
            return (
              <div key={`${t}-${r.id || 'none'}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {here.map(x => {
                  const full = x.remaining <= 0;
                  const done = doneSlotIds.includes(x.id);
                  return (
                    <button key={x.id} type="button" disabled={full && !done} onClick={() => setPickedId(x.id)}
                      style={{ position: 'relative', textAlign: 'center', padding: '12px 8px', borderRadius: '12px', border: pickedId === x.id ? '2px solid var(--pv-accent, #c9a84c)' : line, background: 'var(--pv-surface)', color: 'var(--pv-text)', cursor: full ? 'default' : 'pointer', opacity: full && !done ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                      {(full || done) && <span style={{ position: 'absolute', top: 0, right: 0, background: done ? 'var(--pv-accent)' : 'var(--pv-text)', color: done ? 'var(--pv-on-accent)' : 'var(--pv-bg)', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '0 12px 0 8px' }}>{done ? '予約済み' : '満席'}</span>}
                      <span style={{ fontWeight: 800, fontSize: 'calc(13px * var(--pv-fs))' }}>{String(x.start_time).slice(0, 5)}{x.end_time ? ` - ${String(x.end_time).slice(0, 5)}` : ''}</span>
                      {x.staff?.photo_url
                        ? <img src={x.staff.photo_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                        : <span style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--pv-text) 10%, transparent)', fontWeight: 800, fontSize: '18px' }}>{(x.staff?.name || x.class_name || '・').trim().charAt(0)}</span>}
                      <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: 700 }}>{x.staff?.name || ''}</span>
                      <span style={{ background: colorOf(x.class_id), color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 10px', borderRadius: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.class_name}</span>
                      {!full && <span style={{ fontSize: '11px', color: muted }}>残り{x.remaining}枠</span>}
                    </button>
                  );
                })}
              </div>
            );
          }))}
        </div>
      </div>

      {picked && (
        <div style={{ marginTop: '16px', background: 'var(--pv-surface)', borderRadius: '16px', padding: '18px 20px', border: line }}>
          <p style={{ margin: '0 0 2px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: 800 }}>{picked.class_name}</p>
          <p style={{ margin: '0 0 10px', fontSize: 'calc(12.5px * var(--pv-fs))', color: muted }}>{fmtDay(picked.date).md}（{fmtDay(picked.date).wd}）{String(picked.start_time).slice(0, 5)}〜{String(picked.end_time || '').slice(0, 5)}{picked.staff?.name ? `・${picked.staff.name}` : ''}・残り{picked.remaining}枠</p>
          {(classes.classes || []).find(c => c.id === picked.class_id)?.description && <p style={{ margin: '0 0 12px', fontSize: 'calc(12.5px * var(--pv-fs))', color: muted, lineHeight: 1.6 }}>{(classes.classes || []).find(c => c.id === picked.class_id).description}</p>}
          {onlyT && !doneSlotIds.includes(picked.id) && (
            <div style={{ margin: '0 0 12px', fontSize: 'calc(12.5px * var(--pv-fs))', lineHeight: 1.7 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{pickedClass.scope_label}だけが予約できます</p>
              {!elig?.logged_in ? (
                <a href={loginHref} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>ログインすると、お持ちのチケットで予約できます</a>
              ) : !pickedRule?.ok ? (
                <span>使えるチケットをお持ちではありません。<a href={`/provider/${provider.slug}?tab=packages`} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>回数券を見る</a>・<a href={`/provider/${provider.slug}/join`} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>月額プランに入会する</a></span>
              ) : null}
            </div>
          )}
          {canTicket && !doneSlotIds.includes(picked.id) && (
            <fieldset style={{ border: 'none', margin: '0 0 12px', padding: 0, display: 'grid', gap: '8px' }}>
              <legend style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: 700, color: tx(75), marginBottom: '6px', padding: 0 }}>{onlyT ? `使うチケット（1回${pickedClass.ticket_cost}枚）` : 'お支払い方法 *'}</legend>
              {pickedTickets.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${choice === t.id ? 'var(--pv-accent)' : tx(18)}`, background: choice === t.id ? ac(8) : 'transparent', fontSize: 'calc(14px * var(--pv-fs))' }}>
                  <input type="radio" name={`pay-${picked.id}`} checked={choice === t.id} onChange={() => setTicketId(t.id)} style={{ accentColor: 'var(--pv-accent)', width: '18px', height: '18px' }} />
                  <span><b>チケットを使う</b>：{t.name}<span style={{ display: 'block', fontSize: 'calc(12px * var(--pv-fs))', color: tx(65) }}>{pickedClass.ticket_cost}枚使います（{t.unlimited ? '使い放題' : `残り${t.remaining}枚`}）</span></span>
                </label>
              ))}
              {!onlyT && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${choice === '__single' ? 'var(--pv-accent)' : tx(18)}`, background: choice === '__single' ? ac(8) : 'transparent', fontSize: 'calc(14px * var(--pv-fs))' }}>
                  <input type="radio" name={`pay-${picked.id}`} checked={choice === '__single'} onChange={() => setTicketId('__single')} style={{ accentColor: 'var(--pv-accent)', width: '18px', height: '18px' }} />
                  <span><b>単発で予約</b>{pickedClass.price != null ? `：¥${Number(pickedClass.price).toLocaleString()}` : ''}<span style={{ display: 'block', fontSize: 'calc(12px * var(--pv-fs))', color: tx(65) }}>チケットは使いません。料金はお店でお支払いください</span></span>
                </label>
              )}
              <p style={{ margin: 0, fontSize: 'calc(11.5px * var(--pv-fs))', color: tx(62) }}>チケットは予約した時点で使い、来店前にキャンセルすると戻ります。</p>
            </fieldset>
          )}
          {doneSlotIds.includes(picked.id) ? (
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--pv-text)' }}>予約しました。</p>
          ) : onlyT && !pickedRule?.ok ? null : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input placeholder="お名前 *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder="メールアドレス" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
                  <input placeholder="電話番号" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 'calc(13px * var(--pv-fs))', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--pv-text) 20%, transparent)', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
                </div>
              </div>
              {error && <p role="alert" style={{ color: 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(12.5px * var(--pv-fs))', margin: '8px 0 0' }}>{error}</p>}
              <button type="button" onClick={() => { if (canTicket && !onlyT && !choice) { setError('チケットを使うか、単発で予約するかを選んでください'); return; } bookSession(picked.id, picked.class_name, chosenTicket); }} disabled={bookingSlotId === picked.id}
                style={{ marginTop: '12px', width: '100%', padding: '12px', background: 'var(--pv-accent, #c9a84c)', color: 'var(--pv-on-accent, #0a0f1e)', border: 'none', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: 800, cursor: 'pointer', opacity: bookingSlotId === picked.id ? 0.6 : 1 }}>
                {bookingSlotId === picked.id ? '予約中…' : 'このレッスンを予約する'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ── 予約タブ（でお要望 2026-10-22：予約・リクエスト・グループレッスンを1か所に）。
//    メニューとグループレッスンを並べ、押すとその場で詳細と日時選び（空いている時間／リクエスト／開催日時）が出る。 ──
// ticketFilter：マイページのチケットから来た時は、そのチケットで予約できるメニュー・レッスンだけを並べる（でお要望 2026-10-22）
function BookTab({ provider, services, staff, elig, onEligChanged, selectedService, setSelectedService, submitted, setSubmitted, diagnosis, matchData, menuNameHint, presetStaffId, presetLessonId, hideMemberCard, ticketFilter }) {
  const [onlyTicket, setOnlyTicket] = useState(ticketFilter || null);
  const requestOn = hasFeature(provider, 'booking_request');
  const lessonsOn = hasFeature(provider, 'class_management') && isShown(provider, 'tab_class');
  const [lessons, setLessons] = useState([]);
  const [picked, setPicked] = useState(() => (selectedService ? { kind: 'service', id: selectedService.id } : null));
  useEffect(() => {
    if (!lessonsOn || !provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/classes`).then(r => (r.ok ? r.json() : { classes: [] })).then(d => {
      setLessons(d.classes || []);
      if (presetLessonId && (d.classes || []).length) setPicked({ kind: 'lesson', id: presetLessonId === 'any' ? d.classes[0].id : presetLessonId });
    }).catch(() => setLessons([]));
  }, [provider?.slug, lessonsOn]);
  // 他の場所（アピールのプログラム・通知のリンク）からメニューを選んで来た時
  useEffect(() => { if (selectedService) setPicked({ kind: 'service', id: selectedService.id }); }, [selectedService?.id]);
  const svcState = sv => (sv?.booking_scope !== 'limited' ? 'open' : elig?.services?.[sv.id]?.ok ? 'ok' : 'locked');
  const lessonState = c => (!c.ticket_only ? 'open' : elig?.classes?.[c.id]?.ok ? 'ok' : 'locked');
  const hidden = new Set(elig?.hidden_for_member || []);
  const visibleServices = (services || []).filter(sv => !(sv.hide_when_locked && svcState(sv) === 'locked') && !hidden.has(sv.id) && (!onlyTicket || (sv.ticket_ids || []).includes(onlyTicket)));
  const visibleLessons = lessons.filter(c => !onlyTicket || (c.ticket_ids || []).includes(onlyTicket));
  const ticketName = onlyTicket ? (elig?.tickets || []).find(t => t.ticket_id === onlyTicket)?.name : null;
  const loginHref = `/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')}`;
  const pick = (kind, item) => {
    if (picked?.kind === kind && picked?.id === (item?.id || null)) { setPicked(null); setSelectedService(null); return; }
    setPicked({ kind, id: item?.id || null });
    setSelectedService(kind === 'service' ? item : null);
    setSubmitted(false);
  };
  const muted = 'color-mix(in srgb, var(--pv-text) 62%, transparent)';
  const line = '1px solid color-mix(in srgb, var(--pv-text) 14%, transparent)';
  const card = on => ({ border: on ? '2px solid var(--pv-text)' : line, borderRadius: '14px', background: 'var(--pv-surface)', overflow: 'hidden' });
  const head = { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: 'var(--pv-text)', textAlign: 'left', cursor: 'pointer', font: 'inherit' };
  const chip = { fontSize: 'calc(11px * var(--pv-fs))', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', border: line };
  const lockedLinks = (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: 'calc(12.5px * var(--pv-fs))' }}>
      {!elig?.logged_in
        ? <a href={loginHref} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>ログインすると、お持ちのチケットで予約できます</a>
        : <>
            <a href={`/provider/${provider.slug}?tab=packages`} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>回数券を見る</a>
            <a href={`/provider/${provider.slug}/join`} style={{ color: 'var(--pv-text)', fontWeight: 700 }}>月額プランに入会する</a>
          </>}
    </div>
  );
  const consultProps = { provider, services, staff, onServiceSelect: setSelectedService, submitted, setSubmitted, diagnosis, matchData, menuNameHint, presetStaffId };
  const empty = !visibleServices.length && !(lessonsOn && visibleLessons.length);

  return (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '40px' }}>
      {!hideMemberCard && elig?.logged_in && <MemberCard provider={provider} elig={elig} onChanged={onEligChanged} />}
      {onlyTicket ? (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', margin: '0 0 4px' }}>
          <p style={{ margin: 0, fontSize: 'calc(13px * var(--pv-fs))', fontWeight: 700 }}>{ticketName ? `「${ticketName}」で` : 'お持ちのチケットで'}予約できるメニュー・レッスン</p>
          <button type="button" onClick={() => setOnlyTicket(null)} style={{ padding: '6px 12px', borderRadius: '99px', border: line, background: 'transparent', color: 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(12px * var(--pv-fs))', cursor: 'pointer' }}>すべてのメニューを見る</button>
        </div>
      ) : <p style={{ margin: '0 0 4px', fontSize: 'calc(13px * var(--pv-fs))', color: muted }}>予約したいメニュー・レッスンを選ぶと、日時を選べます。</p>}
      {empty && !requestOn && <p style={{ margin: 0, color: muted }}>現在、予約できるメニューがありません。</p>}
      {visibleServices.map(s => {
        const st = svcState(s);
        const on = picked?.kind === 'service' && picked.id === s.id;
        return (
          <div key={`s-${s.id}`} style={card(on)}>
            <button type="button" onClick={() => pick('service', s)} style={head} aria-expanded={on}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 'calc(15px * var(--pv-fs))' }}>{s.name}</span>
                <span style={{ display: 'block', fontSize: 'calc(12.5px * var(--pv-fs))', color: muted, marginTop: '2px' }}>
                  {[s.duration_minutes ? `${s.duration_minutes}分` : (/^\d+$/.test(String(s.duration || '')) ? `${s.duration}分` : s.duration), st === 'open' && Number(s.price) > 0 ? `¥${Number(s.price).toLocaleString()}` : null].filter(Boolean).join('・')}
                </span>
              </span>
              {st !== 'open' ? <span style={chip}>{st === 'ok' ? `チケット${s.ticket_cost || 1}枚` : 'チケット専用'}</span>
                : s.ticket_label ? <span style={chip}>チケットも使えます</span> : null}
              <span aria-hidden="true" style={{ fontSize: '18px' }}>{on ? '−' : '＋'}</span>
            </button>
            {on && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px', minWidth: 0 }}>
                {s.description && <p style={{ margin: 0, fontSize: 'calc(13px * var(--pv-fs))', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.description}</p>}
                {st === 'locked' ? (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 'calc(13px * var(--pv-fs))' }}>{s.scope_label || '対象のお客様'}だけが予約できます</p>
                    {lockedLinks}
                  </div>
                ) : (
                  <ServiceBooking provider={provider} service={s} consultProps={consultProps} />
                )}
              </div>
            )}
          </div>
        );
      })}
      {lessonsOn && visibleLessons.map(c => {
        const st = lessonState(c);
        const on = picked?.kind === 'lesson' && picked.id === c.id;
        return (
          <div key={`l-${c.id}`} style={card(on)}>
            <button type="button" onClick={() => pick('lesson', c)} style={head} aria-expanded={on}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 'calc(15px * var(--pv-fs))' }}>{c.name}</span>
                <span style={{ display: 'block', fontSize: 'calc(12.5px * var(--pv-fs))', color: muted, marginTop: '2px' }}>
                  {['グループレッスン', c.capacity ? `定員${c.capacity}名` : null, st === 'open' && c.price != null ? `¥${Number(c.price).toLocaleString()}` : null].filter(Boolean).join('・')}
                </span>
              </span>
              {st !== 'open' ? <span style={chip}>{st === 'ok' ? `チケット${c.ticket_cost || 1}枚` : 'チケット専用'}</span>
                : c.needs_ticket ? <span style={chip}>チケットも使えます</span> : null}
              <span aria-hidden="true" style={{ fontSize: '18px' }}>{on ? '−' : '＋'}</span>
            </button>
            {on && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px', minWidth: 0 }}>
                {c.description && <p style={{ margin: 0, fontSize: 'calc(13px * var(--pv-fs))', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.description}</p>}
                <ClassTab provider={provider} classId={c.id} />
              </div>
            )}
          </div>
        );
      })}
      {requestOn && !onlyTicket && (
        <div style={card(picked?.kind === 'consult')}>
          <button type="button" onClick={() => pick('consult', null)} style={head} aria-expanded={picked?.kind === 'consult'}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 'calc(15px * var(--pv-fs))' }}>まず話を聞いてみたい</span>
              <span style={{ display: 'block', fontSize: 'calc(12.5px * var(--pv-fs))', color: muted, marginTop: '2px' }}>メニューが決まっていない方は、希望日時を送って相談できます</span>
            </span>
            <span aria-hidden="true" style={{ fontSize: '18px' }}>{picked?.kind === 'consult' ? '−' : '＋'}</span>
          </button>
          {picked?.kind === 'consult' && <div style={{ padding: '0 16px 16px' }}><ConsultTab {...consultProps} selectedService={null} mode="request" /></div>}
        </div>
      )}
    </div>
  );
}

// メニュー1つ分の日時選び（空いている時間から予約／希望日時を相談）。予約タブと会員タブで共通（2026-10-22）
function ServiceBooking({ provider, service, consultProps }) {
  const instantOn = hasFeature(provider, 'instant_booking');
  const requestOn = hasFeature(provider, 'booking_request');
  const [how, setHow] = useState(instantOn ? 'instant' : 'request');
  return (
    <>
      {instantOn && requestOn && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['instant', '空いている時間から予約'], ['request', '希望日時を相談（リクエスト）']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={how === k} onClick={() => setHow(k)} style={{ minHeight: '40px', padding: '0 14px', borderRadius: '99px', border: `1px solid ${how === k ? 'var(--pv-accent)' : tx(20)}`, background: how === k ? 'var(--pv-accent)' : 'transparent', color: how === k ? 'var(--pv-on-accent)' : 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(12.5px * var(--pv-fs))', cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
      )}
      <ConsultTab {...consultProps} selectedService={service} mode={instantOn && (how === 'instant' || !requestOn) ? 'instant' : requestOn ? 'request' : 'closed'} onAskRequest={requestOn ? () => setHow('request') : null} />
    </>
  );
}

// ── 会員タブ（でお要望 2026-10-22：会員・回数券・月額プランの方は、ここだけ見れば予約まで終わるように）。
//    お持ちのチケットを選ぶと、そのチケットで予約できるメニュー・レッスンの空き枠がその場に出て、そのまま予約できる。
//    次のご予約（その場でキャンセル）・前回と同じ内容での予約もこのタブの中で完結させる（予約タブへ移らない）。 ──
function MemberTab({ provider, services, staff, elig, onEligChanged, diagnosis, matchData, onGoBook }) {
  const [resv, setResv] = useState(null);
  const [msg, setMsg] = useState('');
  const [askCancel, setAskCancel] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [pickTicket, setPickTicket] = useState(null);  // customer_packages.id
  const [pickItem, setPickItem] = useState(null);      // { kind: 'service'|'lesson', id }
  const [submitted, setSubmitted] = useState(false);
  const lessonsOn = hasFeature(provider, 'class_management') && isShown(provider, 'tab_class');
  const load = async () => {
    const t = await freshAccessToken();
    if (!t) { setResv([]); return; }
    const rows = await fetch('/api/me/reservations', { headers: { Authorization: `Bearer ${t}` } }).then(r => (r.ok ? r.json() : [])).catch(() => []);
    setResv((rows || []).filter(r => r.provider_id === provider.id));
  };
  useEffect(() => { load(); }, [provider?.id, elig?.logged_in]);
  useEffect(() => {
    if (!lessonsOn || !provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/classes`).then(r => (r.ok ? r.json() : { classes: [] })).then(d => setLessons(d.classes || [])).catch(() => setLessons([]));
  }, [provider?.slug, lessonsOn]);

  const tickets = (elig?.tickets || []).filter(t => t.ticket_id);
  const ticket = tickets.find(t => t.id === pickTicket) || tickets[0] || null;
  const hidden = new Set(elig?.hidden_for_member || []);
  const items = ticket ? [
    ...(services || []).filter(sv => (sv.ticket_ids || []).includes(ticket.ticket_id) && !hidden.has(sv.id) && (elig?.services?.[sv.id]?.ticket_ids || []).length).map(sv => ({ kind: 'service', id: sv.id, name: sv.name, sub: [sv.duration_minutes ? `${sv.duration_minutes}分` : null, `チケット${sv.ticket_cost || 1}枚`].filter(Boolean).join('・'), svc: sv })),
    ...lessons.filter(c => (c.ticket_ids || []).includes(ticket.ticket_id) && (elig?.classes?.[c.id]?.ticket_ids || []).length).map(c => ({ kind: 'lesson', id: c.id, name: c.name, sub: `グループレッスン・チケット${c.ticket_cost || 1}枚` })),
  ] : [];
  const item = items.find(i => pickItem && i.kind === pickItem.kind && i.id === pickItem.id) || items[0] || null;

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const upcoming = (resv || []).filter(r => ['pending', 'approved', 'counter_proposed'].includes(r.status) && (r.date || '') >= today)
    .sort((x, y) => `${x.date} ${x.time || ''}`.localeCompare(`${y.date} ${y.time || ''}`));
  const last = (resv || []).filter(r => r.status === 'visited' && r.service_id).sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
  const lastService = last ? (services || []).find(sv => sv.id === last.service_id) : null;
  // 前回のメニューがチケットで予約できるなら、このタブの中でそのメニューの空き枠を開く
  const lastTicket = lastService ? tickets.find(t => (lastService.ticket_ids || []).includes(t.ticket_id)) : null;
  function rebookLast() {
    if (lastTicket) { setPickTicket(lastTicket.id); setPickItem({ kind: 'service', id: lastService.id }); setSubmitted(false); document.getElementById('pv-member-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else onGoBook(lastService);
  }
  async function cancel(r) {
    const t = await freshAccessToken();
    const res = await fetch(`/api/reservations/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ status: 'cancelled' }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'キャンセルしました。使ったチケットは戻りました。' : (d.error || 'キャンセルできませんでした'));
    setAskCancel(null);
    load(); onEligChanged?.();
  }
  // 予約が終わったら、次のご予約と残り枚数を最新にする
  const onSubmitted = v => { setSubmitted(v); if (v) { load(); onEligChanged?.(); } };
  const consultProps = { provider, services, staff, onServiceSelect: () => {}, submitted, setSubmitted: onSubmitted, diagnosis, matchData, menuNameHint: '', presetStaffId: last?.staff_id || '', forMember: true, preferTicket: true };
  const ghostBtn = { minHeight: '40px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${tx(22)}`, background: 'transparent', color: 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(13px * var(--pv-fs))', cursor: 'pointer' };
  const pill = on => ({ minHeight: '40px', padding: '0 14px', borderRadius: '99px', border: `1px solid ${on ? 'var(--pv-accent)' : tx(20)}`, background: on ? 'var(--pv-accent)' : 'transparent', color: on ? 'var(--pv-on-accent)' : 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(13px * var(--pv-fs))', cursor: 'pointer', textAlign: 'left' });
  const loginHref = `/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')}`;

  if (!elig) return <div style={{ ...PV_CARD, color: tx(62) }}>読み込み中…</div>;
  if (!elig.logged_in) {
    return (
      <div style={{ ...PV_CARD, display: 'grid', gap: '12px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 'calc(15px * var(--pv-fs))' }}>通っている方は、ログインするとここから予約できます</p>
        <p style={{ margin: 0, color: tx(70), fontSize: 'calc(13px * var(--pv-fs))', lineHeight: 1.7 }}>お持ちの回数券・チケットと、それで予約できる空いている時間が表示されます。</p>
        <a href={loginHref} style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', minHeight: '48px', padding: '0 22px', borderRadius: '12px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', fontWeight: 800, textDecoration: 'none' }}>ログインする</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '24px', paddingBottom: '40px', minWidth: 0 }}>
      {/* 次のご予約 */}
      <section style={{ display: 'grid', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: 'calc(15px * var(--pv-hs))', fontWeight: '800' }}>次のご予約</h2>
        {resv === null ? <div style={{ ...PV_CARD, color: tx(62) }}>読み込み中…</div>
          : !upcoming.length ? <div style={{ ...PV_CARD, color: tx(70), fontSize: 'calc(13.5px * var(--pv-fs))' }}>これからのご予約はありません。</div>
          : upcoming.map(r => (
            <div key={r.id} style={{ ...PV_CARD, padding: '14px 16px', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'calc(18px * var(--pv-fs))', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.date ? `${Number(r.date.slice(5, 7))}月${Number(r.date.slice(8, 10))}日（${'日月火水木金土'[new Date(`${r.date}T00:00:00`).getDay()]}）` : ''} {r.time || ''}</span>
                <span style={r.status === 'approved' ? PV_CHIP_ACCENT : PV_CHIP}>{r.status === 'approved' ? '確定' : r.status === 'counter_proposed' ? '日時の提案あり' : 'お店の確認待ち'}</span>
              </div>
              <span style={{ fontSize: 'calc(13.5px * var(--pv-fs))', color: tx(80) }}>{r.menu_name || (r.is_lesson ? 'グループレッスン' : 'ご予約')}{r.tickets_used ? `・チケット${r.tickets_used}枚` : ''}</span>
              {askCancel === r.id ? (
                <div role="group" aria-label="キャンセルの確認" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'calc(13px * var(--pv-fs))', fontWeight: 700 }}>キャンセルしますか？</span>
                  <button type="button" onClick={() => cancel(r)} style={{ ...ghostBtn, borderColor: 'var(--pv-text)' }}>キャンセルする</button>
                  <button type="button" onClick={() => setAskCancel(null)} style={{ ...ghostBtn, border: 'none' }}>やめる</button>
                </div>
              ) : (
                <div><button type="button" onClick={() => { setAskCancel(r.id); setMsg(''); }} style={ghostBtn}>キャンセル</button></div>
              )}
            </div>
          ))}
        {msg && <p role="status" style={{ margin: 0, fontSize: 'calc(13px * var(--pv-fs))', fontWeight: 700 }}>{msg}</p>}
      </section>

      {/* チケットで予約（空いている時間がその場に出る） */}
      <section id="pv-member-book" style={{ display: 'grid', gap: '12px', scrollMarginTop: '60px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 'calc(15px * var(--pv-hs))', fontWeight: '800' }}>チケットで予約する</h2>
          {lastService && <button type="button" onClick={rebookLast} style={ghostBtn}>前回と同じ（{lastService.name}）</button>}
        </div>
        {!tickets.length ? (
          <div style={{ ...PV_CARD, display: 'grid', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: 'calc(13.5px * var(--pv-fs))', color: tx(80), lineHeight: 1.7 }}>使えるチケットがありません。回数券を買うか、チケットを使わないメニューから予約できます。</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a href={`/provider/${provider.slug}?tab=packages`} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>回数券を見る</a>
              <button type="button" onClick={() => onGoBook(null)} style={ghostBtn}>メニューから予約する</button>
            </div>
          </div>
        ) : (
          <>
            {/* お持ちのチケット（押すと、そのチケットで予約できるものに切り替わる） */}
            <div role="radiogroup" aria-label="使うチケット" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: '8px' }}>
              {tickets.map(t => {
                const on = ticket?.id === t.id;
                return (
                  <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => { setPickTicket(t.id); setPickItem(null); setSubmitted(false); }}
                    style={{ textAlign: 'left', padding: '12px 14px', borderRadius: '14px', border: `1px solid ${on ? 'var(--pv-accent)' : tx(15)}`, background: on ? ac(10) : 'var(--pv-surface)', color: 'var(--pv-text)', cursor: 'pointer', display: 'grid', gap: '2px' }}>
                    <span style={{ fontWeight: 800, fontSize: 'calc(14px * var(--pv-fs))' }}>{t.name}</span>
                    <span style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(75) }}>
                      {t.unlimited ? '通い放題' : <>残り<b style={{ fontSize: 'calc(17px * var(--pv-fs))', color: 'var(--pv-text)', margin: '0 2px' }}>{t.remaining}</b>枚</>}
                      {t.expires_at ? `・${new Date(t.expires_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}まで` : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {!items.length ? (
              <div style={{ ...PV_CARD, color: tx(75), fontSize: 'calc(13.5px * var(--pv-fs))' }}>このチケットで予約できるメニューは今ありません。お店にお問い合わせください。</div>
            ) : (
              <div style={{ ...PV_CARD, display: 'grid', gap: '14px', minWidth: 0 }}>
                {items.length > 1 ? (
                  <div role="radiogroup" aria-label="予約するメニュー" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {items.map(i => {
                      const on = item && i.kind === item.kind && i.id === item.id;
                      return <button key={`${i.kind}-${i.id}`} type="button" role="radio" aria-checked={on} onClick={() => { setPickItem({ kind: i.kind, id: i.id }); setSubmitted(false); }} style={pill(on)}>{i.name}</button>;
                    })}
                  </div>
                ) : null}
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 'calc(15px * var(--pv-fs))' }}>{item.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(65) }}>{item.sub}</p>
                </div>
                {item.kind === 'service'
                  ? <ServiceBooking key={`s-${item.id}-${ticket.id}`} provider={provider} service={item.svc} consultProps={consultProps} />
                  : <ClassTab key={`l-${item.id}`} provider={provider} classId={item.id} preferTicket />}
              </div>
            )}
          </>
        )}
        <button type="button" onClick={() => onGoBook(null)} style={{ ...ghostBtn, justifySelf: 'start', border: 'none', textDecoration: 'underline', textUnderlineOffset: '4px', padding: 0 }}>チケットを使わないメニューを見る</button>
      </section>
    </div>
  );
}

// ── タブ「回数券」（でお要望2026-09-27：決済機能Phase 6第一弾。オンラインでの
//    回数券・パッケージ購入）。Stripe Checkout(mode:'payment')の hosted page に
//    遷移し、決済完了後にこのタブへ戻ってconfirmを叩いて確定する。 ──
function PackagesTab({ provider, mode = 'packages' }) {
  // マイページの使い切った回数券から来た時は、同じ回数券を目立たせてそこまで送る（でお要望 2026-10-22）
  const highlightId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('package') : null;
  const [packages, setPackages] = useState(null); // null=未取得
  const [plans, setPlans] = useState(null); // 月額プラン（オンライン入会できる店舗だけ）
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
    fetch(`/api/providers/${provider.slug}/membership-info`).then(r => (r.ok ? r.json() : null)).then(d => setPlans(d?.plans || [])).catch(() => setPlans([]));
  }, [provider?.slug]);
  useEffect(() => {
    if (!provider?.slug) return;
    fetch(`/api/providers/${provider.slug}/packages`)
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        setPackages(list);
        if (highlightId && (list || []).some(x => x.id === highlightId)) setTimeout(() => document.getElementById(`pkg-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
      })
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

  if (packages === null || plans === null) return <div style={{ padding: '40px', textAlign: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>読み込み中…</div>;
  const showPlans = mode === 'plans';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '60px' }}>
      {showPlans && !plans.length && (
        <p style={{ textAlign: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontSize: 'calc(14px * var(--pv-fs))', padding: '40px 0' }}>現在、オンラインで入会できる月額プランはありません。</p>
      )}
      {showPlans && plans.length > 0 && (
        <section style={{ display: 'grid', gap: '10px', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: 'calc(16px * var(--pv-hs))', fontWeight: '800' }}>月額プラン</h2>
          {plans.map(pl => (
            <div key={pl.id} style={{ ...PV_CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 'calc(15px * var(--pv-fs))' }}>{pl.name}</p>
                {pl.description && <p style={{ margin: '4px 0 0', fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(70), lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{pl.description}</p>}
                {Number(pl.initial_fee) > 0 && <p style={{ margin: '4px 0 0', fontSize: 'calc(12px * var(--pv-fs))', color: tx(62) }}>入会金 ¥{Number(pl.initial_fee).toLocaleString()}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: 'calc(18px * var(--pv-fs))', fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>¥{Number(pl.monthly_price || 0).toLocaleString()}<span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: 500, color: tx(62) }}>／月</span></span>
                <a href={`/provider/${encodeURIComponent(provider.slug)}/join?plan=${pl.id}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 18px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', textDecoration: 'none' }}>入会する</a>
              </div>
            </div>
          ))}
        </section>
      )}
      {!showPlans && <h2 style={{ margin: 0, fontSize: 'calc(16px * var(--pv-hs))', fontWeight: '800' }}>回数券</h2>}
      {!showPlans && confirmMsg && (
        <div role="status" style={{ padding: '14px 16px', background: ac(10), border: '1px solid var(--pv-accent)', borderRadius: '12px', color: 'var(--pv-text)', fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: '700' }}>
          {confirmMsg}
        </div>
      )}
      {!showPlans && error && (
        <div role="alert" style={{ padding: '12px 16px', background: 'var(--pv-surface)', border: `1px solid ${tx(40)}`, borderRadius: '12px', color: 'var(--pv-text)', fontWeight: '700', fontSize: 'calc(13px * var(--pv-fs))' }}>
          {error}
        </div>
      )}
      {!showPlans && (!packages.length ? (
        <p style={{ textAlign: 'center', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', fontSize: 'calc(14px * var(--pv-fs))', padding: '40px 0' }}>現在お求めいただける回数券はありません。</p>
      ) : (<>
        {highlightId && !packages.some(x => x.id === highlightId) && (
          <p style={{ margin: '0 0 4px', fontSize: 'calc(13px * var(--pv-fs))', fontWeight: 700 }}>前回お使いの回数券は、今はオンラインで購入できません。お店に直接お問い合わせください。</p>
        )}
        {packages.map(pkg => (
        <div key={pkg.id} id={`pkg-${pkg.id}`} style={{ border: pkg.id === highlightId ? '2px solid var(--pv-text)' : '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '16px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {pkg.id === highlightId && <span style={{ flexBasis: '100%', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: 800 }}>前回お使いの回数券です</span>}
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
            {pkg.online === false ? (
              <span style={{ fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(70), maxWidth: '12em', lineHeight: 1.5 }}>店頭でお求めください（オンライン購入は準備中）</span>
            ) : (
            <button
              onClick={() => handlePurchase(pkg)}
              disabled={purchasingId === pkg.id}
              style={{ padding: '10px 20px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: purchasingId === pkg.id ? 'not-allowed' : 'pointer', opacity: purchasingId === pkg.id ? 0.6 : 1 }}
            >
              {purchasingId === pkg.id ? '手続き中…' : '購入する'}
            </button>
            )}
          </div>
        </div>
      ))}
      </>))}
    </div>
  );
}

// 持っているチケットの表示（会員・チケットをお持ちの方だけ）。
// ※ お客様が自分で会員登録する仕組みは廃止（でお指摘 2026-10-22：たまたま見た人がイタズラで登録できてしまう。会員登録はお店だけが行う）。
function MemberCard({ provider, elig }) {
  if (!elig) return null;
  const box = { border: '1.5px solid color-mix(in srgb, var(--pv-text) 18%, transparent)', borderRadius: '14px', padding: '14px 16px', color: 'var(--pv-text)', background: 'var(--pv-surface)' };
  if (!elig.logged_in) {
    const loginHref = `/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')}`;
    return (
      <div style={box}>
        <a href={loginHref} style={{ color: 'var(--pv-text)', fontWeight: 800, fontSize: 'calc(13.5px * var(--pv-fs))' }}>ログインすると、お持ちのチケットとご予約が表示されます</a>
      </div>
    );
  }
  const tickets = elig.tickets || [];
  if (!elig.member && !tickets.length) return null;
  return (
    <div style={box}>
      <div style={{ fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: 800 }}>お持ちのチケット</div>
      <p style={{ margin: '4px 0 0', fontSize: 'calc(12.5px * var(--pv-fs))', lineHeight: 1.7 }}>
        {tickets.length ? tickets.map(t => `${t.name}（${t.unlimited ? '使い放題' : `残り${t.remaining}枚`}）`).join('、') : 'お持ちのチケットはありません。'}
      </p>
    </div>
  );
}

// 予約タブ（BookTab）でメニューを選んだ後に、その1つのメニューの日時選び・送信だけを出す（2026-10-22）
// forMember：会員タブから使う時（初回の説明は出さない）
function ConsultTab({ provider, services, staff, selectedService, onServiceSelect, submitted, setSubmitted, diagnosis, matchData, menuNameHint, presetStaffId, mode, forMember, onAskRequest, preferTicket }) {
  // ログイン中でアカウントに名前と連絡先がある時は、入力欄を畳んで「予約者」1行にする（毎回入力させない。2026-10-22）
  const [contactFromAccount, setContactFromAccount] = useState(false);
  const [editContact, setEditContact] = useState(false);
  // 日本時間の今日（以前は世界標準時の日付で、日本の朝9時前は前日になっていた）
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
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
  // 何日先まで予約できるか（お店の設定。既定60日）
  const horizon = Number.isInteger(provider?.booking_horizon_days) && provider.booking_horizon_days > 0 ? provider.booking_horizon_days : 60;
  const lastDay = (() => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() + Math.min(horizon, 62)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  const bookableStaff = (staff || []).filter(s => s.bookable !== false);
  // LINE通知「前回と同じで予約」から来た時は前回の担当を選んだ状態にする（指名できる担当のみ）
  const [staffId, setStaffId] = useState(() => (presetStaffId && bookableStaff.some(s => s.id === presetStaffId)) ? presetStaffId : '');
  const selectedStaff = bookableStaff.find(s => s.id === staffId);

  const [slots, setSlots] = useState(null); // null=未取得
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [gridStaffFilter, setGridStaffFilter] = useState(staffId); // ''=指名なし（全スタッフ横断）。通知から来た時は前回の担当で絞った状態
  const [gridWeekOffset, setGridWeekOffset] = useState(0); // 表示中の週（0=今日から7日間、1=その次の7日間…）
  const [lastWasInstant, setLastWasInstant] = useState(false);

  // 予約時に使用チケットを選べるように（でお要望2026-09-27：「予約時にどのチケットで
  // 行くか選択できれば」）。ログイン中かつこの店舗の有効なチケットを持っている時だけ表示。
  const [myPackages, setMyPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // チケットが要るメニュー・会員には表示しないメニュー（でお要望 2026-10-22）。ログイン中のお客様が予約できるかを店舗ごとに確かめる
  const [elig, setElig] = useState(null);
  const [eligTick, setEligTick] = useState(0);
  useEffect(() => {
    if (!provider?.slug) return;
    freshAccessToken().then(t => fetch(`/api/providers/${provider.slug}/my-eligibility`, { headers: t ? { Authorization: `Bearer ${t}` } : {} }))
      .then(r => (r.ok ? r.json() : null)).then(setElig).catch(() => setElig(null));
  }, [provider?.slug, services, userId, eligTick]);
  const svcState = sv => (sv?.booking_scope !== 'limited' ? 'open' : elig?.services?.[sv.id]?.ok ? 'ok' : 'locked');
  // 即時予約でメニューを選ばずに枠だけ選んだ時は、枠に決まっているメニューで判定する
  const slotSvcId = selectedSlotId ? (slots || []).find(x => x.id === selectedSlotId)?.service_id : null;
  const effSvc = selectedService || (slotSvcId ? (services || []).find(x => x.id === slotSvcId) : null);
  // お支払い方法（でお指摘 2026-10-22：チケット用と単発用でメニューを分けない）。
  // このメニューに使えるチケットを持っていれば「チケットを使う／単発で予約」をお客様がはっきり選ぶ（勝手にチケットを使わない）。
  // チケット専用のメニューは、チケットを使う以外の選択肢は無い。
  const effElig = (effSvc?.ticket_ids || []).length ? elig?.services?.[effSvc.id] : null;
  const ticketOnly = effSvc?.booking_scope === 'limited';
  const usableIds = effElig?.ticket_ids || [];
  const ticketChoices = myPackages.filter(p => usableIds.includes(p.id));
  const payNeedsChoice = !ticketOnly && ticketChoices.length > 0;
  const [payChosen, setPayChosen] = useState(false);
  useEffect(() => {
    if (ticketOnly) { if (!usableIds.includes(selectedPackageId)) setSelectedPackageId(usableIds[0] || ''); setPayChosen(true); return; }
    // 会員タブ（チケットを選んで来た時）は、チケットを使う方を選んだ状態で開く。それ以外は選んでもらう
    if (preferTicket && ticketChoices.length) { setSelectedPackageId(ticketChoices[0].id); setPayChosen(true); return; }
    setSelectedPackageId(''); setPayChosen(false);
  }, [effSvc?.id, elig, myPackages.length]);
  const singlePrice = effSvc && Number(effSvc.price) > 0 ? `¥${Number(effSvc.price).toLocaleString()}` : null;
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
    // お店が決めた「何日先まで」の範囲をまとめて取る（2026-10-27。以前は2週間分だけ取っていて、3週目以降が空だった）
    const params = new URLSearchParams({ from: today, to: lastDay });
    if (selectedService?.id) params.set('service_id', selectedService.id);
    fetch(`/api/providers/${provider.slug}/availability?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setSlots(data); setSelectedSlotId('');
        // 今週に空きが無ければ、最初に空いている週を開く（空の表を見せない。2026-10-22）
        const first = (Array.isArray(data) ? data : []).map(x => x.date).filter(Boolean).sort()[0];
        if (first) {
          const days = Math.round((new Date(`${first}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
          setGridWeekOffset(Math.max(0, Math.floor(days / 7)));
        }
      })
      .catch(() => setSlots([]));
  }, [showInstantPicker, provider?.slug, selectedService?.id, today]);

  // 回数券・会員プランの方専用のメニューの枠は、予約できるお客様にだけ出す（でお要望 2026-10-20）
  const usableSlots = (slots || []).filter(x => !x.limited || elig?.services?.[x.service_id]?.ok);
  const slotsByDate = usableSlots.reduce((acc, s) => { (acc[s.date] = acc[s.date] || []).push(s); return acc; }, {});

  // 予約カレンダー風の表（でお要望2026-09-27：一般的な予約サイトの「スタイリスト指名・
  // 日時選択」画面と同じ構成——上でスタッフをタブ選択し、その下に日付（列）×時間（行）の
  // 表を出して◯/×で空きを示す）。スタッフは軸ではなくタブ側で絞り込む。
  function addDaysStr(dateStr, n) {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const gridStaffOptions = [...new Map(usableSlots.map(s => [s.staff_id || '_none', { id: s.staff_id, name: s.staff_name || '指名なし' }])).values()];
  const gridHasNamedStaff = gridStaffOptions.some(o => o.id);
  const gridFilteredSlots = gridStaffFilter ? usableSlots.filter(s => s.staff_id === gridStaffFilter) : usableSlots;
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
          if (fullName && (realEmail || phone)) setContactFromAccount(true);
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
    if (payNeedsChoice && !payChosen) { setFormError('チケットを使うか、単発で予約するかを選んでください'); return; }
    setSubmitting(true); setFormError('');
    try {
      // Me Scanデータを添付
      const meScanNote = (includeMeScan && meScanSummary)
        ? `【New Me Navi より】\n${meScanSummary.join('\n')}\n\n`
        : '';
      const noteParts = [
        selectedService ? `【メニュー】${selectedService.name}${selectedPackageId ? '（チケットを使用）' : Number(selectedService.price) > 0 ? `（単発 ¥${Number(selectedService.price).toLocaleString()}）` : ''}` : '',
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
          // 2026-10-21：空き枠ではなく、選んだ日時で予約（スタッフのタブで選んでいればそのスタッフを指名、指名なしなら空いているスタッフをお店側で割り当て）
          ? { booking_mode: 'instant', date: selectedSlotObj?.date, start_time: selectedSlotObj?.start_time, staff_id: gridStaffFilter || null }
          : { preferred_date: formState.date, preferred_time: formState.time }),
      };
      if (effSvc && svcState(effSvc) === 'locked') { setFormError(`このメニューは${effSvc.scope_label || '対象のお客様'}だけが予約できます`); return; }
      const tk = await freshAccessToken();
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: `Bearer ${tk}` } : {}) }, body: JSON.stringify(body) });
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
        <div aria-hidden="true" style={{ width: '56px', height: '56px', margin: '0 auto 16px', borderRadius: '50%', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(26px * var(--pv-fs))', fontWeight: 800 }}>✓</div>
        <h2 style={{ fontSize: 'calc(20px * var(--pv-hs))', fontWeight: '800', color: 'var(--pv-text)', margin: '0 0 8px' }}>{lastWasInstant ? '予約が確定しました' : '予約リクエストを送りました'}</h2>
        <p style={{ fontSize: 'calc(14px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: '0 0 24px', lineHeight: '1.7' }}>
          {lastWasInstant
            ? <>選んだ日時で確定しました。当日お待ちしております。</>
            : <>お店からの返事をお待ちください。<br />確定するとご連絡します。マイページの「予約」でも確認できます。</>}
        </p>
        <button onClick={() => setSubmitted(false)} style={{ padding: '10px 24px', background: 'var(--pv-surface)', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer' }}>
          {lastWasInstant ? '別の日時でもう一件予約する' : '別のリクエストを送る'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      {/* ③ 初回セッション説明（会員タブでは出さない） */}
      {!forMember && provider.first_session_desc && (
        <div style={{ border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', background: 'var(--pv-surface)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: '800', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>初回はこんな内容です</div>
          <p style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{provider.first_session_desc}</p>
        </div>
      )}

      {/* Me Scanデータ添付パネル */}
      {meScanSummary && (
        <div style={{ ...PV_CARD, padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <p style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: tx(75), margin: 0 }}>Me Scanの結果をお店に送ると、話が早く進みます</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={includeMeScan} onChange={e => setIncludeMeScan(e.target.checked)} style={{ accentColor: 'var(--pv-accent)', width: '18px', height: '18px' }} />
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'var(--pv-text)' }}>送る</span>
            </label>
          </div>
          {meScanSummary.map((line, i) => (
            <p key={i} style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(i === 0 ? 92 : 75), margin: i < meScanSummary.length - 1 ? '0 0 4px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{line}</p>
          ))}
          {!includeMeScan && <p style={{ fontSize: 'calc(12px * var(--pv-fs))', color: tx(62), margin: '8px 0 0' }}>チェックを外したので送りません。</p>}
        </div>
      )}

      {/* スタッフ指名（hacomono/STORES網羅計画 Phase 1）。店舗の「機能設定」でONの時だけ表示。
          指名なし（お任せ）も選択肢として並べ、指名スタッフには指名料をその場で明示する
          （hacomonoの「指名無し＝無料／実名スタッフ＝+指名料」表示に合わせた設計）。 */}
      {staffDesignationOn && bookableStaff.length > 0 && !showInstantPicker && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '8px' }}>スタッフの指名（任意）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1px solid ${!staffId ? 'var(--pv-accent)' : tx(15)}`, background: !staffId ? ac(8) : 'transparent', borderRadius: '10px', cursor: 'pointer' }}>
              <input type="radio" name="staff" checked={!staffId} onChange={() => setStaffId('')} style={{ accentColor: 'var(--pv-accent)' }} />
              <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>指名なし（お任せ）</span>
            </label>
            {bookableStaff.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1px solid ${staffId === s.id ? 'var(--pv-accent)' : tx(15)}`, background: staffId === s.id ? ac(8) : 'transparent', borderRadius: '10px', cursor: 'pointer' }}>
                <input type="radio" name="staff" checked={staffId === s.id} onChange={() => setStaffId(s.id)} style={{ accentColor: 'var(--pv-accent)' }} />
                <span style={{ flex: 1, fontSize: 'calc(13px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>{s.name}{s.role ? `（${s.role}）` : ''}</span>
                <span style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: s.booking_fee > 0 ? 'var(--pv-text)' : tx(62), flexShrink: 0 }}>
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
        {contactFromAccount && !editContact ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${tx(15)}` }}>
            <span style={{ fontSize: 'calc(13px * var(--pv-fs))', color: tx(80), minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: 'var(--pv-text)', marginRight: '8px' }}>予約者</span>{formState.name}{formState.email || formState.phone ? `・${formState.email || formState.phone}` : ''}
            </span>
            <button type="button" onClick={() => setEditContact(true)} style={{ background: 'none', border: 'none', color: 'var(--pv-text)', textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: 700, fontSize: 'calc(12.5px * var(--pv-fs))', cursor: 'pointer', padding: '6px 0' }}>変更</button>
          </div>
        ) : (
        <>
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

        </>
        )}

        {/* お支払い方法（2026-10-22）：このメニューに使えるチケットを持っている時だけ出す。
            チケット専用のメニューは「使うチケット」だけ。そうでなければ「チケットを使う／単発で予約」を選ぶ */}
        {(ticketOnly ? ticketChoices.length > 0 : payNeedsChoice) && (
          <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
            <legend style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: tx(75), marginBottom: '6px', padding: 0 }}>
              {ticketOnly ? `使うチケット（このメニューは1回${effSvc?.ticket_cost || 1}枚）` : 'お支払い方法 *'}
            </legend>
            {ticketChoices.map(p => {
              const on = payChosen && selectedPackageId === p.id;
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${on ? 'var(--pv-accent)' : tx(18)}`, background: on ? ac(8) : 'transparent' }}>
                  <input type="radio" name="pay" checked={on} onChange={() => { setSelectedPackageId(p.id); setPayChosen(true); }} style={{ accentColor: 'var(--pv-accent)', width: '18px', height: '18px' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 'calc(14px * var(--pv-fs))' }}>
                    <b>チケットを使う</b>：{p.package_name}
                    <span style={{ display: 'block', fontSize: 'calc(12px * var(--pv-fs))', color: tx(65) }}>{effSvc?.ticket_cost || 1}枚使います（{p.package_type === 'unlimited' ? '通い放題' : `残り${p.remaining_sessions}回`}）</span>
                  </span>
                </label>
              );
            })}
            {!ticketOnly && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${payChosen && !selectedPackageId ? 'var(--pv-accent)' : tx(18)}`, background: payChosen && !selectedPackageId ? ac(8) : 'transparent' }}>
                <input type="radio" name="pay" checked={payChosen && !selectedPackageId} onChange={() => { setSelectedPackageId(''); setPayChosen(true); }} style={{ accentColor: 'var(--pv-accent)', width: '18px', height: '18px' }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 'calc(14px * var(--pv-fs))' }}>
                  <b>単発で予約</b>{singlePrice ? `：${singlePrice}` : ''}
                  <span style={{ display: 'block', fontSize: 'calc(12px * var(--pv-fs))', color: tx(65) }}>チケットは使いません。料金はお店でお支払いください</span>
                </span>
              </label>
            )}
            <p style={{ margin: 0, fontSize: 'calc(11.5px * var(--pv-fs))', color: tx(62) }}>チケットは予約した時点で使い、来店前にキャンセルすると戻ります。</p>
          </fieldset>
        )}

        {showInstantPicker && slots !== null && usableSlots.length === 0 ? (
          // 空いている時間が1つも無い時は、空の表と「確定する」ボタンを出さず、相談へ切り替えられるようにする（2026-10-22）
          <div style={{ padding: '16px', borderRadius: '12px', border: `1px dashed ${tx(25)}`, display: 'grid', gap: '10px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 'calc(14px * var(--pv-fs))' }}>今、オンラインで予約できる空き時間がありません</p>
            <p style={{ margin: 0, fontSize: 'calc(13px * var(--pv-fs))', color: tx(70), lineHeight: 1.7 }}>{onAskRequest ? '希望の日時を送ると、お店が空きを確認して返事をします。' : 'お手数ですが、お店に直接お問い合わせください。'}</p>
            {onAskRequest && <button type="button" onClick={onAskRequest} style={{ justifySelf: 'start', minHeight: '44px', padding: '0 18px', borderRadius: '10px', border: '1px solid var(--pv-accent)', background: 'transparent', color: 'var(--pv-text)', fontWeight: 700, fontSize: 'calc(14px * var(--pv-fs))', cursor: 'pointer' }}>希望日時を相談する</button>}
          </div>
        ) : showInstantPicker ? (
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
                        border: active ? '1px solid var(--pv-accent)' : `1px solid ${tx(15)}`,
                        background: active ? 'var(--pv-accent)' : 'transparent',
                        color: active ? 'var(--pv-on-accent)' : 'color-mix(in srgb, var(--pv-text) 85%, transparent)',
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
                disabled={(gridWeekOffset + 1) * 7 > horizon}
                style={{ background: 'none', border: 'none', color: (gridWeekOffset + 1) * 7 > horizon ? tx(35) : tx(75), fontSize: 'calc(12px * var(--pv-fs))', cursor: (gridWeekOffset + 1) * 7 > horizon ? 'default' : 'pointer', padding: '4px' }}
              >
                次の週へ ＞
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--pv-surface)', padding: '6px 8px', fontSize: 'calc(11px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)', textAlign: 'left' }}></th>
                    {gridWeekDates.map(date => {
                      const d = new Date(`${date}T00:00:00`);
                      const wd = d.getDay();
                      return (
                        <th key={date} style={{ padding: '6px 4px', fontSize: 'calc(11px * var(--pv-fs))', fontWeight: '700', whiteSpace: 'nowrap', color: wd === 0 || wd === 6 ? 'var(--pv-text)' : tx(75) }}>
                          {d.getMonth() + 1}/{d.getDate()}<br /><span style={{ fontSize: 'calc(10px * var(--pv-fs))', fontWeight: 400 }}>{WEEKDAY_JA_SLUG[wd]}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {gridTimes.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '16px', textAlign: 'center', fontSize: 'calc(12.5px * var(--pv-fs))', color: 'color-mix(in srgb, var(--pv-text) 62%, transparent)' }}>この条件で予約できる時間がありません</td></tr>
                  ) : gridTimes.map(t => (
                    <tr key={t}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--pv-surface)', padding: '6px 8px', fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 90%, transparent)', whiteSpace: 'nowrap' }}>{t.slice(0, 5)}</td>
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
                                  border: selectedSlotId === s.id ? '1px solid var(--pv-accent)' : `1px solid ${ac(45)}`,
                                  background: selectedSlotId === s.id ? 'var(--pv-accent)' : ac(10),
                                  color: selectedSlotId === s.id ? 'var(--pv-on-accent)' : 'var(--pv-text)',
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
              <p style={{ fontSize: 'calc(12.5px * var(--pv-fs))', fontWeight: '700', color: 'var(--pv-text)', margin: '10px 0 0' }}>
                選択中：{selectedSlotObj.date}（{new Date(`${selectedSlotObj.date}T00:00:00`).toLocaleDateString('ja-JP', { weekday: 'short' })}）{selectedSlotObj.start_time?.slice(0, 5)}〜{gridStaffFilter && selectedSlotObj.staff_name ? `　担当：${selectedSlotObj.staff_name}` : gridHasNamedStaff ? '　担当：お店におまかせ' : ''}
              </p>
            )}
          </div>
        ) : (
          <>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第1希望）*</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date} min={today} max={lastDay} onChange={e => setFormState(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: '#fff', color: '#111' }} required />
            <select value={formState.time} onChange={e => setFormState(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: '#fff', color: '#111' }} required>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第2希望）<span style={{ fontWeight: '400', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date2} min={today} max={lastDay} onChange={e => setFormState(p => ({ ...p, date2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
            <select value={formState.time2} onChange={e => setFormState(p => ({ ...p, time2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '6px' }}>希望日時（第3希望）<span style={{ fontWeight: '400', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date3} min={today} max={lastDay} onChange={e => setFormState(p => ({ ...p, date3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
            <select value={formState.time3} onChange={e => setFormState(p => ({ ...p, time3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
          </>
        )}
        <div>
          <label style={{ fontSize: 'calc(12px * var(--pv-fs))', fontWeight: '700', color: 'color-mix(in srgb, var(--pv-text) 75%, transparent)', display: 'block', marginBottom: '4px' }}>お店に伝えたいこと・聞きたいこと（任意）</label>
          <textarea value={formState.message} onChange={e => setFormState(p => ({ ...p, message: e.target.value }))} placeholder="今の状況や悩み、気になることがあれば教えてください" rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid color-mix(in srgb, var(--pv-text) 15%, transparent)', borderRadius: '10px', fontSize: 'calc(14px * var(--pv-fs))', boxSizing: 'border-box', resize: 'vertical', background: 'var(--pv-surface-2)', color: 'var(--pv-text)' }} />
        </div>
        {formError && <p role="alert" style={{ fontSize: 'calc(13px * var(--pv-fs))', color: 'var(--pv-text)', fontWeight: 700, margin: 0 }}>{formError}</p>}
        {!(showInstantPicker && slots !== null && usableSlots.length === 0) && <button type="submit" disabled={submitting} style={{ padding: '14px', background: 'var(--pv-accent)', opacity: submitting ? 0.5 : 1, color: 'var(--pv-on-accent)', border: 'none', borderRadius: '12px', minHeight: '52px', fontSize: 'calc(16px * var(--pv-fs))', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? '送信中…' : (showInstantPicker ? 'この日時で予約を確定する' : '相談リクエストを送る')}
        </button>}
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
  // ?view=member のリンク（店頭QR・LINE。通っている方向け）は「会員」タブで開く（でお要望 2026-10-22）
  const [activeTab, setActiveTab] = useState(() => { if (searchParams.get('view') === 'member') return 'mine'; const t = searchParams.get('tab'); return !t || OLD_BOOKING_TABS.includes(t) ? 'book' : t; });
  const [elig, setElig] = useState(null);
  const [eligTick, setEligTick] = useState(0);

  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [stories, setStories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [appealBlocks, setAppealBlocks] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false); // オンライン入会できる月額プランがあるか

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
      fetch(`/api/providers/${slug}/facilities`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([prov, svcs, stf, blocks, facs]) => {
      setProvider(prov);
      setServices(Array.isArray(svcs) ? svcs : []);
      setStaff(Array.isArray(stf) ? stf : []);
      setFacilities(Array.isArray(facs) ? facs : []);
      setAppealBlocks(Array.isArray(blocks) ? blocks : []);
      // New Me Log のLINE通知「前回と同じで予約」から来た時は、前回のメニューを選んだ状態で開く
      // （でお指摘2026-10-14：通知からそのまま予約まで行けないと意味がない）
      const presetServiceId = searchParams.get('service_id');
      if (presetServiceId && Array.isArray(svcs)) {
        const preset = svcs.find(s => String(s.id) === presetServiceId);
        if (preset) setSelectedService(preset);
      }
      setLoading(false);
      // ?tab=consultでの直接着地・ブックマーク等で、その店舗には実在しないタブIDを
      // 指していた場合のフォールバック（例：即時予約のみでリクエストOFFの店舗に
      // ?tab=consultで来た場合は'instant'へ寄せる）。以前は validIds[0]（基本情報）に
      // 落ちていて、予約しに来た人が予約画面に着かなかった（2026-10-14修正）。
      if (prov) {
        const validIds = tabsFor(prov).map(t => t.id);
        setActiveTab(current => {
          if (validIds.includes(current) || current === 'mine' || current === 'plans') return current;
          if (OLD_BOOKING_TABS.includes(current)) return 'book';
          return validIds[0] || 'basic';
        });
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

  // 月額プランにオンライン入会できる店舗だけ、店名の下に入会ページへのリンクを出す（でお要望 2026-10-27）
  useEffect(() => {
    if (!provider?.slug || !hasFeature(provider, 'membership_enrollment')) return;
    fetch(`/api/providers/${provider.slug}/membership-info`).then(r => (r.ok ? r.json() : null)).then(d => setJoinOpen((d?.plans || []).length > 0)).catch(() => {});
  }, [provider?.slug]);

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

  useEffect(() => {
    if (!provider?.slug) return;
    freshAccessToken().then(t => fetch(`/api/providers/${provider.slug}/my-eligibility`, { headers: t ? { Authorization: `Bearer ${t}` } : {} }))
      .then(r => (r.ok ? r.json() : null)).then(setElig).catch(() => setElig(null));
  }, [provider?.slug, eligTick]);

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
  // 会員タブを出すか：会員・月額プラン・チケットをお持ちの方。通っている方向けのリンクから来た時もログインの案内のため出す
  const isMemberish = !!(elig?.member || (elig?.tickets || []).length || searchParams.get('view') === 'member' || activeTab === 'mine');

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
      /* 入力欄の見た目をそろえる（白い欄・暗い欄・黒い枠が混ざっていた。2026-10-22） */
      .pv-theme form :is(input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea) {
        background: var(--pv-surface) !important; color: var(--pv-text) !important;
        border: 1px solid color-mix(in srgb, var(--pv-text) 25%, transparent) !important; border-radius: 10px !important;
        min-height: 44px; font-size: 16px !important; box-sizing: border-box;
      }
      .pv-theme form :is(input, select, textarea):focus { outline: 2px solid var(--pv-accent); outline-offset: 1px; }
      .pv-theme form ::placeholder { color: color-mix(in srgb, var(--pv-text) 40%, transparent); }
      .pv-theme button:focus-visible, .pv-theme a:focus-visible { outline: 2px solid var(--pv-accent); outline-offset: 2px; }
    `}</style>
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* ヒーロー（2026-10-22 UI刷新）：写真の上に文字やボタンを重ねると読みにくく、ボタンも4つ並んで
          どれを押せばいいか分からなかった。写真は写真だけで見せ、その下に店名・場所・今日の営業・予約ボタンを置く */}
      <header className="pv-hero" style={{ marginBottom: '20px' }}>
        {provider.cover_image_url && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '16 / 9', maxHeight: '340px', width: '100%', marginBottom: '20px', background: 'var(--pv-surface)' }}>
            <img src={provider.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {provider.photo_url && (
            <img src={provider.photo_url} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${tx(15)}`, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: '0 0 4px', fontSize: 'calc(12.5px * var(--pv-fs))', color: tx(65), display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>{catLabel}</span>
              {provider.area && <span>{provider.area}</span>}
            </p>
            <h1 style={{ fontSize: 'calc(clamp(22px,5vw,30px) * var(--pv-hs))', fontWeight: '800', margin: 0, lineHeight: '1.35', color: 'var(--pv-text)', textWrap: 'balance' }}>{provider.name}</h1>
          </div>
        </div>
        {provider.catchphrase && <p style={{ fontSize: 'calc(15px * var(--pv-fs))', color: tx(85), margin: '12px 0 0', lineHeight: '1.7' }}>{provider.catchphrase}</p>}
        {/* 「お店で、どこにあって、予約できるのはここ、この日のここは空いてる、と直感的にわかることが重要」（でお要望2026-09-29） */}
        {(() => {
          const status = isShown(provider, 'hero_status') ? todayStatusText(provider) : null;
          const station = isShown(provider, 'hero_status') ? provider.nearest_station : null;
          const items = [
            status && { key: 's', text: status, strong: status.startsWith('営業中') },
            station && { key: 'st', text: station },
            provider.price_from && { key: 'p', text: `¥${provider.price_from.toLocaleString()}〜` },
          ].filter(Boolean);
          if (!items.length) return null;
          return (
            <p style={{ margin: '12px 0 0', display: 'flex', gap: '6px 14px', flexWrap: 'wrap', fontSize: 'calc(13px * var(--pv-fs))', color: tx(75) }}>
              {items.map(it => (
                <span key={it.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: it.strong ? 'var(--pv-text)' : undefined, fontWeight: it.strong ? '700' : '500' }}>
                  {it.key === 's' && <span aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '50%', background: it.strong ? 'var(--pv-accent)' : tx(35) }} />}
                  {it.text}
                </span>
              ))}
            </p>
          );
        })()}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button onClick={() => { setActiveTab(primaryBookingTabId(provider)); document.getElementById('pv-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} style={{ flex: '1 1 auto', maxWidth: '360px', minHeight: '48px', padding: '0 24px', background: 'var(--pv-accent)', color: 'var(--pv-on-accent)', border: 'none', borderRadius: '12px', fontSize: 'calc(15px * var(--pv-fs))', fontWeight: '800', cursor: 'pointer' }}>
            予約する
          </button>
          <button onClick={toggleFavorite} aria-pressed={isFavorited} style={{ flex: '0 0 auto', minHeight: '48px', padding: '0 16px', background: 'transparent', color: 'var(--pv-text)', border: `1px solid ${isFavorited ? 'var(--pv-accent)' : tx(25)}`, borderRadius: '12px', fontSize: 'calc(14px * var(--pv-fs))', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {isFavorited ? '★ 保存済み' : '☆ 保存'}
          </button>
        </div>
        {joinOpen && (
          <a href={`/provider/${encodeURIComponent(provider.slug)}/join`} style={{ display: 'inline-block', marginTop: '12px', fontSize: 'calc(13.5px * var(--pv-fs))', fontWeight: 700, color: 'var(--pv-text)', textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: 'var(--pv-accent)' }}>月額プランに入会する</a>
        )}
      </header>

      {/* クイックファクト（施設写真は基本情報タブへ。予約までの距離を短くするため 2026-10-22） */}
      <QuickFactsStrip provider={provider} />

      {/* タブ */}
      <div id="pv-tabs" style={{ scrollMarginTop: '0px' }} />
      <TabBar activeTab={activeTab} tabs={tabsFor(provider, { member: isMemberish, plans: joinOpen })} onSelect={tab => { setActiveTab(tab); if (tab !== 'book') setSelectedService(null); }} />

      {/* タブコンテンツ */}
      {activeTab === 'basic' && <BasicInfoTab provider={provider} />}
      {activeTab === 'appeal' && (
        <AppealTab
          provider={provider}
          diagnosis={diagnosis}
          matchData={matchData}
          stories={stories}
          staff={staff}
          facilities={facilities}
          services={services}
          appealBlocks={appealBlocks}
          onConsult={handleConsultFromProgram}
          userPathType={matchData?.detail?.coveredAxes?.[0]?.path_type || null}
          onGoToConsult={() => { setActiveTab(primaryBookingTabId(provider)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      )}
      {activeTab === 'book' && (
        <BookTab
          provider={provider} services={services} staff={staff} elig={elig}
          onEligChanged={() => setEligTick(x => x + 1)}
          selectedService={selectedService} setSelectedService={setSelectedService}
          submitted={submitted} setSubmitted={setSubmitted}
          diagnosis={diagnosis} matchData={matchData}
          menuNameHint={searchParams.get('menu_name') || ''}
          presetStaffId={searchParams.get('staff_id') || ''}
          presetLessonId={searchParams.get('class_id') || (searchParams.get('tab') === 'class' ? 'any' : null)}
          ticketFilter={searchParams.get('ticket') || null}
        />
      )}
      {activeTab === 'mine' && (
        <MemberTab provider={provider} services={services} staff={staff} elig={elig} diagnosis={diagnosis} matchData={matchData} onEligChanged={() => setEligTick(x => x + 1)}
          onGoBook={svc => { setSelectedService(svc); setSubmitted(false); setActiveTab('book'); document.getElementById('pv-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
      )}
      {activeTab === 'plans' && <PackagesTab provider={provider} mode="plans" />}
      {activeTab === 'packages' && <PackagesTab provider={provider} mode="packages" />}
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
