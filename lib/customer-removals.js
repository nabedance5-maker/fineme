// メンバーの削除（このお店のメンバー一覧から外す）。2026-11-12 渡邉要望。
// お客様のFineme アカウントや予約・カルテの記録は消さない。外した後に、このお店で新しく予約・入会・チケットの
// 購入があれば、一覧に戻す（removed_at より後に作られた行があるかで判断）。
import { customerEntitlements } from '@/lib/booking-eligibility';
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

// 間違えて消すと大問題になるお客様か（2026-11-12 渡邉指摘）。理由の一覧を返す（空なら削除してよい）。
// メンバーの削除・非会員の削除の両方で使う。確認して押し切ることはできない
export async function removalBlockers(db, providerId, userId) {
  if (!userId) return [];
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const [{ data: mems }, { data: rows }, { data: lockers }, ent] = await Promise.all([
    db.from('provider_memberships').select('id').eq('provider_id', providerId).eq('user_id', userId).in('status', ['active', 'pending_approval']),
    db.from('reservations').select('reserved_date, confirmed_date, counter_date').eq('provider_id', providerId).eq('user_id', userId).in('status', ['pending', 'approved', 'counter_proposed']),
    db.from('provider_locker_contracts').select('id').eq('provider_id', providerId).eq('user_id', userId).eq('status', 'active'),
    customerEntitlements(db, providerId, userId),
  ]);
  const upcoming = (rows || []).filter(r => (r.confirmed_date || r.counter_date || r.reserved_date || '') >= today);
  const reasons = [];
  if ((mems || []).length) reasons.push('会員プランに入会中（または承認待ち）です。先に退会の手続きをしてください。');
  if (ent.tickets.length) reasons.push(`使えるチケット・回数券が残っています（${ent.tickets.map(t => `${t.name}：${t.unlimited ? '通い放題' : `残り${t.remaining}回`}`).join('、')}）。使い切るか、期限が切れるまで削除できません。`);
  if (upcoming.length) reasons.push(`これからの予約が${upcoming.length}件あります。先に予約をキャンセルしてください。`);
  if ((lockers || []).length) reasons.push('ロッカーを契約中です。先にロッカーの契約を終えてください。');
  return reasons;
}
