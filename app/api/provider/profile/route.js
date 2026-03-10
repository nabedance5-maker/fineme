// PATCH /api/provider/profile - 掲載者が自分のプロフィールを更新
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_FIELDS = [
  'name', 'catchphrase', 'description', 'target_desc', 'philosophy',
  'area', 'price_from', 'photo_url', 'provider_style',
  'suitable_triggers', 'handles_failure_patterns',
  'published',
];

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

  // メールで掲載者を特定
  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('email', user.email)
    .single();

  if (!provider) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  const body = await request.json();
  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = key === 'price_from' && body[key] ? Number(body[key]) : body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 });
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
