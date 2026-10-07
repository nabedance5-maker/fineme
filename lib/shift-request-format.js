// シフト希望の「提出のしかた」（でお要望2026-10-07）。店舗ごと・募集ごとに決め、
// 雇用形態ごと・スタッフ個別にも変えられる。優先順は スタッフ個別 > 雇用形態 > 基本。
//   free      : 出勤希望・休み希望のどちらでも出せる
//   off_only  : 休み希望だけ（max_off_days で日数の上限を決められる）。休み以外の日は
//               自動作成で労働条件の範囲内に配置される（lib/shift-generator.js の availability）
//   work_time : 出勤希望を時間帯つきで出す（休み希望は出さない）。希望した日時だけに入る
import { EMPLOYMENT_TYPES } from './shift-labor.js';

export const REQUEST_MODES = {
  free: '出勤・休みどちらでも',
  off_only: '休み希望だけ',
  work_time: '出勤希望（時間帯つき）だけ',
};

export const DEFAULT_FORMAT = { default: { mode: 'free', max_off_days: null }, by_employment_type: {}, by_staff: {} };

function normalizeRule(r) {
  if (!r || !REQUEST_MODES[r.mode]) return null;
  const n = Number(r.max_off_days);
  const max = r.mode === 'work_time' || r.max_off_days === null || r.max_off_days === undefined || r.max_off_days === '' || !Number.isFinite(n) || n < 0
    ? null : Math.min(Math.floor(n), 31);
  return { mode: r.mode, max_off_days: max };
}

export function normalizeFormat(f) {
  const out = { default: normalizeRule(f?.default) || { ...DEFAULT_FORMAT.default }, by_employment_type: {}, by_staff: {} };
  Object.entries(f?.by_employment_type || {}).forEach(([k, r]) => {
    const n = normalizeRule(r);
    if (EMPLOYMENT_TYPES[k] && n) out.by_employment_type[k] = n;
  });
  Object.entries(f?.by_staff || {}).forEach(([k, r]) => {
    const n = normalizeRule(r);
    if (/^[0-9a-f-]{36}$/i.test(k) && n) out.by_staff[k] = n;
  });
  return out;
}

export function resolveRule(format, staffId, employmentType) {
  const f = normalizeFormat(format);
  return f.by_staff[staffId] || (employmentType && f.by_employment_type[employmentType]) || f.default;
}

export function describeRule(rule) {
  if (!rule) return REQUEST_MODES.free;
  const base = REQUEST_MODES[rule.mode] || REQUEST_MODES.free;
  return rule.max_off_days !== null && rule.max_off_days !== undefined && rule.mode !== 'work_time' ? `${base}（休みは${rule.max_off_days}日まで）` : base;
}
