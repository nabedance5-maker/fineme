import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkReferralCode } from '@/lib/referral-code';
import { setProviderReferrer } from '@/lib/collaborator-rewards';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY;
}

// GET: 一覧取得
export async function GET(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('provider_inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: ステータス更新
export async function PATCH(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabase();
  const body = await request.json();
  const { id, status } = body;
  // 紹介コードを直す（2026-11-06）。アカウント作成済みなら、お店の紹介者（providers.referred_by）も直す
  if (id && body.referral_code !== undefined) {
    const rc = await checkReferralCode(supabase, body.referral_code);
    if (rc.error) return NextResponse.json({ error: rc.error }, { status: 400 });
    const { data: inq, error: e1 } = await supabase.from('provider_inquiries').update({ referral_code: rc.code }).eq('id', id).select('provider_id').single();
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    let note = '';
    if (inq?.provider_id) {
      const r = await setProviderReferrer(supabase, inq.provider_id, rc.code);
      note = r.note;
    }
    return NextResponse.json({ ok: true, referral_code: rc.code, note });
  }
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const { error } = await supabase
    .from('provider_inquiries')
    .update({ status })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: 削除
export async function DELETE(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabase();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('provider_inquiries')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
