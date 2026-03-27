// PATCH /api/provider/profile - 掲載者が自分のプロフィールを更新
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ALLOWED_FIELDS = [
  'name', 'catchphrase', 'description', 'target_desc', 'philosophy',
  'guide_message', 'unique_strengths',
  'area', 'prefecture', 'city', 'address', 'price_from', 'photo_url', 'provider_style',
  'suitable_triggers', 'handles_failure_patterns',
  'published',
  // 比較・信頼シグナルフィールド
  'nearest_station', 'online_available', 'payment_methods',
  'cancellation_policy', 'first_session_desc',
  'experience_years', 'credentials',
  'response_hours', 'trial_available', 'trial_desc',
  'facility_photos',
  'cover_image_url',
  // AI マッチング用テキストフィールド
  'ideal_client_desc',
  'client_before_state',
  'transformation_pattern',
  'best_fit_desc',
  'ai_match_profile',
];
const BOOLEAN_FIELDS  = new Set(['online_available', 'trial_available', 'published']);
const NUMBER_FIELDS   = new Set(['price_from', 'experience_years', 'response_hours']);
const ARRAY_FIELDS    = new Set(['suitable_triggers', 'handles_failure_patterns', 'payment_methods', 'facility_photos']);

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  // トークンからユーザー情報を取得
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // メールで掲載者を特定（geocoding フォールバック用に prefecture/city も取得）
  const { data: provider } = await supabase
    .from('providers')
    .select('id, prefecture, city')
    .eq('email', user.email)
    .single();

  if (!provider) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] === undefined) continue;
    const v = body[key];
    if (BOOLEAN_FIELDS.has(key))     updates[key] = v === true || v === 'true';
    else if (NUMBER_FIELDS.has(key)) updates[key] = v !== '' && v !== null ? Number(v) || null : null;
    else if (ARRAY_FIELDS.has(key))  updates[key] = Array.isArray(v) ? v : [];
    else                             updates[key] = v;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // 住所が更新された場合、Nominatimでジオコーディングしてlat/lonを保存
  const prefectureVal = updates.prefecture || provider.prefecture || '';
  const cityVal = updates.city ?? '';
  const addressVal = updates.address ?? '';
  if (updates.address !== undefined || updates.prefecture !== undefined || updates.city !== undefined) {
    const fullAddress = [prefectureVal, cityVal, addressVal].filter(Boolean).join('');
    if (fullAddress.length >= 3) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress + ' 日本')}&limit=1&accept-language=ja`,
          { headers: { 'User-Agent': 'Fineme/1.0' }, signal: AbortSignal.timeout(5000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData?.[0]) {
            updates.lat = parseFloat(geoData[0].lat);
            updates.lon = parseFloat(geoData[0].lon);
          }
        }
      } catch { /* ジオコーディング失敗は無視してデータ保存は継続 */ }
    }
  }

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', provider.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
