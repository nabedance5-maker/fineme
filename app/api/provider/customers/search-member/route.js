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

  // このお店の会員（でお要望 2026-10-22）を先に出す。お店が登録した情報なので1文字から探せる
  const { data: mem } = await supabase.from('provider_store_members').select('user_id').eq('provider_id', provider.id).eq('status', 'active');
  const memIds = (mem || []).map(m => m.user_id);
  let storeHits = [];
  if (memIds.length) {
    const { data: pr } = await supabase.from('provider_customer_profiles').select('user_id, last_name, first_name, last_name_kana, first_name_kana, phone')
      .eq('provider_id', provider.id).in('user_id', memIds)
      .or(`phone.ilike.%${esc}%,last_name.ilike.%${esc}%,first_name.ilike.%${esc}%,last_name_kana.ilike.%${esc}%,first_name_kana.ilike.%${esc}%`).limit(8);
    storeHits = (pr || []).map(p => ({ id: p.user_id, name: [p.last_name, p.first_name].filter(Boolean).join(' ') || '(お名前未登録)', maskedPhone: p.phone || '', store_member: true }));
  }
  if (q.length < 3) return Response.json(storeHits);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, last_name, first_name, display_name, phone')
    .or(`phone.ilike.%${esc}%,last_name.ilike.%${esc}%,first_name.ilike.%${esc}%,display_name.ilike.%${esc}%`)
    .limit(8);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const seen = new Set(storeHits.map(h => h.id));
  const results = storeHits.concat((data || []).filter(p => !seen.has(p.id)).map(p => ({
    id: p.id,
    name: [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || '(お名前未登録)',
    maskedPhone: maskPhone(p.phone),
  }))).slice(0, 10);
  return Response.json(results);
}
