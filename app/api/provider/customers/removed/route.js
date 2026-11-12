// GET /api/provider/customers/removed → このお店がメンバー一覧から外したお客様（元に戻すため。お店のオーナーのみ）
// 2026-11-12 渡邉指摘：間違えて消した時に戻せるように。お名前・外した日時・外した人だけを返す（連絡先等は返さない）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { removedUserIds } from '@/lib/customer-removals';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const still = await removedUserIds(supabase, provider.id);
  const { data: rows } = await supabase.from('provider_customer_removals').select('user_id, removed_at, removed_by').eq('provider_id', provider.id).order('removed_at', { ascending: false }).limit(200);
  const list = (rows || []).filter(r => still.has(r.user_id));
  const ids = list.map(r => r.user_id);
  const names = {};
  if (ids.length) {
    const [{ data: cp }, { data: pr }] = await Promise.all([
      supabase.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', provider.id).in('user_id', ids),
      supabase.from('profiles').select('id, display_name, last_name, first_name').in('id', ids),
    ]);
    (pr || []).forEach(p => { names[p.id] = [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || ''; });
    (cp || []).forEach(p => { const n = [p.last_name, p.first_name].filter(Boolean).join(' '); if (n) names[p.user_id] = n; });
  }
  return Response.json(list.map(r => ({ user_id: r.user_id, name: names[r.user_id] || 'お名前未登録', removed_at: r.removed_at, removed_by: r.removed_by })));
}
