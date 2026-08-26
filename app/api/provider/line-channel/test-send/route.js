// POST /api/provider/line-channel/test-send → 店舗の公式LINEチャネルから実際に届くかテスト送信する
// 対象は「ログイン中のFineme公式アカウントが、この店舗のLIFF連携ページ（/l/[slug]）で
// 自分自身を客として連携済み」の場合のみ（店舗管理者が任意の顧客へ勝手に送れないようにする）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('id, name').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: channel } = await supabase
    .from('provider_line_channels')
    .select('channel_access_token, verified_at')
    .eq('provider_id', provider.id)
    .single();
  if (!channel?.channel_access_token || !channel.verified_at) {
    return Response.json({ error: 'まだLINE連携が完了していません。先にチャネルアクセストークンを保存してください。' }, { status: 400 });
  }

  const { data: link } = await supabase
    .from('provider_customer_line_links')
    .select('store_line_user_id')
    .eq('provider_id', provider.id)
    .eq('user_id', user.id)
    .single();
  if (!link?.store_line_user_id) {
    return Response.json({ error: '自分のLINEがまだ連携されていません。/l/[店舗slug] のページをこのアカウントでログインした状態で開き、店舗の公式LINEを友だち追加した上で連携を完了させてください。' }, { status: 400 });
  }

  const result = await sendLinePush(
    link.store_line_user_id,
    `【テスト送信】${provider.name}の公式LINE連携テストです。このメッセージが届いていれば、お客様への来店リマインドも問題なく届きます。`,
    channel.channel_access_token
  );

  if (!result.ok) {
    const hint = result.reason === 'not-friend-or-no-permission'
      ? '店舗の公式LINEをまだ友だち追加していない可能性があります。友だち追加してから再度お試しください。'
      : '';
    return Response.json({ error: `送信に失敗しました（${result.reason || result.error || result.status}）。${hint}` }, { status: 502 });
  }

  return Response.json({ ok: true });
}
