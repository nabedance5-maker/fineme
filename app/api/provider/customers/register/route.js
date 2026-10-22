// POST /api/provider/customers/register → メールアドレスでお客様を追加する（でお要望 2026-10-22）
// Finemeアカウントが無ければ作り、あればそのアカウントに、顧客の基本情報を紐づける。
// アカウントがあると、チケットを付けたり、月額プランの入会リンクを送ったり、予約に紐づけたりできる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { profileFields, upsertProfile, findOrCreateUser } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const f = profileFields(b);
  if (!f.last_name && !f.first_name) return Response.json({ error: 'お名前を入れてください' }, { status: 400 });
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  let found;
  try { found = await findOrCreateUser(email); }
  catch (e) { console.error('[customers/register]', e); return Response.json({ error: 'お客様を追加できませんでした' }, { status: 500 }); }
  await upsertProfile(a.provider.id, found.user.id, { ...f, email }, 'お店でお客様を追加');
  return Response.json({ user_id: found.user.id, existed: found.existed }, { status: 201 });
}
export const POST = withAudit(__POST);
