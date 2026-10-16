// PATCH /api/provider/customer-packages/[id]
//  { subscription_status: 'cancelled' } → サブスク型パッケージの解約（でお要望2026-09-14）。解約後は次回以降の自動付与を止める。
//  { remaining_sessions: n }             → 残り回数を直接修正（でお要望2026-10-16：顧客情報の中でチケットを編集したい）。
//                                          消化履歴は残したまま、合計回数＝消化済み＋指定した残り回数 に置き換える。
//  { expires_at: 'YYYY-MM-DD' | null }    → 有効期限の変更（nullで無期限）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'customer_packages'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));

  if (body.subscription_status === 'cancelled') {
    const { data, error } = await supabase
      .from('customer_packages')
      .update({ subscription_status: 'cancelled', next_grant_at: null })
      .eq('id', id)
      .eq('provider_id', provider.id)
      .eq('package_type', 'subscription')
      .select()
      .single();
    if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
    return Response.json(data);
  }

  const { data: pkg } = await supabase.from('customer_packages').select('id, package_type, total_sessions').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!pkg) return Response.json({ error: '見つかりません' }, { status: 404 });

  const update = {};
  if (body.remaining_sessions !== undefined) {
    if (pkg.package_type === 'unlimited') return Response.json({ error: '通い放題は回数を持たないため修正できません' }, { status: 400 });
    const remaining = Number(body.remaining_sessions);
    if (!Number.isInteger(remaining) || remaining < 0 || remaining > 999) return Response.json({ error: '残り回数は0〜999の整数で指定してください' }, { status: 400 });
    const { count: used } = await supabase.from('package_usages').select('id', { count: 'exact', head: true }).eq('customer_package_id', id).is('undone_at', null);
    update.total_sessions = (used || 0) + remaining;
  }
  if (body.expires_at !== undefined) {
    if (body.expires_at === null || body.expires_at === '') update.expires_at = null;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(body.expires_at)) update.expires_at = `${body.expires_at}T23:59:59+09:00`;
    else return Response.json({ error: '有効期限の形式が正しくありません' }, { status: 400 });
  }
  if (!Object.keys(update).length) return Response.json({ error: '不正な操作です' }, { status: 400 });

  const { data, error } = await supabase.from('customer_packages').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: error?.message || '更新できませんでした' }, { status: 500 });
  return Response.json(data);
}

export const PATCH = withAudit(__PATCH);
