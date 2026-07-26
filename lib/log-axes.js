// New Me Log の軸定義。
// 既存の8軸（Me Scan と同じ体系）に、定期的に通うものを足している。
// axis カラムは TEXT で制約が無いため、ここに無い軸名も保存できる（カスタム軸）。

export const CUSTOM_AXIS = 'custom';
export const DEFAULT_CUSTOM_ICON = '✦';

// 共通（男性トラック・Belle 両方に出す）
const COMMON_AXES = {
  hair:        { icon: '💇', label: '髪・美容室',         freq: { min: 4, max: 8, unit: '週' } },
  eyebrow:     { icon: '✂️', label: '眉',                 freq: { min: 3, max: 6, unit: '週' } },
  skin:        { icon: '✨', label: '肌ケア・エステ',      freq: { min: 2, max: 4, unit: '週' } },
  hairremoval: { icon: '🪒', label: '脱毛',               freq: { min: 4, max: 8, unit: '週' } },
  teeth:       { icon: '🦷', label: '歯・ホワイトニング',  freq: { min: 2, max: 4, unit: '週' } },
  body:        { icon: '💪', label: '体型・ジム',          freq: { min: 1, max: 1, unit: '週' } },
  nail:        { icon: '💅', label: '爪・ネイル',          freq: { min: 3, max: 4, unit: '週' } },
  headspa:     { icon: '💆', label: 'ヘッドスパ',          freq: { min: 4, max: 6, unit: '週' } },
  posture:     { icon: '🧘', label: '整体・姿勢',          freq: { min: 2, max: 4, unit: '週' } },
  fashion:     { icon: '👔', label: '服・ファッション',    freq: null },
};

// Belle（女性トラック）だけに出す
const BELLE_ONLY_AXES = {
  eyelash: { icon: '👁️', label: 'まつ毛',              freq: { min: 3, max: 4,  unit: '週' } },
  makeup:  { icon: '💄', label: 'メイク・コスメ見直し', freq: { min: 8, max: 12, unit: '週' } },
};

// 保存済みデータの表示に使う全定義（トラックを問わず引ける）
export const ALL_AXES = { ...COMMON_AXES, ...BELLE_ONLY_AXES };

// 「その他」で選べるアイコン候補（カスタム軸用）
export const CUSTOM_ICON_CHOICES = [
  '✦', '🌿', '🧴', '🛁', '🧹', '🍳', '😴', '📷', '👟', '🕶️', '⌚', '💍',
];

// 新規追加フォームに出す軸の候補。トラックで出し分ける。
export function axisChoicesFor(trackId) {
  const base = trackId === 'belle'
    ? { ...COMMON_AXES, ...BELLE_ONLY_AXES }
    : { ...COMMON_AXES };
  return Object.entries(base).map(([id, def]) => ({ id, ...def }));
}

// 保存済みの軸を表示用に解決する。
// 定義に無い軸（ユーザーが自分で作ったもの）は、その文字列をそのままラベルにする。
export function resolveAxis(axis, customIcon) {
  const def = ALL_AXES[axis];
  if (def) return { id: axis, ...def, isCustom: false };
  return {
    id: axis,
    icon: customIcon || DEFAULT_CUSTOM_ICON,
    label: axis || 'その他',
    freq: null,
    isCustom: true,
  };
}

// ── 「そろそろ」の判定 ──────────────────────────
// 次回予約日を入れる人は少なく、前回行った日しか記録しないのが実態。
// そこで「前回 + 頻度」から目安日を出し、予約がまだでも声をかけられるようにする。
//
// 頻度は週と月の2単位を持つ。美容室は「4週ごと」より「月1回」で考える人が多く、
// 4週=28日で回すと月をまたぐたびにズレるため、月単位は月として計算する。

// 頻度の入力候補（モーダルのプリセット）
export const FREQ_PRESETS = [
  { value: 1, unit: 'week',  label: '週1回' },
  { value: 2, unit: 'week',  label: '2週ごと' },
  { value: 3, unit: 'week',  label: '3週ごと' },
  { value: 1, unit: 'month', label: '月1回' },
  { value: 6, unit: 'week',  label: '6週ごと' },
  { value: 2, unit: 'month', label: '2ヶ月に1回' },
  { value: 3, unit: 'month', label: '3ヶ月に1回' },
  { value: 6, unit: 'month', label: '半年に1回' },
];

