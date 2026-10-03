// POST /api/provider/slots/bulk → 複数の枠をまとめて操作
// 空き枠タブが「1件ずつしか締切/削除できず、自動生成で増えた大量の枠に対応できない」
// との指摘（でお報告2026-09-14）を受けて新設。祝日で丸ごと締め切りたい、といった
// 日単位の操作をワンクリックで行えるようにする。
// でお要望2026-09-28「複数選択でまとめて編集できるようにしたい」に対応し、日付＋
// スタッフ/部屋の絞り込みに加えて、slot_ids（表からチェックした任意の枠のID配列）
// でも対象を指定できるようにした。両方指定された場合はslot_idsを優先する。
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

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { action, date, staff_id, resource_id, slot_ids } = body;
  if (!['close', 'open', 'delete'].includes(action)) {
    return Response.json({ error: 'action（close/open/delete）は必須です' }, { status: 400 });
  }
  if (!date && !(Array.isArray(slot_ids) && slot_ids.length)) {
    return Response.json({ error: 'dateまたはslot_idsのいずれかが必要です' }, { status: 400 });
  }

  let ids;
  if (Array.isArray(slot_ids) && slot_ids.length) {
    // 自店舗の枠かどうかを確認してから対象にする（他店舗のIDを紛れ込ませて
    // 操作されることを防ぐ）。
    const { data: targets, error: findError } = await supabase
      .from('provider_slots').select('id').eq('provider_id', provider.id).in('id', slot_ids);
    if (findError) return Response.json({ error: findError.message }, { status: 500 });
    ids = (targets || []).map(t => t.id);
  } else {
    let query = supabase.from('provider_slots').select('id').eq('provider_id', provider.id).eq('date', date);
    if (staff_id) query = query.eq('staff_id', staff_id);
    if (resource_id) query = query.eq('resource_id', resource_id);
    const { data: targets, error: findError } = await query;
    if (findError) return Response.json({ error: findError.message }, { status: 500 });
    ids = (targets || []).map(t => t.id);
  }
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

export const POST = withAudit(__POST);
