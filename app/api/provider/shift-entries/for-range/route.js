// GET /api/provider/shift-entries/for-range?from=&to= → 確定済みシフトの勤務時間帯一覧
// 予約カレンダーで「出勤していないスタッフの枠を自動でグレー表示する」ために使う
// （でお要望2026-09-14）。既存の /api/provider/shift-entries は periodId 指定が必須
// （シフト管理タブ内で1期間ずつ見る用）だが、カレンダー側は週をまたいで複数期間に
// またがることもあるため、日付範囲＋確定済み(status='confirmed')の期間だけを対象に
// 横断的に取得する専用エンドポイントを新設した。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';
import { confirmedEntriesIn } from '@/lib/shift-store';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return Response.json({ error: 'from/toは必須です' }, { status: 400 });

  // 確定は日付ごと（2026-10-27：期間をやめた）。呼び出し側の形（coveredPeriods）は変えず、確定した日を1日ずつ返す
  const { days, entries } = await confirmedEntriesIn(supabase, provider.id, from, to);
  return Response.json({
    entries,
    coveredPeriods: [...days].sort().map(d => ({ start: d, end: d })),
  });
}
