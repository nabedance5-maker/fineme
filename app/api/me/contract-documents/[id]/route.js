// GET  /api/me/contract-documents/[id] → 契約書ファイルの署名付きURL（5分有効）
// POST /api/me/contract-documents/[id] → 「内容を確認しました」を記録（同意の記録）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { logCustomerActivity } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  return error || !user ? null : user;
}

async function loadMine(userId, id) {
  const { data } = await supabase.from('customer_contract_documents')
    .select('id, provider_id, title, file_path, customer_acknowledged_at')
    .eq('id', id).eq('user_id', userId).eq('visible_to_customer', true).maybeSingle();
  return data;
}

export async function GET(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const doc = await loadMine(user.id, params.id);
  if (!doc) return Response.json({ error: '見つかりません' }, { status: 404 });
  const { data, error } = await supabase.storage.from('contract-documents').createSignedUrl(doc.file_path, 300);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ url: data.signedUrl });
}

export async function POST(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const doc = await loadMine(user.id, params.id);
  if (!doc) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (doc.customer_acknowledged_at) return Response.json({ ok: true, customer_acknowledged_at: doc.customer_acknowledged_at });
  const now = new Date().toISOString();
  const { error } = await supabase.from('customer_contract_documents').update({ customer_acknowledged_at: now }).eq('id', doc.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await logCustomerActivity({ providerId: doc.provider_id, userId: user.id, category: '顧客', label: '契約書の内容を確認', targetId: doc.id, detail: { title: doc.title } });
  return Response.json({ ok: true, customer_acknowledged_at: now });
}
