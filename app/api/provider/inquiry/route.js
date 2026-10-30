import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { withAudit } from '@/lib/activity-log';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const SIGNUP_URL = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fineme.me'}/provider/signup`;

const CATEGORY_LABEL = {
  gym: 'ジム・パーソナルトレーニング', makeup: 'メイク・コスメ', hair: 'ヘア・美容院',
  diagnosis: '骨格・パーソナルカラー診断', fashion: 'ファッション・スタイリング',
  photo: 'プロフィール写真・撮影', marriage: '婚活・マッチングサポート',
  eyebrow: '眉毛サロン', hairremoval: '脱毛', esthetic: 'エステ・フェイシャル',
  whitening: '歯のホワイトニング', orthodontics: '歯列矯正', nail: 'ネイル',
  aga: 'AGA・薄毛治療', consulting: 'コンサルティング', other: 'その他',
  sales_partner: '営業パートナー応募',
};

async function __POST(request) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { bizName, contactName, email, phone, category, contactPref, message, referralCode } = body;
    // LPで押したプラン（任意）。アカウントを作る時の初期プランになる
    const desiredPlan = ['A', 'B', 'C'].includes(body.desiredPlan) ? body.desiredPlan : null;
    // オンライン相談のご希望日時（問い合わせの次は、必ずオンラインで話す。2026-10-30）
    const meetingWish = String(body.meetingWish || '').trim().slice(0, 500) || null;

    if (!bizName || !contactName || !email) {
      return NextResponse.json({ error: '必須項目が未入力です' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'カテゴリを選択してください（当てはまらない場合は「その他」）' }, { status: 400 });
    }

    const { error } = await supabase.from('provider_inquiries').insert({
      biz_name: bizName,
      contact_name: contactName,
      email,
      phone: phone || null,
      category: category || null,
      contact_pref: contactPref || 'email',
      message: message || null,
      referral_code: referralCode || null,
      desired_plan: desiredPlan,
      meeting_wish: meetingWish,
    });

    if (error) throw error;

    // メール送信（RESEND_API_KEY が設定されていれば送信）
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const categoryLabel = category ? (CATEGORY_LABEL[category] || category) : '未選択';
      const isPartner = category === 'sales_partner';
      const contactPrefLabel = contactPref === 'phone' ? '電話' : contactPref === 'either' ? 'どちらでも' : 'メール';

      try {
        // 管理者への通知メール
        if (process.env.ADMIN_EMAIL) {
          await resend.emails.send({
            from: 'Fineme <noreply@fineme.me>',
            to: process.env.ADMIN_EMAIL,
            subject: isPartner ? `【営業パートナー応募】${bizName}` : `【掲載問い合わせ】${bizName}`,
            text: [
              isPartner ? '営業パートナー募集ページ（/sales-partner）から応募が届きました。' : '掲載相談フォームから問い合わせが届きました。',
              '',
              `会社名・屋号: ${bizName}`,
              `担当者: ${contactName}`,
              `メール: ${email}`,
              phone ? `電話: ${phone}` : '',
              `カテゴリ: ${categoryLabel}`,
              `希望連絡方法: ${contactPrefLabel}`,
              referralCode ? `紹介コード: ${referralCode}` : '',
              desiredPlan ? `気になっているプラン: PLAN ${desiredPlan}` : '',
              meetingWish ? `オンライン相談の希望日時: ${meetingWish}` : '',
              '',
              '相談内容:',
              message || '（未記入）',
              '',
              '---',
              '管理画面で確認: https://www.fineme.me/admin/inquiries',
            ].filter(Boolean).join('\n'),
          });
        }

        // 送信者への自動返信メール
        await resend.emails.send({
          from: 'Fineme <noreply@fineme.me>',
          to: email,
          subject: isPartner ? `【Fineme】営業パートナーへのご応募を受け付けました` : `【Fineme】お問い合わせを受け付けました`,
          text: [
            `${contactName} 様`,
            '',
            isPartner ? 'この度はFinemeの営業パートナーにご応募いただき、ありがとうございます。' : 'この度はFinemeへお問い合わせいただき、ありがとうございます。',
            isPartner ? '以下の内容で受け付けました。内容を拝見し、オンライン面談の日程をご連絡します。' : '以下の内容で受け付けました。ご希望の日時をもとに、担当者からオンライン相談の日時とURLをご連絡します。',
            '',
            '━━━━━━━━━━━━━━━━━━',
            `会社名・屋号: ${bizName}`,
            `担当者: ${contactName}`,
            `メール: ${email}`,
            phone ? `電話: ${phone}` : '',
            `カテゴリ: ${categoryLabel}`,
            `希望連絡方法: ${contactPrefLabel}`,
            desiredPlan ? `気になっているプラン: PLAN ${desiredPlan}` : '',
            meetingWish ? `オンライン相談のご希望日時: ${meetingWish}` : '',
            '',
            '相談内容:',
            message || '（未記入）',
            '━━━━━━━━━━━━━━━━━━',
            '',
            ...(isPartner ? [] : [
              'この先の流れ',
              '1. オンライン相談（30分ほど）で、お店のご様子を伺い、Finemeの使い方をご説明します',
              '2. ご利用を決めていただいたら、登録ページからお店の情報をご登録ください',
              `   ${SIGNUP_URL}`,
              '3. 届いたメールからパスワードを決め、管理画面でプランを選んでお申し込みいただいた日からご利用いただけます',
              '',
            ]),
            'ご不明な点がございましたら、このメールにご返信ください。',
            '',
            '──────────────────',
            'Fineme（ファインミ）',
            'https://www.fineme.me',
            '外見を起点に、自信を再設計する人を増やす',
            '──────────────────',
          ].filter(Boolean).join('\n'),
        });
      } catch (mailErr) {
        // メール失敗でも問い合わせ保存は成功扱い
        console.error('inquiry mail error:', mailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('provider inquiry error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export const POST = withAudit(__POST);
