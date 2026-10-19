// GET/POST /api/provider/membership-options → 会員プランのオプション（月額の追加サービス）一覧・追加
// （でお要望 2026-10-19：hacomono差分 #5）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { membershipAuth as auth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await auth(request); if (a.res) return a.res;
  const { data } = await supabase.from('provider_membership_options').select('id, name, monthly_price, description, active, sort_order').eq('provider_id', a.provider.id).order('sort_order').order('created_at');
  const { data: used } = await supabase.from('provider_membership_option_items').select('option_id').eq('provider_id', a.provider.id).eq('status', 'active');
  const cnt = {}; (used || []).forEach(u => { cnt[u.option_id] = (cnt[u.option_id] || 0) + 1; });
  return Response.json((data || []).map(o => ({ ...o, members: cnt[o.id] || 0 })));
}

async function __POST(request) {
  const a = await auth(request); if (a.res) return a.res;
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 60);
  const price = Math.round(Number(b.monthly_price));
  if (!name || !(price > 0)) return Response.json({ error: 'オプション名と月額（1円以上）を入れてください' }, { status: 400 });
  const { count } = await supabase.from('provider_membership_options').select('id', { count: 'exact', head: true }).eq('provider_id', a.provider.id);
  const { data, error } = await supabase.from('provider_membership_options').insert({ provider_id: a.provider.id, name, monthly_price: price, description: String(b.description || '').slice(0, 200) || null, sort_order: count || 0 }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json(data, { status: 201 });
}
export const POST = withAudit(__POST);
