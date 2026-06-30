// X API 従量課金の $20/月 ハードキャップ制御（自己計測）
// x-post / x-engage が共有。当月の使用量を Supabase x_api_usage から読み、
// 上限手前なら動作を縮小／停止する。実行後に addUsage() で加算する。

import { getSupabase } from '../../../lib/supabase';

// 単価（2026 pay-per-use）
export const PRICE = { read: 0.005, writePlain: 0.015, writeLink: 0.20 };

// 安全マージン：$20 の手前 $18 で停止。日次の読み取り暴走も抑制。
export const MONTHLY_CAP = 18.0;   // USD（$20 の手前で止める）
export const ALERT_AT = 16.0;      // USD（80%で警告）
export const DAILY_READ_CAP = 120; // 1日の読み取り上限（暴走防止）

export function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7); // 'YYYY-MM'（UTC）
}

export function estCost({ reads = 0, writes_plain = 0, writes_link = 0 }) {
  return reads * PRICE.read + writes_plain * PRICE.writePlain + writes_link * PRICE.writeLink;
}

// 当月の使用量行を取得（無ければゼロ）
export async function loadMonth() {
  const month = monthKey();
  try {
    const sb = getSupabase();
    const { data } = await sb.from('x_api_usage').select('*').eq('month', month).maybeSingle();
    const row = data || { month, reads: 0, writes_plain: 0, writes_link: 0 };
    return { ...row, cost: estCost(row) };
  } catch (e) {
    console.error('[x-budget] loadMonth error:', e.message);
    // 取得失敗時は安全側：上限到達扱いにして動かさない
    return { month, reads: 0, writes_plain: 0, writes_link: 0, cost: MONTHLY_CAP, _error: true };
  }
}

// 使用量を加算（RPC で原子的に）
export async function addUsage({ reads = 0, writes_plain = 0, writes_link = 0 }) {
  const month = monthKey();
  try {
    const sb = getSupabase();
    await sb.rpc('add_x_usage', {
      p_month: month, p_reads: reads, p_writes_plain: writes_plain, p_writes_link: writes_link,
    });
  } catch (e) {
    console.error('[x-budget] addUsage error:', e.message);
  }
}

// 残り予算（USD）
export function remainingBudget(monthRow) {
  return Math.max(0, MONTHLY_CAP - (monthRow.cost || 0));
}

// 残予算で許容できる読み取り件数（日次キャップとの小さい方）
export function allowedReads(monthRow) {
  const byMoney = Math.floor(remainingBudget(monthRow) / PRICE.read);
  return Math.max(0, Math.min(byMoney, DAILY_READ_CAP));
}

// 指定の書き込みが予算内に収まるか
export function canWrite(monthRow, { withLink = false } = {}) {
  const add = withLink ? PRICE.writeLink : PRICE.writePlain;
  return (monthRow.cost || 0) + add <= MONTHLY_CAP;
}
