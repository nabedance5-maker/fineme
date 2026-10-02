// GET  /api/provider/locker-banks → 自店舗のロッカー群（配置図の単位）一覧
// POST /api/provider/locker-banks → ロッカー群を追加（名前・段数・横の数）
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt } from '@/lib/locker-layout';

export async function GET(request) {
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('provider_locker_banks')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const rows = toInt(body.grid_rows);
  const cols = toInt(body.grid_cols);
  if (!name) return Response.json({ error: '名前は必須です' }, { status: 400 });
  if (!(rows >= 1 && rows <= 60 && cols >= 1 && cols <= 60)) return Response.json({ error: '段数・横の数は1〜60で指定してください' }, { status: 400 });

  const { count } = await supabase.from('provider_locker_banks').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id);
  const { data, error } = await supabase
    .from('provider_locker_banks')
    .insert({ provider_id: provider.id, name, grid_rows: rows, grid_cols: cols, sort_order: count || 0 })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
