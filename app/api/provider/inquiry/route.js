import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const CATEGORY_LABEL = {
  gym: 'ジム・パーソナルトレーニング', makeup: 'メイク・コスメ', hair: 'ヘア・美容院',
  diagnosis: '骨格・パーソナルカラー診断', fashion: 'ファッション・スタイリング',
  photo: 'プロフィール写真・撮影', marriage: '婚活・マッチングサポート',
  eyebrow: '眉毛サロン', hairremoval: '脱毛', esthetic: 'エステ・フェイシャル',
  whitening: '歯のホワイトニング', orthodontics: '歯列矯正', nail: 'ネイル',
  aga: 'AGA・薄毛治療', consulting: 'コンサルティング',
};

export async function POST(request) {
  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { bizName, contactName, email, phone, category, contactPref, message } = body;

    if (!bizName || !contactName || !email) {
      return NextResponse.json({ error: '必須項目が未入力です' }, { status: 400 });
    }

    const { error } = await supabase.from('provider_inquiries').insert({
      biz_name: bizName,
      contact_name: contactName,
      email,
      phone: phone || null,
      category: category || null,
      contact_pref: contactPref || 'email',
      message: message || null,
    });

    if (error) throw error;

    // メール送信（RESEND_API_KEY が設定されていれば送信）
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const categoryLabel = category ? (CATEGORY_LABEL[category] || category) : '未選択';
      const contactPrefLabel = contactPref === 'phone' ? '電話' : contactPref === 'either' ? 'どちらでも' : 'メール';

      try {
        // 管理者への通知メール
        if (process.env.ADMIN_EMAIL) {
          await resend.emails.send({
            from: 'Fineme <noreply@fineme.me>',
            to: process.env.ADMIN_EMAIL,
            subject: `【掲載問い合わせ】${bizName}`,
            text: [
              '掲載相談フォームから問い合わせが届きました。',
              '',
              `会社名・屋号: ${bizName}`,
              `担当者: ${contactName}`,
              `メール: ${email}`,
              phone ? `電話: ${phone}` : '',
              `カテゴリ: ${categoryLabel}`,
              `希望連絡方法: ${contactPrefLabel}`,
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
          subject: `【Fineme】お問い合わせを受け付けました`,
          text: [
            `${contactName} 様`,
            '',
            'この度はFinemeへお問い合わせいただき、ありがとうございます。',
            '以下の内容で受け付けました。担当者より改めてご連絡差し上げます。',
            '',
            '━━━━━━━━━━━━━━━━━━',
            `会社名・屋号: ${bizName}`,
            `担当者: ${contactName}`,
            `メール: ${email}`,
            phone ? `電話: ${phone}` : '',
            `カテゴリ: ${categoryLabel}`,
            `希望連絡方法: ${contactPrefLabel}`,
            '',
            '相談内容:',
            message || '（未記入）',
            '━━━━━━━━━━━━━━━━━━',
            '',
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
