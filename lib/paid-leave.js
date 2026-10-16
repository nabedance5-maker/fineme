// 有給休暇の残日数・年5日の取得義務の計算（でお要望 2026-10-16）。
// 付与は店舗が登録する（付与日・日数）。有効期限は付与日から2年。
// 残り = 今有効な付与の合計 − その中で最も古い付与日以降に承認された取得日数（承認済みの将来の日も含む）。

export const LEAVE_UNIT_LABEL = { full: '1日', am: '午前半休', pm: '午後半休' };
export const LEAVE_STATUS_LABEL = { pending: '承認待ち', approved: '承認済み', rejected: '却下', cancelled: '取り消し' };

export function addYears(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y + n, m - 1, d));
  if (dt.getUTCDate() !== d) dt.setUTCDate(0); // 2/29 → 2/28
  return dt.toISOString().slice(0, 10);
}

const sum = (list, f = x => Number(x.days) || 0) => Math.round(list.reduce((a, x) => a + f(x), 0) * 10) / 10;

export function leaveSummary(grants = [], requests = [], today) {
  const valid = grants.filter(g => g.granted_on <= today && g.expires_on >= today);
  const since = valid.length ? valid.map(g => g.granted_on).sort()[0] : null;
  const granted = sum(valid);
  const approved = requests.filter(r => r.status === 'approved');
  const used = since ? sum(approved.filter(r => r.date >= since)) : 0;
  const pending = sum(requests.filter(r => r.status === 'pending'));
  const remaining = Math.round((granted - used) * 10) / 10;

  // 年5日の取得義務：10日以上付与された直近の付与から1年以内に5日（労働基準法39条7項）
  let obligation = null;
  const big = grants.filter(g => Number(g.days) >= 10 && g.granted_on <= today).sort((a, b) => b.granted_on.localeCompare(a.granted_on))[0];
  if (big) {
    const deadline = addYears(big.granted_on, 1);
    if (today < deadline) {
      const taken = sum(approved.filter(r => r.date >= big.granted_on && r.date < deadline));
      obligation = { from: big.granted_on, deadline, taken, need: Math.max(0, Math.round((5 - taken) * 10) / 10) };
    }
  }
  return { granted, used, pending, remaining, obligation };
}

// 法定の付与日数の目安（週5日以上・週30時間以上の場合）。勤続年数→日数
export const STATUTORY_FULLTIME = [
  { years: 0.5, days: 10 }, { years: 1.5, days: 11 }, { years: 2.5, days: 12 }, { years: 3.5, days: 14 },
  { years: 4.5, days: 16 }, { years: 5.5, days: 18 }, { years: 6.5, days: 20 },
];
