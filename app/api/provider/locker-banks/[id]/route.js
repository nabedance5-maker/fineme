// PATCH  /api/provider/locker-banks/[id] → 名前・段数・横の数の変更（縮小で消えるロッカーが契約中なら拒否）
// DELETE /api/provider/locker-banks/[id] → ロッカー群ごと削除（契約中のロッカーがあれば拒否）
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt, rectOf, loadActiveContractMap } from '@/lib/locker-layout';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

async function loadBank(id, providerId) {
  const { data } = await supabase.from('provider_locker_banks').select('*').eq('id', id).eq('provider_id', providerId).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'locker_rental'); if (locked) return locked; }
  const bank = await loadBank(id, provider.id);
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  // 列・段の途中への挿入／削除。右側（下側）のロッカーは詰める／ずらす
  if (body.shift) {
    const axis = body.shift.axis === 'row' ? 'row' : 'col';
    const op = body.shift.op === 'remove' ? 'remove' : 'insert';
    const at = toInt(body.shift.at);
    const size = axis === 'col' ? bank.grid_cols : bank.grid_rows;
    const label = axis === 'col' ? '列' : '段';
    if (!Number.isInteger(at) || at < 1 || at > (op === 'insert' ? size + 1 : size)) return Response.json({ error: `${label}の位置が正しくありません` }, { status: 400 });
    if (op === 'insert' && size >= 60) return Response.json({ error: `${label}は最大60までです` }, { status: 400 });
    if (op === 'remove' && size <= 1) return Response.json({ error: `最後の1${label}は削除できません` }, { status: 400 });

    const { data: lockers } = await supabase.from('provider_lockers').select('id, name, grid_row, grid_col, row_span, col_span').eq('bank_id', id);
    const pos = l => (axis === 'col' ? l.grid_col : l.grid_row);
    const span = l => (axis === 'col' ? l.col_span : l.row_span);
    const posKey = axis === 'col' ? 'grid_col' : 'grid_row';
    const spanKey = axis === 'col' ? 'col_span' : 'row_span';
    const list = lockers || [];

    const updates = [];
    const removed = [];
    if (op === 'insert') {
      list.forEach(l => {
        if (pos(l) >= at) updates.push({ id: l.id, [posKey]: pos(l) + 1 });
        else if (pos(l) + span(l) - 1 >= at) updates.push({ id: l.id, [spanKey]: span(l) + 1 });
      });
      updates.sort((a, b) => (b[posKey] || 0) - (a[posKey] || 0));
    } else {
      list.forEach(l => {
        const p0 = pos(l), p1 = pos(l) + span(l) - 1;
        if (p0 === at && p1 === at) removed.push(l);
        else if (p0 > at) updates.push({ id: l.id, [posKey]: p0 - 1 });
        else if (p1 >= at) updates.push({ id: l.id, [spanKey]: span(l) - 1 });
      });
      updates.sort((a, b) => (a[posKey] || 0) - (b[posKey] || 0));
      if (removed.length) {
        const contracted = await loadActiveContractMap(removed.map(l => l.id));
        const blocked = removed.filter(l => contracted[l.id]);
        if (blocked.length) return Response.json({ error: `契約中のロッカー（${blocked.map(l => l.name).slice(0, 5).join('、')}）があるため${at}${label}目は削除できません。先に解約してください` }, { status: 409 });
        if (!body.confirm_remove) return Response.json({ error: `${at}${label}目を削除すると空きロッカー${removed.length}個も削除されます`, needs_confirm: true, remove_count: removed.length }, { status: 409 });
        for (let i = 0; i < removed.length; i += 100) {
          const { error: delErr } = await supabase.from('provider_lockers').delete().in('id', removed.slice(i, i + 100).map(l => l.id)).eq('provider_id', provider.id);
          if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
        }
      }
    }
    for (const u of updates) {
      const { id: lid, ...patch } = u;
      const { error: upErr } = await supabase.from('provider_lockers').update(patch).eq('id', lid).eq('provider_id', provider.id);
      if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
    }
    const sizeKey = axis === 'col' ? 'grid_cols' : 'grid_rows';
    const { data: moved, error: bankErr } = await supabase.from('provider_locker_banks').update({ [sizeKey]: size + (op === 'insert' ? 1 : -1) }).eq('id', id).eq('provider_id', provider.id).select().single();
    if (bankErr || !moved) return Response.json({ error: bankErr?.message || '見つかりません' }, { status: 500 });
    return Response.json(moved);
  }

  const update = {};
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name) return Response.json({ error: '名前は必須です' }, { status: 400 });
    update.name = name;
  }
  const rows = 'grid_rows' in body ? toInt(body.grid_rows) : bank.grid_rows;
  const cols = 'grid_cols' in body ? toInt(body.grid_cols) : bank.grid_cols;
  if (!(rows >= 1 && rows <= 60 && cols >= 1 && cols <= 60)) return Response.json({ error: '段数・横の数は1〜60で指定してください' }, { status: 400 });
  update.grid_rows = rows;
  update.grid_cols = cols;

  if (rows < bank.grid_rows || cols < bank.grid_cols) {
    const { data: lockers } = await supabase.from('provider_lockers').select('id, name, grid_row, grid_col, row_span, col_span').eq('bank_id', id);
    const outside = (lockers || []).filter(l => { const r = rectOf(l); return r.r2 > rows || r.c2 > cols; });
    if (outside.length) {
      const contracted = await loadActiveContractMap(outside.map(l => l.id));
      const blocked = outside.filter(l => contracted[l.id]);
      if (blocked.length) {
        return Response.json({ error: `契約中のロッカー（${blocked.map(l => l.name).slice(0, 5).join('、')}）が範囲外になるため縮小できません。先に解約してください` }, { status: 409 });
      }
      if (!body.confirm_remove) {
        return Response.json({ error: `縮小すると空きロッカー${outside.length}個が削除されます`, needs_confirm: true, remove_count: outside.length }, { status: 409 });
      }
      for (let i = 0; i < outside.length; i += 100) {
        const ids = outside.slice(i, i + 100).map(l => l.id);
        const { error: delErr } = await supabase.from('provider_lockers').delete().in('id', ids).eq('provider_id', provider.id);
        if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase.from('provider_locker_banks').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: error?.message || '見つかりません' }, { status: 500 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'locker_rental'); if (locked) return locked; }
  const bank = await loadBank(id, provider.id);
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const { data: lockers } = await supabase.from('provider_lockers').select('id').eq('bank_id', id);
  const contracted = await loadActiveContractMap((lockers || []).map(l => l.id));
  if (Object.keys(contracted).length) return Response.json({ error: '契約中のロッカーがあるため削除できません。先に解約してください' }, { status: 409 });

  const { error } = await supabase.from('provider_locker_banks').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
