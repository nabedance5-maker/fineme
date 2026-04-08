// GET /api/reservations/by-contact?contact=xxx
// ログインユーザーが自分の予約を取得する（トークン検証で本人確認）
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const db = getSupabase();

  // トークンが提供されている場合はトークンから email を取得（なりすまし防止）
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  let contact;
  if (token) {
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    contact = user.email;
  } else {
    // 未ログインゲストの場合はクエリパラメータを使用（ゲスト予約対応）
    const { searchParams } = new URL(request.url);
    contact = searchParams.get('contact')?.trim();
  }

  if (!contact) return Response.json({ error: 'contact は必須です' }, { status: 400 });
  const { data, error } = await db
    .from('reservations')
    .select('id,provider_id,user_name,user_contact,status,reserved_date,start_time,note,provider_comment,counter_date,counter_time,confirmed_date,confirmed_time,counter_expires_at,created_at')
    .eq('user_contact', contact)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 各予約の掲載者名を付加
  const providerIds = [...new Set((data || []).map(r => r.provider_id).filter(Boolean))];
  let providerMap = {};
  if (providerIds.length > 0) {
    const { data: providers } = await db
      .from('providers')
      .select('id,name,slug')
      .in('id', providerIds);
    (providers || []).forEach(p => { providerMap[p.id] = p; });
  }

  const now = new Date();
  const result = (data || []).map(r => {
    // 期限切れ counter_proposed はクライアント側でも expired 扱い
    let status = r.status;
    if (status === 'counter_proposed' && r.counter_expires_at && new Date(r.counter_expires_at) < now) {
      status = 'expired';
    }
    return {
      ...r,
      status,
      provider_name: providerMap[r.provider_id]?.name || '',
      provider_slug: providerMap[r.provider_id]?.slug || '',
    };
  });

  return Response.json(result);
}
