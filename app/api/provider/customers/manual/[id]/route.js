// PATCH  /api/provider/customers/manual/[id] → 非会員のお客様の名前・メモを更新（認証済み）
// DELETE /api/provider/customers/manual/[id] { confirm_name? } → 非会員のお客様を削除（認証済み・カルテも連鎖削除）
// 2026-11-12 渡邉指摘：間違えて消すと大問題。入会中・チケットが残っている・これからの予約・ロッカー契約中・契約書がある方は削除できない。
// カルテの記録がある方は、お名前を入れて確かめた時だけ削除する（元に戻せないため）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { removalBlockers } from '@/lib/customer-removals';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.display_name === 'string' && body.display_name.trim()) update.display_name = body.display_name.trim();
  if (body.memo !== undefined) update.memo = body.memo?.trim() || null;
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: mc } = await supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('id', params.id).eq('provider_id', provider.id).maybeSingle();
  if (!mc) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
  const [reasons, { count: docs }, { count: kartes }] = await Promise.all([
    removalBlockers(supabase, provider.id, mc.linked_user_id),
    supabase.from('customer_contract_documents').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('manual_customer_id', mc.id),
    supabase.from('provider_karte_entries').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('manual_customer_id', mc.id),
  ]);
  if (docs) reasons.push(`契約書が${docs}件あります。削除すると契約書も消えるため、削除できません。`);
  if (reasons.length) return Response.json({ error: `このお客様は削除できません。\n${reasons.map(r => `・${r}`).join('\n')}`, reasons }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  if (kartes && String(body.confirm_name || '').trim() !== String(mc.display_name || '').trim()) {
    return Response.json({ error: 'カルテの記録があります', reason: 'karte', karte_count: kartes, name: mc.display_name }, { status: 409 });
  }

  const { error } = await supabase
    .from('provider_manual_customers')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
