import { queryAll } from '@/lib/db-server';

const ADMIN_KEY = process.env.ADMIN_API_KEY;

export async function GET(request) {
  const key = request.headers.get('x-admin-key');
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await queryAll(
    `SELECT pay.*, p.displayName AS providerName, p.email AS providerEmail
     FROM payments pay
     LEFT JOIN providers p ON p.id = pay.providerId
     ORDER BY pay.createdAt DESC
     LIMIT 200`
  );
  return Response.json(rows);
}
