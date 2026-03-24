import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('provider inquiry error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
