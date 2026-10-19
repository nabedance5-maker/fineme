// GET /api/cron/broadcasts
// Vercel Cron: 10分ごと。日時を指定した店舗のメッセージ配信（provider_broadcasts.status='scheduled'）を、時刻が来たら送る
// （でお要望 2026-10-19：hacomono差分 #6）。同じ配信を二重に送らないよう、scheduled→sending を条件付き更新で取ってから送る。
import { getSupabase } from '@/lib/supabase';
import { deliverBroadcast } from '@/lib/broadcast';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const { data: due } = await db.from('provider_broadcasts').select('id').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(10);
  const results = [];
  for (const { id } of due || []) {
    const { data: b } = await db.from('provider_broadcasts').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', id).eq('status', 'scheduled').select().maybeSingle();
    if (!b) continue;
    try {
      results.push({ id, ...(await deliverBroadcast(db, b)) });
    } catch (e) {
      console.error('[cron broadcasts]', id, e?.message);
      await db.from('provider_broadcasts').update({ status: 'failed' }).eq('id', id);
      results.push({ id, error: true });
    }
  }
  return Response.json({ ok: true, results });
}
