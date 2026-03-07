import { queryAll } from '@/lib/db-server';

export async function GET() {
  const rows = await queryAll(
    `SELECT p.id, p.displayName, p.email, p.category,
            p.subscriptionStatus, p.billingStartDate, p.planAmount,
            p.stripeCustomerId, p.stripeSubscriptionId,
            p.createdAt,
            ref.displayName AS referrerName
     FROM providers p
     LEFT JOIN providers ref ON ref.id = p.referredByProviderId
     ORDER BY p.createdAt DESC`
  );
  return Response.json(rows);
}
