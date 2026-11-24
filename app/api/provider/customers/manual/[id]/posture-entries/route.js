// GET  /api/provider/customers/manual/[id]/posture-entries → 非会員顧客の姿勢分析記録一覧
// POST /api/provider/customers/manual/[id]/posture-entries → 写真をAI分析して1件記録
// PATCH /api/provider/customers/manual/[id]/posture-entries → { id, shared_with_customer } お客様に表示するか（2026-11-24。閲覧リンク・紐付け後のNew Me Logに効く）
// app/api/provider/customers/[user_id]/posture-entries/route.js の非会員版。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withSignedPhotoUrls } from '@/lib/customer-record-photos';
import { hasFeature } from '@/lib/feature-flags';
import { createPostureEntry, isPostureEligiblePlan, POSTURE_ENTRY_COLUMNS } from '@/lib/posture-analysis';
import { shareFlagPatch } from '@/lib/posture-share';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, plan, enabled_features').eq('email', user.email).single();
  return data || null;
}

async function ownsManualCustomer(providerId, id) {
  const { data } = await supabase.from('provider_manual_customers').select('id').eq('id', id).eq('provider_id', providerId).single();
  return !!data;
}

export async function GET(request, props) {
  const params = await props.params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_posture_entries')
    .select(POSTURE_ENTRY_COLUMNS)
    .eq('provider_id', provider.id)
    .eq('manual_customer_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(await withSignedPhotoUrls(supabase, data || []));
}

async function __POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasFeature(provider, 'posture_analysis')) return Response.json({ error: 'この機能は現在OFFになっています' }, { status: 403 });
  if (!isPostureEligiblePlan(provider.plan)) return Response.json({ error: 'この機能はプレミアムプラン（¥10,000/月）限定です' }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  if (!(await ownsManualCustomer(provider.id, params.id))) {
    return Response.json({ error: '対象のお客様が見つかりません' }, { status: 404 });
  }

  const { photo_base64, media_type, side_photo_base64, side_media_type, note, staff_id } = await request.json();
  if (!photo_base64 || !media_type) return Response.json({ error: '正面の写真が必要です' }, { status: 400 });
  const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!TYPES.includes(media_type) || (side_photo_base64 && !TYPES.includes(side_media_type))) return Response.json({ error: '対応していない画像形式です' }, { status: 400 });
  if (photo_base64.length > 6_000_000 || (side_photo_base64 && side_photo_base64.length > 6_000_000)) return Response.json({ error: '写真サイズが大きすぎます' }, { status: 400 });

  try {
    const entry = await createPostureEntry({
      supabase,
      providerId: provider.id,
      providerSlug: provider.slug,
      userId: null,
      manualCustomerId: params.id,
      staffId: staff_id || null,
      note,
      photoBase64: photo_base64,
      mediaType: media_type,
      sidePhotoBase64: side_photo_base64 || null,
      sideMediaType: side_media_type || null,
    });
    return Response.json(entry);
  } catch (e) {
    return Response.json({ error: e.message || '分析に失敗しました' }, { status: 502 });
  }
}

export const POST = withAudit(__POST);

// お客様に表示するかを記録ごとに切り替える（会員版の PATCH と同じ。OFFにすると閲覧リンクも消える）
async function __PATCH(request, ctx) {
  const params = await ctx.params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isPostureEligiblePlan(provider.plan)) return Response.json({ error: 'この機能はプレミアムプラン（¥10,000/月）限定です' }, { status: 403 });
  const { id, shared_with_customer } = await request.json().catch(() => ({}));
  if (!id || typeof shared_with_customer !== 'boolean') return Response.json({ error: '指定が正しくありません' }, { status: 400 });
  const { data, error } = await supabase.from('provider_posture_entries')
    .update(shareFlagPatch(shared_with_customer))
    .eq('id', id).eq('provider_id', provider.id).eq('manual_customer_id', params.id)
    .select('id, shared_with_customer, share_expires_at').maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: '記録が見つかりません' }, { status: 404 });
  return Response.json(data);
}

export const PATCH = withAudit(__PATCH);
