import { queryOne } from '@/lib/db-server';

export async function GET() {
  const row = await queryOne(
    `SELECT
       COUNT(*) AS totalProviders,
       SUM(CASE WHEN subscriptionStatus='active' THEN 1 ELSE 0 END) AS activeSubscriptions,
       SUM(CASE WHEN subscriptionStatus='trialing' THEN 1 ELSE 0 END) AS trialingProviders,
       SUM(CASE WHEN subscriptionStatus='active' THEN planAmount ELSE 0 END) AS mrr
     FROM providers`
  );

  const row2 = await queryOne(
    `SELECT SUM(rewardAmount) AS totalPendingRewards
     FROM referral_rewards WHERE status='pending'`
  );

  return Response.json({
    totalProviders: row?.totalProviders || 0,
    activeSubscriptions: row?.activeSubscriptions || 0,
    trialingProviders: row?.trialingProviders || 0,
    mrr: row?.mrr || 0,
    pendingReferralRewards: row2?.totalPendingRewards || 0,
  });
}
