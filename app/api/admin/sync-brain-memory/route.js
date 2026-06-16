// POST /api/admin/sync-brain-memory
// ~/MyBrain/Memory.md の内容を Supabase agent_memory テーブルに同期する
// scripts/sync-brain-memory.js から呼ばれる

import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SYNC_SECRET = process.env.CRON_SECRET;

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!SYNC_SECRET || authHeader !== `Bearer ${SYNC_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content } = body;
  if (typeof content !== 'string' || !content.trim()) {
    return Response.json({ error: 'content is required' }, { status: 400 });
  }

  const db = getSupabase();
  const { error } = await db
    .from('agent_memory')
    .upsert({ id: 'main', content, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[sync-brain-memory] upsert error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, length: content.length });
}
