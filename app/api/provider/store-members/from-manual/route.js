// POST /api/provider/store-members/from-manual → 非会員のお客様を、チケットや月額プランを使える会員にする（でお要望 2026-10-22）
// body: { manual_id, email }（email が無ければ店頭だけでご利用の会員として作る）
// 非会員の記録（カルテ等）は、会員と紐づけた状態のまま残す（provider_manual_customers.linked_user_id）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { ensureManualLinked } from '@/lib/store-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  try {
    const r = await ensureManualLinked(pid, b.manual_id, email);
    if (r.error) return Response.json({ error: r.error }, { status: 404 });
    return Response.json({ user_id: r.userId, status: 'active', existed: r.existed }, { status: 201 });
  } catch (e) {
    console.error('[store-members/from-manual]', e);
    return Response.json({ error: '会員を作れませんでした' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
