// 入会のお支払いを、レシートのように1行ずつ並べる（でお指摘 2026-10-27：クーポンでいくら引かれるか、入会金が入っているか、
// 日割りがいくらかを、全部はっきり見せる）。請求の日付と金額の考え方は lib/membership-cycle.js の firstBilling と同じ。
// クーポンは「月会費から引く割引」（店舗の割引設定の説明どおり）なので、入会金には掛けない。
//   初回のみ   … 月会費を含む最初のお支払いから引く
//   ◯か月     … 月会費を含むお支払いの、最初の◯回から引く
//   ずっと     … 月会費を含むすべてのお支払いから引く
import { firstBilling, normalizeCycle, jstToday } from '@/lib/membership-cycle';

const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
const dayLabel = d => (d === 31 ? '末日' : `${d}日`);

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
  const fb = firstBilling(c, { startDate, monthlyTotal, initialFee });

  // 請求ごとにまとめる（date=null は「お店が入会を承認した時」）
  const groups = new Map();
  const group = (date, title) => {
    const key = date || 'approval';
    if (!groups.has(key)) groups.set(key, { key, date, title, lines: [], monthlyPart: 0 });
    return groups.get(key);
  };
  const titleOf = date => (date ? `${md(date)}${date === startDate ? '（ご入会日）' : ''}のお支払い` : 'お店が入会を承認した時のお支払い');

  if (initialFee > 0) group(null, titleOf(null)).lines.push({ label: '入会金（初回のみ）', amount: initialFee });
  if (fb.partial) {
    const p = fb.partial;
    const span = `${md(p.from)}〜${md(p.to)}の${p.days}日分`;
    if (c.first_month === 'prorate' && p.amount > 0) {
      const g = group(startDate, titleOf(startDate));
      g.lines.push({ label: `初月の日割り（${span}）`, note: `月会費 ¥${monthlyTotal.toLocaleString()} × ${p.days}日 ÷ ${p.periodDays}日`, amount: p.amount });
      g.monthlyPart += p.amount;
    } else if (c.first_month === 'full' && p.amount > 0) {
      const g = group(null, titleOf(null));
      g.lines.push({ label: `初月分（${md(p.from)}〜${md(p.to)}・1か月分の料金）`, amount: p.amount });
      g.monthlyPart += p.amount;
    } else {
      group(startDate, titleOf(startDate)).lines.push({ label: `初月（${span}）は無料`, amount: 0 });
    }
  }
  const first = group(fb.firstFullDate, `${titleOf(fb.firstFullDate)}（ここから毎月）`);
  first.lines.push({ label: `月会費（${md(fb.firstFullDate)}〜の1か月分）`, amount: monthlyTotal });
  first.monthlyPart += monthlyTotal;

  // 並べ替え：承認時 → 日付順
  const payments = [...groups.values()].sort((a, b) => (a.date === b.date ? 0 : !a.date ? -1 : !b.date ? 1 : a.date < b.date ? -1 : 1));

  // クーポン
  let left = couponTimes(coupon);
  const cname = coupon ? `クーポン「${coupon.name}」` : '';
  for (const g of payments) {
    if (left > 0 && g.monthlyPart > 0) {
      const off = couponOff(coupon, g.monthlyPart);
      if (off > 0) g.lines.push({ label: `${cname}（月会費から）`, amount: -off });
      left -= 1;
    }
    g.total = g.lines.reduce((t, l) => t + l.amount, 0);
  }

  const offAfter = left > 0 ? couponOff(coupon, monthlyTotal) : 0;
  const after = {
    title: `その後のお支払い（毎月${c.billing_mode === 'fixed_day' ? dayLabel(c.billing_day) : dayLabel(fb.anchorDay)}）`,
    amount: monthlyTotal - offAfter,
    note: offAfter > 0
      ? (left === Infinity ? `${cname}で毎月 ¥${offAfter.toLocaleString()} 引き（月会費 ¥${monthlyTotal.toLocaleString()}）` : `${cname}で ¥${offAfter.toLocaleString()} 引きがあと${left}回。その後は ¥${monthlyTotal.toLocaleString()}`)
      : null,
  };
  const notes = [];
  if (coupon && couponTimes(coupon) !== Infinity && !payments.some(g => g.lines.some(l => l.amount < 0)) && offAfter === 0) notes.push(`${cname}は月会費から引く割引のため、今回のお支払いには掛かりません。`);
  if (enrollmentDate < today) notes.push('ご入会日が過ぎているため、お店が承認した日からの計算です。');
  notes.push('金額はお店が入会を承認した時に確定します。');

  return { monthlyLines, monthlyTotal, initialFee, payments, after, notes };
}
