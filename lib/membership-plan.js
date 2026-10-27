// 会員プランに紐づくもの（でお要望 2026-10-22：オプション・割引・付与するチケットをプランごとに決める）。
// 予約はチケットで行う（プランは入会時・毎月1日にチケットを付ける。何回予約できるかは付ける枚数で決まる）。
// 店舗の設定画面（/api/provider/membership-plans）、入会の申込（/api/me/memberships）、承認（approve）、
// 毎月のチケット付与（cron/grant-subscription-tickets）で同じ決まりを使う。

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
  const need = ['included_option_ids', 'selectable_option_ids', 'discount_ids', 'ticket_grants'].some(k => k in b);
  if (!need) return out;
  const [{ data: opts }, { data: discs }, { data: pkgs }] = await Promise.all([
    db.from('provider_membership_options').select('id').eq('provider_id', providerId),
    db.from('provider_membership_discounts').select('id').eq('provider_id', providerId),
    db.from('provider_tickets').select('id').eq('provider_id', providerId),
  ]);
  const okO = new Set((opts || []).map(x => x.id)), okD = new Set((discs || []).map(x => x.id)), okP = new Set((pkgs || []).map(x => x.id));
  if ('included_option_ids' in b) out.included_option_ids = uniq(b.included_option_ids).filter(id => okO.has(id));
  if ('selectable_option_ids' in b) out.selectable_option_ids = b.selectable_option_ids === null ? null : uniq(b.selectable_option_ids).filter(id => okO.has(id));
  if ('discount_ids' in b) out.discount_ids = b.discount_ids === null ? null : uniq(b.discount_ids).filter(id => okD.has(id));
  if ('ticket_grants' in b) {
    out.ticket_grants = (Array.isArray(b.ticket_grants) ? b.ticket_grants : []).slice(0, 10).map(g => ({
      ticket_id: String(g.ticket_id || ''),
      unlimited: !!g.unlimited, // 期間中は使い放題（通い放題）
      sessions: Math.max(1, Math.min(99, parseInt(g.sessions, 10) || 1)),
      timing: g.timing === 'monthly' ? 'monthly' : 'join',
      // 毎月の分を付ける日（1〜28日。でお要望 2026-10-27：毎月1日固定ではなく任意の日に）
      day: g.timing === 'monthly' ? Math.max(1, Math.min(28, parseInt(g.day, 10) || 1)) : null,
      valid_days: g.valid_days === '' || g.valid_days == null ? null : Math.max(1, Math.min(730, parseInt(g.valid_days, 10) || 30)),
    })).filter(g => okP.has(g.ticket_id));
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

// チケットを付ける（入会時は period='join'、毎月は 'YYYY-MM'）。同じ期間に二重に付けない。only を渡すとその付け方だけ
export async function grantPlanTickets(db, membership, plan, timing, period = timing === 'join' ? 'join' : jstMonth(), only = null) {
  const grants = (plan?.ticket_grants || []).filter(g => g.timing === timing && g.ticket_id && (!only || only(g)));
  if (!grants.length || !membership?.user_id) return 0;
  const { data: tks } = await db.from('provider_tickets').select('id, name').in('id', grants.map(g => g.ticket_id));
  let n = 0;
  for (const g of grants) {
    const tk = (tks || []).find(t => t.id === g.ticket_id);
    if (!tk) continue;
    const { data: mark, error } = await db.from('provider_membership_ticket_grants')
      .insert({ provider_id: membership.provider_id, membership_id: membership.id, ticket_id: tk.id, period })
      .select('id').single();
    if (error || !mark) continue; // 既に付けている
    const now = new Date();
    // 毎月の分は既定で翌月の同じ日まで、入会時の分は既定で30日（店舗が日数を決めていればそれ）
    const days = g.valid_days || (timing === 'monthly' ? 31 : 30);
    const { data: cp } = await db.from('customer_packages').insert({
      provider_id: membership.provider_id, ticket_id: tk.id, user_id: membership.user_id,
      package_name: `${tk.name}（${plan.name}）`,
      package_type: g.unlimited ? 'unlimited' : 'fixed_count', total_sessions: g.unlimited ? null : g.sessions,
      purchased_at: now.toISOString(), expires_at: new Date(now.getTime() + days * 86400000).toISOString(),
      source: 'plan', membership_id: membership.id,
    }).select('id').single();
    if (cp) { await db.from('provider_membership_ticket_grants').update({ customer_package_id: cp.id }).eq('id', mark.id); n++; }
  }
  return n;
}

// 会員としての開始日（入会日）。承認時に billing_start_date を記録している。無ければ入会希望日
export const memberStartDate = m => m?.billing_start_date || m?.enrollment_date || (m?.approved_at ? new Date(new Date(m.approved_at).getTime() + 9 * 3600000).toISOString().slice(0, 10) : null);

// 毎月の分を、今日付けるべきか（でお要望 2026-10-27）
// ・その月の付ける日（day）が来ている
// ・その日より後に入会した方には、その月の分は付けない（入会時の分がある）
// ・入会日と付ける日が同じで、入会時にも同じチケットを付けるプランなら、二重にしない
export function monthlyGrantDue(g, plan, membership, today) {
  if (g.timing !== 'monthly') return false;
  const day = Math.max(1, Math.min(28, Number(g.day) || 1));
  const grantDate = `${today.slice(0, 7)}-${String(day).padStart(2, '0')}`;
  if (today < grantDate) return false;
  const start = memberStartDate(membership);
  if (!start || start > grantDate) return false;
  if (start === grantDate && (plan?.ticket_grants || []).some(x => x.timing === 'join' && x.ticket_id === g.ticket_id)) return false;
  return true;
}
