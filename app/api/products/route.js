import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/products?axis=skin,hair&level=beginner&price_range=low,mid&admin=1
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const axisParam  = searchParams.get('axis');
  const levelParam = searchParams.get('level');
  const priceParam = searchParams.get('price_range');
  const adminMode  = searchParams.get('admin') === '1';

  const supabase = getSupabase();
  let query = supabase.from('affiliate_products').select('*').order('sort_order').order('created_at');

  if (!adminMode) query = query.eq('is_active', true);

  if (axisParam) {
    query = query.in('axis', axisParam.split(',').map(a => a.trim()).filter(Boolean));
  }
  if (levelParam) {
    const LEVELS = ['beginner', 'intermediate', 'advanced'];
    const allowed = LEVELS.slice(0, LEVELS.indexOf(levelParam) + 1);
    query = query.in('level', allowed);
  }
  if (priceParam) {
    query = query.in('price_range', priceParam.split(',').map(p => p.trim()).filter(Boolean));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — 管理者のみ
export async function POST(req) {
  if ((() => { const k = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || ''; return !k || req.headers.get('x-admin-key') !== k; })()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { data, error } = await getSupabase().from('affiliate_products').insert(body).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/products?id=xxx
export async function PATCH(req) {
  if ((() => { const k = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || ''; return !k || req.headers.get('x-admin-key') !== k; })()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const body = await req.json();
  const { data, error } = await getSupabase().from('affiliate_products').update(body).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/products?id=xxx
export async function DELETE(req) {
  if ((() => { const k = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || ''; return !k || req.headers.get('x-admin-key') !== k; })()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await getSupabase().from('affiliate_products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
