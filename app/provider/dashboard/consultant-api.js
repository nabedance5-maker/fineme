// AI専属コンサルのウィジェット（右下）と専用タブで共有する通信・補助関数。
export const CHANGED_EVENT = 'consultant:changed';

export const MINUTE_CHOICES = [
  { v: 30, label: '30分' },
  { v: 60, label: '1時間' },
  { v: 120, label: '2時間' },
  { v: 240, label: '4時間以上' },
];

export const STATUS_LABEL = { done: '完了', todo: '未着手', snoozed: '保留中', skipped: '見送り' };

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}

// 右下のウィジェットと専用タブが同時に同じ読み込みをするので、進行中の読み込み（GET）は1本にまとめる
const inflight = new Map();

export function consultantApi(path, options = {}) {
  const isGet = !options.method || options.method === 'GET';
  if (!isGet) return request(path, options);
  if (inflight.has(path)) return inflight.get(path);
  const p = request(path, options).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

async function request(path, options) {
  const token = getToken();
  const res = await fetch(`/api/provider/consultant${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || '通信に失敗しました');
  return body;
}

export function goToTab(tab) {
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) btn.click();
  else window.location.href = `/provider/dashboard?tab=${encodeURIComponent(tab)}`;
}

export function notifyChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

// AIコンサルが用意した作業を、管理画面のいつもの入口に送る（権限・重なりの確認は各入口がいつもどおり行う）。
// 送れる入口は決めたものだけ（AIの返答に変な行き先が混ざっても送らない）
const ALLOWED_ACTION_PATHS = [
  ['POST', /^\/api\/provider\/reservations\/manual$/],
  ['PATCH', /^\/api\/reservations\/[0-9a-f-]{36}$/i],
  ['POST', /^\/api\/provider\/customer-packages$/],
  ['POST', /^\/api\/provider\/dormant-settings$/],
  ['PATCH', /^\/api\/provider\/features$/],
];
export async function runDashboardAction(method, path, body) {
  if (!ALLOWED_ACTION_PATHS.some(([m, re]) => m === method && re.test(path))) throw new Error('この作業はここからは実行できません');
  const token = getToken();
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body || {}) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'できませんでした');
  return d;
}
