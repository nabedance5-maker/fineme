// PUT    /api/provider/appeal-blocks/[id] → ブロックを更新（内容編集・並び替え。認証済み）
// DELETE /api/provider/appeal-blocks/[id] → ブロックを削除（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

function sanitizeContent(block_type, content) {
  const c = content && typeof content === 'object' ? content : {};
  if (block_type === 'heading' || block_type === 'paragraph') {
    return { text: String(c.text || '').trim(), align: c.align === 'center' ? 'center' : 'left' };
  }
  if (block_type === 'image') {
    return { url: String(c.url || '').trim(), caption: String(c.caption || '').trim(), size: c.size === 'full' ? 'full' : 'medium' };
  }
  if (block_type === 'button') {
    const url = String(c.url || '').trim();
    return { label: String(c.label || '').trim(), url: /^https?:\/\//i.test(url) ? url : '' };
  }
  if (block_type === 'quote') {
    return { text: String(c.text || '').trim(), attribution: String(c.attribution || '').trim() };
  }
  return {};
}

export async function PUT(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
  if (body.content !== undefined) {
    // sanitizeにはblock_typeが要るため、更新対象の現在のblock_typeを引く
    const { data: existing } = await supabase.from('provider_appeal_blocks').select('block_type').eq('id', id).eq('provider_id', provider.id).maybeSingle();
    if (!existing) return Response.json({ error: '見つかりません' }, { status: 404 });
    update.content = sanitizeContent(existing.block_type, body.content);
  }
  if (!Object.keys(update).length) return Response.json({ error: '更新する項目がありません' }, { status: 400 });
  update.updated_at = new Date().toISOString();

  // 自店舗のブロックのみ更新できる（他店舗のIDを渡されても書き換わらない）
  const { error } = await supabase
    .from('provider_appeal_blocks')
    .update(update)
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { error } = await supabase
    .from('provider_appeal_blocks')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
