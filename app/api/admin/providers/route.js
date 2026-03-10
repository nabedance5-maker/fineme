// GET /api/admin/providers - 全掲載者一覧（運営用）
// POST /api/admin/providers - 掲載者新規登録（Supabase招待メール自動送信）
import { createClient } from '@supabase/supabase-js';
import { sendProviderCredentialsEmail } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.UPLOAD_API_KEY || '';

// 読みやすい初期パスワードを生成（12文字・英数字のみ・紛らわしい文字除外）
function generatePassword() {
  // 0/O/l/1/I など紛らわしい文字を除外
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const rand = (s) => s[Math.floor(Math.random() * s.length)];
  // 各種類を最低1文字保証
  const pw = [rand(upper), rand(lower), rand(digits),
    ...Array.from({length: 9}, () => rand(all))];
  return pw.sort(() => Math.random() - 0.5).join('');
}

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

    // 初期パスワードを自動生成
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';
    const initPassword = generatePassword();

    try {
      // 既存ユーザーを検索
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = listData?.users?.find(u => u.email === email);

      if (existingUser) {
        // 既存ユーザー → パスワードをリセット
        await supabase.auth.admin.updateUserById(existingUser.id, { password: initPassword });
        console.log('[auth] password reset for existing user:', email);
      } else {
        // 新規ユーザーを作成
        const { error: createError } = await supabase.auth.admin.createUser({
          email,
          password: initPassword,
          email_confirm: true,
        });
        if (createError) console.warn('[auth] createUser error:', createError.message);
        else console.log('[auth] created new user:', email);
      }

      // 初期パスワードをメールで送信
      await sendProviderCredentialsEmail({
        email,
        providerName: name,
        password: initPassword,
        loginUrl: 'https://fineme.me/pages/login.html',
      });
      console.log('[email] credentials sent to:', email);
    } catch (e) {
      console.error('[provider setup error]', e.message || e);
    }

    return Response.json({
      ...data,
      invite_sent: !!email,
      _init_password: initPassword, // 管理画面での表示用（一回限り）
    }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
