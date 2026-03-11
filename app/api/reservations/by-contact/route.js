// GET /api/reservations/by-contact?contact=xxx
// ユーザーが連絡先(email)で自分の予約を検索する
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contact = searchParams.get('contact')?.trim();

  if (!contact) return Response.json({ error: 'contact は必須です' }, { status: 400 });

  const db = getSupabase();
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
