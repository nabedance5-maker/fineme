// 顧客の基本情報（でお要望 2026-10-16）。店舗ごとに会員・非会員の氏名カナ・連絡先・住所・緊急連絡先を持つ。
// 画面（app/provider/dashboard）とAPI（app/api/provider/customer-profile）の共通定義。

export const PROFILE_FIELDS = [
  'last_name', 'first_name', 'last_name_kana', 'first_name_kana', 'email', 'phone', 'gender', 'birthday',
  'postal_code', 'prefecture', 'city', 'address1', 'address2', 'emergency_name', 'emergency_relation', 'emergency_phone', 'mail_opt_in',
];
export const GENDER_LABEL = { female: '女性', male: '男性', other: 'その他' };
export const PREFECTURES = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];

const str = (v, max) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// 入力値を保存できる形に整える（不正な値は null）
export function normalizeProfile(body = {}) {
  const out = {};
  if ('last_name' in body) out.last_name = str(body.last_name, 40);
  if ('first_name' in body) out.first_name = str(body.first_name, 40);
  if ('last_name_kana' in body) out.last_name_kana = str(body.last_name_kana, 40);
  if ('first_name_kana' in body) out.first_name_kana = str(body.first_name_kana, 40);
  if ('email' in body) { const e = str(body.email, 200); out.email = e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null; }
  if ('phone' in body) { const p = str(body.phone, 20); out.phone = p ? p.replace(/[^\d+\-]/g, '') || null : null; }
  if ('gender' in body) out.gender = ['female', 'male', 'other'].includes(body.gender) ? body.gender : null;
  if ('birthday' in body) out.birthday = /^\d{4}-\d{2}-\d{2}$/.test(String(body.birthday || '')) ? body.birthday : null;
  if ('postal_code' in body) { const z = String(body.postal_code || '').replace(/\D/g, ''); out.postal_code = z.length === 7 ? `${z.slice(0, 3)}-${z.slice(3)}` : (z ? z.slice(0, 8) : null); }
  if ('prefecture' in body) out.prefecture = PREFECTURES.includes(body.prefecture) ? body.prefecture : null;
  if ('city' in body) out.city = str(body.city, 60);
  if ('address1' in body) out.address1 = str(body.address1, 120);
  if ('address2' in body) out.address2 = str(body.address2, 120);
  if ('emergency_name' in body) out.emergency_name = str(body.emergency_name, 40);
  if ('emergency_relation' in body) out.emergency_relation = str(body.emergency_relation, 20);
  if ('emergency_phone' in body) { const p = str(body.emergency_phone, 20); out.emergency_phone = p ? p.replace(/[^\d+\-]/g, '') || null : null; }
  if ('mail_opt_in' in body) out.mail_opt_in = !!body.mail_opt_in;
  return out;
}

// 「東京都世田谷区奥沢5-27-19」のような1行の住所を、都道府県とそれ以降に分ける
export function splitAddress(address) {
  const a = String(address || '').trim();
  if (!a) return {};
  const pref = PREFECTURES.find(p => a.startsWith(p));
  return pref ? { prefecture: pref, address1: a.slice(pref.length).trim() || null } : { address1: a };
}

// オンライン入会の申込内容 → 基本情報
export function profileFromMembership(m) {
  if (!m) return {};
  return normalizeProfile({
    last_name: m.last_name, first_name: m.first_name, phone: m.phone, birthday: m.birthdate,
    postal_code: m.postal_code, ...splitAddress(m.address),
    emergency_name: m.emergency_contact_name, emergency_relation: m.emergency_contact_relation, emergency_phone: m.emergency_contact_phone,
  });
}

// 空欄の項目だけ、補う値で埋める（店舗が入力・修正した値は上書きしない）
export function fillEmpty(base = {}, extra = {}) {
  const out = { ...base };
  Object.entries(extra).forEach(([k, v]) => { if ((out[k] === null || out[k] === undefined || out[k] === '') && v !== null && v !== undefined && v !== '') out[k] = v; });
  return out;
}

export function ageOf(birthday, today = new Date()) {
  if (!birthday) return null;
  const [y, m, d] = birthday.split('-').map(Number);
  const t = new Date(today.getTime() + 9 * 3600 * 1000);
  let age = t.getUTCFullYear() - y;
  if (t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d)) age--;
  return age;
}
