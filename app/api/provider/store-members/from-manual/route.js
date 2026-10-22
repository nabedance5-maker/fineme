// POST /api/provider/store-members/from-manual → 非会員のお客様を、チケットや月額プランを使える会員にする（でお要望 2026-10-22）
// body: { manual_id, email }（email が無ければ店頭だけでご利用の会員として作る）
// 非会員の記録（カルテ等）は、会員と紐づけた状態のまま残す（provider_manual_customers.linked_user_id）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { upsertProfile, findOrCreateUser } from '@/lib/store-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const b = await request.json().catch(() => ({}));
  const { data: mc } = await supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('id', b.manual_id || '').eq('provider_id', pid).maybeSingle();
  if (!mc) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
  if (mc.linked_user_id) return Response.json({ error: 'このお客様はすでに会員と紐づいています', user_id: mc.linked_user_id }, { status: 409 });
  const email = String(b.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  let found;
  try { found = await findOrCreateUser(email || `member-${crypto.randomUUID()}@noemail.fineme.invalid`); }
  catch (e) { console.error('[store-members/from-manual]', e); return Response.json({ error: '会員を作れませんでした' }, { status: 500 }); }
  const userId = found.user.id;
  const status = found.existed ? 'invited' : 'active';
  const { data: cur } = await supabase.from('provider_store_members').select('id').eq('provider_id', pid).eq('user_id', userId).maybeSingle();
  const row = { provider_id: pid, user_id: userId, status, registered_by: 'store', joined_at: new Date().toISOString(), withdrawn_at: null };
  const { error } = cur ? await supabase.from('provider_store_members').update(row).eq('id', cur.id) : await supabase.from('provider_store_members').insert(row);
  if (error) return Response.json({ error: '会員にできませんでした' }, { status: 500 });
  await supabase.from('provider_manual_customers').update({ linked_user_id: userId, linked_at: new Date().toISOString() }).eq('id', mc.id);
  const [last, ...rest] = String(mc.display_name || '').trim().split(/\s+/);
  await upsertProfile(pid, userId, { last_name: last || null, first_name: rest.join(' ') || null, email: email || null }, 'お店で会員登録');
  return Response.json({ user_id: userId, status, existed: found.existed }, { status: 201 });
}
export const POST = withAudit(__POST);
