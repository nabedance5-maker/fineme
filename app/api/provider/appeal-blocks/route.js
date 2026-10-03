// GET  /api/provider/appeal-blocks → 自店舗のアピールブロック一覧（認証済み）
// POST /api/provider/appeal-blocks → ブロックを新規追加（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const BLOCK_TYPES = ['heading', 'paragraph', 'image', 'button', 'quote'];

// button.urlはpublicページでa hrefにそのまま出すため、http(s)以外（javascript:等）は保存しない
// （友達紹介ボタン機能で確立済みの検証をそのまま流用）。
function sanitizeContent(block_type, content) {
  const c = content && typeof content === 'object' ? content : {};
  if (block_type === 'heading' || block_type === 'paragraph') {
    return { text: String(c.text || '').trim(), align: c.align === 'center' ? 'center' : 'left' };
  }
  if (block_type === 'image') {
    return { url: String(c.url || '').trim(), caption: String(c.caption || '').trim(), size: c.size === 'full' ? 'full' : 'medium' };
  }
  if (block_type === 'button') {
    const url = String(c.url || '').trim();
    return { label: String(c.label || '').trim(), url: /^https?:\/\//i.test(url) ? url : '' };
  }
  if (block_type === 'quote') {
    return { text: String(c.text || '').trim(), attribution: String(c.attribution || '').trim() };
  }
  return {};
}

// デフォルトセクション（ガイドの一言・強み・スタッフ紹介・New Me Map・理念・体験談・
// サービス一覧）も、カスタムブロックと同じ一覧で並び替え・表示/非表示できるように
// （でお要望2026-10-01）。この一覧をまだ一度も開いていない店舗はbuiltin_*行が無いため、
// 最初のGETで現在の固定表示順と同じ順序でシードする（本文は保存せず、常に{}——
// guide_message等の実データはproviders側のカラムのまま。並び順・表示/非表示だけがこの
// テーブルの責務）。公開ページ側はbuiltin_*行が無い店舗には従来の固定順レンダリングを
// 使うため（app/provider/[slug]/page.js側でフォールバック済み）、既存店舗には影響しない。
const BUILTIN_ORDER = [
  'builtin_guide_message', 'builtin_unique_strengths', 'builtin_staff',
  'builtin_newme_map', 'builtin_philosophy', 'builtin_stories', 'builtin_program',
];

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let { data, error } = await supabase
    .from('provider_appeal_blocks')
    .select('id, block_type, content, sort_order, hidden')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  data = data || [];

  if (!data.some(b => b.block_type.startsWith('builtin_'))) {
    const startOrder = data.length ? Math.max(...data.map(b => b.sort_order)) + 1 : 0;
    const seedRows = BUILTIN_ORDER.map((block_type, i) => ({
      provider_id: provider.id, block_type, content: {}, sort_order: startOrder + i, hidden: false,
    }));
    const { error: seedError } = await supabase.from('provider_appeal_blocks').insert(seedRows);
    if (!seedError) {
      const { data: data2 } = await supabase
        .from('provider_appeal_blocks')
        .select('id, block_type, content, sort_order, hidden')
        .eq('provider_id', provider.id)
        .order('sort_order', { ascending: true });
      data = data2 || data;
    }
  }

  return Response.json(data);
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { block_type, content } = await request.json().catch(() => ({}));
  if (!BLOCK_TYPES.includes(block_type)) return Response.json({ error: '種類が不正です' }, { status: 400 });

  const { count } = await supabase
    .from('provider_appeal_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id);

  const { data, error } = await supabase
    .from('provider_appeal_blocks')
    .insert({
      provider_id: provider.id,
      block_type,
      content: sanitizeContent(block_type, content),
      sort_order: count || 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export const POST = withAudit(__POST);
