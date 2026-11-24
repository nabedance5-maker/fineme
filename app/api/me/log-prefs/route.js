// GET  /api/me/log-prefs - New Me Log の通知設定を取得
// POST /api/me/log-prefs - 通知の声・頻度・月の予算（任意）を保存
//
// budget：Log の「決めた予算と実際の支出」の比較に使う（Muse第2弾 7-3・渡邉判断(b) 2026-11-24）。
// null＝決めていない。値は lib/log-axes.js の BUDGET_LABELS のキーだけ受ける。
//
// supabase-log-prefs.sql 未適用でも 500 を返さず既定値で応答する。
import { getSupabase } from '@/lib/supabase';
import { VOICE_IDS, NOTIFY_LEVELS, DEFAULT_NOTIFY_LEVEL } from '@/lib/log-voice';
import { BUDGET_LABELS } from '@/lib/log-axes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export const dynamic = 'force-dynamic';

const LEVEL_IDS = Object.keys(NOTIFY_LEVELS);
const BUDGET_IDS = Object.keys(BUDGET_LABELS);

function isMissingPrefColumn(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /log_voice|log_notify_level|log_budget/i.test(error.message || '');
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
    .select('log_voice, log_notify_level, log_budget')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingPrefColumn(error)) {
      return Response.json({ voice: null, level: DEFAULT_NOTIFY_LEVEL, budget: null, pending_migration: true });
    }
    return Response.json({ voice: null, level: DEFAULT_NOTIFY_LEVEL, budget: null });
  }

  return Response.json({
    voice: VOICE_IDS.includes(data?.log_voice) ? data.log_voice : null, // null = トラックの既定を使う
    level: LEVEL_IDS.includes(data?.log_notify_level) ? data.log_notify_level : DEFAULT_NOTIFY_LEVEL,
    budget: BUDGET_IDS.includes(data?.log_budget) ? data.log_budget : null,
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
  if (body.budget !== undefined) {
    if (body.budget !== null && !BUDGET_IDS.includes(body.budget)) {
      return Response.json({ error: 'budget の値が不正です' }, { status: 400 });
    }
    update.log_budget = body.budget;
  }

  const { error } = await supabase.from('profiles').upsert(update, { onConflict: 'id' });

  if (error) {
    if (isMissingPrefColumn(error)) return Response.json({ ok: true, pending_migration: true });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
