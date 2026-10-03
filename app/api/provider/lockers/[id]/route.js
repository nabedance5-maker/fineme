// PATCH  /api/provider/lockers/[id] → ロッカー更新
// DELETE /api/provider/lockers/[id] → ロッカー削除（契約中でなければ）
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

async function __PATCH(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('name' in body) {
    if (!String(body.name || '').trim()) return Response.json({ error: 'ロッカー名は必須です' }, { status: 400 });
    update.name = String(body.name).trim();
  }
  if ('monthly_fee' in body) update.monthly_fee = body.monthly_fee || null;
  if ('active' in body) update.active = !!body.active;

  const movesLayout = ['grid_row', 'grid_col', 'row_span', 'col_span'].some(k => k in body);
  if (movesLayout || update.active === false) {
    const { count } = await supabase.from('provider_locker_contracts').select('id', { count: 'exact', head: true }).eq('locker_id', id).eq('status', 'active');
    if ((count || 0) > 0) {
      return Response.json({ error: movesLayout ? '契約中のロッカーは位置・大きさを変更できません。先に解約してください' : '契約中のロッカーは使用不可にできません。先に解約してください' }, { status: 409 });
    }
  }
  if (movesLayout) {
    const { data: cur } = await supabase.from('provider_lockers').select('*').eq('id', id).eq('provider_id', provider.id).single();
    if (!cur) return Response.json({ error: '見つかりません' }, { status: 404 });
    const next = {
      grid_row: 'grid_row' in body ? toInt(body.grid_row) : cur.grid_row,
      grid_col: 'grid_col' in body ? toInt(body.grid_col) : cur.grid_col,
      row_span: 'row_span' in body ? toInt(body.row_span) : cur.row_span,
      col_span: 'col_span' in body ? toInt(body.col_span) : cur.col_span,
    };
    const { data: bank } = await supabase.from('provider_locker_banks').select('*').eq('id', cur.bank_id).single();
    if (!bank) return Response.json({ error: 'ロッカー群が見つかりません' }, { status: 404 });
    const { data: others } = await supabase.from('provider_lockers').select('grid_row, grid_col, row_span, col_span').eq('bank_id', bank.id).neq('id', id);
    const placeErr = checkPlacement(bank, others || [], next);
    if (placeErr) return Response.json({ error: placeErr }, { status: 400 });
    Object.assign(update, next, { sort_order: (next.grid_row - 1) * bank.grid_cols + next.grid_col });
  }
  if (!Object.keys(update).length) return Response.json({ error: '変更がありません' }, { status: 400 });

  const { data, error } = await supabase.from('provider_lockers').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase.from('provider_locker_contracts').select('id', { count: 'exact', head: true }).eq('locker_id', id).eq('status', 'active');
  if ((count || 0) > 0) return Response.json({ error: '契約中のロッカーは削除できません。先に解約してください' }, { status: 409 });

  const { error } = await supabase.from('provider_lockers').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
