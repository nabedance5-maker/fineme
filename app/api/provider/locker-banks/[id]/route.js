// PATCH  /api/provider/locker-banks/[id] → 名前・段数・横の数の変更（縮小で消えるロッカーが契約中なら拒否）
// DELETE /api/provider/locker-banks/[id] → ロッカー群ごと削除（契約中のロッカーがあれば拒否）
export const dynamic = 'force-dynamic';
import { supabase, getProviderFromRequest, toInt, rectOf, loadActiveContractMap } from '@/lib/locker-layout';

async function loadBank(id, providerId) {
  const { data } = await supabase.from('provider_locker_banks').select('*').eq('id', id).eq('provider_id', providerId).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const bank = await loadBank(id, provider.id);
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
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

export async function DELETE(request, { params }) {
  const { id } = await params;
  const provider = await getProviderFromRequest(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const bank = await loadBank(id, provider.id);
  if (!bank) return Response.json({ error: '見つかりません' }, { status: 404 });

  const { data: lockers } = await supabase.from('provider_lockers').select('id').eq('bank_id', id);
  const contracted = await loadActiveContractMap((lockers || []).map(l => l.id));
  if (Object.keys(contracted).length) return Response.json({ error: '契約中のロッカーがあるため削除できません。先に解約してください' }, { status: 409 });

  const { error } = await supabase.from('provider_locker_banks').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
