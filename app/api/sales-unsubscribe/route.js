// POST /api/sales-unsubscribe { token } → 営業メールの配信停止
// メールのリンクを開いただけ（セキュリティソフトの自動巡回を含む）で停止しないよう、ページのボタンからPOSTで受ける。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const { token } = await request.json().catch(() => ({}));
  if (!token || !UUID.test(token)) return Response.json({ error: 'リンクが正しくありません' }, { status: 400 });
  const { data, error } = await getSupabase()
    .from('sales_outreach')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('id')
    .maybeSingle();
  if (error) return Response.json({ error: '処理できませんでした' }, { status: 500 });
  if (!data) return Response.json({ error: 'リンクが見つかりません' }, { status: 404 });
  return Response.json({ ok: true });
}
