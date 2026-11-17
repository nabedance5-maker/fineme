import { FEATURE_DEFS, planAllows } from '@/lib/feature-flags';

// APIルート用: プランが足りない時だけ403のResponseを返す（足りていればnull）。
// providerはplanをSELECTしていること。
export function planLockedResponse(provider, key) {
  if (planAllows(provider, key)) return null;
  const def = FEATURE_DEFS[key];
  return Response.json(
    { error: `${def.label}は${def.minPlan}プラン以上でご利用いただけます`, code: 'plan_locked', min_plan: def.minPlan, feature: key },
    { status: 403 },
  );
}

// お店のIDだけ分かっている入口（スタッフ用のリンク等）用。プランが足りない時だけ403のResponseを返す（2026-11-17）
export async function providerPlanLocked(db, providerId, key) {
  const { data: provider } = await db.from('providers').select('plan').eq('id', providerId).maybeSingle();
  if (!provider) return Response.json({ error: 'お店が見つかりません' }, { status: 404 });
  return planLockedResponse(provider, key);
}

// お客様側の新しい申し込み（回数券の購入・入会）を、お店のプランで止める（2026-11-17 渡邉判断）。
// プランを下げたお店では新しい販売だけ止め、すでに入会している会員の月会費・持っているチケットはそのまま使える。
export const CUSTOMER_LOCK_MESSAGES = {
  customer_packages: 'このお店では、いまオンラインでの回数券の購入を受け付けていません。お店に直接お問い合わせください',
  membership_enrollment: 'このお店では、いまオンラインでの入会を受け付けていません。お店に直接お問い合わせください',
};
export async function customerSaleLocked(db, providerId, key) {
  const { data: provider } = await db.from('providers').select('plan').eq('id', providerId).maybeSingle();
  if (!provider) return Response.json({ error: 'お店が見つかりません' }, { status: 404 });
  if (planAllows(provider, key)) return null;
  return Response.json({ error: CUSTOMER_LOCK_MESSAGES[key], code: 'store_plan_locked' }, { status: 403 });
}
