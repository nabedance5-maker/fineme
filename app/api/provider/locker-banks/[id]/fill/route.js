// POST /api/provider/locker-banks/[id]/fill → ロッカーを一括作成
// 1) column_tiers なし: 空いているマスすべてに1マスずつ（左上から右へ段ごとに連番）
// 2) column_tiers あり: 列ごとの段数（例 [2,3,3,3]）でロッカーを作る。列ごとに段数が違っても
//    縦のマス数を最小公倍数に細分化して収める（既存ロッカーは見た目を保ったまま細分化に追従）。
// body: { prefix?, start?, digits?, monthly_fee?, column_tiers?: number[], order?: 'column'|'row' }
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt, rectOf, overlaps } from '@/lib/locker-layout';

const MAX_ROWS = 60;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

export async function POST(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: bank } = await supabase.from('provider_locker_banks').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const prefix = String(body.prefix || '').slice(0, 20);
  const start = 'start' in body ? toInt(body.start) : 1;
  const digits = 'digits' in body ? toInt(body.digits) : 0;
  if (!Number.isInteger(start) || start < 0) return Response.json({ error: '開始番号が正しくありません' }, { status: 400 });
  if (!Number.isInteger(digits) || digits < 0 || digits > 10) return Response.json({ error: '桁数が正しくありません' }, { status: 400 });
  const fee = body.monthly_fee === '' || body.monthly_fee == null ? null : Number(body.monthly_fee);
  if (fee != null && !(fee >= 0)) return Response.json({ error: '月額が正しくありません' }, { status: 400 });
  const label = n => `${prefix}${digits ? String(n).padStart(digits, '0') : String(n)}`;

  const { data: existing } = await supabase.from('provider_lockers').select('id, grid_row, grid_col, row_span, col_span, sort_order').eq('bank_id', id);
  const list = existing || [];

  if (Array.isArray(body.column_tiers)) {
    const tiers = body.column_tiers.slice(0, bank.grid_cols).map(v => (v === '' || v == null ? 0 : toInt(v)));
    if (tiers.some(t => !Number.isInteger(t) || t < 0 || t > MAX_ROWS)) return Response.json({ error: '段数が正しくありません' }, { status: 400 });
    if (!tiers.some(t => t > 0)) return Response.json({ error: '段数を入力した列がありません' }, { status: 400 });

    const target = tiers.reduce((a, t) => (t > 0 ? lcm(a, t) : a), bank.grid_rows);
    if (target > MAX_ROWS) return Response.json({ error: `段数の組み合わせだと縦の分割が${target}マスになり、上限${MAX_ROWS}を超えます。段数を揃えるか、ロッカーごとに大きさを調整してください` }, { status: 400 });
    const factor = target / bank.grid_rows;

    let current = list;
    if (factor > 1) {
      // 既存ロッカーを同じ見た目のまま細分化。下の段から動かして一意制約に当たらないようにする
      const sorted = [...list].sort((a, b) => b.grid_row - a.grid_row);
      for (const l of sorted) {
        const { error } = await supabase.from('provider_lockers').update({ grid_row: (l.grid_row - 1) * factor + 1, row_span: l.row_span * factor }).eq('id', l.id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
      }
      current = list.map(l => ({ ...l, grid_row: (l.grid_row - 1) * factor + 1, row_span: l.row_span * factor }));
      const { error: be } = await supabase.from('provider_locker_banks').update({ grid_rows: target }).eq('id', id);
      if (be) return Response.json({ error: be.message }, { status: 500 });
    }

    const cells = [];
    let skipped = 0;
    tiers.forEach((t, i) => {
      if (!t) return;
      const span = target / t;
      for (let k = 0; k < t; k++) {
        const cell = { grid_row: k * span + 1, grid_col: i + 1, row_span: span, col_span: 1 };
        if (current.some(o => overlaps(rectOf(cell), rectOf(o)))) { skipped++; continue; }
        cells.push({ ...cell, tier: k });
      }
    });
    if (!cells.length) return Response.json({ error: '指定した列はすでにロッカーが置かれています' }, { status: 400 });
    if (body.order === 'row') cells.sort((a, b) => a.tier - b.tier || a.grid_col - b.grid_col);
    else cells.sort((a, b) => a.grid_col - b.grid_col || a.tier - b.tier);

    const baseOrder = current.reduce((m, l) => Math.max(m, l.sort_order || 0), 0);
    const inserts = cells.map((c, idx) => ({
      provider_id: provider.id, bank_id: id, name: label(start + idx), monthly_fee: fee,
      grid_row: c.grid_row, grid_col: c.grid_col, row_span: c.row_span, col_span: c.col_span, sort_order: baseOrder + idx + 1,
    }));
    for (let i = 0; i < inserts.length; i += 300) {
      const { error } = await supabase.from('provider_lockers').insert(inserts.slice(i, i + 300));
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ created: inserts.length, skipped, grid_rows: target }, { status: 201 });
  }

  const taken = new Set();
  list.forEach(l => {
    const r = rectOf(l);
    for (let y = r.r1; y <= r.r2; y++) for (let x = r.c1; x <= r.c2; x++) taken.add(`${y},${x}`);
  });

  const inserts = [];
  let n = start;
  for (let y = 1; y <= bank.grid_rows; y++) {
    for (let x = 1; x <= bank.grid_cols; x++) {
      if (taken.has(`${y},${x}`)) continue;
      inserts.push({ provider_id: provider.id, bank_id: id, name: label(n), monthly_fee: fee, grid_row: y, grid_col: x, row_span: 1, col_span: 1, sort_order: (y - 1) * bank.grid_cols + x });
      n++;
    }
  }
  if (!inserts.length) return Response.json({ error: '空いているマスがありません' }, { status: 400 });
  for (let i = 0; i < inserts.length; i += 300) {
    const { error } = await supabase.from('provider_lockers').insert(inserts.slice(i, i + 300));
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ created: inserts.length }, { status: 201 });
}
