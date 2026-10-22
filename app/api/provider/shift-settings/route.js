// GET   /api/provider/shift-settings → 自店舗のシフト作成ルール設定（未作成なら既定値で返す）
// PATCH /api/provider/shift-settings → ルール設定を更新
// submit_cycle：希望の提出ルール（何ごとに提出するか・締切・通知日）。期間を先に作らなくても、
// スタッフはこのルールで区切った期間ごとに希望を出せる（でお指摘 2026-10-16）。windows は直近の区切り。
// staffing_targets（曜日固定の必要人数）はパターン方式（provider_shift_patterns +
// provider_shift_period_day_patterns）に置き換えたため、ここではrule_typeのみ扱う
// （でお要望2026-09-14：曜日ごとに1個ずつ作るのは大変、パターンを日付へ一括割当したい）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { normalizeFormat } from '@/lib/shift-request-format';
import { normalizeSubmitNotify } from '@/lib/shift-submit-notify';
import { normalizeCycle, upcomingWindows, describeCycle } from '@/lib/shift-windows';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

// でお要望2026-09-14：デフォルトは時間帯パターンの必要人数方式を表示する
const DEFAULT_SETTINGS = { rule_type: 'staffing_target' };

function withDerived(d) {
  const cycle = normalizeCycle(d?.submit_cycle);
  return {
    ...d,
    request_format: normalizeFormat(d?.request_format),
    submit_notify: normalizeSubmitNotify(d?.submit_notify),
    submit_cycle: cycle,
    submit_cycle_configured: !!d?.submit_cycle,
    submit_cycle_label: describeCycle(cycle),
    windows: upcomingWindows(cycle),
  };
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { data } = await supabase
    .from('provider_shift_settings')
    .select('rule_type, request_format, submit_notify, submit_cycle')
    .eq('provider_id', provider.id)
    .maybeSingle();

  return Response.json(withDerived({ ...DEFAULT_SETTINGS, ...(data || {}) }));
}

async function __PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const update = { provider_id: provider.id, updated_at: new Date().toISOString() };
  if (body.rule_type !== undefined) {
    if (!['as_requested', 'staffing_target'].includes(body.rule_type)) return Response.json({ error: 'rule_typeが不正です' }, { status: 400 });
    update.rule_type = body.rule_type;
  }
  if (body.request_format !== undefined) update.request_format = normalizeFormat(body.request_format);
  if (body.submit_notify !== undefined) update.submit_notify = normalizeSubmitNotify(body.submit_notify);
  if (body.submit_cycle !== undefined) update.submit_cycle = normalizeCycle(body.submit_cycle);
  if (update.rule_type === undefined && update.request_format === undefined && update.submit_notify === undefined && update.submit_cycle === undefined) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_shift_settings')
    .upsert(update, { onConflict: 'provider_id' })
    .select('rule_type, request_format, submit_notify, submit_cycle')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(withDerived(data));
}

export const PATCH = withAudit(__PATCH);
