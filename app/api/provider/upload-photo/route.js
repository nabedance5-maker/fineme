// POST /api/provider/upload-photo - 掲載者のプロフィール写真をSupabase Storageにアップロード
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  // メールで掲載者を特定
  const { data: provider } = await supabase
    .from('providers')
    .select('id, referral_code')
    .eq('email', user.email)
    .single();

  if (!provider) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  // multipart/form-data から画像を取得
  const formData = await request.formData();
  const file = formData.get('photo');
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // 拡張子チェック
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowedExts.includes(ext)) {
    return Response.json({ error: '対応形式: jpg, png, webp' }, { status: 400 });
  }

  // ファイルサイズチェック（5MB以下）
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: '5MB以下のファイルを使用してください' }, { status: 400 });
  }

  const fileName = `${provider.referral_code || provider.id}/photo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  // Supabase Storageにアップロード（バケット名: provider-photos）
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('provider-photos')
    .getPublicUrl(fileName);

  // providersテーブルを更新
  await supabase
    .from('providers')
    .update({ photo_url: publicUrl })
    .eq('id', provider.id);

  return Response.json({ url: publicUrl });
}
