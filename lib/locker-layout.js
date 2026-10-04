import { getSupabase } from '@/lib/supabase';

export const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function getProviderFromRequest(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

export function rectOf(l) {
  return { r1: l.grid_row, c1: l.grid_col, r2: l.grid_row + (l.row_span || 1) - 1, c2: l.grid_col + (l.col_span || 1) - 1 };
}

export function overlaps(a, b) {
  return a.r1 <= b.r2 && b.r1 <= a.r2 && a.c1 <= b.c2 && b.c1 <= a.c2;
}

// 置く位置・大きさがロッカー群の範囲内で、他のロッカーと重ならないか。問題なければ null
export function checkPlacement(bank, others, cand) {
  const { grid_row, grid_col, row_span, col_span } = cand;
  if ([grid_row, grid_col, row_span, col_span].some(n => !Number.isInteger(n) || n < 1)) return '位置・大きさが正しくありません';
  const rect = rectOf(cand);
  if (rect.r2 > bank.grid_rows || rect.c2 > bank.grid_cols) return '配置図の範囲を超えています';
  if (others.some(o => o.grid_row != null && overlaps(rect, rectOf(o)))) return '他のロッカーと重なっています';
  return null;
}

export async function loadActiveContractMap(lockerIds) {
  const map = {};
  for (let i = 0; i < lockerIds.length; i += 150) {
    const { data } = await supabase
      .from('provider_locker_contracts')
      .select('locker_id')
      .in('locker_id', lockerIds.slice(i, i + 150))
      .eq('status', 'active');
    (data || []).forEach(c => { map[c.locker_id] = true; });
  }
  return map;
}
