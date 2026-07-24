// POST /api/admin/revalidate
// 指定slugの記事ISRキャッシュをパージする
import { revalidatePath } from 'next/cache';

export async function POST(request) {
  const key = request.headers.get('x-admin-key');
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, track } = await request.json();
  if (!slug) return Response.json({ error: 'slug is required' }, { status: 400 });

  const base = track === 'belle' ? '/belle/journal' : '/feature';
  revalidatePath(base);
  revalidatePath(`${base}/${slug}`);

  return Response.json({ ok: true, revalidated: [`${base}/${slug}`] });
}
