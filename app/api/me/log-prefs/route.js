// GET  /api/me/log-prefs - New Me Log の通知設定を取得
// POST /api/me/log-prefs - 通知の声・頻度を保存
//
// supabase-log-prefs.sql 未適用でも 500 を返さず既定値で応答する。
import { getSupabase } from '@/lib/supabase';
import { VOICE_IDS, NOTIFY_LEVELS, DEFAULT_NOTIFY_LEVEL } from '@/lib/log-voice';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export const dynamic = 'force-dynamic';

const LEVEL_IDS = Object.keys(NOTIFY_LEVELS);

function isMissingPrefColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /log_voice|log_notify_level/i.test(error.message || '');
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

  const { data, error } = await supabase
    .from('profiles')
    .select('log_voice, log_notify_level')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingPrefColumn(error)) {
      return Response.json({ voice: null, level: DEFAULT_NOTIFY_LEVEL, pending_migration: true });
    }
    return Response.json({ voice: null, level: DEFAULT_NOTIFY_LEVEL });
  }

  return Response.json({
    voice: VOICE_IDS.includes(data?.log_voice) ? data.log_voice : null, // null = トラックの既定を使う
    level: LEVEL_IDS.includes(data?.log_notify_level) ? data.log_notify_level : DEFAULT_NOTIFY_LEVEL,
  });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = { id: user.id, updated_at: new Date().toISOString() };

  if (body.voice !== undefined) {
    if (body.voice !== null && !VOICE_IDS.includes(body.voice)) {
      return Response.json({ error: 'voice の値が不正です' }, { status: 400 });
    }
    update.log_voice = body.voice;
  }
  if (body.level !== undefined) {
    if (!LEVEL_IDS.includes(body.level)) {
      return Response.json({ error: 'level の値が不正です' }, { status: 400 });
    }
    update.log_notify_level = body.level;
  }

  const { error } = await supabase.from('profiles').upsert(update, { onConflict: 'id' });

  if (error) {
    if (isMissingPrefColumn(error)) return Response.json({ ok: true, pending_migration: true });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
