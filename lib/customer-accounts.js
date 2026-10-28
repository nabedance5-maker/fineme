// お客様のアカウント（でお要望 2026-10-22）。
// チケット・予約・月額プランはどれも Fineme アカウント（user_id）で持つため、お店がメールアドレスでお客様を追加した時や、
// 非会員のお客様にチケットを付ける時に、アカウントを用意して顧客の基本情報（provider_customer_profiles）に紐づける。
// ※ チケット・予約の可否は月額プランや回数券・チケットを持っているかで判定する（でお指摘 2026-10-22）。
//   「会員登録してから予約・入会」はお店が選んだ時だけ（2026-10-28。lib/store-member.js）。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const s = (v, n = 60) => String(v ?? '').trim().slice(0, n) || null;

// お客様の追加の入力を、顧客の基本情報の形にする
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
  // auth.users はメールで直接引けないため、ページを順に見る（お店がお客様を追加する回数は少ない）
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

// このお店のお客様か（基本情報・予約・回数券/チケット・入会のどれかでつながっている）
export async function isStoreCustomer(providerId, userId) {
  if (!userId) return false;
  const checks = await Promise.all([
    supabase.from('provider_customer_profiles').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
    supabase.from('reservations').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
    supabase.from('customer_packages').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
    supabase.from('provider_memberships').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
  ]);
  return checks.some(c => (c.data || []).length > 0);
}

// 非会員のお客様に、チケットを持てるようアカウントを用意して紐づける（でお要望 2026-10-22：非会員の方の回数券・チケットも管理したい）。
// メールが無ければ届かないアドレスでアカウントだけ作る。既に紐づいていればそのアカウントを返す。
export async function ensureManualLinked(providerId, manualId, email) {
  const { data: mc } = await supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('id', manualId || '').eq('provider_id', providerId).maybeSingle();
  if (!mc) return { error: 'お客様が見つかりません' };
  if (mc.linked_user_id) return { userId: mc.linked_user_id, existed: true };
  const e = String(email || '').trim().toLowerCase();
  const found = await findOrCreateUser(e || `member-${crypto.randomUUID()}@noemail.fineme.invalid`);
  const userId = found.user.id;
  await supabase.from('provider_manual_customers').update({ linked_user_id: userId, linked_at: new Date().toISOString() }).eq('id', mc.id);
  const [last, ...rest] = String(mc.display_name || '').trim().split(/\s+/);
  await upsertProfile(providerId, userId, { last_name: last || null, first_name: rest.join(' ') || null, email: e || null }, 'お店で登録');
  return { userId, existed: found.existed };
}
