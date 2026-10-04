// POST /api/provider/locker-banks/[id]/layout → 配置図を「列ごとの段数」で編集（作成時と同じ入力）
// body: { name?, layout: [{ from: 既存の列番号 | null, tiers: 段数 }], prefix?, start?, digits?, monthly_fee?, order?, confirm_remove? }
// 段数が変わらない既存の列はロッカーをそのまま移す。段数が変わった列・新しい列は作り直す（契約中は拒否）。
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt, rectOf, loadActiveContractMap } from '@/lib/locker-layout';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const MAX = 60;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

async function __POST(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'locker_rental'); if (locked) return locked; }
  const { data: bank } = await supabase.from('provider_locker_banks').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const name = 'name' in body ? String(body.name || '').trim() : bank.name;
  if (!name) return Response.json({ error: '名前は必須です' }, { status: 400 });
  const layout = Array.isArray(body.layout) ? body.layout : [];
  if (!layout.length || layout.length > MAX) return Response.json({ error: `列は1〜${MAX}で指定してください` }, { status: 400 });
  const cols = layout.map(c => ({
    from: c.from == null ? null : toInt(c.from),
    tiers: c.tiers === '' || c.tiers == null ? 0 : toInt(c.tiers),
  }));
  if (cols.some(c => !Number.isInteger(c.tiers) || c.tiers < 0 || c.tiers > MAX || (c.from != null && !(c.from >= 1 && c.from <= bank.grid_cols)))) {
    return Response.json({ error: '段数が正しくありません' }, { status: 400 });
  }
  const froms = cols.filter(c => c.from != null).map(c => c.from);
  if (new Set(froms).size !== froms.length) return Response.json({ error: '列の指定が重複しています' }, { status: 400 });

  const prefix = String(body.prefix || '').slice(0, 20);
  const start = 'start' in body ? toInt(body.start) : 1;
  const digits = 'digits' in body ? toInt(body.digits) : 0;
  if (!Number.isInteger(start) || start < 0) return Response.json({ error: '開始番号が正しくありません' }, { status: 400 });
  if (!Number.isInteger(digits) || digits < 0 || digits > 10) return Response.json({ error: '桁数が正しくありません' }, { status: 400 });
  const fee = body.monthly_fee === '' || body.monthly_fee == null ? null : Number(body.monthly_fee);
  if (fee != null && !(fee >= 0)) return Response.json({ error: '月額が正しくありません' }, { status: 400 });
  const label = n => `${prefix}${digits ? String(n).padStart(digits, '0') : String(n)}`;

  const { data: lockerRows } = await supabase.from('provider_lockers').select('id, name, grid_row, grid_col, row_span, col_span, sort_order').eq('bank_id', id);
  const lockers = (lockerRows || []).map(l => ({ ...l, rect: rectOf(l) }));

  const curTiers = {};
  for (let c = 1; c <= bank.grid_cols; c++) curTiers[c] = lockers.filter(l => c >= l.rect.c1 && c <= l.rect.c2).length;

  // 段数が同じ既存列だけ「そのまま」引き継ぐ（旧列 → 新列）
  const newIndexOf = {};
  cols.forEach((c, j) => { if (c.from != null && c.tiers === curTiers[c.from]) newIndexOf[c.from] = j + 1; });

  const keep = [];
  const drop = [];
  lockers.forEach(l => {
    const mapped = [];
    for (let c = l.rect.c1; c <= l.rect.c2; c++) mapped.push(newIndexOf[c]);
    const ok = mapped.every((m, k) => m != null && m === mapped[0] + k);
    if (ok) keep.push({ ...l, newCol: mapped[0] });
    else drop.push(l);
  });

  if (drop.length) {
    const contracted = await loadActiveContractMap(drop.map(l => l.id));
    const blocked = drop.filter(l => contracted[l.id]);
    if (blocked.length) {
      return Response.json({ error: `契約中のロッカー（${blocked.map(l => l.name).slice(0, 5).join('、')}）は、段数の変更・列の削除ができません。先に解約してください` }, { status: 409 });
    }
    if (!body.confirm_remove) {
      return Response.json({ error: `変更する列の空きロッカー${drop.length}個が作り直し・削除されます`, needs_confirm: true, remove_count: drop.length }, { status: 409 });
    }
  }

  // 縦の分割：残すロッカーを最小単位に圧縮し、新しい段数との最小公倍数に合わせる
  let g0 = 1;
  let effRows = 1;
  if (keep.length) {
    g0 = 0;
    keep.forEach(l => { g0 = gcd(g0, gcd(l.grid_row - 1, l.row_span)); });
    g0 = g0 || 1;
    effRows = Math.max(...keep.map(l => l.rect.r2)) / g0;
  }
  const keptCols = new Set(Object.values(newIndexOf));
  const target = cols.reduce((a, c, j) => (!keptCols.has(j + 1) && c.tiers > 0 ? lcm(a, c.tiers) : a), effRows);
  if (target > MAX) return Response.json({ error: `段数の組み合わせだと縦の分割が${target}マスになり、上限${MAX}を超えます。段数を揃えてください` }, { status: 400 });
  const factor = target / effRows;

  const created = [];
  cols.forEach((c, j) => {
    if (keptCols.has(j + 1) || !c.tiers) return;
    const span = target / c.tiers;
    for (let k = 0; k < c.tiers; k++) created.push({ grid_row: k * span + 1, grid_col: j + 1, row_span: span, tier: k });
  });
  if (body.order === 'row') created.sort((a, b) => a.tier - b.tier || a.grid_col - b.grid_col);
  else created.sort((a, b) => a.grid_col - b.grid_col || a.tier - b.tier);

  for (let i = 0; i < drop.length; i += 100) {
    const { error } = await supabase.from('provider_lockers').delete().in('id', drop.slice(i, i + 100).map(l => l.id)).eq('provider_id', provider.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  // 一意制約（bank, row, col）に途中で当たらないよう、一旦退避位置へ移してから本位置へ
  for (let k = 0; k < keep.length; k++) {
    const { error } = await supabase.from('provider_lockers').update({ grid_row: 100000 + k }).eq('id', keep[k].id).eq('provider_id', provider.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  for (const l of keep) {
    const { error } = await supabase.from('provider_lockers').update({
      grid_row: ((l.grid_row - 1) / g0) * factor + 1,
      row_span: (l.row_span / g0) * factor,
      grid_col: l.newCol,
    }).eq('id', l.id).eq('provider_id', provider.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  const baseOrder = keep.reduce((m, l) => Math.max(m, l.sort_order || 0), 0);
  const inserts = created.map((c, idx) => ({
    provider_id: provider.id, bank_id: id, name: label(start + idx), monthly_fee: fee,
    grid_row: c.grid_row, grid_col: c.grid_col, row_span: c.row_span, col_span: 1, sort_order: baseOrder + idx + 1,
  }));
  for (let i = 0; i < inserts.length; i += 300) {
    const { error } = await supabase.from('provider_lockers').insert(inserts.slice(i, i + 300));
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  const { data: updated, error: bankErr } = await supabase.from('provider_locker_banks')
    .update({ name, grid_rows: target, grid_cols: cols.length }).eq('id', id).eq('provider_id', provider.id).select().single();
  if (bankErr || !updated) return Response.json({ error: bankErr?.message || '更新に失敗しました' }, { status: 500 });
  return Response.json({ bank: updated, created: inserts.length, removed: drop.length, kept: keep.length });
}

export const POST = withAudit(__POST);
