// メンバーの削除（このお店のメンバー一覧から外す）。2026-11-12 渡邉要望。
// お客様のFineme アカウントや予約・カルテの記録は消さない。外した後に、このお店で新しく予約・入会・チケットの
// 購入があれば、一覧に戻す（removed_at より後に作られた行があるかで判断）。
export async function removedUserIds(db, providerId) {
  const { data: rows } = await db.from('provider_customer_removals').select('user_id, removed_at').eq('provider_id', providerId).limit(5000);
  const list = rows || [];
  if (!list.length) return new Set();
  const ids = list.map(r => r.user_id);
  const since = list.reduce((m, r) => (r.removed_at < m ? r.removed_at : m), list[0].removed_at);
  const later = {};
  for (let i = 0; i < ids.length; i += 300) {
    const chunk = ids.slice(i, i + 300);
    const [res, mem, pkg] = await Promise.all([
      db.from('reservations').select('user_id, created_at').eq('provider_id', providerId).in('user_id', chunk).gt('created_at', since).limit(5000),
      db.from('provider_memberships').select('user_id, created_at').eq('provider_id', providerId).in('user_id', chunk).gt('created_at', since),
      db.from('customer_packages').select('user_id, created_at').eq('provider_id', providerId).in('user_id', chunk).gt('created_at', since),
    ]);
    [res, mem, pkg].forEach(q => (q.data || []).forEach(x => { if (!later[x.user_id] || x.created_at > later[x.user_id]) later[x.user_id] = x.created_at; }));
  }
  return new Set(list.filter(r => !(later[r.user_id] && later[r.user_id] > r.removed_at)).map(r => r.user_id));
}
