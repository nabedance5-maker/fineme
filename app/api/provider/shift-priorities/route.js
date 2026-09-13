// GET  /api/provider/shift-priorities → 自店舗の全スタッフの優先度ポイント一覧
// POST /api/provider/shift-priorities → まとめて保存（[{staff_id, priority_score, note}]）
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
    .from('provider_shift_priorities')
    .select('staff_id, priority_score, note')
    .eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return Response.json({ error: '保存する優先度がありません' }, { status: 400 });

  const rows = items
    .filter(it => it.staff_id)
    .map(it => ({
      provider_id: provider.id,
      staff_id: it.staff_id,
      priority_score: Number.isFinite(it.priority_score) ? it.priority_score : 0,
      note: it.note || null,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from('provider_shift_priorities')
    .upsert(rows, { onConflict: 'provider_id,staff_id' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
