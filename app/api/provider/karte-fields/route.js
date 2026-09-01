// GET  /api/provider/karte-fields → 自店舗が定義したカルテのカスタム項目一覧（認証済み）
// POST /api/provider/karte-fields → カスタム項目を新規追加（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const FIELD_TYPES = ['text', 'select', 'stars'];

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_karte_fields')
    .select('id, label, field_type, options, sort_order')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { label, field_type, options } = await request.json();
  if (!label?.trim()) return Response.json({ error: 'ラベルは必須です' }, { status: 400 });
  if (!FIELD_TYPES.includes(field_type)) return Response.json({ error: '種類が不正です' }, { status: 400 });
  if (field_type === 'select' && !(Array.isArray(options) && options.length)) {
    return Response.json({ error: '選択肢を1つ以上入力してください' }, { status: 400 });
  }

  const { count } = await supabase
    .from('provider_karte_fields')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id);

  const { data, error } = await supabase
    .from('provider_karte_fields')
    .insert({
      provider_id: provider.id,
      label: label.trim(),
      field_type,
      options: field_type === 'select' ? options : null,
      sort_order: count || 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
