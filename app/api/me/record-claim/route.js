// POST /api/me/record-claim { token } → 閲覧リンクで受け取った姿勢分析の記録を、ログイン中の自分のNew Me Logに残す
// 2026-11-24 渡邉承認の指示書 §9。お店の手動顧客（Finemeに登録していないお客様）と、このアカウントを結びつける。
// 結びつけはこの経路（お店が渡したリンク＋本人のログイン）だけで行い、電話番号等での自動照合はしない。
// 結びつけた後も、New Me Logに出るのはお店が「お客様に表示する」にした記録だけ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { claimByShareToken } from '@/lib/posture-share';
import { transferManualNumberToUser } from '@/lib/customer-numbers';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // お店のアカウント・デモのアカウントでは結びつけない（お客様のアカウントだけ）
  const { data: ownStore } = await db.from('providers').select('id').eq('email', user.email).maybeSingle();
  if (ownStore || /@demo\.fineme\.me$/i.test(user.email || '')) return Response.json({ error: 'お店のアカウントでは記録を残せません。お客様ご自身のアカウントでログインしてください' }, { status: 403 });

  const { token } = await request.json().catch(() => ({}));
  const r = await claimByShareToken(db, token, user.id);
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  if (!r.already) {
    try { await transferManualNumberToUser(db, r.provider_id, r.manual_customer_id, user.id); } catch { /* お客様番号の引き継ぎに失敗しても結びつけは成立させる */ }
  }
  return Response.json({ ok: true });
}
