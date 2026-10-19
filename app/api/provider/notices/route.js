// GET/POST /api/provider/notices → お知らせの一覧・作成（でお要望 2026-10-19：hacomono差分 #13）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { noticeFields } from '@/lib/notices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows } = await supabase.from('provider_notices').select('*').eq('provider_id', a.provider.id).order('publish_at', { ascending: false }).limit(100);
  const ids = (rows || []).map(r => r.id);
  const reads = {};
  if (ids.length) {
    const { data } = await supabase.from('provider_notice_reads').select('notice_id').in('notice_id', ids).limit(50000);
    (data || []).forEach(r => { reads[r.notice_id] = (reads[r.notice_id] || 0) + 1; });
  }
  return Response.json((rows || []).map(r => ({ ...r, reads: reads[r.id] || 0 })));
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const f = noticeFields(await request.json().catch(() => ({})));
  if (f.error) return Response.json({ error: f.error }, { status: 400 });
  const { data, error } = await supabase.from('provider_notices').insert({ provider_id: a.provider.id, ...f.row, created_by: a.user.fineme_member?.name || 'オーナー' }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
