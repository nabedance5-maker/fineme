// POST /api/provider/tickets/grant → お店からお客様（会員）にチケットを付ける（でお要望 2026-10-22）
// 店頭で現金で回数券を売った時や、おわび・キャンペーンで付ける時に使う。
// body: { user_id, ticket_id, count, unlimited, valid_days, note }
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { isStoreCustomer, ensureManualLinked } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const { data: tk } = await supabase.from('provider_tickets').select('id, name').eq('id', b.ticket_id || '').eq('provider_id', a.provider.id).maybeSingle();
  if (!tk) return Response.json({ error: 'チケットを選んでください' }, { status: 400 });
  // 非会員のお客様（manual_id）には、チケットを持てるようアカウントを用意して紐づけてから付ける
  if (!b.user_id && b.manual_id) {
    const r = await ensureManualLinked(a.provider.id, b.manual_id).catch(e => ({ error: e.message }));
    if (r.error) return Response.json({ error: r.error }, { status: 400 });
    b.user_id = r.userId;
  }
  // このお店のお客様（基本情報・予約・回数券などでつながっている方）だけに付けられる
  if (!(await isStoreCustomer(a.provider.id, b.user_id))) return Response.json({ error: 'このお店のお客様を選んでください' }, { status: 400 });
  const unlimited = !!b.unlimited;
  const count = parseInt(b.count, 10);
  if (!unlimited && !(count >= 1 && count <= 200)) return Response.json({ error: '枚数は1〜200で入れてください' }, { status: 400 });
  const days = parseInt(b.valid_days, 10);
  const now = new Date();
  const { data, error } = await supabase.from('customer_packages').insert({
    provider_id: a.provider.id, user_id: b.user_id, ticket_id: tk.id,
    package_name: String(b.note || '').trim() ? `${tk.name}（${String(b.note).trim().slice(0, 30)}）` : tk.name,
    package_type: unlimited ? 'unlimited' : 'fixed_count', total_sessions: unlimited ? null : count,
    purchased_at: now.toISOString(), expires_at: days > 0 ? new Date(now.getTime() + days * 86400000).toISOString() : null,
    source: 'manual',
  }).select().single();
  if (error) return Response.json({ error: '付けられませんでした' }, { status: 500 });
  return Response.json({ ...data, user_id: b.user_id }, { status: 201 });
}
export const POST = withAudit(__POST);
