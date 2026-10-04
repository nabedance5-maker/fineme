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
