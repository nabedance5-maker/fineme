// GET /api/provider/services - 自分のサービス一覧
// POST /api/provider/services - サービス追加
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { normalizeScope } from '@/lib/booking-eligibility';
import { normalizeAssignees } from '@/lib/menu-assign';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderFromToken(token) {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data;
}

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabase
    .from('provider_services')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order').order('created_at');

  return Response.json(data || []);
}

async function __POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { name, description, price, duration, duration_minutes, is_featured, sort_order, image_url, suitable_path_types, transformation_promise, target_axis, before_text, after_text, before_image_url, after_image_url, benefit_list, category, is_trial } = body;
  // 回数券・会員の方専用のメニューは0円もありうるため、価格は空でなければよい
  if (!name || price === undefined || price === null || price === '') return Response.json({ error: 'メニュー名と価格を入れてください' }, { status: 400 });
  const scope = await normalizeScope(supabase, provider.id, body);
  if (scope.error) return Response.json({ error: scope.error }, { status: 400 });
  const assign = await normalizeAssignees(supabase, provider.id, { staff_ids: body.staff_ids, resource_ids: body.resource_ids });

  const { data, error } = await supabase
    .from('provider_services')
    .insert({ provider_id: provider.id, name, description, price: Number(price), duration, duration_minutes: duration_minutes ? Number(duration_minutes) : null, is_featured: !!is_featured, sort_order: Number(sort_order)||0, image_url: image_url || null, suitable_path_types: suitable_path_types || null, transformation_promise: transformation_promise || null, target_axis: target_axis || null, before_text: before_text || null, after_text: after_text || null, before_image_url: before_image_url || null, after_image_url: after_image_url || null, benefit_list: benefit_list || null, category: category || null, is_trial: !!is_trial, axes: Array.isArray(body.axes) ? body.axes.map(String).slice(0, 20) : [], ...scope, staff_ids: assign.staff_ids || [], resource_ids: assign.resource_ids || [] })
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export const POST = withAudit(__POST);
