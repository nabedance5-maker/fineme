// 休会の再開日が来た会員を再開する（2026-11-28）。毎日の cron（grant-subscription-tickets）から呼ぶ。
// ・休会費なし＋カード決済：Stripe が再開日に自動で再開し、webhook で休会の状態が消える（ここでは触らない）
// ・休会費あり・オプションを続ける休会（カード決済）：前日のうちにプラン・オプションの金額へ戻しておく（再開日の引き落としを休会費にしない）。
//   再開日が来たら休会の状態を消す
// ・カード決済でない会員（現金など）：再開日が来たら休会の状態を消す（これまでは誰も消していなかった）
import { applyMembershipChange, restorePauseItem } from './membership-changes.js';
import { syncManagedDiscount } from './membership-billing-sync.js';

const jstDay = (offset = 0) => new Date(Date.now() + 9 * 3600000 + offset * 86400000).toISOString().slice(0, 10);

export async function resumeDuePauses(db, stripe) {
  const today = jstDay(0), tomorrow = jstDay(1);
  const out = { restored: 0, resumed: 0, errors: 0 };

  // 前日：休会費の明細をプランの価格に戻す
  if (stripe) {
    const { data: soon } = await db.from('provider_memberships').select('*')
      .eq('status', 'active').not('paused_at', 'is', null).not('pause_fee', 'is', null).not('pause_item_id', 'is', null)
      .not('stripe_subscription_id', 'is', null).lte('pause_until', tomorrow);
    for (const m of soon || []) {
      try {
        const sub = await stripe.subscriptions.retrieve(m.stripe_subscription_id);
        await restorePauseItem(db, stripe, sub, m);
        await db.from('provider_memberships').update({ pause_item_id: null, updated_at: new Date().toISOString() }).eq('id', m.id);
        out.restored++;
      } catch (e) { out.errors++; console.error('[pause resume] restore', m.id, e?.message); }
    }
  }

  // 再開日：休会の状態を消す（休会費ありの会員と、カード決済でない会員）
  const { data: due } = await db.from('provider_memberships').select('*')
    .eq('status', 'active').not('paused_at', 'is', null).lte('pause_until', today);
  for (const m of due || []) {
    if (m.pause_fee == null && m.stripe_subscription_id) continue;
    if (m.stripe_subscription_id && !stripe) continue;
    try {
      await applyMembershipChange(db, stripe, m, { kind: 'resume' });
      await db.from('provider_membership_changes').insert({
        provider_id: m.provider_id, membership_id: m.id, kind: 'resume', status: 'applied', requested_by: 'store',
        from_plan_id: m.plan_id, effective_date: today, operator: '自動（再開日）', decided_at: new Date().toISOString(),
      });
      if (m.stripe_subscription_id) { try { await syncManagedDiscount(db, stripe, m.id); } catch (e) { console.error('[pause resume] discount sync', m.id, e?.message); } }
      out.resumed++;
    } catch (e) { out.errors++; console.error('[pause resume] resume', m.id, e?.message); }
  }
  return out;
}
