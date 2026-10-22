// お店の会員（でお要望 2026-10-22：会員登録＝お店の会員になる。プラン契約・回数券の購入は別）。
// 会員はFinemeアカウント（auth.users）に紐づく。チケット・予約・プランはどれも user_id で持つため。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const s = (v, n = 60) => String(v ?? '').trim().slice(0, n) || null;

// 会員登録の入力（お店の画面・お客様の画面どちらも）を、顧客の基本情報の形にする
export function profileFields(b) {
  return {
    last_name: s(b.last_name, 30), first_name: s(b.first_name, 30),
    last_name_kana: s(b.last_name_kana, 30), first_name_kana: s(b.first_name_kana, 30),
    phone: s(b.phone, 20), gender: ['female', 'male', 'other'].includes(b.gender) ? b.gender : null,
    birthday: /^\d{4}-\d{2}-\d{2}$/.test(b.birthday || '') ? b.birthday : null,
    postal_code: s(b.postal_code, 10), prefecture: s(b.prefecture, 10), city: s(b.city, 40), address1: s(b.address1, 100),
  };
}

// 顧客の基本情報を入れる（空欄の項目だけ埋める。お店が入れた値は上書きしない）
export async function upsertProfile(providerId, userId, fields, by) {
  const { data: cur } = await supabase.from('provider_customer_profiles').select('*').eq('provider_id', providerId).eq('user_id', userId).maybeSingle();
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
  if (cur) {
    const patch = Object.fromEntries(Object.entries(clean).filter(([k]) => !cur[k]));
    if (Object.keys(patch).length) await supabase.from('provider_customer_profiles').update({ ...patch, updated_at: new Date().toISOString(), updated_by: by }).eq('id', cur.id);
  } else {
    await supabase.from('provider_customer_profiles').insert({ provider_id: providerId, user_id: userId, ...clean, updated_by: by });
  }
}

// メールアドレスからFinemeアカウントを探す（無ければ作る）。既にあるアカウントかどうかも返す
export async function findOrCreateUser(email) {
  const e = String(email || '').trim().toLowerCase();
  // auth.users はメールで直接引けないため、ページを順に見る（店舗の会員登録は回数が少ない）
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = (data?.users || []).find(u => (u.email || '').toLowerCase() === e);
    if (hit) return { user: hit, existed: true };
    if ((data?.users || []).length < 1000) break;
  }
  const { data, error } = await supabase.auth.admin.createUser({ email: e, email_confirm: true });
  if (error) throw error;
  return { user: data.user, existed: false };
}
