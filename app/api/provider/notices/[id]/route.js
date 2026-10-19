// PATCH/DELETE /api/provider/notices/[id] → お知らせの編集・削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { noticeFields } from '@/lib/notices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __PATCH(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const f = noticeFields(await request.json().catch(() => ({})));
  if (f.error) return Response.json({ error: f.error }, { status: 400 });
  const { data } = await supabase.from('provider_notices').update({ ...f.row, updated_at: new Date().toISOString() }).eq('id', id).eq('provider_id', a.provider.id).select().maybeSingle();
  if (!data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}
async function __DELETE(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  await supabase.from('provider_notices').delete().eq('id', id).eq('provider_id', a.provider.id);
  return Response.json({ ok: true });
}
export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
