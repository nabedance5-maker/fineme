// GET  /api/provider/staff/[id]/gallery → スタッフの実績写真一覧
// POST /api/provider/staff/[id]/gallery → 実績写真を追加（画像は /api/provider/upload-service-image で先にアップロード）
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MAX_PHOTOS = 12;

async function authorize(request, staffId) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data: provider } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!provider) return null;
  const { data: staff } = await supabase.from('provider_staff').select('id').eq('id', staffId).eq('provider_id', provider.id).single();
  return staff ? provider : null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const provider = await authorize(request, id);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('provider_staff_gallery')
    .select('id, image_url, caption, created_at')
    .eq('staff_id', id)
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

async function __POST(request, { params }) {
  const { id } = await params;
  const provider = await authorize(request, id);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const imageUrl = String(body.image_url || '');
  if (!/^https:\/\//.test(imageUrl)) return Response.json({ error: '画像のURLが正しくありません' }, { status: 400 });

  const { count } = await supabase
    .from('provider_staff_gallery')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', id);
  if ((count || 0) >= MAX_PHOTOS) return Response.json({ error: `実績写真は1人${MAX_PHOTOS}枚までです` }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_staff_gallery')
    .insert({
      provider_id: provider.id,
      staff_id: id,
      image_url: imageUrl,
      caption: body.caption ? String(body.caption).slice(0, 80) : null,
    })
    .select('id, image_url, caption, created_at')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export const POST = withAudit(__POST);
