// POST   /api/provider/membership-settings/terms-file（multipart, file）→ 入会の利用規約・同意書をPDFで置く
// DELETE /api/provider/membership-settings/terms-file → 外す
// でお指摘（2026-10-28）：オンライン入会の規約をアップロードする場所が分からない。文章を貼る欄だけでなく、お店が
// 今使っている規約のPDFをそのまま置けるようにする。規約はお客様に見せるものなので公開の保存先に置き、
// 差し替えても前のファイルは消さない（入会の申込ごとに、同意した時点のファイルの場所を残しているため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MAX_BYTES = 10 * 1024 * 1024;

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'ファイルがありません' }, { status: 400 });
  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') return Response.json({ error: 'PDFのファイルを選んでください（Wordの場合は「PDFとして保存」してから）' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: '10MB以下のファイルを使用してください' }, { status: 400 });

  const path = `membership-terms/${provider.id}/${crypto.randomUUID()}.pdf`;
  const { error: upErr } = await supabase.storage.from('provider-photos').upload(path, await file.arrayBuffer(), { contentType: 'application/pdf', upsert: false });
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  const { data: { publicUrl } } = supabase.storage.from('provider-photos').getPublicUrl(path);
  const name = (file.name || '利用規約.pdf').slice(0, 120);
  const { error } = await supabase.from('provider_membership_settings').upsert({ provider_id: provider.id, terms_file_url: publicUrl, terms_file_name: name, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ terms_file_url: publicUrl, terms_file_name: name });
}

async function __DELETE(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('provider_membership_settings').upsert({ provider_id: provider.id, terms_file_url: null, terms_file_name: null, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const POST = withAudit(__POST);
export const DELETE = withAudit(__DELETE);
