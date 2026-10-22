// GET /api/provider/customer-tickets?user_id= → このお店のお客様が持っている、使えるチケット（でお要望 2026-10-22）
// 予約カレンダーの予約入力・グループレッスンの参加者追加で、使うチケットを選ぶために使う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { customerEntitlements } from '@/lib/booking-eligibility';
import { isStoreCustomer } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const uid = new URL(request.url).searchParams.get('user_id');
  if (!(await isStoreCustomer(a.provider.id, uid))) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
  const ent = await customerEntitlements(supabase, a.provider.id, uid);
  return Response.json({ user_id: uid, tickets: ent.tickets, has_plan: ent.planIds.length > 0 });
}
