// メニューごとの「予約できる人」（でお要望 2026-10-20）。
// 誰でも予約できるメニューと、回数券を持っている人・会員プランに入会中の人だけが予約できるメニューを分ける。
// 予約ページの表示（/api/providers/[slug]/my-eligibility）と、予約の受付（/api/reservations）の両方で同じ判定を使う。

const ACTIVE_RESERVATION = ['pending', 'approved', 'counter_proposed'];

// このお客様がこの店舗で使える回数券と、入会中の会員プラン
export async function customerEntitlements(db, providerId, userId) {
  if (!userId) return { tickets: [], planIds: [] };
  const [{ data: pkgs }, { data: mems }] = await Promise.all([
    db.from('customer_packages').select('id, package_id, package_name, total_sessions, package_type, expires_at, subscription_status').eq('provider_id', providerId).eq('user_id', userId),
    db.from('provider_memberships').select('plan_id, paused_at').eq('provider_id', providerId).eq('user_id', userId).eq('status', 'active'),
  ]);
  const now = Date.now();
  const live = (pkgs || []).filter(p => (!p.expires_at || new Date(p.expires_at).getTime() > now) && p.subscription_status !== 'cancelled');
  const ids = live.map(p => p.id);
  const used = {}, held = {};
  if (ids.length) {
    const [{ data: usages }, { data: resv }] = await Promise.all([
      db.from('package_usages').select('customer_package_id').in('customer_package_id', ids).is('undone_at', null),
      db.from('reservations').select('package_id').in('package_id', ids).in('status', ACTIVE_RESERVATION),
    ]);
    (usages || []).forEach(u => { used[u.customer_package_id] = (used[u.customer_package_id] || 0) + 1; });
    (resv || []).forEach(r => { held[r.package_id] = (held[r.package_id] || 0) + 1; });
  }
  const tickets = live.map(p => {
    const unlimited = p.package_type === 'unlimited' || p.package_type === 'combo';
    // 来店前の予約で使う予定の回数も差し引く（残り1回の回数券で何件も予約できないように）
    const remaining = unlimited ? null : p.total_sessions - (used[p.id] || 0) - (held[p.id] || 0);
    return { id: p.id, package_id: p.package_id, name: p.package_name, unlimited, remaining, expires_at: p.expires_at };
  }).filter(t => t.unlimited || t.remaining > 0);
  // 休会中は会員としての予約はできない
  const planIds = (mems || []).filter(m => !m.paused_at && m.plan_id).map(m => m.plan_id);
  return { tickets, planIds };
}

// メニューを予約できるか。ok と、使える回数券（ticket で予約する時はどれかを使う）を返す
export function checkService(service, ent) {
  if (!service || service.booking_scope !== 'limited') return { ok: true, via: 'public', tickets: [] };
  const tickets = service.allow_ticket
    ? (ent?.tickets || []).filter(t => !(service.eligible_package_ids || []).length || service.eligible_package_ids.includes(t.package_id))
    : [];
  const member = service.allow_membership
    && (ent?.planIds || []).some(id => !(service.eligible_plan_ids || []).length || service.eligible_plan_ids.includes(id));
  if (member) return { ok: true, via: 'membership', tickets };
  if (tickets.length) return { ok: true, via: 'ticket', tickets };
  return { ok: false, via: null, tickets: [] };
}

// 「回数券（10回券）をお持ちの方」のような、予約できる人の説明
export function scopeLabel(service, packageNames = {}, planNames = {}) {
  if (!service || service.booking_scope !== 'limited') return '';
  const parts = [];
  if (service.allow_ticket) {
    const names = (service.eligible_package_ids || []).map(id => packageNames[id]).filter(Boolean);
    parts.push(names.length ? `回数券（${names.join('・')}）をお持ちの方` : '回数券をお持ちの方');
  }
  if (service.allow_membership) {
    const names = (service.eligible_plan_ids || []).map(id => planNames[id]).filter(Boolean);
    parts.push(names.length ? `会員プラン（${names.join('・')}）の方` : '会員プランに入会中の方');
  }
  return parts.join('・') || '店舗が決めたお客様';
}

// 店舗がメニューに設定した「予約できる人」を確かめて保存できる形にする（他の店舗の回数券・プランは入れない）
export async function normalizeScope(db, providerId, b) {
  if (!('booking_scope' in b)) return {};
  if (b.booking_scope !== 'limited') return { booking_scope: 'public', allow_ticket: false, allow_membership: false, eligible_package_ids: [], eligible_plan_ids: [], hide_when_locked: false };
  const [{ data: pk }, { data: pl }] = await Promise.all([
    db.from('service_packages').select('id').eq('provider_id', providerId),
    db.from('provider_membership_plans').select('id').eq('provider_id', providerId),
  ]);
  const okPk = new Set((pk || []).map(x => x.id)); const okPl = new Set((pl || []).map(x => x.id));
  const out = {
    booking_scope: 'limited',
    allow_ticket: !!b.allow_ticket,
    allow_membership: !!b.allow_membership,
    eligible_package_ids: b.allow_ticket ? [...new Set(b.eligible_package_ids || [])].filter(id => okPk.has(id)) : [],
    eligible_plan_ids: b.allow_membership ? [...new Set(b.eligible_plan_ids || [])].filter(id => okPl.has(id)) : [],
    hide_when_locked: !!b.hide_when_locked,
  };
  if (!out.allow_ticket && !out.allow_membership) return { error: '予約できる人（回数券をお持ちの方・会員プランの方）を1つ以上選んでください' };
  return out;
}
