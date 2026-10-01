// GET  /api/provider/today-blocks → 自店舗の「今日の業務」ブロック一覧（認証済み）
// POST /api/provider/today-blocks → メモブロックを新規追加（認証済み。builtin_*は追加不可・自動シードのみ）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

// デフォルトで表示されている4カード（今日の予約・未対応の予約リクエスト・
// チェックイン・売上）。初回GET時にこの順でシードする（でお要望2026-10-01）。
const BUILTIN_ORDER = ['builtin_reservations', 'builtin_requests', 'builtin_checkin', 'builtin_sales'];

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let { data, error } = await supabase
    .from('provider_today_blocks')
    .select('id, block_type, content, sort_order, hidden, display_mode')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  data = data || [];

  if (!data.some(b => b.block_type.startsWith('builtin_'))) {
    const seedRows = BUILTIN_ORDER.map((block_type, i) => ({
      provider_id: provider.id, block_type, content: {}, sort_order: i, hidden: false, display_mode: 'inline',
    }));
    const { error: seedError } = await supabase.from('provider_today_blocks').insert(seedRows);
    if (!seedError) {
      const { data: data2 } = await supabase
        .from('provider_today_blocks')
        .select('id, block_type, content, sort_order, hidden, display_mode')
        .eq('provider_id', provider.id)
        .order('sort_order', { ascending: true });
      data = data2 || data;
    }
  }

  return Response.json(data);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { block_type, content, display_mode } = await request.json().catch(() => ({}));
  if (block_type !== 'memo') return Response.json({ error: '追加できるのはメモのみです' }, { status: 400 });

  const { count } = await supabase
    .from('provider_today_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id);

  const { data, error } = await supabase
    .from('provider_today_blocks')
    .insert({
      provider_id: provider.id,
      block_type: 'memo',
      content: { text: String(content?.text || '').trim() },
      sort_order: count || 0,
      display_mode: display_mode === 'popup' ? 'popup' : 'inline',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
