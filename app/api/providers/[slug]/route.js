// GET /api/providers/[slug] - 掲載者詳細（公開ページ用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;

  // RPC経由で取得（PostgREST スキーマキャッシュをバイパスし、新カラムも確実に返す）
  const { data, error } = await supabase.rpc('get_provider_by_slug', { p_slug: slug });

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  // get_provider_by_slug は row_to_json(p)（全カラム）を返すため、公開してはいけない
  // 項目（ログイン用メール・LINEユーザーID・Stripe各ID）をここで除く（2026-10-01）。
  // 公開ページ側でこれらを参照している箇所は無い。
  const { email, line_user_id, stripe_customer_id, stripe_subscription_id, stripe_connect_id, stripe_connect_status, ...publicData } = data;
  return Response.json(publicData, { headers: { 'Cache-Control': 'no-store' } });
}
