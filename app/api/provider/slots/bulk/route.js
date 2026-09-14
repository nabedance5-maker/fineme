// POST /api/provider/slots/bulk → 指定日（＋任意でスタッフ・部屋）の枠をまとめて操作
// 空き枠タブが「1件ずつしか締切/削除できず、自動生成で増えた大量の枠に対応できない」
// との指摘（でお報告2026-09-14）を受けて新設。祝日で丸ごと締め切りたい、といった
// 日単位の操作をワンクリックで行えるようにする。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action, date, staff_id, resource_id } = body;
  if (!date || !['close', 'open', 'delete'].includes(action)) {
    return Response.json({ error: 'action（close/open/delete）とdateは必須です' }, { status: 400 });
  }

  let query = supabase.from('provider_slots').select('id').eq('provider_id', provider.id).eq('date', date);
  if (staff_id) query = query.eq('staff_id', staff_id);
  if (resource_id) query = query.eq('resource_id', resource_id);
  const { data: targets, error: findError } = await query;
  if (findError) return Response.json({ error: findError.message }, { status: 500 });
  const ids = (targets || []).map(t => t.id);
  if (!ids.length) return Response.json({ ok: true, count: 0 });

  if (action === 'delete') {
    const { error } = await supabase.from('provider_slots').delete().in('id', ids);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from('provider_slots').update({ is_open: action === 'open' }).in('id', ids);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, count: ids.length });
}
