// Zone conversion: normalize score to 0-100, determine zone, distance to next, and smoothed index
// This is a client-side MVP util. In production, compute server-side and cache.

export const ZONES = [
  { code:'top', name:'上位表示ゾーン', min:75 },
  { code:'standard', name:'標準表示ゾーン', min:55 },
  { code:'growth', name:'成長中ゾーン', min:35 },
  { code:'prep', name:'準備中ゾーン', min:0 }
];

export function normalizeScore(Si, Smin, Smax){
  if(Smax<=Smin) return 0;
  const n = ((Si - Smin) / (Smax - Smin)) * 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function zoneOf(Ni){
  for(const z of ZONES){ if(Ni >= z.min) return z; }
  return ZONES[ZONES.length-1];
}

export function distanceToNextZone(Ni){
  const current = zoneOf(Ni);
  const zonesDesc = ZONES.slice().sort((a,b)=> b.min - a.min);
  const idx = zonesDesc.findIndex(z=> z.code===current.code);
  const next = zonesDesc[idx-1] || null;
  if(!next) return 0; // already top
  return Math.max(0, next.min - Ni);
}

export function smooth(prevNi, newNi, alpha=0.3){
  if(typeof prevNi !== 'number') return newNi;
  return Math.round((alpha * newNi) + ((1 - alpha) * prevNi));
}
