// ユーザー属性（年代）の単一の真実。lib/track.js と同じ設計。
// Me Scan・Mirror開始時に必須で聞き、Me Scanの理想スコア初期値・Mirror分析プロンプト・
// New Me Mapのステップ生成プロンプトの3箇所で使う（でお指摘 2026-08-01：年代で
// 肌ケア・体づくりへのアプローチは変わるべきなのに、これまで年代を扱う仕組みが無かった）。

export const AGE_BANDS = {
  '10s':      { id: '10s',      label: '10代' },
  '20s':      { id: '20s',      label: '20代' },
  '30s':      { id: '30s',      label: '30代' },
  '40s':      { id: '40s',      label: '40代' },
  '50s_plus': { id: '50s_plus', label: '50代以上' },
};

export const ATTR_KEY = 'fineme:attributes';

export function isAgeBandId(v) {
  return !!v && Object.prototype.hasOwnProperty.call(AGE_BANDS, v);
}

// 端末に保存されている属性。無ければ空オブジェクト。
export function getLocalAttributes() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
}

// 今回必須にしている項目（年代）が揃っているか。
export function hasRequiredAttributes(attrs) {
  return isAgeBandId(attrs?.age_band);
}

export function saveAttributesLocal(attrs) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(ATTR_KEY, JSON.stringify(attrs || {})); } catch {}
}

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return null;
    return JSON.parse(localStorage.getItem(sbKey) || 'null')?.access_token || null;
  } catch { return null; }
}

// ログイン中の属性をサーバと突き合わせる。
// サーバに値があればそれを正とし、無ければローカルの確定値を昇格させる。
// lib/track.js の syncTrackWithServer() と同型。
export async function syncAttributesWithServer() {
  const local = getLocalAttributes();
  const token = getAuthToken();
  if (!token) return local;

  try {
    const res = await fetch('/api/me/attributes', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      if (isAgeBandId(data?.age_band)) {
        const merged = { ...local, age_band: data.age_band };
        saveAttributesLocal(merged);
        return merged;
      }
    }
  } catch {}

  if (isAgeBandId(local?.age_band)) {
    try {
      await fetch('/api/me/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ age_band: local.age_band }),
      });
    } catch {}
  }
  return local;
}

// ログイン直後に、端末に残っている属性をサーバへ引き継ぐ。
// lib/track.js の syncLocalDiagnosisToServer() と同じ考え方。
export async function syncLocalAttributesToServer(accessToken) {
  if (typeof window === 'undefined' || !accessToken) return false;
  const local = getLocalAttributes();
  if (!isAgeBandId(local?.age_band)) return false;
  try {
    await fetch('/api/me/attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ age_band: local.age_band }),
    });
    return true;
  } catch { return false; }
}

// 確定した属性を保存する（登録・変更どちらも同じ経路）。
export function saveAttribute(patch) {
  const merged = { ...getLocalAttributes(), ...patch };
  saveAttributesLocal(merged);
  return merged;
}
