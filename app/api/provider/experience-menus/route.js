// GET  /api/provider/experience-menus → 自店舗の体験メニュー一覧（認証済み）
// POST /api/provider/experience-menus → 新規メニュー作成（認証済み）
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

  const { data, error } = await supabase
    .from('provider_experience_menus')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, price, duration_min, axes, description, images } = await request.json();
  if (!name?.trim()) return Response.json({ error: '名前は必須です' }, { status: 400 });
  if (!price || !duration_min) return Response.json({ error: '価格と所要時間は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_experience_menus')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      price: Number(price),
      duration_min: Number(duration_min),
      axes: Array.isArray(axes) ? axes : [],
      description: description || '',
      images: Array.isArray(images) ? images : [],
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
