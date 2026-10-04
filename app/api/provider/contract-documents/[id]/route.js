// GET    /api/provider/contract-documents/[id] → 契約書ファイルの署名付きURL（5分有効）
// PATCH  /api/provider/contract-documents/[id] → お客様への表示のオン・オフ
// DELETE /api/provider/contract-documents/[id] → 契約書を削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function loadOwned(providerId, id) {
  const { data } = await supabase.from('customer_contract_documents').select('id, file_path, file_name, user_id').eq('id', id).eq('provider_id', providerId).maybeSingle();
  return data;
}

export async function GET(request, { params }) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const doc = await loadOwned(provider.id, params.id);
  if (!doc) return Response.json({ error: '見つかりません' }, { status: 404 });
  const { data, error } = await supabase.storage.from('contract-documents').createSignedUrl(doc.file_path, 300);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ url: data.signedUrl });
}

async function __PATCH(request, { params }) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const doc = await loadOwned(provider.id, params.id);
  if (!doc) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (!doc.user_id) return Response.json({ error: '会員と紐付いていないお客様の契約書は、お客様側には表示できません' }, { status: 409 });
  const body = await request.json();
  if (typeof body.visible_to_customer !== 'boolean') return Response.json({ error: '不正なリクエストです' }, { status: 400 });
  const { error } = await supabase.from('customer_contract_documents').update({ visible_to_customer: body.visible_to_customer }).eq('id', doc.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

async function __DELETE(request, { params }) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const doc = await loadOwned(provider.id, params.id);
  if (!doc) return Response.json({ error: '見つかりません' }, { status: 404 });
  await supabase.storage.from('contract-documents').remove([doc.file_path]);
  const { error } = await supabase.from('customer_contract_documents').delete().eq('id', doc.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
