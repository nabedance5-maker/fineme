// GET /api/me/provider-records → ログイン中ユーザー本人について、掲載店舗が記録した
// AI姿勢分析・AI健診アドバイスの結果を店舗横断で時系列にまとめて返す。
// でお要望2026-09-27「今持ってるデータをNew Me Log側に橋渡しする1本の導線を作る」対応。
// これまで店舗スタッフのみが見られる運用だった記録（app/api/provider/customers/[user_id]/
// posture-entries, health-advice-entries と同じテーブル）を、New Me Logで本人にも
// 見せる（＝Fineme独自の「店舗ツール＋会員アプリを両方持つ」構造を活かした差別化）。
// カルテの自由記述メモ（provider_customer_notes / provider_karte_entries）は
// 店舗専用として引き続き本人には見せない（このルートでは扱わない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // note（スタッフの内部メモ欄）は本人向けの表現になっていない可能性があるため、
  // このお客様向けエンドポイントでは意図的に取得・返却しない（AIが生成したfindings/adviceのみ渡す）。
  const [{ data: postureRows }, { data: healthRows }] = await Promise.all([
    supabase.from('provider_posture_entries').select('id, provider_id, photo_url, score, findings, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('provider_health_advice_entries').select('id, provider_id, category, advice_axis, photo_url, advice, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);

  const records = [
    ...(postureRows || []).map(r => ({ id: r.id, type: 'posture', provider_id: r.provider_id, photo_url: r.photo_url, score: r.score, findings: r.findings || [], created_at: r.created_at })),
    ...(healthRows || []).map(r => ({ id: r.id, type: 'health_advice', provider_id: r.provider_id, category: r.category, advice_axis: r.advice_axis, photo_url: r.photo_url, findings: r.advice || [], created_at: r.created_at })),
  ];
  if (!records.length) return Response.json([]);

  const providerIds = [...new Set(records.map(r => r.provider_id))];
  const { data: providers } = await supabase.from('providers').select('id, name, slug').in('id', providerIds);
  const providerMap = {};
  (providers || []).forEach(p => { providerMap[p.id] = p; });

  records.forEach(r => {
    r.provider_name = providerMap[r.provider_id]?.name || '(店舗)';
    r.provider_slug = providerMap[r.provider_id]?.slug || null;
    delete r.provider_id;
  });
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return Response.json(records);
}
