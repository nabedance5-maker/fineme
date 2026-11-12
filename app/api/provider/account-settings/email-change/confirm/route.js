// GET /api/provider/account-settings/email-change/confirm?t= → 新しいアドレスに届いた確認リンク。押すとログイン用メールが変わる
// 署名と期限（1時間）を確かめ、ログイン用メールが申込時のままの時だけ変える。変わるとDBのトリガーで店舗・スタッフの登録メールも変わる。
// 戻り先は自サイトの管理画面だけ（外部へは飛ばさない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { verifyEmailChange } from '@/lib/login-email-change';
import { findUserByEmail } from '@/lib/customer-accounts';
import { sendLoginEmailChangedNoticeEmail } from '@/lib/email';

const back = (request, status) => Response.redirect(new URL(`/provider/dashboard?tab=members&email_change=${status}`, request.url), 302);

export async function GET(request) {
  const db = getSupabase();
  const v = verifyEmailChange(new URL(request.url).searchParams.get('t'));
  if (!v) return back(request, 'invalid');
  if (v.expired) return back(request, 'expired');
  const { data: { user } = {} } = await db.auth.admin.getUserById(v.userId).catch(() => ({ data: {} }));
  if (!user) return back(request, 'invalid');
  if ((user.email || '').toLowerCase() === v.newEmail) return back(request, 'done');
  if ((user.email || '').toLowerCase() !== (v.oldEmail || '').toLowerCase()) return back(request, 'invalid');
  const taken = await findUserByEmail(v.newEmail).catch(() => null);
  if (taken && taken.id !== user.id) return back(request, 'taken');
  const { error } = await db.auth.admin.updateUserById(user.id, { email: v.newEmail, email_confirm: true });
  if (error) { console.error('[email-change] update', error.message); return back(request, 'failed'); }
  // 前のアドレスにも知らせる（届けば、心当たりのない変更に気づける。届かなくても変更は済んでいる）
  try { await sendLoginEmailChangedNoticeEmail({ to: v.oldEmail, newEmail: v.newEmail }); } catch {}
  return back(request, 'done');
}
