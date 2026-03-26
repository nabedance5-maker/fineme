// GET /api/admin/affiliates - アフィリエイト一覧（運営用）
// POST /api/admin/affiliates - アフィリエイト新規登録
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.UPLOAD_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('entity_type', 'affiliate')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      slug, name, catchphrase, description, target_desc, philosophy, guide_message,
      main_category, price_from, photo_url, cover_image_url,
      unique_strengths, affiliate_url,
      suitable_triggers, handles_failure_patterns, provider_style,
      ideal_client_desc, client_before_state, transformation_pattern, best_fit_desc,
    } = body;

    if (!name || !main_category) {
      return Response.json({ error: 'name, main_category は必須です' }, { status: 400 });
    }

    const resolvedSlug = (slug || '').trim() || null;

    const { data, error } = await supabase
      .from('providers')
      .insert([{
        entity_type: 'affiliate',
        slug: resolvedSlug,
        name,
        catchphrase: catchphrase || null,
        description: description || null,
        target_desc: target_desc || null,
        philosophy: philosophy || null,
        guide_message: guide_message || null,
        main_category,
        price_from: price_from ? Number(price_from) : null,
        photo_url: photo_url || null,
        cover_image_url: cover_image_url || null,
        unique_strengths: unique_strengths || null,
        affiliate_url: affiliate_url || null,
        published: false,
        admin_hidden: false,
        suitable_triggers: suitable_triggers || [],
        handles_failure_patterns: handles_failure_patterns || [],
        provider_style: provider_style || null,
        ideal_client_desc: ideal_client_desc || null,
        client_before_state: client_before_state || null,
        transformation_pattern: transformation_pattern || null,
        best_fit_desc: best_fit_desc || null,
      }])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
