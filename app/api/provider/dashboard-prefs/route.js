// GET   /api/provider/dashboard-prefs → 自店舗のダッシュボード表示カスタマイズ設定
//       （未設定キーはデフォルト値で補って返す）
// PATCH /api/provider/dashboard-prefs → 部分更新（渡したキーだけ上書き）
// lib/dashboard-prefs.js が唯一の定義元。app/api/provider/features/route.js と同じ設計方針。
import { getSupabase } from '@/lib/supabase';
import {
  resolveDashboardPrefs,
  LANDING_TAB_OPTIONS,
  CALENDAR_AXIS_OPTIONS,
  CALENDAR_DEFAULT_VIEW_OPTIONS,
  DEFAULT_SIDEBAR_ORDER,
} from '@/lib/dashboard-prefs';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, dashboard_prefs').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({ prefs: resolveDashboardPrefs(provider) });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const updates = {};

  if ('landing_tab' in body && LANDING_TAB_OPTIONS.some(o => o.key === body.landing_tab)) {
    updates.landing_tab = body.landing_tab;
  }
  if ('calendar_axis' in body && CALENDAR_AXIS_OPTIONS.some(o => o.key === body.calendar_axis)) {
    updates.calendar_axis = body.calendar_axis;
  }
  if ('calendar_default_view' in body && CALENDAR_DEFAULT_VIEW_OPTIONS.some(o => o.key === body.calendar_default_view)) {
    updates.calendar_default_view = body.calendar_default_view;
  }
  if ('sidebar_order' in body) {
    const order = body.sidebar_order;
    const valid = Array.isArray(order) && order.length === DEFAULT_SIDEBAR_ORDER.length &&
      DEFAULT_SIDEBAR_ORDER.every(k => order.includes(k));
    if (valid) updates.sidebar_order = order;
  }

  if (!Object.keys(updates).length) {
    return Response.json({ error: '更新する設定を指定してください' }, { status: 400 });
  }

  const merged = { ...resolveDashboardPrefs(provider), ...updates };
  const { error } = await supabase
    .from('providers')
    .update({ dashboard_prefs: merged })
    .eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, prefs: merged });
}
