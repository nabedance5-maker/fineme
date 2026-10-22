// メニューを予約できるか（チケット制。でお要望 2026-10-22）。
// メニューに「使えるチケット」（provider_services.ticket_ids）が決まっていれば、そのチケットを
// 1回の予約で ticket_cost 枚持っているお客様だけが予約できる。決まっていなければ誰でも予約できる。
// 持っているチケット＝customer_packages（回数券の購入・月額プランの付与・お店からの付与のどれも同じ行）。
// 予約ページの表示（/api/providers/[slug]/my-eligibility）・予約の受付（/api/reservations）・
// お店の予約入力（/api/provider/reservations/manual）で同じ判定を使う。
// 旧方式（booking_scope / allow_ticket / allow_membership / eligible_*_ids）は2026-10-22に廃止。

export const needsTicket = service => (service?.ticket_ids || []).length > 0;

// このお客様がこの店舗で使えるチケットと、会員かどうか
export async function customerEntitlements(db, providerId, userId) {
  if (!userId) return { tickets: [], planIds: [], isMember: false };
  const [{ data: pkgs }, { data: mems }] = await Promise.all([
    db.from('customer_packages').select('id, package_id, ticket_id, package_name, total_sessions, package_type, expires_at, subscription_status, source').eq('provider_id', providerId).eq('user_id', userId),
    db.from('provider_memberships').select('plan_id, paused_at').eq('provider_id', providerId).eq('user_id', userId).eq('status', 'active'),
  ]);
  const now = Date.now();
  const live = (pkgs || []).filter(p => (!p.expires_at || new Date(p.expires_at).getTime() > now) && p.subscription_status !== 'cancelled');
  const ids = live.map(p => p.id);
  // チケットは予約した時点で使ったことになる（DBのトリガーが package_usages に記録し、キャンセルで戻す。2026-10-22）
  const used = {};
  if (ids.length) {
    const { data: usages } = await db.from('package_usages').select('customer_package_id').in('customer_package_id', ids).is('undone_at', null);
    (usages || []).forEach(u => { used[u.customer_package_id] = (used[u.customer_package_id] || 0) + 1; });
  }
  const tickets = live.map(p => {
    const unlimited = p.package_type === 'unlimited' || p.package_type === 'combo';
    const remaining = unlimited ? null : p.total_sessions - (used[p.id] || 0);
    return { id: p.id, ticket_id: p.ticket_id, package_id: p.package_id, name: p.package_name, unlimited, remaining, expires_at: p.expires_at, source: p.source };
  }).filter(t => t.unlimited || t.remaining > 0);
  // 休会中は会員プランとしては数えない
  const planIds = (mems || []).filter(m => !m.paused_at && m.plan_id).map(m => m.plan_id);
  // 「会員」＝月額プランに入っているか、使えるチケット（回数券）を持っている方（お店ごとの会員登録という仕組みは作らない）
  return { tickets, planIds, isMember: planIds.length > 0 || tickets.length > 0 };
}

// メニューを予約できるか。ok と、使えるチケット（チケットで予約する時はどれかを使う）を返す
export function checkService(service, ent) {
  if (!needsTicket(service)) return { ok: true, via: 'public', tickets: [] };
  const cost = service.ticket_cost || 1;
  const tickets = (ent?.tickets || []).filter(t => service.ticket_ids.includes(t.ticket_id) && (t.unlimited || t.remaining >= cost));
  return tickets.length ? { ok: true, via: 'ticket', tickets } : { ok: false, via: null, tickets: [] };
}

// 会員には表示しないメニュー（体験など）
export const hiddenForMember = (service, ent) => !!service?.hide_for_members && !!ent?.isMember;

// 「ストレッチチケット（1回1枚）をお持ちの方」のような説明
export function scopeLabel(service, ticketNames = {}) {
  if (!needsTicket(service)) return '';
  const names = service.ticket_ids.map(id => ticketNames[id]).filter(Boolean);
  const cost = service.ticket_cost || 1;
  return `${names.length ? names.join('・') : 'チケット'}（1回${cost}枚）をお持ちの方`;
}

// 店舗がメニューに設定した「使えるチケット・枚数・会員には表示しない」を、保存できる形にする（他の店舗のチケットは入れない）
export async function normalizeTicketRule(db, providerId, b) {
  const out = {};
  if ('ticket_ids' in b) {
    const { data: tk } = await db.from('provider_tickets').select('id').eq('provider_id', providerId);
    const ok = new Set((tk || []).map(x => x.id));
    out.ticket_ids = [...new Set(Array.isArray(b.ticket_ids) ? b.ticket_ids : [])].filter(id => ok.has(id));
  }
  if ('ticket_cost' in b) {
    const n = parseInt(b.ticket_cost, 10);
    out.ticket_cost = Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
  }
  if ('hide_for_members' in b) out.hide_for_members = !!b.hide_for_members;
  if ('hide_when_locked' in b) out.hide_when_locked = !!b.hide_when_locked;
  return out;
}

// メニューの表示用（予約ページ・管理画面）：チケットが要るメニューに説明を付ける
export async function withScopeLabels(db, providerId, services) {
  if (!(services || []).some(needsTicket)) return services || [];
  const { data: tk } = await db.from('provider_tickets').select('id, name').eq('provider_id', providerId);
  const names = Object.fromEntries((tk || []).map(x => [x.id, x.name]));
  return services.map(s => (needsTicket(s) ? { ...s, booking_scope: 'limited', scope_label: scopeLabel(s, names) } : { ...s, booking_scope: 'public' }));
}
