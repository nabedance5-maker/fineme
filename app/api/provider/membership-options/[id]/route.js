// PATCH/DELETE /api/provider/membership-options/[id]
// 金額を変えた場合、すでに付いている会員の金額は変わらない（付けた時点の金額で契約しているため）。
// 削除は「新しく選べなくする」だけ（付いている会員の契約はそのまま）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { membershipAuth as auth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __PATCH(request, { params }) {
  const { id } = await params;
  const a = await auth(request); if (a.res) return a.res;
  const b = await request.json().catch(() => ({}));
  const up = {};
  if ('name' in b) up.name = String(b.name || '').trim().slice(0, 60);
  if ('monthly_price' in b) up.monthly_price = Math.round(Number(b.monthly_price));
  if ('description' in b) up.description = String(b.description || '').slice(0, 200) || null;
  if ('active' in b) up.active = !!b.active;
  if (up.name === '' || (up.monthly_price !== undefined && !(up.monthly_price > 0))) return Response.json({ error: 'オプション名と月額（1円以上）を入れてください' }, { status: 400 });
  const { data, error } = await supabase.from('provider_membership_options').update(up).eq('id', id).eq('provider_id', a.provider.id).select().maybeSingle();
  if (error || !data) return Response.json({ error: '保存できませんでした' }, { status: 404 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const a = await auth(request); if (a.res) return a.res;
  const { count } = await supabase.from('provider_membership_option_items').select('id', { count: 'exact', head: true }).eq('option_id', id);
  if (count) await supabase.from('provider_membership_options').update({ active: false }).eq('id', id).eq('provider_id', a.provider.id);
  else await supabase.from('provider_membership_options').delete().eq('id', id).eq('provider_id', a.provider.id);
  return Response.json({ ok: true, archived: !!count });
}
export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
