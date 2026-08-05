// GET  /api/me/attributes - 自分の属性（年代）を取得
// POST /api/me/attributes - 属性を保存（初回登録・マイページからの訂正）
//
// profiles.age_band は supabase-profiles-age-band.sql で追加する。
// 未適用でも 500 を返さず null を返す（クライアントは localStorage で成立する）。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const VALID_AGE_BANDS = ['10s', '20s', '30s', '40s', '50s_plus'];

// age_band カラム未適用（42703 undefined_column / PGRST204 schema cache）を判定する
function isMissingAgeBandColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204') && /age_band/i.test(error.message || '');
}

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
    .from('profiles')
    .select('age_band')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingAgeBandColumn(error)) return Response.json({ age_band: null, pending_migration: true });
    return Response.json({ age_band: null });
  }
  return Response.json({ age_band: VALID_AGE_BANDS.includes(data?.age_band) ? data.age_band : null });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { age_band } = await request.json();
  if (!VALID_AGE_BANDS.includes(age_band)) {
    return Response.json({ error: 'age_band は 10s/20s/30s/40s/50s_plus のいずれか' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, age_band, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    // カラム未適用でもクライアント側の体験は localStorage で成立するため失敗にしない
    if (isMissingAgeBandColumn(error)) return Response.json({ ok: true, pending_migration: true });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
