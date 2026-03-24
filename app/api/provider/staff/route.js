// GET  /api/provider/staff   → 自分のスタッフ一覧（認証済み）
// POST /api/provider/staff   → スタッフ追加
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
    .from('provider_staff')
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

  const body = await request.json();
  const { name, role, bio, photo_url, experience_years, credentials, is_featured, sort_order } = body;
  if (!name?.trim()) return Response.json({ error: '名前は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_staff')
    .insert({
      provider_id: provider.id,
      name: String(name).slice(0, 100),
      role: role ? String(role).slice(0, 100) : null,
      bio: bio ? String(bio).slice(0, 800) : null,
      photo_url: photo_url || null,
      experience_years: experience_years ? Number(experience_years) : null,
      credentials: credentials ? String(credentials).slice(0, 400) : null,
      is_featured: !!is_featured,
      sort_order: sort_order ? Number(sort_order) : 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
