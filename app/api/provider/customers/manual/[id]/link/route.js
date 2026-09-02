// POST /api/provider/customers/manual/[id]/link → 非会員のお客様を実際のFineme会員に紐付ける（認証済み）
//
// 「この非会員は実はこのお客様でした」を店舗自身が確認して選ぶ方式（自動照合はしない。
// 電話番号等での自動マッチは誤爆時に他人のカルテが漏れる事故になるため避けた）。
// 紐付け後は削除せず linked_user_id を立てるだけ。非会員時代のカルテ記録は
// manual_customer_id のまま残り、会員側のカルテ取得時に合算して表示する
// （app/api/provider/customers/[user_id]/karte-entries/route.js参照）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id } = await request.json();
  if (!user_id) return Response.json({ error: 'user_id は必須です' }, { status: 400 });

  // なりすまし防止：紐付け先は実際にこの店舗にNew Me Logを紐づけている会員のみ許可
  const { data: linked } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('provider_slug', provider.slug)
    .eq('user_id', user_id)
    .eq('active', true)
    .limit(1)
    .single();
  if (!linked) return Response.json({ error: '指定されたお客様は貴店に紐づく会員として見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .update({ linked_user_id: user_id, linked_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
