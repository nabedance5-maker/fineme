// GET /api/providers - 公開中の掲載者一覧（総合マッチングスコア順）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// Me Scan 8軸 → カテゴリのマッピング
const AXIS_TO_CATEGORY = {
  body:    'gym',
  eyebrow: 'eyebrow',
  fashion: 'fashion',
  hair:    'hair',
  skin:    'esthetic',
  teeth:   'whitening',
  nail:    'nail',
};

// Haversine距離（km）計算
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 文字列の長さスコア（null/undefined対応）
function textScore(str, thresholds) {
  const len = (str || '').trim().length;
  let s = 0;
  for (const [min, pts] of thresholds) {
    if (len >= min) s = pts;
  }
  return s;
}

function calcScore({ provider, services, staffCount, trigger, failure, compassAxis, priorityAxes, userPrefecture, userCity, userLat, userLon }) {
  let score = 0;
  const tags = [];
  const ai = provider.ai_match_profile || null;

  // ── 1. ユーザーデータとの一致（診断結果があるときのみ加点）──
  // AIが分析済みの場合はai_match_profileを優先、未分析時はチェックボックスにフォールバック
  const effectiveTriggers  = ai?.suitable_triggers?.length       ? ai.suitable_triggers         : (provider.suitable_triggers  || []);
  const effectiveFailures  = ai?.handles_failure_patterns?.length ? ai.handles_failure_patterns  : (provider.handles_failure_patterns || []);

  if (trigger && effectiveTriggers.includes(trigger)) {
    score += ai ? 10 : 8;  // AI分析済みは精度が高いためボーナス
    tags.push('あなたのきっかけをよく知っている');
  }
  if (failure && failure !== 'ongoing' && effectiveFailures.includes(failure)) {
    score += ai ? 10 : 8;
    tags.push('あなたの失敗パターンを得意とする');
  }
  if (compassAxis) {
    const targetCat = AXIS_TO_CATEGORY[compassAxis];
    const allCats = [provider.main_category, ...(provider.sub_categories || [])].filter(Boolean);
    const aiAxes = ai?.target_axes || [];
    const axisMatch = (targetCat && allCats.includes(targetCat)) || aiAxes.includes(compassAxis);
    if (axisMatch) {
      score += 12;
      tags.push(`${compassAxis}改善の専門家`);
    }
  }
  // AI分析済みプロフィールのボーナス（文章をちゃんと書いた掲載者を優遇）
  if (ai) score += 6;
  // 有料掲載者（New Me Map掲載中）を検索でも優先表示
  if (provider.billing_status === 'active') score += 15;
  // ユーザーの優先軸トップ3と、掲載者サービスの対象軸が一致
  if (priorityAxes?.length && services?.length) {
    let axisMatchCount = 0;
    const top3 = priorityAxes.slice(0, 3);
    const serviceAxes = new Set(services.map(s => s.target_axis).filter(Boolean));
    for (const axis of top3) {
      if (serviceAxes.has(axis)) {
        score += 5;
        axisMatchCount++;
      }
    }
    if (axisMatchCount > 0) tags.push('あなたの変容軸に対応');
  }

  // ── 2. プロフィール充実度スコア ──
  score += textScore(provider.philosophy, [[1,3],[100,6],[200,10]]);
  score += textScore(provider.guide_message, [[1,2],[80,5],[200,8]]);
  score += textScore(provider.unique_strengths, [[1,2],[80,5],[150,8]]);
  score += textScore(provider.target_desc, [[1,4]]);
  score += textScore(provider.catchphrase, [[1,3]]);

  // 写真
  // ── 位置ボーナス（ソフト加点・ハードフィルターではない）──
  if (provider.entity_type === 'affiliate') {
    // アフィリエイトは location_areas（複数エリア配列）でマッチング
    const areas = provider.location_areas || [];
    if (areas.length > 0 && userPrefecture) {
      const prefMatch = areas.some(a => (a.prefecture || '') === userPrefecture);
      if (prefMatch) {
        score += 5;
        const cityMatch = userCity && areas.some(a =>
          (a.prefecture || '') === userPrefecture &&
          (a.city || '').includes(userCity)
        );
        if (cityMatch) { score += 4; tags.push('近くにある'); }
      }
    }
    // 座標ベースのマッチング（location_areasにlatが含まれる場合）
    if (userLat && userLon && areas.length > 0) {
      const minKm = Math.min(...areas
        .filter(a => a.lat && a.lon)
        .map(a => haversineKm(userLat, userLon, a.lat, a.lon))
      );
      if (isFinite(minKm)) {
        if (minKm <= 10)      { score += 8; tags.push('近くにある'); }
        else if (minKm <= 30) { score += 5; }
        else if (minKm <= 50) { score += 2; }
      }
    }
  } else {
    const provLat = provider.lat;
    const provLon = provider.lon;
    if (userLat && userLon && provLat && provLon) {
      // 座標ベース Haversine 距離
      const km = haversineKm(userLat, userLon, provLat, provLon);
      if (km <= 10)       { score += 8; tags.push('近くにある'); }
      else if (km <= 30)  { score += 5; }
      else if (km <= 50)  { score += 2; }
    } else if (userPrefecture) {
      // 座標未設定の場合は都道府県・市区町村テキスト一致にフォールバック
      const provPref = (provider.prefecture || '').trim();
      const provArea = (provider.area || '').trim();
      if (provPref && provPref === userPrefecture) {
        score += 4;
        if (userCity && provArea && provArea.includes(userCity)) score += 4;
      } else if (!provPref && provArea && provArea.includes(userPrefecture)) {
        score += 4;
        if (userCity && provArea.includes(userCity)) score += 4;
      }
    }
  }

  // ── 写真・施設 ──
  if (provider.cover_image_url) score += 5;
  else if (provider.photo_url) score += 3;
  if (provider.facility_photo_1) score += 3;
  if (provider.facility_photo_2) score += 2;
  if (provider.facility_photo_3) score += 2;

  // スタッフ
  if (staffCount >= 3) score += 6;
  else if (staffCount >= 1) score += 4;

  // ── 3. サービス内容の充実度スコア（最大2サービス分加算）──
  const topServices = (services || []).slice(0, 2);
  for (const svc of topServices) {
    score += textScore(svc.transformation_promise, [[1,2],[80,6]]);
    const hasBefore = (svc.before_text || '').trim().length >= 50;
    const hasAfter  = (svc.after_text  || '').trim().length >= 50;
    if (hasBefore && hasAfter) score += 6;
    if (svc.before_image_url && svc.after_image_url) score += 8;
    score += textScore((svc.benefit_list || []).join(' '), [[1,2],[50,4]]);
  }

  return { score, tags };
}

