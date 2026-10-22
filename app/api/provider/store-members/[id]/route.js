// PATCH /api/provider/store-members/[id] → 会員の退会・再開（でお要望 2026-10-22）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __PATCH(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!['active', 'withdrawn'].includes(b.status)) return Response.json({ error: '変更の内容が正しくありません' }, { status: 400 });
  const { data: cur } = await supabase.from('provider_store_members').select('status').eq('id', id).eq('provider_id', a.provider.id).maybeSingle();
  if (!cur) return Response.json({ error: '会員が見つかりません' }, { status: 404 });
  const { data, error } = await supabase.from('provider_store_members').update({ status: b.status, withdrawn_at: b.status === 'withdrawn' ? new Date().toISOString() : null }).eq('id', id).eq('provider_id', a.provider.id).select().single();
  if (error) return Response.json({ error: '変更できませんでした' }, { status: 500 });
  return Response.json(data);
}
export const PATCH = withAudit(__PATCH);
