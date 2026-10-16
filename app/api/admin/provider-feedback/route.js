// GET   /api/admin/provider-feedback → 掲載者からの意見一覧（店舗名つき）
// PATCH /api/admin/provider-feedback → 対応状況・運営メモ（掲載者側に「運営からの返信」として表示）を更新
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const STATUSES = ['new', 'in_progress', 'done', 'wontfix'];

function checkAdminKey(request) {
  return request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY;
}

export async function GET(request) {
  if (!checkAdminKey(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('provider_feedback')
    .select('id, provider_id, category, tab, message, status, admin_note, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((data || []).map(r => r.provider_id).filter(Boolean))];
  let nameMap = {};
  if (ids.length) {
    const { data: providers } = await supabase.from('providers').select('id, name, slug').in('id', ids);
    (providers || []).forEach(p => { nameMap[p.id] = { name: p.name, slug: p.slug }; });
  }
  return Response.json((data || []).map(r => ({
    ...r,
    provider_name: nameMap[r.provider_id]?.name || '(削除済みの店舗)',
    provider_slug: nameMap[r.provider_id]?.slug || null,
  })));
}

export async function PATCH(request) {
  if (!checkAdminKey(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return Response.json({ error: 'id は必須です' }, { status: 400 });
  const update = { updated_at: new Date().toISOString() };
  if (STATUSES.includes(body.status)) update.status = body.status;
  if (body.admin_note !== undefined) update.admin_note = String(body.admin_note || '').trim() || null;

  const { data, error } = await supabase.from('provider_feedback').update(update).eq('id', body.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
