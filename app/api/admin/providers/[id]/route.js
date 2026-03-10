// PATCH /api/admin/providers/[id] - 掲載者情報更新（運営用）
// DELETE /api/admin/providers/[id] - 掲載者削除（運営用・Supabase認証ユーザーも削除）
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.UPLOAD_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function PATCH(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await request.json();

  const allowed = ['name','slug','catchphrase','description','target_desc','philosophy',
    'main_category','sub_categories','area','price_from','booking_url','photo_url',
    'email','line_user_id',
    'published','admin_hidden','plan','billing_started',
    'stripe_customer_id','stripe_subscription_id',
    'suitable_triggers','handles_failure_patterns','provider_style'];

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  // メールアドレスを先に取得（Supabase認証ユーザー削除のため）
  const { data: provider } = await supabase
    .from('providers')
    .select('email')
    .eq('id', id)
    .single();

  // providersテーブルから削除
  const { error } = await supabase.from('providers').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Supabase認証ユーザーも削除（メールが一致するユーザーを探して削除）
  if (provider?.email) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const authUser = users?.users?.find(u => u.email === provider.email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    } catch (e) {
      console.warn('[delete auth user]', e);
    }
  }

  return Response.json({ success: true });
}
