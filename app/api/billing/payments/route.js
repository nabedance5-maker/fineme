import { queryAll } from '@/lib/db-server';

export async function GET() {
  const rows = await queryAll(
    `SELECT pay.*, p.displayName AS providerName, p.email AS providerEmail
     FROM payments pay
     LEFT JOIN providers p ON p.id = pay.providerId
     ORDER BY pay.createdAt DESC
     LIMIT 200`
  );
  return Response.json(rows);
}
