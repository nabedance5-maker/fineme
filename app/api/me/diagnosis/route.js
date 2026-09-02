// GET  /api/me/diagnosis?track=fineme|belle - 自分の診断結果を取得
// POST /api/me/diagnosis - 診断結果をSupabaseに保存（トラックごとにupsert）
//
// トラックごとに1行持つ（supabase-diagnosis-track.sql）。
// 従来は user_id 単独の1行だったため、男性版のあとにBelle版を受けると上書きされていた。
// 未適用の環境では従来どおりの1行運用にフォールバックする。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const VALID_TRACKS = ['fineme', 'belle'];

// track カラム未適用（42703 undefined_column / PGRST204 schema cache）を判定
function isMissingTrackColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204') && /track/i.test(error.message || '');
}

function normalizeTrack(v, fallback = 'fineme') {
  return VALID_TRACKS.includes(v) ? v : fallback;
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

  const { searchParams } = new URL(request.url);
  const track = normalizeTrack(searchParams.get('track'));

  const { data, error } = await supabase
    .from('diagnosis_results')
    .select('raw_data, created_at')
    .eq('user_id', user.id)
    .eq('track', track)
    .maybeSingle();

  if (error) {
    if (!isMissingTrackColumn(error)) return Response.json(null);
    // 未適用：1行しか無いので gender で照合し、トラック違いのデータは返さない
    const legacy = await supabase
      .from('diagnosis_results')
      .select('raw_data, created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (legacy.error || !legacy.data) return Response.json(null);
    const rowIsFemale = legacy.data.raw_data?.gender === 'female';
    if (rowIsFemale !== (track === 'belle')) return Response.json(null);
    return Response.json(legacy.data.raw_data);
  }

  if (!data) return Response.json(null);
  return Response.json(data.raw_data);
}

// PATCH /api/me/diagnosis?track=... - 計算済みのタイプ判定結果(136タイプ等)だけを保存する。
// 判定ロジック自体はapp/diagnosis/result/page.js・app/belle/diagnosis/result/page.jsの
// computeTypeIdentity()がクライアント側で行う（サーバー側では再実装しない＝男女トラック間の
// 語彙ズレを再発させないため）。ここは結果を店舗のカルテ等から参照できるよう保存するだけ。
export async function PATCH(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const track = normalizeTrack(searchParams.get('track'));
  const body = await request.json();
  const result = body?.result;
  if (!result || typeof result !== 'object') return Response.json({ error: 'result は必須です' }, { status: 400 });

  const { error } = await supabase
    .from('diagnosis_results')
    .update({ result })
    .eq('user_id', user.id)
    .eq('track', track);

  if (!error) return Response.json({ ok: true });

  if (isMissingTrackColumn(error)) {
    const legacy = await supabase.from('diagnosis_results').update({ result }).eq('user_id', user.id);
    if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
    return Response.json({ ok: true, pending_migration: true });
  }
  return Response.json({ error: error.message }, { status: 500 });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const raw_data = body?.raw_data;
  if (!raw_data) return Response.json({ error: 'raw_data は必須です' }, { status: 400 });

  // 明示指定 → raw_data.gender からの導出 の順で決める
  const track = normalizeTrack(body?.track, raw_data.gender === 'female' ? 'belle' : 'fineme');

  const { error } = await supabase
    .from('diagnosis_results')
    .upsert(
      { user_id: user.id, track, raw_data, scores: null, result: null },
      { onConflict: 'user_id,track' }
    );

  if (!error) return Response.json({ ok: true });

  if (isMissingTrackColumn(error)) {
    // 未適用：従来どおり user_id 単独でupsert（1ユーザー1行のまま）
    const legacy = await supabase
      .from('diagnosis_results')
      .upsert(
        { user_id: user.id, raw_data, scores: null, result: null },
        { onConflict: 'user_id' }
      );
    if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
    return Response.json({ ok: true, pending_migration: true });
  }

  return Response.json({ error: error.message }, { status: 500 });
}
