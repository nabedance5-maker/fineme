import { queryOne, runQuery } from '@/lib/db-server';

/**
 * PATCH /api/stories/[id]  → ステータス更新（管理者用）
 * GET  /api/stories/[id]   → 単体取得
 */

export async function GET(request, { params }) {
  const { id } = params;
  const story = await queryOne('SELECT * FROM stories WHERE id=?', [id]);
  if (!story) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(story);
}

export async function PATCH(request, { params }) {
  const { id } = params;
  try {
    const { status } = await request.json();
    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return Response.json({ error: '不正なステータスです' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await runQuery(
      `UPDATE stories SET status=?, reviewedAt=? WHERE id=?`,
      [status, now, id]
    );

    if (result.changes === 0) {
      return Response.json({ error: '該当する体験談が見つかりません' }, { status: 404 });
    }

    return Response.json({ ok: true, id, status });
  } catch (err) {
    console.error('[stories PATCH]', err);
    return Response.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}
