import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function checkAdminKey(req) {
  const key = req.headers.get('x-admin-key');
  return key === process.env.ADMIN_API_KEY || key === process.env.BUSINESS_ACCESS_KEY;
}

export async function GET(req) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabase()
    .from('admin_tasks')
    .select('*')
    .order('done', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, category, priority } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const { data, error } = await getSupabase()
    .from('admin_tasks')
    .insert({ title: title.trim(), category: category || 'その他', priority: priority || 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
