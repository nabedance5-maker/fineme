// GET  /api/me/attributes - 自分の属性（年代）を取得
// POST /api/me/attributes - 属性を保存（初回登録・マイページからの訂正）
//
// profiles.age_band は supabase-profiles-age-band.sql で追加する。
// 未適用でも 500 を返さず null を返す（クライアントは localStorage で成立する）。
import { getSupabase } from '@/lib/supabase';
import { normalizeUserArea } from '@/lib/user-area';

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

  const body = await request.json().catch(() => ({}));
  const { age_band } = body;
  const hasAge = age_band !== undefined;
  // 端末に保存したお住まいの地域（登録画面・診断結果で選んだもの）。ログイン直後の引き継ぎ用なので、
  // サーバーに既に入っている地域は上書きしない（別の端末やマイページで直した値を古い端末の値で戻さない）。
  const hasArea = body.area !== undefined || body.city !== undefined;
  const loc = hasArea ? normalizeUserArea(body.area, body.city) : null;

  if (!hasAge && !hasArea) return Response.json({ error: 'age_band または area/city が必要です' }, { status: 400 });
  if (hasAge && !VALID_AGE_BANDS.includes(age_band)) {
    return Response.json({ error: 'age_band は 10s/20s/30s/40s/50s_plus のいずれか' }, { status: 400 });
  }
  if (hasArea && !loc) return Response.json({ error: 'お住まいの地域が正しくありません' }, { status: 400 });

  if (hasArea) {
    const { data: cur } = await supabase.from('profiles').select('area, city').eq('id', user.id).maybeSingle();
    if (!String(cur?.area || '').trim() || !String(cur?.city || '').trim()) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, area: loc.area, city: loc.city, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) return Response.json({ error: 'save failed' }, { status: 500 });
    }
    if (!hasAge) return Response.json({ ok: true });
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
