// GET /api/admin/providers - 全掲載者一覧（運営用）
// POST /api/admin/providers - 掲載者新規登録（Supabase招待メール自動送信）
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

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { slug, name, catchphrase, description, target_desc, philosophy,
            main_category, sub_categories, area, price_from,
            photo_url, plan, referral_code, referred_by, email, line_user_id,
            suitable_triggers, handles_failure_patterns, provider_style } = body;

    if (!slug || !name || !main_category) {
      return Response.json({ error: 'slug, name, main_category は必須です' }, { status: 400 });
    }
    if (!email) {
      return Response.json({ error: 'メールアドレスは必須です（掲載者ログインに使用します）' }, { status: 400 });
    }

    // providersテーブルに登録
    const { data, error } = await supabase
      .from('providers')
      .insert([{
        slug, name, catchphrase, description, target_desc, philosophy,
        main_category, sub_categories: sub_categories || [],
        area, price_from: price_from ? Number(price_from) : null,
        photo_url, email,
        line_user_id: line_user_id || null,
        plan: plan || 'A', published: false,
        referral_code: referral_code || slug,
        referred_by: referred_by || null,
        suitable_triggers: suitable_triggers || [],
        handles_failure_patterns: handles_failure_patterns || [],
        provider_style: provider_style || null,
      }])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Supabase Authに招待メールを送信（掲載者ダッシュボードへのリダイレクト付き）
    // 既存アカウントがある場合はスキップ
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';
    try {
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/pages/provider/index.html`,
        data: { provider_id: data.id, role: 'provider' },
      });
      if (inviteError) {
        // 既存ユーザーのエラーは無視（ログインすれば自動で紐付く）
        if (!inviteError.message?.includes('already')) {
          console.warn('[invite] failed:', inviteError.message);
        }
      }
    } catch (e) {
      console.warn('[invite] exception:', e);
    }

    return Response.json({
      ...data,
      invite_sent: !!email,
    }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
