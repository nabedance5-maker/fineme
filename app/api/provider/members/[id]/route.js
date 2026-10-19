// PATCH  /api/provider/members/[id] { name, role, status, staff_id } → 役割・状態の変更
// DELETE /api/provider/members/[id] → スタッフのログインを削除（アカウント自体はFinemeに残る）
export const dynamic = 'force-dynamic';
import { getSupabase, clearMemberCache } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth as auth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function load(a, id) {
  const { data } = await supabase.from('provider_members').select('id, user_id').eq('id', id).eq('provider_id', a.provider.id).maybeSingle();
  return data;
}

async function __PATCH(request, { params }) {
  const a = await auth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const m = await load(a, id);
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (a.user.fineme_member?.id === id) return Response.json({ error: '自分自身の役割・状態は変更できません' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const up = { updated_at: new Date().toISOString() };
  if (body.role) up.role = body.role === 'manager' ? 'manager' : 'staff';
  if (body.status) up.status = body.status === 'disabled' ? 'disabled' : 'active';
  if ('name' in body) up.name = String(body.name || '').trim().slice(0, 40) || undefined;
  if ('staff_id' in body) up.staff_id = body.staff_id || null;
  const { error } = await supabase.from('provider_members').update(up).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  clearMemberCache(m.user_id);
  return Response.json({ ok: true });
}

async function __DELETE(request, { params }) {
  const a = await auth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const m = await load(a, id);
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (a.user.fineme_member?.id === id) return Response.json({ error: '自分自身は削除できません' }, { status: 403 });
  const { error } = await supabase.from('provider_members').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  clearMemberCache(m.user_id);
  return Response.json({ ok: true });
}
export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
