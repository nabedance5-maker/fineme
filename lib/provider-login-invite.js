// お店の管理画面のログイン案内（2026-10-30）。初期パスワードをメールに書くのをやめ、
// パスワードを設定するリンク（Supabase の recovery リンク → /auth/callback のパスワード設定画面）を送る。
// 管理画面の「アカウントを作る」「ログイン案内を送り直す」の両方から使う。
import { sendProviderWelcomeEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

async function ensureAuthUser(supabase, email) {
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
  // 既に Fineme のアカウントがある人（お客様として使っていた等）は、パスワードも記録もそのまま
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`アカウントを作れませんでした：${error.message}`);
  // トリガーが作るお客様用の profiles 行は、お店のアカウントには要らない
  if (data?.user?.id) await supabase.from('profiles').delete().eq('id', data.user.id);
  return data.user;
}

export async function sendProviderLoginInvite(supabase, { email, providerName }) {
  await ensureAuthUser(supabase, email);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback` },
  });
  const setupUrl = data?.properties?.action_link;
  if (error || !setupUrl) throw new Error(`パスワード設定のリンクを作れませんでした：${error?.message || '不明'}`);
  await sendProviderWelcomeEmail({ email, providerName, setupUrl });
}
