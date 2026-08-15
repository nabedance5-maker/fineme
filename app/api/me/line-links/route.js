// GET  /api/me/line-links → 自分が連携済みの店舗一覧（provider_slug配列）
// POST /api/me/line-links → 店舗の公式LINEチャネル上のuserIdを自分に紐づける（LIFF連携フロー用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: links } = await supabase
    .from('provider_customer_line_links')
    .select('provider_id')
    .eq('user_id', user.id);
  const providerIds = (links || []).map(l => l.provider_id);
  if (!providerIds.length) return Response.json({ linkedSlugs: [] });

  const { data: providers } = await supabase.from('providers').select('id, slug').in('id', providerIds);
  return Response.json({ linkedSlugs: (providers || []).map(p => p.slug) });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider_slug, store_line_user_id } = await request.json();
  if (!provider_slug || !store_line_user_id) {
    return Response.json({ error: 'provider_slug と store_line_user_id は必須です' }, { status: 400 });
  }

  const { data: provider } = await supabase.from('providers').select('id').eq('slug', provider_slug).single();
  if (!provider) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });

  const { error } = await supabase
    .from('provider_customer_line_links')
    .upsert({ provider_id: provider.id, user_id: user.id, store_line_user_id, linked_at: new Date().toISOString() }, { onConflict: 'provider_id,user_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
