// 接客の引き出し（来店前の接客メモ・会計時の次回の一言・接客の効果）の共通ロジック。
//
// でお判断（2026-10-15）：軸別の汎用トーク集は「どの店のどのお客様にも当てはまる＝誰の役にも立たない」
// ため廃止し、「今日来るこのお客様」に絞った実データのメモに置き換える。
// 事実（来店履歴・カルテ・固定メモ・回数券・誕生日・周期）はここで決定的に組み立て、
// AIはその事実だけから「今日聞くこと」「次回の一言」を作る（事実の捏造をさせない）。
import { createHash } from 'crypto';

export const ACTIVE_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

const JST_MS = 9 * 3600 * 1000;
export const jstToday = () => new Date(Date.now() + JST_MS).toISOString().slice(0, 10);
export const jstDateOf = iso => (iso ? new Date(new Date(iso).getTime() + JST_MS).toISOString().slice(0, 10) : null);

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
}

export const effDate = r => r.confirmed_date || r.counter_date || r.reserved_date;
export const effTime = r => (r.confirmed_time || r.counter_time || r.start_time || '').slice(0, 5);

// Fineme会員はuser_id、電話予約などの非会員は名前（空白除去）で同一人物を判定する。
export function normName(name) {
  return String(name || '').replace(/[\s　]/g, '');
}
export function customerKey(r) {
  if (r.user_id) return `u:${r.user_id}`;
  const n = normName(r.user_name);
  return n ? `n:${n}` : null;
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

const freqDays = f => (f?.frequency_months ? f.frequency_months * 30 : f?.frequency_weeks ? f.frequency_weeks * 7 : null);

// 次回までの目安日数。店舗の推奨周期 → お客様自身が決めている周期 → これまでの来店間隔 の順。
export function resolveInterval({ logs = [], recommended = {}, visitDates = [] }) {
  for (const l of logs) {
    const d = freqDays(recommended[l.axis]);
    if (d) return { days: d, basis: '店舗の推奨周期' };
  }
  for (const l of logs) {
    const d = freqDays(l);
    if (d) return { days: d, basis: 'お客様が決めている周期' };
  }
  if (visitDates.length >= 2) {
    const gaps = [];
    for (let i = 1; i < visitDates.length; i++) gaps.push(daysBetween(visitDates[i - 1], visitDates[i]));
    const m = median(gaps.filter(g => g > 0));
    if (m) return { days: m, basis: 'これまでの来店間隔' };
  }
  return null;
}

export function formatSpan(days) {
  if (days == null) return '';
  if (days >= 56 && days % 30 <= 5) return `${Math.round(days / 30)}ヶ月`;
  if (days >= 14) return `${Math.round(days / 7)}週間`;
  return `${days}日`;
}

export function mdLabel(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

// AIに渡す事実テキスト。ここに無いことはAIに書かせない。
export function factsText(item) {
  const lines = [];
  lines.push(`今日の予約: ${item.time || '時間未定'}${item.menu ? `／${item.menu}` : ''}${item.staff_name ? `／担当 ${item.staff_name}` : ''}`);
  if (item.note) lines.push(`予約時のメッセージ: ${item.note}`);
  if (item.isFirst) lines.push('来店回数: 今日が初来店');
  else lines.push(`来店回数: 今日で${item.visitCount + 1}回目`);
  if (item.lastVisit) {
    lines.push(`前回来店: ${item.lastVisit.daysAgo}日前${item.lastVisit.menu ? `（${item.lastVisit.menu}）` : ''}`);
  }
  if (item.interval) {
    lines.push(`次回までの目安: ${formatSpan(item.interval.days)}（${item.interval.basis}）`);
    if (item.overdueDays > 7) lines.push(`前回からの間隔は目安より${formatSpan(item.overdueDays)}長い`);
  }
  if (item.nextSuggestedDate) lines.push(`次回の目安日: ${mdLabel(item.nextSuggestedDate)}頃`);
  if (item.nextBooked) lines.push(`次回予約: すでに${mdLabel(item.nextBooked.date)}に入っている`);
  if (item.fixedNote) lines.push(`店舗の固定メモ: ${item.fixedNote}`);
  item.karte.forEach(k => {
    const vals = k.values.map(v => `${v.label}: ${v.value}`).join('、');
    lines.push(`カルテ(${k.date}${k.menu ? `・${k.menu}` : ''}): ${[k.note, vals].filter(Boolean).join(' / ')}`);
  });
  item.packages.forEach(p => {
    lines.push(`回数券・プラン: ${p.name}${p.remaining != null ? `（残り${p.remaining}回）` : ''}${p.expires ? `（期限 ${p.expires}）` : ''}`);
  });
  if (item.birthdayThisMonth) lines.push(`今月が誕生月（${item.birthdayThisMonth}）`);
  if (item.meScanType) lines.push(`Me Scan診断のタイプ: ${item.meScanType}`);
  return lines.join('\n');
}

export function factsHash(item) {
  return createHash('sha256').update(factsText(item)).digest('hex').slice(0, 32);
}

// AIが使えない・失敗した時の決定的な代替。事実から機械的に作るので内容は控えめ。
export function fallbackAi(item) {
  const asks = [];
  if (item.isFirst) {
    asks.push('今日いちばん気になっていることは何ですか？');
    asks.push('当店を知ったきっかけと、来ようと思った決め手は？');
  } else {
    asks.push(`前回${item.lastVisit?.menu ? `の${item.lastVisit.menu}` : ''}のあと、気になったことや変化はありましたか？`);
    if (item.overdueDays > 7) asks.push('最近お忙しかったですか？（間が空いた理由をさりげなく）');
  }
  if (item.packages.some(p => p.remaining != null && p.remaining <= 1)) asks.push('回数券の残りが少ないので、今後の通い方を一緒に決めましょうか？');
  const nextLine = item.nextBooked
    ? `次回は${mdLabel(item.nextBooked.date)}ですね。お待ちしています。`
    : item.nextSuggestedDate
      ? `次は${mdLabel(item.nextSuggestedDate)}頃がちょうどいいタイミングです。今のうちに日にちだけ押さえておきますか？`
      : '次はどのくらいの間隔で来られそうですか？ご都合のいい頃に日にちだけ押さえておけます。';
  return { asks: asks.slice(0, 3), nextLine, fallback: true };
}
