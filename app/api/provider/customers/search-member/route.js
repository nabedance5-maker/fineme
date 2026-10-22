// GET /api/provider/customers/search-member?q=... → Fineme会員をお名前・電話番号で検索
// カレンダーで店舗が手動登録した予約（電話予約等）を、後からFineme会員と紐付けられる
// ようにするための検索（でお要望2026-09-14：「Finemeの会員情報と後からでもその時でも
// 紐づけられるように」）。既存の「会員と紐付ける」（カルテのmanual_customers用）は
// 自店舗に連携済みの会員しか選べなかったが、こちらは未連携の会員も含め全体から探せる
// 必要があるため新設。プライバシー配慮のため、①検索語は3文字以上必須 ②電話番号は
// 下4桁以外マスクして返す ③件数は上限8件、に絞る。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length <= 4) return phone;
  return '***-****-' + digits.slice(-4);
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (!q) return Response.json([]);
  const esc = q.replace(/[%_]/g, c => '\\' + c);

  // このお店のお客様（会員・非会員とも。でお要望 2026-10-22：予約入力で名前を入れたら候補が出るように）を先に出す。
  // お店が登録した情報なので1文字から探せ、電話番号もそのまま出す
  const [{ data: pr }, { data: mc }] = await Promise.all([
    supabase.from('provider_customer_profiles').select('user_id, manual_customer_id, last_name, first_name, last_name_kana, first_name_kana, phone')
      .eq('provider_id', provider.id)
      .or(`phone.ilike.%${esc}%,last_name.ilike.%${esc}%,first_name.ilike.%${esc}%,last_name_kana.ilike.%${esc}%,first_name_kana.ilike.%${esc}%`).limit(10),
    supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('provider_id', provider.id).ilike('display_name', `%${esc}%`).limit(10),
  ]);
  const storeHits = [];
  const seenStore = new Set();
  (pr || []).forEach(p => {
    const key = p.user_id || `m:${p.manual_customer_id}`;
    if (seenStore.has(key)) return; seenStore.add(key);
    storeHits.push({ id: p.user_id || null, manual_id: p.manual_customer_id || null, name: [p.last_name, p.first_name].filter(Boolean).join(' ') || '(お名前未登録)', maskedPhone: p.phone || '', phone: p.phone || '', store_customer: true });
  });
  (mc || []).forEach(m => {
    const key = m.linked_user_id || `m:${m.id}`;
    if (seenStore.has(key)) return; seenStore.add(key);
    storeHits.push({ id: m.linked_user_id || null, manual_id: m.id, name: m.display_name || '(お名前未登録)', maskedPhone: '', phone: '', store_customer: true, manual: !m.linked_user_id });
  });
  if (q.length < 3) return Response.json(storeHits);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, last_name, first_name, display_name, phone')
    .or(`phone.ilike.%${esc}%,last_name.ilike.%${esc}%,first_name.ilike.%${esc}%,display_name.ilike.%${esc}%`)
    .limit(8);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const seen = new Set(storeHits.map(h => h.id).filter(Boolean));
  const results = storeHits.concat((data || []).filter(p => !seen.has(p.id)).map(p => ({
    id: p.id,
    name: [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || '(お名前未登録)',
    maskedPhone: maskPhone(p.phone),
  }))).slice(0, 10);
  return Response.json(results);
}
