// GET /api/me/packages → ログイン中ユーザーが持つ回数券・パッケージ（店舗横断）と残り回数
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('customer_packages')
    .select('id, provider_id, package_id, ticket_id, package_name, total_sessions, package_type, purchased_at, expires_at, subscription_status, next_grant_at')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const ids = rows.map(r => r.id);
  const providerIds = [...new Set(rows.map(r => r.provider_id))];

  const ticketIds = [...new Set(rows.map(r => r.ticket_id).filter(Boolean))];
  const [{ data: usages }, { data: providers }, { data: svcs }, { data: lessons }] = await Promise.all([
    supabase.from('package_usages').select('customer_package_id, undone_at').in('customer_package_id', ids),
    supabase.from('providers').select('id, name, slug').in('id', providerIds),
    // このチケットで予約できるメニュー・グループレッスン（押したらその予約画面に飛べるように。でお要望 2026-10-22）
    ticketIds.length ? supabase.from('provider_services').select('id, provider_id, ticket_ids').in('provider_id', providerIds).overlaps('ticket_ids', ticketIds) : { data: [] },
    ticketIds.length ? supabase.from('provider_classes').select('id, provider_id, ticket_ids').in('provider_id', providerIds).eq('active', true).overlaps('ticket_ids', ticketIds) : { data: [] },
  ]);
  // チケットで予約する画面へのリンク：使えるメニューが1つだけならそのメニュー、レッスン1つだけならそのレッスン、
  // 複数ならそのチケットで予約できるものだけを並べた予約タブ
  const bookHref = r => {
    const slug = providerMap[r.provider_id]?.slug;
    if (!slug) return null;
    const base = `/provider/${encodeURIComponent(slug)}?tab=book`;
    if (!r.ticket_id) return base;
    const ms = (svcs || []).filter(x => x.provider_id === r.provider_id && (x.ticket_ids || []).includes(r.ticket_id));
    const ls = (lessons || []).filter(x => x.provider_id === r.provider_id && (x.ticket_ids || []).includes(r.ticket_id));
    if (ms.length === 1 && !ls.length) return `${base}&service_id=${ms[0].id}`;
    if (ls.length === 1 && !ms.length) return `${base}&class_id=${ls[0].id}`;
    return `${base}&ticket=${r.ticket_id}`;
  };

  const providerMap = {};
  (providers || []).forEach(p => { providerMap[p.id] = p; });

  const usedByPkg = {};
  (usages || []).forEach(u => {
    if (u.undone_at) return;
    usedByPkg[u.customer_package_id] = (usedByPkg[u.customer_package_id] || 0) + 1;
  });

  const result = rows.map(r => {
    const isUnlimited = r.package_type === 'unlimited';
    return {
      id: r.id,
      provider_name: providerMap[r.provider_id]?.name || '(店舗)',
      provider_slug: providerMap[r.provider_id]?.slug || null,
      package_name: r.package_name,
      total_sessions: r.total_sessions,
      package_type: r.package_type || 'fixed_count',
      used_sessions: usedByPkg[r.id] || 0,
      remaining_sessions: isUnlimited ? null : r.total_sessions - (usedByPkg[r.id] || 0),
      purchased_at: r.purchased_at,
      expires_at: r.expires_at,
      expired: r.expires_at ? new Date(r.expires_at) < new Date() : false,
      book_href: bookHref(r),
      // 使い切った・期限切れの回数券は、同じ回数券をもう一度買えるお店の回数券ページへ（でお要望 2026-10-22）
      rebuy_href: providerMap[r.provider_id]?.slug ? `/provider/${encodeURIComponent(providerMap[r.provider_id].slug)}?tab=packages${r.package_id ? `&package=${r.package_id}` : ''}` : null,
    };
  });

  return Response.json(result);
}
