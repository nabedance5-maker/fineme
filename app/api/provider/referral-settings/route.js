// GET   /api/provider/referral-settings → 自店舗の友達紹介プログラム設定（特典文言）
// PATCH /api/provider/referral-settings → 保存
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('provider_referral_settings').select('reward_text, message_text, image_url, button_label, button_url').eq('provider_id', provider.id).maybeSingle();
  return Response.json({
    reward_text: data?.reward_text || '',
    message_text: data?.message_text || '',
    image_url: data?.image_url || '',
    button_label: data?.button_label || '',
    button_url: data?.button_url || '',
  });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { reward_text, message_text, image_url, button_label, button_url } = await request.json().catch(() => ({}));
  // button_urlはpublicページでa hrefにそのまま出すため、http(s)以外（javascript:等）は保存しない
  const safeButtonUrl = button_url && /^https?:\/\//i.test(button_url.trim()) ? button_url.trim() : null;
  const { error } = await supabase
    .from('provider_referral_settings')
    .upsert({
      provider_id: provider.id,
      reward_text: reward_text || null,
      message_text: message_text || null,
      image_url: image_url || null,
      button_label: button_label || null,
      button_url: safeButtonUrl,
      updated_at: new Date().toISOString(),
    });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
