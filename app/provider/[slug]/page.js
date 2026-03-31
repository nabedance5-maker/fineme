'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  aga:'AGA', marriage:'結婚相談所', diagnosis:'骨格診断',
};
const CAT_TO_AXIS = {
  gym:'body', eyebrow:'eyebrow', fashion:'fashion',
  hair:'hair', aga:'hair',
  makeup:'skin', hairremoval:'skin', esthetic:'skin',
  whitening:'teeth', orthodontics:'teeth',
  nail:'nail',
};
const AXIS_LABELS = { body:'体型', eyebrow:'眉', fashion:'服', hair:'髪', skin:'肌', teeth:'歯', nail:'爪' };
const AXIS_ICONS  = { body:'💪', eyebrow:'✏️', fashion:'👔', hair:'💇', skin:'✨', teeth:'😁', nail:'💅' };
const PATH_LABELS = { virgin:'初めて', quit:'続かなかった', blind:'非客観視', lapsed:'以前やっていた' };
const PATH_COLORS = { virgin:'#10b981', quit:'#f59e0b', blind:'#6366f1', lapsed:'#3b82f6' };
const PATH_PERSON = { virgin:'外見ケアが初めての方', quit:'続かなかった経験がある方', blind:'自己流でやってきたが客観評価がない方', lapsed:'以前やっていたが後回しにしている方' };
const FAILURE_ICONS  = { lost_direction:'🔄', no_continuation:'💪', no_result:'👁️', cost:'💰', awkward:'🤝' };
const TRIGGER_ICONS  = { matching_app:'📱', love:'❤️', career:'💼', word:'💬', vague:'⏳' };
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

const TABS = [
  { id: 'guide',   label: 'ガイドを知る' },
  { id: 'program', label: 'プログラム' },
  { id: 'consult', label: '相談する' },
];
const PAYMENT_METHOD_LABELS = {
  cash: '現金', credit: 'クレジットカード', paypay: 'PayPay',
  rakuten_pay: '楽天Pay', line_pay: 'LINE Pay', bank: '銀行振込', other: 'その他',
};

// ── ヘルパー関数 ──────────────────────────────────────────────────────────────

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

