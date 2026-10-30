// GET /api/admin/providers - 全掲載者一覧（運営用）
// POST /api/admin/providers - 掲載者新規登録（パスワード設定リンクのメールを自動送信。inquiry_id があれば、その問い合わせと結びつける）
import { getSupabase } from '@/lib/supabase';
import { sendProviderLoginInvite } from '@/lib/provider-login-invite';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .or('entity_type.eq.provider,entity_type.is.null')
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
            suitable_triggers, handles_failure_patterns, provider_style, inquiry_id } = body;

    if (!name || !main_category) {
      return Response.json({ error: 'name, main_category は必須です' }, { status: 400 });
    }
    // slugが未入力なら空文字（トリガーで自動生成）
    const resolvedSlug = (slug || '').trim() || null;
    if (!email) {
      return Response.json({ error: 'メールアドレスは必須です（掲載者ログインに使用します）' }, { status: 400 });
    }

    // providersテーブルに登録
    const { data, error } = await supabase
      .from('providers')
      .insert([{
        slug: resolvedSlug, name, catchphrase, description, target_desc, philosophy,
        main_category, sub_categories: sub_categories || [],
        area, price_from: price_from ? Number(price_from) : null,
        photo_url, email,
        line_user_id: line_user_id || null,
        // 特例無料以外は「お店が申し込むまで使えない」状態で作る（billing_status は Stripe が決める）
        plan: plan === 'special' ? 'special' : (['A', 'B', 'C'].includes(plan) ? plan : 'A'),
        billing_status: plan === 'special' ? 'active' : null,
        published: false,
        referral_code: referral_code || null, // nullならトリガーで自動生成
        referred_by: referred_by || null,
        suitable_triggers: suitable_triggers || [],
        handles_failure_patterns: handles_failure_patterns || [],
        provider_style: provider_style || null,
      }])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (inquiry_id) {
      await supabase.from('provider_inquiries').update({ provider_id: data.id, status: 'done' }).eq('id', inquiry_id);
    }

    let inviteError = null;
    try {
      await sendProviderLoginInvite(supabase, { email, providerName: name });
    } catch (e) {
      inviteError = e.message || String(e);
      console.error('[provider invite]', inviteError);
    }

    return Response.json({
      ...data,
      invite_sent: !inviteError,
      invite_error: inviteError,
    }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
