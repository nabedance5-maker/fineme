// New Me Log の軸定義。
// 既存の8軸（Me Scan と同じ体系）に、定期的に通うものを足している。
// axis カラムは TEXT で制約が無いため、ここに無い軸名も保存できる（カスタム軸）。

export const CUSTOM_AXIS = 'custom';
export const DEFAULT_CUSTOM_ICON = '✦';

// ── 記録の種別（通う／買う）────────────────────
// 軸（8軸）は増やさず、記録ごとに「通う場所」か「買うもの」かのタグだけを持たせる。
// スキンケア・ヘアケア用品・プロテイン等も「肌ケア」「髪・美容室」「体型」などの
// 既存軸に載せた上で、この種別で来店と購入を区別する（でお構想 2026-08-01）。
export const DEFAULT_ENTRY_TYPE = 'visit';
export const ENTRY_TYPES = {
  visit: {
    id: 'visit',
    label: '通う',
    namePlaceholder: '例：〇〇美容室、△△ジム',
    lastLabel: '前回利用日',
    nextLabel: '次回予約日',
    recordDoneLabel: '✓ 今日行った',
  },
  purchase: {
    id: 'purchase',
    label: '買う',
    namePlaceholder: '例：〇〇化粧水、△△プロテイン',
    lastLabel: '前回購入日',
    nextLabel: '次回購入予定日',
    recordDoneLabel: '✓ 今日買った',
  },
};

export function resolveEntryType(entryType) {
  return ENTRY_TYPES[entryType] || ENTRY_TYPES[DEFAULT_ENTRY_TYPE];
}

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

// ── 支出の推移（サブスクBox的なグラフ・傾向分析）─────────────
// costSummary() は「今のログ全件を集計した現時点のスナップショット」だったが、
// ここは実際に記録された来店（log.visits）を月ごとに積み上げる時系列集計。
// 月をまたぐたびに last_visit が上書きされていた旧仕様では作れなかったデータなので、
// user_service_log_visits の履歴が溜まるほど精度が上がる（recordVisit()参照）。

