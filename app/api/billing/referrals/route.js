import { queryAll } from '@/lib/db-server';

export async function GET() {
  const rows = await queryAll(
    `SELECT rr.*,
            ref.displayName AS referrerName, ref.email AS referrerEmail,
            red.displayName AS referredName, red.email AS referredEmail,
            ref.id AS referrerId
     FROM referral_rewards rr
     LEFT JOIN providers ref ON ref.id = rr.referrerProviderId
     LEFT JOIN providers red ON red.id = rr.referredProviderId
     ORDER BY rr.createdAt DESC`
  );
  return Response.json(rows);
}
