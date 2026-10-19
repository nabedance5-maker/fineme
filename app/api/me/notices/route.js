// GET /api/me/notices → つながっている店舗からのお知らせ（でお要望 2026-10-19：hacomono差分 #13）
// POST {ids} → 既読にする
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { userProviderIds, isLive } from '@/lib/notices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
async function userOf(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } = {} } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
  return user || null;
}

async function visible(user) {
  const { ids, memberOf } = await userProviderIds(supabase, user.id);
  if (!ids.length) return [];
  const { data } = await supabase.from('provider_notices').select('id, provider_id, title, body, audience, pinned, publish_at, expires_at').in('provider_id', ids).lte('publish_at', new Date().toISOString()).order('publish_at', { ascending: false }).limit(200);
  return (data || []).filter(n => isLive(n) && (n.audience === 'all' || memberOf.has(n.provider_id)));
}

export async function GET(request) {
  const user = await userOf(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await visible(user);
  if (!rows.length) return Response.json({ notices: [], unread: 0 });
  const [{ data: provs }, { data: reads }] = await Promise.all([
    supabase.from('providers').select('id, name, slug').in('id', [...new Set(rows.map(r => r.provider_id))]),
    supabase.from('provider_notice_reads').select('notice_id').eq('user_id', user.id).in('notice_id', rows.map(r => r.id)),
  ]);
  const pv = Object.fromEntries((provs || []).map(p => [p.id, p]));
  const read = new Set((reads || []).map(r => r.notice_id));
  const notices = rows.map(n => ({ ...n, provider_name: pv[n.provider_id]?.name || '', provider_slug: pv[n.provider_id]?.slug || '', read: read.has(n.id) }))
    .sort((a, b) => (b.pinned - a.pinned) || (a.publish_at < b.publish_at ? 1 : -1));
  return Response.json({ notices, unread: notices.filter(n => !n.read).length });
}

export async function POST(request) {
  const user = await userOf(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const allowed = new Set((await visible(user)).map(n => n.id));
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter(id => allowed.has(id)).slice(0, 200);
  if (ids.length) await supabase.from('provider_notice_reads').upsert(ids.map(id => ({ notice_id: id, user_id: user.id })), { onConflict: 'notice_id,user_id', ignoreDuplicates: true });
  return Response.json({ ok: true, read: ids.length });
}
