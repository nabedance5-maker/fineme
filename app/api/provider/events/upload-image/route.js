// POST /api/provider/events/upload-image - 出欠確認イベント用の画像をSupabase Storageに
// アップロード（でお要望2026-09-15：「詳細を書けるようにしたり画像を入れたりできるように」）。
// 既存のupload-facility-photoと同じprovider-photosバケット・同じ検証方針を踏襲。
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, referral_code')
    .eq('email', user.email)
    .single();
  if (!provider) return Response.json({ error: 'Provider not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('image');
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

  const ext = file.name?.split('.').pop()?.toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (!ext || !allowedExts.includes(ext)) {
    return Response.json({ error: '対応形式: jpg, png, webp' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: '5MB以下のファイルを使用してください' }, { status: 400 });
  }

  const folder = provider.referral_code || provider.id;
  const fileName = `${folder}/events/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(fileName, arrayBuffer, { contentType: file.type, upsert: true });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from('provider-photos').getPublicUrl(fileName);
  return Response.json({ url: publicUrl });
}