// 当月を含め、過去に向かって n 個の 'YYYY-MM' を古い順で返す
function lastNMonthKeys(n) {
  const base = new Date();
  base.setDate(1); // 31日始まりだと月をまたいだ引き算で月末オーバーフローするため先に1日に寄せる
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  return y === thisYear ? `${m}月` : `${String(y).slice(2)}年${m}月`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// 頻度を日数のおおよその値に換算する（週・月をまたいだ比較のため）
function freqToDays(freq) {
  if (!freq?.value) return null;
  return freq.unit === 'month' ? freq.value * 30.44 : freq.value * 7;
}

/**
 * 直近 months ヶ月（当月含む）を月ごとに集計する。
 * 対象は各 log.visits（{visited_at, cost}[]、無ければ [] 扱い）。
 * visit.cost が無ければ log.cost（現在設定されている金額）で代用し、
 * それも無ければ集計から除外する（unknownCostCountに計上・わからない金額を作らない）。
 *
 * @param {Array} logs   listLogs() の返り値（.visits を含む）
 * @param {number} months
 */
export function monthlyTrend(logs, months = 6) {
  const keys = lastNMonthKeys(months);
  const buckets = {};
  keys.forEach(ym => {
    buckets[ym] = { ym, label: monthLabel(ym), total: 0, visitCount: 0, unknownCostCount: 0, byAxis: {} };
  });

  let hasAnyVisit = false;
  const totalByAxisMap = {};

  for (const log of logs || []) {
    const visits = Array.isArray(log.visits) ? log.visits : [];
    if (!visits.length) continue;
    const def = resolveAxis(log.axis, log.custom_icon);

    for (const v of visits) {
      if (!v?.visited_at) continue;
      const ym = String(v.visited_at).slice(0, 7);
      const bucket = buckets[ym];
      if (!bucket) continue; // 集計窓の外（古すぎる記録）。hasAnyVisitもここでは立てない
      hasAnyVisit = true;

      bucket.visitCount++;
      const cost = v.cost ?? log.cost ?? null;
      if (cost === null || cost === undefined) { bucket.unknownCostCount++; continue; }

      bucket.total += cost;
      if (!bucket.byAxis[log.axis]) {
        bucket.byAxis[log.axis] = { axis: log.axis, icon: def.icon, label: def.label, amount: 0, visitCount: 0 };
      }
      bucket.byAxis[log.axis].amount += cost;
      bucket.byAxis[log.axis].visitCount++;

      if (!totalByAxisMap[log.axis]) {
        totalByAxisMap[log.axis] = { axis: log.axis, icon: def.icon, label: def.label, amount: 0, visitCount: 0 };
      }
      totalByAxisMap[log.axis].amount += cost;
      totalByAxisMap[log.axis].visitCount++;
    }
  }

  const monthsOut = keys.map(ym => {
    const b = buckets[ym];
    return { ...b, byAxis: Object.values(b.byAxis).sort((a, c) => c.amount - a.amount) };
  });
  const totalByAxis = Object.values(totalByAxisMap).sort((a, b) => b.amount - a.amount);
  const max = monthsOut.reduce((m, b) => Math.max(m, b.total), 0);

  return { months: monthsOut, totalByAxis, max, hasAnyVisit };
}

/**
 * 事実ベースの「気づき」を最大3件返す。該当しない種類は出さない（無理に埋めない）。
 * 評価語（使いすぎ・もったいない等）は使わず、起きている事実だけを述べる。
 * @param {Array} logs
 * @param {number} months
 * @returns {Array<{id:string, icon:string, text:string}>}
 */
export function trendInsights(logs, months = 6) {
  const trend = monthlyTrend(logs, months);
  const out = [];

  // A: 頻度のズレ ── 本人が設定した頻度と、実際の来店間隔の平均が7日以上ズレているログ
  //    サブスク（請求日固定）には無い、Fineme固有の「通うことは揺らぐ」を活かした気づき
  {
    let best = null;
    for (const log of logs || []) {
      const freq = effectiveFreq(log);
      if (!freq || freq.estimated) continue; // 本人が設定したものだけ対象
      const visits = (Array.isArray(log.visits) ? log.visits : [])
        .map(v => v?.visited_at).filter(Boolean).sort();
      if (visits.length < 2) continue;
      const intervals = [];
      for (let i = 1; i < visits.length; i++) intervals.push(daysBetween(visits[i - 1], visits[i]));
      const avgDays = intervals.reduce((s, x) => s + x, 0) / intervals.length;
      const configuredDays = freqToDays(freq);
      const diff = avgDays - configuredDays;
      if (Math.abs(diff) < 7) continue;
      if (!best || Math.abs(diff) > Math.abs(best.diff)) {
        best = { log, freq, avgDays, diff };
      }
    }
    if (best) {
      const def = resolveAxis(best.log.axis, best.log.custom_icon);
      const actualWeeks = Math.round(best.avgDays / 7);
      out.push({
        id: 'freq-drift',
        icon: def.icon,
        text: `${best.log.name} は${formatFreq(best.freq)}の設定ですが、直近の間隔は平均${actualWeeks}週間です`,
      });
    }
  }

  // B: 最大シェア軸の連続性 ── 同じ軸が何ヶ月連続でその月の最大シェアか（$0の月はスキップ）
  {
    const withData = trend.months.filter(m => m.total > 0);
    let streakAxis = null, streakDef = null, streakCount = 0;
    for (let i = withData.length - 1; i >= 0; i--) {
      const top = withData[i].byAxis[0];
      if (!top) break;
      if (streakAxis === null) { streakAxis = top.axis; streakDef = top; streakCount = 1; }
      else if (top.axis === streakAxis) { streakCount++; }
      else break;
    }
    if (streakCount >= 2) {
      out.push({
        id: 'top-axis-streak',
        icon: streakDef.icon,
        text: `${streakDef.label} が直近${streakCount}ヶ月、最も大きな割合を占めています`,
      });
    }
  }

  // C: 前月比 ── 集計途中の当月は使わず、確定済みの2ヶ月（先月・先々月）で比較する
  //    （当月ぶんを先月と比べると、月の途中なのに常に「減っている」ように見えてしまうため）
  {
    const n = trend.months.length;
    if (n >= 3) {
      const last = trend.months[n - 2];
      const prev = trend.months[n - 3];
      if (last.total > 0 && prev.total > 0) {
        const diff = last.total - prev.total;
        if (Math.abs(diff) >= 1000) {
          const sign = diff >= 0 ? '+' : '-';
          out.push({
            id: 'mom-diff',
            icon: '📊',
            text: `${last.label}は${formatYen(last.total)}で、${prev.label}（${formatYen(prev.total)}）より${sign}${formatYen(Math.abs(diff))}でした`,
          });
        }
      }
    }
  }

  // D: 新規軸 ── 直近月に初めて記録が付いた軸（サービス開始直後は全軸が「新規」に見えて
  //    ノイズになるため、window内に3ヶ月以上の実データがあることをガードにする）
  {
    const monthsWithData = trend.months.filter(m => m.visitCount > 0).length;
    if (monthsWithData >= 3) {
      const current = trend.months[trend.months.length - 1];
      const priorAxes = new Set();
      trend.months.slice(0, -1).forEach(m => m.byAxis.forEach(a => { if (a.visitCount > 0) priorAxes.add(a.axis); }));
      const newAxis = current.byAxis.find(a => a.visitCount > 0 && !priorAxes.has(a.axis));
      if (newAxis) {
        out.push({ id: 'new-axis', icon: newAxis.icon, text: `${newAxis.label} は今月が初めての記録です` });
      }
    }
  }

  return out.slice(0, 3);
}

// Me Scan の予算設問（app/diagnosis/page.js の q8）と並べるためのラベル
export const BUDGET_LABELS = {
  low:  '〜¥5,000',
  mid:  '¥5,000〜¥15,000',
  high: '¥15,000以上',
};
