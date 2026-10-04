// GET  /api/provider/contract-documents?user_id=... | ?manual_customer_id=... → 顧客の契約書一覧
// POST /api/provider/contract-documents（multipart）→ 店舗とお客様が交わした契約書をアップロード
// 電子署名は行わず、紙・PDF等で交わした契約書の保管と同意の記録だけを担う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ALLOWED_EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const MAX_BYTES = 10 * 1024 * 1024;
const KINDS = ['package', 'membership', 'other'];
const COLUMNS = 'id, contract_kind, title, contract_date, note, file_name, mime_type, size_bytes, visible_to_customer, customer_acknowledged_at, created_at, user_id, manual_customer_id';

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function ownsManualCustomer(providerId, id) {
  const { data } = await supabase.from('provider_manual_customers').select('id').eq('id', id).eq('provider_id', providerId).single();
  return !!data;
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const manualId = url.searchParams.get('manual_customer_id');
  if (!userId && !manualId) return Response.json({ error: 'user_id か manual_customer_id が必要です' }, { status: 400 });

  let q = supabase.from('customer_contract_documents').select(COLUMNS).eq('provider_id', provider.id).order('created_at', { ascending: false });
  q = userId ? q.eq('user_id', userId) : q.eq('manual_customer_id', manualId);
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  const userId = (form.get('user_id') || '').toString() || null;
  const manualId = (form.get('manual_customer_id') || '').toString() || null;
  const title = (form.get('title') || '').toString().trim();
  const kind = (form.get('contract_kind') || 'other').toString();
  const contractDate = (form.get('contract_date') || '').toString() || null;
  const note = (form.get('note') || '').toString().trim() || null;
  const visible = form.get('visible_to_customer') !== 'false';

  if (!file || typeof file === 'string') return Response.json({ error: 'ファイルがありません' }, { status: 400 });
  if (!!userId === !!manualId) return Response.json({ error: '対象のお客様を1人指定してください' }, { status: 400 });
  if (!title) return Response.json({ error: '契約書の名前を入力してください' }, { status: 400 });
  if (title.length > 80) return Response.json({ error: '名前は80文字以内にしてください' }, { status: 400 });
  if (!KINDS.includes(kind)) return Response.json({ error: '種類が不正です' }, { status: 400 });
  if (contractDate && !/^\d{4}-\d{2}-\d{2}$/.test(contractDate)) return Response.json({ error: '契約日の形式が不正です' }, { status: 400 });

  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXT[ext]) return Response.json({ error: '対応形式: PDF, JPG, PNG, WebP' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: '10MB以下のファイルを使用してください' }, { status: 400 });

  if (manualId) {
    if (!(await ownsManualCustomer(provider.id, manualId))) return Response.json({ error: '見つかりません' }, { status: 404 });
  } else {
    const { data: prof } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!prof) return Response.json({ error: '見つかりません' }, { status: 404 });
  }

  const docId = crypto.randomUUID();
  const path = `${provider.id}/${docId}.${ext}`;
  const { error: upErr } = await supabase.storage.from('contract-documents').upload(path, await file.arrayBuffer(), { contentType: ALLOWED_EXT[ext], upsert: false });
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  const { data, error } = await supabase.from('customer_contract_documents').insert({
    id: docId, provider_id: provider.id, user_id: userId, manual_customer_id: manualId,
    contract_kind: kind, title, contract_date: contractDate, note,
    file_path: path, file_name: (file.name || `contract.${ext}`).slice(0, 120), mime_type: ALLOWED_EXT[ext], size_bytes: file.size,
    visible_to_customer: manualId ? false : visible,
  }).select(COLUMNS).single();
  if (error) {
    await supabase.storage.from('contract-documents').remove([path]);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data, { status: 201 });
}

export const POST = withAudit(__POST);
