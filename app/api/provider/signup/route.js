// POST /api/provider/signup → お店の登録（2026-10-30）。オンライン相談のあと、または「すぐに始めたい」お店が自分で登録する。
// お店のアカウントを作り、パスワード設定のメールを送る。使い始めは、管理画面でプランを申し込んだ日から（それまでは機能が止まっている）。
// 担当者のお名前・電話番号は providers に列が無いため、問い合わせ（provider_inquiries）に残し、作ったお店と結びつける。
export const dynamic = 'force-dynamic';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { sendProviderLoginInvite } from '@/lib/provider-login-invite';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const CATEGORIES = ['gym', 'makeup', 'hair', 'colordiagnosis', 'bonediagnosis', 'diagnosis', 'fashion', 'photo', 'marriage', 'eyebrow', 'hairremoval', 'esthetic', 'whitening', 'orthodontics', 'nail', 'aga', 'consulting', 'other'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);

async function __POST(request) {
  const body = await request.json().catch(() => ({}));
  // 自動送信よけ（人には見えない欄）
  if (body.website) return Response.json({ ok: true });
  const bizName = str(body.bizName, 80), contactName = str(body.contactName, 60), phone = str(body.phone, 20);
  const email = str(body.email, 120).toLowerCase();
  const category = CATEGORIES.includes(body.category) ? body.category : null;
  const plan = ['A', 'B', 'C'].includes(body.desiredPlan) ? body.desiredPlan : 'A';
  const ref = /^[A-Za-z0-9_-]{1,40}$/.test(body.ref || '') ? body.ref : null;
  if (!bizName || !contactName || !email || !phone || !category) return Response.json({ error: '必須の項目を入れてください' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  if (phone.replace(/\D/g, '').length < 10) return Response.json({ error: '電話番号は10桁以上の数字で入れてください' }, { status: 400 });

  const { data: dup } = await supabase.from('providers').select('id').ilike('email', email).limit(1);
  if (dup?.length) return Response.json({ error: 'このメールアドレスは、すでにお店として登録されています。ログイン画面からお入りください（パスワードを忘れた時は「パスワードを忘れた方」から設定し直せます）', code: 'exists' }, { status: 409 });

  const { data: provider, error } = await supabase.from('providers').insert({
    name: bizName, email, main_category: category, sub_categories: [],
    plan, billing_status: null, published: false,
    referred_by: ref,
  }).select('id, name').single();
  if (error) return Response.json({ error: '登録できませんでした。時間をおいてもう一度お試しください' }, { status: 500 });

  // 担当者の連絡先を問い合わせに残す（オンライン相談を申し込んでいた方は、その問い合わせに結びつける）
  const { data: inq } = await supabase.from('provider_inquiries').select('id').ilike('email', email).is('provider_id', null).order('created_at', { ascending: false }).limit(1);
  if (inq?.length) {
    await supabase.from('provider_inquiries').update({ provider_id: provider.id, status: 'done' }).eq('id', inq[0].id);
  } else {
    await supabase.from('provider_inquiries').insert({
      biz_name: bizName, contact_name: contactName, email, phone, category, contact_pref: 'email',
      message: '登録ページから登録（オンライン相談なし）', referral_code: ref, desired_plan: plan, provider_id: provider.id, status: 'done',
    });
  }

  let inviteError = null;
  try { await sendProviderLoginInvite(supabase, { email, providerName: bizName }); } catch (e) { inviteError = e.message; console.error('[provider signup invite]', e.message); }

  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'Fineme <noreply@fineme.me>', to: process.env.ADMIN_EMAIL,
        subject: `【お店の登録】${bizName}`,
        text: [`登録ページからお店が登録しました（プランの申し込みはまだです）。`, '', `お店: ${bizName}`, `担当者: ${contactName}`, `メール: ${email}`, `電話: ${phone}`, `はじめに選んだプラン: PLAN ${plan}`, ref ? `紹介コード: ${ref}` : '', inviteError ? `※パスワード設定メールを送れませんでした：${inviteError}` : '', '', '管理画面: https://www.fineme.me/admin/providers'].filter(Boolean).join('\n'),
      });
    } catch (e) { console.error('[provider signup admin mail]', e?.message); }
  }

  if (inviteError) return Response.json({ ok: true, invite_sent: false, error: '登録はできましたが、メールを送れませんでした。お手数ですが、ご案内メールへの返信かお問い合わせからご連絡ください' }, { status: 200 });
  return Response.json({ ok: true, invite_sent: true });
}

export const POST = withAudit(__POST);
