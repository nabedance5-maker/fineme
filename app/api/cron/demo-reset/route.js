// GET /api/cron/demo-reset → 営業用のデモ店舗を、毎晩元の状態に戻す（2026-11-14）。
// 前の人が入れたデータ・変えた設定を消し、架空のデータを今日の日付で作り直す。デモ店舗のログインもすべて切る。
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { getSupabase } from '@/lib/supabase';
import { resetDemo } from '@/lib/demo-seed';

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await resetDemo(getSupabase());
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error('[demo-reset]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
