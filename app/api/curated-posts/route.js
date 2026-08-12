// GET   /api/curated-posts?ids=uuid1,uuid2          — 公開。status=approved & is_active のみ返す
// GET   /api/curated-posts?admin=1                  — 管理者用。全件返す（x-admin-key必須）
// POST  /api/curated-posts                          — 管理者用。新規登録
// PATCH /api/curated-posts?id=xxx                   — 管理者用。承認/却下・許諾確認・編集
// DELETE /api/curated-posts?id=xxx                  — 管理者用
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

function isAdmin(req) {
  const k = process.env.ADMIN_API_KEY || '';
  return !!k && req.headers.get('x-admin-key') === k;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  const adminMode = searchParams.get('admin') === '1';

  if (adminMode) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data, error } = await getSupabase()
      .from('curated_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  }

  // 公開: 表示可能なもの（承認済み・有効）のみ。permission_confirmedの値は
  // そのまま含めて返す — クライアント側でプレーンリンク/サムネ付きを出し分けるため
  let query = getSupabase()
    .from('curated_posts')
    .select('id, platform, post_url, thumbnail_url, creator_handle, axis, caption, permission_confirmed')
    .eq('status', 'approved')
    .eq('is_active', true);

  if (idsParam) {
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { data, error } = await getSupabase().from('curated_posts').insert(body).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const body = await req.json();
  const { data, error } = await getSupabase().from('curated_posts').update(body).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await getSupabase().from('curated_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
