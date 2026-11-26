// PATCH /api/provider/profile - 掲載者が自分のプロフィールを更新
import { geocodeAddress } from '@/lib/geocode';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { normalizeVisibility } from '@/lib/page-visibility';

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
  'google_review_url',
  // 公開ページに何を出すか（でお要望 2026-10-22）
  'page_visibility',
];
const BOOLEAN_FIELDS  = new Set(['online_available', 'trial_available', 'published']);
const NUMBER_FIELDS   = new Set(['price_from', 'experience_years', 'response_hours']);
const ARRAY_FIELDS    = new Set(['suitable_triggers', 'handles_failure_patterns', 'payment_methods', 'facility_photos']);

async function __PATCH(request) {
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
    .select('id, prefecture, city, address')
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
    else if (key === 'page_visibility') updates[key] = normalizeVisibility(v);
    else if (ARRAY_FIELDS.has(key))  updates[key] = Array.isArray(v) ? v : [];
    else                             updates[key] = v;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // 住所が更新された場合、緯度・経度を出して保存（国土地理院→Nominatim。lib/geocode.js）。
  // 一部の欄だけ更新された時は、保存済みの都道府県・市区町村・番地と合わせて引く（以前は市区町村が抜けることがあった）
  if (updates.address !== undefined || updates.prefecture !== undefined || updates.city !== undefined) {
    const pick = k => (updates[k] !== undefined ? updates[k] : provider[k]) || '';
    const geo = await geocodeAddress([pick('prefecture'), pick('city'), pick('address')]);
    if (geo) { updates.lat = geo.lat; updates.lon = geo.lon; }
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

export const PATCH = withAudit(__PATCH);