// この記録に使う頻度。本人の設定を優先し、無ければ軸の推奨（下限＝早めの方）。
// 戻り値: { value, unit: 'week'|'month', estimated } または null
export function effectiveFreq(log) {
  if (log?.frequency_months) return { value: log.frequency_months, unit: 'month', estimated: false };
  if (log?.frequency_weeks)  return { value: log.frequency_weeks,  unit: 'week',  estimated: false };
  const def = ALL_AXES[log?.axis];
  if (def?.freq?.min) return { value: def.freq.min, unit: 'week', estimated: true };
  return null;
}

export function formatFreq(freq) {
  if (!freq) return '';
  if (freq.unit === 'month') return freq.value === 1 ? '月1回' : `${freq.value}ヶ月に1回`;
  return freq.value === 1 ? '週1回' : `${freq.value}週ごと`;
}

// 前回 + 頻度 = 次に行くべき目安日。予約日（next_visit）とは別物。
export function idealNextDate(log) {
  const freq = effectiveFreq(log);
  if (!log?.last_visit || !freq) return null;
  const d = new Date(log.last_visit);
  if (freq.unit === 'month') {
    // 月をまたいでも同じ日付になるように月で加算する（1/15 → 2/15）
    const day = d.getDate();
    d.setMonth(d.getMonth() + freq.value);
    // 加算先に同じ日が無い場合（1/31 → 2/31）は月末に寄せる
    if (d.getDate() !== day) d.setDate(0);
  } else {
    d.setDate(d.getDate() + freq.value * 7);
  }
  return d.toISOString().slice(0, 10);
}

// 目安日まで何日か（負なら過ぎている）
export function daysUntilIdeal(log, from = new Date()) {
  const ideal = idealNextDate(log);
  if (!ideal) return null;
  return Math.round((new Date(ideal) - from) / 86400000);
}

// ── 費用の換算 ────────────────────────────────
// 1ヶ月の平均週数（365 / 7 / 12）
export const WEEKS_PER_MONTH = 4.345;

// 1回あたりの費用と頻度から月額換算を出す。
// 月単位はそのまま割る（「月1回 ¥7,000」なら月額はちょうど ¥7,000）。
// 頻度が無いもの（不定期）は換算しない＝推測で数字を作らない。
export function monthlyCost(cost, freq) {
  if (!cost || !freq?.value) return null;
  if (freq.unit === 'month') return Math.round(cost / freq.value);
  return Math.round(cost * (WEEKS_PER_MONTH / freq.value));
}

export function yearlyCost(cost, freq) {
  const m = monthlyCost(cost, freq);
  return m === null ? null : m * 12;
}

// ログ配列から費用サマリーを作る。
// 頻度が未設定でも軸の推奨頻度で換算する（effectiveFreqWeeks）。
// 合計から外れるのは、推奨も持たない軸（カスタム軸で頻度未設定）だけ。
export function costSummary(logs) {
  let monthly = 0;
  let counted = 0;
  let unknown = 0;
  let estimated = 0; // 推奨頻度で計算した件数
  const byAxis = [];

  for (const log of logs || []) {
    if (!log?.cost) continue;
    const freq = effectiveFreq(log);
    const m = monthlyCost(log.cost, freq);
    if (m === null) { unknown++; continue; }
    const isEstimated = !!freq.estimated;
    if (isEstimated) estimated++;
    monthly += m;
    counted++;
    byAxis.push({
      axis: log.axis, customIcon: log.custom_icon, name: log.name,
      monthly: m, estimated: isEstimated,
    });
  }

  byAxis.sort((a, b) => b.monthly - a.monthly);
  return { monthly, yearly: monthly * 12, counted, unknown, estimated, byAxis };
}

export function formatYen(n) {
  if (n === null || n === undefined) return '';
  return `¥${Number(n).toLocaleString('ja-JP')}`;
}

// Me Scan の予算設問（app/diagnosis/page.js の q8）と並べるためのラベル
export const BUDGET_LABELS = {
  low:  '〜¥5,000',
  mid:  '¥5,000〜¥15,000',
  high: '¥15,000以上',
};