export async function GET(request) {
  try {
  const { searchParams } = new URL(request.url);
  const naviMode      = searchParams.get('navi') === 'true'; // New Me Map専用：有料掲載者のみ
  const category      = searchParams.get('category');
  const area          = searchParams.get('area');
  const axis          = searchParams.get('axis');          // 軸ハードフィルター（検索ページ）
  const trigger       = searchParams.get('trigger');       // Me Scan: ユーザーのきっかけ
  const failure       = searchParams.get('failure');       // Me Scan: 失敗パターン
  const compassAxis   = searchParams.get('compass');       // Me Scan: 最初の一手（軸）
  const axesParam     = searchParams.get('axes');          // Me Scan: 優先軸（カンマ区切り）
  const userPrefecture = searchParams.get('prefecture') || ''; // ユーザー都道府県（フォールバック）
  const userCity       = searchParams.get('city') || '';       // ユーザー市区町村（フォールバック）
  const userLat  = parseFloat(searchParams.get('lat')  || '') || null;
  const userLon  = parseFloat(searchParams.get('lon')  || '') || null;
  const priorityAxes = axesParam ? axesParam.split(',').filter(Boolean) : [];

  // ── プロバイダー一覧取得（充実度判定に必要なフィールドも含む）──
  let query = supabase
    .from('providers')
    .select('*')
    .eq('published', true)
    .or('admin_hidden.eq.false,admin_hidden.is.null');

  // New Me Map モードでは有料掲載者（active）のみを対象にする
  if (naviMode) query = query.eq('billing_status', 'active');

  if (category) query = query.eq('main_category', category);
  // エリアフィルター：アフィリエイト（area=null）は全国対応のため常に含める
  if (area) query = query.or(`area.ilike.%${area}%,entity_type.eq.affiliate`);

  const { data: providers, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!providers?.length) return Response.json([]);

  const providerIds = providers.map(p => p.id);

  // ── サービスデータ取得（並列）──
  const [{ data: services }, { data: staffData }] = await Promise.all([
    supabase
      .from('provider_services')
      .select('provider_id,transformation_promise,before_text,after_text,before_image_url,after_image_url,target_axis,suitable_path_types,benefit_list')
      .in('provider_id', providerIds),
    supabase
      .from('provider_staff')
      .select('provider_id')
      .in('provider_id', providerIds),
  ]);

  // provider_id → サービス配列 / スタッフ数 のマップ
  const serviceMap = {};
  for (const svc of (services || [])) {
    if (!serviceMap[svc.provider_id]) serviceMap[svc.provider_id] = [];
    serviceMap[svc.provider_id].push(svc);
  }
  const staffCountMap = {};
  for (const s of (staffData || [])) {
    staffCountMap[s.provider_id] = (staffCountMap[s.provider_id] || 0) + 1;
  }

  // ── 軸ハードフィルター（検索ページの axis パラメーター）──
  let filtered = providers;
  if (axis) {
    const axisProviderIds = new Set(
      (services || []).filter(s => s.target_axis === axis).map(s => s.provider_id)
    );
    if (!axisProviderIds.size) return Response.json([]);
    filtered = providers.filter(p => axisProviderIds.has(p.id));
  }

  // ── スコアリング & ソート ──
  const scored = filtered.map(provider => {
    const { score, tags } = calcScore({
      provider,
      services: serviceMap[provider.id] || [],
      staffCount: staffCountMap[provider.id] || 0,
      trigger,
      failure,
      compassAxis,
      priorityAxes,
      userPrefecture,
      userCity,
      userLat,
      userLon,
    });
    // レスポンスに含める（クライアントで match_tags 表示用）
    return { ...provider, match_score: score, match_tags: tags };
  });

  // スコア降順でソート。同スコアは created_at 降順（新しい順）
  scored.sort((a, b) => b.match_score - a.match_score || 0);

  // レスポンスサイズを抑えるため内部フィールドを削除
  const result = scored.map(({ philosophy, guide_message, unique_strengths, target_desc, facility_photo_1, facility_photo_2, facility_photo_3, ai_match_profile, ...rest }) => rest);
  // entity_type と affiliate_url はレスポンスに含まれる（...rest に含まれる）

  return Response.json(result);
  } catch (err) {
    console.error('[/api/providers] unexpected error:', err);
    return Response.json([], { status: 200 });
  }
}
