// POST   /api/provider/membership-settings/terms-file → 入会の利用規約・同意書を足す
//   multipart（file）：PDF・画像（JPG/PNG/WebP）をアップロード
//   JSON（{ link_url, title }）：お店のサイト・Googleドキュメントなどのリンク
// DELETE /api/provider/membership-settings/terms-file（JSON { url }）→ 外す
// でお指摘（2026-10-28）：オンライン入会の規約をアップロードする場所が分からない／PDF以外に画像やリンクでも置きたい。
// 規約はお客様に見せるものなので公開の保存先に置き、外しても・差し替えてもファイルは消さない
// （入会の申込ごとに、同意した時点の一覧を残しているため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { normalizeTermsFiles, isHttpUrl, MAX_TERMS_FILES } from '@/lib/membership-terms';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MAX_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = { pdf: ['application/pdf', 'pdf'], jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], png: ['image/png', 'image'], webp: ['image/webp', 'image'] };

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function currentFiles(providerId) {
  const { data } = await supabase.from('provider_membership_settings').select('terms_files').eq('provider_id', providerId).maybeSingle();
  return normalizeTermsFiles(data?.terms_files);
}

async function saveFiles(providerId, files) {
  const { error } = await supabase.from('provider_membership_settings').upsert({ provider_id: providerId, terms_files: files, updated_at: new Date().toISOString() });
  return error;
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }
  const files = await currentFiles(provider.id);
  if (files.length >= MAX_TERMS_FILES) return Response.json({ error: `規約のファイル・リンクは${MAX_TERMS_FILES}個までです` }, { status: 400 });

  let item;
  if ((request.headers.get('content-type') || '').includes('application/json')) {
    const b = await request.json().catch(() => ({}));
    const url = String(b.link_url || '').trim();
    if (!isHttpUrl(url)) return Response.json({ error: 'https:// から始まるリンクを入れてください' }, { status: 400 });
    item = { url, name: String(b.title || '').trim() || '利用規約（リンク）', kind: 'link' };
  } else {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'ファイルがありません' }, { status: 400 });
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const t = FILE_TYPES[ext];
    if (!t) return Response.json({ error: 'PDFか画像（JPG・PNG・WebP）を選んでください（Wordの場合は「PDFとして保存」してから）' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: '10MB以下のファイルを使用してください' }, { status: 400 });
    const path = `membership-terms/${provider.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('provider-photos').upload(path, await file.arrayBuffer(), { contentType: t[0], upsert: false });
    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
    const { data: { publicUrl } } = supabase.storage.from('provider-photos').getPublicUrl(path);
    item = { url: publicUrl, name: (file.name || `利用規約.${ext}`).slice(0, 120), kind: t[1] };
  }
  const next = normalizeTermsFiles([...files, item]);
  const error = await saveFiles(provider.id, next);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ terms_files: next });
}

async function __DELETE(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { url } = await request.json().catch(() => ({}));
  const next = (await currentFiles(provider.id)).filter(f => f.url !== url);
  const error = await saveFiles(provider.id, next);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ terms_files: next });
}

export const POST = withAudit(__POST);
export const DELETE = withAudit(__DELETE);
