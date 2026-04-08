import { queryAll } from '@/lib/db-server';

const ADMIN_KEY = process.env.ADMIN_API_KEY;

export async function GET(request) {
  const key = request.headers.get('x-admin-key');
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
