// GET  /api/me/profile - 自分のプロフィールを取得
// PUT  /api/me/profile - 自分のプロフィールを保存
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('profiles')
    .select('display_name, share_diagnosis, share_roadmap, line_user_id, last_name, first_name, phone, axis_progress, step_done, area, city, body_data, navi_steps')
    .eq('id', user.id)
    .maybeSingle();

  return Response.json({
    display_name: data?.display_name || '',
    share_diagnosis: !!data?.share_diagnosis,
    share_roadmap: !!data?.share_roadmap,
    line_user_id: data?.line_user_id || null,
    last_name: data?.last_name || '',
    first_name: data?.first_name || '',
    phone: data?.phone || '',
    email: user.email || '',
    axis_progress: data?.axis_progress || {},
    step_done: data?.step_done || {},
    area: data?.area || '',
    city: data?.city || '',
    body_data: data?.body_data || {},
    navi_steps: data?.navi_steps || null,
  });
}

export async function PUT(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { display_name, share_diagnosis, share_roadmap, last_name, first_name, phone, axis_progress, step_done, area, city, body_data } = body;

  // auth.users の display_name を更新
  if (display_name !== undefined) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { display_name: String(display_name).trim() },
    });
  }

  // profiles を upsert（service role なので RLS 不問）
  const upsertData = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (display_name !== undefined) upsertData.display_name = String(display_name).trim();
  if (share_diagnosis !== undefined) upsertData.share_diagnosis = share_diagnosis;
  if (share_roadmap !== undefined) upsertData.share_roadmap = share_roadmap;
  if (last_name !== undefined) upsertData.last_name = String(last_name).trim();
  if (first_name !== undefined) upsertData.first_name = String(first_name).trim();
  if (phone !== undefined) upsertData.phone = String(phone).trim();
  if (axis_progress !== undefined) upsertData.axis_progress = axis_progress;
  if (step_done !== undefined) upsertData.step_done = step_done;
  if (area !== undefined) upsertData.area = String(area).trim();
  if (city !== undefined) upsertData.city = String(city).trim();
  if (body_data !== undefined) upsertData.body_data = body_data;

  const { error } = await supabase
    .from('profiles')
    .upsert(upsertData, { onConflict: 'id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
