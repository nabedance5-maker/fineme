// GET/POST /api/provider/membership-discounts → 会員プランの割引・クーポン（でお要望 2026-10-19：hacomono差分 #5）
// クーポンコードを設定した割引は、お客様が入会時にコードを入れて使える。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { membershipAuth as auth } from '@/lib/provider-members';
import { validateDiscountInput } from '@/lib/membership-changes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await auth(request); if (a.res) return a.res;
  const { data } = await supabase.from('provider_membership_discounts').select('id, name, kind, value, duration, months, code, max_uses, used_count, valid_until, active, created_at').eq('provider_id', a.provider.id).order('created_at', { ascending: false });
  const { data: used } = await supabase.from('provider_memberships').select('discount_id').eq('provider_id', a.provider.id).eq('status', 'active').not('discount_id', 'is', null);
  const cnt = {}; (used || []).forEach(u => { cnt[u.discount_id] = (cnt[u.discount_id] || 0) + 1; });
  return Response.json((data || []).map(d => ({ ...d, members: cnt[d.id] || 0 })));
}

async function __POST(request) {
  const a = await auth(request); if (a.res) return a.res;
  const v = validateDiscountInput(await request.json().catch(() => ({})));
  if (v.error) return Response.json({ error: v.error }, { status: 400 });
  const { data, error } = await supabase.from('provider_membership_discounts').insert({ provider_id: a.provider.id, ...v.row }).select().single();
  if (error) return Response.json({ error: /uq_provider_membership_discounts_code/.test(error.message) ? 'このクーポンコードはすでに使っています' : '保存できませんでした' }, { status: 400 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
