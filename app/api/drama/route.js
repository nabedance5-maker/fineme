import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAdminKey(request) {
  const key = request.headers.get('x-admin-key');
  return key === process.env.DRAMA_ADMIN_KEY;
}

// GET — 認証不要（公開）
export async function GET() {
  const supabase = getSupabase();

  const [episodesRes, ideasRes, kpisRes, mirrorRes, configRes, refsRes] = await Promise.all([
    supabase.from('drama_episodes').select('*').order('episode_no', { ascending: true }),
    supabase.from('drama_ideas').select('*').order('created_at', { ascending: true }),
    supabase.from('drama_kpis').select('*').order('updated_at', { ascending: false }).limit(1),
    supabase.from('mirror_sessions').select('id', { count: 'exact', head: true }).eq('paid', true),
    supabase.from('drama_config').select('*').eq('id', 1).single(),
    supabase.from('drama_refs').select('*').order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    episodes: episodesRes.data ?? [],
    ideas: ideasRes.data ?? [],
    kpis: kpisRes.data?.[0] ?? { tiktok_followers: 0, instagram_followers: 0, youtube_followers: 0 },
    mirrorPaid: mirrorRes.count ?? 0,
    config: configRes.data ?? { canvas: {} },
    refs: refsRes.data ?? [],
  });
}

// POST — 追加（admin必須）
export async function POST(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { type, data } = body;

  if (type === 'episode') {
    const { data: row, error } = await supabase
      .from('drama_episodes')
      .insert(data)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  if (type === 'idea') {
    const { data: row, error } = await supabase
      .from('drama_ideas')
      .insert({ idea: data.idea })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  if (type === 'config') {
    const { error } = await supabase
      .from('drama_config')
      .upsert({ id: 1, canvas: data, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (type === 'ref') {
    const { data: row, error } = await supabase
      .from('drama_refs')
      .insert(data)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// PUT — 更新（admin必須）
export async function PUT(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { type, id, data } = body;

  if (type === 'episode') {
    const { data: row, error } = await supabase
      .from('drama_episodes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  if (type === 'idea') {
    const { data: row, error } = await supabase
      .from('drama_ideas')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  if (type === 'kpi') {
    const { data: existing } = await supabase.from('drama_kpis').select('id').limit(1);
    const kpiId = existing?.[0]?.id;
    if (kpiId) {
      const { data: row, error } = await supabase
        .from('drama_kpis')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', kpiId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(row);
    }
    const { data: row, error } = await supabase
      .from('drama_kpis')
      .insert({ ...data })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// DELETE — 削除（admin必須）
export async function DELETE(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tableMap = { idea: 'drama_ideas', episode: 'drama_episodes', ref: 'drama_refs' };
  const table = tableMap[type] || 'drama_episodes';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
