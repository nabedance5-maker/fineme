// 会員プランに紐づくもの（でお要望 2026-10-22：オプション・割引・回数券・予約できるメニューをプランごとに決める）。
// 店舗の設定画面（/api/provider/membership-plans）、入会の申込（/api/me/memberships）、承認（approve）、
// 予約の受付（/api/reservations）、毎月の回数券付与（cron/grant-subscription-tickets）で同じ決まりを使う。

const uniq = a => [...new Set((Array.isArray(a) ? a : []).filter(Boolean).map(String))];
const jstMonth = (d = new Date()) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 7);

// 店舗が保存しようとしている紐づけを、自店のオプション・割引・回数券だけに絞って保存できる形にする
export async function normalizePlanLinks(db, providerId, b) {
  const out = {};
  if ('initial_fee' in b) {
    const v = b.initial_fee === '' || b.initial_fee == null ? 0 : parseInt(b.initial_fee, 10);
    if (!Number.isInteger(v) || v < 0 || v > 1000000) return { error: '入会金は0円以上の金額で入れてください' };
    out.initial_fee = v;
  }
  if ('online_enabled' in b) out.online_enabled = !!b.online_enabled;
  if ('monthly_booking_limit' in b) {
    const v = b.monthly_booking_limit === '' || b.monthly_booking_limit == null ? null : parseInt(b.monthly_booking_limit, 10);
    if (v !== null && (!Number.isInteger(v) || v < 1 || v > 999)) return { error: '月の予約回数は1以上の数で入れてください（無制限なら空欄）' };
    out.monthly_booking_limit = v;
  }
  const need = ['included_option_ids', 'selectable_option_ids', 'discount_ids', 'ticket_grants'].some(k => k in b);
  if (!need) return out;
  const [{ data: opts }, { data: discs }, { data: pkgs }] = await Promise.all([
    db.from('provider_membership_options').select('id').eq('provider_id', providerId),
    db.from('provider_membership_discounts').select('id').eq('provider_id', providerId),
    db.from('service_packages').select('id').eq('provider_id', providerId),
  ]);
  const okO = new Set((opts || []).map(x => x.id)), okD = new Set((discs || []).map(x => x.id)), okP = new Set((pkgs || []).map(x => x.id));
  if ('included_option_ids' in b) out.included_option_ids = uniq(b.included_option_ids).filter(id => okO.has(id));
  if ('selectable_option_ids' in b) out.selectable_option_ids = b.selectable_option_ids === null ? null : uniq(b.selectable_option_ids).filter(id => okO.has(id));
  if ('discount_ids' in b) out.discount_ids = b.discount_ids === null ? null : uniq(b.discount_ids).filter(id => okD.has(id));
  if ('ticket_grants' in b) {
    out.ticket_grants = (Array.isArray(b.ticket_grants) ? b.ticket_grants : []).slice(0, 10).map(g => ({
      package_id: String(g.package_id || ''),
      sessions: Math.max(1, Math.min(99, parseInt(g.sessions, 10) || 1)),
      timing: g.timing === 'monthly' ? 'monthly' : 'join',
      valid_days: g.valid_days === '' || g.valid_days == null ? null : Math.max(1, Math.min(730, parseInt(g.valid_days, 10) || 30)),
    })).filter(g => okP.has(g.package_id));
  }
  return out;
}

// お客様が選んだオプションのうち、このプランで選べるもの＋必ず付くもの
export function planOptionIds(plan, chosen) {
  const sel = plan?.selectable_option_ids;
  const picked = uniq(chosen).filter(id => sel == null || sel.includes(id));
  return uniq([...(plan?.included_option_ids || []), ...picked]);
}

export function planAllowsDiscount(plan, discountId) {
  return !discountId || plan?.discount_ids == null || plan.discount_ids.includes(discountId);
}

