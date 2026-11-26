// お店の住所から緯度・経度を出す（2026-11-26）。
// 以前は OpenStreetMap（Nominatim）だけを使っていたが、日本の「〇丁目〇番」まで入った住所はほとんど見つからない
// （例：「大阪府枚方市岡東町12-2」で0件）。国土地理院の住所検索を先に使い、見つからない時だけ Nominatim を使う。
// 送るのはお店の所在地（公開している情報）だけ。お客様の住所には使わない。
const GSI = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q=';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ja&q=';

const valid = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat > 20 && lat < 46.5 && lon > 122 && lon < 154.5; // 日本の範囲

export async function geocodeAddress(parts) {
  const q = (Array.isArray(parts) ? parts : [parts]).map(v => String(v || '').trim()).filter(Boolean).join('').slice(0, 200);
  if (q.length < 3) return null;
  try {
    const res = await fetch(GSI + encodeURIComponent(q), { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      const c = d?.[0]?.geometry?.coordinates;
      if (c && valid(Number(c[1]), Number(c[0]))) return { lat: Number(c[1]), lon: Number(c[0]) };
    }
  } catch { /* 次の手段へ */ }
  try {
    const res = await fetch(NOMINATIM + encodeURIComponent(`${q} 日本`), { headers: { 'User-Agent': 'Fineme/1.0' }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      const lat = parseFloat(d?.[0]?.lat), lon = parseFloat(d?.[0]?.lon);
      if (valid(lat, lon)) return { lat, lon };
    }
  } catch { /* 位置が取れなくても保存は続ける */ }
  return null;
}
