// AI専属コンサルの診断材料。実データから「お客様の段階」「売上・予約の動き」「今の時期」を作る。
// 固定のチェックリストではなく、店舗ごと・時点ごとに変わる状況をAIと画面に渡すための層。
import { TAB_CATALOG } from '@/lib/dashboard-prefs';
import { ALL_AXES } from '@/lib/log-axes';

const DAY = 86400000;
const DEFAULT_INTERVAL_DAYS = 56;

export const VALID_TABS = TAB_CATALOG.map(t => t.key);
export const TAB_LABELS = Object.fromEntries(TAB_CATALOG.map(t => [t.key, t.label]));

// お客様の段階。順序は「優先して手を打つ順」
export const STAGES = [
  { key: 'first_lapsing', label: '2回目を逃しかけている', hint: '1回来たきり、通う間隔を過ぎた方。最も取りこぼしやすい' },
  { key: 'regular_overdue', label: '通う間隔を過ぎている常連', hint: '2回以上来ていて、いつもの間隔を超えた方' },
  { key: 'regular_due', label: 'そろそろ来る頃の常連', hint: '次の来店時期に入った方。予約を促すタイミング' },
  { key: 'first_waiting', label: '2回目を待っている新規', hint: '初回後まだ間隔内の方。お礼と次回の提案どき' },
  { key: 'dormant', label: '休眠', hint: '2回以上来たが、休眠の日数を超えた方' },
  { key: 'first_lost', label: '1回で途絶えた', hint: '1回来たきり、休眠の日数を超えた方' },
  { key: 'regular_ok', label: '順調に通っている', hint: '間隔内で通えている方。維持・深掘りの対象' },
  { key: 'booked', label: '次回予約あり', hint: '次の来店が決まっている方' },
];

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

export function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

export function periodKeys(now = jstNow()) {
  const day = ymd(now);
  const month = day.slice(0, 7);
  const monday = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * DAY);
  return { daily: day, weekly: `wk-${ymd(monday)}`, monthly: month };
}

