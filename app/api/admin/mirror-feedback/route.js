// GET  /api/admin/mirror-feedback  — 収集済み声一覧
// PATCH /api/admin/mirror-feedback  — 承認トグル + meta 更新
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function checkAdminKey(request) {
  return request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY;
}

export async function GET(request) {
  if (!checkAdminKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  const { data, error } = await db
    .from('mirror_feedback')
    .select('id, session_id, text, lp_approved, lp_meta, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ voices: data || [] });
}

export async function PATCH(request) {
  if (!checkAdminKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, lp_approved, lp_meta } = await request.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const db = getSupabase();
  const update = {};
  if (typeof lp_approved === 'boolean') update.lp_approved = lp_approved;
  if (typeof lp_meta === 'string') update.lp_meta = lp_meta.trim() || null;
  const { error } = await db.from('mirror_feedback').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
