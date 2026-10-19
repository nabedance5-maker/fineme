// PUT /api/provider/role-permissions { role: 'manager'|'staff', perms: { reservation: true, ... } } → 役割ごとに使えるメニューを保存
export const dynamic = 'force-dynamic';
import { getSupabase, clearMemberCache } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { normalizePerms } from '@/lib/member-perms';
import { memberAuth as auth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __PUT(request) {
  const a = await auth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const role = body.role === 'manager' ? 'manager' : body.role === 'staff' ? 'staff' : null;
  if (!role) return Response.json({ error: '役割が正しくありません' }, { status: 400 });
  if (a.user.fineme_member && a.user.fineme_member.role === role) return Response.json({ error: '自分と同じ役割の権限は変更できません。オーナーに依頼してください' }, { status: 403 });
  const perms = normalizePerms(role, body.perms);
  const { error } = await supabase.from('provider_role_permissions').upsert({ provider_id: a.provider.id, role, perms, updated_at: new Date().toISOString() }, { onConflict: 'provider_id,role' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  clearMemberCache();
  return Response.json({ ok: true, perms });
}
export const PUT = withAudit(__PUT);
