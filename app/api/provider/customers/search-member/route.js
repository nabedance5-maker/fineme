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
  if (q.length < 3) return Response.json({ error: '3文字以上で検索してください' }, { status: 400 });

  const esc = q.replace(/[%_]/g, c => '\\' + c);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, last_name, first_name, display_name, phone')
    .or(`phone.ilike.%${esc}%,last_name.ilike.%${esc}%,first_name.ilike.%${esc}%,display_name.ilike.%${esc}%`)
    .limit(8);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = (data || []).map(p => ({
    id: p.id,
    name: [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || '(お名前未登録)',
    maskedPhone: maskPhone(p.phone),
  }));
  return Response.json(results);
}
