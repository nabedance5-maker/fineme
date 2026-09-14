// GET   /api/provider/shift-settings → 自店舗のシフト作成ルール設定（未作成なら既定値で返す）
// PATCH /api/provider/shift-settings → ルール設定を更新
// staffing_targets（曜日固定の必要人数）はパターン方式（provider_shift_patterns +
// provider_shift_period_day_patterns）に置き換えたため、ここではrule_typeのみ扱う
// （でお要望2026-09-14：曜日ごとに1個ずつ作るのは大変、パターンを日付へ一括割当したい）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

// でお要望2026-09-14：デフォルトは時間帯パターンの必要人数方式を表示する
const DEFAULT_SETTINGS = { rule_type: 'staffing_target' };

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('provider_shift_settings')
    .select('rule_type')
    .eq('provider_id', provider.id)
    .single();

  return Response.json(data || DEFAULT_SETTINGS);
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body.rule_type || !['as_requested', 'staffing_target'].includes(body.rule_type)) {
    return Response.json({ error: 'rule_typeが不正です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('provider_shift_settings')
    .upsert({ provider_id: provider.id, rule_type: body.rule_type, updated_at: new Date().toISOString() }, { onConflict: 'provider_id' })
    .select('rule_type')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
