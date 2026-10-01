// PUT    /api/provider/today-blocks/[id] → 並び替え・表示/非表示・表示方法・メモ内容の更新（認証済み）
// DELETE /api/provider/today-blocks/[id] → メモブロックの削除（認証済み。builtin_*は削除不可）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// この4つは常設カード（削除不可・非表示切替のみ）。それ以外のbuiltin_*（referrals/
// events/dormant/classes）はユーザーが任意追加したものなので削除可能（でお要望2026-10-01）。
const CORE_BUILTIN_TYPES = ['builtin_reservations', 'builtin_requests', 'builtin_checkin', 'builtin_sales'];

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
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.sort_order !== undefined) update.sort_order = Number(body.sort_order);
  if (body.hidden !== undefined) update.hidden = !!body.hidden;
  if (body.display_mode !== undefined) update.display_mode = body.display_mode === 'popup' ? 'popup' : 'inline';
  if (body.content !== undefined) {
    // メモのみ本文を持つ。builtin_*のcontentは使わないため無視する。
    const { data: existing } = await supabase.from('provider_today_blocks').select('block_type').eq('id', id).eq('provider_id', provider.id).maybeSingle();
    if (!existing) return Response.json({ error: '見つかりません' }, { status: 404 });
    if (existing.block_type === 'memo') {
      update.content = { text: String(body.content?.text || '').trim() };
    }
  }
  if (!Object.keys(update).length) return Response.json({ error: '更新する項目がありません' }, { status: 400 });
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('provider_today_blocks')
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

  const { data: existing } = await supabase.from('provider_today_blocks').select('block_type').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!existing) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (CORE_BUILTIN_TYPES.includes(existing.block_type)) return Response.json({ error: 'デフォルトのカードは削除できません。非表示にできます。' }, { status: 400 });

  const { error } = await supabase
    .from('provider_today_blocks')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
