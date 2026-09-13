// GET  /api/provider/shift-patterns → 自店舗のシフト必要人数パターン一覧
// POST /api/provider/shift-patterns → パターンを新規作成（name, slots:[{start,end,required}]）
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
    .from('provider_shift_patterns')
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

  const body = await request.json().catch(() => ({}));
  const { name, slots } = body;
  if (!name?.trim()) return Response.json({ error: 'パターン名は必須です' }, { status: 400 });
  if (!Array.isArray(slots) || !slots.length) return Response.json({ error: '時間帯を1つ以上追加してください' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_shift_patterns')
    .insert({ provider_id: provider.id, name: name.trim(), slots })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
