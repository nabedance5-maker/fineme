import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function checkAdminKey(req) {
  const key = req.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY || key === process.env.BUSINESS_ACCESS_KEY;
}

export async function PATCH(req, { params }) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updates = {};
  if (typeof body.done === 'boolean') {
    updates.done = body.done;
    updates.done_at = body.done ? new Date().toISOString() : null;
  }
  if (body.title) updates.title = body.title.trim();
  if (body.category) updates.category = body.category;
  if (typeof body.priority === 'number') updates.priority = body.priority;
  const { data, error } = await getSupabase()
    .from('admin_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req, { params }) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { error } = await getSupabase().from('admin_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
