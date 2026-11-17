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
