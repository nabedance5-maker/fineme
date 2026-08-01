// POST /api/me/service-logs/[id]/visits — 来店1回を記録する
// 履歴行のINSERTと、親ログ(last_visit/next_visit)のUPDATEを両方行う。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// supabase-service-log-visits.sql 未適用（テーブル自体が無い／schema cache未反映）かどうか
function isMissingVisitsTable(error) {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === 'PGRST200' || error.code === '42P01';
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const visited_at = body.visited_at;
  if (!visited_at) return Response.json({ error: 'visited_at は必須です' }, { status: 400 });
  const todayStr = new Date().toISOString().slice(0, 10);
  if (visited_at > todayStr) return Response.json({ error: '未来の日付は記録できません' }, { status: 400 });

  // 他人のログにvisitが紛れ込まないよう、まず自分のログか確認してから書く
  const { data: owned, error: findError } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (findError || !owned) return Response.json({ error: '記録が見つかりません' }, { status: 404 });

  let visit = null;
  let pendingMigration = false;
  const { data: insertedVisit, error: insertError } = await supabase
    .from('user_service_log_visits')
    .insert({
      log_id: id,
      user_id: user.id,
      visited_at,
      cost: body.cost ? Number(body.cost) : null,
    })
    .select()
    .single();

  if (insertError) {
    if (!isMissingVisitsTable(insertError)) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
    // 履歴テーブル未適用でも「✓ 今日行った」の主目的（last_visit更新）は落とさない
    pendingMigration = true;
  } else {
    visit = insertedVisit;
  }

  const { data: updated, error: updateError } = await supabase
    .from('user_service_logs')
    .update({ last_visit: visited_at, next_visit: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({
    ok: true,
    log: updated,
    visit,
    ...(pendingMigration ? { pending_migration: true } : {}),
  });
}
