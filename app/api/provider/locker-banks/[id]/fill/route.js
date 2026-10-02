// POST /api/provider/locker-banks/[id]/fill → 空いているマスすべてにロッカーを一括作成
// body: { prefix?, start?, digits?, monthly_fee? }。左上から右へ、段ごとに連番を振る。
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt, rectOf } from '@/lib/locker-layout';

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

  const { data: existing } = await supabase.from('provider_lockers').select('grid_row, grid_col, row_span, col_span').eq('bank_id', id);
  const taken = new Set();
  (existing || []).forEach(l => {
    const r = rectOf(l);
    for (let y = r.r1; y <= r.r2; y++) for (let x = r.c1; x <= r.c2; x++) taken.add(`${y},${x}`);
  });

  const inserts = [];
  let n = start;
  for (let y = 1; y <= bank.grid_rows; y++) {
    for (let x = 1; x <= bank.grid_cols; x++) {
      if (taken.has(`${y},${x}`)) continue;
      const num = digits ? String(n).padStart(digits, '0') : String(n);
      inserts.push({ provider_id: provider.id, bank_id: id, name: `${prefix}${num}`, monthly_fee: fee, grid_row: y, grid_col: x, row_span: 1, col_span: 1, sort_order: (y - 1) * bank.grid_cols + x });
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
