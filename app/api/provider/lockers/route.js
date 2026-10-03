// GET  /api/provider/lockers → 自店舗のロッカー一覧（現在の契約状況つき）
// POST /api/provider/lockers → ロッカー新規追加
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { checkPlacement, toInt } from '@/lib/locker-layout';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: lockers, error } = await supabase
    .from('provider_lockers')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!lockers?.length) return Response.json([]);

  const { data: contracts } = await supabase
    .from('provider_locker_contracts')
    .select('*')
    .in('locker_id', lockers.map(l => l.id))
    .eq('status', 'active');
  const activeByLocker = {};
  (contracts || []).forEach(c => { activeByLocker[c.locker_id] = c; });

  return Response.json(lockers.map(l => ({ ...l, activeContract: activeByLocker[l.id] || null })));
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, monthly_fee } = body;
  if (!name?.trim()) return Response.json({ error: 'ロッカー名は必須です' }, { status: 400 });

  const place = {
    grid_row: toInt(body.grid_row),
    grid_col: toInt(body.grid_col),
    row_span: 'row_span' in body ? toInt(body.row_span) : 1,
    col_span: 'col_span' in body ? toInt(body.col_span) : 1,
  };
  if (!body.bank_id) return Response.json({ error: '配置先のロッカー群を指定してください' }, { status: 400 });
  const { data: bank } = await supabase.from('provider_locker_banks').select('*').eq('id', body.bank_id).eq('provider_id', provider.id).single();
  if (!bank) return Response.json({ error: 'ロッカー群が見つかりません' }, { status: 404 });
  const { data: others } = await supabase.from('provider_lockers').select('grid_row, grid_col, row_span, col_span').eq('bank_id', bank.id);
  const placeErr = checkPlacement(bank, others || [], place);
  if (placeErr) return Response.json({ error: placeErr }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_lockers')
    .insert({ provider_id: provider.id, name: name.trim(), monthly_fee: monthly_fee || null, bank_id: bank.id, ...place, sort_order: (place.grid_row - 1) * bank.grid_cols + place.grid_col })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

export const POST = withAudit(__POST);
