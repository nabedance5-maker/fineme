// GET /api/provider/page-theme → 自店舗の公開ページデザイン設定（認証済み）
// PUT /api/provider/page-theme → 保存（認証済み）。値は lib/provider-theme.js の normalizeTheme で検証する
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { normalizeTheme, colorProblem, DEFAULT_THEME } from '@/lib/provider-theme';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, page_theme, cover_image_url, slug').eq('email', user.email).single();
  return data || null;
}

async function auth(request) {
  const h = request.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return getProviderByToken(h.replace('Bearer ', ''));
}

export async function GET(request) {
  const provider = await auth(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({
    theme: normalizeTheme(provider.page_theme),
    isDefault: !provider.page_theme,
    coverImageUrl: provider.cover_image_url || null,
    slug: provider.slug,
  });
}

async function __PUT(request) {
  const provider = await auth(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  // 「デフォルトに戻す」は NULL 保存（今後デフォルトを見直したとき、その店舗にも反映されるように）
  if (body?.reset) {
    const { error } = await supabase.from('providers').update({ page_theme: null }).eq('id', provider.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ theme: { ...DEFAULT_THEME }, isDefault: true });
  }

  const raw = body?.theme || {};
  const ground = raw.ground === 'dark' ? 'dark' : 'light';
  for (const key of ['headingColor', 'bodyColor']) {
    const v = raw[key];
    if (typeof v === 'string' && v.startsWith('#')) {
      const problem = colorProblem(v, ground);
      if (problem) return Response.json({ error: `${key === 'headingColor' ? '見出し' : '本文'}の文字色：${problem}` }, { status: 400 });
    }
  }
  const theme = normalizeTheme(raw);
  const { error } = await supabase.from('providers').update({ page_theme: theme }).eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ theme, isDefault: false });
}

export const PUT = withAudit(__PUT);
