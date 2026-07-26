// New Me Log のデータ置き場。ログイン有無で localStorage / API を切り替える。
// 未ログインでも全機能を使えるようにするため（LINE通知だけがアカウント必須）。

export const GUEST_KEY = 'fineme:log:guest';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return null;
    return JSON.parse(localStorage.getItem(sbKey) || 'null')?.access_token || null;
  } catch { return null; }
}

function readGuest() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeGuest(logs) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(logs)); } catch {}
}

function guestId() {
  return 'g-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 表示順をサーバ側（axis → next_visit）に揃える
function sortLogs(logs) {
  return [...logs].sort((a, b) => {
    if (a.axis !== b.axis) return String(a.axis).localeCompare(String(b.axis));
    if (!a.next_visit) return 1;
    if (!b.next_visit) return -1;
    return a.next_visit < b.next_visit ? -1 : 1;
  });
}

const FIELDS = [
  'axis', 'name', 'custom_icon', 'provider_slug', 'provider_type',
  'frequency_weeks', 'frequency_months', 'last_visit', 'next_visit', 'memo', 'cost',
];

function pick(data) {
  const out = {};
  for (const f of FIELDS) if (data[f] !== undefined) out[f] = data[f];
  return out;
}

export async function listLogs() {
  const token = getAccessToken();
  if (!token) return sortLogs(readGuest().filter(l => l.active !== false));
  try {
    const r = await fetch('/api/me/service-logs', { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    return d.logs || [];
  } catch { return []; }
}

export async function createLog(data) {
  const token = getAccessToken();
  if (!token) {
    const logs = readGuest();
    const row = { id: guestId(), active: true, created_at: new Date().toISOString(), ...pick(data) };
    logs.push(row);
    writeGuest(logs);
    return row;
  }
  const r = await fetch('/api/me/service-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(pick(data)),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '保存に失敗しました');
  return r.json();
}

export async function updateLog(id, data) {
  const token = getAccessToken();
  if (!token) {
    const logs = readGuest();
    const i = logs.findIndex(l => l.id === id);
    if (i >= 0) { logs[i] = { ...logs[i], ...pick(data) }; writeGuest(logs); }
    return logs[i] || null;
  }
  const r = await fetch(`/api/me/service-logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(pick(data)),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '保存に失敗しました');
  return r.json();
}

export async function removeLog(id) {
  const token = getAccessToken();
  if (!token) {
    writeGuest(readGuest().filter(l => l.id !== id));
    return;
  }
  await fetch(`/api/me/service-logs/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ログイン直後に、端末に残っているゲスト分をサーバへ引き継ぐ。
// 診断データの syncLocalDiagnosisToServer（lib/track.js）と同じ考え方。
export async function syncLocalLogsToServer(accessToken) {
  if (typeof window === 'undefined' || !accessToken) return 0;
  const guests = readGuest();
  if (!guests.length) return 0;

  let moved = 0;
  const remaining = [];
  for (const g of guests) {
    try {
      const r = await fetch('/api/me/service-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(pick(g)),
      });
      if (r.ok) { moved++; continue; }
      remaining.push(g);
    } catch { remaining.push(g); }
  }
  // 移せなかった分だけ残す（成功分を消して二重登録を防ぐ）
  if (remaining.length) writeGuest(remaining);
  else { try { localStorage.removeItem(GUEST_KEY); } catch {} }
  return moved;
}

export function hasGuestLogs() {
  if (typeof window === 'undefined') return false;
  return readGuest().length > 0;
}
