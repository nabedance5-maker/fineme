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
  HEADER_SHORTCUT_OPTIONS,
  MAX_HEADER_SHORTCUTS,
  isValidSidebarOrder,
  isValidTabCategoryOverrides,
  isValidTabOrderOverrides,
  isValidCustomCategories,
  allCategoryKeys,
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
  const current = resolveDashboardPrefs(provider);
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
  if ('header_shortcuts' in body) {
    const shortcuts = body.header_shortcuts;
    const valid = Array.isArray(shortcuts) && shortcuts.length <= MAX_HEADER_SHORTCUTS &&
      shortcuts.every(k => HEADER_SHORTCUT_OPTIONS.some(o => o.key === k));
    if (valid) updates.header_shortcuts = shortcuts;
  }
  if ('calendar_column_order' in body) {
    const order = body.calendar_column_order;
    const valid = Array.isArray(order) && order.length <= 200 &&
      order.every(k => typeof k === 'string' && (k.startsWith('staff:') || k.startsWith('resource:')));
    if (valid) updates.calendar_column_order = order;
  }

  // 店舗が任意の名前で追加できる大カテゴリー（でお要望2026-09-27）。追加・削除の直後は
  // sidebar_order / tab_category_overrides / tab_order_overrides が参照する「有効なカテゴリー
  // キー集合」自体が変わるため、他のバリデーションより先に確定させる。
  let customCategories = current.custom_categories;
  if ('custom_categories' in body) {
    if (!isValidCustomCategories(body.custom_categories)) {
      return Response.json({ error: 'カテゴリーの形式が不正です（名前は20文字以内・最大8個まで）' }, { status: 400 });
    }
    customCategories = body.custom_categories;
    updates.custom_categories = customCategories;
  }
  const validCategoryKeys = allCategoryKeys(customCategories);
  const categoriesChanged = 'custom_categories' in body;

  // タブのカテゴリー所属・カテゴリー内並び順のカスタマイズ（でお要望2026-09-27）。
  // クライアントが明示的に指定していれば検証して使い、指定が無くカテゴリー構成だけが
  // 変わった時は、削除されたカテゴリーを指す古い参照を自動で取り除く（宙に浮いた
  // 参照が残ってバリデーション不能になるのを防ぐ）。
  if ('sidebar_order' in body && isValidSidebarOrder(body.sidebar_order, validCategoryKeys)) {
    updates.sidebar_order = body.sidebar_order;
  } else if (categoriesChanged) {
    const healed = current.sidebar_order.filter(k => validCategoryKeys.includes(k));
    validCategoryKeys.forEach(k => { if (!healed.includes(k)) healed.push(k); });
    updates.sidebar_order = healed;
  }

  if ('tab_category_overrides' in body && isValidTabCategoryOverrides(body.tab_category_overrides, validCategoryKeys)) {
    updates.tab_category_overrides = body.tab_category_overrides;
  } else if (categoriesChanged) {
    const healed = { ...current.tab_category_overrides };
    Object.keys(healed).forEach(tabKey => { if (!validCategoryKeys.includes(healed[tabKey])) delete healed[tabKey]; });
    updates.tab_category_overrides = healed;
  }

  if ('tab_order_overrides' in body && isValidTabOrderOverrides(body.tab_order_overrides, validCategoryKeys)) {
    updates.tab_order_overrides = body.tab_order_overrides;
  } else if (categoriesChanged) {
    const healed = { ...current.tab_order_overrides };
    Object.keys(healed).forEach(catKey => { if (!validCategoryKeys.includes(catKey)) delete healed[catKey]; });
    updates.tab_order_overrides = healed;
  }

  if (!Object.keys(updates).length) {
    return Response.json({ error: '更新する設定を指定してください' }, { status: 400 });
  }

  const merged = { ...current, ...updates };
  const { error } = await supabase
    .from('providers')
    .update({ dashboard_prefs: merged })
    .eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, prefs: merged });
}
