// GET /api/providers/[slug]/liff-id → 公開情報。店舗別LINE連携用のLIFF IDのみを返す（機密情報は含まない）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;
  const { data: provider } = await supabase.from('providers').select('id, name').eq('slug', slug).single();
  if (!provider) return Response.json({ error: 'not-found' }, { status: 404 });

  const { data: channel } = await supabase
    .from('provider_line_channels')
    .select('liff_id, verified_at')
    .eq('provider_id', provider.id)
    .single();

  if (!channel?.liff_id || !channel.verified_at) {
    return Response.json({ connected: false, providerName: provider.name });
  }
  return Response.json({ connected: true, liffId: channel.liff_id, providerName: provider.name });
}
