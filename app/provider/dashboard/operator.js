// 操作ログに残す「いま操作している人」。この端末のブラウザにだけ保存する
const KEY = 'fineme:operator';

export function getOperator() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function setOperator(name) {
  try {
    const v = String(name || '').trim().slice(0, 40);
    if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY);
  } catch {}
}

// 店舗向けの変更系リクエストに操作者名を添える。サーバーは名前を表示用に保存するだけで、認証には使わない
export function withOperator(input, init) {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    if (method === 'GET' || !(url.startsWith('/api/provider/') || url.startsWith('/api/reservations/'))) return init;
    const name = getOperator();
    if (!name) return init;
    const h = init?.headers;
    if (h && (typeof h.forEach === 'function' && !Array.isArray(h) && typeof h.append === 'function')) return init;
    const headers = Array.isArray(h) ? Object.fromEntries(h) : { ...(h || {}) };
    headers['x-fineme-operator'] = encodeURIComponent(name);
    return { ...init, headers };
  } catch { return init; }
}
