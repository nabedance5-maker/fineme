// GET  /api/provider/line-channel → 自店舗のLINE連携状態を取得（認証済み）
// POST /api/provider/line-channel → 自店舗のLINEチャネル情報を保存・検証（認証済み・セルフサービス）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { validateLineChannelToken } from '@/lib/line-channel';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('provider_line_channels')
    .select('channel_id, liff_id, verified_at, connected_by, updated_at')
    .eq('provider_id', provider.id)
    .single();

  return Response.json({
    connected: !!data?.verified_at,
    channel_id: data?.channel_id || null,
    liff_id: data?.liff_id || null,
    verified_at: data?.verified_at || null,
    connected_by: data?.connected_by || null,
  });
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { channel_id, channel_secret, channel_access_token, liff_id } = await request.json();
  if (!channel_access_token) {
    return Response.json({ error: 'チャネルアクセストークンを入力してください' }, { status: 400 });
  }

  const check = await validateLineChannelToken(channel_access_token);
  if (!check.ok) {
    return Response.json({ error: `トークンを確認できませんでした（${check.reason}）。LINE Official Account Managerで発行したチャネルアクセストークンか確認してください。` }, { status: 400 });
  }

  const { error } = await supabase
    .from('provider_line_channels')
    .upsert({
      provider_id: provider.id,
      channel_id: channel_id || null,
      channel_secret: channel_secret || null,
      channel_access_token,
      liff_id: liff_id || null,
      verified_at: new Date().toISOString(),
      connected_by: 'self',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, botDisplayName: check.displayName, basicId: check.basicId });
}