export function timeContext(now = jstNow()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const part = d <= 10 ? '月初' : d <= 20 ? '月の中ごろ' : '月末に近い';
  return {
    text: `${y}年${m}月${d}日（${WEEKDAY[now.getUTCDay()]}）。${part}で、今月はあと${lastDay - d}日。`,
    month: m,
    day: d,
    daysLeftInMonth: lastDay - d,
  };
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function count(q) {
  const { count: c } = await q;
  return c || 0;
}

function sumAmount(rows) {
  return (rows || []).reduce((s, r) => s + (r.amount || 0), 0);
}

function userIntervalDays(log, recMap) {
  if (log.frequency_weeks) return log.frequency_weeks * 7;
  if (log.frequency_months) return log.frequency_months * 30;
  const rec = recMap[log.axis];
  if (rec?.frequency_weeks) return rec.frequency_weeks * 7;
  if (rec?.frequency_months) return rec.frequency_months * 30;
  return DEFAULT_INTERVAL_DAYS;
}

function classify({ visits, daysSince, interval, noVisitDays, hasFuture }) {
  if (hasFuture) return 'booked';
  if (visits <= 1) {
    if (daysSince <= interval) return 'first_waiting';
    if (daysSince <= noVisitDays) return 'first_lapsing';
    return 'first_lost';
  }
  if (daysSince <= interval * 0.8) return 'regular_ok';
  if (daysSince <= interval * 1.2) return 'regular_due';
  if (daysSince <= Math.max(noVisitDays, interval * 1.2)) return 'regular_overdue';
  return 'dormant';
}

export async function gatherInsight(supabase, provider, ctx) {
  const pid = provider.id;
  const slug = provider.slug;
  const now = jstNow();
  const today = ymd(now);
  const d30 = ymd(new Date(now.getTime() - 30 * DAY));
  const d60 = ymd(new Date(now.getTime() - 60 * DAY));
  const noVisitDays = ctx?.noVisitDays || 90;

  const [logsRes, recRes, salesRes, resRes, staffRes, manualRes] = await Promise.all([
    slug
      ? supabase.from('user_service_logs').select('id, user_id, axis, last_visit, next_visit, frequency_weeks, frequency_months').eq('provider_slug', slug).eq('active', true).limit(3000)
      : Promise.resolve({ data: [] }),
    supabase.from('provider_recommended_frequencies').select('axis, frequency_weeks, frequency_months').eq('provider_id', pid),
    supabase.from('provider_sales_entries').select('amount, entry_date').eq('provider_id', pid).gte('entry_date', d60).limit(5000),
    supabase.from('reservations').select('status, reserved_date, created_at').eq('provider_id', pid).gte('created_at', new Date(now.getTime() - 60 * DAY).toISOString()).limit(5000),
    supabase.from('provider_staff').select('id, name, role').eq('provider_id', pid).order('sort_order').limit(30),
    count(supabase.from('provider_manual_customers').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
  ]);

  const logs = logsRes.data || [];
  const recMap = Object.fromEntries((recRes.data || []).map(r => [r.axis, r]));

  const visitsByLog = {};
  for (const ids of chunk(logs.map(l => l.id), 200)) {
    const { data } = await supabase.from('user_service_log_visits').select('log_id, visited_at').in('log_id', ids);
    (data || []).forEach(v => {
      const e = visitsByLog[v.log_id] || (visitsByLog[v.log_id] = { n: 0, last: null });
      e.n++;
      if (!e.last || v.visited_at > e.last) e.last = v.visited_at;
    });
  }

  // 1人のお客様が複数ログを持つ場合は1人にまとめる
  const people = {};
  for (const l of logs) {
    const v = visitsByLog[l.id] || { n: 0, last: null };
    const last = [l.last_visit, v.last].filter(Boolean).sort().pop() || null;
    const p = people[l.user_id] || (people[l.user_id] = { user_id: l.user_id, visits: 0, last: null, interval: Infinity, hasFuture: false, axis: l.axis });
    p.visits += Math.max(v.n, l.last_visit ? 1 : 0);
    if (last && (!p.last || last > p.last)) { p.last = last; p.axis = l.axis; }
    p.interval = Math.min(p.interval, userIntervalDays(l, recMap));
    if (l.next_visit && l.next_visit >= today) p.hasFuture = true;
  }

  const stageMap = Object.fromEntries(STAGES.map(s => [s.key, []]));
  Object.values(people).forEach(p => {
    if (!p.last) return;
    const daysSince = Math.floor((now.getTime() - new Date(p.last).getTime()) / DAY);
    if (daysSince < 0) return;
    const stage = classify({ visits: p.visits, daysSince, interval: Number.isFinite(p.interval) ? p.interval : DEFAULT_INTERVAL_DAYS, noVisitDays, hasFuture: p.hasFuture });
    stageMap[stage].push({ user_id: p.user_id, visits: p.visits, daysSince, axis: p.axis });
  });

  // 名前は画面に出す分だけ取得（AIへは渡さない）
  const SAMPLE = 8;
  const sampleIds = [...new Set(STAGES.flatMap(s => stageMap[s.key].sort((a, b) => b.daysSince - a.daysSince).slice(0, SAMPLE).map(c => c.user_id)))];
  const names = {};
  for (const ids of chunk(sampleIds, 100)) {
    const { data } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    (data || []).forEach(p => { names[p.id] = p.display_name; });
  }

  const stages = STAGES.map(s => {
    const list = stageMap[s.key];
    return {
      key: s.key,
      label: s.label,
      hint: s.hint,
      count: list.length,
      samples: list.slice(0, SAMPLE).map(c => ({
        user_id: c.user_id,
        name: names[c.user_id] || 'お客様',
        visits: c.visits,
        daysSince: c.daysSince,
        axisLabel: ALL_AXES[c.axis]?.label || '',
      })),
    };
  });

  const sales = salesRes.data || [];
  const sales30 = sales.filter(r => r.entry_date >= d30);
  const salesPrev = sales.filter(r => r.entry_date < d30);
  const dayCount = {};
  const reservations = resRes.data || [];
  const res30 = reservations.filter(r => r.created_at.slice(0, 10) >= d30);
  const resPrev = reservations.filter(r => r.created_at.slice(0, 10) < d30);
  reservations.forEach(r => {
    if (!r.reserved_date || ['cancelled', 'expired'].includes(r.status)) return;
    const w = new Date(r.reserved_date + 'T00:00:00Z').getUTCDay();
    dayCount[w] = (dayCount[w] || 0) + 1;
  });
  const weekdayLoad = WEEKDAY.map((label, i) => ({ label, count: dayCount[i] || 0 }));

  // 直近8週の週ごとの会計件数（売上管理の記録。古い週→新しい週の順）
  const weeklyVisits = Array.from({ length: 8 }, (_, i) => {
    const start = ymd(new Date(now.getTime() - ((8 - i) * 7 - 1) * DAY));
    const end = ymd(new Date(now.getTime() - (7 - i) * 7 * DAY));
    return { start, count: sales.filter(r => r.entry_date >= start && r.entry_date <= end).length };
  });

  const kpis = {
    sales30: { total: sumAmount(sales30), count: sales30.length, avg: sales30.length ? Math.round(sumAmount(sales30) / sales30.length) : null },
    salesPrev30: { total: sumAmount(salesPrev), count: salesPrev.length },
    reservations30: res30.length,
    reservationsPrev30: resPrev.length,
    cancelled30: res30.filter(r => r.status === 'cancelled').length,
    weekdayLoad,
    weeklyVisits,
  };

  return {
    now: today,
    time: timeContext(now),
    stages,
    kpis,
    staff: staffRes.data || [],
    manualCount: manualRes,
    peopleCount: Object.keys(people).length,
  };
}

// AIに渡す診断材料（個人名は含めない）
export function insightForPrompt(insight, ctx) {
  const stageLines = insight.stages.map(s => `- ${s.label}：${s.count}人`).join('\n');
  const k = insight.kpis;
  const delta = (a, b) => (b ? `（前の30日 ${b}）` : '（前の30日は記録なし）');
  const busiest = [...k.weekdayLoad].sort((a, b) => b.count - a.count);
  const weekdayLine = k.weekdayLoad.every(w => !w.count)
    ? '予約の曜日傾向はまだ分かりません'
    : `予約が多い曜日：${busiest.slice(0, 2).map(w => `${w.label}(${w.count})`).join('、')} / 少ない曜日：${busiest.slice(-2).map(w => `${w.label}(${w.count})`).join('、')}`;
  const staffLine = insight.staff.length
    ? insight.staff.map(s => `${s.name}${s.role ? `（${s.role}）` : ''}`).join('、')
    : '（スタッフ未登録）';
  return `【今日】${insight.time.text}
【お客様の段階（Fineme上の来店記録ベース。合計${insight.peopleCount}人）】
${stageLines}
【直近の動き】
売上記録(30日)：${k.sales30.count}件 / 合計${k.sales30.total}円${k.sales30.avg ? ` / 平均${k.sales30.avg}円` : ''}${delta(k.sales30.total, k.salesPrev30.total)}
予約リクエスト(30日)：${k.reservations30}件${delta(k.reservations30, k.reservationsPrev30)}、うちキャンセル${k.cancelled30}件
${weekdayLine}
リピート率：${ctx.repeatRate == null ? '不明（来店記録が少ない）' : ctx.repeatRate + '%'}
【スタッフ】${staffLine}
【Finemeの利用状況（事実）】
LINE連携：${ctx.lineConnected ? '済み' : '未'} / LINEでつながっているお客様 ${ctx.linkedCount}人 / 休眠判定 ${ctx.noVisitDays}日 / 店舗の推奨来店周期の設定 ${ctx.freqCount}軸 / カルテ記録 ${ctx.karteCount}件 / シフト期間 ${ctx.shiftPeriodCount}件`;
}
