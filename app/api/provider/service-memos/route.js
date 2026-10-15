// GET /api/provider/service-memos?date=YYYY-MM-DD → その日に来るお客様ごとの接客メモ（認証済み）
// GET /api/provider/service-memos?reservation_id=... → 予約1件分（予約詳細モーダル用）
//
// 接客の引き出し（でお承認 2026-10-15：1.来店前の接客メモ 2.会計時の次回の一言 4.効果の見える化）。
// 事実の組み立ては lib/service-memo-build.js。AIの「今日聞くこと」「次回の一言」は
// キャッシュ済みのものだけ同梱し、未生成分は POST /api/provider/service-memos/ai で作る。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { buildServiceMemos } from '@/lib/service-memo-build';
import { fallbackAi } from '@/lib/service-memo';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: '日付の形式が正しくありません' }, { status: 400 });
  const reservationId = searchParams.get('reservation_id') || undefined;

  const result = await buildServiceMemos(supabase, provider, { date, reservationId });
  // AI未生成の予約にも、事実から機械的に作った控えめな下書きを付けておく（画面が空にならないように）
  result.items.forEach(it => { if (!it.ai) it.draft = fallbackAi(it); });
  return Response.json(result);
}
