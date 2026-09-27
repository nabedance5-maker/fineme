// GET   /api/provider/deposit-settings → 自店舗の予約デポジット設定
// PATCH /api/provider/deposit-settings → デポジット金額を更新（0/nullで無効化）
// 決済機能Phase6③（でお要望2026-09-27）。即時予約（instant_booking）で確定した予約のみ対象。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, deposit_amount, stripe_connect_id, stripe_connect_status').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({
    deposit_amount: provider.deposit_amount || 0,
    payment_ready: provider.stripe_connect_id && provider.stripe_connect_status === 'active',
  });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { deposit_amount } = await request.json().catch(() => ({}));
  const amount = parseInt(deposit_amount, 10);
  if (deposit_amount != null && (!Number.isFinite(amount) || amount < 0)) {
    return Response.json({ error: 'デポジット金額は0以上の数値で入力してください' }, { status: 400 });
  }
  const { error } = await supabase
    .from('providers')
    .update({ deposit_amount: deposit_amount == null || amount === 0 ? null : amount })
    .eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
