// 無料モニター店舗の募集（2026-11-16〜2026-12-15。2026-11-25 渡邉判断で11/30から延長・全国一律）。導入事例をつくるため5店限定で募集する。
// 募集を終える・延ばす時はここだけ直せばよい：
//   - enabled を false にすると、/provider/join とトップページの告知がすべて消える
//   - deadline を過ぎると自動で消える（日本時間のその日の23:59:59まで表示）
// 応募は掲載相談フォーム（/provider/inquiry?plan=monitor）で受ける（2026-11-16 Googleフォームから切り替え）。
// 営業パートナーの紹介コード（?ref= / クッキー）がそのまま引き継がれ、アカウント作成時にお店の紹介者になる
// ＝モニター後に有料になった時の紹介報酬が自動で紐づく。
export const MONITOR_CAMPAIGN = {
  enabled: true,
  slots: 5,
  deadline: '2026-12-15', // 日本時間（その日の23:59:59まで）
  months: 3,
  planLabel: 'スタンダード', // lib/provider-plans.js の label と一致させる（料金はそちらから読む）
  applyPath: '/provider/inquiry?plan=monitor',
};

// 無料のリピート診断（Googleフォーム）。モニター募集とは別に出し続けられるよう、独立して切り替える
export const REPEAT_CHECK = {
  enabled: true,
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSesgOj-eriMnGoQu8EehSjmqZl_u3NUX9i2w7DY9aYJv-9bBQ/viewform',
};

export function isMonitorOpen(now = new Date()) {
  if (!MONITOR_CAMPAIGN.enabled) return false;
  const end = new Date(`${MONITOR_CAMPAIGN.deadline}T23:59:59+09:00`);
  return now.getTime() <= end.getTime();
}

// 「2026年12月15日」の形
export function monitorDeadlineLabel() {
  const [y, m, d] = MONITOR_CAMPAIGN.deadline.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
