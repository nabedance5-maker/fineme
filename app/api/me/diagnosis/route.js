// GET  /api/me/diagnosis?track=fineme|belle - 自分の診断結果を取得
//      ?history=1          - 自分の受検履歴（新しい順・最大30件の要約）
//      ?snapshot=<id>      - 履歴のうち1件の回答データ（本人のものだけ）
// POST /api/me/diagnosis - 診断結果をSupabaseに保存（トラックごとにupsert＋履歴へ追記）
//
// 履歴（diagnosis_snapshots）は受け直しのたびに1行追記する。diagnosis_results は最新の
// 1行（他画面・店舗カルテが参照）として従来どおり残す（Muse指示書 2026-11-22 §1-1）。
//
// トラックごとに1行持つ（supabase-diagnosis-track.sql）。
// 従来は user_id 単独の1行だったため、男性版のあとにBelle版を受けると上書きされていた。
// 未適用の環境では従来どおりの1行運用にフォールバックする。
import { getSupabase } from '@/lib/supabase';
import { cleanGoals } from '@/lib/goal';

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

// raw_data.at（ミリ秒の数値 or ISO文字列）を受検日時に。無ければ今
function takenAtOf(raw) {
  const at = raw?.at;
  const d = typeof at === 'number' || /^\d{12,14}$/.test(String(at || '')) ? new Date(Number(at)) : new Date(at || Date.now());
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 履歴の要約：一覧に要る項目だけ返す（回答の全文は ?snapshot= で1件ずつ）
function summarizeSnapshot(row) {
  const r = row.result || {};
  return {
    id: row.id,
    taken_at: row.taken_at,
    type: r.displayCode || r.fullName ? { displayCode: r.displayCode || null, fullName: r.fullName || null, typeCode: r.typeCode || null } : null,
    compass_first: row.raw_data?.compass_first || null,
    priority_order: Array.isArray(row.raw_data?.priority_order) ? row.raw_data.priority_order.slice(0, 3) : [],
  };
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

  if (searchParams.get('history') === '1') {
    const { data: rows, error: hErr } = await supabase
      .from('diagnosis_snapshots')
      .select('id, taken_at, raw_data, result')
      .eq('user_id', user.id)
      .eq('track', track)
      .order('taken_at', { ascending: false })
      .limit(30);
    if (hErr) return Response.json([]);
    return Response.json((rows || []).map(summarizeSnapshot));
  }

  const snapshotId = searchParams.get('snapshot');
  if (snapshotId) {
    if (!UUID_RE.test(snapshotId)) return Response.json(null, { status: 400 });
    const { data: snap } = await supabase
      .from('diagnosis_snapshots')
      .select('id, taken_at, raw_data, result')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!snap) return Response.json(null, { status: 404 });
    return Response.json({ id: snap.id, taken_at: snap.taken_at, raw_data: snap.raw_data, result: snap.result });
  }

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

  // 目指す場所（goal_scene / goal_change / goal_vision）だけを最新の回答データに反映する
  // （結果ページ・Mapの「目指す場所を決める」から。Muse指示書 2026-11-22 §2-1）
  if (body?.goals && typeof body.goals === 'object') {
    const goals = cleanGoals(body.goals);
    const { data: row } = await supabase
      .from('diagnosis_results')
      .select('raw_data')
      .eq('user_id', user.id)
      .eq('track', track)
      .maybeSingle();
    if (!row?.raw_data) return Response.json({ error: '診断結果が見つかりません' }, { status: 404 });
    const merged = { ...row.raw_data, ...goals };
    const { error: gErr } = await supabase
      .from('diagnosis_results')
      .update({ raw_data: merged })
      .eq('user_id', user.id)
      .eq('track', track);
    if (gErr) return Response.json({ error: gErr.message }, { status: 500 });
    const { data: latestSnap } = await supabase
      .from('diagnosis_snapshots')
      .select('id, raw_data')
      .eq('user_id', user.id)
      .eq('track', track)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestSnap) {
      await supabase.from('diagnosis_snapshots')
        .update({ raw_data: { ...latestSnap.raw_data, ...goals } })
        .eq('id', latestSnap.id).eq('user_id', user.id);
    }
    return Response.json({ ok: true, goals });
  }

  const result = body?.result;
  if (!result || typeof result !== 'object') return Response.json({ error: 'result は必須です' }, { status: 400 });

  const { error } = await supabase
    .from('diagnosis_results')
    .update({ result })
    .eq('user_id', user.id)
    .eq('track', track);

  if (!error) {
    // 履歴の最新1件（＝今表示している受検）にもタイプ判定を残す
    const { data: latest } = await supabase
      .from('diagnosis_snapshots')
      .select('id')
      .eq('user_id', user.id)
      .eq('track', track)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) await supabase.from('diagnosis_snapshots').update({ result }).eq('id', latest.id).eq('user_id', user.id);
    return Response.json({ ok: true });
  }

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

  if (!error) {
    // 受け直しても前回の結果が消えないよう、履歴に追記する（同じ受検の再送は無視）
    const { error: snapErr } = await supabase
      .from('diagnosis_snapshots')
      .upsert(
        { user_id: user.id, track, taken_at: takenAtOf(raw_data), raw_data },
        { onConflict: 'user_id,track,taken_at', ignoreDuplicates: true }
      );
    if (snapErr) console.error('[me/diagnosis] snapshot insert error', snapErr.message);
    return Response.json({ ok: true });
  }

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
