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
import { withSignedPhotoUrls } from '@/lib/customer-record-photos';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // note（スタッフの内部メモ欄）は本人向けの表現になっていない可能性があるため、
  // このお客様向けエンドポイントでは意図的に取得・返却しない（AIが生成したfindings/adviceのみ渡す）。
  // 本人の記録に加えて、本人に結びついたお店の手動顧客（お店が選んで結びつけた・閲覧リンクから本人が残した）の記録も出す（2026-11-24 §9）
  const { data: linkedManual } = await supabase.from('provider_manual_customers').select('id').eq('linked_user_id', user.id);
  const manualIds = (linkedManual || []).map(m => m.id);
  const whose = q => (manualIds.length ? q.or(`user_id.eq.${user.id},manual_customer_id.in.(${manualIds.join(',')})`) : q.eq('user_id', user.id));
  const [{ data: postureRows }, { data: healthRows }] = await Promise.all([
    // 姿勢分析・健診アドバイスとも、お店が「お客様に表示する」にした記録だけ（姿勢 2026-11-12・健診 2026-11-24）
    whose(supabase.from('provider_posture_entries').select('id, provider_id, photo_url, side_photo_url, score, findings, focus_areas, next_actions, changes, created_at').eq('shared_with_customer', true)).order('created_at', { ascending: false }),
    whose(supabase.from('provider_health_advice_entries').select('id, provider_id, category, advice_axis, photo_url, advice, created_at').eq('shared_with_customer', true)).order('created_at', { ascending: false }),
  ]);

  const records = [
    ...(postureRows || []).map(r => ({ id: r.id, type: 'posture', provider_id: r.provider_id, photo_url: r.photo_url, side_photo_url: r.side_photo_url, score: r.score, findings: r.findings || [], focus_areas: r.focus_areas || [], next_actions: r.next_actions || [], changes: r.changes || [], created_at: r.created_at })),
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

  return Response.json(await withSignedPhotoUrls(supabase, records));
}
