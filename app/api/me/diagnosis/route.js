// GET  /api/me/diagnosis - 自分の最新診断結果を取得
// POST /api/me/diagnosis - 診断結果をSupabaseに保存（upsert）
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

  const { data, error } = await supabase
    .from('diagnosis_results')
    .select('raw_data, created_at')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return Response.json(null);
  return Response.json(data.raw_data);
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { raw_data } = await request.json();
  if (!raw_data) return Response.json({ error: 'raw_data は必須です' }, { status: 400 });

  const { error } = await supabase
    .from('diagnosis_results')
    .upsert(
      { user_id: user.id, raw_data, scores: null, result: null },
      { onConflict: 'user_id' }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
