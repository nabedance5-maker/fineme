// GET /api/cron/archive-activity-logs
// Vercel Cron Job: 毎日 4:00 UTC に、30日より前の操作ログをテキストファイル(JSONL)として
// Storage に退避し、DBから削除する。DBには直近30日だけ残す（店舗が増えてもテーブルが膨らまない）。
// 保存先: activity-log-archive/{provider_id}/{YYYY-MM}/{YYYY-MM-DD}.jsonl（日本時間の日付ごと）
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const KEEP_DAYS = 30;
const BUCKET = 'activity-log-archive';
const BATCH = 2000;
const MAX_BATCHES = 6;

// 日本時間の0時（その日の途中で切らず、必ず1日単位で退避する）
function cutoffJstMidnight() {
  const jst = new Date(Date.now() + 9 * 3600 * 1000 - KEEP_DAYS * 86400000);
  const day = jst.toISOString().slice(0, 10);
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const cutoff = cutoffJstMidnight();
  let archived = 0;

  for (let b = 0; b < MAX_BATCHES; b++) {
    const { data: rows, error } = await db.from('provider_activity_logs')
      .select('*').lt('occurred_at', cutoff).order('occurred_at').limit(BATCH);
    if (error) {
      console.error('[cron/archive-activity-logs] select', error);
      return Response.json({ error: error.message, archived }, { status: 500 });
    }
    if (!rows?.length) break;

    const groups = {};
    for (const r of rows) {
      const day = new Date(new Date(r.occurred_at).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const path = `${r.provider_id}/${day.slice(0, 7)}/${day}.jsonl`;
      (groups[path] ||= []).push(r);
    }

    for (const [path, list] of Object.entries(groups)) {
      // 同じ日のファイルが既にあれば（前回の途中失敗・バッチの境目）、id で重複を除いて足す
      const merged = new Map();
      const prev = await db.storage.from(BUCKET).download(path);
      if (prev.data) {
        (await prev.data.text()).split('\n').filter(Boolean).forEach(line => {
          try { const o = JSON.parse(line); merged.set(o.id, o); } catch {}
        });
      }
      list.forEach(r => merged.set(r.id, r));
      const body = [...merged.values()].sort((a, c) => a.occurred_at.localeCompare(c.occurred_at)).map(o => JSON.stringify(o)).join('\n') + '\n';
      const up = await db.storage.from(BUCKET).upload(path, new Blob([body], { type: 'application/x-ndjson' }), { upsert: true, contentType: 'application/x-ndjson' });
      if (up.error) {
        console.error('[cron/archive-activity-logs] upload', path, up.error.message);
        return Response.json({ error: up.error.message, archived }, { status: 500 });
      }
      // アップロードに成功した分だけ削除する
      const { error: delErr } = await db.from('provider_activity_logs').delete().in('id', list.map(r => r.id));
      if (delErr) {
        console.error('[cron/archive-activity-logs] delete', delErr);
        return Response.json({ error: delErr.message, archived }, { status: 500 });
      }
      archived += list.length;
    }
    if (rows.length < BATCH) break;
  }
  return Response.json({ archived, cutoff });
}
