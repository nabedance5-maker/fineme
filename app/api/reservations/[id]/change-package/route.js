// POST /api/reservations/[id]/change-package → 来店後に使用チケットを変更/取消する
// でお要望2026-09-27：「実際行った時にその場でもしかしたら内容が変わるかもしれない
// から、その時は店舗側で予約時の利用チケットを変更できるようにしておく」。
// 現在紐づいている消化（package_usages）があればソフト取消し、新しいチケットが
// 指定されていればそちらへ消化し直す。package_idにnullを渡すと「チケット未使用」に
// 戻せる（誤って自動消化された場合の取消としても使える）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase.from('reservations').select('id, provider_id, user_id, package_id').eq('id', id).eq('provider_id', provider.id).single();
  if (!reservation) return Response.json({ error: '予約が見つかりません' }, { status: 404 });

  const { package_id: newPackageId } = await request.json().catch(() => ({}));

  if ((newPackageId || null) === (reservation.package_id || null)) {
    return Response.json({ ok: true, unchanged: true });
  }

  // 新しいチケットを指定する場合は、本人が実際に持っているこの店舗のチケットかを確認
  let newPackage = null;
  if (newPackageId) {
    const { data } = await supabase.from('customer_packages').select('id, package_name, package_type, total_sessions, expires_at').eq('id', newPackageId).eq('user_id', reservation.user_id).eq('provider_id', provider.id).maybeSingle();
    if (!data) return Response.json({ error: '指定されたチケットが見つかりません' }, { status: 404 });
    if (data.expires_at && new Date(data.expires_at) < new Date()) return Response.json({ error: 'このチケットは有効期限切れです' }, { status: 400 });
    if (data.package_type !== 'unlimited') {
      const { count } = await supabase.from('package_usages').select('id', { count: 'exact', head: true }).eq('customer_package_id', data.id).is('undone_at', null);
      if ((count || 0) >= data.total_sessions) return Response.json({ error: 'このチケットは残り回数がありません' }, { status: 400 });
    }
    newPackage = data;
  }

  // 現在この予約に紐づいている消化があれば取り消す
  const { data: currentUsage } = await supabase.from('package_usages').select('id').eq('reservation_id', id).is('undone_at', null).maybeSingle();
  if (currentUsage) {
    await supabase.from('package_usages').update({ undone_at: new Date().toISOString() }).eq('id', currentUsage.id);
  }

  if (newPackage) {
    const { error: insertError } = await supabase.from('package_usages').insert({ customer_package_id: newPackage.id, reservation_id: id });
    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from('reservations').update({ package_id: newPackageId || null }).eq('id', id);

  return Response.json({ ok: true, package_name: newPackage?.package_name || null });
}

export const POST = withAudit(__POST);
