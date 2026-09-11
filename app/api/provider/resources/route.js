// GET  /api/provider/resources → 自店舗の部屋・設備一覧（認証済み）
// POST /api/provider/resources → 追加
// hacomono/STORES網羅計画 Phase 1。スタッフとは独立に管理し、即時予約モードの
// 空き枠がスタッフ+部屋の組で二重にブロックされるようにする（今野くんの実地メモ：
// 部屋のブロック忘れによるダブルブッキングを防ぐ）。
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
    .from('provider_resources')
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
  const { name, type, active, sort_order } = body;
  if (!name?.trim()) return Response.json({ error: '名前は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_resources')
    .insert({
      provider_id: provider.id,
      name: String(name).slice(0, 100),
      type: type ? String(type).slice(0, 30) : 'room',
      active: active === undefined ? true : !!active,
      sort_order: sort_order ? Number(sort_order) : 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
