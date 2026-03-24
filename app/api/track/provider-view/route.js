import { getSupabase } from '@/lib/supabase';

/**
 * POST /api/track/provider-view
 * Body: { provider_id: string }
 *
 * 掲載者公開ページの閲覧数を日次でカウントアップ（upsert）する。
 * クライアント側 sessionStorage で1セッション内の重複を除外してから呼ぶこと。
 */
export async function POST(request) {
  try {
    const { provider_id } = await request.json();
    if (!provider_id) return Response.json({ error: 'provider_id required' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const sb = getSupabase();

    const { error } = await sb.rpc('increment_provider_page_view', {
      p_provider_id: provider_id,
      p_date: today,
    });

    if (error) {
      // RPC が未定義の場合は fallback: upsert + raw update
      const { data: existing } = await sb
        .from('provider_page_views')
        .select('id, count')
        .eq('provider_id', provider_id)
        .eq('date', today)
        .single();

      if (existing) {
        await sb
          .from('provider_page_views')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
      } else {
        await sb
          .from('provider_page_views')
          .insert({ provider_id, date: today, count: 1 });
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/track/provider-view?provider_id=xxx&month=YYYY-MM
 *
 * 指定月（省略時=当月）の閲覧数合計を返す。
 * ダッシュボードの「今月のページ閲覧数」用。
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const provider_id = searchParams.get('provider_id');
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM

  if (!provider_id) return Response.json({ error: 'provider_id required' }, { status: 400 });

  const sb = getSupabase();
  const { data, error } = await sb
    .from('provider_page_views')
    .select('count')
    .eq('provider_id', provider_id)
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const total = (data || []).reduce((sum, row) => sum + (row.count || 0), 0);
  return Response.json({ total });
}
