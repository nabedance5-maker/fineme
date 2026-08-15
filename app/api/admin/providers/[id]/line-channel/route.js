// PATCH /api/admin/providers/[id]/line-channel - 運営がLINEチャネル連携を代行入力（伴走型オンボーディング）
import { getSupabase } from '@/lib/supabase';
import { validateLineChannelToken } from '@/lib/line-channel';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function PATCH(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { channel_id, channel_secret, channel_access_token, liff_id } = await request.json();
  if (!channel_access_token) {
    return Response.json({ error: 'channel_access_token は必須です' }, { status: 400 });
  }

  const check = await validateLineChannelToken(channel_access_token);
  if (!check.ok) {
    return Response.json({ error: `トークンを確認できませんでした（${check.reason}）` }, { status: 400 });
  }

  const { error } = await supabase
    .from('provider_line_channels')
    .upsert({
      provider_id: id,
      channel_id: channel_id || null,
      channel_secret: channel_secret || null,
      channel_access_token,
      liff_id: liff_id || null,
      verified_at: new Date().toISOString(),
      connected_by: 'staff',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, botDisplayName: check.displayName, basicId: check.basicId });
}

export async function GET(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  const { data } = await supabase
    .from('provider_line_channels')
    .select('channel_id, liff_id, verified_at, connected_by, updated_at')
    .eq('provider_id', id)
    .single();
  return Response.json(data || { connected: false });
}
