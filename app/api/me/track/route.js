// GET  /api/me/track - 自分のトラック（fineme / belle）を取得
// POST /api/me/track - トラックを保存（マイページからの明示切替・初回昇格）
//
// profiles.track は supabase-profiles-track.sql で追加する。
// 未適用でも 500 を返さず null を返す（クライアントは localStorage で成立する）。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const VALID = ['fineme', 'belle'];

// track カラム未適用（42703 undefined_column / PGRST204 schema cache）を判定する
function isMissingTrackColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204') && /track/i.test(error.message || '');
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
    .select('track')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingTrackColumn(error)) return Response.json({ track: null, pending_migration: true });
    return Response.json({ track: null });
  }
  return Response.json({ track: VALID.includes(data?.track) ? data.track : null });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { track } = await request.json();
  if (!VALID.includes(track)) {
    return Response.json({ error: 'track は fineme / belle のいずれか' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, track, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    // カラム未適用でもクライアント側の体験は localStorage で成立するため失敗にしない
    if (isMissingTrackColumn(error)) return Response.json({ ok: true, pending_migration: true });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
