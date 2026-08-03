// GET /api/admin/acquisition-stats
// 2026-08-03新設の集客施策（Pinterest・提携店舗B2B2C・借り場・Mirror Xレーン）の稼働状況を集計
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function checkAdminKey(request) {
  return request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY;
}

export async function GET(request) {
  if (!checkAdminKey(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [pinterestRes, announceRes, providersRes, qandaRes, srcRes, xExpRes] = await Promise.all([
    supabase.from('sns_posts').select('post_type, text, posted, created_at').eq('channel', 'pinterest').order('created_at', { ascending: false }).limit(10),
    supabase.from('sns_posts').select('post_type, posted, created_at').eq('channel', 'provider_log_toolkit_announce'),
    supabase.from('providers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('sns_posts').select('post_type, text, created_at').eq('channel', 'qanda_scout').order('created_at', { ascending: false }).limit(5),
    supabase.from('sns_posts').select('post_type, created_at').eq('channel', 'src_inbound').gte('created_at', since30d),
    supabase.from('sns_posts').select('created_at').eq('channel', 'x').eq('post_type', 'experience').order('created_at', { ascending: false }).limit(5),
  ]);

  const pinterestPosts = pinterestRes.data || [];
  const announceRows = announceRes.data || [];
  const activeProviders = providersRes.count || 0;
  const qandaRuns = qandaRes.data || [];
  const srcRows = srcRes.data || [];
  const xExperiencePosts = xExpRes.data || [];

  const srcBySource = {};
  for (const r of srcRows) {
    srcBySource[r.post_type] = (srcBySource[r.post_type] || 0) + 1;
  }
  const srcBreakdown = Object.entries(srcBySource)
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => ({ src, count }));

  return Response.json({
    generatedAt: new Date().toISOString(),
    channels: {
      pinterest: {
        configured: !!(process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID),
        recentPosts: pinterestPosts.map(p => ({ source: p.post_type, text: p.text, posted: p.posted, at: p.created_at })),
        autoPosted: pinterestPosts.filter(p => p.posted).length,
        emailedOnly: pinterestPosts.filter(p => !p.posted).length,
      },
      providerToolkit: {
        activeProviders,
        announced: announceRows.length,
        sent: announceRows.filter(r => r.posted).length,
        pending: Math.max(0, activeProviders - announceRows.length),
      },
      qandaScout: {
        configured: !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX),
        lastRuns: qandaRuns.map(r => ({ mode: r.post_type, detail: r.text, at: r.created_at })),
      },
      xExperienceLane: {
        postedCount: xExperiencePosts.length,
        lastPostedAt: xExperiencePosts[0]?.created_at || null,
      },
    },
    srcInbound30d: srcBreakdown,
  });
}
