// GET /api/stories?providerId=xxx&tag=xxx&status=approved
import { getSupabase } from '@/lib/supabase';
// POST /api/stories → 体験談を投稿（pending状態）

const supabaseAdmin = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'approved';
  const providerId = searchParams.get('providerId') || '';
  const tag = searchParams.get('tag') || '';

  let query = supabaseAdmin
    .from('stories')
    .select('id, provider_id, service_name, concern_before, change_after, love_impact, recommend_to, tags, rating, published_at, created_at')
    .eq('status', status)
    .order('published_at', { ascending: false })
    .limit(50);

  if (providerId) query = query.eq('provider_id', providerId);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { answers, tags, reservationId, providerId, serviceName, userId } = body;

    if (!answers || answers.length < 2 || !answers[0]?.trim() || !answers[1]?.trim()) {
      return Response.json({ error: '必須項目（Q1・Q2）が不足しています' }, { status: 400 });
    }

    const maxLen = [500, 600, 500, 400];
    const clean = answers.map((a, i) =>
      String(a || '').slice(0, maxLen[i]).replace(/[\x00-\x1F\x7F]/g, '')
    );

    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert({
        reservation_id: reservationId || null,
        user_id: userId || null,
        provider_id: String(providerId || ''),
        service_name: serviceName || null,
        concern_before: clean[0],
        change_after: clean[1],
        love_impact: clean[2] || null,
        recommend_to: clean[3] || null,
        tags: Array.isArray(tags) ? tags.slice(0, 5) : [],
        rating: 5,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return Response.json({ ok: true, id: data.id, message: '投稿を受け付けました。審査後に公開されます。' });
  } catch (err) {
    console.error('[stories POST]', err);
    return Response.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