// 回数券を配る（入会時は period='join'、毎月は 'YYYY-MM'）。同じ期間に二重に配らない
export async function grantPlanTickets(db, membership, plan, timing, period = timing === 'join' ? 'join' : jstMonth()) {
  const grants = (plan?.ticket_grants || []).filter(g => g.timing === timing);
  if (!grants.length || !membership?.user_id) return 0;
  const { data: pkgs } = await db.from('service_packages').select('id, name, validity_days').in('id', grants.map(g => g.package_id));
  let n = 0;
  for (const g of grants) {
    const pkg = (pkgs || []).find(p => p.id === g.package_id);
    if (!pkg) continue;
    const { data: mark, error } = await db.from('provider_membership_ticket_grants')
      .insert({ provider_id: membership.provider_id, membership_id: membership.id, package_id: pkg.id, period })
      .select('id').single();
    if (error || !mark) continue; // 既に配っている
    const days = g.valid_days || pkg.validity_days || null;
    const now = new Date();
    const { data: cp } = await db.from('customer_packages').insert({
      provider_id: membership.provider_id, package_id: pkg.id, user_id: membership.user_id,
      package_name: `${pkg.name}（${plan.name}）`, total_sessions: g.sessions, package_type: 'fixed_count',
      purchased_at: now.toISOString(), expires_at: days ? new Date(now.getTime() + days * 86400000).toISOString() : null,
    }).select('id').single();
    if (cp) { await db.from('provider_membership_ticket_grants').update({ customer_package_id: cp.id }).eq('id', mark.id); n++; }
  }
  return n;
}

// このプランで今月あと何回予約できるか（上限なしは null）
export async function planBookingsLeft(db, plan, userId, providerId, date) {
  if (!plan?.monthly_booking_limit) return null;
  const month = String(date || '').slice(0, 7) || jstMonth();
  const [y, m] = month.split('-').map(Number);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const { count } = await db.from('reservations').select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId).eq('user_id', userId).eq('membership_plan_id', plan.id)
    .in('status', ['pending', 'approved', 'counter_proposed', 'visited'])
    .gte('reserved_date', `${month}-01`).lt('reserved_date', `${next}-01`);
  return Math.max(0, plan.monthly_booking_limit - (count || 0));
}

// プランの画面で選んだ「このプランで予約できるメニュー」を、各メニューの「予約できる人」に反映する。
// 対象は「回数券・会員の方だけ」のメニュー。誰でも予約できるメニューはもともと会員も予約できる。
export async function setPlanMenus(db, providerId, planId, serviceIds) {
  const want = new Set(uniq(serviceIds));
  const [{ data: svcs }, { data: plans }] = await Promise.all([
    db.from('provider_services').select('id, name, booking_scope, allow_ticket, allow_membership, eligible_plan_ids').eq('provider_id', providerId).eq('booking_scope', 'limited'),
    db.from('provider_membership_plans').select('id').eq('provider_id', providerId),
  ]);
  const allPlans = (plans || []).map(p => p.id);
  const skipped = [];
  for (const s of svcs || []) {
    const cur = s.allow_membership ? (s.eligible_plan_ids?.length ? s.eligible_plan_ids : allPlans) : [];
    const has = cur.includes(planId);
    if (has === want.has(s.id)) continue;
    const next = want.has(s.id) ? [...cur, planId] : cur.filter(id => id !== planId);
    const patch = next.length
      ? { allow_membership: true, eligible_plan_ids: next.length === allPlans.length ? [] : next }
      : { allow_membership: false, eligible_plan_ids: [] };
    // 回数券の方も会員の方も予約できなくなる（誰も予約できない）変更はしない。メニュー側で決めてもらう
    if (!next.length && !s.allow_ticket) { skipped.push(s.name); continue; }
    await db.from('provider_services').update(patch).eq('id', s.id).eq('provider_id', providerId);
  }
  return { skipped };
}

export function planMenuIds(plan, services) {
  return (services || []).filter(s => s.booking_scope === 'limited' && s.allow_membership && (!(s.eligible_plan_ids || []).length || s.eligible_plan_ids.includes(plan.id))).map(s => s.id);
}
