// GET  /api/provider/customers/[user_id]/posture-entries → その顧客の姿勢分析記録一覧（認証済み・新しい順）
// POST /api/provider/customers/[user_id]/posture-entries → 写真をAI分析して1件記録（認証済み）
// PATCH /api/provider/customers/[user_id]/posture-entries → { id, shared_with_customer } その記録をお客様のNew Me Logに出すか（2026-11-12）
// でお要望2026-09-25。app/api/mirror/analyze と同じ「写真base64を受け取りClaude Visionで
// 分析→Storage保存→DB保存」のパターン。posture_analysis機能フラグOFFの店舗は弾く。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withSignedPhotoUrls } from '@/lib/customer-record-photos';
import { hasFeature } from '@/lib/feature-flags';
import { createPostureEntry, isPostureEligiblePlan } from '@/lib/posture-analysis';
import { withAudit } from '@/lib/activity-log';
import { providerCustomerIds } from '@/lib/broadcast';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, plan, enabled_features').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, props) {
  const params = await props.params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // カルテと同様、この会員に紐付け済みの非会員時代の記録も合算する
  const [{ data, error }, manualLinked] = await Promise.all([
    supabase
      .from('provider_posture_entries')
      .select('id, photo_url, side_photo_url, score, findings, changes, shared_with_customer, note, staff_id, created_at')
      .eq('provider_id', provider.id)
      .eq('user_id', params.user_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('provider_manual_customers')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('linked_user_id', params.user_id)
      .then(r => r.data || [])
      .catch(() => []),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let merged = data || [];
  if (manualLinked.length) {
    const { data: manualEntries } = await supabase
      .from('provider_posture_entries')
      .select('id, photo_url, side_photo_url, score, findings, changes, shared_with_customer, note, staff_id, created_at')
      .eq('provider_id', provider.id)
      .in('manual_customer_id', manualLinked.map(m => m.id));
    merged = [...merged, ...(manualEntries || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return Response.json(await withSignedPhotoUrls(supabase, merged));
}

async function __POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasFeature(provider, 'posture_analysis')) return Response.json({ error: 'この機能は現在OFFになっています' }, { status: 403 });
  if (!isPostureEligiblePlan(provider.plan)) return Response.json({ error: 'この機能はプレミアムプラン（¥10,000/月）限定です' }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  // このお店のお客様（顧客一覧に出る人）にだけ記録できる。記録はお客様のNew Me Logにも表示されるため、
  // IDだけで他人の記録に書き込めないようにする（2026-11-12）
  if (!(await providerCustomerIds(supabase, provider)).has(params.user_id)) return Response.json({ error: '対象のお客様が見つかりません' }, { status: 404 });

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
      userId: params.user_id,
      manualCustomerId: null,
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

// お客様のNew Me Logに出すかを記録ごとに切り替える（既定は出さない。お店がAIの文を確認してから出す。2026-11-12）
async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, shared_with_customer } = await request.json().catch(() => ({}));
  if (!id || typeof shared_with_customer !== 'boolean') return Response.json({ error: '指定が正しくありません' }, { status: 400 });
  const { data, error } = await supabase.from('provider_posture_entries')
    .update({ shared_with_customer })
    .eq('id', id).eq('provider_id', provider.id).eq('user_id', params.user_id)
    .select('id, shared_with_customer').maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: '記録が見つかりません' }, { status: 404 });
  return Response.json(data);
}

export const PATCH = withAudit(__PATCH);
