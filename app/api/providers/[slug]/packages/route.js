// GET /api/providers/[slug]/packages - 掲載者の回数券・パッケージ一覧（公開用・オンライン購入向け）
// でお要望2026-09-27：決済機能（Phase 6）第一弾。'subscription'（月額自動付与）は
// カード保存＋サブスク作成が別建てで必要になり今回のスコープ外のため除外する。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;

  const { data: provider } = await supabase
    .from('providers')
    .select('id, stripe_connect_id, stripe_connect_status')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  // オンライン決済の受け皿（Stripe Connect）が整っていない店舗は購入不可
  if (provider.stripe_connect_status !== 'active') return Response.json([]);

  const { data, error } = await supabase
    .from('service_packages')
    .select('id, name, total_sessions, price, validity_days, package_type, combo_ticket_sessions')
    .eq('provider_id', provider.id)
    .eq('active', true)
    .neq('package_type', 'subscription')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
