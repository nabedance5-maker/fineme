import { NextResponse } from 'next/server';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// GET /api/products?axis=skin,hair&level=beginner&price_range=low,mid
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const axisParam = searchParams.get('axis');      // カンマ区切り or null=全軸
  const levelParam = searchParams.get('level');    // beginner/intermediate/advanced
  const priceParam = searchParams.get('price_range'); // low/mid/high カンマ区切り

  const adminMode = searchParams.get('admin') === '1'; // 管理画面用：全件返す
  let url = `${SUPA_URL}/rest/v1/affiliate_products?order=sort_order.asc,created_at.asc&select=*`;
  if (!adminMode) url += '&is_active=eq.true';

  if (axisParam) {
    const axes = axisParam.split(',').map(a => a.trim()).filter(Boolean);
    url += `&axis=in.(${axes.join(',')})`;
  }
  if (levelParam) {
    // level 以下を全部返す（beginner → beginner のみ / intermediate → beginner+intermediate）
    const LEVELS = ['beginner', 'intermediate', 'advanced'];
    const maxIdx = LEVELS.indexOf(levelParam);
    const allowed = LEVELS.slice(0, maxIdx + 1);
    url += `&level=in.(${allowed.join(',')})`;
  }
  if (priceParam) {
    const prices = priceParam.split(',').map(p => p.trim()).filter(Boolean);
    url += `&price_range=in.(${prices.join(',')})`;
  }

  const res = await fetch(url, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return NextResponse.json({ error: 'fetch failed', status: res.status, detail: errBody }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/products  — 管理者のみ（Service Role Key 必要）
export async function POST(req) {
  const key = req.headers.get('x-admin-key');
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const res = await fetch(`${SUPA_URL}/rest/v1/affiliate_products`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 201 : 400 });
}

// PATCH /api/products?id=xxx
export async function PATCH(req) {
  const key = req.headers.get('x-admin-key');
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const res = await fetch(`${SUPA_URL}/rest/v1/affiliate_products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 400 });
}

// DELETE /api/products?id=xxx
export async function DELETE(req) {
  const key = req.headers.get('x-admin-key');
  if (key !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const res = await fetch(`${SUPA_URL}/rest/v1/affiliate_products?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 400 });
}
