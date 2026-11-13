// GET /api/provider/consultant/web → 入れたURL・読み取ったまとめ・URLごとの結果
// PUT /api/provider/consultant/web { urls: [] } → URLを保存して読み直す（お店のオーナーのみ・10分に1回まで）
// 2026-11-13 渡邉提案：お店の公式サイト・SNSをAIが読んで、どんなお店かを学ぶ。lib/consultant-web.js / lib/safe-fetch.js
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { authProvider, supabase, consultantEnabled } from '../_lib';
import { withAudit } from '@/lib/activity-log';
import { cleanUrls, learnFromWeb, MAX_URLS } from '@/lib/consultant-web';

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('provider_consultant_settings').select('web_urls, web_profile, web_sources, web_fetched_at').eq('provider_id', provider.id).maybeSingle();
  return Response.json({ urls: data?.web_urls || [], profile: data?.web_profile || '', sources: data?.web_sources || [], fetched_at: data?.web_fetched_at || null, max: MAX_URLS });
}

async function __PUT(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const urls = cleanUrls(b.urls);
  const { data: cur } = await supabase.from('provider_consultant_settings').select('web_fetched_at').eq('provider_id', provider.id).maybeSingle();
  if (cur?.web_fetched_at && Date.now() - new Date(cur.web_fetched_at).getTime() < 10 * 60000 && !b.save_only) {
    return Response.json({ error: '読み直しは10分に1回までです。少し待ってからお試しください' }, { status: 429 });
  }
  const now = new Date().toISOString();
  if (!urls.length) {
    await supabase.from('provider_consultant_settings').upsert({ provider_id: provider.id, web_urls: [], web_profile: null, web_sources: [], updated_at: now }, { onConflict: 'provider_id' });
    return Response.json({ urls: [], profile: '', sources: [] });
  }
  let r;
  try { r = await learnFromWeb(urls, provider.name || 'お店'); } catch (e) {
    console.error('[consultant web]', e?.message);
    return Response.json({ error: 'ページは読めましたが、まとめを作れませんでした。時間をおいてもう一度お試しください' }, { status: 502 });
  }
  await supabase.from('provider_consultant_settings').upsert({
    provider_id: provider.id, web_urls: urls, web_profile: r.profile, web_sources: r.sources, web_fetched_at: now, updated_at: now,
  }, { onConflict: 'provider_id' });
  return Response.json({ urls, profile: r.profile || '', sources: r.sources, fetched_at: now });
}
export const PUT = withAudit(__PUT);
