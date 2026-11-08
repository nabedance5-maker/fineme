// PATCH /api/admin/providers/[id] - 掲載者情報更新（運営用）
// DELETE /api/admin/providers/[id] - 掲載者削除（運営用・Supabase認証ユーザーも削除）
import { getSupabase } from '@/lib/supabase';
import { contractActive } from '@/lib/provider-contract';
import { checkReferralCode } from '@/lib/referral-code';
import { setProviderReferrer, recordUpsellReward } from '@/lib/collaborator-rewards';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function PATCH(request, props) {
  const params = await props.params;
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await request.json();

  const allowed = ['name','slug','catchphrase','description','target_desc','philosophy',
    'main_category','sub_categories','area','price_from','booking_url','photo_url',
    'email','line_user_id',
    'published','admin_hidden','plan','billing_status','billing_started',
    'stripe_customer_id','stripe_subscription_id',
    'suitable_triggers','handles_failure_patterns','provider_style'];

  // 紹介者（紹介コード）の入れ忘れ・入れ間違いを直す（2026-11-06）。過去のお支払いから紹介報酬も記録し直す
  let referrerNote = '';
  if (body.referred_by !== undefined) {
    const { data: cur } = await supabase.from('providers').select('referred_by').eq('id', id).maybeSingle();
    const rc = await checkReferralCode(supabase, body.referred_by);
    if (rc.error) return Response.json({ error: rc.error }, { status: 400 });
    if ((cur?.referred_by || null) !== rc.code) {
      referrerNote = (await setProviderReferrer(supabase, id, rc.code)).note;
      await supabase.from('provider_inquiries').update({ referral_code: rc.code }).eq('provider_id', id);
    }
  }

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  // price_from: 空文字・nullはnullに（Supabase integer型エラー対策）
  if (updates.price_from !== undefined) {
    updates.price_from = (updates.price_from === '' || updates.price_from === null)
      ? null : Number(updates.price_from);
  }

  // 契約まわり（2026-10-30）：特例無料をやめて A/B/C に戻した時は、Stripe の月額が無ければ「未契約」に戻す。
  // 公開は、契約が有効な（払っている・特例無料の）お店だけ
  let oldPlanForUpsell;
  if (updates.plan !== undefined || updates.published === true) {
    const { data: cur } = await supabase.from('providers').select('plan, billing_status, stripe_subscription_id').eq('id', id).maybeSingle();
    if (!cur) return Response.json({ error: 'お店が見つかりません' }, { status: 404 });
    oldPlanForUpsell = cur.plan;
    if (updates.plan === 'free') updates.plan = 'A';
    if (['A', 'B', 'C'].includes(updates.plan) && cur.plan === 'special' && !cur.stripe_subscription_id && updates.billing_status === undefined) {
      updates.billing_status = null;
    }
    if (updates.plan === 'special' && updates.billing_status === undefined) updates.billing_status = 'active';
    if (updates.published === true && !contractActive({ ...cur, ...updates })) {
      return Response.json({ error: 'このお店はまだ契約（月額プランのお支払い）が済んでいないため、公開できません。特例無料にするか、お店の申し込みを待ってください' }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 運営が代理でプラン変更した時も、紹介した営業パートナーへアップセル報酬を発生させる（渡邉確認2026-11-09）
  if (updates.plan !== undefined && oldPlanForUpsell && oldPlanForUpsell !== updates.plan) {
    try {
      await recordUpsellReward(supabase, id, oldPlanForUpsell, updates.plan);
    } catch (e) {
      console.warn('[admin plan change upsell reward]', e);
    }
  }

  return Response.json({ ...data, referrer_note: referrerNote });
}

export async function DELETE(request, props) {
  const params = await props.params;
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
