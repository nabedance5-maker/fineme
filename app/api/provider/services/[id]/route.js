// PATCH /api/provider/services/[id] - サービス更新
// DELETE /api/provider/services/[id] - サービス削除
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { normalizeTicketRule } from '@/lib/booking-eligibility';
import { normalizeAssignees } from '@/lib/menu-assign';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderFromToken(token) {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data;
}

async function __PATCH(request, { params }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { id } = params;
  const body = await request.json();
  const allowed = ['name','description','price','duration','duration_minutes','is_featured','sort_order','image_url','suitable_path_types','transformation_promise','target_axis','before_text','after_text','before_image_url','after_image_url','benefit_list','category','is_trial','axes'];
  const updates = {};
  for (const k of allowed) { if (body[k] !== undefined) updates[k] = body[k]; }
  if (updates.price !== undefined) updates.price = Number(updates.price) || 0;
  // 予約画面でスタッフを選ばせない・お一人様◯回まで（2026-10-27）
  if (body.hide_staff_select !== undefined) updates.hide_staff_select = !!body.hide_staff_select;
  if (body.per_customer_limit !== undefined) { const n = parseInt(body.per_customer_limit, 10); updates.per_customer_limit = Number.isInteger(n) && n >= 1 ? Math.min(n, 99) : null; }
  if (updates.axes !== undefined) updates.axes = Array.isArray(updates.axes) ? updates.axes.map(String).slice(0, 20) : [];
  // 予約できる人（でお要望 2026-10-20）
  const scope = await normalizeTicketRule(supabase, provider.id, body); // 使えるチケット・枚数・会員には表示しない（2026-10-22）
  Object.assign(updates, scope);
  // 担当できるスタッフ・使う部屋（でお要望 2026-10-21）
  Object.assign(updates, await normalizeAssignees(supabase, provider.id, { ...(Array.isArray(body.staff_ids) ? { staff_ids: body.staff_ids } : {}), ...(Array.isArray(body.resource_ids) ? { resource_ids: body.resource_ids } : {}) }));

  const { data, error } = await supabase
    .from('provider_services')
    .update(updates)
    .eq('id', id).eq('provider_id', provider.id)
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { id } = params;
  const { error } = await supabase
    .from('provider_services')
    .delete().eq('id', id).eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
