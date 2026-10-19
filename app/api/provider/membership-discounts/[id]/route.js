// PATCH/DELETE /api/provider/membership-discounts/[id]
// 金額・期間は作った後に変えない（Stripeのクーポンが変えられないため、変えたい時は新しく作る）。
// 変えられるのは名前・クーポンコード・利用上限・有効期限・有効/無効。
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
  if ('name' in b) { up.name = String(b.name || '').trim().slice(0, 60); if (!up.name) return Response.json({ error: '名前を入れてください' }, { status: 400 }); }
  if ('code' in b) { up.code = String(b.code || '').trim().slice(0, 30) || null; if (up.code && !/^[A-Za-z0-9_-]+$/.test(up.code)) return Response.json({ error: 'クーポンコードは半角英数字・ハイフン・アンダーバーで入れてください' }, { status: 400 }); }
  if ('max_uses' in b) up.max_uses = b.max_uses ? Math.max(1, Math.round(Number(b.max_uses))) : null;
  if ('valid_until' in b) up.valid_until = b.valid_until || null;
  if ('active' in b) up.active = !!b.active;
  const { data, error } = await supabase.from('provider_membership_discounts').update(up).eq('id', id).eq('provider_id', a.provider.id).select().maybeSingle();
  if (error) return Response.json({ error: /uq_provider_membership_discounts_code/.test(error.message) ? 'このクーポンコードはすでに使っています' : '保存できませんでした' }, { status: 400 });
  if (!data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}

// 会員に付いている割引は消さずに無効化（その会員の割引はそのまま続く）
async function __DELETE(request, { params }) {
  const { id } = await params;
  const a = await auth(request); if (a.res) return a.res;
  const { count } = await supabase.from('provider_memberships').select('id', { count: 'exact', head: true }).eq('discount_id', id);
  if (count) await supabase.from('provider_membership_discounts').update({ active: false }).eq('id', id).eq('provider_id', a.provider.id);
  else await supabase.from('provider_membership_discounts').delete().eq('id', id).eq('provider_id', a.provider.id);
  return Response.json({ ok: true, archived: !!count });
}
export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
