// GET /api/pay/[id] → 請求の内容（公開・お客様のスマホ用）。推測できないIDが鍵になる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const { data } = await supabase.from('provider_invoices')
    .select('title, amount, note, due_date, status, provider_id').eq('id', id).maybeSingle();
  if (!data) return Response.json({ error: '見つかりません' }, { status: 404 });
  const { data: p } = await supabase.from('providers').select('name').eq('id', data.provider_id).single();
  const { provider_id, ...rest } = data;
  return Response.json({ ...rest, provider_name: p?.name || '' });
}
