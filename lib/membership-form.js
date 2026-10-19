// 入会フォームの項目（でお要望 2026-10-19：hacomono差分 #10）。店舗が項目ごとに「聞かない／任意／必須」を選ぶ。
// 姓・名・電話番号は連絡と本人確認に欠かせないため常に必須。
export const FORM_FIELDS = [
  { key: 'kana', label: 'フリガナ', def: 'hidden' },
  { key: 'gender', label: '性別', def: 'hidden' },
  { key: 'birthdate', label: '生年月日', def: 'optional' },
  { key: 'postal_code', label: '郵便番号', def: 'optional' },
  { key: 'address', label: 'ご住所', def: 'optional' },
  { key: 'emergency', label: '緊急連絡先', def: 'optional' },
];
export const FIELD_STATES = ['hidden', 'optional', 'required'];

export function normalizeFormFields(raw) {
  const out = {};
  FORM_FIELDS.forEach(f => { out[f.key] = FIELD_STATES.includes(raw?.[f.key]) ? raw[f.key] : f.def; });
  return out;
}

// 申込内容が店舗の設定どおりか確かめる（エラーなら文言を返す）
export function checkRequired(fields, b) {
  const need = (k, ok, label) => (fields[k] === 'required' && !ok ? `${label}を入力してください` : null);
  return need('kana', b.last_name_kana?.trim() && b.first_name_kana?.trim(), 'フリガナ')
    || need('gender', ['female', 'male', 'other'].includes(b.gender), '性別')
    || need('birthdate', /^\d{4}-\d{2}-\d{2}$/.test(b.birthdate || ''), '生年月日')
    || need('postal_code', String(b.postal_code || '').replace(/\D/g, '').length === 7, '郵便番号')
    || need('address', b.address?.trim(), 'ご住所')
    || need('emergency', b.emergency_contact_name?.trim() && b.emergency_contact_phone?.trim(), '緊急連絡先（お名前・電話番号）')
    || null;
}
