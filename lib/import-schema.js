// 他のサービスからの乗り換え：CSVの取り込み（2026-10-30 渡邉要望）。
// 他社のCSVは列も書き方もバラバラなので、AI（/api/provider/import/analyze）が「どの種類のデータか」と
// 「どの列がFinemeのどの項目か」を決め、お店が確認画面で直してから取り込む（/api/provider/import/commit）。
// ここは画面とサーバーで共通の、取り込める種類・項目の定義と、値の整え方。

export const IMPORT_TYPES = {
  customers: {
    label: '顧客',
    help: 'お客様の名前・連絡先・生年月日など',
    fields: [
      ['name', '氏名（姓名がひとつの列）'], ['last_name', '姓'], ['first_name', '名'],
      ['kana', 'フリガナ（ひとつの列）'], ['last_name_kana', 'セイ'], ['first_name_kana', 'メイ'],
      ['phone', '電話番号'], ['email', 'メールアドレス'], ['gender', '性別'], ['birthday', '生年月日'],
      ['postal_code', '郵便番号'], ['prefecture', '都道府県'], ['city', '市区町村'], ['address1', '住所'], ['address2', '建物名など'],
      ['member_number', '前のサービスの会員番号'], ['registered_at', '登録日・入会日'], ['memo', 'メモ・備考'],
      ['emergency_name', '緊急連絡先（名前）'], ['emergency_phone', '緊急連絡先（電話）'],
    ],
    need: [['name', 'last_name']],
  },
  reservations: {
    label: '予約・来店履歴',
    help: 'これからの予約と、過去に来店した記録（日付が今日より前のものは来店履歴になります）',
    fields: [
      ['date', '日付'], ['start_time', '開始時刻'], ['end_time', '終了時刻'], ['datetime', '日時（日付と時刻がひとつの列）'],
      ['customer_name', 'お客様の名前'], ['customer_phone', 'お客様の電話番号'], ['customer_email', 'お客様のメール'],
      ['menu_name', 'メニュー・コース名'], ['staff_name', '担当スタッフ'], ['status', '状態（予約・来店・キャンセルなど）'],
      ['price', '金額'], ['memo', 'メモ'],
    ],
    need: [['date', 'datetime'], ['customer_name', 'customer_phone', 'customer_email']],
  },
  tickets: {
    label: '回数券・チケットの残り',
    help: 'お客様ごとの回数券・チケットの残り回数と有効期限',
    fields: [
      ['customer_name', 'お客様の名前'], ['customer_phone', 'お客様の電話番号'], ['customer_email', 'お客様のメール'],
      ['ticket_name', '回数券・チケット名'], ['remaining', '残り回数'], ['total', '全体の回数'], ['used', '使った回数'],
      ['purchased_at', '購入日'], ['expires_at', '有効期限'],
    ],
    need: [['customer_name', 'customer_phone', 'customer_email'], ['remaining', 'total']],
  },
  memberships: {
    label: '会員プラン（月額）',
    help: 'お客様ごとの月額プランの契約。カードの引き落としは引き継げないため、お客様のメモに残し、Finemeでの入会のご案内につなげます',
    fields: [
      ['customer_name', 'お客様の名前'], ['customer_phone', 'お客様の電話番号'], ['customer_email', 'お客様のメール'],
      ['plan_name', 'プラン名'], ['monthly_fee', '月額'], ['started_at', '開始日・入会日'], ['status', '状態（在籍・休会・退会など）'], ['memo', 'メモ'],
    ],
    need: [['customer_name', 'customer_phone', 'customer_email'], ['plan_name']],
  },
  shifts: {
    label: 'シフト',
    help: 'スタッフごとの勤務予定',
    fields: [['staff_name', 'スタッフ名'], ['date', '日付'], ['start_time', '開始時刻'], ['end_time', '終了時刻']],
    need: [['staff_name'], ['date'], ['start_time'], ['end_time']],
  },
  attendance: {
    label: '勤怠（打刻）',
    help: 'スタッフごとの出勤・退勤・休憩の時刻',
    fields: [['staff_name', 'スタッフ名'], ['date', '日付'], ['clock_in', '出勤時刻'], ['clock_out', '退勤時刻'], ['break_start', '休憩開始'], ['break_end', '休憩終了']],
    need: [['staff_name'], ['date'], ['clock_in']],
  },
};

