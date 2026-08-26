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
  'entry_type',
];

function pick(data) {
  const out = {};
  for (const f of FIELDS) if (data[f] !== undefined) out[f] = data[f];
  return out;
}

export async function listLogs() {
  const token = getAccessToken();
  if (!token) return sortLogs(readGuest().filter(l => l.active !== false));
  const r = await fetch('/api/me/service-logs', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    // 401 = access_token が期限切れ/無効。「登録0件」と区別しないと
    // データが消えたように見えてしまうため、専用エラーとして投げる。
    throw new Error(r.status === 401 ? 'expired_session' : 'load_failed');
  }
  const d = await r.json();
  return d.logs || [];
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

/**
 * 「行った」を記録する。履歴を1行積み増しつつ、親ログの last_visit/next_visit も
 * 従来どおり更新する（cron の通知ロジックは親ログの値しか見ないため必須）。
 * updateLog() と違い上書きではなく追記——history用に分けた専用関数。
 * @param {string} id       ログのid
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {Promise<object|null>} 更新後のログ
 */
export async function recordVisit(id, dateStr) {
  const token = getAccessToken();
  if (!token) {
    const logs = readGuest();
    const i = logs.findIndex(l => l.id === id);
    if (i < 0) return null;
    const prev = logs[i];
    const visits = Array.isArray(prev.visits) ? prev.visits.slice() : [];
    visits.push({ visited_at: dateStr, cost: null, created_at: new Date().toISOString() });
    logs[i] = { ...prev, visits, last_visit: dateStr, next_visit: null };
    writeGuest(logs);
    return logs[i];
  }
  const r = await fetch(`/api/me/service-logs/${id}/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ visited_at: dateStr }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '記録に失敗しました');
  return (await r.json()).log;
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
      if (!r.ok) { remaining.push(g); continue; }
      moved++;
      // 「行った」履歴（visits）は別テーブル管理のため pick() に含まれない。
      // 引き継がないと過去の来店記録だけ消えるため、作成後に個別で積み直す。
      const newId = (await r.json().catch(() => ({})))?.log?.id;
      if (newId && Array.isArray(g.visits) && g.visits.length) {
        for (const v of g.visits) {
          if (!v?.visited_at) continue;
          try {
            await fetch(`/api/me/service-logs/${newId}/visits`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ visited_at: v.visited_at }),
            });
          } catch {}
        }
        // /visits はPOSTのたびに親のnext_visitをnullで上書きするため、
        // ゲスト側で予約済みだった次回予定日を最後に復元する。
        try {
          await fetch(`/api/me/service-logs/${newId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ last_visit: g.last_visit || null, next_visit: g.next_visit || null }),
          });
        } catch {}
      }
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
