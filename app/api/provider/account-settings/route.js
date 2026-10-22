// GET /api/provider/account-settings → ログイン用メールアドレスと、通知を受け取るメールアドレス（でお要望 2026-10-22）
// PUT /api/provider/account-settings → 通知を受け取るメールアドレスを保存（最大10件。空ならログイン用のメールに届く）
// ログイン用メール・パスワードの変更そのものは、画面からSupabaseの仕組みで行う（メール変更は確認メールで確定し、
// 確定するとDBのトリガーで店舗の登録メールも新しいアドレスに変わる。supabase-provider-account.sql）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('providers').select('email, notify_emails').eq('id', a.provider.id).single();
  return Response.json({ login_email: a.user.email, pending_email: a.user.new_email || null, notify_emails: data?.notify_emails || [] });
}

async function __PUT(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const list = [...new Set((Array.isArray(b.notify_emails) ? b.notify_emails : []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean))];
  const bad = list.find(e => !EMAIL.test(e) || e.length > 120);
  if (bad) return Response.json({ error: `メールアドレスの形が正しくありません：${bad}` }, { status: 400 });
  if (list.length > 10) return Response.json({ error: '通知先は10件までです' }, { status: 400 });
  const { error } = await supabase.from('providers').update({ notify_emails: list }).eq('id', a.provider.id);
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json({ notify_emails: list });
}
export const PUT = withAudit(__PUT);