/** New Me Map接点のナラティブ生成 */
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
          <div key={i} style={{ flexShrink: 0, width: '160px', height: '108px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(232,228,220,0.15)' }}>
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
  if (areaText) chips.push({ icon: '📍', label: areaText, highlight: false });
  if (provider.online_available) chips.push({ icon: '🌐', label: 'オンライン対応', highlight: true });
  if (provider.trial_available) chips.push({ icon: '🎁', label: 'お試し・無料相談あり', highlight: true });
  if (provider.response_hours) chips.push({ icon: '⏰', label: `返信${provider.response_hours}時間以内`, highlight: false });
  if (provider.payment_methods?.length > 0) {
    chips.push({ icon: '💳', label: provider.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(' / '), highlight: false });
  }
  if (!chips.length) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flexWrap: 'nowrap' }}>
        {chips.map((chip, i) => (
          <span key={i} style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '7px 14px',
            background: chip.highlight ? 'rgba(5,150,105,0.15)' : 'rgba(10,15,30,0.45)',
            color: chip.highlight ? '#10b981' : 'rgba(232,228,220,0.75)',
            border: `1px solid ${chip.highlight ? 'rgba(5,150,105,0.3)' : 'rgba(232,228,220,0.15)'}`,
            borderRadius: '99px', fontSize: '13px', fontWeight: chip.highlight ? '700' : '500',
            whiteSpace: 'nowrap',
          }}>
            <span>{chip.icon}</span><span>{chip.label}</span>
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
      <div style={{ fontSize: '10px', fontWeight: '800', color: '#b45309', letterSpacing: '.12em', marginBottom: '12px', textTransform: 'uppercase' }}>このガイドにしかできないこと</div>
      <p style={{ fontSize: '15px', color: '#111', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>{provider.unique_strengths}</p>
    </div>
  );
}

// ── スタッフ紹介 ──────────────────────────────────────────────────────────────
function StaffSection({ staff }) {
  if (!staff || staff.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.12em', marginBottom: '16px', textTransform: 'uppercase' }}>担当スタッフ紹介</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {staff.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '20px', background: 'rgba(10,15,30,0.50)', borderRadius: '18px', border: '1.5px solid rgba(232,228,220,0.15)', backdropFilter: 'blur(8px)' }}>
            {/* アバター */}
            <div style={{ flexShrink: 0 }}>
              {s.photo_url
                ? <img src={s.photo_url} alt={s.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(232,228,220,0.25)', display: 'block' }} />
                : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#e5e7eb,#d1d5db)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>👤</div>
              }
            </div>
            {/* テキスト情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: '800', color: 'rgba(232,228,220,0.90)' }}>{s.name}</span>
                {s.is_featured && (
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: '99px' }}>担当</span>
                )}
                {s.role && <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', fontWeight: '500' }}>{s.role}</span>}
              </div>
              {/* 経験・資格チップ */}
              {(s.experience_years || s.credentials) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {s.experience_years && (
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', background: '#d1fae5', color: '#065f46', borderRadius: '99px' }}>
                      経験{s.experience_years}年
                    </span>
                  )}
                  {s.credentials && s.credentials.split('\n').filter(Boolean).slice(0, 2).map((cred, i) => (
                    <span key={i} style={{ fontSize: '12px', fontWeight: '600', padding: '3px 10px', background: '#eff6ff', color: '#1e40af', borderRadius: '99px' }}>
                      📜 {cred.length > 20 ? cred.slice(0, 20) + '…' : cred}
                    </span>
                  ))}
                </div>
              )}
              {/* 自己紹介 */}
              {s.bio && (
                <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>「{s.bio}」</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
function TabBar({ activeTab, onSelect }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid rgba(232,228,220,0.15)', marginBottom: '28px', gap: '4px' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: '12px 20px', fontSize: '14px', fontWeight: activeTab === t.id ? '800' : '500',
          color: activeTab === t.id ? 'rgba(232,228,220,0.90)' : 'rgba(232,228,220,0.55)', background: 'none', border: 'none',
          borderBottom: activeTab === t.id ? '2px solid rgba(232,228,220,0.75)' : '2px solid transparent',
          marginBottom: '-2px', cursor: 'pointer', transition: 'all .15s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Section A: New Me Map との接点 ────────────────────────────────────────────
function NewMeMapSection({ diagnosis, matchData }) {
  const isNewStyle = !!diagnosis?.transform_vectors;
  const { score, detail } = matchData || {};

  if (!diagnosis) {
    return (
      <div style={{ padding: '24px', borderRadius: '16px', border: '1.5px solid rgba(232,228,220,0.15)', background: 'rgba(10,15,30,0.50)', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontSize: '15px', fontWeight: '700', color: 'rgba(232,228,220,0.90)', margin: '0 0 6px' }}>Me Scanを受けると、このガイドとの接点がわかります</p>
        <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', margin: '0 0 16px', lineHeight: '1.7' }}>あなたの変容プロファイル（最優先トラック・来た道・ゴール）とこのガイドが合っているかを、7軸で確認できます。</p>
        <a href="/diagnosis" style={{ display: 'inline-block', padding: '10px 22px', background: '#111', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
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
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', letterSpacing: '.05em', marginBottom: '8px' }}>
          {isNewStyle ? '🗺 New Me Map との接点' : '🎯 あなたの診断との一致度'}
        </div>
        {score !== null ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '36px', fontWeight: '800', color: '#1d4ed8', lineHeight: 1 }}>{score}%</span>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <div style={{ height: '10px', background: '#dbeafe', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: score >= 70 ? '#1d4ed8' : score >= 45 ? '#3b82f6' : '#93c5fd', borderRadius: '99px', width: `${score}%`, transition: 'width .5s' }} />
                </div>
              </div>
              {detail?.isCompassProvider && (
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', background: '#1d4ed8', color: '#fff', borderRadius: '99px' }}>🧭 コンパス一致</span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#93c5fd', margin: '6px 0 0', lineHeight: '1.5' }}>※ Me Scan 7軸診断（変容ベクトル・来た道・ギャップ）との相性スコア</p>
          </>
        ) : (
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', margin: 0 }}>診断結果と照らし合わせています。</p>
        )}
      </div>

      {/* カバー軸リスト */}
      {isNewStyle && detail?.coveredAxes?.length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', margin: '0 0 10px' }}>このガイドがカバーするあなたのトラック</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {detail.coveredAxes.map(ax => (
              <div key={ax.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: ax.isCompass ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.7)', borderRadius: '10px', border: ax.isCompass ? '1px solid #93c5fd' : '1px solid rgba(255,255,255,0.5)' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{AXIS_ICONS[ax.id]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>{AXIS_LABELS[ax.id]}</span>
                    {ax.isCompass && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>← 最優先</span>}
                    {ax.path_type && (
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', background: PATH_COLORS[ax.path_type] + '25', color: PATH_COLORS[ax.path_type], borderRadius: '99px' }}>
                        {PATH_LABELS[ax.path_type]}
                      </span>
                    )}
                  </div>
                  {/* 現在地→理想バー */}
                  {ax.gap > 0 && (
                    <div style={{ position: 'relative', height: '6px', background: '#dbeafe', borderRadius: '99px', overflow: 'visible' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: '#2563eb', borderRadius: '99px', width: `${Math.max(10, (10 - ax.gap) / 10 * 100)}%` }} />
                      <span style={{ position: 'absolute', right: 0, top: '-14px', fontSize: '10px', fontWeight: '700', color: 'rgba(232,228,220,0.55)' }}>理想</span>
                    </div>
                  )}
                </div>
                {ax.gap > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: '700', color: ax.gap >= 4 ? '#dc2626' : ax.gap >= 2 ? '#d97706' : '#059669', flexShrink: 0 }}>
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
            <p key={i} style={{ fontSize: '14px', color: '#1e3a8a', lineHeight: '1.7', margin: i < narratives.length - 1 ? '0 0 8px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{n}</p>
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
        <div style={{ background: 'rgba(10,15,30,0.50)', borderRadius: '20px', padding: '28px 24px', backdropFilter: 'blur(8px)', border: '1px solid rgba(232,228,220,0.10)' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.12em', marginBottom: '18px', textTransform: 'uppercase' }}>このガイドが伴走できる人</div>

          {/* target_desc 行リスト */}
          {targetLines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: personCards.length > 0 ? '18px' : '0' }}>
              {targetLines.map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ width: '22px', height: '22px', background: '#111', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                  <span style={{ fontSize: '14px', color: 'rgba(232,228,220,0.90)', lineHeight: '1.6', fontWeight: '500' }}>{line}</span>
                </div>
              ))}
            </div>
          )}

          {/* failure/trigger カードグリッド */}
          {personCards.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {personCards.map((card, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px', background: 'rgba(10,15,30,0.65)', borderRadius: '14px', border: '1px solid rgba(232,228,220,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}>{card.icon}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.55' }}>{card.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━ Block 2: 哲学 pull-quote ━━ */}
      {provider.philosophy && (
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '20px', padding: '40px 28px 32px', overflow: 'hidden' }}>
          {/* 装飾クオート */}
          <div style={{ position: 'absolute', top: '8px', left: '18px', fontSize: '96px', color: 'rgba(255,255,255,0.05)', fontFamily: 'Georgia, serif', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>❝</div>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '.12em', marginBottom: '18px', position: 'relative', textTransform: 'uppercase' }}>このガイドが大切にしていること</div>
          <p style={{ fontSize: '16px', color: '#fff', lineHeight: '1.95', margin: '0', whiteSpace: 'pre-wrap', fontWeight: '500', position: 'relative', zIndex: 1 }}>{provider.philosophy}</p>
          {provider.provider_style && (
            <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>スタイル</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{STYLE_LABELS[provider.provider_style] || provider.provider_style}</span>
            </div>
          )}
        </div>
      )}

      {/* ━━ Block 2.5: 変容ストーリー（AIマッチング用テキストフィールド） ━━ */}
      {(provider.ideal_client_desc || provider.client_before_state || provider.transformation_pattern || provider.best_fit_desc) && (
        <div style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '22px', background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.12em', marginBottom: '18px', textTransform: 'uppercase' }}>来る方のリアルなストーリー</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {provider.ideal_client_desc && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#6366f1', marginBottom: '6px', letterSpacing: '.05em' }}>よく来るお客様の状況・背景</div>
                <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.ideal_client_desc}</p>
              </div>
            )}
            {provider.client_before_state && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#818cf8', marginBottom: '6px', letterSpacing: '.05em' }}>来る前の典型的な状態</div>
                <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.client_before_state}</p>
              </div>
            )}
            {provider.transformation_pattern && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', marginBottom: '6px', letterSpacing: '.05em' }}>よく起きる変化のパターン</div>
                <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.transformation_pattern}</p>
              </div>
            )}
            {provider.best_fit_desc && (
              <div style={{ background: 'rgba(5,150,105,0.12)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(5,150,105,0.2)' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', marginBottom: '6px', letterSpacing: '.05em' }}>特に向いている人・状況</div>
                <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.best_fit_desc}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ━━ Block 3: サービス詳細 ━━ */}
      {provider.description && (
        <div style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '22px', background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.12em', marginBottom: '12px', textTransform: 'uppercase' }}>この一手でできること</div>
          <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.description}</p>
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
        <h2 style={{ fontSize: '16px', fontWeight: '800', margin: '0' }}>変容の証言</h2>
        {stories.length > 0 && <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.40)', fontWeight: '600', background: 'rgba(10,15,30,0.45)', padding: '2px 10px', borderRadius: '99px' }}>{stories.length}件</span>}
      </div>
      {stories.length === 0 ? (
        <div style={{ background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: '18px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>✍️</div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>このガイドへの最初の証言を残す人になれます</p>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', margin: '0 0 18px', lineHeight: '1.7' }}>相談・来店後に「変わる前」と「今」をありのままに残してください。あなたの声が次の誰かの地図になります。</p>
          {provider?.slug && (
            <a href={`/story-submit?providerId=${provider.id || ''}`} style={{ display: 'inline-block', padding: '10px 22px', background: '#111', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
              体験談を書く（無料）
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {stories.map(s => (
            <div key={s.id} style={{ borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(232,228,220,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
              {/* ヘッダー: 軸・来た道 */}
              {(s.axis_id || s.path_type) && (
                <div style={{ background: 'rgba(10,15,30,0.50)', padding: '10px 16px', borderBottom: '1px solid rgba(232,228,220,0.10)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {s.axis_id && (
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', background: '#ecfdf5', color: '#059669', borderRadius: '99px' }}>
                      {AXIS_ICONS[s.axis_id]} {AXIS_LABELS[s.axis_id] || s.axis_id}トラック
                    </span>
                  )}
                  {s.path_type && (
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', background: (PATH_COLORS[s.path_type] || '#6b7280') + '20', color: PATH_COLORS[s.path_type] || '#6b7280', borderRadius: '99px' }}>
                      {PATH_LABELS[s.path_type] || s.path_type}
                    </span>
                  )}
                </div>
              )}

              {/* BEFORE ブロック */}
              <div style={{ background: '#1f2937', padding: '18px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.35)', letterSpacing: '.12em', marginBottom: '10px', textTransform: 'uppercase' }}>Before — 出会う前</div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: '1.75' }}>{s.concern_before}</p>
              </div>

              {/* 中継地点 or 矢印 */}
              <div style={{ background: 'linear-gradient(to bottom, #1f2937 0%, #f0fdf4 100%)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px' }}>
                {s.milestone_reached ? (
                  <>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ padding: '6px 14px', background: 'rgba(10,15,30,0.65)', border: '1px solid #a7f3d0', borderRadius: '99px', fontSize: '12px', color: '#34d399', fontWeight: '700', whiteSpace: 'nowrap', boxShadow: '0 1px 6px rgba(5,150,105,.15)' }}>
                      🏁 {s.milestone_reached}
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(16,185,129,0.25)' }} />
                  </>
                ) : (
                  <div style={{ fontSize: '18px', color: '#059669', fontWeight: '800' }}>↓</div>
                )}
              </div>

              {/* AFTER ブロック */}
              <div style={{ background: '#f0fdf4', padding: '18px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#059669', letterSpacing: '.12em', marginBottom: '10px', textTransform: 'uppercase' }}>After — 今ここにいる</div>
                <p style={{ fontSize: '14px', color: '#111', margin: s.tags?.length ? '0 0 12px' : '0', lineHeight: '1.75' }}>{s.change_after}</p>
                {s.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {s.tags.map(t => <span key={t} style={{ fontSize: '11px', padding: '3px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '99px' }}>#{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── タブ①「ガイドを知る」────────────────────────────────────────────────────
function GuideTab({ provider, diagnosis, matchData, stories, staff, onGoToConsult }) {
  const mapSection = <NewMeMapSection diagnosis={diagnosis} matchData={matchData} />;
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '100px' }}>
        {provider.guide_message && (
          <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(79,70,229,0.04) 100%)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '16px', padding: '22px 24px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {provider.photo_url ? (
              <img src={provider.photo_url} alt={provider.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(201,168,76,0.3)' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(201,168,76,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🧭</div>
            )}
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(201,168,76,0.7)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>ガイドからのひと言</div>
              <p style={{ fontSize: '14px', color: '#e8e4dc', lineHeight: '1.85', margin: 0, whiteSpace: 'pre-wrap', fontWeight: '500' }}>{provider.guide_message}</p>
            </div>
          </div>
        )}
        <UniqueStrengthsSection provider={provider} />
        {(provider.facility_photos || [])[0] && (
          <div style={{ margin: '-8px -16px', overflow: 'hidden' }}>
            <img src={provider.facility_photos[0]} alt="" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} loading="lazy" />
          </div>
        )}
        <StaffSection staff={staff} />
        {/* Me Scan 済みなら最上部に、未スキャンは最下部に小さく */}
        {diagnosis && mapSection}
        <PhilosophySection provider={provider} />
        {(provider.facility_photos || [])[1] && (
          <div style={{ margin: '-8px -16px', overflow: 'hidden' }}>
            <img src={provider.facility_photos[1]} alt="" style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} loading="lazy" />
          </div>
        )}
        <StoriesSection stories={stories} provider={provider} />
        {!diagnosis && (
          <div style={{ opacity: 0.85 }}>
            {mapSection}
          </div>
        )}
      </div>
      {/* スティッキーCTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 16px 24px', background: 'linear-gradient(to top, rgba(10,15,30,0.95) 70%, rgba(10,15,30,0))', zIndex: 50, pointerEvents: 'none' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', pointerEvents: 'all' }}>
          <button onClick={onGoToConsult} style={{ width: '100%', padding: '16px', background: '#111', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.22)', letterSpacing: '.02em' }}>
            このガイドに相談する →
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
    <div style={{ background: 'rgba(10,15,30,0.65)', borderRadius: '20px', overflow: 'hidden', border: `${isCompassMatch || isPathMatch ? '2px' : '1px'} solid ${isCompassMatch ? '#1d4ed8' : isPathMatch ? '#2563eb' : 'rgba(232,228,220,0.15)'}`, boxShadow: isCompassMatch ? '0 0 0 4px rgba(29,78,216,.1),0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>

      {/* バナー */}
      {isCompassMatch && (
        <div style={{ background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🧭</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>あなたのコンパス軸「{AXIS_LABELS[service.target_axis]}」の最初の一手</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)', marginTop: '1px' }}>Me Scanで導き出された最優先プログラム</div>
          </div>
        </div>
      )}
      {!isCompassMatch && isPathMatch && (
        <div style={{ background: '#2563eb', padding: '9px 18px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>🎯 あなたの「来た道」に合っています</span>
        </div>
      )}

      {/* カバー画像 */}
      {service.image_url && (
        <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
          <img src={service.image_url} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.4) 100%)' }} />
          {service.is_featured && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#fbbf24', color: '#78350f', fontSize: '11px', fontWeight: '800', padding: '5px 12px', borderRadius: '99px' }}>⭐ おすすめ</div>}
        </div>
      )}

      <div style={{ padding: '20px' }}>
        {/* 軸タグ + 名前 + 変容の約束（常時表示） */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '7px' }}>
            {service.target_axis && (
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: isCompassMatch ? '#dbeafe' : '#f1f5f9', color: isCompassMatch ? '#1d4ed8' : '#475569', borderRadius: '99px' }}>
                {AXIS_ICONS[service.target_axis]} {AXIS_LABELS[service.target_axis]}対応
              </span>
            )}
            {!service.image_url && service.is_featured && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '99px' }}>⭐ おすすめ</span>}
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '900', margin: '0 0 7px', color: 'rgba(232,228,220,0.90)', lineHeight: '1.3' }}>{service.name}</h3>
          {service.transformation_promise && (
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', margin: '0', fontStyle: 'italic', lineHeight: '1.6', padding: '8px 12px', background: 'rgba(10,15,30,0.50)', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
              「{service.transformation_promise}」
            </p>
          )}
        </div>

        {/* 価格 */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: '900', color: 'rgba(232,228,220,0.90)', lineHeight: 1 }}>¥{service.price.toLocaleString()}</span>
          {service.duration && <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.40)', marginLeft: '6px' }}>/ {service.duration}</span>}
        </div>

        {/* 「変容の旅を覗く」ボタン（常時表示・フル幅） */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ width: '100%', padding: '13px', marginBottom: '10px', background: expanded ? 'rgba(10,15,30,0.45)' : 'rgba(201,168,76,0.07)', color: expanded ? 'rgba(232,228,220,0.75)' : '#c9a84c', border: `1.5px solid ${expanded ? 'rgba(232,228,220,0.15)' : 'rgba(201,168,76,0.35)'}`, borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all .15s', letterSpacing: '.02em' }}
          >
            {expanded ? '閉じる ▲' : '変容の旅を覗く ▾'}
          </button>
        )}

        {/* 展開エリア（アコーディオン） */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(232,228,220,0.10)', paddingTop: '16px', marginBottom: '16px' }}>
            {(service.before_text || service.before_image_url || service.after_text || service.after_image_url) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(10,15,30,0.50)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(232,228,220,0.10)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.1em', padding: service.before_image_url ? '8px 12px 4px' : '12px 12px 4px', textTransform: 'uppercase' }}>BEFORE</div>
                  {service.before_image_url && <img src={service.before_image_url} alt="Before" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
                  {service.before_text && <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: 0, lineHeight: '1.6', padding: service.before_image_url ? '8px 12px 12px' : '0 12px 12px' }}>{service.before_text}</p>}
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', overflow: 'hidden', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#059669', letterSpacing: '.1em', padding: service.after_image_url ? '8px 12px 4px' : '12px 12px 4px', textTransform: 'uppercase' }}>AFTER</div>
                  {service.after_image_url && <img src={service.after_image_url} alt="After" style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
                  {service.after_text && <p style={{ fontSize: '12px', color: '#065f46', margin: 0, lineHeight: '1.6', padding: service.after_image_url ? '8px 12px 12px' : '0 12px 12px' }}>{service.after_text}</p>}
                </div>
              </div>
            )}
            {benefits.length > 0 && (
              <div style={{ marginBottom: '12px', padding: '14px', background: 'rgba(10,15,30,0.50)', borderRadius: '12px', border: '1px solid rgba(232,228,220,0.10)' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.75)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>このプログラムで変わること</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {benefits.slice(0, 5).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#34d399', fontWeight: '800', fontSize: '13px', flexShrink: 0, lineHeight: '1.4' }}>✓</span>
                      <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', lineHeight: '1.5' }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suitablePaths.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(10,15,30,0.50)', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.10)' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.1em', marginBottom: '7px', textTransform: 'uppercase' }}>こんな方に向いています</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {suitablePaths.map(p => (
                    <span key={p} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: (PATH_COLORS[p] || '#6b7280') + '18', color: PATH_COLORS[p] || '#6b7280', borderRadius: '99px' }}>
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
          style={{ width: '100%', padding: '15px', background: isCompassMatch ? 'linear-gradient(90deg,#1d4ed8,#4f46e5)' : '#0f172a', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', letterSpacing: '.02em', transition: 'opacity .15s' }}
          onMouseOver={e => e.currentTarget.style.opacity = '.88'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          {isCompassMatch ? '🧭 この一歩を踏み出す →' : 'このガイドと一歩を踏み出す →'}
        </button>
      </div>
    </div>
  );
}

function ProgramTab({ services, onConsult, userPathType, provider, matchData }) {
  if (services === null) return <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(232,228,220,0.40)' }}>読み込み中…</div>;
  if (!services.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(232,228,220,0.55)', background: 'rgba(10,15,30,0.50)', borderRadius: '18px', border: '1px dashed rgba(232,228,220,0.20)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
      <p style={{ fontSize: '15px', margin: 0, fontWeight: '600' }}>プログラムはまだ登録されていません</p>
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
        <div style={{ background: isCompassProvider ? 'rgba(29,78,216,0.15)' : 'rgba(10,15,30,0.50)', border: `1px solid ${isCompassProvider ? '#6366f1' : 'rgba(232,228,220,0.15)'}`, borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{isCompassProvider ? '🧭' : '🗺️'}</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: isCompassProvider ? '#818cf8' : 'rgba(232,228,220,0.75)', marginBottom: '6px' }}>
              {isCompassProvider ? 'あなたのコンパス軸を専門とするガイドです' : 'あなたの変容軸をカバーするガイドです'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {coveredAxes.map(ax => (
                <span key={ax.id} style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: ax.isCompass ? '#1d4ed8' : 'rgba(232,228,220,0.12)', color: ax.isCompass ? '#fff' : 'rgba(232,228,220,0.75)', borderRadius: '99px' }}>
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

// ── タブ③「相談する」────────────────────────────────────────────────────────
function ConsultTab({ provider, services, selectedService, onServiceSelect, submitted, setSubmitted, diagnosis, matchData }) {
  const today = new Date().toISOString().split('T')[0];
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [userPrefilled, setUserPrefilled] = useState(false);
  const [includeMeScan, setIncludeMeScan] = useState(true);

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
    if (submitted) setFormState({ name: '', email: '', phone: '', date: '', time: '', date2: '', time2: '', date3: '', time3: '', message: '' });
  }, [submitted]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formState.name || !formState.date || !formState.time) {
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
        ? `【New Me Map より】\n${meScanSummary.join('\n')}\n\n`
        : '';
      const noteParts = [
        selectedService ? `【プログラム】${selectedService.name}（¥${selectedService.price.toLocaleString()}）` : '',
        formState.date2 ? `【第2希望】${formState.date2} ${formState.time2}` : '',
        formState.date3 ? `【第3希望】${formState.date3} ${formState.time3}` : '',
        formState.message,
      ].filter(Boolean);
      // メール・電話を結合して user_contact に（既存APIと互換）
      const user_contact = [formState.email, formState.phone].filter(Boolean).join(' / ');
      const body = {
        provider_id: provider.id,
        user_name: formState.name,
        user_contact,
        preferred_date: formState.date,
        preferred_time: formState.time,
        message: meScanNote + noteParts.join('\n'),
      };
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setSubmitted(true); }
      else { const err = await res.json(); setFormError(err.error || '送信に失敗しました'); }
    } catch { setFormError('通信エラーが発生しました'); }
    finally { setSubmitting(false); }
  }

  if (submitted) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', margin: '0 0 8px' }}>相談リクエストを送りました</h2>
        <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.75)', margin: '0 0 24px', lineHeight: '1.7' }}>
          このガイドからの返答をお待ちください。<br />連絡先にご連絡が届きます。
        </p>
        <button onClick={() => setSubmitted(false)} style={{ padding: '10px 24px', background: 'rgba(10,15,30,0.45)', color: 'rgba(232,228,220,0.75)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          別のリクエストを送る
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      {/* ① 相談の流れ 3ステップ */}
      <div style={{ background: 'rgba(10,15,30,0.50)', borderRadius: '16px', padding: '20px', marginBottom: '20px', backdropFilter: 'blur(8px)', border: '1px solid rgba(232,228,220,0.10)' }}>
        <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.12em', marginBottom: '14px', textTransform: 'uppercase' }}>相談の流れ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { n: '1', label: 'リクエストを送る', desc: 'このフォームで希望日時と連絡先を送信します' },
            { n: '2', label: 'ガイドから返信が届く', desc: `通常${provider.response_hours ? provider.response_hours + '時間以内' : '2〜3日以内'}に、ご連絡先へ返信が届きます` },
            { n: '3', label: '日程確定 → 変容の旅スタート', desc: '準備ができたら当日を迎えましょう。まず話を聞くだけでも大丈夫です' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{step.n}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(232,228,220,0.90)', marginBottom: '2px' }}>{step.label}</div>
                <div style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', lineHeight: '1.5' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ② お試し・無料相談がある場合の強調カード */}
      {provider.trial_available && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', marginBottom: '4px' }}>🎁 まずお試しから始めることができます</div>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', margin: 0, lineHeight: '1.6' }}>{provider.trial_desc || '初回お試し・無料相談を提供しています。まずは気軽にご連絡ください。'}</p>
        </div>
      )}

      {/* ③ 初回セッション説明 */}
      {provider.first_session_desc && (
        <div style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', background: 'rgba(10,15,30,0.65)', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.1em', marginBottom: '8px', textTransform: 'uppercase' }}>初回はこんな内容です</div>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{provider.first_session_desc}</p>
        </div>
      )}

      {/* Me Scanデータ添付パネル */}
      {meScanSummary && (
        <div style={{ padding: '16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', margin: 0 }}>📎 以下のMe Scanデータがこのガイドに送られます</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={includeMeScan} onChange={e => setIncludeMeScan(e.target.checked)} style={{ accentColor: '#2563eb' }} />
              <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.75)' }}>送る</span>
            </label>
          </div>
          {meScanSummary.map((line, i) => (
            <p key={i} style={{ fontSize: '13px', color: '#1e40af', margin: i < meScanSummary.length - 1 ? '0 0 4px' : '0', fontWeight: i === 0 ? '700' : '400' }}>{line}</p>
          ))}
          {!includeMeScan && <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.40)', margin: '8px 0 0' }}>チェックを外したためデータは送られません。</p>}
        </div>
      )}

      {userPrefilled && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#15803d' }}>
          ✓ ログイン中のアカウント情報を自動入力しました
        </div>
      )}

      {/* プログラム選択 */}
      {services && services.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '8px' }}>相談したいプログラム（任意）</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${!selectedService ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
              <input type="radio" name="menu" checked={!selectedService} onChange={() => onServiceSelect(null)} style={{ accentColor: '#111' }} />
              <span style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>まず話を聞いてみたい（プログラム未定）</span>
            </label>
            {services.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: `1.5px solid ${selectedService?.id === s.id ? '#111' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer' }}>
                <input type="radio" name="menu" checked={selectedService?.id === s.id} onChange={() => onServiceSelect(s)} style={{ accentColor: '#111' }} />
                <span style={{ flex: 1, fontSize: '13px', color: 'rgba(232,228,220,0.75)' }}>{s.name}{s.duration ? ` (${s.duration})` : ''}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111', flexShrink: 0 }}>¥{s.price.toLocaleString()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' }}>お名前（姓名） *</label>
          <input value={formState.name} onChange={e => setFormState(p => ({ ...p, name: e.target.value }))} placeholder="山田 太郎" style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} required />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' }}>
            メールアドレス <span style={{ fontWeight: 400, color: 'rgba(232,228,220,0.75)' }}>（電話番号がある場合は省略可）</span>
          </label>
          <input
            type="email"
            value={formState.email}
            onChange={e => setFormState(p => ({ ...p, email: e.target.value }))}
            placeholder="example@email.com"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' }}>
            電話番号 <span style={{ fontWeight: 400, color: 'rgba(232,228,220,0.75)' }}>（メールアドレスがある場合は省略可）</span>
          </label>
          <input
            type="tel"
            value={formState.phone}
            onChange={e => setFormState(p => ({ ...p, phone: e.target.value }))}
            placeholder="090-0000-0000"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.75)', margin: '4px 0 0' }}>メールアドレス・電話番号のどちらか一方は必須です。</p>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '6px' }}>希望日時（第1希望）*</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date} min={today} onChange={e => setFormState(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} required />
            <select value={formState.time} onChange={e => setFormState(p => ({ ...p, time: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #111', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} required>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '6px' }}>希望日時（第2希望）<span style={{ fontWeight: '400', color: 'rgba(232,228,220,0.75)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date2} min={today} onChange={e => setFormState(p => ({ ...p, date2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
            <select value={formState.time2} onChange={e => setFormState(p => ({ ...p, time2: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '6px' }}>希望日時（第3希望）<span style={{ fontWeight: '400', color: 'rgba(232,228,220,0.75)' }}>任意</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="date" value={formState.date3} min={today} onChange={e => setFormState(p => ({ ...p, date3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
            <select value={formState.time3} onChange={e => setFormState(p => ({ ...p, time3: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">時間を選択</option>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' }}>このガイドに一番聞きたいこと（任意）</label>
          <textarea value={formState.message} onChange={e => setFormState(p => ({ ...p, message: e.target.value }))} placeholder="今の状況や悩み、気になることがあれば教えてください" rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        {formError && <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{formError}</p>}
        <button type="submit" disabled={submitting} style={{ padding: '14px', background: submitting ? '#9ca3af' : '#111', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}>
          {submitting ? '送信中…' : '相談リクエストを送る'}
        </button>
      </form>

      {/* キャンセルポリシー */}
      {provider.cancellation_policy && (
        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(10,15,30,0.50)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(232,228,220,0.40)', letterSpacing: '.1em', marginBottom: '6px', textTransform: 'uppercase' }}>キャンセルポリシー</div>
          <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{provider.cancellation_policy}</p>
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
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'guide');
  const [selectedService, setSelectedService] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [stories, setStories] = useState([]);
  const [staff, setStaff] = useState([]);
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
    ]).then(([prov, svcs, stf]) => {
      setProvider(prov);
      setServices(Array.isArray(svcs) ? svcs : []);
      setStaff(Array.isArray(stf) ? stf : []);
      setLoading(false);
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
    setActiveTab('consult');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(232,228,220,0.40)' }}>読み込み中…</p></div>;
  if (!provider) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ color: 'rgba(232,228,220,0.75)', fontWeight: '700' }}>掲載者が見つかりませんでした。</p>
      <a href="/search" style={{ padding: '10px 20px', background: '#111', color: '#fff', borderRadius: '10px', textDecoration: 'none' }}>サービスを探す</a>
    </div>
  );

  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category;

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* ヒーロー */}
      <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', marginBottom: '28px', minHeight: '320px', background: provider.cover_image_url ? `url(${provider.cover_image_url}) center/cover no-repeat` : 'linear-gradient(135deg,#111 0%,#374151 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.75) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '320px', padding: '28px 28px 32px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '99px', backdropFilter: 'blur(4px)' }}>{catLabel}</span>
            {provider.area && <span style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '99px' }}>📍 {provider.area}</span>}
            {matchData?.detail?.isCompassProvider && (
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 12px', background: 'rgba(37,99,235,0.85)', color: '#fff', borderRadius: '99px', backdropFilter: 'blur(4px)' }}>🧭 あなたの最優先</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginBottom: '8px' }}>
            {provider.photo_url && (
              <img src={provider.photo_url} alt={provider.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: '800', margin: '0 0 6px', lineHeight: '1.3', color: '#fff' }}>{provider.name}</h1>
              {provider.catchphrase && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.88)', margin: '0', lineHeight: '1.6', fontWeight: '600' }}>{provider.catchphrase}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
            {provider.price_from && (
              <span style={{ padding: '10px 18px', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: '#fff', backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.1)' }}>
                ¥{provider.price_from.toLocaleString()}〜
              </span>
            )}
            <button onClick={() => { setActiveTab('consult'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ padding: '12px 24px', background: 'rgba(232,228,220,0.9)', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              このガイドに相談する
            </button>
            <button onClick={toggleFavorite} title={isFavorited ? 'お気に入りから削除' : 'お気に入りに追加'} style={{ padding: '12px 16px', background: isFavorited ? 'rgba(201,168,76,0.85)' : 'rgba(255,255,255,0.15)', color: '#fff', border: `1.5px solid ${isFavorited ? '#c9a84c' : 'rgba(255,255,255,0.4)'}`, borderRadius: '12px', fontSize: '18px', cursor: 'pointer', backdropFilter: 'blur(4px)', lineHeight: 1 }}>
              {isFavorited ? '★' : '☆'}
            </button>
            {services && services.length > 0 && (
              <button onClick={() => setActiveTab('program')} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
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
      <TabBar activeTab={activeTab} onSelect={tab => { setActiveTab(tab); if (tab !== 'consult') setSelectedService(null); }} />

      {/* タブコンテンツ */}
      {activeTab === 'guide' && (
        <GuideTab
          provider={provider}
          diagnosis={diagnosis}
          matchData={matchData}
          stories={stories}
          staff={staff}
          onGoToConsult={() => { setActiveTab('consult'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />
      )}
      {activeTab === 'program' && (
        <ProgramTab services={services} onConsult={handleConsultFromProgram} userPathType={matchData?.detail?.coveredAxes?.[0]?.path_type || null} provider={provider} matchData={matchData} />
      )}
      {activeTab === 'consult' && (
        <ConsultTab
          provider={provider}
          services={services}
          selectedService={selectedService}
          onServiceSelect={setSelectedService}
          submitted={submitted}
          setSubmitted={setSubmitted}
          diagnosis={diagnosis}
          matchData={matchData}
        />
      )}
    </div>
  );
}

export default function ProviderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,228,220,0.40)' }}>読み込み中…</div>}>
      <ProviderPageContent />
    </Suspense>
  );
}
