// お店ごとの会員登録（でお要望 2026-10-28：「店舗ごとに会員登録をする設定に変更。会員になってから、予約やプラン契約ができる」）。
// お店が「会員登録してから予約・入会」をONにした時だけ、予約・月額プランの入会・回数券の購入の前に会員登録を求める。
// 会員＝このお店とつながっているお客様（基本情報・予約・回数券/チケット・入会のどれか。lib/customer-accounts.js の isStoreCustomer）。
// お店が追加したお客様や、前から通っているお客様は登録し直さなくてよい。
import { isStoreCustomer } from './customer-accounts.js';

export const MEMBER_REQUIRED_MESSAGE = 'このお店は、会員登録（無料）をしてから予約・お申し込みができます';

// 登録が必要で、まだ済んでいない時はエラーの返り値（{ error, code, status }）。問題なければ null
export async function memberGate(supabase, providerId, userId) {
  const { data: p } = await supabase.from('providers').select('require_member_registration').eq('id', providerId).maybeSingle();
  if (!p?.require_member_registration) return null;
  if (!userId) return { error: `${MEMBER_REQUIRED_MESSAGE}。お店のページの「会員登録する」から登録してください`, code: 'member_required', status: 401 };
  if (await isStoreCustomer(providerId, userId)) return null;
  return { error: MEMBER_REQUIRED_MESSAGE, code: 'member_required', status: 403 };
}