export const MAX_IMPORT_ROWS = 20000;
export const IMPORT_CHUNK = 300;

// 足りない必須項目（どれか1つでよい組ごと）
export function missingRequired(type, mapping) {
  const def = IMPORT_TYPES[type];
  if (!def) return ['種類'];
  const label = k => def.fields.find(f => f[0] === k)?.[1] || k;
  return def.need.filter(group => !group.some(k => Number.isInteger(mapping?.[k]))).map(group => group.map(label).join('または'));
}

// ── CSV ──
export function decodeCsvBytes(buf) {
  const bytes = new Uint8Array(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, ''); } catch { /* Shift_JIS（日本の業務システムに多い） */ }
  return new TextDecoder('shift_jis').decode(bytes);
}

export function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  const s = String(text || '');
  const delim = (s.split('\n')[0].match(/\t/g) || []).length > (s.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  return rows;
}

// ── 値の整え方 ──
const z2h = v => String(v ?? '').replace(/[０-９Ａ-Ｚａ-ｚ：／－]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ').trim();
const pad = n => String(n).padStart(2, '0');
const ERA = { R: 2018, 令和: 2018, H: 1988, 平成: 1988, S: 1925, 昭和: 1925 };

export function normDate(v) {
  let s = z2h(v);
  if (!s) return null;
  if (/^\d{5}$/.test(s)) { // Excelの日付の番号
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  let m = s.match(/^(令和|平成|昭和|[RHS])\s*(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})/);
  if (m) return `${ERA[m[1]] + (m[2] === '元' ? 1 : Number(m[2]))}-${pad(m[3])}-${pad(m[4])}`;
  m = s.match(/^(\d{4})[年./-]\s*(\d{1,2})[月./-]\s*(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  return null;
}

export function normTime(v) {
  const s = z2h(v);
  if (!s) return null;
  let m = s.match(/(\d{1,2})[:時](\d{2})?(半)?/);
  if (m) { const h = Number(m[1]), mi = m[3] ? 30 : Number(m[2] || 0); return h <= 30 && mi < 60 ? `${pad(h % 24)}:${pad(mi)}` : null; }
  m = s.match(/^(\d{3,4})$/);
  if (m) { const n = m[1].padStart(4, '0'); return `${n.slice(0, 2)}:${n.slice(2)}`; }
  return null;
}

// 「2026/10/30 10:00」のような日時の列
export function normDateTime(v) {
  const s = z2h(v);
  const date = normDate(s);
  const t = s.replace(/^[^\s T]+[\sT]+/, '');
  return { date, time: t !== s ? normTime(t) : null };
}

export const normPhone = v => { const d = z2h(v).replace(/[^\d+]/g, ''); return d.length >= 9 ? d : null; };
export const normEmail = v => { const s = z2h(v).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null; };
export const normInt = v => { const n = parseInt(z2h(v).replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : null; };
export function normGender(v) {
  const s = z2h(v).toLowerCase();
  if (!s) return null;
  if (/^(男|男性|m|male|1)$/.test(s)) return 'male';
  if (/^(女|女性|f|female|2)$/.test(s)) return 'female';
  return 'other';
}
export function splitName(full) {
  const s = z2h(full).replace(/\s+/g, ' ');
  if (!s) return [null, null];
  const i = s.indexOf(' ');
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, null];
}
// 状態の列から：来店済み・キャンセル・それ以外（予約）
export function normStatus(v) {
  const s = z2h(v);
  if (/キャンセル|取消|取り消|cancel|無断/i.test(s)) return 'cancelled';
  if (/来店|来館|完了|済|visited|done|出席|受講/i.test(s)) return 'visited';
  return s ? 'booked' : null;
}

// 1行を、項目名→値 にする（マッピングは 項目名→列番号）
export function pick(row, mapping) {
  const out = {};
  Object.entries(mapping || {}).forEach(([k, idx]) => { if (Number.isInteger(idx) && idx >= 0) out[k] = String(row[idx] ?? '').trim(); });
  return out;
}
