// PATCH /api/admin/affiliates/[id] - アフィリエイト更新（運営用）
// DELETE /api/admin/affiliates/[id] - アフィリエイト削除（運営用）
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function GET(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .eq('entity_type', 'affiliate')
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await request.json();

  const allowed = [
    'name', 'slug', 'catchphrase', 'description', 'target_desc', 'philosophy', 'guide_message',
    'main_category', 'price_from', 'photo_url', 'cover_image_url', 'unique_strengths',
    'affiliate_url', 'published', 'admin_hidden',
    'suitable_triggers', 'handles_failure_patterns', 'provider_style',
    'ideal_client_desc', 'client_before_state', 'transformation_pattern', 'best_fit_desc',
    'ai_match_profile', 'facility_photos',
  ];

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (updates.price_from !== undefined) {
    updates.price_from = (updates.price_from === '' || updates.price_from === null)
      ? null : Number(updates.price_from);
  }

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .eq('entity_type', 'affiliate')
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', id)
    .eq('entity_type', 'affiliate');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
