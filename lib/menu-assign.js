// メニューの「担当できるスタッフ」「使う部屋」（でお要望 2026-10-21：メニューの決め事を1か所にまとめる）。
// 予約できる時間の計算（lib/availability-engine.js）が、メニューごとにこの範囲のスタッフ・部屋だけを使う。
// 空の配列は「全員・どの部屋でも」。他の店舗のスタッフ・部屋は入れない。

export async function normalizeAssignees(db, providerId, b) {
  const out = {};
  const wantStaff = Array.isArray(b.staff_ids);
  const wantRes = Array.isArray(b.resource_ids) || 'resource_id' in b;
  if (!wantStaff && !wantRes) return out;
  const [{ data: st }, { data: rs }] = await Promise.all([
    wantStaff ? db.from('provider_staff').select('id').eq('provider_id', providerId) : Promise.resolve({ data: [] }),
    wantRes ? db.from('provider_resources').select('id').eq('provider_id', providerId) : Promise.resolve({ data: [] }),
  ]);
  const okSt = new Set((st || []).map(x => x.id)); const okRs = new Set((rs || []).map(x => x.id));
  if (wantStaff) out.staff_ids = [...new Set(b.staff_ids)].filter(id => okSt.has(id));
  if (Array.isArray(b.resource_ids)) out.resource_ids = [...new Set(b.resource_ids)].filter(id => okRs.has(id));
  if ('resource_id' in b) out.resource_id = b.resource_id && okRs.has(b.resource_id) ? b.resource_id : null;
  return out;
}
