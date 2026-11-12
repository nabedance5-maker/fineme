// GET /api/cron/auto-visited
// 確定済み（approved）のまま来店確認されていない予約を、予約の終わりの時刻から店舗が決めた時間
// （providers.auto_visit_hours。既定24時間・null＝自動にしない）が過ぎたら来店済みにする（来店ボタンの押し忘れ対策）。
// 来店済みにした後の処理（New Me Log・紹介の確定・チケット）はお店が押した時と同じ（lib/reservation-visited.js）。
// お客様へのお礼の連絡だけは送らない（実際は来ていなかった予約に届くのを避ける）。来ていなかった時は、お店があとから「無断キャンセル」に直せる。
//
// 2026-11-12 作り直し：以前は Vercel の定期実行が送る「Authorization: Bearer」を見ておらず毎回401で一度も動いていなかった。
// また状態を変えるだけで visited_at・New Me Log・チケットの処理をしていなかった。
// Schedule: "20 * * * *"（1時間ごと）
import { getSupabase } from '@/lib/supabase';
import { afterVisited } from '@/lib/reservation-visited';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH = 300;

// 予約の終わりの時刻（日本時間）。終わりが無ければ始まりの時刻
function endsAt(r) {
  const date = r.confirmed_date || r.reserved_date;
  const time = String(r.end_time || r.confirmed_time || r.start_time || '00:00').slice(0, 5);
  return new Date(`${date}T${time}:00+09:00`).getTime();
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();

  const { data: providers, error: pErr } = await db.from('providers').select('id, name, auto_visit_hours').not('auto_visit_hours', 'is', null);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });
  const hoursOf = Object.fromEntries((providers || []).map(p => [p.id, p]));
  if (!providers?.length) return Response.json({ processed: 0 });

  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const { data: reservations, error } = await db.from('reservations')
    .select('*')
    .eq('status', 'approved')
    .in('provider_id', providers.map(p => p.id))
    .lte('reserved_date', today)
    .order('reserved_date', { ascending: true })
    .limit(BATCH);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  let processed = 0;
  const errors = [];
  for (const r of reservations || []) {
    const p = hoursOf[r.provider_id];
    const at = endsAt(r);
    if (!p || !Number.isFinite(at) || now - at < p.auto_visit_hours * 3600000) continue;
    try {
      // お店が同じ時に操作していても二重にならないよう、まだ確定済みの時だけ変える
      const { data: updated, error: uErr } = await db.from('reservations')
        .update({ status: 'visited', visited_at: new Date().toISOString() })
        .eq('id', r.id).eq('status', 'approved')
        .select().maybeSingle();
      if (uErr) { errors.push({ id: r.id, error: uErr.message }); continue; }
      if (!updated) continue;
      await afterVisited(db, updated, { previousStatus: 'approved', providerName: p.name, auto: true });
      processed++;
    } catch (e) {
      console.error(`[auto-visited] ${r.id}`, e);
      errors.push({ id: r.id, error: e.message });
    }
  }
  return Response.json({ processed, errors: errors.length ? errors : undefined });
}
