// GET  /api/provider/customers/manual/[id]/posture-entries → 非会員顧客の姿勢分析記録一覧
// POST /api/provider/customers/manual/[id]/posture-entries → 写真をAI分析して1件記録
// app/api/provider/customers/[user_id]/posture-entries/route.js の非会員版。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';
import { createPostureEntry } from '@/lib/posture-analysis';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, enabled_features').eq('email', user.email).single();
  return data || null;
}

async function ownsManualCustomer(providerId, id) {
  const { data } = await supabase.from('provider_manual_customers').select('id').eq('id', id).eq('provider_id', providerId).single();
  return !!data;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_posture_entries')
    .select('id, photo_url, score, findings, note, staff_id, created_at')
    .eq('provider_id', provider.id)
    .eq('manual_customer_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasFeature(provider, 'posture_analysis')) return Response.json({ error: 'この機能は現在OFFになっています' }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  if (!(await ownsManualCustomer(provider.id, params.id))) {
    return Response.json({ error: '対象のお客様が見つかりません' }, { status: 404 });
  }

  const { photo_base64, media_type, note, staff_id } = await request.json();
  if (!photo_base64 || !media_type) return Response.json({ error: '写真データが必要です' }, { status: 400 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(media_type)) return Response.json({ error: '対応していない画像形式です' }, { status: 400 });
  if (photo_base64.length > 6_000_000) return Response.json({ error: '写真サイズが大きすぎます' }, { status: 400 });

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
    });
    return Response.json(entry);
  } catch (e) {
    return Response.json({ error: e.message || '分析に失敗しました' }, { status: 502 });
  }
}
