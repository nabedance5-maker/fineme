// 入会のお支払いを、レシートのように1行ずつ並べる（でお指摘 2026-10-27：クーポンでいくら引かれるか、入会金が入っているか、
// 日割りがいくらかを、全部はっきり見せる）。請求の日付と金額の考え方は lib/membership-cycle.js の billingSchedule と同じ
// （「◯月分を、前の月／その月／次の月の◯日に請求」。でお要望 2026-10-27）。
// クーポンは「月会費から引く割引」（店舗の割引設定の説明どおり）なので、入会金には掛けない。
//   初回のみ   … 月会費を含む最初のお支払いから引く
//   ◯か月     … 月会費を含むお支払いの、最初の◯回から引く
//   ずっと     … 月会費を含むすべてのお支払いから引く
import { billingSchedule, normalizeCycle, jstToday, dayLabel } from './membership-cycle.js';

const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

export function couponOff(coupon, base) {
  if (!coupon || !(base > 0)) return 0;
  const off = coupon.kind === 'percent' ? Math.round((base * Number(coupon.value)) / 100) : Number(coupon.value);
  return Math.min(base, Math.max(0, off || 0));
}

function couponTimes(coupon) {
  if (!coupon) return 0;
  if (coupon.duration === 'forever') return Infinity;
  if (coupon.duration === 'repeating') return Math.max(1, Number(coupon.months) || 1);
  return 1;
}

// plan: { name, monthly_price, initial_fee } / options: [{ name, monthly_price }] / locker: { name, monthly_fee } | null
// coupon: { name, kind: 'amount'|'percent', value, duration: 'once'|'repeating'|'forever', months } | null
// 入会金を最初の月会費のお支払いまで待つか（お店の設定 initial_fee_timing='first_dues' で、承認時に請求する月会費が無い時）
export function initialFeeLater(settings, schedule) {
  return settings?.initial_fee_timing === 'first_dues' && !(schedule?.months || []).some(x => x.immediate);
}

export function membershipReceipt({ cycle, enrollmentDate, plan, options = [], locker = null, coupon = null, today = jstToday() }) {
  if (!plan || !enrollmentDate) return null;
  const monthlyLines = [
    { label: `プラン：${plan.name}`, amount: Number(plan.monthly_price) || 0 },
    ...options.map(o => ({ label: `オプション：${o.name}`, amount: Number(o.monthly_price) || 0 })),
    ...(locker ? [{ label: `ロッカー：${locker.name}`, amount: Number(locker.monthly_fee) || 0 }] : []),
  ];
  const monthlyTotal = monthlyLines.reduce((t, l) => t + l.amount, 0);
  const initialFee = Number(plan.initial_fee) || 0;
  const c = normalizeCycle(cycle);
  // 入会日が過ぎていれば、承認した日から
  const startDate = enrollmentDate > today ? enrollmentDate : today;
  // 請求の予定（lib/membership-cycle.js）。請求日が承認する日までに来ている月の分は「承認時にまとめて」
  const sch = billingSchedule(c, { startDate, monthlyTotal, today });

  const payments = [];
  const approval = { key: 'approval', date: null, title: 'お店が入会を承認した時のお支払い', lines: [], monthlyParts: [] };
  // 入会金：お店の設定が「最初の月会費と一緒に」で、承認時に請求する月会費が無ければ、最初の月会費のお支払いに入れる（でお要望 2026-10-27）
  const feeLater = initialFeeLater(cycle, sch);
  if (initialFee > 0 && !feeLater) approval.lines.push({ label: '入会金（初回のみ）', amount: initialFee });
  const monthLine = mo => {
    const span = `${md(mo.from)}〜${md(mo.to)}`;
    if (mo.kind === 'partial' && c.first_month === 'prorate') return { label: `${mo.label}（${span}の${mo.days}日分・日割り）`, note: `月会費 ¥${monthlyTotal.toLocaleString()} × ${mo.days}日 ÷ ${mo.periodDays}日`, amount: mo.amount };
    if (mo.kind === 'partial' && c.first_month === 'free') return { label: `${mo.label}（${span}）は無料`, amount: 0 };
    return { label: `月会費 ${mo.label}（${span}）`, amount: mo.amount };
  };
  for (const mo of sch.months.filter(x => x.immediate)) {
    approval.lines.push(monthLine(mo));
    if (mo.amount > 0) approval.monthlyParts.push(mo.amount);
  }
  if (approval.lines.length) payments.push(approval);
  for (const mo of sch.months.filter(x => !x.immediate)) {
    const first = feeLater && initialFee > 0 && !payments.some(g => g.key !== 'approval');
    payments.push({ key: mo.due + (mo.ym || ''), date: mo.due, title: `${md(mo.due)}のお支払い`, lines: [...(first ? [{ label: '入会金（初回のみ）', amount: initialFee }] : []), monthLine(mo)], monthlyParts: mo.amount > 0 ? [mo.amount] : [] });
  }

  // クーポン（月会費から引く。承認時の請求に含まれる月から順に）
  let left = couponTimes(coupon);
  const cname = coupon ? `クーポン「${coupon.name}」` : '';
  for (const g of payments) {
    for (const part of g.monthlyParts) {
      if (left <= 0) break;
      const off = couponOff(coupon, part);
      if (off > 0) g.lines.push({ label: `${cname}（月会費から）`, amount: -off });
      left -= 1;
    }
    g.total = g.lines.reduce((t, l) => t + l.amount, 0);
    delete g.monthlyParts;
  }

  const offAfter = left > 0 ? couponOff(coupon, monthlyTotal) : 0;
  const when = c.billing_mode === 'fixed_day'
    ? `毎月${dayLabel(c.billing_day)}に${{ '-1': '翌月分', '0': 'その月の分', '1': '前の月の分' }[String(c.billing_month_offset)]}`
    : `毎月${dayLabel(sch.anchorDay)}`;
  const after = {
    title: `その後のお支払い（${when}）`,
    amount: monthlyTotal - offAfter,
    note: offAfter > 0
      ? (left === Infinity ? `${cname}で毎月 ¥${offAfter.toLocaleString()} 引き（月会費 ¥${monthlyTotal.toLocaleString()}）` : `${cname}で ¥${offAfter.toLocaleString()} 引きがあと${left}回。その後は ¥${monthlyTotal.toLocaleString()}`)
      : null,
  };
  const notes = [];
  if (coupon && couponTimes(coupon) !== Infinity && !payments.some(g => g.lines.some(l => l.amount < 0)) && offAfter === 0) notes.push(`${cname}は月会費から引く割引のため、今回のお支払いには掛かりません。`);
  if (enrollmentDate < today) notes.push('ご入会日が過ぎているため、お店が承認した日からの計算です。');
  if (approval.lines.length) notes.push('「承認した時のお支払い」は、お店が入会を承認した日にまとめてお支払いいただきます。');
  notes.push('金額はお店が入会を承認した時に確定します。');

  return { monthlyLines, monthlyTotal, initialFee, payments, after, notes };
}
