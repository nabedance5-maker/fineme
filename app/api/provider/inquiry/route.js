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
  hair: '美容室・ヘアサロン', esthetic: 'エステ・痩身', nails: 'ネイル',
  makeup: 'メイク・顔分析', eyelash: 'まつ毛・アイブロウ', cosmetic: '美容外科・美容クリニック',
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

    // メール通知（RESEND_API_KEY が設定されていれば送信）
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
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
            category ? `カテゴリ: ${CATEGORY_LABEL[category] || category}` : '',
            `希望連絡方法: ${contactPref || 'email'}`,
            '',
            `相談内容:`,
            message || '（未記入）',
            '',
            '---',
            '管理画面で確認: https://www.fineme.me/admin/inquiries',
          ].filter(line => line !== null).join('\n'),
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
