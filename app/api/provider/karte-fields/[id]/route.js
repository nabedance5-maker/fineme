// PUT    /api/provider/karte-fields/[id] → カスタム項目を更新（並び替え・編集。認証済み）
// DELETE /api/provider/karte-fields/[id] → カスタム項目を削除（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PUT(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const update = {};
  if (body.label !== undefined) update.label = String(body.label).trim();
  if (body.options !== undefined) update.options = body.options;
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
  if (!Object.keys(update).length) return Response.json({ error: '更新する項目がありません' }, { status: 400 });
  update.updated_at = new Date().toISOString();

  // 自店舗の項目のみ更新できる（他店舗の項目IDを渡されても書き換わらない）
  const { error } = await supabase
    .from('provider_karte_fields')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_karte_fields')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
